import Icon from '../lib/icons';

export default function NoticeCard({ notice, pinned }) {
  const date = notice.date.slice(5).replace('-', '.');
  // 목록 맨 위 고정 공지는 한 줄로 짧게 보여준다. 본문은 공지 탭에서 본다.
  if (pinned) {
    return (
      <div className="post-card pinned notice-pinned">
        <span className="chip danger">
          <Icon name="bell" size={11} />
          공지
        </span>
        <span className="notice-pinned-title">{notice.title}</span>
        <span className="post-card-time">{date}</span>
      </div>
    );
  }
  return (
    <div className="post-card">
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
      <div className="post-excerpt">{notice.body}</div>
      <div className="post-card-foot">
        <span className="post-card-author">작성자: 운영자</span>
      </div>
    </div>
  );
}
