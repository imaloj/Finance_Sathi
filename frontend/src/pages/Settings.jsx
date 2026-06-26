import { useState } from 'react';
import useAuth from '../hooks/useAuth';
import useTheme from '../hooks/useTheme';
import api from '../services/api';
import {
  Save, Lock, Eye, EyeOff, Mail, User,
  Globe, Bell, ShieldCheck, ChevronDown, ChevronUp
} from 'lucide-react';
import ThemeSwitch from '../components/ThemeSwitch';
import CustomSelect from '../components/CustomSelect';
import { COUNTRY_OPTIONS, getCurrencyFromCountry } from '../utils/currency';
import toast from 'react-hot-toast';

const SectionCard = ({ icon: Icon, title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Icon size={17} className="text-primary-600 dark:text-primary-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
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

  const handlePasswordChange = async (e) => {
    e.preventDefault();
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
        <div className="flex items-center gap-4 mb-4">
          {/* Avatar placeholder */}
          <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 text-xl font-bold shrink-0">
            {(user?.name?.[0] || '?').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{user?.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Full Name</label>
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
