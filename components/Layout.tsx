
import React, { useEffect, useState } from 'react';
import { LayoutDashboard, FolderKanban, LogOut, Menu, X, Settings, BarChart3, Download, Target, Award, CheckSquare, CalendarDays, Signal, Bell, Clock, FileText } from 'lucide-react';
import { User, Role, UserRole, ResourceType } from '../types';
import BannerSlider from './BannerSlider';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  roles?: Role[]; // Roles passed from App
  onLogout: () => void;
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenProfile: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, roles = [], onLogout, currentPath, onNavigate, onOpenProfile }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Map menu IDs to ResourceType for permission checking
  const MENU_RESOURCE_MAP: Record<string, ResourceType> = {
      'dashboard': 'PROJECTS', // Default accessible, logic below overrides
      'tasks': 'TASKS',
      'projects': 'PROJECTS',
      'attendance': 'ATTENDANCE',
      'kpi': 'KPI',
      'evaluation': 'EVALUATION',
      'events': 'EVENTS',
      'reports': 'REPORTS',
      'weekly_report': 'REPORTS', // New Item maps to REPORTS permission
      'notifications': 'NOTIFICATIONS',
      'settings': 'CONFIG'
  };

  // Helper to check if a menu item should be shown
  const canViewMenu = (itemId: string) => {
      // Dashboard is always visible
      if (itemId === 'dashboard') return true;

      // Super Admin bypass
      if (user?.role === UserRole.ADMIN) return true;

      // Legacy fallback: if no roleId, allow all (or restrict as needed)
      if (!user?.roleId) return true;

      const userRole = roles.find(r => r.id === user.roleId);
      if (!userRole) return false; // Role not found? Deny.

      const resource = MENU_RESOURCE_MAP[itemId];
      // Check 'view' permission for the resource
      return userRole.permissions?.[resource]?.view || false;
  };

  // Updated Menu Structure - Reordered as requested
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Điểm danh', icon: Clock },
    { id: 'kpi', label: 'Điều hành chỉ tiêu', icon: Target },
    { id: 'evaluation', label: 'Đánh giá KI', icon: Award }, // Placed near KPI
    { id: 'projects', label: 'Dự án', icon: FolderKanban },
    { id: 'tasks', label: 'Quản lý nhiệm vụ', icon: CheckSquare }, 
    { id: 'events', label: 'Sự kiện', icon: CalendarDays },
    { id: 'reports', label: 'Thống kê & biểu đồ', icon: BarChart3 },
    { id: 'weekly_report', label: 'Báo cáo tuần', icon: FileText }, // Placed near Reports
    { id: 'notifications', label: 'Thông báo', icon: Bell },
    { id: 'settings', label: 'Cấu hình', icon: Settings }
  ].filter(item => canViewMenu(item.id));

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
  };

  // Get display role name
  const roleName = user?.roleId 
    ? roles.find(r => r.id === user.roleId)?.name 
    : user?.role;

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
        <div 
            className="flex flex-col items-center justify-center py-6 border-b border-slate-200 px-4 bg-white text-center cursor-pointer hover:bg-slate-50 transition-colors group"
            onClick={() => onNavigate('dashboard')}
            title="Về trang chủ Dashboard"
        >
             <div className="w-10 h-10 bg-[#EE0033] rounded-lg flex items-center justify-center text-white mb-2 shadow-sm group-hover:scale-105 transition-transform">
                <Signal className="w-6 h-6" />
             </div>
             <span className="text-[10px] font-bold text-slate-700 uppercase leading-relaxed px-1">
                HT QUẢN LÝ, ĐIỀU HÀNH SXKD GPCNTT
             </span>
             <span className="text-[10px] font-bold text-[#EE0033] uppercase tracking-wider mt-0.5">
                VIETTEL HÀ NỘI
             </span>
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
              <p className="text-xs text-slate-500 truncate">{roleName}</p>
            </div>
          </button>
          <button
            onClick={onLogout}
            className="flex items-center w-full px-2 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header (Mobile only mainly) */}
        <header className="lg:hidden bg-white border-b border-slate-200 h-16 flex items-center px-4 justify-between sticky top-0 z-20">
          <div 
            className="flex items-center gap-3 overflow-hidden cursor-pointer active:opacity-70"
            onClick={() => onNavigate('dashboard')}
          >
             <div className="w-8 h-8 bg-[#EE0033] rounded-md flex items-center justify-center text-white shadow-sm shrink-0">
                <Signal className="w-5 h-5" />
             </div>
             <div className="flex flex-col justify-center border-l border-slate-300 pl-3 min-w-0">
                 <span className="text-slate-800 font-bold text-[10px] uppercase truncate leading-tight">HT QUẢN LÝ, ĐIỀU HÀNH SXKD GPCNTT</span>
                 <span className="text-[#EE0033] font-bold text-[10px] uppercase truncate leading-tight">VIETTEL HÀ NỘI</span>
             </div>
          </div>
          <button onClick={toggleSidebar} className="p-2 rounded-md hover:bg-slate-100 text-slate-600 shrink-0">
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        <main className="flex-1 overflow-auto flex flex-col">
          {/* Banner Slider Area - Global for all pages */}
          <BannerSlider />

          <div className="flex-1 p-4 lg:p-8">
            <div className="max-w-7xl mx-auto w-full h-full">
              {children}
            </div>
          </div>
          
          {/* Footer */}
          <footer className="py-6 text-center border-t border-slate-200 w-full mt-auto">
             <div className="flex flex-col items-center justify-center gap-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    © {new Date().getFullYear()} Khối Giải pháp Công nghệ thông tin - Viettel Hà Nội
                </p>
                <p className="text-[10px] text-slate-400">
                    Hệ thống quản lý, điều hành SXKD GPCNTT • Version 1.5
                </p>
             </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default Layout;
