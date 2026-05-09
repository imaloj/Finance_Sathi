import { useState } from 'react';
import api from '../services/api';
import { format } from 'date-fns';
import { Sparkles, Loader2, TrendingUp, TrendingDown, Download, AlertCircle, Lightbulb, Target, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const MonthlyReport = () => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState(null);
  const [summary, setSummary] = useState(null);
  const [prevSummary, setPrevSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const generateReport = async () => {
    setLoading(true);
    setError('');
    setReport(null);
    setSummary(null);
    setPrevSummary(null);
    
    try {
      // Fetch AI report
      const reportRes = await api.post(`/reports/generate/${year}/${month}`);
      setReport(reportRes.data.data);
      
      // Fetch current month summary
      const summaryRes = await api.get(`/transactions/summary/${year}/${month}`);
      setSummary(summaryRes.data.data);
      
      // Fetch previous month summary for comparison
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      try {
        const prevRes = await api.get(`/transactions/summary/${prevYear}/${prevMonth}`);
        setPrevSummary(prevRes.data.data);
      } catch (e) {
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
      const response = await api.get(`/reports/pdf/${year}/${month}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BudgetSathi_Report_${year}_${month}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

const fmt = (n) => typeof n === 'number' ? `Rs ${n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Rs 0.00';

  
  const ytd = (n) => typeof n === 'number' ? `Rs ${(n * month).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Rs 0.00';
  
  const pctChange = (curr, prev) => {
    if (!prev || prev === 0) return 'N/A';
    const change = ((curr - prev) / prev) * 100;
    return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Financial Report</h2>
        <p className="text-gray-500">Generate and download your monthly financial summary</p>
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-4 py-2 w-44 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{format(new Date(2024, i, 1), 'MMMM')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-4 py-2 w-28 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={generateReport}
          disabled={loading}
          className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2.5 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 font-medium"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {loading ? 'Analyzing...' : 'Generate Report'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Report Box - Wireframe Style */}
      {report && summary && (
        <div className="border-2 border-gray-300 rounded-xl bg-white overflow-hidden">
          
          {/* Report Title */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 text-center uppercase tracking-wide">Monthly Financial Summary Report</h3>
            <p className="text-sm text-gray-500 text-center mt-2">
              <Calendar size={14} className="inline mr-1" />
              {format(new Date(year, month - 1), 'MMMM yyyy')}
            </p>
          </div>

          {/* Financial Health Score */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <div>
              <p className="text-sm text-gray-600">Financial Health Score</p>
              <p className={`text-3xl font-bold ${getScoreColor(report.financialHealthScore)}`}>
                {report.financialHealthScore}/100
              </p>
              <p className="text-xs font-medium text-gray-500">{getScoreLabel(report.financialHealthScore)}</p>
            </div>
            <div className={`px-4 py-3 rounded-lg border ${getScoreBg(report.financialHealthScore)}`}>
              <p className="text-sm font-semibold text-gray-700">Status</p>
              <p className={`text-lg font-bold ${getScoreColor(report.financialHealthScore)}`}>
                {report.financialHealthScore >= 60 ? 'On Track' : 'Needs Attention'}
              </p>
            </div>
          </div>

          {/* Overview - Justified Text */}
          <div className="px-6 py-5 border-b border-gray-200">
            <h4 className="text-base font-bold text-gray-900 mb-3 uppercase tracking-wide">1. Overview</h4>
            <p className="text-gray-700 text-justify leading-relaxed text-sm">
              {report.summary} This report provides a comprehensive overview of your financial performance 
              for {format(new Date(year, month - 1), 'MMMM yyyy')}, capturing key metrics and comparing 
              them against the previous month and year-to-date figures. Total income for the period was 
              {fmt(summary.income)} with expenses amounting to {fmt(summary.expense)} and savings of 
              {fmt(summary.saving)}, resulting in a net cash flow of {fmt(summary.net)}.
            </p>
          </div>

          {/* Income Table */}
          <div className="px-6 py-5 border-b border-gray-200">
            <h4 className="text-base font-bold text-gray-900 mb-4 uppercase tracking-wide">2. Income</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200">
                <thead>
                  <tr className="bg-green-50">
                    <th className="text-left py-3 px-4 font-semibold text-green-800 border-b border-green-200">Category</th>
                    <th className="text-right py-3 px-4 font-semibold text-green-800 border-b border-green-200">Current Month</th>
                    <th className="text-right py-3 px-4 font-semibold text-green-800 border-b border-green-200">Previous Month</th>
                    <th className="text-right py-3 px-4 font-semibold text-green-800 border-b border-green-200">Year-to-Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-4 font-medium">Total Income</td>
                    <td className="py-3 px-4 text-right font-semibold text-green-700">{fmt(summary.income)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{fmt(prevSummary?.income || 0)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{ytd(summary.income)}</td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <td className="py-3 px-4 font-medium">Growth Rate</td>
                    <td className="py-3 px-4 text-right font-semibold text-green-700">
                      <span className="flex items-center justify-end gap-1">
                        {(summary.income || 0) >= (prevSummary?.income || 0) ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {pctChange(summary.income, prevSummary?.income)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-400">—</td>
                    <td className="py-3 px-4 text-right text-gray-400">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ul className="mt-3 text-sm text-gray-600 space-y-1">
              {report.insights.filter(i => i.toLowerCase().includes('income') || i.toLowerCase().includes('revenue') || i.toLowerCase().includes('earn')).slice(0, 2).map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2 text-justify">
                  <span className="mt-1.5 w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
                  {insight}
                </li>
              ))}
            </ul>
          </div>

          {/* Expenses Table */}
          <div className="px-6 py-5 border-b border-gray-200">
            <h4 className="text-base font-bold text-gray-900 mb-4 uppercase tracking-wide">3. Expenses</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200">
                <thead>
                  <tr className="bg-red-50">
                    <th className="text-left py-3 px-4 font-semibold text-red-800 border-b border-red-200">Category</th>
                    <th className="text-right py-3 px-4 font-semibold text-red-800 border-b border-red-200">Current Month</th>
                    <th className="text-right py-3 px-4 font-semibold text-red-800 border-b border-red-200">Previous Month</th>
                    <th className="text-right py-3 px-4 font-semibold text-red-800 border-b border-red-200">Year-to-Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-4 font-medium">Total Expenses</td>
                    <td className="py-3 px-4 text-right font-semibold text-red-700">{fmt(summary.expense)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{fmt(prevSummary?.expense || 0)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{ytd(summary.expense)}</td>
                  </tr>
                  {report.spendingAnalysis?.topCategories?.slice(0, 3).map((cat, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-3 px-4 capitalize">{cat.category.replace(/_/g, ' ')}</td>
                      <td className="py-3 px-4 text-right">{fmt(cat.amount)} ({cat.percentage}%)</td>
                      <td className="py-3 px-4 text-right text-gray-500">—</td>
                      <td className="py-3 px-4 text-right text-gray-500">—</td>
                    </tr>
                  ))}
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <td className="py-3 px-4 font-medium">Change from Previous</td>
                    <td className="py-3 px-4 text-right font-semibold text-red-700">
                      <span className="flex items-center justify-end gap-1">
                        {(summary.expense || 0) >= (prevSummary?.expense || 0) ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {pctChange(summary.expense, prevSummary?.expense)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-400">—</td>
                    <td className="py-3 px-4 text-right text-gray-400">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ul className="mt-3 text-sm text-gray-600 space-y-1">
              {report.insights.filter(i => i.toLowerCase().includes('expense') || i.toLowerCase().includes('spend')).slice(0, 2).map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2 text-justify">
                  <span className="mt-1.5 w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
                  {insight}
                </li>
              ))}
            </ul>
          </div>

          {/* Savings Table */}
          <div className="px-6 py-5 border-b border-gray-200">
            <h4 className="text-base font-bold text-gray-900 mb-4 uppercase tracking-wide">4. Savings</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="text-left py-3 px-4 font-semibold text-blue-800 border-b border-blue-200">Category</th>
                    <th className="text-right py-3 px-4 font-semibold text-blue-800 border-b border-blue-200">Current Month</th>
                    <th className="text-right py-3 px-4 font-semibold text-blue-800 border-b border-blue-200">Previous Month</th>
                    <th className="text-right py-3 px-4 font-semibold text-blue-800 border-b border-blue-200">Year-to-Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-4 font-medium">Total Savings</td>
                    <td className="py-3 px-4 text-right font-semibold text-blue-700">{fmt(summary.saving)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{fmt(prevSummary?.saving || 0)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{ytd(summary.saving)}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-4 font-medium">Savings Rate</td>
                    <td className="py-3 px-4 text-right font-semibold text-blue-700">
                      {((summary.saving / Math.max(summary.income, 1)) * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {((prevSummary?.saving || 0) / Math.max(prevSummary?.income || 1, 1) * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {((summary.saving * month) / Math.max(summary.income * month, 1) * 100).toFixed(1)}%
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <td className="py-3 px-4 font-medium">Net Savings Growth</td>
                    <td className="py-3 px-4 text-right font-semibold text-blue-700">
                      <span className="flex items-center justify-end gap-1">
                        {(summary.saving || 0) >= (prevSummary?.saving || 0) ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {pctChange(summary.saving, prevSummary?.saving)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-400">—</td>
                    <td className="py-3 px-4 text-right text-gray-400">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Key Highlights */}
          <div className="px-6 py-5 border-b border-gray-200">
            <h4 className="text-base font-bold text-gray-900 mb-4 uppercase tracking-wide">5. Key Highlights</h4>
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
              <ul className="space-y-3">
                {report.insights.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-gray-700 text-sm text-justify">
                    <span className="mt-1.5 w-2 h-2 bg-primary-500 rounded-full flex-shrink-0" />
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="px-6 py-5 border-b border-gray-200">
            <h4 className="text-base font-bold text-gray-900 mb-4 uppercase tracking-wide flex items-center gap-2">
              <Lightbulb size={18} className="text-yellow-500" />
              AI Recommendations
            </h4>
            <div className="space-y-3">
              {report.suggestions.map((suggestion, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                    suggestion.priority === 'high' ? 'bg-red-100 text-red-700' :
                    suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {suggestion.priority}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm capitalize">{suggestion.category.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-gray-600 mt-1 text-justify">{suggestion.action}</p>
                    {suggestion.potentialSavings > 0 && (
                      <p className="text-sm text-green-600 mt-1.5 font-semibold">
                        Potential savings: {fmt(suggestion.potentialSavings)}/month
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Download Button - Bottom Right */}
          <div className="px-6 py-4 bg-gray-50 flex justify-end border-t border-gray-200">
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