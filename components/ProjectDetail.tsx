import React, { useState, useMemo } from 'react';
import { Project, Contract, Category, ContractType, CategoryType, ProjectType, ProductType, User, Partner, ProjectStatusItem, UserRole, Task, TaskStatus } from '../types';
import { ArrowLeft, Plus, DollarSign, Calendar, Briefcase, Filter, User as UserIcon, Building2, Edit, Trash2, Tag, Box, Save, TrendingUp, CheckCircle2, ListTodo } from 'lucide-react';
import CurrencyInput from './CurrencyInput';

interface ProjectDetailProps {
  project: Project;
  contracts: Contract[];
  categories: Category[];
  user: User;
  partners: Partner[];
  users: User[];
  statuses: ProjectStatusItem[];
  tasks: Task[]; // New Prop
  onBack: () => void;
  onAddContract: (c: Contract) => void;
  onUpdateContract: (c: Contract) => void;
  onDeleteContract: (id: string) => void;
  onUpdateContractStatus: (id: string, status: Contract['status']) => void;
  onUpdateProject: (p: Project) => void;
  onDeleteProject: (id: string) => void;
  onAddTask: (t: Task) => void; // New Prop
  onUpdateTask: (t: Task) => void; // New Prop
  onDeleteTask: (id: string) => void; // New Prop
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ 
  project, contracts, categories, user, partners, users, statuses, tasks,
  onBack, onAddContract, onUpdateContract, onDeleteContract, onUpdateContractStatus,
  onUpdateProject, onDeleteProject, onAddTask, onUpdateTask, onDeleteTask
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'INPUT' | 'OUTPUT' | 'TASKS'>('OVERVIEW');
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  
  const status = statuses.find(s => s.id === project.statusId);
  const am = users.find(u => u.id === project.amId);
  const pm = users.find(u => u.id === project.pmId);
  const partner = partners.find(p => p.id === project.partnerId);

  // Labels
  const projectTypeLabels: Record<string, string> = {
    [ProjectType.OUTRIGHT_SALE]: 'Bán đứt',
    [ProjectType.SERVICE_LEASE]: 'Thuê dịch vụ',
  };
  const productTypeLabels: Record<string, string> = {
    [ProductType.HARDWARE]: 'Phần cứng',
    [ProductType.INTERNAL_SOFTWARE]: 'Phần mềm nội bộ',
    [ProductType.HYBRID]: 'Hỗn hợp',
  };

  // --- CONTRACT FORM STATE ---
  const initialContractState: Partial<Contract> = {
    code: '',
    name: '',
    value: 0,
    partnerName: '',
    partyA: 'Viettel Hà Nội',
    partyB: '',
    signedDate: new Date().toISOString().split('T')[0],
    effectiveDate: new Date().toISOString().split('T')[0],
    guaranteeValue: 0,
    status: 'PENDING'
  };
  const [contractForm, setContractForm] = useState<Partial<Contract>>(initialContractState);

  // --- PROJECT EDIT FORM STATE ---
  const [projectForm, setProjectForm] = useState<Partial<Project>>({});

  // --- TASK FORM STATE ---
  const initialTaskState: Partial<Task> = {
    name: '',
    status: TaskStatus.NEW,
    deadline: new Date().toISOString().split('T')[0],
    assigneeId: user.id
  };
  const [taskForm, setTaskForm] = useState<Partial<Task>>(initialTaskState);

  const projectContracts = contracts.filter(c => c.projectId === project.id);
  const projectTasks = tasks.filter(t => t.projectId === project.id);
  
  const stats = useMemo(() => {
    // 1. Doanh số (Sales): Tổng HĐ đầu ra (trừ Hủy)
    const sales = projectContracts
      .filter(c => c.type === ContractType.OUTPUT && c.status !== 'CANCELLED')
      .reduce((acc, c) => acc + c.value, 0);

    // 2. Doanh thu (Revenue): Tổng HĐ đầu ra (Chỉ trạng thái Hoàn thành/Nghiệm thu)
    const actualRevenue = projectContracts
      .filter(c => c.type === ContractType.OUTPUT && c.status === 'COMPLETED')
      .reduce((acc, c) => acc + c.value, 0);

    // 3. Chi phí (Cost): Tổng HĐ đầu vào (trừ Hủy)
    const actualCost = projectContracts
      .filter(c => c.type === ContractType.INPUT && c.status !== 'CANCELLED')
      .reduce((acc, c) => acc + c.value, 0);
    
    return { sales, actualRevenue, actualCost, profit: actualRevenue - actualCost };
  }, [projectContracts]);

