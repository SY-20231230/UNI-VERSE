import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Icon from '../lib/icons';
import { useApp } from '../context/AppContext';
import ListingGridCard from '../components/ListingGridCard';
import { MARKET_CATEGORY_META, marketCategoryToApi } from '../lib/category';
import { marketApi } from '../lib/marketApi';
import useDebounce from '../hooks/useDebounce';

const CATS = ['전체', '전공책', '전자기기', '생활용품', '의류', '기타'];
const STATUSES = ['전체', '판매중', '거래중', '거래완료'];
const SORTS = [
  { k: 'latest', label: '최신순' },
  { k: 'popular', label: '인기순' },
  { k: 'cheap', label: '가격낮은순' },
];

export default function Market() {
  const { state, setMarketFilter, setMarketStatusFilter } = useApp();
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q, 500);
  const [sort, setSort] = useState('latest');
  
  const [list, setList] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // 필터가 바뀌면 페이지와 목록을 초기화합니다.
  useEffect(() => {
    setPage(0);
    setList([]);
  }, [state.marketFilter, state.marketStatusFilter, debouncedQ, sort]);

  useEffect(() => {
    async function fetchItems() {
      try {
        const catParam = state.marketFilter === '전체' ? undefined : marketCategoryToApi(state.marketFilter);
        const statusParam = state.marketStatusFilter === '전체' ? undefined : 
                            (state.marketStatusFilter === '판매중' ? 'SELLING' : 
                             state.marketStatusFilter === '거래완료' ? 'COMPLETED' : 'TRADING'); // backend might not support multiple statuses in param
        
        // Mapping sort
        let sortParam = 'createdAt,desc'; // default latest
        if (sort === 'popular') sortParam = 'popular'; // backend might not support this easily without custom logic, just sending string
        if (sort === 'cheap') sortParam = 'listedPrice,asc';

        const res = await marketApi.getItems({
          category: catParam,
          keyword: debouncedQ || undefined,
          sort: sortParam,
          status: statusParam,
          page: page,
          size: 20
        });
        
        if (page === 0) {
          setList(res.content || []);
        } else {
          setList(prev => [...prev, ...(res.content || [])]);
        }
        
        setTotalElements(res.totalElements || (res.content || []).length);
        setHasMore(!res.last && (res.content || []).length > 0);
      } catch (err) {
        console.error('Failed to fetch market items', err);
      }
    }
    fetchItems();
  }, [state.marketFilter, state.marketStatusFilter, debouncedQ, sort, page]);

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
      <div className="safety-banner market-notice">
        <Icon name="shield" size={16} />
        <div>
          <b>안전거래 안내</b>
          선입금·계좌 공유·택배거래·외부 메신저 유도 표현이 담긴 글은 AI 검사로 등록이 제한돼요. 거래는 UNI:VERSE 채팅과 교내 직거래로 진행해주세요.
        </div>
      </div>
      <div className="split-layout">
        <div className="side-filter">
          <div className="side-filter-label">카테고리</div>
          {CATS.map((c) => (
            <button key={c} className={state.marketFilter === c ? 'on' : ''} onClick={() => setMarketFilter(c)}>
              <Icon name={MARKET_CATEGORY_META[c].icon} size={15} />
              {c}
            </button>
          ))}
          <div className="divider"></div>
          <div className="side-filter-label">거래 상태</div>
          {STATUSES.map((s) => (
            <button key={s} className={state.marketStatusFilter === s ? 'on' : ''} onClick={() => setMarketStatusFilter(s)}>
              <Icon name={s === '판매중' ? 'trend' : s === '거래완료' ? 'check' : s === '거래중' ? 'users' : 'tag'} size={15} />
              {s}
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
                총 <b className="tnum" style={{ color: 'var(--ink-soft)' }}>{totalElements}</b>개의 매물
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
            <>
              <div className="card-grid">
                {list.map((l) => (
                  <ListingGridCard key={l.id} listing={l} />
                ))}
              </div>
              {hasMore && (
                <div className="load-more">
                  <button type="button" className="load-more-btn" onClick={() => setPage(p => p + 1)}>
                    더보기
                    <Icon name="chev" size={14} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty">
              <div className="empty-icon">
                <Icon name="tag" size={28} />
              </div>
              <div className="h2" style={{ marginTop: 10 }}>
                매물이 없어요
              </div>
              <div>{debouncedQ ? '다른 검색어로 시도해보세요' : '다른 카테고리를 확인해보세요'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
