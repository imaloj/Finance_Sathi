import { useState } from 'react';
import useAuth from '../hooks/useAuth';
import useTheme from '../hooks/useTheme';
import api from '../services/api';
import { Save, AlertTriangle } from 'lucide-react';
import ThemeSwitch from '../components/ThemeSwitch';
import CustomSelect from '../components/CustomSelect';
import { COUNTRY_OPTIONS, getCurrencyFromCountry } from '../utils/currency';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    country: user?.country || '',
    monthlyIncomeGoal: user?.monthlyIncomeGoal || '',
    monthlyExpenseBudget: user?.monthlyExpenseBudget || '',
    monthlySavingGoal: user?.monthlySavingGoal || '',
    initialBalance: user?.initialBalance || ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const response = await api.put('/auth/profile', formData);
      updateUser(response.data.data); // sync updated user (with new currency) immediately
      setMessage('Settings updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    }
  };

  const inputClass = 'w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500';

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Settings</h2>

      {message && (
        <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
          <Save size={18} />
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* Appearance */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Appearance</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark Mode</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {isDark ? 'Currently using dark theme' : 'Currently using light theme'}
            </p>
          </div>
          <ThemeSwitch />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Country
            {formData.country && (
              <span className="ml-2 text-xs text-primary-600 dark:text-primary-400 font-normal">
                → {getCurrencyFromCountry(formData.country)} currency
              </span>
            )}
          </label>
          <CustomSelect
            value={formData.country}
            onChange={(val) => setFormData({ ...formData, country: val })}
            options={COUNTRY_OPTIONS}
            placeholder="Select your country..."
            searchable
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Currency is set automatically based on your country
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly Income Goal</label>
            <input
              type="number"
              min="0"
              value={formData.monthlyIncomeGoal}
              onChange={(e) => setFormData({ ...formData, monthlyIncomeGoal: e.target.value })}
              className={inputClass}
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expense Budget</label>
            <input
              type="number"
              min="0"
              value={formData.monthlyExpenseBudget}
              onChange={(e) => setFormData({ ...formData, monthlyExpenseBudget: e.target.value })}
              className={inputClass}
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Saving Goal</label>
            <input
              type="number"
              min="0"
              value={formData.monthlySavingGoal}
              onChange={(e) => setFormData({ ...formData, monthlySavingGoal: e.target.value })}
              className={inputClass}
              placeholder="0"
            />
          </div>
        </div>

        {/* Initial Balance */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Initial Balance
          </label>
          <input
            type="number"
            min="0"
            value={formData.initialBalance}
            onChange={(e) => setFormData({ ...formData, initialBalance: e.target.value })}
            className={inputClass}
            placeholder="0"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Your account balance before you started using Budget Sathi. Used to calculate your running balance.
          </p>
        </div>

        <button
          type="submit"
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          <Save size={18} />
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default Settings;
