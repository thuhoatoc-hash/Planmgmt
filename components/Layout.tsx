
import React, { useEffect, useState } from 'react';
import { LayoutDashboard, FolderKanban, Tags, Users, LogOut, Menu, X, Settings, Briefcase, Signal, BarChart3, Download, Target, Award } from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenProfile: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, currentPath, onNavigate, onOpenProfile }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'kpi', label: 'Điều hành chỉ tiêu', icon: Target },
    { id: 'evaluation', label: 'Đánh giá KI', icon: Award }, // New Menu Item
    { id: 'reports', label: 'Báo cáo', icon: BarChart3 },
    { id: 'projects', label: 'Dự án', icon: FolderKanban },
    { id: 'partners', label: 'Đối tác', icon: Briefcase },
    { id: 'categories', label: 'Danh mục', icon: Tags },
    ...(user?.role === 'ADMIN' ? [
        { id: 'users', label: 'Người dùng', icon: Users },
        { id: 'settings', label: 'Cấu hình', icon: Settings }
    ] : []),
  ];

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        <div className="flex items-center justify-center h-20 border-b border-slate-200 px-4 bg-white">
          <div className="flex flex-col items-center">
             <div className="flex items-center gap-2 text-[#EE0033]">
                <Signal className="h-6 w-6" />
                <span className="text-xl font-bold tracking-tight">VIETTEL</span>
             </div>
             <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hà Nội</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = currentPath === item.id || currentPath.startsWith(item.id);
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-red-50 text-[#EE0033]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-[#EE0033]' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 bg-white">
          {/* Install Button */}
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="flex items-center w-full px-4 py-2 mb-3 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Cài đặt App
            </button>
          )}

          <button 
            onClick={onOpenProfile}
            className="flex items-center gap-3 mb-3 px-2 w-full hover:bg-slate-50 p-2 rounded-lg transition-colors text-left"
          >
            {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
            ) : (
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-[#EE0033] font-bold text-sm">
                {user?.fullName.charAt(0)}
                </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.fullName}</p>
              <p className="text-xs text-slate-500 truncate">{user?.role}</p>
            </div>
          </button>
          <button
            onClick={onLogout}
            className="flex items-center w-full px-2 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Đăng xuất
          </button>
          
          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400">Copyright @ Dzung Nguyen</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header (Mobile only mainly) */}
        <header className="lg:hidden bg-white border-b border-slate-200 h-16 flex items-center px-4 justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <Signal className="h-6 w-6 text-[#EE0033]" />
            <span className="text-[#EE0033] font-bold">Viettel Hà Nội</span>
          </div>
          <button onClick={toggleSidebar} className="p-2 rounded-md hover:bg-slate-100 text-slate-600">
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
