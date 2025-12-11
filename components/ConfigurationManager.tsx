
import React, { useState } from 'react';
import { ProjectStatusItem, User, Partner, Category, Project, Contract, UserRole } from '../types';
import { Edit, Trash2, List, Settings, Users, Tags, Briefcase } from 'lucide-react';
import UserManager from './UserManager';
import PartnerManager from './PartnerManager';
import CategoryManager from './CategoryManager';

interface ConfigurationManagerProps {
  currentUser: User;
  statuses: ProjectStatusItem[];
  users: User[];
  partners: Partner[];
  categories: Category[];
  projects: Project[]; // Needed for PartnerManager logic
  contracts: Contract[]; // Needed for PartnerManager logic
  
  // Status Handlers
  onAddStatus: (s: ProjectStatusItem) => void;
  onUpdateStatus: (s: ProjectStatusItem) => void;
  onDeleteStatus: (id: string) => void;

  // User Handlers
  onAddUser: (u: User) => void;
  onUpdateUser: (u: User) => void;
  onDeleteUser: (id: string) => void;

  // Partner Handlers
  onAddPartner: (p: Partner) => void;
  onUpdatePartner: (p: Partner) => void;
  onDeletePartner: (id: string) => void;

  // Category Handlers
  onAddCategory: (c: Category) => void;
  onDeleteCategory: (id: string) => void;
}

const ConfigurationManager: React.FC<ConfigurationManagerProps> = ({ 
    currentUser,
    statuses, users, partners, categories, projects, contracts,
    onAddStatus, onUpdateStatus, onDeleteStatus,
    onAddUser, onUpdateUser, onDeleteUser,
    onAddPartner, onUpdatePartner, onDeletePartner,
    onAddCategory, onDeleteCategory
}) => {
  const [activeTab, setActiveTab] = useState<'STATUS' | 'USERS' | 'PARTNERS' | 'CATEGORIES'>('STATUS');
  
  // Status Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Partial<ProjectStatusItem>>({});

  const handleOpenStatusModal = (s?: ProjectStatusItem) => {
    if (s) {
      setEditingStatus({ ...s });
    } else {
      setEditingStatus({ name: '', color: 'bg-slate-100 text-slate-700', order: statuses.length + 1 });
    }
    setIsStatusModalOpen(true);
  };

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStatus.id) {
      onUpdateStatus(editingStatus as ProjectStatusItem);
    } else {
      onAddStatus({ ...editingStatus, id: `st_${Date.now()}` } as ProjectStatusItem);
    }
    setIsStatusModalOpen(false);
  };

  const sortedStatuses = [...statuses].sort((a, b) => a.order - b.order);

  const tabs = [
      { id: 'STATUS', label: 'Trạng thái Dự án', icon: List },
      { id: 'PARTNERS', label: 'Quản lý Đối tác', icon: Briefcase },
      { id: 'CATEGORIES', label: 'Danh mục Thu/Chi', icon: Tags },
      // Only show Users tab if Admin
      ...(currentUser.role === UserRole.ADMIN ? [{ id: 'USERS', label: 'Quản lý Người dùng', icon: Users }] : []),
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)]">
      {/* Sidebar Navigation */}
      <div className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 h-full">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 px-2">
                  <Settings className="w-5 h-5 text-indigo-600" /> Cấu hình
              </h2>
              <nav className="space-y-1">
                  {tabs.map(tab => (
                      <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              activeTab === tab.id 
                                ? 'bg-indigo-50 text-indigo-700' 
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                      >
                          <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                          {tab.label}
                      </button>
                  ))}
              </nav>
          </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-y-auto">
          {activeTab === 'STATUS' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-800">Cấu hình Trạng thái Dự án</h3>
                    <button 
                        onClick={() => handleOpenStatusModal()}
                        className="text-sm bg-indigo-600 text-white shadow-sm px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2"
                    >
                        <List className="w-4 h-4" /> Thêm trạng thái
                    </button>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 text-sm font-semibold text-slate-600 flex justify-between">
                        <span>Tên trạng thái</span>
                        <span>Thao tác</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {sortedStatuses.map(s => (
                            <div key={s.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 text-xs flex items-center justify-center font-bold">
                                        {s.order}
                                    </span>
                                    <div>
                                        <div className="font-medium text-slate-800">{s.name}</div>
                                        <div className={`text-xs px-2 py-0.5 rounded inline-block mt-1 ${s.color}`}>Màu hiển thị</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenStatusModal(s)} className="p-2 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => onDeleteStatus(s.id)} className="p-2 text-slate-400 hover:text-red-600 rounded hover:bg-red-50">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              </div>
          )}

          {activeTab === 'PARTNERS' && (
              <PartnerManager 
                  partners={partners}
                  projects={projects}
                  contracts={contracts}
                  onAdd={onAddPartner}
                  onUpdate={onUpdatePartner}
                  onDelete={onDeletePartner}
              />
          )}

          {activeTab === 'CATEGORIES' && (
              <CategoryManager 
                  categories={categories}
                  onAddCategory={onAddCategory}
                  onDeleteCategory={onDeleteCategory}
              />
          )}

          {activeTab === 'USERS' && currentUser.role === UserRole.ADMIN && (
              <UserManager 
                  users={users}
                  onAddUser={onAddUser}
                  onUpdateUser={onUpdateUser}
                  onDeleteUser={onDeleteUser}
              />
          )}
      </div>

      {/* Status Modal (Kept local here as it's small) */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold mb-4">{editingStatus.id ? 'Sửa Trạng thái' : 'Thêm Trạng thái'}</h2>
            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên trạng thái</label>
                <input required type="text" className="w-full p-2 border rounded" value={editingStatus.name} onChange={e => setEditingStatus({...editingStatus, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Thứ tự</label>
                    <input required type="number" className="w-full p-2 border rounded" value={editingStatus.order} onChange={e => setEditingStatus({...editingStatus, order: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Màu sắc (Tailwind Class)</label>
                    <input type="text" className="w-full p-2 border rounded" value={editingStatus.color} onChange={e => setEditingStatus({...editingStatus, color: e.target.value})} placeholder="bg-blue-100 text-blue-700" />
                  </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsStatusModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigurationManager;
