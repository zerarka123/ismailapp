import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth.jsx';
import { FavoritesProvider } from './favorites.jsx';
import Icon from './components/Icon.jsx';
import Home from './pages/Home.jsx';
import Search from './pages/Search.jsx';
import ListingDetail from './pages/ListingDetail.jsx';
import Sell from './pages/Sell.jsx';
import MyListings from './pages/MyListings.jsx';
import Favorites from './pages/Favorites.jsx';
import Account from './pages/Account.jsx';
import Login from './pages/Login.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import GuideSection from './pages/GuideSection.jsx';
import GuideList from './pages/GuideList.jsx';
import ProDetail from './pages/ProDetail.jsx';
import ProRegister from './pages/ProRegister.jsx';
import Admin from './pages/Admin.jsx';
import Legal from './pages/Legal.jsx';

function Shell() {
  const { loading, recovery } = useAuth();
  const { pathname } = useLocation();

  if (loading) return <div className="splash"><img src="/logo.png" alt="مرسى" /></div>;
  if (recovery) return <ResetPassword />;

  const isLogin = pathname === '/login';
  const hideTabs = isLogin || pathname.startsWith('/listing/') || pathname.startsWith('/pro/');

  return (
    <div className="app">
      <main className={isLogin ? '' : 'page'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/my-listings" element={<MyListings />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/account" element={<Account />} />
          <Route path="/login" element={<Login />} />
          <Route path="/guide/:section" element={<GuideSection />} />
          <Route path="/guide/:section/:slug" element={<GuideList />} />
          <Route path="/pro/:id" element={<ProDetail />} />
          <Route path="/register-business" element={<ProRegister />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/privacy" element={<Legal kind="privacy" />} />
          <Route path="/terms" element={<Legal kind="terms" />} />
          <Route path="/delete-account" element={<Legal kind="delete" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!hideTabs && (
        <nav className="tabbar">
          <NavLink to="/" end className="tab"><Icon name="home" />الرئيسية</NavLink>
          <NavLink to="/search" className="tab"><Icon name="search" />البحث</NavLink>
          <NavLink to="/sell" className="fab" aria-label="بيع"><Icon name="plus" size={26} /></NavLink>
          <NavLink to="/favorites" className="tab"><Icon name="star" />المفضلة</NavLink>
          <NavLink to="/account" className="tab"><Icon name="user" />حسابي</NavLink>
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FavoritesProvider>
          <Shell />
        </FavoritesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
