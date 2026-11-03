import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useI18n } from '../i18n/index.jsx';
import { errorText } from '../errors';
import { fmtDate, fmtPrice, isMissingSchema } from '../lib/format';

// Admin tab: recent published listings with a "share on Marsa pages" button. The button calls admin_share_listing(),
// which flips social_approved; a database trigger then sends the listing to the automation that posts it (once).
export default function AdminSocial() {
  const { t } = useI18n();
  const [rows, setRows] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_social_listings', { p_limit: 40 });
    if (error) {
      setRows([]);
      setMsg({ type: 'err', text: isMissingSchema(error) ? t('admin.needs_migration') : errorText(error) });
      return;
    }
    setRows(data || []);
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function share(l) {
    if (!window.confirm(t('admin.social_confirm', { title: l.title }))) return;
    setMsg(null);
    setBusyId(l.id);
    const { error } = await supabase.rpc('admin_share_listing', { p_id: String(l.id) });
    setBusyId(null);
    if (error) return setMsg({ type: 'err', text: errorText(error) });
    setMsg({ type: 'ok', text: t('admin.social_done') });
    load();
  }

  return (
    <>
      <p className="muted small">{t('admin.social_help')}</p>
      {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
      {rows === null && <p className="muted center">{t('common.loading')}</p>}
      {rows && rows.length === 0 && !msg && <p className="empty">{t('admin.social_none')}</p>}
      {rows?.map((l) => (
        <div key={l.id} className="box">
          <b>{l.title}</b>
          <div className="muted small">{fmtPrice(l.price_dzd)} · {fmtDate(l.published_at)}</div>
          {l.social_posted_at && <div className="small" style={{ color: '#1b7a3d' }}>{t('admin.social_posted', { date: fmtDate(l.social_posted_at) })}</div>}
          <div className="mine-actions">
            <Link className="mini" to={`/listing/${l.id}`}>{t('mine.view')}</Link>
            {!l.social_posted_at && (
              <button className="mini" disabled={busyId === l.id} onClick={() => share(l)}>{busyId === l.id ? t('common.wait') : t('admin.social_share')}</button>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
