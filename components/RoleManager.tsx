
import React, { useState } from 'react';
import { Role, ResourceType, Permission } from '../types';
import { Shield, Plus, Edit, Trash2, CheckCircle2, Lock } from 'lucide-react';

interface RoleManagerProps {
  roles: Role[];
  onAddRole: (r: Role) => void;
  onUpdateRole: (r: Role) => void;
  onDeleteRole: (id: string) => void;
}

const RESOURCES: { id: ResourceType; label: string; desc: string }[] = [
  { id: 'PROJECTS', label: 'Quản lý Dự án', desc: 'Xem danh sách, chi tiết dự án' },
  { id: 'CONTRACTS', label: 'Hợp đồng & Tài chính', desc: 'Quản lý hợp đồng đầu ra/vào, dòng tiền' },
  { id: 'TASKS', label: 'Quản lý Nhiệm vụ', desc: 'Giao việc, cập nhật tiến độ' },
  { id: 'ATTENDANCE', label: 'Chấm công & OT', desc: 'Duyệt chấm công, quản lý ngày công' },
  { id: 'KPI', label: 'Chỉ tiêu KPI', desc: 'Thiết lập và nhập liệu KPI tháng' },
  { id: 'EVALUATION', label: 'Đánh giá Nhân sự (KI)', desc: 'Chấm điểm KI nhân viên' },
  { id: 'REPORTS', label: 'Báo cáo & Thống kê', desc: 'Dashboard, Báo cáo tuần, Xuất Excel' },
  { id: 'EVENTS', label: 'Sự kiện & Sinh nhật', desc: 'Quản lý sự kiện nội bộ' },
  { id: 'NOTIFICATIONS', label: 'Thông báo hệ thống', desc: 'Gửi thông báo đẩy' },
  { id: 'USERS', label: 'Người dùng & Logs', desc: 'Quản lý tài khoản, xem lịch sử' },
  { id: 'CONFIG', label: 'Cấu hình Hệ thống', desc: 'Cài đặt danh mục, banner, tham số' },
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

  const handleDelete = (id: string) => {
      if (window.confirm('Bạn có chắc chắn muốn xóa vai trò này? Hành động này sẽ ảnh hưởng đến các người dùng đang được gán vai trò này.')) {
          onDeleteRole(id);
      }
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
                <Plus className="w-4 h-4" /> Thêm vai trò
            </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
            {roles.map(role => (
                <div key={role.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-slate-800">{role.name}</h4>
                                <p className="text-slate-500 text-sm">{role.description}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleOpenModal(role)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded">
                                <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(role.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {RESOURCES.map(res => {
                            const p = role.permissions?.[res.id] || { view: false, edit: false, delete: false };
                            if (!p.view && !p.edit && !p.delete) return null;
                            
                            return (
                                <div key={res.id} className="text-xs flex items-center gap-2 text-slate-600 bg-slate-50 px-2 py-1.5 rounded border border-slate-100">
                                    <span className="font-bold text-slate-700">{res.label}:</span>
                                    <div className="flex gap-1">
                                        {p.view && <span className="text-blue-600 bg-blue-50 px-1 rounded">Xem</span>}
                                        {p.edit && <span className="text-orange-600 bg-orange-50 px-1 rounded">Sửa</span>}
                                        {p.delete && <span className="text-red-600 bg-red-50 px-1 rounded">Xóa</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>

        {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl max-w-4xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                    <h2 className="text-xl font-bold mb-6 text-slate-800">{editingRole.id ? 'Sửa Vai trò' : 'Thêm Vai trò Mới'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên vai trò <span className="text-red-500">*</span></label>
                                <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={editingRole.name} onChange={e => setEditingRole({...editingRole, name: e.target.value})} placeholder="VD: Trưởng phòng, Nhân viên..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
                                <input type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={editingRole.description} onChange={e => setEditingRole({...editingRole, description: e.target.value})} placeholder="Mô tả ngắn gọn..." />
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <Lock className="w-4 h-4" /> Phân quyền chi tiết
                            </h4>
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3">Chức năng</th>
                                            <th className="px-4 py-3">Mô tả</th>
                                            <th className="px-4 py-3 text-center w-24">Xem</th>
                                            <th className="px-4 py-3 text-center w-24">Sửa/Tạo</th>
                                            <th className="px-4 py-3 text-center w-24">Xóa</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {RESOURCES.map(res => {
                                            const p = editingRole.permissions?.[res.id] || { view: false, edit: false, delete: false };
                                            return (
                                                <tr key={res.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-medium text-slate-800">{res.label}</td>
                                                    <td className="px-4 py-3 text-slate-500 text-xs">{res.desc}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <input type="checkbox" checked={p.view} onChange={() => togglePermission(res.id, 'view')} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <input type="checkbox" checked={p.edit} onChange={() => togglePermission(res.id, 'edit')} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <input type="checkbox" checked={p.delete} onChange={() => togglePermission(res.id, 'delete')} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Hủy</button>
                            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2">
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
