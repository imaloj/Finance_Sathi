import { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import useTheme from '../hooks/useTheme';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import {
  Save, Lock, Eye, EyeOff, Mail, User,
  Globe, Bell, ShieldCheck, ChevronDown, ChevronUp, Trash2, ClipboardList, Pencil
} from 'lucide-react';
import ThemeSwitch from '../components/ThemeSwitch';
import CustomSelect from '../components/CustomSelect';
import AvatarUpload from '../components/AvatarUpload';
import { COUNTRY_OPTIONS, getCurrencyFromCountry } from '../utils/currency';
import toast from 'react-hot-toast';

const SectionCard = ({ icon: Icon, title, children, defaultOpen = true, collapsible = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        type="button"
        onClick={() => collapsible && setOpen(p => !p)}
        className={`w-full flex items-center justify-between px-5 py-4 text-left ${!collapsible ? 'cursor-default' : ''}`}
      >
        <div className="flex items-center gap-2">
          <Icon size={17} className="text-primary-600 dark:text-primary-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</span>
        </div>
        {collapsible && (open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />)}
      </button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">{children}</div>}
    </div>
  );
};

const Toggle = ({ checked, onChange, label, description }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="min-w-0">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
      {description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  </div>
);

const Settings = () => {
  const { user, updateUser, logout } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const inputClass = 'w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500';

  // Profile + Preferences + Goals + Notifications — one form, one save
  const [form, setForm] = useState({
    name: user?.name || '',
    country: user?.country || '',
    monthlyIncomeGoal: user?.monthlyIncomeGoal || '',
    monthlyExpenseBudget: user?.monthlyExpenseBudget || '',
    monthlySavingGoal: user?.monthlySavingGoal || '',
    initialBalance: user?.initialBalance || '',
    monthlyReportEmail: user?.monthlyReportEmail ?? true,
  });
  const [saving, setSaving] = useState(false);

  // Password form
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ current: '', new: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);

  // Delete account
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePw, setShowDeletePw] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteAttempts, setDeleteAttempts] = useState(0);
  const [deleteLockUntil, setDeleteLockUntil] = useState(null);
  const [deletePasswordError, setDeletePasswordError] = useState('');

  const [now, setNow] = useState(() => Date.now());
  // Update "now" every 30 seconds so the countdown stays fresh
  useEffect(() => {
    if (!deleteLockUntil) return;
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [deleteLockUntil]);

  const MAX_DELETE_ATTEMPTS = 3;
  const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

  const isDeleteLocked = deleteLockUntil && now < deleteLockUntil;
  const lockMinutesLeft = isDeleteLocked
    ? Math.ceil((deleteLockUntil - now) / 60000)
    : 0;

  const confirmTextMatch = deleteConfirmText === 'DELETE MY ACCOUNT';
  const confirmTextTouched = deleteConfirmText.length > 0;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', form);
      updateUser(res.data.data);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {    e.preventDefault();
    if (pw.new !== pw.confirm) { toast.error('Passwords do not match'); return; }
    if (pw.new.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setPwSaving(true);
    try {
      await api.put('/auth/change-password', { currentPassword: pw.current, newPassword: pw.new });
      toast.success('Password changed. Logging out…');
      setTimeout(() => logout(), 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed');
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (isDeleteLocked) return;
    if (!confirmTextMatch) { toast.error('Type DELETE MY ACCOUNT to confirm'); return; }
    if (!deletePassword) { toast.error('Password is required'); return; }
    setDeleting(true);
    setDeletePasswordError('');
    try {
      await api.delete('/auth/account', { data: { password: deletePassword } });
      toast.success('Account deleted');
      setTimeout(() => logout(), 1000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Deletion failed';
      const newAttempts = deleteAttempts + 1;
      setDeleteAttempts(newAttempts);
      if (newAttempts >= MAX_DELETE_ATTEMPTS) {
        const lockUntil = Date.now() + COOLDOWN_MS;
        setDeleteLockUntil(lockUntil);
        setDeleteAttempts(0);
        setDeletePassword('');
        setDeleteConfirmText('');
        toast.error('Too many failed attempts. Try again in 1 hour.');
      } else {
        setDeletePasswordError(msg);
        toast.error(`${msg} (${MAX_DELETE_ATTEMPTS - newAttempts} attempt${MAX_DELETE_ATTEMPTS - newAttempts !== 1 ? 's' : ''} remaining)`);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h2>
        <button
          type="submit"
          disabled={saving}
          className="hidden lg:flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Email verification banner */}
      {!user?.isEmailVerified && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 px-4 py-3 rounded-lg flex items-start gap-3">
          <Mail size={16} className="text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Your email is not verified. Check your inbox for the verification link.
          </p>
        </div>
      )}

      {/* ── Account Settings (full width) ── */}
      <SectionCard icon={User} title="Account Settings">
        <div className="max-h-64 overflow-y-auto pr-1 space-y-4">
          <AvatarUpload />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Full Name
              <span className="inline-flex items-center gap-0.5 text-primary-500 dark:text-primary-400">
                <Pencil size={10} />
                <span className="text-[10px] font-normal">editable</span>
              </span>
            </label>
            <input type="text" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
            <input type="email" value={user?.email || ''} readOnly
              className={`${inputClass} opacity-60 cursor-not-allowed`} />
          </div>
        </div>

        {/* Activity Log + Delete account — stacked, delete deliberately subdued */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
          {/* Activity Log — prominent */}
          <button
            type="button"
            onClick={() => navigate('/activity-log')}
            className="flex items-center gap-2 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors font-medium"
          >
            <ClipboardList size={13} />
            Activity Log
          </button>

          {/* Delete Account — deliberately muted and separated */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setDeleteOpen(p => !p)}
              className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              <Trash2 size={12} />
              <span>Delete Account</span>
              {deleteOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          </div>
        </div>
        </div> {/* end scrollable wrapper */}

          {deleteOpen && (
            <div className="mt-3 space-y-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
              {isDeleteLocked ? (
                <div className="text-center py-2">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">Account deletion locked</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Too many failed attempts. Try again in <strong>{lockMinutesLeft} minute{lockMinutesLeft !== 1 ? 's' : ''}</strong>.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    This permanently deletes your account and all data. <strong>Cannot be undone.</strong>
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Type <span className="font-bold text-red-600">DELETE MY ACCOUNT</span> to confirm
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={e => setDeleteConfirmText(e.target.value)}
                      className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 placeholder:text-gray-400
                        bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                        ${confirmTextTouched && !confirmTextMatch
                          ? 'border border-red-500 focus:ring-red-400'
                          : confirmTextMatch
                          ? 'border border-green-500 focus:ring-green-400'
                          : 'border border-red-300 dark:border-red-700 focus:ring-red-500'
                        }`}
                      placeholder="DELETE MY ACCOUNT"
                    />
                    {confirmTextTouched && !confirmTextMatch && (
                      <p className="text-xs text-red-500 mt-1">Text doesn&apos;t match. Type exactly: DELETE MY ACCOUNT</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Your password</label>
                    <div className="relative">
                      <input
                        type={showDeletePw ? 'text' : 'password'}
                        value={deletePassword}
                        onChange={e => { setDeletePassword(e.target.value); setDeletePasswordError(''); }}
                        className={`w-full rounded-lg px-3 py-2 pr-9 text-xs focus:outline-none focus:ring-2 placeholder:text-gray-400
                          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                          ${deletePasswordError
                            ? 'border border-red-500 focus:ring-red-400'
                            : 'border border-red-300 dark:border-red-700 focus:ring-red-500'
                          }`}
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={() => setShowDeletePw(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showDeletePw ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                    {deletePasswordError && (
                      <p className="text-xs text-red-500 mt-1">{deletePasswordError}</p>
                    )}
                    {deleteAttempts > 0 && (
                      <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">
                        {MAX_DELETE_ATTEMPTS - deleteAttempts} attempt{MAX_DELETE_ATTEMPTS - deleteAttempts !== 1 ? 's' : ''} remaining before 1-hour lockout
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleting || !confirmTextMatch || !deletePassword}
                    className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={12} />
                    {deleting ? 'Deleting…' : 'Delete My Account'}
                  </button>
                </>
              )}
            </div>
          )}
      </SectionCard>

      {/* ── Two-column grid (collapses on mobile) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT COLUMN */}
        <div className="space-y-6">

          {/* Preferences */}
          <SectionCard icon={Globe} title="Preferences">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Country
                {form.country && (
                  <span className="ml-2 text-primary-600 dark:text-primary-400 font-normal">
                    → {getCurrencyFromCountry(form.country)}
                  </span>
                )}
              </label>
              <CustomSelect
                value={form.country}
                onChange={val => setForm(p => ({ ...p, country: val }))}
                options={COUNTRY_OPTIONS}
                placeholder="Select country…"
                searchable
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Currency is set automatically</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark Mode</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {isDark ? 'Currently dark theme' : 'Currently light theme'}
                </p>
              </div>
              <ThemeSwitch />
            </div>
          </SectionCard>

          {/* Financial Goals */}
          <SectionCard icon={Save} title="Financial Goals">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Monthly Income Goal</label>
                <input type="number" min="0" value={form.monthlyIncomeGoal}
                  onChange={e => setForm(p => ({ ...p, monthlyIncomeGoal: e.target.value }))}
                  className={inputClass} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Expense Budget</label>
                <input type="number" min="0" value={form.monthlyExpenseBudget}
                  onChange={e => setForm(p => ({ ...p, monthlyExpenseBudget: e.target.value }))}
                  className={inputClass} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Saving Goal</label>
                <input type="number" min="0" value={form.monthlySavingGoal}
                  onChange={e => setForm(p => ({ ...p, monthlySavingGoal: e.target.value }))}
                  className={inputClass} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Initial Balance</label>
                <input type="number" min="0" value={form.initialBalance}
                  onChange={e => setForm(p => ({ ...p, initialBalance: e.target.value }))}
                  className={inputClass} placeholder="0" />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Balance before using Budget Sathi</p>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">

          {/* Notifications */}
          <SectionCard icon={Bell} title="Notifications">
            <Toggle
              checked={form.monthlyReportEmail}
              onChange={() => setForm(p => ({ ...p, monthlyReportEmail: !p.monthlyReportEmail }))}
              label="Monthly Summary Reports"
              description="Receive your financial report PDF on the 1st of each month"
            />
          </SectionCard>

          {/* Security */}
          <SectionCard icon={ShieldCheck} title="Security">
            <button
              type="button"
              onClick={() => setPwOpen(p => !p)}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <span className="flex items-center gap-2"><Lock size={15} /> Change Password</span>
              {pwOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {pwOpen && (
              <div className="mt-3 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
                {[
                  { label: 'Current Password', key: 'current' },
                  { label: 'New Password',     key: 'new' },
                  { label: 'Confirm Password', key: 'confirm' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                    <div className="relative">
                      <input
                        type={showPw[key] ? 'text' : 'password'}
                        value={pw[key]}
                        onChange={e => setPw(p => ({ ...p, [key]: e.target.value }))}
                        className={`${inputClass} pr-9`}
                        placeholder="••••••••"
                      />
                      <button type="button"
                        onClick={() => setShowPw(p => ({ ...p, [key]: !p[key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                        {showPw[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  After changing, you will be logged out of all sessions.
                </p>
                <button
                  type="button"
                  onClick={handlePasswordChange}
                  disabled={pwSaving}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-60"
                >
                  <Lock size={14} />
                  {pwSaving ? 'Changing…' : 'Change Password'}
                </button>
              </div>
            )}
          </SectionCard>

        </div>
      </div>

      {/* Save button — shown at bottom on all screen sizes, hidden on desktop (header button used instead) */}
      <div className="lg:hidden">
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

export default Settings;
