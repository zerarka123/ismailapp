import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { cssUrl, publicUrl } from '../lib/images';
import { coverOf } from '../components/ListingCard.jsx';
import Icon from '../components/Icon.jsx';

export default function GuideList() {
  const { section, slug } = useParams();
  const nav = useNavigate();
  const [cat, setCat] = useState(undefined);
  const [wilayas, setWilayas] = useState([]);
  const [wilaya, setWilaya] = useState('');
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    supabase.from('guide_categories').select('id, name_ar').eq('section', section).eq('slug', slug).maybeSingle().then(({ data }) => setCat(data ?? null));
    supabase.from('wilayas').select('id, name_ar').order('id').then(({ data }) => setWilayas(data || []));
  }, [section, slug]);

  useEffect(() => {
    if (!cat) return;
    setItems(null);
    setError(false);
    let q = supabase
      .from('professional_profiles')
      .select('id, business_name, description, wilayas(name_ar), professional_images(storage_path, sort_order)')
      .eq('category_id', cat.id)
      .eq('status', 'active')
      .gt('subscription_ends_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(50);
    if (wilaya) q = q.eq('wilaya_id', Number(wilaya));
    q.then(({ data, error: e }) => {
      if (e) setError(true);
      else setItems(data);
    });
  }, [cat, wilaya]);

  if (cat === null) return <p className="empty">هذا القسم غير موجود.</p>;

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => nav(-1)} aria-label="رجوع"><Icon name="back" /></button>
        <h2>{cat?.name_ar || '…'}</h2>
      </div>
      <select className="input" value={wilaya} onChange={(e) => setWilaya(e.target.value)} aria-label="الولاية">
        <option value="">كل الولايات</option>
        {wilayas.map((w) => <option key={w.id} value={w.id}>{w.name_ar}</option>)}
      </select>
      <Link to={`/register-business?cat=${slug}`} className="btn sand" style={{ marginTop: 12 }}><Icon name="plus" />سجّل نشاطك</Link>

      {error && <p className="msg err" style={{ marginTop: 12 }}>تعذّر التحميل. أعد المحاولة.</p>}
      {!items && !error && <p className="muted center">جارٍ التحميل…</p>}
      {items?.length === 0 && <p className="empty">لا توجد أنشطة مسجّلة في هذا التصنيف بعد.</p>}
      <div className="feed">
        {items?.map((p) => {
          const cover = coverOf(p.professional_images);
          return (
            <Link key={p.id} to={`/pro/${p.id}`} className="lcard">
              <div className="lcard-img" style={{ height: 140, ...(cover ? { backgroundImage: cssUrl(publicUrl('pro-images', cover.storage_path)) } : {}) }} />
              <div className="lcard-body">
                <h3>{p.business_name}</h3>
                {p.description && <p>{p.description.slice(0, 90)}{p.description.length > 90 ? '…' : ''}</p>}
                <span className="where">{p.wilayas?.name_ar}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
