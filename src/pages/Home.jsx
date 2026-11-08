import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { boatTypeName } from '../i18n/names.js';
import { useNotifications } from '../notifications.jsx';
import { MARKET_KINDS, WEATHER_LIVE, WEATHER_URL } from '../config';
import { useListings } from '../lib/useListings';
import Icon from '../components/Icon.jsx';
import ListingCard from '../components/ListingCard.jsx';
import ListingFeed from '../components/ListingFeed.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import { listAnnouncements, readIds } from '../lib/announcements';

// Latest admin announcement (last 30 days) as a small banner that opens "What's new"
function NewsStrip() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [a, setA] = useState(null);
  const [unseen, setUnseen] = useState(false);
  useEffect(() => {
    let alive = true;
    listAnnouncements(1).then(async ({ data }) => {
      const last = data?.[0];
      if (!alive || !last || Date.now() - new Date(last.created_at).getTime() > 30 * 86400000) return;
      setA(last);
      if (user) setUnseen(!(await readIds(user.id, [last.id])).has(last.id));
    }, () => {});
    return () => {
      alive = false;
    };
  }, [user?.id]);
  if (!a) return null;
  return (
    <Link to={`/news?a=${a.id}`} className="news-strip">
      <Icon name="megaphone" />
      <span dir="auto">{a.title}</span>
      {unseen && <span className="pill warn">{t('ann.new')}</span>}
      <b>{t('ann.news_title')}</b>
    </Link>
  );
}

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
          <a className="iconbtn weather" href={WEATHER_URL} target="_blank" rel="noopener noreferrer" aria-label={t('fish.weather')}>
            <Icon name="cloud" />
            {WEATHER_LIVE && <span className="wx">{WEATHER_LIVE.temp}° · {WEATHER_LIVE.wind}</span>}
          </a>
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

      <NewsStrip />

      <div className="shortcuts">
        <Link to="/guide/marine" className="shortcut"><Icon name="compass" size={28} /><span>{t('guide.marine')}</span></Link>
        <Link to="/guide/fisher" className="shortcut"><Icon name="anchor" size={28} /><span>{t('guide.fisher')}</span></Link>
        <Link to="/fish" className="shortcut"><Icon name="fish" size={28} /><span>{t('fish.title')}</span></Link>
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
