import { Link } from 'react-router-dom';
import Icon from '../lib/icons';
import { timeAgo } from '../lib/format';
import { useApp } from '../context/AppContext';
import { POST_CATEGORY_META, postCategoryFromApi } from '../lib/category';

export default function PostCard({ post, compact }) {
  const { userOf } = useApp();
  const author = post.anonymous ? '익명' : userOf(post.authorId).name;
  const category = postCategoryFromApi(post.category);
  const meta = POST_CATEGORY_META[category] || POST_CATEGORY_META['기타'];
  return (
    <Link className="post-card" to={`/community/${post.id}`}>
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
      {!compact && <div className="post-excerpt">{post.body}</div>}
      <div className="row between" style={{ marginTop: 11 }}>
        <div className="meta-row">
          <span>{author}</span>
          <span className="dot"></span>
          <span>{timeAgo(post.time)}</span>
        </div>
        <div className="row g10">
          <span className="stat">
            <Icon name="heart" size={13} />
            {post.likes}
          </span>
          <span className="stat">
            <Icon name="chat" size={13} />
            {post.comments.length}
          </span>
        </div>
      </div>
    </Link>
  );
}
