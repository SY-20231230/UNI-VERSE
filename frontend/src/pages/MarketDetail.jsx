import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Icon from '../lib/icons';
import Avatar from '../components/Avatar';
import VerifiedChip from '../components/VerifiedChip';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { timeAgo, won, discountPct, formatDate } from '../lib/format';
import ReportModal from '../components/ReportModal';
import ListingGridCard from '../components/ListingGridCard';
import ManageSheet from '../components/ManageSheet';
import ConfirmModal from '../components/ConfirmModal';
import { marketApi } from '../lib/marketApi';
import { marketCategoryFromApi } from '../lib/category';

function ChatRequestSheet({ listing, onSend }) {
  const [mode, setMode] = useState('anon');
  return (
    <div className="stack g16">
      <div>
        <div className="h3">대화 요청 보내기</div>
        <div className="faint" style={{ fontSize: 12.5, marginTop: 6 }}>
          {listing.title} · {won(listing.listedPrice !== undefined ? listing.listedPrice : listing.price)}
        </div>
      </div>
      <div className="stack g10">
        <button
          className="card"
          style={{ padding: 14, textAlign: 'left', boxShadow: 'none', background: 'var(--surface-sunken)', border: '1.5px solid ' + (mode === 'anon' ? 'var(--accent)' : 'var(--border)') }}
          onClick={() => setMode('anon')}
        >
          <div className="row between">
            <b style={{ fontSize: 14 }}>익명으로 요청</b>
            <span className="chip outline">기본</span>
          </div>
          <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>
            상대방도 익명으로만 대화 가능합니다
          </div>
        </button>
        <button
          className="card"
          style={{ padding: 14, textAlign: 'left', boxShadow: 'none', background: 'var(--surface-sunken)', border: '1.5px solid ' + (mode === 'verified' ? 'var(--accent)' : 'var(--border)') }}
          onClick={() => setMode('verified')}
        >
          <div className="row between">
            <b style={{ fontSize: 14 }}>인증 프로필로 요청</b>
            <VerifiedChip level="A" />
          </div>
          <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>
            상대방도 인증 프로필로 대화하는 것을 권장합니다
          </div>
        </button>
      </div>
      <div className="safety-banner">
        <Icon name="shield" size={16} />
        <div>
          <b>안전거래 안내</b>
          카카오톡·오픈채팅 등 외부 메신저 이동, 선입금 요구, 택배거래만 요구하는 경우 사기 위험이 있어요. 의심스러운 상황엔 거래를 중단하고 신고해주세요.
        </div>
      </div>
      <button className="btn btn-primary btn-full" onClick={() => onSend(mode)}>
        대화 요청 보내기
      </button>
    </div>
  );
}

function conditionToKorean(cond) {
  const map = {
    NEW: '미개봉 새상품',
    LIKE_NEW: '거의 새것',
    GOOD: '사용감 적음',
    FAIR: '사용감 많음',
    POOR: '고장/파손'
  };
  return map[cond] || cond || '상태 모름';
}

