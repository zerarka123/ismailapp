import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { arabicError } from '../errors';
import { MAX_IMAGES } from '../config';
import { PHONE_RE, cleanPhone } from '../lib/format';
import { removeFiles, uploadImages } from '../lib/images';
import ImagePicker from '../components/ImagePicker.jsx';
import NeedLogin from '../components/NeedLogin.jsx';

const YEAR = new Date().getFullYear();

// Professional accounts with an active subscription (workshop / supplier / shop)
const PRO_TYPES = ['workshop', 'supplier', 'shop'];
const isActivePro = (p) =>
  PRO_TYPES.includes(p?.user_type) &&
  ['active', 'trial'].includes(p?.subscription_status) &&
  (!p?.subscription_ends_at || new Date(p.subscription_ends_at) > new Date());

const KNOWN_ERRORS = {
  listing_limit_reached: 'وصلت إلى الحد الأقصى من الإعلانات النشطة.',
  rate_limit: 'نشرت إعلانات كثيرة في وقت قصير. حاول بعد قليل.',
  duplicate_listing: 'هذا الإعلان منشور عندك بالفعل. استعمل زر «رفع الإعلان للأعلى» بدل إعادة النشر.',
  gear_pro_only: 'نشر المنتجات والخدمات متاح للمحلات والموردين والورشات الذين لديهم حساب محترف فعّال.',
};
const INIT = { kind: 'boat', typeId: '', title: '', price: '', condition: '', length: '', year: '', engine: '', wilayaId: '', place: '', description: '', phone: '', whatsapp: '' };

const TITLE_HINT = {
  boat: 'مثال: قارب صيد 9 م بمحرك ياماها',
  engine: 'مثال: محرك ياماها 40 حصان',
  gear: 'مثال: مضخة مياه 12 فولت / خدمة طلاء بدن القارب',
};

