import { useState } from 'react';
import api from '../services/api';
import { format } from 'date-fns';
import { Sparkles, Loader2, Download, AlertCircle, Lightbulb, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

const CURRENT_YEAR = new Date().getFullYear();

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: format(new Date(2024, i, 1), 'MMMM'),
}));

const getYearError = (y) => {
  const num = parseInt(y);
  if (!y || String(y).length < 4) return null;
  if (num < 2000) return 'Year must be 2000 AD or later';
  if (num > CURRENT_YEAR) return `Year cannot exceed ${CURRENT_YEAR}`;
  return null;
};

const MonthlyReport = () => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [report, setReport] = useState(null);
  const [summary, setSummary] = useState(null);
  const [prevSummary, setPrevSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const yearError = getYearError(year);
  const isYearValid = year.length === 4 && !yearError;

  const generateReport = async () => {
    setLoading(true);
    setError('');
    setReport(null);
    setSummary(null);
    setPrevSummary(null);

    try {
      const reportRes = await api.post(`/reports/generate/${parseInt(year)}/${month}`);
      setReport(reportRes.data.data);

      const summaryRes = await api.get(`/transactions/summary/${parseInt(year)}/${month}`);
      setSummary(summaryRes.data.data);

      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? parseInt(year) - 1 : parseInt(year);
      try {
        const prevRes = await api.get(`/transactions/summary/${prevYear}/${prevMonth}`);
        setPrevSummary(prevRes.data.data);
      } catch {
        setPrevSummary({ income: 0, expense: 0, saving: 0, net: 0 });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await api.get(`/reports/pdf/${parseInt(year)}/${month}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BudgetSathi_Report_${parseInt(year)}_${month}.pdf`;
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

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700';
    if (score >= 60) return 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700';
    return 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  const fmt = (n) => typeof n === 'number'
    ? `Rs ${n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'Rs 0.00';

  const ytd = (n) => typeof n === 'number'
    ? `Rs ${(n * month).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'Rs 0.00';

  const pctChange = (curr, prev) => {
    if (!prev || prev === 0) return 'N/A';
    const change = ((curr - prev) / prev) * 100;
    return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  // Reusable class strings
  const thBase = 'py-3 px-4 font-semibold border-b';
  const tdBase = 'py-3 px-4';
  const sectionBorder = 'px-6 py-5 border-b border-gray-200 dark:border-gray-700';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financial Report</h2>
          <p className="text-gray-500 dark:text-gray-400">Generate and download your monthly financial summary</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-wrap items-end gap-4">
        {/* Month */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Month</label>
          <CustomSelect
            value={month}
            onChange={(val) => setMonth(val)}
            options={MONTH_OPTIONS}
            className="w-44"
          />
        </div>

        {/* Year */}
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
              <p className="absolute top-full left-0 mt-1 text-xs text-red-500 dark:text-red-400 whitespace-wrap">
                {yearError}
              </p>
            )}
          </div>
        </div>

        {/* Generate button — disabled if year invalid or loading */}
        <button
          onClick={generateReport}
          disabled={loading || !isYearValid}
          className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2.5 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {loading ? 'Analyzing...' : 'Generate Report'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Report Box */}
      {report && summary && (
        <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 overflow-hidden">

          {/* Report Title */}
          <div className={`p-6 border-b border-gray-200 dark:border-gray-700`}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center uppercase tracking-wide">
              Monthly Financial Summary Report
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
              <Calendar size={14} className="inline mr-1" />
              {format(new Date(parseInt(year), month - 1), 'MMMM yyyy')}
            </p>
          </div>

          {/* Financial Health Score */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Financial Health Score</p>
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

          {/* Overview */}
          <div className={sectionBorder}>
            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wide">1. Overview</h4>
            <p className="text-gray-700 dark:text-gray-300 text-justify leading-relaxed text-sm">
              {report.summary} This report provides a comprehensive overview of your financial performance
              for {format(new Date(parseInt(year), month - 1), 'MMMM yyyy')}, capturing key metrics and comparing
              them against the previous month and year-to-date figures. Total income for the period was{' '}
              {fmt(summary.income)} with expenses amounting to {fmt(summary.expense)} and savings of{' '}
              {fmt(summary.saving)}, resulting in a net cash flow of {fmt(summary.net)}.
            </p>
          </div>

          {/* Income Table */}
          <div className={sectionBorder}>
            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">2. Income</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 dark:border-gray-700">
                <thead>
                  <tr className="bg-green-50 dark:bg-green-900/30">
                    <th className={`${thBase} text-left text-green-800 dark:text-green-300 border-green-200 dark:border-green-700`}>Category</th>
                    <th className={`${thBase} text-right text-green-800 dark:text-green-300 border-green-200 dark:border-green-700`}>Current Month</th>
                    <th className={`${thBase} text-right text-green-800 dark:text-green-300 border-green-200 dark:border-green-700`}>Previous Month</th>
                    <th className={`${thBase} text-right text-green-800 dark:text-green-300 border-green-200 dark:border-green-700`}>Year-to-Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900">
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className={`${tdBase} font-medium text-gray-900 dark:text-gray-100`}>Total Income</td>
                    <td className={`${tdBase} text-right font-semibold text-green-700 dark:text-green-400`}>{fmt(summary.income)}</td>
                    <td className={`${tdBase} text-right text-gray-600 dark:text-gray-400`}>{fmt(prevSummary?.income || 0)}</td>
                    <td className={`${tdBase} text-right text-gray-600 dark:text-gray-400`}>{ytd(summary.income)}</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <td className={`${tdBase} font-medium text-gray-900 dark:text-gray-100`}>Growth Rate</td>
                    <td className={`${tdBase} text-right font-semibold text-green-700 dark:text-green-400`}>
                      <span className="flex items-center justify-end gap-1">
                        {(summary.income || 0) >= (prevSummary?.income || 0) ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {pctChange(summary.income, prevSummary?.income)}
                      </span>
                    </td>
                    <td className={`${tdBase} text-right text-gray-400 dark:text-gray-500`}>—</td>
                    <td className={`${tdBase} text-right text-gray-400 dark:text-gray-500`}>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ul className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-1">
              {report.insights
                .filter(i => i.toLowerCase().includes('income') || i.toLowerCase().includes('revenue') || i.toLowerCase().includes('earn'))
                .slice(0, 2)
                .map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-justify">
                    <span className="mt-1.5 w-1.5 h-1.5 bg-green-500 rounded-full shrink-0" />
                    {insight}
                  </li>
                ))}
            </ul>
          </div>

          {/* Expenses Table */}
          <div className={sectionBorder}>
            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">3. Expenses</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 dark:border-gray-700">
                <thead>
                  <tr className="bg-red-50 dark:bg-red-900/30">
                    <th className={`${thBase} text-left text-red-800 dark:text-red-300 border-red-200 dark:border-red-700`}>Category</th>
                    <th className={`${thBase} text-right text-red-800 dark:text-red-300 border-red-200 dark:border-red-700`}>Current Month</th>
                    <th className={`${thBase} text-right text-red-800 dark:text-red-300 border-red-200 dark:border-red-700`}>Previous Month</th>
                    <th className={`${thBase} text-right text-red-800 dark:text-red-300 border-red-200 dark:border-red-700`}>Year-to-Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900">
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className={`${tdBase} font-medium text-gray-900 dark:text-gray-100`}>Total Expenses</td>
                    <td className={`${tdBase} text-right font-semibold text-red-700 dark:text-red-400`}>{fmt(summary.expense)}</td>
                    <td className={`${tdBase} text-right text-gray-600 dark:text-gray-400`}>{fmt(prevSummary?.expense || 0)}</td>
                    <td className={`${tdBase} text-right text-gray-600 dark:text-gray-400`}>{ytd(summary.expense)}</td>
                  </tr>
                  {report.spendingAnalysis?.topCategories?.slice(0, 3).map((cat, idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-700">
                      <td className={`${tdBase} capitalize text-gray-900 dark:text-gray-100`}>{cat.category.replace(/_/g, ' ')}</td>
                      <td className={`${tdBase} text-right text-gray-900 dark:text-gray-100`}>{fmt(cat.amount)} ({cat.percentage}%)</td>
                      <td className={`${tdBase} text-right text-gray-500 dark:text-gray-400`}>—</td>
                      <td className={`${tdBase} text-right text-gray-500 dark:text-gray-400`}>—</td>
                    </tr>
                  ))}
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <td className={`${tdBase} font-medium text-gray-900 dark:text-gray-100`}>Change from Previous</td>
                    <td className={`${tdBase} text-right font-semibold text-red-700 dark:text-red-400`}>
                      <span className="flex items-center justify-end gap-1">
                        {(summary.expense || 0) >= (prevSummary?.expense || 0) ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {pctChange(summary.expense, prevSummary?.expense)}
                      </span>
                    </td>
                    <td className={`${tdBase} text-right text-gray-400 dark:text-gray-500`}>—</td>
                    <td className={`${tdBase} text-right text-gray-400 dark:text-gray-500`}>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ul className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-1">
              {report.insights
                .filter(i => i.toLowerCase().includes('expense') || i.toLowerCase().includes('spend'))
                .slice(0, 2)
                .map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-justify">
                    <span className="mt-1.5 w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                    {insight}
                  </li>
                ))}
            </ul>
          </div>

          {/* Savings Table */}
          <div className={sectionBorder}>
            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">4. Savings</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 dark:border-gray-700">
                <thead>
                  <tr className="bg-blue-50 dark:bg-blue-900/30">
                    <th className={`${thBase} text-left text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700`}>Category</th>
                    <th className={`${thBase} text-right text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700`}>Current Month</th>
                    <th className={`${thBase} text-right text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700`}>Previous Month</th>
                    <th className={`${thBase} text-right text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700`}>Year-to-Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900">
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className={`${tdBase} font-medium text-gray-900 dark:text-gray-100`}>Total Savings</td>
                    <td className={`${tdBase} text-right font-semibold text-blue-700 dark:text-blue-400`}>{fmt(summary.saving)}</td>
                    <td className={`${tdBase} text-right text-gray-600 dark:text-gray-400`}>{fmt(prevSummary?.saving || 0)}</td>
                    <td className={`${tdBase} text-right text-gray-600 dark:text-gray-400`}>{ytd(summary.saving)}</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className={`${tdBase} font-medium text-gray-900 dark:text-gray-100`}>Savings Rate</td>
                    <td className={`${tdBase} text-right font-semibold text-blue-700 dark:text-blue-400`}>
                      {((summary.saving / Math.max(summary.income, 1)) * 100).toFixed(1)}%
                    </td>
                    <td className={`${tdBase} text-right text-gray-600 dark:text-gray-400`}>
                      {((prevSummary?.saving || 0) / Math.max(prevSummary?.income || 1, 1) * 100).toFixed(1)}%
                    </td>
                    <td className={`${tdBase} text-right text-gray-600 dark:text-gray-400`}>
                      {((summary.saving * month) / Math.max(summary.income * month, 1) * 100).toFixed(1)}%
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <td className={`${tdBase} font-medium text-gray-900 dark:text-gray-100`}>Net Savings Growth</td>
                    <td className={`${tdBase} text-right font-semibold text-blue-700 dark:text-blue-400`}>
                      <span className="flex items-center justify-end gap-1">
                        {(summary.saving || 0) >= (prevSummary?.saving || 0) ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {pctChange(summary.saving, prevSummary?.saving)}
                      </span>
                    </td>
                    <td className={`${tdBase} text-right text-gray-400 dark:text-gray-500`}>—</td>
                    <td className={`${tdBase} text-right text-gray-400 dark:text-gray-500`}>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Key Highlights */}
          <div className={sectionBorder}>
            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">5. Key Highlights</h4>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700">
              <ul className="space-y-3">
                {report.insights.map((insight, idx) => (
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
              AI Recommendations
            </h4>
            <div className="space-y-3">
              {report.suggestions.map((suggestion, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                    suggestion.priority === 'high'
                      ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                      : suggestion.priority === 'medium'
                      ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
                      : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                  }`}>
                    {suggestion.priority}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm capitalize">
                      {suggestion.category.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 text-justify">{suggestion.action}</p>
                    {suggestion.potentialSavings > 0 && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1.5 font-semibold">
                        Potential savings: {fmt(suggestion.potentialSavings)}/month
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Download Button */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 flex justify-end border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={downloadPDF}
              disabled={downloading}
              className="flex items-center gap-2 bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 font-medium"
            >
              {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {downloading ? 'Downloading...' : 'Download Report'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyReport;
