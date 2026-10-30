import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { boatTypeName } from '../i18n/names.js';
import { useNotifications } from '../notifications.jsx';
import { MARKET_KINDS } from '../config';
import { useListings } from '../lib/useListings';
import Icon from '../components/Icon.jsx';
import ListingCard from '../components/ListingCard.jsx';
import ListingFeed from '../components/ListingFeed.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';

// Paid placements on top of the market (listings.sponsored_until set by an admin)
function SponsoredStrip() {
  const { t } = useI18n();
  const { items } = useListings({ kinds: MARKET_KINDS, sponsored: true });
  if (!items.length) return null;
  return (
    <section className="sponsored">
      <div className="section-title">⭐ {t('home.sponsored')}</div>
      <div className="hscroll">
        {items.map((it) => <ListingCard key={it.id} item={it} compact />)}
      </div>
    </section>
  );
}

// Home = Marsa open market only (boats, engines, fishing equipment). Workshops & pros live in the guides.
export default function Home() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { unread } = useNotifications();
  const [types, setTypes] = useState([]);
  const [chip, setChip] = useState('all'); // 'all' | 'engine' | 'equipment' | boat type id

  useEffect(() => {
    supabase.from('boat_types').select('*').order('sort_order').then(({ data }) => setTypes(data || []));
  }, []);

  const filters =
    chip === 'all' ? { kinds: MARKET_KINDS } : chip === 'engine' || chip === 'equipment' ? { kind: chip } : { kind: 'boat', typeId: chip };

  return (
    <>
      <header className="head">
        <div className="brand"><img src="/logo.png" alt="" />{t('app.name')}</div>
        <div className="head-actions">
          <LanguageSwitcher />
          <Link className="iconbtn" to={user ? '/notifications' : '/login?next=%2Fnotifications'} aria-label={t('notif.title')}>
            <Icon name="bell" />
            {unread > 0 && <span className="dot">{unread > 9 ? '9+' : unread}</span>}
          </Link>
          <Link className="iconbtn" to={user ? '/account' : '/login'} aria-label={user ? t('nav.account') : t('login.title')}>
            <Icon name="user" />
          </Link>
        </div>
      </header>

      <Link to="/search" className="searchbox"><Icon name="search" color="#51708A" />{t('home.search_hint')}</Link>

      <div className="shortcuts">
        <Link to="/guide/marine" className="shortcut"><Icon name="compass" />{t('guide.marine')}</Link>
        <Link to="/guide/fisher" className="shortcut sand"><Icon name="fish" />{t('guide.fisher')}</Link>
      </div>

      <SponsoredStrip />

      <div className="section-title">{t('home.market')}</div>
      <div className="chips">
        <button className={`chip ${chip === 'all' ? 'on' : ''}`} onClick={() => setChip('all')}>{t('common.all')}</button>
        {types.map((tp) => (
          <button key={tp.id} className={`chip ${chip === tp.id ? 'on' : ''}`} onClick={() => setChip(tp.id)}>{boatTypeName(tp)}</button>
        ))}
        <button className={`chip ${chip === 'engine' ? 'on' : ''}`} onClick={() => setChip('engine')}>{t('kind.engines')}</button>
        <button className={`chip ${chip === 'equipment' ? 'on' : ''}`} onClick={() => setChip('equipment')}>{t('kind.equipment_plural')}</button>
      </div>

      <ListingFeed filters={filters} emptyText={t('home.empty')} />
    </>
  );
}
