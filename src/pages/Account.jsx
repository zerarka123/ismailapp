import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { wilayaName } from '../i18n/names.js';
import { errorText } from '../errors';
import { PHONE_RE, cleanPhone } from '../lib/format';
import { removeFiles } from '../lib/images';
import Icon from '../components/Icon.jsx';
import NeedLogin from '../components/NeedLogin.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';

export default function Account() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [wilayas, setWilayas] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [pro, setPro] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    supabase.from('wilayas').select('*').order('id').then(({ data }) => setWilayas(data || []));
  }, []);
  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name || '');
    setPhone(profile.phone || '');
    setWilaya(profile.wilaya_id ? String(profile.wilaya_id) : '');
  }, [profile]);
  useEffect(() => {
    if (!user) return;
    supabase.from('professional_profiles').select('id, business_name, status').eq('owner_id', user.id).maybeSingle().then(({ data }) => setPro(data));
  }, [user?.id]);

  if (!user) {
    return (
      <>
        <div className="topbar"><h2>{t('nav.account')}</h2></div>
        <NeedLogin text={t('acc.login')} />
        <div className="section-title"><Icon name="globe" size={18} /> {t('lang.title')}</div>
        <LanguageSwitcher variant="full" />
        <div className="menu">
          <Link to="/support"><Icon name="mail" />{t('support.title')}</Link>
          <Link to="/privacy"><Icon name="shield" />{t('legal.privacy')}</Link>
          <Link to="/terms"><Icon name="doc" />{t('legal.terms')}</Link>
        </div>
      </>
    );
  }

  async function save(e) {
    e.preventDefault();
    setMsg(null);
    const p = cleanPhone(phone);
    if (name.trim().length < 2) return setMsg({ type: 'err', text: t('v.name') });
    if (p && !PHONE_RE.test(p)) return setMsg({ type: 'err', text: t('v.phone_long') });
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ full_name: name.trim(), phone: p || null, wilaya_id: wilaya ? Number(wilaya) : null }).eq('id', user.id);
    setBusy(false);
    if (error) return setMsg({ type: 'err', text: errorText(error) });
    await refreshProfile();
    setMsg({ type: 'ok', text: t('acc.saved') });
  }

  async function deleteAccount() {
    setBusy(true);
    // remove the user's stored images first (they would otherwise stay on the server)
    const a = await supabase.from('listing_images').select('storage_path, listings!inner(seller_id)').eq('listings.seller_id', user.id);
    const b = await supabase.from('professional_images').select('storage_path, professional_profiles!inner(owner_id)').eq('professional_profiles.owner_id', user.id);
    await removeFiles('listing-images', (a.data || []).map((r) => r.storage_path));
    await removeFiles('pro-images', (b.data || []).map((r) => r.storage_path));
    // portfolio photos (migration 003); the query simply errors on older databases
    const c = await supabase.from('portfolio_photos').select('storage_path').eq('owner_id', user.id);
    await removeFiles('pro-images', (c.data || []).map((r) => r.storage_path));
    const { error } = await supabase.rpc('delete_my_account');
    if (error) {
      setBusy(false);
      return setMsg({ type: 'err', text: errorText(error) });
    }
    await signOut();
    nav('/', { replace: true });
  }


  return (
    <>
      <div className="topbar"><h2>{t('nav.account')}</h2></div>
      <p className="muted" dir="ltr" style={{ textAlign: 'start' }}>{user.email}</p>

      <div className="menu">
        <Link to="/my-listings"><Icon name="list" />{t('acc.my_listings')}</Link>
        <Link to="/favorites"><Icon name="star" />{t('nav.favorites')}</Link>
        <Link to="/notifications"><Icon name="bell" />{t('notif.title')}</Link>
        {pro ? (
          <Link to={pro.status === 'active' ? `/pro/${pro.id}` : '/register-business'}><Icon name="store" />{t('acc.business', { name: pro.business_name })} <span className={`pill ${pro.status === 'active' ? 'ok' : 'warn'}`}>{t(`pstatus.${pro.status}`)}</span></Link>
        ) : (
          <Link to="/register-business"><Icon name="store" />{t('acc.register_business')}</Link>
        )}
        {pro && <Link to="/edit-business"><Icon name="edit" />{t('edit.business_btn')}</Link>}
        {pro?.status === 'active' && <Link to="/portfolio"><Icon name="image" />{t('pf.title')}</Link>}
        {profile?.is_admin && <Link to="/admin"><Icon name="shield" />{t('admin.title')}</Link>}
      </div>

      <div className="section-title"><Icon name="globe" size={18} /> {t('lang.title')}</div>
      <LanguageSwitcher variant="full" />

      <div className="section-title">{t('acc.my_data')}</div>
      <form onSubmit={save} noValidate>
        <div className="field"><label>{t('field.name')}</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
        <div className="field"><label>{t('field.phone')}</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" inputMode="tel" placeholder="05XXXXXXXX" /></div>
        <div className="field"><label>{t('field.wilaya')}</label>
          <select className="input" value={wilaya} onChange={(e) => setWilaya(e.target.value)}>
            <option value="">{t('v.wilaya')}</option>
            {wilayas.map((w) => <option key={w.id} value={w.id}>{w.id} - {wilayaName(w)}</option>)}
          </select>
        </div>
        {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
        <button className="btn" disabled={busy}>{busy ? t('common.wait') : t('common.save')}</button>
      </form>

      <div className="menu">
        <Link to="/support"><Icon name="mail" />{t('support.title')}</Link>
        <Link to="/privacy"><Icon name="shield" />{t('legal.privacy')}</Link>
        <Link to="/terms"><Icon name="doc" />{t('legal.terms')}</Link>
        <button onClick={signOut}><Icon name="logout" />{t('acc.logout')}</button>
      </div>

      <div style={{ marginTop: 22 }}>
        {!showDelete ? (
          <button className="linkbtn" style={{ color: 'var(--danger)' }} onClick={() => setShowDelete(true)}>{t('acc.delete')}</button>
        ) : (
          <div className="box">
            <p className="small">{t('acc.delete_warn', { word: t('acc.delete_word') })}</p>
            <input className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={t('acc.delete_word')} />
            <button className="btn danger" style={{ marginTop: 10 }} disabled={busy || confirmText.trim().toLowerCase() !== t('acc.delete_word').toLowerCase()} onClick={deleteAccount}>{t('acc.delete_confirm')}</button>
          </div>
        )}
      </div>
    </>
  );
}
