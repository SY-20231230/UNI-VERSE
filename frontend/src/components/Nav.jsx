import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import Icon from '../lib/icons';
import Avatar from './Avatar';
import { useApp } from '../context/AppContext';
import { timeAgo, won } from '../lib/format';
import useNotifications from '../lib/useNotifications';
import { notificationMeta } from '../lib/notificationApi';

const NAV_TABS = [
  { k: 'home', icon: 'home', label: '홈', path: '/' },
  { k: 'community', icon: 'board', label: '커뮤니티', path: '/community' },
  { k: 'market', icon: 'tag', label: '중고거래', path: '/market' },
  { k: 'chat', icon: 'chat', label: '채팅', path: '/chat' },
];

const ADMIN_TAB = { k: 'admin', icon: 'shield', label: '관리자', path: '/admin' };

function activeRoot(pathname) {
  if (pathname === '/') return 'home';
  const seg = pathname.split('/')[1];
  return seg || 'home';
}

export default function Nav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, userOf } = useApp();
  const root = activeRoot(location.pathname);
  const tabs = state.isAdmin ? [...NAV_TABS, ADMIN_TAB] : NAV_TABS;

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const server = useNotifications();

  useEffect(() => {
    function onClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    setNotifOpen(false);
  }, [location.pathname]);

  // 실제 로그인(토큰) 상태면 채팅 요청도 서버 알림으로 오므로, 로컬 목업 채팅 알림은 토큰이 없을 때만 쓴다.
  const pendingChats = server.enabled ? [] : Object.entries(state.chats)
    .filter(([, c]) => c.status === 'pending')
    .map(([cid, c]) => ({ cid, ...c }))
    .sort((a, b) => (b.messages[b.messages.length - 1]?.time || 0) - (a.messages[a.messages.length - 1]?.time || 0));

  const pendingReportCount = state.isAdmin ? (state.reportRecords || []).filter((r) => r.status === '대기중').length : 0;

  const notifCount = pendingChats.length + (pendingReportCount > 0 ? 1 : 0) + server.unreadCount;
  const listCount = pendingChats.length + (pendingReportCount > 0 ? 1 : 0) + server.items.length;

  function goTo(path) {
    setNotifOpen(false);
    navigate(path);
  }

  function toggleNotif() {
    if (!notifOpen) server.loadList();
    setNotifOpen((v) => !v);
  }

  function openServerNotification(n, path) {
    server.markRead(n);
    if (path) goTo(path);
  }

  return (
    <header id="nav">
      <div className="nav-inner">
        <Link className="brand" to="/">
          <span className="wordmark">
            UNI<b>:</b>VERSE
          </span>
        </Link>
        <nav className="nav-links">
          {tabs.map((t) => (
            <Link key={t.k} className={'navlink' + (root === t.k ? ' active' : '')} to={t.path}>
              <Icon name={t.icon} size={17} />
              <span className="lbl">{t.label}</span>
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <div className="notif-wrap" ref={notifRef}>
            <button className="iconbtn ghost" onClick={toggleNotif} aria-label={notifCount > 0 ? `알림 ${notifCount}개` : '알림'}>
              <Icon name="bell" size={18} />
              {notifCount > 0 && <span className="notif-dot"></span>}
            </button>
            {notifOpen && (
              <div className="notif-popover">
                <div className="notif-popover-head">
                  <span>알림</span>
                  {server.unreadCount > 0 && (
                    <button type="button" className="notif-read-all" onClick={server.markAllRead}>
                      모두 읽음
                    </button>
                  )}
                </div>
                {server.error && <div className="notif-error">{server.error}</div>}
                {listCount === 0 ? (
                  <div className="notif-empty">{server.loading ? '불러오는 중…' : '새 알림이 없어요'}</div>
                ) : (
                  <div className="notif-list">
                    {pendingReportCount > 0 && (
                      <button type="button" className="notif-item" onClick={() => goTo('/admin')}>
                        <div className="notif-item-icon">
                          <Icon name="flag" size={15} />
                        </div>
                        <div className="notif-item-text">
                          <div className="notif-item-title">새로운 신고 {pendingReportCount}건이 있어요</div>
                          <div className="notif-item-meta">관리자 페이지에서 확인하기</div>
                        </div>
                      </button>
                    )}
                    {pendingChats.map((c) => {
                      const partner = c.anonymous ? { name: '익명 사용자', color: '#9195A6' } : userOf(c.partnerId);
                      const listing = state.listings.find((l) => l.id === c.listingId);
                      const last = c.messages[c.messages.length - 1];
                      return (
                        <button key={c.cid} type="button" className="notif-item" onClick={() => goTo(`/chat/${c.cid}`)}>
                          <Avatar user={partner} size={32} />
                          <div className="notif-item-text">
                            <div className="notif-item-title">
                              {partner.name}님이 채팅을 요청했어요
                              {listing && <> · {won(listing.price)}</>}
                            </div>
                            <div className="notif-item-meta">{last ? timeAgo(last.time) : ''}</div>
                          </div>
                        </button>
                      );
                    })}
                    {server.items.map((n) => {
                      const { icon, path } = notificationMeta(n);
                      return (
                        <button
                          key={n.notificationId}
                          type="button"
                          className={'notif-item' + (n.isRead ? '' : ' unread')}
                          onClick={() => openServerNotification(n, path)}
                        >
                          <div className="notif-item-icon">
                            <Icon name={icon} size={15} />
                          </div>
                          <div className="notif-item-text">
                            <div className="notif-item-title">{n.content}</div>
                            <div className="notif-item-meta">{n.createdAt ? timeAgo(new Date(n.createdAt).getTime()) : ''}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <Link className={'iconbtn' + (root === 'mypage' ? ' accent' : '')} to="/mypage" title="마이페이지">
            <Icon name="user" size={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}
