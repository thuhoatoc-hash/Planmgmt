
import React, { useState, useMemo } from 'react';
import { Task, TaskStatus, TaskType, Project, User } from '../types';
import { Plus, Search, Edit, Trash2, CheckSquare, Clock, AlertTriangle, Briefcase, FileText, Calendar } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface TaskManagementProps {
  tasks: Task[];
  projects: Project[];
  users: User[];
  currentUser: User;
  onAddTask: (t: Task) => void;
  onUpdateTask: (t: Task) => void;
  onDeleteTask: (id: string) => void;
}

const COLORS = ['#94a3b8', '#3b82f6', '#10b981', '#f97316', '#ef4444']; // Colors matching status

const TaskManagement: React.FC<TaskManagementProps> = ({ tasks, projects, users, currentUser, onAddTask, onUpdateTask, onDeleteTask }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterAssignee, setFilterAssignee] = useState<string>('ALL');

  // Task Form State
  const initialFormState: Partial<Task> = {
      name: '',
      description: '',
      status: TaskStatus.NOT_STARTED,
      taskType: TaskType.ADHOC,
      projectId: '',
      assignerId: currentUser.id,
      assigneeId: currentUser.id,
      deadline: new Date().toISOString().split('T')[0],
      outputStandard: '',
      collaboratorIds: []
  };
  const [formData, setFormData] = useState<Partial<Task>>(initialFormState);

  // Helper Labels
  const statusLabels: Record<string, string> = {
      [TaskStatus.NOT_STARTED]: 'Chưa bắt đầu',
      [TaskStatus.IN_PROGRESS]: 'Đang thực hiện',
      [TaskStatus.COMPLETED]: 'Hoàn thành',
      [TaskStatus.EXTENSION_REQUESTED]: 'Đề xuất gia hạn',
      [TaskStatus.CANCELLED]: 'Hủy',
  };

  const statusColors: Record<string, string> = {
      [TaskStatus.NOT_STARTED]: 'bg-slate-100 text-slate-700',
      [TaskStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-700',
      [TaskStatus.COMPLETED]: 'bg-emerald-100 text-emerald-700',
      [TaskStatus.EXTENSION_REQUESTED]: 'bg-orange-100 text-orange-700',
      [TaskStatus.CANCELLED]: 'bg-red-100 text-red-700',
  };

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
      const inProgress = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
      
      const today = new Date();
      today.setHours(0,0,0,0);
      const late = tasks.filter(t => 
          (t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELLED) && 
          new Date(t.deadline) < today
      ).length;

      const dueSoon = tasks.filter(t => {
          if (t.status === TaskStatus.COMPLETED || t.status === TaskStatus.CANCELLED) return false;
          const deadline = new Date(t.deadline);
          const diffTime = deadline.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          return diffDays >= 0 && diffDays <= 2; // Due today, tomorrow, or day after
      }).length;

      const pieData = [
          { name: 'Chưa bắt đầu', value: tasks.filter(t => t.status === TaskStatus.NOT_STARTED).length },
          { name: 'Đang làm', value: inProgress },
          { name: 'Hoàn thành', value: completed },
          { name: 'Gia hạn', value: tasks.filter(t => t.status === TaskStatus.EXTENSION_REQUESTED).length },
          { name: 'Hủy', value: tasks.filter(t => t.status === TaskStatus.CANCELLED).length },
      ];

      return { total, completed, inProgress, late, dueSoon, pieData };
  }, [tasks]);

  // --- FILTER LOGIC ---
  const filteredTasks = useMemo(() => {
      return tasks.filter(t => {
          const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
          
          // Improved Type Logic: Explicit > Implicit
          let currentType = t.taskType;
          if (!currentType) {
              // Fallback logic for legacy data
              currentType = t.projectId ? TaskType.PROJECT : TaskType.ADHOC;
          }
          const matchType = filterType === 'ALL' || currentType === filterType;
          
          const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
          const matchAssignee = filterAssignee === 'ALL' || t.assigneeId === filterAssignee;
          
          return matchSearch && matchType && matchStatus && matchAssignee;
      }).sort((a,b) => {
          const dateA = new Date(a.deadline).getTime() || 0;
          const dateB = new Date(b.deadline).getTime() || 0;
          return dateA - dateB;
      });
  }, [tasks, searchTerm, filterType, filterStatus, filterAssignee]);

  // --- HANDLERS ---
  const handleOpenModal = (task?: Task) => {
      if (task) {
          setFormData({ 
              ...task, 
              // Ensure we don't have nulls for controlled inputs
              description: task.description || '',
              outputStandard: task.outputStandard || '',
              projectId: task.projectId || '',
              collaboratorIds: task.collaboratorIds || [] 
          });
      } else {
          setFormData({ ...initialFormState, assignerId: currentUser.id });
      }
      setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      // Clean up data before saving
      // CRITICAL FIX: Ensure projectId is NULL if it's an ADHOC task or empty string.
      // This prevents UUID syntax error in Supabase if an empty string is passed.
      let projectIdValue = null;
      if (formData.taskType === TaskType.PROJECT && formData.projectId && formData.projectId.trim() !== '') {
          projectIdValue = formData.projectId;
      }

      const finalTask = {
          ...formData,
          projectId: projectIdValue,
          // Ensure collaborators is an array
          collaboratorIds: Array.isArray(formData.collaboratorIds) ? formData.collaboratorIds : [],
          // Ensure description/output are strings
          description: formData.description || '',
          outputStandard: formData.outputStandard || ''
      } as Task;

      // Do NOT generate mock ID here. Let Database/API handle it.
      if (finalTask.id) {
          onUpdateTask(finalTask);
      } else {
          onAddTask(finalTask);
      }
      setIsModalOpen(false);
  };

  const toggleCollaborator = (userId: string) => {
      const currentIds = formData.collaboratorIds || [];
      if (currentIds.includes(userId)) {
          setFormData({ ...formData, collaboratorIds: currentIds.filter(id => id !== userId) });
      } else {
          setFormData({ ...formData, collaboratorIds: [...currentIds, userId] });
      }
  };

  const getUserName = (id: string) => users.find(u => u.id === id)?.fullName || 'Unknown';
  const getProjectName = (id?: string) => projects.find(p => p.id === id)?.name || '';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Quản lý Nhiệm vụ</h1>
                <p className="text-slate-500">Theo dõi tiến độ công việc dự án và giao việc</p>
            </div>
            <button 
                onClick={() => handleOpenModal()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-sm font-medium"
            >
                <Plus className="w-5 h-5" /> Thêm Nhiệm vụ
            </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs text-slate-500 font-bold uppercase">Tổng nhiệm vụ</p>
                    <h3 className="text-2xl font-bold text-slate-800">{stats.total}</h3>
                </div>
                <div className="p-3 bg-slate-100 rounded-lg text-slate-600"><Briefcase className="w-6 h-6" /></div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs text-slate-500 font-bold uppercase">Sắp đến hạn (2 ngày)</p>
                    <h3 className="text-2xl font-bold text-orange-600">{stats.dueSoon}</h3>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg text-orange-600"><Clock className="w-6 h-6" /></div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs text-slate-500 font-bold uppercase">Quá hạn</p>
                    <h3 className="text-2xl font-bold text-red-600">{stats.late}</h3>
                </div>
                <div className="p-3 bg-red-100 rounded-lg text-red-600"><AlertTriangle className="w-6 h-6" /></div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                 <div className="h-16 w-16">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={stats.pieData} innerRadius={15} outerRadius={30} paddingAngle={2} dataKey="value">
                                {stats.pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                 </div>
                 <div>
                     <p className="text-xs text-slate-500 font-bold uppercase">Tiến độ</p>
                     <p className="text-xs text-emerald-600 font-bold">{stats.total > 0 ? ((stats.completed/stats.total)*100).toFixed(0) : 0}% hoàn thành</p>
                 </div>
            </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Tìm kiếm nhiệm vụ..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                <select 
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white min-w-[120px]"
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                >
                    <option value="ALL">Tất cả loại</option>
                    <option value={TaskType.PROJECT}>Dự án</option>
                    <option value={TaskType.ADHOC}>Giao việc</option>
                </select>
                <select 
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white min-w-[140px]"
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                >
                    <option value="ALL">Tất cả trạng thái</option>
                    {Object.entries(statusLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
                <select 
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white min-w-[150px]"
                    value={filterAssignee}
                    onChange={e => setFilterAssignee(e.target.value)}
                >
                    <option value="ALL">Tất cả nhân sự</option>
                    {users.map(u => (
                        <option key={u.id} value={u.id}>{u.fullName}</option>
                    ))}
                </select>
            </div>
        </div>

        {/* Task List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                            <th className="px-6 py-3 min-w-[250px]">Tên nhiệm vụ</th>
                            <th className="px-6 py-3">Loại / Dự án</th>
                            <th className="px-6 py-3">Người thực hiện</th>
                            <th className="px-6 py-3 text-center">Hạn chót</th>
                            <th className="px-6 py-3 text-center">Trạng thái</th>
                            <th className="px-6 py-3 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredTasks.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Không tìm thấy nhiệm vụ nào</td></tr>
                        ) : filteredTasks.map(task => {
                            const isLate = new Date(task.deadline) < new Date() && task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.CANCELLED;
                            
                            // Safe Type Display
                            const displayType = task.taskType || (task.projectId ? TaskType.PROJECT : TaskType.ADHOC);

                            return (
                                <tr key={task.id} className="hover:bg-slate-50 group">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-800">{task.name}</div>
                                        <div className="text-xs text-slate-500 mt-1 line-clamp-1">{task.description}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {displayType === TaskType.PROJECT ? (
                                            <div className="flex flex-col">
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded w-fit mb-1">
                                                    <Briefcase className="w-3 h-3" /> DỰ ÁN
                                                </span>
                                                <span className="text-xs text-slate-600 truncate max-w-[150px]" title={getProjectName(task.projectId)}>
                                                    {getProjectName(task.projectId)}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                                <FileText className="w-3 h-3" /> GIAO VIỆC
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-700">{getUserName(task.assigneeId)}</div>
                                        <div className="text-[10px] text-slate-400">Giao bởi: {getUserName(task.assignerId).split(' ').pop()}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${isLate ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                            <Calendar className="w-3 h-3" />
                                            {new Date(task.deadline).toLocaleDateString('vi-VN')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[task.status] || 'bg-slate-100 text-slate-700'}`}>
                                            {statusLabels[task.status] || task.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenModal(task)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded shadow-sm">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => { if(window.confirm('Xóa nhiệm vụ?')) onDeleteTask(task.id) }} className="p-1.5 text-slate-400 hover:text-red-600 bg-white border border-slate-200 rounded shadow-sm">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Task Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                    <h2 className="text-xl font-bold mb-4 text-slate-800">{formData.id ? 'Sửa Nhiệm vụ' : 'Thêm Nhiệm vụ Mới'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên nhiệm vụ <span className="text-red-500">*</span></label>
                                <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="VD: Khảo sát hiện trạng..." />
                            </div>
                            
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Loại hình</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="taskType" 
                                            checked={formData.taskType === TaskType.ADHOC} 
                                            onChange={() => setFormData({...formData, taskType: TaskType.ADHOC, projectId: ''})}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-slate-700">Giao việc / Sự vụ</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="taskType" 
                                            checked={formData.taskType === TaskType.PROJECT} 
                                            onChange={() => setFormData({...formData, taskType: TaskType.PROJECT})}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-slate-700">Thuộc Dự án</span>
                                    </label>
                                </div>
                            </div>

                            {formData.taskType === TaskType.PROJECT && (
                                <div className="col-span-2 animate-in fade-in">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Chọn Dự án <span className="text-red-500">*</span></label>
                                    <select 
                                        required 
                                        className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        value={formData.projectId || ''} 
                                        onChange={e => setFormData({...formData, projectId: e.target.value})}
                                    >
                                        <option value="">-- Chọn dự án --</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="col-span-2">
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung / Mô tả</label>
                                 <textarea className="w-full p-2 border rounded-lg h-24 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Mô tả chi tiết công việc..." />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Người giao việc</label>
                                <select className="w-full p-2 border rounded-lg bg-white" value={formData.assignerId} onChange={e => setFormData({...formData, assignerId: e.target.value})}>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.fullName}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Người chủ trì <span className="text-red-500">*</span></label>
                                <select required className="w-full p-2 border rounded-lg bg-white" value={formData.assigneeId} onChange={e => setFormData({...formData, assigneeId: e.target.value})}>
                                    <option value="">-- Chọn nhân sự --</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.fullName}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tiến độ</label>
                                <select className="w-full p-2 border rounded-lg bg-white" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as TaskStatus})}>
                                    {Object.entries(statusLabels).map(([key, val]) => (
                                        <option key={key} value={key}>{val}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Hạn hoàn thành</label>
                                <input type="date" className="w-full p-2 border rounded-lg bg-white" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
                            </div>
                        </div>
                        
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-2">Người phối hợp</label>
                             <div className="border border-slate-200 rounded-lg p-3 max-h-32 overflow-y-auto bg-slate-50 grid grid-cols-2 gap-2">
                                 {users.map(u => (
                                     <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-1 rounded">
                                         <input 
                                            type="checkbox" 
                                            checked={(formData.collaboratorIds || []).includes(u.id)}
                                            onChange={() => toggleCollaborator(u.id)}
                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                         />
                                         <span>{u.fullName}</span>
                                     </label>
                                 ))}
                             </div>
                        </div>

                         <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
                            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium">
                                <CheckSquare className="w-4 h-4" /> Lưu nhiệm vụ
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default TaskManagement;
