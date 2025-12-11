
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Shield, User as UserIcon, Phone, Edit, Trash2, Plus, Lock, Briefcase, Zap, Mail, CheckCircle2 } from 'lucide-react';
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
        email: '',
        avatarUrl: ''
      });
      setPasswordInput('123'); // Default password for new users
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Email Required
    if (!editingUser.email || !editingUser.email.trim()) {
        alert("Vui lòng nhập Email! Đây là trường bắt buộc để khôi phục mật khẩu và nhận thông báo.");
        return;
    }

    // Basic Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editingUser.email)) {
        alert("Định dạng Email không hợp lệ!");
        return;
    }
    
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

  const roleOptions = [
      { 
          value: UserRole.AM, 
          label: 'NV Kinh doanh (AM)', 
          icon: Briefcase, 
          desc: 'Phụ trách khách hàng, chỉ tiêu doanh số.',
          activeClass: 'border-blue-500 bg-blue-50 ring-1 ring-blue-500', 
          iconClass: 'bg-blue-100 text-blue-700' 
      },
      { 
          value: UserRole.PM, 
          label: 'TV Giải pháp (PM)', 
          icon: Zap, 
          desc: 'Phụ trách kỹ thuật, triển khai dự án.',
          activeClass: 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500', 
          iconClass: 'bg-indigo-100 text-indigo-700' 
      },
      { 
          value: UserRole.ADMIN, 
          label: 'Quản trị viên', 
          icon: Shield, 
          desc: 'Toàn quyền cấu hình hệ thống.',
          activeClass: 'border-purple-500 bg-purple-50 ring-1 ring-purple-500', 
          iconClass: 'bg-purple-100 text-purple-700' 
      },
      { 
          value: UserRole.USER, 
          label: 'User (Khác)', 
          icon: UserIcon, 
          desc: 'Quyền xem cơ bản, không tác nghiệp.',
          activeClass: 'border-slate-500 bg-slate-50 ring-1 ring-slate-500', 
          iconClass: 'bg-slate-100 text-slate-700' 
      },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Quản lý Người dùng</h1>
           <p className="text-slate-500">Danh sách tài khoản và phân quyền hệ thống</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-sm font-medium"
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
                        <img src={user.avatarUrl} alt="avt" className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200">
                        <UserIcon className="w-5 h-5" />
                        </div>
                    )}
                    <div>
                        <div className="font-medium text-slate-900">{user.fullName}</div>
                        <div className="text-xs text-slate-500 font-mono">@{user.username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                        {user.email && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Mail className="w-3.5 h-3.5 text-slate-400" /> {user.email}
                            </div>
                        )}
                        {user.phoneNumber && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Phone className="w-3.5 h-3.5 text-slate-400" /> {user.phoneNumber}
                            </div>
                        )}
                        {!user.email && !user.phoneNumber && <span className="text-xs text-slate-400 italic">Chưa cập nhật</span>}
                    </div>
                </td>
                <td className="px-6 py-4">
                  {getRoleBadge(user.role)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleOpenModal(user)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Sửa thông tin">
                        <Edit className="w-4 h-4" />
                    </button>
                    {user.username !== 'admin' && (
                        <button onClick={() => onDeleteUser(user.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Xóa user">
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
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6 text-slate-800">{editingUser.id ? 'Sửa Thông tin User' : 'Thêm User Mới'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Role Selection Grid */}
              <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Phân quyền Vai trò <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {roleOptions.map((option) => {
                          const isSelected = editingUser.role === option.value;
                          return (
                              <div 
                                key={option.value}
                                onClick={() => setEditingUser({ ...editingUser, role: option.value })}
                                className={`cursor-pointer rounded-xl p-3 border-2 transition-all flex items-start gap-3 relative ${
                                    isSelected 
                                    ? `bg-white ${option.activeClass}` 
                                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                  <div className={`p-2 rounded-lg shrink-0 ${isSelected ? option.iconClass : 'bg-slate-100 text-slate-500'}`}>
                                      <option.icon className="w-5 h-5" />
                                  </div>
                                  <div>
                                      <div className={`font-bold text-sm ${isSelected ? 'text-slate-800' : 'text-slate-600'}`}>{option.label}</div>
                                      <div className="text-xs text-slate-500 mt-0.5 leading-tight">{option.desc}</div>
                                  </div>
                                  {isSelected && (
                                      <div className="absolute top-3 right-3 text-indigo-600">
                                          <CheckCircle2 className="w-5 h-5 fill-indigo-100" />
                                      </div>
                                  )}
                              </div>
                          )
                      })}
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tên đăng nhập (Username) <span className="text-red-500">*</span></label>
                  <input required disabled={!!editingUser.id} type="text" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={editingUser.username} onChange={e => setEditingUser({...editingUser, username: e.target.value})} placeholder="VD: am_hieu" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Họ và Tên <span className="text-red-500">*</span></label>
                  <input required type="text" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={editingUser.fullName} onChange={e => setEditingUser({...editingUser, fullName: e.target.value})} placeholder="VD: Nguyễn Văn A" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            required
                            type="email" 
                            className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                            value={editingUser.email || ''} 
                            onChange={e => setEditingUser({...editingUser, email: e.target.value})} 
                            placeholder="email@viettel.com.vn" 
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={editingUser.phoneNumber || ''} onChange={e => setEditingUser({...editingUser, phoneNumber: e.target.value})} placeholder="09xxxxxxxx" />
                    </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Avatar URL</label>
                <input type="text" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={editingUser.avatarUrl || ''} onChange={e => setEditingUser({...editingUser, avatarUrl: e.target.value})} placeholder="https://example.com/avatar.jpg" />
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                 <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-500" /> 
                    {editingUser.id ? 'Đổi mật khẩu (Tùy chọn)' : 'Thiết lập mật khẩu'}
                 </label>
                 <input 
                    type="password" 
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white" 
                    value={passwordInput} 
                    onChange={e => setPasswordInput(e.target.value)} 
                    required={!editingUser.id}
                    placeholder={editingUser.id ? "Nhập mật khẩu mới nếu muốn đổi..." : "Nhập mật khẩu khởi tạo..."}
                />
                {!editingUser.id && <p className="text-xs text-slate-500 mt-1">Mật khẩu mặc định gợi ý: 123</p>}
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Hủy</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {editingUser.id ? 'Cập nhật User' : 'Tạo User mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManager;
