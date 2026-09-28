import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../lib/icons';
import { useApp } from '../context/AppContext';
import PostCard from '../components/PostCard';
import ListingGridCard from '../components/ListingGridCard';
import Avatar from '../components/Avatar';
import VerifiedChip from '../components/VerifiedChip';
import { useMouseGlow } from '../lib/useMouseGlow';
import { POST_CATEGORY_META, postCategoryToApi } from '../lib/category';
import { communityApi } from '../lib/communityApi';
import { marketApi } from '../lib/marketApi';

const HOME_BOARD_CATS = ['자유', '수업/학점', '학교생활', '시설/환경', '기숙사', '취업/진로', '기타'];
const CAMPUS_NOTICES = [
  { tag: '공지', variant: 'accent', text: '2학기 수강 정정 기간 안내 (~9/26)' },
  { tag: '행사', variant: 'success', text: '가을 축제 부스 신청 접수 시작' },
  { tag: '학식', variant: 'warn', text: '오늘의 학생식당 메뉴: 제육불고기' },
];

export default function Home() {
  const { state, userOf, setCommunityFilter } = useApp();
  const navigate = useNavigate();
  const me = userOf('me');
  const heroRef = useMouseGlow();
  // 실제 로그인이면 서버의 인기글·새 매물·게시판별 글 수를, 데모 모드면 목업 데이터를 보여준다.
  const isServer = state.authMode === 'server';
  const [server, setServer] = useState({ posts: [], listings: [], counts: {} });
  useEffect(() => {
    if (!isServer) return undefined;
    let cancelled = false;
    const safe = (promise, fallback) => promise.catch((err) => { console.error(err); return fallback; });
    Promise.all([
      safe(communityApi.getPosts({ sort: 'popular', page: 0, size: 4 }), { content: [] }),
      safe(marketApi.getItems({ sort: 'createdAt,desc', page: 0, size: 12 }), { content: [] }),
      Promise.all(HOME_BOARD_CATS.map((c) =>
        safe(communityApi.getPosts({ category: postCategoryToApi(c), page: 0, size: 1 }), { totalElements: 0 })
          .then((res) => [c, res.totalElements ?? 0]))),
    ]).then(([posts, items, counts]) => {
      if (cancelled) return;
      setServer({
        posts: posts.content || [],
        listings: (items.content || []).filter((l) => l.tradeStatus === 'SELLING').slice(0, 4),
        counts: Object.fromEntries(counts),
      });
    });
    return () => { cancelled = true; };
  }, [isServer]);

  const topPosts = isServer ? server.posts : [...state.posts].sort((a, b) => b.likes - a.likes).slice(0, 4);
  const freshListings = isServer ? server.listings : state.listings.filter((l) => l.status === '판매중').slice(0, 4);
  const boardCount = (c) => (isServer ? server.counts[c] ?? 0 : state.posts.filter((p) => p.category === c).length);
  const [noticeTipOpen, setNoticeTipOpen] = useState(false);
  const todayLabel = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

  const myActivity = [
    { icon: 'edit', label: '내가 쓴 글', go: '/mypage?tab=posts' },
    { icon: 'tag', label: '등록한 거래', go: '/mypage?tab=listings' },
    { icon: 'heart', label: '찜한 거래', go: '/mypage?tab=liked' },
    { icon: 'chat', label: '채팅 요청', go: '/chat' },
  ];

  function goToBoard(cat) {
    setCommunityFilter(cat);
    navigate('/community');
  }

  return (
    <>
      <div className="container fade-enter">
        <div className="hero-banner" ref={heroRef}>
          <div className="hero-dots"></div>
          <div style={{ position: 'relative', maxWidth: 480 }}>
            <div className="hero-heading">
              <span className="hero-name">{me.name}님,</span>
              <span className="hero-sub">오늘도 좋은 하루 보내세요</span>
            </div>
            <div className="row g10" style={{ marginTop: 14 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.82)' }}>
                {[me.school, me.dept].filter(Boolean).join(' · ')}
              </span>
              <VerifiedChip level={me.verified} score={me.trustScore} light />
            </div>
            <div className="row g8" style={{ marginTop: 24 }}>
              <Link className="chip" style={{ background: 'rgba(255,255,255,.16)', color: '#fff', border: '1px solid rgba(255,255,255,.4)' }} to="/market/write">
                <Icon name="plus" size={13} />
                중고거래 등록
              </Link>
              <Link className="chip" style={{ background: 'rgba(255,255,255,.16)', color: '#fff', border: '1px solid rgba(255,255,255,.4)' }} to="/community/write">
                <Icon name="edit" size={13} />
                커뮤니티 글쓰기
              </Link>
            </div>
          </div>
          <div className="hero-portrait">
            <Avatar user={me} size={104} />
          </div>
        </div>

        <div className="quick-row">
          {myActivity.map((q) => (
            <Link key={q.label} className="quick-tile" to={q.go}>
              <Icon name={q.icon} size={20} />
              <span>{q.label}</span>
            </Link>
          ))}
        </div>

        <div className="home-layout">
          <div>
            <div className="page-head" style={{ marginTop: 6 }}>
              <span className="h2">지금 인기글</span>
              <Link className="link" to="/community">
                커뮤니티 더보기
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
                  <span className="h3">오늘의 캠퍼스</span>
                  <span className={'info-tip' + (noticeTipOpen ? ' open' : '')}>
                    <button type="button" className="info-tip-btn" aria-label="오늘의 캠퍼스 안내"
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
                {CAMPUS_NOTICES.map((n) => (
                  <div className="row g10" key={n.text}>
                    <span className={'chip ' + n.variant} style={{ flex: 'none' }}>{n.tag}</span>
                    <span style={{ fontSize: 12.5 }}>{n.text}</span>
                  </div>
                ))}
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

        <div className="page-head" style={{ marginTop: 26 }}>
          <span className="h2">새로 올라온 중고거래</span>
          <Link className="link" to="/market">
            중고거래 더보기
          </Link>
        </div>
        {freshListings.length === 0 && <div className="home-empty">아직 판매 중인 물건이 없어요.</div>}
        <div className="card-grid">
          {freshListings.map((l) => (
            <ListingGridCard key={l.itemId ?? l.id} listing={l} />
          ))}
        </div>
      </div>
    </>
  );
}
