import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import ListingCard from './ListingCard.jsx';
import BumpButton from './BumpButton.jsx';
import { useListings } from '../lib/useListings';
import { publicUrl } from '../lib/images';

const C = { blue: '#0a6eb8', navy: '#0f2a44', muted: '#5b7488', line: '#cfe6f5' };

const CATEGORY_LABELS = {
  shipbuilding: 'بناء سفن',
  painting: 'طلاء',
  maintenance: 'صيانة',
  engine_test: 'اختبار محرك',
  other: 'أخرى',
};

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

function Products({ ownerId, mine, excludeKind }) {
  const { items, loading, error, done, more, reload } = useListings({ sellerId: ownerId, excludeKind });
  if (error) return <Empty>تعذّر تحميل الإعلانات. تحقق من اتصالك وحاول مرة أخرى.</Empty>;
  if (!loading && items.length === 0)
    return <Empty>{excludeKind ? 'لا توجد منتجات أو خدمات منشورة بعد.' : 'لا توجد إعلانات منشورة بعد.'}</Empty>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '16px 0' }}>
      {items.map((it) => (
        <div key={it.id}>
          <ListingCard item={it} />
          {/* Only the owner sees the bump button, under his own listings */}
          {mine && <BumpButton listingId={it.id} onDone={reload} />}
        </div>
      ))}
      {loading && <Empty>جارٍ التحميل…</Empty>}
      {!loading && !done && (
        <button
          type="button"
          onClick={more}
          style={{ padding: 14, borderRadius: 999, border: `2px solid ${C.line}`, background: '#fff', fontFamily: 'inherit', fontWeight: 700, color: C.blue, cursor: 'pointer' }}
        >
          عرض المزيد
        </button>
      )}
    </div>
  );
}

function Portfolio({ ownerId, mine }) {
  const [videos, setVideos] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase
      .from('portfolio_videos')
      .select('id, title, description, category, video_path, thumbnail_path')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (!alive) return;
        if (err) setError(true);
        else setVideos(data);
      });
    return () => {
      alive = false;
    };
  }, [ownerId]);

  const manage = mine && (
    <Link
      to="/portfolio"
      style={{ display: 'block', textAlign: 'center', padding: '14px 16px', borderRadius: 999, background: C.blue, color: '#fff', fontWeight: 700, textDecoration: 'none', marginTop: 16 }}
    >
      + إدارة معرض أعمالي وإضافة فيديو
    </Link>
  );

  if (error) return <Empty>تعذّر تحميل معرض الأعمال. حاول مرة أخرى.</Empty>;
  if (!videos) return <Empty>جارٍ التحميل…</Empty>;
  if (videos.length === 0)
    return (
      <>
        <Empty>لم يضف هذا الحساب أعمالاً بعد.</Empty>
        {manage}
      </>
    );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '16px 0' }}>
      {manage}
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
            <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{CATEGORY_LABELS[v.category] || CATEGORY_LABELS.other}</div>
            {v.description && <p style={{ color: C.navy, fontSize: 14, lineHeight: 1.8, margin: '8px 0 0' }}>{v.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// Tabs shown on a seller's page: products/services (+ work portfolio for workshops)
// excludeKind="boat": boat-sale ads are NOT listed on a professional's page (home only)
// Usage: <ProfileTabs ownerId={profileId} showPortfolio excludeKind="boat" />
export default function ProfileTabs({ ownerId, showPortfolio = false, excludeKind }) {
  const { user } = useAuth();
  const mine = !!user && user.id === ownerId;
  const [tab, setTab] = useState('products');

  return (
    <div dir="rtl" style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.line}` }}>
        <button type="button" style={tabStyle(tab === 'products')} onClick={() => setTab('products')}>
          المنتجات والخدمات
        </button>
        {showPortfolio && (
          <button type="button" style={tabStyle(tab === 'portfolio')} onClick={() => setTab('portfolio')}>
            معرض الأعمال
          </button>
        )}
      </div>
      {tab === 'portfolio' && showPortfolio ? (
        <Portfolio ownerId={ownerId} mine={mine} />
      ) : (
        <Products ownerId={ownerId} mine={mine} excludeKind={excludeKind} />
      )}
    </div>
  );
}
