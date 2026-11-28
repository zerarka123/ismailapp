import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { useI18n } from '../i18n/index.jsx';
import { categoryName, wilayaName } from '../i18n/names.js';
import { errorText } from '../errors';
import { PHONE_RE, cleanPhone, fmtDate } from '../lib/format';
import { thumbUrl } from '../lib/images';
import Icon from './Icon.jsx';
import VerifiedBadge from './VerifiedBadge.jsx';
import { Avatar } from './GuideFeed.jsx';

const DAY = 86400000;
const pad = (n) => String(n).padStart(2, '0');
const toDateInput = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const one = (x) => (Array.isArray(x) ? x[0] : x);
const okPhone = (v) => {
  const p = v ? cleanPhone(v) : '';
  return p && PHONE_RE.test(p) ? p : null;
};
const SELECT =
  'id, owner_id, business_name, description, address, status, wilaya_id, badge_verified, wilayas(*), guide_categories!inner(id, slug, section, name_ar, name_fr, name_en), professional_contacts(phone, whatsapp), professional_images(storage_path, sort_order)';

// Admin → المصنّعين → "شركات الدليل البحري": every account of the marine guide, with its verified badge and
// the switch that gives it "عروض المصنّعين" with a number of offers it then posts by itself.
export default function AdminMarineCompanies({ sponsors, onChanged, onManage }) {
  const { t } = useI18n();
  const [pros, setPros] = useState(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all'); // all | on | off
  const [enabling, setEnabling] = useState(null); // pro id
  const [form, setForm] = useState({ quota: '5', end: toDateInput(Date.now() + 30 * DAY) });
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let alive = true;
    supabase
      .from('professional_profiles')
      .select(SELECT)
      .eq('guide_categories.section', 'marine')
      .order('business_name')
      .limit(500)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setMsg({ type: 'err', text: errorText(error) });
        setPros(data || []);
      });
    return () => {
      alive = false;
    };
  }, []);

  const linked = useMemo(() => new Map(sponsors.filter((s) => s.professional_id).map((s) => [s.professional_id, s])), [sponsors]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (pros || []).filter((p) => {
      if (filter === 'on' && !linked.has(p.id)) return false;
      if (filter === 'off' && linked.has(p.id)) return false;
      return !s || (p.business_name || '').toLowerCase().includes(s) || (one(p.professional_contacts)?.phone || '').includes(s);
    });
  }, [pros, q, filter, linked]);

  async function toggleBadge(p) {
    const next = !p.badge_verified;
    setBusy(p.id);
    setMsg(null);
    const { error } = await supabase.rpc('admin_set_badge', { p_id: String(p.id), p_verified: next });
    setBusy(null);
    if (error) return setMsg({ type: 'err', text: errorText(error) });
    setPros((prev) => prev.map((x) => (x.id === p.id ? { ...x, badge_verified: next } : x)));
    setMsg({ type: 'ok', text: t(next ? 'admin.badge_given' : 'admin.badge_removed', { name: p.business_name }) });
  }

  async function enable(p) {
    setMsg(null);
    const quota = Number.parseInt(form.quota, 10);
    if (!(quota >= 1 && quota <= 50)) return setMsg({ type: 'err', text: t('sp.v_quota') });
    const end = new Date(`${form.end}T23:59:59`);
    if (!form.end || !(end.getTime() > Date.now())) return setMsg({ type: 'err', text: t('sp.v_period') });
    const c = one(p.professional_contacts) || {};
    const phone = okPhone(c.phone);
    const whatsapp = okPhone(c.whatsapp);
    const name = (p.business_name || '').trim().slice(0, 100);
    setBusy(p.id);
    const { error } = await supabase.from('sponsors').insert({
      name: name.length >= 2 ? name : t('sp.title'),
      tagline: categoryName(p.guide_categories)?.slice(0, 140) || null,
      description: (p.description || '').trim().slice(0, 3000) || null,
      phone,
      whatsapp,
      wilaya_id: p.wilaya_id || null,
      address: (p.address || '').trim().slice(0, 200) || null,
      professional_id: p.id,
      max_offers: quota,
      starts_at: new Date().toISOString(),
      ends_at: end.toISOString(),
      is_active: true,
    });
    setBusy(null);
    if (error) return setMsg({ type: 'err', text: errorText(error) });
    setEnabling(null);
    setMsg({ type: 'ok', text: t('sp.enabled', { name: p.business_name, n: quota }) });
    onChanged();
  }

  return (
    <>
      <p className="muted small">{t('sp.marine_help')}</p>
      {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
      <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.search')} />
      <div className="chips" style={{ marginTop: 8 }}>
        {['all', 'off', 'on'].map((k) => (
          <button key={k} className={`chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{t(`sp.filter_${k}`)}</button>
        ))}
      </div>
      {pros === null && <p className="muted center">{t('common.loading')}</p>}
      {pros && shown.length === 0 && <p className="empty">{t('admin.no_results')}</p>}
      {shown.map((p) => {
        const s = linked.get(p.id);
        const img = [...(p.professional_images || [])].sort((a, b) => a.sort_order - b.sort_order)[0];
        return (
          <div key={p.id} className="box sp-marine">
            <div className="admin-head">
              <Avatar url={img ? thumbUrl('pro-images', img.storage_path) : null} name={p.business_name} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} dir="auto">{p.business_name}{p.badge_verified && <VerifiedBadge size={18} />}</b>
                <div className="muted small">{categoryName(p.guide_categories)} · {wilayaName(p.wilayas)} · {t(`pstatus.${p.status}`)}</div>
                {s && <div className="small sp-on">🏭 {t('sp.on_summary', { used: (s.sponsor_offers || []).length, max: s.max_offers, date: fmtDate(s.ends_at) })}</div>}
              </div>
            </div>
            <div className="mine-actions">
              <button className={`mini ${p.badge_verified ? 'danger' : 'primary'}`} disabled={busy === p.id} onClick={() => toggleBadge(p)}>
                <Icon name="badge" size={13} /> {p.badge_verified ? t('admin.unverify') : t('admin.verify')}
              </button>
              {s ? (
                <button className="mini primary" onClick={() => onManage(s.id)}>🏭 {t('sp.manage')}</button>
              ) : (
                <button className="mini" onClick={() => { setEnabling(enabling === p.id ? null : p.id); setMsg(null); }}>🏭 {t('sp.enable')}</button>
              )}
            </div>
            {enabling === p.id && !s && (
              <div className="sp-enable">
                <div className="row2">
                  <div className="field"><label>{t('sp.f_quota')}</label><input className="input" dir="ltr" inputMode="numeric" value={form.quota} onChange={(e) => setForm({ ...form, quota: e.target.value.replace(/\D/g, '').slice(0, 2) })} /></div>
                  <div className="field"><label>{t('sp.f_end')}</label><input className="input" type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></div>
                </div>
                <p className="muted small">{t('sp.enable_help')}</p>
                <div className="row2">
                  <button className="btn sm" disabled={busy === p.id} onClick={() => enable(p)}>{busy === p.id ? t('common.wait') : t('sp.enable_confirm')}</button>
                  <button className="btn alt sm" onClick={() => setEnabling(null)}>{t('common.cancel')}</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
