import { INDIVIDUAL_TYPES, PRO_TYPES, isProType } from '../lib/accountTypes';

const C = { blue: '#0a6eb8', yellow: '#f4c95d', navy: '#0f2a44', line: '#cfe6f5', muted: '#5b7488' };

const tab = (active) => ({
  flex: 1,
  padding: '12px 8px',
  borderRadius: 999,
  border: `2px solid ${active ? C.blue : C.line}`,
  background: active ? C.blue : '#fff',
  color: active ? '#fff' : C.navy,
  fontWeight: 700,
  fontSize: 15,
  cursor: 'pointer',
});

const chip = (active) => ({
  padding: '9px 16px',
  borderRadius: 999,
  border: `2px solid ${active ? C.yellow : C.line}`,
  background: active ? C.yellow : '#fff',
  color: C.navy,
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
});

// Usage: <AccountTypePicker value={userType} onChange={setUserType} />
// value is one of: fisherman | artisan | workshop | supplier | shop
export default function AccountTypePicker({ value, onChange }) {
  const pro = isProType(value);
  const subTypes = pro ? PRO_TYPES : INDIVIDUAL_TYPES;

  return (
    <div dir="rtl" style={{ margin: '8px 0 16px' }}>
      <div style={{ fontSize: 14, color: C.navy, marginBottom: 8 }}>نوع الحساب</div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" style={tab(!pro)} onClick={() => onChange('fisherman')}>
          فردي
        </button>
        <button type="button" style={tab(pro)} onClick={() => onChange('workshop')}>
          محترف
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {subTypes.map((t) => (
          <button key={t.value} type="button" style={chip(value === t.value)} onClick={() => onChange(t.value)}>
            {t.label}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 13, color: C.muted, margin: '10px 2px 0', lineHeight: 1.7 }}>
        {pro
          ? 'للورشات والمحلات والموردين: إعلانات غير محدودة، معرض أعمال بالفيديو، وشارة التوثيق الزرقاء. تبدأ بفترة تجريبية.'
          : 'للصيادين والحرفيين: انشر حتى 5 إعلانات نشطة وتواصل مباشرة عبر الواتساب والاتصال.'}
      </p>
    </div>
  );
}
