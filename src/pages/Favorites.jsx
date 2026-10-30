import { useAuth } from '../auth.jsx';
import { useFavorites } from '../favorites.jsx';
import { useI18n } from '../i18n/index.jsx';
import ListingFeed from '../components/ListingFeed.jsx';
import NeedLogin from '../components/NeedLogin.jsx';

export default function Favorites() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { ids } = useFavorites();
  if (!user) return <NeedLogin text={t('fav.login')} />;
  return (
    <>
      <div className="topbar"><h2>{t('nav.favorites')}</h2></div>
      <ListingFeed filters={{ ids: [...ids] }} emptyText={t('fav.empty')} />
    </>
  );
}
