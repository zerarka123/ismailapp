import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useFavorites } from '../favorites.jsx';
import { useI18n } from '../i18n/index.jsx';
import { boatTypeName, wilayaName } from '../i18n/names.js';
import { conditionLabel, fmtPrice, isNew } from '../lib/format';
import { cssUrl, publicUrl } from '../lib/images';
import { kindKey } from '../lib/safety';

export function coverOf(images) {
  return [...(images || [])].sort((a, b) => a.sort_order - b.sort_order)[0];
}

export const isSponsored = (item) => !!item.sponsored_until && new Date(item.sponsored_until) > new Date();

export default function ListingCard({ item, compact = false }) {
  const { t } = useI18n();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { ids, toggle } = useFavorites();
  const cover = coverOf(item.listing_images);
  const faved = ids.has(item.id);
  const isJob = item.kind === 'job_offer' || item.kind === 'job_request';
  const sub = [
    item.length_m ? `${Number(item.length_m)} ${t('unit.m')}` : null,
    item.boat_types ? boatTypeName(item.boat_types) : t(kindKey(item)),
    isJob ? item.profession : item.year_built,
    conditionLabel(item.condition),
  ].filter(Boolean).join(' · ');

  async function onFav(e) {
    e.preventDefault();
    e.stopPropagation();
    const ok = await toggle(item.id);
    if (!ok) nav(`/login?next=${encodeURIComponent(pathname)}`);
  }

  return (
    <Link to={`/listing/${item.id}`} className={`lcard${compact ? ' compact' : ''}`}>
      <div className="lcard-img" style={cover ? { backgroundImage: cssUrl(publicUrl('listing-images', cover.storage_path)) } : undefined}>
        {isSponsored(item) ? <span className="tag sponsored">{t('home.sponsored_tag')}</span> : isNew(item.published_at) && <span className="tag">{t('card.new')}</span>}
        <button className={`fav ${faved ? 'on' : ''}`} onClick={onFav} aria-label={t('nav.favorites')}>
          <Icon name="star" size={20} fill={faved ? 'currentColor' : 'none'} />
        </button>
        <span className="price">{isJob && item.price_dzd == null ? t('job.salary_open') : fmtPrice(item.price_dzd)}</span>
      </div>
      <div className="lcard-body">
        <h3>{item.title}</h3>
        {sub && <p>{sub}</p>}
        <span className="where">{wilayaName(item.wilayas)}</span>
      </div>
    </Link>
  );
}
