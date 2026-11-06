import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useI18n } from '../i18n/index.jsx';

// Admin: reports on fish requests / answers (listing reports stay in the normal reports table)
export default function FishReports() {
  const { t } = useI18n();
  const [rows, setRows] = useState([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from('fish_reports').select('id, target_type, target_id, reason').eq('status', 'open').order('created_at', { ascending: false }).limit(100);
    setRows(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);
  if (!rows.length) return null;

  async function remove(r) {
    const table = r.target_type === 'offer' ? 'fish_offers' : 'fish_requests';
    await supabase.from(table).delete().eq('id', r.target_id);
    await supabase.from('fish_reports').update({ status: 'resolved' }).eq('id', r.id);
    load();
  }
  async function dismiss(r) {
    await supabase.from('fish_reports').update({ status: 'dismissed' }).eq('id', r.id);
    load();
  }
  return (
    <>
      <div className="section-title">{t('admin.fish_reports')} ({rows.length})</div>
      {rows.map((r) => (
        <div key={r.id} className="box">
          <b>{r.target_type}</b>
          <p className="small">{r.reason}</p>
          <div className="mine-actions">
            {r.target_type === 'listing' && <Link className="mini" to={`/listing/${r.target_id}`}>{t('mine.view')}</Link>}
            {r.target_type !== 'listing' && <button className="mini danger" onClick={() => remove(r)}>{t('admin.hide_item')}</button>}
            <button className="mini" onClick={() => dismiss(r)}>{t('admin.dismiss')}</button>
          </div>
        </div>
      ))}
    </>
  );
}
