
import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { Signal, ArrowRight, Loader2 } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        // Fetch user from Supabase "users" table
        const user = await api.users.login(username);

        if (user && user.password === password) {
             onLogin(user);
        } else {
             setError('Tên đăng nhập hoặc mật khẩu không đúng.');
        }
    } catch (err) {
        setError('Có lỗi xảy ra khi kết nối máy chủ.');
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
          <div className="bg-red-50 p-4 rounded-full mb-4">
            <Signal className="w-10 h-10 text-[#EE0033]" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 text-center uppercase tracking-wide">PM Quản lý dự án kinh doanh</h1>
          <h2 className="text-lg font-bold text-[#EE0033] mt-1">VIETTEL HÀ NỘI</h2>
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#EE0033] focus:border-[#EE0033] outline-none transition-all"
              placeholder="••••••"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
              {error}
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
            <p>Cloud Database Connected</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
