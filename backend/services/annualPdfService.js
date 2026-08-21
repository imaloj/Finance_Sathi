import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { formatCurrency } from '../utils/currency.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const logoPath = join(__dirname, '../../frontend/public/light mode web.png');
let logoBase64 = '';
try {
  logoBase64 = `data:image/png;base64,${readFileSync(logoPath).toString('base64')}`;
} catch {
  // Logo file not found — falls back to text header
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const generateAnnualHTML = (data) => {
  const { user, report, year } = data;
  const currency = user?.currency || 'USD';
  const fmt  = (n) => formatCurrency(typeof n === 'number' ? n : 0, currency);
  const pct  = (n) => typeof n === 'number' ? `${n > 0 ? '+' : ''}${n.toFixed(1)}%` : '—';
  const sign = (n) => typeof n === 'number' ? (n >= 0 ? 'positive' : 'negative') : '';

  // ── Monthly breakdown table rows ────────────────────────────────────────────
  const monthRows = report.monthlyBreakdown?.map(m => {
    const hasData = m.income > 0 || m.expense > 0 || m.saving > 0;
    return `
      <tr class="${hasData ? '' : 'empty-month'}">
        <td>${MONTH_NAMES[m.month - 1]}</td>
        <td class="amount">${hasData ? fmt(m.income)  : '—'}</td>
        <td class="amount">${hasData ? fmt(m.expense) : '—'}</td>
        <td class="amount">${hasData ? fmt(m.saving)  : '—'}</td>
        <td class="amount ${m.net >= 0 ? 'positive' : 'negative'}">${hasData ? fmt(m.net) : '—'}</td>
      </tr>`;
  }).join('') || '';

  // ── Top categories rows ──────────────────────────────────────────────────────
  const categoryRows = report.topCategories?.map(c => `
    <tr>
      <td>${c.category}</td>
      <td class="amount">${fmt(c.amount)}</td>
      <td>
        <div class="bar-wrap">
          <div class="bar" style="width:${Math.min(c.percentage, 100)}%"></div>
          <span>${c.percentage}%</span>
        </div>
      </td>
    </tr>`).join('') || '<tr><td colspan="3">No expense data available</td></tr>';

  // ── AI insights & suggestions ────────────────────────────────────────────────
  const insights    = report.insights?.map(i => `<li>${i}</li>`).join('') || '<li>No insights available</li>';
  const suggestions = report.suggestions?.map(s => `
    <li>
      <span class="priority priority-${s.priority}">${s.priority}</span>
      <strong>${s.category}:</strong> ${s.action}
      ${s.potentialSavings > 0 ? `<span class="saving-hint">Potential savings: ${fmt(s.potentialSavings)}</span>` : ''}
    </li>`).join('') || '';

  // ── YoY section ──────────────────────────────────────────────────────────────
  const yoy = report.yearOverYear;
  const yoySection = yoy ? `
    <h2>4. Year-over-Year Comparison</h2>
    <table>
      <thead><tr><th>Metric</th><th>${year - 1}</th><th>${year}</th><th>Change</th></tr></thead>
      <tbody>
        <tr><td>Income</td>  <td>—</td><td class="amount">${fmt(report.totals?.income)}</td>  <td class="${(yoy.incomeChange  || 0) >= 0 ? 'positive' : 'negative'}">${pct(yoy.incomeChange)}</td></tr>
        <tr><td>Expenses</td><td>—</td><td class="amount">${fmt(report.totals?.expense)}</td><td class="${(yoy.expenseChange || 0) >= 0 ? 'negative' : 'positive'}">${pct(yoy.expenseChange)}</td></tr>
        <tr><td>Savings</td> <td>—</td><td class="amount">${fmt(report.totals?.saving)}</td>  <td class="${(yoy.savingChange  || 0) >= 0 ? 'positive' : 'negative'}">${pct(yoy.savingChange)}</td></tr>
      </tbody>
    </table>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Annual Financial Report ${year}</title>
  <style>
    @page { size: A4; margin: 18mm 20mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1a1a1a;
      line-height: 1.6;
      margin: 0; padding: 0;
    }

    /* ── Header ── */
    .header {
      text-align: center;
      border-bottom: 3px solid #059669;
      padding-bottom: 18px;
      margin-bottom: 24px;
    }
    .logo-text { font-size: 26px; font-weight: bold; color: #059669; }
    .subtitle  { font-size: 12px; color: #666; }

    h1 { text-align: center; color: #1a1a1a; font-size: 22px; margin: 16px 0 8px; }
    .report-year { text-align: center; font-size: 15px; color: #059669; font-weight: 600; margin-bottom: 20px; }

    /* ── Meta table ── */
    .meta { width: 100%; margin: 16px 0; font-size: 13px; }
    .meta td { padding: 3px 10px; }
    .meta td:first-child { font-weight: 600; color: #374151; width: 30%; }

    /* ── Score box ── */
    .score-box {
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      color: white; padding: 18px; border-radius: 12px;
      text-align: center; margin: 20px 0;
    }
    .score-number { font-size: 52px; font-weight: bold; line-height: 1; }
    .score-label  { font-size: 13px; opacity: 0.9; margin-top: 4px; }

    /* ── Summary cards ── */
    .cards { display: flex; gap: 12px; margin: 20px 0; }
    .card {
      flex: 1; border-radius: 10px; padding: 14px 16px;
      border: 1px solid #e5e7eb;
    }
    .card.income  { background: #f0fdf4; border-color: #86efac; }
    .card.expense { background: #fff7f0; border-color: #fdba74; }
    .card.saving  { background: #eff6ff; border-color: #93c5fd; }
    .card.net     { background: #f9fafb; border-color: #d1d5db; }
    .card-label   { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #6b7280; }
    .card-value   { font-size: 17px; font-weight: bold; color: #111827; margin-top: 4px; }

    /* ── Section headings ── */
    h2 {
      color: #059669; font-size: 17px;
      margin-top: 28px; margin-bottom: 12px;
      border-bottom: 2px solid #e5e7eb; padding-bottom: 6px;
    }

    /* ── Tables ── */
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12.5px; }
    th {
      background: #f0fdf4; color: #065f46;
      font-weight: 600; text-align: left;
      padding: 10px 12px; border-bottom: 2px solid #059669;
    }
    td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) { background: #f9fafb; }
    .empty-month td { color: #9ca3af; font-style: italic; }
    .amount { text-align: right; font-variant-numeric: tabular-nums; }
    .positive { color: #059669; font-weight: 600; }
    .negative { color: #dc2626; font-weight: 600; }

    /* ── Total row ── */
    .total-row td { font-weight: 700; background: #f0fdf4; border-top: 2px solid #059669; }

    /* ── Bar chart ── */
    .bar-wrap { display: flex; align-items: center; gap: 8px; }
    .bar { height: 10px; background: #059669; border-radius: 4px; min-width: 2px; }
    .bar-wrap span { font-size: 11px; color: #374151; white-space: nowrap; }

    /* ── Insights ── */
    .highlight-section {
      background: #f0fdf4; padding: 14px 18px;
      border-radius: 8px; margin: 12px 0;
    }
    .bullet { margin: 8px 0; padding-left: 20px; }
    .bullet li { margin: 7px 0; color: #374151; }

    /* ── Suggestions ── */
    .suggestions-list { list-style: none; padding: 0; margin: 0; }
    .suggestions-list li {
      padding: 10px 14px; margin: 8px 0;
      background: #f9fafb; border-radius: 8px;
      border-left: 3px solid #059669;
      font-size: 12.5px;
    }
    .priority {
      display: inline-block; padding: 1px 8px;
      border-radius: 10px; font-size: 10px;
      font-weight: 700; text-transform: uppercase;
      margin-right: 6px;
    }
    .priority-high   { background: #fee2e2; color: #dc2626; }
    .priority-medium { background: #fef9c3; color: #92400e; }
    .priority-low    { background: #d1fae5; color: #065f46; }
    .saving-hint { font-size: 11px; color: #6b7280; margin-left: 6px; }

    /* ── Page break ── */
    .page-break { page-break-after: always; }

    /* ── Footer ── */
    .footer {
      margin-top: 36px; padding-top: 14px;
      border-top: 1px solid #e5e7eb;
      text-align: center; font-size: 11px; color: #9ca3af;
    }
  </style>
</head>
<body>

  <!-- ═══════════════ PAGE 1: COVER + OVERVIEW ═══════════════ -->
  <div class="header">
    ${logoBase64
      ? `<img src="${logoBase64}" alt="Budget Sathi" style="height:56px;width:auto;margin-bottom:6px;" />`
      : `<div class="logo-text">💰 Budget Sathi</div>`
    }
    <div class="subtitle">Your Personal Financial Companion</div>
  </div>

  <h1>Annual Financial Summary Report</h1>
  <div class="report-year">Financial Year ${year}</div>

  <table class="meta">
    <tr><td>Name</td>          <td>${user?.name || 'User'}</td></tr>
    <tr><td>Prepared by</td>   <td>Budget Sathi AI</td></tr>
    <tr><td>Report Period</td> <td>January ${year} — December ${year}</td></tr>
    <tr><td>Generated on</td>  <td>${new Date().toLocaleDateString('en-IN')}</td></tr>
  </table>

  <!-- Financial Health Score -->
  <div class="score-box">
    <div class="score-number">${report.financialHealthScore || 0}</div>
    <div class="score-label">Annual Financial Health Score</div>
  </div>

  <!-- Summary cards -->
  <div class="cards">
    <div class="card income">
      <div class="card-label">Total Income</div>
      <div class="card-value">${fmt(report.totals?.income)}</div>
    </div>
    <div class="card expense">
      <div class="card-label">Total Expenses</div>
      <div class="card-value">${fmt(report.totals?.expense)}</div>
    </div>
    <div class="card saving">
      <div class="card-label">Total Savings</div>
      <div class="card-value">${fmt(report.totals?.saving)}</div>
    </div>
    <div class="card net">
      <div class="card-label">Net Cash Flow</div>
      <div class="card-value ${sign(report.totals?.net)}">${fmt(report.totals?.net)}</div>
    </div>
  </div>

  <h2>1. Year at a Glance</h2>
  <p>${report.summary || ''}</p>

  <div class="page-break"></div>

  <!-- ═══════════════ PAGE 2: MONTHLY BREAKDOWN ═══════════════ -->
  <h2>2. Month-by-Month Breakdown</h2>
  <table>
    <thead>
      <tr>
        <th>Month</th>
        <th style="text-align:right">Income</th>
        <th style="text-align:right">Expenses</th>
        <th style="text-align:right">Savings</th>
        <th style="text-align:right">Net</th>
      </tr>
    </thead>
    <tbody>
      ${monthRows}
      <tr class="total-row">
        <td>Annual Total</td>
        <td class="amount">${fmt(report.totals?.income)}</td>
        <td class="amount">${fmt(report.totals?.expense)}</td>
        <td class="amount">${fmt(report.totals?.saving)}</td>
        <td class="amount ${(report.totals?.net || 0) >= 0 ? 'positive' : 'negative'}">${fmt(report.totals?.net)}</td>
      </tr>
    </tbody>
  </table>

  ${yoySection}

  <div class="page-break"></div>

  <!-- ═══════════════ PAGE 3: ANALYSIS + RECOMMENDATIONS ═══════════════ -->
  <h2>3. Top Spending Categories (${year})</h2>
  <table>
    <thead>
      <tr><th>Category</th><th style="text-align:right">Amount</th><th>Share of Expenses</th></tr>
    </thead>
    <tbody>
      ${categoryRows}
    </tbody>
  </table>

  <h2>5. Key Highlights</h2>
  <div class="highlight-section">
    <ul class="bullet">${insights}</ul>
  </div>

  <h2>6. AI Recommendations for Next Year</h2>
  <ul class="suggestions-list">
    ${suggestions || '<li>Continue monitoring your finances regularly.</li>'}
  </ul>

  <div class="footer">
    <p>Generated by Budget Sathi • Confidential Annual Financial Report</p>
    <p>This report is for informational purposes only and does not constitute financial advice.</p>
  </div>

</body>
</html>`;
};

export const generateAnnualPDF = async (data) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const html = generateAnnualHTML(data);

    await page.setContent(html, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000
    });

    await page.evaluateHandle('document.fonts.ready');

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '15mm', bottom: '12mm', left: '15mm' },
      preferCSSPageSize: true
    });

    return pdf;
  } finally {
    await browser.close();
  }
};
