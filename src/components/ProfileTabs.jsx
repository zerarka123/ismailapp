import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import ListingCard from './ListingCard.jsx';
import BumpButton from './BumpButton.jsx';
import { Lightbox } from './Carousel.jsx';
import Icon from './Icon.jsx';
import { useListings } from '../lib/useListings';
import { cssUrl, publicUrl } from '../lib/images';
import { isMissingSchema } from '../lib/format';

const C = { blue: '#0a6eb8', navy: '#0f2a44', muted: '#5b7488', line: '#cfe6f5' };
export const VIDEO_CATEGORIES = ['shipbuilding', 'painting', 'maintenance', 'engine_test', 'other'];
// Kinds a professional sells from his own page (boat-sale and job ads live elsewhere)
const PRO_PAGE_KINDS = ['gear', 'engine', 'equipment'];

const tabStyle = (active) => ({
  flex: 1,
  padding: '12px 8px',
  border: 'none',
  borderBottom: `3px solid ${active ? C.blue : 'transparent'}`,
  background: 'none',
  fontFamily: 'inherit',
  fontSize: 15,
  fontWeight: active ? 700 : 500,
  color: active ? C.blue : C.muted,
  cursor: 'pointer',
});

function Empty({ children }) {
  return <p style={{ textAlign: 'center', color: C.muted, padding: '40px 16px', fontSize: 15 }}>{children}</p>;
}

function Products({ ownerId, mine, kinds }) {
  const { t } = useI18n();
  const { items, loading, error, done, more, reload } = useListings({ sellerId: ownerId, kinds });
  if (error) return <Empty>{t('tabs.products_error')}</Empty>;
  if (!loading && items.length === 0)
    return (
      <>
        <Empty>{t('tabs.no_products')}</Empty>
        {mine && <Link className="btn sand" to="/sell?kind=gear">{t('tabs.add_product')}</Link>}
      </>
    );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '16px 0' }}>
      {mine && <Link className="btn sand" to="/sell?kind=gear">{t('tabs.add_product')}</Link>}
      {items.map((it) => (
        <div key={it.id}>
          <ListingCard item={it} />
          {/* Only the owner sees the bump button, under his own listings */}
          {mine && <BumpButton listingId={it.id} onDone={reload} />}
        </div>
      ))}
      {loading && <Empty>{t('common.loading')}</Empty>}
      {!loading && !done && (
        <button type="button" className="btn alt" onClick={more}>{t('common.more')}</button>
      )}
    </div>
  );
}

// Work portfolio: photos (portfolio_photos) + videos (portfolio_videos) of one account
function Gallery({ ownerId, professionalId, mine }) {
  const { t } = useI18n();
  const [photos, setPhotos] = useState(null);
  const [videos, setVideos] = useState(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let alive = true;
    setPhotos(null);
    setVideos(null);
    setError(false);
    const photoQuery = professionalId
      ? supabase.from('portfolio_photos').select('id, storage_path, caption').eq('professional_id', professionalId).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] });
    Promise.all([
      photoQuery,
      supabase.from('portfolio_videos').select('id, title, description, category, video_path, thumbnail_path').eq('owner_id', ownerId).order('created_at', { ascending: false }),
    ]).then(([p, v]) => {
      if (!alive) return;
      // portfolio_photos arrives with migration 003; without it we simply show videos
      if (p.error && !isMissingSchema(p.error)) setError(true);
      if (v.error) setError(true);
      setPhotos(p.data || []);
      setVideos(v.data || []);
    });
    return () => {
      alive = false;
    };
  }, [ownerId, professionalId]);

  const manage = mine && (
    <Link to="/portfolio" className="btn" style={{ marginTop: 16 }}>
      <Icon name="plus" color="#fff" />{t('tabs.manage_portfolio')}
    </Link>
  );

  if (error) return <Empty>{t('tabs.portfolio_error')}</Empty>;
  if (!photos || !videos) return <Empty>{t('common.loading')}</Empty>;
  if (photos.length === 0 && videos.length === 0)
    return (
      <>
        <Empty>{t('tabs.no_work')}</Empty>
        {manage}
      </>
    );

  const urls = photos.map((ph) => publicUrl('pro-images', ph.storage_path));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '16px 0' }}>
      {manage}
      {photos.length > 0 && (
        <>
          <div className="section-title" style={{ margin: 0 }}><Icon name="image" size={18} /> {t('tabs.photos')} ({photos.length})</div>
          <div className="pgrid">
            {photos.map((ph, n) => (
              <button key={ph.id} type="button" className="pgrid-item" style={{ backgroundImage: cssUrl(urls[n]) }} onClick={() => setOpen(n)} aria-label={ph.caption || t('photos.n', { n: n + 1 })}>
                {ph.caption && <span>{ph.caption}</span>}
              </button>
            ))}
          </div>
        </>
      )}
      {videos.length > 0 && <div className="section-title" style={{ margin: 0 }}><Icon name="video" size={18} /> {t('tabs.videos')} ({videos.length})</div>}
      {videos.map((v) => (
        <div key={v.id} style={{ background: '#fff', borderRadius: 24, overflow: 'hidden', boxShadow: '0 6px 24px rgba(10,110,184,.08)' }}>
          {/* preload="none": nothing is downloaded until the visitor presses play */}
          <video
            controls
            playsInline
            preload="none"
            poster={v.thumbnail_path ? publicUrl('portfolio-videos', v.thumbnail_path) : undefined}
            src={publicUrl('portfolio-videos', v.video_path)}
            style={{ width: '100%', display: 'block', background: '#000', maxHeight: 420 }}
          />
          <div style={{ padding: '14px 16px 16px' }}>
            <strong style={{ color: C.navy, fontSize: 16 }}>{v.title}</strong>
            <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{t(`vcat.${VIDEO_CATEGORIES.includes(v.category) ? v.category : 'other'}`)}</div>
            {v.description && <p style={{ color: C.navy, fontSize: 14, lineHeight: 1.8, margin: '8px 0 0' }}>{v.description}</p>}
          </div>
        </div>
      ))}
      {open !== null && createPortal(<Lightbox urls={urls} start={open} onClose={() => setOpen(null)} />, document.body)}
    </div>
  );
}

// Tabs shown on a seller's page: portfolio (photos + videos) and products & services.
// Usage: <ProfileTabs ownerId={ownerId} professionalId={proId} showPortfolio />
export default function ProfileTabs({ ownerId, professionalId, showPortfolio = false, kinds = PRO_PAGE_KINDS }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const mine = !!user && user.id === ownerId;
  const [tab, setTab] = useState(showPortfolio ? 'portfolio' : 'products');

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.line}` }}>
        {showPortfolio && (
          <button type="button" style={tabStyle(tab === 'portfolio')} onClick={() => setTab('portfolio')}>
            {t('tabs.portfolio')}
          </button>
        )}
        <button type="button" style={tabStyle(tab === 'products')} onClick={() => setTab('products')}>
          {t('tabs.products')}
        </button>
      </div>
      {tab === 'portfolio' && showPortfolio ? (
        <Gallery ownerId={ownerId} professionalId={professionalId} mine={mine} />
      ) : (
        <Products ownerId={ownerId} mine={mine} kinds={kinds} />
      )}
    </div>
  );
}
