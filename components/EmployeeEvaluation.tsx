
import React, { useState, useEffect, useMemo } from 'react';
import { User, EmployeeEvaluation, KICriterium, UserRole } from '../types';
import { api } from '../services/api';
import { Save, User as UserIcon, Calendar, Trophy, AlertTriangle, FileText, Smile, Meh, Frown, CloudRain, Search, CheckCircle } from 'lucide-react';

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
          case 'A+': return <Trophy className="w-5 h-5 text-yellow-500 fill-yellow-100" />;
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

  if (loading) return <div className="p-8 text-center">Đang tải dữ liệu...</div>;

  return (
    <div className="space-y-6 animate-in fade-in h-[calc(100vh-100px)] flex flex-col">
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
                    onChange={(e) => setSelectedMonth(e.target.value)}
                />
             </div>
        </div>

        <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
            {/* LEFT SIDEBAR: Employee List */}
            <div className="col-span-12 lg:col-span-4 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <div className="relative">
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
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filteredUsers.map(user => {
                        // Check if this user has evaluation for selected month
                        const evalData = evaluations.find(e => e.userId === user.id && e.month === selectedMonth);
                        const isSelected = selectedUser === user.id;

                        return (
                            <button
                                key={user.id}
                                onClick={() => setSelectedUser(user.id)}
                                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                                    isSelected 
                                        ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' 
                                        : 'hover:bg-slate-50 border border-transparent'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                                        isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} className="w-full h-full rounded-full object-cover" />
                                        ) : user.fullName.charAt(0)}
                                    </div>
                                    <div className="text-left">
                                        <div className={`font-medium text-sm ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                                            {user.fullName}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {user.username} - {user.role}
                                        </div>
                                    </div>
                                </div>

                                {/* Score & Grade Badge */}
                                {evalData ? (
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-1">
                                            {getGradeIcon(evalData.grade)}
                                            <span className={`font-bold text-sm ${
                                                evalData.grade === 'A+' ? 'text-yellow-600' :
                                                evalData.grade === 'A' ? 'text-green-600' :
                                                evalData.grade === 'B' ? 'text-blue-600' : 
                                                'text-red-500'
                                            }`}>
                                                {evalData.grade}
                                            </span>
                                        </div>
                                        <span className="text-xs font-medium text-slate-500">{formatNumber(evalData.totalScore)} đ</span>
                                    </div>
                                ) : (
                                    <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">Chưa đánh giá</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* RIGHT SIDE: Evaluation Form */}
            <div className="col-span-12 lg:col-span-8 flex flex-col h-full overflow-y-auto">
                {currentEval ? (
                    <div className="space-y-6">
                        {/* Summary Header Card */}
                        <div className={`rounded-xl p-6 text-white shadow-md relative overflow-hidden flex items-center justify-between ${
                            currentEval.grade === 'A+' ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
                            currentEval.grade === 'A' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                            currentEval.grade === 'B' ? 'bg-gradient-to-r from-blue-500 to-indigo-600' :
                            currentEval.grade === 'C' ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                            'bg-gradient-to-r from-red-500 to-rose-600'
                        }`}>
                            <div>
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    {getGradeIcon(currentEval.grade)} 
                                    Xếp loại: {currentEval.grade}
                                </h2>
                                <p className="text-white/90 text-sm mt-1">Tổng điểm đạt được: <span className="font-bold text-lg">{formatNumber(currentEval.totalScore)}</span></p>
                            </div>
                            
                            {/* Legend */}
                            <div className="hidden md:flex gap-3 text-xs bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                                <div className="flex items-center gap-1"><Trophy className="w-3 h-3 text-yellow-200" /> A+ ({'>'}110)</div>
                                <div className="flex items-center gap-1"><Smile className="w-3 h-3 text-green-200" /> A (100-110)</div>
                                <div className="flex items-center gap-1"><Meh className="w-3 h-3 text-blue-200" /> B (90-100)</div>
                                <div className="flex items-center gap-1"><Frown className="w-3 h-3 text-orange-200" /> C (80-90)</div>
                                <div className="flex items-center gap-1"><CloudRain className="w-3 h-3 text-red-200" /> D ({'<'}80)</div>
                            </div>
                        </div>

                        {/* Form Detail */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-indigo-600" />
                                    <h3 className="font-bold text-slate-800">Chi tiết đánh giá ({currentEval.role})</h3>
                                </div>
                                {currentUser?.role === UserRole.ADMIN && (
                                    <button 
                                        onClick={handleSave}
                                        className="bg-[#EE0033] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 flex items-center gap-2 shadow-sm shadow-red-200 transition-all"
                                    >
                                        <Save className="w-4 h-4" /> Lưu kết quả
                                    </button>
                                )}
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 w-10 text-center">STT</th>
                                            <th className="px-4 py-3 min-w-[200px]">Hạng mục đánh giá</th>
                                            <th className="px-4 py-3 text-center w-20">ĐVT</th>
                                            <th className="px-4 py-3 text-right w-24">Mục tiêu</th>
                                            <th className="px-4 py-3 text-center w-20">Tỷ trọng</th>
                                            <th className="px-4 py-3 text-right w-28 bg-indigo-50/50">Thực hiện</th>
                                            <th className="px-4 py-3 text-right w-20">Điểm</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {currentEval.criteria.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 text-center text-slate-500">{idx + 1}</td>
                                                <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                                                <td className="px-4 py-3 text-center text-slate-500">{item.unit}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <input 
                                                        type="number" 
                                                        className="w-full text-right bg-transparent border-b border-slate-200 focus:border-indigo-500 outline-none p-1"
                                                        value={item.target || ''}
                                                        onChange={e => handleUpdateCriterium(idx, 'target', parseFloat(e.target.value))}
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center">{item.weight}%</td>
                                                <td className="px-4 py-3 text-right bg-indigo-50/30">
                                                    <input 
                                                        type="number" 
                                                        className="w-full text-right bg-transparent border-b-2 border-indigo-200 focus:border-indigo-600 outline-none font-bold text-indigo-700 p-1"
                                                        value={item.actual || ''}
                                                        onChange={e => handleUpdateCriterium(idx, 'actual', parseFloat(e.target.value))}
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-700">{formatNumber(item.score)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-800">
                                        <tr>
                                            <td colSpan={4} className="px-4 py-3 text-right uppercase text-xs text-slate-500">Tổng cộng</td>
                                            <td className="px-4 py-3 text-center">100%</td>
                                            <td className="px-4 py-3"></td>
                                            <td className="px-4 py-3 text-right text-lg text-[#EE0033]">{formatNumber(currentEval.totalScore)}</td>
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
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-white border border-dashed border-slate-300 rounded-xl m-1">
                        <UserIcon className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Chọn nhân viên để bắt đầu đánh giá</p>
                        <p className="text-sm">Vui lòng chọn nhân viên từ danh sách bên trái</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default EmployeeEvaluationManager;
