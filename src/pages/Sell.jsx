import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { boatTypeName, wilayaName } from '../i18n/names.js';
import { errorText } from '../errors';
import { MAX_IMAGES } from '../config';
import { PHONE_RE, cleanPhone, isMissingSchema } from '../lib/format';
import { removeFiles, uploadImages } from '../lib/images';
import { hasActivePro } from '../lib/accountTypes';
import { marsaError } from '../lib/marsaErrors';
import { GEAR_TYPES, safetyKey } from '../lib/safety';
import ImagePicker from '../components/ImagePicker.jsx';
import NeedLogin from '../components/NeedLogin.jsx';

const YEAR = new Date().getFullYear();
const INIT = { kind: 'boat', gearType: 'spare_part', typeId: '', title: '', price: '', condition: '', length: '', year: '', engine: '', wilayaId: '', place: '', description: '', phone: '', whatsapp: '' };

// equipment = fishing & navigation equipment anyone can sell on the market (migration 003)
const KINDS = ['boat', 'engine', 'equipment'];
const titleHint = (f) => (f.kind === 'gear' ? `sell.hint_gear_${f.gearType}` : `sell.hint_${f.kind}`);

export default function Sell() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [f, setF] = useState(() => ({ ...INIT, kind: [...KINDS, 'gear'].includes(params.get('kind')) ? params.get('kind') : 'boat', gearType: GEAR_TYPES.includes(params.get('gear')) ? params.get('gear') : INIT.gearType }));
  const [images, setImages] = useState([]);
  const [types, setTypes] = useState([]);
  const [wilayas, setWilayas] = useState([]);
  const [quota, setQuota] = useState(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('');
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    supabase.from('boat_types').select('*').order('sort_order').then(({ data }) => setTypes(data || []));
    supabase.from('wilayas').select('*').order('id').then(({ data }) => setWilayas(data || []));
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
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', user.id).eq('status', 'published').gt('expires_at', new Date().toISOString()),
    ]).then(([s, c]) => setQuota({ limit: s.data?.value ?? 2, used: c.count ?? 0 }));
  }, [user?.id]);

  if (!user) return <NeedLogin text={t('sell.login')} />;

  // Owner account + active professional accounts: no free limit, and can post products & services
  const isOwner = user?.email?.toLowerCase() === 'alizerrarka@gmail.com';
  const isPro = hasActivePro(profile) || isOwner;
  const effectiveQuota = isOwner ? { limit: 9999, used: 0 } : (quota || { limit: 0, used: 0 });
  const full = !isPro && effectiveQuota.used >= effectiveQuota.limit;
  const kind = f.kind === 'gear' && !isPro ? 'boat' : f.kind;
  const isGear = kind === 'gear';
  const hasYear = kind === 'boat' || kind === 'engine';

  function validate() {
    if (kind === 'boat' && !f.typeId) return t('sell.v_type');
    const tt = f.title.trim();
    if (tt.length < 5 || tt.length > 120) return t('sell.v_title');
    if (f.price && (!/^\d{1,12}$/.test(f.price) || Number(f.price) <= 0)) return t('sell.v_price');
    if (kind === 'boat' && f.length) {
      const n = Number(f.length.replace(',', '.'));
      if (!(n >= 1 && n <= 400)) return t('sell.v_length');
    }
    if (hasYear && f.year) {
      const y = Number(f.year);
      if (!Number.isInteger(y) || y < 1900 || y > YEAR + 1) return t('sell.v_year');
    }
    if (!f.wilayaId) return t('v.wilaya');
    if (!PHONE_RE.test(cleanPhone(f.phone))) return t('v.phone');
    if (f.whatsapp && !PHONE_RE.test(cleanPhone(f.whatsapp))) return t('v.whatsapp');
    if (images.length < 1) return t('v.one_image');
    return null;
  }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    const problem = validate();
    if (problem) return setMsg({ type: 'err', text: problem });
    setBusy(true);
    const uploaded = [];
    let listingId = null;
    try {
      setStep(t('sell.step_post'));
      const sellerName = profile?.full_name?.trim().length >= 2 ? profile.full_name.trim().slice(0, 80) : t('sell.default_seller');
      const fields = {
        seller_id: user.id,
        seller_name: sellerName,
        kind,
        boat_type_id: kind === 'boat' ? Number(f.typeId) : null,
        title: f.title.trim(),
        description: f.description.trim().slice(0, 4000),
        price_dzd: f.price ? Number(f.price) : null,
        length_m: kind === 'boat' && f.length ? Number(f.length.replace(',', '.')) : null,
        year_built: hasYear && f.year ? Number(f.year) : null,
        engine_info: hasYear ? f.engine.trim().slice(0, 200) : null,
        wilaya_id: Number(f.wilayaId),
        place_text: f.place.trim().slice(0, 150) || null,
        condition: f.condition || null,
      };
      const insert = (row) => supabase.from('listings').insert(row).select('id').single();
      let { data: row, error } = await insert(isGear ? { ...fields, gear_type: f.gearType } : fields);
      // Database without migration 003: publish the product without its sub-type
      if (error && isGear && isMissingSchema(error)) ({ data: row, error } = await insert(fields));
      if (error) throw error;
      listingId = row.id;

      setStep(t('sell.step_images'));
      await uploadImages('listing-images', `${user.id}/${listingId}`, images.map((i) => i.blob), uploaded);
      const { error: e2 } = await supabase.from('listing_images').insert(uploaded.map((p, i) => ({ listing_id: listingId, storage_path: p, sort_order: i })));
      if (e2) throw e2;
      const { error: e3 } = await supabase.from('listing_contacts').insert({ listing_id: listingId, phone: cleanPhone(f.phone), whatsapp: f.whatsapp ? cleanPhone(f.whatsapp) : null });
      if (e3) throw e3;
      nav(`/listing/${listingId}`, { replace: true });
    } catch (err) {
      // undo everything so no half-published listing remains
      if (uploaded.length) await removeFiles('listing-images', uploaded);
      if (listingId) await supabase.from('listings').delete().eq('id', listingId);
      const raw = err?.message || '';
      const known = raw.includes('gear_pro_only')
        ? t('sell.gear_pro_only')
        : kind === 'equipment' && (err?.code === '23514' || err?.code === '22P02')
          ? t('admin.needs_migration')
          : marsaError(err, '');
      setMsg({ type: 'err', text: known || errorText(err) });
      setBusy(false);
      setStep('');
    }
  }

  const tipKey = safetyKey(kind, f.gearType);

  return (
    <>
      <div className="topbar"><h2>{t('sell.title')}</h2></div>
      {quota && !isPro && <p className={`msg ${full ? 'err' : 'info'}`}>{t('sell.quota', { used: quota.used, limit: quota.limit })}{full && ` ${t('sell.quota_full')}`} <Link to="/my-listings" className="linkbtn">{t('sell.manage')}</Link></p>}

      <form onSubmit={submit} noValidate>
        <div className="seg seg3">
          {KINDS.map((k) => (
            <button key={k} type="button" className={`btn ${kind === k ? '' : 'alt'} sm`} onClick={() => setF({ ...f, kind: k })}>{t(`sell.kind_${k}`)}</button>
          ))}
        </div>
        {isPro && (
          <button type="button" className={`btn ${isGear ? '' : 'alt'} sm`} style={{ width: '100%', marginBottom: 14 }} onClick={() => setF({ ...f, kind: 'gear' })}>{t('sell.kind_gear')}</button>
        )}

        {isGear && (
          <>
            <div className="field"><label>{t('sell.gear_type')}</label>
              <div className="seg seg3">
                {GEAR_TYPES.map((g) => (
                  <button key={g} type="button" className={`btn ${f.gearType === g ? '' : 'alt'} sm`} onClick={() => setF({ ...f, gearType: g })}>{t(`gear.${g}`)}</button>
                ))}
              </div>
            </div>
            <p className="msg info">{t('sell.gear_branch_note')}</p>
          </>
        )}

        {/* Safety advice that matches what is being published */}
        <div className="safety" style={{ marginTop: 0, marginBottom: 6 }} aria-live="polite">
          <b>{t('safety.title')}</b> {t(tipKey)}
        </div>

        <div className="section-title">{t('sell.photos')}</div>
        <ImagePicker images={images} setImages={setImages} max={MAX_IMAGES} />

        <div className="section-title">{t('sell.details')}</div>
        {kind === 'boat' && (
          <div className="field"><label>{t('sell.boat_type')}</label>
            <select className="input" value={f.typeId} onChange={set('typeId')}>
              <option value="">{t('sell.choose_type')}</option>
              {types.map((tp) => <option key={tp.id} value={tp.id}>{boatTypeName(tp)}</option>)}
            </select>
          </div>
        )}
        <div className="field"><label>{isGear ? t('sell.gear_name') : t('sell.ad_title')}</label><input className="input" value={f.title} onChange={set('title')} maxLength={120} placeholder={t(titleHint({ ...f, kind }))} /></div>
        <div className="row2">
          <div className="field"><label>{t('sell.price')}</label><input className="input" inputMode="numeric" value={f.price} onChange={set('price')} maxLength={12} placeholder={t('sell.price_hint')} /></div>
          <div className="field"><label>{t('spec.condition')}</label>
            <select className="input" value={f.condition} onChange={set('condition')}>
              <option value="">{t('cond.unset')}</option><option value="new">{t('cond.new')}</option><option value="used">{t('cond.used')}</option>
            </select>
          </div>
        </div>
        {hasYear && (
          <div className="row2">
            {kind === 'boat' && <div className="field"><label>{t('sell.length')}</label><input className="input" inputMode="decimal" value={f.length} onChange={set('length')} maxLength={6} /></div>}
            <div className="field"><label>{t('spec.year')}</label><input className="input" inputMode="numeric" value={f.year} onChange={set('year')} maxLength={4} /></div>
          </div>
        )}
        {hasYear && (
          <div className="field"><label>{t('spec.engine')}</label><input className="input" value={f.engine} onChange={set('engine')} maxLength={200} placeholder={t('sell.engine_hint')} /></div>
        )}
        <div className="row2">
          <div className="field"><label>{t('field.wilaya')}</label>
            <select className="input" value={f.wilayaId} onChange={set('wilayaId')}>
              <option value="">{t('common.choose')}</option>
              {wilayas.map((w) => <option key={w.id} value={w.id}>{wilayaName(w)}</option>)}
            </select>
          </div>
          <div className="field"><label>{t('sell.place')}</label><input className="input" value={f.place} onChange={set('place')} maxLength={150} /></div>
        </div>
        <div className="field"><label>{t('field.description')}</label><textarea className="input" value={f.description} onChange={set('description')} maxLength={4000} /></div>

        <div className="section-title">{t('field.contacts')}</div>
        <p className="muted small">{t('sell.contacts_note')}</p>
        <div className="row2">
          <div className="field"><label>{t('field.phone')}</label><input className="input" inputMode="tel" dir="ltr" value={f.phone} onChange={set('phone')} placeholder="05XXXXXXXX" /></div>
          <div className="field"><label>{t('field.whatsapp_opt')}</label><input className="input" inputMode="tel" dir="ltr" value={f.whatsapp} onChange={set('whatsapp')} placeholder="05XXXXXXXX" /></div>
        </div>

        {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
        {busy && <p className="msg info">{step}</p>}
        <button className="btn sand" disabled={busy || full}>{busy ? t('common.wait') : t('sell.publish')}</button>
        <p className="muted small center" style={{ marginTop: 10 }}>{t('sell.agree')} <Link to="/terms" className="linkbtn">{t('legal.terms')}</Link>.</p>
      </form>
    </>
  );
}
