
import React, { useState } from 'react';
import { Role, ResourceType, Permission } from '../types';
import { Shield, Plus, Edit, Trash2, CheckCircle2, Lock } from 'lucide-react';

interface RoleManagerProps {
  roles: Role[];
  onAddRole: (r: Role) => void;
  onUpdateRole: (r: Role) => void;
  onDeleteRole: (id: string) => void;
}

const RESOURCES: { id: ResourceType; label: string }[] = [
  { id: 'PROJECTS', label: 'Dự án' },
  { id: 'CONTRACTS', label: 'Hợp đồng' },
  { id: 'TASKS', label: 'Nhiệm vụ' },
  { id: 'KPI', label: 'Chỉ tiêu KPI' },
  { id: 'EVALUATION', label: 'Đánh giá NV' },
  { id: 'EVENTS', label: 'Sự kiện' },
  { id: 'REPORTS', label: 'Báo cáo' },
  { id: 'USERS', label: 'Người dùng' },
  { id: 'CONFIG', label: 'Cấu hình hệ thống' },
];

const RoleManager: React.FC<RoleManagerProps> = ({ roles, onAddRole, onUpdateRole, onDeleteRole }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<Role>>({
      name: '',
      description: '',
      permissions: {}
  });

  const handleOpenModal = (role?: Role) => {
    if (role) {
      setEditingRole({ ...role });
    } else {
      // Default permissions: all false
      const defaultPerms: Record<string, Permission> = {};
      RESOURCES.forEach(r => defaultPerms[r.id] = { view: false, edit: false, delete: false });
      
      setEditingRole({ 
        name: '', 
        description: '', 
        permissions: defaultPerms 
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRole.id) {
        onUpdateRole(editingRole as Role);
    } else {
        onAddRole({ ...editingRole, id: `role_${Date.now()}` } as Role);
    }
    setIsModalOpen(false);
  };

  const togglePermission = (resource: ResourceType, action: keyof Permission) => {
      const perms = { ...(editingRole.permissions || {}) };
      if (!perms[resource]) perms[resource] = { view: false, edit: false, delete: false };
      
      perms[resource] = {
          ...perms[resource],
          [action]: !perms[resource][action]
      };
      
      // Logic: If edit or delete is true, view must be true
      if (action !== 'view' && perms[resource][action]) {
          perms[resource].view = true;
      }
      // Logic: If view is false, edit and delete must be false
      if (action === 'view' && !perms[resource].view) {
          perms[resource].edit = false;
          perms[resource].delete = false;
      }

      setEditingRole({ ...editingRole, permissions: perms });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-800">Quản lý Vai trò & Phân quyền</h3>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium"
        >
          <Plus className="w-4 h-4" /> Thêm Vai trò
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map(role => (
              <div key={role.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative group">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                          <Shield className="w-6 h-6" />
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => handleOpenModal(role)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded">
                              <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => onDeleteRole(role.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                              <Trash2 className="w-4 h-4" />
                          </button>
                      </div>
                  </div>
                  <h4 className="font-bold text-slate-800 text-lg">{role.name}</h4>
                  <p className="text-sm text-slate-500 mt-1 mb-4 h-10 line-clamp-2">{role.description || 'Chưa có mô tả'}</p>
                  
                  <div className="border-t border-slate-100 pt-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Quyền truy cập</div>
                      <div className="flex flex-wrap gap-2">
                          {Object.entries(role.permissions).filter(([, p]) => (p as Permission).view).slice(0, 4).map(([key]) => (
                              <span key={key} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded">
                                  {RESOURCES.find(r => r.id === key)?.label}
                              </span>
                          ))}
                          {Object.keys(role.permissions).filter(k => role.permissions[k].view).length > 4 && (
                              <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded">...</span>
                          )}
                      </div>
                  </div>
              </div>
          ))}
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
                  <h2 className="text-xl font-bold mb-6 text-slate-800">{editingRole.id ? 'Sửa Vai trò' : 'Tạo Vai trò Mới'}</h2>
                  <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Tên vai trò <span className="text-red-500">*</span></label>
                              <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={editingRole.name} onChange={e => setEditingRole({...editingRole, name: e.target.value})} placeholder="VD: Cộng tác viên" />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
                              <input type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={editingRole.description} onChange={e => setEditingRole({...editingRole, description: e.target.value})} placeholder="Mô tả ngắn gọn..." />
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                              <Lock className="w-4 h-4" /> Phân quyền chi tiết
                          </label>
                          <div className="border border-slate-200 rounded-lg overflow-hidden">
                              <table className="w-full text-sm text-left">
                                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                      <tr>
                                          <th className="px-4 py-3">Chức năng</th>
                                          <th className="px-4 py-3 text-center w-24">Xem</th>
                                          <th className="px-4 py-3 text-center w-24">Thêm/Sửa</th>
                                          <th className="px-4 py-3 text-center w-24">Xóa</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                      {RESOURCES.map(res => {
                                          const perm = editingRole.permissions?.[res.id] || { view: false, edit: false, delete: false };
                                          return (
                                              <tr key={res.id} className="hover:bg-slate-50">
                                                  <td className="px-4 py-3 font-medium text-slate-700">{res.label}</td>
                                                  <td className="px-4 py-3 text-center">
                                                      <input 
                                                          type="checkbox" 
                                                          checked={perm.view} 
                                                          onChange={() => togglePermission(res.id, 'view')}
                                                          className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                      />
                                                  </td>
                                                  <td className="px-4 py-3 text-center">
                                                      <input 
                                                          type="checkbox" 
                                                          checked={perm.edit} 
                                                          onChange={() => togglePermission(res.id, 'edit')}
                                                          disabled={!perm.view}
                                                          className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                                                      />
                                                  </td>
                                                  <td className="px-4 py-3 text-center">
                                                      <input 
                                                          type="checkbox" 
                                                          checked={perm.delete} 
                                                          onChange={() => togglePermission(res.id, 'delete')}
                                                          disabled={!perm.view}
                                                          className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                                                      />
                                                  </td>
                                              </tr>
                                          );
                                      })}
                                  </tbody>
                              </table>
                          </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
                          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium">
                              <CheckCircle2 className="w-4 h-4" /> Lưu vai trò
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default RoleManager;
