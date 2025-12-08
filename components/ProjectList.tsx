import React, { useState } from 'react';
import { Project, ProjectStatusItem, User, Partner } from '../types';
import { Plus, Search, Calendar, Folder, MoreVertical, ChevronRight, User as UserIcon, Building2 } from 'lucide-react';

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
    const project: Project = {
      id: `prj_${Date.now()}`,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      ...newProject as Project
    };
    onAddProject(project);
    setIsModalOpen(false);
    setNewProject({ name: '', code: '', budget: 0, description: '', statusId: statuses[0]?.id || '' });
  };

  const getStatusItem = (id: string) => statuses.find(s => s.id === id) || { name: 'Unknown', color: 'bg-slate-100 text-slate-700' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Danh sách Dự án</h1>
          <p className="text-slate-500">Quản lý các dự án và phương án kinh doanh</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium"
        >
          <Plus className="w-5 h-5" />
          Thêm dự án
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          type="text"
          placeholder="Tìm kiếm theo tên dự án, mã dự án..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProjects.map((project) => {
          const status = getStatusItem(project.statusId);
          const am = users.find(u => u.id === project.amId);
          const partner = partners.find(p => p.id === project.partnerId);

          return (
            <div 
                key={project.id}
                onClick={() => onSelectProject(project)}
                className="group bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col"
            >
                <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                    <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                       {status.name}
                    </div>
                    <button className="text-slate-400 hover:text-slate-600">
                    <MoreVertical className="w-5 h-5" />
                    </button>
                </div>
                
                <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">
                    {project.name}
                </h3>
                <p className="text-sm text-slate-500 mb-4 font-mono">{project.code}</p>
                
                <div className="space-y-2 mb-4">
                     {partner && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Building2 className="w-4 h-4 text-slate-400" /> 
                            <span className="truncate">{partner.name}</span>
                        </div>
                     )}
                     {am && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <UserIcon className="w-4 h-4 text-slate-400" /> 
                            <span>AM: {am.fullName}</span>
                        </div>
                     )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t border-slate-100">
                    <div>
                    <p className="text-slate-500 text-xs mb-1">Ngân sách</p>
                    <p className="font-semibold text-slate-800">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(project.budget)}
                    </p>
                    </div>
                    <div>
                    <p className="text-slate-500 text-xs mb-1">Thời hạn</p>
                    <div className="flex items-center gap-1 text-slate-800">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{new Date(project.endDate).toLocaleDateString('vi-VN')}</span>
                    </div>
                    </div>
                </div>
                </div>
                
                <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-sm font-medium text-indigo-600">
                Xem chi tiết
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add Project */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold mb-4">Thêm Dự án Mới</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mã dự án</label>
                  <input required type="text" className="w-full p-2 border rounded" value={newProject.code} onChange={e => setNewProject({...newProject, code: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ngân sách (VND)</label>
                  <input required type="number" className="w-full p-2 border rounded" value={newProject.budget} onChange={e => setNewProject({...newProject, budget: Number(e.target.value)})} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên dự án</label>
                <input required type="text" className="w-full p-2 border rounded" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Account Manager</label>
                    <select className="w-full p-2 border rounded" value={newProject.amId || ''} onChange={e => setNewProject({...newProject, amId: e.target.value})}>
                        <option value="">-- Chọn AM --</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Project Manager</label>
                    <select className="w-full p-2 border rounded" value={newProject.pmId || ''} onChange={e => setNewProject({...newProject, pmId: e.target.value})}>
                        <option value="">-- Chọn PM --</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                 </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Đối tác</label>
                <select className="w-full p-2 border rounded" value={newProject.partnerId || ''} onChange={e => setNewProject({...newProject, partnerId: e.target.value})}>
                    <option value="">-- Chọn Đối tác --</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tiến độ</label>
                <select className="w-full p-2 border rounded" value={newProject.statusId} onChange={e => setNewProject({...newProject, statusId: e.target.value})}>
                  {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
                <textarea className="w-full p-2 border rounded" rows={2} value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})}></textarea>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Tạo dự án</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;