export default function MarketDetail() {
  const { id } = useParams();
  const { state, sendChatRequest } = useApp();
  const { openSheet, openModal, closeOverlay, toast } = useUI();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromAdmin = searchParams.get('from') === 'admin';
  const backTo = fromAdmin ? '/admin' : '/market';
  const backLabel = fromAdmin ? '관리자' : '중고거래';

  const [listing, setListing] = useState(null);
  const [liked, setLiked] = useState(false);
  const [related, setRelated] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  useEffect(() => {
    async function load() {
      try {
        setListing(null); // Clear previous item to show loading state
        setCurrentImageIndex(0); // Reset image index
        const res = await marketApi.getItem(id);
        setListing(res);
        const relRes = await marketApi.getItems({ sort: 'popular', size: 5 });
        setRelated(relRes.content.filter(x => x.itemId != id));
        window.scrollTo(0, 0); // Scroll to top when item changes
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, [id]);

  if (!listing) {
    return (
      <div className="container mid fade-enter">
        <div className="empty">매물을 불러오는 중이거나 찾을 수 없어요</div>
      </div>
    );
  }

  const seller = { id: listing.sellerId, name: listing.sellerNickname, dept: listing.schoolName, color: '#2F6FED', trades: listing.sellerTrades || 0 };
  const isMine = listing.sellerId === state.me?.userId;

  async function toggleLike() {
    try {
      if (liked) {
        await marketApi.unfavoriteItem(listing.id);
        setListing(l => ({ ...l, likeCount: Math.max(0, (l.likeCount || 0) - 1) }));
        setLiked(false);
      } else {
        await marketApi.favoriteItem(listing.id);
        setListing(l => ({ ...l, likeCount: (l.likeCount || 0) + 1 }));
        setLiked(true);
      }
    } catch(e) {
      toast('요청에 실패했습니다.');
    }
  }

  async function handleSend(mode) {
    const { cid } = await sendChatRequest(listing, mode);
    if (!cid) {
      toast('대화 요청에 실패했습니다.');
      return;
    }
    closeOverlay();
    navigate(`/chat/${cid}`);
    toast('대화 요청을 보냈습니다');
  }

  const categoryLabel = marketCategoryFromApi(listing.category);
  const conditionLabel = conditionToKorean(listing.condition);
  const statusLabel = listing.tradeStatus === 'SELLING' ? '판매중' : 
                      (listing.tradeStatus === 'REQUESTED' || listing.tradeStatus === 'TRADING') ? '거래중' : 
                      listing.tradeStatus === 'COMPLETED' ? '거래완료' :
                      listing.tradeStatus === 'CANCELLED' ? '거래취소' : listing.tradeStatus;

  return (
    <>
      <div className="container mid fade-enter">
        <div className="page-head" style={{ marginBottom: 6 }}>
          <Link className="backlink" to={backTo} style={{ marginBottom: 0 }}>
            <Icon name="back" size={13} />
            {backLabel}
          </Link>
          <div className="row g8">
            {isMine ? (
              <button
                className="iconbtn ghost"
                title="매물 관리"
                onClick={() =>
                  openSheet(
                    <ManageSheet
                      onClose={closeOverlay}
                      onEdit={() => navigate(`/market/${listing.id}/edit`)}
                      onDelete={() =>
                        openModal(
                          <ConfirmModal
                            title="매물을 삭제할까요?"
                            desc="삭제한 매물은 복구할 수 없어요."
                            onClose={closeOverlay}
                            onConfirm={async () => {
                              closeOverlay();
                              try {
                                await marketApi.deleteItem(listing.id);
                                navigate('/market');
                                toast('매물이 삭제되었습니다');
                              } catch(e) {
                                toast('삭제 실패');
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
            ) : (
              <button
                className="iconbtn ghost"
                onClick={() => openModal(<ReportModal onClose={closeOverlay} targetUserId={listing.sellerId} listingId={listing.id} />)}
              >
                <Icon name="flag" size={17} />
              </button>
            )}
          </div>
        </div>
        <div className="market-detail-layout" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 30 }}>
          <div>
            <div className="thumb" style={{ width: '100%', aspectRatio: '4/3', overflow: 'hidden', padding: 0, position: 'relative' }}>
              <div style={{ display: 'flex', width: '100%', height: '100%', transition: 'transform 0.3s ease-in-out', transform: `translateX(-${currentImageIndex * 100}%)` }}>
                {listing.images && listing.images.length > 0 ? (
                  listing.images.map((url, i) => (
                    <img key={i} src={url} alt={`매물 이미지 ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', flexShrink: 0 }} />
                  ))
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="box" size={64} />
                  </div>
                )}
              </div>
              {statusLabel === '거래완료' && <div className="status-flag" style={{ fontSize: 16 }}>거래완료</div>}
              {listing.images && listing.images.length > 1 && (
                <>
                  <button 
                    className="iconbtn ghost" 
                    style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', padding: 6, display: currentImageIndex === 0 ? 'none' : 'flex' }}
                    onClick={(e) => { e.preventDefault(); setCurrentImageIndex(Math.max(0, currentImageIndex - 1)); }}
                  >
                    <Icon name="chev" size={20} style={{ transform: 'rotate(180deg)' }} />
                  </button>
                  <button 
                    className="iconbtn ghost" 
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', padding: 6, display: currentImageIndex === listing.images.length - 1 ? 'none' : 'flex' }}
                    onClick={(e) => { e.preventDefault(); setCurrentImageIndex(Math.min(listing.images.length - 1, currentImageIndex + 1)); }}
                  >
                    <Icon name="chev" size={20} />
                  </button>
                  <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
                    {listing.images.map((_, i) => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === currentImageIndex ? 'white' : 'rgba(255,255,255,0.4)', transition: 'background 0.2s' }} />
                    ))}
                  </div>
                  <span className="chip" style={{ position: 'absolute', right: 14, bottom: 14, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 11, padding: '2px 6px', height: 'auto' }}>
                    {currentImageIndex + 1} / {listing.images.length}
                  </span>
                </>
              )}
            </div>
            <div className="info-grid" style={{ marginTop: 16 }}>
              <div>
                <div className="info-label">카테고리</div>
                <div className="info-value">{categoryLabel}</div>
              </div>
              <div>
                <div className="info-label">등록일</div>
                <div className="info-value">{formatDate(listing.createdAt)}</div>
              </div>
              <div>
                <div className="info-label">거래 희망 장소</div>
                <div className="info-value">{listing.schoolName} 근처</div>
              </div>
              <div>
                <div className="info-label">거래 상태</div>
                <div className="info-value">{statusLabel}</div>
              </div>
            </div>
          </div>
          <div>
            <div className="row g8">
              <span className="chip accent">{categoryLabel}</span>
              <span className="chip outline">{conditionLabel}</span>
            </div>
            <div className="h1" style={{ marginTop: 14 }}>
              {listing.title}
            </div>
            <div className="row g10" style={{ marginTop: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <span className="h1 tnum" style={{ fontSize: 28 }}>
                {won(listing.listedPrice)}
              </span>
            </div>
            <div className="faint" style={{ fontSize: 12, marginTop: 10 }}>
              <Icon name="pin" size={13} /> {listing.schoolName} · {timeAgo(listing.createdAt)}
            </div>
            <div className="stat-bar">
              <span className="stat">
                <Icon name="eye" size={15} /> 조회 {listing.viewCount || 0}
              </span>
              <span className="stat">
                <Icon name="heart" size={15} /> 관심 {listing.likeCount || 0}
              </span>
            </div>
            <div className="divider" style={{ margin: '20px 0' }}></div>
            <div style={{ fontSize: 14.5, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{listing.description || listing.desc}</div>
            <div className="divider" style={{ margin: '20px 0' }}></div>
            <Link className="seller-card" to={fromAdmin ? `/users/${seller.id}?from=admin` : `/users/${seller.id}`}>
              <Avatar user={seller} size={46} />
              <div style={{ flex: 1 }}>
                <div className="row g6">
                  <b style={{ fontSize: 14.5 }}>{seller.name}</b>
                  {seller.verified && <VerifiedChip level={seller.verified} />}
                </div>
                <div className="faint" style={{ fontSize: 11.5, marginTop: 3 }}>
                  거래 {seller.trades}회 · {seller.dept || ''}
                </div>
              </div>
              <Icon name="chev" size={16} />
            </Link>
            <div className="row g10" style={{ marginTop: 24 }}>
              <button
                className="stack"
                style={{
                  width: 48,
                  alignItems: 'center',
                  gap: 2,
                  background: 'none',
                  border: 'none',
                  color: liked ? 'var(--danger)' : 'var(--ink-faint)',
                }}
                onClick={toggleLike}
              >
                <span
                  className="iconbtn"
                  style={{ width: 48, height: 48, ...(liked ? { color: 'var(--danger)', borderColor: 'var(--danger)' } : {}) }}
                >
                  <Icon name="heart" size={20} />
                </span>
                <span className="like-count tnum">{listing.likeCount || 0}</span>
              </button>
              {isMine ? (
                <button className="btn btn-soft" style={{ flex: 1 }} disabled>
                  내가 등록한 상품이에요
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => openSheet(<ChatRequestSheet listing={listing} onSend={handleSend} />)}
                  disabled={statusLabel === '거래완료'}
                >
                  <Icon name="chat" size={17} />
                  {statusLabel === '거래완료' ? '거래가 완료된 상품입니다' : '1:1 대화 요청'}
                </button>
              )}
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <div className="h3" style={{ marginBottom: 14 }}>
              인기 판매상품
            </div>
            <div className="card-grid">
              {related.map((l) => (
                <ListingGridCard key={l.id} listing={l} />
              ))}
            </div>
          </div>
        )}
      </div>
      <style>{'@media(min-width:860px){.market-detail-layout{grid-template-columns:1fr 1fr!important;align-items:start;}}'}</style>
    </>
  );
}
