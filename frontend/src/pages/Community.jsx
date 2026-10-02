import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Icon from '../lib/icons';
import Pagination from '../components/Pagination';
import { useApp } from '../context/AppContext';
import PostCard from '../components/PostCard';
import NoticeCard from '../components/NoticeCard';
import { postCategoryToApi } from '../lib/category';
import { communityApi } from '../lib/communityApi';
import { CAMPUS_NOTICES } from '../lib/notices';
import useDebounce from '../hooks/useDebounce';

const CATS = ['전체', '공지', '자유', '수업/학점', '학교생활', '시설/환경', '기숙사', '취업/진로', '기타'];
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

  // 공지는 서버 카테고리가 없어 프론트 공지 목록을 그대로 보여준다.
  const isNotice = state.communityFilter === '공지';
  // '전체' 첫 페이지에서는 최신 공지 1개를 맨 위에 고정한다.
  const pinnedNotice = state.communityFilter === '전체' && !debouncedQ && page === 0 ? CAMPUS_NOTICES[0] : null;
  const notices = isNotice ? CAMPUS_NOTICES.filter((n) => !debouncedQ || (n.title + n.body).includes(debouncedQ)) : [];

  useEffect(() => {
    if (isNotice) return;
    async function fetchPosts() {
      try {
        const catParam = state.communityFilter === '전체' ? undefined : postCategoryToApi(state.communityFilter);
        const res = await communityApi.getPosts({
          category: catParam,
          keyword: debouncedQ || undefined,
          sort: sort,
          page: page,
          size: 7
        });
        setList(res.content);
        setTotalElements(res.totalElements);
        setTotalPages(res.totalPages);
      } catch (err) {
        console.error('Failed to fetch posts', err);
      }
    }
    fetchPosts();
  }, [state.communityFilter, debouncedQ, sort, page, isNotice]);

  return (
    <div className="container fade-enter">
      <div className="page-head">
        <div>
          <h1 className="h1">캠퍼스 커뮤니티</h1>
          <p className="page-sub">익명과 익명이 만드는 솔직하고 유익한 학생 커뮤니티.</p>
        </div>
        <Link className="btn btn-primary page-head-cta" to="/community/write">
          <Icon name="plus" size={15} />
          새 글 작성
        </Link>
      </div>
      <div className="search-bar">
        <Icon name="search" size={16} />
        <input placeholder="궁금한 이야기를 검색해보세요" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="underline-tabs">
        {CATS.map((c) => (
          <button key={c} className={state.communityFilter === c ? 'on' : ''} onClick={() => setCommunityFilter(c)}>
            {c}
          </button>
        ))}
      </div>
      <div>
        <div>
          {isNotice ? (
            notices.length ? (
              notices.map((n) => <NoticeCard key={n.id} notice={n} />)
            ) : (
              <div className="empty">
                <div className="empty-icon">
                  <Icon name="bell" size={28} />
                </div>
                <div className="h2" style={{ marginTop: 10 }}>
                  공지가 없어요
                </div>
              </div>
            )
          ) : (
          <>
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
              {pinnedNotice && <NoticeCard notice={pinnedNotice} pinned />}
              {list.map((p) => <PostCard key={p.postId} post={p} />)}
              <Pagination page={page} totalPages={totalPages} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
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
          </>
          )}
        </div>
      </div>
    </div>
  );
}
