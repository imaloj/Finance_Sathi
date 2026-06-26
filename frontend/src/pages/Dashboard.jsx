import { useState } from 'react';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, PiggyBank, Target, Wallet } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell as RechartsCell
} from 'recharts';
import { useDashboardRefresh } from '../hooks/useDashboardRefresh';
import useAuth from '../hooks/useAuth';
import useTheme from '../hooks/useTheme';
import CustomSelect from '../components/CustomSelect';
import SpendingTrends from '../components/SpendingTrends';
import { formatCurrency } from '../utils/currency';

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: format(new Date(2024, i, 1), 'MMMM'),
}));

const StatCard = ({ title, amount, icon: Icon, color, bg, currency }) => (
  <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg ${bg}`}>
        <Icon size={24} className={color} />
      </div>
    </div>
    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(amount, currency)}</p>
  </div>
);

const colorMap = {
  green: { bar: 'bg-green-500', text: 'text-green-600', warn: 'bg-yellow-400', danger: 'bg-red-500' },
  red:   { bar: 'bg-red-500',   text: 'text-red-600',   warn: 'bg-orange-400', danger: 'bg-red-700' },
  blue:  { bar: 'bg-blue-500',  text: 'text-blue-600',  warn: 'bg-yellow-400', danger: 'bg-red-500' },
};

const BudgetBar = ({ label, current, goal, color, higherIsBetter, currency }) => {
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
          <span className={`font-semibold ${c.text}`}>{formatCurrency(current, currency)}</span>
          {' / '}{formatCurrency(goal, currency)}
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

const CustomBarTooltip = ({ active, payload, label, tooltipBg, tooltipBorder, tooltipText, currency }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, color: tooltipText }}
      className="rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="font-semibold mb-1">{label}</p>
      <p style={{ color: payload[0].payload.color }} className="font-bold text-base">
        {formatCurrency(Number(payload[0].value), currency)}
      </p>
    </div>
  );
};

const PieCenterLabel = ({ activePieIndex, chartData, summary, axisColor, currency }) => {
  const cx = '50%', cy = '50%';
  const active = activePieIndex !== null ? chartData[activePieIndex] : null;
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-0.4em" fontSize="11" fill={axisColor}>
        {active ? active.name : 'Net'}
      </tspan>
      <tspan x={cx} dy="1.4em" fontSize="13" fontWeight="700"
        fill={active ? active.color : (summary?.net >= 0 ? '#10b981' : '#ef4444')}>
        {formatCurrency(active ? active.value : Math.abs(summary?.net || 0), currency)}
      </tspan>
    </text>
  );
};

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [activePieIndex, setActivePieIndex] = useState(null);
  const { summary, recentTransactions, runningBalance, loading, currentYear, activeMonth } = useDashboardRefresh(selectedMonth);
  const { user } = useAuth();
  const currency = user?.currency || 'USD';
  const { isDark } = useTheme();

  const COLORS = ['#10b981', '#ef4444', '#3b82f6'];
  const GRADIENTS = [
    { id: 'gradIncome',  start: '#34d399', end: '#059669' },
    { id: 'gradExpense', start: '#f87171', end: '#dc2626' },
    { id: 'gradSaving',  start: '#60a5fa', end: '#2563eb' },
  ];

  const chartData = summary ? [
    { name: 'Income',  value: summary.income,  color: COLORS[0] },
    { name: 'Expense', value: summary.expense, color: COLORS[1] },
    { name: 'Saving',  value: summary.saving,  color: COLORS[2] },
  ] : [];

  const gridColor  = isDark ? '#374151' : '#e5e7eb';
  const axisColor  = isDark ? '#9ca3af' : '#6b7280';
  const tooltipBg  = isDark ? '#1f2937' : '#ffffff';
  const tooltipBorder = isDark ? '#374151' : '#e5e7eb';
  const tooltipText = isDark ? '#f3f4f6' : '#111827';

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
        <StatCard title="Total Income"   amount={summary?.income || 0}  icon={TrendingUp}   color="text-green-600" bg="bg-green-50" currency={currency} />
        <StatCard title="Total Expenses" amount={summary?.expense || 0} icon={TrendingDown}  color="text-red-600"   bg="bg-red-50"   currency={currency} />
        <StatCard title="Total Savings"  amount={summary?.saving || 0}  icon={PiggyBank}    color="text-blue-600"  bg="bg-blue-50"  currency={currency} />
        <StatCard
          title="Net Balance"
          amount={summary?.net || 0}
          icon={PiggyBank}
          color={summary?.net >= 0 ? 'text-green-600' : 'text-red-600'}
          bg={summary?.net >= 0 ? 'bg-green-50' : 'bg-red-50'}
          currency={currency}
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
            {formatCurrency(Math.abs(runningBalance), currency)}
            {runningBalance < 0 && <span className="text-sm ml-1">deficit</span>}
          </p>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-gray-100">Monthly Overview</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">Income · Expenses · Savings</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barCategoryGap="35%" barGap={4}>
              <defs>
                {GRADIENTS.map(g => (
                  <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={g.start} stopOpacity={1} />
                    <stop offset="100%" stopColor={g.end}   stopOpacity={0.85} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: axisColor, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: axisColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                width={38}
              />
              <Tooltip content={<CustomBarTooltip tooltipBg={tooltipBg} tooltipBorder={tooltipBorder} tooltipText={tooltipText} currency={currency} />} cursor={{ fill: 'rgba(156,163,175,0.08)' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={56}>
                {chartData.map((entry, index) => (
                  <RechartsCell key={index} fill={`url(#${GRADIENTS[index].id})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-gray-100">Distribution</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Breakdown of this month</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <defs>
                {GRADIENTS.map(g => (
                  <radialGradient key={`r-${g.id}`} id={`r-${g.id}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%"   stopColor={g.start} stopOpacity={1} />
                    <stop offset="100%" stopColor={g.end}   stopOpacity={0.9} />
                  </radialGradient>
                ))}
              </defs>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
                onMouseEnter={(_, index) => setActivePieIndex(index)}
                onMouseLeave={() => setActivePieIndex(null)}
              >
                {chartData.map((entry, index) => (
                  <RechartsCell
                    key={index}
                    fill={`url(#r-${GRADIENTS[index].id})`}
                    opacity={activePieIndex === null || activePieIndex === index ? 1 : 0.45}
                    style={{ transition: 'opacity 0.2s, transform 0.2s', transformOrigin: 'center',
                      transform: activePieIndex === index ? 'scale(1.04)' : 'scale(1)' }}
                  />
                ))}
                <PieCenterLabel activePieIndex={activePieIndex} chartData={chartData} summary={summary} axisColor={axisColor} currency={currency} />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Custom legend with amounts */}
          <div className="flex justify-center gap-5 mt-2">
            {chartData.map((item, idx) => (
              <div key={item.name} className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{item.name}</span>
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                  {formatCurrency(item.value, currency)}
                </span>
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
              <BudgetBar label="Income Goal"    current={summary?.income || 0}  goal={user.monthlyIncomeGoal}     color="green" higherIsBetter={true}  currency={currency} />
            )}
            {user?.monthlyExpenseBudget > 0 && (
              <BudgetBar label="Expense Budget" current={summary?.expense || 0} goal={user.monthlyExpenseBudget}  color="red"   higherIsBetter={false} currency={currency} />
            )}
            {user?.monthlySavingGoal > 0 && (
              <BudgetBar label="Saving Goal"    current={summary?.saving || 0}  goal={user.monthlySavingGoal}     color="blue"  higherIsBetter={true}  currency={currency} />
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
            <div className="p-8 text-center">
              <div className="w-14 h-14 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <PiggyBank size={26} className="text-primary-500 dark:text-primary-400" />
              </div>
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">No transactions yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Start tracking your finances by adding your first transaction.</p>
              <a href="/transactions"
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                Add First Transaction
              </a>
            </div>
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
                    {txn.type === 'income' ? '+' : '-'} {formatCurrency(txn.amount, currency)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{format(new Date(txn.date), 'dd MMM yyyy')} · {format(new Date(txn.createdAt || txn.date), 'hh:mm a')}</p>
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
