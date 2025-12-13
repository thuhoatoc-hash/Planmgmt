
import React, { useState, useMemo } from 'react';
import { Project, ProjectStatusItem, User, Partner, ProjectType, ProductType, Contract, ContractType, PartnerType, InstallmentStatus, Task, TaskType, TaskStatus } from '../types';
import { Plus, Search, Calendar, ChevronRight, User as UserIcon, Building2, Edit, Trash2, Tag, Box, Filter, TrendingUp, DollarSign, Wallet, Activity } from 'lucide-react';
import CurrencyInput from './CurrencyInput';
import { api } from '../services/api';

// UUID Generator Polyfill
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface ProjectListProps {
  projects: Project[];
  contracts: Contract[];
  users: User[];
  partners: Partner[];
  statuses: ProjectStatusItem[];
  onAddProject: (p: Project) => void;
  onUpdateProject: (p: Project) => void;
  onDeleteProject: (id: string) => void;
  onSelectProject: (p: Project) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, contracts, users, partners, statuses, onAddProject, onUpdateProject, onDeleteProject, onSelectProject }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatusId, setFilterStatusId] = useState('');
  
  // Project Form State
  const initialProjectState: Partial<Project> = {
    name: '',
    code: '',
    plannedSales: 0,
    plannedRevenue: 0,
    plannedCost: 0,
    description: '',
    statusId: statuses[0]?.id || '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    projectType: ProjectType.OUTRIGHT_SALE,
    productType: ProductType.HARDWARE,
  };
  const [formData, setFormData] = useState<Partial<Project>>(initialProjectState);

  const filteredProjects = projects.filter(p => 
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.code.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterStatusId === '' || p.statusId === filterStatusId)
  );

  // --- OVERVIEW STATS ---
  const overviewStats = useMemo(() => {
      let totalSales = 0;
      let totalPlannedRevenue = 0;
      let totalRealizedRevenue = 0;
      let totalProfit = 0;

      filteredProjects.forEach(project => {
          const pContracts = contracts.filter(c => c.projectId === project.id);
          
          // Signed Sales
          const signedSales = pContracts
            .filter(c => c.type === ContractType.OUTPUT && c.status !== 'CANCELLED')
            .reduce((sum, c) => sum + c.value, 0);
          
          // Actual Realized Revenue (Invoiced/Paid)
          const realized = pContracts
            .filter(c => c.type === ContractType.OUTPUT && c.status !== 'CANCELLED')
            .reduce((acc, c) => {
                if (c.installments && c.installments.length > 0) {
                    return acc + c.installments
                        .filter(i => i.status === InstallmentStatus.INVOICED || i.status === InstallmentStatus.PAID)
                        .reduce((sum, i) => sum + i.value, 0);
                } else {
                    return acc + (c.status === 'COMPLETED' ? c.value : 0);
                }
            }, 0);

          // Actual Cost
          const cost = pContracts
            .filter(c => c.type === ContractType.INPUT && c.status !== 'CANCELLED')
            .reduce((sum, c) => sum + c.value, 0);

          totalSales += signedSales;
          totalPlannedRevenue += (project.plannedRevenue || 0); // Using planned for reference, or could be signedSales
          totalRealizedRevenue += realized;
          totalProfit += (signedSales - cost);
      });

      return {
          count: filteredProjects.length,
          totalSales,
          totalPlannedRevenue,
          totalRealizedRevenue,
          totalProfit
      };
  }, [filteredProjects, contracts]);

  const handleOpenModal = (project?: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (project) {
        setFormData({ ...project });
    } else {
        setFormData({
            ...initialProjectState,
            statusId: statuses[0]?.id || ''
        });
    }
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xóa dự án này? Dữ liệu không thể khôi phục.')) {
        onDeleteProject(id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.id) {
        onUpdateProject(formData as Project);
    } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, ...restProject } = formData as Project;
        // Generate UUID for new project to ensure consistency
        const projectId = generateUUID();
        const project: Project = {
          ...restProject,
          id: projectId,
        };
        onAddProject(project);

        // --- AUTO GENERATE STANDARD MILESTONES ---
        // Requirement: Default 6 tasks with updated names
        const milestones = [
            { key: 'CONTACT', name: '1. Tiếp xúc, giới thiệu sản phẩm' },
            { key: 'DEMO', name: '2. Demo, POC' },
            { key: 'PROPOSAL', name: '3. Xây dựng hồ sơ đề xuất, chủ trương' },
            { key: 'BIDDING', name: '4. Đấu thầu, ký Hợp đồng' },
            { key: 'DEPLOY', name: '5. Triển khai' },
            { key: 'ACCEPTANCE', name: '6. Nghiệm thu, xuất hoá đơn' },
        ];

        for (const m of milestones) {
            const task: Task = {
                id: generateUUID(),
                projectId: projectId,
                name: m.name,
                taskType: TaskType.PROJECT,
                status: TaskStatus.NOT_STARTED,
                deadline: project.endDate, // Default to project end date
                assignerId: formData.pmId || formData.amId || '', // Default to PM or AM
                assigneeId: formData.amId || '', // Default to AM
                milestoneKey: m.key
            };
            // Call API directly to ensure they are created in DB immediately
            await api.tasks.save(task);
        }
    }
    setIsModalOpen(false);
  };

  const getStatusItem = (id: string) => statuses.find(s => s.id === id) || { name: 'Unknown', color: 'bg-slate-100 text-slate-700', order: 0 };
  const getUserName = (id?: string) => users.find(u => u.id === id)?.fullName || '---';
  const getPartnerName = (id?: string) => partners.find(p => p.id === id)?.name || '---';
  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);

  // Helper labels
  const projectTypeLabels: Record<string, string> = {
    [ProjectType.OUTRIGHT_SALE]: 'Bán đứt',
    [ProjectType.SERVICE_LEASE]: 'Thuê dịch vụ',
  };
  const productTypeLabels: Record<string, string> = {
    [ProductType.HARDWARE]: 'Phần cứng',
    [ProductType.INTERNAL_SOFTWARE]: 'Phần mềm nội bộ',
    [ProductType.HYBRID]: 'Hỗn hợp',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Danh sách Dự án</h1>
          <p className="text-slate-500">Quản lý phương án kinh doanh, doanh thu và chi phí</p>
        </div>
        <button 
          onClick={(e) => handleOpenModal(undefined, e)}
          className="bg-[#EE0033] text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-medium shadow-sm shadow-red-200"
        >
          <Plus className="w-5 h-5" />
          Thêm Dự án
        </button>
      </div>

      {/* OVERVIEW SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <p className="text-slate-500 text-xs font-bold uppercase mb-1">Số lượng Dự án</p>
              <h3 className="text-2xl font-bold text-slate-800">{overviewStats.count}</h3>
              <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                  <Box className="w-3 h-3" /> Đang hiển thị
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <p className="text-slate-500 text-xs font-bold uppercase mb-1">Tổng Doanh số (Ký)</p>
              <h3 className="text-xl font-bold text-indigo-600 truncate" title={formatCurrency(overviewStats.totalSales)}>{formatCurrency(overviewStats.totalSales)}</h3>
              <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Tổng HĐ đầu ra
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <p className="text-slate-500 text-xs font-bold uppercase mb-1">DT Dự kiến (PAKD)</p>
              <h3 className="text-xl font-bold text-blue-600 truncate" title={formatCurrency(overviewStats.totalPlannedRevenue)}>{formatCurrency(overviewStats.totalPlannedRevenue)}</h3>
              <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Theo kế hoạch
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between bg-emerald-50/50 border-emerald-100">
              <p className="text-emerald-700 text-xs font-bold uppercase mb-1">DT Thực hiện (NT)</p>
              <h3 className="text-xl font-bold text-emerald-600 truncate" title={formatCurrency(overviewStats.totalRealizedRevenue)}>{formatCurrency(overviewStats.totalRealizedRevenue)}</h3>
              <div className="mt-2 text-xs text-emerald-600/70 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Đã nghiệm thu/TT
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <p className="text-slate-500 text-xs font-bold uppercase mb-1">Tổng Hiệu quả</p>
              <h3 className={`text-xl font-bold truncate ${overviewStats.totalProfit >= 0 ? 'text-slate-800' : 'text-orange-600'}`} title={formatCurrency(overviewStats.totalProfit)}>{formatCurrency(overviewStats.totalProfit)}</h3>
              <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> Lợi nhuận dự kiến
              </div>
          </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 max-w-md w-full">
           <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
           <input 
             type="text" 
             placeholder="Tìm kiếm theo tên hoặc mã dự án..." 
             className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#EE0033] focus:border-transparent outline-none"
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
           />
        </div>
        <div className="w-full md:w-auto min-w-[220px] relative">
            <Filter className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none text-slate-600 appearance-none bg-white"
                value={filterStatusId}
                onChange={(e) => setFilterStatusId(e.target.value)}
            >
                <option value="">-- Tất cả trạng thái --</option>
                {statuses.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProjects.map(project => {
          const status = getStatusItem(project.statusId);
          // Calculate Actuals
          const pContracts = contracts.filter(c => c.projectId === project.id);
          
          // Doanh số: Tổng giá trị HĐ (trừ Hủy) - Thể hiện quy mô đã ký
          const sales = pContracts.filter(c => c.type === ContractType.OUTPUT && c.status !== 'CANCELLED').reduce((sum, c) => sum + c.value, 0);
          
          // Doanh thu thực tế (Realized Revenue): Đã xuất hóa đơn hoặc đã thanh toán
          const realizedRevenue = pContracts
            .filter(c => c.type === ContractType.OUTPUT && c.status !== 'CANCELLED')
            .reduce((acc, c) => {
                if (c.installments && c.installments.length > 0) {
                    return acc + c.installments
                        .filter(i => i.status === InstallmentStatus.INVOICED || i.status === InstallmentStatus.PAID)
                        .reduce((sum, i) => sum + i.value, 0);
                } else {
                    return acc + (c.status === 'COMPLETED' ? c.value : 0);
                }
            }, 0);

          // Chi phí: Tổng chi phí (trừ Hủy)
          const cost = pContracts.filter(c => c.type === ContractType.INPUT && c.status !== 'CANCELLED').reduce((sum, c) => sum + c.value, 0);

          return (
            <div 
              key={project.id} 
              onClick={() => onSelectProject(project)}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#EE0033]/30 transition-all cursor-pointer group flex flex-col h-full relative"
            >
              {/* Action Buttons */}
              <div className="absolute top-4 right-4 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={(e) => handleOpenModal(project, e)} 
                    className="p-1.5 bg-white text-slate-500 hover:text-indigo-600 rounded-md shadow-sm border border-slate-200 hover:border-indigo-200"
                    title="Sửa dự án"
                >
                    <Edit className="w-4 h-4" />
                </button>
                <button 
                    onClick={(e) => handleDelete(project.id, e)} 
                    className="p-1.5 bg-white text-slate-500 hover:text-red-600 rounded-md shadow-sm border border-slate-200 hover:border-red-200"
                    title="Xóa dự án"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded text-xs font-mono font-medium border border-slate-200">
                    {project.code}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                    {status.name}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#EE0033] transition-colors line-clamp-2 pr-12">
                  {project.name}
                </h3>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        <Tag className="w-3 h-3" /> {projectTypeLabels[project.projectType] || project.projectType}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100">
                        <Box className="w-3 h-3" /> {productTypeLabels[project.productType] || project.productType}
                    </span>
                </div>
                
                <div className="space-y-2 mt-4 text-sm">
                  <div className="flex justify-between items-center text-slate-600 border-b border-dashed border-slate-200 pb-2">
                     <span>Doanh số (Ký HĐ):</span>
                     <span className="font-bold text-indigo-600">{formatCurrency(sales)}</span>
                  </div>
                  {/* NEW FIELD: Realized Revenue */}
                  <div className="flex justify-between items-center text-slate-600 border-b border-dashed border-slate-200 pb-2 bg-emerald-50/30 px-1 -mx-1 rounded">
                     <span className="text-emerald-800 font-medium">Đã nghiệm thu (NT):</span>
                     <span className="font-bold text-emerald-600">{formatCurrency(realizedRevenue)}</span>
                  </div>
                   <div className="flex justify-between items-center text-slate-600 border-b border-dashed border-slate-200 pb-2">
                     <span>Chi phí thực tế:</span>
                     <span className="font-bold text-rose-600">{formatCurrency(cost)}</span>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                   <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{getPartnerName(project.partnerId)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{project.startDate} - {project.endDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <div className="flex gap-1 text-xs flex-wrap">
                        {project.amId && <span className="bg-blue-50 text-blue-700 px-1.5 rounded">AM: {getUserName(project.amId).split(' ').pop()}</span>}
                        {project.pmId && <span className="bg-purple-50 text-purple-700 px-1.5 rounded">PM: {getUserName(project.pmId).split(' ').pop()}</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-xl flex justify-between items-center">
                 <div>
                    <p className="text-xs text-slate-500 font-medium uppercase">DT Dự kiến (PAKD)</p>
                    <p className="text-sm font-bold text-slate-700">{formatCurrency(project.plannedRevenue)}</p>
                 </div>
                 <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#EE0033] transition-colors" />
              </div>
            </div>
          );
        })}
        {filteredProjects.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                Không tìm thấy dự án nào phù hợp.
            </div>
        )}
      </div>

      {/* Modal Add/Edit Project */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 animate-in fade-in zoom-in duration-200 max-h-[95vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-slate-800">{formData.id ? 'Sửa Dự án' : 'Thêm Dự án Mới'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mã dự án</label>
                  <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} placeholder="VD: DA-2024-001" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label>
                   <select className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={formData.statusId} onChange={e => setFormData({...formData, statusId: e.target.value})}>
                      {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên dự án</label>
                <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nhập tên dự án..." />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Loại hình dự án</label>
                   <select className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={formData.projectType} onChange={e => setFormData({...formData, projectType: e.target.value as ProjectType})}>
                      <option value={ProjectType.OUTRIGHT_SALE}>Bán đứt</option>
                      <option value={ProjectType.SERVICE_LEASE}>Thuê dịch vụ</option>
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Sản phẩm</label>
                   <select className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={formData.productType} onChange={e => setFormData({...formData, productType: e.target.value as ProductType})}>
                      <option value={ProductType.HARDWARE}>Phần cứng</option>
                      <option value={ProductType.INTERNAL_SOFTWARE}>Phần mềm nội bộ</option>
                      <option value={ProductType.HYBRID}>Hỗn hợp</option>
                   </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả chi tiết</label>
                <textarea className="w-full p-2 border rounded-lg h-20 focus:ring-2 focus:ring-[#EE0033] outline-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày bắt đầu</label>
                    <input type="date" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày kết thúc (Dự kiến)</label>
                    <input type="date" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                 </div>
              </div>

              <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Doanh số Dự kiến (PAKD)</label>
                    <CurrencyInput 
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none font-bold text-indigo-600"
                        value={formData.plannedSales || 0}
                        onChange={(val) => setFormData({...formData, plannedSales: val})}
                        placeholder="0"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Doanh thu Dự kiến (PAKD)</label>
                    <CurrencyInput 
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none font-bold text-emerald-600"
                        value={formData.plannedRevenue || 0}
                        onChange={(val) => setFormData({...formData, plannedRevenue: val})}
                        placeholder="0"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Chi phí Dự kiến (PAKD)</label>
                    <CurrencyInput 
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none font-bold text-rose-600"
                        value={formData.plannedCost || 0}
                        onChange={(val) => setFormData({...formData, plannedCost: val})}
                        placeholder="0"
                    />
                 </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Đối tác / Khách hàng</label>
                    <select className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={formData.partnerId || ''} onChange={e => setFormData({...formData, partnerId: e.target.value})}>
                        <option value="">-- Chọn Khách hàng --</option>
                        {partners.filter(p => p.type === PartnerType.CUSTOMER || !p.type).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">AM (Phụ trách KD)</label>
                    <select className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={formData.amId || ''} onChange={e => setFormData({...formData, amId: e.target.value})}>
                        <option value="">-- Chọn AM --</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">PM (Quản trị dự án)</label>
                    <select className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={formData.pmId || ''} onChange={e => setFormData({...formData, pmId: e.target.value})}>
                         <option value="">-- Chọn PM --</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                 </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-[#EE0033] text-white rounded-lg hover:bg-red-700 font-medium shadow-sm">
                    {formData.id ? 'Cập nhật' : 'Lưu dự án'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;
