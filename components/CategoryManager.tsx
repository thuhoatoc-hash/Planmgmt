import React, { useState } from 'react';
import { Category, CategoryType } from '../types';
import { Folder, FolderPlus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';

interface CategoryManagerProps {
  categories: Category[];
  onAddCategory: (c: Category) => void;
  onDeleteCategory: (id: string) => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onAddCategory, onDeleteCategory }) => {
  const [newCat, setNewCat] = useState<Partial<Category>>({ name: '', code: '', type: CategoryType.REVENUE, parentId: '' });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    // Fix TS2783: Exclude 'id' and 'parentId' from spread
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, parentId: _pid, ...restCat } = newCat as Category;

    onAddCategory({
      ...restCat,
      id: `cat_${Date.now()}`,
      parentId: newCat.parentId === '' ? null : newCat.parentId!,
    });
    setNewCat({ ...newCat, name: '', code: '' });
  };

  const renderCategoryTree = (parentId: string | null, type: CategoryType, depth = 0) => {
    const subset = categories.filter(c => c.parentId === parentId && c.type === type);
    
    return subset.map(cat => {
      const hasChildren = categories.some(c => c.parentId === cat.id);
      const isExpanded = expanded[cat.id];

      return (
        <div key={cat.id} className="select-none">
          <div 
            className={`flex items-center gap-2 p-2 hover:bg-slate-50 rounded border-b border-slate-50 transition-colors ${depth === 0 ? 'font-medium text-slate-800' : 'text-slate-600'}`}
            style={{ paddingLeft: `${depth * 20 + 8}px` }}
          >
            <button 
              onClick={() => toggleExpand(cat.id)}
              className={`p-1 rounded hover:bg-slate-200 text-slate-400 ${hasChildren ? 'visible' : 'invisible'}`}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            <div className="flex items-center gap-2 flex-1">
              <Folder className={`w-4 h-4 ${type === CategoryType.REVENUE ? 'text-emerald-500' : 'text-rose-500'}`} />
              <span className="text-xs bg-slate-100 px-1.5 rounded text-slate-500 font-mono">{cat.code}</span>
              <span>{cat.name}</span>
            </div>

            <button 
              onClick={() => onDeleteCategory(cat.id)}
              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
              title="Xóa danh mục"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          {isExpanded && renderCategoryTree(cat.id, type, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* List Column */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-800">Danh mục Doanh thu</h3>
          </div>
          <div className="p-2 group">
             {renderCategoryTree(null, CategoryType.REVENUE)}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-800">Danh mục Chi phí</h3>
          </div>
          <div className="p-2 group">
             {renderCategoryTree(null, CategoryType.COST)}
          </div>
        </div>
      </div>

      {/* Form Column */}
      <div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-6">
          <div className="flex items-center gap-2 mb-6 text-indigo-700">
            <FolderPlus className="w-6 h-6" />
            <h2 className="text-lg font-bold">Thêm Danh mục</h2>
          </div>
          
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Loại danh mục</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setNewCat({...newCat, type: CategoryType.REVENUE, parentId: ''})}
                  className={`py-2 text-sm font-medium rounded-md transition-colors ${newCat.type === CategoryType.REVENUE ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Doanh thu
                </button>
                <button
                  type="button"
                  onClick={() => setNewCat({...newCat, type: CategoryType.COST, parentId: ''})}
                  className={`py-2 text-sm font-medium rounded-md transition-colors ${newCat.type === CategoryType.COST ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Chi phí
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Danh mục cha (Tùy chọn)</label>
              <select 
                className="w-full p-2 border rounded-lg bg-white"
                value={newCat.parentId || ''}
                onChange={e => setNewCat({...newCat, parentId: e.target.value})}
              >
                <option value="">-- Là danh mục gốc --</option>
                {categories
                  .filter(c => c.type === newCat.type)
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                  ))
                }
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mã danh mục</label>
              <input 
                required 
                type="text" 
                className="w-full p-2 border rounded-lg"
                value={newCat.code}
                onChange={e => setNewCat({...newCat, code: e.target.value.toUpperCase()})}
                placeholder="VD: DT-BAN-LE"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tên danh mục</label>
              <input 
                required 
                type="text" 
                className="w-full p-2 border rounded-lg"
                value={newCat.name}
                onChange={e => setNewCat({...newCat, name: e.target.value})}
                placeholder="Nhập tên..."
              />
            </div>

            <button type="submit" className="w-full py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors">
              Thêm mới
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;