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
    <Link className={'post-card' + (compact ? ' compact' : '')} to={`/community/${id}`}>
      <div className="post-card-top">
        <div className="row g6">
          <span className={'chip ' + meta.variant}>
            <Icon name={meta.icon} size={11} />
            {category}
          </span>
          {post.anonymous && <span className="chip outline">익명</span>}
        </div>
        <span className="post-card-time">{timeAgo(time)}</span>
      </div>
      <div className="post-title">{post.title}</div>
      {body && <div className="post-excerpt">{body}</div>}
      <div className="post-card-foot">
        <span className="post-card-author">작성자: {author}</span>
        <div className="row g12">
          <span className="stat like">
            <Icon name="heart" size={14} />
            {likes}
          </span>
          <span className="stat">
            <Icon name="chat" size={14} />
            {commentsCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
