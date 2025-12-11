
import React, { useState } from 'react';
import { Partner, Project, Contract, ContractType, PartnerType } from '../types';
import { Briefcase, Plus, Edit, Trash2, Phone, X, FileText, Folder, Users, Truck } from 'lucide-react';

interface PartnerManagerProps {
  partners: Partner[];
  projects: Project[];
  contracts: Contract[];
  onAdd: (p: Partner) => void;
  onUpdate: (p: Partner) => void;
  onDelete: (id: string) => void;
}

const PartnerManager: React.FC<PartnerManagerProps> = ({ partners, projects, contracts, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Partner>>({});
  
  // State for Detail Modal
  const [detailPartner, setDetailPartner] = useState<Partner | null>(null);

  const handleOpenModal = (p?: Partner, e?: React.MouseEvent) => {
    if(e) e.stopPropagation();
    if (p) {
      setEditing({ ...p });
    } else {
      setEditing({ name: '', code: '', contactInfo: '', type: PartnerType.CUSTOMER });
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
  
  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Quản lý Đối tác</h1>
           <p className="text-slate-500">Danh sách Khách hàng, Nhà cung cấp, Nhà thầu</p>
        </div>
        <button 
          onClick={(e) => handleOpenModal(undefined, e)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Thêm Đối tác
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {partners.map(p => (
            <div 
                key={p.id} 
                onClick={() => setDetailPartner(p)}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
                <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${p.type === PartnerType.SUPPLIER ? 'bg-orange-100 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {p.type === PartnerType.SUPPLIER ? <Truck className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => handleOpenModal(p, e)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50">
                            <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(p.id); }} className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <h3 className="font-bold text-slate-800 mb-1 line-clamp-2 min-h-[1.5em]">{p.name}</h3>
                <div className="flex items-center gap-2 mb-4">
                    <div className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded font-mono">
                        {p.code}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        p.type === PartnerType.SUPPLIER 
                        ? 'bg-orange-50 text-orange-700 border border-orange-100' 
                        : 'bg-blue-50 text-blue-700 border border-blue-100'
                    }`}>
                        {p.type === PartnerType.SUPPLIER ? 'Nhà cung cấp' : 'Khách hàng'}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 pt-4 border-t border-slate-100">
                    <Phone className="w-4 h-4" />
                    {p.contactInfo}
                </div>
            </div>
        ))}
      </div>

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold mb-4 text-slate-800">{editing.id ? 'Sửa Đối tác' : 'Thêm Đối tác'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Loại đối tác</label>
                  <div className="grid grid-cols-2 gap-3">
                      <label className={`border rounded-lg p-3 flex items-center gap-2 cursor-pointer transition-colors ${editing.type === PartnerType.CUSTOMER ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                          <input 
                            type="radio" 
                            name="pType" 
                            className="hidden"
                            checked={editing.type === PartnerType.CUSTOMER} 
                            onChange={() => setEditing({...editing, type: PartnerType.CUSTOMER})} 
                          />
                          <Users className="w-4 h-4" /> Khách hàng
                      </label>
                      <label className={`border rounded-lg p-3 flex items-center gap-2 cursor-pointer transition-colors ${editing.type === PartnerType.SUPPLIER ? 'bg-orange-50 border-orange-500 text-orange-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                          <input 
                            type="radio" 
                            name="pType" 
                            className="hidden"
                            checked={editing.type === PartnerType.SUPPLIER} 
                            onChange={() => setEditing({...editing, type: PartnerType.SUPPLIER})} 
                          />
                          <Truck className="w-4 h-4" /> Nhà cung cấp
                      </label>
                  </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mã đối tác</label>
                <input required type="text" className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={editing.code} onChange={e => setEditing({...editing, code: e.target.value.toUpperCase()})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên đối tác</label>
                <input required type="text" className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Thông tin liên hệ (SĐT/Email/Địa chỉ)</label>
                <input type="text" className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={editing.contactInfo} onChange={e => setEditing({...editing, contactInfo: e.target.value})} />
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Lưu thông tin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailPartner && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto relative">
                <button onClick={() => setDetailPartner(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X className="w-6 h-6" />
                </button>
                
                <div className="flex items-center gap-3 mb-6">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${detailPartner.type === PartnerType.SUPPLIER ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
                         {detailPartner.type === PartnerType.SUPPLIER ? <Truck className="w-6 h-6" /> : <Briefcase className="w-6 h-6" />}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{detailPartner.name}</h2>
                        <div className="flex gap-2 text-sm text-slate-500 items-center">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                detailPartner.type === PartnerType.SUPPLIER 
                                ? 'bg-orange-50 text-orange-700 border border-orange-100' 
                                : 'bg-blue-50 text-blue-700 border border-blue-100'
                            }`}>
                                {detailPartner.type === PartnerType.SUPPLIER ? 'Nhà cung cấp' : 'Khách hàng'}
                            </span>
                            <span>Mã: {detailPartner.code}</span>
                            <span>•</span>
                            <span>{detailPartner.contactInfo}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Projects Section */}
                    <div>
                        <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                            <Folder className="w-4 h-4 text-slate-400" /> Các dự án tham gia
                        </h3>
                        <div className="space-y-2">
                            {projects.filter(p => p.partnerId === detailPartner.id).length === 0 ? (
                                <div className="p-4 text-sm text-slate-400 border border-dashed rounded-lg text-center">Chưa có dự án liên kết.</div>
                            ) : (
                                projects.filter(p => p.partnerId === detailPartner.id).map(p => (
                                    <div key={p.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                        <div className="font-medium text-slate-800 text-sm">{p.name}</div>
                                        <div className="text-xs text-slate-500 mt-1">{p.code}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Contracts Section */}
                    <div>
                        <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400" /> Lịch sử Hợp đồng
                        </h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                             {/* Filter contracts by partner name loosely or if projects match */}
                             {contracts.filter(c => c.partnerName.toLowerCase().includes(detailPartner.name.toLowerCase()) || projects.find(p => p.id === c.projectId)?.partnerId === detailPartner.id).length === 0 ? (
                                <div className="p-4 text-sm text-slate-400 border border-dashed rounded-lg text-center">Chưa tìm thấy hợp đồng.</div>
                             ) : (
                                 contracts.filter(c => c.partnerName.toLowerCase().includes(detailPartner.name.toLowerCase()) || projects.find(p => p.id === c.projectId)?.partnerId === detailPartner.id).map(c => (
                                    <div key={c.id} className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div className="text-sm font-medium text-slate-800 line-clamp-2">{c.name}</div>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${c.type === ContractType.OUTPUT ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {c.type === ContractType.OUTPUT ? 'Đầu ra' : 'Đầu vào'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">{c.code} • {new Date(c.signedDate).toLocaleDateString('vi-VN')}</div>
                                        <div className="text-sm font-bold text-indigo-600 mt-2 text-right">{formatCurrency(c.value)}</div>
                                    </div>
                                 ))
                             )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default PartnerManager;
