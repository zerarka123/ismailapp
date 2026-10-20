import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { arabicError } from '../errors';
import { MAX_IMAGES, SUPPORT_EMAIL } from '../config';
import { PHONE_RE, cleanPhone } from '../lib/format';
import { removeFiles, uploadImages } from '../lib/images';
import { getPosition } from '../lib/geo';
import ImagePicker from '../components/ImagePicker.jsx';
import NeedLogin from '../components/NeedLogin.jsx';
import Icon from '../components/Icon.jsx';

const TYPES = { fisherman: 'صياد', craftsman: 'حرفي / ورشة', supplier: 'مورد', shop_owner: 'صاحب محل', mechanic: 'ميكانيكي' };
const CATS = { fisherman: ['fishing_trips', 'jobs'], craftsman: ['shipyards'], supplier: ['parts_suppliers'], shop_owner: ['gear_shops', 'parts_suppliers'], mechanic: ['naval_mechanics', 'naval_electrics'] };
const STATUS = {
  pending: ['تم استلام طلبك وهو قيد المراجعة.', 'سيظهر نشاطك في الدليل بعد موافقة الإدارة. للاستفسار راسلنا على'],
  active: ['نشاطك مفعّل ويظهر في الدليل.', ''],
  suspended: ['تم إيقاف نشاطك من قبل الإدارة.', 'للاستفسار راسلنا على'],
};

export default function ProRegister() {
  const { user, profile } = useAuth();
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
    supabase.from('guide_categories').select('id, slug, name_ar').order('sort_order').then(({ data }) => {
      setCats(data || []);
      const slug = params.get('cat');
      const t = Object.keys(CATS).find((k) => CATS[k].includes(slug));
      const c = (data || []).find((x) => x.slug === slug);
      if (t && c) setF((p) => ({ ...p, type: t, cat: String(c.id) }));
    });
    supabase.from('wilayas').select('id, name_ar').order('id').then(({ data }) => setWilayas(data || []));
  }, []);
  useEffect(() => {
    if (profile) setF((p) => ({ ...p, phone: p.phone || profile.phone || '', wilayaId: p.wilayaId || (profile.wilaya_id ? String(profile.wilaya_id) : '') }));
  }, [profile?.id]);
  useEffect(() => {
    if (!user) return;
    supabase.from('professional_profiles').select('id, business_name, status').eq('owner_id', user.id).maybeSingle().then(({ data }) => setExisting(data ?? null));
  }, [user?.id]);

  if (!user) return <NeedLogin text="سجّل الدخول لتسجّل نشاطك في الدليل." />;
  if (existing === undefined) return <p className="muted center">جارٍ التحميل…</p>;

  if (existing) {
    const [title, hint] = STATUS[existing.status];
    return (
      <>
        <div className="topbar"><h2>نشاطي</h2></div>
        <div className="box">
          <h3 style={{ margin: 0 }}>{existing.business_name}</h3>
          <p className="msg info" style={{ marginTop: 12 }}>{title} {hint && <b dir="ltr">{SUPPORT_EMAIL}</b>}</p>
          {existing.status === 'active' && <Link className="btn" to={`/pro/${existing.id}`}>عرض صفحة نشاطي</Link>}
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
      setMsg({ type: 'err', text: arabicError({ message: 'location_denied' }) });
    }
  }

  function validate() {
    if (!f.type) return 'اختر نوع نشاطك.';
    if (!f.cat) return 'اختر التصنيف.';
    const n = f.name.trim();
    if (n.length < 2 || n.length > 100) return 'اسم النشاط بين 2 و100 حرف.';
    if (!f.wilayaId) return 'اختر الولاية.';
    if (!PHONE_RE.test(cleanPhone(f.phone))) return 'رقم الهاتف غير صالح (أرقام فقط).';
    if (f.whatsapp && !PHONE_RE.test(cleanPhone(f.whatsapp))) return 'رقم واتساب غير صالح.';
    if (images.length < 1) return 'أضف صورة واحدة على الأقل.';
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
      setMsg({ type: 'err', text: arabicError(err) });
    }
    setBusy(false);
  }

  return (
    <>
      <div className="topbar"><h2>سجّل نشاطك</h2></div>
      <p className="msg info">بعد التسجيل يراجع فريقنا ملفك، ثم يظهر نشاطك في الدليل بعد الموافقة.</p>
      <form onSubmit={submit} noValidate>
        <div className="field"><label>نوع النشاط</label>
          <select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value, cat: '' })}>
            <option value="">اختر</option>
            {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field"><label>التصنيف في الدليل</label>
          <select className="input" value={f.cat} onChange={set('cat')} disabled={!f.type}>
            <option value="">اختر</option>
            {allowed.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
          </select>
        </div>
        <div className="field"><label>اسم النشاط</label><input className="input" value={f.name} onChange={set('name')} maxLength={100} /></div>
        <div className="row2">
          <div className="field"><label>الولاية</label>
            <select className="input" value={f.wilayaId} onChange={set('wilayaId')}>
              <option value="">اختر</option>
              {wilayas.map((w) => <option key={w.id} value={w.id}>{w.name_ar}</option>)}
            </select>
          </div>
          <div className="field"><label>العنوان</label><input className="input" value={f.address} onChange={set('address')} maxLength={200} /></div>
        </div>
        <button type="button" className="btn alt" onClick={locate} style={{ marginBottom: 14 }}><Icon name="pin" />{geo ? 'تم تحديد موقعك ✓ (اضغط للتحديث)' : 'حدّد موقع نشاطك (اختياري)'}</button>
        <div className="field"><label>وصف النشاط</label><textarea className="input" value={f.description} onChange={set('description')} maxLength={3000} /></div>
        <div className="section-title">الصور</div>
        <ImagePicker images={images} setImages={setImages} max={MAX_IMAGES} />
        <div className="section-title">وسائل التواصل</div>
        <p className="muted small">تظهر للمستخدمين المسجّلين فقط.</p>
        <div className="row2">
          <div className="field"><label>الهاتف</label><input className="input" dir="ltr" inputMode="tel" value={f.phone} onChange={set('phone')} /></div>
          <div className="field"><label>واتساب</label><input className="input" dir="ltr" inputMode="tel" value={f.whatsapp} onChange={set('whatsapp')} /></div>
        </div>
        {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
        <button className="btn sand" disabled={busy}>{busy ? 'جارٍ الإرسال…' : 'إرسال الطلب'}</button>
      </form>
    </>
  );
}
