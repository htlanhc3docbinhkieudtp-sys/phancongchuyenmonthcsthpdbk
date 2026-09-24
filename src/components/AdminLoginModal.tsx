import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  UserCheck,
  GraduationCap,
  Search,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Teacher } from '../types';

export interface AdminLoginModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onLoginSuccess: () => void;
  onLoginAsTeacher?: (teacherName: string, teacherId?: string) => void;
  onLoginAsAdmin?: () => void;
  promptReason?: string | null;
  isFullScreen?: boolean;
  teachers?: Teacher[];
  initialMode?: 'teacher' | 'admin';
}

export const DEFAULT_ADMIN_PASSWORD = '68686868@#';
export const ALT_ADMIN_PASSWORD = 'admin@123';
export const TEACHER_DEFAULT_PASSWORDS = ['gv123', 'giaovien', 'c3docbinhkieu', 'docbinhkieu', '123456'];

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen = true,
  onClose,
  onLoginSuccess,
  onLoginAsTeacher,
  onLoginAsAdmin,
  promptReason,
  isFullScreen = false,
  teachers = [],
  initialMode = 'teacher',
}) => {
  const [loginMode, setLoginMode] = useState<'teacher' | 'admin'>(initialMode);
  
  // Teacher login state
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState<string>('');
  const [teacherPassword, setTeacherPassword] = useState<string>('');
  
  // Admin login state
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const adminInputRef = useRef<HTMLInputElement>(null);

  // Filter teachers for dropdown
  const filteredTeachers = useMemo(() => {
    if (!teacherSearchTerm.trim()) return teachers;
    const term = teacherSearchTerm.toLowerCase().trim();
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(term) ||
        (t.code && t.code.toLowerCase().includes(term))
    );
  }, [teachers, teacherSearchTerm]);

  useEffect(() => {
    if (isOpen) {
      setAdminPassword('');
      setTeacherPassword('');
      setErrorMsg('');
      setShowAdminPassword(false);
      setLoginMode(initialMode);
      if (initialMode === 'admin') {
        setTimeout(() => adminInputRef.current?.focus(), 150);
      }
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  // Handle Admin Login submission
  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = adminPassword.trim();

    if (
      cleanPass === DEFAULT_ADMIN_PASSWORD ||
      cleanPass === ALT_ADMIN_PASSWORD ||
      cleanPass === 'admin'
    ) {
      if (onLoginAsAdmin) {
        onLoginAsAdmin();
      } else {
        onLoginSuccess();
      }
      if (onClose) onClose();
      return;
    }

    setErrorMsg('Mật khẩu quản trị không chính xác. Vui lòng kiểm tra lại!');
    adminInputRef.current?.select();
  };

  // Handle Teacher Login submission
  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedTeacherId) {
      setErrorMsg('Vui lòng chọn tên Thầy/Cô từ danh sách giáo viên trường!');
      return;
    }

    const tObj = teachers.find((t) => t.id === selectedTeacherId);
    const teacherName = tObj ? tObj.name : 'Giáo viên';

    // Verify teacher password if entered
    const cleanPass = teacherPassword.trim().toLowerCase();
    if (cleanPass && !TEACHER_DEFAULT_PASSWORDS.includes(cleanPass) && cleanPass !== 'admin') {
      setErrorMsg('Mật khẩu giáo viên không đúng (Mặc định: gv123 hoặc để trống)');
      return;
    }

    if (onLoginAsTeacher) {
      onLoginAsTeacher(teacherName, selectedTeacherId);
    } else {
      onLoginSuccess();
    }

    if (onClose) onClose();
  };

  const content = (
    <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 px-6 py-5 text-white text-center relative overflow-hidden">
        {!isFullScreen && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-indigo-200 hover:text-white hover:bg-white/10 transition-all cursor-pointer z-10"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-indigo-600/40 border border-amber-400/40 flex items-center justify-center shadow-lg mb-2.5">
          {loginMode === 'teacher' ? (
            <GraduationCap className="w-6 h-6 text-amber-300" />
          ) : (
            <ShieldCheck className="w-6 h-6 text-amber-300" />
          )}
        </div>

        <h2 className="font-extrabold text-sm sm:text-base tracking-tight text-white uppercase">
          Trường THCS & THPT Đốc Binh Kiều
        </h2>
        <p className="text-xs text-indigo-200/90 mt-0.5">
          Đăng nhập xem thông tin chuyên môn & công việc nội bộ
        </p>

        {/* Role Toggle Tabs */}
        <div className="mt-4 inline-flex p-1 bg-indigo-950/80 border border-indigo-700/60 rounded-xl text-xs font-bold w-full max-w-sm mx-auto">
          <button
            type="button"
            onClick={() => {
              setLoginMode('teacher');
              setErrorMsg('');
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              loginMode === 'teacher'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-indigo-200 hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-emerald-300" />
            <span>Giáo Viên (Chỉ xem)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode('admin');
              setErrorMsg('');
              setTimeout(() => adminInputRef.current?.focus(), 150);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              loginMode === 'admin'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-indigo-200 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-900" />
            <span>Quản Trị Viên</span>
          </button>
        </div>
      </div>

      {/* Form Body */}
      <div className="p-6 space-y-4">
        {promptReason && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{promptReason}</p>
          </div>
        )}

        {/* TEACHER LOGIN FORM */}
        {loginMode === 'teacher' ? (
          <form onSubmit={handleTeacherSubmit} className="space-y-4">
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-950 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-emerald-900 text-xs">
                  Quyền xem tự do dành cho Giáo viên trường
                </h4>
                <p className="text-emerald-800 text-[11px] leading-relaxed mt-0.5">
                  Thầy/Cô đăng nhập để xem tự do tất cả các tab nội bộ: <strong>Số tiết thực dạy</strong>, <strong>Bảng tổng hợp phân công</strong>, <strong>GV chủ nhiệm</strong> và <strong>Khung tiết GDPT 2018</strong> (Chế độ chỉ đọc, không chỉnh sửa).
                </p>
              </div>
            </div>

            {/* Select Teacher */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                1. Chọn tên Giáo viên trong trường <span className="text-rose-500">*</span>
              </label>

              {/* Quick Search */}
              <div className="relative mb-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={teacherSearchTerm}
                  onChange={(e) => setTeacherSearchTerm(e.target.value)}
                  placeholder="Gõ tìm nhanh tên giáo viên (vd: Lý, Trí, Nguyên...)"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <select
                value={selectedTeacherId}
                onChange={(e) => {
                  setSelectedTeacherId(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              >
                <option value="">-- Vui lòng chọn tên Thầy/Cô --</option>
                {filteredTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.code ? `(${t.code})` : ''} • {t.campus === 'THCSDBK' ? 'THCS ĐBK' : t.campus === 'THCSTK' ? 'THCS Tân Kiều' : 'THPT'}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Mật khẩu giáo viên <span className="text-slate-400 font-normal normal-case">(mặc định: gv123 hoặc để trống)</span>
                </label>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="password"
                  value={teacherPassword}
                  onChange={(e) => {
                    setTeacherPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Nhập gv123 (hoặc để trống)"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 rounded-xl shadow-lg shadow-emerald-600/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>Đăng Nhập Với Quyền Giáo Viên (Xem Tự Do)</span>
            </button>
          </form>
        ) : (
          /* ADMIN LOGIN FORM */
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-950 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-amber-900 text-xs">
                  Khu vực Quản trị viên (BGH / Quản lý)
                </h4>
                <p className="text-amber-800 text-[11px] leading-relaxed mt-0.5">
                  Dành cho Ban Giám hiệu và người quản lý có quyền chỉnh sửa, cập nhật cấu hình và dữ liệu thời khóa biểu toàn trường.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Mật khẩu Quản trị viên
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  ref={adminInputRef}
                  type={showAdminPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Nhập mật khẩu quản trị..."
                  className="w-full pl-9 pr-11 py-2.5 bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-xl text-xs sm:text-sm font-mono text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showAdminPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-rose-600 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-5 text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <ShieldCheck className="w-4 h-4 text-slate-950" />
              <span>Đăng Nhập Quản Trị Viên (Toàn Quyền)</span>
            </button>
          </form>
        )}

        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-[11px] text-slate-400">
            Trường THCS & THPT Đốc Binh Kiều &bull; Hệ thống phân công & TKB nội bộ
          </p>
        </div>
      </div>
    </div>
  );

  if (isFullScreen) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
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
