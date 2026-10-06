import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../lib/icons';
import { useApp } from '../context/AppContext';
import PostCard from '../components/PostCard';
import ListingGridCard from '../components/ListingGridCard';
import Avatar from '../components/Avatar';
import { POST_CATEGORY_META, postCategoryToApi } from '../lib/category';
import { CAMPUS_NOTICES, fetchCampusNotices, isNoticePost } from '../lib/notices';
import { pickGreeting } from '../lib/greetings';
import { communityApi } from '../lib/communityApi';
import { marketApi } from '../lib/marketApi';
import { useSuspensionState } from '../lib/useSuspension';
import SuspensionNotice from '../components/SuspensionNotice';
import { createMypageApi } from '../lib/mypageApi';
import { sessionApiOptions } from '../lib/session';

const HOME_BOARD_CATS = ['자유', '수업/학점', '학교생활', '시설/환경', '기숙사', '취업/진로', '기타'];

export default function Home() {
  const { state, userOf, setCommunityFilter } = useApp();
  const navigate = useNavigate();
  const me = userOf('me');
  // 홈에 들어올 때마다 인사 문구를 하나 골라 두고, 다시 그려질 때는 바꾸지 않는다.
  const [greetingSeed] = useState(() => Math.random());
  const greeting = pickGreeting(me.name, new Date(), () => greetingSeed);
  const { suspension, release } = useSuspensionState();
  // 실제 로그인이면 서버의 인기글·새 매물·게시판별 글 수를, 데모 모드면 목업 데이터를 보여준다.
  const isServer = state.authMode === 'server';
  const [server, setServer] = useState({ posts: [], listings: [], counts: {}, notices: null });
  useEffect(() => {
    if (!isServer) return undefined;
    let cancelled = false;
    const safe = (promise, fallback) => promise.catch((err) => { console.error(err); return fallback; });
    // 학교 관리자 공지는 인기 게시글에서 빼고 오른쪽 캠퍼스 공지에만 보여준다.
    // 서버는 공지를 항상 맨 앞에 두므로 공지 개수만큼 더 받아 와서 걸러낸다.
    const noticesP = safe(fetchCampusNotices({ size: 3 }), { notices: CAMPUS_NOTICES, serverCount: 0 });
    Promise.all([
      noticesP,
      noticesP.then(({ serverCount }) =>
        safe(communityApi.getPosts({ sort: 'popular', page: 0, size: serverCount + 4 }), { content: [] })),
      safe(marketApi.getItems({ sort: 'createdAt,desc', page: 0, size: 12 }), { content: [] }),
      Promise.all(HOME_BOARD_CATS.map((c) =>
        safe(communityApi.getPosts({ category: postCategoryToApi(c), page: 0, size: 1 }), { totalElements: 0 })
          .then((res) => [c, res.totalElements ?? 0]))),
    ]).then(([notices, posts, items, counts]) => {
      if (cancelled) return;
      setServer({
        notices: notices.notices,
        posts: (posts.content || []).filter((p) => !isNoticePost(p)).slice(0, 4),
        // 거래가 끝나지 않은 상품(판매중·거래 요청중·거래중)을 새로 올라온 순으로 보여준다.
        listings: (items.content || [])
          .filter((l) => !['COMPLETED', 'CANCELLED'].includes(l.tradeStatus))
          .sort((a, b) => (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0) || (b.id ?? 0) - (a.id ?? 0))
          .slice(0, 4),
        counts: Object.fromEntries(counts),
      });
    });
    return () => { cancelled = true; };
  }, [isServer]);

  const topPosts = isServer ? server.posts : [...state.posts].sort((a, b) => b.likes - a.likes).slice(0, 4);
  const campusNotices = ((isServer && server.notices) || CAMPUS_NOTICES).slice(0, 3);
  const freshListings = isServer ? server.listings : state.listings.filter((l) => l.status === '판매중').slice(0, 4);
  const boardCount = (c) => (isServer ? server.counts[c] ?? 0 : state.posts.filter((p) => p.category === c).length);
  const [noticeTipOpen, setNoticeTipOpen] = useState(false);
  const todayLabel = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

  // 배너 아래 내 활동 숫자. 실제 로그인이면 마이페이지 요약을, 데모 모드면 목업 데이터를 센다.
  const [mine, setMine] = useState(null);
  useEffect(() => {
    if (!isServer) return undefined;
    const controller = new AbortController();
    const api = createMypageApi(sessionApiOptions);
    Promise.all([
      api.summary({ signal: controller.signal }),
      api.favoriteItems({ page: 0, size: 1 }, { signal: controller.signal }).catch(() => null),
    ]).then(([summary, favorites]) => setMine({ summary, favoriteCount: favorites?.totalElements }))
      .catch((err) => { if (err.name !== 'AbortError') console.error(err); });
    return () => controller.abort();
  }, [isServer]);
  const pendingChatCount = Object.values(state.chats || {}).filter((c) => c.status === 'pending').length;
  const counts = isServer
    ? { posts: mine?.summary?.postCount, listings: mine?.summary?.marketItemCount, liked: mine?.favoriteCount }
    : {
        posts: state.posts.filter((p) => p.authorId === 'me').length,
        listings: state.listings.filter((l) => l.sellerId === 'me').length,
        liked: state.listings.filter((l) => state.likedListings?.[l.id]).length,
      };
  const schoolVerified = isServer ? mine?.summary?.schoolVerified !== false : true;
  const schoolName = (isServer && mine?.summary?.schoolName) || me.school;
  const showCount = (n, unit = '') => (n === undefined || n === null ? '–' : `${n}${unit}`);

  const myActivity = [
    { icon: 'edit', label: '내가 쓴 글', value: showCount(counts.posts), go: '/mypage?tab=posts' },
    { icon: 'tag', label: '등록한 거래', value: showCount(counts.listings), go: '/mypage?tab=listings' },
    { icon: 'heart', label: '찜한 거래', value: showCount(counts.liked, '개'), go: '/mypage?tab=liked' },
    { icon: 'chat', label: '채팅 요청', value: `${pendingChatCount}건`, go: '/chat' },
  ];

  function goToBoard(cat) {
    setCommunityFilter(cat);
    navigate('/community');
  }

  return (
    <>
      <div className="container fade-enter">
        <SuspensionNotice suspension={suspension} release={release} style={{ marginBottom: 16 }} />
        <div className="hero-banner">
          <div className="hero-main">
            <span className="hero-eyebrow">
              <Icon name="shield" size={13} />
              {schoolVerified ? ['학교 인증 완료', schoolName].filter(Boolean).join(' · ') : '학교 인증 필요'}
            </span>
            <h1 className="hero-name">{greeting.title}</h1>
            <p className="hero-sub">{greeting.sub}</p>
            {!suspension && <div className="hero-actions">
              <Link className="hero-action" to="/community/write">
                <Icon name="chat" size={16} />
                커뮤니티 글쓰기
              </Link>
              <Link className="hero-action primary" to="/market/write">
                <Icon name="plus" size={16} />
                중고거래 물품등록
              </Link>
            </div>}
          </div>
          <Link className="hero-profile" to="/mypage">
            <span className="hero-profile-avatar">
              <Avatar user={me} size={54} />
              {schoolVerified && (
                <span className="hero-profile-check">
                  <Icon name="check" size={14} />
                </span>
              )}
            </span>
            <span className="hero-profile-name">{me.name}</span>
            {me.dept && <span className="hero-profile-dept">{me.dept}</span>}
            <span className="hero-profile-score">
              신뢰점수 {me.trustScore ?? 0}점
            </span>
          </Link>
        </div>

        <div className="quick-row">
          {myActivity.map((q) => (
            <Link key={q.label} className="quick-tile" to={q.go}>
              <span className="quick-tile-text">
                <span className="quick-tile-label">{q.label}</span>
                <span className="quick-tile-value tnum">{q.value}</span>
              </span>
              <span className="quick-tile-icon">
                <Icon name={q.icon} size={20} />
              </span>
            </Link>
          ))}
        </div>

        <div className="home-layout">
          <div>
            <div className="page-head" style={{ marginTop: 6 }}>
              <span className="h2 section-title">지금 인기 게시글</span>
              <Link className="link" to="/community">
                커뮤니티 더보기
                <Icon name="chev" size={14} />
              </Link>
            </div>
            {topPosts.length === 0 && <div className="home-empty">아직 올라온 글이 없어요. 첫 글을 남겨보세요!</div>}
            {topPosts.map((p) => (
              <PostCard key={p.postId ?? p.id} post={p} compact />
            ))}

          </div>
          <div>
            <div className="card side-card">
              <div className="row between">
                <div className="row g6">
                  <span className="h3">캠퍼스 공지</span>
                  <span className={'info-tip' + (noticeTipOpen ? ' open' : '')}>
                    <button type="button" className="info-tip-btn" aria-label="캠퍼스 공지 안내"
                      aria-describedby="campus-notice-tip"
                      onClick={() => setNoticeTipOpen((v) => !v)} onBlur={() => setNoticeTipOpen(false)}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <circle cx="8" cy="8" r="6.8" stroke="currentColor" strokeWidth="1.4" />
                        <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        <circle cx="8" cy="4.9" r="0.95" fill="currentColor" />
                      </svg>
                    </button>
                    <span id="campus-notice-tip" role="tooltip" className="info-tip-bubble">
                      추후 학교 홈페이지와 연동 예정
                    </span>
                  </span>
                </div>
                <span className="faint" style={{ fontSize: 11, fontWeight: 700 }}>{todayLabel}</span>
              </div>
              <div className="stack g10" style={{ marginTop: 12 }}>
                {campusNotices.map((n) => {
                  const inner = (
                    <>
                      <span className="chip accent" style={{ flex: 'none' }}>공지</span>
                      <span style={{ fontSize: 12.5 }}>{n.title}</span>
                    </>
                  );
                  return n.postId
                    ? <Link className="row g10" key={n.id} to={`/community/${n.postId}`}>{inner}</Link>
                    : <div className="row g10" key={n.id}>{inner}</div>;
                })}
              </div>
            </div>
            <div className="card side-card">
              <div className="h3">게시판 바로가기</div>
              <div className="cat-quicklist" style={{ marginTop: 8 }}>
                {HOME_BOARD_CATS.map((c) => (
                  <button key={c} onClick={() => goToBoard(c)}>
                    <Icon name={POST_CATEGORY_META[c].icon} size={15} />
                    {c}
                    <span className="cat-quicklist-count">
                      {boardCount(c)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="page-head" style={{ marginTop: 8 }}>
          <span className="h2 section-title">새로 올라온 중고거래</span>
          <Link className="link" to="/market">
            중고거래 전체보기
            <Icon name="chev" size={14} />
          </Link>
        </div>
        {freshListings.length === 0 && <div className="home-empty">아직 거래 중인 물건이 없어요.</div>}
        <div className="card-grid home-listings">
          {freshListings.map((l) => (
            <ListingGridCard key={l.itemId ?? l.id} listing={l} />
          ))}
        </div>
      </div>
    </>
  );
}
