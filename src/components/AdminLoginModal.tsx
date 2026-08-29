import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, X, AlertCircle, KeyRound } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

const ADMIN_PASSWORD = '68686868@#';

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setErrorMsg('');
      setShowPassword(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() === ADMIN_PASSWORD) {
      onLoginSuccess();
      onClose();
    } else {
      setErrorMsg('Mật khẩu quản trị không chính xác. Vui lòng kiểm tra lại!');
      inputRef.current?.select();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-700/80 border border-indigo-500/50 flex items-center justify-center shadow-inner">
              <KeyRound className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Xác thực Quyền Quản Trị</h3>
              <p className="text-xs text-indigo-200">THCS & THPT Đốc Binh Kiều</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-indigo-200 hover:text-white hover:bg-indigo-700/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">Chế độ phân quyền chỉnh sửa</p>
              <p className="text-amber-800 mt-0.5 leading-relaxed">
                Người dùng thông thường chỉ có quyền <strong>Xem và Xuất báo cáo</strong>. Nhập mật khẩu quản trị để mở khóa toàn bộ quyền thay đổi dữ liệu và đồng bộ Đám mây.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mật khẩu Quản trị
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Nhập mật khẩu quản trị..."
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-rose-600 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-98 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Đăng nhập Quản trị</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
