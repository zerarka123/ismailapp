import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useI18n } from '../i18n/index.jsx';
import { boatTypeName, wilayaName } from '../i18n/names.js';
import { MARKET_KINDS } from '../config';
import ListingFeed from '../components/ListingFeed.jsx';

const EMPTY = { q: '', type: '', wilayaId: '', minPrice: '', maxPrice: '' };
const num = (v) => (/^\d{1,12}$/.test(v) ? Number(v) : undefined);

// Searches the open market only (same kinds as the home page)
export default function Search() {
  const { t } = useI18n();
  const [types, setTypes] = useState([]);
  const [wilayas, setWilayas] = useState([]);
  const [draft, setDraft] = useState(EMPTY);
  const [applied, setApplied] = useState({ kinds: MARKET_KINDS });
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });

  useEffect(() => {
    supabase.from('boat_types').select('*').order('sort_order').then(({ data }) => setTypes(data || []));
    supabase.from('wilayas').select('*').order('id').then(({ data }) => setWilayas(data || []));
  }, []);

  function apply(e) {
    e.preventDefault();
    const byKind = draft.type === 'engine' || draft.type === 'equipment';
    setApplied({
      q: draft.q.trim() || undefined,
      kinds: draft.type ? undefined : MARKET_KINDS,
      kind: byKind ? draft.type : draft.type ? 'boat' : undefined,
      typeId: draft.type && !byKind ? Number(draft.type) : undefined,
      wilayaId: draft.wilayaId ? Number(draft.wilayaId) : undefined,
      minPrice: num(draft.minPrice),
      maxPrice: num(draft.maxPrice),
    });
  }
  function reset() {
    setDraft(EMPTY);
    setApplied({ kinds: MARKET_KINDS });
  }

  return (
    <>
      <div className="topbar"><h2>{t('nav.search')}</h2></div>
      <form onSubmit={apply}>
        <div className="field"><input className="input" placeholder={t('search.placeholder')} value={draft.q} onChange={set('q')} maxLength={80} /></div>
        <div className="row2">
          <select className="input" value={draft.type} onChange={set('type')} aria-label={t('search.type')}>
            <option value="">{t('search.all_types')}</option>
            {types.map((tp) => <option key={tp.id} value={tp.id}>{boatTypeName(tp)}</option>)}
            <option value="engine">{t('kind.engines')}</option>
            <option value="equipment">{t('kind.equipment_plural')}</option>
          </select>
          <select className="input" value={draft.wilayaId} onChange={set('wilayaId')} aria-label={t('field.wilaya')}>
            <option value="">{t('common.all_wilayas')}</option>
            {wilayas.map((w) => <option key={w.id} value={w.id}>{wilayaName(w)}</option>)}
          </select>
        </div>
        <div className="row2" style={{ marginTop: 10 }}>
          <input className="input" inputMode="numeric" placeholder={t('search.min_price')} value={draft.minPrice} onChange={set('minPrice')} maxLength={12} />
          <input className="input" inputMode="numeric" placeholder={t('search.max_price')} value={draft.maxPrice} onChange={set('maxPrice')} maxLength={12} />
        </div>
        <div className="row2" style={{ marginTop: 12 }}>
          <button className="btn">{t('search.go')}</button>
          <button type="button" className="btn alt" onClick={reset}>{t('search.clear')}</button>
        </div>
      </form>
      <ListingFeed filters={applied} emptyText={t('search.none')} />
    </>
  );
}
