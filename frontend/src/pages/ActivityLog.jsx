import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import {
  Shield, Lock, RotateCcw, LogIn, LogOut, Key,
  Settings, Plus, Pencil, Trash2, AlertTriangle, Eye, EyeOff, ChevronLeft,
  Sparkles, Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import PinInput from '../components/PinInput';
import toast from 'react-hot-toast';

const EVENT_META = {
  login:                    { icon: LogIn,         color: 'text-green-600 dark:text-green-400',    bg: 'bg-green-50 dark:bg-green-900/20',    label: 'Login' },
  logout:                   { icon: LogOut,        color: 'text-gray-500 dark:text-gray-400',      bg: 'bg-gray-50 dark:bg-gray-800',          label: 'Logout' },
  login_failed:             { icon: AlertTriangle, color: 'text-red-600 dark:text-red-400',        bg: 'bg-red-50 dark:bg-red-900/20',         label: 'Failed Login' },
  password_changed:         { icon: Key,           color: 'text-orange-600 dark:text-orange-400',  bg: 'bg-orange-50 dark:bg-orange-900/20',   label: 'Password Changed' },
  password_reset_requested: { icon: RotateCcw,     color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20',   label: 'Password Reset' },
  email_verified:           { icon: Shield,        color: 'text-blue-600 dark:text-blue-400',      bg: 'bg-blue-50 dark:bg-blue-900/20',       label: 'Email Verified' },
  account_settings_updated: { icon: Settings,      color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20',   label: 'Settings Updated' },
  transaction_added:        { icon: Plus,          color: 'text-green-600 dark:text-green-400',    bg: 'bg-green-50 dark:bg-green-900/20',     label: 'Transaction Added' },
  transaction_edited:       { icon: Pencil,        color: 'text-blue-600 dark:text-blue-400',      bg: 'bg-blue-50 dark:bg-blue-900/20',       label: 'Transaction Edited' },
  transaction_deleted:      { icon: Trash2,        color: 'text-red-600 dark:text-red-400',        bg: 'bg-red-50 dark:bg-red-900/20',         label: 'Transaction Deleted' },
  account_deletion_failed:  { icon: AlertTriangle, color: 'text-red-600 dark:text-red-400',        bg: 'bg-red-50 dark:bg-red-900/20',         label: 'Deletion Attempt Failed' },
  activity_pin_set:         { icon: Lock,          color: 'text-primary-600 dark:text-primary-400',bg: 'bg-primary-50 dark:bg-primary-900/20', label: 'Activity PIN Set' },
  activity_log_accessed:    { icon: Eye,           color: 'text-gray-500 dark:text-gray-400',      bg: 'bg-gray-50 dark:bg-gray-800',          label: 'Activity Log Accessed' },
  ai_report_generated:      { icon: Sparkles,      color: 'text-purple-600 dark:text-purple-400',  bg: 'bg-purple-50 dark:bg-purple-900/20',   label: 'AI Report Generated' },
  report_downloaded:        { icon: Download,      color: 'text-indigo-600 dark:text-indigo-400',  bg: 'bg-indigo-50 dark:bg-indigo-900/20',   label: 'Report Downloaded' },
};

const STAGES = { SET_PIN: 'set_pin', CONFIRM_PIN: 'confirm_pin', ENTER_PIN: 'enter_pin', FORGOT_PIN: 'forgot_pin', LOG: 'log' };
const MAX_ATTEMPTS = 5;

const PinScreen = ({ title, subtitle, onComplete, isError, disabled, attemptsLeft, onForgot }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-8 py-12">
    <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
      <Lock size={28} className="text-primary-600 dark:text-primary-400" />
    </div>
    <div className="text-center">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">{subtitle}</p>
    </div>
    <PinInput onComplete={onComplete} error={isError} disabled={disabled} />
    {attemptsLeft !== null && attemptsLeft > 0 && attemptsLeft < MAX_ATTEMPTS && (
      <p className="text-xs text-orange-500 dark:text-orange-400">
        {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining
      </p>
    )}
    {onForgot && (
      <button
        type="button"
        onClick={onForgot}
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
      >
        Forgot PIN?
      </button>
    )}
  </div>
);

const ActivityLog = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stage, setStage] = useState(
    user?.hasActivityLogPin ? STAGES.ENTER_PIN : STAGES.SET_PIN
  );
  const [logs, setLogs] = useState([]);
  const [pinError, setPinError] = useState(false);
  const [pinAttempts, setPinAttempts] = useState(0);
  const [newPin, setNewPin] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot PIN state
  const [forgotPassword, setForgotPassword] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [showForgotPw, setShowForgotPw] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const showPinError = useCallback(() => {
    setPinError(true);
    setTimeout(() => setPinError(false), 600);
  }, []);

  const handleSetPin = (pin) => {
    setNewPin(pin);
    setStage(STAGES.CONFIRM_PIN);
  };

  const handleConfirmPin = async (confirmedPin) => {
    if (confirmedPin !== newPin) {
      showPinError();
      toast.error('PINs do not match. Try again.');
      setTimeout(() => { setStage(STAGES.SET_PIN); setNewPin(''); }, 800);
      return;
    }
    setLoading(true);
    try {
      await api.post('/activity-log/set-pin', { pin: confirmedPin });
      toast.success('PIN set! Now enter it to view your activity log.');
      setStage(STAGES.ENTER_PIN);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to set PIN');
      setStage(STAGES.SET_PIN);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPin = async (pin) => {
    setLoading(true);
    try {
      const res = await api.post('/activity-log/verify', { pin });
      setLogs(res.data.data);
      setPinAttempts(0);
      setStage(STAGES.LOG);
    } catch {
      const newAttempts = pinAttempts + 1;
      setPinAttempts(newAttempts);
      showPinError();
      if (newAttempts >= MAX_ATTEMPTS) {
        toast.error('Too many failed attempts.');
        setTimeout(() => navigate('/settings'), 1500);
      } else {
        toast.error(`Incorrect PIN. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts !== 1 ? 's' : ''} remaining.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPin = async () => {
    if (!forgotPassword) { setForgotPasswordError('Password is required'); return; }
    setForgotLoading(true);
    setForgotPasswordError('');
    try {
      await api.post('/activity-log/reset-pin', { password: forgotPassword });
      toast.success('PIN reset. Set a new one.');
      setForgotPassword('');
      setPinAttempts(0);
      setStage(STAGES.SET_PIN);
    } catch (err) {
      setForgotPasswordError(err.response?.data?.message || 'Incorrect password');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/settings')}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Activity Log</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Protected by your private PIN</p>
        </div>
      </div>

      {stage === STAGES.SET_PIN && (
        <PinScreen
          title="Set your Activity PIN"
          subtitle="Create a 6-digit PIN to protect your activity log. This is separate from your account password."
          onComplete={handleSetPin}
          isError={pinError}
          disabled={loading}
          attemptsLeft={null}
          onForgot={null}
        />
      )}

      {stage === STAGES.CONFIRM_PIN && (
        <PinScreen
          title="Confirm your PIN"
          subtitle="Re-enter your 6-digit PIN to confirm."
          onComplete={handleConfirmPin}
          isError={pinError}
          disabled={loading}
          attemptsLeft={null}
          onForgot={null}
        />
      )}

      {stage === STAGES.ENTER_PIN && (
        <PinScreen
          title="Enter your Activity PIN"
          subtitle="Enter your 6-digit PIN to access your activity log."
          onComplete={handleVerifyPin}
          isError={pinError}
          disabled={loading}
          attemptsLeft={MAX_ATTEMPTS - pinAttempts}
          onForgot={() => setStage(STAGES.FORGOT_PIN)}
        />
      )}

      {/* Forgot PIN screen */}
      {stage === STAGES.FORGOT_PIN && (
        <div className="min-h-[60vh] flex flex-col items-center justify-center py-12">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Key size={28} className="text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Reset Activity PIN</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter your account password to verify your identity
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Password</label>
              <div className="relative">
                <input
                  type={showForgotPw ? 'text' : 'password'}
                  value={forgotPassword}
                  onChange={e => { setForgotPassword(e.target.value); setForgotPasswordError(''); }}
                  className={`w-full border rounded-lg px-3 py-2 pr-10 text-sm outline-none focus:ring-2 ring-offset-0
                    bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                    ${forgotPasswordError
                      ? 'border-red-500 focus:ring-red-400'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500'
                    }`}
                  placeholder="••••••••"
                  onKeyDown={e => e.key === 'Enter' && handleForgotPin()}
                />
                <button type="button"
                  onClick={() => setShowForgotPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                  {showForgotPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {forgotPasswordError && (
                <p className="text-xs text-red-500 mt-1">{forgotPasswordError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setStage(STAGES.ENTER_PIN); setForgotPassword(''); setForgotPasswordError(''); }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleForgotPin}
                disabled={forgotLoading || !forgotPassword}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                {forgotLoading ? 'Verifying…' : 'Reset PIN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Log */}
      {stage === STAGES.LOG && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-primary-600 dark:text-primary-400" />
              <span className="font-semibold text-gray-900 dark:text-gray-100">Recent Activity</span>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">{logs.length} events</span>
          </div>

          {logs.length === 0 ? (
            <div className="p-12 text-center text-gray-400 dark:text-gray-500">
              <Shield size={32} className="mx-auto mb-3 opacity-40" />
              <p>No activity recorded yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {logs.map(log => {
                const meta = EVENT_META[log.event] || EVENT_META.login;
                const Icon = meta.icon;
                return (
                  <li key={log._id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${meta.bg}`}>
                      <Icon size={16} className={meta.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{meta.label}</p>
                      {log.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{log.description}</p>
                      )}
                      {log.userAgent && log.userAgent !== 'Unknown device' && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{log.userAgent}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(log.createdAt), 'dd MMM yyyy')}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{format(new Date(log.createdAt), 'hh:mm a')}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
