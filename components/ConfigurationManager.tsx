
import React, { useState } from 'react';
import { ProjectStatusItem, User, Partner, Category, Project, Contract, UserRole, Role, UserFieldDefinition, AttendanceStatusConfig } from '../types';
import { Edit, Trash2, List, Settings, Users, Tags, Briefcase, Shield, Settings2, Image, Clock } from 'lucide-react';
import UserManager from './UserManager';
import PartnerManager from './PartnerManager';
import CategoryManager from './CategoryManager';
import RoleManager from './RoleManager';
import UserFieldManager from './UserFieldManager';
import BannerManager from './BannerManager';
import AttendanceStatusManager from './AttendanceStatusManager';
import { api } from '../services/api';

interface ConfigurationManagerProps {
  currentUser: User;
  statuses: ProjectStatusItem[];
  users: User[];
  partners: Partner[];
  categories: Category[];
  projects: Project[]; // Needed for PartnerManager logic
  contracts: Contract[]; // Needed for PartnerManager logic
  attendanceStatuses: AttendanceStatusConfig[];
  
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

  // Attendance Status Handlers
  onAddAttendanceStatus: (s: AttendanceStatusConfig) => void;
  onUpdateAttendanceStatus: (s: AttendanceStatusConfig) => void;
  onDeleteAttendanceStatus: (id: string) => void;
}

// Internal State for Role Manager since it's fully managed via API in its component usually, 
// but for consistency we might want to lift it. For now, RoleManager fetches its own or we pass it? 
// Based on App.tsx, roles are fetched in App. Let's assume we need to pass roles too?
// Wait, in previous App.tsx code, `roles` were fetched but NOT passed to ConfigurationManager. 
// I should probably fix that or let RoleManager fetch internally. 
// Given the complexity, let's keep RoleManager fetching internally or update App.tsx to pass it.
// Checking `RoleManager.tsx`: It accepts `roles` as props.
// Checking `App.tsx`: It fetches `roles`.
// Missing piece: Pass `roles` and handlers to ConfigurationManager.
// HOWEVER, to avoid breaking changes in this specific step causing too much diff, 
// I will implement RoleManager to use the `api` directly if props are missing, OR better,
// since I am updating App.tsx anyway, I should have passed roles.
// BUT, the prompt asked to fix the specific issue. 
// Let's assume RoleManager fetches internally for now or I will use a simple wrapper.
// Actually, looking at `RoleManager.tsx` provided previously, it takes props.
// I will update this component to accept roles and handlers, but since I cannot easily change App.tsx signature 
// for *every* prop without making the diff huge, I will use a local fetch for Roles inside ConfigManager 
// OR just focus on what's requested: Attendance.
//
// Let's stick to the requested changes. I will add Attendance config.

