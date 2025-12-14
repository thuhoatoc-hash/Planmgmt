
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { Project, Contract, ContractType, KPIMonthlyData, Task, User, TaskStatus, InstallmentStatus, EmployeeEvaluation, BirthdayEvent, Role, Notification, NotificationPriority, AttendanceRecord, AttendanceStatusConfig, ApprovalStatus, OvertimeType, NotificationType, Category } from '../types';
import { Settings, Move, GripHorizontal, Bell, Clock, ChevronLeft, ChevronRight, PartyPopper, BarChart3, ClipboardList, Gift, Award, AlertTriangle, Trophy, Smile, Meh, Frown, Activity, FolderOpen } from 'lucide-react';

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

// Updated Default Order: KPI -> Notif -> Tasks -> Business -> Attendance -> Birthday -> KI -> TaskMgmt
const DEFAULT_ORDER: WidgetType[] = [
    'kpi',                  // 1. Tổng hợp chỉ tiêu điều hành
    'notifications',        // 2. Thông báo
    'my_tasks',             // 3. Việc cần làm
    'business_stats',       // 4. Số liệu kinh doanh
    'attendance_list',      // 5. Chấm công
    'birthdays',            // 6. Sinh nhật
    'evaluation_overview',  // 7. KI (Biểu đồ)
    'task_overview'         // 8. Quản lý nhiệm vụ (Số liệu + Dự án)
];

