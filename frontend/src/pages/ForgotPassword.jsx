import { useState } from 'react';
import { Link } from 'react-router-dom';
import useTheme from '../hooks/useTheme';
import api from '../services/api';
import { Mail, ArrowLeft } from 'lucide-react';

const ForgotPassword = () => {
  const { isDark } = useTheme();
  const logo = isDark ? '/Dark%20mode%20web.png' : '/light%20mode%20web.png';
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4 transition-colors duration-200">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-lg p-8">
        <div className="flex items-center justify-center mb-6">
          <img src={logo} alt="Budget Sathi" className="h-14 w-auto" />
        </div>

        {submitted ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <Mail size={26} className="text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Check your email</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              If an account exists for <strong>{email}</strong>, we've sent a password reset link. Check your inbox and spam folder.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">The link expires in 1 hour.</p>
            <Link to="/login"
              className="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline mt-4">
              <ArrowLeft size={14} /> Back to Login
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-center mb-2 text-gray-900 dark:text-gray-100">Forgot your password?</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              Enter your email and we'll send you a reset link.
            </p>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email address</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-full px-4 py-2 focus:outline-none focus:border-purple-800 dark:focus:border-purple-500 hover:border-purple-800 dark:hover:border-purple-500 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full border-2 border-purple-800 dark:border-purple-500 bg-white dark:bg-gray-900 text-black dark:text-gray-100 py-2.5 font-medium hover:bg-purple-800 dark:hover:bg-purple-700 hover:text-white transition-colors duration-200 disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>

            <p className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
              <Link to="/login" className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline">
                <ArrowLeft size={13} /> Back to Login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
