import { Link, useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function NeedLogin({ text }) {
  const { t } = useI18n();
  const { pathname } = useLocation();
  return (
    <div className="needlogin">
      <Icon name="user" size={34} color="#0A6EB4" />
      <p>{text || t('login.needed')}</p>
      <Link className="btn" to={`/login?next=${encodeURIComponent(pathname)}`}>{t('login.title')}</Link>
    </div>
  );
}
