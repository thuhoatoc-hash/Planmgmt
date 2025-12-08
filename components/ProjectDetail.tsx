import React, { useState, useMemo } from 'react';
import { Project, Contract, Category, ContractType, CategoryType } from '../types';
import { ArrowLeft, Plus, DollarSign, Calendar, Briefcase, Filter, User, Building2 } from 'lucide-react';
import { MOCK_USERS, MOCK_PARTNERS, MOCK_STATUSES } from '../services/mockData'; // In real app, pass via props

interface ProjectDetailProps {
  project: Project;
  contracts: Contract[];
  categories: Category[];
  onBack: () => void;
  onAddContract: (c: Contract) => void;
  onUpdateContractStatus: (id: string, status: Contract['status']) => void;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ 
  project, contracts, categories, onBack, onAddContract, onUpdateContractStatus 
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'INPUT' | 'OUTPUT'>('OVERVIEW');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Resolve Relationships (Simplification: using mockData directly here for simplicity, ideally pass these via props)
  const status = MOCK_STATUSES.find(s => s.id === project.statusId);
  const am = MOCK_USERS.find(u => u.id === project.amId);
  const pm = MOCK_USERS.find(u => u.id === project.pmId);
  const partner = MOCK_PARTNERS.find(p => p.id === project.partnerId);

  // New Contract State
  const [newContract, setNewContract] = useState<Partial<Contract>>({
    code: '',
    name: '',
    value: 0,
    partnerName: '',
    signedDate: new Date().toISOString().split('T')[0],
    status: 'PENDING'
  });

  const projectContracts = contracts.filter(c => c.projectId === project.id);
  
  const stats = useMemo(() => {
    const revenue = projectContracts.filter(c => c.type === ContractType.OUTPUT).reduce((acc, c) => acc + c.value, 0);
    const cost = projectContracts.filter(c => c.type === ContractType.INPUT).reduce((acc, c) => acc + c.value, 0);
    return { revenue, cost, profit: revenue - cost };
  }, [projectContracts]);

