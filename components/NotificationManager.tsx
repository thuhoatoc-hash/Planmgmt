
import React, { useState } from 'react';
import { Notification, NotificationPriority, User, UserRole } from '../types';
import { Plus, Trash2, Edit, Bell, Info, AlertTriangle, CheckCircle } from 'lucide-react';

interface NotificationManagerProps {
  notifications: Notification[];
  currentUser: User;
  onAdd: (n: Notification) => void;
  onUpdate: (n: Notification) => void;
  onDelete: (id: string) => void;
}

const NotificationManager: React.FC<NotificationManagerProps> = ({ notifications, currentUser, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Notification>>({
      title: '',
      content: '',
      priority: NotificationPriority.NORMAL
  });

  const isAdmin = currentUser.role === UserRole.ADMIN || (currentUser.roleId && currentUser.roleId.includes('admin'));

  const handleOpenModal = (notif?: Notification) => {
      if (notif) {
          setFormData({ ...notif });
      } else {
          setFormData({
              title: '',
              content: '',
              priority: NotificationPriority.NORMAL
          });
      }
      setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const notifToSave: Notification = {
          ...formData as Notification,
          authorId: currentUser.id,
          createdAt: formData.createdAt || new Date().toISOString()
      };

      if (notifToSave.id) {
          onUpdate(notifToSave);
      } else {
          onAdd({
              ...notifToSave,
              id: `notif_${Date.now()}`
          });
      }
      setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if(window.confirm('Bạn có chắc chắn muốn xóa thông báo này?')) {
          onDelete(id);
      }
  };

  const getPriorityInfo = (priority: NotificationPriority) => {
      switch (priority) {
          case NotificationPriority.URGENT:
              return { label: 'Khẩn cấp', color: 'bg-red-100 text-red-700 border-red-200', icon: <AlertTriangle className="w-4 h-4" /> };
          case NotificationPriority.IMPORTANT:
              return { label: 'Quan trọng', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Info className="w-4 h-4" /> };
          default:
              return { label: 'Bình thường', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Bell className="w-4 h-4" /> };
      }
  };

  // Sort by date desc
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
                    const priorityInfo = getPriorityInfo(notif.priority);
                    return (
                        <div key={notif.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative group hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${priorityInfo.color}`}>
                                    {priorityInfo.icon}
                                    {priorityInfo.label}
                                </div>
                                <div className="text-xs text-slate-400">
                                    {new Date(notif.createdAt).toLocaleDateString('vi-VN')} {new Date(notif.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                                </div>
                            </div>
                            
                            <h3 className="text-lg font-bold text-slate-800 mb-2">{notif.title}</h3>
                            <p className="text-slate-600 text-sm whitespace-pre-line leading-relaxed">{notif.content}</p>

                            {isAdmin && (
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => handleOpenModal(notif)}
                                        className="p-1.5 bg-slate-50 text-slate-500 hover:text-indigo-600 rounded-md border border-slate-200"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(notif.id)}
                                        className="p-1.5 bg-slate-50 text-slate-500 hover:text-red-600 rounded-md border border-slate-200"
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
                <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
                    <h2 className="text-xl font-bold mb-4 text-slate-800">
                        {formData.id ? 'Sửa Thông báo' : 'Tạo Thông báo Mới'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
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

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button 
                                type="button" 
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                            >
                                Hủy
                            </button>
                            <button 
                                type="submit"
                                className="px-4 py-2 bg-[#EE0033] text-white rounded-lg hover:bg-red-700 flex items-center gap-2 font-medium"
                            >
                                <CheckCircle className="w-4 h-4" /> Lưu & Gửi
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
