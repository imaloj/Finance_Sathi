import { createContext, useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasUserRef = useRef(false);

  // Defined before useEffect so it's in scope
  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.data);
    } catch (error) {
      if (error.response?.status === 401) {
        setUser(null);
      } else {
        console.error('Auth check failed:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Only fetch user on app load if we don't already have one (page refresh case)
  useEffect(() => {
    if (!hasUserRef.current) {
      fetchUser();
    }
  }, []);

  // Login — user data comes from login response, no extra /me call needed
  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    hasUserRef.current = true;
    setUser(response.data.data.user);
    setLoading(false);
    toast.success('Login Successful!!!', { duration: 3000, icon: '✅' });
    navigate('/');
  };

  // Register — same pattern
  const register = async (userData) => {
    const response = await api.post('/auth/register', userData);
    hasUserRef.current = true;
    setUser(response.data.data.user);
    setLoading(false);
    navigate('/');
  };

  // Logout
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      navigate('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

