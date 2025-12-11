
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Shield, User as UserIcon, Phone, Edit, Trash2, Plus, Lock, Briefcase, Zap } from 'lucide-react';
import { hashPassword } from '../lib/crypto';

interface UserManagerProps {
  users: User[];
  onAddUser: (u: User) => void;
  onUpdateUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
}

const UserManager: React.FC<UserManagerProps> = ({ users, onAddUser, onUpdateUser, onDeleteUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User>>({});
  const [passwordInput, setPasswordInput] = useState('');

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser({ ...user });
      setPasswordInput(''); // Don't show existing password hash
    } else {
      setEditingUser({ 
        role: UserRole.AM, // Default to AM
        username: '', 
        fullName: '', 
        phoneNumber: '',
        avatarUrl: ''
      });
      setPasswordInput('123'); // Default password for new users
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalPassword = editingUser.password;
    if (passwordInput) {
        finalPassword = await hashPassword(passwordInput);
    }

    const userToSave = { ...editingUser, password: finalPassword } as User;

    if (editingUser.id) {
      onUpdateUser(userToSave);
    } else {
      onAddUser({ ...userToSave, id: `user_${Date.now()}` });
    }
    setIsModalOpen(false);
  };

  const getRoleBadge = (role: UserRole) => {
      switch (role) {
          case UserRole.ADMIN:
              return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700"><Shield className="w-3 h-3" /> Quản trị viên</span>;
          case UserRole.AM:
              return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"><Briefcase className="w-3 h-3" /> NV Kinh doanh (AM)</span>;
          case UserRole.PM:
              return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700"><Zap className="w-3 h-3" /> TV Giải pháp (PM)</span>;
          default:
              return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">Người dùng</span>;
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Quản lý Người dùng</h1>
           <p className="text-slate-500">Danh sách tài khoản và phân quyền hệ thống</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Thêm User
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Người dùng</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Thông tin liên hệ</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Vai trò / Chức danh</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="avt" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                        <UserIcon className="w-4 h-4" />
                        </div>
                    )}
                    <div>
                        <div className="font-medium text-slate-900">{user.fullName}</div>
                        <div className="text-xs text-slate-500 font-mono">@{user.username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                    {user.phoneNumber && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone className="w-3 h-3" /> {user.phoneNumber}
                        </div>
                    )}
                </td>
                <td className="px-6 py-4">
                  {getRoleBadge(user.role)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleOpenModal(user)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded">
                        <Edit className="w-4 h-4" />
                    </button>
                    {user.username !== 'admin' && (
                        <button onClick={() => onDeleteUser(user.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold mb-4">{editingUser.id ? 'Sửa User' : 'Thêm User'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                  <input required disabled={!!editingUser.id} type="text" className="w-full p-2 border rounded" value={editingUser.username} onChange={e => setEditingUser({...editingUser, username: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vai trò</label>
                  <select className="w-full p-2 border rounded" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}>
                    <option value={UserRole.AM}>NV Kinh doanh (AM)</option>
                    <option value={UserRole.PM}>TV Giải pháp (PM)</option>
                    <option value={UserRole.ADMIN}>Quản trị (Admin)</option>
                    <option value={UserRole.USER}>Khác (User)</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Họ và Tên</label>
                <input required type="text" className="w-full p-2 border rounded" value={editingUser.fullName} onChange={e => setEditingUser({...editingUser, fullName: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                <input type="text" className="w-full p-2 border rounded" value={editingUser.phoneNumber || ''} onChange={e => setEditingUser({...editingUser, phoneNumber: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Avatar URL</label>
                <input type="text" className="w-full p-2 border rounded" value={editingUser.avatarUrl || ''} onChange={e => setEditingUser({...editingUser, avatarUrl: e.target.value})} placeholder="https://..." />
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                    <Lock className="w-3 h-3" /> Mật khẩu {editingUser.id && '(Bỏ trống nếu không đổi)'}
                 </label>
                 <input 
                    type="password" 
                    className="w-full p-2 border rounded" 
                    value={passwordInput} 
                    onChange={e => setPasswordInput(e.target.value)} 
                    required={!editingUser.id}
                    placeholder={editingUser.id ? "********" : ""}
                />
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManager;
