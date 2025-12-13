
import React, { useState, useMemo, useEffect } from 'react';
import { Project, Contract, Category, User, ContractType, Task, TaskStatus, InstallmentStatus, AttendanceRecord, AttendanceStatusConfig, AttendanceSystemConfig } from '../types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, Filter, Calendar, BarChart3, PieChart as PieChartIcon, User as UserIcon, TrendingUp, CheckSquare, Clock } from 'lucide-react';
import { api } from '../services/api';

interface ReportsProps {
  projects: Project[];
  contracts: Contract[];
  categories: Category[];
  users: User[];
  tasks?: Task[]; 
  attendanceRecords?: AttendanceRecord[];
  attendanceStatuses?: AttendanceStatusConfig[]; 
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#FF6B6B'];

const Reports: React.FC<ReportsProps> = ({ projects, contracts, categories, users, tasks = [], attendanceRecords = [], attendanceStatuses = [] }) => {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'COST' | 'AM' | 'TREND' | 'TASKS' | 'ATTENDANCE'>('GENERAL');
  
  // Date Filter State
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]); 
  const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]); 
  
  // Attendance Specific State
  const [attendanceMonth, setAttendanceMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [attendanceSubTab, setAttendanceSubTab] = useState<'MATRIX' | 'DETAIL' | 'SUMMARY'>('MATRIX');
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('');
  const [attConfig, setAttConfig] = useState<AttendanceSystemConfig>({ defaultBehavior: 'PRESENT', workingDays: [1,2,3,4,5] });

  useEffect(() => {
      api.settings.getAttendanceConfig().then(cfg => {
          if(cfg) setAttConfig(cfg);
      });
  }, []);

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);

  // Helper: Export to CSV
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(fieldName => `"${row[fieldName]}"`).join(','))
    ].join('\r\n');

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  // Helper: Calculate duration in hours
  const getDurationInHours = (start?: string, end?: string): number => {
      if (!start || !end) return 0;
      const [h1, m1] = start.split(':').map(Number);
      const [h2, m2] = end.split(':').map(Number);
      let diff = (h2 + m2/60) - (h1 + m1/60);
      if (diff < 0) diff += 24; // Handle overnight (simple logic)
      return diff > 0 ? diff : 0;
  };

  // --- FILTER DATA ---
  const filteredContracts = useMemo(() => {
    return contracts.filter(c => c.signedDate >= startDate && c.signedDate <= endDate);
  }, [contracts, startDate, endDate]);

  const filteredTasks = useMemo(() => {
      return tasks.filter(t => t.deadline >= startDate && t.deadline <= endDate);
  }, [tasks, startDate, endDate]);

  const filteredAttendance = useMemo(() => {
      return attendanceRecords.filter(r => r.date.startsWith(attendanceMonth) && (filterEmployeeId === '' || r.userId === filterEmployeeId));
  }, [attendanceRecords, attendanceMonth, filterEmployeeId]);

  // --- ATTENDANCE REPORT DATA ---
  const getStatusConfig = (id: string) => attendanceStatuses.find(s => s.id === id);

  // Helper to count working days in month (excluding weekends)
  const countWorkingDaysInMonth = (year: number, month: number) => {
      const days = new Date(year, month, 0).getDate();
      let count = 0;
      for (let d = 1; d <= days; d++) {
          const dayOfWeek = new Date(year, month - 1, d).getDay(); // 0-6
          if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
      }
      return count;
  };

  const attendanceMatrix = useMemo(() => {
      if (attendanceSubTab !== 'MATRIX') return [];
      
      const [year, month] = attendanceMonth.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const days = Array.from({length: daysInMonth}, (_, i) => i + 1);

      return users.map(user => {
          const userRecords = filteredAttendance.filter(r => r.userId === user.id);
          const row: any = { id: user.id, name: user.fullName };
          
          days.forEach(day => {
              const dateObj = new Date(year, month - 1, day);
              const dayOfWeek = dateObj.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const record = userRecords.find(r => r.date === dateStr);
              
              if (record) {
                  const status = getStatusConfig(record.statusId);
                  let symbol = '✔'; 
                  if (status) {
                      switch(status.type) {
                          case 'LATE': symbol = 'M'; break;
                          case 'LEAVE': symbol = 'P'; break;
                          case 'SICK': symbol = 'O'; break;
                          case 'CUSTOMER_VISIT': symbol = 'CT'; break;
                          case 'WFH': symbol = 'W'; break;
                          default: symbol = '✔';
                      }
                  }
                  if (record.overtime !== 'NONE') symbol += '+OT';
                  row[`day_${day}`] = symbol;
              } else {
                  // No Record Logic based on Config
                  if (isWeekend) {
                      row[`day_${day}`] = ''; // Weekend is blank
                  } else {
                      // Weekday with no record
                      row[`day_${day}`] = attConfig.defaultBehavior === 'PRESENT' ? '✔' : 'X';
                  }
              }
          });
          return row;
      });
  }, [users, filteredAttendance, attendanceMonth, attendanceSubTab, attendanceStatuses, attConfig]);

  const attendanceSummary = useMemo(() => {
      if (attendanceSubTab !== 'SUMMARY') return [];
      const [year, month] = attendanceMonth.split('-').map(Number);
      const totalStandardDays = countWorkingDaysInMonth(year, month);
      const daysInMonth = new Date(year, month, 0).getDate();

      return users.map(user => {
          const userRecords = filteredAttendance.filter(r => r.userId === user.id);
          
          let effectiveWorkDays = 0; // Công thực tế (đã trừ nghỉ, cộng OT)
          let totalLeaveHours = 0;
          let totalOTHours = 0;
          let visitDays = 0;

          // Iterate through all days in month to calculate correctly
          for(let d=1; d<=daysInMonth; d++) {
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const record = userRecords.find(r => r.date === dateStr);
              const dayOfWeek = new Date(year, month - 1, d).getDay(); // 0-6
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

              let dayValue = 0;

              if (record) {
                  const status = getStatusConfig(record.statusId);
                  const type = status?.type || 'PRESENT';

                  // 1. BASE DAY VALUE
                  if (type === 'LEAVE' || type === 'SICK') {
                      // Calculate leave deduction (1 day = 8h)
                      const duration = getDurationInHours(record.startTime, record.endTime);
                      totalLeaveHours += duration;
                      const deduction = duration / 8;
                      
                      // Base is 1 for weekday, 0 for weekend. Deduct from base.
                      const baseDay = isWeekend ? 0 : 1;
                      dayValue = Math.max(0, baseDay - deduction);
                  } else {
                      // PRESENT, VISIT, LATE, WFH
                      if (type === 'CUSTOMER_VISIT') visitDays++;
                      // Standard day value
                      dayValue = isWeekend ? 0 : 1; 
                  }

                  // 2. ADD OT
                  if (record.overtime !== 'NONE' && record.overtimeHours && record.overtimeHours > 0) {
                      totalOTHours += record.overtimeHours;
                      // Add OT days (1 day = 8h)
                      dayValue += (record.overtimeHours / 8);
                  }

              } else {
                  // NO RECORD
                  if (!isWeekend) {
                      // If weekday and no record, check default behavior
                      if (attConfig.defaultBehavior === 'PRESENT') {
                          dayValue = 1;
                      }
                  }
              }
              
              effectiveWorkDays += dayValue;
          }
          
          return {
              name: user.fullName,
              totalWorkDays: effectiveWorkDays.toFixed(2), // Công thực tế
              standardDays: totalStandardDays,
              totalLeaveHours: totalLeaveHours.toFixed(1),
              visitDays,
              totalOTHours: totalOTHours.toFixed(1)
          };
      }).filter(u => parseFloat(u.totalWorkDays) > 0 || parseFloat(u.totalLeaveHours) > 0 || filterEmployeeId); 
  }, [users, filteredAttendance, attendanceSubTab, filterEmployeeId, attendanceStatuses, attConfig]);


  // ... (Existing Reports Data Logic) ...
  const generalData = useMemo(() => {
    return projects.map(p => {
        const pContracts = filteredContracts.filter(c => c.projectId === p.id);
        const sales = pContracts.filter(c => c.type === ContractType.OUTPUT && c.status !== 'CANCELLED').reduce((sum, c) => sum + c.value, 0);
        const revenue = pContracts.filter(c => c.type === ContractType.OUTPUT && c.status !== 'CANCELLED').reduce((sum, c) => {
            if (c.installments && c.installments.length > 0) {
                return sum + c.installments.filter(i => i.status === InstallmentStatus.INVOICED || i.status === InstallmentStatus.PAID).reduce((s, i) => s + i.value, 0);
            } else { return sum + (c.status === 'COMPLETED' ? c.value : 0); }
        }, 0);
        const cost = pContracts.filter(c => c.type === ContractType.INPUT && c.status !== 'CANCELLED').reduce((sum, c) => sum + c.value, 0);
        return { projectName: p.name, projectCode: p.code, sales, revenue, cost, profit: sales - cost };
    }).filter(d => d.sales > 0 || d.cost > 0 || d.revenue > 0).sort((a,b) => b.sales - a.sales);
  }, [projects, filteredContracts]);

  const costData = useMemo(() => {
     const costMap: Record<string, number> = {};
     filteredContracts.filter(c => c.type === ContractType.INPUT && c.status !== 'CANCELLED').forEach(c => {
         const cat = categories.find(cat => cat.id === c.categoryId);
         if (cat) {
             const parent = cat.parentId ? categories.find(p => p.id === cat.parentId) : cat;
             const key = parent ? parent.name : 'Khác';
             costMap[key] = (costMap[key] || 0) + c.value;
         }
     });
     return Object.entries(costMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [filteredContracts, categories]);

  const amData = useMemo(() => {
      const amMap: Record<string, { amName: string, sales: number, revenue: number }> = {};
      filteredContracts.filter(c => c.type === ContractType.OUTPUT).forEach(c => {
          const project = projects.find(p => p.id === c.projectId);
          if (project && project.amId) {
              const amId = project.amId;
              if (!amMap[amId]) {
                  const user = users.find(u => u.id === amId);
                  amMap[amId] = { amName: user ? user.fullName : 'Unknown AM', sales: 0, revenue: 0 };
              }
              if (c.status !== 'CANCELLED') amMap[amId].sales += c.value;
              if (c.status !== 'CANCELLED') {
                  let contractRevenue = 0;
                  if (c.installments && c.installments.length > 0) {
                      contractRevenue = c.installments.filter(i => i.status === InstallmentStatus.INVOICED || i.status === InstallmentStatus.PAID).reduce((sum, i) => sum + i.value, 0);
                  } else if (c.status === 'COMPLETED') contractRevenue = c.value;
                  amMap[amId].revenue += contractRevenue;
              }
          }
      });
      return Object.values(amMap).filter(d => d.sales > 0 || d.revenue > 0).sort((a,b) => b.sales - a.sales);
  }, [filteredContracts, projects, users]);

  const trendData = useMemo(() => {
      const trendMap: Record<string, { date: string, sales: number, revenue: number, cost: number }> = {};
      filteredContracts.forEach(c => {
          const d = new Date(c.signedDate);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!trendMap[key]) trendMap[key] = { date: key, sales: 0, revenue: 0, cost: 0 };
          if (c.type === ContractType.OUTPUT && c.status !== 'CANCELLED') {
              trendMap[key].sales += c.value;
              if (c.status === 'COMPLETED') trendMap[key].revenue += c.value;
          } else if (c.type === ContractType.INPUT && c.status !== 'CANCELLED') trendMap[key].cost += c.value;
      });
      return Object.values(trendMap).sort((a,b) => a.date.localeCompare(b.date));
  }, [filteredContracts]);

  const taskReportData = useMemo(() => {
      const assigneeMap: Record<string, { name: string, total: number, completed: number, late: number, inProgress: number }> = {};
      const today = new Date(); today.setHours(0,0,0,0);
      filteredTasks.forEach(t => {
          if (!assigneeMap[t.assigneeId]) {
              const user = users.find(u => u.id === t.assigneeId);
              assigneeMap[t.assigneeId] = { name: user ? user.fullName : 'Unknown', total: 0, completed: 0, late: 0, inProgress: 0 };
          }
          const entry = assigneeMap[t.assigneeId];
          entry.total += 1;
          if (t.status === TaskStatus.COMPLETED) entry.completed += 1;
          else {
              if (t.status === TaskStatus.IN_PROGRESS) entry.inProgress += 1;
              if (new Date(t.deadline) < today && t.status !== TaskStatus.CANCELLED) entry.late += 1;
          }
      });
      return Object.values(assigneeMap).filter(d => d.total > 0).sort((a,b) => b.total - a.total);
  }, [filteredTasks, users]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Báo cáo & Thống kê</h1>
           <p className="text-slate-500">Phân tích hiệu quả hoạt động kinh doanh, công việc và nhân sự</p>
        </div>
        <div className="flex gap-2">
             <button 
                onClick={() => {
                    if(activeTab === 'GENERAL') exportToCSV(generalData, `Bao_Cao_Tong_Hop`);
                    if(activeTab === 'COST') exportToCSV(costData, `Bao_Cao_Chi_Phi`);
                    if(activeTab === 'AM') exportToCSV(amData, `Bao_Cao_AM`);
                    if(activeTab === 'TREND') exportToCSV(trendData, `Bao_Cao_Xu_Huong`);
                    if(activeTab === 'TASKS') exportToCSV(taskReportData, `Bao_Cao_Nhiem_Vu`);
                    if(activeTab === 'ATTENDANCE') {
                        if (attendanceSubTab === 'DETAIL') exportToCSV(filteredAttendance, `Chi_Tiet_Cham_Cong`);
                        else exportToCSV(attendanceSummary, `Tong_Hop_Cham_Cong`);
                    }
                }}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm font-medium"
             >
                <Download className="w-4 h-4" /> Xuất Excel
             </button>
        </div>
      </div>

      {/* Main Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
         <div className="flex items-center gap-2 text-slate-700 font-medium">
            <Filter className="w-5 h-5 text-slate-500" />
            Bộ lọc:
         </div>
         
         {activeTab === 'ATTENDANCE' ? (
             <div className="flex items-center gap-4 w-full">
                 <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Tháng:</span>
                    <input 
                        type="month" 
                        className="border border-slate-200 rounded px-2 py-1 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-[#EE0033] outline-none"
                        value={attendanceMonth}
                        onChange={(e) => setAttendanceMonth(e.target.value)}
                    />
                 </div>
                 <div className="flex-1">
                     <select 
                        className="w-full md:w-64 px-3 py-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-[#EE0033]"
                        value={filterEmployeeId}
                        onChange={e => setFilterEmployeeId(e.target.value)}
                     >
                         <option value="">-- Tất cả nhân viên --</option>
                         {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                     </select>
                 </div>
             </div>
         ) : (
             <div className="flex items-center gap-2">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-4 w-4 text-slate-400" />
                    </div>
                    <input 
                        type="date" 
                        className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#EE0033] outline-none text-slate-600 font-medium" 
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                    />
                </div>
                <span className="text-slate-400">-</span>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-4 w-4 text-slate-400" />
                    </div>
                    <input 
                        type="date" 
                        className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#EE0033] outline-none text-slate-600 font-medium" 
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                    />
                </div>
             </div>
         )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="flex gap-4 min-w-max">
          {[
            { id: 'GENERAL', label: 'Tổng hợp Dự án', icon: BarChart3 },
            { id: 'ATTENDANCE', label: 'Chấm công', icon: Clock },
            { id: 'TREND', label: 'Xu hướng (Trend)', icon: TrendingUp },
            { id: 'COST', label: 'Phân tích Chi phí', icon: PieChartIcon },
            { id: 'AM', label: 'Hiệu quả AM', icon: UserIcon },
            { id: 'TASKS', label: 'Tiến độ Công việc', icon: CheckSquare },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id 
                ? 'border-[#EE0033] text-[#EE0033]' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* --- CONTENT AREA --- */}
      {activeTab === 'GENERAL' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm animate-in slide-in-from-bottom-2">
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                          <th className="px-6 py-4">Dự án</th>
                          <th className="px-6 py-4 text-right">Doanh số (Ký)</th>
                          <th className="px-6 py-4 text-right">Doanh thu (NT)</th>
                          <th className="px-6 py-4 text-right">Chi phí</th>
                          <th className="px-6 py-4 text-right">Lợi nhuận</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {generalData.map((d, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                              <td className="px-6 py-4 font-medium text-slate-800">
                                  <div className="flex flex-col">
                                      <span>{d.projectName}</span>
                                      <span className="text-xs text-slate-400 font-mono">{d.projectCode}</span>
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-right text-indigo-600 font-medium">{formatCurrency(d.sales)}</td>
                              <td className="px-6 py-4 text-right text-emerald-600 font-medium">{formatCurrency(d.revenue)}</td>
                              <td className="px-6 py-4 text-right text-rose-600 font-medium">{formatCurrency(d.cost)}</td>
                              <td className={`px-6 py-4 text-right font-bold ${d.profit >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>
                                  {formatCurrency(d.profit)}
                              </td>
                          </tr>
                      ))}
                      {generalData.length === 0 && (
                          <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Không có dữ liệu trong khoảng thời gian này.</td></tr>
                      )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold text-slate-700 border-t border-slate-200">
                      <tr>
                          <td className="px-6 py-4">TỔNG CỘNG</td>
                          <td className="px-6 py-4 text-right">{formatCurrency(generalData.reduce((a,b) => a + b.sales, 0))}</td>
                          <td className="px-6 py-4 text-right">{formatCurrency(generalData.reduce((a,b) => a + b.revenue, 0))}</td>
                          <td className="px-6 py-4 text-right">{formatCurrency(generalData.reduce((a,b) => a + b.cost, 0))}</td>
                          <td className="px-6 py-4 text-right">{formatCurrency(generalData.reduce((a,b) => a + b.profit, 0))}</td>
                      </tr>
                  </tfoot>
              </table>
          </div>
      )}

      {/* --- ATTENDANCE TAB --- */}
      {activeTab === 'ATTENDANCE' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-2">
              <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-lg w-fit">
                  <button 
                    onClick={() => setAttendanceSubTab('MATRIX')}
                    className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${attendanceSubTab === 'MATRIX' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                      Bảng chấm công
                  </button>
                  <button 
                    onClick={() => setAttendanceSubTab('SUMMARY')}
                    className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${attendanceSubTab === 'SUMMARY' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                      Tổng hợp công
                  </button>
                  <button 
                    onClick={() => setAttendanceSubTab('DETAIL')}
                    className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${attendanceSubTab === 'DETAIL' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                      Chi tiết dữ liệu
                  </button>
              </div>

              {attendanceSubTab === 'MATRIX' && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
                      <table className="w-full text-xs text-center border-collapse min-w-[1200px]">
                          <thead>
                              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                                  <th className="p-2 border-r border-slate-200 min-w-[150px] sticky left-0 bg-slate-100 z-10">Nhân viên</th>
                                  {Array.from({ length: new Date(parseInt(attendanceMonth.split('-')[0]), parseInt(attendanceMonth.split('-')[1]), 0).getDate() }, (_, i) => i + 1).map(d => (
                                      <th key={d} className={`p-2 border-r border-slate-200 min-w-[30px] ${[0,6].includes(new Date(parseInt(attendanceMonth.split('-')[0]), parseInt(attendanceMonth.split('-')[1])-1, d).getDay()) ? 'bg-red-50 text-red-600' : ''}`}>{d}</th>
                                  ))}
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {attendanceMatrix.map(row => (
                                  <tr key={row.id} className="hover:bg-slate-50">
                                      <td className="p-2 border-r border-slate-200 font-medium text-left sticky left-0 bg-white z-10">{row.name}</td>
                                      {Array.from({ length: new Date(parseInt(attendanceMonth.split('-')[0]), parseInt(attendanceMonth.split('-')[1]), 0).getDate() }, (_, i) => i + 1).map(d => (
                                          <td key={d} className="p-1 border-r border-slate-200 text-[10px]">
                                              {row[`day_${d}`]}
                                          </td>
                                      ))}
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}

              {attendanceSubTab === 'SUMMARY' && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                              <tr>
                                  <th className="px-6 py-4">Nhân viên</th>
                                  <th className="px-6 py-4 text-center">Ngày công chuẩn</th>
                                  <th className="px-6 py-4 text-center bg-green-50 text-green-700">Ngày công thực tế</th>
                                  <th className="px-6 py-4 text-center text-orange-600">Đi khách hàng (ngày)</th>
                                  <th className="px-6 py-4 text-center text-red-600">Nghỉ phép/ốm (giờ)</th>
                                  <th className="px-6 py-4 text-center text-purple-600">Làm thêm giờ (giờ)</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {attendanceSummary.map((row, i) => (
                                  <tr key={i} className="hover:bg-slate-50">
                                      <td className="px-6 py-4 font-medium text-slate-800">{row.name}</td>
                                      <td className="px-6 py-4 text-center">{row.standardDays}</td>
                                      <td className="px-6 py-4 text-center font-bold text-green-700 bg-green-50/50">{row.totalWorkDays}</td>
                                      <td className="px-6 py-4 text-center">{row.visitDays}</td>
                                      <td className="px-6 py-4 text-center">{row.totalLeaveHours}</td>
                                      <td className="px-6 py-4 text-center font-bold text-purple-700">{row.totalOTHours}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}

              {attendanceSubTab === 'DETAIL' && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                              <tr>
                                  <th className="px-6 py-4">Ngày</th>
                                  <th className="px-6 py-4">Nhân viên</th>
                                  <th className="px-6 py-4">Trạng thái</th>
                                  <th className="px-6 py-4">Thời gian</th>
                                  <th className="px-6 py-4">Ghi chú</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {filteredAttendance.sort((a,b) => b.date.localeCompare(a.date)).map((record) => {
                                  const user = users.find(u => u.id === record.userId);
                                  const status = attendanceStatuses.find(s => s.id === record.statusId);
                                  return (
                                      <tr key={record.id} className="hover:bg-slate-50">
                                          <td className="px-6 py-4 text-slate-500 font-mono text-xs">{record.date}</td>
                                          <td className="px-6 py-4 font-medium text-slate-800">{user?.fullName}</td>
                                          <td className="px-6 py-4">
                                              <span className={`px-2 py-1 rounded text-xs font-medium ${status?.color || 'bg-slate-100'}`}>
                                                  {status?.name}
                                              </span>
                                          </td>
                                          <td className="px-6 py-4 text-xs">
                                              {record.startTime} - {record.endTime}
                                              {record.overtime !== 'NONE' && <span className="ml-2 text-purple-600 font-bold">+ OT {record.overtimeHours}h</span>}
                                          </td>
                                          <td className="px-6 py-4 text-slate-500 truncate max-w-xs">{record.note}</td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
              )}
          </div>
      )}

      {/* --- OTHER TABS --- */}
      {activeTab === 'COST' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-96">
                  <h3 className="font-bold text-slate-700 mb-4">Cơ cấu Chi phí</h3>
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={costData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="value"
                          >
                              {costData.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend layout="vertical" verticalAlign="middle" align="right" />
                      </PieChart>
                  </ResponsiveContainer>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-96 overflow-y-auto">
                  <h3 className="font-bold text-slate-700 mb-4">Chi tiết theo Danh mục</h3>
                  <table className="w-full text-sm">
                      <tbody className="divide-y divide-slate-100">
                          {costData.map((item, i) => (
                              <tr key={i}>
                                  <td className="py-3 text-slate-600">{item.name}</td>
                                  <td className="py-3 text-right font-medium text-slate-800">{formatCurrency(item.value)}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {activeTab === 'AM' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-2">
              <h3 className="font-bold text-slate-700 mb-6">Hiệu quả Kinh doanh theo AM</h3>
              <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={amData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="amName" tick={{fontSize: 12}} />
                          <YAxis tickFormatter={(value) => `${(value/1e9).toFixed(0)} tỷ`} width={80} />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                          <Bar dataKey="sales" name="Doanh số Ký" fill="#6366f1" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="revenue" name="Doanh thu NT" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>
      )}

      {activeTab === 'TREND' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-2">
              <h3 className="font-bold text-slate-700 mb-6">Xu hướng Doanh số & Doanh thu theo tháng</h3>
              <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" />
                          <YAxis tickFormatter={(value) => `${(value/1e9).toFixed(0)} tỷ`} width={80} />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                          <Line type="monotone" dataKey="sales" name="Doanh số" stroke="#6366f1" strokeWidth={2} />
                          <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#10b981" strokeWidth={2} />
                          <Line type="monotone" dataKey="cost" name="Chi phí" stroke="#ef4444" strokeWidth={2} />
                      </LineChart>
                  </ResponsiveContainer>
              </div>
          </div>
      )}

      {activeTab === 'TASKS' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-2">
              <h3 className="font-bold text-slate-700 mb-6">Thống kê Nhiệm vụ theo Nhân sự</h3>
              <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={taskReportData} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12}} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="completed" name="Hoàn thành" stackId="a" fill="#10b981" />
                          <Bar dataKey="inProgress" name="Đang làm" stackId="a" fill="#3b82f6" />
                          <Bar dataKey="late" name="Trễ hạn" stackId="a" fill="#ef4444" />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>
      )}
    </div>
  );
};

export default Reports;
