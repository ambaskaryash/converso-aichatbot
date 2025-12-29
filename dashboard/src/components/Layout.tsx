import React from 'react';
import { Link, Outlet, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, Home, MessageSquare, Users, LogOut, Menu, X } from 'lucide-react';
import clsx from 'clsx';

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const token = typeof window !== 'undefined' ? localStorage.getItem('converso_token') : null;
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const navItems = [
    { icon: Home, label: 'Overview', path: '/' },
    { icon: LayoutDashboard, label: 'Projects', path: '/projects' },
    { icon: MessageSquare, label: 'Conversations', path: '/conversations' },
    { icon: Users, label: 'Admins', path: '/admins' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const logout = () => {
    try {
      localStorage.removeItem('converso_token');
      document.cookie = 'csrftoken=; Max-Age=0; path=/';
    } catch (e) {
      void e;
    }
    navigate('/login', { replace: true });
  };

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen app-bg text-gray-100 font-sans">
      <aside
        className={clsx(
          'bg-gray-950/50 backdrop-blur-xl border-r border-gray-800/50 flex flex-col z-50 transition-transform duration-300',
          'w-64',
          'fixed inset-y-0 left-0 md:static',
          'translate-x-0 md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="p-6 border-b border-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">
                Converso
              </h1>
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Dashboard</span>
            </div>
            <button
              className="ml-auto md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group relative',
                  isActive
                    ? 'text-white bg-blue-600/10'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/50'
                )}
                onClick={() => setMobileOpen(false)}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full" />
                )}
                <item.icon size={20} className={clsx(isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800/50">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-gray-400 hover:bg-red-500/10 hover:text-red-400 group"
          >
            <LogOut size={20} className="group-hover:text-red-400 transition-colors" />
            Logout
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm md:hidden z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <main className="flex-1 overflow-auto md:ml-64">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
          <div className="mb-4 sm:mb-6 md:mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <button
                className="md:hidden mr-2 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
              >
                <Menu size={20} />
              </button>
              <span>Dashboard</span>
              <span>/</span>
              <span className="text-gray-200 capitalize">{location.pathname === '/' ? 'Overview' : location.pathname.split('/')[1]}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative hidden sm:block">
                <input 
                  className="input-base w-64 pl-10 bg-gray-900/50 border-gray-800 focus:border-blue-500/50" 
                  placeholder="Search..." 
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
            </div>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
};
