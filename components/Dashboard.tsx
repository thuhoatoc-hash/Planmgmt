
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Project, Contract, ContractType, KPIMonthlyData, Task, User, TaskStatus, InstallmentStatus, EmployeeEvaluation, BirthdayEvent, Role, Notification, NotificationPriority, AttendanceRecord, AttendanceStatusConfig, ApprovalStatus, OvertimeType, NotificationType, Category } from '../types';
import { TrendingUp, Activity, Settings, Move, GripHorizontal, Bell, Clock, ChevronLeft, ChevronRight, PartyPopper, BarChart3, ClipboardList, CheckSquare, Gift, Award, AlertTriangle, CheckCircle } from 'lucide-react';

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
  attendanceRecords?: AttendanceRecord[]; 
  attendanceStatuses?: AttendanceStatusConfig[]; 
  onUpdateAttendanceRecord?: (r: AttendanceRecord) => void;
  onNavigate?: (path: string, id?: string) => void;
}

// Default configuration for visibility
const DEFAULT_CONFIG = {
  showBusinessStats: true,
  showKPI: true,
  showTaskOverview: true,
  showEvaluationOverview: true,
  showMyTasks: true,
  showBirthdays: true,
  showNotifications: true,
  showAttendanceList: true,
};

// Widget Definitions for Drag and Drop
type WidgetType = 'notifications' | 'kpi' | 'attendance_list' | 'birthdays' | 'my_tasks' | 'business_stats' | 'evaluation_overview' | 'task_overview';

const DEFAULT_ORDER: WidgetType[] = [
    'notifications',
    'kpi', 
    'attendance_list',
    'birthdays', 
    'my_tasks', 
    'business_stats',
    'evaluation_overview',
    'task_overview'
];

