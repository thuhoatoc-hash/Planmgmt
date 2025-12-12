
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Image as ImageIcon, Save, Clock, AlertTriangle, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { api } from '../services/api';

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2301&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2664&auto=format&fit=crop"
];

const BannerManager: React.FC = () => {
  const [images, setImages] = useState<string[]>([]);
  const [intervalTime, setIntervalTime] = useState(3000);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
      setLoading(true);
      try {
          const config = await api.settings.getBannerConfig();
          if (config) {
              if(config.images && config.images.length > 0) setImages(config.images);
              else setImages(DEFAULT_IMAGES);
              
              if(config.interval) setIntervalTime(config.interval);
              setEnabled(config.enabled ?? true);
          } else {
              setImages(DEFAULT_IMAGES);
              setEnabled(true);
          }
      } catch (e) {
          console.error("Error loading banner settings", e);
      } finally {
          setLoading(false);
      }
  };

  const saveConfig = async (newImages: string[], newInterval: number, newEnabled: boolean) => {
      // Don't set loading globally here if we want to handle UI state locally for better UX
      try {
          const success = await api.settings.saveBannerConfig({
              images: newImages,
              interval: newInterval,
              enabled: newEnabled
          });
          if (success) {
              setImages(newImages);
              setIntervalTime(newInterval);
              setEnabled(newEnabled);
              return true;
          }
          return false;
      } catch (e) {
          console.error(e);
          return false;
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      
      // Limit size (e.g. 1.5MB) to prevent DB bloat since we store base64 in jsonb
      if (file.size > 1.5 * 1024 * 1024) {
          alert("File ảnh quá lớn. Vui lòng chọn ảnh < 1.5MB để đảm bảo hiệu năng.");
          return;
      }

      setUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const newImages = [...images, base64String];
        
        const success = await saveConfig(newImages, intervalTime, enabled);
        setUploading(false);
        
        if (success) {
            alert("Đã upload ảnh thành công!");
        } else {
            alert("Lỗi khi lưu ảnh. Vui lòng thử lại.");
        }
        
        // Reset input so same file can be selected again if needed
        if(fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = async (index: number) => {
      if (confirm("Bạn có chắc chắn muốn xóa ảnh banner này?")) {
          setLoading(true);
          const newImages = images.filter((_, i) => i !== index);
          await saveConfig(newImages, intervalTime, enabled);
          setLoading(false);
      }
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value);
      setIntervalTime(val);
  };

  const handleSaveSettings = async () => {
      setLoading(true);
      await saveConfig(images, intervalTime, enabled);
      setLoading(false);
      alert('Đã lưu cấu hình banner thành công!');
  };

  const toggleEnabled = async () => {
      const newState = !enabled;
      // Optimistic update
      setEnabled(newState);
      // Save
      await saveConfig(images, intervalTime, newState);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
        <div>
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <ImageIcon className="w-6 h-6 text-indigo-600" /> Quản lý Banner & Giao diện
            </h3>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
                <p className="text-sm text-blue-700">
                    <strong>Lưu ý:</strong> Ảnh tải lên sẽ được lưu trữ vào hệ thống và hiển thị cho <strong>tất cả người dùng</strong>. Vui lòng chọn ảnh có kích thước dưới 1.5MB và tỉ lệ ngang (16:9 hoặc 21:9) để hiển thị tốt nhất.
                </p>
            </div>
            
            {/* Settings Section */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" /> Cấu hình hiển thị
                </h4>
                <div className="flex flex-col md:flex-row md:items-end gap-6">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Trạng thái Banner</label>
                        <button 
                            onClick={toggleEnabled}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border ${
                                enabled 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                : 'bg-slate-50 border-slate-200 text-slate-500'
                            }`}
                        >
                            {enabled ? <ToggleRight className="w-6 h-6 text-indigo-600" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
                            <span className="font-bold">{enabled ? 'Đang Hiển thị (ON)' : 'Đang Ẩn (OFF)'}</span>
                        </button>
                    </div>

                    <div className="flex-1 max-w-xs">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Thời gian chuyển ảnh (ms)</label>
                        <input 
                            type="number" 
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                            value={intervalTime}
                            onChange={handleIntervalChange}
                            step={500}
                            min={1000}
                            disabled={!enabled}
                        />
                        <p className="text-xs text-slate-500 mt-1">1000ms = 1 giây</p>
                    </div>
                    
                    <button 
                        onClick={handleSaveSettings}
                        disabled={loading}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium shadow-sm h-[42px] disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Lưu cài đặt
                    </button>
                </div>
            </div>

            {/* Images Section */}
            <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm ${!enabled ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h4 className="font-bold text-slate-700">Danh sách Ảnh Banner ({images.length})</h4>
                    </div>
                    
                    <div className="flex gap-2">
                        <input 
                            type="file" 
                            accept="image/*" 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={handleFileUpload} 
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading || loading}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm font-medium disabled:opacity-50 transition-all"
                        >
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} 
                            {uploading ? 'Đang xử lý...' : 'Upload Ảnh mới'}
                        </button>
                    </div>
                </div>

                {images.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 flex flex-col items-center">
                        <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
                        <p>Chưa có ảnh nào. Hệ thống sẽ sử dụng ảnh mặc định.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {images.map((img, idx) => (
                            <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 shadow-sm aspect-video bg-slate-100">
                                <img src={img} alt={`Banner ${idx}`} className="w-full h-full object-cover" />
                                
                                {/* Overlay Actions */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                                    <button 
                                        onClick={() => handleDelete(idx)}
                                        className="bg-white text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors shadow-lg font-medium flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" /> Xóa ảnh
                                    </button>
                                </div>
                                
                                <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded font-mono backdrop-blur-md">
                                    Slide #{idx + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default BannerManager;
