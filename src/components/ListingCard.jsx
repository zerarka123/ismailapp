import { Link, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useFavorites } from '../favorites.jsx';
import { CONDITIONS, fmtPrice, isNew } from '../lib/format';
import { cssUrl, publicUrl } from '../lib/images';

export function coverOf(images) {
  return [...(images || [])].sort((a, b) => a.sort_order - b.sort_order)[0];
}

export default function ListingCard({ item }) {
  const nav = useNavigate();
  const { ids, toggle } = useFavorites();
  const cover = coverOf(item.listing_images);
  const faved = ids.has(item.id);
  const sub = [
    item.length_m ? `${Number(item.length_m)} م` : null,
    item.boat_types?.name_ar || (item.kind === 'engine' ? 'محرك' : null),
    item.year_built,
    CONDITIONS[item.condition],
  ].filter(Boolean).join(' · ');

  async function onFav(e) {
    e.preventDefault();
    e.stopPropagation();
    const ok = await toggle(item.id);
    if (!ok) nav(`/login?next=${encodeURIComponent('/')}`);
  }

  return (
    <Link to={`/listing/${item.id}`} className="lcard">
      <div className="lcard-img" style={cover ? { backgroundImage: cssUrl(publicUrl('listing-images', cover.storage_path)) } : undefined}>
        {isNew(item.published_at) && <span className="tag">جديد</span>}
        <button className={`fav ${faved ? 'on' : ''}`} onClick={onFav} aria-label="المفضلة">
          <Icon name="star" size={20} fill={faved ? 'currentColor' : 'none'} />
        </button>
        <span className="price">{fmtPrice(item.price_dzd)}</span>
      </div>
      <div className="lcard-body">
        <h3>{item.title}</h3>
        {sub && <p>{sub}</p>}
        <span className="where">{item.wilayas?.name_ar}</span>
      </div>
    </Link>
  );
}
