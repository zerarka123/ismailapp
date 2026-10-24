import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import ListingCard from './ListingCard.jsx';
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

function Products({ ownerId }) {
  const { items, loading, error, done, more } = useListings({ sellerId: ownerId });
  if (error) return <Empty>تعذّر تحميل الإعلانات. تحقق من اتصالك وحاول مرة أخرى.</Empty>;
  if (!loading && items.length === 0) return <Empty>لا توجد إعلانات منشورة بعد.</Empty>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '16px 0' }}>
      {items.map((it) => (
        <ListingCard key={it.id} item={it} />
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

function Portfolio({ ownerId }) {
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

  if (error) return <Empty>تعذّر تحميل معرض الأعمال. حاول مرة أخرى.</Empty>;
  if (!videos) return <Empty>جارٍ التحميل…</Empty>;
  if (videos.length === 0) return <Empty>لم يضف هذا الحساب أعمالاً بعد.</Empty>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '16px 0' }}>
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

// Tabs shown on a seller's page: products/services (+ work portfolio for professionals)
// Usage: <ProfileTabs ownerId={profileId} showPortfolio />
export default function ProfileTabs({ ownerId, showPortfolio = false }) {
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
      {tab === 'portfolio' && showPortfolio ? <Portfolio ownerId={ownerId} /> : <Products ownerId={ownerId} />}
    </div>
  );
}
