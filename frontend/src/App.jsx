import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import useAuth from './hooks/useAuth';
import useTheme from './hooks/useTheme';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import MonthlyReport from './pages/MonthlyReport';
import Settings from './pages/Settings';

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


const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/login" />;
};
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" /> : children;
};
function App() {
  return (
      <Router>
        <AuthProvider>
        <ThemedToaster />
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/" element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="reports" element={<MonthlyReport />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;