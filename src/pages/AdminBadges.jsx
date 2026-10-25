import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { arabicError } from '../errors';
import VerifiedBadge from '../components/VerifiedBadge.jsx';

const C = { blue: '#0a6eb8', navy: '#0f2a44', muted: '#5b7488', line: '#cfe6f5', red: '#b3261e', green: '#1b7a3d' };

const TYPE_LABELS = {
  fisherman: 'صياد',
  craftsman: 'حرفي / ورشة',
  mechanic: 'ميكانيكي',
  supplier: 'مورد',
  shop_owner: 'محل',
};
const STATUS_LABELS = { pending: 'قيد المراجعة', active: 'مفعّل', suspended: 'موقوف' };

// Admin page: /admin/badges  (grant or remove the blue badge per account)
export default function AdminBadges() {
  const nav = useNavigate();
  const { profile, loading } = useAuth();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!profile?.is_admin) return;
    supabase
      .from('professional_profiles')
      .select('id, business_name, pro_type, status, badge_verified, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setMsg({ ok: false, text: arabicError(error) });
        else setRows(data);
      });
  }, [profile?.is_admin]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (rows || []).filter((r) => !t || (r.business_name || '').toLowerCase().includes(t));
  }, [rows, q]);

  async function toggle(row) {
    const next = !row.badge_verified;
    setBusyId(row.id);
    setMsg(null);
    const { error } = await supabase.from('professional_profiles').update({ badge_verified: next }).eq('id', row.id);
    setBusyId(null);
    if (error) return setMsg({ ok: false, text: arabicError(error) });
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, badge_verified: next } : r)));
    setMsg({ ok: true, text: next ? `تم منح الشارة لـ ${row.business_name}.` : `تم سحب الشارة من ${row.business_name}.` });
  }

  if (loading) return <p style={{ textAlign: 'center', marginTop: 60, color: C.muted }}>جارٍ التحميل…</p>;
  if (!profile?.is_admin)
    return <p dir="rtl" style={{ textAlign: 'center', marginTop: 60, color: C.muted }}>هذه الصفحة للإدارة فقط.</p>;

  return (
    <div dir="rtl" style={{ padding: '16px 16px 120px', maxWidth: 720, margin: '0 auto' }}>
      <button
        type="button"
        onClick={() => nav(-1)}
        style={{ border: 'none', background: '#fff', borderRadius: 999, padding: '10px 16px', fontFamily: 'inherit', fontWeight: 600, color: C.blue, cursor: 'pointer', boxShadow: '0 2px 10px rgba(10,110,184,.1)' }}
      >
        رجوع
      </button>

      <h1 style={{ fontSize: 22, color: C.navy, margin: '16px 0 4px' }}>إدارة شارة التوثيق</h1>
      <p style={{ color: C.muted, fontSize: 14, margin: '0 0 14px', lineHeight: 1.8 }}>
        تفعيل النشاط لا يمنح الشارة. امنحها هنا لمن تشاء فقط.
      </p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ابحث باسم النشاط"
        style={{ width: '100%', boxSizing: 'border-box', padding: '13px 16px', borderRadius: 16, border: `2px solid ${C.line}`, background: '#fff', fontFamily: 'inherit', fontSize: 15, color: C.navy, marginBottom: 12 }}
      />

      {msg && <p role="status" style={{ margin: '0 0 12px', fontSize: 14, color: msg.ok ? C.green : C.red }}>{msg.text}</p>}
      {rows === null && !msg && <p style={{ color: C.muted }}>جارٍ التحميل…</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {shown.map((r) => (
          <div key={r.id} style={{ background: '#fff', borderRadius: 20, padding: 14, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 16px rgba(10,110,184,.07)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.navy, fontWeight: 700, fontSize: 16 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.business_name}</span>
                {r.badge_verified && <VerifiedBadge size={18} />}
              </div>
              <div style={{ color: C.muted, fontSize: 13, marginTop: 3 }}>
                {TYPE_LABELS[r.pro_type] || r.pro_type} · {STATUS_LABELS[r.status] || r.status}
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggle(r)}
              disabled={busyId === r.id}
              style={{
                border: r.badge_verified ? `2px solid ${C.line}` : 'none',
                background: r.badge_verified ? '#fff' : C.blue,
                color: r.badge_verified ? C.red : '#fff',
                borderRadius: 999,
                padding: '10px 16px',
                fontFamily: 'inherit',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {busyId === r.id ? '…' : r.badge_verified ? 'سحب الشارة' : 'منح الشارة'}
            </button>
          </div>
        ))}
        {rows && shown.length === 0 && <p style={{ color: C.muted }}>لا توجد نتائج.</p>}
      </div>
    </div>
  );
}
