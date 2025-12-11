
import React, { useState } from 'react';
import { User } from '../types';
import { X, Lock, Phone, Image, Mail } from 'lucide-react';

interface UserProfileProps {
  user: User;
  onUpdate: (u: User) => void;
  onClose: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdate, onClose }) => {
  const [formData, setFormData] = useState<Partial<User>>({ ...user, password: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser = { ...user, ...formData };
    // If password is empty, don't update it
    if (!formData.password) {
        delete (updatedUser as any).password;
    }
    onUpdate(updatedUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
        </button>
        
        <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mb-3 overflow-hidden">
                {formData.avatarUrl ? (
                    <img src={formData.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-2xl font-bold">{user.fullName.charAt(0)}</span>
                )}
            </div>
            <h2 className="text-xl font-bold text-slate-900">{user.fullName}</h2>
            <p className="text-slate-500 text-sm">@{user.username}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <Mail className="w-4 h-4" /> Email
            </label>
            <input type="email" className="w-full p-2 border rounded-lg" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Nhập email..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <Phone className="w-4 h-4" /> Số điện thoại
            </label>
            <input type="text" className="w-full p-2 border rounded-lg" value={formData.phoneNumber || ''} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <Image className="w-4 h-4" /> Avatar URL
            </label>
            <input type="text" className="w-full p-2 border rounded-lg" value={formData.avatarUrl || ''} onChange={e => setFormData({...formData, avatarUrl: e.target.value})} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Đổi mật khẩu mới
            </label>
            <input 
                type="password" 
                className="w-full p-2 border rounded-lg" 
                value={formData.password || ''} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                placeholder="Để trống nếu không đổi"
            />
          </div>

          <button type="submit" className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 transition-colors mt-4">
            Cập nhật hồ sơ
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserProfile;
