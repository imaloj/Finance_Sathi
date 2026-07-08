import { useState, useEffect } from 'react';
import api from '../services/api';
import { format } from 'date-fns';
import { RefreshCw, Trash2, Plus, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { formatCurrency } from '../utils/currency';
import toast from 'react-hot-toast';

const FREQ_LABEL = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const RecurringTransactions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currency = user?.currency || 'USD';
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/recurring');
      setTemplates(res.data.data);
    } catch {
      toast.error('Failed to load recurring transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Remove recurring reminder for "${name}"?`)) return;
    setDeleting(id);
    try {
      await api.delete(`/recurring/${id}`);
      toast.success('Recurring transaction removed');
      setTemplates(prev => prev.filter(t => t._id !== id));
    } catch {
      toast.error('Failed to remove');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/transactions')}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Recurring Transactions</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage your scheduled reminders</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/transactions')}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add via Transactions
        </button>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 dark:text-gray-500 text-sm">Loading…</div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center">
            <RefreshCw size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="font-medium text-gray-500 dark:text-gray-400 mb-1">No recurring transactions</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              When adding a transaction, toggle &quot;Recurring&quot; to set up a reminder.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {templates.map(t => (
              <li key={t._id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    t.type === 'income'  ? 'bg-green-100 dark:bg-green-900/40' :
                    t.type === 'expense' ? 'bg-red-100 dark:bg-red-900/40' :
                    'bg-blue-100 dark:bg-blue-900/40'
                  }`}>
                    <RefreshCw size={15} className={
                      t.type === 'income'  ? 'text-green-600 dark:text-green-400' :
                      t.type === 'expense' ? 'text-red-600 dark:text-red-400' :
                      'text-blue-600 dark:text-blue-400'
                    } />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {t.category.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {FREQ_LABEL[t.frequency]} · next due {format(new Date(t.nextDueDate), 'dd MMM yyyy')}
                    </p>
                    {t.description && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{t.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <p className={`text-sm font-semibold ${
                    t.type === 'income'  ? 'text-green-600 dark:text-green-400' :
                    t.type === 'expense' ? 'text-red-600 dark:text-red-400' :
                    'text-blue-600 dark:text-blue-400'
                  }`}>
                    {formatCurrency(t.amount, currency)}
                  </p>
                  <button
                    onClick={() => handleDelete(t._id, t.category)}
                    disabled={deleting === t._id}
                    className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default RecurringTransactions;
