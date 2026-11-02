import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth.jsx';
import { FavoritesProvider } from './favorites.jsx';
import { I18nProvider, useI18n } from './i18n/index.jsx';
import { NotificationsProvider } from './notifications.jsx';
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
import PostJob from './pages/PostJob.jsx';
import UserProfile from './pages/UserProfile.jsx';
import Support from './pages/Support.jsx';
import Notifications from './pages/Notifications.jsx';
import PortfolioManage from './components/PortfolioManage.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';
import EditListing from './pages/EditListing.jsx';
import EditBusiness from './pages/EditBusiness.jsx';

function Shell() {
  const { loading, recovery } = useAuth();
  const { t } = useI18n();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  if (loading) return <div className="splash"><img src="/logo.png" alt={t('app.name')} /></div>;
  if (recovery) return <ResetPassword />;

  const isLogin = pathname === '/login';
  const hideTabs = isLogin || pathname.startsWith('/listing/') || pathname.startsWith('/pro/');

  return (
    <div className="app">
      <InstallPrompt />
      <main className={isLogin ? '' : 'page'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/post/boat-sale" element={<Sell />} />
          <Route path="/post/job-offer" element={<PostJob key="job_offer" kind="job_offer" />} />
          <Route path="/post/job-request" element={<PostJob key="job_request" kind="job_request" />} />
          <Route path="/my-listings" element={<MyListings />} />
          <Route path="/edit-listing/:id" element={<EditListing />} />
          <Route path="/edit-business" element={<EditBusiness />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/account" element={<Account />} />
          <Route path="/login" element={<Login />} />
          <Route path="/guide/:section" element={<GuideSection />} />
          <Route path="/guide/:section/:slug" element={<GuideList />} />
          <Route path="/pro/:id" element={<ProDetail />} />
          <Route path="/register-business" element={<ProRegister />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/badges" element={<Navigate to="/admin" replace />} />
          <Route path="/privacy" element={<Legal kind="privacy" />} />
          <Route path="/terms" element={<Legal kind="terms" />} />
          <Route path="/delete-account" element={<Legal kind="delete" />} />
          <Route path="/support" element={<Support />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/u/:id" element={<UserProfile />} />
          <Route path="/portfolio" element={<PortfolioManage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!hideTabs && (
        <nav className="tabbar">
          <NavLink to="/" end className="tab"><Icon name="home" />{t('nav.home')}</NavLink>
          <NavLink to="/search" className="tab"><Icon name="search" />{t('nav.search')}</NavLink>
          {/* "+" goes straight to the post form. The job-type chooser (components/jobs/jobTypeselectormodal.jsx) is kept but not shown. */}
          <button className="fab" aria-label={t('nav.post')} onClick={() => navigate('/sell')}><Icon name="plus" size={26} /></button>
          <NavLink to="/favorites" className="tab"><Icon name="star" />{t('nav.favorites')}</NavLink>
          <NavLink to="/account" className="tab"><Icon name="user" />{t('nav.account')}</NavLink>
        </nav>
      )}

    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <AuthProvider>
          <FavoritesProvider>
            <NotificationsProvider>
              <Shell />
            </NotificationsProvider>
          </FavoritesProvider>
        </AuthProvider>
      </BrowserRouter>
    </I18nProvider>
  );
}
