
import React, { useEffect, useState } from 'react';
import { LayoutDashboard, FolderKanban, LogOut, Menu, X, Settings, BarChart3, Download, Target, Award, CheckSquare, CalendarDays } from 'lucide-react';
import { User, Role, UserRole, ResourceType } from '../types';

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
      'kpi': 'KPI',
      'evaluation': 'EVALUATION',
      'events': 'EVENTS',
      'reports': 'REPORTS',
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

  // Updated Menu Structure
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Quản lý Nhiệm vụ', icon: CheckSquare }, 
    { id: 'projects', label: 'Dự án', icon: FolderKanban },
    { id: 'kpi', label: 'Điều hành chỉ tiêu', icon: Target },
    { id: 'evaluation', label: 'Đánh giá KI', icon: Award },
    { id: 'events', label: 'Sự kiện (Sinh nhật)', icon: CalendarDays },
    { id: 'reports', label: 'Báo cáo', icon: BarChart3 },
    { id: 'settings', label: 'Cấu hình hệ thống', icon: Settings }
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
        <div className="flex items-center justify-center h-20 border-b border-slate-200 px-4 bg-white">
          <div className="flex flex-col items-center">
             <img 
               src="https://viettel.com.vn/static/images/logo-header.0ce71c2fd94a.png" 
               alt="Viettel Logo" 
               className="h-10 object-contain mb-1"
             />
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hà Nội</span>
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
          
          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400">Copyright @ Dzung Nguyen</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header (Mobile only mainly) */}
        <header className="lg:hidden bg-white border-b border-slate-200 h-16 flex items-center px-4 justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <img 
               src="https://viettel.com.vn/static/images/logo-header.0ce71c2fd94a.png" 
               alt="Viettel" 
               className="h-8 object-contain"
             />
             <span className="text-slate-500 font-bold text-sm uppercase border-l border-slate-300 pl-2 ml-1">Hà Nội</span>
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
