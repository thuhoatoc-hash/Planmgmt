
import React, { useState, useRef } from 'react';
import { User } from '../types';
import { X, Lock, Phone, Image, Mail, Camera, Loader2 } from 'lucide-react';

interface UserProfileProps {
  user: User;
  onUpdate: (u: User) => void;
  onClose: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdate, onClose }) => {
  const [formData, setFormData] = useState<Partial<User>>({ ...user, password: '' });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate Email
    if (!formData.email || !formData.email.trim()) {
        alert("Email là bắt buộc!");
        return;
    }

    const updatedUser = { ...user, ...formData };
    // If password is empty, don't update it
    if (!formData.password) {
        delete (updatedUser as any).password;
    }
    onUpdate(updatedUser);
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
          alert("Vui lòng chọn ảnh nhỏ hơn 5MB");
          return;
      }

      setUploading(true);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
          const img = new window.Image();
          img.src = event.target?.result as string;
          img.onload = () => {
              // Resize image to max 300x300
              const canvas = document.createElement('canvas');
              const MAX_SIZE = 300;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                  if (width > MAX_SIZE) {
                      height *= MAX_SIZE / width;
                      width = MAX_SIZE;
                  }
              } else {
                  if (height > MAX_SIZE) {
                      width *= MAX_SIZE / height;
                      height = MAX_SIZE;
                  }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              
              // Compress to JPEG 80%
              const base64 = canvas.toDataURL('image/jpeg', 0.8);
              setFormData(prev => ({ ...prev, avatarUrl: base64 }));
              setUploading(false);
          };
      };
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
        </button>
        
        <div className="flex flex-col items-center mb-6">
            <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mb-3 overflow-hidden border-2 border-indigo-50">
                    {formData.avatarUrl ? (
                        <img src={formData.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-3xl font-bold">{user.fullName.charAt(0)}</span>
                    )}
                </div>
                <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-3 right-0 bg-white p-1.5 rounded-full shadow-md border border-slate-200 text-slate-600 hover:text-indigo-600 transition-colors"
                    title="Đổi ảnh đại diện"
                >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </button>
                <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleImageUpload} 
                />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{user.fullName}</h2>
            <p className="text-slate-500 text-sm">@{user.username}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <Mail className="w-4 h-4" /> Email <span className="text-red-500">*</span>
            </label>
            <input 
                required
                type="email" 
                className="w-full p-2 border rounded-lg" 
                value={formData.email || ''} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
                placeholder="Nhập email..." 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <Phone className="w-4 h-4" /> Số điện thoại
            </label>
            <input type="text" className="w-full p-2 border rounded-lg" value={formData.phoneNumber || ''} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} />
          </div>

          <div className="hidden">
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
