import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { wilayaName } from '../i18n/names.js';
import { errorText } from '../errors';
import { PHONE_RE, cleanPhone } from '../lib/format';
import { safetyKey } from '../lib/safety';
import NeedLogin from '../components/NeedLogin.jsx';

// Suggestions only (prof.<key> in messages.js); the user can type any profession
const PROFESSIONS = ['marine_mechanic', 'fisherman', 'sailor', 'skipper', 'shipwright', 'marine_electrician', 'welder', 'diver', 'craftsman', 'deckhand'];

const input = {
  width: '100%', padding: 12, marginTop: 6, marginBottom: 14,
  border: '1px solid #cbd5e1', borderRadius: 12, fontSize: 15,
  fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff',
};
const label = { fontWeight: 'bold', fontSize: 14 };
const errBox = {
  background: '#fee2e2', color: '#991b1b', padding: 12,
  borderRadius: 12, marginBottom: 14,
};

export default function PostJob({ kind }) {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const isRequest = kind === 'job_request';

  const [wilayas, setWilayas] = useState([]);
  const [quota, setQuota] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [f, setF] = useState({
    title: '', profession: '', description: '',
    wilayaId: '', place: '', salary: '', phone: '',
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    supabase.from('wilayas').select('*').order('id')
      .then(({ data }) => setWilayas(data || []));
  }, []);

  useEffect(() => {
    if (profile) {
      setF((p) => ({
        ...p,
        phone: p.phone || profile.phone || '',
        wilayaId: p.wilayaId || (profile.wilaya_id ? String(profile.wilaya_id) : ''),
      }));
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('app_settings').select('value').eq('key', 'free_listing_limit').maybeSingle(),
      supabase.from('listings').select('id', { count: 'exact', head: true })
        .eq('seller_id', user.id).eq('status', 'published'),
    ]).then(([s, c]) => setQuota({ limit: s.data?.value ?? 2, used: c.count ?? 0 }));
  }, [user?.id]);

  if (!user) return <NeedLogin text={t('sell.login')} />;

  const full = quota && quota.used >= quota.limit;

  function validate() {
    const tt = f.title.trim();
    if (tt.length < 5 || tt.length > 120) return t('sell.v_title');
    if (isRequest && !f.profession.trim()) return t('job.v_profession');
    if (f.profession.trim().length > 80) return t('job.v_profession_long');
    if (f.salary && (!/^\d{1,12}$/.test(f.salary) || Number(f.salary) <= 0))
      return t('job.v_salary');
    if (!f.wilayaId) return t('v.wilaya');
    if (!PHONE_RE.test(cleanPhone(f.phone))) return t('v.phone');
    return null;
  }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    const problem = validate();
    if (problem) return setMsg(problem);
    setBusy(true);
    let listingId = null;
    try {
      const name = profile?.full_name?.trim();
      const sellerName = name && name.length >= 2
        ? name.slice(0, 80)
        : t(isRequest ? 'job.default_seeker' : 'job.default_employer');

      const { data: row, error } = await supabase
        .from('listings')
        .insert({
          seller_id: user.id,
          seller_name: sellerName,
          kind,
          title: f.title.trim(),
          profession: isRequest ? f.profession.trim() : null,
          description: f.description.trim().slice(0, 4000),
          price_dzd: f.salary ? Number(f.salary) : null,
          wilaya_id: Number(f.wilayaId),
          place_text: f.place.trim().slice(0, 150) || null,
        })
        .select('id')
        .single();
      if (error) throw error;
      listingId = row.id;

      const { error: e2 } = await supabase
        .from('listing_contacts')
        .insert({ listing_id: listingId, phone: cleanPhone(f.phone) });
      if (e2) throw e2;

      nav('/my-listings', { replace: true });
    } catch (err) {
          if (listingId) await supabase.from('listings').delete().eq('id', listingId);
      setMsg(errorText(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>{t(isRequest ? 'job.add_request' : 'job.add_offer')}</h2>

      {full && (
        <div style={errBox}>
          {t('sell.quota', { used: quota.used, limit: quota.limit })} {t('sell.quota_full')}
        </div>
      )}

      <label style={label}>{t('sell.ad_title')}</label>
      <input style={input} value={f.title} onChange={set('title')}
        placeholder={t(isRequest ? 'job.hint_request' : 'job.hint_offer')} />

      {isRequest && (
        <>
          <label style={label}>{t('spec.profession')}</label>
          <input style={input} list="professions" value={f.profession}
            onChange={set('profession')} placeholder={t('job.profession_hint')} />
          <datalist id="professions">
            {PROFESSIONS.map((p) => <option key={p} value={t(`prof.${p}`)} />)}
          </datalist>
        </>
      )}

      <label style={label}>{t('field.description')}</label>
      <textarea style={{ ...input, minHeight: 110 }} value={f.description}
        onChange={set('description')}
        placeholder={t(isRequest ? 'job.desc_request' : 'job.desc_offer')} />

      <label style={label}>{t('field.wilaya')}</label>
      <select style={input} value={f.wilayaId} onChange={set('wilayaId')}>
        <option value="">{t('v.wilaya')}</option>
        {wilayas.map((w) => <option key={w.id} value={w.id}>{wilayaName(w)}</option>)}
      </select>

      <label style={label}>{t('job.place')}</label>
      <input style={input} value={f.place} onChange={set('place')} />

      <label style={label}>{t('job.salary')}</label>
      <input style={input} inputMode="numeric" value={f.salary} onChange={set('salary')} />

      <label style={label}>{t('field.phone')}</label>
      <input style={input} inputMode="tel" dir="ltr" value={f.phone} onChange={set('phone')} />

      <div className="safety" style={{ marginBottom: 14 }}><b>{t('safety.title')}</b> {t(safetyKey(kind))}</div>

      {msg && <div style={errBox}>{msg}</div>}

      <button type="submit" disabled={busy || full}
        style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14,
          background: '#0b4f7c', color: '#fff', fontSize: 16, fontWeight: 'bold',
          fontFamily: 'inherit', opacity: busy || full ? 0.5 : 1 }}>
        {busy ? t('job.publishing') : t('sell.publish')}
      </button>
    </form>
  );
}
