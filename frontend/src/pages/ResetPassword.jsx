import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import useTheme from '../hooks/useTheme';
import api from '../services/api';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const { isDark } = useTheme();
  const logo = isDark ? '/Dark%20mode%20web.png' : '/light%20mode%20web.png';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [pw, setPw] = useState({ new: '', confirm: '' });
  const [show, setShow] = useState({ new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-lg p-8 text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">Invalid or missing reset token.</p>
          <Link to="/forgot-password" className="text-primary-600 dark:text-primary-400 hover:underline text-sm">
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pw.new !== pw.confirm) { toast.error('Passwords do not match'); return; }
    if (pw.new.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: pw.new });
      setDone(true);
      toast.success('Password reset successfully!');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. The link may have expired.');
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

        {done ? (
          <div className="text-center space-y-4">
            <CheckCircle size={48} className="text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Password reset!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting you to login…</p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-center mb-2 text-gray-900 dark:text-gray-100">Create new password</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              Your new password must be at least 8 characters.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: 'New Password',     key: 'new' },
                { label: 'Confirm Password', key: 'confirm' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                  <div className="relative">
                    <input
                      type={show[key] ? 'text' : 'password'}
                      required
                      value={pw[key]}
                      onChange={e => setPw(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-full px-4 py-2 pr-10 focus:outline-none focus:border-purple-800 dark:focus:border-purple-500 hover:border-purple-800 dark:hover:border-purple-500 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      placeholder="••••••••"
                    />
                    <button type="button"
                      onClick={() => setShow(s => ({ ...s, [key]: !s[key] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                      {show[key] ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full border-2 border-purple-800 dark:border-purple-500 bg-white dark:bg-gray-900 text-black dark:text-gray-100 py-2.5 font-medium hover:bg-purple-800 dark:hover:bg-purple-700 hover:text-white transition-colors duration-200 disabled:opacity-50 mt-2"
              >
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>

            <p className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
              Remember it?{' '}
              <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">Log in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
