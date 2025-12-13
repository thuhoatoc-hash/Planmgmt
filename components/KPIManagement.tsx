
import React, { useState, useMemo } from 'react';
import { KPIMonthlyData, KPIGroup, KPIItem, UserRole, User } from '../types';
import { TrendingUp, AlertCircle, Lock, Unlock, Plus, Trash2, PlusCircle, Copy, CheckSquare, Square, BarChart3, List, FileBarChart, Bell } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface KPIManagementProps {
  kpiData: KPIMonthlyData[];
  onUpdateKPI: (data: KPIMonthlyData) => void;
  user?: User | null;
}

// Extended types for view logic
interface CalculatedKPIItem extends KPIItem {
    percent: number;
    score: number;
}

interface CalculatedKPIGroup extends Omit<KPIGroup, 'items'> {
    target: number;
    actual: number;
    percent: number;
    score: number;
    items: CalculatedKPIItem[];
}

interface CalculatedData {
    groups: CalculatedKPIGroup[];
    totalScore: number;
    completed: number;
    total: number;
}

const KPIManagement: React.FC<KPIManagementProps> = ({ kpiData, onUpdateKPI, user }) => {
  const [activeTab, setActiveTab] = useState<'MONTHLY' | 'REPORT'>('MONTHLY');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [reportStartMonth, setReportStartMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [reportEndMonth, setReportEndMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [isEditMode, setIsEditMode] = useState(false);
  const [showTrend, setShowTrend] = useState(true);

  const isAdmin = user?.role === UserRole.ADMIN;

  const currentData = useMemo(() => {
    return kpiData.find(d => d.month === selectedMonth) || null;
  }, [kpiData, selectedMonth]);

  // --- REPORT AGGREGATION LOGIC ---
  const reportData = useMemo(() => {
    if (activeTab !== 'REPORT') return null;
    
    // Filter data in range
    const rangeData = kpiData.filter(d => d.month >= reportStartMonth && d.month <= reportEndMonth);
    
    if (rangeData.length === 0) return null;

    // Structure: Group Name -> { Group Totals, Items Map }
    const aggregation: Record<string, { 
        name: string, 
        unit: string,
        groupTarget: number,
        groupActual: number,
        items: Record<string, { name: string, unit: string, target: number, actual: number, count: number }> 
    }> = {};

    rangeData.forEach(monthData => {
        monthData.groups.forEach(group => {
            if (!aggregation[group.name]) {
                aggregation[group.name] = { 
                    name: group.name, 
                    unit: group.unit || '',
                    groupTarget: 0,
                    groupActual: 0,
                    items: {} 
                };
            }
            
            // Calculate Monthly Group Totals
            let monthGroupTarget = group.target || 0;
            let monthGroupActual = group.actual || 0;

            // Recalculate sums if autoCalculate is true (to ensure accuracy)
            if (group.autoCalculate) {
                monthGroupTarget = group.items.reduce((s, i) => s + (i.target || 0), 0);
                monthGroupActual = group.items.reduce((s, i) => s + (i.actual || 0), 0);
            }

            aggregation[group.name].groupTarget += monthGroupTarget;
            aggregation[group.name].groupActual += monthGroupActual;
            // Update unit if found later
            if (group.unit) aggregation[group.name].unit = group.unit;
            
            group.items.forEach(item => {
                // Key by name to aggregate across months
                if (!aggregation[group.name].items[item.name]) {
                    aggregation[group.name].items[item.name] = { 
                        name: item.name, 
                        unit: item.unit, 
                        target: 0, 
                        actual: 0,
                        count: 0
                    };
                }
                aggregation[group.name].items[item.name].target += (item.target || 0);
                aggregation[group.name].items[item.name].actual += (item.actual || 0);
                aggregation[group.name].items[item.name].count += 1;
            });
        });
    });

    return Object.values(aggregation).map(group => ({
        name: group.name,
        unit: group.unit,
        target: group.groupTarget,
        actual: group.groupActual,
        percent: group.groupTarget > 0 ? (group.groupActual / group.groupTarget) * 100 : 0,
        items: Object.values(group.items).map(item => ({
            ...item,
            percent: item.target > 0 ? (item.actual / item.target) * 100 : 0
        }))
    }));

  }, [kpiData, reportStartMonth, reportEndMonth, activeTab]);

  // --- CALCULATION HELPER ---
  const calculateScoreForMonth = (data: KPIMonthlyData) => {
      let totalScore = 0;
      data.groups.forEach(group => {
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
          });
      });
      return totalScore;
  };

  const trendData = useMemo(() => {
      return kpiData.map(d => ({
          month: d.month,
          score: calculateScoreForMonth(d)
      })).sort((a, b) => a.month.localeCompare(b.month));
  }, [kpiData]);

  const calculatedData: CalculatedData | null = useMemo(() => {
    if (!currentData) return null;

    let grandTotalScore = 0;
    let completedCount = 0;
    let totalItemsCount = 0;

    const processedGroups = currentData.groups.map(group => {
        let groupTarget = group.target || 0;
        let groupActual = group.actual || 0;
        
        if (group.autoCalculate) {
            groupTarget = group.items.reduce((sum, item) => sum + (item.target || 0), 0);
            groupActual = group.items.reduce((sum, item) => sum + (item.actual || 0), 0);
        }

        // Calculate percent independently of weight to ensure display for "Revenue" groups
        let groupPercent = groupTarget > 0 ? (groupActual / groupTarget) * 100 : 0;
        
        let groupScore = 0;
        if (group.weight && group.weight > 0) {
            const cappedPercent = Math.min(groupPercent, 120);
            groupScore = (cappedPercent * group.weight) / 100;
            grandTotalScore += groupScore;
        }

        const processedItems = group.items.map(item => {
            const percent = item.target > 0 ? (item.actual / item.target) * 100 : 0;
            const cappedPercent = Math.min(percent, 120);
            const score = item.weight > 0 ? (cappedPercent * item.weight) / 100 : 0;
            
            if (item.weight > 0) {
                grandTotalScore += score;
            }

            if (item.target > 0 || item.weight > 0) {
                 totalItemsCount++;
                 if (percent >= 100) completedCount++;
            }

            return { ...item, percent, score };
        });

        return { 
            ...group, 
            target: groupTarget, 
            actual: groupActual, 
            percent: groupPercent, 
            score: groupScore,
            items: processedItems 
        };
    });

    return { groups: processedGroups, totalScore: grandTotalScore, completed: completedCount, total: totalItemsCount };
  }, [currentData]);

  // --- AT RISK ITEMS MEMO ---
  const atRiskItems = useMemo(() => {
      if (!calculatedData) return [];
      const riskList: { groupName: string; name: string; target: number; actual: number; percent: number }[] = [];
      
      calculatedData.groups.forEach(g => {
          g.items.forEach(i => {
              if (i.target > 0 && i.weight > 0 && i.percent < 100) {
                  riskList.push({
                      groupName: g.name,
                      name: i.name,
                      target: i.target,
                      actual: i.actual,
                      percent: i.percent
                  });
              }
          });
      });
      return riskList.sort((a,b) => a.percent - b.percent);
  }, [calculatedData]);

  const handleInitMonth = () => {
      const sortedMonths = [...kpiData].sort((a,b) => b.month.localeCompare(a.month));
      const latest = sortedMonths[0];

      let newGroups: KPIGroup[] = [];
      
      if (latest) {
          newGroups = latest.groups.map(g => ({
              ...g,
              actual: 0,
              items: g.items.map(i => ({ ...i, actual: 0 }))
          }));
      } else {
          newGroups = [
              {
                  id: 'g1', name: 'NHÓM CHỈ TIÊU 1', unit: 'VNĐ', weight: 50, autoCalculate: true, items: [
                      { id: 'i1', name: 'Chỉ tiêu 1', unit: 'VNĐ', target: 1000, weight: 0, actual: 0 }
                  ]
              }
          ];
      }

      const newData: KPIMonthlyData = {
          id: `kpi_${selectedMonth.replace('-', '_')}`,
          month: selectedMonth,
          groups: newGroups
      };

      onUpdateKPI(newData); 
  };

  const handleUpdateGroup = (groupId: string, field: keyof KPIGroup, value: any) => {
      if (!currentData) return;
      const newGroups = currentData.groups.map(g => 
          g.id === groupId ? { ...g, [field]: value } : g
      );
      onUpdateKPI({ ...currentData, groups: newGroups });
  };

  const handleUpdateItem = (groupId: string, itemId: string, field: keyof KPIItem, value: any) => {
      if (!currentData) return;
      const numVal = (field === 'target' || field === 'weight' || field === 'actual') ? (parseFloat(value) || 0) : value;
      
      const newGroups = currentData.groups.map(g => {
          if (g.id !== groupId) return g;
          return {
              ...g,
              items: g.items.map(i => i.id === itemId ? { ...i, [field]: numVal } : i)
          };
      });
      onUpdateKPI({ ...currentData, groups: newGroups });
  };

  const handleAddGroup = () => {
      if (!currentData) return;
      const newGroup: KPIGroup = {
          id: `g_${Date.now()}`,
          name: 'NHÓM MỚI',
          unit: '',
          weight: 0,
          autoCalculate: true,
          items: []
      };
      onUpdateKPI({ ...currentData, groups: [...currentData.groups, newGroup] });
  };

  const handleDeleteGroup = (groupId: string) => {
      if (!currentData) return;
      if (!window.confirm('Bạn có chắc chắn muốn xóa nhóm chỉ tiêu này?')) return;
      onUpdateKPI({ ...currentData, groups: currentData.groups.filter(g => g.id !== groupId) });
  };

  const handleAddItem = (groupId: string) => {
      if (!currentData) return;
      const newItem: KPIItem = {
          id: `i_${Date.now()}`,
          name: 'Chỉ tiêu mới',
          unit: 'Tr.đ',
          target: 0,
          weight: 0,
          actual: 0
      };
      const newGroups = currentData.groups.map(g => 
          g.id === groupId ? { ...g, items: [...g.items, newItem] } : g
      );
      onUpdateKPI({ ...currentData, groups: newGroups });
  };

  const handleDeleteItem = (groupId: string, itemId: string) => {
      if (!currentData) return;
      const newGroups = currentData.groups.map(g => 
          g.id === groupId ? { ...g, items: g.items.filter(i => i.id !== itemId) } : g
      );
      onUpdateKPI({ ...currentData, groups: newGroups });
  };

  const formatNumber = (num: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(num);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Điều hành chỉ tiêu Kinh doanh</h1>
           <p className="text-slate-500">Quản lý và theo dõi kết quả thực hiện KPI</p>
        </div>
        
        <div className="flex items-center bg-slate-100 p-1 rounded-lg">
             <button
                onClick={() => setActiveTab('MONTHLY')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'MONTHLY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <List className="w-4 h-4" /> Chi tiết tháng
             </button>
             <button
                onClick={() => setActiveTab('REPORT')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'REPORT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <FileBarChart className="w-4 h-4" /> Báo cáo Tổng hợp
             </button>
        </div>
      </div>

      {activeTab === 'MONTHLY' && (
      <>
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
             {isAdmin && (
                <button 
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors shadow-sm ${
                        isEditMode ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    {isEditMode ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    {isEditMode ? 'Đang Chỉnh sửa Cấu trúc' : 'Chế độ Xem / Nhập KQ'}
                </button>
             )}

            <button 
                onClick={() => setShowTrend(!showTrend)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors shadow-sm ${
                    showTrend ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200'
                }`}
            >
                <BarChart3 className="w-4 h-4" />
                {showTrend ? 'Ẩn Biểu đồ' : 'Hiện Xu hướng'}
            </button>
        </div>
             
         <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-600">Chọn tháng:</span>
            <input 
                type="month" 
                className="border border-slate-300 rounded px-2 py-1 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-[#EE0033] cursor-pointer outline-none"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
            />
        </div>
      </div>

      {/* --- ALERTS SECTION --- */}
      {atRiskItems.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 animate-in slide-in-from-top-4 duration-300 mb-6">
              <h3 className="flex items-center gap-2 text-orange-800 font-bold mb-3">
                  <Bell className="w-5 h-5" /> 
                  Nhắc nhở: {atRiskItems.length} Chỉ tiêu rủi ro chưa hoàn thành
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2">
                  {atRiskItems.map((item, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-orange-100 shadow-sm flex flex-col justify-between hover:border-orange-300 transition-colors">
                          <div>
                              <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 line-clamp-1 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-orange-500" />
                                  {item.groupName}
                              </div>
                              <div className="font-medium text-slate-800 text-sm mb-1">{item.name}</div>
                          </div>
                          <div className="mt-2">
                              <div className="flex justify-between text-xs text-slate-600 mb-1">
                                  <span>Tiến độ: <span className="font-bold text-orange-600">{item.percent.toFixed(1)}%</span></span>
                                  <span className="font-mono">{formatNumber(item.actual)} / {formatNumber(item.target)}</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div className="bg-orange-500 h-full rounded-full" style={{width: `${Math.min(item.percent, 100)}%`}}></div>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* --- TREND CHART --- */}
      {showTrend && trendData.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm animate-in slide-in-from-top-4 duration-300">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#EE0033]" />
                  Xu hướng Điểm KPI qua các tháng
              </h3>
              <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#EE0033" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#EE0033" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="month" tick={{fontSize: 12, fill: '#64748b'}} />
                          <YAxis domain={[0, 'auto']} tick={{fontSize: 12, fill: '#64748b'}} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number) => [value.toFixed(2), 'Điểm']}
                          />
                          <ReferenceLine y={100} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'right', value: 'Mục tiêu (100)', fill: '#10b981', fontSize: 10 }} />
                          <Area 
                            type="monotone" 
                            dataKey="score" 
                            stroke="#EE0033" 
                            fillOpacity={1} 
                            fill="url(#colorScore)" 
                            strokeWidth={2}
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#EE0033' }}
                          />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>
      )}

      {/* --- DETAIL TABLE --- */}
      {calculatedData ? (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse min-w-[1000px]">
                <thead className="bg-[#5B9BD5] text-white font-bold uppercase text-xs">
                    <tr>
                        <th className="px-4 py-3 border-r border-blue-400 w-16 text-center">TT</th>
                        <th className="px-4 py-3 border-r border-blue-400 min-w-[300px]">Các chỉ tiêu cụ thể</th>
                        <th className="px-4 py-3 border-r border-blue-400 text-center w-20">Đơn vị</th>
                        <th className="px-4 py-3 border-r border-blue-400 text-center" colSpan={2}>
                             <div className="border-b border-blue-300 pb-1 mb-1">Mục tiêu/Tỷ trọng</div>
                             <div className="grid grid-cols-2 gap-2">
                                 <span>Mục tiêu</span>
                                 <span>Tỷ trọng</span>
                             </div>
                        </th>
                        <th className="px-4 py-3 text-center" colSpan={3}>
                             <div className="border-b border-blue-300 pb-1 mb-1">Kết quả thực hiện lũy kế</div>
                             <div className="grid grid-cols-3 gap-2">
                                 <span>Kết quả</span>
                                 <span>% HT</span>
                                 <span>Điểm</span>
                             </div>
                        </th>
                        {isEditMode && <th className="px-2 py-3 w-10 text-center bg-amber-500/20">Xóa</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                     {/* Grand Total Row */}
                     <tr className="bg-blue-100 font-bold text-slate-900">
                        <td className="px-4 py-3 border-r border-slate-300"></td>
                        <td className="px-4 py-3 border-r border-slate-300 underline">TỔNG HỢP CHỈ TIÊU VTS</td>
                        <td className="px-4 py-3 border-r border-slate-300"></td>
                        <td className="px-4 py-3 border-r border-slate-300 text-right"></td>
                        <td className="px-4 py-3 border-r border-slate-300 text-center">100%</td>
                        <td className="px-4 py-3 border-r border-slate-300 text-right"></td>
                        <td className="px-4 py-3 border-r border-slate-300 text-right"></td>
                        <td className="px-4 py-3 text-right text-[#EE0033] text-lg">{calculatedData.totalScore.toFixed(2)}</td>
                        {isEditMode && <td className="px-2 py-3 bg-amber-50"></td>}
                     </tr>

                    {calculatedData.groups.map((group, gIdx) => (
                        <React.Fragment key={group.id}>
                            <tr className="bg-slate-100 font-bold text-slate-800">
                                <td className="px-4 py-3 border-r border-slate-300 text-center">{['I', 'II', 'III', 'IV', 'V'][gIdx] || gIdx + 1}</td>
                                <td className="px-4 py-3 border-r border-slate-300">
                                    {isEditMode ? (
                                        <div className="flex flex-col gap-1">
                                            <input 
                                                type="text" 
                                                className="w-full bg-white border border-slate-300 px-2 py-1 rounded text-sm focus:border-amber-500 outline-none" 
                                                value={group.name} 
                                                onChange={(e) => handleUpdateGroup(group.id, 'name', e.target.value)}
                                                placeholder="Tên nhóm chỉ tiêu" 
                                            />
                                            <div className="flex items-center gap-2 mt-1">
                                                <button 
                                                    onClick={() => handleUpdateGroup(group.id, 'autoCalculate', !group.autoCalculate)}
                                                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-indigo-600"
                                                >
                                                    {group.autoCalculate ? <CheckSquare className="w-3 h-3 text-indigo-600" /> : <Square className="w-3 h-3" />}
                                                    Tự động tính tổng
                                                </button>
                                            </div>
                                        </div>
                                    ) : group.name.toUpperCase()}
                                </td>
                                <td className="px-4 py-3 border-r border-slate-300 text-center text-slate-600">
                                     {isEditMode ? (
                                        <input 
                                            type="text" 
                                            className="w-full text-center bg-white border border-slate-300 px-1 py-1 rounded text-xs" 
                                            value={group.unit} 
                                            onChange={(e) => handleUpdateGroup(group.id, 'unit', e.target.value)} 
                                        />
                                     ) : group.unit}
                                </td>
                                
                                {/* Group Target */}
                                <td className="px-4 py-3 border-r border-slate-300 text-right text-indigo-800">
                                    {!group.autoCalculate && isEditMode ? (
                                         <input 
                                            type="number" 
                                            className="w-full text-right bg-white border border-slate-300 px-2 py-1 rounded"
                                            value={group.target}
                                            onChange={(e) => handleUpdateGroup(group.id, 'target', e.target.value)}
                                        />
                                    ) : (
                                        // Show calculated Target for groups like Revenue
                                        (group.target || group.autoCalculate) ? formatNumber(group.target) : ''
                                    )}
                                </td>

                                <td className="px-4 py-3 border-r border-slate-300 text-center">
                                    {isEditMode ? (
                                        <div className="flex items-center justify-center">
                                            <input 
                                                type="number" 
                                                className="w-12 text-center bg-white border border-slate-300 px-1 py-1 rounded text-sm font-bold text-amber-700"
                                                value={group.weight || 0}
                                                onChange={(e) => handleUpdateGroup(group.id, 'weight', e.target.value)}
                                            />
                                            <span className="ml-1 text-slate-400">%</span>
                                        </div>
                                    ) : (
                                        group.weight ? `${group.weight}%` : ''
                                    )}
                                </td>

                                {/* Group Actual */}
                                <td className="px-4 py-3 border-r border-slate-300 text-right text-emerald-800">
                                    {group.autoCalculate ? (
                                        formatNumber(group.actual || 0)
                                    ) : (
                                        !isEditMode && !group.autoCalculate ? (
                                             <input 
                                                type="number"
                                                className="w-24 text-right bg-transparent border-b border-slate-300 focus:border-[#EE0033] outline-none font-bold text-indigo-700 py-1"
                                                value={group.actual}
                                                onChange={(e) => handleUpdateGroup(group.id, 'actual', e.target.value)}
                                            />
                                        ) : (group.actual ? formatNumber(group.actual) : '')
                                    )}
                                </td>

                                {/* Group Percent */}
                                <td className="px-4 py-3 border-r border-slate-300 text-right font-bold text-blue-700">
                                    {group.percent > 0 ? `${group.percent.toFixed(1)}%` : ''}
                                </td>

                                <td className="px-4 py-3 text-right font-bold text-slate-900">
                                    {group.score && group.score > 0 ? group.score.toFixed(2) : ''}
                                </td>

                                {isEditMode && (
                                    <td className="px-2 py-3 text-center bg-amber-50 border-l border-amber-100">
                                        <button 
                                            onClick={() => handleDeleteGroup(group.id)}
                                            className="p-1.5 bg-white text-red-500 hover:bg-red-100 rounded shadow-sm border border-red-100"
                                            title="Xóa nhóm"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                )}
                            </tr>

                            {group.items.map((item, iIdx) => {
                                const isCompleted = item.percent >= 100;
                                return (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors border-b border-slate-200">
                                        <td className="px-4 py-3 border-r border-slate-200 text-center text-slate-500">{iIdx + 1}</td>
                                        <td className="px-4 py-3 border-r border-slate-200">
                                            {isEditMode ? (
                                                <input 
                                                    type="text" 
                                                    className="w-full bg-white border border-slate-300 px-2 py-1 rounded focus:border-amber-500 outline-none" 
                                                    value={item.name} 
                                                    onChange={(e) => handleUpdateItem(group.id, item.id, 'name', e.target.value)} 
                                                />
                                            ) : item.name}
                                        </td>
                                        <td className="px-4 py-3 border-r border-slate-200 text-center text-slate-500">
                                             {isEditMode ? (
                                                <input 
                                                    type="text" 
                                                    className="w-full text-center bg-white border border-slate-300 px-1 py-1 rounded text-xs" 
                                                    value={item.unit} 
                                                    onChange={(e) => handleUpdateItem(group.id, item.id, 'unit', e.target.value)} 
                                                />
                                            ) : item.unit}
                                        </td>
                                        
                                        <td className="px-4 py-3 border-r border-slate-200 text-right">
                                            {isEditMode ? (
                                                <input 
                                                    type="number" 
                                                    className="w-full text-right bg-white border border-slate-300 px-2 py-1 rounded focus:border-amber-500 outline-none"
                                                    value={item.target}
                                                    onChange={(e) => handleUpdateItem(group.id, item.id, 'target', e.target.value)}
                                                />
                                            ) : formatNumber(item.target)}
                                        </td>

                                        <td className="px-4 py-3 border-r border-slate-200 text-center">
                                             {isEditMode ? (
                                                <input 
                                                    type="number" 
                                                    className="w-full text-center bg-white border border-slate-300 px-1 py-1 rounded focus:border-amber-500 outline-none"
                                                    value={item.weight}
                                                    onChange={(e) => handleUpdateItem(group.id, item.id, 'weight', e.target.value)}
                                                />
                                            ) : (item.weight > 0 ? `${item.weight}%` : '')}
                                        </td>

                                        <td className="px-4 py-3 border-r border-slate-200 text-right">
                                            <input 
                                                type="number"
                                                className="w-24 text-right bg-transparent border-b border-slate-300 focus:border-[#EE0033] outline-none font-bold text-indigo-700 py-1"
                                                value={item.actual}
                                                onChange={(e) => handleUpdateItem(group.id, item.id, 'actual', e.target.value)}
                                            />
                                        </td>

                                        <td className={`px-4 py-3 border-r border-slate-200 text-right font-medium ${isCompleted ? 'bg-green-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                            {item.percent.toFixed(1)}%
                                        </td>

                                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                                            {item.score.toFixed(2)}
                                        </td>

                                        {isEditMode && (
                                            <td className="px-2 py-3 text-center bg-amber-50 border-l border-amber-100">
                                                <button 
                                                    onClick={() => handleDeleteItem(group.id, item.id)}
                                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                                    title="Xóa chỉ tiêu"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                )
                            })}
                            {isEditMode && (
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <td colSpan={2} className="px-4 py-2 border-r border-slate-200">
                                        <button 
                                            onClick={() => handleAddItem(group.id)}
                                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" /> Thêm chỉ tiêu con
                                        </button>
                                    </td>
                                    <td colSpan={7}></td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
          </div>
          {isEditMode && (
              <div className="p-4 bg-slate-50 border-t border-slate-200">
                  <button 
                    onClick={handleAddGroup}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 text-slate-700 font-medium"
                  >
                      <PlusCircle className="w-4 h-4 text-indigo-600" />
                      Thêm Nhóm Chỉ tiêu Mới
                  </button>
              </div>
          )}
      </div>
      ) : (
          <div className="p-12 flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 gap-4">
            <p>Chưa có dữ liệu chỉ tiêu cho tháng {selectedMonth}</p>
            {isAdmin && (
                <button 
                  onClick={handleInitMonth}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <Copy className="w-4 h-4" />
                    Khởi tạo dữ liệu (Copy tháng trước)
                </button>
            )}
        </div>
      )}
      </>
      )}

      {/* --- REPORT VIEW --- */}
      {activeTab === 'REPORT' && (
          <div className="space-y-6 animate-in fade-in">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-600">Từ tháng:</span>
                    <input 
                        type="month" 
                        className="border border-slate-300 rounded px-2 py-1 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-[#EE0033] outline-none"
                        value={reportStartMonth}
                        onChange={(e) => setReportStartMonth(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-600">Đến tháng:</span>
                    <input 
                        type="month" 
                        className="border border-slate-300 rounded px-2 py-1 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-[#EE0033] outline-none"
                        value={reportEndMonth}
                        onChange={(e) => setReportEndMonth(e.target.value)}
                    />
                  </div>
              </div>

              {reportData ? (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                       <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                           <h3 className="font-bold text-slate-800 uppercase text-center">Báo cáo Tổng hợp KPI ({reportStartMonth} - {reportEndMonth})</h3>
                       </div>
                       <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-[#5B9BD5] text-white font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 border-r border-blue-400">Nhóm / Chỉ tiêu</th>
                                    <th className="px-4 py-3 border-r border-blue-400 text-center w-24">Đơn vị</th>
                                    <th className="px-4 py-3 border-r border-blue-400 text-right w-32">Tổng Mục tiêu</th>
                                    <th className="px-4 py-3 border-r border-blue-400 text-right w-32">Tổng Thực hiện</th>
                                    <th className="px-4 py-3 text-right w-24">Tỷ lệ HT</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {reportData.map((group, gIdx) => (
                                    <React.Fragment key={gIdx}>
                                        <tr className="bg-slate-100 font-bold text-slate-800">
                                            <td className="px-4 py-2 border-b border-slate-300">{group.name}</td>
                                            <td className="px-4 py-2 border-b border-slate-300 text-center text-slate-600">{group.unit}</td>
                                            <td className="px-4 py-2 border-b border-slate-300 text-right text-indigo-700">
                                                {group.target > 0 ? formatNumber(group.target) : ''}
                                            </td>
                                            <td className="px-4 py-2 border-b border-slate-300 text-right text-emerald-700">
                                                {group.actual > 0 ? formatNumber(group.actual) : ''}
                                            </td>
                                            <td className={`px-4 py-2 border-b border-slate-300 text-right ${group.percent >= 100 ? 'text-emerald-600' : 'text-orange-600'}`}>
                                                 {group.target > 0 ? `${group.percent.toFixed(1)}%` : ''}
                                            </td>
                                        </tr>
                                        {group.items.map((item, iIdx) => (
                                            <tr key={iIdx} className="hover:bg-slate-50 bg-white">
                                                <td className="px-4 py-2 border-r border-slate-200 pl-8 text-slate-700 font-medium">{item.name || '---'}</td>
                                                <td className="px-4 py-2 border-r border-slate-200 text-center text-slate-500 text-xs">{item.unit}</td>
                                                <td className="px-4 py-2 border-r border-slate-200 text-right font-medium text-slate-600">{formatNumber(item.target)}</td>
                                                <td className="px-4 py-2 border-r border-slate-200 text-right font-bold text-slate-700">{formatNumber(item.actual)}</td>
                                                <td className={`px-4 py-2 text-right font-bold text-xs ${item.percent >= 100 ? 'text-emerald-600' : 'text-orange-600'}`}>
                                                    {item.percent.toFixed(1)}%
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                       </table>
                  </div>
              ) : (
                  <div className="p-12 text-center text-slate-400 border border-dashed rounded-xl">Không có dữ liệu cho giai đoạn này.</div>
              )}
          </div>
      )}
    </div>
  );
};

export default KPIManagement;
