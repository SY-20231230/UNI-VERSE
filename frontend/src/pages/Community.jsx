import { Link } from 'react-router-dom';
import { useState } from 'react';
import Icon from '../lib/icons';
import { useApp } from '../context/AppContext';
import PostCard from '../components/PostCard';
import { POST_CATEGORY_META } from '../lib/category';

const CATS = ['전체', '자유', '수업/학점', '학교생활', '시설/환경', '기숙사', '취업/진로', '기타'];
const SORTS = [
  { k: 'latest', label: '최신순' },
  { k: 'popular', label: '인기순' },
];

export default function Community() {
  const { state, setCommunityFilter } = useApp();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('latest');
  const query = q.trim().toLowerCase();
  const catCounts = CATS.reduce((acc, c) => {
    acc[c] = c === '전체' ? state.posts.length : state.posts.filter((p) => p.category === c).length;
    return acc;
  }, {});
  const list = state.posts
    .filter((p) => {
      const okCat = state.communityFilter === '전체' || p.category === state.communityFilter;
      const okQuery = !query || p.title.toLowerCase().includes(query) || p.body.toLowerCase().includes(query);
      return okCat && okQuery;
    })
    .slice()
    .sort((a, b) => (sort === 'popular' ? b.likes - a.likes : b.time - a.time));

  return (
    <div className="container fade-enter">
      <div className="page-head">
        <h1 className="h1">커뮤니티</h1>
        <Link className="btn btn-primary btn-sm" to="/community/write">
          <Icon name="plus" size={15} />
          글쓰기
        </Link>
      </div>
      <div className="search-bar">
        <Icon name="search" size={16} />
        <input placeholder="궁금한 이야기를 검색해보세요" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="split-layout">
        <div className="side-filter">
          <div className="side-filter-label">카테고리</div>
          {CATS.map((c) => (
            <button key={c} className={state.communityFilter === c ? 'on' : ''} onClick={() => setCommunityFilter(c)}>
              <Icon name={POST_CATEGORY_META[c].icon} size={15} />
              {c}
              <span className="side-filter-count">{catCounts[c]}</span>
            </button>
          ))}
        </div>
        <div>
          <div className="chiprow only-mobile" style={{ marginBottom: 6 }}>
            {CATS.map((c) => (
              <button key={c} className={'chip' + (state.communityFilter === c ? ' on' : '')} onClick={() => setCommunityFilter(c)}>
                {c}
              </button>
            ))}
          </div>
          {list.length > 0 && (
            <div className="row between" style={{ marginBottom: 12 }}>
              <span className="faint" style={{ fontSize: 12.5 }}>
                총 <b className="tnum" style={{ color: 'var(--ink-soft)' }}>{list.length}</b>개의 글
              </span>
              <div className="segmented" style={{ width: 148 }}>
                {SORTS.map((s) => (
                  <button key={s.k} className={sort === s.k ? 'on' : ''} onClick={() => setSort(s.k)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {list.length ? (
            list.map((p) => <PostCard key={p.id} post={p} />)
          ) : (
            <div className="empty">
              <div className="empty-icon">
                <Icon name="board" size={28} />
              </div>
              <div className="h2" style={{ marginTop: 10 }}>
                아직 글이 없어요
              </div>
              <div>{query ? '다른 검색어로 시도해보세요' : '이 카테고리의 첫 글을 남겨보세요'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
