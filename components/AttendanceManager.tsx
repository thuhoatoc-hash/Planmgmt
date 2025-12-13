
import React, { useState, useMemo } from 'react';
import { User, AttendanceRecord, AttendanceStatusConfig, OvertimeType, UserRole, AttendanceType } from '../types';
import { Calendar as CalendarIcon, Clock, CheckCircle, Plus, Edit, User as UserIcon, ArrowLeft, ArrowRight, Sun, Moon, Briefcase, MapPin, AlignLeft } from 'lucide-react';

interface AttendanceManagerProps {
  currentUser: User;
  users: User[];
  records: AttendanceRecord[];
  statuses: AttendanceStatusConfig[];
  onAddRecord: (r: AttendanceRecord) => void;
  onUpdateRecord: (r: AttendanceRecord) => void;
}

const AttendanceManager: React.FC<AttendanceManagerProps> = ({ currentUser, users, records, statuses, onAddRecord, onUpdateRecord }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formRecord, setFormRecord] = useState<Partial<AttendanceRecord>>({});

  const isAdmin = currentUser.role === UserRole.ADMIN;
  const isManager = isAdmin || currentUser.role === UserRole.PM;

  // --- ENSURE STATUSES EXIST (FALLBACK) ---
  const displayStatuses = useMemo(() => {
      // If config exists, use it. Otherwise use defaults to satisfy user request immediately.
      if (statuses.length > 0) return statuses;
      return [
          { id: 'default_late', name: 'Đi muộn', type: 'LATE', color: 'bg-yellow-100 text-yellow-700', order: 1 },
          { id: 'default_leave', name: 'Nghỉ phép', type: 'LEAVE', color: 'bg-red-100 text-red-700', order: 2 },
          { id: 'default_sick', name: 'Nghỉ ốm', type: 'SICK', color: 'bg-rose-100 text-rose-700', order: 3 },
          { id: 'default_visit', name: 'Gặp đối tác, Khách hàng', type: 'CUSTOMER_VISIT', color: 'bg-blue-100 text-blue-700', order: 4 },
      ] as AttendanceStatusConfig[];
  }, [statuses]);

  // --- CALENDAR LOGIC ---
  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const startDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay(); // 0 is Sunday
  const monthName = selectedDate.toLocaleString('vi-VN', { month: 'long', year: 'numeric' });

  const prevMonth = () => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
  const nextMonth = () => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));

  // --- FILTERED DATA ---
  const currentMonthRecords = useMemo(() => {
      const startStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
      return records.filter(r => r.date.startsWith(startStr) && r.userId === selectedUserId);
  }, [records, selectedDate, selectedUserId]);

  const getRecordForDay = (day: number) => {
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return currentMonthRecords.find(r => r.date === dateStr);
  };

  const getStatusConfig = (id: string) => displayStatuses.find(s => s.id === id);

  // --- MODAL HANDLERS ---
  const handleDayClick = (day: number) => {
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const existing = getRecordForDay(day);
      
      if (existing) {
          setFormRecord({ ...existing });
      } else {
          // Defaults
          const defaultStatus = displayStatuses.find(s => s.type === 'CUSTOMER_VISIT') || displayStatuses[0]; 
          setFormRecord({
              userId: selectedUserId,
              date: dateStr,
              statusId: defaultStatus?.id || '',
              startTime: '08:00',
              endTime: '17:30',
              overtime: OvertimeType.NONE,
              overtimeDate: dateStr, 
              overtimeStartTime: '18:00',
              overtimeEndTime: '20:00',
              overtimeHours: 0,
              note: ''
          });
      }
      setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      
      // Calculate OT Hours if OT is selected
      let otHours = 0;
      if (formRecord.overtime !== OvertimeType.NONE && formRecord.overtimeStartTime && formRecord.overtimeEndTime) {
          const start = new Date(`2000-01-01T${formRecord.overtimeStartTime}`);
          const end = new Date(`2000-01-01T${formRecord.overtimeEndTime}`);
          const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          otHours = diff > 0 ? parseFloat(diff.toFixed(1)) : 0;
      }

      const record = { 
          ...formRecord,
          overtimeHours: otHours
      } as AttendanceRecord;

      if (record.id) {
          onUpdateRecord(record);
      } else {
          onAddRecord({ ...record, id: `att_${Date.now()}` });
      }
      setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="w-6 h-6 text-[#EE0033]" /> 
                    Điểm danh & Chấm công
                </h1>
                <p className="text-slate-500">Đăng ký lịch công tác, nghỉ phép và làm thêm giờ (OT)</p>
            </div>
            
            {/* User Selector */}
            {(isAdmin || isManager) && (
                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    <div className="px-2 text-slate-400"><UserIcon className="w-4 h-4" /></div>
                    <select 
                        className="bg-transparent outline-none text-sm font-medium text-slate-700 py-1 pr-4"
                        value={selectedUserId}
                        onChange={e => setSelectedUserId(e.target.value)}
                    >
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.fullName}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar: Quick Actions */}
            <div className="lg:col-span-1 space-y-4">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-xl text-white shadow-lg">
                    <h3 className="font-bold mb-2 text-lg">Hôm nay</h3>
                    <p className="text-indigo-100 text-sm mb-6">
                        {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <button 
                        onClick={() => handleDayClick(new Date().getDate())}
                        className="w-full bg-white text-indigo-700 py-3 rounded-lg font-bold shadow-sm hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                    >
                        <CheckCircle className="w-5 h-5" /> 
                        {getRecordForDay(new Date().getDate()) ? 'Cập nhật trạng thái' : 'Đăng ký ngay'}
                    </button>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-3 text-sm uppercase">Chú thích</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500"></div> <span>Đi khách hàng / Công tác</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div> <span>Nghỉ phép / Ốm</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div> <span>Đi muộn</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500"></div> <span>Có làm OT</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Calendar */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
                    <h2 className="text-lg font-bold text-slate-800 capitalize">{monthName}</h2>
                    <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-full"><ArrowRight className="w-5 h-5 text-slate-500" /></button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
                        <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells */}
                    {Array.from({ length: startDayOfMonth }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-28 bg-slate-50/50 rounded-lg"></div>
                    ))}

                    {/* Days */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const record = getRecordForDay(day);
                        const statusConfig = record ? getStatusConfig(record.statusId) : null;
                        const isToday = day === new Date().getDate() && selectedDate.getMonth() === new Date().getMonth() && selectedDate.getFullYear() === new Date().getFullYear();
                        
                        let bgColor = 'bg-white';
                        if (statusConfig) {
                            if (statusConfig.type === 'LEAVE' || statusConfig.type === 'SICK') bgColor = 'bg-red-50 border-red-200';
                            else if (statusConfig.type === 'LATE') bgColor = 'bg-yellow-50 border-yellow-200';
                            else if (statusConfig.type === 'CUSTOMER_VISIT') bgColor = 'bg-orange-50 border-orange-200';
                        }

                        return (
                            <div 
                                key={day} 
                                onClick={() => handleDayClick(day)}
                                className={`h-28 border rounded-lg p-2 cursor-pointer transition-all hover:shadow-md flex flex-col justify-between ${
                                    isToday ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-100 hover:border-indigo-300'
                                } ${bgColor}`}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={`text-sm font-medium ${isToday ? 'text-indigo-600' : 'text-slate-600'}`}>{day}</span>
                                    {record?.overtime !== OvertimeType.NONE && (
                                        <div className="text-[10px] bg-purple-600 text-white px-1.5 rounded-full font-bold flex items-center justify-center shadow-sm" title="Có làm OT">OT</div>
                                    )}
                                </div>
                                
                                {record ? (
                                    <div className="space-y-1">
                                        <div className={`text-xs px-1.5 py-0.5 rounded font-medium truncate ${statusConfig?.color || 'bg-slate-200'}`}>
                                            {statusConfig?.name || 'Unknown'}
                                        </div>
                                        {record.startTime && record.endTime && (
                                            <div className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                                                <Clock className="w-3 h-3 shrink-0" /> {record.startTime}-{record.endTime}
                                            </div>
                                        )}
                                        {record.overtime !== OvertimeType.NONE && (
                                            <div className="text-[10px] text-purple-700 font-medium truncate flex items-center gap-1">
                                                <Moon className="w-3 h-3 shrink-0" /> OT: {record.overtimeHours}h
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center opacity-0 hover:opacity-100 text-slate-300">
                                        <Plus className="w-6 h-6" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[95vh] overflow-y-auto">
                    <h2 className="text-xl font-bold mb-1 text-slate-800">
                        Đăng ký Chấm công
                    </h2>
                    <p className="text-sm text-slate-500 mb-4">Ngày: {new Date(formRecord.date || '').toLocaleDateString('vi-VN')}</p>
                    
                    <form onSubmit={handleSave} className="space-y-6">
                        
                        {/* 1. Loại hình (Attendance Type) */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-indigo-600" /> Chọn loại hình vắng mặt / công tác
                            </label>
                            
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {displayStatuses.filter(s => s.type !== 'PRESENT').map(s => (
                                    <label 
                                        key={s.id} 
                                        className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer transition-colors ${
                                            formRecord.statusId === s.id 
                                            ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 shadow-sm' 
                                            : 'bg-white border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        <input 
                                            type="radio" 
                                            name="status" 
                                            className="hidden" 
                                            checked={formRecord.statusId === s.id}
                                            onChange={() => setFormRecord({ ...formRecord, statusId: s.id })}
                                        />
                                        <div className={`w-3 h-3 rounded-full shrink-0 ${
                                            formRecord.statusId === s.id ? 'bg-indigo-600' : 'bg-slate-300'
                                        }`}></div>
                                        <span className={`text-sm font-medium ${formRecord.statusId === s.id ? 'text-indigo-900' : 'text-slate-700'}`}>{s.name}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Từ giờ</label>
                                    <input 
                                        type="time" 
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                        value={formRecord.startTime || '08:00'}
                                        onChange={e => setFormRecord({ ...formRecord, startTime: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Đến giờ</label>
                                    <input 
                                        type="time" 
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                        value={formRecord.endTime || '17:30'}
                                        onChange={e => setFormRecord({ ...formRecord, endTime: e.target.value })}
                                    />
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-500 italic mt-2 mb-3 flex items-start gap-1">
                                <MapPin className="w-3 h-3 mt-0.5" />
                                Ngoài khoảng thời gian đã chọn ở trên, hệ thống mặc định hiểu là bạn làm việc tại cơ quan.
                            </p>

                            {/* 2. Ghi chú (Note) - Placed immediately after time selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                                    <AlignLeft className="w-4 h-4" /> Ghi chú / Lý do
                                </label>
                                <textarea 
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-20 text-sm bg-white"
                                    value={formRecord.note || ''}
                                    onChange={e => setFormRecord({ ...formRecord, note: e.target.value })}
                                    placeholder="Nhập lý do đi muộn, nghỉ phép hoặc chi tiết công tác (địa điểm, nội dung)..."
                                />
                            </div>
                        </div>

                        {/* 3. OT Section */}
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-bold text-purple-800 flex items-center gap-2">
                                    <Moon className="w-4 h-4" /> Đăng ký Làm thêm giờ (OT)
                                </label>
                                <select 
                                    className="text-xs p-1 border rounded bg-white text-purple-700 font-medium outline-none shadow-sm"
                                    value={formRecord.overtime}
                                    onChange={e => setFormRecord({ ...formRecord, overtime: e.target.value as OvertimeType })}
                                >
                                    <option value={OvertimeType.NONE}>Không OT</option>
                                    <option value={OvertimeType.WEEKEND}>Cuối tuần</option>
                                    <option value={OvertimeType.HOLIDAY}>Ngày lễ</option>
                                </select>
                            </div>
                            
                            {formRecord.overtime !== OvertimeType.NONE && (
                                <div className="animate-in slide-in-from-top-2 pt-2 border-t border-purple-200 mt-2">
                                    <div className="mb-3">
                                        <label className="block text-xs font-medium text-purple-700 mb-1">Ngày làm OT</label>
                                        <input 
                                            type="date" 
                                            className="w-full p-2 border border-purple-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                            value={formRecord.overtimeDate || formRecord.date}
                                            onChange={e => setFormRecord({ ...formRecord, overtimeDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-purple-700 mb-1">Bắt đầu</label>
                                            <input 
                                                type="time" 
                                                className="w-full p-2 border border-purple-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                                value={formRecord.overtimeStartTime || ''}
                                                onChange={e => setFormRecord({ ...formRecord, overtimeStartTime: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-purple-700 mb-1">Kết thúc</label>
                                            <input 
                                                type="time" 
                                                className="w-full p-2 border border-purple-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                                value={formRecord.overtimeEndTime || ''}
                                                onChange={e => setFormRecord({ ...formRecord, overtimeEndTime: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Hủy</button>
                            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm">Lưu đăng ký</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default AttendanceManager;
