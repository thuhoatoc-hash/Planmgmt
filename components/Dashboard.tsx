import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Project, Contract, ContractType, Category, CategoryType } from '../types';
import { Wallet, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface DashboardProps {
  projects: Project[];
  contracts: Contract[];
  categories: Category[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Dashboard: React.FC<DashboardProps> = ({ projects, contracts, categories }) => {

  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    const projectStats = projects.map(p => {
      const pContracts = contracts.filter(c => c.projectId === p.id);
      const rev = pContracts
        .filter(c => c.type === ContractType.OUTPUT)
        .reduce((acc, curr) => acc + curr.value, 0);
      const cost = pContracts
        .filter(c => c.type === ContractType.INPUT)
        .reduce((acc, curr) => acc + curr.value, 0);
      
      totalRevenue += rev;
      totalCost += cost;

      return {
        name: p.name,
        revenue: rev,
        cost: cost,
        profit: rev - cost
      };
    });

    return {
      totalRevenue,
      totalCost,
      profit: totalRevenue - totalCost,
      roi: totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0,
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

  const StatCard = ({ title, value, subValue, icon: Icon, colorClass }: any) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start justify-between">
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Tổng quan Hoạt động</h1>
        <div className="text-sm text-slate-500">Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}</div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Tổng Doanh Thu" 
          value={formatCurrency(stats.totalRevenue)} 
          subValue="Từ tất cả dự án"
          icon={TrendingUp}
          colorClass={{ bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-600' }}
        />
        <StatCard 
          title="Tổng Chi Phí" 
          value={formatCurrency(stats.totalCost)} 
          subValue="Đầu tư & Vận hành"
          icon={TrendingDown}
          colorClass={{ bg: 'bg-red-50', icon: 'text-red-600', text: 'text-red-600' }}
        />
        <StatCard 
          title="Lợi Nhuận Ròng" 
          value={formatCurrency(stats.profit)} 
          subValue={`ROI: ${stats.roi.toFixed(1)}%`}
          icon={Wallet}
          colorClass={{ bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-600' }}
        />
        <StatCard 
          title="Dự án Đang chạy" 
          value={projects.filter(p => p.status === 'ACTIVE').length} 
          subValue={`Tổng: ${projects.length} dự án`}
          icon={Activity}
          colorClass={{ bg: 'bg-indigo-50', icon: 'text-indigo-600', text: 'text-indigo-600' }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Hiệu quả theo Dự án</h3>
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
                <Bar dataKey="revenue" name="Doanh thu" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="cost" name="Chi phí" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Cơ cấu Doanh thu</h3>
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
                      {categoryData.map((entry, index) => (
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
      </div>
    </div>
  );
};

export default Dashboard;