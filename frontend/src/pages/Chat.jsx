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
  const { state, userOf, sendChatMessage, receiveChatMessage, markChatRead, acceptChatRequest, declineChatRequest, deleteChatRoom, dismissSafety, stompConnected, publishMessage } = useApp();

  useEffect(() => {
    if (activeId && state.chats[activeId]?.unread) {
      markChatRead(activeId);
    }
  }, [activeId, state.chats, markChatRead]);
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
    
    // Check if the chat has an unread message
    // If the last message is from 'them' and there's no read receipt logic, we'll assume it's unread if we haven't visited this chat
    // For simplicity, we consider it unread if activeId !== cid and the last message is from 'them'
    // Alternatively, we can check if `c.hasUnread` is true (needs to be managed in AppContext).
    // I'll add a simple unread dot if it's from 'them' and activeId !== cid.
    // Better yet: AppContext adds `unread: true` to the chat when receiving a message.
    const isUnread = c.unread && cid !== activeId;

    return (
      <Link key={cid} className={'chat-row' + (cid === activeId ? ' active' : '')} to={`/chat/${cid}`}>
        <Avatar user={partner} size={44} />
        <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }} className="stack g4">
          <div className="row between">
            <b style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              {partner.name}
              {isUnread && <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--accent)' }}></span>}
            </b>
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

  // 채팅방 변경시 거래 정보 로드 및 STOMP 이벤트 수신
  const fetchTrade = useCallback(() => {
    if (!activeId || !activeChat?.listingId || !session.isActive()) return;
    tradeApi.getTradeByItem(activeChat.listingId).then(setTrade).catch(() => setTrade(null));
  }, [activeId, activeChat?.listingId]);

  useEffect(() => {
    setTrade(null);
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
      if (t) announceTrade(t, 'self');
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
      announceTrade(t, 'self');
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
      announceTrade(t, 'self');
    } catch (e) {
      toast('오류가 발생했어요.');
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
      announceTrade(t, 'self');
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

  const listing2 = activeChat ? state.listings.find((x) => x.id === activeChat.listingId) : null;
  const partner2 = activeChat ? (activeChat.anonymous ? { name: '익명 사용자', color: '#9195A6' } : userOf(activeChat.partnerId, activeChat.partnerName)) : null;
  const myServerId = state.users?.me?.serverId;
  const isSeller = trade && myServerId && String(trade.sellerId) === String(myServerId);
  const isBuyer = trade && myServerId && String(trade.buyerId) === String(myServerId);
  const myConfirmed = isSeller ? trade?.sellerConfirmed : (isBuyer ? trade?.buyerConfirmed : false);
  const myPromised = isSeller ? trade?.sellerPromised : (isBuyer ? trade?.buyerPromised : false);
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
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: activeChat.anonymous ? 'default' : 'pointer' }}
                onClick={() => { if (!activeChat.anonymous && partner2?.id) navigate(`/users/${partner2.id}`, { state: { user: partner2 } }); }}
              >
                <Avatar user={partner2} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="name" style={!activeChat.anonymous ? { '&:hover': { textDecoration: 'underline' } } : undefined}>{partner2.name}</div>
                {listing2 && (
                  <div className="faint" style={{ fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {listing2.title} · {won(listing2.price)} · 중고거래
                  </div>
                )}
              </div>
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
                    {/* 거래 요청 버튼 - 상품 ID가 있고 거래가 없을 때 표시 (취소된 경우 포함) */}
                    {activeChat?.listingId && (!trade || tradeStatus === 'CANCELLED') && !isSeller && (
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
                    {/* 거래 약속 버튼 - 거래중이고 아직 내가 약속 안 했을 때 */}
                    {trade && tradeStatus === 'TRADING' && !myPromised && (
                      <button
                        style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        onClick={() => { setMenuOpen(false); handlePromiseTrade(); }}
                        disabled={tradeLoading}
                      >
                        🤝 거래 약속
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
                    <div style={{ height: 1, background: 'var(--border-soft)', margin: '4px 0' }} />
                    <button
                      style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-soft)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      onClick={() => { setMenuOpen(false); handleDeleteRoom(); }}
                    >
                      🗑️ 채팅방 삭제
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* 거래 상태 배너 */}
            {trade && (() => {
              if (tradeStatus === 'CANCELLED') return null;
              
              const steps = ['거래 시작', '거래 중', '약속 확정', '거래 완료'];
              let activeIdx = 0;
              if (tradeStatus === 'TRADING') activeIdx = 1;
              if (tradeStatus === 'PROMISED') activeIdx = 2;
              if (tradeStatus === 'COMPLETED') activeIdx = 3;

              return (
                <div style={{ padding: '20px 20px 10px' }}>
                  <div style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 24,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div className="row g16" style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: 8, background: 'var(--accent-soft)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0
                        }}>
                          <Icon name="book" size={24} />
                        </div>
                        <div className="stack g4" style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                            {tradeStatus === 'REQUESTED' ? '거래 요청이 도착했어요' :
                             tradeStatus === 'TRADING' ? '거래 중이에요' :
                             tradeStatus === 'PROMISED' ? '약속이 확정됐어요' :
                             '거래가 완료됐어요'}
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {listing2?.title || trade.listingTitle || '상품 정보 없음'}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                            {listing2 ? won(listing2.price) : '0원'}
                          </div>
                        </div>
                      </div>
                      <div style={{ marginLeft: 16, flexShrink: 0 }}>
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
                            ⏳ 상대방의 수락을 기다리는 중...
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
                            ⏳ 상대방의 확인을 기다리는 중...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PROGRESS BAR */}
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', padding: '0 10px', marginTop: 10 }}>
                      <div style={{ position: 'absolute', top: 6, left: 40, right: 40, height: 2, background: 'var(--border)', zIndex: 0 }} />
                      <div style={{ position: 'absolute', top: 6, left: 40, width: `calc((100% - 80px) * ${activeIdx / 3})`, height: 2, background: 'var(--accent)', zIndex: 0, transition: 'width 0.3s ease' }} />
                      
                      {steps.map((step, idx) => {
                        const isPast = idx < activeIdx;
                        const isActive = idx === activeIdx;
                        return (
                          <div key={step} className="stack" style={{ alignItems: 'center', gap: 10, zIndex: 1, width: 60 }}>
                            <div style={{
                              width: 14, height: 14, borderRadius: '50%', background: 'var(--surface)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              ...(isActive || isPast ? {} : { border: '2px solid var(--border)' })
                            }}>
                              {isActive ? (
                                <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 0 4px var(--accent-soft)' }} />
                              ) : isPast ? (
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)' }} />
                              ) : null}
                            </div>
                            <div style={{ fontSize: 12, fontWeight: isActive || isPast ? 600 : 400, color: isActive || isPast ? 'var(--accent)' : 'var(--ink-faint)', whiteSpace: 'nowrap' }}>
                              {step}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
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
