import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
import Icon from '../lib/icons';
import Avatar from '../components/Avatar';
import SafetyBanner from '../components/SafetyBanner';
import ReportModal from '../components/ReportModal';
import ConfirmModal from '../components/ConfirmModal';
import TradeStatusModal from '../components/TradeStatusModal';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { timeAgo, won, hm, formatDate } from '../lib/format';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';
import { session } from '../lib/session';
import { tradeApi } from '../lib/tradeApi';
import useSuspension from '../lib/useSuspension';

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

// 목록 시간: 오늘은 '오후 5:02', 어제는 '어제', 그 전은 '9.28'
function chatTime(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return hm(ts);
  if (d.toDateString() === yesterday.toDateString()) return '어제';
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

export default function Chat() {
  const { id: activeId } = useParams();
  const { state, userOf, sendChatMessage, receiveChatMessage, markChatRead, acceptChatRequest, declineChatRequest, deleteChatRoom, dismissSafety, stompConnected, publishMessage } = useApp();

  useEffect(() => {
    if (activeId && state.chats[activeId]?.unread) {
      markChatRead(activeId);
    }
  }, [activeId, state.chats, markChatRead]);
  const { openModal, closeOverlay, toast } = useUI();
  const suspension = useSuspension();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [trade, setTrade] = useState(null);  // 현재 채팅방의 거래 정보
  const [tradeLoading, setTradeLoading] = useState(false);
  const msgsRef = useRef(null);
  const menuRef = useRef(null);

  // 서버 채팅방에는 상품 ID만 있어 목록에 상품명을 보여주려고 상품 목록을 한 번 받아 둔다.
  // 상세 조회(getItem)는 조회수를 올리므로 목록 API를 쓴다.
  const [itemInfo, setItemInfo] = useState({});
  useEffect(() => {
    if (state.authMode !== 'server') return;
    import('../lib/marketApi').then(({ marketApi }) => marketApi.getItems({ page: 0, size: 100 }))
      .then((res) => {
        const map = {};
        (res?.content || []).forEach((it) => {
          const itemId = it.id ?? it.itemId;
          map[itemId] = { id: itemId, title: it.title, price: it.listedPrice };
        });
        setItemInfo(map);
      })
      .catch(() => {});
  }, [state.authMode]);
  const listingOf = (c) => state.listings.find((x) => x.id === c.listingId) || itemInfo[c.listingId] || null;

  const allIds = Object.keys(state.chats).sort((a, b) => {
    const at = state.chats[a].messages[state.chats[a].messages.length - 1]?.time || 0;
    const bt = state.chats[b].messages[state.chats[b].messages.length - 1]?.time || 0;
    return bt - at;
  });
  const q = query.trim().toLowerCase();
  const ids = q
    ? allIds.filter((cid) => {
        const c = state.chats[cid];
        const l = listingOf(c);
        const partner = c.anonymous ? { name: '익명 사용자' } : userOf(c.partnerId);
        return partner.name.toLowerCase().includes(q) || (l && l.title.toLowerCase().includes(q));
      })
    : allIds;
  const activeChat = activeId ? state.chats[activeId] : null;
  const pendingIds = ids.filter((cid) => state.chats[cid].status === 'pending');
  const acceptedIds = ids.filter((cid) => state.chats[cid].status !== 'pending');

  function renderChatRow(cid) {
    const c = state.chats[cid];
    const l = listingOf(c);
    const partner = c.anonymous ? { name: '익명 사용자', color: '#9195A6' } : userOf(c.partnerId, c.partnerName);
    const last = c.messages[c.messages.length - 1];
    
    // 안 읽은 수는 서버(unreadCount)가 기준. 지금 보고 있는 방은 곧 읽음 처리되므로 표시하지 않는다.
    const isUnread = c.unread && cid !== activeId;

    return (
      <Link key={cid} className={'chat-row' + (cid === activeId ? ' active' : '')} to={`/chat/${cid}`}>
        <Avatar user={partner} size={38} />
        <div className="chat-row-body">
          <div className="row between g8">
            <b className="chat-row-name">{partner.name}</b>
            <span className="chat-row-time">{last ? chatTime(last.time) : ''}</span>
          </div>
          {l && (
            <span className="chat-row-item">
              <Icon name="shopping-bag" size={11} />
              <span>{l.title}</span>
            </span>
          )}
          <div className="row between g8">
            <div className="chat-row-last">{last ? last.text : '대화를 시작해보세요'}</div>
            {isUnread && (
              <span className="chat-unread-badge tnum" aria-label={`안 읽은 메시지 ${c.unreadCount || 1}개`}>
                {c.unreadCount > 99 ? '99+' : c.unreadCount || 1}
              </span>
            )}
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
    const l = listingOf(c);
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

  const [serverListing, setServerListing] = useState(null);

  // 채팅방 변경시 거래 정보 로드 및 STOMP 이벤트 수신
  const fetchTrade = useCallback(() => {
    if (!activeId || !activeChat?.listingId || !session.isActive()) return;
    tradeApi.getTradeByItem(activeChat.listingId).then(setTrade).catch(() => setTrade(null));
    import('../lib/marketApi').then(({ marketApi }) => {
      marketApi.getItem(activeChat.listingId).then(res => setServerListing(res)).catch(() => setServerListing(null));
    });
  }, [activeId, activeChat?.listingId]);

  useEffect(() => {
    setTrade(null);
    setServerListing(null);
    setMenuOpen(false);
    fetchTrade();
  }, [activeId, fetchTrade]);

  useEffect(() => {
    function handleTradeUpdate(e) {
      if (activeChat?.listingId && e.detail === activeChat.listingId) {
        fetchTrade();
      }
    }
    window.addEventListener('trade_update', handleTradeUpdate);
    return () => window.removeEventListener('trade_update', handleTradeUpdate);
  }, [activeChat?.listingId, fetchTrade]);

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
    } catch (e) {
      toast(e?.message || '거래 요청에 실패했어요. 이미 진행 중인 거래가 있거나 판매 완료된 상품이에요.');
    } finally {
      setTradeLoading(false);
    }
  }

  async function handleAcceptTrade(tradeId = trade?.tradeId) {
    if (!tradeId) return;
    setTradeLoading(true);
    try {
      await tradeApi.acceptTrade(tradeId);
      const t = await tradeApi.getTradeDetail(tradeId);
      setTrade(t);
    } catch (e) {
      toast(e?.message || '거래 수락에 실패했어요.');
    } finally {
      setTradeLoading(false);
    }
  }

  async function handleRejectTrade() {
    if (!trade?.tradeId) return;
    setTradeLoading(true);
    try {
      await tradeApi.cancelTrade(trade.tradeId);
      const t = await tradeApi.getTradeDetail(trade.tradeId);
      setTrade(t);
      toast('거래 요청을 거절했습니다.');
    } catch (e) {
      toast(e?.message || '거래 거절에 실패했어요.');
    } finally {
      setTradeLoading(false);
    }
  }

  async function handlePromiseTrade(tradeId = trade?.tradeId) {
    if (!tradeId) return;
    setTradeLoading(true);
    try {
      await tradeApi.promiseTrade(tradeId);
      const t = await tradeApi.getTradeDetail(tradeId);
      setTrade(t);
    } catch (e) {
      toast(e?.message || '거래 약속에 실패했어요.');
    } finally {
      setTradeLoading(false);
    }
  }

  async function handleConfirmTrade(tradeId = trade?.tradeId) {
    if (!tradeId) return;
    setTradeLoading(true);
    try {
      await tradeApi.confirmTrade(tradeId);
      const t = await tradeApi.getTradeDetail(tradeId);
      setTrade(t);
    } catch (e) {
      toast(e?.message || '거래 완료 확인에 실패했어요.');
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
        title="채팅방을 삭제할까요?"
        desc="삭제한 채팅방은 복구할 수 없고 대화 내용이 모두 사라져요."
        confirmLabel="채팅방 삭제"
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

  const listing2 = serverListing || (activeChat ? state.listings.find((x) => x.id === activeChat.listingId) : null);
  const partner2 = activeChat ? (activeChat.anonymous ? { name: '익명 사용자', color: '#9195A6' } : userOf(activeChat.partnerId, activeChat.partnerName)) : null;
  const myServerId = state.users?.me?.serverId;
  const isSeller = (trade && myServerId && String(trade.sellerId) === String(myServerId)) || 
                   (listing2?.sellerId && myServerId && String(listing2.sellerId) === String(myServerId));
  const isBuyer = (trade && myServerId && String(trade.buyerId) === String(myServerId)) || 
                  (!isSeller && myServerId);
  const myConfirmed = isSeller ? trade?.sellerConfirmed : (isBuyer ? trade?.buyerConfirmed : false);
  const myPromised = isSeller ? trade?.sellerPromised : (isBuyer ? trade?.buyerPromised : false);
  const tradeStatus = trade?.status || 'NOT_REQUESTED'; // TRADING | COMPLETED | CANCELLED | NOT_REQUESTED
  const itemTradeCompleted = tradeStatus === 'COMPLETED';
  // 상품이 거래완료여도 계속 채팅이 가능하도록 차단 해제 (사용자 요청)
  const chatBlocked = false;

  return (
    <div className="chat-page fade-enter">
      <h1 className="h1 chat-page-title">실시간 거래 채팅</h1>
      <div className={'chat-shell' + (activeId ? ' show-room' : '')}>
        <div className="chat-list-pane">
          <div className="chat-list-head">
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
              <div className="chat-room-partner"
                style={{ cursor: activeChat.anonymous ? 'default' : 'pointer' }}
                onClick={() => { if (!activeChat.anonymous && partner2?.id) navigate(`/users/${partner2.id}`, { state: { user: partner2, back: { to: `/chat/${activeId}`, label: '채팅으로 돌아가기' } } }); }}
              >
                <Avatar user={partner2} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="name">{partner2.name}</div>
                  {listing2 && (
                    <div className="chat-room-item">
                      {listing2.title}
                    </div>
                  )}
              </div>
              </div>
              {listing2 && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link className="btn btn-outline btn-sm chat-room-head-cta" to={`/market/${listing2.id}?from=chat&chatId=${activeId}`}>
                    상품 보기
                  </Link>
                  {activeChat?.listingId && (!trade || tradeStatus === 'CANCELLED') && !isSeller && (
                    <button 
                      className="btn btn-primary btn-sm chat-room-head-cta" 
                      onClick={handleProposeTrade}
                      disabled={tradeLoading}
                    >
                      거래 요청하기
                    </button>
                  )}
                </div>
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
                    {/* 거래 요청 버튼 삭제 - 위젯으로 이동됨 */}
                    {/* 거래 약속 버튼 - 거래중이고 아직 내가 약속 안 했을 때 */}
                    {trade && tradeStatus === 'TRADING' && !myPromised && (
                      <button
                        style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        onClick={() => { setMenuOpen(false); handlePromiseTrade(); }}
                        disabled={tradeLoading}
                      >
                        거래 약속
                      </button>
                    )}
                    {/* 거래 완료 확인 버튼 - 약속확정이고 아직 내가 확인 안 했을 때 */}
                    {trade && tradeStatus === 'PROMISED' && !myConfirmed && (
                      <button
                        style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10, color: '#10b981' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        onClick={() => { setMenuOpen(false); handleConfirmTrade(); }}
                        disabled={tradeLoading}
                      >
                        거래 완료 확인
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
                    <div style={{ height: 1, background: 'var(--border-soft)', margin: '4px 0' }} />
                    <button
                      style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-soft)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      onClick={() => { setMenuOpen(false); handleDeleteRoom(); }}
                    >
                      채팅방 삭제
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* 거래 상태 배너 */}
            {activeChat?.listingId && (() => {
              const steps = ['거래 시작', '거래 중', '약속 확정', '거래 완료'];
              let activeIdx = 0;
              if (tradeStatus === 'TRADING') activeIdx = 1;
              if (tradeStatus === 'PROMISED') activeIdx = 2;
              if (tradeStatus === 'COMPLETED') activeIdx = 3;

              return (
                <div className="chat-trade-wrap">
                  <div className="chat-trade-card">
                    <div className="chat-trade-status-row">
                      <span className="chat-trade-status">
                        {tradeStatus === 'NOT_REQUESTED' || tradeStatus === 'CANCELLED' ? '거래를 시작해 보세요' :
                         tradeStatus === 'REQUESTED' ? '거래 요청이 도착했어요' :
                         tradeStatus === 'TRADING' ? '거래 중이에요' :
                         tradeStatus === 'PROMISED' ? '약속이 확정됐어요' :
                         '거래가 완료됐어요'}
                      </span>
                      <div style={{ flexShrink: 0 }}>
                        {(tradeStatus === 'NOT_REQUESTED' || tradeStatus === 'CANCELLED') && isSeller && (
                          <div style={{ fontSize: 13, color: 'var(--ink-soft)', background: 'var(--surface-2)', padding: '6px 12px', borderRadius: 6 }}>
                            요청 대기 중
                          </div>
                        )}
                        {tradeStatus === 'REQUESTED' && isSeller && (
                          <div className="row g8">
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleRejectTrade()}
                              disabled={tradeLoading}
                            >
                              거절
                            </button>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleAcceptTrade()}
                              disabled={tradeLoading}
                            >
                              수락
                            </button>
                          </div>
                        )}
                        {tradeStatus === 'TRADING' && !myPromised && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handlePromiseTrade()}
                            disabled={tradeLoading}
                          >
                            거래 약속
                          </button>
                        )}
                        {tradeStatus === 'TRADING' && myPromised && (
                          <div style={{ fontSize: 13, color: 'var(--ink-soft)', background: 'var(--surface-2)', padding: '6px 12px', borderRadius: 6 }}>
                            상대방의 수락을 기다리는 중
                          </div>
                        )}
                        {tradeStatus === 'PROMISED' && !myConfirmed && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleConfirmTrade()}
                            disabled={tradeLoading}
                          >
                            거래 완료 확인
                          </button>
                        )}
                        {tradeStatus === 'PROMISED' && myConfirmed && (
                          <div style={{ fontSize: 13, color: 'var(--ink-soft)', background: 'var(--surface-2)', padding: '6px 12px', borderRadius: 6 }}>
                            상대방의 확인을 기다리는 중
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PROGRESS BAR */}
                    <div className="trade-steps">
                      <div className="trade-steps-labels">
                        {steps.map((step, idx) => (
                          <span key={step} className={idx <= activeIdx ? 'on' : ''}>{step}</span>
                        ))}
                      </div>
                      <div className="trade-steps-track">
                        <div className="trade-steps-fill" style={{ width: `${((activeIdx + 1) / steps.length) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            {activeChat.showSafety !== false && (
              <div className="chat-safety-wrap">
                <SafetyBanner compact onClose={() => dismissSafety(activeId)} />
              </div>
            )}
            <div className="chat-msgs" ref={msgsRef}>
              {activeChat.messages.map((m, i) => {
                const prev = activeChat.messages[i - 1];
                const next = activeChat.messages[i + 1];
                const showTime = !next || next.from !== m.from;
                const showDate = !prev || dateLabel(prev.time) !== dateLabel(m.time);
                // 상대가 아직 읽지 않은 내 메시지에 "1" 표시 (서버 메시지 ID가 있을 때만)
                const unreadByPartner = m.from === 'me' && m.id != null && m.id > (activeChat.partnerLastReadId ?? 0);
                return (
                  <div key={m.id ?? i}>
                    {showDate && <div className="chat-date-sep">{dateLabel(m.time)}</div>}
                    <div className={'bubble-row ' + m.from}>
                      <div className="bubble-row-inner">
                        {/* 상대가 안 읽은 "1"은 말풍선 끝 바로 옆, 시간은 말풍선 아래 */}
                        <div className="bubble-line">
                          <div className="bubble">{m.text}</div>
                          {unreadByPartner && <span className="bubble-read">1</span>}
                        </div>
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
            ) : suspension ? (
              <div className="chatinput" style={{ justifyContent: 'center', opacity: 0.7 }}>
                <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                  이용 정지 기간{suspension.until ? `(${formatDate(suspension.until)} ${hm(suspension.until)}까지)` : ''}에는 메시지를 보낼 수 없어요.
                </span>
              </div>
            ) : chatBlocked ? (
              <div className="chatinput" style={{ justifyContent: 'center', opacity: 0.6 }}>
                <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>거래가 완료된 채팅방입니다. 메시지를 보낼 수 없어요.</span>
              </div>
            ) : (
              <div className="chatinput">
                <button className="iconbtn ghost chatinput-add" title="파일 첨부" onClick={() => toast('데모에서는 파일 첨부가 지원되지 않아요')}>
                  <Icon name="plus" size={17} />
                </button>
                <input
                  placeholder="메시지를 입력하세요..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') send();
                  }}
                />
                <button className="btn btn-primary chat-send-btn" onClick={send} disabled={!input.trim()} aria-label="전송" title="전송">
                  <Icon name="send" size={17} />
                </button>
              </div>
            )}
          </div>

        ) : (
          <div className="chat-room-pane">
            <div className="chat-empty-state">
              <div className="chat-empty-icon">
                <Icon name="message-circle" size={30} />
              </div>
              <div className="chat-empty-title">대화를 시작해보세요</div>
              <div className="chat-empty-sub">
                왼쪽에서 채팅방을 고르거나,
                <br />
                중고거래 글에서 판매자에게 대화를 요청해보세요.
              </div>
              <div className="chat-empty-cta">
                <Link className="btn btn-outline" to="/market">
                  <Icon name="shopping-bag" size={16} />
                  중고거래 둘러보기
                </Link>
                <Link className="btn btn-outline" to="/community">
                  <Icon name="message-square" size={16} />
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
