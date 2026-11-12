import { Component, Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth.jsx';
import { FavoritesProvider } from './favorites.jsx';
import { I18nProvider, useI18n } from './i18n/index.jsx';
import { NotificationsProvider } from './notifications.jsx';
import Icon from './components/Icon.jsx';
import Home from './pages/Home.jsx';
import ListingDetail from './pages/ListingDetail.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';
import AnnouncementGate from './components/AnnouncementGate.jsx';

// Home and the listing page are in the first download; every other screen is fetched the first time it is opened
// (smaller first load on slow networks). The service worker still precaches all of them for offline use.
const RELOAD_KEY = 'marsa.chunk-reload';
function page(load, pick = 'default') {
  return lazy(() =>
    load().then(
      (m) => {
        try {
          sessionStorage.removeItem(RELOAD_KEY);
        } catch {
          /* storage blocked */
        }
        return { default: m[pick] };
      },
      (err) => {
        // A new version was published while this tab was open and the old file is gone: reload once to get it.
        try {
          if (!sessionStorage.getItem(RELOAD_KEY)) {
            sessionStorage.setItem(RELOAD_KEY, '1');
            window.location.reload();
            return new Promise(() => {});
          }
        } catch {
          /* storage blocked */
        }
        throw err;
      }
    )
  );
}
const FishMarket = page(() => import('./pages/FishMarket.jsx'));
const FishToday = page(() => import('./pages/FishMarket.jsx'), 'FishToday');
const FishPost = page(() => import('./pages/FishPost.jsx'));
const FishRequests = page(() => import('./pages/FishRequests.jsx'));
const FishRequestNew = page(() => import('./pages/FishRequestNew.jsx'));
const FishRequestDetail = page(() => import('./pages/FishRequestDetail.jsx'));
const Search = page(() => import('./pages/Search.jsx'));
const Sell = page(() => import('./pages/Sell.jsx'));
const MyListings = page(() => import('./pages/MyListings.jsx'));
const Favorites = page(() => import('./pages/Favorites.jsx'));
const Account = page(() => import('./pages/Account.jsx'));
const Login = page(() => import('./pages/Login.jsx'));
const ResetPassword = page(() => import('./pages/ResetPassword.jsx'));
const GuideSection = page(() => import('./pages/GuideSection.jsx'));
const GuideList = page(() => import('./pages/GuideList.jsx'));
const ProDetail = page(() => import('./pages/ProDetail.jsx'));
const ProRegister = page(() => import('./pages/ProRegister.jsx'));
const Admin = page(() => import('./pages/Admin.jsx'));
const Legal = page(() => import('./pages/Legal.jsx'));
const PostJob = page(() => import('./pages/PostJob.jsx'));
const UserProfile = page(() => import('./pages/UserProfile.jsx'));
const Support = page(() => import('./pages/Support.jsx'));
const Notifications = page(() => import('./pages/Notifications.jsx'));
const PortfolioManage = page(() => import('./components/PortfolioManage.jsx'));
const EditListing = page(() => import('./pages/EditListing.jsx'));
const EditBusiness = page(() => import('./pages/EditBusiness.jsx'));
const News = page(() => import('./pages/News.jsx'));
const NotFound = page(() => import('./pages/NotFound.jsx'));

// A screen that could not be downloaded (no connection): say so instead of a blank page
class PageBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidUpdate(prev) {
    if (prev.pathname !== this.props.pathname && this.state.failed) this.setState({ failed: false });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <p className="msg err" style={{ marginTop: 60 }}>
        {this.props.text} <button className="linkbtn" onClick={() => window.location.reload()}>{this.props.retry}</button>
      </p>
    );
  }
}

function Shell() {
  const { loading, recovery } = useAuth();
  const { t } = useI18n();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  if (loading) return <div className="splash"><img src="/logo.png" alt={t('app.name')} /></div>;
  const waiting = <p className="muted center" style={{ marginTop: 60 }}>{t('common.loading')}</p>;
  if (recovery) return <Suspense fallback={waiting}><ResetPassword /></Suspense>;

  const isLogin = pathname === '/login';
  const hideTabs = isLogin || pathname.startsWith('/listing/') || pathname.startsWith('/pro/');

  return (
    <div className="app">
      <InstallPrompt />
      <AnnouncementGate />
      <main className={isLogin ? '' : 'page'}>
        <PageBoundary pathname={pathname} text={t('common.load_failed')} retry={t('common.retry')}>
        <Suspense fallback={waiting}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/fish" element={<FishMarket />} />
          <Route path="/fish/today" element={<FishToday />} />
          <Route path="/fish/post" element={<FishPost />} />
          <Route path="/fish/requests" element={<FishRequests />} />
          <Route path="/fish/requests/new" element={<FishRequestNew />} />
          <Route path="/fish/requests/:id" element={<FishRequestDetail />} />
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
          <Route path="/news" element={<News />} />
          <Route path="/u/:id" element={<UserProfile />} />
          <Route path="/portfolio" element={<PortfolioManage />} />
          <Route path="/index.html" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </PageBoundary>
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
