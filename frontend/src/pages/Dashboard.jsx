import { useState } from 'react';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, PiggyBank, Target, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useDashboardRefresh } from '../hooks/useDashboardRefresh';
import useAuth from '../hooks/useAuth';import CustomSelect from '../components/CustomSelect';
import SpendingTrends from '../components/SpendingTrends';

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: format(new Date(2024, i, 1), 'MMMM'),
}));

const StatCard = ({ title, amount, icon: Icon, color, bg }) => (
  <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg ${bg}`}>
        <Icon size={24} className={color} />
      </div>
    </div>
    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">₹{amount.toLocaleString()}</p>
  </div>
);

const colorMap = {
  green: { bar: 'bg-green-500', text: 'text-green-600', warn: 'bg-yellow-400', danger: 'bg-red-500' },
  red:   { bar: 'bg-red-500',   text: 'text-red-600',   warn: 'bg-orange-400', danger: 'bg-red-700' },
  blue:  { bar: 'bg-blue-500',  text: 'text-blue-600',  warn: 'bg-yellow-400', danger: 'bg-red-500' },
};

const BudgetBar = ({ label, current, goal, color, higherIsBetter }) => {
  const pct = Math.min((current / goal) * 100, 100);
  const c = colorMap[color];

  let barColor = c.bar;
  if (!higherIsBetter) {
    if (pct >= 100) barColor = c.danger;
    else if (pct >= 80) barColor = c.warn;
  }

  const statusText = higherIsBetter
    ? pct >= 100 ? '🎯 Goal reached!' : `${(100 - pct).toFixed(0)}% to go`
    : pct >= 100 ? '⚠️ Over budget' : pct >= 80 ? '⚠️ Near limit' : 'On track';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          <span className={`font-semibold ${c.text}`}>₹{current.toLocaleString()}</span>
          {' / '}₹{goal.toLocaleString()}
        </span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-400 dark:text-gray-500">{pct.toFixed(0)}% used</span>
        <span className="text-xs text-gray-400 dark:text-gray-500">{statusText}</span>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const { summary, recentTransactions, runningBalance, loading, currentYear, activeMonth } = useDashboardRefresh(selectedMonth);
  const { user } = useAuth();

  const chartData = summary ? [
    { name: 'Income', value: summary.income, color: '#10b981' },
    { name: 'Expense', value: summary.expense, color: '#ef4444' },
    { name: 'Saving', value: summary.saving, color: '#3b82f6' }
  ] : [];

  const COLORS = ['#10b981', '#ef4444', '#3b82f6'];

  if (loading) return <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading dashboard...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h2>
          <p className="text-gray-500 dark:text-gray-400">
            {format(new Date(currentYear, activeMonth - 1), 'MMMM yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Viewing:</span>
          <CustomSelect
            value={selectedMonth}
            onChange={(val) => setSelectedMonth(val)}
            options={MONTH_OPTIONS}
            className="w-40"
          />
        </div>
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

      {/* Running Balance */}
      {runningBalance !== null && (
        <div className={`flex items-center justify-between px-6 py-4 rounded-xl border ${
          runningBalance >= 0
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${runningBalance >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
              <Wallet size={20} className={runningBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Running Balance</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total accumulated across all time</p>
            </div>
          </div>
          <p className={`text-2xl font-bold ${runningBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            ₹{Math.abs(runningBalance).toLocaleString()}
            {runningBalance < 0 && <span className="text-sm ml-1">deficit</span>}
          </p>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border-2 hover:border-purple-600 border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Monthly Overview</h3>
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

        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border-2 hover:border-purple-500 border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Distribution</h3>
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
                {chartData.map((_entry, index) => (
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
                <span className="text-sm text-gray-600 dark:text-gray-400">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Spending Trends */}
      <SpendingTrends />

      {/* Budget Progress */}
      {(user?.monthlyExpenseBudget > 0 || user?.monthlySavingGoal > 0 || user?.monthlyIncomeGoal > 0) && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-5">
            <Target size={20} className="text-primary-600 dark:text-primary-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Monthly Goals</h3>
          </div>
          <div className="space-y-5">
            {user?.monthlyIncomeGoal > 0 && (
              <BudgetBar
                label="Income Goal"
                current={summary?.income || 0}
                goal={user.monthlyIncomeGoal}
                color="green"
                higherIsBetter={true}
              />
            )}
            {user?.monthlyExpenseBudget > 0 && (
              <BudgetBar
                label="Expense Budget"
                current={summary?.expense || 0}
                goal={user.monthlyExpenseBudget}
                color="red"
                higherIsBetter={false}
              />
            )}
            {user?.monthlySavingGoal > 0 && (
              <BudgetBar
                label="Saving Goal"
                current={summary?.saving || 0}
                goal={user.monthlySavingGoal}
                color="blue"
                higherIsBetter={true}
              />
            )}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Goals can be updated in{' '}
            <a href="/settings" className="text-primary-600 hover:underline">Settings</a>
          </p>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Transactions</h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {recentTransactions.length === 0 ? (
            <p className="p-6 text-gray-500 dark:text-gray-400 text-center">No transactions yet</p>
          ) : (
            recentTransactions.map((txn) => (
              <div key={txn._id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">{txn.category.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{txn.description || 'No description'}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    txn.type === 'income' ? 'text-green-600' :
                    txn.type === 'expense' ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {txn.type === 'income' ? '+' : '-'} ₹{txn.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{format(new Date(txn.date), 'dd MMM yyyy')}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
