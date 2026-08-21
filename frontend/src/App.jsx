import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import useAuth from './hooks/useAuth';
import useTheme from './hooks/useTheme';
import useIdleTimeout from './hooks/useIdleTimeout';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useEffect } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import MonthlyReport from './pages/MonthlyReport';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import AppLoader from './components/AppLoader';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ActivityLog from './pages/ActivityLog';
import RecurringTransactions from './pages/RecurringTransactions';

const ThemedToaster = () => {
  const { isDark } = useTheme();
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3500,
        style: {
          borderRadius: '10px',
          fontSize: '14px',
          background: isDark ? '#1f2937' : '#ffffff',
          color:      isDark ? '#f3f4f6' : '#111827',
          border:     isDark ? '1px solid #374151' : '1px solid #e5e7eb',
        },
        success: {
          style: {
            background: isDark ? '#052e16' : '#f0fdf4',
            color:      isDark ? '#86efac' : '#166534',
            border:     isDark ? '1px solid #166534' : '1px solid #bbf7d0',
          },
          iconTheme: {
            primary:   isDark ? '#4ade80' : '#16a34a',
            secondary: isDark ? '#052e16' : '#f0fdf4',
          },
        },
        error: {
          style: {
            background: isDark ? '#450a0a' : '#fef2f2',
            color:      isDark ? '#fca5a5' : '#991b1b',
            border:     isDark ? '1px solid #991b1b' : '1px solid #fecaca',
          },
          iconTheme: {
            primary:   isDark ? '#f87171' : '#dc2626',
            secondary: isDark ? '#450a0a' : '#fef2f2',
          },
        },
      }}
    />
  );
};


function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

function AppRoutes() {
  const { isAuthenticated, loading, updateUser, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Idle timeout — log out after 10 min of inactivity, warn at 9 min
  useIdleTimeout(
    () => {
      toast('Logged out due to inactivity', { icon: '🔒' });
      logout();
    },
    10 * 60 * 1000, // 10 minutes
    isAuthenticated
  );

  // Warn user 1 minute before logout
  useIdleTimeout(
    () => { toast('You will be logged out in 1 minute due to inactivity', { icon: '⚠️', duration: 8000 }); },
    9 * 60 * 1000,  // 9 minutes
    isAuthenticated
  );

  // Show toast when redirected back after email verification
  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      toast.success('Email verified successfully! ✅');
      updateUser({ isEmailVerified: true });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, updateUser]);

  if (loading) return <AppLoader />;

  return (
    <>
      <ThemedToaster />
      <Routes>
        <Route path="/login"          element={!isAuthenticated ? <Login />          : <Navigate to="/" />} />
        <Route path="/register"       element={!isAuthenticated ? <Register />       : <Navigate to="/" />} />
        <Route path="/forgot-password" element={!isAuthenticated ? <ForgotPassword /> : <Navigate to="/" />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="recurring" element={<RecurringTransactions />} />
          <Route path="reports"      element={<Reports />} />
          <Route path="settings"     element={<Settings />} />
          <Route path="activity-log" element={<ActivityLog />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;