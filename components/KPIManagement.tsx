
import React, { useState, useMemo } from 'react';
import { KPIMonthlyData, KPIGroup, KPIItem, UserRole, User } from '../types';
import { Calendar, TrendingUp, AlertCircle, CheckCircle, Lock, Unlock, Plus, Trash2, PlusCircle, Copy, CheckSquare, Square } from 'lucide-react';

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
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [isEditMode, setIsEditMode] = useState(false);

  const isAdmin = user?.role === UserRole.ADMIN;

  const currentData = useMemo(() => {
    return kpiData.find(d => d.month === selectedMonth) || null;
  }, [kpiData, selectedMonth]);

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

  // --- CRUD HANDLERS ---
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

        let groupPercent = 0;
        let groupScore = 0;
        
        if (group.weight && group.weight > 0) {
            groupPercent = groupTarget > 0 ? (groupActual / groupTarget) * 100 : 0;
            groupScore = (groupPercent * group.weight) / 100;
            grandTotalScore += groupScore;
        }

        const processedItems = group.items.map(item => {
            const percent = item.target > 0 ? (item.actual / item.target) * 100 : 0;
            const score = item.weight > 0 ? (percent * item.weight) / 100 : 0;
            
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

  const formatNumber = (num: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(num);

  if (!currentData) {
      return (
          <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">Điều hành chỉ tiêu Kinh doanh</h1>
                 <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-slate-500" />
                    <input 
                        type="month" 
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#EE0033] outline-none"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    />
                </div>
              </div>
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
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Điều hành chỉ tiêu Kinh doanh</h1>
           <p className="text-slate-500">Quản lý và theo dõi kết quả thực hiện KPI</p>
        </div>
        
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
             
             <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-sm font-semibold text-slate-600">Tháng:</span>
                <input 
                    type="month" 
                    className="bg-transparent border-none text-sm font-bold text-slate-800 focus:ring-0 cursor-pointer outline-none p-0"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                />
            </div>
        </div>
      </div>

      {calculatedData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                        <p className="text-blue-100 text-sm font-medium uppercase">Tổng điểm đạt được</p>
                        <h3 className="text-4xl font-bold mt-1">{calculatedData.totalScore.toFixed(2)}</h3>
                    </div>
                    <div className="p-2 bg-white/20 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                </div>
                <div className="w-full bg-black/20 rounded-full h-1.5 mt-2 relative z-10">
                    <div className="bg-white h-1.5 rounded-full" style={{width: `${Math.min(calculatedData.totalScore, 100)}%`}}></div>
                </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-slate-500 text-sm font-medium uppercase">Chỉ tiêu hoàn thành</p>
                        <h3 className="text-3xl font-bold text-emerald-600 mt-1">{calculatedData.completed} <span className="text-lg text-slate-400 font-normal">/ {calculatedData.total}</span></h3>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Đạt {'>'}= 100% kế hoạch
                </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-slate-500 text-sm font-medium uppercase">Chưa hoàn thành</p>
                        <h3 className="text-3xl font-bold text-orange-600 mt-1">{calculatedData.total - calculatedData.completed}</h3>
                    </div>
                    <div className="p-2 bg-orange-50 rounded-lg">
                        <AlertCircle className="w-6 h-6 text-orange-600" />
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span> Cần đẩy mạnh thực hiện
                </div>
            </div>
        </div>
      )}

      {calculatedData && (
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
                                
                                <td className="px-4 py-3 border-r border-slate-300 text-right">
                                    {!group.autoCalculate && isEditMode ? (
                                         <input 
                                            type="number" 
                                            className="w-full text-right bg-white border border-slate-300 px-2 py-1 rounded"
                                            value={group.target}
                                            onChange={(e) => handleUpdateGroup(group.id, 'target', e.target.value)}
                                        />
                                    ) : (
                                        group.target ? formatNumber(group.target) : ''
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

                                <td className="px-4 py-3 border-r border-slate-300 text-right">
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

                                <td className="px-4 py-3 border-r border-slate-300 text-right text-slate-600">
                                    {group.percent && group.percent > 0 ? `${group.percent.toFixed(1)}%` : ''}
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
      )}
    </div>
  );
};

export default KPIManagement;
