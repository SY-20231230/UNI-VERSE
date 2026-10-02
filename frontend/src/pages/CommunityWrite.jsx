import { useNavigate, Link, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Icon from '../lib/icons';
import { useUI } from '../context/UIContext';
import { POST_CATEGORY_META, postCategoryToApi } from '../lib/category';
import { communityApi } from '../lib/communityApi';
import { useApp } from '../context/AppContext';

const STANDARD_CATS = ['자유', '수업/학점', '학교생활', '시설/환경', '기숙사', '취업/진로', '기타'];
const ALL_CATS = ['공지', ...STANDARD_CATS];
const MAX_TAGS = 5;

export default function CommunityWrite() {
  const { state } = useApp();
  const { toast } = useUI();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const canWriteNotice = state.me?.role === 'SCHOOL_ADMIN';
  const categories = canWriteNotice ? ALL_CATS : STANDARD_CATS;

  const [loading, setLoading] = useState(isEdit);
  const [existing, setExisting] = useState(null);
  
  const [cat, setCat] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [anon, setAnon] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (isEdit) {
      async function loadPost() {
        try {
          const res = await communityApi.getPost(id);
          const p = res;
          setExisting(p);
          // Find original category string
          const origCat = ALL_CATS.find(c => postCategoryToApi(c) === p.category) || p.category;
          setCat(origCat);
          setTitle(p.title);
          setBody(p.content);
          setAnon(p.anonymous);
          setTags(p.hashtags || []);
          setLoading(false);
        } catch (err) {
          console.error(err);
          setLoading(false);
        }
      }
      loadPost();
    }
  }, [id, isEdit]);

  const canEdit = !isEdit || (existing && existing.authorId === (state.user ? state.users[state.user]?.id : null));

  function addTag(raw) {
    const t = raw.trim().replace(/^#/, '');
    if (!t) return;
    if (tags.includes(t)) {
      setTagInput('');
      return;
    }
    if (tags.length >= MAX_TAGS) {
      toast(`해시태그는 최대 ${MAX_TAGS}개까지 추가할 수 있어요`);
      return;
    }
    setTags((prev) => [...prev, t]);
    setTagInput('');
  }

  function handleTagKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && tags.length) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  function removeTag(t) {
    setTags((prev) => prev.filter((x) => x !== t));
  }

  async function submit() {
    const t = title.trim();
    const b = body.trim();
    if (!cat) {
      toast('카테고리를 선택해주세요');
      return;
    }
    if (!t || !b) {
      toast('제목과 내용을 입력해주세요');
      return;
    }
    const payload = {
      category: postCategoryToApi(cat),
      title: t,
      content: b,
      isAnonymous: cat === '공지' ? false : anon,
      hashtags: tags
    };

    try {
      if (isEdit) {
        await communityApi.updatePost(id, payload);
        navigate(`/community/${id}`);
        toast('게시글이 수정되었습니다');
      } else {
        const res = await communityApi.createPost(payload);
        navigate(`/community/${res.postId}`);
        toast('게시글이 등록되었습니다');
      }
    } catch (e) {
      toast('게시글 저장에 실패했습니다');
    }
  }

  if (loading) {
    return (
      <div className="container narrow fade-enter">
        <div className="empty">불러오는 중...</div>
      </div>
    );
  }

  if (isEdit && !existing) {
    return (
      <div className="container narrow fade-enter">
        <div className="empty">글을 찾을 수 없어요</div>
      </div>
    );
  }

  const backTo = isEdit ? `/community/${id}` : '/community';

  return (
    <div className="container narrow fade-enter">
      <Link className="backlink" to={backTo}>
        <Icon name="back" size={13} />
        커뮤니티
      </Link>
      <h1 className="write-title">{isEdit ? '게시글 수정' : '커뮤니티 글쓰기'}</h1>
      <p className="write-sub">학교 생활에 도움이 되는 이야기와 정보를 자유롭게 공유해보세요.</p>

      <div className="field" style={{ marginTop: 26 }}>
        <label>카테고리</label>
        <div className="row g8 wrap">
          {categories.map((c) => {
            const meta = POST_CATEGORY_META[c];
            return (
              <button key={c} className={'write-cat-chip' + (cat === c ? ' on' : '')} onClick={() => { setCat(c); if (c === '공지') setAnon(false); }}>
                <Icon name={meta.icon} size={12} />
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {cat === '공지' ? (
        <div className="write-notice-hint" style={{ marginTop: 14 }}><Icon name="bell" size={15} /> 공지는 학교 관리자 이름으로 게시됩니다.</div>
      ) : (
        <div className="write-anon-inline" style={{ marginTop: 14 }} title='작성자 이름 대신 "익명 사용자"로 표시됩니다.'>
          <button type="button" className={'toggle' + (anon ? ' on' : '')} onClick={() => setAnon((a) => !a)}
            role="switch" aria-checked={anon} aria-label="익명으로 작성하기"></button>
          <span>익명으로 작성하기</span>
        </div>
      )}

      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="cw-title">제목</label>
        <input
          id="cw-title"
          className="input write-input"
          placeholder="제목을 입력해주세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="field" style={{ marginTop: 22 }}>
        <label htmlFor="cw-body">내용</label>
        <textarea
          id="cw-body"
          className="textarea write-textarea"
          placeholder="내용을 입력해주세요"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="write-helper">학교 생활, 수강신청, 캠퍼스 정보 등 다른 학생들과 공유하고 싶은 이야기를 작성해주세요.</div>
      </div>

      <div className="field" style={{ marginTop: 22 }}>
        <label htmlFor="cw-tag">
          해시태그 <span className="faint" style={{ fontWeight: 500 }}>(선택, 최대 {MAX_TAGS}개)</span>
        </label>
        <div className="write-tag-input">
          {tags.map((t) => (
            <span key={t} className="write-tag-chip">
              #{t}
              <button type="button" onClick={() => removeTag(t)} aria-label={`${t} 태그 삭제`}>
                <Icon name="x" size={11} />
              </button>
            </span>
          ))}
          <input
            id="cw-tag"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={() => addTag(tagInput)}
            placeholder={tags.length ? '' : '태그 입력 후 Enter'}
          />
        </div>
      </div>

      <div className="write-bottom-bar" style={{ justifyContent: 'flex-end' }}>
        <div className="row g8">
          <button className="btn btn-outline write-cancel" onClick={() => navigate(backTo)}>
            취소
          </button>
          <button className="btn btn-primary write-submit" onClick={submit}>
            {isEdit ? '수정하기' : '등록하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
