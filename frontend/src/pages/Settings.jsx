import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Save, AlertTriangle } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    currency: user?.currency || 'NPR',
    monthlyIncomeGoal: user?.monthlyIncomeGoal || '',
    monthlyExpenseBudget: user?.monthlyExpenseBudget || '',
    monthlySavingGoal: user?.monthlySavingGoal || ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await api.put('/auth/profile', formData);
      setMessage('Settings updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>

      {message && (
        <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
          <Save size={18} />
          {message}
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <select
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
          >
            <option value="NPR">रु NPR (Nepalese Rupaiya)</option>
            <option value="USD">$ USD (US Dollar)</option>
            <option value="EUR">€ EUR (Euro)</option>
            <option value="GBP">£ GBP (British Pound)</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income Goal</label>
            <input
              type="number"
              min="0"
              value={formData.monthlyIncomeGoal}
              onChange={(e) => setFormData({ ...formData, monthlyIncomeGoal: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expense Budget</label>
            <input
              type="number"
              min="0"
              value={formData.monthlyExpenseBudget}
              onChange={(e) => setFormData({ ...formData, monthlyExpenseBudget: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Saving Goal</label>
            <input
              type="number"
              min="0"
              value={formData.monthlySavingGoal}
              onChange={(e) => setFormData({ ...formData, monthlySavingGoal: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
              placeholder="0"
            />
          </div>
        </div>

        <button
          type="submit"
          className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Save size={18} />
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default Settings;