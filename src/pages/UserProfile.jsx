import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import ProfileTabs from '../components/ProfileTabs.jsx';
import VerifiedBadge from '../components/VerifiedBadge.jsx';
import { TYPE_LABELS, isProType } from '../lib/accountTypes';

const C = { blue: '#0a6eb8', navy: '#0f2a44', muted: '#5b7488' };

function Empty({ children }) {
  return <p style={{ textAlign: 'center', color: C.muted, padding: '40px 16px', fontSize: 15 }}>{children}</p>;
}

// Page for any account (/u/:id).
// If the account has an approved professional activity, we go to its full page (/pro/:id).
export default function UserProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    let alive = true;
    setProfile(undefined);

    (async () => {
      const { data: pros } = await supabase
        .from('professional_profiles')
        .select('id')
        .eq('owner_id', id)
        .eq('status', 'active')
        .limit(1);
      if (!alive) return;
      if (pros && pros.length > 0) {
        nav(`/pro/${pros[0].id}`, { replace: true });
        return;
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
      if (alive) setProfile(data ?? null);
    })();

    return () => {
      alive = false;
    };
  }, [id, nav]);

  return (
    <div dir="rtl" style={{ padding: '16px 16px 120px', maxWidth: 720, margin: '0 auto' }}>
      <button
        type="button"
        onClick={() => nav(-1)}
        style={{ border: 'none', background: '#fff', borderRadius: 999, padding: '10px 16px', fontFamily: 'inherit', fontWeight: 600, color: C.blue, cursor: 'pointer', boxShadow: '0 2px 10px rgba(10,110,184,.1)' }}
      >
        رجوع
      </button>

      {profile === undefined && <Empty>جارٍ التحميل…</Empty>}
      {profile === null && <Empty>هذا الحساب غير موجود.</Empty>}

      {profile && (
        <>
          <div style={{ background: '#fff', borderRadius: 24, padding: 20, margin: '16px 0', boxShadow: '0 6px 24px rgba(10,110,184,.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ margin: 0, fontSize: 22, color: C.navy }}>{profile.full_name || 'حساب مرسى'}</h1>
              {profile.is_verified && <VerifiedBadge size={22} />}
            </div>
            <div style={{ color: C.muted, fontSize: 14, marginTop: 6 }}>{TYPE_LABELS[profile.user_type] || 'حساب فردي'}</div>
          </div>
          <ProfileTabs ownerId={id} showPortfolio={isProType(profile.user_type)} />
        </>
      )}
    </div>
  );
}
