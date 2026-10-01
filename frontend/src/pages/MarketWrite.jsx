import { useNavigate, Link, useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Icon from '../lib/icons';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { marketApi } from '../lib/marketApi';
import { MARKET_CATEGORY_META, marketCategoryToApi } from '../lib/category';

const CATS = ['전공책', '전자기기', '생활용품', '의류', '기타'];
const CONDS = ['새 상품', '거의 새것', '사용감 있음', '하자 있음'];

function conditionToApi(c) {
  if (c === '새 상품') return 'NEW';
  if (c === '거의 새것') return 'LIKE_NEW';
  if (c === '사용감 있음') return 'GOOD';
  if (c === '하자 있음') return 'POOR';
  return 'GOOD';
}
function apiToCondition(c) {
  if (c === 'NEW') return '새 상품';
  if (c === 'LIKE_NEW') return '거의 새것';
  if (c === 'GOOD' || c === 'FAIR') return '사용감 있음';
  if (c === 'POOR') return '하자 있음';
  return '사용감 있음';
}

export default function MarketWrite() {
  const { state } = useApp();
  const { toast, openModal, closeOverlay } = useUI();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  
  const [loading, setLoading] = useState(isEdit);
  const [existing, setExisting] = useState(null);

  const [cat, setCat] = useState('');
  const [cond, setCond] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (isEdit) {
      async function load() {
        try {
          const res = await marketApi.getItem(id);
          const p = res;
          setExisting(p);
          
          const origCat = Object.keys(MARKET_CATEGORY_META).find(c => marketCategoryToApi(c) === p.category) || p.category;
          setCat(CATS.includes(origCat) ? origCat : '기타');
          setCond(apiToCondition(p.condition));
          setTitle(p.title);
          setPrice(String(p.listedPrice || ''));
          setDesc(p.description);
          setImages(p.images || []);
          setLoading(false);
        } catch (e) {
          console.error(e);
          setLoading(false);
        }
      }
      load();
    }
  }, [id, isEdit]);

  const canEdit = !isEdit || (existing && existing.sellerId === (state.user ? state.users[state.user]?.id : null));

  async function submit() {
    const t = title.trim();
    const d = desc.trim();
    if (!t || !cat || !cond || !price.trim() || !d) {
      toast('모든 필수 항목을 입력해주세요');
      return;
    }

    const payload = {
      category: marketCategoryToApi(cat),
      title: t,
      listedPrice: Number(price.replace(/\D/g, '')) || 0,
      purchasePrice: 0, // 서버 필수값. 구매 가격 입력은 받지 않는다.
      condition: conditionToApi(cond),
      description: d, 
      images: images,
    };

    try {
      if (isEdit) {
        await marketApi.updateItem(id, payload);
        navigate(`/market/${id}`);
        toast('게시글이 수정되었습니다');
      } else {
        const response = await marketApi.createItem(payload);
        if (response.itemId) navigate(`/market/${response.itemId}`);
        else navigate(`/market`);
        
        toast('상품이 등록되었습니다');
      }
    } catch (error) {
      const err = error.response?.data || error;
      if (err.code === 'FRAUD_SUSPECTED' || err.message?.includes('사기')) {
        openModal(
          <div>
            <div className="risk-bot">
              <Icon name="bot" size={30} />
            </div>
            <div className="h2" style={{ textAlign: 'center', fontSize: 17 }}>
              게시글을 등록할 수 없습니다
            </div>
            <div className="muted" style={{ textAlign: 'center', fontSize: 12.5, marginTop: 6 }}>
              AI 모델 검사 결과, 다음과 같은 위험이 감지되었습니다.
            </div>
            <div style={{ marginTop: 16, background: '#fee2e2', padding: 12, borderRadius: 8, color: '#991b1b', fontSize: 14 }}>
              <b>사유:</b> {err.message}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 14, lineHeight: 1.6 }}>
              {/* 사유 문구가 이미 유형별 안내를 담고 있으므로 여기서는 다음 행동만 알려준다. */}
              해당 표현을 수정한 뒤 다시 등록해주세요.
            </div>
            <button className="btn btn-dark btn-full" style={{ marginTop: 18 }} onClick={closeOverlay}>
              확인
            </button>
          </div>
        );
      } else {
        toast(err.message || '게시글 등록에 실패했습니다.');
      }
    }
  }
  async function handleImageUpload(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    if (images.length + files.length > 5) {
      toast('사진은 최대 5장까지 첨부할 수 있습니다.');
      return;
    }
    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const url = await marketApi.uploadImage(formData);
        uploadedUrls.push(url);
      }
      setImages(prev => [...prev, ...uploadedUrls]);
    } catch (err) {
      toast('사진 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  }
  
  function removeImage(index) {
    setImages(prev => prev.filter((_, i) => i !== index));
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
        <div className="empty">매물을 찾을 수 없어요</div>
      </div>
    );
  }

  const backTo = isEdit ? `/market/${id}` : '/market';

  return (
    <div className="container narrow fade-enter">
      <Link className="backlink" to={backTo}>
        <Icon name="back" size={13} />
        중고거래
      </Link>
      <h1 className="write-title">{isEdit ? '중고거래 수정' : '중고거래 글쓰기'}</h1>
      <p className="write-sub">학교 안에서 안전하게 거래할 물건을 등록해보세요.</p>

      <div className="field" style={{ marginTop: 26 }}>
        <label>사진 추가 (최대 5장)</label>
        <div className="photo-row">
          <button type="button" className="photo-slot" onClick={() => fileRef.current?.click()}
            disabled={uploading || images.length >= 5}>
            <Icon name="camera" size={20} />
            <span>{uploading ? '업로드 중' : `${images.length}/5`}</span>
          </button>
          <input type="file" ref={fileRef} hidden accept="image/*" multiple onChange={handleImageUpload} />
          {images.map((url, i) => (
            <div key={url + i} className="photo-preview-wrap">
              <img src={url} alt={`업로드 이미지 ${i + 1}`} className="photo-preview" />
              {i === 0 && <span className="photo-badge">대표</span>}
              <button type="button" className="photo-remove" aria-label={`${i + 1}번째 사진 삭제`} onClick={() => removeImage(i)}>
                <Icon name="x" size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="field" style={{ marginTop: 22 }}>
        <label htmlFor="mw-title">상품명</label>
        <input
          id="mw-title"
          className="input write-input"
          placeholder="상품명을 입력해주세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="field" style={{ marginTop: 22 }}>
        <label>카테고리</label>
        <div className="row g8 wrap">
          {CATS.map((c) => {
            const meta = MARKET_CATEGORY_META[c];
            return (
              <button key={c} className={'write-cat-chip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>
                <Icon name={meta.icon} size={12} />
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="field" style={{ marginTop: 22 }}>
        <label>상품 상태</label>
        <div className="row g8 wrap">
          {CONDS.map((c) => (
            <button key={c} className={'write-cat-chip' + (cond === c ? ' on' : '')} onClick={() => setCond(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="form-grid two" style={{ marginTop: 22 }}>
        <div className="field">
          <label htmlFor="mw-price">판매 가격 (원)</label>
          <input
            id="mw-price"
            className="input write-input"
            inputMode="numeric"
            placeholder="예: 15000"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
      </div>

      <div className="field" style={{ marginTop: 22 }}>
        <label htmlFor="mw-desc">상품 설명</label>
        <textarea
          id="mw-desc"
          className="textarea write-textarea"
          placeholder="상품에 대한 설명을 입력해주세요"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <ul className="write-notes">
          <li>상품 상태와 사용감을 정확하게 적어주세요.</li>
          <li>전화번호·이메일·계좌번호·외부 메신저 아이디는 적지 마세요. 연락은 UNI:VERSE 채팅으로 해주세요.</li>
          <li>거래는 교내 직거래를 기준으로 해요.</li>
        </ul>
        <div className="safety-banner write-risk-notice">
          <Icon name="alert" size={16} />
          <div>
            <b>등록 제한 안내</b>
            선입금·계좌 공유·택배거래·외부 메신저 유도 표현이 감지되면 등록이 제한돼요.
          </div>
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
