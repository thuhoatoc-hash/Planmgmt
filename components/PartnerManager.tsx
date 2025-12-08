import React, { useState } from 'react';
import { Partner } from '../types';
import { Briefcase, Plus, Edit, Trash2, Phone } from 'lucide-react';

interface PartnerManagerProps {
  partners: Partner[];
  onAdd: (p: Partner) => void;
  onUpdate: (p: Partner) => void;
  onDelete: (id: string) => void;
}

const PartnerManager: React.FC<PartnerManagerProps> = ({ partners, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Partner>>({});

  const handleOpenModal = (p?: Partner) => {
    if (p) {
      setEditing({ ...p });
    } else {
      setEditing({ name: '', code: '', contactInfo: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing.id) {
      onUpdate(editing as Partner);
    } else {
      onAdd({ ...editing, id: `partner_${Date.now()}` } as Partner);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Quản lý Đối tác</h1>
           <p className="text-slate-500">Danh sách Khách hàng, Nhà cung cấp, Nhà thầu</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Thêm Đối tác
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {partners.map(p => (
            <div key={p.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                        <Briefcase className="w-5 h-5" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handleOpenModal(p)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50">
                            <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDelete(p.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <h3 className="font-bold text-slate-800 mb-1">{p.name}</h3>
                <div className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded font-mono mb-4">
                    {p.code}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 pt-4 border-t border-slate-100">
                    <Phone className="w-4 h-4" />
                    {p.contactInfo}
                </div>
            </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold mb-4">{editing.id ? 'Sửa Đối tác' : 'Thêm Đối tác'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mã đối tác</label>
                <input required type="text" className="w-full p-2 border rounded" value={editing.code} onChange={e => setEditing({...editing, code: e.target.value.toUpperCase()})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên đối tác</label>
                <input required type="text" className="w-full p-2 border rounded" value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Thông tin liên hệ (SĐT/Email/Địa chỉ)</label>
                <input type="text" className="w-full p-2 border rounded" value={editing.contactInfo} onChange={e => setEditing({...editing, contactInfo: e.target.value})} />
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

export default PartnerManager;