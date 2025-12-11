
import React, { useState, useEffect, useMemo } from 'react';
import { User, EmployeeEvaluation, KICriterium, UserRole } from '../types';
import { api } from '../services/api';
import { Save, User as UserIcon, Calendar, Trophy, AlertTriangle, FileText, Smile, Meh, Frown, CloudRain, Search, Edit, Star } from 'lucide-react';

interface EmployeeEvaluationProps {
  users: User[];
  currentUser: User | null;
}

const TEMPLATES = {
    AM: [
        { name: 'Doanh số', unit: 'Tr.đ', weight: 15 },
        { name: 'Tổng Doanh thu', unit: 'Tr.đ', weight: 25 },
        { name: 'Doanh thu dịch vụ', unit: 'Tr.đ', weight: 20 },
        { name: 'Nhiệm vụ trọng tâm BGĐ giao', unit: '%', weight: 20 },
        { name: 'Ý thức thái độ (việc khó, công đoàn...)', unit: '%', weight: 10, target: 100 },
        { name: 'Không vi phạm kỷ luật, trừ điểm pháp lý', unit: '%', weight: 10, target: 100 },
    ],
    PM: [
        { name: 'Doanh số', unit: 'Tr.đ', weight: 10 },
        { name: 'Tổng Doanh thu', unit: 'Tr.đ', weight: 10 },
        { name: 'Doanh thu dịch vụ', unit: 'Tr.đ', weight: 5 },
        { name: 'Nhiệm vụ trọng tâm BGĐ giao', unit: '%', weight: 45 },
        { name: 'Ý thức thái độ (việc khó, công đoàn...)', unit: '%', weight: 20, target: 100 },
        { name: 'Không vi phạm kỷ luật, trừ điểm pháp lý', unit: '%', weight: 10, target: 100 },
    ]
};

