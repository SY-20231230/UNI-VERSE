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
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState('');
  const [liked, setLiked] = useState(false); // Can be improved with actual like state from API
  const [related, setRelated] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const pRes = await communityApi.getPost(id);
        setPost(pRes.data);
        const cRes = await communityApi.getComments(id);
        setComments(cRes.data.content || []);
        // Fetch related posts (simplification for now: just fetch top popular)
        const relRes = await communityApi.getPosts({ sort: 'popular', size: 5 });
        setRelated(relRes.data.content.filter(x => x.postId != id));
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
  const isMine = post.authorId === (state.user ? state.users[state.user]?.id : null); // Note: Need actual logic to check ownership

  async function submitComment() {
    const text = commentText.trim();
    if (!text) {
      toast('댓글 내용을 입력해주세요');
      return;
    }
    try {
      await communityApi.addComment(post.postId, { content: text, isAnonymous: false });
      setCommentText('');
      const cRes = await communityApi.getComments(id);
      setComments(cRes.data.content || []);
    } catch (e) {
      toast('댓글 작성에 실패했습니다.');
    }
  }

  async function likePost() {
    try {
      if (liked) {
        await communityApi.unlikePost(post.postId);
        setPost(p => ({ ...p, likeCount: p.likeCount - 1 }));
        setLiked(false);
      } else {
        await communityApi.likePost(post.postId);
        setPost(p => ({ ...p, likeCount: p.likeCount + 1 }));
        setLiked(true);
      }
    } catch (e) {
      toast('요청에 실패했습니다.');
    }
  }

  function startEditComment(c) {
    setEditingCommentId(c.commentId);
    setEditText(c.content);
  }

  function cancelEditComment() {
    setEditingCommentId(null);
    setEditText('');
  }

  async function saveEditComment() {
    const text = editText.trim();
    if (!text) {
      toast('댓글 내용을 입력해주세요');
      return;
    }
    try {
      await communityApi.updateComment(editingCommentId, { content: text, isAnonymous: false });
      setEditingCommentId(null);
      setEditText('');
      const cRes = await communityApi.getComments(id);
      setComments(cRes.data.content || []);
    } catch (e) {
      toast('댓글 수정에 실패했습니다.');
    }
  }

  async function deleteComment(cid) {
    try {
      await communityApi.deleteComment(cid);
      toast('댓글이 삭제되었습니다');
      const cRes = await communityApi.getComments(id);
      setComments(cRes.data.content || []);
    } catch (e) {
      toast('댓글 삭제에 실패했습니다.');
    }
  }

  return (
    <div className="container mid fade-enter">
      <Link className="backlink" to="/community">
        <Icon name="back" size={13} />
        커뮤니티
      </Link>
      <div className="detail-layout">
        <div>
      <div className="card" style={{ padding: '30px 30px 6px' }}>
        <div className="row between">
          <div className="row g8">
            <span className="chip accent">{postCategoryFromApi(post.category)}</span>
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
                            } catch (e) {
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
        <div className="row g10" style={{ marginTop: 20, paddingBottom: 22 }}>
          <button className={'btn btn-sm ' + (liked ? 'btn-primary' : 'btn-soft')} style={{ borderRadius: 99 }} onClick={likePost}>
            <Icon name="heart" size={15} /> 좋아요 {post.likeCount}
          </button>
          <span className="stat">
            <Icon name="chat" size={14} />
            {comments.length}개 댓글
          </span>
        </div>
      </div>

      <div className="h3" style={{ margin: '26px 0 14px' }}>
        댓글 {comments.length}
      </div>
      <div className="stack g10">
        {comments.length ? (
          comments.map((c) => (
            <div className="card" style={{ padding: '14px 18px' }} key={c.commentId}>
              <div className="row between">
                <b style={{ fontSize: 13 }}>{c.authorName}</b>
                <div className="row g8">
                  <span className="faint" style={{ fontSize: 11 }}>
                    {timeAgo(c.createdAt)}
                  </span>
                  {/* Simplified edit/delete checks without proper user context */}
                  {editingCommentId !== c.commentId && (
                    <>
                    <button className="link" style={{ fontSize: 11 }} onClick={() => startEditComment(c)}>
                      수정
                    </button>
                    <button className="link faint" style={{ fontSize: 11 }} onClick={() => deleteComment(c.commentId)}>
                      삭제
                    </button>
                    </>
                  )}
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
                  <div className="row g8" style={{ marginTop: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline btn-sm" onClick={cancelEditComment}>
                      취소
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={saveEditComment}>
                      저장
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13.5, marginTop: 5, lineHeight: 1.6 }}>{c.content}</div>
              )}
            </div>
          ))
        ) : (
          <div className="empty" style={{ padding: 30 }}>
            첫 댓글을 남겨보세요
          </div>
        )}
      </div>
      <div className="row g8" style={{ marginTop: 16 }}>
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
        <button className="iconbtn accent" onClick={submitComment}>
          <Icon name="send" size={16} />
        </button>
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
