
import React, { useState, useEffect } from 'react';
import { User, UserRole, Role, UserFieldDefinition, ActivityLog } from '../types';
import { Shield, User as UserIcon, Phone, Edit, Trash2, Plus, Lock, Zap, Mail, CheckCircle2, History, Search, Download } from 'lucide-react';
import { hashPassword } from '../lib/crypto';
import { api } from '../services/api';

interface UserManagerProps {
  users: User[];
  roles: Role[]; // Passed from parent
  fieldDefinitions: UserFieldDefinition[]; // Passed from parent
  onAddUser: (u: User) => void;
  onUpdateUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
}

const UserManager: React.FC<UserManagerProps> = ({ users, roles, fieldDefinitions, onAddUser, onUpdateUser, onDeleteUser }) => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'LOGS'>('USERS');
  
  // User Management State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User>>({});
  const [passwordInput, setPasswordInput] = useState('');

  // Logs State
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logSearch, setLogSearch] = useState('');

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser({ ...user });
      setPasswordInput(''); // Don't show existing password hash
    } else {
      setEditingUser({ 
        role: UserRole.AM, // Default fallback
        username: '', 
        fullName: '', 
        phoneNumber: '',
        email: '',
        avatarUrl: '',
        extendedInfo: {}
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
    
    // Sync Legacy role for backward compatibility
    let legacyRole = editingUser.role || UserRole.USER;
    if (editingUser.roleId) {
        const selectedRole = roles.find(r => r.id === editingUser.roleId);
        // Map dynamic role name to closest legacy role or just default to USER/AM
        if (selectedRole?.name.toUpperCase().includes('ADMIN')) legacyRole = UserRole.ADMIN;
        else if (selectedRole?.name.toUpperCase().includes('AM')) legacyRole = UserRole.AM;
        else if (selectedRole?.name.toUpperCase().includes('PM')) legacyRole = UserRole.PM;
        else legacyRole = UserRole.USER;
    }

    const userToSave = { ...editingUser, password: finalPassword, role: legacyRole } as User;

    if (editingUser.id) {
      onUpdateUser(userToSave);
    } else {
      onAddUser({ ...userToSave, id: `user_${Date.now()}` });
    }
    setIsModalOpen(false);
  };

  const handleExtendedChange = (key: string, value: any) => {
      setEditingUser(prev => ({
          ...prev,
          extendedInfo: {
              ...(prev.extendedInfo || {}),
              [key]: value
          }
      }));
  };

  const getRoleName = (user: User) => {
      if (user.roleId) {
          const r = roles.find(role => role.id === user.roleId);
          if (r) return <span className="text-indigo-700 font-bold">{r.name}</span>;
      }
      return user.role; // Fallback
  };

  // --- LOGS LOGIC ---
  const fetchLogs = async () => {
      setLoadingLogs(true);
      try {
          const data = await api.logs.getAll();
          // Sort by timestamp desc
          setLogs(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingLogs(false);
      }
  };

  useEffect(() => {
      if (activeTab === 'LOGS') {
          fetchLogs();
      }
  }, [activeTab]);

  const filteredLogs = logs.filter(l => 
      l.userName.toLowerCase().includes(logSearch.toLowerCase()) || 
      l.action.toLowerCase().includes(logSearch.toLowerCase())
  );

  const exportLogsToCSV = () => {
      if (filteredLogs.length === 0) return;
      const headers = ['Thời gian', 'Người dùng', 'Hành động', 'Đối tượng', 'Thiết bị', 'Chi tiết'];
      const csvContent = [
          headers.join(','),
          ...filteredLogs.map(l => {
              return [
                  `"${new Date(l.timestamp).toLocaleString('vi-VN')}"`,
                  `"${l.userName}"`,
                  `"${l.action}"`,
                  `"${l.target}"`,
                  `"${l.device}"`,
                  `"${l.details || ''}"`
              ].join(',');
          })
      ].join('\r\n');

      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `activity_logs_${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h3 className="text-xl font-bold text-slate-800">Quản lý Người dùng</h3>
           <p className="text-slate-500">Quản lý tài khoản, vai trò và theo dõi lịch sử</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
                onClick={() => setActiveTab('USERS')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'USERS' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <UserIcon className="w-4 h-4" /> Danh sách User
            </button>
            <button 
                onClick={() => setActiveTab('LOGS')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'LOGS' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <History className="w-4 h-4" /> Lịch sử Hoạt động
            </button>
        </div>
      </div>

      {activeTab === 'USERS' && (
      <>
        <div className="flex justify-end">
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
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Vai trò</th>
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
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        <Shield className="w-3 h-3" /> {getRoleName(user)}
                    </span>
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
      </>
      )}

      {activeTab === 'LOGS' && (
          <div className="space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="relative w-full max-w-sm">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                          type="text" 
                          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Tìm theo user, hành động..."
                          value={logSearch}
                          onChange={(e) => setLogSearch(e.target.value)}
                      />
                  </div>
                  <button 
                      onClick={exportLogsToCSV}
                      disabled={filteredLogs.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium text-sm transition-colors"
                  >
                      <Download className="w-4 h-4" /> Xuất Excel
                  </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="max-h-[600px] overflow-y-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-slate-600">Thời gian</th>
                                <th className="px-6 py-3 font-semibold text-slate-600">Người dùng</th>
                                <th className="px-6 py-3 font-semibold text-slate-600">Hành động</th>
                                <th className="px-6 py-3 font-semibold text-slate-600">Đối tượng</th>
                                <th className="px-6 py-3 font-semibold text-slate-600">Thiết bị</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loadingLogs ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Đang tải lịch sử...</td></tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Không có dữ liệu log.</td></tr>
                            ) : (
                                filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                                            {new Date(log.timestamp).toLocaleString('vi-VN')}
                                        </td>
                                        <td className="px-6 py-3 font-medium text-slate-800">
                                            {log.userName}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                log.action === 'LOGIN' ? 'bg-green-100 text-green-700' : 
                                                log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-slate-700 max-w-xs truncate" title={log.details}>
                                            {log.target}
                                            {log.details && <span className="block text-xs text-slate-400 mt-0.5">{log.details}</span>}
                                        </td>
                                        <td className="px-6 py-3 text-slate-500 text-xs">
                                            {log.device}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                  </div>
              </div>
          </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6 text-slate-800">{editingUser.id ? 'Sửa Thông tin User' : 'Thêm User Mới'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Dynamic Role Selection */}
              <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Vai trò hệ thống <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-3">
                      {roles.map(role => (
                          <label 
                              key={role.id}
                              className={`cursor-pointer border rounded-lg p-3 flex items-center gap-3 transition-colors ${
                                  editingUser.roleId === role.id 
                                  ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' 
                                  : 'bg-white border-slate-200 hover:bg-slate-50'
                              }`}
                          >
                              <input 
                                  type="radio" 
                                  name="role"
                                  className="hidden"
                                  checked={editingUser.roleId === role.id}
                                  onChange={() => setEditingUser({ ...editingUser, roleId: role.id })}
                              />
                              <Shield className={`w-5 h-5 ${editingUser.roleId === role.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                              <div>
                                  <div className={`font-bold text-sm ${editingUser.roleId === role.id ? 'text-indigo-900' : 'text-slate-700'}`}>{role.name}</div>
                                  <div className="text-xs text-slate-500 line-clamp-1">{role.description}</div>
                              </div>
                          </label>
                      ))}
                      {roles.length === 0 && (
                          <div className="col-span-2 p-3 bg-amber-50 text-amber-700 text-sm rounded-lg border border-amber-200">
                              Chưa có vai trò nào được định nghĩa. Vui lòng tạo vai trò trong tab "Vai trò & Phân quyền".
                          </div>
                      )}
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tên đăng nhập <span className="text-red-500">*</span></label>
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
                    <input required type="email" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                    <input type="text" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={editingUser.phoneNumber || ''} onChange={e => setEditingUser({...editingUser, phoneNumber: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Avatar URL</label>
                <input type="text" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={editingUser.avatarUrl || ''} onChange={e => setEditingUser({...editingUser, avatarUrl: e.target.value})} />
              </div>

              {/* DYNAMIC FIELDS SECTION */}
              {fieldDefinitions.length > 0 && (
                  <div className="border-t border-slate-200 pt-4 mt-4">
                      <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-indigo-500" /> Thông tin mở rộng
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {fieldDefinitions.map(field => {
                              const val = editingUser.extendedInfo?.[field.key] || '';
                              return (
                                  <div key={field.id} className={field.type === 'text' || field.type === 'image' ? 'col-span-2' : ''}>
                                      <label className="block text-sm font-medium text-slate-700 mb-1">
                                          {field.label} {field.required && <span className="text-red-500">*</span>}
                                      </label>
                                      
                                      {field.type === 'text' || field.type === 'image' ? (
                                          <input 
                                            type="text"
                                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={val}
                                            onChange={e => handleExtendedChange(field.key, e.target.value)}
                                            required={field.required}
                                          />
                                      ) : field.type === 'number' ? (
                                          <input 
                                            type="number"
                                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={val}
                                            onChange={e => handleExtendedChange(field.key, Number(e.target.value))}
                                            required={field.required}
                                          />
                                      ) : field.type === 'date' ? (
                                          <input 
                                            type="date"
                                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={val}
                                            onChange={e => handleExtendedChange(field.key, e.target.value)}
                                            required={field.required}
                                          />
                                      ) : field.type === 'select' ? (
                                          <select 
                                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                            value={val}
                                            onChange={e => handleExtendedChange(field.key, e.target.value)}
                                            required={field.required}
                                          >
                                              <option value="">-- Chọn --</option>
                                              {field.options?.split(',').map(opt => (
                                                  <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                                              ))}
                                          </select>
                                      ) : null}
                                  </div>
                              )
                          })}
                      </div>
                  </div>
              )}

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
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