const EmployeeEvaluationManager: React.FC<EmployeeEvaluationProps> = ({ users, currentUser }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [evaluations, setEvaluations] = useState<EmployeeEvaluation[]>([]);
  const [currentEval, setCurrentEval] = useState<EmployeeEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch data on mount
  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
      setLoading(true);
      const data = await api.evaluations.getAll();
      setEvaluations(data);
      setLoading(false);
  };

  // 2. Logic to load current evaluation form when User or Month changes
  useEffect(() => {
      if (selectedUser && selectedMonth) {
          // Find existing evaluation in the fetched list
          const exist = evaluations.find(e => e.userId === selectedUser && e.month === selectedMonth);
          
          if (exist) {
              setCurrentEval(exist);
          } else {
              // Create NEW blank evaluation
              const user = users.find(u => u.id === selectedUser);
              
              // Check role to select template
              const isPM = user?.role === UserRole.PM;
              // Fallback to AM template if user role is AM or anything else (except Admin who shouldn't be here)
              const role = isPM ? 'PM' : 'AM';
              const template = isPM ? TEMPLATES.PM : TEMPLATES.AM;

              setCurrentEval({
                  id: '', // Empty ID signifies a new record
                  userId: selectedUser,
                  month: selectedMonth,
                  role: role,
                  criteria: template.map((t, idx) => ({
                      id: `cri_${idx}`,
                      name: t.name,
                      unit: t.unit,
                      weight: t.weight,
                      target: t.target || 0,
                      actual: 0,
                      score: 0
                  })),
                  totalScore: 0,
                  grade: 'D',
                  note: ''
              });
          }
      } else {
          setCurrentEval(null);
      }
  }, [selectedUser, selectedMonth, users]); // Removed 'evaluations' dependency to prevent loop reset

  const calculateScore = (criteria: KICriterium[]) => {
      let total = 0;
      const calculated = criteria.map(c => {
          let score = 0;
          if (c.target > 0) {
             const percent = (c.actual / c.target) * 100;
             const cappedPercent = Math.min(percent, 120); // Cap at 120% standard
             score = (cappedPercent * c.weight) / 100;
          } else if (c.target === 0 && c.weight > 0 && c.actual > 0) {
              // Edge case: Target 0 but has weight and actual value (bonus?)
              // For now keep 0 to avoid division by zero errors
              score = 0;
          }
          total += score;
          return { ...c, score };
      });
      return { total, calculated };
  };

  const getGrade = (score: number) => {
      if (score > 110) return 'A+';
      if (score >= 100) return 'A';
      if (score >= 90) return 'B';
      if (score >= 80) return 'C';
      return 'D';
  };

  // Icon Helper for List and Summary
  const getGradeIcon = (grade: string) => {
      switch (grade) {
          case 'A+': return <Star className="w-5 h-5 text-yellow-500 fill-yellow-100" />;
          case 'A': return <Smile className="w-5 h-5 text-green-500" />;
          case 'B': return <Meh className="w-5 h-5 text-blue-500" />;
          case 'C': return <Frown className="w-5 h-5 text-orange-500" />;
          case 'D': return <CloudRain className="w-5 h-5 text-red-500" />;
          default: return <div className="w-5 h-5 rounded-full bg-slate-200" />;
      }
  };

  const handleUpdateCriterium = (idx: number, field: keyof KICriterium, value: number) => {
      if (!currentEval) return;
      const newCriteria = [...currentEval.criteria];
      newCriteria[idx] = { ...newCriteria[idx], [field]: value };
      
      const { total, calculated } = calculateScore(newCriteria);
      
      setCurrentEval({
          ...currentEval,
          criteria: calculated,
          totalScore: total,
          grade: getGrade(total)
      });
  };

  const handleSave = async () => {
      if (!currentEval) return;
      
      try {
        const toSave = { ...currentEval };
        // Generate ID if it's new
        if (!toSave.id) toSave.id = `eval_${toSave.userId}_${toSave.month.replace('-','')}`;
        
        const savedData = await api.evaluations.save(toSave);
        
        if (savedData) {
            // 1. Update local list state immediately so the sidebar updates
            setEvaluations(prev => {
                const others = prev.filter(e => e.id !== savedData.id);
                return [...others, savedData];
            });
            
            // 2. Update current form state to ensure it has the ID
            setCurrentEval(savedData);
            
            alert('Đã lưu kết quả đánh giá thành công!');
        } else {
            alert('Lỗi khi lưu dữ liệu. Vui lòng thử lại.');
        }
      } catch (error) {
          console.error(error);
          alert('Có lỗi xảy ra.');
      }
  };

  const formatNumber = (num: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(num);

  const filteredUsers = users.filter(u => 
      u.role !== UserRole.ADMIN && 
      (u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || u.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const summaryStats = useMemo(() => {
    const currentMonthEvals = evaluations.filter(e => e.month === selectedMonth);
    const total = filteredUsers.length; // Use filtered users count as base for total employees
    if(total === 0) return [];
    
    const grades = ['A+', 'A', 'B', 'C', 'D'];
    return grades.map(g => {
        const count = currentMonthEvals.filter(e => e.grade === g).length;
        const percent = (count / total) * 100;
        return { grade: g, count, percent };
    });
  }, [evaluations, selectedMonth, filteredUsers]);


  if (loading) return <div className="p-8 text-center">Đang tải dữ liệu...</div>;

  return (
    <div className="space-y-6 animate-in fade-in flex flex-col pb-20">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
             <div>
                <h1 className="text-2xl font-bold text-slate-800">Đánh giá KI Nhân viên</h1>
                <p className="text-slate-500">Giao chỉ tiêu và đánh giá hiệu quả công việc tháng</p>
             </div>
             <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                <Calendar className="w-5 h-5 text-[#EE0033]" />
                <span className="text-sm font-medium text-slate-600 mr-2">Tháng đánh giá:</span>
                <input 
                    type="month" 
                    className="bg-transparent outline-none text-base font-bold text-slate-800 cursor-pointer"
                    value={selectedMonth}
                    onChange={(e) => {
                        setSelectedMonth(e.target.value);
                        setSelectedUser(''); // Reset selection when month changes
                    }}
                />
             </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-5 gap-4">
            {summaryStats.map(stat => (
                <div key={stat.grade} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                     <div className="flex items-center justify-center gap-2 mb-2">
                        {getGradeIcon(stat.grade)}
                        <span className="font-bold text-lg">{stat.grade}</span>
                     </div>
                     <div className="text-2xl font-bold text-slate-800">{stat.count}</div>
                     <div className="text-xs text-slate-500 mt-1">{stat.percent.toFixed(1)}% nhân sự</div>
                </div>
            ))}
        </div>

        {/* User Table Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Danh sách Nhân viên</h3>
                 <div className="relative w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                        placeholder="Tìm nhân viên..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                        <th className="px-6 py-4">Nhân viên</th>
                        <th className="px-6 py-4">Vai trò</th>
                        <th className="px-6 py-4 text-center">Trạng thái</th>
                        <th className="px-6 py-4 text-right">Tổng điểm</th>
                        <th className="px-6 py-4 text-center">Xếp loại</th>
                        <th className="px-6 py-4 text-center">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map(user => {
                        const evalData = evaluations.find(e => e.userId === user.id && e.month === selectedMonth);
                        const isSelected = selectedUser === user.id;

                        return (
                            <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/50' : ''}`}>
                                <td className="px-6 py-4">
                                     <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500">
                                            {user.avatarUrl ? (
                                                <img src={user.avatarUrl} className="w-full h-full rounded-full object-cover" />
                                            ) : user.fullName.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-900">{user.fullName}</div>
                                            <div className="text-xs text-slate-500 font-mono">@{user.username}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {evalData ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                            Đã đánh giá
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                                            Chưa đánh giá
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-slate-700">
                                    {evalData ? formatNumber(evalData.totalScore) : '-'}
                                </td>
                                <td className="px-6 py-4">
                                    {evalData ? (
                                        <div className="flex items-center justify-center gap-2">
                                            {getGradeIcon(evalData.grade)}
                                            <span className={`font-bold ${
                                                evalData.grade === 'A+' ? 'text-yellow-600' :
                                                evalData.grade === 'A' ? 'text-green-600' :
                                                evalData.grade === 'B' ? 'text-blue-600' : 
                                                'text-red-500'
                                            }`}>{evalData.grade}</span>
                                        </div>
                                    ) : <div className="text-center text-slate-400">-</div>}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => setSelectedUser(selectedUser === user.id ? '' : user.id)}
                                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                            isSelected 
                                                ? 'bg-indigo-600 text-white shadow-sm' 
                                                : 'text-indigo-600 hover:bg-indigo-50 border border-indigo-200'
                                        }`}
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                        {evalData ? 'Sửa' : 'Đánh giá'}
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

        {/* Detail Form Section (Conditional Render) */}
        {selectedUser && currentEval && (
             <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-lg animate-in slide-in-from-bottom-4 duration-300 ring-4 ring-indigo-50">
                <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex justify-between items-center sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-100" />
                        <div>
                            <h3 className="font-bold text-lg">Chi tiết đánh giá</h3>
                            <p className="text-xs text-indigo-200">Nhân viên: {users.find(u => u.id === selectedUser)?.fullName} • Tháng {selectedMonth}</p>
                        </div>
                    </div>
                    {currentUser?.role === UserRole.ADMIN && (
                        <button 
                            onClick={handleSave}
                            className="bg-white text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-50 flex items-center gap-2 shadow-sm transition-all"
                        >
                            <Save className="w-4 h-4" /> Lưu kết quả
                        </button>
                    )}
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 w-12 text-center">STT</th>
                                <th className="px-6 py-4 min-w-[300px]">Hạng mục đánh giá</th>
                                <th className="px-6 py-4 text-center w-24">ĐVT</th>
                                <th className="px-6 py-4 text-right w-32">Mục tiêu</th>
                                <th className="px-6 py-4 text-center w-24">Tỷ trọng</th>
                                <th className="px-6 py-4 text-right w-32 bg-indigo-50/50">Thực hiện</th>
                                <th className="px-6 py-4 text-right w-24">Điểm</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentEval.criteria.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-center text-slate-500">{idx + 1}</td>
                                    <td className="px-6 py-4 font-medium text-slate-800">{item.name}</td>
                                    <td className="px-6 py-4 text-center text-slate-500">{item.unit}</td>
                                    <td className="px-6 py-4 text-right">
                                        <input 
                                            type="number" 
                                            className="w-full text-right bg-transparent border-b border-slate-200 focus:border-indigo-500 outline-none p-1"
                                            value={item.target || ''}
                                            onChange={e => handleUpdateCriterium(idx, 'target', parseFloat(e.target.value))}
                                            placeholder="0"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-center">{item.weight}%</td>
                                    <td className="px-6 py-4 text-right bg-indigo-50/30">
                                        <input 
                                            type="number" 
                                            className="w-full text-right bg-transparent border-b-2 border-indigo-200 focus:border-indigo-600 outline-none font-bold text-indigo-700 p-1"
                                            value={item.actual || ''}
                                            onChange={e => handleUpdateCriterium(idx, 'actual', parseFloat(e.target.value))}
                                            placeholder="0"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-700">{formatNumber(item.score)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-800">
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-right uppercase text-xs text-slate-500">Tổng cộng</td>
                                <td className="px-6 py-4 text-center">100%</td>
                                <td className="px-6 py-4"></td>
                                <td className="px-6 py-4 text-right text-lg text-[#EE0033]">{formatNumber(currentEval.totalScore)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Ghi chú / Nhận xét của Quản lý
                    </label>
                    <textarea 
                        className="w-full border border-slate-300 rounded-lg p-3 h-24 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        value={currentEval.note}
                        onChange={(e) => setCurrentEval({...currentEval, note: e.target.value})}
                        placeholder="Nhập nhận xét về nhân viên trong tháng này..."
                    />
                </div>
            </div>
        )}
    </div>
  );
};

export default EmployeeEvaluationManager;
