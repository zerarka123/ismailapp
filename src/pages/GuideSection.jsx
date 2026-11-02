import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { SUPABASE_HOST, supabase } from '../supabase';
import { useI18n } from '../i18n/index.jsx';
import { categoryName } from '../i18n/names.js';
import Icon from '../components/Icon.jsx';
import { isBranchVisible } from '../lib/branches';

const SECTIONS = ['marine', 'fisher'];
export const BRANCH_ICONS = {
  shipyards: 'anchor', parts_suppliers: 'store', naval_mechanics: 'boat', naval_electrics: 'compass', gear_shops: 'store',
  fishing_trips: 'fish', jobs: 'user', inox_workshops: 'shield', wood_workshops: 'anchor', cold_rooms: 'store',
};

// A guide = list of branches. Each branch shows the accounts (workshops, craftsmen, cold rooms…) registered in it.
export default function GuideSection() {
  const { section } = useParams();
  const nav = useNavigate();
  const { t } = useI18n();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!SECTIONS.includes(section)) return;
    setItems(null);
    supabase.from('guide_categories').select('*').eq('section', section).order('sort_order').then(({ data, error: e }) => {
      if (e) setError(`${e.code || ''} ${e.message || ''} @ ${SUPABASE_HOST}`.trim());
      else setItems((data || []).filter((c) => isBranchVisible(c.slug)));
    });
  }, [section]);

  if (!SECTIONS.includes(section)) return <Navigate to="/" replace />;

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => nav(-1)} aria-label={t('common.back')}><Icon name="back" /></button>
        <h2>{t(`guide.${section}`)}</h2>
      </div>
      <p className="muted">{t(`guide.${section}_intro`)}</p>
      {error && <p className="msg err">{t('guide.load_failed')}{typeof error === 'string' && <small dir="ltr" style={{ display: 'block', marginTop: 6, opacity: 0.75 }}>{error}</small>}</p>}
      {!items && !error && <p className="muted center">{t('common.loading')}</p>}
      <div className="menu">
        {items?.map((c) => (
          <Link key={c.id} to={`/guide/${section}/${c.slug}`}><Icon name={BRANCH_ICONS[c.slug] || 'pin'} color="#0A6EB4" />{categoryName(c)}</Link>
        ))}
      </div>
      <Link to="/register-business" className="btn sand" style={{ marginTop: 18 }}><Icon name="plus" />{t('guide.register')}</Link>
    </>
  );
}
