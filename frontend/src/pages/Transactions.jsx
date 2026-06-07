import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import useDashboardRefresh from '../hooks/useDashboardRefresh';
import CustomSelect from '../components/CustomSelect';

const CATEGORIES = {
  income: ['salary', 'freelance', 'investment', 'gift', 'other_income'],
  expense: ['food', 'transport', 'housing', 'utilities', 'healthcare', 'entertainment', 'shopping', 'education', 'personal', 'other_expense'],
  saving: ['emergency_fund', 'retirement', 'investment', 'goal_based', 'other_saving'],
};

// Static option arrays for CustomSelect
const TYPE_OPTIONS = [
  { value: 'income',  label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'saving',  label: 'Saving' },
];

const FILTER_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  ...TYPE_OPTIONS,
];

const MONTH_OPTIONS = [
  { value: '', label: 'All Months' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: format(new Date(2024, i, 1), 'MMMM'),
  })),
];

const buildCategoryOptions = (type) => [
  { value: '', label: 'Select category' },
  ...CATEGORIES[type].map((cat) => ({
    value: cat,
    label: cat.replace(/_/g, ' '),
  })),
];

const CURRENT_YEAR = new Date().getFullYear();

const getYearError = (yearStr) => {
  if (!yearStr || yearStr.length < 4) return null;
  const y = parseInt(yearStr);
  if (y < 2000) return 'Year must be 2000 AD or later';
  if (y > CURRENT_YEAR) return `Year cannot exceed ${CURRENT_YEAR}`;
  return null;
};

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [filters, setFilters] = useState({ month: '', year: '', type: '' });
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  const { optimisticAddTransaction, triggerRefresh } = useDashboardRefresh();

  const fetchTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await api.get(`/transactions?${params}`);
      setTransactions(response.data.data);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, [filters]);

  useEffect(() => {
    // Validate year (must be 4 digits if set, and within valid range)
    if (filters.year && (filters.year.length !== 4 || getYearError(filters.year))) return;
    // Validate month (1–12 if set) — parse to number first
    const m = parseInt(filters.month);
    if (filters.month && (m < 1 || m > 12)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTransactions();
  }, [filters, fetchTransactions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/transactions/${editingId}`, formData);
      } else {
        const response = await api.post('/transactions', formData);
        optimisticAddTransaction(response.data.data);
      }
      setShowModal(false);
      setEditingId(null);
      resetForm();
      await fetchTransactions();
      triggerRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/transactions/${id}`);
      await fetchTransactions();
      triggerRefresh();
    } catch {
      alert('Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (txn) => {
    setEditingId(txn._id);
    setFormData({
      type: txn.type,
      amount: txn.amount,
      category: txn.category,
      description: txn.description || '',
      date: format(new Date(txn.date), 'yyyy-MM-dd'),
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      type: 'expense',
      amount: '',
      category: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const filteredTransactions = search.trim()
    ? transactions.filter((txn) => {
        const q = search.toLowerCase();
        return (
          txn.category.replace(/_/g, ' ').toLowerCase().includes(q) ||
          (txn.description || '').toLowerCase().includes(q) ||
          txn.type.toLowerCase().includes(q)
        );
      })
    : transactions;

  const inputClass =
    'w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-gray-400 dark:placeholder:text-gray-500';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Transactions</h2>
          <p className="text-gray-500 dark:text-gray-400">Manage your income, expenses, and savings</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditingId(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          <Plus size={18} />
          Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-50">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by category, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>

        {/* Type filter */}
        <CustomSelect
          value={filters.type}
          onChange={(val) => setFilters({ ...filters, type: val })}
          options={FILTER_TYPE_OPTIONS}
          className="w-36"
        />

        {/* Month filter */}
        <CustomSelect
          value={filters.month}
          onChange={(val) => setFilters({ ...filters, month: val })}
          options={MONTH_OPTIONS}
          className="w-36"
        />

        {/* Year filter */}
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Year"
            value={filters.year}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              if (val.length <= 4) setFilters({ ...filters, year: val });
            }}
            className={`border rounded-lg px-3 py-2 w-24 text-sm focus:outline-none focus:ring-2 transition-colors
              bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
              placeholder:text-gray-400 dark:placeholder:text-gray-500
              ${getYearError(filters.year)
                ? 'border-red-500 dark:border-red-500 focus:ring-red-400'
                : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500'
              }`}
          />
          {getYearError(filters.year) && (
            <p className="absolute top-full left-0 mt-1 text-xs text-red-500 dark:text-red-400 whitespace-wrap">
              {getYearError(filters.year)}
            </p>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {search.trim() && (
          <div className="px-6 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
            {filteredTransactions.length} result{filteredTransactions.length !== 1 ? 's' : ''} for &quot;{search}&quot;
          </div>
        )}
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Date</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Type</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Category</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Description</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Amount</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-12 text-gray-500 dark:text-gray-400">
                  {search.trim() ? `No transactions matching "${search}"` : 'No transactions found'}
                </td>
              </tr>
            ) : (
              filteredTransactions.map((txn) => (
                <tr key={txn._id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {format(new Date(txn.date), 'dd MMM yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      txn.type === 'income'  ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' :
                      txn.type === 'expense' ? 'bg-red-100   dark:bg-red-900/40   text-red-800   dark:text-red-300'   :
                                               'bg-blue-100  dark:bg-blue-900/40  text-blue-800  dark:text-blue-300'
                    }`}>
                      {txn.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 capitalize">
                    {txn.category.replace(/_/g, ' ')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {txn.description || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-right text-gray-900 dark:text-gray-100">
                    Rs {txn.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(txn)}
                      className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mr-3 transition-colors"
                      aria-label="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(txn._id)}
                      disabled={deletingId === txn._id}
                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-40"
                      aria-label="Delete"
                    >
                      {deletingId === txn._id ? (
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editingId ? 'Edit Transaction' : 'Add Transaction'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <CustomSelect
                  value={formData.type}
                  onChange={(val) => setFormData({ ...formData, type: val, category: '' })}
                  options={TYPE_OPTIONS}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <CustomSelect
                  value={formData.category}
                  onChange={(val) => setFormData({ ...formData, category: val })}
                  options={buildCategoryOptions(formData.type)}
                  placeholder="Select category"
                  searchable
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (रु)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className={inputClass}
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <input
                  type="date"
                  required
                  min="2000-01-01"
                  max={format(new Date(), 'yyyy-MM-dd')}
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className={inputClass}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <input
                  type="text"
                  maxLength="200"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={inputClass}
                  placeholder="Optional note..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-60"
                >
                  {submitting && (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  )}
                  {submitting ? 'Saving...' : editingId ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
