import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { session } from '../lib/session';
import Icon from '../lib/icons';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export default function SchoolAdminPage() {
  const { state } = useApp();
  const { toast } = useUI();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/admin/school/dashboard`, {
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

  if (loading) return <div className="container" style={{ padding: 40, textAlign: 'center' }}>로딩 중...</div>;
  if (!data) return <div className="container" style={{ padding: 40, textAlign: 'center' }}>데이터가 없습니다.</div>;

  const { reportReasonStats, topHashtags, topPosts } = data;

  const maxReasonCount = Math.max(1, ...Object.values(reportReasonStats || {}));
  const reasonStats = Object.entries(reportReasonStats || {})
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count, pct: Math.round((count / maxReasonCount) * 100) }));

  return (
    <div className="container fade-enter">
      <h1 className="h1">우리 학교 대시보드</h1>
      
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
