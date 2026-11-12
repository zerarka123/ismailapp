import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useI18n } from '../i18n/index.jsx';

// Unknown address: say so (it used to jump silently to the home page) and offer the two useful exits.
export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="needlogin">
      <Icon name="compass" size={34} color="#0A6EB4" />
      <h2 style={{ margin: '8px 0 0' }}>{t('notfound.title')}</h2>
      <p>{t('notfound.text')}</p>
      <Link className="btn" to="/">{t('notfound.home')}</Link>
      <p style={{ marginTop: 12 }}><Link to="/search">{t('nav.search')}</Link></p>
    </div>
  );
}
