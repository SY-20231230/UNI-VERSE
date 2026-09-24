import { useNavigate, Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import Icon from '../lib/icons';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { scanRisk } from '../lib/risk';
import { MARKET_CATEGORY_META } from '../lib/category';

const CATS = ['전공책', '전자기기', '생활용품', '의류', '기타'];
const CONDS = ['새 상품', '거의 새것', '사용감 있음', '하자 있음'];

export default function MarketWrite() {
  const { state, submitMarketListing, updateMarketListing } = useApp();
  const { toast, openModal, closeOverlay } = useUI();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const existing = isEdit ? state.listings.find((l) => l.id === id) : null;
  const canEdit = !isEdit || (existing && existing.sellerId === 'me');

  const [cat, setCat] = useState(existing?.category || '');
  const [cond, setCond] = useState(existing?.condition || '');
  const [title, setTitle] = useState(existing?.title || '');
  const [price, setPrice] = useState(existing ? String(existing.price) : '');
  const [originalPrice, setOriginalPrice] = useState(existing?.originalPrice ? String(existing.originalPrice) : '');
  const [desc, setDesc] = useState(existing?.desc || '');

  function submit() {
    const t = title.trim();
    const d = desc.trim();
    if (!t || !cat || !cond || !price.trim() || !d) {
      toast('모든 필수 항목을 입력해주세요');
      return;
    }
    const hits = scanRisk(t + ' ' + d);
    if (hits.length) {
      openModal(
        <div>
          <div className="risk-bot">
            <Icon name="bot" size={30} />
          </div>
          <div className="h2" style={{ textAlign: 'center', fontSize: 17 }}>
            게시글을 등록할 수 없습니다
          </div>
          <div className="muted" style={{ textAlign: 'center', fontSize: 12.5, marginTop: 6 }}>
            다음과 같은 위험한 표현이 감지되었습니다
          </div>
          <div style={{ marginTop: 16 }}>
            {hits.map((h) => (
              <div className="risk-item" key={h.cat}>
                <Icon name="alert" size={16} />
                <div>
                  <b>{h.cat}</b>
                  <div className="snippet">"{h.snippet}"</div>
                </div>
              </div>
            ))}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 14, lineHeight: 1.6 }}>
            저희 서비스는 교내 직거래를 원칙으로 합니다. 해당 내용을 수정 후 다시 시도해주세요.
          </div>
          <button className="btn btn-dark btn-full" style={{ marginTop: 18 }} onClick={closeOverlay}>
            확인
          </button>
        </div>
      );
      return;
    }
    const payload = {
      category: cat,
      title: t,
      price: Number(price.replace(/\D/g, '')) || 0,
      originalPrice: Number(originalPrice.replace(/\D/g, '')) || 0,
      condition: cond,
      desc: d,
    };
    if (isEdit) {
      updateMarketListing(id, payload);
      navigate(`/market/${id}`);
      toast('AI 검사를 통과하여 수정되었습니다');
    } else {
      const newId = submitMarketListing(payload);
      navigate(`/market/${newId}`);
      toast('AI 검사를 통과하여 등록되었습니다');
    }
  }

  if (isEdit && !existing) {
    return (
      <div className="container narrow fade-enter">
        <div className="empty">매물을 찾을 수 없어요</div>
      </div>
    );
  }
  if (isEdit && !canEdit) {
    return (
      <div className="container narrow fade-enter">
        <div className="empty">수정 권한이 없어요</div>
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
        <div className="row g10">
          <button type="button" className="photo-slot">
            <Icon name="camera" size={20} />
            <span>0/5</span>
          </button>
          <span className="faint" style={{ fontSize: 11.5 }}>
            데모에서는 사진 업로드가 비활성화되어 있어요. 아이콘으로 대체됩니다.
          </span>
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
        <div className="field">
          <label htmlFor="mw-original-price">
            실제 구매 가격 (원) <span className="faint" style={{ fontWeight: 500 }}>(선택)</span>
          </label>
          <input
            id="mw-original-price"
            className="input write-input"
            inputMode="numeric"
            placeholder="예: 50000"
            value={originalPrice}
            onChange={(e) => setOriginalPrice(e.target.value)}
          />
        </div>
      </div>
      <div className="write-helper">실제 구매 가격을 입력하면 상세 페이지에 함께 표시돼요.</div>

      <div className="field" style={{ marginTop: 22 }}>
        <label htmlFor="mw-desc">상품 설명</label>
        <textarea
          id="mw-desc"
          className="textarea write-textarea"
          placeholder="상품에 대한 설명을 입력해주세요"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <div className="write-helper">상태와 사용감을 정확하게 적어주세요.</div>
        <div className="safety-banner write-risk-notice">
          <Icon name="alert" size={16} />
          <div>
            <b>등록 제한 안내</b>
            선입금·택배거래 요구 표현이 감지되면 등록이 제한돼요.
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
