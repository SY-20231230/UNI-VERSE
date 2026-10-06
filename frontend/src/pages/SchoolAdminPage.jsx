import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { session } from '../lib/session';
import Icon from '../lib/icons';
import { API_BASE_URL } from '../lib/api';
import { communityApi } from '../lib/communityApi';
import { timeAgo } from '../lib/format';

export default function SchoolAdminPage() {
  const { state } = useApp();
  const { toast } = useUI();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState([]);
  const [noticeLoading, setNoticeLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/admin/school/dashboard`, {
      headers: {
        'Authorization': `Bearer ${session.getAccessToken()}`
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error('데이터를 불러오지 못했습니다.');
        return res.json();
      })
      .then((json) => {
        if (json.success) setData(json.data);
      })
      .catch((e) => toast(e.message))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    let active = true;
    communityApi.getPosts({ category: 'NOTICE', page: 0, size: 50, sort: 'latest' })
      .then((response) => {
        if (active) setNotices(response.content || []);
      })
      .catch((error) => {
        if (active) toast(error.message || '공지 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (active) setNoticeLoading(false);
      });
    return () => { active = false; };
  }, [toast]);

  if (loading) return <div className="container" style={{ padding: 40, textAlign: 'center' }}>로딩 중...</div>;
  if (!data) return <div className="container" style={{ padding: 40, textAlign: 'center' }}>데이터가 없습니다.</div>;

  const { reportReasonStats, topHashtags, topPosts } = data;

  const maxReasonCount = Math.max(1, ...Object.values(reportReasonStats || {}));
  const reasonStats = Object.entries(reportReasonStats || {})
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count, pct: Math.round((count / maxReasonCount) * 100) }));

  return (
    <div className="container fade-enter">
      <div className="row between g12 wrap">
        <div>
          <h1 className="h1">우리 학교 대시보드</h1>
          <p className="page-sub" style={{ marginTop: 6 }}>교내 현황을 확인하고 학교 공지를 관리하세요.</p>
        </div>
        <Link className="btn btn-primary" to="/community/write?category=NOTICE&from=admin">
          <Icon name="edit" size={15} />
          공지 작성
        </Link>
      </div>

      <section className="card" style={{ marginTop: 20, padding: 24 }} aria-labelledby="school-notice-title">
        <div className="row between g12 wrap" style={{ marginBottom: 16 }}>
          <div>
            <h2 id="school-notice-title" className="h3">교내 공지 관리</h2>
            <div className="faint" style={{ fontSize: 13, marginTop: 5 }}>공지 내용을 확인하고 작성한 공지를 수정할 수 있습니다.</div>
          </div>
          <Link className="btn btn-outline btn-sm" to="/community">전체 공지 보기</Link>
        </div>

        {noticeLoading ? (
          <div className="faint" style={{ padding: '18px 0' }}>공지 목록을 불러오는 중...</div>
        ) : notices.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notices.map((notice) => {
              const editable = notice.authorId === state.me?.userId;
              return (
                <div key={notice.postId} className="row between g12 wrap" style={{ padding: '13px 0', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Link to={`/community/${notice.postId}`} style={{ fontWeight: 750 }}>{notice.title}</Link>
                    <div className="row g8 faint" style={{ fontSize: 12, marginTop: 5 }}>
                      <span>{notice.authorName}</span>
                      <span>조회 {notice.viewCount}</span>
                      <span>{timeAgo(notice.createdAt)}</span>
                    </div>
                  </div>
                  <div className="row g8">
                    <Link className="btn btn-outline btn-sm" to={`/community/${notice.postId}`}>보기</Link>
                    {editable && (
                      <Link className="btn btn-primary btn-sm" to={`/community/${notice.postId}/edit?from=admin`}>수정</Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty" style={{ padding: '24px 0' }}>작성된 교내 공지가 없습니다.</div>
        )}
      </section>
      
      <div className="admin-layout" style={{ marginTop: 20 }}>
        
        <div className="wf-col g20" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 1. 신고 유형별 통계 */}
          <div className="card admin-stats-note" style={{ flex: 1 }}>
            <div className="row g8">
              <Icon name="trend" size={14} />
              <span>신고 유형별 통계</span>
            </div>
            {reasonStats.length ? (
              <div className="admin-stat-bars">
                {reasonStats.map((s) => (
                  <div className="admin-stat-bar-row" key={s.reason}>
                    <span className="admin-stat-bar-label">{s.reason}</span>
                    <div className="admin-stat-bar-track">
                      <div className="admin-stat-bar-fill" style={{ width: `${s.pct}%` }}></div>
                    </div>
                    <span className="admin-stat-bar-count">{s.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="faint" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>
                아직 접수된 신고가 없어요.
              </div>
            )}
          </div>
        </div>

        <div className="wf-col g20" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 2. 해시태그 Top 5 */}
          <div className="card" style={{ padding: 24 }}>
            <div className="h3" style={{ marginBottom: 16 }}>🔥 인기 해시태그 Top 5</div>
            {topHashtags?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {topHashtags.map((h, i) => (
                  <div key={h.tagName} className="row between">
                    <span><strong style={{ marginRight: 8, color: 'var(--primary)' }}>{i + 1}</strong> #{h.tagName}</span>
                    <span className="faint" style={{ fontSize: 13 }}>{h.count}회</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="faint" style={{ fontSize: 13 }}>데이터가 없습니다.</div>
            )}
          </div>

          {/* 3. 인기 글 Top 5 */}
          <div className="card" style={{ padding: 24 }}>
            <div className="h3" style={{ marginBottom: 16 }}>🏆 인기 커뮤니티 글 Top 5</div>
            {topPosts?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {topPosts.map((p, i) => (
                  <div key={p.postId} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div className="row">
                      <strong style={{ marginRight: 8, color: 'var(--primary)', width: 14 }}>{i + 1}</strong>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
                        {p.title}
                      </span>
                    </div>
                    <div className="row g8 faint" style={{ fontSize: 12, marginLeft: 22 }}>
                      <span>좋아요 {p.likeCount}</span>
                      <span>조회 {p.viewCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="faint" style={{ fontSize: 13 }}>데이터가 없습니다.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
