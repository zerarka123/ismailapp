import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { arabicError } from '../errors';
import { PHONE_RE, cleanPhone } from '../lib/format';
import { removeFiles } from '../lib/images';
import Icon from '../components/Icon.jsx';
import NeedLogin from '../components/NeedLogin.jsx';

export default function Account() {
  const { user, profile, refreshProfile, signOut } = useAuth();
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
    supabase.from('wilayas').select('id, name_ar').order('id').then(({ data }) => setWilayas(data || []));
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
        <div className="topbar"><h2>حسابي</h2></div>
        <NeedLogin text="سجّل الدخول لإدارة حسابك وإعلاناتك." />
        <div className="menu">
          <Link to="/privacy"><Icon name="shield" />سياسة الخصوصية</Link>
          <Link to="/terms"><Icon name="doc" />شروط الاستخدام</Link>
        </div>
      </>
    );
  }

  async function save(e) {
    e.preventDefault();
    setMsg(null);
    const p = cleanPhone(phone);
    if (name.trim().length < 2) return setMsg({ type: 'err', text: 'اكتب اسمك (حرفان على الأقل).' });
    if (p && !PHONE_RE.test(p)) return setMsg({ type: 'err', text: 'رقم الهاتف غير صالح (أرقام فقط، 8 إلى 15 رقمًا).' });
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ full_name: name.trim(), phone: p || null, wilaya_id: wilaya ? Number(wilaya) : null }).eq('id', user.id);
    setBusy(false);
    if (error) return setMsg({ type: 'err', text: arabicError(error) });
    await refreshProfile();
    setMsg({ type: 'ok', text: 'تم حفظ بياناتك.' });
  }

  async function deleteAccount() {
    setBusy(true);
    // remove the user's stored images first (they would otherwise stay on the server)
    const a = await supabase.from('listing_images').select('storage_path, listings!inner(seller_id)').eq('listings.seller_id', user.id);
    const b = await supabase.from('professional_images').select('storage_path, professional_profiles!inner(owner_id)').eq('professional_profiles.owner_id', user.id);
    await removeFiles('listing-images', (a.data || []).map((r) => r.storage_path));
    await removeFiles('pro-images', (b.data || []).map((r) => r.storage_path));
    const { error } = await supabase.rpc('delete_my_account');
    if (error) {
      setBusy(false);
      return setMsg({ type: 'err', text: arabicError(error) });
    }
    await signOut();
    nav('/', { replace: true });
  }

  const proLabel = { pending: 'قيد المراجعة', active: 'مفعّل', suspended: 'موقوف' };

  return (
    <>
      <div className="topbar"><h2>حسابي</h2></div>
      <p className="muted" dir="ltr" style={{ textAlign: 'start' }}>{user.email}</p>

      <div className="menu">
        <Link to="/my-listings"><Icon name="list" />إعلاناتي</Link>
        <Link to="/favorites"><Icon name="star" />المفضلة</Link>
        {pro ? (
          <Link to={pro.status === 'active' ? `/pro/${pro.id}` : '/register-business'}><Icon name="store" />نشاطي: {pro.business_name} <span className={`pill ${pro.status === 'active' ? 'ok' : 'warn'}`}>{proLabel[pro.status]}</span></Link>
        ) : (
          <Link to="/register-business"><Icon name="store" />سجّل نشاطك في الدليل</Link>
        )}
        {profile?.is_admin && <Link to="/admin"><Icon name="shield" />لوحة الإدارة</Link>}
      </div>

      <div className="section-title">بياناتي</div>
      <form onSubmit={save} noValidate>
        <div className="field"><label>الاسم</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
        <div className="field"><label>رقم الهاتف</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" inputMode="tel" placeholder="05XXXXXXXX" /></div>
        <div className="field"><label>الولاية</label>
          <select className="input" value={wilaya} onChange={(e) => setWilaya(e.target.value)}>
            <option value="">اختر الولاية</option>
            {wilayas.map((w) => <option key={w.id} value={w.id}>{w.id} - {w.name_ar}</option>)}
          </select>
        </div>
        {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
        <button className="btn" disabled={busy}>{busy ? 'لحظة…' : 'حفظ'}</button>
      </form>

      <div className="menu">
        <Link to="/privacy"><Icon name="shield" />سياسة الخصوصية</Link>
        <Link to="/terms"><Icon name="doc" />شروط الاستخدام</Link>
        <button onClick={signOut}><Icon name="logout" />تسجيل الخروج</button>
      </div>

      <div style={{ marginTop: 22 }}>
        {!showDelete ? (
          <button className="linkbtn" style={{ color: 'var(--danger)' }} onClick={() => setShowDelete(true)}>حذف حسابي نهائيًا</button>
        ) : (
          <div className="box">
            <p className="small">سيُحذف حسابك وكل إعلاناتك وصورك وبياناتك ولا يمكن التراجع. اكتب كلمة «حذف» للتأكيد.</p>
            <input className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="حذف" />
            <button className="btn danger" style={{ marginTop: 10 }} disabled={busy || confirmText.trim() !== 'حذف'} onClick={deleteAccount}>تأكيد الحذف</button>
          </div>
        )}
      </div>
    </>
  );
}
