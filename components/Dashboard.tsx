
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Project, Contract, ContractType, Category, CategoryType, KPIMonthlyData } from '../types';
import { Wallet, TrendingUp, TrendingDown, Activity, Settings, Check, X, SlidersHorizontal, Target } from 'lucide-react';

interface DashboardProps {
  projects: Project[];
  contracts: Contract[];
  categories: Category[];
  kpiData?: KPIMonthlyData[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const KPI_COLORS = ['#10b981', '#f97316']; // Green for completed, Orange for incomplete

// Default configuration
const DEFAULT_CONFIG = {
  showSales: true,
  showCost: true,
  showProfit: true,
  showRevenue: true,
  showProjectChart: true,
  showCategoryChart: true,
  showKPIChart: true,
};

const Dashboard: React.FC<DashboardProps> = ({ projects, contracts, categories, kpiData = [] }) => {
  // State for customization
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const configRef = useRef<HTMLDivElement>(null);

  // Load config from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pm_dashboard_config');
      if (saved) {
        setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) });
      }
    } catch (e) {
      console.error('Failed to load dashboard config', e);
    }
  }, []);

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

  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalSales = 0;
    let totalCost = 0;
    const projectStats = projects.map(p => {
      const pContracts = contracts.filter(c => c.projectId === p.id);
      
      // Doanh số: Tổng giá trị hợp đồng đầu ra (trừ hủy)
      const sales = pContracts
        .filter(c => c.type === ContractType.OUTPUT && c.status !== 'CANCELLED')
        .reduce((acc, curr) => acc + curr.value, 0);

      // Doanh thu: Chỉ tính các hợp đồng đã hoàn thành/nghiệm thu
      const rev = pContracts
        .filter(c => c.type === ContractType.OUTPUT && c.status === 'COMPLETED')
        .reduce((acc, curr) => acc + curr.value, 0);

      // Chi phí: Tổng giá trị hợp đồng đầu vào (trừ hủy)
      const cost = pContracts
        .filter(c => c.type === ContractType.INPUT && c.status !== 'CANCELLED')
        .reduce((acc, curr) => acc + curr.value, 0);
      
      totalRevenue += rev;
      totalSales += sales;
      totalCost += cost;

      // Profit calculated as Sales - Cost (Efficiency of Signed Contracts)
      return {
        name: p.name,
        sales: sales,
        revenue: rev,
        cost: cost,
        profit: sales - cost
      };
    });

    // Global Profit = Total Sales - Total Cost
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

  const categoryData = useMemo(() => {
    // Group contracts by root category (for simplicity in charts)
    const revCats = categories.filter(c => c.type === CategoryType.REVENUE && c.parentId === null);
    
    const data = revCats.map(rootCat => {
       // Find all subcategories IDs for this root
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

  // KPI Data Summary for Current Month (or latest available)
  const kpiSummary = useMemo(() => {
      if (!kpiData || kpiData.length === 0) return null;
      // Use latest data
      const current = kpiData[0]; // Assuming MOCK_KPI is sorted or just taking first
      let totalScore = 0;
      let completedCount = 0;
      let incompleteCount = 0;

      current.groups.forEach(g => {
          g.items.forEach(i => {
              if (i.actual >= i.target) completedCount++;
              else incompleteCount++;
              
              const ratio = i.target > 0 ? (i.actual / i.target) : 0;
              totalScore += ratio * i.weight;
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

  const StatCard = ({ title, value, subValue, icon: Icon, colorClass }: any) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start justify-between animate-in zoom-in duration-300">
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
        <h1 className="text-2xl font-bold text-slate-800">Tổng quan Hoạt động</h1>
        
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-500 hidden md:block">
            Cập nhật: {new Date().toLocaleDateString('vi-VN')}
          </div>
          
          <div className="relative" ref={configRef}>
            <button 
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${isConfigOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
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
                <div className="space-y-2">
                  {[
                    { key: 'showSales', label: 'Thẻ Doanh số' },
                    { key: 'showCost', label: 'Thẻ Chi phí' },
                    { key: 'showProfit', label: 'Thẻ Lợi nhuận' },
                    { key: 'showRevenue', label: 'Thẻ Doanh thu' },
                    { key: 'showKPIChart', label: 'Biểu đồ KPI' },
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

      {/* KPI Section (New) */}
      {config.showKPIChart && kpiSummary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-xl p-6 shadow-md flex flex-col justify-center relative overflow-hidden">
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
                   <div className="flex-1">
                        <h4 className="font-bold text-slate-700 mb-1 ml-4">Tiến độ Hoàn thành Chỉ tiêu</h4>
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
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {config.showSales && (
          <StatCard 
            title="Tổng Doanh Số (Ký)" 
            value={formatCurrency(stats.totalSales)} 
            subValue="Giá trị hợp đồng đầu ra"
            icon={TrendingUp}
            colorClass={{ bg: 'bg-indigo-50', icon: 'text-indigo-600', text: 'text-indigo-600' }}
          />
        )}
        {config.showCost && (
          <StatCard 
            title="Tổng Chi Phí" 
            value={formatCurrency(stats.totalCost)} 
            subValue="Đầu tư & Vận hành"
            icon={TrendingDown}
            colorClass={{ bg: 'bg-red-50', icon: 'text-red-600', text: 'text-red-600' }}
          />
        )}
        {config.showProfit && (
          <StatCard 
            title="Lợi Nhuận (Dự kiến)" 
            value={formatCurrency(stats.profit)} 
            subValue={`ROI: ${stats.roi.toFixed(1)}%`}
            icon={Wallet}
            colorClass={{ bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-600' }}
          />
        )}
        {config.showRevenue && (
          <StatCard 
            title="Doanh Thu (NT)" 
            value={formatCurrency(stats.totalRevenue)} 
            subValue="Đã nghiệm thu"
            icon={Activity}
            colorClass={{ bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-600' }}
          />
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {config.showProjectChart && (
          <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${!config.showCategoryChart ? 'lg:col-span-2' : ''}`}>
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
        )}

        {config.showCategoryChart && (
          <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${!config.showProjectChart ? 'lg:col-span-2' : ''}`}>
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
        )}
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