export default function Sell() {
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState(INIT);
  const [images, setImages] = useState([]);
  const [types, setTypes] = useState([]);
  const [wilayas, setWilayas] = useState([]);
  const [quota, setQuota] = useState(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('');
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    supabase.from('boat_types').select('id, name_ar').order('sort_order').then(({ data }) => setTypes(data || []));
    supabase.from('wilayas').select('id, name_ar').order('id').then(({ data }) => setWilayas(data || []));
  }, []);

  useEffect(() => {
    if (profile) setF((p) => ({ ...p, phone: p.phone || profile.phone || '', wilayaId: p.wilayaId || (profile.wilaya_id ? String(profile.wilaya_id) : '') }));
  }, [profile?.id]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('app_settings').select('value').eq('key', 'free_listing_limit').maybeSingle(),
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', user.id).eq('status', 'published').gt('expires_at', new Date().toISOString()),
    ]).then(([s, c]) => setQuota({ limit: s.data?.value ?? 2, used: c.count ?? 0 }));
  }, [user?.id]);

  if (!user) return <NeedLogin text="سجّل الدخول لتنشر إعلانك." />;

  // Active professional accounts (workshop / supplier / shop): no free limit + can post products & services
  // The app owner (is_admin) and active professionals have no free limit
  const isPro = !!profile?.is_admin || isActivePro(profile);
  const full = !isPro && quota && quota.used >= quota.limit;

  function validate() {
    if (f.kind === 'boat' && !f.typeId) return 'اختر نوع القارب.';
    const t = f.title.trim();
    if (t.length < 5 || t.length > 120) return 'العنوان بين 5 و120 حرفًا.';
    if (f.price && (!/^\d{1,12}$/.test(f.price) || Number(f.price) <= 0)) return 'السعر أرقام فقط وأكبر من صفر.';
    if (f.kind === 'boat' && f.length) {
      const n = Number(f.length.replace(',', '.'));
      if (!(n >= 1 && n <= 400)) return 'الطول بين 1 و400 متر.';
    }
    if (f.kind !== 'gear' && f.year) {
      const y = Number(f.year);
      if (!Number.isInteger(y) || y < 1900 || y > YEAR + 1) return 'سنة الصنع غير صحيحة.';
    }
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
    let listingId = null;
    try {
      setStep('ننشر الإعلان…');
      const sellerName = profile?.full_name?.trim().length >= 2 ? profile.full_name.trim().slice(0, 80) : 'بائع';
      const isGear = f.kind === 'gear';
      const { data: row, error } = await supabase
        .from('listings')
        .insert({
          seller_id: user.id,
          seller_name: sellerName,
          kind: f.kind,
          boat_type_id: f.kind === 'boat' ? Number(f.typeId) : null,
          title: f.title.trim(),
          description: f.description.trim().slice(0, 4000),
          price_dzd: f.price ? Number(f.price) : null,
          length_m: f.kind === 'boat' && f.length ? Number(f.length.replace(',', '.')) : null,
          year_built: !isGear && f.year ? Number(f.year) : null,
          engine_info: !isGear ? f.engine.trim().slice(0, 200) || null : null,
          wilaya_id: Number(f.wilayaId),
          place_text: f.place.trim().slice(0, 150) || null,
          condition: f.condition || null,
        })
        .select('id')
        .single();
      if (error) throw error;
      listingId = row.id;

      setStep('نرفع الصور…');
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
      const key = Object.keys(KNOWN_ERRORS).find((k) => raw.includes(k));
      setMsg({ type: 'err', text: key ? KNOWN_ERRORS[key] : arabicError(err) });
      setBusy(false);
      setStep('');
    }
  }

  return (
    <>
      <div className="topbar"><h2>أضف إعلانًا</h2></div>
      {quota && !isPro && <p className={`msg ${full ? 'err' : 'info'}`}>إعلاناتك النشطة: {quota.used} من {quota.limit}.{full && ' لا يمكنك نشر إعلان جديد قبل إنهاء أحدها.'} <Link to="/my-listings" className="linkbtn">إدارة إعلاناتي</Link></p>}

      <form onSubmit={submit} noValidate>
        <div className="seg">
          <button type="button" className={`btn ${f.kind === 'boat' ? '' : 'alt'} sm`} onClick={() => setF({ ...f, kind: 'boat' })}>قارب / سفينة</button>
          <button type="button" className={`btn ${f.kind === 'engine' ? '' : 'alt'} sm`} onClick={() => setF({ ...f, kind: 'engine' })}>محرك</button>
          {isPro && (
            <button type="button" className={`btn ${f.kind === 'gear' ? '' : 'alt'} sm`} onClick={() => setF({ ...f, kind: 'gear' })}>منتج / خدمة</button>
          )}
        </div>

        <div className="section-title">الصور</div>
        <ImagePicker images={images} setImages={setImages} max={MAX_IMAGES} />

        <div className="section-title">التفاصيل</div>
        {f.kind === 'boat' && (
          <div className="field"><label>نوع القارب</label>
            <select className="input" value={f.typeId} onChange={set('typeId')}>
              <option value="">اختر النوع</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name_ar}</option>)}
            </select>
          </div>
        )}
        <div className="field"><label>{f.kind === 'gear' ? 'اسم المنتج أو الخدمة' : 'عنوان الإعلان'}</label><input className="input" value={f.title} onChange={set('title')} maxLength={120} placeholder={TITLE_HINT[f.kind]} /></div>
        <div className="row2">
          <div className="field"><label>السعر (دج)</label><input className="input" inputMode="numeric" value={f.price} onChange={set('price')} maxLength={12} placeholder="اتركه فارغًا للتفاهم" /></div>
          <div className="field"><label>الحالة</label>
            <select className="input" value={f.condition} onChange={set('condition')}>
              <option value="">غير محددة</option><option value="new">جديد</option><option value="used">مستعمل</option>
            </select>
          </div>
        </div>
        {f.kind !== 'gear' && (
          <div className="row2">
            {f.kind === 'boat' && <div className="field"><label>الطول (م)</label><input className="input" inputMode="decimal" value={f.length} onChange={set('length')} maxLength={6} /></div>}
            <div className="field"><label>سنة الصنع</label><input className="input" inputMode="numeric" value={f.year} onChange={set('year')} maxLength={4} /></div>
          </div>
        )}
        {f.kind !== 'gear' && (
          <div className="field"><label>المحرك</label><input className="input" value={f.engine} onChange={set('engine')} maxLength={200} placeholder="مثال: YAMAHA 40 حصان" /></div>
        )}
        <div className="row2">
          <div className="field"><label>الولاية</label>
            <select className="input" value={f.wilayaId} onChange={set('wilayaId')}>
              <option value="">اختر</option>
              {wilayas.map((w) => <option key={w.id} value={w.id}>{w.name_ar}</option>)}
            </select>
          </div>
          <div className="field"><label>المكان (ميناء/شاطئ)</label><input className="input" value={f.place} onChange={set('place')} maxLength={150} /></div>
        </div>
        <div className="field"><label>الوصف</label><textarea className="input" value={f.description} onChange={set('description')} maxLength={4000} /></div>

        <div className="section-title">وسائل التواصل</div>
        <p className="muted small">تظهر للمستخدمين المسجّلين فقط، ولا تظهر للزوار.</p>
        <div className="row2">
          <div className="field"><label>الهاتف</label><input className="input" inputMode="tel" dir="ltr" value={f.phone} onChange={set('phone')} placeholder="05XXXXXXXX" /></div>
          <div className="field"><label>واتساب (اختياري)</label><input className="input" inputMode="tel" dir="ltr" value={f.whatsapp} onChange={set('whatsapp')} placeholder="05XXXXXXXX" /></div>
        </div>

        {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
        {busy && <p className="msg info">{step}</p>}
        <button className="btn sand" disabled={busy || full}>{busy ? 'لحظة…' : 'نشر الإعلان'}</button>
        <p className="muted small center" style={{ marginTop: 10 }}>بالنشر فإنك توافق على <Link to="/terms" className="linkbtn">شروط الاستخدام</Link>.</p>
      </form>
    </>
  );
}
