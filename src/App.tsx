import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import LandingPage from './components/public/LandingPage';
import DocsPage from './components/public/DocsPage';
import SupportPage from './components/public/SupportPage';
import AuthPage from './components/auth/AuthPage';
import UsernameSetup from './components/auth/UsernameSetup';
import Workspace from './components/app/Workspace';
import AdminLayout from './components/admin/AdminLayout';

function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>
      Loading…
    </div>
  );
}

/** /auth — send already-authenticated users straight into the app. */
function AuthRoute() {
  const { user, isInitializing } = useAuthStore();
  if (isInitializing) return <Loading />;
  if (user) return <Navigate to="/app" replace />;
  return <AuthPage />;
}

/** /app — require an authenticated user; prompt for a username if missing. */
function AppRoute() {
  const { user, profile, isInitializing, isLoadingProfile } = useAuthStore();
  if (isInitializing || isLoadingProfile) return <Loading />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile?.username) return <UsernameSetup />;
  return <Workspace />;
}

/** /admin — require an authenticated admin; everyone else goes to the app. */
function AdminRoute() {
  const { user, profile, isInitializing, isLoadingProfile } = useAuthStore();
  if (isInitializing || isLoadingProfile) return <Loading />;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.role !== 'admin') return <Navigate to="/app" replace />;
  return <AdminLayout />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/docs" element={<DocsPage />} />
      <Route path="/support" element={<SupportPage />} />
      <Route path="/auth" element={<AuthRoute />} />
      <Route path="/app" element={<AppRoute />} />
      <Route path="/admin/*" element={<AdminRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
