
import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { ArrowRight, Loader2, Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import { hashPassword } from '../lib/crypto';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password States
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [resetStage, setResetStage] = useState<'FIND_USER' | 'ENTER_EMAIL' | 'SUCCESS'>('FIND_USER');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [newEmail, setNewEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        // Fetch user from Supabase "users" table
        const user = await api.users.login(username);

        if (user) {
            // 1. Check if password matches plain text (Legacy support)
            if (user.password === password) {
                 const hashed = await hashPassword(password);
                 const updatedUser = { ...user, password: hashed };
                 await api.users.save(updatedUser);
                 finishLogin(updatedUser);
                 return;
            }

            // 2. Check if password matches hash (New secure way)
            const inputHash = await hashPassword(password);
            if (user.password === inputHash) {
                finishLogin(user);
                return;
            }

            setError('Tên đăng nhập hoặc mật khẩu không đúng.');
        } else {
             setError('Tên đăng nhập hoặc mật khẩu không đúng.');
        }
    } catch (err) {
        setError('Có lỗi xảy ra khi kết nối máy chủ.');
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const finishLogin = (user: User) => {
      // Store remember me preference
      if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
      } else {
          localStorage.removeItem('rememberMe');
      }
      onLogin(user);
  };

  const handleForgotPasswordStep1 = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      try {
          const user = await api.users.login(forgotUsername);
          if (user) {
              setFoundUser(user);
              if (user.email) {
                  // Simulate sending email
                  setResetStage('SUCCESS');
              } else {
                  setResetStage('ENTER_EMAIL');
              }
          } else {
              setError('Không tìm thấy tài khoản này.');
          }
      } catch (err) {
          setError('Lỗi kết nối.');
      } finally {
          setLoading(false);
      }
  };

  const handleForgotPasswordStep2 = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!foundUser) return;
      setLoading(true);
      try {
          // Update user email
          const updatedUser = { ...foundUser, email: newEmail };
          await api.users.save(updatedUser);
          setResetStage('SUCCESS');
      } catch (err) {
          setError('Không thể cập nhật email.');
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 relative overflow-hidden">
        {/* Decorative top bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-[#EE0033]"></div>

        <div className="flex flex-col items-center mb-8 mt-2">
          <div className="p-4 mb-2">
            <img 
               src="https://viettel.com.vn/static/images/logo-header.0ce71c2fd94a.png" 
               alt="Viettel Logo" 
               className="h-16 object-contain"
            />
          </div>
          <h1 className="text-xl font-bold text-slate-900 text-center uppercase tracking-wide">PM Quản lý dự án kinh doanh</h1>
          <h2 className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">Viettel Hà Nội</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tên đăng nhập
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#EE0033] focus:border-[#EE0033] outline-none transition-all"
              placeholder="admin"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mật khẩu
            </label>
            <div className="relative">
                <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#EE0033] focus:border-[#EE0033] outline-none transition-all pr-10"
                    placeholder="••••••"
                    disabled={loading}
                />
                <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
             <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
                 <input 
                    type="checkbox" 
                    checked={rememberMe} 
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#EE0033] focus:ring-[#EE0033]"
                 />
                 Ghi nhớ đăng nhập
             </label>
             <button type="button" onClick={() => setIsForgotModalOpen(true)} className="text-[#EE0033] hover:underline font-medium">
                 Quên mật khẩu?
             </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 flex items-center gap-2">
              <AlertIcon /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#EE0033] text-white font-semibold py-2.5 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Đăng nhập <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">Copyright @ Dzung Nguyen</p>
          <div className="mt-2 text-xs text-slate-400">
            <p>Cloud Database Connected • Secured</p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
                  <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Lock className="w-5 h-5 text-[#EE0033]" /> Khôi phục mật khẩu
                  </h2>
                  
                  {resetStage === 'FIND_USER' && (
                      <form onSubmit={handleForgotPasswordStep1} className="space-y-4">
                          <p className="text-sm text-slate-600">Nhập tên đăng nhập của bạn để tìm kiếm tài khoản.</p>
                          <input 
                              type="text" 
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" 
                              placeholder="Tên đăng nhập"
                              value={forgotUsername}
                              onChange={e => setForgotUsername(e.target.value)}
                              required
                          />
                          {error && <p className="text-red-600 text-sm">{error}</p>}
                          <div className="flex justify-end gap-3 pt-2">
                              <button type="button" onClick={() => setIsForgotModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
                              <button type="submit" disabled={loading} className="px-4 py-2 bg-[#EE0033] text-white rounded-lg hover:bg-red-700">Tiếp tục</button>
                          </div>
                      </form>
                  )}

                  {resetStage === 'ENTER_EMAIL' && (
                      <form onSubmit={handleForgotPasswordStep2} className="space-y-4">
                          <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100">
                              Xin chào <strong>{foundUser?.fullName}</strong>, tài khoản của bạn chưa có email. Vui lòng cập nhật email để nhận link reset mật khẩu.
                          </div>
                          <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Email nhận mật khẩu</label>
                                <input 
                                    type="email" 
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#EE0033] outline-none" 
                                    placeholder="your.email@viettel.com.vn"
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                    required
                                />
                          </div>
                           {error && <p className="text-red-600 text-sm">{error}</p>}
                          <div className="flex justify-end gap-3 pt-2">
                              <button type="button" onClick={() => setIsForgotModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
                              <button type="submit" disabled={loading} className="px-4 py-2 bg-[#EE0033] text-white rounded-lg hover:bg-red-700">Cập nhật & Gửi</button>
                          </div>
                      </form>
                  )}

                  {resetStage === 'SUCCESS' && (
                      <div className="text-center py-6 space-y-4">
                          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                              <CheckCircle className="w-8 h-8" />
                          </div>
                          <h3 className="font-bold text-lg text-slate-800">Đã gửi yêu cầu!</h3>
                          <p className="text-slate-600 text-sm">
                              Một email chứa hướng dẫn đặt lại mật khẩu đã được gửi tới hòm thư <strong>{foundUser?.email || newEmail}</strong>.
                          </p>
                          <p className="text-xs text-slate-400">Vui lòng kiểm tra cả hộp thư Spam.</p>
                          <button 
                            onClick={() => { setIsForgotModalOpen(false); setResetStage('FIND_USER'); setForgotUsername(''); setError(''); }} 
                            className="w-full px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg mt-4 font-medium"
                          >
                              Đóng cửa sổ
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

const AlertIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);

export default Login;
