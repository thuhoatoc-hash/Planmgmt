import React, { useState, useMemo } from 'react';
import { Project, Contract, Category, User, ContractType } from '../types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, Filter, Calendar, BarChart3, PieChart as PieChartIcon, User as UserIcon, TrendingUp } from 'lucide-react';

interface ReportsProps {
  projects: Project[];
  contracts: Contract[];
  categories: Category[];
  users: User[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#FF6B6B'];

const Reports: React.FC<ReportsProps> = ({ projects, contracts, categories, users }) => {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'COST' | 'AM' | 'TREND'>('GENERAL');
  
  // Date Filter State
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]); // First day of year
  const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]); // Last day of year

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

  // --- REPORT 1: GENERAL (Revenue, Sales, Cost by Project) ---
  const generalData = useMemo(() => {
    return projects.map(p => {
        const pContracts = filteredContracts.filter(c => c.projectId === p.id);
        const sales = pContracts.filter(c => c.type === ContractType.OUTPUT && c.status !== 'CANCELLED').reduce((sum, c) => sum + c.value, 0);
        const revenue = pContracts.filter(c => c.type === ContractType.OUTPUT && c.status === 'COMPLETED').reduce((sum, c) => sum + c.value, 0);
        const cost = pContracts.filter(c => c.type === ContractType.INPUT && c.status !== 'CANCELLED').reduce((sum, c) => sum + c.value, 0);
        return {
            projectName: p.name,
            projectCode: p.code,
            sales,
            revenue,
            cost,
            profit: sales - cost // Profit = Sales - Cost
        };
    }).filter(d => d.sales > 0 || d.cost > 0 || d.revenue > 0).sort((a,b) => b.sales - a.sales);
  }, [projects, filteredContracts]);

  // --- REPORT 2: COST ANALYSIS ---
  const costData = useMemo(() => {
     // Aggregate by Leaf Category or Parent Category? Let's do Parent Category for Chart
     const costMap: Record<string, number> = {};
     
     filteredContracts.filter(c => c.type === ContractType.INPUT && c.status !== 'CANCELLED').forEach(c => {
         const cat = categories.find(cat => cat.id === c.categoryId);
         if (cat) {
             const parent = cat.parentId ? categories.find(p => p.id === cat.parentId) : cat;
             const key = parent ? parent.name : 'Khác';
             costMap[key] = (costMap[key] || 0) + c.value;
         }
     });

     return Object.entries(costMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value);
  }, [filteredContracts, categories]);

  // --- REPORT 3: AM PERFORMANCE ---
  const amData = useMemo(() => {
      const amMap: Record<string, { amName: string, sales: number, revenue: number }> = {};
      
      // Initialize AMs
      users.filter(u => u.username.includes('am') || u.role === 'USER').forEach(u => {
          amMap[u.id] = { amName: u.fullName, sales: 0, revenue: 0 };
      });

      // Iterate contracts to fill data
      filteredContracts.filter(c => c.type === ContractType.OUTPUT).forEach(c => {
          const project = projects.find(p => p.id === c.projectId);
          if (project && project.amId && amMap[project.amId]) {
              if (c.status !== 'CANCELLED') amMap[project.amId].sales += c.value;
              if (c.status === 'COMPLETED') amMap[project.amId].revenue += c.value;
          }
      });

      return Object.values(amMap).filter(d => d.sales > 0 || d.revenue > 0).sort((a,b) => b.sales - a.sales);
  }, [filteredContracts, projects, users]);

  // --- REPORT 4: TREND ANALYSIS ---
  const trendData = useMemo(() => {
      const trendMap: Record<string, { date: string, sales: number, revenue: number, cost: number }> = {};
      
      filteredContracts.forEach(c => {
          const d = new Date(c.signedDate);
          // Format YYYY-MM
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          
          if (!trendMap[key]) {
              trendMap[key] = { date: key, sales: 0, revenue: 0, cost: 0 };
          }

          if (c.type === ContractType.OUTPUT && c.status !== 'CANCELLED') {
              trendMap[key].sales += c.value;
              if (c.status === 'COMPLETED') {
                 trendMap[key].revenue += c.value;
              }
          } else if (c.type === ContractType.INPUT && c.status !== 'CANCELLED') {
              trendMap[key].cost += c.value;
          }
      });

      return Object.values(trendMap).sort((a,b) => a.date.localeCompare(b.date));
  }, [filteredContracts]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Báo cáo & Thống kê</h1>
           <p className="text-slate-500">Phân tích hiệu quả hoạt động kinh doanh (LN = Doanh số - Chi phí)</p>
        </div>
        <div className="flex gap-2">
             <button 
                onClick={() => {
                    if(activeTab === 'GENERAL') exportToCSV(generalData, `Bao_Cao_Tong_Hop_${startDate}_${endDate}`);
                    if(activeTab === 'COST') exportToCSV(costData, `Bao_Cao_Chi_Phi_${startDate}_${endDate}`);
                    if(activeTab === 'AM') exportToCSV(amData, `Bao_Cao_AM_${startDate}_${endDate}`);
                    if(activeTab === 'TREND') exportToCSV(trendData, `Bao_Cao_Xu_Huong_${startDate}_${endDate}`);
                }}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm font-medium"
             >
                <Download className="w-4 h-4" /> Xuất Excel
             </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
         <div className="flex items-center gap-2 text-slate-700 font-medium">
            <Filter className="w-5 h-5 text-slate-500" />
            Bộ lọc:
         </div>
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
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="flex gap-4 min-w-max">
          {[
            { id: 'GENERAL', label: 'Tổng hợp Dự án', icon: BarChart3 },
            { id: 'TREND', label: 'Xu hướng (Trend)', icon: TrendingUp },
            { id: 'COST', label: 'Phân tích Chi phí', icon: PieChartIcon },
            { id: 'AM', label: 'Hiệu quả AM', icon: UserIcon },
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
         {/* --- GENERAL REPORT --- */}
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
         
         {/* --- TREND REPORT --- */}
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
                 
                 <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                        <h3 className="font-bold text-slate-800">Chi tiết số liệu theo Tháng</h3>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3">Tháng</th>
                                <th className="px-6 py-3 text-right">Doanh số (Ký)</th>
                                <th className="px-6 py-3 text-right">Doanh thu (NT)</th>
                                <th className="px-6 py-3 text-right">Chi phí</th>
                                <th className="px-6 py-3 text-right">Chênh lệch (DS - CP)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {trendData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 font-medium text-slate-800">{row.date}</td>
                                    <td className="px-6 py-3 text-right text-indigo-600">{formatCurrency(row.sales)}</td>
                                    <td className="px-6 py-3 text-right text-emerald-600">{formatCurrency(row.revenue)}</td>
                                    <td className="px-6 py-3 text-right text-rose-600">{formatCurrency(row.cost)}</td>
                                    <td className={`px-6 py-3 text-right font-medium ${row.sales - row.cost >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                        {formatCurrency(row.sales - row.cost)}
                                    </td>
                                </tr>
                            ))}
                            {trendData.length === 0 && (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Không có dữ liệu</td></tr>
                            )}
                        </tbody>
                    </table>
                 </div>
             </div>
         )}

         {/* --- COST REPORT --- */}
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

         {/* --- AM REPORT --- */}
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

                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                        <h3 className="font-bold text-slate-800">Chi tiết số liệu theo Nhân sự (AM)</h3>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3">Tên Nhân sự (AM)</th>
                                <th className="px-6 py-3 text-right">Tổng Doanh số (Ký HĐ)</th>
                                <th className="px-6 py-3 text-right">Tổng Doanh thu (Nghiệm thu)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {amData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 font-medium text-slate-800 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                                            {row.amName.charAt(0)}
                                        </div>
                                        {row.amName}
                                    </td>
                                    <td className="px-6 py-3 text-right text-indigo-600 font-medium">{formatCurrency(row.sales)}</td>
                                    <td className="px-6 py-3 text-right text-emerald-600 font-medium">{formatCurrency(row.revenue)}</td>
                                </tr>
                            ))}
                            {amData.length === 0 && (
                                <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">Chưa có dữ liệu</td></tr>
                            )}
                        </tbody>
                    </table>
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};

export default Reports;