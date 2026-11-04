import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { AppProvider } from './context/AppContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { BottomNav, Sidebar } from './components/Navigation.jsx';
import { LayoutGrid } from 'lucide-react';

// Lazy-loaded pages
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const AllRecords = lazy(() => import('./pages/AllRecords.jsx'));
const AddRecord = lazy(() => import('./pages/AddRecord.jsx'));
const EditRecord = lazy(() => import('./pages/EditRecord.jsx'));
const RecordDetail = lazy(() => import('./pages/RecordDetail.jsx'));
const Categories = lazy(() => import('./pages/Categories.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const SignUp = lazy(() => import('./pages/SignUp.jsx'));

function PageLoader() {
  return (
    <div className="page-loader">
      <div className="spinner" />
    </div>
  );
}

function AuthSplash() {
  return (
    <div className="auth-splash-screen">
      <div className="auth-splash-content">
        <div className="auth-splash-icon-box">
          <LayoutGrid size={32} color="#fff" />
          <div className="auth-splash-ring" />
        </div>
        <h2 className="auth-splash-title">ImageVault</h2>
        <p className="auth-splash-status">Restoring your session…</p>
        <div className="spinner" style={{ marginTop: 20 }} />
      </div>
    </div>
  );
}

function RequireAuth({ children }) {
  const { currentUser, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return <AuthSplash />;
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function AppLayout({ children }) {
  const location = useLocation();
  const isPublicPage =
    location.pathname === '/login' || location.pathname === '/signup';

  if (isPublicPage) {
    return (
      <main className="app-main-public">
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </main>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <ToastProvider>
            <AppLayout>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />

                {/* Protected routes */}
                <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
                <Route path="/records" element={<RequireAuth><AllRecords /></RequireAuth>} />
                <Route path="/add" element={<RequireAuth><AddRecord /></RequireAuth>} />
                <Route path="/edit/:id" element={<RequireAuth><EditRecord /></RequireAuth>} />
                <Route path="/record/:id" element={<RequireAuth><RecordDetail /></RequireAuth>} />
                <Route path="/categories" element={<RequireAuth><Categories /></RequireAuth>} />
                <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />

                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppLayout>
          </ToastProvider>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
