import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { arabicError } from '../errors';
import { PHONE_RE, cleanPhone } from '../lib/format';
import NeedLogin from '../components/NeedLogin.jsx';

const PROFESSIONS = [
  'ميكانيكي محركات بحرية', 'صياد', 'بحار', 'ربان', 'نجار سفن',
  'كهربائي بحري', 'لحّام', 'غطّاس', 'حرفي', 'مساعد على متن السفينة',
];

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
    supabase.from('wilayas').select('id, name_ar').order('id')
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

  if (!user) return <NeedLogin text="سجل الدخول لتنشر إعلانك." />;

  const full = quota && quota.used >= quota.limit;

  function validate() {
    const t = f.title.trim();
    if (t.length < 5 || t.length > 120) return 'العنوان بين 5 و120 حرفاً.';
    if (isRequest && !f.profession.trim()) return 'اكتب المهنة.';
    if (f.profession.trim().length > 80) return 'المهنة طويلة جداً.';
    if (f.salary && (!/^\d{1,12}$/.test(f.salary) || Number(f.salary) <= 0))
      return 'الأجر أرقام فقط وأكبر من صفر.';
    if (!f.wilayaId) return 'اختر الولاية.';
    if (!PHONE_RE.test(cleanPhone(f.phone))) return 'رقم الهاتف غير صالح (أرقام فقط).';
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
        : (isRequest ? 'باحث عن عمل' : 'صاحب عمل');

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
      setMsg(arabicError(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} dir="rtl" style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>{isRequest ? 'أضف طلب عمل' : 'أضف عرض عمل'}</h2>

      {full && (
        <div style={errBox}>
          إعلاناتك النشطة: {quota.used} من {quota.limit}. لا يمكنك نشر إعلان جديد قبل إنهاء أحدها.
        </div>
      )}

      <label style={label}>العنوان</label>
      <input style={input} value={f.title} onChange={set('title')}
        placeholder={isRequest ? 'مثال: ميكانيكي محركات بحرية يبحث عن عمل' : 'مثال: مطلوب بحارة لقارب صيد'} />

      {isRequest && (
        <>
          <label style={label}>المهنة</label>
          <input style={input} list="professions" value={f.profession}
            onChange={set('profession')} placeholder="اختر أو اكتب مهنتك" />
          <datalist id="professions">
            {PROFESSIONS.map((p) => <option key={p} value={p} />)}
          </datalist>
        </>
      )}

      <label style={label}>الوصف</label>
      <textarea style={{ ...input, minHeight: 110 }} value={f.description}
        onChange={set('description')}
        placeholder={isRequest ? 'الخبرة، الشهادات، الأعمال السابقة...' : 'المهام، الشروط، مدة العمل...'} />

      <label style={label}>الولاية</label>
      <select style={input} value={f.wilayaId} onChange={set('wilayaId')}>
        <option value="">اختر الولاية</option>
        {wilayas.map((w) => <option key={w.id} value={w.id}>{w.name_ar}</option>)}
      </select>

      <label style={label}>المكان / الميناء (اختياري)</label>
      <input style={input} value={f.place} onChange={set('place')} />

      <label style={label}>الأجر (دج) - اختياري</label>
      <input style={input} inputMode="numeric" value={f.salary} onChange={set('salary')} />

      <label style={label}>رقم الهاتف</label>
      <input style={input} inputMode="tel" value={f.phone} onChange={set('phone')} />

      {msg && <div style={errBox}>{msg}</div>}

      <button type="submit" disabled={busy || full}
        style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14,
          background: '#0b4f7c', color: '#fff', fontSize: 16, fontWeight: 'bold',
          fontFamily: 'inherit', opacity: busy || full ? 0.5 : 1 }}>
        {busy ? 'جارٍ النشر...' : 'انشر الإعلان'}
      </button>
    </form>
  );
}
