import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useTheme from '../hooks/useTheme';
import { LayoutDashboard, Receipt, PieChart, Settings, LogOut, Menu, X } from 'lucide-react';

const navItems = [
  { path: '/',             label: 'Dashboard',   icon: LayoutDashboard },
  { path: '/transactions', label: 'Transactions', icon: Receipt },
  { path: '/reports',      label: 'AI Reports',   icon: PieChart },
  { path: '/settings',     label: 'Settings',     icon: Settings },
];

const NavLinks = ({ currentPath, onNavigate }) => (
  <>
    {navItems.map((item) => {
      const Icon = item.icon;
      const isActive = currentPath === item.path;
      return (
        <Link
          key={item.path}
          to={item.path}
          onClick={onNavigate}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors${
            isActive
              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <Icon size={20} />
          {item.label}
        </Link>
      );
    })}
  </>
);

const Layout = () => {
  const { logout, user } = useAuth();
  const { isDark } = useTheme();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logo = isDark ? '/Dark%20mode%20web.png' : '/light%20mode%20web.png';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex transition-colors duration-200">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex-col shrink-0">
        {/* Logo */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-center">
          <img src={logo} alt="Budget Sathi" className="h-12 w-auto object-contain" />
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          <NavLinks currentPath={pathname} onNavigate={() => {}} />
        </nav>

        {/* User / Logout */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="mb-3 px-4">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-gray-900
        border-r border-gray-200 dark:border-gray-700 flex flex-col
        transform transition-transform duration-250 ease-in-out lg:hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Drawer header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <img src={logo} alt="Budget Sathi" className="h-10 w-auto object-contain" />
          <button onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          <NavLinks currentPath={pathname} onNavigate={() => setSidebarOpen(false)} />
        </nav>

        {/* User / Logout */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="mb-3 px-4">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => { setSidebarOpen(false); logout(); }}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <img src={logo} alt="Budget Sathi" className="h-8 w-auto object-contain" />
          <div className="w-10" />
        </header>

        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