const Dashboard: React.FC<DashboardProps> = ({ 
    currentUser, projects, contracts, kpiData = [], tasks = [], users = [], 
    evaluations = [], events = [], notifications = [], 
    attendanceRecords = [], attendanceStatuses = [],
    onNavigate 
}) => {
  // State for customization
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const configRef = useRef<HTMLDivElement>(null);

  // Drag and Drop State
  const [isDragMode, setIsDragMode] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<WidgetType[]>(DEFAULT_ORDER);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  // Pagination States
  const [notifPage, setNotifPage] = useState(1);
  const [attPage, setAttPage] = useState(1);
  const ITEMS_PER_PAGE_NOTIF = 3;
  const ITEMS_PER_PAGE_ATT = 3;

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    let totalRevenue = 0; let totalSales = 0; let totalCost = 0;
    projects.forEach(p => {
      const pContracts = contracts.filter(c => c.projectId === p.id);
      const sales = pContracts.filter(c => c.type === ContractType.OUTPUT && c.status !== 'CANCELLED').reduce((acc, curr) => acc + curr.value, 0);
      const rev = pContracts.filter(c => c.type === ContractType.OUTPUT && c.status !== 'CANCELLED').reduce((acc, c) => {
            if (c.installments && c.installments.length > 0) {
                const validInstallments = c.installments.filter(i => i.status === InstallmentStatus.INVOICED || i.status === InstallmentStatus.PAID);
                return acc + validInstallments.reduce((sum, i) => sum + i.value, 0);
            } else { return acc + (c.status === 'COMPLETED' ? c.value : 0); }
        }, 0);
      const cost = pContracts.filter(c => c.type === ContractType.INPUT && c.status !== 'CANCELLED').reduce((acc, curr) => acc + curr.value, 0);
      totalRevenue += rev; totalSales += sales; totalCost += cost;
    });
    return { totalRevenue, totalSales, totalCost, profit: totalSales - totalCost };
  }, [projects, contracts]);

  const sortedNotifications = useMemo(() => {
      return [...notifications].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notifications]);

  // Load config
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('pm_dashboard_config_v5');
      if (savedConfig) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) });
      const savedOrder = localStorage.getItem('pm_dashboard_order_v5'); 
      if (savedOrder) {
          const parsedOrder = JSON.parse(savedOrder);
          const validOrder = parsedOrder.filter((id: string) => DEFAULT_ORDER.includes(id as WidgetType));
          const missing = DEFAULT_ORDER.filter(id => !validOrder.includes(id));
          setWidgetOrder([...missing, ...validOrder]); 
      } else { setWidgetOrder(DEFAULT_ORDER); }
    } catch (e) { console.error(e); }
  }, []);

  const handleOrderChange = (newOrder: WidgetType[]) => {
      setWidgetOrder(newOrder);
      localStorage.setItem('pm_dashboard_order_v5', JSON.stringify(newOrder));
  };

  const onDragStart = (e: React.DragEvent, index: number) => { setDraggedItem(index); e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); };
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

  const handleWidgetClick = (path: string, e: React.MouseEvent) => {
      // Prevent navigation if clicking on pagination buttons or drag handles
      if ((e.target as HTMLElement).closest('button')) return;
      if (isDragMode) return;
      
      if (onNavigate) onNavigate(path);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);

  // --- WIDGET RENDERERS ---

  const renderNotifications = () => {
      const totalPages = Math.ceil(sortedNotifications.length / ITEMS_PER_PAGE_NOTIF);
      const currentNotifications = sortedNotifications.slice((notifPage - 1) * ITEMS_PER_PAGE_NOTIF, notifPage * ITEMS_PER_PAGE_NOTIF);

      return (
          <div 
            onClick={(e) => handleWidgetClick('notifications', e)}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col relative overflow-hidden cursor-pointer hover:border-indigo-300 transition-colors"
          >
              <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                      <Bell className="w-4 h-4 text-[#EE0033]" /> Thông báo mới
                  </h3>
                  {sortedNotifications.length > 0 && (
                      <div className="flex items-center gap-1 text-xs">
                          <button 
                              onClick={(e) => { e.stopPropagation(); setNotifPage(Math.max(1, notifPage - 1)); }}
                              disabled={notifPage === 1}
                              className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
                          >
                              <ChevronLeft className="w-3 h-3" />
                          </button>
                          <span className="text-slate-500">{notifPage}/{totalPages}</span>
                          <button 
                              onClick={(e) => { e.stopPropagation(); setNotifPage(Math.min(totalPages, notifPage + 1)); }}
                              disabled={notifPage === totalPages}
                              className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
                          >
                              <ChevronRight className="w-3 h-3" />
                          </button>
                      </div>
                  )}
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2">
                  {currentNotifications.length === 0 ? (
                      <div className="text-center text-slate-400 py-4 text-xs italic">Không có thông báo nào.</div>
                  ) : (
                      currentNotifications.map(notif => {
                          const isCelebration = notif.type === NotificationType.CELEBRATION;
                          
                          let styleClass = 'bg-red-50 border-red-100'; 
                          if (isCelebration) {
                              styleClass = 'bg-pink-50 border-pink-200';
                          } else if (notif.priority === NotificationPriority.NORMAL) {
                              styleClass = 'bg-slate-50 border-slate-100';
                          } else if (notif.priority === NotificationPriority.IMPORTANT) {
                              styleClass = 'bg-amber-50 border-amber-200';
                          }

                          return (
                              <div key={notif.id} className={`p-3 rounded-lg border ${styleClass} relative flex flex-col group`}>
                                  <div className="flex justify-between items-start mb-1">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                          {isCelebration ? <PartyPopper className="w-4 h-4 text-pink-500 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
                                          <h4 className="font-bold text-sm truncate text-slate-800">
                                              {isCelebration ? 'Sự kiện: ' : 'Thông báo: '}
                                              {notif.title}
                                          </h4>
                                      </div>
                                      <span className="text-[10px] text-slate-500 shrink-0 ml-2">{new Date(notif.createdAt).toLocaleDateString('vi-VN')}</span>
                                  </div>
                                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{notif.content}</p>
                                  {notif.imageUrl && (
                                      <div className="mt-2 w-full h-24 rounded-lg overflow-hidden border border-slate-200/50">
                                          <img src={notif.imageUrl} alt="attachment" className="w-full h-full object-cover" />
                                      </div>
                                  )}
                              </div>
                          );
                      })
                  )}
              </div>
          </div>
      );
  };

  const renderKPICard = () => {
      // Calculate latest month's score
      const sortedKpi = [...kpiData].sort((a,b) => b.month.localeCompare(a.month));
      const latestData = sortedKpi[0];
      
      let totalScore = 0;
      let completedItems = 0;
      let totalItems = 0;

      if (latestData) {
          latestData.groups.forEach(group => {
              let groupTarget = group.target || 0;
              let groupActual = group.actual || 0;
              if (group.autoCalculate) {
                  groupTarget = group.items.reduce((s, i) => s + (i.target || 0), 0);
                  groupActual = group.items.reduce((s, i) => s + (i.actual || 0), 0);
              }
              if (group.weight) {
                  const percent = groupTarget > 0 ? (groupActual / groupTarget) * 100 : 0;
                  const capped = Math.min(percent, 120);
                  totalScore += (capped * group.weight) / 100;
              }
              group.items.forEach(i => {
                  if (i.weight && i.target > 0) {
                      const p = (i.actual / i.target) * 100;
                      const c = Math.min(p, 120);
                      totalScore += (c * i.weight) / 100;
                  }
                  
                  // Count Completion stats
                  if (i.target > 0 || i.weight > 0) {
                      totalItems++;
                      const p = i.target > 0 ? (i.actual / i.target) : 0;
                      if (p >= 1) { // 100% or more
                          completedItems++;
                      }
                  }
              });
          });
      }

      const incompleteItems = totalItems - completedItems;

      return (
          <div 
            onClick={(e) => handleWidgetClick('kpi', e)}
            className="bg-[#0f172a] p-6 rounded-xl border border-slate-800 shadow-sm h-full flex flex-col text-white relative overflow-hidden cursor-pointer hover:border-slate-600 transition-colors"
          >
              <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full border-8 border-slate-700/30"></div>
              <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full border-8 border-slate-600/30"></div>
              
              <div className="relative z-10 h-full flex flex-col justify-center">
                  <h3 className="text-sm font-medium text-slate-300 uppercase mb-2">ĐIỂM KPI THÁNG {latestData?.month || '...'}</h3>
                  <div className="text-6xl font-bold mb-4 tracking-tight">{totalScore.toFixed(2)}</div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-auto">
                      <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                          <div>
                              <div className="text-xl font-bold">{completedItems}/{totalItems}</div>
                              <div className="text-[10px] text-slate-400 uppercase">Hoàn thành</div>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-orange-400" />
                          <div>
                              <div className="text-xl font-bold">{incompleteItems}/{totalItems}</div>
                              <div className="text-[10px] text-slate-400 uppercase">Chưa đạt</div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderAttendanceList = () => {
      const todayStr = new Date().toISOString().split('T')[0];
      // Filter Approved Records for Today
      const approvedList = attendanceRecords?.filter(r => r.date === todayStr && r.approvalStatus === ApprovalStatus.APPROVED) || [];
      
      const totalPages = Math.ceil(approvedList.length / ITEMS_PER_PAGE_ATT);
      const currentList = approvedList.slice((attPage - 1) * ITEMS_PER_PAGE_ATT, attPage * ITEMS_PER_PAGE_ATT);

      return (
          <div 
            onClick={(e) => handleWidgetClick('attendance', e)}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col cursor-pointer hover:border-indigo-300 transition-colors"
          >
              <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-indigo-600" /> Chấm công & OT Hôm nay
                  </h3>
                  {approvedList.length > 0 && (
                      <div className="flex items-center gap-1 text-xs">
                          <button onClick={(e) => {e.stopPropagation(); setAttPage(Math.max(1, attPage - 1))}} disabled={attPage === 1} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"><ChevronLeft className="w-3 h-3" /></button>
                          <span className="text-slate-500">{attPage}/{totalPages}</span>
                          <button onClick={(e) => {e.stopPropagation(); setAttPage(Math.min(totalPages, attPage + 1))}} disabled={attPage === totalPages} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"><ChevronRight className="w-3 h-3" /></button>
                      </div>
                  )}
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto">
                  {currentList.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs italic">Chưa có nhân sự nào được duyệt chấm công hôm nay.</div>
                  ) : (
                      currentList.map(record => {
                          const user = users?.find(u => u.id === record.userId);
                          const status = attendanceStatuses?.find(s => s.id === record.statusId);
                          return (
                              <div key={record.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                                      {user?.fullName.charAt(0)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <div className="font-bold text-slate-800 text-xs truncate">{user?.fullName}</div>
                                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                          <span>{record.startTime} - {record.endTime}</span>
                                          {record.overtime !== OvertimeType.NONE && <span className="text-purple-600 font-bold">• OT {record.overtimeHours}h</span>}
                                      </div>
                                  </div>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${status?.color || 'bg-slate-200'}`}>
                                      {status?.name}
                                  </span>
                              </div>
                          );
                      })
                  )}
              </div>
          </div>
      );
  };

  const renderBirthdays = () => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const next7Days = new Date(today);
      next7Days.setDate(today.getDate() + 7);

      const birthdays = events.filter(e => {
          const dob = new Date(e.date);
          // Check current year
          const currentYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
          // Check next year (for late Dec -> early Jan case)
          const nextYearBirthday = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
          
          return (currentYearBirthday >= today && currentYearBirthday <= next7Days) ||
                 (nextYearBirthday >= today && nextYearBirthday <= next7Days);
      }).sort((a,b) => {
          // Sort relative to today is complex, simpler:
          return new Date(a.date).getDate() - new Date(b.date).getDate(); 
      });

      return (
          <div 
            onClick={(e) => handleWidgetClick('events', e)}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col cursor-pointer hover:border-indigo-300 transition-colors"
          >
              <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                  <Gift className="w-4 h-4 text-pink-500" /> Sinh nhật sắp tới (7 ngày)
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2">
                  {birthdays.length === 0 ? <p className="text-slate-400 text-xs italic text-center py-4">Không có sinh nhật nào trong 7 ngày tới.</p> :
                      birthdays.map(e => (
                          <div key={e.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-pink-100">
                              <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-xs shrink-0">
                                  {new Date(e.date).getDate()}/{new Date(e.date).getMonth()+1}
                              </div>
                              <div className="min-w-0">
                                  <div className="font-bold text-slate-800 text-xs truncate">{e.fullName}</div>
                                  <div className="text-[10px] text-slate-500 truncate">{e.title}</div>
                              </div>
                          </div>
                      ))
                  }
              </div>
          </div>
      );
  };

  const renderMyTasks = () => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const next7Days = new Date(today);
      next7Days.setDate(today.getDate() + 7);

      const myTasks = tasks.filter(t => {
          if (t.status === TaskStatus.COMPLETED || t.status === TaskStatus.CANCELLED) return false;
          const deadline = new Date(t.deadline);
          // Is assigned to me OR assigned by me
          const isRelated = t.assigneeId === currentUser?.id || t.assignerId === currentUser?.id;
          return isRelated && deadline >= today && deadline <= next7Days;
      }).sort((a,b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

      return (
          <div 
            onClick={(e) => handleWidgetClick('tasks', e)}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col cursor-pointer hover:border-indigo-300 transition-colors"
          >
              <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                  <CheckSquare className="w-4 h-4 text-blue-600" /> Việc cần làm (7 ngày tới)
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2">
                  {myTasks.length === 0 ? <p className="text-slate-400 text-xs italic text-center py-4">Bạn không có công việc gấp trong 7 ngày tới.</p> : 
                      myTasks.map(t => {
                          const isAssignedToMe = t.assigneeId === currentUser?.id;
                          return (
                              <div key={t.id} className="p-2 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors">
                                  <div className="flex justify-between items-start mb-1">
                                      <h4 className="font-bold text-slate-800 text-xs truncate flex-1">{t.name}</h4>
                                      {new Date(t.deadline).getTime() < new Date().getTime() && <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 ml-1" />}
                                  </div>
                                  <div className="flex justify-between text-[10px] text-slate-500">
                                      <span>{new Date(t.deadline).toLocaleDateString('vi-VN')}</span>
                                      <span className={`px-1.5 py-0.5 rounded ${isAssignedToMe ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                          {isAssignedToMe ? 'Được giao' : 'Đã giao'}
                                      </span>
                                  </div>
                              </div>
                          );
                      })
                  }
              </div>
          </div>
      );
  };

  const renderBusinessStats = () => {
      return (
          <div 
            onClick={(e) => handleWidgetClick('projects', e)}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full cursor-pointer hover:border-indigo-300 transition-colors"
          >
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                  <BarChart3 className="w-4 h-4 text-indigo-600" /> Số liệu kinh doanh lũy kế năm
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-full">
                  <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100 flex flex-col justify-center">
                      <div className="text-xs text-indigo-600 font-bold uppercase mb-1">Tổng Doanh số</div>
                      <div className="text-lg font-bold text-indigo-900 truncate">{formatCurrency(stats.totalSales)}</div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex flex-col justify-center">
                      <div className="text-xs text-emerald-600 font-bold uppercase mb-1">Doanh thu (NT)</div>
                      <div className="text-lg font-bold text-emerald-900 truncate">{formatCurrency(stats.totalRevenue)}</div>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-lg border border-rose-100 flex flex-col justify-center">
                      <div className="text-xs text-rose-600 font-bold uppercase mb-1">Tổng Chi phí</div>
                      <div className="text-lg font-bold text-rose-900 truncate">{formatCurrency(stats.totalCost)}</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex flex-col justify-center">
                      <div className="text-xs text-blue-600 font-bold uppercase mb-1">Lợi nhuận</div>
                      <div className={`text-lg font-bold truncate ${stats.profit >= 0 ? 'text-blue-900' : 'text-orange-600'}`}>{formatCurrency(stats.profit)}</div>
                  </div>
              </div>
          </div>
      );
  };

  const renderEvaluationOverview = () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const currentEvals = evaluations.filter(e => e.month === currentMonth);
      
      const gradeCounts = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0 };
      currentEvals.forEach(e => {
          if (gradeCounts[e.grade as keyof typeof gradeCounts] !== undefined) {
              gradeCounts[e.grade as keyof typeof gradeCounts]++;
          }
      });

      const data = Object.entries(gradeCounts).map(([name, value]) => ({ name, value }));

      return (
          <div 
            onClick={(e) => handleWidgetClick('evaluation', e)}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col cursor-pointer hover:border-indigo-300 transition-colors"
          >
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                  <Award className="w-4 h-4 text-yellow-500" /> Tổng hợp Đánh giá KI ({currentMonth})
              </h3>
              <div className="flex-1 min-h-[200px]">
                  {currentEvals.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" tick={{fontSize: 12}} />
                              <YAxis allowDecimals={false} tick={{fontSize: 12}} />
                              <Tooltip />
                              <Bar dataKey="value" name="Số lượng" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={30}>
                                {data.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={['#ca8a04', '#16a34a', '#2563eb', '#ea580c', '#dc2626'][index]} />
                                ))}
                              </Bar>
                          </BarChart>
                      </ResponsiveContainer>
                  ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">Chưa có dữ liệu đánh giá tháng này.</div>
                  )}
              </div>
          </div>
      );
  };

  const renderTaskOverview = () => {
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
      
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
          return diffDays >= 0 && diffDays <= 2;
      }).length;

      return (
          <div 
            onClick={(e) => handleWidgetClick('tasks', e)}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full cursor-pointer hover:border-indigo-300 transition-colors"
          >
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                  <ClipboardList className="w-4 h-4 text-slate-500" /> Quản lý Nhiệm vụ
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center h-full items-center">
                  <div>
                      <div className="text-2xl font-bold text-slate-800">{total}</div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold mt-1">Tổng số</div>
                  </div>
                  <div>
                      <div className="text-2xl font-bold text-emerald-600">{completed}</div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold mt-1">Hoàn thành</div>
                  </div>
                  <div>
                      <div className="text-2xl font-bold text-orange-600">{dueSoon}</div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold mt-1">Sắp đến hạn</div>
                  </div>
                  <div>
                      <div className="text-2xl font-bold text-red-600">{late}</div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold mt-1">Quá hạn</div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header and Controls */}
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
           <p className="text-slate-500">Tổng quan hoạt động kinh doanh</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setIsDragMode(!isDragMode)}
                className={`p-2 rounded-lg transition-colors ${isDragMode ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                title="Sắp xếp giao diện"
            >
                <Move className="w-5 h-5" />
            </button>
            <div className="relative" ref={configRef}>
                <button onClick={() => setIsConfigOpen(!isConfigOpen)} className="p-2 bg-white text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                    <Settings className="w-5 h-5" />
                </button>
                {/* Config Dropdown */}
                {isConfigOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 z-50 p-4">
                        <h4 className="font-bold text-slate-700 mb-3">Hiển thị Widget</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {Object.keys(DEFAULT_CONFIG).map(key => (
                                <label key={key} className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1 rounded">
                                    <span className="text-sm text-slate-600">{key.replace('show', '')}</span>
                                    <div 
                                        className={`w-9 h-5 rounded-full p-0.5 cursor-pointer transition-colors ${config[key as keyof typeof DEFAULT_CONFIG] ? 'bg-green-500' : 'bg-slate-300'}`}
                                        onClick={() => setConfig({...config, [key]: !config[key as keyof typeof DEFAULT_CONFIG]})}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${config[key as keyof typeof DEFAULT_CONFIG] ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* DRAG AND DROP GRID */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${isDragMode ? 'bg-slate-100/50 p-4 rounded-xl border-2 border-dashed border-slate-300' : ''}`}>
          {widgetOrder.map((widgetId, index) => {
              if (
                  (widgetId === 'notifications' && !config.showNotifications) || 
                  (widgetId === 'kpi' && !config.showKPI) ||
                  (widgetId === 'attendance_list' && !config.showAttendanceList) ||
                  (widgetId === 'birthdays' && !config.showBirthdays) ||
                  (widgetId === 'my_tasks' && !config.showMyTasks) ||
                  (widgetId === 'business_stats' && !config.showBusinessStats) ||
                  (widgetId === 'evaluation_overview' && !config.showEvaluationOverview) ||
                  (widgetId === 'task_overview' && !config.showTaskOverview)
              ) return null;

              // Widget Wrapper
              return (
                  <div
                    key={widgetId}
                    draggable={isDragMode}
                    onDragStart={(e) => onDragStart(e, index)}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, index)}
                    className={`${isDragMode ? 'cursor-move opacity-90 scale-95 ring-2 ring-indigo-400 rounded-xl' : ''} transition-all duration-200 
                        ${['kpi', 'business_stats', 'notifications', 'task_overview'].includes(widgetId) ? 'md:col-span-2 lg:col-span-2' : 'col-span-1'}
                        ${['attendance_list', 'birthdays', 'my_tasks', 'evaluation_overview'].includes(widgetId) ? 'h-full' : ''}
                    `}
                  >
                      {/* Drag Handle Overlay */}
                      {isDragMode && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 rounded-xl">
                              <GripHorizontal className="w-8 h-8 text-indigo-600" />
                          </div>
                      )}

                      {/* Content Render */}
                      {widgetId === 'notifications' && renderNotifications()}
                      {widgetId === 'kpi' && renderKPICard()}
                      {widgetId === 'attendance_list' && renderAttendanceList()}
                      {widgetId === 'birthdays' && renderBirthdays()}
                      {widgetId === 'my_tasks' && renderMyTasks()}
                      {widgetId === 'business_stats' && renderBusinessStats()}
                      {widgetId === 'evaluation_overview' && renderEvaluationOverview()}
                      {widgetId === 'task_overview' && renderTaskOverview()}
                  </div>
              );
          })}
      </div>
    </div>
  );
};

export default Dashboard;
