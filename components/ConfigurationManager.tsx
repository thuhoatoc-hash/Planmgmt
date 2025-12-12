import React, { useState } from 'react';
import { ProjectStatusItem } from '../types';
import { Edit, Trash2, List } from 'lucide-react';

interface ConfigurationManagerProps {
  statuses: ProjectStatusItem[];
  onAddStatus: (s: ProjectStatusItem) => void;
  onUpdateStatus: (s: ProjectStatusItem) => void;
  onDeleteStatus: (id: string) => void;
}

const ConfigurationManager: React.FC<ConfigurationManagerProps> = ({ statuses, onAddStatus, onUpdateStatus, onDeleteStatus }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<ProjectStatusItem>>({});

  const handleOpenModal = (s?: ProjectStatusItem) => {
    if (s) {
      setEditing({ ...s });
    } else {
      setEditing({ name: '', color: 'bg-slate-100 text-slate-700', order: statuses.length + 1 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing.id) {
      onUpdateStatus(editing as ProjectStatusItem);
    } else {
      onAddStatus({ ...editing, id: `st_${Date.now()}` } as ProjectStatusItem);
    }
    setIsModalOpen(false);
  };

  const sortedStatuses = [...statuses].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Cấu hình Hệ thống</h1>
           <p className="text-slate-500">Quản lý các danh mục dùng chung</p>
        </div>
      </div>

      <div className="max-w-2xl">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <List className="w-5 h-5" /> Trạng thái / Tiến độ Dự án
                </h3>
                <button 
                  onClick={() => handleOpenModal()}
                  className="text-sm bg-white border border-slate-300 shadow-sm px-3 py-1.5 rounded-lg hover:bg-slate-50 font-medium text-slate-700"
                >
                    + Thêm bước
                </button>
             </div>
             <div className="divide-y divide-slate-100">
                {sortedStatuses.map(s => (
                    <div key={s.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                        <div className="flex items-center gap-4">
                            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 text-xs flex items-center justify-center font-bold">
                                {s.order}
                            </span>
                            <div>
                                <div className="font-medium text-slate-800">{s.name}</div>
                                <div className={`text-xs px-2 py-0.5 rounded inline-block mt-1 ${s.color}`}>Preview Color</div>
                            </div>
                        </div>
                         <div className="flex gap-2">
                            <button onClick={() => handleOpenModal(s)} className="p-2 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50">
                                <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => onDeleteStatus(s.id)} className="p-2 text-slate-400 hover:text-red-600 rounded hover:bg-red-50">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
             </div>
          </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold mb-4">{editing.id ? 'Sửa Trạng thái' : 'Thêm Trạng thái'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên trạng thái</label>
                <input required type="text" className="w-full p-2 border rounded" value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Thứ tự</label>
                    <input required type="number" className="w-full p-2 border rounded" value={editing.order} onChange={e => setEditing({...editing, order: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Màu sắc (Tailwind Class)</label>
                    <input type="text" className="w-full p-2 border rounded" value={editing.color} onChange={e => setEditing({...editing, color: e.target.value})} placeholder="bg-blue-100 text-blue-700" />
                  </div>
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

export default ConfigurationManager;