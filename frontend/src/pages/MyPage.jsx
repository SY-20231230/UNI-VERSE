import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import Icon from '../lib/icons';
import Avatar from '../components/Avatar';
import ListingGridCard from '../components/ListingGridCard';
import ConfirmModal from '../components/ConfirmModal';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { POST_CATEGORY_META } from '../lib/category';
import { formatDate, won } from '../lib/format';
import useMyPage from '../lib/useMyPage';
import { POST_CATEGORY_LABELS, TRADE_STATUS_LABELS } from '../lib/mypageApi';

const TABS = [
  { k: 'posts', label: '내가 쓴 글' },
  { k: 'listings', label: '등록한 거래' },
  { k: 'liked', label: '찜한 거래' },
];

export default function MyPage() {
  const { state, userOf, logout, updateProfilePhoto, removeProfilePhoto, deleteCommunityPost } = useApp();
  const { openModal, closeOverlay, toast } = useUI();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileRef = useRef(null);
  // 사진이 있으면 카메라 버튼 옆에 '사진 변경 / 기본 이미지로' 작은 메뉴를 연다. 없으면 바로 사진을 고른다.
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const photoMenuRef = useRef(null);
  useEffect(() => {
    if (!photoMenuOpen) return undefined;
    const close = (e) => { if (photoMenuRef.current && !photoMenuRef.current.contains(e.target)) setPhotoMenuOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setPhotoMenuOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', onKey); };
  }, [photoMenuOpen]);
  function openPhotoMenu() {
    if (!me.avatarUrl) fileRef.current?.click();
    else setPhotoMenuOpen((v) => !v);
  }

  const requestedTab = searchParams.get('tab');
  const tab = TABS.some((t) => t.k === requestedTab) ? requestedTab : 'posts';

  const me = userOf('me');
  const myPosts = state.posts.filter((p) => p.authorId === 'me');
  const myListings = state.listings.filter((l) => l.sellerId === 'me');
  const likedListings = state.listings.filter((l) => state.likedListings[l.id]);
  const done = myListings.filter((l) => l.status === '거래완료').length;
  const going = myListings.length - done;
  const tabCounts = { posts: myPosts.length, listings: myListings.length, liked: likedListings.length };

  // 실제 로그인이면 서버 데이터, 데모 모드면 기존 목업 데이터를 보여준다.
  const server = useMyPage();
  const summary = server.summary;
  // 1줄: 학교 · 학과 (인증 상태는 이름 옆 배지) / 2줄: 학교 이메일 (서버·데모 동일한 형식)
  const profileLine = server.enabled
    ? summary
      ? [summary.schoolName || me.school || '학교 미등록', me.dept].filter(Boolean).join(' · ')
      : server.error || '불러오는 중…'
    : [me.school, me.dept].filter(Boolean).join(' · ');
  // 요약을 받기 전에는 배지를 보이지 않는다.
  const schoolVerified = server.enabled ? (summary ? !!summary.schoolVerified : null) : true;
  const withUnit = (v, unit) => (v === '–' || v === undefined || v === null ? '–' : `${v}${unit}`);
  const profileEmail = server.enabled ? summary?.email : me.email;
  const stats = server.enabled
    ? [
        { label: '신뢰점수', value: summary ? `${summary.trustScore}점` : '–', accent: true },
        { label: '거래완료', value: withUnit(summary?.completedTradeCount, '건') },
        { label: '작성한 글', value: withUnit(summary?.postCount, '개') },
        { label: '등록한 거래', value: withUnit(summary?.marketItemCount, '건') },
      ]
    : [
        { label: '신뢰점수', value: `${me.trustScore ?? 0}점`, accent: true },
        { label: '거래완료', value: `${done}건` },
        { label: '진행중', value: `${going}건` },
        { label: '내 신고', value: `${state.reports || 0}건` },
      ];
  const counts = server.enabled
    ? { posts: summary?.postCount ?? 0, listings: summary?.marketItemCount ?? 0, liked: server.favorites.totalElements }
    : tabCounts;

  function setTab(k) {
    setSearchParams(k === 'posts' ? {} : { tab: k });
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function handlePhotoPick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateProfilePhoto(reader.result);
    reader.readAsDataURL(file);
  }

  function editPost(id) {
    navigate(`/community/${id}/edit`);
  }

  function askDeletePost(id) {
    openModal(
      <ConfirmModal
        title="게시글을 삭제할까요?"
        desc="삭제한 게시글은 복구할 수 없어요."
        onClose={closeOverlay}
        onConfirm={() => {
          deleteCommunityPost(id);
          toast('게시글이 삭제되었습니다');
        }}
      />
    );
  }

  return (
    <div className="container mypage-container fade-enter">
      <div className="card profile-card">
        <div className="profile-body">
          <div className="profile-avatar-wrap" ref={photoMenuRef}>
            <Avatar user={me} size={96} />
            <button className="avatar-edit-btn" title="프로필 사진 변경" onClick={openPhotoMenu}
              aria-haspopup={me.avatarUrl ? 'menu' : undefined} aria-expanded={me.avatarUrl ? photoMenuOpen : undefined}>
              <Icon name="camera" size={14} />
            </button>
            {photoMenuOpen && (
              <div className="avatar-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => { setPhotoMenuOpen(false); fileRef.current?.click(); }}>
                  <Icon name="camera" size={14} />
                  사진 변경
                </button>
                <button type="button" role="menuitem" onClick={() => { setPhotoMenuOpen(false); removeProfilePhoto(); }}>
                  <Icon name="user" size={14} />
                  기본 이미지로
                </button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhotoPick} />
          </div>
          <div className="profile-info">
            <div className="row g8 wrap">
              <span className="profile-name">{me.name}</span>
              {schoolVerified !== null && (
                <span className={'chip ' + (schoolVerified ? 'success' : 'warn')}>
                  {schoolVerified ? '학교 인증 완료' : '학교 인증 필요'}
                </span>
              )}
            </div>
            <div className="profile-line">{profileLine}</div>
            {profileEmail && <div className="profile-email">{profileEmail}</div>}
          </div>
          <button className="btn btn-outline btn-sm mypage-logout" onClick={handleLogout}>
            <Icon name="logout" size={13} />
            로그아웃
          </button>
        </div>
        <div className="stat-row-plain">
          {stats.map((s) => (
            <div className="stat-plain" key={s.label}>
              <span>{s.label}</span>
              <b className="tnum" style={s.accent ? { color: 'var(--accent)' } : undefined}>{s.value}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="card mypage-tabs-card">
      <div className="tab-row-plain">
        {TABS.map((t) => (
          <button key={t.k} className={tab === t.k ? 'on' : ''} onClick={() => setTab(t.k)}>
            {t.label}
            {counts[t.k] != null && ` (${counts[t.k]})`}
          </button>
        ))}
      </div>

      {server.enabled ? (
        <ServerTabs tab={tab} posts={server.posts} items={server.items} favorites={server.favorites} />
      ) : (
      <div style={{ marginTop: 4 }}>
        {tab === 'posts' && (
          <div>
            {myPosts.length ? (
              myPosts.map((p) => {
                const meta = POST_CATEGORY_META[p.category] || POST_CATEGORY_META['기타'];
                return (
                  <div className="mypage-post-row" key={p.id}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row g6">
                        <span className={'chip ' + meta.variant}>{p.category}</span>
                        {p.anonymous && <span className="chip outline">익명</span>}
                      </div>
                      <Link className="title" to={`/community/${p.id}`}>
                        {p.title}
                      </Link>
                      <div className="meta">
                        {formatDate(p.time)} · <Icon name="heart" size={11} /> {p.likes} · <Icon name="chat" size={11} /> {p.comments.length}
                      </div>
                    </div>
                    <div className="mypage-post-row-actions">
                      <button onClick={() => editPost(p.id)}>수정</button>
                      <span>·</span>
                      <button onClick={() => askDeletePost(p.id)}>삭제</button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty">
                <div className="empty-icon">
                  <Icon name="board" size={28} />
                </div>
                <div className="h2" style={{ marginTop: 10 }}>
                  아직 작성한 글이 없어요
                </div>
              </div>
            )}
          </div>
        )}
        {tab === 'listings' &&
          (myListings.length ? (
            <div className="card-grid">
              {myListings.map((l) => (
                <ListingGridCard key={l.id} listing={l} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="empty-icon">
                <Icon name="tag" size={28} />
              </div>
              <div className="h2" style={{ marginTop: 10 }}>
                아직 등록한 거래가 없어요
              </div>
            </div>
          ))}
        {tab === 'liked' &&
          (likedListings.length ? (
            <div className="card-grid">
              {likedListings.map((l) => (
                <ListingGridCard key={l.id} listing={l} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="empty-icon">
                <Icon name="heart" size={28} />
              </div>
              <div className="h2" style={{ marginTop: 10 }}>
                찜한 거래가 없어요
              </div>
            </div>
          ))}
      </div>
      )}
      </div>
    </div>
  );
}

function Empty({ icon, text }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={28} />
      </div>
      <div className="h2" style={{ marginTop: 10 }}>
        {text}
      </div>
    </div>
  );
}

function Pager({ list }) {
  if (list.totalPages <= 1) return null;
  function go(page) {
    list.goPage(page);
    // 새 페이지를 위에서부터 보도록 탭 줄로 스크롤한다 (고정 헤더 높이만큼 여유).
    const tabs = document.querySelector('.tab-row-plain');
    if (tabs) window.scrollTo({ top: tabs.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
  }
  return (
    <nav className="row between mypage-pagination" aria-label="목록 페이지">
      <button className="btn btn-outline btn-sm" type="button" disabled={list.loading || list.page === 0} onClick={() => go(list.page - 1)}>이전</button>
      <span className="tnum">{list.page + 1} / {list.totalPages}</span>
      <button className="btn btn-outline btn-sm" type="button" disabled={list.loading || list.page + 1 >= list.totalPages} onClick={() => go(list.page + 1)}>다음</button>
    </nav>
  );
}

function ItemRows({ items }) {
  return items.map((item) => {
    const id = item.itemId || item.id;
    const status = TRADE_STATUS_LABELS[item.tradeStatus] || { label: item.tradeStatus, variant: 'outline' };
    return (
      <div className="mypage-post-row" key={id}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row g6">
            <span className={'chip ' + status.variant}>{status.label}</span>
          </div>
          <Link className="title" to={`/market/${id}`}>{item.title}</Link>
          <div className="meta">
            {won(item.listedPrice || item.price)} · {formatDate(item.createdAt)}
          </div>
        </div>
        <Link className="mypage-row-chev" to={`/market/${id}`} aria-label="상품 보기">
          <Icon name="chev" size={16} />
        </Link>
      </div>
    );
  });
}

// 목록은 페이지당 MYPAGE_PAGE_SIZE개씩 서버에서 받아 온다.
function ServerTabs({ tab, posts, items, favorites }) {
  const list = tab === 'posts' ? posts : tab === 'listings' ? items : tab === 'liked' ? favorites : null;
  if (!list) return null;
  if (list.loading && !list.content.length) return <div className="empty">불러오는 중…</div>;

  if (!list.content.length) {
    if (tab === 'posts') return <Empty icon="board" text="아직 작성한 글이 없어요" />;
    if (tab === 'listings') return <Empty icon="tag" text="아직 등록한 거래가 없어요" />;
    return <Empty icon="heart" text="아직 찜한 거래가 없어요" />;
  }

  return (
    <div style={{ marginTop: 4, opacity: list.loading ? 0.6 : 1 }}>
      {tab === 'posts'
        ? list.content.map((p) => {
            const meta = POST_CATEGORY_LABELS[p.category] || { label: p.category, variant: 'outline' };
            return (
              <div className="mypage-post-row" key={p.postId}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row g6">
                    <span className={'chip ' + meta.variant}>{meta.label}</span>
                    {p.isAnonymous && <span className="chip outline">익명</span>}
                  </div>
                  <Link className="title" to={`/community/${p.postId}`}>{p.title}</Link>
                  <div className="meta">
                    {formatDate(p.createdAt)} · 조회 {p.viewCount}
                  </div>
                </div>
                <Link className="mypage-row-chev" to={`/community/${p.postId}`} aria-label="게시글 보기">
                  <Icon name="chev" size={16} />
                </Link>
              </div>
            );
          })
        : <ItemRows items={list.content} />}
      <Pager list={list} />
    </div>
  );
}
