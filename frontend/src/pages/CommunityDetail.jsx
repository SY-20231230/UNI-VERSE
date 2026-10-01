import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Icon from '../lib/icons';
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

  useEffect(() => {
    async function loadData() {
      try {
        const pRes = await communityApi.getPost(id);
        setPost(pRes);
        setLiked(Boolean(pRes.likedByCurrentUser));
        const cRes = await communityApi.getComments(id);
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
      await communityApi.addComment(post.postId, { content: text, isAnonymous: commentAnonymous });
      setCommentText('');
      setCommentAnonymous(false);
      const cRes = await communityApi.getComments(id);
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
      const cRes = await communityApi.getComments(id);
      setComments(cRes.content || []);
    } catch {
      toast('댓글 수정에 실패했습니다.');
    }
  }

  async function deleteComment(cid) {
    try {
      await communityApi.deleteComment(cid);
      toast('댓글이 삭제되었습니다');
      const cRes = await communityApi.getComments(id);
      setComments(cRes.content || []);
    } catch {
      toast('댓글 삭제에 실패했습니다.');
    }
  }

  return (
    <div className="container mid fade-enter">
      <Link className="backlink" to="/community">
        <Icon name="back" size={15} />
        게시판으로 돌아가기
      </Link>
      <div className="detail-layout">
        <div>
      <div className="card post-detail-card">
        <div className="row between">
          <div className="row g8">
            <span className="chip accent post-detail-cat">{postCategoryFromApi(post.category)}</span>
            {post.anonymous && <span className="chip outline">익명</span>}
          </div>
          <div className="row g6">
          <span className="post-card-time">{timeAgo(post.createdAt)}</span>
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
        </div>
        <h1 className="post-detail-title">{post.title}</h1>
        {/* 익명 글이 아니면 작성자를 눌러 프로필로 간다 */}
        {(() => {
          const inner = (
            <>
              <div className="post-author-avatar">{post.anonymous ? '?' : (author.name || '?').slice(0, 1)}</div>
              <div>
                <div className="post-author-name">{author.name}</div>
                <div className="post-author-meta">조회 {post.viewCount}</div>
              </div>
            </>
          );
          return post.anonymous || !post.authorId ? (
            <div className="post-detail-author">{inner}</div>
          ) : (
            <div className="post-detail-author">
              <Link className="post-author-link" to={`/users/${post.authorId}`} state={{ user: author }} title="프로필 보기">
                {inner}
              </Link>
            </div>
          );
        })()}
        <div className="post-detail-body">{post.content}</div>
        <div className="row g6 wrap" style={{ marginTop: 18 }}>
          {post.hashtags && post.hashtags.map((t) => (
            <span key={t} className="faint mono" style={{ fontSize: 12 }}>
              #{t}
            </span>
          ))}
        </div>
        <div className="post-detail-actions">
          <button
            className={'like-pill' + (liked ? ' on' : '')}
            onClick={likePost}
            disabled={likePending}
            aria-pressed={liked}
          >
            <Icon name="heart" size={15} style={{ fill: liked ? 'currentColor' : 'none' }} /> 좋아요 {post.likeCount}
          </button>
          <span className="post-detail-pill">
            <Icon name="chat" size={14} />
            {comments.length}개 댓글
          </span>
        </div>
      </div>

      <div className="card comment-card">
      <div className="h3" style={{ marginBottom: 16 }}>
        댓글 {comments.length}개
      </div>
      <div className="stack g10">
        {comments.length ? (
          comments.map((c) => (
            <div className="comment-item" key={c.commentId}>
              <div className="row between">
                <div className="row g6">
                  <b style={{ fontSize: 13 }}>{c.authorName}</b>
                  {c.postAuthor && <span className="chip accent" style={{ fontSize: 10 }}>작성자</span>}
                </div>
                <div className="row g8">
                  <span className="faint" style={{ fontSize: 11 }}>
                    {timeAgo(c.createdAt)}
                  </span>
                  {c.mine && editingCommentId !== c.commentId && (
                    <button
                      className="iconbtn ghost comment-more"
                      title="댓글 관리"
                      aria-label="댓글 관리"
                      onClick={() =>
                        openSheet(
                          <ManageSheet
                            onClose={closeOverlay}
                            onEdit={() => startEditComment(c)}
                            onDelete={() =>
                              openModal(
                                <ConfirmModal
                                  title="댓글을 삭제할까요?"
                                  desc="삭제한 댓글은 복구할 수 없어요."
                                  onClose={closeOverlay}
                                  onConfirm={() => { closeOverlay(); deleteComment(c.commentId); }}
                                />
                              )
                            }
                          />
                        )
                      }
                    >
                      <Icon name="more" size={16} />
                    </button>
                  )}
                  {/* ⋯ 버튼이 없는 댓글도 같은 자리를 비워 두어 날짜 위치를 맞춘다 */}
                  {!(c.mine && editingCommentId !== c.commentId) && <span className="comment-more" aria-hidden="true" />}
                </div>
              </div>
              {editingCommentId === c.commentId ? (
                <div style={{ marginTop: 8 }}>
                  <textarea
                    className="textarea"
                    style={{ minHeight: 64, fontSize: 13.5 }}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                  />
                  <div className="row between g8" style={{ marginTop: 8 }}>
                    <AnonToggle anonymous={editAnonymous} onChange={setEditAnonymous} />
                    <div className="row g8">
                    <button className="btn btn-outline btn-sm" onClick={cancelEditComment}>
                      취소
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={saveEditComment}>
                      저장
                    </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13.5, marginTop: 5, lineHeight: 1.6 }}>{c.content}</div>
              )}
            </div>
          ))
        ) : (
          <div className="comment-empty">첫 댓글을 남겨보세요</div>
        )}
      </div>
      <div style={{ marginTop: 20 }}>
        <div className="comment-input-row">
          <AnonToggle anonymous={commentAnonymous} onChange={setCommentAnonymous} />
          <input
            className="input"
            placeholder="댓글을 입력하세요..."
            style={{ flex: 1 }}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitComment();
            }}
          />
          <button className="btn btn-primary comment-submit" onClick={submitComment}>
            작성
          </button>
        </div>
      </div>
      </div>
        </div>

        <aside className="community-side">
          <div className="community-side-popular">
            <div className="popular-head">
              <Icon name="trend" size={16} />
              <span className="h3">게시판 인기 글</span>
            </div>
            <div className="popular-list">
              {related.map((p, i) => (
                <Link key={p.postId} className="mini-post-row" to={`/community/${p.postId}`}>
                  <span className={'popular-rank' + (i < 3 ? ' top' : '')}>{i + 1}</span>
                  <span className="popular-body">
                    <span className="title">{p.title}</span>
                    <span className="meta">{postCategoryFromApi(p.category)} · 좋아요 {p.likeCount}</span>
                  </span>
                </Link>
              ))}
              {related.length === 0 && <div className="popular-empty">아직 인기 글이 없어요</div>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// 댓글을 닉네임으로 쓸지 익명으로 쓸지 한 번에 고르는 두 칸 스위치
function AnonToggle({ anonymous, onChange }) {
  return (
    <div className="anon-toggle" role="radiogroup" aria-label="작성자 표시">
      <button type="button" role="radio" aria-checked={!anonymous} className={!anonymous ? 'on' : ''} onClick={() => onChange(false)}>
        닉네임
      </button>
      <button type="button" role="radio" aria-checked={anonymous} className={anonymous ? 'on' : ''} onClick={() => onChange(true)}>
        익명
      </button>
    </div>
  );
}
