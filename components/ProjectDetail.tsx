
import React, { useState, useMemo, useEffect } from 'react';
import { Project, Contract, Category, ContractType, CategoryType, ProjectType, ProductType, User, Partner, ProjectStatusItem, UserRole, Task, TaskStatus, ContractInstallment, InstallmentStatus, TaskType, CustomerObligation, ObligationStatus, FundingSource, FundingSourceStatus, PartnerType } from '../types';
import { ArrowLeft, Plus, Calendar, User as UserIcon, Building2, Edit, Trash2, Tag, Box, ListTodo, PlusCircle, MinusCircle, Clock, CheckSquare, Users, Target, AlertCircle, Shield, Coins, Landmark, RefreshCcw } from 'lucide-react';
import CurrencyInput from './CurrencyInput';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ProjectDetailProps {
  project: Project;
  contracts: Contract[];
  categories: Category[];
  user: User;
  partners: Partner[];
  users: User[];
  statuses: ProjectStatusItem[];
  tasks: Task[];
  onBack: () => void;
  onAddContract: (c: Contract) => void;
  onUpdateContract: (c: Contract) => void;
  onDeleteContract: (id: string) => void;
  onUpdateContractStatus: (id: string, status: Contract['status']) => void;
  onUpdateProject: (p: Project) => void;
  onDeleteProject: (id: string) => void;
  onAddTask: (t: Task) => void;
  onUpdateTask: (t: Task) => void;
  onDeleteTask: (id: string) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#FF6B6B'];

const ProjectDetail: React.FC<ProjectDetailProps> = ({ 
  project, contracts, categories, user, partners, users, statuses, tasks,
  onBack, onAddContract, onUpdateContract, onDeleteContract, onUpdateContractStatus,
  onUpdateProject, onDeleteProject, onAddTask, onUpdateTask, onDeleteTask
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'INPUT' | 'OUTPUT' | 'TASKS' | 'OBLIGATION'>('OVERVIEW');
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  
  const status = statuses.find(s => s.id === project.statusId);
  const partner = partners.find(p => p.id === project.partnerId);
  const isAdmin = user.role === UserRole.ADMIN;

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

  const taskStatusLabels: Record<string, { label: string, color: string }> = {
    [TaskStatus.NOT_STARTED]: { label: 'Chưa bắt đầu', color: 'bg-slate-100 text-slate-700' },
    [TaskStatus.IN_PROGRESS]: { label: 'Đang thực hiện', color: 'bg-blue-100 text-blue-700' },
    [TaskStatus.COMPLETED]: { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-700' },
    [TaskStatus.EXTENSION_REQUESTED]: { label: 'Đề xuất gia hạn', color: 'bg-orange-100 text-orange-700' },
    [TaskStatus.CANCELLED]: { label: 'Đã hủy', color: 'bg-red-100 text-red-700' },
  };

  const obligationStatusLabels: Record<string, { label: string, color: string }> = {
      [ObligationStatus.NO_SOURCE]: { label: 'Chưa có nguồn', color: 'bg-slate-100 text-slate-600' },
      [ObligationStatus.SOURCE_RECEIVED]: { label: 'Nguồn đã về', color: 'bg-blue-100 text-blue-700' },
      [ObligationStatus.PAID]: { label: 'Đã chi', color: 'bg-emerald-100 text-emerald-700' },
      [ObligationStatus.NOT_PAID]: { label: 'Không chi', color: 'bg-red-100 text-red-700' },
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
    status: 'PENDING',
    installments: []
  };
  const [contractForm, setContractForm] = useState<Partial<Contract>>(initialContractState);
  
  // Local state for adding a new installment inside the modal
  const [newInstallment, setNewInstallment] = useState<Partial<ContractInstallment>>({
      name: '',
      value: 0,
      status: InstallmentStatus.PLANNING,
      date: new Date().toISOString().split('T')[0],
      revenueMonth: new Date().toISOString().slice(0, 7) // Default to current month YYYY-MM
  });

  // --- PROJECT EDIT FORM STATE ---
  const [projectForm, setProjectForm] = useState<Partial<Project>>({});

  // --- TASK FORM STATE ---
  const initialTaskState: Partial<Task> = {
    name: '',
    description: '',
    outputStandard: '',
    status: TaskStatus.NOT_STARTED,
    deadline: new Date().toISOString().split('T')[0],
    assignerId: user.id, // Defaults to current user
    assigneeId: '',
    collaboratorIds: [],
    taskType: TaskType.PROJECT // Default to Project type in this view
  };
  const [taskForm, setTaskForm] = useState<Partial<Task>>(initialTaskState);

  // --- CUSTOMER OBLIGATION STATE (Local) ---
  const defaultObligation: CustomerObligation = {
      percentage: 0,
      value: 0,
      status: ObligationStatus.NO_SOURCE,
      deadline: '',
      sources: []
  };
  const [obligationForm, setObligationForm] = useState<CustomerObligation>(defaultObligation);

  useEffect(() => {
      // Re-sync local state when project prop updates
      if (project.customerObligation) {
          setObligationForm({
              ...defaultObligation,
              ...project.customerObligation,
              sources: Array.isArray(project.customerObligation.sources) ? project.customerObligation.sources : []
          });
      } else {
          setObligationForm(defaultObligation);
      }
  }, [project]);

  const projectContracts = contracts.filter(c => c.projectId === project.id);
  
  // Filter only PROJECT tasks for this project
  const projectTasks = useMemo(() => {
      return tasks
        .filter(t => t.projectId === project.id) // Simply filter by project ID, assuming if it has project ID it belongs here
        .sort((a, b) => {
             const priority = { 
                 [TaskStatus.EXTENSION_REQUESTED]: 0, 
                 [TaskStatus.IN_PROGRESS]: 1, 
                 [TaskStatus.NOT_STARTED]: 2, 
                 [TaskStatus.CANCELLED]: 3,
                 [TaskStatus.COMPLETED]: 4 
             };
             if (priority[a.status] !== priority[b.status]) {
                 return priority[a.status] - priority[b.status];
             }
             return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        });
  }, [tasks, project.id]);
  
  const stats = useMemo(() => {
    // 1. Doanh số (Sales): Tổng HĐ đầu ra (trừ Hủy)
    const sales = projectContracts
      .filter(c => c.type === ContractType.OUTPUT && c.status !== 'CANCELLED')
      .reduce((acc, c) => acc + c.value, 0);

    // 2. Doanh thu (Revenue): Tổng HĐ đầu ra (Chỉ tính item đã xuất HĐ hoặc đã Thanh toán trong installments)
    const actualRevenue = projectContracts
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

    // 3. Chi phí (Cost): Tổng HĐ đầu vào (trừ Hủy)
    const actualCost = projectContracts
      .filter(c => c.type === ContractType.INPUT && c.status !== 'CANCELLED')
      .reduce((acc, c) => acc + c.value, 0);
    
    // Profit
    return { sales, actualRevenue, actualCost, profit: sales - actualCost };
  }, [projectContracts]);

  // Calculate Cost Structure for Chart
  const costStructureData = useMemo(() => {
      const data: Record<string, number> = {};
      projectContracts
          .filter(c => c.type === ContractType.INPUT && c.status !== 'CANCELLED')
          .forEach(c => {
              const cat = categories.find(cat => cat.id === c.categoryId);
              // Use category name
              const name = cat ? cat.name : 'Khác';
              data[name] = (data[name] || 0) + c.value;
          });
      
      return Object.entries(data)
          .map(([name, value]) => ({ name, value }))
          .filter(item => item.value > 0)
          .sort((a, b) => b.value - a.value);
  }, [projectContracts, categories]);

  // --- TIME PROGRESS CALCULATION ---
  const timeProgress = useMemo(() => {
      const start = new Date(project.startDate).getTime();
      const end = new Date(project.endDate).getTime();
      const now = new Date().getTime();
      
      if (end <= start) return 100;
      
      const total = end - start;
      const elapsed = now - start;
      const percent = (elapsed / total) * 100;
      
      return Math.min(100, Math.max(0, percent));
  }, [project.startDate, project.endDate]);

  const daysRemaining = useMemo(() => {
      const end = new Date(project.endDate).getTime();
      const now = new Date().getTime();
      return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  }, [project.endDate]);

  // --- HANDLERS ---

  // Auto-calculate Contract Value when installments change
  useEffect(() => {
      if (contractForm.installments && contractForm.installments.length > 0) {
          const total = contractForm.installments.reduce((sum, item) => sum + item.value, 0);
          if (total !== contractForm.value) {
              setContractForm(prev => ({ ...prev, value: total }));
          }
      }
  }, [contractForm.installments]);

  const handleOpenContractModal = (contract?: Contract) => {
    setNewInstallment({
        name: '',
        value: 0,
        status: InstallmentStatus.PLANNING,
        date: new Date().toISOString().split('T')[0],
        revenueMonth: new Date().toISOString().slice(0, 7)
    });

    if (contract) {
        setContractForm({ 
            ...contract,
            installments: contract.installments || []
        });
    } else {
        setContractForm({ 
            ...initialContractState, 
            projectId: project.id,
            installments: []
        });
    }
    setIsContractModalOpen(true);
  };

  const handleAddInstallment = () => {
      if (!newInstallment.name || !newInstallment.value) return;
      const item: ContractInstallment = {
          ...newInstallment as ContractInstallment,
          id: `ins_${Date.now()}`
      };
      setContractForm(prev => ({
          ...prev,
          installments: [...(prev.installments || []), item]
      }));
      setNewInstallment({
        name: '',
        value: 0,
        status: InstallmentStatus.PLANNING,
        date: new Date().toISOString().split('T')[0],
        revenueMonth: new Date().toISOString().slice(0, 7)
      });
  };

  const handleRemoveInstallment = (id: string) => {
      setContractForm(prev => ({
          ...prev,
          installments: prev.installments?.filter(i => i.id !== id) || []
      }));
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
        installments: contractForm.installments || []
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
          setTaskForm({
              ...task,
              collaboratorIds: task.collaboratorIds || []
          });
      } else {
          setTaskForm({
              ...initialTaskState,
              projectId: project.id,
              assignerId: user.id,
              taskType: TaskType.PROJECT // Enforce Project type
          });
      }
      setIsTaskModalOpen(true);
  }

  const handleSaveTask = (e: React.FormEvent) => {
      e.preventDefault();
      
      const finalTask = {
          ...taskForm,
          projectId: project.id, // Ensure correct project ID
          taskType: TaskType.PROJECT, // Ensure type is PROJECT
          collaboratorIds: taskForm.collaboratorIds || []
      } as Task;

      if(finalTask.id) {
          onUpdateTask(finalTask);
      } else {
          // Allow API to generate ID
          onAddTask(finalTask);
      }
      setIsTaskModalOpen(false);
  }

  const handleDeleteTaskItem = (id: string) => {
      if(window.confirm('Xóa công việc này?')) {
          onDeleteTask(id);
      }
  }

  const toggleCollaborator = (userId: string) => {
      const currentIds = taskForm.collaboratorIds || [];
      if (currentIds.includes(userId)) {
          setTaskForm({ ...taskForm, collaboratorIds: currentIds.filter(id => id !== userId) });
      } else {
          setTaskForm({ ...taskForm, collaboratorIds: [...currentIds, userId] });
      }
  }

  // --- OBLIGATION HANDLERS ---
  const handleAddFundingSource = () => {
      const newSource: FundingSource = {
          id: `fs_${Date.now()}`,
          name: '',
          value: 0,
          status: FundingSourceStatus.PENDING
      };
      setObligationForm(prev => ({
          ...prev,
          sources: [...(prev.sources || []), newSource]
      }));
  };

  const handleUpdateFundingSource = (id: string, field: keyof FundingSource, value: any) => {
      setObligationForm(prev => ({
          ...prev,
          sources: prev.sources.map(s => s.id === id ? { ...s, [field]: value } : s)
      }));
  };

  const handleDeleteFundingSource = (id: string) => {
      setObligationForm(prev => ({
          ...prev,
          sources: prev.sources.filter(s => s.id !== id)
      }));
  };

  const handlePercentageChange = (newPercentage: number) => {
      // Logic: Value = (Signed Sales * % / 100) / 1.1
      // Signed Sales comes from stats.sales
      const calculatedValue = (stats.sales * newPercentage / 100) / 1.1;
      setObligationForm(prev => ({
          ...prev,
          percentage: newPercentage,
          value: Math.round(calculatedValue) // Round to nearest integer
      }));
  };

  const handleSaveObligation = () => {
      // Ensure the object is clean
      const cleanObligation: CustomerObligation = {
          percentage: Number(obligationForm.percentage),
          value: Number(obligationForm.value),
          status: obligationForm.status,
          deadline: obligationForm.deadline || '',
          sources: Array.isArray(obligationForm.sources) ? obligationForm.sources : []
      };

      if (window.confirm('Bạn có chắc chắn muốn cập nhật thông tin Nghĩa vụ khách hàng?')) {
          const updatedProject: Project = {
              ...project,
              customerObligation: cleanObligation
          };
          onUpdateProject(updatedProject);
          alert('Đã gửi yêu cầu lưu dữ liệu.');
      }
  };

  const handleResetObligation = () => {
      if (window.confirm('CẢNH BÁO: Thao tác này sẽ xóa trắng dữ liệu Nghĩa vụ khách hàng hiện tại của dự án này. Bạn có chắc không?')) {
          // Reset Local State
          setObligationForm(defaultObligation);
          // Save to DB
          onUpdateProject({
              ...project,
              customerObligation: defaultObligation // Send empty default to clear DB JSON
          });
      }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);

  const getAssigneeName = (id: string) => users.find(u => u.id === id)?.fullName || 'Chưa gán';

  // --- SUB COMPONENTS ---

  const ContractTable = ({ type }: { type: ContractType }) => {
    const data = projectContracts.filter(c => c.type === type);
    const title = type === ContractType.OUTPUT ? 'Danh sách Doanh thu' : 'Danh sách Chi phí';

    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-medium text-slate-700 flex justify-between items-center">
            <span>{title}</span>
            <div className="flex items-center gap-3">
                 <span className="text-xs bg-white border border-slate-200 px-2 py-1 rounded shadow-sm">
                    Tổng: <span className="font-bold text-slate-900">{formatCurrency(data.reduce((a,b) => a + b.value, 0))}</span>
                </span>
                <button 
                  onClick={() => handleOpenContractModal()}
                  className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-100 font-medium flex items-center gap-1"
                >
                    <Plus className="w-3 h-3" /> Thêm
                </button>
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[1000px]">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                <th className="px-4 py-3 whitespace-nowrap">Mã HĐ/Mục</th>
                <th className="px-4 py-3 whitespace-nowrap">Tên nội dung</th>
                <th className="px-4 py-3 whitespace-nowrap">Đối tác (Bên B)</th>
                <th className="px-4 py-3 whitespace-nowrap">Tiến độ (nghiệm thu/thanh toán)</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Giá trị HĐ</th>
                <th className="px-4 py-3 whitespace-nowrap">Ngày ký</th>
                <th className="px-4 py-3 whitespace-nowrap">Trạng thái</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Thao tác</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {data.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Chưa có dữ liệu</td></tr>
                ) : (
                data.map(contract => {
                    const category = categories.find(c => c.id === contract.categoryId);
                    const paidAmount = (contract.installments || [])
                        .filter(i => i.status === InstallmentStatus.PAID || i.status === InstallmentStatus.INVOICED)
                        .reduce((acc, i) => acc + i.value, 0);
                    const percent = contract.value > 0 ? (paidAmount / contract.value) * 100 : 0;

                    return (
                    <tr key={contract.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{contract.code}</td>
                        <td className="px-4 py-3 min-w-[200px]">
                            <div className="font-medium text-slate-800">{contract.name}</div>
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                {category?.name || 'Unknown'}
                            </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 min-w-[150px]">
                            {contract.partyB || contract.partnerName}
                        </td>
                        <td className="px-4 py-3 min-w-[200px]">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${type === ContractType.OUTPUT ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{width: `${percent}%`}}></div>
                                </div>
                                <span className="text-xs font-medium text-slate-600">{percent.toFixed(0)}%</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                                Đã {type === ContractType.OUTPUT ? 'nghiệm thu' : 'thanh toán'}: {formatCurrency(paidAmount)}
                            </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-700 whitespace-nowrap">
                            {formatCurrency(contract.value)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {new Date(contract.signedDate).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
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
                        <td className="px-4 py-3 text-right whitespace-nowrap">
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
      </div>
    );
  };

  // Determine contract category type for modal (Revenue/Cost) to filter partners
  const currentCategoryType = useMemo(() => {
      const category = categories.find(c => c.id === contractForm.categoryId);
      return category?.type;
  }, [contractForm.categoryId, categories]);

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
                <button 
                    onClick={() => {
                        if (activeTab === 'TASKS') handleOpenTaskModal();
                        else handleOpenContractModal();
                    }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    {activeTab === 'TASKS' ? 'Thêm công việc' : 'Thêm HĐ/Chi phí'}
                </button>
            </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
           <nav className="flex gap-6 overflow-x-auto">
                {[
                    { id: 'OVERVIEW', label: 'Tổng quan' },
                    { id: 'OUTPUT', label: 'Doanh thu (Đầu ra)' },
                    { id: 'INPUT', label: 'Chi phí (Đầu vào)' },
                    { id: 'TASKS', label: 'Công việc (Project Task)' },
                    // Show Obligation tab only for Admin
                    ...(isAdmin ? [{ id: 'OBLIGATION', label: 'Nghĩa vụ Khách hàng' }] : []),
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-[#EE0033] text-[#EE0033]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab.label}
                        {tab.id === 'OBLIGATION' && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1 rounded-full"><Shield className="w-2 h-2 inline" /></span>}
                    </button>
                ))}
           </nav>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        {activeTab === 'OVERVIEW' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                {/* Stats Cards */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-slate-500 text-xs font-medium uppercase mb-1">Doanh số (Ký HĐ)</div>
                        <div className="text-xl font-bold text-indigo-600">{formatCurrency(stats.sales)}</div>
                        <div className="text-xs text-slate-400 mt-1">
                           KH: {formatCurrency(project.plannedSales || 0)}
                        </div>
                    </div>
                     <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-slate-500 text-xs font-medium uppercase mb-1">Doanh thu (NT)</div>
                        <div className="text-xl font-bold text-emerald-600">{formatCurrency(stats.actualRevenue)}</div>
                        <div className="text-xs text-slate-400 mt-1">
                           KH: {formatCurrency(project.plannedRevenue || 0)}
                        </div>
                    </div>
                     <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-slate-500 text-xs font-medium uppercase mb-1">Chi phí (Thực tế)</div>
                        <div className="text-xl font-bold text-rose-600">{formatCurrency(stats.actualCost)}</div>
                         <div className="text-xs text-slate-400 mt-1">
                           KH: {formatCurrency(project.plannedCost || 0)}
                        </div>
                    </div>
                     <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-slate-500 text-xs font-medium uppercase mb-1">Lợi nhuận</div>
                        <div className={`text-xl font-bold ${stats.profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {formatCurrency(stats.profit)}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                            {stats.sales > 0 ? `Margin: ${((stats.profit / stats.sales) * 100).toFixed(1)}%` : 'Margin: 0%'}
                        </div>
                    </div>
                 </div>
                
                 <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Left Column (Info) */}
                    <div className="xl:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <ListTodo className="w-5 h-5 text-slate-400" />
                                Thông tin chung
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs text-slate-500 font-medium uppercase">Khách hàng / Đối tác</label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Building2 className="w-4 h-4 text-slate-400" />
                                                <span className="font-medium text-slate-800">{partner?.name || '---'}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 font-medium uppercase">Thời gian thực hiện</label>
                                            <div className="flex items-center gap-2 mt-1 mb-3">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                <span className="text-slate-800">{new Date(project.startDate).toLocaleDateString('vi-VN')} - {new Date(project.endDate).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                            {/* Progress Bar */}
                                            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                                                <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" style={{width: `${timeProgress}%`}}></div>
                                            </div>
                                            <div className="flex justify-between text-[10px] text-slate-400">
                                                <span>Bắt đầu</span>
                                                <span className={daysRemaining < 0 ? 'text-red-500 font-medium' : 'text-indigo-600 font-medium'}>
                                                    {daysRemaining > 0 ? `Còn ${daysRemaining} ngày` : (daysRemaining === 0 ? 'Hôm nay' : `Quá hạn ${Math.abs(daysRemaining)} ngày`)}
                                                </span>
                                                <span>Kết thúc</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                     <div className="space-y-4">
                                        <div>
                                            <label className="text-xs text-slate-500 font-medium uppercase">Nhân sự phụ trách</label>
                                            <div className="flex flex-col gap-2 mt-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 rounded">AM</span>
                                                    <span className="text-slate-800 text-sm">{users.find(u => u.id === project.amId)?.fullName || 'Chưa gán'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs bg-purple-100 text-purple-700 px-1.5 rounded">PM</span>
                                                    <span className="text-slate-800 text-sm">{users.find(u => u.id === project.pmId)?.fullName || 'Chưa gán'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-6 pt-6 border-t border-slate-100">
                                <label className="text-xs text-slate-500 font-medium uppercase mb-2 block">Mô tả dự án</label>
                                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    {project.description || 'Chưa có mô tả chi tiết.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column (Chart) */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
                            <h3 className="font-bold text-slate-700 mb-4">Cơ cấu Chi phí</h3>
                            <div className="flex-1 min-h-[250px] flex items-center justify-center">
                                {costStructureData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie
                                                data={costStructureData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {costStructureData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-slate-400 text-sm italic">Chưa có dữ liệu chi phí</div>
                                )}
                            </div>
                        </div>
                    </div>
                 </div>
            </div>
        )}

        {activeTab === 'OUTPUT' && (
            <div className="animate-in slide-in-from-bottom-2 duration-300">
                <ContractTable type={ContractType.OUTPUT} />
            </div>
        )}

        {activeTab === 'INPUT' && (
            <div className="animate-in slide-in-from-bottom-2 duration-300">
                <ContractTable type={ContractType.INPUT} />
            </div>
        )}

        {activeTab === 'TASKS' && (
            <div className="animate-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700">Danh sách công việc dự án</h3>
                        <span className="text-xs text-slate-500">{projectTasks.length} nhiệm vụ</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {projectTasks.length === 0 ? (
                             <div className="p-8 text-center text-slate-400">Chưa có công việc nào trong dự án này.</div>
                        ) : (
                            projectTasks.map(task => {
                                const isLate = task.deadline < new Date().toISOString().split('T')[0] && task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.CANCELLED;
                                const statusInfo = taskStatusLabels[task.status] || taskStatusLabels[TaskStatus.NOT_STARTED];
                                
                                return (
                                    <div key={task.id} className="p-4 hover:bg-slate-50 flex items-start justify-between group flex-col md:flex-row gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-slate-800">{task.name}</h4>
                                                {isLate && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold border border-red-200 flex items-center gap-0.5"><AlertCircle className="w-3 h-3"/> Trễ hạn</span>}
                                            </div>
                                            {task.description && <p className="text-sm text-slate-600 mb-2 line-clamp-2">{task.description}</p>}
                                            
                                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 mt-2">
                                                <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                                                    <UserIcon className="w-3 h-3 text-slate-400" /> 
                                                    Chủ trì: <span className="font-medium text-slate-700">{getAssigneeName(task.assigneeId)}</span>
                                                </span>
                                                <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                                                    <Clock className="w-3 h-3 text-slate-400" /> 
                                                    Deadline: <span className={`font-medium ${isLate ? 'text-red-600' : 'text-slate-700'}`}>{new Date(task.deadline).toLocaleDateString('vi-VN')}</span>
                                                </span>
                                                {task.outputStandard && (
                                                    <span className="flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 text-indigo-700">
                                                        <Target className="w-3 h-3" /> Output: {task.outputStandard}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 self-end md:self-center">
                                            <select 
                                                value={task.status}
                                                onChange={(e) => onUpdateTask({...task, status: e.target.value as TaskStatus})}
                                                className={`text-xs border rounded px-2 py-1.5 outline-none font-medium cursor-pointer ${statusInfo.color.replace('text-', 'border-').replace('bg-', 'focus:ring-')}`}
                                            >
                                                {Object.entries(taskStatusLabels).map(([key, val]) => (
                                                    <option key={key} value={key}>{val.label}</option>
                                                ))}
                                            </select>
                                            <div className="flex gap-1">
                                                <button onClick={() => handleOpenTaskModal(task)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded bg-slate-50 hover:bg-indigo-50 border border-slate-200">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDeleteTaskItem(task.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded bg-slate-50 hover:bg-red-50 border border-slate-200">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* --- CUSTOMER OBLIGATION TAB (ADMIN ONLY) --- */}
        {activeTab === 'OBLIGATION' && isAdmin && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Coins className="w-5 h-5 text-indigo-600" />
                            Quản lý Nghĩa vụ Khách hàng
                        </h3>
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-slate-500">
                                Doanh số ký (đã chốt): <span className="font-bold text-indigo-600">{formatCurrency(stats.sales)}</span>
                            </div>
                            <button 
                                onClick={handleResetObligation}
                                className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 font-medium flex items-center gap-1 border border-red-200"
                                title="Xóa toàn bộ dữ liệu nghĩa vụ để nhập lại"
                            >
                                <RefreshCcw className="w-3 h-3" /> Reset dữ liệu
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tỷ lệ % / Doanh thu</label>
                                <div className="flex items-center">
                                    <input 
                                        type="number" 
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-right font-bold text-indigo-600" 
                                        value={obligationForm.percentage} 
                                        onChange={e => handlePercentageChange(parseFloat(e.target.value))}
                                        placeholder="0"
                                    />
                                    <span className="ml-2 font-bold text-slate-500">%</span>
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Giá trị Nghĩa vụ (VNĐ)</label>
                                <CurrencyInput 
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 text-lg"
                                    value={obligationForm.value}
                                    onChange={(val) => setObligationForm({...obligationForm, value: val})}
                                    placeholder="0"
                                />
                                <p className="text-xs text-slate-400 mt-1 italic">
                                    * Tự động tính = (Doanh số ký x % / 100) / 1.1
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Thời gian thực hiện</label>
                                <input 
                                    type="date"
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    value={obligationForm.deadline || ''}
                                    onChange={e => setObligationForm({...obligationForm, deadline: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col justify-between">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Hiện trạng Tổng thể</label>
                                <select 
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
                                    value={obligationForm.status}
                                    onChange={e => setObligationForm({...obligationForm, status: e.target.value as ObligationStatus})}
                                >
                                    {Object.entries(obligationStatusLabels).map(([key, val]) => (
                                        <option key={key} value={key}>{val.label}</option>
                                    ))}
                                </select>
                                <div className={`mt-2 text-xs font-bold px-2 py-1 rounded w-fit ${obligationStatusLabels[obligationForm.status]?.color}`}>
                                    {obligationStatusLabels[obligationForm.status]?.label}
                                </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-slate-200">
                                <div className="flex justify-between items-center text-sm font-medium">
                                    <span className="text-slate-600">Tổng nguồn đã có:</span>
                                    <span className={`font-bold ${
                                        (obligationForm.sources || []).reduce((a,b) => a + b.value, 0) >= obligationForm.value 
                                        ? 'text-emerald-600' 
                                        : 'text-orange-600'
                                    }`}>
                                        {formatCurrency((obligationForm.sources || []).reduce((a,b) => a + b.value, 0))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                <Landmark className="w-4 h-4 text-slate-500" />
                                Chi tiết Nguồn tiền
                            </h4>
                            <button 
                                onClick={handleAddFundingSource}
                                className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-medium flex items-center gap-1"
                            >
                                <PlusCircle className="w-3 h-3" /> Thêm nguồn
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3">Tên nguồn tiền</th>
                                        <th className="px-4 py-3 text-right">Số tiền</th>
                                        <th className="px-4 py-3 text-center">Trạng thái</th>
                                        <th className="px-4 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(!obligationForm.sources || obligationForm.sources.length === 0) ? (
                                        <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400 italic">Chưa có nguồn tiền nào được thêm.</td></tr>
                                    ) : (
                                        obligationForm.sources.map(source => (
                                            <tr key={source.id} className="group hover:bg-slate-50">
                                                <td className="px-4 py-2">
                                                    <input 
                                                        type="text" 
                                                        className="w-full bg-transparent border-b border-transparent focus:border-indigo-300 outline-none py-1"
                                                        value={source.name}
                                                        onChange={e => handleUpdateFundingSource(source.id, 'name', e.target.value)}
                                                        placeholder="Nhập tên nguồn (VD: Từ đối tác A)..."
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <CurrencyInput 
                                                        className="w-full text-right bg-transparent border-b border-transparent focus:border-indigo-300 outline-none py-1 font-mono text-slate-700"
                                                        value={source.value}
                                                        onChange={val => handleUpdateFundingSource(source.id, 'value', val)}
                                                    />
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    <select 
                                                        className={`text-xs border rounded px-2 py-1 outline-none cursor-pointer font-medium ${source.status === FundingSourceStatus.RECEIVED ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                                                        value={source.status}
                                                        onChange={e => handleUpdateFundingSource(source.id, 'status', e.target.value as FundingSourceStatus)}
                                                    >
                                                        <option value={FundingSourceStatus.RECEIVED}>Đã về</option>
                                                        <option value={FundingSourceStatus.PENDING}>Chưa về</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    <button 
                                                        onClick={() => handleDeleteFundingSource(source.id)}
                                                        className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <MinusCircle className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-end mt-6 pt-4 border-t border-slate-100">
                        <button 
                            onClick={handleSaveObligation}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-medium shadow-sm flex items-center gap-2"
                        >
                            <CheckSquare className="w-4 h-4" /> Lưu thông tin Nghĩa vụ
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Contract Modal */}
      {isContractModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-slate-800">
                {contractForm.id ? 'Cập nhật Hợp đồng / Chi phí' : 'Thêm mới Hợp đồng / Chi phí'}
            </h2>
            <form onSubmit={handleSaveContract} className="space-y-6">
               {/* Type & Category Selection */}
               <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 grid grid-cols-2 gap-4">
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Danh mục (Loại)</label>
                         <select 
                            required
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none"
                            value={contractForm.categoryId || ''}
                            onChange={e => setContractForm({...contractForm, categoryId: e.target.value})}
                         >
                            <option value="">-- Chọn danh mục --</option>
                            <optgroup label="Doanh thu">
                                {categories.filter(c => c.type === CategoryType.REVENUE).map(c => (
                                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                                ))}
                            </optgroup>
                            <optgroup label="Chi phí">
                                {categories.filter(c => c.type === CategoryType.COST).map(c => (
                                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                                ))}
                            </optgroup>
                         </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Mã Hợp đồng / Chứng từ</label>
                        <input required type="text" className="w-full p-2 border rounded-lg" value={contractForm.code} onChange={e => setContractForm({...contractForm, code: e.target.value})} placeholder="VD: HD-001" />
                    </div>
               </div>

               {/* Basic Info */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tên nội dung</label>
                        <input required type="text" className="w-full p-2 border rounded-lg" value={contractForm.name} onChange={e => setContractForm({...contractForm, name: e.target.value})} placeholder="VD: Hợp đồng mua thép..." />
                   </div>
                   <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Đối tác (Bên B)</label>
                        <input 
                            list="partners-list"
                            type="text" 
                            className="w-full p-2 border rounded-lg" 
                            value={contractForm.partyB || contractForm.partnerName} 
                            onChange={e => setContractForm({...contractForm, partyB: e.target.value, partnerName: e.target.value})} 
                            placeholder="Chọn hoặc nhập tên đối tác..." 
                        />
                        <datalist id="partners-list">
                            {partners
                                // Filter partners based on Contract Type:
                                // If Revenue (OUTPUT) -> Show Customers
                                // If Cost (INPUT) -> Show Suppliers
                                // If Category not selected -> Show all (or strictly follow type logic)
                                .filter(p => {
                                    if (!currentCategoryType) return true;
                                    if (currentCategoryType === CategoryType.REVENUE) return p.type === PartnerType.CUSTOMER || !p.type;
                                    if (currentCategoryType === CategoryType.COST) return p.type === PartnerType.SUPPLIER || !p.type;
                                    return true;
                                })
                                .map(p => (
                                    <option key={p.id} value={p.name} />
                                ))
                            }
                        </datalist>
                   </div>
               </div>

               <div className="grid grid-cols-3 gap-4">
                   <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Giá trị Hợp đồng</label>
                        <CurrencyInput 
                            className="w-full p-2 border rounded-lg font-bold text-slate-700 bg-slate-50"
                            value={contractForm.value || 0}
                            onChange={(val) => setContractForm({...contractForm, value: val})}
                            disabled={contractForm.installments && contractForm.installments.length > 0} // Disable if installments exist
                        />
                   </div>
                   <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ngày ký</label>
                        <input type="date" className="w-full p-2 border rounded-lg" value={contractForm.signedDate} onChange={e => setContractForm({...contractForm, signedDate: e.target.value})} />
                   </div>
                   <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bảo lãnh (nếu có)</label>
                        <CurrencyInput className="w-full p-2 border rounded-lg" value={contractForm.guaranteeValue || 0} onChange={(val) => setContractForm({...contractForm, guaranteeValue: val})} />
                   </div>
               </div>

               {/* Installments Section */}
               <div className="border-t border-slate-200 pt-4">
                    <h3 className="font-bold text-slate-700 mb-3 flex items-center justify-between">
                        <span>Tiến độ Thanh toán / Nghiệm thu</span>
                        <span className="text-xs font-normal text-slate-500">Tổng cộng: {formatCurrency(contractForm.installments?.reduce((a,b) => a+b.value, 0) || 0)}</span>
                    </h3>
                    
                    {/* List */}
                    <div className="space-y-2 mb-4">
                        {contractForm.installments?.map(ins => (
                            <div key={ins.id} className="grid grid-cols-12 gap-2 p-2 bg-slate-50 rounded border border-slate-200 text-sm items-center">
                                <span className="col-span-4 font-medium truncate" title={ins.name}>{ins.name}</span>
                                <span className="col-span-3 text-right font-mono">{formatCurrency(ins.value)}</span>
                                <span className="col-span-2 text-xs text-slate-500 text-center">
                                    {ins.revenueMonth ? `Kỳ: ${ins.revenueMonth}` : 'Chưa chọn kỳ'}
                                </span>
                                <span className={`col-span-2 text-xs px-1 py-0.5 rounded text-center ${
                                    ins.status === InstallmentStatus.PAID ? 'bg-green-100 text-green-700' :
                                    ins.status === InstallmentStatus.INVOICED ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                                }`}>
                                    {ins.status === InstallmentStatus.PAID ? 'Đã TT' : ins.status === InstallmentStatus.INVOICED ? 'Đã xuất HĐ' : 'Kế hoạch'}
                                </span>
                                <button type="button" onClick={() => handleRemoveInstallment(ins.id)} className="col-span-1 text-red-500 hover:bg-red-50 p-1 rounded flex justify-center">
                                    <MinusCircle className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {(!contractForm.installments || contractForm.installments.length === 0) && (
                            <div className="text-center py-2 text-slate-400 italic text-sm">Chưa có đợt thanh toán nào.</div>
                        )}
                    </div>

                    {/* Add New Installment Inline Form */}
                    <div className="flex gap-2 items-end bg-indigo-50 p-3 rounded-lg border border-indigo-100 flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-xs font-medium text-slate-500 block mb-1">Nội dung đợt</label>
                            <input 
                                type="text" 
                                className="w-full p-1.5 text-sm border rounded" 
                                placeholder="VD: Tạm ứng 30%..." 
                                value={newInstallment.name}
                                onChange={e => setNewInstallment({...newInstallment, name: e.target.value})}
                            />
                        </div>
                        <div className="w-32">
                             <label className="text-xs font-medium text-slate-500 block mb-1">Giá trị</label>
                             <CurrencyInput 
                                className="w-full p-1.5 text-sm border rounded"
                                value={newInstallment.value || 0}
                                onChange={val => setNewInstallment({...newInstallment, value: val})}
                             />
                        </div>
                        <div className="w-32">
                             <label className="text-xs font-medium text-slate-500 block mb-1">Kỳ Doanh thu</label>
                             <input 
                                type="month"
                                className="w-full p-1.5 text-sm border rounded"
                                value={newInstallment.revenueMonth || ''}
                                onChange={e => setNewInstallment({...newInstallment, revenueMonth: e.target.value})}
                             />
                        </div>
                        <div className="w-28">
                             <label className="text-xs font-medium text-slate-500 block mb-1">Trạng thái</label>
                             <select 
                                className="w-full p-1.5 text-sm border rounded"
                                value={newInstallment.status}
                                onChange={e => setNewInstallment({...newInstallment, status: e.target.value as InstallmentStatus})}
                             >
                                 <option value={InstallmentStatus.PLANNING}>Kế hoạch</option>
                                 <option value={InstallmentStatus.INVOICED}>Đã xuất HĐ</option>
                                 <option value={InstallmentStatus.PAID}>Đã thanh toán</option>
                             </select>
                        </div>
                        <button 
                            type="button" 
                            onClick={handleAddInstallment}
                            className="bg-indigo-600 text-white p-1.5 rounded hover:bg-indigo-700 mb-[1px]"
                        >
                            <PlusCircle className="w-5 h-5" />
                        </button>
                    </div>
               </div>

               <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => setIsContractModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Hủy</button>
                    <button type="submit" className="px-4 py-2 bg-[#EE0033] text-white rounded-lg hover:bg-red-700 font-medium shadow-sm">
                        {contractForm.id ? 'Cập nhật' : 'Lưu lại'}
                    </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Modal */}
      {isProjectModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
                 <h2 className="text-xl font-bold mb-4 text-slate-800">Sửa thông tin dự án</h2>
                 <form onSubmit={handleUpdateProjectSubmit} className="space-y-4">
                     {/* Simplified fields for brevity since full edit is in ProjectList, but repeating key fields here */}
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Mã dự án</label>
                            <input disabled type="text" className="w-full p-2 border rounded-lg bg-slate-100" value={projectForm.code} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tên dự án</label>
                            <input required type="text" className="w-full p-2 border rounded-lg" value={projectForm.name} onChange={e => setProjectForm({...projectForm, name: e.target.value})} />
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
                        <textarea className="w-full p-2 border rounded-lg h-24" value={projectForm.description} onChange={e => setProjectForm({...projectForm, description: e.target.value})} />
                     </div>
                     <div className="grid grid-cols-3 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Doanh số KH</label>
                            <CurrencyInput className="w-full p-2 border rounded-lg" value={projectForm.plannedSales || 0} onChange={v => setProjectForm({...projectForm, plannedSales: v})} />
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Doanh thu KH</label>
                            <CurrencyInput className="w-full p-2 border rounded-lg" value={projectForm.plannedRevenue || 0} onChange={v => setProjectForm({...projectForm, plannedRevenue: v})} />
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Chi phí KH</label>
                            <CurrencyInput className="w-full p-2 border rounded-lg" value={projectForm.plannedCost || 0} onChange={v => setProjectForm({...projectForm, plannedCost: v})} />
                         </div>
                     </div>
                      <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => setIsProjectModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
                        <button type="submit" className="px-4 py-2 bg-[#EE0033] text-white rounded-lg hover:bg-red-700">Lưu thay đổi</button>
                    </div>
                 </form>
            </div>
          </div>
      )}

      {/* Task Modal */}
      {isTaskModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                  <h2 className="text-xl font-bold mb-4 text-slate-800">{taskForm.id ? 'Sửa Nhiệm vụ' : 'Thêm Nhiệm vụ Mới'}</h2>
                  <form onSubmit={handleSaveTask} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                              <label className="block text-sm font-medium text-slate-700 mb-1">Tên nhiệm vụ <span className="text-red-500">*</span></label>
                              <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={taskForm.name} onChange={e => setTaskForm({...taskForm, name: e.target.value})} placeholder="VD: Khảo sát hiện trạng..." />
                          </div>
                          
                          <div className="col-span-2">
                               <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung / Mô tả</label>
                               <textarea className="w-full p-2 border rounded-lg h-24 focus:ring-2 focus:ring-indigo-500 outline-none" value={taskForm.description || ''} onChange={e => setTaskForm({...taskForm, description: e.target.value})} placeholder="Mô tả chi tiết công việc..." />
                          </div>

                          <div className="col-span-2">
                               <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> Kết quả đầu ra (Output)</label>
                               <input type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={taskForm.outputStandard || ''} onChange={e => setTaskForm({...taskForm, outputStandard: e.target.value})} placeholder="VD: File báo cáo khảo sát, Bản vẽ..." />
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Người giao việc</label>
                              <select className="w-full p-2 border rounded-lg bg-white" value={taskForm.assignerId} onChange={e => setTaskForm({...taskForm, assignerId: e.target.value})}>
                                  {users.map(u => (
                                      <option key={u.id} value={u.id}>{u.fullName}</option>
                                  ))}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Người chủ trì (Assignee) <span className="text-red-500">*</span></label>
                              <select required className="w-full p-2 border rounded-lg bg-white" value={taskForm.assigneeId} onChange={e => setTaskForm({...taskForm, assigneeId: e.target.value})}>
                                  <option value="">-- Chọn nhân sự --</option>
                                  {users.map(u => (
                                      <option key={u.id} value={u.id}>{u.fullName}</option>
                                  ))}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Tiến độ thực hiện</label>
                              <select className="w-full p-2 border rounded-lg bg-white" value={taskForm.status} onChange={e => setTaskForm({...taskForm, status: e.target.value as TaskStatus})}>
                                  {Object.entries(taskStatusLabels).map(([key, val]) => (
                                      <option key={key} value={key}>{val.label}</option>
                                  ))}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Hạn hoàn thành (Deadline)</label>
                              <input type="date" className="w-full p-2 border rounded-lg bg-white" value={taskForm.deadline} onChange={e => setTaskForm({...taskForm, deadline: e.target.value})} />
                          </div>
                      </div>
                      
                      <div>
                           <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2"><Users className="w-4 h-4" /> Người phối hợp</label>
                           <div className="border border-slate-200 rounded-lg p-3 max-h-32 overflow-y-auto bg-slate-50 grid grid-cols-2 gap-2">
                               {users.map(u => (
                                   <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-1 rounded">
                                       <input 
                                          type="checkbox" 
                                          checked={(taskForm.collaboratorIds || []).includes(u.id)}
                                          onChange={() => toggleCollaborator(u.id)}
                                          className="rounded text-indigo-600 focus:ring-indigo-500"
                                       />
                                       <span>{u.fullName}</span>
                                   </label>
                               ))}
                           </div>
                      </div>

                       <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
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

export default ProjectDetail;
