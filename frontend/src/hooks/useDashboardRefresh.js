import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api from '../services/api';

// Custom event for cross-component communication
const DASHBOARD_REFRESH_EVENT = 'dashboard:refresh';

export const useDashboardRefresh = () => {
  const [summary, setSummary] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Use ref to track latest data for optimistic updates
  const summaryRef = useRef(summary);
  const transactionsRef = useRef(recentTransactions);
  
  useEffect(() => {
    summaryRef.current = summary;
  }, [summary]);
  
  useEffect(() => {
    transactionsRef.current = recentTransactions;
  }, [recentTransactions]);

  const currentMonth = useMemo(() => new Date().getMonth() + 1, []);
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const fetchDashboardData = useCallback(async (options = {}) => {
    const { silent = false, cacheBuster = false } = options;
    
    if (!silent) setLoading(true);
    setError('');
    
    try {
      // Add cache-busting timestamp to force fresh data
      const timestamp = cacheBuster ? `?_t=${Date.now()}` : '';
      
      const [summaryRes, txnsRes] = await Promise.all([
        api.get(`/transactions/summary/${currentYear}/${currentMonth}${timestamp}`),
        api.get(`/transactions?limit=5${cacheBuster ? `&_t=${Date.now()}` : ''}`)
      ]);
      
      setSummary(summaryRes.data.data);
      setRecentTransactions(txnsRes.data.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [currentMonth, currentYear]);

  // Optimistic update: Add transaction to UI immediately
  const optimisticAddTransaction = useCallback((transaction) => {
    // Update recent transactions list
    setRecentTransactions(prev => {
      const updated = [transaction, ...prev].slice(0, 5);
      return updated;
    });
    
    // Update summary totals optimistically
    setSummary(prev => {
      if (!prev) return prev;
      const amount = parseFloat(transaction.amount) || 0;
      const updated = { ...prev };
      
      if (transaction.type === 'income') updated.income += amount;
      else if (transaction.type === 'expense') updated.expense += amount;
      else if (transaction.type === 'saving') updated.saving += amount;
      
      updated.net = updated.income - updated.expense - updated.saving;
      return updated;
    });
  }, []);

  // Optimistic update: Remove transaction from UI
  const optimisticRemoveTransaction = useCallback((transactionId) => {
    setRecentTransactions(prev => prev.filter(t => t._id !== transactionId));
    // Summary will be corrected on next fetch
  }, []);

  // Listen for refresh events from other components
  useEffect(() => {
    const handleRefresh = () => {
      fetchDashboardData({ silent: true, cacheBuster: true });
    };
    
    window.addEventListener(DASHBOARD_REFRESH_EVENT, handleRefresh);
    return () => window.removeEventListener(DASHBOARD_REFRESH_EVENT, handleRefresh);
  }, [fetchDashboardData]);

  // Trigger refresh event for other components
  const triggerRefresh = useCallback(() => {
    window.dispatchEvent(new CustomEvent(DASHBOARD_REFRESH_EVENT));
  }, []);

  // Initial load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh every 30 seconds (for multi-tab sync)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData({ silent: true });
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  return {
    summary,
    recentTransactions,
    loading,
    error,
    fetchDashboardData,
    optimisticAddTransaction,
    optimisticRemoveTransaction,
    triggerRefresh,
    currentMonth,
    currentYear
  };
};

export default useDashboardRefresh;