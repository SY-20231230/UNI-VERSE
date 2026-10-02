import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Icon from '../lib/icons';
import Avatar from '../components/Avatar';
import VerifiedChip from '../components/VerifiedChip';
import ManageSheet from '../components/ManageSheet';
import ConfirmModal from '../components/ConfirmModal';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { timeAgo } from '../lib/format';
import { postCategoryFromApi } from '../lib/category';
import { communityApi } from '../lib/communityApi';

export default function CommunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();
  const { toast, openSheet, openModal, closeOverlay } = useUI();
  
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentAnonymous, setCommentAnonymous] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editAnonymous, setEditAnonymous] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [related, setRelated] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [commentLikePending, setCommentLikePending] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const pRes = await communityApi.getPost(id);
        setPost(pRes);
        setLiked(Boolean(pRes.likedByCurrentUser));
        const cRes = await communityApi.getComments(id, { size: 100 });
        setComments(cRes.content || []);
        // Fetch related posts (simplification for now: just fetch top popular)
        const relRes = await communityApi.getPosts({ sort: 'popular', size: 5 });
        setRelated(relRes.content.filter(x => x.postId != id));
      } catch (err) {
        console.error('Failed to load post', err);
      }
    }
    loadData();
  }, [id]);

  if (!post) {
    return (
      <div className="container mid fade-enter">
        <div className="empty">글을 불러오는 중이거나 찾을 수 없어요</div>
      </div>
    );
  }

  const author = post.anonymous ? { name: '익명', dept: '', color: '#9195A6' } : { name: post.authorName, dept: '', color: '#2F6FED' }; // Simplified avatar
  const isMine = post.authorId === state.me?.userId;

  async function submitComment() {
    const text = commentText.trim();
    if (!text) {
      toast('댓글 내용을 입력해주세요');
      return;
    }
    try {
      await communityApi.addComment(post.postId, {
        content: text,
        isAnonymous: commentAnonymous,
        parentCommentId: replyTo?.commentId || null,
      });
      setCommentText('');
      setCommentAnonymous(false);
      setReplyTo(null);
      const cRes = await communityApi.getComments(id, { size: 100 });
      setComments(cRes.content || []);
    } catch {
      toast('댓글 작성에 실패했습니다.');
    }
  }

  async function likePost() {
    if (likePending) return;
    setLikePending(true);
    try {
      const response = liked
        ? await communityApi.unlikePost(post.postId)
        : await communityApi.likePost(post.postId);
      setPost(p => ({ ...p, likeCount: response.likeCount }));
      setLiked(response.liked);
    } catch {
      toast('요청에 실패했습니다.');
    } finally {
      setLikePending(false);
    }
  }

  function startEditComment(c) {
    setEditingCommentId(c.commentId);
    setEditText(c.content);
    setEditAnonymous(c.anonymous);
  }

  function cancelEditComment() {
    setEditingCommentId(null);
    setEditText('');
    setEditAnonymous(false);
  }

  async function saveEditComment() {
    const text = editText.trim();
    if (!text) {
      toast('댓글 내용을 입력해주세요');
      return;
    }
    try {
      await communityApi.updateComment(editingCommentId, { content: text, isAnonymous: editAnonymous });
      setEditingCommentId(null);
      setEditText('');
      setEditAnonymous(false);
      const cRes = await communityApi.getComments(id, { size: 100 });
      setComments(cRes.content || []);
    } catch {
      toast('댓글 수정에 실패했습니다.');
    }
  }

  async function deleteComment(cid) {
    try {
      await communityApi.deleteComment(cid);
      toast('댓글이 삭제되었습니다');
      const cRes = await communityApi.getComments(id, { size: 100 });
      setComments(cRes.content || []);
    } catch {
      toast('댓글 삭제에 실패했습니다.');
    }
  }

  async function toggleCommentLike(comment) {
    if (commentLikePending === comment.commentId) return;
    setCommentLikePending(comment.commentId);
    try {
      const response = comment.likedByCurrentUser
        ? await communityApi.unlikeComment(comment.commentId)
        : await communityApi.likeComment(comment.commentId);
      setComments((items) => items.map((item) => item.commentId === comment.commentId
        ? { ...item, likeCount: response.likeCount, likedByCurrentUser: response.liked }
        : item));
    } catch {
      toast('댓글 좋아요 요청에 실패했습니다.');
    } finally {
      setCommentLikePending(null);
    }
  }

  const commentIds = new Set(comments.map((comment) => comment.commentId));
  const rootComments = comments.filter((comment) => !comment.parentCommentId || !commentIds.has(comment.parentCommentId));
  const repliesByParent = comments.reduce((groups, comment) => {
    if (!comment.parentCommentId) return groups;
    const replies = groups.get(comment.parentCommentId) || [];
    replies.push(comment);
    groups.set(comment.parentCommentId, replies);
    return groups;
  }, new Map());

  function renderComment(comment, reply = false) {
    return (
      <div className={'card community-comment' + (reply ? ' reply' : '')} key={comment.commentId}>
        <div className="row between">
          <div className="row g6">
            {reply && <Icon name="chev" size={12} />}
            <b style={{ fontSize: 13 }}>{comment.authorName}</b>
            {comment.postAuthor && <span className="chip accent" style={{ fontSize: 10 }}>작성자</span>}
          </div>
          <div className="row g8">
            <span className="faint" style={{ fontSize: 11 }}>{timeAgo(comment.createdAt)}</span>
            {comment.mine && editingCommentId !== comment.commentId && (
              <button className="iconbtn ghost comment-more" title="댓글 관리" aria-label="댓글 관리"
                onClick={() => openSheet(
                  <ManageSheet onClose={closeOverlay} onEdit={() => startEditComment(comment)}
                    onDelete={() => openModal(
                      <ConfirmModal title="댓글을 삭제할까요?" desc="삭제한 댓글은 복구할 수 없어요."
                        onClose={closeOverlay}
                        onConfirm={() => { closeOverlay(); deleteComment(comment.commentId); }} />
                    )} />
                )}>
                <Icon name="more" size={16} />
              </button>
            )}
            {!(comment.mine && editingCommentId !== comment.commentId) && <span className="comment-more" aria-hidden="true" />}
          </div>
        </div>
        {editingCommentId === comment.commentId ? (
          <div style={{ marginTop: 8 }}>
            <textarea className="textarea" style={{ minHeight: 64, fontSize: 13.5 }} value={editText}
              onChange={(event) => setEditText(event.target.value)} />
            <label className="row g6" style={{ marginTop: 8, fontSize: 12 }}>
              <input type="checkbox" checked={editAnonymous} onChange={(event) => setEditAnonymous(event.target.checked)} />
              익명으로 표시
            </label>
            <div className="row g8" style={{ marginTop: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline btn-sm" onClick={cancelEditComment}>취소</button>
              <button className="btn btn-primary btn-sm" onClick={saveEditComment}>저장</button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13.5, marginTop: 5, lineHeight: 1.6 }}>{comment.content}</div>
        )}
        <div className="comment-actions">
          <button type="button" className={'comment-like' + (comment.likedByCurrentUser ? ' on' : '')}
            disabled={commentLikePending === comment.commentId} onClick={() => toggleCommentLike(comment)}
            aria-pressed={comment.likedByCurrentUser}>
            <Icon name={comment.likedByCurrentUser ? 'heart-fill' : 'heart'} size={12} />
            좋아요 {comment.likeCount || 0}
          </button>
          <button type="button" className="comment-reply"
            onClick={() => setReplyTo({ commentId: comment.parentCommentId || comment.commentId, authorName: comment.authorName })}>
            답글
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mid fade-enter">
      <Link className="backlink" to="/community">
        <Icon name="back" size={13} />
        커뮤니티
      </Link>
      <div className="detail-layout">
        <div>
      <div className="card post-detail-card">
        <div className="row between">
          <div className="row g8">
            <span className={'chip ' + (post.category === 'NOTICE' ? 'danger' : 'accent')}>
              {post.category === 'NOTICE' && <Icon name="bell" size={11} />}
              {postCategoryFromApi(post.category)}
            </span>
            {post.anonymous && <span className="chip outline">익명</span>}
          </div>
          {isMine && (
            <button
              className="iconbtn ghost"
              title="게시글 관리"
              onClick={() =>
                openSheet(
                  <ManageSheet
                    onClose={closeOverlay}
                    onEdit={() => navigate(`/community/${post.postId}/edit`)}
                    onDelete={() =>
                      openModal(
                        <ConfirmModal
                          title="게시글을 삭제할까요?"
                          desc="삭제한 게시글은 복구할 수 없어요."
                          onClose={closeOverlay}
                          onConfirm={async () => {
                            closeOverlay();
                            try {
                              await communityApi.deletePost(post.postId);
                              navigate('/community');
                              toast('게시글이 삭제되었습니다');
                            } catch {
                              toast('삭제에 실패했습니다.');
                            }
                          }}
                        />
                      )
                    }
                  />
                )
              }
            >
              <Icon name="more" size={18} />
            </button>
          )}
        </div>
        <div className="h1" style={{ marginTop: 14 }}>
          {post.title}
        </div>
        <div className="row g10" style={{ marginTop: 16 }}>
          {post.anonymous ? (
            <div className="avatar" style={{ width: 36, height: 36, background: '#9195A6' }}>
              ?
            </div>
          ) : (
            <Avatar user={author} size={36} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{author.name}</div>
            <div className="faint" style={{ fontSize: 11.5 }}>
              {timeAgo(post.createdAt)} · 조회 {post.viewCount}
            </div>
          </div>
        </div>
        <div className="divider" style={{ margin: '22px 0' }}></div>
        <div style={{ fontSize: 15, lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>{post.content}</div>
        <div className="row g6 wrap" style={{ marginTop: 18 }}>
          {post.hashtags && post.hashtags.map((t) => (
            <span key={t} className="faint mono" style={{ fontSize: 12 }}>
              #{t}
            </span>
          ))}
        </div>
        <div className="row g10" style={{ marginTop: 18, paddingBottom: 18 }}>
          <button
            className={'like-pill' + (liked ? ' on' : '')}
            onClick={likePost}
            disabled={likePending}
            aria-pressed={liked}
          >
            <Icon name="heart" size={13} style={{ fill: liked ? 'currentColor' : 'none' }} /> 좋아요 {post.likeCount}
          </button>
          <span className="stat">
            <Icon name="chat" size={14} />
            {comments.length}개 댓글
          </span>
        </div>
      </div>

      <div className="h3" style={{ margin: '26px 0 14px' }}>댓글 {comments.length}</div>
      <div className="stack g10">
        {comments.length ? rootComments.map((comment) => (
          <div className="comment-thread" key={comment.commentId}>
            {renderComment(comment)}
            {(repliesByParent.get(comment.commentId) || []).map((reply) => renderComment(reply, true))}
          </div>
        )) : (
          <div className="empty" style={{ padding: 30 }}>첫 댓글을 남겨보세요</div>
        )}
      </div>
      <div className="comment-composer">
        {replyTo && (
          <div className="comment-reply-target">
            <span><b>{replyTo.authorName}</b>님에게 답글 작성 중</span>
            <button type="button" onClick={() => setReplyTo(null)} aria-label="답글 취소"><Icon name="x" size={13} /></button>
          </div>
        )}
        <label className="row g6" style={{ marginBottom: 8, fontSize: 12 }}>
          <input type="checkbox" checked={commentAnonymous} onChange={(event) => setCommentAnonymous(event.target.checked)} />
          {commentAnonymous ? '익명으로 작성' : '닉네임으로 작성'}
        </label>
        <div className="row g8">
          <input className="input" placeholder={replyTo ? '답글을 입력하세요...' : '댓글을 입력하세요...'}
            style={{ flex: 1 }} value={commentText} onChange={(event) => setCommentText(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') submitComment(); }} />
          <button className="iconbtn accent" onClick={submitComment} aria-label={replyTo ? '답글 등록' : '댓글 등록'}>
            <Icon name="send" size={16} />
          </button>
        </div>
      </div>
      </div>

        <aside className="community-side">
          {!post.anonymous && (
            <Link className="community-side-author" to={`/users/${post.authorId}`}>
              <Avatar user={author} size={44} />
              <div>
                <div className="row g6">
                  <span style={{ fontWeight: 700, fontSize: 14.5 }}>{author.name}</span>
                  {author.verified && <VerifiedChip level={author.verified} />}
                </div>
                <div className="faint" style={{ fontSize: 11.5, marginTop: 2 }}>
                  {author.dept}
                </div>
              </div>
            </Link>
          )}
          <div className="community-side-popular">
            <div className="h3">인기 글</div>
            <div style={{ marginTop: 6 }}>
              {related.map((p) => (
                <Link key={p.postId} className="mini-post-row" to={`/community/${p.postId}`}>
                  <div className="title">{p.title}</div>
                  <div className="meta">
                    {postCategoryFromApi(p.category)} · 좋아요 {p.likeCount}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
