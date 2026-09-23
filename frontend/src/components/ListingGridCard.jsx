import { Link } from 'react-router-dom';
import Icon from '../lib/icons';
import { won } from '../lib/format';
import { MARKET_CATEGORY_META, categoryTint } from '../lib/category';

export default function ListingGridCard({ listing }) {
  const meta = MARKET_CATEGORY_META[listing.category] || MARKET_CATEGORY_META['기타'];
  const tint = categoryTint(meta.variant);
  return (
    <Link className="listing-grid-card" to={`/market/${listing.id}`}>
      <div className="thumb" style={{ background: tint.bg, color: tint.ink }}>
        <Icon name={listing.icon} size={30} />
        {listing.status === '거래완료' && <div className="status-flag">거래완료</div>}
      </div>
      <div className="lg-body">
        <div className="lg-title">{listing.title}</div>
        <div className="lg-price tnum">{won(listing.price)}</div>
        <div className="row between" style={{ marginTop: 8 }}>
          <span className="faint" style={{ fontSize: 11 }}>
            {listing.condition}
          </span>
          <span className="stat">
            <Icon name="heart" size={12} />
            {listing.likes}
          </span>
        </div>
      </div>
    </Link>
  );
}
