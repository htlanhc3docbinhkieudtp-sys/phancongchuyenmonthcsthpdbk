import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, AlertCircle, KeyRound, School } from 'lucide-react';

export interface AdminLoginModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onLoginSuccess: () => void;
  onLoginAsAdmin?: () => void;
  promptReason?: string | null;
  isFullScreen?: boolean;
}

export const DEFAULT_ADMIN_PASSWORD = '68686868@#';
export const ALT_ADMIN_PASSWORD = 'admin@123';

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen = true,
  onClose,
  onLoginSuccess,
  onLoginAsAdmin,
  promptReason,
  isFullScreen = false,
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
    const cleanPass = password.trim();

    // Verify Admin password (accepts 68686868@#, admin@123, or admin)
    if (cleanPass === DEFAULT_ADMIN_PASSWORD || cleanPass === ALT_ADMIN_PASSWORD || cleanPass === 'admin') {
      if (onLoginAsAdmin) {
        onLoginAsAdmin();
      } else {
        onLoginSuccess();
      }
      if (onClose) onClose();
      return;
    }

    setErrorMsg('Mật khẩu quản trị không chính xác. Vui lòng kiểm tra lại!');
    inputRef.current?.select();
  };

  const content = (
    <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 px-7 py-6 text-white text-center relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-indigo-600/40 border border-amber-400/40 flex items-center justify-center shadow-lg mb-3">
          <ShieldCheck className="w-7 h-7 text-amber-300" />
        </div>

        <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400/20 border border-amber-400/30 text-amber-300 mb-2">
          Khu Vực Bảo Mật Nội Bộ
        </span>

        <h2 className="font-extrabold text-base tracking-tight text-white uppercase">
          Trường THCS & THPT Đốc Binh Kiều
        </h2>
        <p className="text-xs text-indigo-200/90 mt-1">
          Hệ Thống Phân Công Chuyên Môn & Thời Khóa Biểu
        </p>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-7 space-y-5">
        {promptReason && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{promptReason}</p>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-600 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-xs">Yêu cầu quyền Quản trị viên</h4>
            <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">
              Hệ thống đã khóa truy cập tự do. Chỉ Quản trị viên có mật khẩu mới có quyền truy cập, xem và quản lý dữ liệu.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Mật khẩu Quản trị viên
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <KeyRound className="w-4 h-4" />
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
              className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-2xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-rose-600 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Submit button */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-3 px-5 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 rounded-xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
          >
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            <span>Đăng Nhập Quản Trị</span>
          </button>
        </div>

        <div className="text-center pt-1">
          <p className="text-[11px] text-slate-400">
            Trường THCS & THPT Đốc Binh Kiều &bull; Bảo mật nội bộ
          </p>
        </div>
      </form>
    </div>
  );

  if (isFullScreen) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      {content}
    </div>
  );
};
