import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { categoryName, planName, wilayaName } from '../i18n/names.js';
import { errorText } from '../errors';
import { PHONE_RE, cleanPhone, fmtDate, isMissingSchema } from '../lib/format';
import { proKindLabel } from '../lib/accountTypes';
import { selectListings } from '../lib/useListings';
import VerifiedBadge from '../components/VerifiedBadge.jsx';
import Icon from '../components/Icon.jsx';

const TONE = { pending: 'warn', active: 'ok', suspended: 'bad' };
const one = (x) => (Array.isArray(x) ? x[0] : x);
const PRO_SELECT =
  'id, owner_id, business_name, description, address, status, pro_type, category_id, wilaya_id, badge_verified, subscription_ends_at, wilayas(*), guide_categories(*), professional_contacts(phone, whatsapp)';

// Calls the migration-003 RPC; on an older database falls back to the direct table writes used before.
async function rpcOr(name, args, fallback) {
  const res = await supabase.rpc(name, args);
  if (res.error && isMissingSchema(res.error)) return fallback();
  return res;
}

function EditPro({ p, cats, wilayas, onDone, onCancel }) {
  const { t } = useI18n();
  const c = one(p.professional_contacts) || {};
  const [f, setF] = useState({
    name: p.business_name || '',
    description: p.description || '',
    cat: p.category_id ? String(p.category_id) : '',
    wilayaId: p.wilaya_id ? String(p.wilaya_id) : '',
    address: p.address || '',
    phone: c.phone || '',
    whatsapp: c.whatsapp || '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setErr(null);
    const name = f.name.trim();
    if (name.length < 2 || name.length > 100) return setErr(t('reg.v_name'));
    if (!f.cat) return setErr(t('reg.v_cat'));
    if (!f.wilayaId) return setErr(t('v.wilaya'));
    if (f.phone && !PHONE_RE.test(cleanPhone(f.phone))) return setErr(t('v.phone'));
    if (f.whatsapp && !PHONE_RE.test(cleanPhone(f.whatsapp))) return setErr(t('v.whatsapp'));
    setBusy(true);
    const fields = {
      business_name: name,
      description: f.description.trim().slice(0, 3000),
      category_id: Number(f.cat),
      wilaya_id: Number(f.wilayaId),
      address: f.address.trim().slice(0, 200) || null,
    };
    const contact = { phone: f.phone ? cleanPhone(f.phone) : null, whatsapp: f.whatsapp ? cleanPhone(f.whatsapp) : null };
    const { error } = await rpcOr(
      'admin_update_professional',
      {
        p_id: String(p.id),
        p_business_name: fields.business_name,
        p_description: fields.description,
        p_category_id: fields.category_id,
        p_wilaya_id: fields.wilaya_id,
        p_address: fields.address,
        p_phone: contact.phone,
        p_whatsapp: contact.whatsapp,
      },
      async () => {
        const a = await supabase.from('professional_profiles').update(fields).eq('id', p.id);
        if (a.error) return a;
        return contact.phone ? supabase.from('professional_contacts').update(contact).eq('professional_id', p.id) : a;
      }
    );
    setBusy(false);
    if (error) return setErr(errorText(error));
    onDone();
  }

  return (
    <form onSubmit={save} className="edit-form" noValidate>
      <div className="field"><label>{t('reg.name')}</label><input className="input" value={f.name} onChange={set('name')} maxLength={100} /></div>
      <div className="row2">
        <div className="field"><label>{t('reg.cat')}</label>
          <select className="input" value={f.cat} onChange={set('cat')}>
            <option value="">{t('common.choose')}</option>
            {cats.map((x) => <option key={x.id} value={x.id}>{categoryName(x)}</option>)}
          </select>
        </div>
        <div className="field"><label>{t('field.wilaya')}</label>
          <select className="input" value={f.wilayaId} onChange={set('wilayaId')}>
            <option value="">{t('common.choose')}</option>
            {wilayas.map((w) => <option key={w.id} value={w.id}>{wilayaName(w)}</option>)}
          </select>
        </div>
      </div>
      <div className="field"><label>{t('field.port_address')}</label><input className="input" value={f.address} onChange={set('address')} maxLength={200} /></div>
      <div className="field"><label>{t('reg.description')}</label><textarea className="input" value={f.description} onChange={set('description')} maxLength={3000} /></div>
      <div className="row2">
        <div className="field"><label>{t('field.phone')}</label><input className="input" dir="ltr" inputMode="tel" value={f.phone} onChange={set('phone')} /></div>
        <div className="field"><label>{t('contact.whatsapp')}</label><input className="input" dir="ltr" inputMode="tel" value={f.whatsapp} onChange={set('whatsapp')} /></div>
      </div>
      {err && <p className="msg err">{err}</p>}
      <div className="row2">
        <button className="btn sm" disabled={busy}>{busy ? t('common.wait') : t('common.save')}</button>
        <button type="button" className="btn alt sm" onClick={onCancel}>{t('common.cancel')}</button>
      </div>
    </form>
  );
}

export default function Admin() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState('pros');
  const [pros, setPros] = useState(null);
  const [reports, setReports] = useState(null);
  const [sponsored, setSponsored] = useState([]);
  const [plans, setPlans] = useState([]);
  const [cats, setCats] = useState([]);
  const [wilayas, setWilayas] = useState([]);
  const [pick, setPick] = useState({});
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState(null);
  const isAdmin = !!profile?.is_admin;

  const load = useCallback(async () => {
    const [a, b, c] = await Promise.all([
      supabase.from('professional_profiles').select(PRO_SELECT).order('created_at', { ascending: false }).limit(200),
      supabase.from('reports').select('id, reason, listing_id, professional_id, listings(title), professional_profiles(business_name)').eq('status', 'open').order('created_at', { ascending: false }).limit(100),
      supabase.from('plans').select('id, pro_type, name_ar, price_dzd, duration_days').order('id'),
    ]);
    if (a.error || b.error || c.error) setMsg({ type: 'err', text: t('admin.load_failed') });
    setPros(a.data || []);
    setReports(b.data || []);
    setPlans(c.data || []);
    const s = await selectListings((sel) =>
      supabase.from('listings').select(sel).gt('sponsored_until', new Date().toISOString()).order('sponsored_until', { ascending: false }).limit(50)
    );
    setSponsored(s.error ? [] : s.data || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    load();
    supabase.from('guide_categories').select('*').order('sort_order').then(({ data }) => setCats(data || []));
    supabase.from('wilayas').select('*').order('id').then(({ data }) => setWilayas(data || []));
  }, [isAdmin, load]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (pros || []).filter((p) => !s || (p.business_name || '').toLowerCase().includes(s) || (one(p.professional_contacts)?.phone || '').includes(s));
  }, [pros, q]);

  if (!isAdmin) return <Navigate to="/" replace />;

  async function act(promise, okText) {
    setMsg(null);
    const { error } = await promise;
    if (error) return setMsg({ type: 'err', text: errorText(error) });
    setMsg({ type: 'ok', text: okText });
    load();
  }
  const planFor = (p) => plans.find((x) => String(x.id) === String(pick[p.id])) || plans.find((x) => x.pro_type === p.pro_type);
  const activate = (p) => {
    const plan = planFor(p);
    if (!plan) return setMsg({ type: 'err', text: t('admin.no_plan') });
    act(supabase.rpc('admin_activate_subscription', { p_professional: p.id, p_plan: plan.id, p_amount: plan.price_dzd, p_ref: null }), t('admin.activated'));
  };
  const setStatus = (p, s) => act(supabase.rpc('admin_set_professional_status', { p_id: p.id, p_status: s }), t('admin.updated'));
  const resolve = (r, s) => act(supabase.rpc('admin_resolve_report', { p_id: r.id, p_status: s }), t('admin.report_closed'));
  async function hide(r) {
    if (r.listing_id) await supabase.rpc('admin_set_listing_status', { p_id: r.listing_id, p_status: 'hidden' });
    else await supabase.rpc('admin_set_professional_status', { p_id: r.professional_id, p_status: 'suspended' });
    resolve(r, 'reviewed');
  }
  async function toggleBadge(p) {
    const next = !p.badge_verified;
    setBusyId(p.id);
    setMsg(null);
    const { error } = await rpcOr('admin_set_badge', { p_id: String(p.id), p_verified: next }, () =>
      supabase.from('professional_profiles').update({ badge_verified: next }).eq('id', p.id)
    );
    setBusyId(null);
    if (error) return setMsg({ type: 'err', text: errorText(error) });
    setPros((prev) => prev.map((x) => (x.id === p.id ? { ...x, badge_verified: next } : x)));
    setMsg({ type: 'ok', text: t(next ? 'admin.badge_given' : 'admin.badge_removed', { name: p.business_name }) });
  }
  const unsponsor = (l) => act(supabase.rpc('admin_set_listing_sponsored', { p_id: String(l.id), p_days: 0 }), t('admin.sponsor_removed'));

  return (
    <>
      <div className="topbar"><h2>{t('admin.title')}</h2></div>
      <div className="seg seg3">
        <button className={`btn sm ${tab === 'pros' ? '' : 'alt'}`} onClick={() => setTab('pros')}>{t('admin.tab_pros')} ({pros?.length ?? 0})</button>
        <button className={`btn sm ${tab === 'reports' ? '' : 'alt'}`} onClick={() => setTab('reports')}>{t('admin.tab_reports')} ({reports?.length ?? 0})</button>
        <button className={`btn sm ${tab === 'sponsored' ? '' : 'alt'}`} onClick={() => setTab('sponsored')}>{t('admin.tab_sponsored')} ({sponsored.length})</button>
      </div>
      {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}

      {tab === 'pros' && (
        <>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.search')} />
          {pros === null && <p className="muted center">{t('common.loading')}</p>}
          {pros && shown.length === 0 && <p className="empty">{t('admin.no_results')}</p>}
        </>
      )}
      {tab === 'pros' && shown.map((p) => {
        const tone = TONE[p.status] || 'warn';
        const myPlans = plans.filter((x) => x.pro_type === p.pro_type);
        return (
          <div key={p.id} className="box">
            <div className="admin-head">
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{p.business_name}{p.badge_verified && <VerifiedBadge size={18} />}</b>{' '}
                <span className={`pill ${tone}`}>{t(`pstatus.${p.status}`)}</span>
              </div>
              <Link className="mini" to={`/pro/${p.id}`}>{t('mine.view')}</Link>
              <button className="mini" onClick={() => setEditing(editing === p.id ? null : p.id)}><Icon name="edit" size={13} /> {t('admin.edit')}</button>
            </div>
            <div className="muted small">{proKindLabel(p.pro_type)} · {categoryName(p.guide_categories)} · {wilayaName(p.wilayas)} · <span dir="ltr">{one(p.professional_contacts)?.phone}</span></div>
            {p.subscription_ends_at && <div className="muted small">{t('admin.ends', { date: fmtDate(p.subscription_ends_at) })}</div>}

            {editing === p.id && (
              <EditPro p={p} cats={cats} wilayas={wilayas} onCancel={() => setEditing(null)} onDone={() => { setEditing(null); setMsg({ type: 'ok', text: t('admin.saved') }); load(); }} />
            )}

            {p.status !== 'suspended' && (
              <div className="row2" style={{ marginTop: 10 }}>
                <select className="input" style={{ height: 40 }} value={pick[p.id] || planFor(p)?.id || ''} onChange={(e) => setPick({ ...pick, [p.id]: e.target.value })}>
                  {myPlans.map((x) => <option key={x.id} value={x.id}>{planName(x)} · {x.price_dzd} {t('price.currency')}</option>)}
                </select>
                <button className="btn sm" onClick={() => activate(p)}>{p.status === 'active' ? t('admin.extend') : t('admin.activate')}</button>
              </div>
            )}
            <div className="mine-actions">
              <button className={`mini ${p.badge_verified ? 'danger' : 'primary'}`} disabled={busyId === p.id} onClick={() => toggleBadge(p)}>
                <Icon name="badge" size={13} /> {busyId === p.id ? '…' : p.badge_verified ? t('admin.unverify') : t('admin.verify')}
              </button>
              {p.status !== 'suspended' ? (
                <button className="mini danger" onClick={() => setStatus(p, 'suspended')}>{t('admin.suspend')}</button>
              ) : (
                <button className="mini" onClick={() => setStatus(p, 'pending')}>{t('admin.reopen')}</button>
              )}
            </div>
          </div>
        );
      })}

      {tab === 'reports' && (
        <>
          {reports?.length === 0 && <p className="empty">{t('admin.no_reports')}</p>}
          {reports?.map((r) => (
            <div key={r.id} className="box">
              <b>{r.listings?.title || r.professional_profiles?.business_name || t('admin.deleted_item')}</b>
              <p className="small">{r.reason}</p>
              <div className="mine-actions">
                <button className="mini danger" onClick={() => hide(r)}>{t('admin.hide_item')}</button>
                <button className="mini" onClick={() => resolve(r, 'dismissed')}>{t('admin.dismiss')}</button>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === 'sponsored' && (
        <>
          <p className="muted small">{t('admin.sponsor_help')}</p>
          {sponsored.length === 0 && <p className="empty">{t('admin.no_sponsored')}</p>}
          {sponsored.map((l) => (
            <div key={l.id} className="box">
              <b>{l.title}</b>
              <div className="muted small">{t('admin.sponsored_until', { date: fmtDate(l.sponsored_until) })}</div>
              <div className="mine-actions">
                <Link className="mini" to={`/listing/${l.id}`}>{t('mine.view')}</Link>
                <button className="mini danger" onClick={() => unsponsor(l)}>{t('admin.sponsor_remove')}</button>
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );
}
