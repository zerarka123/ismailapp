import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { wilayaName } from '../i18n/names.js';
import { errorText } from '../errors';
import { PHONE_RE, cleanPhone, isMissingSchema } from '../lib/format';
import { getPosition } from '../lib/geo';
import { publicUrl, removeFiles, uploadImages } from '../lib/images';
import AvatarPicker from '../components/AvatarPicker.jsx';
import NeedLogin from '../components/NeedLogin.jsx';
import Icon from '../components/Icon.jsx';
import { getWilayas } from '../lib/refData';

// The owner edits his own business account (type and branch are changed by the administration only).
export default function EditBusiness() {
  const { user } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [pro, setPro] = useState(undefined);
  const [f, setF] = useState(null);
  const [wilayas, setWilayas] = useState([]);
  const [geo, setGeo] = useState(null);
  const [photo, setPhoto] = useState(null); // a new account photo { blob, url }, saved with the form
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    getWilayas().then(setWilayas);
  }, []);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const { data: row } = await supabase
        .from('professional_profiles')
        .select('id, business_name, description, wilaya_id, address, latitude, longitude, professional_images(id, storage_path, sort_order)')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (!alive) return;
      if (!row) return setPro(null);
      const c = await supabase.from('professional_contacts').select('phone, whatsapp').eq('professional_id', row.id).maybeSingle();
      if (!alive) return;
      setPro(row);
      setF({
        name: row.business_name || '',
        description: row.description || '',
        wilayaId: row.wilaya_id != null ? String(row.wilaya_id) : '',
        address: row.address || '',
        phone: c.data?.phone || '',
        whatsapp: c.data?.whatsapp || '',
      });
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  if (!user) return <NeedLogin text={t('reg.login')} />;
  if (pro === undefined) return <p className="muted center">{t('common.loading')}</p>;
  if (pro === null) return <Navigate to="/register-business" replace />;
  const firstImage = [...(pro.professional_images || [])].sort((a, b) => a.sort_order - b.sort_order)[0];
  const currentPhoto = firstImage ? publicUrl('pro-images', firstImage.storage_path) : null;

  async function locate() {
    setMsg(null);
    try {
      setGeo(await getPosition());
    } catch {
      setMsg({ type: 'err', text: errorText({ message: 'location_denied' }) });
    }
  }

  async function save(e) {
    e.preventDefault();
    setMsg(null);
    const n = f.name.trim();
    if (n.length < 2 || n.length > 100) return setMsg({ type: 'err', text: t('reg.v_name') });
    if (!f.wilayaId) return setMsg({ type: 'err', text: t('v.wilaya') });
    if (f.phone && !PHONE_RE.test(cleanPhone(f.phone))) return setMsg({ type: 'err', text: t('v.phone') });
    if (f.whatsapp && !PHONE_RE.test(cleanPhone(f.whatsapp))) return setMsg({ type: 'err', text: t('v.whatsapp') });
    setBusy(true);
    // the account photo: upload the new one, put it in place of the old one, then delete the old file
    if (photo) {
      const uploaded = [];
      try {
        await uploadImages('pro-images', `${user.id}/${pro.id}`, [photo.blob], uploaded);
        const old = [...(pro.professional_images || [])].sort((a, b) => a.sort_order - b.sort_order)[0];
        const { error: pe } = old
          ? await supabase.from('professional_images').update({ storage_path: uploaded[0] }).eq('id', old.id)
          : await supabase.from('professional_images').insert({ professional_id: pro.id, storage_path: uploaded[0], sort_order: 0 });
        if (pe) throw pe;
        if (old) await removeFiles('pro-images', [old.storage_path]);
      } catch (err) {
        if (uploaded.length) await removeFiles('pro-images', uploaded);
        setBusy(false);
        return setMsg({ type: 'err', text: errorText(err) });
      }
    }
    const { error } = await supabase.rpc('update_my_professional', {
      p_business_name: n,
      p_description: f.description.trim().slice(0, 3000),
      p_wilaya_id: Number(f.wilayaId),
      p_address: f.address.trim(),
      p_latitude: geo?.lat ?? null,
      p_longitude: geo?.lng ?? null,
      p_phone: f.phone ? cleanPhone(f.phone) : null,
      p_whatsapp: f.whatsapp ? cleanPhone(f.whatsapp) : null,
    });
    setBusy(false);
    if (error) return setMsg({ type: 'err', text: isMissingSchema(error) ? t('edit.unavailable') : errorText(error) });
    nav(`/pro/${pro.id}`, { replace: true });
  }

  return (
    <>
      <div className="topbar"><h2>{t('edit.business_title')}</h2></div>
      <p className="msg info">{t('edit.business_note')} <Link to="/support" className="linkbtn">{t('support.title')}</Link></p>
      <form onSubmit={save} noValidate>
        <AvatarPicker value={photo} onChange={setPhoto} currentUrl={currentPhoto} />
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
        <div className="section-title">{t('field.contacts')}</div>
        <div className="row2">
          <div className="field"><label>{t('field.phone')}</label><input className="input" dir="ltr" inputMode="tel" value={f.phone} onChange={set('phone')} /></div>
          <div className="field"><label>{t('contact.whatsapp')}</label><input className="input" dir="ltr" inputMode="tel" value={f.whatsapp} onChange={set('whatsapp')} /></div>
        </div>
        {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
        <button className="btn sand" disabled={busy}>{busy ? t('common.wait') : t('edit.save')}</button>
        <Link to={`/pro/${pro.id}`} className="btn alt" style={{ marginTop: 10 }}>{t('common.back')}</Link>
      </form>
    </>
  );
}
