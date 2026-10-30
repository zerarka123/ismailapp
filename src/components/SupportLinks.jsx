import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP } from '../config';
import { waLink } from '../lib/format';
import Icon from './Icon.jsx';

export const mailtoSupport = (subject, body) =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ''}`;

// Working ways to reach support. The old screen printed the address as plain text (some WebViews
// turned "marsadz.app" into a dead web link); these are real mailto / WhatsApp / in-app links.
export default function SupportLinks({ subject, showPage = true }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const body = t('support.body', { email: user?.email || '-' });
  return (
    <div className="support-links">
      <a className="btn" href={mailtoSupport(subject || t('support.subject'), body)}>
        <Icon name="mail" color="#fff" />{t('support.email_us')}
      </a>
      {SUPPORT_WHATSAPP && (
        <a className="btn wa" href={waLink(SUPPORT_WHATSAPP, subject || t('support.subject'))} target="_blank" rel="noopener noreferrer">
          <Icon name="chat" color="#fff" />{t('support.whatsapp')}
        </a>
      )}
      <p className="muted small center" style={{ margin: 0 }}>
        <a href={`mailto:${SUPPORT_EMAIL}`} dir="ltr" className="linkbtn">{SUPPORT_EMAIL}</a>
        {showPage && <> · <Link to="/support" className="linkbtn">{t('support.page')}</Link></>}
      </p>
    </div>
  );
}
