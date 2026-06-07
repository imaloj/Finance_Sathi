import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wallet, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(formData.email, formData.password);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4 transition-colors duration-200">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-lg p-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Wallet size={32} className="text-primary-600 dark:text-primary-400" />
          <h1 className="text-2xl font-bold text-purple-600 dark:text-purple-400">Budget Sathi</h1>
        </div>

        <h2 className="text-xl font-semibold text-center mb-8 text-gray-900 dark:text-gray-100">Welcome!!!</h2>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block w-full text-left text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-full hover:border-purple-800 dark:hover:border-purple-500 px-4 py-2 focus:outline-none focus:border-purple-800 dark:focus:border-purple-500 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block w-full text-left text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-full px-4 py-2 pr-10 hover:border-purple-800 dark:hover:border-purple-500 focus:outline-none focus:border-purple-800 dark:focus:border-purple-500 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full border-2 border-purple-800 dark:border-purple-500 bg-white dark:bg-gray-900 text-black dark:text-gray-100 py-2.5 font-medium hover:bg-purple-800 dark:hover:bg-purple-700 hover:text-white transition-colors mt-4 mb-6 duration-200 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="text-center mt-9 text-sm text-gray-800 dark:text-gray-400">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-black dark:text-gray-200 font-medium hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
