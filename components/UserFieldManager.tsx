
import React, { useState } from 'react';
import { UserFieldDefinition, FieldType } from '../types';
import { Plus, Trash2, Settings2 } from 'lucide-react';

interface UserFieldManagerProps {
  fields: UserFieldDefinition[];
  onAddField: (f: UserFieldDefinition) => void;
  onDeleteField: (id: string) => void;
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
    { value: 'text', label: 'Văn bản (Text)' },
    { value: 'number', label: 'Số (Number)' },
    { value: 'date', label: 'Ngày tháng (Date)' },
    { value: 'select', label: 'Danh sách chọn (Select)' },
    { value: 'image', label: 'Link hình ảnh (Image URL)' },
];

const UserFieldManager: React.FC<UserFieldManagerProps> = ({ fields, onAddField, onDeleteField }) => {
  const [newField, setNewField] = useState<Partial<UserFieldDefinition>>({
      key: '',
      label: '',
      type: 'text',
      options: '',
      required: false
  });

  const handleAdd = (e: React.FormEvent) => {
      e.preventDefault();
      // Auto generate key if empty based on label
      let key = newField.key;
      if (!key && newField.label) {
          key = newField.label.toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
                .replace(/\s+/g, '_') // replace space with underscore
                .replace(/[^a-z0-9_]/g, ''); // remove special chars
      }

      onAddField({
          ...newField,
          key: key || `field_${Date.now()}`,
          id: `fdef_${Date.now()}`
      } as UserFieldDefinition);

      setNewField({ key: '', label: '', type: 'text', options: '', required: false });
  };

  const handleDelete = (id: string) => {
      if (window.confirm('Bạn có chắc chắn muốn xóa trường này? Dữ liệu người dùng liên quan có thể bị ẩn.')) {
          onDeleteField(id);
      }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
             <h3 className="text-xl font-bold text-slate-800">Danh sách Trường tùy chỉnh (Custom Fields)</h3>
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                 <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                         <tr>
                             <th className="px-6 py-3">Nhãn hiển thị</th>
                             <th className="px-6 py-3">Mã trường (Key)</th>
                             <th className="px-6 py-3">Loại dữ liệu</th>
                             <th className="px-6 py-3 text-center">Bắt buộc</th>
                             <th className="px-6 py-3 text-center">Xóa</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {fields.length === 0 ? (
                             <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Chưa có trường tùy chỉnh nào.</td></tr>
                         ) : fields.map(field => (
                             <tr key={field.id} className="hover:bg-slate-50">
                                 <td className="px-6 py-3 font-medium text-slate-800">{field.label}</td>
                                 <td className="px-6 py-3 font-mono text-slate-500 text-xs">{field.key}</td>
                                 <td className="px-6 py-3">
                                     <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs border border-indigo-100">
                                         {FIELD_TYPES.find(t => t.value === field.type)?.label}
                                     </span>
                                     {field.type === 'select' && (
                                         <div className="text-xs text-slate-400 mt-1 truncate max-w-[150px]">{field.options}</div>
                                     )}
                                 </td>
                                 <td className="px-6 py-3 text-center">
                                     {field.required ? <span className="text-red-600 font-bold">Yes</span> : <span className="text-slate-400">No</span>}
                                 </td>
                                 <td className="px-6 py-3 text-center">
                                     <button onClick={() => handleDelete(field.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                                         <Trash2 className="w-4 h-4" />
                                     </button>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        </div>

        <div>
             <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-6">
                 <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                     <Settings2 className="w-5 h-5 text-indigo-600" /> Thêm trường mới
                 </h3>
                 <form onSubmit={handleAdd} className="space-y-4">
                     <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Tên hiển thị (Label)</label>
                         <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newField.label} onChange={e => setNewField({...newField, label: e.target.value})} placeholder="VD: Giới tính, Ngân hàng..." />
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Mã trường (Key - Tự động nếu để trống)</label>
                         <input type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm" value={newField.key} onChange={e => setNewField({...newField, key: e.target.value})} placeholder="VD: gender" />
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Loại dữ liệu</label>
                         <select className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none" value={newField.type} onChange={e => setNewField({...newField, type: e.target.value as FieldType})}>
                             {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                         </select>
                     </div>
                     
                     {newField.type === 'select' && (
                         <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Các lựa chọn (phân cách bằng dấu phẩy)</label>
                             <input type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newField.options} onChange={e => setNewField({...newField, options: e.target.value})} placeholder="Nam,Nữ,Khác" />
                         </div>
                     )}

                     <div className="flex items-center gap-2">
                         <input type="checkbox" id="req" checked={newField.required} onChange={e => setNewField({...newField, required: e.target.checked})} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                         <label htmlFor="req" className="text-sm text-slate-700">Bắt buộc nhập</label>
                     </div>

                     <button type="submit" className="w-full py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors flex items-center justify-center gap-2">
                         <Plus className="w-4 h-4" /> Thêm trường
                     </button>
                 </form>
             </div>
        </div>
    </div>
  );
};

export default UserFieldManager;
