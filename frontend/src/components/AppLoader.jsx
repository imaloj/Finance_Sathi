import { Wallet } from 'lucide-react';

const AppLoader = () => {
  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center z-50">
      {/* Ripple rings */}
      <div className="relative flex items-center justify-center mb-8">
        <span className="absolute w-36 h-36 rounded-full bg-primary-500/10 animate-ping" />
        <span className="absolute w-24 h-24 rounded-full bg-primary-500/15 animate-ping" style={{ animationDelay: '0.3s' }} />
        {/* Logo circle */}
        <div className="relative w-20 h-20 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center shadow-lg shadow-primary-500/20 border border-gray-100 dark:border-gray-700">
          <img src="/BudgetSathi.png" alt="Budget Sathi" className="w-14 h-14 object-contain" />
        </div>
      </div>

      {/* Brand name with shimmer */}
      <div className="relative overflow-hidden">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-wide">
          Budget Sathi
        </h1>
        <span className="absolute inset-0 -skew-x-12 bg-linear-to-r from-transparent via-white/60 dark:via-white/20 to-transparent animate-shimmer" />
      </div>

      <p className="mt-2 text-sm text-gray-400 dark:text-gray-500 tracking-wider">
        Loading your finances...
      </p>
    </div>
  );
};

export default AppLoader;
