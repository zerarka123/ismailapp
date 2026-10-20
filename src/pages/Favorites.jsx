import { useAuth } from '../auth.jsx';
import { useFavorites } from '../favorites.jsx';
import ListingFeed from '../components/ListingFeed.jsx';
import NeedLogin from '../components/NeedLogin.jsx';

export default function Favorites() {
  const { user } = useAuth();
  const { ids } = useFavorites();
  if (!user) return <NeedLogin text="سجّل الدخول لحفظ إعلاناتك المفضلة." />;
  return (
    <>
      <div className="topbar"><h2>المفضلة</h2></div>
      <ListingFeed filters={{ ids: [...ids] }} emptyText="لم تضف أي إعلان إلى المفضلة بعد." />
    </>
  );
}
