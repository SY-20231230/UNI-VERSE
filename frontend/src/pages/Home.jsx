import { Link, useNavigate } from 'react-router-dom';
import Icon from '../lib/icons';
import { useApp } from '../context/AppContext';
import PostCard from '../components/PostCard';
import ListingGridCard from '../components/ListingGridCard';
import Footer from '../components/Footer';
import Avatar from '../components/Avatar';
import VerifiedChip from '../components/VerifiedChip';
import { useMouseGlow } from '../lib/useMouseGlow';
import { POST_CATEGORY_META } from '../lib/category';
import { won } from '../lib/format';

const HOME_BOARD_CATS = ['자유', '수업/학점', '학교생활', '시설/환경', '기숙사', '취업/진로', '기타'];
const LIBRARY_BUSY = 72;
const CAFETERIA_MENU = { name: '제육덮밥', price: 5500 };

export default function Home() {
  const { state, userOf, setCommunityFilter } = useApp();
  const navigate = useNavigate();
  const me = userOf('me');
  const heroRef = useMouseGlow();
  const topPosts = [...state.posts].sort((a, b) => b.likes - a.likes).slice(0, 4);
  const freshListings = state.listings.filter((l) => l.status === '판매중').slice(0, 4);
  const onSaleCount = state.listings.filter((l) => l.status === '판매중').length;
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
                {me.dept} · {me.year}
              </span>
              <VerifiedChip level={me.verified} light />
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
            {topPosts.map((p) => (
              <PostCard key={p.id} post={p} compact />
            ))}
          </div>
          <div>
            <div className="card side-card">
              <div className="row between">
                <div className="h3">오늘의 캠퍼스</div>
                <span className="faint" style={{ fontSize: 11, fontWeight: 700 }}>{todayLabel}</span>
              </div>
              <div style={{ marginTop: 4 }}>
                <div className="campus-row">
                  <div className="campus-row-icon">
                    <Icon name="sun" size={16} />
                  </div>
                  <div>
                    <div className="campus-row-label">날씨 · 서울</div>
                    <div className="campus-row-value">맑음 23°</div>
                  </div>
                </div>
                <div className="campus-row">
                  <div className="campus-row-icon">
                    <Icon name="book" size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="campus-row-label">도서관 혼잡도</div>
                    <div className="campus-row-value">현재 {LIBRARY_BUSY}% 혼잡</div>
                    <div className="mini-bar">
                      <div className="mini-bar-fill" style={{ width: `${LIBRARY_BUSY}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className="campus-row">
                  <div className="campus-row-icon">
                    <Icon name="bowl" size={16} />
                  </div>
                  <div>
                    <div className="campus-row-label">학생식당 오늘의 메뉴</div>
                    <div className="campus-row-value">
                      {CAFETERIA_MENU.name} · {won(CAFETERIA_MENU.price)}
                    </div>
                  </div>
                </div>
                <div className="campus-row">
                  <div className="campus-row-icon">
                    <Icon name="tag" size={16} />
                  </div>
                  <div>
                    <div className="campus-row-label">중고거래</div>
                    <div className="campus-row-value">판매중인 매물 {onSaleCount}개</div>
                  </div>
                </div>
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
                      {state.posts.filter((p) => p.category === c).length}
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
        <div className="card-grid">
          {freshListings.map((l) => (
            <ListingGridCard key={l.id} listing={l} />
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}
