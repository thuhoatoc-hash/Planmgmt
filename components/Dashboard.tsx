
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Project, Contract, ContractType, Category, CategoryType, KPIMonthlyData, Task, User, TaskStatus, InstallmentStatus, EmployeeEvaluation, UserRole, BirthdayEvent, Role, Notification, NotificationPriority } from '../types';
import { Wallet, TrendingUp, TrendingDown, Activity, Settings, Check, X, SlidersHorizontal, CheckSquare, Award, AlertTriangle, Target, Gift, Phone, ClipboardList, Move, GripHorizontal, Bell, Info } from 'lucide-react';

interface DashboardProps {
  currentUser?: User | null;
  projects: Project[];
  contracts: Contract[];
  categories: Category[];
  kpiData?: KPIMonthlyData[];
  tasks?: Task[];
  users?: User[];
  evaluations?: EmployeeEvaluation[];
  events?: BirthdayEvent[];
  roles?: Role[];
  notifications?: Notification[];
  onNavigate?: (path: string, id?: string) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#FF6B6B'];
const KPI_COLORS = ['#10b981', '#f97316']; // Green for completed, Orange for incomplete

// Default configuration for visibility
const DEFAULT_CONFIG = {
  showSales: true,
  showCost: true,
  showProfit: true,
  showRevenue: true,
  showProjectChart: true,
  showCategoryChart: true,
  showKPIChart: true,
  showTaskChart: true,
  showEvaluationChart: true,
  showMyTasks: true,
  showDueTasks: true,
  showBirthdays: true,
  showNotifications: true,
};

// Widget Definitions for Drag and Drop
type WidgetType = 'sales' | 'cost' | 'profit' | 'revenue' | 'my_tasks' | 'due_tasks' | 'birthdays' | 'kpi' | 'task_am' | 'task_project' | 'eval' | 'fin_project' | 'fin_category' | 'notifications';

const DEFAULT_ORDER: WidgetType[] = [
    // 0. Thông báo (Important)
    'notifications',
    // 1. Chỉ tiêu điều hành (KPI)
    'kpi', 
    // 2. Việc cần làm (My Tasks) & Sinh nhật
    'my_tasks', 'birthdays', 
    // 3. Doanh thu, doanh số, chi phí, lợi nhuận (Finance)
    'revenue', 'sales', 'cost', 'profit', 
    // 4. Đánh giá nhân viên
    'eval',
    // 5. Nhiệm vụ nhân viên, nhiệm vụ dự án
    'task_am', 'task_project',
    // 6. Others
    'due_tasks', 'fin_project', 'fin_category'
];

const Dashboard: React.FC<DashboardProps> = ({ currentUser, projects, contracts, categories, kpiData = [], tasks = [], users = [], evaluations = [], events = [], roles = [], notifications = [], onNavigate }) => {
  // State for customization
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const configRef = useRef<HTMLDivElement>(null);

  // Drag and Drop State
  const [isDragMode, setIsDragMode] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<WidgetType[]>(DEFAULT_ORDER);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  // Helper to check permission
  const canViewEvaluation = useMemo(() => {
      if (!currentUser) return false;
      if (currentUser.role === UserRole.ADMIN) return true;
      if (!currentUser.roleId) return true; // Legacy
      
      const userRole = roles.find(r => r.id === currentUser.roleId);
      return userRole?.permissions?.['EVALUATION']?.view || false;
  }, [currentUser, roles]);

  // Load config and order from local storage
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('pm_dashboard_config');
      if (savedConfig) {
        setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) });
      }
      
      // Use v2 key to force reset order for users who had old order cached
      const savedOrder = localStorage.getItem('pm_dashboard_order_v3'); // Increment to v3 for new widget
      if (savedOrder) {
          // Merge saved order with default to handle new widgets if any
          const parsedOrder = JSON.parse(savedOrder);
          const validOrder = parsedOrder.filter((id: string) => DEFAULT_ORDER.includes(id as WidgetType));
          const missing = DEFAULT_ORDER.filter(id => !validOrder.includes(id));
          setWidgetOrder([...missing, ...validOrder]); // Put missing (new) widgets at top usually
      } else {
          // Use default order if no saved order
          setWidgetOrder(DEFAULT_ORDER);
      }
    } catch (e) {
      console.error('Failed to load dashboard settings', e);
    }
  }, []);

  // Save order when changed
  const handleOrderChange = (newOrder: WidgetType[]) => {
      setWidgetOrder(newOrder);
      localStorage.setItem('pm_dashboard_order_v3', JSON.stringify(newOrder));
  };

  // Close config panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (configRef.current && !configRef.current.contains(event.target as Node)) {
        setIsConfigOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleConfig = (key: keyof typeof DEFAULT_CONFIG) => {
    const newConfig = { ...config, [key]: !config[key] };
    setConfig(newConfig);
    localStorage.setItem('pm_dashboard_config', JSON.stringify(newConfig));
  };

  // --- Drag and Drop Handlers ---
  const onDragStart = (e: React.DragEvent, index: number) => {
      setDraggedItem(index);
      e.dataTransfer.effectAllowed = "move";
      // Optional: Set a drag image if needed
  };

  const onDragOver = (e: React.DragEvent) => {
      e.preventDefault(); // Necessary to allow dropping
  };

  const onDrop = (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (draggedItem === null || draggedItem === dropIndex) return;

      const newOrder = [...widgetOrder];
      const itemToMove = newOrder[draggedItem];
      newOrder.splice(draggedItem, 1);
      newOrder.splice(dropIndex, 0, itemToMove);
      
      handleOrderChange(newOrder);
      setDraggedItem(null);
  };

  // --- Financial Stats Calculation ---
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalSales = 0;
    let totalCost = 0;
    const projectStats = projects.map(p => {
      const pContracts = contracts.filter(c => c.projectId === p.id);
      
      const sales = pContracts
        .filter(c => c.type === ContractType.OUTPUT && c.status !== 'CANCELLED')
        .reduce((acc, curr) => acc + curr.value, 0);

      const rev = pContracts
        .filter(c => c.type === ContractType.OUTPUT && c.status !== 'CANCELLED')
        .reduce((acc, c) => {
            if (c.installments && c.installments.length > 0) {
                const validInstallments = c.installments.filter(i => 
                    i.status === InstallmentStatus.INVOICED || i.status === InstallmentStatus.PAID
                );
                return acc + validInstallments.reduce((sum, i) => sum + i.value, 0);
            } else {
                return acc + (c.status === 'COMPLETED' ? c.value : 0);
            }
        }, 0);

      const cost = pContracts
        .filter(c => c.type === ContractType.INPUT && c.status !== 'CANCELLED')
        .reduce((acc, curr) => acc + curr.value, 0);
      
      totalRevenue += rev;
      totalSales += sales;
      totalCost += cost;

      return {
        name: p.name,
        sales: sales,
        revenue: rev,
        cost: cost,
        profit: sales - cost
      };
    });

    const globalProfit = totalSales - totalCost;

    return {
      totalRevenue,
      totalSales,
      totalCost,
      profit: globalProfit,
      roi: totalCost > 0 ? (globalProfit / totalCost) * 100 : 0,
      projectStats
    };
  }, [projects, contracts]);

  // --- Category Stats Calculation ---
  const categoryData = useMemo(() => {
    const revCats = categories.filter(c => c.type === CategoryType.REVENUE && c.parentId === null);
    
    const data = revCats.map(rootCat => {
       const subCatIds = categories
          .filter(sub => sub.parentId === rootCat.id)
          .map(sub => sub.id);
       const targetIds = [rootCat.id, ...subCatIds];

       const val = contracts
        .filter(c => targetIds.includes(c.categoryId))
        .reduce((acc, curr) => acc + curr.value, 0);
       
       return { name: rootCat.name, value: val };
    }).filter(d => d.value > 0).sort((a,b) => b.value - a.value);
    
    return data;
  }, [categories, contracts]);

  // --- KPI Data Summary for Current Month ---
  const kpiSummary = useMemo(() => {
      if (!kpiData || kpiData.length === 0) return null;
      const sortedData = [...kpiData].sort((a,b) => b.month.localeCompare(a.month));
      const current = sortedData[0]; 

      let totalScore = 0;
      let completedCount = 0;
      let incompleteCount = 0;

      current.groups.forEach(group => {
          let groupTarget = group.target || 0;
          let groupActual = group.actual || 0;
          
          if (group.autoCalculate) {
              groupTarget = group.items.reduce((sum, item) => sum + (item.target || 0), 0);
              groupActual = group.items.reduce((sum, item) => sum + (item.actual || 0), 0);
          }

          if (group.weight && group.weight > 0) {
              const groupPercent = groupTarget > 0 ? (groupActual / groupTarget) * 100 : 0;
              const cappedPercent = Math.min(groupPercent, 120);
              totalScore += (cappedPercent * group.weight) / 100;
          }

          group.items.forEach(item => {
              const percent = item.target > 0 ? (item.actual / item.target) * 100 : 0;
              if (item.weight && item.weight > 0) {
                  const cappedPercent = Math.min(percent, 120);
                  totalScore += (cappedPercent * item.weight) / 100;
              }
              if (item.target > 0 || item.weight > 0) {
                  if (percent >= 100) completedCount++;
                  else incompleteCount++;
              }
          });
      });

      return {
          month: current.month,
          totalScore,
          chartData: [
              { name: 'Hoàn thành', value: completedCount },
              { name: 'Chưa hoàn thành', value: incompleteCount }
          ]
      };
  }, [kpiData]);

  // --- My To-Do Tasks ---
  const myToDos = useMemo(() => {
      if (!currentUser) return [];
      return tasks.filter(t => {
          return t.assigneeId === currentUser.id &&
                 t.status !== TaskStatus.COMPLETED &&
                 t.status !== TaskStatus.CANCELLED;
      }).sort((a,b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }, [tasks, currentUser]);

  // --- Task Stats ---
  const taskStats = useMemo(() => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dueTasks = tasks.filter(t => {
          if (t.status === TaskStatus.COMPLETED || t.status === TaskStatus.CANCELLED) return false;
          const deadline = new Date(t.deadline);
          return deadline <= tomorrow;
      }).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

      const tasksByAM = users.map(user => {
          const userTasks = tasks.filter(t => t.assigneeId === user.id);
          const total = userTasks.length;
          const late = userTasks.filter(t => 
            (t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELLED) && 
            new Date(t.deadline) < today
          ).length;
          return { name: user.fullName.split(' ').pop(), fullName: user.fullName, total, late }; 
      }).filter(stat => stat.total > 0).sort((a,b) => b.total - a.total);

      const tasksByProject = projects.map(proj => {
          const projTasks = tasks.filter(t => t.projectId === proj.id);
          const total = projTasks.length;
          const late = projTasks.filter(t => 
            (t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELLED) && 
            new Date(t.deadline) < today
          ).length;
          return { name: proj.code, fullName: proj.name, total, late };
      }).filter(stat => stat.total > 0).sort((a,b) => b.total - a.total);

      return { tasksByAM, tasksByProject, dueTasks };
  }, [tasks, users, projects]);

  // --- Evaluation Stats ---
  const evaluationStats = useMemo(() => {
      if (!evaluations || evaluations.length === 0) return null;
      const months = Array.from(new Set(evaluations.map(e => e.month))).sort().reverse();
      const latestMonth = months[0];
      
      const validUserIds = users.filter(u => u.role === UserRole.AM || u.role === UserRole.PM).map(u => u.id);
      const currentEvals = evaluations.filter(e => e.month === latestMonth && validUserIds.includes(e.userId));
      
      const distribution = [
          { name: 'A+', value: 0, fill: '#eab308' },
          { name: 'A', value: 0, fill: '#22c55e' },
          { name: 'B', value: 0, fill: '#3b82f6' },
          { name: 'C', value: 0, fill: '#f97316' },
          { name: 'D', value: 0, fill: '#ef4444' },
      ];

      currentEvals.forEach(e => {
          const item = distribution.find(d => d.name === e.grade);
          if (item) item.value++;
      });
      
      return { month: latestMonth, total: currentEvals.length, data: distribution };
  }, [evaluations, users]);

  // --- Upcoming Birthdays ---
  const upcomingBirthdays = useMemo(() => {
      if (!events || events.length === 0) return [];
      const today = new Date();
      today.setHours(0,0,0,0);
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      return events.map(evt => {
          const dob = new Date(evt.date);
          const currentYearBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
          let targetDate = currentYearBday;
          if (currentYearBday < today) {
              targetDate = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
          }
          const diffTime = targetDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const age = today.getFullYear() - dob.getFullYear();
          return { ...evt, daysUntil: diffDays, targetDate, age };
      })
      .filter(evt => evt.daysUntil >= 0 && evt.daysUntil <= 7)
      .sort((a,b) => a.daysUntil - b.daysUntil);
  }, [events]);

  // --- Latest Notifications ---
  const latestNotifications = useMemo(() => {
      if (!notifications || notifications.length === 0) return [];
      return [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  }, [notifications]);

  const StatCard = ({ title, value, subValue, icon: Icon, colorClass, onClick }: any) => (
    <div 
        onClick={isDragMode ? undefined : onClick}
        className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start justify-between h-full ${onClick && !isDragMode ? 'cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all' : ''}`}
    >
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        {subValue && <p className={`text-sm mt-1 ${colorClass.text}`}>{subValue}</p>}
      </div>
      <div className={`p-3 rounded-lg ${colorClass.bg}`}>
        <Icon className={`w-6 h-6 ${colorClass.icon}`} />
      </div>
    </div>
  );

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);

  // --- RENDER WIDGET HELPERS ---
  const getWidgetSpan = (id: WidgetType) => {
      switch(id) {
          case 'notifications': return 'col-span-1 md:col-span-2 lg:col-span-4'; // Top bar
          case 'kpi': return 'col-span-1 md:col-span-2 lg:col-span-4'; // Full width on large
          case 'fin_project': return 'col-span-1 md:col-span-2';
          case 'fin_category': return 'col-span-1 md:col-span-2';
          case 'my_tasks': return 'col-span-1 md:col-span-2 lg:col-span-2';
          case 'due_tasks': return 'col-span-1 md:col-span-2 lg:col-span-1';
          case 'birthdays': return 'col-span-1 md:col-span-2 lg:col-span-1';
          case 'eval': return 'col-span-1 md:col-span-2 lg:col-span-4'; // Eval full width or 2/3
          case 'task_am': return 'col-span-1 md:col-span-2';
          case 'task_project': return 'col-span-1 md:col-span-2';
          default: return 'col-span-1';
      }
  };

  const renderWidget = (id: WidgetType) => {
      // Wrapper styles handled in the map loop
      switch (id) {
          case 'sales':
              return config.showSales ? (
                  <StatCard 
                    title="Tổng Doanh Số (Ký)" 
                    value={formatCurrency(stats.totalSales)} 
                    subValue="Giá trị hợp đồng đầu ra"
                    icon={TrendingUp}
                    colorClass={{ bg: 'bg-indigo-50', icon: 'text-indigo-600', text: 'text-indigo-600' }}
                    onClick={() => onNavigate && onNavigate('projects')}
                  />
              ) : null;
          case 'cost':
              return config.showCost ? (
                  <StatCard 
                    title="Tổng Chi Phí" 
                    value={formatCurrency(stats.totalCost)} 
                    subValue="Đầu tư & Vận hành"
                    icon={TrendingDown}
                    colorClass={{ bg: 'bg-red-50', icon: 'text-red-600', text: 'text-red-600' }}
                    onClick={() => onNavigate && onNavigate('projects')}
                  />
              ) : null;
          case 'profit':
              return config.showProfit ? (
                  <StatCard 
                    title="Lợi Nhuận (Dự kiến)" 
                    value={formatCurrency(stats.profit)} 
                    subValue={`ROI: ${stats.roi.toFixed(1)}%`}
                    icon={Wallet}
                    colorClass={{ bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-600' }}
                    onClick={() => onNavigate && onNavigate('projects')}
                  />
              ) : null;
          case 'revenue':
              return config.showRevenue ? (
                  <StatCard 
                    title="Doanh Thu (NT)" 
                    value={formatCurrency(stats.totalRevenue)} 
                    subValue="Đã nghiệm thu"
                    icon={Activity}
                    colorClass={{ bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-600' }}
                    onClick={() => onNavigate && onNavigate('projects')}
                  />
              ) : null;
          case 'notifications':
              return config.showNotifications && latestNotifications.length > 0 ? (
                  <div 
                    onClick={() => !isDragMode && onNavigate && onNavigate('notifications')}
                    className={`bg-white border border-slate-200 rounded-xl p-4 h-full shadow-sm overflow-hidden ${!isDragMode ? 'cursor-pointer hover:border-indigo-300' : ''}`}
                  >
                      <h3 className="flex items-center gap-2 text-slate-800 font-bold mb-3">
                          <Bell className="w-5 h-5 text-[#EE0033]" /> Thông báo mới nhất
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {latestNotifications.map(notif => {
                              const priorityColor = 
                                notif.priority === NotificationPriority.URGENT ? 'bg-red-50 border-red-200' :
                                notif.priority === NotificationPriority.IMPORTANT ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100';
                              
                              return (
                                  <div key={notif.id} className={`p-3 rounded-lg border ${priorityColor} relative`}>
                                      <div className="flex justify-between items-start mb-1">
                                          <div className="flex items-center gap-1.5">
                                              {notif.priority === NotificationPriority.URGENT && <AlertTriangle className="w-4 h-4 text-red-600" />}
                                              {notif.priority === NotificationPriority.IMPORTANT && <Info className="w-4 h-4 text-amber-600" />}
                                              <span className="font-bold text-sm text-slate-800 line-clamp-1">{notif.title}</span>
                                          </div>
                                          <span className="text-[10px] text-slate-500 whitespace-nowrap">{new Date(notif.createdAt).toLocaleDateString('vi-VN')}</span>
                                      </div>
                                      <p className="text-xs text-slate-600 line-clamp-2">{notif.content}</p>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              ) : null;
          case 'my_tasks':
              return config.showMyTasks && myToDos.length > 0 ? (
                  <div 
                    onClick={() => !isDragMode && onNavigate && onNavigate('tasks')}
                    className={`bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 rounded-xl p-6 h-full shadow-sm group ${!isDragMode ? 'cursor-pointer hover:shadow-md hover:border-indigo-300' : ''}`}
                  >
                      <h3 className="flex items-center gap-2 text-indigo-900 font-bold mb-3 group-hover:text-indigo-700">
                          <ClipboardList className="w-5 h-5 text-indigo-600" /> 
                          Việc cần làm của tôi ({myToDos.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
                          {myToDos.slice(0, 6).map(task => {
                              const today = new Date();
                              today.setHours(0,0,0,0);
                              const deadline = new Date(task.deadline);
                              deadline.setHours(0,0,0,0);
                              const diffTime = deadline.getTime() - today.getTime();
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              let badgeClass = "bg-slate-100 text-slate-600 border-slate-200";
                              let urgent = false;
                              if (diffDays < 0) { badgeClass = "bg-red-50 text-red-700 border-red-200"; urgent = true; } 
                              else if (diffDays <= 1) { badgeClass = "bg-orange-50 text-orange-700 border-orange-200"; urgent = true; } 
                              else { badgeClass = "bg-blue-50 text-blue-700 border-blue-200"; }

                              return (
                                  <div key={task.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between hover:border-indigo-200 transition-colors">
                                      <div className="min-w-0 pr-2">
                                          <div className={`font-medium text-sm truncate ${urgent ? 'text-slate-900' : 'text-slate-700'}`}>{task.name}</div>
                                          <div className="text-xs text-slate-500 truncate">{projects.find(p => p.id === task.projectId)?.name || 'Giao việc'}</div>
                                      </div>
                                      <div className={`text-[10px] font-bold px-2 py-1 rounded border whitespace-nowrap flex items-center gap-1 ${badgeClass}`}>
                                          {urgent && <AlertTriangle className="w-3 h-3" />}
                                          {new Date(task.deadline).toLocaleDateString('vi-VN')}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              ) : null;
          case 'due_tasks':
              return config.showDueTasks && taskStats.dueTasks.length > 0 ? (
                  <div 
                    onClick={() => !isDragMode && onNavigate && onNavigate('tasks')}
                    className={`bg-amber-50 border border-amber-200 rounded-xl p-4 h-full shadow-sm ${!isDragMode ? 'cursor-pointer hover:shadow-md hover:border-amber-300' : ''}`}
                  >
                      <h3 className="flex items-center gap-2 text-amber-800 font-bold mb-2">
                          <AlertTriangle className="w-5 h-5" /> Nhiệm vụ sắp/đã đến hạn (All)
                      </h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {taskStats.dueTasks.slice(0, 5).map(task => (
                              <div key={task.id} className="bg-white p-2.5 rounded-lg border border-amber-100 shadow-sm flex items-center justify-between">
                                  <div className="min-w-0">
                                      <div className="font-medium text-slate-800 text-sm truncate">{task.name}</div>
                                      <div className="text-xs text-slate-500">{users.find(u => u.id === task.assigneeId)?.fullName}</div>
                                  </div>
                                  <div className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded shrink-0">{new Date(task.deadline).toLocaleDateString('vi-VN')}</div>
                              </div>
                          ))}
                      </div>
                  </div>
              ) : null;
          case 'birthdays':
              return config.showBirthdays && upcomingBirthdays.length > 0 ? (
                  <div 
                    onClick={() => !isDragMode && onNavigate && onNavigate('events')}
                    className={`bg-pink-50 border border-pink-200 rounded-xl p-4 h-full shadow-sm ${!isDragMode ? 'cursor-pointer hover:shadow-md hover:border-pink-300' : ''}`}
                  >
                      <h3 className="flex items-center gap-2 text-pink-800 font-bold mb-2">
                          <Gift className="w-5 h-5" /> Sắp sinh nhật (7 ngày tới)
                      </h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {upcomingBirthdays.map(evt => (
                              <div 
                                key={evt.id} 
                                onClick={(e) => {
                                    if(isDragMode) return;
                                    e.stopPropagation(); 
                                    onNavigate?.('events', evt.id);
                                }}
                                className={`bg-white p-2.5 rounded-lg border border-pink-100 shadow-sm flex items-center justify-between ${!isDragMode ? 'hover:border-pink-300 hover:shadow-md cursor-pointer' : ''}`}
                              >
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center font-bold text-xs shrink-0">
                                          {evt.daysUntil === 0 ? 'H.Nay' : `${evt.targetDate.getDate()}/${evt.targetDate.getMonth()+1}`}
                                      </div>
                                      <div className="min-w-0">
                                          <div className="font-medium text-slate-800 text-sm truncate flex items-center gap-1">
                                              {evt.fullName}
                                              {evt.age && <span className="text-xs font-normal text-slate-400 bg-slate-100 px-1.5 rounded-full">{evt.age}t</span>}
                                          </div>
                                          <div className="text-xs text-slate-500 truncate">{evt.title}</div>
                                      </div>
                                  </div>
                                  {evt.phoneNumber && (
                                      <a href={`tel:${evt.phoneNumber}`} className="text-pink-400 hover:text-pink-600 p-1" onClick={(e) => e.stopPropagation()}>
                                          <Phone className="w-4 h-4" />
                                      </a>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>
              ) : null;
          case 'kpi':
              return config.showKPIChart && kpiSummary ? (
                  <div 
                    onClick={() => !isDragMode && onNavigate && onNavigate('kpi')}
                    className={`grid grid-cols-1 md:grid-cols-3 gap-6 h-full ${!isDragMode ? 'cursor-pointer hover:shadow-sm' : ''}`}
                  >
                      <div className={`bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-xl p-6 shadow-md flex flex-col justify-center relative overflow-hidden transition-all ${!isDragMode ? 'hover:scale-[1.02]' : ''}`}>
                          <div className="absolute right-0 top-0 opacity-10">
                              <Target className="w-32 h-32 text-white transform translate-x-8 -translate-y-8" />
                          </div>
                          <div className="relative z-10">
                              <p className="text-slate-300 text-sm font-medium uppercase mb-2">Điểm KPI tháng {kpiSummary.month}</p>
                              <h3 className="text-4xl font-bold">{kpiSummary.totalScore.toFixed(2)}</h3>
                              <p className="text-slate-400 text-xs mt-2">Tổng điểm quy đổi từ tất cả chỉ tiêu</p>
                          </div>
                      </div>
                      <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center">
                           <div className="flex-1 h-full">
                                <h4 className="font-bold text-slate-700 mb-1 ml-4">Tiến độ Hoàn thành</h4>
                                <div className="h-28 flex items-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart layout="vertical" data={[
                                            { name: 'KPI', completed: kpiSummary.chartData[0].value, incomplete: kpiSummary.chartData[1].value }
                                        ]} margin={{left: 20, right: 30}}>
                                            <XAxis type="number" hide />
                                            <YAxis type="category" dataKey="name" hide />
                                            <Tooltip cursor={{fill: 'transparent'}} />
                                            <Bar dataKey="completed" name="Hoàn thành" stackId="a" fill={KPI_COLORS[0]} barSize={30} radius={[4, 0, 0, 4]} />
                                            <Bar dataKey="incomplete" name="Chưa hoàn thành" stackId="a" fill={KPI_COLORS[1]} barSize={30} radius={[0, 4, 4, 0]} />
                                            <Legend align="left" wrapperStyle={{paddingLeft: '20px'}} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                           </div>
                           <div className="w-px h-20 bg-slate-100 mx-4"></div>
                           <div className="w-1/3 flex justify-center flex-col items-center gap-2">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-emerald-600">{kpiSummary.chartData[0].value}</div>
                                    <div className="text-xs text-slate-500">Hoàn thành</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-orange-500">{kpiSummary.chartData[1].value}</div>
                                    <div className="text-xs text-slate-500">Chưa đạt</div>
                                </div>
                           </div>
                      </div>
                  </div>
              ) : null;
          case 'task_am':
              return config.showTaskChart ? (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full">
                      <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                              <CheckSquare className="w-5 h-5 text-indigo-600" />
                              Nhiệm vụ theo AM
                          </h3>
                      </div>
                      <div className="h-64">
                          {taskStats.tasksByAM.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={taskStats.tasksByAM} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                      <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} />
                                      <YAxis tick={{fontSize: 12, fill: '#64748b'}} />
                                      <Tooltip 
                                          cursor={{fill: '#f1f5f9'}}
                                          content={({ active, payload }) => {
                                              if (active && payload && payload.length) {
                                                  return (
                                                      <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-xs">
                                                          <p className="font-bold text-slate-800 mb-1">{payload[0].payload.fullName}</p>
                                                          <p className="text-indigo-600">Tổng số việc: {payload[0].value}</p>
                                                          <p className="text-rose-500">Quá hạn: {payload[1].value}</p>
                                                      </div>
                                                  );
                                              }
                                              return null;
                                          }}
                                      />
                                      <Legend />
                                      <Bar dataKey="total" name="Tổng số việc" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
                                      <Bar dataKey="late" name="Quá hạn" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} />
                                  </BarChart>
                              </ResponsiveContainer>
                          ) : (
                              <div className="h-full flex items-center justify-center text-slate-400">Chưa có dữ liệu</div>
                          )}
                      </div>
                  </div>
              ) : null;
          case 'task_project':
              return config.showTaskChart ? (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full">
                      <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                              <Activity className="w-5 h-5 text-indigo-600" />
                              Nhiệm vụ theo Dự án
                          </h3>
                      </div>
                      <div className="h-64">
                          {taskStats.tasksByProject.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={taskStats.tasksByProject} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                      <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} />
                                      <YAxis tick={{fontSize: 12, fill: '#64748b'}} />
                                      <Tooltip 
                                          cursor={{fill: '#f1f5f9'}}
                                          content={({ active, payload }) => {
                                              if (active && payload && payload.length) {
                                                  return (
                                                      <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-xs">
                                                          <p className="font-bold text-slate-800 mb-1">{payload[0].payload.fullName}</p>
                                                          <p className="text-indigo-600">Tổng số việc: {payload[0].value}</p>
                                                          <p className="text-rose-500">Quá hạn: {payload[1].value}</p>
                                                      </div>
                                                  );
                                              }
                                              return null;
                                          }}
                                      />
                                      <Legend />
                                      <Bar dataKey="total" name="Tổng số việc" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
                                      <Bar dataKey="late" name="Quá hạn" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} />
                                  </BarChart>
                              </ResponsiveContainer>
                          ) : (
                               <div className="h-full flex items-center justify-center text-slate-400">Chưa có dữ liệu</div>
                          )}
                      </div>
                  </div>
              ) : null;
          case 'eval':
              return config.showEvaluationChart && canViewEvaluation ? (
                  <div 
                    onClick={() => !isDragMode && onNavigate && onNavigate('evaluation')}
                    className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full ${!isDragMode ? 'cursor-pointer hover:border-amber-300 hover:shadow-md' : ''}`}
                  >
                      <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                              <Award className="w-5 h-5 text-amber-500" />
                              Đánh giá KI ({evaluationStats?.month || 'N/A'})
                          </h3>
                      </div>
                      <div className="h-64">
                          {evaluationStats ? (
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={evaluationStats.data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                      <XAxis dataKey="name" tick={{fontSize: 12, fontWeight: 'bold'}} />
                                      <YAxis tick={{fontSize: 12}} allowDecimals={false} />
                                      <Tooltip 
                                          cursor={{fill: '#f1f5f9'}}
                                          formatter={(value) => [value, 'Nhân viên']}
                                          contentStyle={{ borderRadius: '8px' }}
                                      />
                                      <Bar dataKey="value" name="Số lượng" radius={[4, 4, 0, 0]} barSize={40}>
                                          {evaluationStats.data.map((entry, index) => (
                                              <Cell key={`cell-${index}`} fill={entry.fill} />
                                          ))}
                                      </Bar>
                                  </BarChart>
                              </ResponsiveContainer>
                          ) : (
                              <div className="h-full flex items-center justify-center text-slate-400">Chưa có dữ liệu đánh giá</div>
                          )}
                      </div>
                  </div>
              ) : null;
          case 'fin_project':
              return config.showProjectChart ? (
                  <div 
                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full"
                  >
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Hiệu quả theo Dự án (Doanh số vs Chi phí)</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.projectStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `${(value/1e9).toFixed(0)} tỷ`} />
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value)}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Legend />
                          <Bar dataKey="sales" name="Doanh số" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                          <Bar dataKey="cost" name="Chi phí" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
              ) : null;
          case 'fin_category':
              return config.showCategoryChart ? (
                  <div 
                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full"
                  >
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Cơ cấu Doanh số theo Danh mục</h3>
                    <div className="h-80 flex items-center justify-center">
                       {categoryData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {categoryData.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value: number) => formatCurrency(value)} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                       ) : (
                         <div className="text-slate-400">Chưa có dữ liệu</div>
                       )}
                    </div>
                  </div>
              ) : null;
          default:
              return null;
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
        <h1 className="text-2xl font-bold text-slate-800">Tổng quan Hoạt động</h1>
        
        <div className="flex items-center gap-3">
          {/* Drag Mode Toggle */}
          <button 
            onClick={() => setIsDragMode(!isDragMode)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                isDragMode ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {isDragMode ? <Check className="w-4 h-4" /> : <GripHorizontal className="w-4 h-4" />}
            <span className="text-sm font-medium">{isDragMode ? 'Xong' : 'Sắp xếp'}</span>
          </button>

          <div className="relative" ref={configRef}>
            <button 
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              disabled={isDragMode}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${isConfigOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'} ${isDragMode ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-sm font-medium">Tùy chỉnh</span>
            </button>

            {isConfigOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-20 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                   <span className="font-semibold text-slate-800 text-sm">Hiển thị Widget</span>
                   <button onClick={() => setIsConfigOpen(false)} className="text-slate-400 hover:text-slate-600">
                     <X className="w-4 h-4" />
                   </button>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {[
                    { key: 'showNotifications', label: 'Thông báo' },
                    { key: 'showSales', label: 'Thẻ Doanh số' },
                    { key: 'showCost', label: 'Thẻ Chi phí' },
                    { key: 'showProfit', label: 'Thẻ Lợi nhuận' },
                    { key: 'showRevenue', label: 'Thẻ Doanh thu' },
                    { key: 'showMyTasks', label: 'Việc cần làm của tôi' },
                    { key: 'showBirthdays', label: 'Sinh nhật sắp tới' },
                    { key: 'showDueTasks', label: 'Nhiệm vụ sắp đến hạn (All)' },
                    { key: 'showKPIChart', label: 'Biểu đồ KPI' },
                    ...(canViewEvaluation ? [{ key: 'showEvaluationChart', label: 'Biểu đồ Đánh giá KI' }] : []),
                    { key: 'showTaskChart', label: 'Biểu đồ Công việc' },
                    { key: 'showProjectChart', label: 'Biểu đồ Dự án' },
                    { key: 'showCategoryChart', label: 'Biểu đồ Danh mục' },
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => toggleConfig(item.key as keyof typeof DEFAULT_CONFIG)}
                      className="flex items-center justify-between w-full p-2 rounded hover:bg-slate-50 text-sm"
                    >
                      <span className="text-slate-600">{item.label}</span>
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${config[item.key as keyof typeof DEFAULT_CONFIG] ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                        {config[item.key as keyof typeof DEFAULT_CONFIG] && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${isDragMode ? 'gap-y-8' : ''}`}>
          {widgetOrder.map((id, index) => {
              const content = renderWidget(id);
              if (!content) return null;

              return (
                  <div 
                    key={id}
                    className={`${getWidgetSpan(id)} relative transition-all duration-200 ${isDragMode ? 'cursor-move ring-2 ring-dashed ring-indigo-300 rounded-xl hover:bg-slate-50' : ''} ${draggedItem === index ? 'opacity-40 scale-95' : ''}`}
                    draggable={isDragMode}
                    onDragStart={(e) => onDragStart(e, index)}
                    onDragOver={(e) => onDragOver(e)}
                    onDrop={(e) => onDrop(e, index)}
                  >
                      {isDragMode && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full z-10 flex items-center gap-1 shadow-sm font-medium">
                              <Move className="w-3 h-3" /> Kéo để di chuyển
                          </div>
                      )}
                      {content}
                  </div>
              );
          })}
      </div>
      
      {/* Empty State if everything hidden */}
      {!Object.values(config).some(v => v) && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-100 rounded-xl border border-dashed border-slate-300">
           <Settings className="w-10 h-10 mb-2 opacity-50" />
           <p>Bạn đã ẩn tất cả các widget.</p>
           <button onClick={() => setConfig(DEFAULT_CONFIG)} className="mt-2 text-indigo-600 hover:underline text-sm font-medium">Khôi phục mặc định</button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
