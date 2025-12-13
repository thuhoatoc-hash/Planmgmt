
import React, { useState } from 'react';
import { ProjectStatusItem, User, Partner, Category, Project, Contract, Role, UserFieldDefinition, AttendanceStatusConfig, AttendanceSystemConfig } from '../types';
import { Edit, Trash2, List, Settings, Users, Tags, Briefcase, Shield, Settings2, Image, Clock, ToggleLeft, ToggleRight, Save, Loader2 } from 'lucide-react';
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
  projects: Project[]; 
  contracts: Contract[];
  attendanceStatuses: AttendanceStatusConfig[];
  
  onAddStatus: (s: ProjectStatusItem) => void;
  onUpdateStatus: (s: ProjectStatusItem) => void;
  onDeleteStatus: (id: string) => void;

  onAddUser: (u: User) => void;
  onUpdateUser: (u: User) => void;
  onDeleteUser: (id: string) => void;

  onAddPartner: (p: Partner) => void;
  onUpdatePartner: (p: Partner) => void;
  onDeletePartner: (id: string) => void;

  onAddCategory: (c: Category) => void;
  onDeleteCategory: (id: string) => void;

  onAddAttendanceStatus: (s: AttendanceStatusConfig) => void;
  onUpdateAttendanceStatus: (s: AttendanceStatusConfig) => void;
  onDeleteAttendanceStatus: (id: string) => void;
}

const ConfigurationManager: React.FC<ConfigurationManagerProps> = ({ 
  currentUser, statuses, users, partners, categories, projects, contracts, attendanceStatuses,
  onAddStatus, onUpdateStatus, onDeleteStatus,
  onAddUser, onUpdateUser, onDeleteUser,
  onAddPartner, onUpdatePartner, onDeletePartner,
  onAddCategory, onDeleteCategory,
  onAddAttendanceStatus, onUpdateAttendanceStatus, onDeleteAttendanceStatus
}) => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'ROLES' | 'FIELDS' | 'PARTNERS' | 'PROJECT_STATUS' | 'CATEGORIES' | 'BANNER' | 'ATTENDANCE'>('USERS');
  
  const [roles, setRoles] = useState<Role[]>([]);
  const [fieldDefinitions, setFieldDefinitions] = useState<UserFieldDefinition[]>([]);
  
  // Attendance System Config
  const [attConfig, setAttConfig] = useState<AttendanceSystemConfig>({ defaultBehavior: 'PRESENT', workingDays: [1,2,3,4,5] });
  const [loadingAttConfig, setLoadingAttConfig] = useState(false);

  React.useEffect(() => {
      api.roles.getAll().then(setRoles);
      api.fieldDefinitions.getAll().then(setFieldDefinitions);
      api.settings.getAttendanceConfig().then(cfg => {
          if (cfg) setAttConfig(cfg);
      });
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

  const handleSaveAttConfig = async () => {
      setLoadingAttConfig(true);
      await api.settings.saveAttendanceConfig(attConfig);
      setLoadingAttConfig(false);
      alert("Đã lưu cấu hình chấm công thành công!");
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
                <div className="space-y-8">
                    {/* General Settings */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-indigo-600" /> Cài đặt Chấm công Chung
                        </h4>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <div>
                                    <p className="font-medium text-slate-700">Mặc định khi Không điểm danh</p>
                                    <p className="text-xs text-slate-500 mt-1">Áp dụng cho báo cáo khi nhân viên không có bản ghi nào trong ngày làm việc.</p>
                                </div>
                                <button 
                                    onClick={() => setAttConfig({...attConfig, defaultBehavior: attConfig.defaultBehavior === 'PRESENT' ? 'ABSENT' : 'PRESENT'})}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border ${
                                        attConfig.defaultBehavior === 'PRESENT'
                                        ? 'bg-green-50 border-green-200 text-green-700' 
                                        : 'bg-red-50 border-red-200 text-red-700'
                                    }`}
                                >
                                    {attConfig.defaultBehavior === 'PRESENT' ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                                    <span className="font-bold">{attConfig.defaultBehavior === 'PRESENT' ? 'Được tính công (Có mặt)' : 'Không tính công (Vắng)'}</span>
                                </button>
                            </div>

                            <div className="flex justify-end">
                                <button 
                                    onClick={handleSaveAttConfig}
                                    disabled={loadingAttConfig}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium shadow-sm flex items-center gap-2 disabled:opacity-50"
                                >
                                    {loadingAttConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Lưu cấu hình
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Status Types Manager */}
                    <AttendanceStatusManager 
                        statuses={attendanceStatuses}
                        onAdd={onAddAttendanceStatus}
                        onUpdate={onUpdateAttendanceStatus}
                        onDelete={onDeleteAttendanceStatus}
                    />
                </div>
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
