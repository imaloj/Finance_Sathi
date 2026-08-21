import { useState } from 'react';
import api from '../services/api';
import {
  Sparkles, Loader2, Download, AlertCircle,
  Lightbulb, TrendingUp, TrendingDown, BarChart2
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { formatCurrency } from '../utils/currency';

const CURRENT_YEAR = new Date().getFullYear();

const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

const getYearError = (y) => {
  const num = parseInt(y);
  if (!y || String(y).length < 4) return null;
  if (num < 2000) return 'Year must be 2000 AD or later';
  if (num > CURRENT_YEAR) return `Year cannot exceed ${CURRENT_YEAR}`;
  return null;
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const AnnualReport = () => {
  const [year, setYear]           = useState(String(CURRENT_YEAR));
  const [report, setReport]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError]         = useState('');

  const { user } = useAuth();
  const currency  = user?.currency || 'USD';
  const fmt       = (n) => formatCurrency(typeof n === 'number' ? n : 0, currency);
  const pct       = (n) => typeof n === 'number' ? `${n > 0 ? '+' : ''}${n.toFixed(1)}%` : '—';

  const yearError  = getYearError(year);
  const isYearValid = year.length === 4 && !yearError;

  const generateReport = async () => {
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const res = await api.post(`/reports/annual/${parseInt(year)}`);
      setReport(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate annual report');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/reports/annual/pdf/${parseInt(year)}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = `BudgetSathi_Annual_Report_${year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const getScoreColor = (s) => s >= 80 ? 'text-green-600 dark:text-green-400' : s >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';
  const getScoreBg    = (s) => s >= 80 ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700' : s >= 60 ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700';
  const getScoreLabel = (s) => s >= 80 ? 'Excellent Year' : s >= 60 ? 'Good Year' : s >= 40 ? 'Fair' : 'Needs Improvement';

  const thBase = 'py-3 px-4 font-semibold border-b text-sm';
  const tdBase = 'py-2.5 px-4 text-sm';
  const sectionBorder = 'px-6 py-5 border-b border-gray-200 dark:border-gray-700';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Controls */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={year}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                if (val.length <= 4) setYear(val);
              }}
              className={`border rounded-lg px-4 py-2 w-28 text-sm focus:outline-none focus:ring-2 transition-colors
                bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                ${yearError
                  ? 'border-red-500 dark:border-red-500 focus:ring-red-400'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500'
                }`}
            />
            {yearError && (
              <p className="absolute top-full left-0 mt-1 text-xs text-red-500 dark:text-red-400 whitespace-nowrap">
                {yearError}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={generateReport}
          disabled={loading || !isYearValid}
          className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2.5 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {loading ? 'Analyzing...' : `Generate ${year} Report`}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 overflow-hidden">

          {/* Title */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center uppercase tracking-wide">
              Annual Financial Summary Report
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
              Financial Year {year}
            </p>
          </div>

          {/* Score */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Annual Health Score</p>
              <p className={`text-3xl font-bold ${getScoreColor(report.financialHealthScore)}`}>
                {report.financialHealthScore}/100
              </p>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{getScoreLabel(report.financialHealthScore)}</p>
            </div>
            <div className={`px-4 py-3 rounded-lg border ${getScoreBg(report.financialHealthScore)}`}>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Status</p>
              <p className={`text-lg font-bold ${getScoreColor(report.financialHealthScore)}`}>
                {report.financialHealthScore >= 60 ? 'On Track' : 'Needs Attention'}
              </p>
            </div>
          </div>

          {/* Summary cards */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Income',   value: fmt(report.totals?.income),   color: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
              { label: 'Total Expenses', value: fmt(report.totals?.expense),  color: 'text-red-700 dark:text-red-400',   bg: 'bg-red-50 dark:bg-red-900/20' },
              { label: 'Total Savings',  value: fmt(report.totals?.saving),   color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { label: 'Net Cash Flow',  value: fmt(report.totals?.net),      color: report.totals?.net >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400', bg: 'bg-gray-50 dark:bg-gray-800' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-lg p-3 border border-gray-200 dark:border-gray-700`}>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
                <p className={`text-base font-bold ${color} mt-1`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Overview */}
          <div className={sectionBorder}>
            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wide">1. Year at a Glance</h4>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed text-justify">{report.summary}</p>
          </div>

          {/* Monthly Breakdown Table */}
          <div className={sectionBorder}>
            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide flex items-center gap-2">
              <BarChart2 size={18} className="text-primary-600" />
              2. Month-by-Month Breakdown
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 dark:border-gray-700">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className={`${thBase} text-left text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600`}>Month</th>
                    <th className={`${thBase} text-right text-green-700 dark:text-green-400 border-gray-200 dark:border-gray-600`}>Income</th>
                    <th className={`${thBase} text-right text-red-700 dark:text-red-400   border-gray-200 dark:border-gray-600`}>Expenses</th>
                    <th className={`${thBase} text-right text-blue-700 dark:text-blue-400  border-gray-200 dark:border-gray-600`}>Savings</th>
                    <th className={`${thBase} text-right text-gray-700 dark:text-gray-300  border-gray-200 dark:border-gray-600`}>Net</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900">
                  {report.monthlyBreakdown?.map((m) => {
                    const hasData = m.income > 0 || m.expense > 0 || m.saving > 0;
                    return (
                      <tr key={m.month} className={`border-b border-gray-100 dark:border-gray-700 ${!hasData ? 'opacity-40' : ''}`}>
                        <td className={`${tdBase} font-medium text-gray-900 dark:text-gray-100`}>{MONTH_NAMES[m.month - 1]}</td>
                        <td className={`${tdBase} text-right text-gray-700 dark:text-gray-300`}>{hasData ? fmt(m.income)  : '—'}</td>
                        <td className={`${tdBase} text-right text-gray-700 dark:text-gray-300`}>{hasData ? fmt(m.expense) : '—'}</td>
                        <td className={`${tdBase} text-right text-gray-700 dark:text-gray-300`}>{hasData ? fmt(m.saving)  : '—'}</td>
                        <td className={`${tdBase} text-right font-semibold ${m.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {hasData ? fmt(m.net) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 font-bold">
                    <td className={`${tdBase} text-gray-900 dark:text-gray-100`}>Annual Total</td>
                    <td className={`${tdBase} text-right text-green-700 dark:text-green-400`}>{fmt(report.totals?.income)}</td>
                    <td className={`${tdBase} text-right text-red-700 dark:text-red-400`}>{fmt(report.totals?.expense)}</td>
                    <td className={`${tdBase} text-right text-blue-700 dark:text-blue-400`}>{fmt(report.totals?.saving)}</td>
                    <td className={`${tdBase} text-right ${(report.totals?.net || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {fmt(report.totals?.net)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Year-over-Year */}
          {report.yearOverYear && (
            <div className={sectionBorder}>
              <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">3. Year-over-Year Comparison</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Income Change',  value: report.yearOverYear.incomeChange,  positive: true  },
                  { label: 'Expense Change', value: report.yearOverYear.expenseChange, positive: false },
                  { label: 'Saving Change',  value: report.yearOverYear.savingChange,  positive: true  },
                ].map(({ label, value, positive }) => {
                  const isGood = positive ? value >= 0 : value <= 0;
                  const Icon   = value >= 0 ? TrendingUp : TrendingDown;
                  return (
                    <div key={label} className={`rounded-lg p-4 border flex items-center gap-3
                      ${isGood ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'}`}>
                      <Icon size={22} className={isGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{label} vs {parseInt(year) - 1}</p>
                        <p className={`text-lg font-bold ${isGood ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                          {pct(value)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Categories */}
          {report.topCategories?.length > 0 && (
            <div className={sectionBorder}>
              <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">
                {report.yearOverYear ? '4.' : '3.'} Top Spending Categories
              </h4>
              <div className="space-y-2">
                {report.topCategories.map((cat) => (
                  <div key={cat.category} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 dark:text-gray-300 w-32 capitalize shrink-0">
                      {cat.category.replace(/_/g, ' ')}
                    </span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                      <div
                        className="bg-primary-500 h-2.5 rounded-full"
                        style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-16 text-right shrink-0">
                      {cat.percentage}%
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 w-28 text-right shrink-0">
                      {fmt(cat.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Highlights */}
          <div className={sectionBorder}>
            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">5. Key Highlights</h4>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700">
              <ul className="space-y-3">
                {report.insights?.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300 text-sm text-justify">
                    <span className="mt-1.5 w-2 h-2 bg-primary-600 dark:bg-primary-400 rounded-full shrink-0" />
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* AI Recommendations */}
          <div className={sectionBorder}>
            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide flex items-center gap-2">
              <Lightbulb size={18} className="text-yellow-500" />
              AI Recommendations for Next Year
            </h4>
            <div className="space-y-3">
              {report.suggestions?.map((s, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className={`px-2 py-1 rounded text-xs font-bold uppercase shrink-0 ${
                    s.priority === 'high'   ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                    : s.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
                    : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                  }`}>
                    {s.priority}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm capitalize">
                      {s.category.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 text-justify">{s.action}</p>
                    {s.potentialSavings > 0 && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1.5 font-semibold">
                        Potential savings: {fmt(s.potentialSavings)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Download */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 flex justify-end border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={downloadPDF}
              disabled={downloading}
              className="flex items-center gap-2 bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 font-medium"
            >
              {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {downloading ? 'Downloading...' : 'Download Annual PDF'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnualReport;
