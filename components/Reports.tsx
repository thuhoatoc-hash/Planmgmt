
import React, { useState, useMemo } from 'react';
import { Project, Contract, Category, User, ContractType, Task, TaskStatus, InstallmentStatus, AttendanceRecord, AttendanceType, OvertimeType, AttendanceStatusConfig } from '../types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, Filter, Calendar, BarChart3, PieChart as PieChartIcon, User as UserIcon, TrendingUp, CheckSquare, Clock } from 'lucide-react';

interface ReportsProps {
  projects: Project[];
  contracts: Contract[];
  categories: Category[];
  users: User[];
  tasks?: Task[]; 
  attendanceRecords?: AttendanceRecord[];
  attendanceStatuses?: AttendanceStatusConfig[]; // Added Prop
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#FF6B6B'];

const Reports: React.FC<ReportsProps> = ({ projects, contracts, categories, users, tasks = [], attendanceRecords = [], attendanceStatuses = [] }) => {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'COST' | 'AM' | 'TREND' | 'TASKS' | 'ATTENDANCE'>('GENERAL');
  
  // Date Filter State
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]); // First day of year
  const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]); // Last day of year
  
  // Attendance Specific State
  const [attendanceMonth, setAttendanceMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [attendanceSubTab, setAttendanceSubTab] = useState<'MATRIX' | 'DETAIL' | 'SUMMARY'>('MATRIX');
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('');

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);

  // Helper: Export to CSV
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    
    // Get headers
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

  // --- FILTER DATA ---
  const filteredContracts = useMemo(() => {
    return contracts.filter(c => c.signedDate >= startDate && c.signedDate <= endDate);
  }, [contracts, startDate, endDate]);

  const filteredTasks = useMemo(() => {
      return tasks.filter(t => t.deadline >= startDate && t.deadline <= endDate);
  }, [tasks, startDate, endDate]);

  const filteredAttendance = useMemo(() => {
      // Filter by Month string match (YYYY-MM)
      return attendanceRecords.filter(r => r.date.startsWith(attendanceMonth) && (filterEmployeeId === '' || r.userId === filterEmployeeId));
  }, [attendanceRecords, attendanceMonth, filterEmployeeId]);

  // --- ATTENDANCE REPORT DATA ---
  const getStatusConfig = (id: string) => attendanceStatuses.find(s => s.id === id);

  const attendanceMatrix = useMemo(() => {
      if (attendanceSubTab !== 'MATRIX') return [];
      
      const [year, month] = attendanceMonth.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const days = Array.from({length: daysInMonth}, (_, i) => i + 1);

      return users.map(user => {
          const userRecords = filteredAttendance.filter(r => r.userId === user.id);
          const row: any = { id: user.id, name: user.fullName };
          
          days.forEach(day => {
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const record = userRecords.find(r => r.date === dateStr);
              
              if (record) {
                  const status = getStatusConfig(record.statusId);
                  let symbol = '✔'; // Default Present
                  
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
                  
                  if (record.overtime !== 'NONE') {
                      symbol += '+OT';
                  }
                  row[`day_${day}`] = symbol;
              } else {
                  row[`day_${day}`] = '';
              }
          });
          return row;
      });
  }, [users, filteredAttendance, attendanceMonth, attendanceSubTab, attendanceStatuses]);

  const attendanceSummary = useMemo(() => {
      if (attendanceSubTab !== 'SUMMARY') return [];
      
      return users.map(user => {
          const userRecords = filteredAttendance.filter(r => r.userId === user.id);
          
          let totalWorkDays = 0; // Present + Late + Visit + WFH
          let totalLeaveDays = 0; // Leave + Sick
          let totalOTHours = 0;
          let visitDays = 0;

          userRecords.forEach(r => {
              const status = getStatusConfig(r.statusId);
              const type = status?.type || 'PRESENT';

              if (type === 'LEAVE' || type === 'SICK') {
                  totalLeaveDays++;
              } else {
                  totalWorkDays++; // Assume valid work day
                  if (type === 'CUSTOMER_VISIT') visitDays++;
              }

              if (r.overtime !== 'NONE') {
                  totalOTHours += (r.overtimeHours || 0);
              }
          });
          
          return {
              name: user.fullName,
              totalWorkDays,
              totalLeaveDays,
              visitDays,
              totalOTHours
          };
      }).filter(u => (u.totalWorkDays + u.totalLeaveDays) > 0 || filterEmployeeId); // Show only if active or explicitly filtered
  }, [users, filteredAttendance, attendanceSubTab, filterEmployeeId, attendanceStatuses]);


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
            { id: 'TASKS', label: 'Thống kê Nhiệm vụ', icon: CheckSquare },
          ].map(tab => (
             <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-[#EE0033] text-[#EE0033]' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
             >
               <tab.icon className="w-4 h-4" />
               {tab.label}
             </button>
          ))}
        </nav>
      </div>

      {/* Report Content */}
      <div className="min-h-[500px]">
         
         {/* --- ATTENDANCE REPORT --- */}
         {activeTab === 'ATTENDANCE' && (
             <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                 {/* Sub Tabs */}
                 <div className="flex gap-2 p-1 bg-slate-100 w-fit rounded-lg">
                     {[
                         { id: 'MATRIX', label: 'Bảng chấm công tháng' },
                         { id: 'DETAIL', label: 'Nhật ký chi tiết' },
                         { id: 'SUMMARY', label: 'Tổng hợp ngày công' },
                     ].map(sub => (
                         <button
                            key={sub.id}
                            onClick={() => setAttendanceSubTab(sub.id as any)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                                attendanceSubTab === sub.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                            }`}
                         >
                             {sub.label}
                         </button>
                     ))}
                 </div>

                 {attendanceSubTab === 'MATRIX' && (
                     <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                         <div className="p-3 bg-slate-50 text-xs text-slate-500 flex gap-4 border-b border-slate-200">
                             <div className="flex items-center gap-1"><span className="text-emerald-500 font-bold">✔</span> Có mặt</div>
                             <div className="flex items-center gap-1"><span className="text-yellow-600 font-bold">M</span> Đi muộn</div>
                             <div className="flex items-center gap-1"><span className="text-red-600 font-bold">P</span> Nghỉ phép</div>
                             <div className="flex items-center gap-1"><span className="text-blue-600 font-bold">CT</span> Công tác</div>
                             <div className="flex items-center gap-1"><span className="text-purple-600 font-bold">OT</span> Tăng ca</div>
                         </div>
                         <div className="overflow-x-auto">
                             <table className="w-full text-xs text-center border-collapse">
                                 <thead>
                                     <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                                         <th className="px-4 py-3 text-left font-bold border-r border-slate-200 sticky left-0 bg-slate-50 z-10 w-40">Nhân viên</th>
                                         {Array.from({length: new Date(parseInt(attendanceMonth.split('-')[0]), parseInt(attendanceMonth.split('-')[1]), 0).getDate()}, (_, i) => i + 1).map(d => (
                                             <th key={d} className="w-10 py-3 border-r border-slate-100 min-w-[32px]">{d}</th>
                                         ))}
                                     </tr>
                                 </thead>
                                 <tbody>
                                     {attendanceMatrix.map((row: any) => (
                                         <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                                             <td className="px-4 py-2 text-left font-medium border-r border-slate-200 sticky left-0 bg-white z-10 whitespace-nowrap">{row.name}</td>
                                             {Array.from({length: new Date(parseInt(attendanceMonth.split('-')[0]), parseInt(attendanceMonth.split('-')[1]), 0).getDate()}, (_, i) => i + 1).map(d => (
                                                 <td key={d} className="border-r border-slate-100 py-1 font-bold">
                                                     {row[`day_${d}`].includes('P') || row[`day_${d}`].includes('O') && !row[`day_${d}`].includes('OT') ? 
                                                        <span className="text-red-500">{row[`day_${d}`]}</span> :
                                                        (row[`day_${d}`].includes('OT') ? 
                                                            <span className="text-purple-600 text-[9px]">{row[`day_${d}`]}</span> : 
                                                            <span className="text-slate-700">{row[`day_${d}`]}</span>
                                                        )
                                                     }
                                                 </td>
                                             ))}
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>
                     </div>
                 )}

                 {attendanceSubTab === 'DETAIL' && (
                     <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                         <table className="w-full text-sm text-left">
                             <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                 <tr>
                                     <th className="px-6 py-3">Ngày</th>
                                     <th className="px-6 py-3">Nhân viên</th>
                                     <th className="px-6 py-3">Loại hình</th>
                                     <th className="px-6 py-3">Giờ làm việc</th>
                                     <th className="px-6 py-3">OT</th>
                                     <th className="px-6 py-3">Ghi chú</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                                 {filteredAttendance.map(record => {
                                     const status = getStatusConfig(record.statusId);
                                     return (
                                     <tr key={record.id} className="hover:bg-slate-50">
                                         <td className="px-6 py-3 whitespace-nowrap">{new Date(record.date).toLocaleDateString('vi-VN')}</td>
                                         <td className="px-6 py-3 font-medium text-slate-800">{users.find(u => u.id === record.userId)?.fullName}</td>
                                         <td className="px-6 py-3">
                                             <span className={`px-2 py-1 rounded text-xs font-medium ${status?.color || 'bg-slate-100'}`}>
                                                 {status?.name || '---'}
                                             </span>
                                         </td>
                                         <td className="px-6 py-3">
                                             {record.startTime && record.endTime ? `${record.startTime} - ${record.endTime}` : '-'}
                                         </td>
                                         <td className="px-6 py-3">
                                             {record.overtime !== 'NONE' ? (
                                                 <span className="text-purple-600 font-medium bg-purple-50 px-2 py-1 rounded-full text-xs">
                                                     {record.overtimeHours}h
                                                 </span>
                                             ) : '-'}
                                         </td>
                                         <td className="px-6 py-3 text-slate-500 max-w-xs truncate" title={record.note}>
                                             {record.note || ''}
                                         </td>
                                     </tr>
                                 )})}
                                 {filteredAttendance.length === 0 && (
                                     <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Không có dữ liệu</td></tr>
                                 )}
                             </tbody>
                         </table>
                     </div>
                 )}

                 {attendanceSubTab === 'SUMMARY' && (
                     <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                         <table className="w-full text-sm text-left">
                             <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                 <tr>
                                     <th className="px-6 py-3">Nhân viên</th>
                                     <th className="px-6 py-3 text-center">Tổng ngày đi làm</th>
                                     <th className="px-6 py-3 text-center">Ngày nghỉ (P/O)</th>
                                     <th className="px-6 py-3 text-center">Đi công tác</th>
                                     <th className="px-6 py-3 text-center">Tổng giờ OT</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                                 {attendanceSummary.map((row, idx) => (
                                     <tr key={idx} className="hover:bg-slate-50">
                                         <td className="px-6 py-3 font-medium text-slate-800">{row.name}</td>
                                         <td className="px-6 py-3 text-center font-bold text-indigo-600">{row.totalWorkDays}</td>
                                         <td className="px-6 py-3 text-center text-red-600">{row.totalLeaveDays}</td>
                                         <td className="px-6 py-3 text-center text-blue-600">{row.visitDays}</td>
                                         <td className="px-6 py-3 text-center font-bold text-purple-600">{row.totalOTHours}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     </div>
                 )}
             </div>
         )}

         {/* --- GENERAL REPORT (Existing) --- */}
         {activeTab === 'GENERAL' && (
             <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                 {/* Chart */}
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-96">
                    <h3 className="font-bold text-slate-700 mb-4">Biểu đồ Doanh số - Doanh thu - Chi phí</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={generalData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="projectCode" tick={{fontSize: 12, fill: '#64748b'}} />
                            <YAxis tickFormatter={(val) => `${(val/1e9).toFixed(0)} tỷ`} width={60} tick={{fontSize: 12, fill: '#64748b'}} />
                            <Tooltip 
                              formatter={(value: number) => formatCurrency(value)} 
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend />
                            <Bar dataKey="sales" name="Doanh số (Ký)" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
                            <Bar dataKey="revenue" name="Doanh thu (NT)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                            <Bar dataKey="cost" name="Chi phí" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                 </div>

                 {/* Table */}
                 <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                        <h3 className="font-bold text-slate-800">Chi tiết số liệu theo Dự án</h3>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3">Mã DA</th>
                                <th className="px-6 py-3">Tên Dự án</th>
                                <th className="px-6 py-3 text-right">Doanh số (Ký)</th>
                                <th className="px-6 py-3 text-right">Doanh thu (NT)</th>
                                <th className="px-6 py-3 text-right">Chi phí</th>
                                <th className="px-6 py-3 text-right">Lợi nhuận (DS - CP)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {generalData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 font-mono text-slate-600">{row.projectCode}</td>
                                    <td className="px-6 py-3 font-medium text-slate-800">{row.projectName}</td>
                                    <td className="px-6 py-3 text-right text-indigo-600">{formatCurrency(row.sales)}</td>
                                    <td className="px-6 py-3 text-right text-emerald-600">{formatCurrency(row.revenue)}</td>
                                    <td className="px-6 py-3 text-right text-rose-600">{formatCurrency(row.cost)}</td>
                                    <td className={`px-6 py-3 text-right font-bold ${row.profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                        {formatCurrency(row.profit)}
                                    </td>
                                </tr>
                            ))}
                            {generalData.length === 0 && (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Không có dữ liệu trong khoảng thời gian này</td></tr>
                            )}
                        </tbody>
                        <tfoot className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                            <tr>
                                <td colSpan={2} className="px-6 py-3 text-right">Tổng cộng:</td>
                                <td className="px-6 py-3 text-right text-indigo-700">{formatCurrency(generalData.reduce((a,b) => a + b.sales, 0))}</td>
                                <td className="px-6 py-3 text-right text-emerald-700">{formatCurrency(generalData.reduce((a,b) => a + b.revenue, 0))}</td>
                                <td className="px-6 py-3 text-right text-rose-700">{formatCurrency(generalData.reduce((a,b) => a + b.cost, 0))}</td>
                                <td className="px-6 py-3 text-right text-blue-700">{formatCurrency(generalData.reduce((a,b) => a + b.profit, 0))}</td>
                            </tr>
                        </tfoot>
                    </table>
                 </div>
             </div>
         )}
         
         {/* ... (Other existing reports: Trend, Cost, AM, Tasks) ... */}
         {activeTab === 'TREND' && (
             <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-96">
                    <h3 className="font-bold text-slate-700 mb-4">Xu hướng Doanh số & Chi phí theo tháng</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} />
                            <YAxis tickFormatter={(val) => `${(val/1e9).toFixed(0)} tỷ`} width={60} tick={{fontSize: 12, fill: '#64748b'}} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Legend />
                            <Line type="monotone" dataKey="sales" name="Doanh số (Ký)" stroke="#6366f1" strokeWidth={2} dot={{r: 4}} activeDot={{r: 6}} />
                            <Line type="monotone" dataKey="revenue" name="Doanh thu (NT)" stroke="#10b981" strokeWidth={2} dot={{r: 4}} activeDot={{r: 6}} />
                            <Line type="monotone" dataKey="cost" name="Chi phí" stroke="#f43f5e" strokeWidth={2} dot={{r: 4}} activeDot={{r: 6}} />
                        </LineChart>
                    </ResponsiveContainer>
                 </div>
             </div>
         )}

         {activeTab === 'COST' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-4">Cơ cấu Chi phí</h3>
                    <div className="h-80 flex justify-center">
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
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                 </div>
                 <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm h-full">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                        <h3 className="font-bold text-slate-800">Chi tiết theo loại Chi phí</h3>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3">Loại Chi phí</th>
                                <th className="px-6 py-3 text-right">Giá trị</th>
                                <th className="px-6 py-3 text-right">Tỷ trọng</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {costData.map((row, idx) => {
                                const total = costData.reduce((a,b) => a + b.value, 0);
                                return (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 font-medium text-slate-800 flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                                            {row.name}
                                        </td>
                                        <td className="px-6 py-3 text-right text-slate-700">{formatCurrency(row.value)}</td>
                                        <td className="px-6 py-3 text-right text-slate-500">
                                            {total > 0 ? ((row.value / total) * 100).toFixed(1) : 0}%
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                 </div>
             </div>
         )}

         {activeTab === 'AM' && (
             <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-96">
                    <h3 className="font-bold text-slate-700 mb-4">Hiệu quả kinh doanh theo AM</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={amData} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                            <XAxis type="number" tickFormatter={(val) => `${(val/1e9).toFixed(0)} tỷ`} tick={{fontSize: 12}} />
                            <YAxis dataKey="amName" type="category" width={150} tick={{fontSize: 12, fontWeight: 500}} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                            <Bar dataKey="sales" name="Doanh số (Ký)" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                            <Bar dataKey="revenue" name="Doanh thu (NT)" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                 </div>
             </div>
         )}

         {activeTab === 'TASKS' && (
             <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-96">
                        <h3 className="font-bold text-slate-700 mb-4">Tỷ lệ Hoàn thành Nhiệm vụ theo Nhân sự</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={taskReportData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{fontSize: 12}} />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="completed" name="Hoàn thành" stackId="a" fill="#10b981" barSize={30} />
                                <Bar dataKey="inProgress" name="Đang làm" stackId="a" fill="#3b82f6" barSize={30} />
                                <Bar dataKey="late" name="Quá hạn" stackId="a" fill="#ef4444" barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                     </div>
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};

export default Reports;