  // --- HANDLERS ---

  const handleOpenContractModal = (contract?: Contract) => {
    if (contract) {
        setContractForm({ ...contract });
    } else {
        setContractForm({ 
            ...initialContractState, 
            projectId: project.id,
        });
    }
    setIsContractModalOpen(true);
  };

  const handleSaveContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractForm.categoryId) return;
    
    const category = categories.find(c => c.id === contractForm.categoryId);
    const type = category?.type === CategoryType.REVENUE ? ContractType.OUTPUT : ContractType.INPUT;

    const finalContract = {
        ...contractForm,
        type,
        projectId: project.id,
        partnerName: contractForm.partyB || contractForm.partnerName || 'Unknown',
    } as Contract;

    if (finalContract.id) {
        onUpdateContract(finalContract);
    } else {
        onAddContract({
            ...finalContract,
            id: `ctr_${Date.now()}`,
        });
    }
    setIsContractModalOpen(false);
  };

  const handleDeleteContractItem = (id: string) => {
    if(window.confirm('Bạn có chắc chắn muốn xóa hợp đồng/hạng mục này?')) {
        onDeleteContract(id);
    }
  };

  const handleOpenProjectModal = () => {
    setProjectForm({ ...project });
    setIsProjectModalOpen(true);
  };

  const handleUpdateProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProject(projectForm as Project);
    setIsProjectModalOpen(false);
  };

  const handleDeleteProjectItem = () => {
    if(window.confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa toàn bộ dự án này không? Dữ liệu doanh thu/chi phí liên quan có thể bị ảnh hưởng.')) {
        onDeleteProject(project.id);
    }
  };

  const handleOpenTaskModal = (task?: Task) => {
      if(task) {
          setTaskForm({...task});
      } else {
          setTaskForm({
              ...initialTaskState,
              projectId: project.id
          });
      }
      setIsTaskModalOpen(true);
  }

  const handleSaveTask = (e: React.FormEvent) => {
      e.preventDefault();
      if(taskForm.id) {
          onUpdateTask(taskForm as Task);
      } else {
          onAddTask({
              ...taskForm,
              id: `task_${Date.now()}`
          } as Task);
      }
      setIsTaskModalOpen(false);
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);

  // --- SUB COMPONENTS ---

  const ContractTable = ({ type }: { type: ContractType }) => {
    const data = projectContracts.filter(c => c.type === type);
    const title = type === ContractType.OUTPUT ? 'Danh sách Doanh thu' : 'Danh sách Chi phí';

    return (
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-medium text-slate-700 flex justify-between items-center">
            <span>{title}</span>
            <span className="text-xs bg-white border border-slate-200 px-2 py-1 rounded shadow-sm">
                Tổng: <span className="font-bold text-slate-900">{formatCurrency(data.reduce((a,b) => a + b.value, 0))}</span>
            </span>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Mã HĐ/Mục</th>
              <th className="px-4 py-3">Tên nội dung</th>
              <th className="px-4 py-3">Đối tác (Bên B)</th>
              <th className="px-4 py-3">Danh mục</th>
              <th className="px-4 py-3 text-right">Giá trị</th>
              <th className="px-4 py-3">Ngày ký</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Chưa có dữ liệu</td></tr>
            ) : (
              data.map(contract => {
                const category = categories.find(c => c.id === contract.categoryId);
                return (
                  <tr key={contract.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{contract.code}</td>
                    <td className="px-4 py-3 max-w-xs truncate" title={contract.name}>{contract.name}</td>
                    <td className="px-4 py-3">{contract.partyB || contract.partnerName}</td>
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
                         <option value="PENDING">Mới</option>
                         <option value="SIGNED">Đã ký</option>
                         <option value="COMPLETED">Hoàn thành</option>
                         <option value="CANCELLED">Hủy</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                            <button onClick={() => handleOpenContractModal(contract)} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Sửa">
                                <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteContractItem(contract.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Xóa">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
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
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-1 flex-wrap">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-mono">{project.code}</span>
                        {status && (
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${status.color}`}>{status.name}</span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            <Tag className="w-3 h-3" /> {projectTypeLabels[project.projectType]}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                            <Box className="w-3 h-3" /> {productTypeLabels[project.productType]}
                        </span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                 <button 
                    onClick={handleOpenProjectModal}
                    className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                    <Edit className="w-4 h-4" />
                    Sửa đổi
                </button>
                {user.role === UserRole.ADMIN && (
                    <button 
                        onClick={handleDeleteProjectItem}
                        className="px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                        <Trash2 className="w-4 h-4" />
                        Xóa dự án
                    </button>
                )}
                <div className="h-6 w-px bg-slate-300 mx-1"></div>
                {activeTab === 'TASKS' ? (
                   <button 
                      onClick={() => handleOpenTaskModal()}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                   >
                      <Plus className="w-4 h-4" />
                      Thêm Công việc
                   </button>
                ) : (
                  <button 
                      onClick={() => handleOpenContractModal()}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                  >
                      <Plus className="w-4 h-4" />
                      Thêm Doanh thu / Chi phí
                  </button>
                )}
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
                <span className="font-medium flex items-center gap-1"><UserIcon className="w-3 h-3"/> {am?.fullName || '---'}</span>
            </div>
            <div>
                <span className="text-slate-500 block mb-1">Project Manager</span>
                <span className="font-medium flex items-center gap-1"><UserIcon className="w-3 h-3"/> {pm?.fullName || '---'}</span>
            </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4">
          {[
            { id: 'OVERVIEW', label: 'Tổng quan Tài chính', icon: DollarSign },
            { id: 'OUTPUT', label: 'Doanh thu (Đầu ra)', icon: Briefcase },
            { id: 'INPUT', label: 'Chi phí (Đầu vào)', icon: Filter },
            { id: 'TASKS', label: 'Việc cần làm', icon: ListTodo },
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
          <div className="space-y-6">
             {/* Summary Cards */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 {/* Card 1: Doanh số (Sales) */}
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Briefcase className="w-4 h-4" />
                        <p className="text-sm font-medium">Doanh số (Ký HĐ)</p>
                    </div>
                    <p className="text-2xl font-bold text-indigo-600 mt-2">{formatCurrency(stats.sales)}</p>
                    <div className="mt-2 text-xs flex justify-between text-slate-400">
                        <span>Kế hoạch:</span>
                        <span>{formatCurrency(project.plannedRevenue)}</span>
                    </div>
                     <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                        <div 
                            className="bg-indigo-500 h-1.5 rounded-full" 
                            style={{ width: `${Math.min((stats.sales / (project.plannedRevenue || 1)) * 100, 100)}%` }}
                        ></div>
                    </div>
                 </div>

                 {/* Card 2: Doanh thu (Revenue) */}
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <p className="text-sm font-medium">Doanh thu (Nghiệm thu)</p>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(stats.actualRevenue)}</p>
                    <div className="mt-2 text-xs flex justify-between text-slate-400">
                        <span>Tỷ lệ hoàn thành:</span>
                        <span>{stats.sales > 0 ? ((stats.actualRevenue / stats.sales) * 100).toFixed(0) : 0}%</span>
                    </div>
                 </div>
                 
                 {/* Card 3: Chi phí (Cost) */}
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <p className="text-sm font-medium">Tổng Chi phí</p>
                    </div>
                    <p className="text-2xl font-bold text-rose-600 mt-2">{formatCurrency(stats.actualCost)}</p>
                    <div className="mt-2 text-xs flex justify-between text-slate-400">
                        <span>Kế hoạch:</span>
                        <span>{formatCurrency(project.plannedCost)}</span>
                    </div>
                     <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                        <div 
                            className="bg-rose-500 h-1.5 rounded-full" 
                            style={{ width: `${Math.min((stats.actualCost / (project.plannedCost || 1)) * 100, 100)}%` }}
                        ></div>
                    </div>
                 </div>

                 {/* Card 4: Lợi nhuận (Profit) */}
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <DollarSign className="w-4 h-4" />
                        <p className="text-sm font-medium">Lợi nhuận (Tạm tính)</p>
                    </div>
                    <p className={`text-2xl font-bold mt-2 ${stats.profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {formatCurrency(stats.profit)}
                    </p>
                    <div className="mt-2 text-xs text-slate-400">
                        LN = Doanh thu (NT) - Chi phí
                    </div>
                 </div>
             </div>
             
             {/* Detail Description */}
             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-2">Mô tả dự án</h3>
                <p className="text-slate-600 text-sm whitespace-pre-wrap">{project.description}</p>
             </div>
          </div>
        )}
        
        {activeTab === 'INPUT' && <ContractTable type={ContractType.INPUT} />}
        {activeTab === 'OUTPUT' && <ContractTable type={ContractType.OUTPUT} />}
        
        {activeTab === 'TASKS' && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-medium text-slate-700 flex justify-between items-center">
                    <span>Danh sách công việc</span>
                    <span className="text-xs text-slate-500">
                        Đang làm: {projectTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length} / Tổng: {projectTasks.length}
                    </span>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3">Công việc</th>
                            <th className="px-4 py-3">Người thực hiện</th>
                            <th className="px-4 py-3">Deadline</th>
                            <th className="px-4 py-3">Trạng thái</th>
                            <th className="px-4 py-3 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                         {projectTasks.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Chưa có công việc nào</td></tr>
                         ) : (
                             projectTasks.map(task => {
                                 const assignee = users.find(u => u.id === task.assigneeId);
                                 const isLate = new Date(task.deadline) < new Date() && task.status !== TaskStatus.COMPLETED;
                                 
                                 return (
                                     <tr key={task.id} className="hover:bg-slate-50">
                                         <td className="px-4 py-3 font-medium text-slate-800">{task.name}</td>
                                         <td className="px-4 py-3 flex items-center gap-2">
                                             <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs text-slate-600">
                                                 {assignee?.fullName.charAt(0)}
                                             </div>
                                             {assignee?.fullName}
                                         </td>
                                         <td className={`px-4 py-3 ${isLate ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                                             {new Date(task.deadline).toLocaleDateString('vi-VN')}
                                             {isLate && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1 py-0.5 rounded">Trễ</span>}
                                         </td>
                                         <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${
                                                task.status === TaskStatus.NEW ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                task.status === TaskStatus.COMPLETED ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                'bg-red-50 text-red-600 border-red-200'
                                            }`}>
                                                {task.status === TaskStatus.NEW && 'Mới tạo'}
                                                {task.status === TaskStatus.IN_PROGRESS && 'Đang làm'}
                                                {task.status === TaskStatus.COMPLETED && 'Hoàn thành'}
                                                {task.status === TaskStatus.LATE && 'Đã trễ'}
                                            </span>
                                         </td>
                                         <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleOpenTaskModal(task)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => { if(window.confirm('Xóa công việc này?')) onDeleteTask(task.id) }} className="text-slate-400 hover:text-red-600 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                         </td>
                                     </tr>
                                 )
                             })
                         )}
                    </tbody>
                </table>
            </div>
        )}
      </div>

      {/* Modal Add/Edit Contract */}
      {isContractModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-slate-800">{contractForm.id ? 'Sửa Hạng mục' : 'Thêm Hạng mục Doanh thu / Chi phí'}</h2>
            <form onSubmit={handleSaveContract} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Số hiệu Hợp đồng / Mã</label>
                  <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={contractForm.code} onChange={e => setContractForm({...contractForm, code: e.target.value.toUpperCase()})} />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tên nội dung</label>
                  <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={contractForm.name} onChange={e => setContractForm({...contractForm, name: e.target.value})} />
                </div>
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Loại danh mục (Xác định là Doanh thu hay Chi phí)</label>
                 <select 
                    required 
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" 
                    value={contractForm.categoryId || ''} 
                    onChange={e => setContractForm({...contractForm, categoryId: e.target.value})}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Giá trị (VND)</label>
                   <CurrencyInput 
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none font-bold text-indigo-700" 
                        value={contractForm.value || 0} 
                        onChange={val => setContractForm({...contractForm, value: val})} 
                    />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Giá trị Bảo lãnh (Nếu có)</label>
                   <CurrencyInput 
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" 
                        value={contractForm.guaranteeValue || 0} 
                        onChange={val => setContractForm({...contractForm, guaranteeValue: val})} 
                    />
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bên A (Chủ đầu tư/Viettel)</label>
                  <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={contractForm.partyA} onChange={e => setContractForm({...contractForm, partyA: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bên B (Đối tác/Khách hàng)</label>
                  <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={contractForm.partyB} onChange={e => setContractForm({...contractForm, partyB: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ngày ký</label>
                  <input required type="date" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={contractForm.signedDate} onChange={e => setContractForm({...contractForm, signedDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ngày hiệu lực</label>
                  <input required type="date" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={contractForm.effectiveDate} onChange={e => setContractForm({...contractForm, effectiveDate: e.target.value})} />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsContractModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    {contractForm.id ? 'Cập nhật' : 'Lưu bản ghi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Project */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 animate-in fade-in zoom-in duration-200 max-h-[95vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-slate-800">Sửa đổi thông tin Dự án</h2>
            <form onSubmit={handleUpdateProjectSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mã dự án</label>
                  <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={projectForm.code} onChange={e => setProjectForm({...projectForm, code: e.target.value.toUpperCase()})} />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label>
                   <select className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={projectForm.statusId} onChange={e => setProjectForm({...projectForm, statusId: e.target.value})}>
                      {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên dự án</label>
                <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={projectForm.name} onChange={e => setProjectForm({...projectForm, name: e.target.value})} />
              </div>

               <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Loại hình dự án</label>
                   <select className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={projectForm.projectType} onChange={e => setProjectForm({...projectForm, projectType: e.target.value as ProjectType})}>
                      <option value={ProjectType.OUTRIGHT_SALE}>Bán đứt</option>
                      <option value={ProjectType.SERVICE_LEASE}>Thuê dịch vụ</option>
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Sản phẩm</label>
                   <select className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={projectForm.productType} onChange={e => setProjectForm({...projectForm, productType: e.target.value as ProductType})}>
                      <option value={ProductType.HARDWARE}>Phần cứng</option>
                      <option value={ProductType.INTERNAL_SOFTWARE}>Phần mềm nội bộ</option>
                      <option value={ProductType.HYBRID}>Hỗn hợp</option>
                   </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả chi tiết</label>
                <textarea className="w-full p-2 border rounded-lg h-20 focus:ring-2 focus:ring-[#EE0033] outline-none" value={projectForm.description} onChange={e => setProjectForm({...projectForm, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày bắt đầu</label>
                    <input type="date" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={projectForm.startDate} onChange={e => setProjectForm({...projectForm, startDate: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày kết thúc</label>
                    <input type="date" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={projectForm.endDate} onChange={e => setProjectForm({...projectForm, endDate: e.target.value})} />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Doanh thu dự kiến (PAKD)</label>
                    <CurrencyInput 
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none font-bold text-emerald-600"
                        value={projectForm.plannedRevenue || 0}
                        onChange={(val) => setProjectForm({...projectForm, plannedRevenue: val})}
                        placeholder="0"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Chi phí dự kiến (PAKD)</label>
                    <CurrencyInput 
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none font-bold text-rose-600"
                        value={projectForm.plannedCost || 0}
                        onChange={(val) => setProjectForm({...projectForm, plannedCost: val})}
                        placeholder="0"
                    />
                 </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Đối tác / Khách hàng</label>
                    <select className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={projectForm.partnerId || ''} onChange={e => setProjectForm({...projectForm, partnerId: e.target.value})}>
                        <option value="">-- Chọn đối tác --</option>
                        {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">AM (Phụ trách KD)</label>
                    <select className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={projectForm.amId || ''} onChange={e => setProjectForm({...projectForm, amId: e.target.value})}>
                        <option value="">-- Chọn AM --</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">PM (Quản trị dự án)</label>
                    <select className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={projectForm.pmId || ''} onChange={e => setProjectForm({...projectForm, pmId: e.target.value})}>
                         <option value="">-- Chọn PM --</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                 </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsProjectModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-[#EE0033] text-white rounded-lg hover:bg-red-700 font-medium shadow-sm">
                   <Save className="w-4 h-4 inline-block mr-2" />
                   Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal Add/Edit Task */}
      {isTaskModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-lg w-full p-6">
                  <h2 className="text-xl font-bold mb-4 text-slate-800">{taskForm.id ? 'Sửa Công việc' : 'Thêm Công việc mới'}</h2>
                  <form onSubmit={handleSaveTask} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Tên công việc</label>
                          <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={taskForm.name} onChange={e => setTaskForm({...taskForm, name: e.target.value})} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Người thực hiện</label>
                              <select required className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={taskForm.assigneeId} onChange={e => setTaskForm({...taskForm, assigneeId: e.target.value})}>
                                  {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label>
                              <select className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={taskForm.status} onChange={e => setTaskForm({...taskForm, status: e.target.value as TaskStatus})}>
                                  <option value={TaskStatus.NEW}>Mới tạo</option>
                                  <option value={TaskStatus.IN_PROGRESS}>Đang thực hiện</option>
                                  <option value={TaskStatus.COMPLETED}>Hoàn thành</option>
                                  <option value={TaskStatus.LATE}>Trễ hạn</option>
                              </select>
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
                          <input required type="date" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={taskForm.deadline} onChange={e => setTaskForm({...taskForm, deadline: e.target.value})} />
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả (Tùy chọn)</label>
                          <textarea className="w-full p-2 border rounded-lg h-20 focus:ring-2 focus:ring-[#EE0033] outline-none" value={taskForm.description || ''} onChange={e => setTaskForm({...taskForm, description: e.target.value})} />
                      </div>

                      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Hủy</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm">
                            Lưu công việc
                        </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default ProjectDetail;