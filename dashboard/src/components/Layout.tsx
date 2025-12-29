import React from 'react';
import { Link, Outlet, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, Home, Code, MessageSquare, Users, LogOut } from 'lucide-react';
import clsx from 'clsx';

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const token = typeof window !== 'undefined' ? localStorage.getItem('converso_token') : null;

  const navItems = [
    { icon: Home, label: 'Overview', path: '/' },
    { icon: LayoutDashboard, label: 'Projects', path: '/projects' },
    { icon: Code, label: 'Embed', path: '/embed' },
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
    <div className="flex h-screen app-bg text-gray-100">
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Converso
            </h1>
            <span className="px-2 py-1 text-xs rounded-md bg-blue-950/40 border border-blue-900 text-blue-300">Dashboard</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                location.pathname === item.path
                  ? 'bg-blue-950/40 text-blue-300'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-gray-100'
              )}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-gray-300 hover:bg-gray-800 hover:text-gray-100"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600" />
              <span className="text-sm text-gray-400">Converso</span>
            </div>
            <div className="flex items-center gap-3">
              <input className="input-base w-64" placeholder="Search" />
            </div>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
};
