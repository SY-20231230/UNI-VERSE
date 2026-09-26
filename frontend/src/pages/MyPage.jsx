import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useRef } from 'react';
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
  const profileLine = server.enabled
    ? summary
      ? [summary.schoolName || '학교 미등록', summary.schoolVerified ? '학교 인증 완료' : '학교 인증 필요', summary.email].join(' · ')
      : server.error || '불러오는 중…'
    : `${me.dept} · ${me.studentNo} · ${me.joined} 가입`;
  const stats = server.enabled
    ? [
        { label: '신뢰점수', value: summary ? `${summary.trustScore}점` : '–', accent: true },
        { label: '거래완료', value: summary?.completedTradeCount ?? '–' },
        { label: '작성한 글', value: summary?.postCount ?? '–' },
        { label: '등록한 거래', value: summary?.marketItemCount ?? '–' },
      ]
    : [
        { label: '신뢰점수', value: `${me.trustScore ?? 0}점`, accent: true },
        { label: '거래완료', value: done },
        { label: '진행중', value: going },
        { label: '내 신고', value: state.reports || 0 },
      ];
  const counts = server.enabled
    ? { posts: summary?.postCount ?? 0, listings: summary?.marketItemCount ?? 0, liked: null }
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
    <div className="container fade-enter">
      <div className="card profile-card">
        <div className="profile-cover">
          <div className="hero-dots"></div>
          <button className="profile-logout" onClick={handleLogout}>
            <Icon name="logout" size={13} />
            로그아웃
          </button>
        </div>
        <div className="profile-body">
          <div className="profile-avatar-wrap">
            <Avatar user={me} size={96} />
            <button className="avatar-edit-btn" title="프로필 사진 변경" onClick={() => fileRef.current?.click()}>
              <Icon name="camera" size={14} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhotoPick} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="row g8">
              <span className="h2">{me.name}</span>
            </div>
            <div className="faint" style={{ fontSize: 12.5, marginTop: 5 }}>
              {profileLine}
            </div>
            {me.avatarUrl && (
              <button className="link" style={{ marginTop: 6, fontSize: 11.5 }} onClick={removeProfilePhoto}>
                기본 이미지로 되돌리기
              </button>
            )}
          </div>
        </div>
        <div className="stat-row-plain">
          {stats.map((s) => (
            <div className="stat-plain" key={s.label}>
              <b className="tnum" style={s.accent ? { color: 'var(--accent)' } : undefined}>{s.value}</b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="tab-row-plain" style={{ marginTop: 26 }}>
        {TABS.map((t) => (
          <button key={t.k} className={tab === t.k ? 'on' : ''} onClick={() => setTab(t.k)}>
            {t.label}
            {counts[t.k] != null && ` (${counts[t.k]})`}
          </button>
        ))}
      </div>

      {server.enabled ? (
        <ServerTabs tab={tab} posts={server.posts} items={server.items} loading={server.loading} />
      ) : (
      <div style={{ marginTop: 4 }}>
        {tab === 'posts' && (
          <div style={{ maxWidth: 760 }}>
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

// 커뮤니티·중고거래 상세 화면이 아직 목업이라 서버 목록은 링크 없이 보여준다.
function ServerTabs({ tab, posts, items, loading }) {
  if (loading) return <div className="empty">불러오는 중…</div>;

  if (tab === 'posts') {
    if (!posts.length) return <Empty icon="board" text="아직 작성한 글이 없어요" />;
    return (
      <div style={{ maxWidth: 760, marginTop: 4 }}>
        {posts.map((p) => {
          const meta = POST_CATEGORY_LABELS[p.category] || { label: p.category, variant: 'outline' };
          return (
            <div className="mypage-post-row" key={p.postId}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row g6">
                  <span className={'chip ' + meta.variant}>{meta.label}</span>
                  {p.isAnonymous && <span className="chip outline">익명</span>}
                </div>
                <span className="title">{p.title}</span>
                <div className="meta">
                  {formatDate(p.createdAt)} · 조회 {p.viewCount}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (tab === 'listings') {
    if (!items.length) return <Empty icon="tag" text="아직 등록한 거래가 없어요" />;
    return (
      <div style={{ maxWidth: 760, marginTop: 4 }}>
        {items.map((item) => {
          const status = TRADE_STATUS_LABELS[item.tradeStatus] || { label: item.tradeStatus, variant: 'outline' };
          return (
            <div className="mypage-post-row" key={item.itemId}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row g6">
                  <span className={'chip ' + status.variant}>{status.label}</span>
                </div>
                <span className="title">{item.title}</span>
                <div className="meta">
                  {won(item.listedPrice)} · {formatDate(item.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return <Empty icon="heart" text="찜 목록은 아직 준비 중이에요" />;
}
