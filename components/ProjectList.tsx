import React, { useState } from 'react';
import { Project, ProjectStatusItem, User, Partner } from '../types';
import { Plus, Search, Calendar, ChevronRight, User as UserIcon, Building2 } from 'lucide-react';

interface ProjectListProps {
  projects: Project[];
  users: User[];
  partners: Partner[];
  statuses: ProjectStatusItem[];
  onAddProject: (p: Project) => void;
  onSelectProject: (p: Project) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, users, partners, statuses, onAddProject, onSelectProject }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New Project State
  const [newProject, setNewProject] = useState<Partial<Project>>({
    name: '',
    code: '',
    budget: 0,
    description: '',
    statusId: statuses[0]?.id || ''
  });

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Fix TS2783: Exclude 'id', 'startDate', 'endDate' from spread to avoid overwrite warning
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, startDate: _sd, endDate: _ed, ...restProject } = newProject as Project;

    const project: Project = {
      ...restProject,
      id: `prj_${Date.now()}`,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    };
    onAddProject(project);
    setIsModalOpen(false);
    setNewProject({ name: '', code: '', budget: 0, description: '', statusId: statuses[0]?.id || '' });
  };

  const getStatusItem = (id: string) => statuses.find(s => s.id === id) || { name: 'Unknown', color: 'bg-slate-100 text-slate-700', order: 0 };
  const getUserName = (id?: string) => users.find(u => u.id === id)?.fullName || '---';
  const getPartnerName = (id?: string) => partners.find(p => p.id === id)?.name || '---';
  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Danh sách Dự án</h1>
          <p className="text-slate-500">Quản lý các phương án kinh doanh và tiến độ</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#EE0033] text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-medium shadow-sm shadow-red-200"
        >
          <Plus className="w-5 h-5" />
          Thêm Dự án
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
           <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
           <input 
             type="text" 
             placeholder="Tìm kiếm theo tên hoặc mã dự án..." 
             className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#EE0033] focus:border-transparent outline-none"
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProjects.map(project => {
          const status = getStatusItem(project.statusId);
          return (
            <div 
              key={project.id} 
              onClick={() => onSelectProject(project)}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#EE0033]/30 transition-all cursor-pointer group flex flex-col h-full"
            >
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded text-xs font-mono font-medium border border-slate-200">
                    {project.code}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                    {status.name}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#EE0033] transition-colors line-clamp-2">
                  {project.name}
                </h3>
                
                <div className="space-y-3 mt-4">
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
                    <div className="flex gap-1 text-xs">
                        <span className="bg-blue-50 text-blue-700 px-1.5 rounded">AM: {getUserName(project.amId).split(' ').pop()}</span>
                        <span className="bg-purple-50 text-purple-700 px-1.5 rounded">PM: {getUserName(project.pmId).split(' ').pop()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-xl flex justify-between items-center">
                 <div>
                    <p className="text-xs text-slate-500 font-medium uppercase">Ngân sách</p>
                    <p className="text-sm font-bold text-slate-700">{formatCurrency(project.budget)}</p>
                 </div>
                 <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#EE0033] transition-colors" />
              </div>
            </div>
          );
        })}
        {filteredProjects.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                Không tìm thấy dự án nào.
            </div>
        )}
      </div>

      {/* Modal Add Project */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-4 text-slate-800">Thêm Dự án Mới</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mã dự án</label>
                  <input required type="text" className="w-full p-2 border rounded-lg" value={newProject.code} onChange={e => setNewProject({...newProject, code: e.target.value.toUpperCase()})} placeholder="VD: DA-2024-001" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái khởi tạo</label>
                   <select className="w-full p-2 border rounded-lg" value={newProject.statusId} onChange={e => setNewProject({...newProject, statusId: e.target.value})}>
                      {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên dự án</label>
                <input required type="text" className="w-full p-2 border rounded-lg" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} placeholder="Nhập tên dự án..." />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
                <textarea className="w-full p-2 border rounded-lg h-24" value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngân sách dự kiến</label>
                    <input type="number" className="w-full p-2 border rounded-lg" value={newProject.budget} onChange={e => setNewProject({...newProject, budget: Number(e.target.value)})} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Đối tác / Khách hàng</label>
                    <select className="w-full p-2 border rounded-lg" value={newProject.partnerId || ''} onChange={e => setNewProject({...newProject, partnerId: e.target.value})}>
                        <option value="">-- Chọn đối tác --</option>
                        {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">AM (Phụ trách KD)</label>
                    <select className="w-full p-2 border rounded-lg" value={newProject.amId || ''} onChange={e => setNewProject({...newProject, amId: e.target.value})}>
                        <option value="">-- Chọn AM --</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">PM (Quản trị dự án)</label>
                    <select className="w-full p-2 border rounded-lg" value={newProject.pmId || ''} onChange={e => setNewProject({...newProject, pmId: e.target.value})}>
                         <option value="">-- Chọn PM --</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                 </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-[#EE0033] text-white rounded-lg hover:bg-red-700 font-medium shadow-sm">Lưu dự án</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;