
import React, { useState } from 'react';
import { AttendanceStatusConfig, AttendanceType } from '../types';
import { Edit, Trash2, Plus } from 'lucide-react';

interface AttendanceStatusManagerProps {
  statuses: AttendanceStatusConfig[];
  onAdd: (s: AttendanceStatusConfig) => void;
  onUpdate: (s: AttendanceStatusConfig) => void;
  onDelete: (id: string) => void;
}

const ATTENDANCE_TYPES: { value: AttendanceType; label: string }[] = [
    { value: 'LATE', label: 'Đi muộn' },
    { value: 'LEAVE', label: 'Nghỉ phép' },
    { value: 'SICK', label: 'Nghỉ ốm' },
    { value: 'CUSTOMER_VISIT', label: 'Gặp đối tác, Khách hàng' },
    { value: 'PRESENT', label: 'Có mặt / Đi làm (Mặc định)' },
    { value: 'WFH', label: 'Làm việc từ xa (WFH)' },
];

const AttendanceStatusManager: React.FC<AttendanceStatusManagerProps> = ({ statuses, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Partial<AttendanceStatusConfig>>({});

  const handleOpenModal = (s?: AttendanceStatusConfig) => {
    if (s) {
      setEditingStatus({ ...s });
    } else {
      setEditingStatus({ name: '', color: 'bg-green-100 text-green-700', type: 'PRESENT', order: statuses.length + 1 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStatus.id) {
        onUpdate(editingStatus as AttendanceStatusConfig);
    } else {
        onAdd({ ...editingStatus, id: `ast_${Date.now()}` } as AttendanceStatusConfig);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if(window.confirm('Bạn có chắc chắn muốn xóa loại hình chấm công này?')) {
          onDelete(id);
      }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-800">Cấu hình Loại hình Điểm danh</h3>
            <button 
                onClick={() => handleOpenModal()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium"
            >
                <Plus className="w-4 h-4" /> Thêm loại
            </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-3">Tên hiển thị</th>
                        <th className="px-6 py-3">Phân loại hệ thống</th>
                        <th className="px-6 py-3">Màu sắc</th>
                        <th className="px-6 py-3 text-center">Thứ tự</th>
                        <th className="px-6 py-3 text-right">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {statuses.sort((a,b) => a.order - b.order).map(s => (
                        <tr key={s.id} className="hover:bg-slate-50">
                            <td className="px-6 py-3 font-medium text-slate-800">{s.name}</td>
                            <td className="px-6 py-3">
                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs border border-slate-200">
                                    {ATTENDANCE_TYPES.find(t => t.value === s.type)?.label || s.type}
                                </span>
                            </td>
                            <td className="px-6 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${s.color}`}>
                                    Example
                                </span>
                                <span className="ml-2 text-slate-400 text-xs font-mono">{s.color}</span>
                            </td>
                            <td className="px-6 py-3 text-center">{s.order}</td>
                            <td className="px-6 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => handleOpenModal(s)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(s.id)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white border border-slate-200 rounded">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {statuses.length === 0 && (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Chưa có dữ liệu</td></tr>
                    )}
                </tbody>
            </table>
        </div>

        {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
                    <h2 className="text-xl font-bold mb-4 text-slate-800">{editingStatus.id ? 'Sửa Loại Điểm danh' : 'Thêm Loại Mới'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tên hiển thị</label>
                            <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={editingStatus.name} onChange={e => setEditingStatus({...editingStatus, name: e.target.value})} placeholder="VD: Đi làm muộn..." />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phân loại hệ thống (Logic tính công)</label>
                            <select 
                                className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={editingStatus.type}
                                onChange={e => setEditingStatus({...editingStatus, type: e.target.value as AttendanceType})}
                            >
                                {ATTENDANCE_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Màu hiển thị (Tailwind)</label>
                                <input type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={editingStatus.color} onChange={e => setEditingStatus({...editingStatus, color: e.target.value})} placeholder="bg-blue-100 text-blue-700" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Thứ tự hiển thị</label>
                                <input type="number" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={editingStatus.order} onChange={e => setEditingStatus({...editingStatus, order: parseInt(e.target.value)})} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
                            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Lưu</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default AttendanceStatusManager;
