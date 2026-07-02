import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Shield, Lock, RotateCcw, LogIn, LogOut, Key, Settings, Plus, Pencil, Trash2, AlertTriangle, Eye, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import PinInput from '../components/PinInput';
import toast from 'react-hot-toast';

const EVENT_META = {
  login:                    { icon: LogIn,        color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-900/20',  label: 'Login' },
  logout:                   { icon: LogOut,       color: 'text-gray-500 dark:text-gray-400',    bg: 'bg-gray-50 dark:bg-gray-800',        label: 'Logout' },
  login_failed:             { icon: AlertTriangle,color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-900/20',       label: 'Failed Login' },
  password_changed:         { icon: Key,          color: 'text-orange-600 dark:text-orange-400',bg: 'bg-orange-50 dark:bg-orange-900/20', label: 'Password Changed' },
  password_reset_requested: { icon: RotateCcw,    color: 'text-yellow-600 dark:text-yellow-400',bg: 'bg-yellow-50 dark:bg-yellow-900/20', label: 'Password Reset' },
  email_verified:           { icon: Shield,       color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/20',     label: 'Email Verified' },
  account_settings_updated: { icon: Settings,     color: 'text-purple-600 dark:text-purple-400',bg: 'bg-purple-50 dark:bg-purple-900/20', label: 'Settings Updated' },
  transaction_added:        { icon: Plus,         color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20',   label: 'Transaction Added' },
  transaction_edited:       { icon: Pencil,       color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/20',     label: 'Transaction Edited' },
  transaction_deleted:      { icon: Trash2,       color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-900/20',       label: 'Transaction Deleted' },
  account_deletion_failed:  { icon: AlertTriangle,color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-900/20',       label: 'Deletion Attempt Failed' },
  activity_pin_set:         { icon: Lock,         color: 'text-primary-600 dark:text-primary-400',bg: 'bg-primary-50 dark:bg-primary-900/20', label: 'Activity PIN Set' },
  activity_log_accessed:    { icon: Eye,          color: 'text-gray-500 dark:text-gray-400',   bg: 'bg-gray-50 dark:bg-gray-800',        label: 'Activity Log Accessed' },
};

const STAGES = { CHECKING: 'checking', SET_PIN: 'set_pin', CONFIRM_PIN: 'confirm_pin', ENTER_PIN: 'enter_pin', LOG: 'log' };

const ActivityLog = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stage, setStage] = useState(STAGES.CHECKING);
  const [logs, setLogs] = useState([]);
  const [pinError, setPinError] = useState(false);
  const [pinAttempts, setPinAttempts] = useState(0);
  const [newPin, setNewPin] = useState('');
  const [loading, setLoading] = useState(false);
  const pinRef = useRef(null);

  const MAX_ATTEMPTS = 5;

  useEffect(() => {
    // Determine flow based on whether PIN is set
    if (user?.hasActivityLogPin) {
      setStage(STAGES.ENTER_PIN);
    } else {
      setStage(STAGES.SET_PIN);
    }
  }, [user]);

  const handleSetPin = async (pin) => {
    setNewPin(pin);
    setStage(STAGES.CONFIRM_PIN);
  };

  const handleConfirmPin = async (confirmedPin) => {
    if (confirmedPin !== newPin) {
      setPinError(true);
      toast.error('PINs do not match. Try again.');
      setTimeout(() => { setPinError(false); setStage(STAGES.SET_PIN); setNewPin(''); }, 1000);
      return;
    }
    setLoading(true);
    try {
      await api.post('/activity-log/set-pin', { pin: confirmedPin });
      toast.success('PIN set! Now enter it to view your activity log.');
      setStage(STAGES.ENTER_PIN);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set PIN');
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
    } catch (err) {
      const newAttempts = pinAttempts + 1;
      setPinAttempts(newAttempts);
      setPinError(true);
      setTimeout(() => setPinError(false), 600);
      if (newAttempts >= MAX_ATTEMPTS) {
        toast.error('Too many failed attempts. Redirecting.');
        setTimeout(() => navigate('/settings'), 1500);
      } else {
        toast.error(`Incorrect PIN. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts !== 1 ? 's' : ''} remaining.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const PinScreen = ({ title, subtitle, onComplete, isError }) => (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-8 py-12">
      <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
        <Lock size={28} className="text-primary-600 dark:text-primary-400" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">{subtitle}</p>
      </div>
      <PinInput
        ref={pinRef}
        onComplete={onComplete}
        error={isError}
        disabled={loading}
      />
      {pinAttempts > 0 && stage === STAGES.ENTER_PIN && (
        <p className="text-xs text-orange-500 dark:text-orange-400">
          {MAX_ATTEMPTS - pinAttempts} attempt{MAX_ATTEMPTS - pinAttempts !== 1 ? 's' : ''} remaining
        </p>
      )}
    </div>
  );

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

      {/* Stages */}
      {stage === STAGES.SET_PIN && (
        <PinScreen
          title="Set your Activity PIN"
          subtitle="Create a 6-digit PIN to protect your activity log. This is separate from your account password."
          onComplete={handleSetPin}
          isError={pinError}
        />
      )}

      {stage === STAGES.CONFIRM_PIN && (
        <PinScreen
          title="Confirm your PIN"
          subtitle="Re-enter your 6-digit PIN to confirm."
          onComplete={handleConfirmPin}
          isError={pinError}
        />
      )}

      {stage === STAGES.ENTER_PIN && (
        <PinScreen
          title="Enter your Activity PIN"
          subtitle="Enter your 6-digit PIN to access your activity log."
          onComplete={handleVerifyPin}
          isError={pinError}
        />
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
