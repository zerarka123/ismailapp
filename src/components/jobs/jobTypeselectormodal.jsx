import React from 'react';

const overlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 16,
};

const box = {
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: 16,
  width: '100%',
  maxWidth: 420,
  padding: 20,
  color: '#fff',
};

const header = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
};

const closeBtn = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  fontSize: 28,
  cursor: 'pointer',
};

const optionBtn = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  textAlign: 'right',
  padding: 14,
  marginBottom: 10,
  borderRadius: 12,
  background: '#1e293b',
  border: '1px solid #334155',
  color: '#fff',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const OPTIONS = [
  { route: '/post/boat-sale', icon: '🚤', title: 'بيع قاربك', desc: 'سفن، قوارب صيد، ومعدات بحرية' },
  { route: '/post/job-offer', icon: '💼', title: 'عرض عمل (أصحاب العمل)', desc: 'خاص بملاك السفن، الورش، ومحلات قطع الغيار' },
  { route: '/post/job-request', icon: '🧑‍🔧', title: 'طلب عمل (الباحثين عن عمل)', desc: 'خاص بالحرفيين والصيادين والميكانيكيين' },
];

const JobTypeSelectorModal = ({ isOpen, onClose, isAuthenticated, onNavigate }) => {
  if (!isOpen) return null;

  const handleOptionClick = (route) => {
    onClose();
    if (!isAuthenticated) {
      onNavigate('/login');
    } else {
      onNavigate(route);
    }
  };

  return (
    <div style={overlay} dir="rtl" onClick={onClose}>
      <div style={box} onClick={(e) => e.stopPropagation()}>
        <div style={header}>
          <h3 style={{ margin: 0, fontSize: 20 }}>ماذا تريد أن تنشر اليوم؟</h3>
          <button style={closeBtn} onClick={onClose}>&times;</button>
        </div>

        {OPTIONS.map((o) => (
          <button key={o.route} style={optionBtn} onClick={() => handleOptionClick(o.route)}>
            <span style={{ fontSize: 28 }}>{o.icon}</span>
            <div>
              <div style={{ fontWeight: 'bold', color: '#fbbf24' }}>{o.title}</div>
              <div style={{ fontSize: 12, color: '#cbd5e1' }}>{o.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default JobTypeSelectorModal;
