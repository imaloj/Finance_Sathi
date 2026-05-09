import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Always check auth on app load (cookies handle session)
  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.data);
    } catch (error) {
      if (error.response?.status === 401) {
        setUser(null); // not logged in
      } else {
        console.error('Auth check failed:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Login (cookies will be set automatically by backend)
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      setUser(response.data.data.user);
      navigate('/');
    } catch (error) {
      throw error;
    }
  };

  // ✅ Register
  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      setUser(response.data.data.user);
      navigate('/');
    } catch (error) {
      throw error;
    }
  };

  // ✅ Logout (backend clears cookies)
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
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);