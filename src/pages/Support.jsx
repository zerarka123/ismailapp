import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import Icon from '../components/Icon.jsx';
import SupportLinks from '../components/SupportLinks.jsx';

const TOPICS = ['activation', 'subscription', 'listing', 'account', 'bug'];

// In-app support page (also published as /support.html for the web and the Play Store listing)
export default function Support() {
  const nav = useNavigate();
  const { t } = useI18n();
  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => nav(-1)} aria-label={t('common.back')}><Icon name="back" /></button>
        <h2>{t('support.title')}</h2>
      </div>
      <p className="muted">{t('support.intro')}</p>
      <SupportLinks showPage={false} />

      <div className="section-title">{t('support.topics')}</div>
      <div className="menu">
        {TOPICS.map((k) => (
          <details key={k} className="faq">
            <summary>{t(`support.q_${k}`)}</summary>
            <p>{t(`support.a_${k}`)}</p>
          </details>
        ))}
      </div>
      <div className="menu">
        <Link to="/privacy"><Icon name="shield" />{t('legal.privacy')}</Link>
        <Link to="/terms"><Icon name="doc" />{t('legal.terms')}</Link>
        <Link to="/delete-account"><Icon name="trash" />{t('legal.delete')}</Link>
      </div>
    </>
  );
}
