import { useState, useEffect } from 'react';
import api from '../services/api';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useDashboardRefresh } from '../hooks/useDashboardRefresh';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, txnsRes] = await Promise.all([
        api.get(`/transactions/summary/${currentYear}/${currentMonth}`),
        api.get('/transactions?limit=5')
      ]);
      setSummary(summaryRes.data.data);
      setRecentTransactions(txnsRes.data.data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = summary ? [
    { name: 'Income', value: summary.income, color: '#10b981' },
    { name: 'Expense', value: summary.expense, color: '#ef4444' },
    { name: 'Saving', value: summary.saving, color: '#3b82f6' }
  ] : [];

  const COLORS = ['#10b981', '#ef4444', '#3b82f6'];

  if (loading) return <div className="text-center py-12">Loading dashboard...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500">{format(new Date(), 'MMMM yyyy')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          title="Total Income" 
          amount={summary?.income || 0} 
          icon={TrendingUp} 
          color="text-green-600" 
          bg="bg-green-50"
        />
        <StatCard 
          title="Total Expenses" 
          amount={summary?.expense || 0} 
          icon={TrendingDown} 
          color="text-red-600" 
          bg="bg-red-50"
        />
        <StatCard 
          title="Total Savings" 
          amount={summary?.saving || 0} 
          icon={PiggyBank} 
          color="text-blue-600" 
          bg="bg-blue-50"
        />
        <StatCard 
          title="Net Balance" 
          amount={summary?.net || 0} 
          icon={PiggyBank} 
          color={summary?.net >= 0 ? 'text-green-600' : 'text-red-600'} 
          bg={summary?.net >= 0 ? 'bg-green-50' : 'bg-red-50'}
        />

      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Monthly Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `Rs ${value.toLocaleString()}`} />
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>


        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `Rs ${value.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-4">
            {chartData.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                <span className="text-sm text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Recent Transactions</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentTransactions.length === 0 ? (
            <p className="p-6 text-gray-500 text-center">No transactions yet</p>
          ) : (
            recentTransactions.map((txn) => (
              <div key={txn._id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900 capitalize">{txn.category.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-gray-500">{txn.description || 'No description'}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    txn.type === 'income' ? 'text-green-600' : 
                    txn.type === 'expense' ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {txn.type === 'income' ? '+' : '-'} ₹{txn.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">{format(new Date(txn.date), 'dd MMM yyyy')}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, amount, icon: Icon, color, bg }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg ${bg}`}>
        <Icon size={24} className={color} />
      </div>
    </div>
    <p className="text-sm text-gray-500 mb-1">{title}</p>
    <p className="text-2xl font-bold text-gray-900">₹{amount.toLocaleString()}</p>
  </div>
);

export default Dashboard;