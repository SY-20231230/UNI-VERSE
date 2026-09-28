import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
import Icon from '../lib/icons';
import Avatar from '../components/Avatar';
import SafetyBanner from '../components/SafetyBanner';
import ReportModal from '../components/ReportModal';
import ConfirmModal from '../components/ConfirmModal';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { timeAgo, won, hm, formatDate } from '../lib/format';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';
import { session } from '../lib/session';
import { tradeApi } from '../lib/tradeApi';

function dateLabel(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, now)) return '오늘';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return '어제';
  return formatDate(ts);
}

export default function Chat() {
  const { id: activeId } = useParams();
  const { state, userOf, sendChatMessage, receiveChatMessage, acceptChatRequest, declineChatRequest, deleteChatRoom, dismissSafety, stompConnected, publishMessage } = useApp();
  const { openModal, closeOverlay, toast } = useUI();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [trade, setTrade] = useState(null);  // 현재 채팅방의 거래 정보
  const [tradeLoading, setTradeLoading] = useState(false);
  const msgsRef = useRef(null);
  const menuRef = useRef(null);

  const allIds = Object.keys(state.chats).sort((a, b) => {
    const at = state.chats[a].messages[state.chats[a].messages.length - 1]?.time || 0;
    const bt = state.chats[b].messages[state.chats[b].messages.length - 1]?.time || 0;
    return bt - at;
  });
  const q = query.trim().toLowerCase();
  const ids = q
    ? allIds.filter((cid) => {
        const c = state.chats[cid];
        const l = state.listings.find((x) => x.id === c.listingId);
        const partner = c.anonymous ? { name: '익명 사용자' } : userOf(c.partnerId);
        return partner.name.toLowerCase().includes(q) || (l && l.title.toLowerCase().includes(q));
      })
    : allIds;
  const activeChat = activeId ? state.chats[activeId] : null;
  const pendingIds = ids.filter((cid) => state.chats[cid].status === 'pending');
  const acceptedIds = ids.filter((cid) => state.chats[cid].status !== 'pending');
  const pendingCount = pendingIds.length;

  function renderChatRow(cid) {
    const c = state.chats[cid];
    const l = state.listings.find((x) => x.id === c.listingId);
    const partner = c.anonymous ? { name: '익명 사용자', color: '#9195A6' } : userOf(c.partnerId, c.partnerName);
    const last = c.messages[c.messages.length - 1];
    return (
      <Link key={cid} className={'chat-row' + (cid === activeId ? ' active' : '')} to={`/chat/${cid}`}>
        <Avatar user={partner} size={44} />
        <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }} className="stack g4">
          <div className="row between">
            <b style={{ fontSize: 14 }}>{partner.name}</b>
            <span className="faint" style={{ fontSize: 11 }}>
              {last ? timeAgo(last.time) : ''}
            </span>
          </div>
          <div className="faint" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {l ? l.title : ''}
          </div>
          <div className="row between g8">
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--ink-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {last ? last.text : '대화를 시작해보세요'}
            </div>
            {l && <span className="chat-row-price tnum">{won(l.price)}</span>}
          </div>
        </div>
      </Link>
    );
  }

  function handleInlineAccept(e, cid) {
    e.preventDefault();
    acceptChatRequest(cid);
    navigate(`/chat/${cid}`);
  }

  function handleInlineDecline(e, cid) {
    e.preventDefault();
    declineChatRequest(cid);
  }

  function renderRequestCard(cid) {
    const c = state.chats[cid];
    const l = state.listings.find((x) => x.id === c.listingId);
    const partner = c.anonymous ? { name: '익명 사용자', color: '#9195A6' } : userOf(c.partnerId, c.partnerName);
    const last = c.messages[c.messages.length - 1];
    return (
      <div key={cid} className="chat-request-card">
        <Link to={`/chat/${cid}`} className="chat-request-card-main">
          <Avatar user={partner} size={40} />
          <div style={{ flex: 1, minWidth: 0 }} className="stack g4">
            <div className="row between">
              <b style={{ fontSize: 13.5 }}>{partner.name}</b>
              <span className="faint" style={{ fontSize: 11 }}>
                {last ? timeAgo(last.time) : ''}
              </span>
            </div>
            {l && (
              <div className="faint" style={{ fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {l.title} · {won(l.price)}
              </div>
            )}
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {last ? last.text : ''}
            </div>
          </div>
        </Link>
        <div className="row g8" style={{ marginTop: 11 }}>
          <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={(e) => handleInlineDecline(e, cid)}>
            거절
          </button>
          <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={(e) => handleInlineAccept(e, cid)}>
            수락
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
    }
  }, [activeId, activeChat?.messages.length]);

  // 채팅방 변경시 거래 정보 로드
  useEffect(() => {
    setTrade(null);
    setMenuOpen(false);
    if (!activeId || !activeChat?.listingId || !session.isActive()) return;
    tradeApi.getTradeByItem(activeChat.listingId).then(setTrade).catch(() => setTrade(null));
  }, [activeId]);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  async function handleProposeTrade() {
    setMenuOpen(false);
    if (!activeChat?.listingId) return;
    setTradeLoading(true);
    try {
      const tradeId = await tradeApi.proposeTrade(activeChat.listingId);
      const t = tradeId ? await tradeApi.getTradeDetail(tradeId) : await tradeApi.getTradeByItem(activeChat.listingId);
      setTrade(t);
      toast('거래 요청을 보냈습니다! 상대방이 수락하면 거래가 진행돼요.');
    } catch (e) {
      toast(e?.message || '거래 요청에 실패했어요. 이미 진행 중인 거래가 있거나 판매 완료된 상품이에요.');
    } finally {
      setTradeLoading(false);
    }
  }

  async function handleAcceptTrade() {
    if (!trade?.tradeId) return;
    setTradeLoading(true);
    try {
      await tradeApi.acceptTrade(trade.tradeId);
      const t = await tradeApi.getTradeDetail(trade.tradeId);
      setTrade(t);
      toast('거래 요청을 수락했습니다! 이제 거래를 진행해주세요.');
    } catch (e) {
      toast(e?.message || '거래 수락에 실패했어요.');
    } finally {
      setTradeLoading(false);
    }
  }

  async function handleConfirmTrade() {
    if (!trade?.tradeId) return;
    setTradeLoading(true);
    try {
      await tradeApi.confirmTrade(trade.tradeId);
      const t = await tradeApi.getTradeDetail(trade.tradeId);
      setTrade(t);
      if (t.status === 'COMPLETED') {
        toast('거래가 완료되었습니다! 감사합니다 🎉');
      } else {
        toast('거래 완료 확인했습니다. 상대방의 확인을 기다리고 있어요.');
      }
    } catch (e) {
      toast('오류가 발생했어요.');
    } finally {
      setTradeLoading(false);
    }
  }

  // STOMP is now handled globally in AppContext.jsx. We just use publishMessage from useApp().

  function send() {
    const text = input.trim();
    if (!text || !activeId) return;

    if (stompConnected) {
      publishMessage(activeId, text, 'TEXT'); // Server will broadcast back to both sides
      setInput('');
    } else {
      console.error('WebSocket not connected - cannot send message');
      toast('서버와의 연결이 끊어졌습니다. 잠시 후 다시 시도해주세요.');
    }
  }

  function handleAccept() {
    acceptChatRequest(activeId);
  }

  function handleDecline() {
    declineChatRequest(activeId);
    navigate('/chat');
  }

  function handleDeleteRoom() {
    openModal(
      <ConfirmModal
        title="채팅방을 삭제하시겠습니까?"
        desc="삭제한 채팅방은 복구할 수 없으며 대화 내용이 모두 사라집니다."
        onClose={closeOverlay}
        onConfirm={async () => {
          closeOverlay();
          try {
            await deleteChatRoom(activeId);
            toast('채팅방이 삭제되었습니다.');
            navigate('/chat');
          } catch (e) {
            toast('채팅방 삭제에 실패했습니다.');
          }
        }}
      />
    );
  }

  const listing2 = activeChat ? state.listings.find((x) => x.id === activeChat.listingId) : null;
  const partner2 = activeChat ? (activeChat.anonymous ? { name: '익명 사용자', color: '#9195A6' } : userOf(activeChat.partnerId, activeChat.partnerName)) : null;
  const myServerId = state.users?.me?.serverId;
  const isSeller = trade && myServerId && String(trade.sellerId) === String(myServerId);
  const isBuyer = trade && myServerId && String(trade.buyerId) === String(myServerId);
  const myConfirmed = isSeller ? trade?.sellerConfirmed : (isBuyer ? trade?.buyerConfirmed : false);
  const tradeStatus = trade?.status; // TRADING | COMPLETED | CANCELLED | null
  const itemTradeCompleted = tradeStatus === 'COMPLETED';
  // 상품이 거래완료면 메시지 입력 차단
  const chatBlocked = itemTradeCompleted;

  return (
    <div className="chat-page fade-enter">
      <div className={'chat-shell' + (activeId ? ' show-room' : '')}>
        <div className="chat-list-pane">
          <div className="chat-list-head">
            <div className="row between">
              <div className="page-title">채팅</div>
              {allIds.length > 0 && (
                <span className="chat-count">
                  전체 {allIds.length}개
                  {pendingCount > 0 && <span className="chat-count-pending">요청 {pendingCount}</span>}
                </span>
              )}
            </div>
            {allIds.length > 0 && (
              <div className="chat-search">
                <Icon name="search" size={15} />
                <input
                  placeholder="상대방 또는 상품명으로 검색"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="chat-list-scroll">
            {allIds.length === 0 ? (
              <div className="empty" style={{ padding: '50px 24px' }}>
                <div className="empty-icon">
                  <Icon name="chat" size={26} />
                </div>
                <div className="h2" style={{ fontSize: 15, marginTop: 10 }}>
                  진행중인 채팅이 없어요
                </div>
                <div style={{ fontSize: 12.5 }}>중고거래 글에서 1:1 대화를 요청해보세요</div>
              </div>
            ) : ids.length === 0 ? (
              <div className="empty" style={{ padding: '50px 24px' }}>
                <div className="empty-icon">
                  <Icon name="search" size={24} />
                </div>
                <div className="h2" style={{ fontSize: 15, marginTop: 10 }}>
                  검색 결과가 없어요
                </div>
                <div style={{ fontSize: 12.5 }}>다른 이름이나 상품명으로 찾아보세요</div>
              </div>
            ) : (
              <>
                {pendingIds.length > 0 && (
                  <div className="chat-request-group">
                    <div className="chat-section-label">새로운 요청 {pendingIds.length}건</div>
                    {pendingIds.map((cid) => renderRequestCard(cid))}
                  </div>
                )}
                {acceptedIds.length > 0 && (
                  <>
                    {pendingIds.length > 0 && <div className="chat-section-label">대화중</div>}
                    {acceptedIds.map((cid) => renderChatRow(cid))}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {activeId && activeChat ? (
          <div className="chat-room-pane">
            <div className="chat-room-head">
              <button className="iconbtn ghost chat-room-back" title="뒤로가기" onClick={() => navigate('/chat')}>
                <Icon name="back" size={18} />
              </button>
              <button className="iconbtn ghost chat-room-close" title="채팅 닫기" onClick={() => navigate('/chat')}>
                <Icon name="back" size={16} /> {/* desktop close icon to back arrow so X can be delete */}
              </button>
              <button className="iconbtn ghost" style={{ color: 'var(--danger)', marginLeft: -6, marginRight: 6 }} title="채팅방 삭제" onClick={handleDeleteRoom}>
                <Icon name="x" size={16} />
              </button>
              <Avatar user={partner2} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="name">{partner2.name}</div>
                {listing2 && (
                  <div className="faint" style={{ fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {listing2.title} · {won(listing2.price)} · 중고거래
                  </div>
                )}
              </div>
              {listing2 && (
                <Link className="btn btn-outline btn-sm chat-room-head-cta" to={`/market/${listing2.id}`}>
                  상품 보기
                </Link>
              )}
              <div style={{ position: 'relative' }} ref={menuRef}>
                <button
                  className="iconbtn ghost"
                  title="더보기"
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <Icon name="more" size={17} />
                </button>
                {menuOpen && (
                  <div style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: 6,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.12)',
                    minWidth: 160, zIndex: 100, overflow: 'hidden'
                  }}>
                    {/* 거래 요청 버튼 - 상품 ID가 있고 거래가 없을 때 표시 */}
                    {activeChat?.listingId && !trade && (
                      <button
                        style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        onClick={handleProposeTrade}
                        disabled={tradeLoading}
                      >
                        🤝 거래 요청하기
                      </button>
                    )}
                    {/* 거래 완료 확인 버튼 - 거래중이고 아직 내가 확인 안 했을 때 */}
                    {trade && tradeStatus === 'TRADING' && !myConfirmed && (
                      <button
                        style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10, color: '#10b981' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        onClick={() => { setMenuOpen(false); handleConfirmTrade(); }}
                        disabled={tradeLoading}
                      >
                        ✅ 거래 완료 확인
                      </button>
                    )}
                    <button
                      style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10, color: '#ef4444' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      onClick={() => {
                        setMenuOpen(false);
                        openModal(<ReportModal onClose={closeOverlay} targetUserId={activeChat.partnerId} listingId={listing2?.id} chatId={activeId} />);
                      }}
                    >
                      🚨 신고하기
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* 거래 상태 배너 */}
            {trade && (
              <div style={{
                padding: '10px 20px',
                background: tradeStatus === 'COMPLETED' ? 'rgba(16,185,129,.1)' : 'rgba(109,40,217,.08)',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 13
              }}>
                <span>
                  {tradeStatus === 'COMPLETED' && '🎉 거래가 완료되었습니다'}
                  {tradeStatus === 'REQUESTED' && (
                    isSeller
                      ? '🤝 상대방이 거래를 요청했습니다.'
                      : '⏳ 상대방의 수락을 기다리는 중입니다.'
                  )}
                  {tradeStatus === 'TRADING' && (
                    <>
                      🤝 거래 진행 중 · 판매자 {trade.sellerConfirmed ? '✅' : '⏳'} 구매자 {trade.buyerConfirmed ? '✅' : '⏳'}
                    </>
                  )}
                  {tradeStatus === 'CANCELLED' && '❌ 거래가 취소되었습니다'}
                </span>
                {tradeStatus === 'REQUESTED' && isSeller && (
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: 12, padding: '5px 12px' }}
                    onClick={handleAcceptTrade}
                    disabled={tradeLoading}
                  >
                    요청 수락
                  </button>
                )}
                {tradeStatus === 'TRADING' && !myConfirmed && (
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: 12, padding: '5px 12px' }}
                    onClick={handleConfirmTrade}
                    disabled={tradeLoading}
                  >
                    거래 완료 확인
                  </button>
                )}
              </div>
            )}
            {activeChat.showSafety !== false && (
              <div style={{ padding: '12px 20px 0' }}>
                <SafetyBanner onClose={() => dismissSafety(activeId)} />
              </div>
            )}
            <div className="chat-msgs" ref={msgsRef}>
              {activeChat.messages.map((m, i) => {
                const prev = activeChat.messages[i - 1];
                const next = activeChat.messages[i + 1];
                const showTime = !next || next.from !== m.from;
                const showDate = !prev || dateLabel(prev.time) !== dateLabel(m.time);
                return (
                  <div key={i}>
                    {showDate && <div className="chat-date-sep">{dateLabel(m.time)}</div>}
                    <div className={'bubble-row ' + m.from}>
                      <div className="bubble-row-inner">
                        <div className="bubble">{m.text}</div>
                        {showTime && <span className="bubble-time">{hm(m.time)}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {activeChat.status === 'pending' ? (
              <div className="chat-request-bar">
                <div className="chat-request-bar-label">
                  <Icon name="chat" size={15} />
                  {partner2.name}님이 채팅을 요청했어요
                </div>
                <div className="row g10">
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={handleDecline}>
                    거절
                  </button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAccept}>
                    수락하기
                  </button>
                </div>
              </div>
            ) : chatBlocked ? (
              <div className="chatinput" style={{ justifyContent: 'center', opacity: 0.6 }}>
                <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>🎉 거래가 완료된 채팅방입니다. 메시지를 보낼 수 없어요.</span>
              </div>
            ) : (
              <div className="chatinput">
                <button className="iconbtn ghost chatinput-add" title="파일 첨부" onClick={() => toast('데모에서는 파일 첨부가 지원되지 않아요')}>
                  <Icon name="plus" size={17} />
                </button>
                <input
                  placeholder="메시지를 입력하세요"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') send();
                  }}
                />
                <button className="btn btn-primary chat-send-btn" onClick={send} disabled={!input.trim()}>
                  전송
                </button>
              </div>
            )}
          </div>

        ) : (
          <div className="chat-room-pane">
            <div className="chat-empty-state">
              <div className="chat-empty-icon">
                <Icon name="chat" size={30} />
              </div>
              <div className="chat-empty-title">대화를 시작해보세요</div>
              <div className="chat-empty-sub">
                중고거래와 캠퍼스 이야기에서
                <br />
                필요한 사람과 바로 연결할 수 있어요.
              </div>
              <div className="chat-empty-cta">
                <Link className="btn btn-outline" to="/market">
                  최근 거래 보기
                </Link>
                <Link className="btn btn-outline" to="/community">
                  커뮤니티 보기
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
