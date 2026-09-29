import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Icon from '../lib/icons';
import { useApp } from '../context/AppContext';
import PostCard from '../components/PostCard';
import { POST_CATEGORY_META, postCategoryToApi } from '../lib/category';
import { communityApi } from '../lib/communityApi';
import useDebounce from '../hooks/useDebounce';

const CATS = ['전체', '자유', '수업/학점', '학교생활', '시설/환경', '기숙사', '취업/진로', '기타'];
const SORTS = [
  { k: 'latest', label: '최신순' },
  { k: 'popular', label: '인기순' },
];

export default function Community() {
  const { state, setCommunityFilter } = useApp();
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q, 500);
  const [sort, setSort] = useState('latest');
  const [list, setList] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);

  // 필터가 변경되면 페이지를 0으로 초기화
  useEffect(() => {
    setPage(0);
  }, [state.communityFilter, debouncedQ, sort]);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const catParam = state.communityFilter === '전체' ? undefined : postCategoryToApi(state.communityFilter);
        const res = await communityApi.getPosts({
          category: catParam,
          keyword: debouncedQ || undefined,
          sort: sort,
          page: page,
          size: 10
        });
        setList(res.content);
        setTotalElements(res.totalElements);
        setTotalPages(res.totalPages);
      } catch (err) {
        console.error('Failed to fetch posts', err);
      }
    }
    fetchPosts();
  }, [state.communityFilter, debouncedQ, sort, page]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    // 10개 단위 블록 계산
    const startPage = Math.floor(page / 10) * 10;
    const endPage = Math.min(startPage + 10, totalPages);
    
    const pages = [];
    for (let i = startPage; i < endPage; i++) {
      pages.push(i);
    }

    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 32, marginBottom: 40, alignItems: 'center' }}>
        <button 
          className="btn btn-outline btn-sm" 
          disabled={startPage === 0} 
          onClick={() => setPage(startPage - 1)}
          title="이전 10페이지"
          style={{ padding: '0 8px' }}
        >
          &lt;&lt;
        </button>
        <button 
          className="btn btn-outline btn-sm" 
          disabled={page === 0} 
          onClick={() => setPage(page - 1)}
          title="이전 페이지"
          style={{ padding: '0 10px' }}
        >
          &lt;
        </button>
        
        {pages.map(p => (
          <button 
            key={p} 
            className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline'}`} 
            style={{ width: 34, padding: 0, fontWeight: p === page ? 700 : 500 }}
            onClick={() => setPage(p)}
          >
            {p + 1}
          </button>
        ))}

        <button 
          className="btn btn-outline btn-sm" 
          disabled={page === totalPages - 1} 
          onClick={() => setPage(page + 1)}
          title="다음 페이지"
          style={{ padding: '0 10px' }}
        >
          &gt;
        </button>
        <button 
          className="btn btn-outline btn-sm" 
          disabled={startPage + 10 >= totalPages} 
          onClick={() => setPage(startPage + 10)}
          title="다음 10페이지"
          style={{ padding: '0 8px' }}
        >
          &gt;&gt;
        </button>
      </div>
    );
  };

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
                총 <b className="tnum" style={{ color: 'var(--ink-soft)' }}>{totalElements}</b>개의 글
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
            <>
              {list.map((p) => <PostCard key={p.postId} post={p} />)}
              {renderPagination()}
            </>
          ) : (
            <div className="empty">
              <div className="empty-icon">
                <Icon name="board" size={28} />
              </div>
              <div className="h2" style={{ marginTop: 10 }}>
                아직 글이 없어요
              </div>
              <div>{debouncedQ ? '다른 검색어로 시도해보세요' : '이 카테고리의 첫 글을 남겨보세요'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
