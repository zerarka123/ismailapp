import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { categoryName, wilayaName } from '../i18n/names.js';
import { errorText } from '../errors';
import { MAX_IMAGES } from '../config';
import { BRANCHES_BY_KIND as CATS, PRO_KINDS, proKindLabel } from '../lib/accountTypes';
import SupportLinks from '../components/SupportLinks.jsx';
import { PHONE_RE, cleanPhone } from '../lib/format';
import { removeFiles, uploadImages } from '../lib/images';
import { getPosition } from '../lib/geo';
import ImagePicker from '../components/ImagePicker.jsx';
import NeedLogin from '../components/NeedLogin.jsx';
import Icon from '../components/Icon.jsx';


export default function ProRegister() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const [params] = useSearchParams();
  const [existing, setExisting] = useState(undefined);
  const [cats, setCats] = useState([]);
  const [wilayas, setWilayas] = useState([]);
  const [images, setImages] = useState([]);
  const [f, setF] = useState({ type: '', cat: '', name: '', wilayaId: '', address: '', description: '', phone: '', whatsapp: '' });
  const [geo, setGeo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    supabase.from('guide_categories').select('*').order('sort_order').then(({ data }) => {
      setCats(data || []);
      const slug = params.get('cat');
      const t = Object.keys(CATS).find((k) => CATS[k].includes(slug));
      const c = (data || []).find((x) => x.slug === slug);
      if (t && c) setF((p) => ({ ...p, type: t, cat: String(c.id) }));
    });
    supabase.from('wilayas').select('*').order('id').then(({ data }) => setWilayas(data || []));
  }, []);
  useEffect(() => {
    if (profile) setF((p) => ({ ...p, phone: p.phone || profile.phone || '', wilayaId: p.wilayaId || (profile.wilaya_id ? String(profile.wilaya_id) : '') }));
  }, [profile?.id]);
  useEffect(() => {
    if (!user) return;
    supabase.from('professional_profiles').select('id, business_name, status').eq('owner_id', user.id).maybeSingle().then(({ data }) => setExisting(data ?? null));
  }, [user?.id]);

  if (!user) return <NeedLogin text={t('reg.login')} />;
  if (existing === undefined) return <p className="muted center">{t('common.loading')}</p>;

  if (existing) {
    const st = ['pending', 'active', 'suspended'].includes(existing.status) ? existing.status : 'pending';
    return (
      <>
        <div className="topbar"><h2>{t('acc.my_business')}</h2></div>
        <div className="box">
          <h3 style={{ margin: 0 }}>{existing.business_name}</h3>
          <p className={`msg ${st === 'suspended' ? 'err' : 'info'}`} style={{ marginTop: 12 }}>
            {t(`reg.status_${st}`)} {st !== 'active' && t(`reg.hint_${st}`)}
          </p>
          {/* Contact options for "waiting for activation" / "suspended": real mailto + support page links */}
          {st !== 'active' && <SupportLinks subject={t('support.subject_activation', { name: existing.business_name })} />}
          {st === 'active' && (
            <div className="row2">
              <Link className="btn" to={`/pro/${existing.id}`}>{t('reg.view_page')}</Link>
              <Link className="btn alt" to="/portfolio">{t('pf.title')}</Link>
            </div>
          )}
        </div>
      </>
    );
  }

  const allowed = f.type ? cats.filter((c) => CATS[f.type].includes(c.slug)) : [];

  async function locate() {
    setMsg(null);
    try {
      setGeo(await getPosition());
    } catch {
      setMsg({ type: 'err', text: errorText({ message: 'location_denied' }) });
    }
  }

  function validate() {
    if (!f.type) return t('reg.v_type');
    if (!f.cat) return t('reg.v_cat');
    const n = f.name.trim();
    if (n.length < 2 || n.length > 100) return t('reg.v_name');
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
    let proId = null;
    try {
      const { data: row, error } = await supabase
        .from('professional_profiles')
        .insert({
          owner_id: user.id,
          pro_type: f.type,
          category_id: Number(f.cat),
          business_name: f.name.trim(),
          description: f.description.trim().slice(0, 3000),
          wilaya_id: Number(f.wilayaId),
          address: f.address.trim().slice(0, 200) || null,
          latitude: geo?.lat ?? null,
          longitude: geo?.lng ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;
      proId = row.id;
      await uploadImages('pro-images', `${user.id}/${proId}`, images.map((i) => i.blob), uploaded);
      const { error: e2 } = await supabase.from('professional_images').insert(uploaded.map((p, i) => ({ professional_id: proId, storage_path: p, sort_order: i })));
      if (e2) throw e2;
      const { error: e3 } = await supabase.from('professional_contacts').insert({ professional_id: proId, phone: cleanPhone(f.phone), whatsapp: f.whatsapp ? cleanPhone(f.whatsapp) : null });
      if (e3) throw e3;
      setExisting({ id: proId, business_name: f.name.trim(), status: 'pending' });
    } catch (err) {
      if (uploaded.length) await removeFiles('pro-images', uploaded);
      if (proId) await supabase.from('professional_profiles').delete().eq('id', proId);
      setMsg({ type: 'err', text: errorText(err) });
    }
    setBusy(false);
  }

  return (
    <>
      <div className="topbar"><h2>{t('guide.register')}</h2></div>
      <p className="msg info">{t('reg.intro')}</p>
      <form onSubmit={submit} noValidate>
        <div className="field"><label>{t('reg.type')}</label>
          <select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value, cat: '' })}>
            <option value="">{t('common.choose')}</option>
            {PRO_KINDS.map((k) => <option key={k} value={k}>{proKindLabel(k)}</option>)}
          </select>
        </div>
        <div className="field"><label>{t('reg.cat')}</label>
          <select className="input" value={f.cat} onChange={set('cat')} disabled={!f.type}>
            <option value="">{t('common.choose')}</option>
            {allowed.map((c) => <option key={c.id} value={c.id}>{categoryName(c)}</option>)}
          </select>
        </div>
        <div className="field"><label>{t('reg.name')}</label><input className="input" value={f.name} onChange={set('name')} maxLength={100} /></div>
        <div className="row2">
          <div className="field"><label>{t('field.wilaya')}</label>
            <select className="input" value={f.wilayaId} onChange={set('wilayaId')}>
              <option value="">{t('common.choose')}</option>
              {wilayas.map((w) => <option key={w.id} value={w.id}>{wilayaName(w)}</option>)}
            </select>
          </div>
          <div className="field"><label>{t('field.port_address')}</label><input className="input" value={f.address} onChange={set('address')} maxLength={200} placeholder={t('reg.address_hint')} /></div>
        </div>
        <button type="button" className="btn alt" onClick={locate} style={{ marginBottom: 14 }}><Icon name="pin" />{geo ? t('reg.located') : t('reg.locate')}</button>
        <div className="field"><label>{t('reg.description')}</label><textarea className="input" value={f.description} onChange={set('description')} maxLength={3000} /></div>
        <div className="section-title">{t('sell.photos')}</div>
        <ImagePicker images={images} setImages={setImages} max={MAX_IMAGES} />
        <div className="section-title">{t('field.contacts')}</div>
        <p className="muted small">{t('reg.contacts_note')}</p>
        <div className="row2">
          <div className="field"><label>{t('field.phone')}</label><input className="input" dir="ltr" inputMode="tel" value={f.phone} onChange={set('phone')} /></div>
          <div className="field"><label>{t('contact.whatsapp')}</label><input className="input" dir="ltr" inputMode="tel" value={f.whatsapp} onChange={set('whatsapp')} /></div>
        </div>
        {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
        <button className="btn sand" disabled={busy}>{busy ? t('reg.sending') : t('reg.submit')}</button>
      </form>
    </>
  );
}
