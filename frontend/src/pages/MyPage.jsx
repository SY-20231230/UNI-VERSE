import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useRef } from 'react';
import Icon from '../lib/icons';
import Avatar from '../components/Avatar';
import ListingGridCard from '../components/ListingGridCard';
import ConfirmModal from '../components/ConfirmModal';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { POST_CATEGORY_META } from '../lib/category';
import { formatDate } from '../lib/format';

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

  function setTab(k) {
    setSearchParams(k === 'posts' ? {} : { tab: k });
  }

  function handleLogout() {
    logout();
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
              {me.dept} · {me.studentNo} · {me.joined} 가입
            </div>
            {me.avatarUrl && (
              <button className="link" style={{ marginTop: 6, fontSize: 11.5 }} onClick={removeProfilePhoto}>
                기본 이미지로 되돌리기
              </button>
            )}
          </div>
        </div>
        <div className="stat-row-plain">
          <div className="stat-plain">
            <b className="tnum" style={{ color: 'var(--accent)' }}>{me.trustScore ?? 0}점</b>
            <span>신뢰점수</span>
          </div>
          <div className="stat-plain">
            <b className="tnum">{done}</b>
            <span>거래완료</span>
          </div>
          <div className="stat-plain">
            <b className="tnum">{going}</b>
            <span>진행중</span>
          </div>
          <div className="stat-plain">
            <b className="tnum">{state.reports || 0}</b>
            <span>내 신고</span>
          </div>
        </div>
      </div>

      <div className="tab-row-plain" style={{ marginTop: 26 }}>
        {TABS.map((t) => (
          <button key={t.k} className={tab === t.k ? 'on' : ''} onClick={() => setTab(t.k)}>
            {t.label} ({tabCounts[t.k]})
          </button>
        ))}
      </div>

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
    </div>
  );
}
