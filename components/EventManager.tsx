
import React, { useState, useEffect } from 'react';
import { BirthdayEvent, EventType } from '../types';
import { Plus, Edit, Trash2, Search, Gift, Phone, Calendar, Upload, Save, X, Info, Users, Briefcase } from 'lucide-react';

interface EventManagerProps {
  events: BirthdayEvent[];
  initialSelectedId?: string | null;
  onClearSelection?: () => void;
  onAddEvent: (e: BirthdayEvent) => void;
  onUpdateEvent: (e: BirthdayEvent) => void;
  onDeleteEvent: (id: string) => void;
}

const EventManager: React.FC<EventManagerProps> = ({ events, initialSelectedId, onClearSelection, onAddEvent, onUpdateEvent, onDeleteEvent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterMonth, setFilterMonth] = useState<string>(''); // '' = All months, '1'...'12'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportMode, setIsImportMode] = useState(false);
  const [formData, setFormData] = useState<Partial<BirthdayEvent>>({ 
      fullName: '', 
      title: '', 
      date: '', 
      phoneNumber: '',
      type: EventType.INTERNAL 
  });
  const [importText, setImportText] = useState('');
  const [importDefaultType, setImportDefaultType] = useState<EventType>(EventType.INTERNAL);

  // Effect to handle navigation from Dashboard
  useEffect(() => {
      if (initialSelectedId) {
          const targetEvent = events.find(e => e.id === initialSelectedId);
          if (targetEvent) {
              handleOpenModal(targetEvent);
              // Clear the selection in parent to prevent reopening if user closes modal
              if (onClearSelection) onClearSelection();
          }
      }
  }, [initialSelectedId, events]);

  const filteredEvents = events.filter(e => {
    const matchText = e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      e.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'ALL' || (e.type || EventType.INTERNAL) === filterType;
    
    // Filter by Month
    const eventDate = new Date(e.date);
    const eventMonth = eventDate.getMonth() + 1; // 1-12
    const matchMonth = filterMonth === '' || eventMonth.toString() === filterMonth;

    return matchText && matchType && matchMonth;
  }).sort((a, b) => {
      // Sort by month/day (ignoring year) to show calendar order
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      const mmddA = (dateA.getMonth() + 1) * 100 + dateA.getDate();
      const mmddB = (dateB.getMonth() + 1) * 100 + dateB.getDate();
      return mmddA - mmddB;
  });

  const handleOpenModal = (event?: BirthdayEvent) => {
    if (event) {
        setFormData({ ...event, type: event.type || EventType.INTERNAL });
        setIsImportMode(false);
    } else {
        setFormData({ fullName: '', title: '', date: '', phoneNumber: '', type: EventType.INTERNAL });
        setIsImportMode(false);
    }
    setIsModalOpen(true);
  };

  const handleOpenImport = () => {
      setImportText('');
      setImportDefaultType(EventType.INTERNAL);
      setIsImportMode(true);
      setIsModalOpen(true);
  }

  const handleDelete = (id: string) => {
      if (window.confirm('Bạn có chắc chắn muốn xóa sự kiện này?')) {
          onDeleteEvent(id);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const newEvent = { ...formData } as BirthdayEvent;
      if (newEvent.id) {
          onUpdateEvent(newEvent);
      } else {
          onAddEvent({ ...newEvent, id: `evt_${Date.now()}` });
      }
      setIsModalOpen(false);
  };

  const parseImportText = () => {
      const lines = importText.split('\n');
      let count = 0;
      
      lines.forEach(line => {
          if (!line.trim()) return;
          // Example format: Quách Tuấn Anh - PGĐ Trung tâm GP Y tế số, 15/01/1985
          
          try {
              const parts = line.split(',');
              if (parts.length >= 2) {
                  const datePart = parts[parts.length - 1].trim(); // "15/01/1985"
                  const infoPart = parts.slice(0, parts.length - 1).join(',').trim(); // "Quách Tuấn Anh - PGĐ..."
                  
                  // Parse Date DD/MM/YYYY -> YYYY-MM-DD
                  const [d, m, y] = datePart.split('/');
                  if (!d || !m || !y) return;
                  const isoDate = `${y}-${m}-${d}`;

                  // Parse Name and Title
                  const separatorIndex = infoPart.indexOf(' - ');
                  let fullName = infoPart;
                  let title = '';
                  
                  if (separatorIndex > 0) {
                      fullName = infoPart.substring(0, separatorIndex).trim();
                      title = infoPart.substring(separatorIndex + 3).trim();
                  }

                  const newEvent: BirthdayEvent = {
                      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                      fullName,
                      title,
                      date: isoDate,
                      phoneNumber: '',
                      type: importDefaultType // Use the selected default type
                  };
                  
                  onAddEvent(newEvent);
                  count++;
              }
          } catch (err) {
              console.error('Error parsing line:', line, err);
          }
      });
      
      alert(`Đã nhập thành công ${count} sự kiện.`);
      setIsModalOpen(false);
  };

  const formatDate = (isoString: string) => {
      if (!isoString) return '';
      const [y, m, d] = isoString.split('-');
      return `${d}/${m}/${y}`;
  }

  return (
    <div className="space-y-6 animate-in fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Gift className="w-6 h-6 text-[#EE0033]" /> 
                    Quản lý Sự kiện / Sinh nhật
                </h1>
                <p className="text-slate-500">Danh sách ngày sinh nhật nhân sự và đối tác</p>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={handleOpenImport}
                    className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 flex items-center gap-2 font-medium"
                >
                    <Upload className="w-4 h-4" /> Nhập nhanh
                </button>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-[#EE0033] text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 shadow-sm font-medium"
                >
                    <Plus className="w-4 h-4" /> Thêm mới
                </button>
            </div>
        </div>

        {/* Filter */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4 flex-col md:flex-row">
            <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Tìm kiếm theo tên, chức danh..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="flex gap-2">
                <select 
                    className="px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[120px]"
                    value={filterMonth}
                    onChange={e => setFilterMonth(e.target.value)}
                >
                    <option value="">Cả năm</option>
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                        <option key={m} value={m.toString()}>Tháng {m}</option>
                    ))}
                </select>

                <select 
                    className="px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[150px]"
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                >
                    <option value="ALL">Tất cả loại</option>
                    <option value={EventType.INTERNAL}>Nội bộ</option>
                    <option value={EventType.CUSTOMER}>Khách hàng</option>
                </select>
            </div>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map(event => {
                const isCustomer = event.type === EventType.CUSTOMER;
                const dobYear = new Date(event.date).getFullYear();
                const currentYear = new Date().getFullYear();
                const age = currentYear - dobYear;

                return (
                    <div key={event.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group flex flex-col relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-1 h-full ${isCustomer ? 'bg-orange-500' : 'bg-indigo-500'}`}></div>
                        <div className="flex justify-between items-start pl-3">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-slate-800 text-lg">{event.fullName}</h3>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${isCustomer ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                                        {isCustomer ? 'KH' : 'NB'}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 font-medium mb-2">{event.title}</p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenModal(event)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded">
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(event.id)} className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 rounded">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between pl-3 text-sm">
                            <div className={`flex items-center gap-2 font-bold px-2 py-1 rounded ${isCustomer ? 'text-orange-700 bg-orange-50' : 'text-indigo-700 bg-indigo-50'}`}>
                                <Calendar className="w-4 h-4" />
                                {formatDate(event.date)}
                                <span className="text-xs font-normal opacity-70 ml-1">({age}t)</span>
                            </div>
                            {event.phoneNumber && (
                                <div className="flex items-center gap-1 text-slate-500">
                                    <Phone className="w-3 h-3" />
                                    {event.phoneNumber}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
            {filteredEvents.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 border border-dashed rounded-xl">
                    Chưa có dữ liệu sinh nhật phù hợp.
                </div>
            )}
        </div>

        {/* Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-800">
                            {isImportMode ? 'Nhập dữ liệu nhanh' : (formData.id ? 'Sửa thông tin' : 'Thêm mới sự kiện')}
                        </h2>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                    </div>

                    {isImportMode ? (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 flex items-start gap-2">
                                <Info className="w-5 h-5 shrink-0" />
                                <div>
                                    <p className="font-bold">Định dạng hỗ trợ:</p>
                                    <p>Tên - Chức danh, dd/mm/yyyy</p>
                                    <p className="mt-1 italic opacity-80">Ví dụ: Quách Tuấn Anh - PGĐ Trung tâm GP Y tế số, 15/01/1985</p>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Loại sự kiện mặc định cho đợt nhập này</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="importType" 
                                            checked={importDefaultType === EventType.INTERNAL} 
                                            onChange={() => setImportDefaultType(EventType.INTERNAL)}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm font-medium">Nội bộ (Nhân viên)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="importType" 
                                            checked={importDefaultType === EventType.CUSTOMER} 
                                            onChange={() => setImportDefaultType(EventType.CUSTOMER)}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm font-medium">Khách hàng / Đối tác</span>
                                    </label>
                                </div>
                            </div>

                            <textarea 
                                className="w-full h-48 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                                placeholder="Paste danh sách vào đây..."
                                value={importText}
                                onChange={e => setImportText(e.target.value)}
                            />
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
                                <button onClick={parseImportText} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                                    <Save className="w-4 h-4" /> Xử lý & Lưu
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Loại đối tượng</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className={`border rounded-lg p-3 flex items-center gap-2 cursor-pointer transition-colors ${formData.type === EventType.INTERNAL ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                                        <input 
                                            type="radio" 
                                            name="eventType" 
                                            className="hidden"
                                            checked={formData.type === EventType.INTERNAL} 
                                            onChange={() => setFormData({...formData, type: EventType.INTERNAL})} 
                                        />
                                        <Users className="w-4 h-4" /> Nội bộ
                                    </label>
                                    <label className={`border rounded-lg p-3 flex items-center gap-2 cursor-pointer transition-colors ${formData.type === EventType.CUSTOMER ? 'bg-orange-50 border-orange-500 text-orange-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                                        <input 
                                            type="radio" 
                                            name="eventType" 
                                            className="hidden"
                                            checked={formData.type === EventType.CUSTOMER} 
                                            onChange={() => setFormData({...formData, type: EventType.CUSTOMER})} 
                                        />
                                        <Briefcase className="w-4 h-4" /> Khách hàng
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label>
                                <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="Nguyễn Văn A" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Chức danh / Đơn vị</label>
                                <input type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Giám đốc..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày sinh</label>
                                    <input required type="date" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                                    <input type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} placeholder="09xxxxxxxx" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
                                <button type="submit" className="px-4 py-2 bg-[#EE0033] text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
                                    <Save className="w-4 h-4" /> Lưu lại
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};

export default EventManager;
