# 💰 Budget Sathi

A full-stack personal finance tracker with AI-powered insights, secure JWT authentication, and real-time dashboard analytics. Built with the MERN stack (MongoDB, Express, React, Node.js) and enhanced with Redis caching, Mistral AI integration, and PDF report generation.

---

## ✨ Features

- **🔐 Secure Authentication**
  - JWT access & refresh tokens with httpOnly cookies
  - Token blacklisting via Redis
  - Rate limiting & brute-force protection

- **💸 Transaction Management**
  - Add, edit, delete income/expense transactions
  - Categorization and date filtering
  - Real-time balance calculations

- **📊 Smart Dashboard**
  - Visual analytics with charts
  - Monthly income vs expense breakdown
  - Budget vs actual spending comparison

- **🤖 AI-Powered Reports**
  - Monthly financial insights via Mistral AI
  - Automated PDF report generation
  - Spending pattern analysis

- **⚙️ User Settings**
  - Profile customization
  - Multi-currency support (NPR, USD, EUR, GBP)
  - Monthly budget & savings goals

- **🛡️ Security Hardening**
  - Content Security Policy (CSP)
  - MongoDB injection sanitization
  - CORS protection
  - Input validation middleware

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS, Axios, Lucide React |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (Mongoose ODM) |
| **Cache** | Redis (token blacklisting & session management) |
| **AI** | Mistral AI API |
| **PDF** | PDF generation service |
| **Auth** | JWT (access + refresh tokens), bcrypt |

---

## 📁 Project Structure

```
Budget_Sathi
├─ backend
│  ├─ config
│  │  ├─ db.js
│  │  ├─ redis.js
│  │  └─ security.js
│  ├─ middleware
│  │  ├─ auth.js
│  │  ├─ errorHandler.js
│  │  ├─ mongoSanitize.js
│  │  ├─ rateLimiter.js
│  │  └─ validator.js
│  ├─ models
│  │  ├─ AIReport.js
│  │  ├─ MonthlyBudget.js
│  │  ├─ Transaction.js
│  │  └─ User.js
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ routes
│  │  ├─ auth.js
│  │  ├─ reports.js
│  │  └─ transactions.js
│  ├─ server.js
│  ├─ services
│  │  ├─ aiService.js
│  │  ├─ authService.js
│  │  ├─ pdfService.js
│  │  └─ transactionService.js
│  └─ utils
│     ├─ authCookies.js
│     └─ logger.js
├─ frontend
│  ├─ dev-server.js
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  ├─ Budget sathi
│  │  ├─ Budget_Sathi.png
│  │  └─ icons.svg
│  ├─ README.md
│  ├─ src
│  │  ├─ App.css
│  │  ├─ App.jsx
│  │  ├─ components
│  │  │  └─ Layout.jsx
│  │  ├─ context
│  │  │  └─ AuthContext.jsx
│  │  ├─ hooks
│  │  │  └─ useDashboardRefresh.js
│  │  ├─ index.css
│  │  ├─ main.jsx
│  │  ├─ pages
│  │  │  ├─ Dashboard.jsx
│  │  │  ├─ Login.jsx
│  │  │  ├─ MonthlyReport.jsx
│  │  │  ├─ Register.jsx
│  │  │  ├─ Settings.jsx
│  │  │  └─ Transactions.jsx
│  │  └─ services
│  │     └─ api.js
│  ├─ tailwind.config.js
│  └─ vite.config.js
└─ README.md

