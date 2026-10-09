import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Provider } from 'react-redux';
import store from './store';
import AuthProvider from './components/AuthProvider';
import NotificationProvider from './components/NotificationProvider';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { useSelector } from 'react-redux';

// Eagerly loaded — needed on first paint
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

// Lazily loaded — split into separate chunks
const VerifyOTP           = lazy(() => import('./pages/VerifyOTP'));
const ForgotPassword      = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword       = lazy(() => import('./pages/ResetPassword'));
const Profile             = lazy(() => import('./pages/Profile'));
const CreateListing       = lazy(() => import('./pages/CreateListing'));
const EditListing         = lazy(() => import('./pages/EditListing'));
const ListingDetail       = lazy(() => import('./pages/ListingDetail'));
const MyListings          = lazy(() => import('./pages/MyListings'));
const Search              = lazy(() => import('./pages/Search'));
const Conversations       = lazy(() => import('./pages/Conversations'));
const Chat                = lazy(() => import('./pages/Chat'));
const Notifications       = lazy(() => import('./pages/Notifications'));
const CompanyProfile      = lazy(() => import('./pages/CompanyProfile'));
const RegisterCompany     = lazy(() => import('./pages/RegisterCompany'));
const AdminPanel          = lazy(() => import('./pages/AdminPanel'));
const AdminSubscriptions  = lazy(() => import('./pages/AdminSubscriptions'));
const PremiumSubscription = lazy(() => import('./pages/PremiumSubscription'));
const Settings            = lazy(() => import('./pages/Settings'));
const About               = lazy(() => import('./pages/About'));

function PageLoader() {
  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <div className="spinner-border text-success" role="status">
        <span className="visually-hidden">Loading…</span>
      </div>
    </div>
  );
}

function Forbidden() {
  return (
    <div className="container py-5 text-center">
      <h1 style={{ fontSize: '5rem' }}>403</h1>
      <h3>Access Denied</h3>
      <p className="text-muted">You don't have permission to view this page.</p>
    </div>
  );
}

function NotFound() {
  return (
    <div className="container py-5 text-center">
      <h1 style={{ fontSize: '5rem' }}>404</h1>
      <h3>Page Not Found</h3>
      <p className="text-muted">The page you're looking for doesn't exist.</p>
    </div>
  );
}

/** Redirect /dashboard to /admin-panel for admins, /profile for everyone else */
function DashboardRedirect() {
  const user = useSelector((s) => s.auth.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin-panel" replace />;
  return <Navigate to="/profile" replace />;
}

function AppLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Navbar />
        <Suspense fallback={<PageLoader />}>
          <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/how-it-works" element={<Navigate to="/about" replace />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/search" element={<Search />} />
          <Route path="/listings/:id" element={<ListingDetail />} />

          {/* Public company profiles */}
          <Route path="/companies/:id" element={<CompanyProfile />} />

          {/* Protected */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/register-company" element={<RegisterCompany />} />
          <Route path="/listings/create" element={<ProtectedRoute roles={['user', 'broker', 'admin', 'company']}><CreateListing /></ProtectedRoute>} />
          <Route path="/listings/:id/edit" element={<ProtectedRoute roles={['user', 'broker', 'admin', 'company']}><EditListing /></ProtectedRoute>} />
          <Route path="/my-listings" element={<ProtectedRoute roles={['user', 'broker', 'admin', 'company']}><MyListings /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Conversations /></ProtectedRoute>} />
          <Route path="/messages/:id" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

          {/* Dashboard — admin only; all others go to /profile */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
          <Route path="/admin-panel" element={<ProtectedRoute roles={['admin']}><AdminPanel /></ProtectedRoute>} />

          {/* Legacy redirects */}
          <Route path="/seller-dashboard" element={<Navigate to="/profile" replace />} />
          <Route path="/buyer-dashboard" element={<Navigate to="/profile" replace />} />
          <Route path="/user-dashboard" element={<Navigate to="/profile" replace />} />
          <Route path="/broker-dashboard" element={<Navigate to="/profile" replace />} />
          <Route path="/company-dashboard" element={<Navigate to="/profile" replace />} />
          <Route path="/admin" element={<Navigate to="/admin-panel" replace />} />

          {/* Test routes — admin only in development */}
          {import.meta.env.DEV && (
            <>
              <Route path="/notification-test" element={<ProtectedRoute roles={['admin']}><Navigate to="/admin-panel" replace /></ProtectedRoute>} />
              <Route path="/conversation-test" element={<ProtectedRoute roles={['admin']}><Navigate to="/admin-panel" replace /></ProtectedRoute>} />
            </>
          )}

          {/* Settings */}
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          {/* Premium Subscription */}
          <Route path="/premium-subscription" element={<ProtectedRoute><PremiumSubscription /></ProtectedRoute>} />
          <Route path="/premium-subscription/verify" element={<ProtectedRoute><PremiumSubscription /></ProtectedRoute>} />

          {/* Admin Subscription Management */}
          <Route path="/admin-subscriptions" element={<ProtectedRoute roles={['admin']}><AdminSubscriptions /></ProtectedRoute>} />

          {/* Errors */}
          <Route path="/403" element={<Forbidden />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
        </Suspense>
        <Footer />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </Provider>
  );
}
