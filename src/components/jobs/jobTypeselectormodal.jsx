import React from 'react';
import { useI18n } from '../../i18n/index.jsx';

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
  textAlign: 'start',
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
  { route: '/post/boat-sale', icon: '🚤', key: 'sell' },
  { route: '/post/job-offer', icon: '💼', key: 'job_offer' },
  { route: '/post/job-request', icon: '🧑‍🔧', key: 'job_request' },
];

const JobTypeSelectorModal = ({ isOpen, onClose, isAuthenticated, onNavigate }) => {
  const { t } = useI18n();
  if (!isOpen) return null;

  const handleOptionClick = (route) => {
    onClose();
    if (!isAuthenticated) {
      onNavigate(`/login?next=${encodeURIComponent(route)}`);
    } else {
      onNavigate(route);
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={box} onClick={(e) => e.stopPropagation()}>
        <div style={header}>
          <h3 style={{ margin: 0, fontSize: 20 }}>{t('post.what')}</h3>
          <button style={closeBtn} onClick={onClose} aria-label={t('common.close')}>&times;</button>
        </div>

        {OPTIONS.map((o) => (
          <button key={o.route} style={optionBtn} onClick={() => handleOptionClick(o.route)}>
            <span style={{ fontSize: 28 }}>{o.icon}</span>
            <div>
              <div style={{ fontWeight: 'bold', color: '#fbbf24' }}>{t(`post.${o.key}`)}</div>
              <div style={{ fontSize: 12, color: '#cbd5e1' }}>{t(`post.${o.key}_desc`)}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default JobTypeSelectorModal;
