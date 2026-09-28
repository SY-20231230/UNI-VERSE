import { Link } from 'react-router-dom';
import Icon from '../lib/icons';
import { won } from '../lib/format';
import { MARKET_CATEGORY_META, categoryTint, marketCategoryMetaFromApi } from '../lib/category';

export default function ListingGridCard({ listing }) {
  const meta = marketCategoryMetaFromApi(listing.category);
  const tint = categoryTint(meta.variant);
  
  // Handle both API response and old state
  const id = listing.id || listing.itemId;
  const status = listing.tradeStatus === 'SELLING' ? '판매중' : 
                 listing.tradeStatus === 'TRADING' ? '예약중' : 
                 listing.tradeStatus === 'COMPLETED' ? '거래완료' :
                 listing.tradeStatus === 'CANCELLED' ? '거래취소' :
                 listing.status; // Fallback
  
  return (
    <Link className="listing-grid-card" to={`/market/${id}`}>
      <div className="thumb" style={{ background: tint.bg, color: tint.ink }}>
        {/* Placeholder if no image, otherwise we could render an img tag here */}
        <Icon name={meta.icon || 'box'} size={30} />
        {status === '거래완료' && <div className="status-flag">거래완료</div>}
      </div>
      <div className="lg-body">
        <div className="lg-title">{listing.title}</div>
        <div className="lg-price tnum">{won(listing.listedPrice !== undefined ? listing.listedPrice : listing.price)}</div>
        <div className="row between" style={{ marginTop: 8 }}>
          <span className="faint" style={{ fontSize: 11 }}>
            {listing.sellerNickname || listing.schoolName || listing.condition || '상태 알 수 없음'}
          </span>
          <span className="stat">
            <Icon name="heart" size={12} />
            {listing.likeCount !== undefined ? listing.likeCount : (listing.likes || 0)}
          </span>
        </div>
      </div>
    </Link>
  );
}
