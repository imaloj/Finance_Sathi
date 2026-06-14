import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Embed logo as base64 so Puppeteer can render it without a running server
const logoPath = join(__dirname, '../../frontend/public/Budget_Sathi_Dark.png');
let logoBase64 = '';
try {
  logoBase64 = `data:image/png;base64,${readFileSync(logoPath).toString('base64')}`;
} catch {
  // Logo file not found — will fall back to text header
}

const generateHTML = (data) => {
  const { user, report, summary, month, year, prevMonthData } = data;
  
  const fmt = (n) => typeof n === 'number' ? `Rs ${n.toLocaleString('en', { minimumFractionDigits: 2 })}` : 'Rs 0.00';
  const pct = (n) => typeof n === 'number' ? `${n > 0 ? '+' : ''}${n.toFixed(1)}%` : '0%';
  
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  
  // Build income rows from actual data
  const incomeRows = summary?.incomeBreakdown?.map(item => `
    <tr>
      <td>${item.category}</td>
      <td>${fmt(item.current)}</td>
      <td>${fmt(item.previous)}</td>
      <td>${fmt(item.ytd)}</td>
    </tr>
  `).join('') || `
    <tr>
      <td>Total Income</td>
      <td>${fmt(summary?.income || 0)}</td>
      <td>${fmt(prevMonthData?.income || 0)}</td>
      <td>${fmt((summary?.income || 0) * month)}</td>
    </tr>
  `;

  // Build expense rows
  const expenseRows = summary?.expenseBreakdown?.map(item => `
    <tr>
      <td>${item.category}</td>
      <td>${fmt(item.current)}</td>
      <td>${fmt(item.previous)}</td>
      <td>${fmt(item.ytd)}</td>
    </tr>
  `).join('') || `
    <tr>
      <td>Total Expenses</td>
      <td>${fmt(summary?.expense || 0)}</td>
      <td>${fmt(prevMonthData?.expense || 0)}</td>
      <td>${fmt((summary?.expense || 0) * month)}</td>
    </tr>
  `;

  // Build savings rows
  const savingRows = `
    <tr>
      <td>Total Savings</td>
      <td>${fmt(summary?.saving || 0)}</td>
      <td>${fmt(prevMonthData?.saving || 0)}</td>
      <td>${fmt((summary?.saving || 0) * month)}</td>
    </tr>
    <tr>
      <td>Net Savings Rate</td>
      <td>${pct(((summary?.saving || 0) / Math.max(summary?.income || 1, 1)) * 100)}</td>
      <td>${pct(((prevMonthData?.saving || 0) / Math.max(prevMonthData?.income || 1, 1)) * 100)}</td>
      <td>${pct(((summary?.saving || 0) * month / Math.max((summary?.income || 1) * month, 1)) * 100)}</td>
    </tr>
  `;

  // Key highlights from AI report
  const highlights = report?.insights?.map(i => `<li>${i}</li>`).join('') || '<li>No highlights available</li>';
  const suggestions = report?.suggestions?.map(s => `
    <li><strong>${s.category}:</strong> ${s.action} 
      ${s.potentialSavings > 0 ? `(Potential savings: ${fmt(s.potentialSavings)})` : ''}
    </li>
  `).join('') || '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Monthly Financial Summary Report</title>
  <style>
    @page { size: A4; margin: 20mm; }
    * { box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1a1a1a;
      line-height: 1.6;
      margin: 0;
      padding: 0;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #059669;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #059669;
      margin-bottom: 5px;
    }
    .subtitle {
      font-size: 12px;
      color: #666;
    }
    h1 {
      text-align: center;
      color: #1a1a1a;
      font-size: 24px;
      margin: 20px 0;
    }
    .meta {
      width: 100%;
      margin: 20px 0;
      font-size: 13px;
    }
    .meta td {
      padding: 4px 10px;
    }
    .meta td:first-child {
      font-weight: 600;
      color: #374151;
      width: 30%;
    }
    h2 {
      color: #059669;
      font-size: 18px;
      margin-top: 30px;
      margin-bottom: 15px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 13px;
    }
    th {
      background: #f0fdf4;
      color: #065f46;
      font-weight: 600;
      text-align: left;
      padding: 12px;
      border-bottom: 2px solid #059669;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    tr:nth-child(even) {
      background: #f9fafb;
    }
    .bullet {
      margin: 10px 0;
      padding-left: 20px;
    }
    .bullet li {
      margin: 8px 0;
      color: #374151;
    }
    .score-box {
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      margin: 20px 0;
    }
    .score-number {
      font-size: 48px;
      font-weight: bold;
    }
    .score-label {
      font-size: 14px;
      opacity: 0.9;
    }
    .footer {
      margin-top: 40px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
    }
    .highlight-section {
      background: #f0fdf4;
      padding: 15px 20px;
      border-radius: 8px;
      margin: 15px 0;
    }
    .page-break {
      page-break-after: always;
    }
  </style>
</head>
<body>

  <div class="header">
    ${logoBase64
      ? `<img src="${logoBase64}" alt="Budget Sathi" style="height:60px;width:auto;margin-bottom:8px;" />`
      : `<div class="logo">💰 Budget Sathi</div>`
    }
    <div class="subtitle">Your Personal Financial Companion</div>
  </div>

  <h1>Monthly Financial Summary Report</h1>

  <table class="meta">
    <tr><td>Name</td><td>${user?.name || 'User'}</td></tr>
    <tr><td>Prepared by</td><td>Budget Sathi AI</td></tr>
    <tr><td>Report Period</td><td>${new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</td></tr>
    <tr><td>Generated on</td><td>${new Date().toLocaleDateString('en-IN')}</td></tr>
  </table>

  <!-- Financial Health Score -->
  <div class="score-box">
    <div class="score-number">${report?.financialHealthScore || 0}</div>
    <div class="score-label">Financial Health Score</div>
  </div>

  <h2>1. Overview</h2>
  <p>${report?.summary || 'This report provides a comprehensive overview of your financial performance for the month.'}</p>

  <h2>2. Income</h2>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th>Current Month</th>
        <th>Previous Month</th>
        <th>Year-to-Date</th>
      </tr>
    </thead>
    <tbody>
      ${incomeRows}
    </tbody>
  </table>
  <ul class="bullet">
    <li>Overall income ${prevMonthData?.incomeChange >= 0 ? 'grew' : 'declined'} by ${Math.abs(prevMonthData?.incomeChange || 0).toFixed(1)}% compared to the previous month.</li>
  </ul>

  <h2>3. Expenses</h2>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th>Current Month</th>
        <th>Previous Month</th>
        <th>Year-to-Date</th>
      </tr>
    </thead>
    <tbody>
      ${expenseRows}
    </tbody>
  </table>
  <ul class="bullet">
    <li>Total expenses ${prevMonthData?.expenseChange >= 0 ? 'increased' : 'decreased'} by ${Math.abs(prevMonthData?.expenseChange || 0).toFixed(1)}% from the previous month.</li>
  </ul>

  <h2>4. Savings</h2>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th>Current Month</th>
        <th>Previous Month</th>
        <th>Year-to-Date</th>
      </tr>
    </thead>
    <tbody>
      ${savingRows}
    </tbody>
  </table>

  <h2>5. Key Highlights</h2>
  <div class="highlight-section">
    <ul class="bullet">
      ${highlights}
    </ul>
  </div>

  <h2>6. AI Recommendations</h2>
  <ul class="bullet">
    ${suggestions || '<li>Continue monitoring your finances regularly.</li>'}
  </ul>

  <div class="footer">
    <p>Generated by Budget Sathi • Confidential Financial Report</p>
    <p>This report is for informational purposes only and does not constitute financial advice.</p>
  </div>

</body>
</html>`;
};

export const generatePDF = async (data) => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    const html = generateHTML(data);
    
    await page.setContent(html, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000 
    });
    
    // Wait for fonts to load
    await page.evaluateHandle('document.fonts.ready');
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
      preferCSSPageSize: true
    });
    
    return pdf;
  } finally {
    await browser.close();
  }
};