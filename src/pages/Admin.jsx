import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { arabicError } from '../errors';

const TYPES = { fisherman: 'صياد', craftsman: 'حرفي', supplier: 'مورد', shop_owner: 'صاحب محل', mechanic: 'ميكانيكي' };
const STATUS = { pending: ['بانتظار التفعيل', 'warn'], active: ['مفعّل', 'ok'], suspended: ['موقوف', 'bad'] };
const one = (x) => (Array.isArray(x) ? x[0] : x);

export default function Admin() {
  const { profile } = useAuth();
  const [tab, setTab] = useState('pros');
  const [pros, setPros] = useState(null);
  const [reports, setReports] = useState(null);
  const [plans, setPlans] = useState([]);
  const [pick, setPick] = useState({});
  const [msg, setMsg] = useState(null);
  const isAdmin = !!profile?.is_admin;

  const load = useCallback(async () => {
    const [a, b, c] = await Promise.all([
      supabase.from('professional_profiles').select('id, business_name, status, pro_type, subscription_ends_at, wilayas(name_ar), professional_contacts(phone)').order('created_at', { ascending: false }).limit(100),
      supabase.from('reports').select('id, reason, listing_id, professional_id, listings(title), professional_profiles(business_name)').eq('status', 'open').order('created_at', { ascending: false }).limit(100),
      supabase.from('plans').select('id, pro_type, name_ar, price_dzd, duration_days').order('id'),
    ]);
    if (a.error || b.error || c.error) setMsg({ type: 'err', text: 'تعذّر تحميل بعض البيانات.' });
    setPros(a.data || []);
    setReports(b.data || []);
    setPlans(c.data || []);
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (!isAdmin) return <Navigate to="/" replace />;

  async function act(promise, okText) {
    setMsg(null);
    const { error } = await promise;
    if (error) return setMsg({ type: 'err', text: arabicError(error) });
    setMsg({ type: 'ok', text: okText });
    load();
  }
  const planFor = (p) => plans.find((x) => String(x.id) === String(pick[p.id])) || plans.find((x) => x.pro_type === p.pro_type);
  const activate = (p) => {
    const plan = planFor(p);
    if (!plan) return setMsg({ type: 'err', text: 'لا توجد خطة لهذا النوع.' });
    act(supabase.rpc('admin_activate_subscription', { p_professional: p.id, p_plan: plan.id, p_amount: plan.price_dzd, p_ref: null }), 'تم التفعيل.');
  };
  const setStatus = (p, s) => act(supabase.rpc('admin_set_professional_status', { p_id: p.id, p_status: s }), 'تم التحديث.');
  const resolve = (r, s) => act(supabase.rpc('admin_resolve_report', { p_id: r.id, p_status: s }), 'تم إغلاق البلاغ.');
  async function hide(r) {
    if (r.listing_id) await supabase.rpc('admin_set_listing_status', { p_id: r.listing_id, p_status: 'hidden' });
    else await supabase.rpc('admin_set_professional_status', { p_id: r.professional_id, p_status: 'suspended' });
    resolve(r, 'reviewed');
  }

  return (
    <>
      <div className="topbar"><h2>لوحة الإدارة</h2></div>
      <div className="seg">
        <button className={`btn sm ${tab === 'pros' ? '' : 'alt'}`} onClick={() => setTab('pros')}>الأنشطة ({pros?.length ?? 0})</button>
        <button className={`btn sm ${tab === 'reports' ? '' : 'alt'}`} onClick={() => setTab('reports')}>البلاغات ({reports?.length ?? 0})</button>
      </div>
      {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}

      {tab === 'pros' && pros?.map((p) => {
        const [label, tone] = STATUS[p.status];
        const myPlans = plans.filter((x) => x.pro_type === p.pro_type);
        return (
          <div key={p.id} className="box">
            <b>{p.business_name}</b> <span className={`pill ${tone}`}>{label}</span>
            <div className="muted small">{TYPES[p.pro_type]} · {p.wilayas?.name_ar} · <span dir="ltr">{one(p.professional_contacts)?.phone}</span></div>
            {p.subscription_ends_at && <div className="muted small">ينتهي: {new Date(p.subscription_ends_at).toLocaleDateString('ar-DZ')}</div>}
            {p.status !== 'suspended' && (
              <div className="row2" style={{ marginTop: 10 }}>
                <select className="input" style={{ height: 40 }} value={pick[p.id] || planFor(p)?.id || ''} onChange={(e) => setPick({ ...pick, [p.id]: e.target.value })}>
                  {myPlans.map((x) => <option key={x.id} value={x.id}>{x.name_ar} · {x.price_dzd} دج</option>)}
                </select>
                <button className="btn sm" onClick={() => activate(p)}>{p.status === 'active' ? 'تمديد' : 'تفعيل'}</button>
              </div>
            )}
            <div className="mine-actions">
              {p.status !== 'suspended' ? <button className="mini danger" onClick={() => setStatus(p, 'suspended')}>إيقاف</button> : <button className="mini" onClick={() => setStatus(p, 'pending')}>إعادة فتح</button>}
            </div>
          </div>
        );
      })}

      {tab === 'reports' && (
        <>
          {reports?.length === 0 && <p className="empty">لا توجد بلاغات مفتوحة.</p>}
          {reports?.map((r) => (
            <div key={r.id} className="box">
              <b>{r.listings?.title || r.professional_profiles?.business_name || 'عنصر محذوف'}</b>
              <p className="small">{r.reason}</p>
              <div className="mine-actions">
                <button className="mini danger" onClick={() => hide(r)}>إخفاء/إيقاف العنصر</button>
                <button className="mini" onClick={() => resolve(r, 'dismissed')}>تجاهل البلاغ</button>
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );
}
