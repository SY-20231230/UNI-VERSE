import { Link } from 'react-router-dom';
import Icon from '../lib/icons';
import { timeAgo } from '../lib/format';
import { useApp } from '../context/AppContext';
import { POST_CATEGORY_META, postCategoryFromApi } from '../lib/category';

export default function PostCard({ post, compact }) {
  const { userOf } = useApp();
  const id = post.postId || post.id;
  const author = post.anonymous ? '익명' : (post.authorName || (post.authorId ? userOf(post.authorId).name : '알수없음'));
  const category = postCategoryFromApi(post.category);
  const meta = POST_CATEGORY_META[category] || POST_CATEGORY_META['기타'];
  const body = post.preview || post.body;
  const time = post.createdAt || post.time;
  const likes = post.likeCount !== undefined ? post.likeCount : post.likes;
  const commentsCount = post.comments ? post.comments.length : (post.commentCount || 0);

  return (
    <Link className={'post-card' + (post.category === 'NOTICE' ? ' notice' : '')} to={`/community/${id}`}>
      {post.category === 'NOTICE' && <div className="post-notice-label"><Icon name="bell" size={13} /> 학교 공지</div>}
      <div className="row g8">
        <span className={'chip ' + meta.variant}>
          <Icon name={meta.icon} size={11} />
          {category}
        </span>
        {post.anonymous && <span className="chip outline">익명</span>}
      </div>
      <div className="post-title" style={{ marginTop: 9 }}>
        {post.title}
      </div>
      {!compact && <div className="post-excerpt">{body}</div>}
      <div className="row between" style={{ marginTop: 11 }}>
        <div className="meta-row">
          <span>{author}</span>
          <span className="dot"></span>
          <span>{timeAgo(time)}</span>
        </div>
        <div className="row g10">
          <span className="stat">
            <Icon name="heart" size={13} />
            {likes}
          </span>
          <span className="stat">
            <Icon name="chat" size={13} />
            {commentsCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
