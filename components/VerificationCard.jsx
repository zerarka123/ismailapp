import { useRef, useState } from 'react';
import { useAuth } from '../auth';
import { isProType } from '../lib/accountTypes';
import { submitVerification } from '../lib/verification';
import { arabicError } from '../lib/marsaErrors';
import VerifiedBadge from './VerifiedBadge';

const C = { blue: '#0a6eb8', yellow: '#f4c95d', navy: '#0f2a44', muted: '#5b7488' };

const card = {
  background: '#fff',
  borderRadius: 24,
  padding: 20,
  margin: '16px 0',
  boxShadow: '0 6px 24px rgba(10,110,184,.08)',
};

const button = (disabled) => ({
  width: '100%',
  padding: '14px 16px',
  borderRadius: 999,
  border: 'none',
  background: disabled ? '#9cc3df' : C.blue,
  color: '#fff',
  fontWeight: 700,
  fontSize: 16,
  cursor: disabled ? 'default' : 'pointer',
});

// Put it on the "My account" page:  <VerificationCard />
// It renders nothing for individual accounts.
export default function VerificationCard() {
  const { user, profile, refreshProfile } = useAuth();
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!user || !profile || !isProType(profile.user_type)) return null;

  if (profile.is_verified) {
    return (
      <div dir="rtl" style={{ ...card, display: 'flex', alignItems: 'center', gap: 10 }}>
        <VerifiedBadge size={26} />
        <strong style={{ color: C.navy }}>حسابك محترف موثق</strong>
      </div>
    );
  }

  if (profile.verification_status === 'pending') {
    return (
      <div dir="rtl" style={card}>
        <strong style={{ color: C.navy }}>طلب التوثيق قيد المراجعة</strong>
        <p style={{ color: C.muted, margin: '8px 0 0', fontSize: 14, lineHeight: 1.7 }}>
          استلمنا وثائقك وسنراجعها قريباً. ستظهر الشارة الزرقاء على حسابك عند الموافقة.
        </p>
      </div>
    );
  }

  const rejected = profile.verification_status === 'rejected';

  const onSubmit = async () => {
    setBusy(true);
    setError('');
    try {
      await submitVerification(user.id, files);
      setFiles([]);
      await refreshProfile();
    } catch (e) {
      setError(arabicError(e, 'تعذّر رفع الوثائق. تأكد من اتصالك وحاول مرة أخرى.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div dir="rtl" style={card}>
      <strong style={{ color: C.navy, fontSize: 17 }}>احصل على شارة التوثيق الزرقاء</strong>
      <p style={{ color: C.muted, margin: '8px 0 14px', fontSize: 14, lineHeight: 1.7 }}>
        {rejected
          ? 'لم نتمكن من قبول الوثائق السابقة. ارفع وثائق أوضح وأعد المحاولة.'
          : 'ارفع صورة السجل التجاري أو بطاقة الحرفي (صورة أو PDF، حتى 3 ملفات). لن تظهر وثائقك لأي مستخدم.'}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{
          width: '100%',
          padding: '14px 16px',
          borderRadius: 999,
          border: `2px dashed ${C.blue}`,
          background: '#fff',
          color: C.blue,
          fontWeight: 700,
          fontSize: 15,
          cursor: 'pointer',
          marginBottom: 10,
        }}
      >
        {files.length ? `تم اختيار ${files.length} ملف` : 'اختر الوثائق'}
      </button>

      {error && (
        <p role="alert" style={{ color: '#b3261e', fontSize: 14, margin: '0 0 10px' }}>
          {error}
        </p>
      )}

      <button type="button" style={button(busy || files.length === 0)} disabled={busy || files.length === 0} onClick={onSubmit}>
        {busy ? 'جارٍ الرفع…' : 'أرسل طلب التوثيق'}
      </button>
    </div>
  );
}
