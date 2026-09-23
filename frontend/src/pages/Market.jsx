import { Link } from 'react-router-dom';
import { useState } from 'react';
import Icon from '../lib/icons';
import { useApp } from '../context/AppContext';
import ListingGridCard from '../components/ListingGridCard';
import { MARKET_CATEGORY_META } from '../lib/category';

const CATS = ['전체', '전공책', '전자기기', '생활용품', '의류', '기타'];
const STATUSES = ['전체', '판매중', '거래완료'];
const SORTS = [
  { k: 'latest', label: '최신순' },
  { k: 'popular', label: '인기순' },
  { k: 'cheap', label: '가격낮은순' },
];

export default function Market() {
  const { state, setMarketFilter, setMarketStatusFilter } = useApp();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('latest');
  const query = q.trim().toLowerCase();
  const catCounts = CATS.reduce((acc, c) => {
    acc[c] = c === '전체' ? state.listings.length : state.listings.filter((l) => l.category === c).length;
    return acc;
  }, {});
  const statusCounts = STATUSES.reduce((acc, s) => {
    acc[s] = s === '전체' ? state.listings.length : state.listings.filter((l) => l.status === s).length;
    return acc;
  }, {});
  const list = state.listings
    .filter((l) => {
      const okCat = state.marketFilter === '전체' || l.category === state.marketFilter;
      const okStatus = state.marketStatusFilter === '전체' || l.status === state.marketStatusFilter;
      const okQuery = !query || l.title.toLowerCase().includes(query) || l.desc.toLowerCase().includes(query);
      return okCat && okStatus && okQuery;
    })
    .slice()
    .sort((a, b) => {
      if (sort === 'popular') return b.likes - a.likes;
      if (sort === 'cheap') return a.price - b.price;
      return b.time - a.time;
    });

  return (
    <div className="container fade-enter">
      <div className="page-head">
        <h1 className="h1">중고거래</h1>
        <Link className="btn btn-primary btn-sm" to="/market/write">
          <Icon name="plus" size={15} />
          등록하기
        </Link>
      </div>
      <div className="search-bar">
        <Icon name="search" size={16} />
        <input placeholder="찾는 물건을 검색해보세요" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="split-layout">
        <div className="side-filter">
          <div className="side-filter-label">카테고리</div>
          {CATS.map((c) => (
            <button key={c} className={state.marketFilter === c ? 'on' : ''} onClick={() => setMarketFilter(c)}>
              <Icon name={MARKET_CATEGORY_META[c].icon} size={15} />
              {c}
              <span className="side-filter-count">{catCounts[c]}</span>
            </button>
          ))}
          <div className="divider"></div>
          <div className="side-filter-label">거래 상태</div>
          {STATUSES.map((s) => (
            <button key={s} className={state.marketStatusFilter === s ? 'on' : ''} onClick={() => setMarketStatusFilter(s)}>
              <Icon name={s === '판매중' ? 'trend' : s === '거래완료' ? 'check' : 'tag'} size={15} />
              {s}
              <span className="side-filter-count">{statusCounts[s]}</span>
            </button>
          ))}
        </div>
        <div>
          <div className="chiprow only-mobile" style={{ marginBottom: 8 }}>
            {CATS.map((c) => (
              <button key={c} className={'chip' + (state.marketFilter === c ? ' on' : '')} onClick={() => setMarketFilter(c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="chiprow only-mobile" style={{ marginBottom: 14 }}>
            {STATUSES.map((s) => (
              <button key={s} className={'chip' + (state.marketStatusFilter === s ? ' on' : '')} onClick={() => setMarketStatusFilter(s)}>
                {s}
              </button>
            ))}
          </div>
          {list.length > 0 && (
            <div className="row between" style={{ marginBottom: 12 }}>
              <span className="faint" style={{ fontSize: 12.5 }}>
                총 <b className="tnum" style={{ color: 'var(--ink-soft)' }}>{list.length}</b>개의 매물
              </span>
              <div className="segmented" style={{ width: 220 }}>
                {SORTS.map((s) => (
                  <button key={s.k} className={sort === s.k ? 'on' : ''} onClick={() => setSort(s.k)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {list.length ? (
            <div className="card-grid">
              {list.map((l) => (
                <ListingGridCard key={l.id} listing={l} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="empty-icon">
                <Icon name="tag" size={28} />
              </div>
              <div className="h2" style={{ marginTop: 10 }}>
                매물이 없어요
              </div>
              <div>{query ? '다른 검색어로 시도해보세요' : '다른 카테고리를 확인해보세요'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
