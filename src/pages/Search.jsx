import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { boatTypeName, wilayaName } from '../i18n/names.js';
import { MARKET_KINDS } from '../config';
import ListingFeed from '../components/ListingFeed.jsx';
import { getWilayas, getBoatTypes } from '../lib/refData';

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
    getBoatTypes().then(setTypes);
    getWilayas().then(setWilayas);
  }, []);

  function toFilters(d) {
    const byKind = d.type === 'engine' || d.type === 'equipment';
    return {
      q: d.q.trim() || undefined,
      kinds: d.type ? undefined : MARKET_KINDS,
      kind: byKind ? d.type : d.type ? 'boat' : undefined,
      typeId: d.type && !byKind ? Number(d.type) : undefined,
      wilayaId: d.wilayaId ? Number(d.wilayaId) : undefined,
      minPrice: num(d.minPrice),
      maxPrice: num(d.maxPrice),
    };
  }
  function apply(e) {
    e.preventDefault();
    setApplied(toFilters(draft));
  }
  // Results follow the typing (after a short pause), so a few letters are enough: no need to press "Search"
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }
    const timer = setTimeout(() => setApplied(toFilters(draft)), 400);
    return () => clearTimeout(timer);
  }, [draft]);
  function reset() {
    setDraft(EMPTY);
    setApplied({ kinds: MARKET_KINDS });
  }

  return (
    <>
      <div className="topbar"><h2>{t('nav.search')}</h2></div>
      <form onSubmit={apply}>
        <div className="field"><input className="input" type="search" enterKeyHint="search" placeholder={t('search.placeholder')} value={draft.q} onChange={set('q')} maxLength={80} /></div>
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
