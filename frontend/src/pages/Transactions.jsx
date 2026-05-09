import { useState, useEffect } from 'react';
import api from '../services/api';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import useDashboardRefresh from '../hooks/useDashboardRefresh';
const CATEGORIES = {
  income: ['salary', 'freelance', 'investment', 'gift', 'other_income'],
  expense: ['food', 'transport', 'housing', 'utilities', 'healthcare', 'entertainment', 'shopping', 'education', 'personal', 'other_expense'],
  saving: ['emergency_fund', 'retirement', 'investment', 'goal_based', 'other_saving']
};

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({ month: '', year: '', type: '' });
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });
  const [submitting, setSubmitting]= useState(false);
  const {optimisticAddTransaction, triggerRefresh } = useDashboardRefresh();

  useEffect(() => {
    if(filters.year && filters.year.length !== 4) return; // Basic validation for year input
    if(filters.month && (filters.month < 1 || filters.month > 12)) return; // Basic validation for month input
    fetchTransactions();
  }, [filters]);

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await api.get(`/transactions?${params}`);
      setTransactions(response.data.data);
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/transactions/${editingId}`, formData);
      } else {
        const response = await api.post('/transactions', formData);
        const newTransaction = response.data.data;

        optimisticAddTransaction(newTransaction);
      }
      setShowModal(false);
      setEditingId(null);
      resetForm();
      fetchTransactions();

      triggerRefresh(); // Refresh dashboard data after adding/editing transaction
    } catch (error) {
      alert(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await api.delete(`/transactions/${id}`);
      fetchTransactions();
      triggerRefresh(); // Refresh dashboard data after deletion
    } catch (error) {
      alert('Delete failed');
    }
  };

  const handleEdit = (txn) => {
    setEditingId(txn._id);
    setFormData({
      type: txn.type,
      amount: txn.amount,
      category: txn.category,
      description: txn.description || '',
      date: format(new Date(txn.date), 'yyyy-MM-dd')
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      type: 'expense',
      amount: '',
      category: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd')
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transactions</h2>
          <p className="text-gray-500">Manage your income, expenses, and savings</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditingId(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={20} />
          Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex gap-4">
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="saving">Saving</option>
        </select>
        <select
          value={filters.month}
          onChange={(e) => setFilters({ ...filters, month: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">All Months</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{format(new Date(2024, i, 1), 'MMMM')}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Year"
          value={filters.year}
          onChange={(e) => {const value= e.target.value;
            if(value.length <= 4){
            setFilters({ ...filters, year: e.target.value });
          }
          }}
          className="border border-gray-300 rounded-lg px-3 py-2 w-24 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Date</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Type</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Category</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Description</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Amount</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-12 text-gray-500">No transactions found</td>
              </tr>
            ) : (
              transactions.map((txn) => (
                <tr key={txn._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {format(new Date(txn.date), 'dd MMM yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      txn.type === 'income' ? 'bg-green-100 text-green-800' :
                      txn.type === 'expense' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {txn.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                    {txn.category.replace(/_/g, ' ')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {txn.description || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-right">
                    Rs {txn.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleEdit(txn)} className="text-gray-400 hover:text-primary-600 mr-3">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDelete(txn._id)} className="text-gray-400 hover:text-red-600">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {editingId ? 'Edit Transaction' : 'Add Transaction'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value, category: '' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="saving">Saving</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select category</option>
                  {CATEGORIES[formData.type].map(cat => (
                    <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (रु)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  maxLength="200"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  placeholder="Optional note..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {editingId ? 'Update' : 'Add'}
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