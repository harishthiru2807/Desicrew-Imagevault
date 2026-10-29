import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { AppProvider } from './context/AppContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { BottomNav, Sidebar } from './components/Navigation.jsx';
import { Lock } from 'lucide-react';

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

function PageLoader() {
  return (
    <div className="page-loader">
      <div className="spinner" />
    </div>
  );
}

function AppLayout({ children }) {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  // Only render public container on /login page
  if (isLoginPage) {
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
                {/* Authentication Page */}
                <Route path="/login" element={<Login />} />

                {/* Core Application Pages - Always Accessible */}
                <Route path="/" element={<Dashboard />} />
                <Route path="/records" element={<AllRecords />} />
                <Route path="/add" element={<AddRecord />} />
                <Route path="/edit/:id" element={<EditRecord />} />
                <Route path="/record/:id" element={<RecordDetail />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/profile" element={<Profile />} />

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
