import { useState, useEffect } from 'react';
import { RefreshCw, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../utils/currency';
import useAuth from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const DueRecurringBanner = ({ onTransactionAdded }) => {
  const { user } = useAuth();
  const currency = user?.currency || 'USD';
  const [dueItems, setDueItems] = useState([]);
  const [expanded, setExpanded] = useState(true);
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    fetchDue();
  }, []);

  const fetchDue = async () => {
    try {
      const res = await api.get('/recurring/due');
      setDueItems(res.data.data);
    } catch {
      // silently fail
    }
  };

  const handleAdd = async (item) => {
    setProcessing(p => ({ ...p, [item._id]: 'adding' }));
    try {
      await api.post(`/recurring/${item._id}/add`);
      toast.success(`Added: ${item.category.replace(/_/g, ' ')} — ${formatCurrency(item.amount, currency)}`);
      setDueItems(prev => prev.filter(d => d._id !== item._id));
      onTransactionAdded?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add transaction');
    } finally {
      setProcessing(p => ({ ...p, [item._id]: null }));
    }
  };

  const handleSkip = async (item) => {
    setProcessing(p => ({ ...p, [item._id]: 'skipping' }));
    try {
      await api.post(`/recurring/${item._id}/skip`);
      toast.success(`Skipped: ${item.category.replace(/_/g, ' ')}`);
      setDueItems(prev => prev.filter(d => d._id !== item._id));
    } catch {
      toast.error('Failed to skip');
    } finally {
      setProcessing(p => ({ ...p, [item._id]: null }));
    }
  };

  if (dueItems.length === 0) return null;

  const isOverdue = (item) => new Date(item.nextDueDate) < new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-5 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <RefreshCw size={16} className="text-primary-600 dark:text-primary-400" />
          <span className="text-sm font-semibold text-primary-800 dark:text-primary-200">
            {dueItems.length} recurring transaction{dueItems.length !== 1 ? 's' : ''} due
          </span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-primary-400" /> : <ChevronDown size={16} className="text-primary-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-3 border-t border-primary-200 dark:border-primary-700 pt-3">
          {dueItems.map(item => (
            <div key={item._id} className="flex items-center justify-between gap-3 bg-white dark:bg-gray-900 rounded-lg px-4 py-3 border border-primary-100 dark:border-primary-800">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {item.category.replace(/_/g, ' ')}
                  </p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    item.type === 'income' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
                    item.type === 'expense' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' :
                    'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                  }`}>{item.type}</span>
                  {isOverdue(item) && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-medium">overdue</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {formatCurrency(item.amount, currency)} · {item.frequency} · due {format(new Date(item.nextDueDate), 'dd MMM')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleSkip(item)}
                  disabled={!!processing[item._id]}
                  className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-40"
                  title="Skip this time"
                >
                  <X size={14} />
                </button>
                <button
                  onClick={() => handleAdd(item)}
                  disabled={!!processing[item._id]}
                  className="flex items-center gap-1 text-xs bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Plus size={12} />
                  {processing[item._id] === 'adding' ? 'Adding…' : 'Add Now'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DueRecurringBanner;
