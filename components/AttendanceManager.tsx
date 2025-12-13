
import React, { useState, useMemo } from 'react';
import { User, AttendanceRecord, AttendanceStatusConfig, OvertimeType, UserRole, ApprovalStatus } from '../types';
import { Clock, CheckCircle, Plus, User as UserIcon, ArrowLeft, ArrowRight, Moon, Briefcase, MapPin, AlignLeft, List, ShieldCheck, AlertCircle, X, Check, Edit, XCircle, CheckCircle2 } from 'lucide-react';

interface AttendanceManagerProps {
  currentUser: User;
  users: User[];
  records: AttendanceRecord[];
  statuses: AttendanceStatusConfig[];
  onAddRecord: (r: AttendanceRecord) => void;
  onUpdateRecord: (r: AttendanceRecord) => void;
}

const OT_REASONS = [
    'Trực lễ',
    'Làm tăng cường',
    'Họp, gặp đối tác',
    'Khác (Lưu ý ghi chú lý do)'
];

const AttendanceManager: React.FC<AttendanceManagerProps> = ({ currentUser, users, records, statuses, onAddRecord, onUpdateRecord }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);
  
  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApprovalListOpen, setIsApprovalListOpen] = useState(false); 
  
  // Management List Filter State
  const [manageFilterStatus, setManageFilterStatus] = useState<string>('PENDING'); // PENDING | APPROVED | REJECTED | ALL
  
  const [formRecord, setFormRecord] = useState<Partial<AttendanceRecord>>({});

  const isAdmin = currentUser.role === UserRole.ADMIN;
  // If admin, they are viewing another user, otherwise viewing themselves
  const isViewingOther = isAdmin && selectedUserId !== currentUser.id;

  // --- ENSURE STATUSES EXIST (FALLBACK) ---
  const displayStatuses = useMemo(() => {
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

  // --- FILTERED DATA FOR CALENDAR ---
  const currentMonthRecords = useMemo(() => {
      const startStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
      return records.filter(r => r.date.startsWith(startStr) && r.userId === selectedUserId);
  }, [records, selectedDate, selectedUserId]);

  const getRecordForDay = (day: number) => {
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return currentMonthRecords.find(r => r.date === dateStr);
  };

  const getStatusConfig = (id: string) => displayStatuses.find(s => s.id === id);

  // --- MANAGEMENT LIST LOGIC ---
  const managementRecords = useMemo(() => {
      if (!isAdmin) return [];
      let filtered = [...records];
      
      // Filter by status
      if (manageFilterStatus !== 'ALL') {
          filtered = filtered.filter(r => r.approvalStatus === manageFilterStatus);
      }
      
      return filtered.sort((a,b) => b.date.localeCompare(a.date)); // Newest first
  }, [records, isAdmin, manageFilterStatus]);

  const pendingCount = records.filter(r => r.approvalStatus === ApprovalStatus.PENDING).length;

  // --- MODAL HANDLERS ---
  const handleDayClick = (day: number) => {
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
              overtime: OvertimeType.NONE, // REQUIREMENT 1: Always Default to NONE
              overtimeReason: '',
              overtimeDate: dateStr, 
              overtimeStartTime: '18:00',
              overtimeEndTime: '20:00',
              overtimeHours: 0,
              approvalStatus: ApprovalStatus.PENDING,
              note: ''
          });
      }
      setIsModalOpen(true);
  };

  const handleEditFromList = (record: AttendanceRecord) => {
      setFormRecord({ ...record });
      setIsModalOpen(true);
      // setIsApprovalListOpen(false); // Optional: keep list open behind? Better to close to avoid z-index mess or confusion
  };

  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      
      // Calculate OT Hours
      let otHours = 0;
      if (formRecord.overtime !== OvertimeType.NONE && formRecord.overtimeStartTime && formRecord.overtimeEndTime) {
          const start = new Date(`2000-01-01T${formRecord.overtimeStartTime}`);
          const end = new Date(`2000-01-01T${formRecord.overtimeEndTime}`);
          let diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          if (diff < 0) diff += 24; // Handle overnight
          otHours = parseFloat(diff.toFixed(1));
      } else {
          // If User switched back to NO OT, clear these values
          formRecord.overtimeReason = '';
          formRecord.overtimeDate = formRecord.date;
      }

      // REQUIREMENT 2: Approval Logic
      // If Admin is saving, respect the status selected in form, defaulting to APPROVED for new records if not set.
      // If User is saving -> Always PENDING.
      let status = formRecord.approvalStatus || ApprovalStatus.PENDING;
      
      if (isAdmin) {
          if (!formRecord.id) {
              // New record by Admin -> Default to Approved unless specified
              status = formRecord.approvalStatus || ApprovalStatus.APPROVED;
          } else {
              // Edit existing -> Trust the form state (controlled by Admin buttons)
              status = formRecord.approvalStatus!;
          }

          // Validate Rejection Note
          if (status === ApprovalStatus.REJECTED && (!formRecord.reviewerNote || !formRecord.reviewerNote.trim())) {
              alert("Vui lòng nhập lý do từ chối!");
              return;
          }
      } else {
          // Normal user: Always reset to PENDING on edit/create
          status = ApprovalStatus.PENDING;
      }
      
      const record = { 
          ...formRecord,
          overtimeHours: otHours,
          approvalStatus: status,
          reviewerId: isAdmin ? currentUser.id : formRecord.reviewerId
      } as AttendanceRecord;

      if (record.id) {
          onUpdateRecord(record);
      } else {
          onAddRecord({ ...record, id: `att_${Date.now()}` });
      }
      setIsModalOpen(false);
  };

  const handleApprove = (record: AttendanceRecord) => {
      onUpdateRecord({ 
          ...record, 
          approvalStatus: ApprovalStatus.APPROVED, 
          reviewerId: currentUser.id,
          reviewerNote: '' // Clear rejection note
      });
  };

  const handleReject = (record: AttendanceRecord) => {
      const reason = window.prompt("Nhập lý do từ chối (Bắt buộc):", record.reviewerNote || "");
      if (reason === null) return; // Cancelled
      if (reason.trim() === "") {
          alert("Vui lòng nhập lý do từ chối.");
          return;
      }
      onUpdateRecord({ 
          ...record, 
          approvalStatus: ApprovalStatus.REJECTED, 
          reviewerId: currentUser.id,
          reviewerNote: reason
      });
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
            
            {/* Admin Controls */}
            {isAdmin && (
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => { setManageFilterStatus('PENDING'); setIsApprovalListOpen(true); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors shadow-sm ${
                            pendingCount > 0 
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 animate-pulse border border-amber-200' 
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        {pendingCount > 0 ? <AlertCircle className="w-4 h-4" /> : <List className="w-4 h-4" />}
                        {pendingCount > 0 ? `${pendingCount} Chờ duyệt` : 'Danh sách & Phê duyệt'}
                    </button>

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
                        <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-100">
                            <div className="w-3 h-3 rounded-full border-2 border-slate-300 bg-slate-100"></div> <span>Ngày nghỉ (T7, CN)</span>
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
                    {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d, i) => (
                        <div key={d} className={`text-center text-xs font-semibold py-2 ${i===0 || i===6 ? 'text-red-400' : 'text-slate-400'}`}>{d}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells */}
                    {Array.from({ length: startDayOfMonth }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-28 bg-slate-50/30 rounded-lg"></div>
                    ))}

                    {/* Days */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
                        const dayOfWeek = date.getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sun or Sat

                        const record = getRecordForDay(day);
                        const statusConfig = record ? getStatusConfig(record.statusId) : null;
                        const isToday = day === new Date().getDate() && selectedDate.getMonth() === new Date().getMonth() && selectedDate.getFullYear() === new Date().getFullYear();
                        
                        let bgColor = isWeekend ? 'bg-slate-100 text-slate-400' : 'bg-white';
                        let borderColor = isToday ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-100 hover:border-indigo-300';

                        // Override color if record exists
                        if (record && statusConfig) {
                            if (statusConfig.type === 'LEAVE' || statusConfig.type === 'SICK') bgColor = 'bg-red-50 border-red-200';
                            else if (statusConfig.type === 'LATE') bgColor = 'bg-yellow-50 border-yellow-200';
                            else if (statusConfig.type === 'CUSTOMER_VISIT') bgColor = 'bg-orange-50 border-orange-200';
                            else bgColor = 'bg-white'; // Present
                        }

                        // Approval Status Indicator
                        let statusIndicator = null;
                        if (record) {
                            if (record.approvalStatus === ApprovalStatus.PENDING) {
                                statusIndicator = <div className="w-2 h-2 rounded-full bg-amber-500 absolute top-2 right-2 shadow-sm" title="Chờ duyệt"></div>;
                            } else if (record.approvalStatus === ApprovalStatus.REJECTED) {
                                statusIndicator = <div className="w-2 h-2 rounded-full bg-red-500 absolute top-2 right-2 shadow-sm" title="Đã từ chối"></div>;
                            } else {
                                statusIndicator = <div className="w-2 h-2 rounded-full bg-emerald-500 absolute top-2 right-2 shadow-sm" title="Đã duyệt"></div>;
                            }
                        }

                        return (
                            <div 
                                key={day} 
                                onClick={() => handleDayClick(day)}
                                className={`h-28 border rounded-lg p-2 cursor-pointer transition-all hover:shadow-md flex flex-col justify-between relative ${borderColor} ${bgColor}`}
                            >
                                {statusIndicator}
                                <div className="flex justify-between items-start">
                                    <span className={`text-sm font-medium ${isToday ? 'text-indigo-600' : ''}`}>{day}</span>
                                    {record?.overtime !== OvertimeType.NONE && (
                                        <div className="text-[10px] bg-purple-600 text-white px-1.5 rounded-full font-bold flex items-center justify-center shadow-sm mr-2" title="Có làm OT">OT</div>
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
                                    !isWeekend && (
                                        <div className="flex-1 flex items-center justify-center opacity-0 hover:opacity-100 text-slate-300">
                                            <Plus className="w-6 h-6" />
                                        </div>
                                    )
                                )}
                            </div>
                        );
                    })}
                </tbody>
            </div>
        </div>

        {/* --- MANAGEMENT LIST MODAL (REPLACES APPROVAL LIST) --- */}
        {isApprovalListOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl max-w-5xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <ShieldCheck className="w-6 h-6 text-indigo-600" />
                            Quản lý & Phê duyệt Chấm công
                        </h2>
                        <button onClick={() => setIsApprovalListOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                        <button 
                            onClick={() => setManageFilterStatus('PENDING')}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${manageFilterStatus === 'PENDING' ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            <AlertCircle className="w-4 h-4" /> Chờ duyệt ({records.filter(r => r.approvalStatus === 'PENDING').length})
                        </button>
                        <button 
                            onClick={() => setManageFilterStatus('APPROVED')}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${manageFilterStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            <CheckCircle className="w-4 h-4" /> Đã duyệt
                        </button>
                        <button 
                            onClick={() => setManageFilterStatus('REJECTED')}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${manageFilterStatus === 'REJECTED' ? 'bg-red-100 text-red-700 ring-2 ring-red-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            <X className="w-4 h-4" /> Đã từ chối
                        </button>
                        <button 
                            onClick={() => setManageFilterStatus('ALL')}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${manageFilterStatus === 'ALL' ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            <List className="w-4 h-4" /> Tất cả
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3">Nhân viên</th>
                                    <th className="px-4 py-3">Ngày</th>
                                    <th className="px-4 py-3">Loại hình</th>
                                    <th className="px-4 py-3">Thời gian / OT</th>
                                    <th className="px-4 py-3">Lý do / Ghi chú</th>
                                    <th className="px-4 py-3 text-center">Trạng thái</th>
                                    <th className="px-4 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {managementRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                                            Không có bản ghi nào.
                                        </td>
                                    </tr>
                                ) : (
                                    managementRecords.map(record => {
                                        const user = users.find(u => u.id === record.userId);
                                        const status = getStatusConfig(record.statusId);
                                        return (
                                            <tr key={record.id} className="hover:bg-slate-50 group">
                                                <td className="px-4 py-3 font-medium text-slate-800">{user?.fullName || 'Unknown'}</td>
                                                <td className="px-4 py-3">{new Date(record.date).toLocaleDateString('vi-VN')}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${status?.color || 'bg-slate-100'}`}>
                                                        {status?.name || '---'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div>{record.startTime} - {record.endTime}</div>
                                                    {record.overtime !== OvertimeType.NONE && (
                                                        <div className="text-purple-600 text-xs font-bold mt-1">
                                                            OT: {record.overtimeHours}h
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 max-w-xs text-slate-600">
                                                    {record.note && <div className="truncate" title={record.note}>{record.note}</div>}
                                                    {record.overtimeReason && <div className="text-xs text-purple-700 font-medium mt-0.5">{record.overtimeReason}</div>}
                                                    {record.reviewerNote && (
                                                        <div className="text-xs text-red-600 font-medium mt-1 border-t border-red-100 pt-1">
                                                            Lý do từ chối: {record.reviewerNote}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                        record.approvalStatus === ApprovalStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' :
                                                        record.approvalStatus === ApprovalStatus.REJECTED ? 'bg-red-100 text-red-700' :
                                                        'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {record.approvalStatus}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {/* Approve Button: Show if PENDING or REJECTED */}
                                                        {(record.approvalStatus === ApprovalStatus.PENDING || record.approvalStatus === ApprovalStatus.REJECTED) && (
                                                            <button 
                                                                onClick={() => handleApprove(record)}
                                                                className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded shadow-sm"
                                                                title="Duyệt"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        
                                                        {/* Reject Button: Show if PENDING or APPROVED */}
                                                        {(record.approvalStatus === ApprovalStatus.PENDING || record.approvalStatus === ApprovalStatus.APPROVED) && (
                                                            <button 
                                                                onClick={() => handleReject(record)}
                                                                className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded shadow-sm"
                                                                title={record.approvalStatus === ApprovalStatus.APPROVED ? "Hủy duyệt / Từ chối" : "Từ chối"}
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        )}

                                                        <button 
                                                            onClick={() => handleEditFromList(record)}
                                                            className="p-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded shadow-sm"
                                                            title="Sửa chi tiết"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* --- DETAIL/EDIT MODAL (EXISTING) --- */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[95vh] overflow-y-auto relative">
                    {/* Status Badge */}
                    {formRecord.approvalStatus && (
                        <div className={`absolute top-6 right-6 px-3 py-1 rounded-full text-xs font-bold border ${
                            formRecord.approvalStatus === ApprovalStatus.APPROVED ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                            formRecord.approvalStatus === ApprovalStatus.REJECTED ? 'bg-red-100 text-red-700 border-red-200' :
                            'bg-amber-100 text-amber-700 border-amber-200'
                        }`}>
                            {formRecord.approvalStatus === ApprovalStatus.APPROVED ? 'ĐÃ DUYỆT' :
                             formRecord.approvalStatus === ApprovalStatus.REJECTED ? 'TỪ CHỐI' : 'CHỜ DUYỆT'}
                        </div>
                    )}

                    <h2 className="text-xl font-bold mb-1 text-slate-800">
                        {isAdmin && isViewingOther ? 'Quản lý Chấm công (Admin)' : 'Đăng ký Chấm công'}
                    </h2>
                    <p className="text-sm text-slate-500 mb-4">Ngày: {new Date(formRecord.date || '').toLocaleDateString('vi-VN')} - {users.find(u => u.id === formRecord.userId)?.fullName}</p>
                    
                    <form onSubmit={handleSave} className="space-y-6">
                        
                        {/* 1. Loại hình (Attendance Type) */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-indigo-600" /> Loại hình vắng mặt / công tác
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

                            {/* 2. Ghi chú (Note) */}
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

                        {/* 3. OT Section - Conditional Render */}
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
                                    <div className="grid grid-cols-2 gap-4 mb-3">
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
                                    
                                    {/* New Reason Select */}
                                    <div>
                                         <label className="block text-xs font-medium text-purple-700 mb-1 flex items-center gap-1">
                                            <List className="w-3 h-3" /> Lý do OT
                                         </label>
                                         <select
                                            className="w-full p-2 border border-purple-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                            value={formRecord.overtimeReason || ''}
                                            onChange={e => setFormRecord({ ...formRecord, overtimeReason: e.target.value })}
                                         >
                                             <option value="">-- Chọn lý do --</option>
                                             {OT_REASONS.map(reason => (
                                                 <option key={reason} value={reason}>{reason}</option>
                                             ))}
                                         </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Admin Approval Section (Show for Admin regardless of status to allow edits) */}
                        {isAdmin && formRecord.id && (
                            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mt-4">
                                <label className="block text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4" /> Xét duyệt (Admin)
                                </label>
                                
                                <div className="flex gap-2 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormRecord({...formRecord, approvalStatus: ApprovalStatus.APPROVED})}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors flex items-center justify-center gap-2 ${formRecord.approvalStatus === ApprovalStatus.APPROVED ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Đã duyệt
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormRecord({...formRecord, approvalStatus: ApprovalStatus.REJECTED})}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors flex items-center justify-center gap-2 ${formRecord.approvalStatus === ApprovalStatus.REJECTED ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                                    >
                                        <XCircle className="w-4 h-4" /> Từ chối
                                    </button>
                                     <button
                                        type="button"
                                        onClick={() => setFormRecord({...formRecord, approvalStatus: ApprovalStatus.PENDING})}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors flex items-center justify-center gap-2 ${formRecord.approvalStatus === ApprovalStatus.PENDING ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                                    >
                                        <AlertCircle className="w-4 h-4" /> Chờ duyệt
                                    </button>
                                </div>

                                {formRecord.approvalStatus === ApprovalStatus.REJECTED && (
                                    <div className="animate-in fade-in slide-in-from-top-1">
                                        <label className="block text-xs font-bold text-red-700 mb-1">Lý do từ chối <span className="text-red-500">*</span></label>
                                        <textarea 
                                            className="w-full p-2 border border-red-300 rounded bg-white text-sm focus:ring-2 focus:ring-red-500 outline-none"
                                            placeholder="Nhập lý do từ chối..."
                                            value={formRecord.reviewerNote || ''}
                                            onChange={e => setFormRecord({ ...formRecord, reviewerNote: e.target.value })}
                                        />
                                    </div>
                                )}
                                
                                {formRecord.approvalStatus !== ApprovalStatus.REJECTED && (
                                     <div>
                                        <label className="block text-xs font-medium text-amber-800 mb-1">Ghi chú của người duyệt</label>
                                        <input 
                                            type="text"
                                            className="w-full p-2 border border-amber-200 rounded bg-white text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                            placeholder="Ghi chú (tùy chọn)..."
                                            value={formRecord.reviewerNote || ''}
                                            onChange={e => setFormRecord({ ...formRecord, reviewerNote: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Hủy</button>
                            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm">
                                {isAdmin ? 'Lưu & Duyệt' : 'Gửi đăng ký'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default AttendanceManager;
