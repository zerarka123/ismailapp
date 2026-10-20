import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import Icon from '../components/Icon.jsx';

const TITLES = { marine: 'الدليل البحري', fisher: 'دليل الصياد' };
const ICONS = { shipyards: 'anchor', parts_suppliers: 'store', naval_mechanics: 'boat', naval_electrics: 'compass', gear_shops: 'store', fishing_trips: 'fish', jobs: 'user' };

export default function GuideSection() {
  const { section } = useParams();
  const nav = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!TITLES[section]) return;
    setItems(null);
    supabase.from('guide_categories').select('id, slug, name_ar').eq('section', section).order('sort_order').then(({ data, error: e }) => {
      if (e) setError(true);
      else setItems(data);
    });
  }, [section]);

  if (!TITLES[section]) return <Navigate to="/" replace />;

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => nav(-1)} aria-label="رجوع"><Icon name="back" /></button>
        <h2>{TITLES[section]}</h2>
      </div>
      {error && <p className="msg err">تعذّر تحميل القائمة. تحقق من الاتصال وأعد المحاولة.</p>}
      {!items && !error && <p className="muted center">جارٍ التحميل…</p>}
      <div className="menu">
        {items?.map((c) => (
          <Link key={c.id} to={`/guide/${section}/${c.slug}`}><Icon name={ICONS[c.slug] || 'pin'} color="#0A6EB4" />{c.name_ar}</Link>
        ))}
      </div>
      <Link to="/register-business" className="btn sand" style={{ marginTop: 18 }}><Icon name="plus" />سجّل نشاطك</Link>
    </>
  );
}