const Dashboard: React.FC<DashboardProps> = ({ 
    currentUser, projects, contracts, kpiData = [], tasks = [], users = [], 
    evaluations = [], events = [], notifications = [], 
    attendanceRecords = [], attendanceStatuses = [],
    onNavigate 
}) => {
  // State for customization
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const configRef = useRef<HTMLDivElement>(null);

  // Drag and Drop State
  const [isDragMode, setIsDragMode] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<WidgetType[]>(DEFAULT_ORDER);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  // Pagination States
  const [notifPage, setNotifPage] = useState(1);
  const [attPage, setAttPage] = useState(1);
  const [taskPage, setTaskPage] = useState(1); 
  
  const ITEMS_PER_PAGE = 3; 

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    let totalRevenue = 0; let totalSales = 0; let totalCost = 0; let totalPlannedRevenue = 0;
    
    projects.forEach(p => {
      // Planned Revenue (from Project Plan)
      totalPlannedRevenue += (p.plannedRevenue || 0);

      const pContracts = contracts.filter(c => c.projectId === p.id);
      
      // Signed Sales (Contracts)
      const sales = pContracts.filter(c => c.type === ContractType.OUTPUT && c.status !== 'CANCELLED').reduce((acc, curr) => acc + curr.value, 0);
      
      // Realized Revenue (Installments Paid/Invoiced)
      const rev = pContracts.filter(c => c.type === ContractType.OUTPUT && c.status !== 'CANCELLED').reduce((acc, c) => {
            if (c.installments && c.installments.length > 0) {
                const validInstallments = c.installments.filter(i => i.status === InstallmentStatus.INVOICED || i.status === InstallmentStatus.PAID);
                return acc + validInstallments.reduce((sum, i) => sum + i.value, 0);
            } else { return acc + (c.status === 'COMPLETED' ? c.value : 0); }
        }, 0);
        
      // Cost
      const cost = pContracts.filter(c => c.type === ContractType.INPUT && c.status !== 'CANCELLED').reduce((acc, curr) => acc + curr.value, 0);
      
      totalRevenue += rev; totalSales += sales; totalCost += cost;
    });
    
    // Profit
    const profit = totalSales - totalCost;

    return { totalRevenue, totalSales, totalCost, profit, totalPlannedRevenue };
  }, [projects, contracts]);

  const sortedNotifications = useMemo(() => {
      return [...notifications].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notifications]);

  // Load config
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('pm_dashboard_config_v5');
      if (savedConfig) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) });
      
      // Use v10 key to force re-order
      const savedOrder = localStorage.getItem('pm_dashboard_order_v10'); 
      if (savedOrder) {
          const parsedOrder = JSON.parse(savedOrder);
          const validOrder = parsedOrder.filter((id: string) => DEFAULT_ORDER.includes(id as WidgetType));
          const missing = DEFAULT_ORDER.filter(id => !validOrder.includes(id));
          setWidgetOrder([...validOrder, ...missing]); 
      } else { setWidgetOrder(DEFAULT_ORDER); }
    } catch (e) { console.error(e); }
  }, []);

  const handleOrderChange = (newOrder: WidgetType[]) => {
      setWidgetOrder(newOrder);
      localStorage.setItem('pm_dashboard_order_v10', JSON.stringify(newOrder));
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
      if ((e.target as HTMLElement).closest('button')) return;
      if (isDragMode) return;
      if (onNavigate) onNavigate(path);
  };

  const formatCurrencyShort = (val: number) => {
      if (val >= 1000000000) return (val / 1000000000).toFixed(1).replace('.', ',') + ' tỷ';
      if (val >= 1000000) return (val / 1000000).toFixed(0).replace('.', ',') + ' Tr';
      return new Intl.NumberFormat('vi-VN').format(val);
  };

  const formatCurrencyFull = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);

  // --- WIDGET RENDERERS ---

  const renderNotifications = () => {
      const totalPages = Math.ceil(sortedNotifications.length / ITEMS_PER_PAGE);
      const currentNotifications = sortedNotifications.slice((notifPage - 1) * ITEMS_PER_PAGE, notifPage * ITEMS_PER_PAGE);

      return (
          <div 
            onClick={(e) => handleWidgetClick('notifications', e)}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden cursor-pointer hover:border-indigo-300 transition-colors h-full"
          >
              <div className="flex justify-between items-center mb-3 shrink-0">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                      <Bell className="w-4 h-4 text-[#EE0033]" /> Thông báo
                  </h3>
                  {sortedNotifications.length > ITEMS_PER_PAGE && (
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
              
              <div className="flex-1 space-y-2">
                  {currentNotifications.length === 0 ? (
                      <div className="text-center text-slate-400 py-4 text-xs italic">Không có thông báo nào.</div>
                  ) : (
                      currentNotifications.map(notif => {
                          const isCelebration = notif.type === NotificationType.CELEBRATION;
                          let styleClass = 'bg-red-50 border-red-100'; 
                          if (isCelebration) styleClass = 'bg-pink-50 border-pink-200';
                          else if (notif.priority === NotificationPriority.NORMAL) styleClass = 'bg-slate-50 border-slate-100';
                          else if (notif.priority === NotificationPriority.IMPORTANT) styleClass = 'bg-amber-50 border-amber-200';

                          return (
                              <div key={notif.id} className={`p-2 rounded-lg border ${styleClass} flex gap-2 group items-start`}>
                                  <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-start">
                                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                              {isCelebration ? <PartyPopper className="w-3.5 h-3.5 text-pink-500 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                                              <h4 className="font-bold text-xs truncate text-slate-800" title={notif.title}>
                                                  {isCelebration ? 'Sự kiện' : notif.title}
                                              </h4>
                                          </div>
                                          <span className="text-[9px] text-slate-500 shrink-0 ml-1">{new Date(notif.createdAt).toLocaleDateString('vi-VN')}</span>
                                      </div>
                                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-tight">
                                          {isCelebration ? notif.title + ' - ' : ''}{notif.content}
                                      </p>
                                  </div>
                                  {/* Update: Show thumbnail on the right if available */}
                                  {notif.imageUrl && (
                                      <div className="w-10 h-10 shrink-0 rounded-md overflow-hidden border border-black/5 bg-white">
                                          <img src={notif.imageUrl} alt="" className="w-full h-full object-cover" />
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
      const sortedKpi = [...kpiData].sort((a,b) => b.month.localeCompare(a.month));
      const latestData = sortedKpi[0];
      
      let totalScore = 0;
      let completedCount = 0;
      let totalCount = 0;

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
                  if (i.target > 0 || i.weight > 0) {
                      totalCount++;
                      const percent = i.target > 0 ? (i.actual / i.target) * 100 : 0;
                      if (percent >= 100) completedCount++;
                  }
              });
          });
      }

      let styleConfig = {
          bg: 'bg-[#1e293b]',
          text: 'text-white',
          subText: 'text-slate-300',
          iconClass: 'text-white',
          Icon: Activity,
          message: 'Hãy tiếp tục nỗ lực!'
      };

      if (latestData) {
          if (totalScore < 50) {
              styleConfig = { bg: 'bg-red-600', text: 'text-white', subText: 'text-red-100', iconClass: 'text-white', Icon: Frown, message: 'Cần nỗ lực nhiều hơn!' };
          } else if (totalScore < 80) {
              styleConfig = { bg: 'bg-yellow-500', text: 'text-white', subText: 'text-yellow-100', iconClass: 'text-white', Icon: Meh, message: 'Cố lên, hãy bứt phá!' };
          } else if (totalScore < 100) {
              styleConfig = { bg: 'bg-emerald-600', text: 'text-white', subText: 'text-emerald-100', iconClass: 'text-white', Icon: Smile, message: 'Sắp đạt rồi!' };
          } else {
              styleConfig = { bg: 'bg-pink-600', text: 'text-white', subText: 'text-pink-100', iconClass: 'text-white', Icon: Trophy, message: 'Xuất sắc!' };
          }
      }

      return (
          <div 
            onClick={(e) => handleWidgetClick('kpi', e)}
            className={`${styleConfig.bg} px-5 py-4 rounded-xl shadow-lg relative overflow-hidden cursor-pointer h-full flex flex-col group transition-transform hover:scale-[1.02] min-h-[180px]`}
          >
              <styleConfig.Icon className={`w-40 h-40 absolute -right-8 -bottom-8 ${styleConfig.iconClass} opacity-10 transform rotate-12`} />
              
              <div className="relative z-10 flex flex-col h-full w-full">
                  <div className="mb-2 shrink-0">
                      <h3 className={`text-[11px] font-bold uppercase tracking-widest ${styleConfig.subText} opacity-90 leading-none`}>
                          KPI GPCNTT THÁNG {latestData ? new Date(latestData.month).getMonth() + 1 : '--'}
                      </h3>
                  </div>
                  
                  <div className="flex-1 flex items-center justify-between w-full pr-1">
                      <div className={`text-7xl font-bold tracking-tighter leading-none ${styleConfig.text} -ml-1`}>
                          {totalScore.toFixed(2)}
                      </div>

                      <div className="flex flex-col gap-3 items-end">
                          <div className="text-right">
                              <div className={`${styleConfig.text} flex items-baseline justify-end gap-1 leading-none`}>
                                  <span className="text-2xl font-bold tracking-tight">{completedCount}</span>
                                  <span className="text-xs font-medium opacity-70">/{totalCount}</span>
                              </div>
                              <span className={`text-[9px] uppercase ${styleConfig.subText} font-bold opacity-80 mt-0.5 block`}>Hoàn thành</span>
                          </div>
                          <div className="text-right">
                              <div className={`${styleConfig.text} flex items-baseline justify-end gap-1 leading-none`}>
                                  <span className="text-2xl font-bold tracking-tight">{totalCount - completedCount}</span>
                                  <span className="text-xs font-medium opacity-70">/{totalCount}</span>
                              </div>
                              <span className={`text-[9px] uppercase ${styleConfig.subText} font-bold opacity-80 mt-0.5 block`}>Chưa đạt</span>
                          </div>
                      </div>
                  </div>

                  <div className="mt-2 shrink-0">
                      <p className={`text-sm italic font-medium ${styleConfig.text} opacity-90 line-clamp-1`}>
                          "{styleConfig.message}"
                      </p>
                  </div>
              </div>
          </div>
      );
  };

  const renderAttendanceList = () => {
      const today = new Date().toISOString().split('T')[0];
      const todayRecords = attendanceRecords.filter(r => r.date === today);
      const pendingCount = attendanceRecords.filter(r => r.approvalStatus === ApprovalStatus.PENDING).length;
      
      const totalPages = Math.ceil(todayRecords.length / ITEMS_PER_PAGE);
      const paginatedRecords = todayRecords.slice((attPage - 1) * ITEMS_PER_PAGE, attPage * ITEMS_PER_PAGE);

      return (
          <div 
            onClick={(e) => handleWidgetClick('attendance', e)}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col cursor-pointer hover:border-indigo-300 transition-colors h-full"
          >
              <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-purple-600" /> Chấm công hôm nay
                  </h3>
                  {currentUser?.role === 'ADMIN' && pendingCount > 0 ? (
                      <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                          {pendingCount} chờ duyệt
                      </span>
                  ) : (
                      todayRecords.length > ITEMS_PER_PAGE && (
                          <div className="flex items-center gap-1 text-xs">
                              <button onClick={(e) => {e.stopPropagation(); setAttPage(Math.max(1, attPage - 1))}} disabled={attPage === 1} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"><ChevronLeft className="w-3 h-3" /></button>
                              <span className="text-slate-500">{attPage}/{totalPages}</span>
                              <button onClick={(e) => {e.stopPropagation(); setAttPage(Math.min(totalPages, attPage + 1))}} disabled={attPage === totalPages} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"><ChevronRight className="w-3 h-3" /></button>
                          </div>
                      )
                  )}
              </div>
              <div className="flex-1 overflow-hidden relative">
                  {todayRecords.length === 0 ? (
                      <div className="text-center text-slate-400 text-xs py-4 italic">Chưa có dữ liệu chấm công hôm nay.</div>
                  ) : (
                      <div className="space-y-2">
                          {paginatedRecords.map(rec => {
                              const user = users?.find(u => u.id === rec.userId);
                              const status = attendanceStatuses?.find(s => s.id === rec.statusId);
                              return (
                                  <div key={rec.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded border border-slate-100">
                                      <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                              {user?.fullName.charAt(0)}
                                          </div>
                                          <div>
                                              <div className="font-bold text-slate-700">{user?.fullName}</div>
                                              <div className="text-[10px] text-slate-500">{rec.startTime || '--:--'} - {rec.endTime || '--:--'}</div>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${status?.color || 'bg-slate-200'}`}>{status?.name}</span>
                                          {rec.overtime !== OvertimeType.NONE && <div className="text-[10px] text-purple-600 font-bold mt-0.5">OT</div>}
                                      </div>
                                  </div>
                              )
                          })}
                      </div>
                  )}
              </div>
          </div>
      );
  };

  const renderBirthdays = () => {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      
      const upcomingBirthdays = users?.filter(u => {
          if (!u.dob) return false;
          const dob = new Date(u.dob);
          const currentYearDob = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
          if (currentYearDob < today) currentYearDob.setFullYear(today.getFullYear() + 1);
          return currentYearDob >= today && currentYearDob <= nextWeek;
      }) || [];

      const upcomingEvents = events?.filter(e => {
          const eDate = new Date(e.date);
          const currentYearEvent = new Date(today.getFullYear(), eDate.getMonth(), eDate.getDate());
          if (currentYearEvent < today) currentYearEvent.setFullYear(today.getFullYear() + 1);
          return currentYearEvent >= today && currentYearEvent <= nextWeek;
      }) || [];

      const allEvents = [...upcomingBirthdays.map(u => ({...u, isUser: true, date: u.dob})), ...upcomingEvents.map(e => ({...e, isUser: false}))];

      return (
          <div 
            onClick={(e) => handleWidgetClick('events', e)}
            className="bg-gradient-to-br from-pink-50 to-rose-100 p-4 rounded-xl border border-pink-200 shadow-sm flex flex-col cursor-pointer hover:border-pink-300 transition-colors h-full"
          >
              <h3 className="font-bold text-pink-800 flex items-center gap-2 text-sm mb-3">
                  <Gift className="w-4 h-4" /> Sinh nhật & Sự kiện (7 ngày)
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2">
                  {allEvents.length === 0 ? (
                      <div className="text-center text-pink-400 text-xs py-4 italic">Không có sự kiện sắp tới.</div>
                  ) : (
                      allEvents.map((e, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-white/60 p-2 rounded-lg">
                              <div className="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-pink-600">
                                  <PartyPopper className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="font-bold text-sm text-slate-700 truncate">{e.fullName}</div>
                                  <div className="text-xs text-slate-500">
                                      {new Date(e.date!).toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'})} - 
                                      <span className="italic ml-1">{(e as any).isUser ? 'Nhân viên' : (e as any).title}</span>
                                  </div>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      );
  };

  const renderMyTasks = () => {
      const myPendingTasks = tasks?.filter(t => 
          t.assigneeId === currentUser?.id && 
          t.status !== TaskStatus.COMPLETED && 
          t.status !== TaskStatus.CANCELLED
      ).sort((a,b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()) || [];

      const totalPages = Math.ceil(myPendingTasks.length / ITEMS_PER_PAGE);
      const paginatedTasks = myPendingTasks.slice((taskPage - 1) * ITEMS_PER_PAGE, taskPage * ITEMS_PER_PAGE);

      return (
          <div 
            onClick={(e) => handleWidgetClick('tasks', e)}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col cursor-pointer hover:border-indigo-300 transition-colors h-full"
          >
              <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                      <ClipboardList className="w-4 h-4 text-blue-600" /> Việc cần làm (7 ngày tới)
                  </h3>
                  {myPendingTasks.length > ITEMS_PER_PAGE && (
                      <div className="flex items-center gap-1 text-xs">
                          <button onClick={(e) => {e.stopPropagation(); setTaskPage(Math.max(1, taskPage - 1))}} disabled={taskPage === 1} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"><ChevronLeft className="w-3 h-3" /></button>
                          <span className="text-slate-500">{taskPage}/{totalPages}</span>
                          <button onClick={(e) => {e.stopPropagation(); setTaskPage(Math.min(totalPages, taskPage + 1))}} disabled={taskPage === totalPages} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"><ChevronRight className="w-3 h-3" /></button>
                      </div>
                  )}
              </div>
              
              <div className="flex-1 space-y-2">
                  {myPendingTasks.length === 0 ? (
                      <div className="text-center text-slate-400 text-xs py-4 italic">Bạn không có công việc tồn đọng.</div>
                  ) : (
                      paginatedTasks.map(task => {
                          const isLate = new Date(task.deadline) < new Date();
                          return (
                              <div key={task.id} className="flex items-start gap-2 p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-100">
                                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isLate ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                  <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-slate-700 truncate">{task.name}</div>
                                      <div className="text-[10px] text-slate-500 flex justify-between">
                                          <span>{new Date(task.deadline).toLocaleDateString('vi-VN')}</span>
                                          <span className={isLate ? 'text-red-500 font-bold' : ''}>{isLate ? 'Quá hạn' : 'Sắp đến hạn'}</span>
                                      </div>
                                  </div>
                              </div>
                          );
                      })
                  )}
              </div>
          </div>
      );
  };

  const renderBusinessStats = () => (
      <div 
        onClick={(e) => handleWidgetClick('projects', e)}
        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col cursor-pointer hover:border-indigo-300 transition-colors h-full"
      >
          <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm mb-4">
              <BarChart3 className="w-4 h-4 text-indigo-600" /> Số liệu kinh doanh lũy kế năm
          </h3>
          <div className="flex-1 grid grid-cols-2 gap-3">
              <div className="bg-indigo-50/50 p-2 rounded-lg flex flex-col justify-center border border-indigo-50">
                  <p className="text-[10px] font-bold text-indigo-700 uppercase mb-1">Tổng Doanh Số</p>
                  <p className="text-base font-bold text-slate-800 leading-tight" title={formatCurrencyFull(stats.totalSales)}>
                      {formatCurrencyShort(stats.totalSales)}
                  </p>
              </div>
              <div className="bg-emerald-50/50 p-2 rounded-lg flex flex-col justify-center border border-emerald-50">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1">Doanh Thu (NT)</p>
                  <p className="text-base font-bold text-slate-800 leading-tight" title={formatCurrencyFull(stats.totalRevenue)}>
                      {formatCurrencyShort(stats.totalRevenue)}
                  </p>
              </div>
              <div className="bg-rose-50/50 p-2 rounded-lg flex flex-col justify-center border border-rose-50">
                  <p className="text-[10px] font-bold text-rose-700 uppercase mb-1">Tổng Chi Phí</p>
                  <p className="text-base font-bold text-slate-800 leading-tight" title={formatCurrencyFull(stats.totalCost)}>
                      {formatCurrencyShort(stats.totalCost)}
                  </p>
              </div>
              <div className="bg-blue-50/50 p-2 rounded-lg flex flex-col justify-center border border-blue-50">
                  <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">Lợi Nhuận</p>
                  <p className="text-base font-bold text-slate-800 leading-tight" title={formatCurrencyFull(stats.profit)}>
                      {formatCurrencyShort(stats.profit)}
                  </p>
              </div>
          </div>
      </div>
  );

  const renderEvaluationOverview = () => {
      // Calculate grade distribution for current month
      const currentMonth = new Date().toISOString().slice(0, 7);
      const currentEvals = evaluations.filter(e => e.month === currentMonth);
      
      const distribution = {
          'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0
      };
      
      currentEvals.forEach(e => {
          if (distribution[e.grade] !== undefined) distribution[e.grade]++;
          else distribution['D']++; // Fallback
      });

      const data = [
          { name: 'A+', value: distribution['A+'], fill: '#eab308' },
          { name: 'A', value: distribution['A'], fill: '#22c55e' },
          { name: 'B', value: distribution['B'], fill: '#3b82f6' },
          { name: 'C', value: distribution['C'], fill: '#f97316' },
          { name: 'D', value: distribution['D'], fill: '#ef4444' },
      ];

      return (
          <div 
            onClick={(e) => handleWidgetClick('evaluation', e)}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col cursor-pointer hover:border-indigo-300 transition-colors h-full"
          >
              <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm mb-3">
                  <Award className="w-4 h-4 text-amber-500" /> Tổng hợp Đánh giá KI ({currentMonth})
              </h3>
              <div className="flex-1 w-full min-h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={24}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>
      );
  };

  const renderTaskOverview = () => {
      // Calculate Task Stats
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
      const today = new Date(); 
      today.setHours(0,0,0,0);
      
      const overdue = tasks.filter(t => 
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

      // Active Projects Count (Not completed 'st7')
      const activeProjects = projects.filter(p => p.statusId !== 'st7').length; 

      return (
          <div 
            onClick={(e) => handleWidgetClick('tasks', e)}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col cursor-pointer hover:border-indigo-300 transition-colors h-full justify-between"
          >
              <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                      <ClipboardList className="w-4 h-4 text-slate-500" /> Quản lý Nhiệm vụ
                  </h3>
                  <div className="bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border border-indigo-100">
                      <FolderOpen className="w-3 h-3" /> {activeProjects} Dự án đang chạy
                  </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 flex-1">
                  <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50">
                      <span className="text-2xl font-bold text-slate-700">{total}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase mt-1">TỔNG SỐ</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-emerald-50">
                      <span className="text-2xl font-bold text-emerald-600">{completed}</span>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase mt-1">HOÀN THÀNH</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-orange-50">
                      <span className="text-2xl font-bold text-orange-600">{dueSoon}</span>
                      <span className="text-[10px] font-bold text-orange-600 uppercase mt-1">SẮP ĐẾN HẠN</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-red-50">
                      <span className="text-2xl font-bold text-red-600">{overdue}</span>
                      <span className="text-[10px] font-bold text-red-600 uppercase mt-1">QUÁ HẠN</span>
                  </div>
              </div>
          </div>
      );
  };

  // --- MAIN RENDER ---
  return (
    <div className="space-y-6 animate-in fade-in pb-10">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
                <p className="text-slate-500">Xin chào, {currentUser?.fullName}!</p>
            </div>
            <button 
                onClick={() => setIsConfigOpen(!isConfigOpen)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
            >
                <Settings className="w-5 h-5" />
            </button>
        </div>

        {isConfigOpen && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 animate-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-700">Tùy chỉnh Dashboard</h3>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setIsDragMode(!isDragMode)}
                            className={`text-xs px-3 py-1.5 rounded border flex items-center gap-1 ${isDragMode ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-300'}`}
                        >
                            <Move className="w-3 h-3" /> {isDragMode ? 'Xong' : 'Sắp xếp'}
                        </button>
                        <button 
                            onClick={() => {
                                setWidgetOrder(DEFAULT_ORDER);
                                localStorage.removeItem('pm_dashboard_order_v10');
                            }}
                            className="text-xs px-3 py-1.5 rounded border bg-white text-slate-600 hover:text-red-600"
                        >
                            Mặc định
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-auto">
            {widgetOrder.map((widgetId, index) => {
                let content = null;
                let colSpan = 'col-span-1';
                
                // Assign Renderers & Spans
                switch (widgetId) {
                    case 'notifications': 
                        content = renderNotifications(); 
                        colSpan = 'col-span-1 md:col-span-2 lg:col-span-2'; 
                        break;
                    case 'kpi': 
                        content = renderKPICard(); 
                        break;
                    case 'attendance_list': content = renderAttendanceList(); break;
                    case 'birthdays': content = renderBirthdays(); break;
                    case 'my_tasks': content = renderMyTasks(); break;
                    case 'business_stats': content = renderBusinessStats(); break;
                    case 'evaluation_overview': content = renderEvaluationOverview(); break;
                    case 'task_overview': content = renderTaskOverview(); break;
                    default: return null;
                }

                // If Drag Mode is ON, wrap in draggable container
                if (isDragMode) {
                    return (
                        <div 
                            key={widgetId}
                            draggable
                            onDragStart={(e) => onDragStart(e, index)}
                            onDragOver={onDragOver}
                            onDrop={(e) => onDrop(e, index)}
                            className={`${colSpan} relative group cursor-move`}
                        >
                            <div className="absolute inset-0 bg-white/50 z-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity">
                                <GripHorizontal className="w-8 h-8 text-slate-400" />
                            </div>
                            <div className="pointer-events-none h-full">{content}</div>
                        </div>
                    );
                }

                return (
                    <div key={widgetId} className={`${colSpan} animate-in fade-in zoom-in duration-300`}>
                        {content}
                    </div>
                );
            })}
        </div>
    </div>
  );
};

export default Dashboard;
