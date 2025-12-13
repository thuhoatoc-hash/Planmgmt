
import React, { useState, useRef } from 'react';
import { Notification, NotificationPriority, User, UserRole, NotificationType } from '../types';
import { Plus, Trash2, Edit, Bell, Info, AlertTriangle, CheckCircle, Image as ImageIcon, PartyPopper, X, Loader2 } from 'lucide-react';

interface NotificationManagerProps {
  notifications: Notification[];
  currentUser: User;
  onAdd: (n: Notification) => Promise<boolean>;
  onUpdate: (n: Notification) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
}

const NotificationManager: React.FC<NotificationManagerProps> = ({ notifications, currentUser, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Notification>>({
      title: '',
      content: '',
      priority: NotificationPriority.NORMAL,
      type: NotificationType.NORMAL,
      imageUrl: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isAdmin = currentUser.role === UserRole.ADMIN || (currentUser.roleId && currentUser.roleId.includes('admin'));

  const handleOpenModal = (notif?: Notification, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (notif) {
          setFormData({ ...notif, type: notif.type || NotificationType.NORMAL });
      } else {
          setFormData({
              title: '',
              content: '',
              priority: NotificationPriority.NORMAL,
              type: NotificationType.NORMAL,
              imageUrl: ''
          });
      }
      setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
          alert("Vui lòng chọn ảnh nhỏ hơn 2MB");
          return;
      }

      setUploading(true);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 800; 
              let width = img.width;
              let height = img.height;

              if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              
              const base64 = canvas.toDataURL('image/jpeg', 0.8);
              setFormData(prev => ({ ...prev, imageUrl: base64 }));
              setUploading(false);
              alert("Đã tải ảnh lên thành công!");
          };
      };
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      
      const notifToSave: Notification = {
          ...formData as Notification,
          authorId: currentUser.id,
          createdAt: formData.createdAt || new Date().toISOString()
      };

      try {
          let success = false;
          if (notifToSave.id) {
              success = await onUpdate(notifToSave);
          } else {
              success = await onAdd({
                  ...notifToSave,
                  id: `notif_${Date.now()}`
              });
          }
          
          if (success) {
              alert("Đã lưu và gửi thông báo thành công!");
              setIsModalOpen(false);
          }
      } catch (error) {
          console.error("Failed to save notification", error);
          alert("Có lỗi xảy ra khi lưu thông báo.");
      } finally {
          setSaving(false);
      }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent card click event
      if(window.confirm('Bạn có chắc chắn muốn xóa thông báo này không?')) {
          await onDelete(id);
      }
  };

  const sortedNotifications = [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Bell className="w-6 h-6 text-[#EE0033]" />
                    Quản lý Thông báo
                </h1>
                <p className="text-slate-500">Cập nhật tin tức và thông báo quan trọng đến nhân viên</p>
            </div>
            {isAdmin && (
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-[#EE0033] text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 font-medium shadow-sm"
                >
                    <Plus className="w-5 h-5" /> Tạo Thông báo
                </button>
            )}
        </div>

        <div className="grid grid-cols-1 gap-4">
            {sortedNotifications.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
                    Chưa có thông báo nào.
                </div>
            ) : (
                sortedNotifications.map(notif => {
                    const isCelebration = notif.type === NotificationType.CELEBRATION;
                    
                    return (
                        <div 
                            key={notif.id} 
                            className={`p-6 rounded-xl border shadow-sm relative group hover:shadow-md transition-shadow ${
                                isCelebration 
                                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border-pink-600' 
                                : 'bg-white border-slate-200 text-slate-800'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex gap-2 items-center">
                                    {isCelebration ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 border border-white/30 backdrop-blur-sm">
                                            <PartyPopper className="w-3.5 h-3.5" /> Sự kiện / Sinh nhật
                                        </span>
                                    ) : (
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                                            notif.priority === NotificationPriority.URGENT ? 'bg-red-100 text-red-700 border-red-200' :
                                            notif.priority === NotificationPriority.IMPORTANT ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                                            'bg-blue-100 text-blue-700 border-blue-200'
                                        }`}>
                                            {notif.priority === NotificationPriority.URGENT ? <AlertTriangle className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                                            {notif.priority}
                                        </span>
                                    )}
                                </div>
                                <div className={`text-xs ${isCelebration ? 'text-pink-100' : 'text-slate-400'}`}>
                                    {new Date(notif.createdAt).toLocaleDateString('vi-VN')} {new Date(notif.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                                </div>
                            </div>
                            
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                                {notif.title}
                            </h3>
                            <p className={`text-sm whitespace-pre-line leading-relaxed mb-4 ${isCelebration ? 'text-pink-50' : 'text-slate-600'}`}>
                                {notif.content}
                            </p>

                            {notif.imageUrl && (
                                <div className="w-full h-48 rounded-lg overflow-hidden border border-white/20 shadow-sm relative group/img cursor-pointer bg-black/5">
                                    <img src={notif.imageUrl} className="w-full h-full object-cover" alt="attachment" />
                                </div>
                            )}

                            {isAdmin && (
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 p-1 rounded-lg backdrop-blur-sm z-10">
                                    <button 
                                        onClick={(e) => handleOpenModal(notif, e)}
                                        className={`p-1.5 rounded-md ${isCelebration ? 'text-white hover:bg-white/20' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'}`}
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={(e) => handleDelete(notif.id, e)}
                                        className={`p-1.5 rounded-md ${isCelebration ? 'text-white hover:bg-white/20' : 'text-slate-500 hover:text-red-600 hover:bg-slate-100'}`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>

        {/* Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                    <h2 className="text-xl font-bold mb-4 text-slate-800">
                        {formData.id ? 'Sửa Thông báo' : 'Tạo Thông báo Mới'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Type Selection */}
                        <div className="grid grid-cols-2 gap-3 mb-2">
                            <label className={`cursor-pointer border p-3 rounded-lg flex items-center gap-2 transition-colors ${formData.type === NotificationType.NORMAL ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'hover:bg-slate-50'}`}>
                                <input type="radio" className="hidden" checked={formData.type === NotificationType.NORMAL} onChange={() => setFormData({ ...formData, type: NotificationType.NORMAL })} />
                                <Bell className="w-5 h-5" /> Thông báo thường
                            </label>
                            <label className={`cursor-pointer border p-3 rounded-lg flex items-center gap-2 transition-colors ${formData.type === NotificationType.CELEBRATION ? 'bg-pink-50 border-pink-500 text-pink-700' : 'hover:bg-slate-50'}`}>
                                <input type="radio" className="hidden" checked={formData.type === NotificationType.CELEBRATION} onChange={() => setFormData({ ...formData, type: NotificationType.CELEBRATION, priority: NotificationPriority.NORMAL })} />
                                <PartyPopper className="w-5 h-5" /> Sự kiện / Sinh nhật
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tiêu đề</label>
                            <input 
                                required 
                                type="text" 
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none"
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                placeholder="Nhập tiêu đề thông báo..."
                            />
                        </div>
                        
                        {formData.type === NotificationType.NORMAL && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Mức độ ưu tiên</label>
                                <div className="flex gap-2">
                                    {[
                                        { val: NotificationPriority.NORMAL, label: 'Bình thường', color: 'bg-blue-100 text-blue-700 border-blue-200' },
                                        { val: NotificationPriority.IMPORTANT, label: 'Quan trọng', color: 'bg-amber-100 text-amber-700 border-amber-200' },
                                        { val: NotificationPriority.URGENT, label: 'Khẩn cấp', color: 'bg-red-100 text-red-700 border-red-200' },
                                    ].map(p => (
                                        <button
                                            key={p.val}
                                            type="button"
                                            onClick={() => setFormData({...formData, priority: p.val})}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${formData.priority === p.val ? `${p.color} ring-2 ring-offset-1 ring-slate-300` : 'bg-slate-50 border-slate-200 text-slate-600 opacity-70 hover:opacity-100'}`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung</label>
                            <textarea 
                                required
                                className="w-full h-32 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none"
                                value={formData.content}
                                onChange={e => setFormData({...formData, content: e.target.value})}
                                placeholder="Nhập nội dung chi tiết..."
                            />
                        </div>

                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Hình ảnh đính kèm (Tùy chọn)</label>
                            <div className="flex items-center gap-4">
                                {formData.imageUrl ? (
                                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 group/img">
                                        <img src={formData.imageUrl} className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => setFormData({...formData, imageUrl: ''})} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-red-500"><X className="w-3 h-3" /></button>
                                    </div>
                                ) : (
                                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 bg-slate-50">
                                        <ImageIcon className="w-8 h-8" />
                                    </div>
                                )}
                                <div className="flex-1 space-y-2">
                                    <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
                                    
                                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2">
                                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                                        {formData.imageUrl ? 'Thay đổi ảnh' : 'Tải ảnh từ máy'}
                                    </button>
                                    
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-slate-400 text-xs">URL</span>
                                        </div>
                                        <input 
                                            type="text" 
                                            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#EE0033]"
                                            placeholder="Hoặc dán link ảnh..."
                                            value={formData.imageUrl && formData.imageUrl.startsWith('http') ? formData.imageUrl : ''}
                                            onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400">Hỗ trợ JPG, PNG (Max 2MB cho file tải lên)</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button 
                                type="button" 
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                                disabled={saving}
                            >
                                Hủy
                            </button>
                            <button 
                                type="submit"
                                className="px-4 py-2 bg-[#EE0033] text-white rounded-lg hover:bg-red-700 flex items-center gap-2 font-medium disabled:opacity-50"
                                disabled={saving || uploading}
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                {saving ? 'Đang lưu...' : 'Lưu & Gửi'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default NotificationManager;
