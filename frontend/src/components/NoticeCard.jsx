import { Link } from 'react-router-dom';
import Icon from '../lib/icons';

export default function NoticeCard({ notice, pinned }) {
  const date = notice.date.slice(5, 10).replace('-', '.');
  // 학교 관리자가 올린 공지는 글 상세로 이동하고, 기본 공지는 이동하지 않는다.
  const wrap = (className, children) => (notice.postId
    ? <Link className={className} to={`/community/${notice.postId}`}>{children}</Link>
    : <div className={className}>{children}</div>);
  // 목록 맨 위 고정 공지는 한 줄로 짧게 보여준다. 본문은 공지 탭에서 본다.
  if (pinned) {
    return wrap('post-card pinned notice-pinned', (
      <>
        <span className="chip danger">
          <Icon name="bell" size={11} />
          공지
        </span>
        <span className="notice-pinned-title">{notice.title}</span>
        <span className="post-card-time">{date}</span>
      </>
    ));
  }
  return wrap('post-card', (
    <>
      <div className="post-card-top">
        <div className="row g6">
          <span className="chip danger">
            <Icon name="bell" size={11} />
            공지
          </span>
        </div>
        <span className="post-card-time">{date}</span>
      </div>
      <div className="post-title">{notice.title}</div>
      {notice.body && <div className="post-excerpt">{notice.body}</div>}
      <div className="post-card-foot">
        <span className="post-card-author">{notice.author || '운영자'}</span>
      </div>
    </>
  ));
}