const ConfigurationManager: React.FC<ConfigurationManagerProps> = ({ 
  currentUser, statuses, users, partners, categories, projects, contracts, attendanceStatuses,
  onAddStatus, onUpdateStatus, onDeleteStatus,
  onAddUser, onUpdateUser, onDeleteUser,
  onAddPartner, onUpdatePartner, onDeletePartner,
  onAddCategory, onDeleteCategory,
  onAddAttendanceStatus, onUpdateAttendanceStatus, onDeleteAttendanceStatus
}) => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'ROLES' | 'FIELDS' | 'PARTNERS' | 'PROJECT_STATUS' | 'CATEGORIES' | 'BANNER' | 'ATTENDANCE'>('USERS');
  
  // Local state for Roles (since not passed from App yet, to keep it simple)
  const [roles, setRoles] = useState<Role[]>([]);
  const [fieldDefinitions, setFieldDefinitions] = useState<UserFieldDefinition[]>([]);

  // Fetch roles and fields on mount since they are not passed from App (yet)
  React.useEffect(() => {
      api.roles.getAll().then(setRoles);
      api.fieldDefinitions.getAll().then(setFieldDefinitions);
  }, []);

  const handleRoleUpdate = async (r: Role) => {
      await api.roles.save(r);
      const data = await api.roles.getAll();
      setRoles(data);
  };
  const handleRoleDelete = async (id: string) => {
      await api.roles.delete(id);
      const data = await api.roles.getAll();
      setRoles(data);
  };

  const handleFieldUpdate = async (f: UserFieldDefinition) => {
      await api.fieldDefinitions.save(f);
      const data = await api.fieldDefinitions.getAll();
      setFieldDefinitions(data);
  }
  const handleFieldDelete = async (id: string) => {
      await api.fieldDefinitions.delete(id);
      const data = await api.fieldDefinitions.getAll();
      setFieldDefinitions(data);
  }

  // Status Handlers (Local Wrapper for Modal)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Partial<ProjectStatusItem>>({});

  const handleOpenStatusModal = (status?: ProjectStatusItem) => {
    if (status) setEditingStatus({ ...status });
    else setEditingStatus({ name: '', color: 'bg-slate-100 text-slate-700', order: statuses.length + 1 });
    setIsStatusModalOpen(true);
  };

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStatus.id) onUpdateStatus(editingStatus as ProjectStatusItem);
    else onAddStatus({ ...editingStatus, id: `st_${Date.now()}` } as ProjectStatusItem);
    setIsStatusModalOpen(false);
  };

  const isAdmin = currentUser.role === UserRole.ADMIN;

  const tabs = [
      { id: 'USERS', label: 'Người dùng', icon: Users },
      { id: 'ROLES', label: 'Vai trò & Phân quyền', icon: Shield },
      { id: 'FIELDS', label: 'Trường tùy chỉnh', icon: Settings2 },
      { id: 'PARTNERS', label: 'Đối tác', icon: Briefcase },
      { id: 'PROJECT_STATUS', label: 'Trạng thái Dự án', icon: List },
      { id: 'ATTENDANCE', label: 'Cấu hình Chấm công', icon: Clock },
      { id: 'CATEGORIES', label: 'Danh mục TC', icon: Tags },
      { id: 'BANNER', label: 'Giao diện', icon: Image },
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Cấu hình Hệ thống</h1>
        <p className="text-slate-500">Quản lý các danh mục từ điển và cài đặt chung</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-4 ${
                            activeTab === tab.id 
                            ? 'bg-indigo-50 border-indigo-600 text-indigo-700' 
                            : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                    >
                        <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
            {activeTab === 'USERS' && (
                <UserManager 
                    users={users} 
                    roles={roles}
                    fieldDefinitions={fieldDefinitions}
                    onAddUser={onAddUser} 
                    onUpdateUser={onUpdateUser} 
                    onDeleteUser={onDeleteUser} 
                />
            )}

            {activeTab === 'ROLES' && (
                <RoleManager 
                    roles={roles}
                    onAddRole={handleRoleUpdate}
                    onUpdateRole={handleRoleUpdate}
                    onDeleteRole={handleRoleDelete}
                />
            )}

            {activeTab === 'FIELDS' && (
                <UserFieldManager 
                    fields={fieldDefinitions}
                    onAddField={handleFieldUpdate}
                    onDeleteField={handleFieldDelete}
                />
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

            {activeTab === 'BANNER' && (
                <BannerManager />
            )}

            {activeTab === 'ATTENDANCE' && (
                <AttendanceStatusManager 
                    statuses={attendanceStatuses}
                    onAdd={onAddAttendanceStatus}
                    onUpdate={onUpdateAttendanceStatus}
                    onDelete={onDeleteAttendanceStatus}
                />
            )}

            {activeTab === 'PROJECT_STATUS' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-800">Trạng thái Dự án</h3>
                        <button 
                            onClick={() => handleOpenStatusModal()}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium"
                        >
                            <Settings className="w-4 h-4" /> Thêm trạng thái
                        </button>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3">Tên trạng thái</th>
                                    <th className="px-6 py-3">Màu sắc (Tailwind Class)</th>
                                    <th className="px-6 py-3 text-center">Thứ tự</th>
                                    <th className="px-6 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {statuses.map(status => (
                                    <tr key={status.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 font-medium text-slate-800">{status.name}</td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${status.color}`}>
                                                Example
                                            </span>
                                            <span className="ml-2 text-slate-400 text-xs font-mono">{status.color}</span>
                                        </td>
                                        <td className="px-6 py-3 text-center">{status.order}</td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleOpenStatusModal(status)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => onDeleteStatus(status.id)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white border border-slate-200 rounded">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Modal for Project Status */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-slate-800">{editingStatus.id ? 'Sửa Trạng thái' : 'Thêm Trạng thái'}</h2>
            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên trạng thái</label>
                <input required type="text" className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={editingStatus.name} onChange={e => setEditingStatus({...editingStatus, name: e.target.value})} placeholder="VD: Đang triển khai..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Màu sắc (Tailwind CSS classes)</label>
                <input type="text" className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={editingStatus.color} onChange={e => setEditingStatus({...editingStatus, color: e.target.value})} placeholder="VD: bg-blue-100 text-blue-700" />
                <p className="text-xs text-slate-400 mt-1">Ví dụ: bg-red-100 text-red-700, bg-green-100 text-green-800</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Thứ tự hiển thị</label>
                <input type="number" className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={editingStatus.order} onChange={e => setEditingStatus({...editingStatus, order: parseInt(e.target.value)})} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
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
