import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import ListingFeed from '../components/ListingFeed.jsx';

const EMPTY = { q: '', type: '', wilayaId: '', minPrice: '', maxPrice: '' };
const num = (v) => (/^\d{1,12}$/.test(v) ? Number(v) : undefined);

export default function Search() {
  const [types, setTypes] = useState([]);
  const [wilayas, setWilayas] = useState([]);
  const [draft, setDraft] = useState(EMPTY);
  const [applied, setApplied] = useState({});
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });

  useEffect(() => {
    supabase.from('boat_types').select('id, name_ar').order('sort_order').then(({ data }) => setTypes(data || []));
    supabase.from('wilayas').select('id, name_ar').order('id').then(({ data }) => setWilayas(data || []));
  }, []);

  function apply(e) {
    e.preventDefault();
    setApplied({
      q: draft.q.trim() || undefined,
      kind: draft.type === 'engine' ? 'engine' : undefined,
      typeId: draft.type && draft.type !== 'engine' ? Number(draft.type) : undefined,
      wilayaId: draft.wilayaId ? Number(draft.wilayaId) : undefined,
      minPrice: num(draft.minPrice),
      maxPrice: num(draft.maxPrice),
    });
  }
  function reset() {
    setDraft(EMPTY);
    setApplied({});
  }

  return (
    <>
      <div className="topbar"><h2>البحث</h2></div>
      <form onSubmit={apply}>
        <div className="field"><input className="input" placeholder="ابحث بالعنوان…" value={draft.q} onChange={set('q')} maxLength={80} /></div>
        <div className="row2">
          <select className="input" value={draft.type} onChange={set('type')} aria-label="النوع">
            <option value="">كل الأنواع</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name_ar}</option>)}
            <option value="engine">محركات</option>
          </select>
          <select className="input" value={draft.wilayaId} onChange={set('wilayaId')} aria-label="الولاية">
            <option value="">كل الولايات</option>
            {wilayas.map((w) => <option key={w.id} value={w.id}>{w.name_ar}</option>)}
          </select>
        </div>
        <div className="row2" style={{ marginTop: 10 }}>
          <input className="input" inputMode="numeric" placeholder="أقل سعر (دج)" value={draft.minPrice} onChange={set('minPrice')} maxLength={12} />
          <input className="input" inputMode="numeric" placeholder="أعلى سعر (دج)" value={draft.maxPrice} onChange={set('maxPrice')} maxLength={12} />
        </div>
        <div className="row2" style={{ marginTop: 12 }}>
          <button className="btn">بحث</button>
          <button type="button" className="btn alt" onClick={reset}>مسح</button>
        </div>
      </form>
      <ListingFeed filters={applied} emptyText="لا توجد نتائج مطابقة." />
    </>
  );
}
