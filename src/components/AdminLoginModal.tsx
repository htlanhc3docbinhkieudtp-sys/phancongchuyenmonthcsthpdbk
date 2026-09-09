import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, X, AlertCircle, KeyRound, GraduationCap, Info } from 'lucide-react';

export interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
  onLoginAsTeacher?: () => void;
  onLoginAsAdmin?: () => void;
  initialRole?: 'teacher' | 'admin';
  promptReason?: string | null;
}

export const DEFAULT_TEACHER_PASSWORD = 'giaovien@123';
export const DEFAULT_ADMIN_PASSWORD = '68686868@#';

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onLoginAsTeacher,
  onLoginAsAdmin,
  initialRole = 'teacher',
  promptReason,
}) => {
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'admin'>(initialRole);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedRole(initialRole);
      setPassword('');
      setErrorMsg('');
      setShowPassword(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialRole]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = password.trim();

    // Check Admin password first
    if (cleanPass === DEFAULT_ADMIN_PASSWORD) {
      if (onLoginAsAdmin) {
        onLoginAsAdmin();
      } else if (onLoginSuccess) {
        onLoginSuccess();
      }
      onClose();
      return;
    }

    // Check Teacher password
    if (cleanPass === DEFAULT_TEACHER_PASSWORD) {
      if (onLoginAsTeacher) {
        onLoginAsTeacher();
      } else if (onLoginSuccess) {
        onLoginSuccess();
      }
      onClose();
      return;
    }

    // Invalid password
    if (selectedRole === 'teacher') {
      setErrorMsg('Mật khẩu giáo viên không chính xác. Vui lòng liên hệ nhà trường để nhận mật khẩu.');
    } else {
      setErrorMsg('Mật khẩu quản trị không chính xác. Vui lòng kiểm tra lại!');
    }
    inputRef.current?.select();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 px-6 py-4.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-700/80 border border-indigo-500/50 flex items-center justify-center shadow-inner">
              {selectedRole === 'admin' ? (
                <ShieldCheck className="w-5 h-5 text-amber-300" />
              ) : (
                <GraduationCap className="w-5 h-5 text-sky-300" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Đăng Nhập Hệ Thống</h3>
              <p className="text-xs text-indigo-200">Trường THCS & THPT Đốc Binh Kiều</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-indigo-200 hover:text-white hover:bg-indigo-700/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Switcher Tabs */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('teacher');
              setErrorMsg('');
              inputRef.current?.focus();
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              selectedRole === 'teacher'
                ? 'bg-white text-indigo-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <GraduationCap className={`w-4 h-4 ${selectedRole === 'teacher' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span>Giáo Viên (Chỉ Xem)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedRole('admin');
              setErrorMsg('');
              inputRef.current?.focus();
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              selectedRole === 'admin'
                ? 'bg-white text-indigo-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${selectedRole === 'admin' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Quản Trị Viên</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Prompt reason alert if clicked a locked tab */}
          {promptReason && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-sky-900 animate-in fade-in">
              <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{promptReason}</p>
            </div>
          )}

          {/* Role explanation */}
          {selectedRole === 'teacher' ? (
            <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-xl p-3.5 text-xs text-indigo-950 space-y-1.5">
              <div className="flex items-center justify-between font-bold text-indigo-900">
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  <span>Quyền dành cho Giáo viên toàn trường:</span>
                </div>
                <span className="text-[11px] bg-indigo-200/70 text-indigo-800 px-2 py-0.5 rounded-full font-mono font-bold">
                  giaovien@123
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed pl-5.5">
                Được xem <strong>toàn bộ các tab và dữ liệu</strong> trong ứng dụng (Phân công, Ma trận, Sổ thực dạy, Bàn làm việc...). Quyền này ở chế độ <strong>Chỉ Xem</strong>, không làm ảnh hưởng đến dữ liệu phân công gốc.
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Quyền dành riêng cho Ban Giám Hiệu & Quản trị:</span>
              </div>
              <p className="text-amber-800 leading-relaxed pl-5.5">
                Toàn quyền <strong>chỉnh sửa, phân công giáo viên, tự động gán, cấu hình năm học</strong> và đồng bộ lên Đám mây Firebase.
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {selectedRole === 'teacher' ? 'Mật khẩu Giáo viên toàn trường' : 'Mật khẩu Quản trị viên'}
              </label>
              {selectedRole === 'teacher' && (
                <button
                  type="button"
                  onClick={() => setPassword('giaovien@123')}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                >
                  Dùng giaovien@123
                </button>
              )}
            </div>
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
                placeholder={selectedRole === 'teacher' ? 'Nhập mật khẩu: giaovien@123' : 'Nhập mật khẩu quản trị...'}
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
          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              Đóng (Xem Tự Do)
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-98 ${
                selectedRole === 'admin'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>
                {selectedRole === 'teacher' ? 'Đăng Nhập Giáo Viên' : 'Đăng Nhập Quản Trị'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