  const handleCreateContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContract.categoryId) return;
    
    // Determine type based on category
    const category = categories.find(c => c.id === newContract.categoryId);
    const type = category?.type === CategoryType.REVENUE ? ContractType.OUTPUT : ContractType.INPUT;

    // Fix TS2783 by spreading first, then adding generated properties
    onAddContract({
      ...newContract as Contract,
      id: `ctr_${Date.now()}`,
      projectId: project.id,
      type,
    });
    setIsModalOpen(false);
    setNewContract({ code: '', name: '', value: 0, partnerName: '', signedDate: new Date().toISOString().split('T')[0], status: 'PENDING' });
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);

  const ContractTable = ({ type }: { type: ContractType }) => {
    const data = projectContracts.filter(c => c.type === type);
    return (
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Mã HĐ</th>
              <th className="px-4 py-3">Tên hợp đồng</th>
              <th className="px-4 py-3">Đối tác</th>
              <th className="px-4 py-3">Danh mục</th>
              <th className="px-4 py-3 text-right">Giá trị</th>
              <th className="px-4 py-3">Ngày ký</th>
              <th className="px-4 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Chưa có hợp đồng nào</td></tr>
            ) : (
              data.map(contract => {
                const category = categories.find(c => c.id === contract.categoryId);
                return (
                  <tr key={contract.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{contract.code}</td>
                    <td className="px-4 py-3">{contract.name}</td>
                    <td className="px-4 py-3">{contract.partnerName}</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs border border-slate-200">
                        {category?.name || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(contract.value)}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(contract.signedDate).toLocaleDateString('vi-VN')}</td>
                    <td className="px-4 py-3">
                      <select 
                        value={contract.status}
                        onChange={(e) => onUpdateContractStatus(contract.id, e.target.value as any)}
                        className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer outline-none ${
                          contract.status === 'SIGNED' ? 'bg-green-100 text-green-700' :
                          contract.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                          contract.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                         <option value="PENDING">PENDING</option>
                         <option value="SIGNED">SIGNED</option>
                         <option value="COMPLETED">COMPLETED</option>
                         <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
            <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
            <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-mono">{project.code}</span>
                {status && (
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${status.color}`}>{status.name}</span>
                )}
            </div>
            </div>
            <div className="ml-auto flex gap-2">
            <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
                <Plus className="w-4 h-4" />
                Thêm Hợp đồng
            </button>
            </div>
        </div>

        {/* Project Meta */}
        <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
                <span className="text-slate-500 block mb-1">Thời gian</span>
                <span className="font-medium flex items-center gap-1"><Calendar className="w-3 h-3"/> {project.startDate} - {project.endDate}</span>
            </div>
            <div>
                <span className="text-slate-500 block mb-1">Đối tác</span>
                <span className="font-medium flex items-center gap-1"><Building2 className="w-3 h-3"/> {partner?.name || '---'}</span>
            </div>
            <div>
                <span className="text-slate-500 block mb-1">Account Manager</span>
                <span className="font-medium flex items-center gap-1"><User className="w-3 h-3"/> {am?.fullName || '---'}</span>
            </div>
            <div>
                <span className="text-slate-500 block mb-1">Project Manager</span>
                <span className="font-medium flex items-center gap-1"><User className="w-3 h-3"/> {pm?.fullName || '---'}</span>
            </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4">
          {[
            { id: 'OVERVIEW', label: 'Tổng quan Tài chính', icon: DollarSign },
            { id: 'INPUT', label: 'Hợp đồng Đầu vào (Chi phí)', icon: Filter },
            { id: 'OUTPUT', label: 'Hợp đồng Đầu ra (Doanh thu)', icon: Briefcase },
          ].map(tab => (
             <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
             >
               <tab.icon className="w-4 h-4" />
               {tab.label}
             </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Tổng Doanh thu Dự kiến</p>
                <p className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(stats.revenue)}</p>
             </div>
             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Tổng Chi phí Thực tế</p>
                <p className="text-2xl font-bold text-rose-600 mt-2">{formatCurrency(stats.cost)}</p>
                <div className="mt-2 text-xs text-slate-400">
                  Ngân sách: {formatCurrency(project.budget)}
                </div>
             </div>
             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Lợi nhuận Tạm tính</p>
                <p className={`text-2xl font-bold mt-2 ${stats.profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {formatCurrency(stats.profit)}
                </p>
             </div>
          </div>
        )}
        
        {activeTab === 'INPUT' && <ContractTable type={ContractType.INPUT} />}
        {activeTab === 'OUTPUT' && <ContractTable type={ContractType.OUTPUT} />}
      </div>

      {/* Modal Add Contract */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6">
            <h2 className="text-xl font-bold mb-4">Thêm Hợp đồng Mới</h2>
            <form onSubmit={handleCreateContract} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mã hợp đồng</label>
                  <input required type="text" className="w-full p-2 border rounded" value={newContract.code} onChange={e => setNewContract({...newContract, code: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ngày ký</label>
                  <input required type="date" className="w-full p-2 border rounded" value={newContract.signedDate} onChange={e => setNewContract({...newContract, signedDate: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên hợp đồng</label>
                <input required type="text" className="w-full p-2 border rounded" value={newContract.name} onChange={e => setNewContract({...newContract, name: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Đối tác</label>
                  <input required type="text" className="w-full p-2 border rounded" value={newContract.partnerName} onChange={e => setNewContract({...newContract, partnerName: e.target.value})} />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Giá trị (VND)</label>
                   <input required type="number" className="w-full p-2 border rounded" value={newContract.value} onChange={e => setNewContract({...newContract, value: Number(e.target.value)})} />
                </div>
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Danh mục (Xác định Doanh thu/Chi phí)</label>
                 <select 
                    required 
                    className="w-full p-2 border rounded" 
                    value={newContract.categoryId || ''} 
                    onChange={e => setNewContract({...newContract, categoryId: e.target.value})}
                  >
                    <option value="">-- Chọn danh mục --</option>
                    <optgroup label="DOANH THU (Đầu ra)">
                      {categories.filter(c => c.type === CategoryType.REVENUE).map(c => (
                        <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="CHI PHÍ (Đầu vào)">
                      {categories.filter(c => c.type === CategoryType.COST).map(c => (
                        <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                      ))}
                    </optgroup>
                 </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Lưu hợp đồng</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;