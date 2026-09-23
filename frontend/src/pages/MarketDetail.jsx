import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
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

function ChatRequestSheet({ listing, onSend }) {
  const [mode, setMode] = useState('anon');
  return (
    <div className="stack g16">
      <div>
        <div className="h3">대화 요청 보내기</div>
        <div className="faint" style={{ fontSize: 12.5, marginTop: 6 }}>
          {listing.title} · {won(listing.price)}
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

export default function MarketDetail() {
  const { id } = useParams();
  const { state, userOf, likeListing, sendChatRequest, deleteMarketListing } = useApp();
  const { openSheet, openModal, closeOverlay, toast } = useUI();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromAdmin = searchParams.get('from') === 'admin';
  const backTo = fromAdmin ? '/admin' : '/market';
  const backLabel = fromAdmin ? '관리자' : '중고거래';

  const listing = state.listings.find((x) => x.id === id);
  if (!listing) {
    return (
      <div className="container mid fade-enter">
        <div className="empty">매물을 찾을 수 없어요</div>
      </div>
    );
  }

  const seller = userOf(listing.sellerId);
  const liked = !!state.likedListings[listing.id];
  const isMine = listing.sellerId === 'me';
  const sellerOtherListings = state.listings.filter((l) => l.sellerId === listing.sellerId && l.id !== listing.id).slice(0, 4);

  function handleSend(mode) {
    const { cid } = sendChatRequest(listing.id, mode);
    closeOverlay();
    navigate(`/chat/${cid}`);
    toast('대화 요청을 보냈습니다');
  }

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
                            onConfirm={() => {
                              deleteMarketListing(listing.id);
                              navigate('/market');
                              toast('매물이 삭제되었습니다');
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
            <div className="thumb" style={{ width: '100%', aspectRatio: '4/3' }}>
              <Icon name={listing.icon} size={64} />
              {listing.status === '거래완료' && <div className="status-flag" style={{ fontSize: 16 }}>거래완료</div>}
              <span className="chip" style={{ position: 'absolute', left: 14, bottom: 14, background: 'rgba(0,0,0,.55)', color: '#fff' }}>
                1 / 1
              </span>
            </div>
            <div className="info-grid" style={{ marginTop: 16 }}>
              <div>
                <div className="info-label">카테고리</div>
                <div className="info-value">{listing.category}</div>
              </div>
              <div>
                <div className="info-label">등록일</div>
                <div className="info-value">{formatDate(listing.time)}</div>
              </div>
              <div>
                <div className="info-label">거래 희망 장소</div>
                <div className="info-value">{listing.loc}</div>
              </div>
              <div>
                <div className="info-label">거래 상태</div>
                <div className="info-value">{listing.status}</div>
              </div>
            </div>
          </div>
          <div>
            <div className="row g8">
              <span className="chip accent">{listing.category}</span>
              <span className="chip outline">{listing.condition}</span>
            </div>
            <div className="h1" style={{ marginTop: 14 }}>
              {listing.title}
            </div>
            <div className="row g10" style={{ marginTop: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <span className="h1 tnum" style={{ fontSize: 28 }}>
                {won(listing.price)}
              </span>
              {discountPct(listing.price, listing.originalPrice) > 0 && (
                <span className="faint" style={{ fontSize: 13 }}>실제가격 {won(listing.originalPrice)}</span>
              )}
            </div>
            <div className="faint" style={{ fontSize: 12, marginTop: 10 }}>
              <Icon name="pin" size={13} /> {listing.loc} · {timeAgo(listing.time)}
            </div>
            <div className="stat-bar">
              <span className="stat">
                <Icon name="eye" size={15} /> 조회 {listing.views}
              </span>
              <span className="stat">
                <Icon name="heart" size={15} /> 관심 {listing.likes}
              </span>
              <span className="stat">
                <Icon name="chat" size={15} /> 대화 {listing.chatCount || 0}
              </span>
            </div>
            <div className="divider" style={{ margin: '20px 0' }}></div>
            <div style={{ fontSize: 14.5, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{listing.desc}</div>
            <div className="divider" style={{ margin: '20px 0' }}></div>
            <Link className="seller-card" to={fromAdmin ? `/users/${seller.id}?from=admin` : `/users/${seller.id}`}>
              <Avatar user={seller} size={46} />
              <div style={{ flex: 1 }}>
                <div className="row g6">
                  <b style={{ fontSize: 14.5 }}>{seller.name}</b>
                  <VerifiedChip level={seller.verified} />
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
                onClick={() => likeListing(listing.id)}
              >
                <span
                  className="iconbtn"
                  style={{ width: 48, height: 48, ...(liked ? { color: 'var(--danger)', borderColor: 'var(--danger)' } : {}) }}
                >
                  <Icon name="heart" size={20} />
                </span>
                <span className="like-count tnum">{listing.likes}</span>
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
                >
                  <Icon name="chat" size={17} />
                  1:1 대화 요청
                </button>
              )}
            </div>
          </div>
        </div>

        {sellerOtherListings.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <div className="h3" style={{ marginBottom: 14 }}>
              {seller.name}님의 다른 판매상품
            </div>
            <div className="card-grid">
              {sellerOtherListings.map((l) => (
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
