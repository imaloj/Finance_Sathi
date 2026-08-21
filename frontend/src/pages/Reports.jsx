import { useState } from 'react';
import { Calendar, CalendarDays } from 'lucide-react';
import MonthlyReport from './MonthlyReport';
import AnnualReport from './AnnualReport';

const TABS = [
  { key: 'monthly', label: 'Monthly Report', icon: Calendar },
  { key: 'annual',  label: 'Annual Report',  icon: CalendarDays },
];

const Reports = () => {
  const [activeTab, setActiveTab] = useState('monthly');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financial Reports</h2>
        <p className="text-gray-500 dark:text-gray-400">Generate and download AI-powered monthly or annual summaries</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all
              ${activeTab === key
                ? 'bg-white dark:bg-gray-900 text-primary-700 dark:text-primary-300 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'monthly' ? <MonthlyReport /> : <AnnualReport />}
    </div>
  );
};

export default Reports;
