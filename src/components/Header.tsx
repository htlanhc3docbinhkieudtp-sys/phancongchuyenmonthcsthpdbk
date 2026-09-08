import React, { useRef } from 'react';
import {
  School,
  FileSpreadsheet,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Users,
  GraduationCap,
  RotateCcw,
  Cloud,
  CloudCheck,
  RefreshCw,
  Download,
  Database,
  Lock,
  Unlock,
  ShieldAlert,
  ShieldCheck,
  LogOut,
  Eye,
  KeyRound
} from 'lucide-react';
import { SchoolConfig, ConflictIssue } from '../types';

interface HeaderProps {
  config: SchoolConfig;
  onUpdateConfig: (newConfig: SchoolConfig) => void;
  totalTeachers: number;
  totalClasses: number;
  assignedPercentage: number;
  conflicts: ConflictIssue[];
  cloudSyncStatus: 'synced' | 'saving' | 'error' | 'offline';
  lastSyncedAt: number | null;
  isAdmin: boolean;
  userRole?: 'guest' | 'teacher' | 'admin';
  onOpenAdminLogin: () => void;
  onLogoutAdmin: () => void;
  onSaveToCloud: () => void;
  onExportJsonBackup: () => void;
  onImportJsonBackup: (file: File) => void;
  onOpenImportModal: () => void;
  onExportExcel: () => void;
  onOpenAutoAssign: () => void;
  onOpenConflictDrawer: () => void;
  onResetData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  onUpdateConfig,
  totalTeachers,
  totalClasses,
  assignedPercentage,
  conflicts,
  cloudSyncStatus,
  lastSyncedAt,
  isAdmin,
  userRole = 'guest',
  onOpenAdminLogin,
  onLogoutAdmin,
  onSaveToCloud,
  onExportJsonBackup,
  onImportJsonBackup,
  onOpenImportModal,
  onExportExcel,
  onOpenAutoAssign,
  onOpenConflictDrawer,
  onResetData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const errorCount = conflicts.filter(c => c.severity === 'error').length;
  const warningCount = conflicts.filter(c => c.severity === 'warning').length;

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJsonBackup(file);
      e.target.value = '';
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onUpdateConfig({
          ...config,
          logoUrl: dataUrl
        });
        try {
          localStorage.setItem('docbinhkieu_phancong_data_v9_school_logo', dataUrl);
          const favicon = document.getElementById('app-favicon') as HTMLLinkElement | null;
          if (favicon) {
            favicon.href = dataUrl;
          }
        } catch (err) {
          console.error('Error saving logo:', err);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <header className="bg-indigo-900 text-white sticky top-0 z-30 shadow-md shrink-0">
      {/* Top Main Nav Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Brand & School info */}
        <div className="flex items-center gap-3">
          <div className="relative group shrink-0" title="Nhấp để tải lên/đổi tệp Logo trường (giữ nguyên tệp PNG gốc)">
            <img
              src={config.logoUrl || '/logo.png'}
              alt="Logo Trường THCS & THPT Đốc Binh Kiều"
              className="w-10 h-10 object-contain rounded-full bg-white shadow-sm p-0.5 border-2 border-white/40 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => logoFileInputRef.current?.click()}
            />
            {isAdmin && (
              <button
                type="button"
                onClick={() => logoFileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 bg-amber-500 hover:bg-amber-400 text-slate-900 p-0.5 rounded-full shadow-xs border border-white cursor-pointer"
                title="Thay ảnh logo gốc trường (chọn logo doc binh kieu.png)"
              >
                <Upload className="w-2.5 h-2.5" />
              </button>
            )}
            <input
              ref={logoFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleLogoFileChange}
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight uppercase text-white whitespace-nowrap leading-tight">
              THCS & THPT Đốc Binh Kiều
            </h1>
            <span className="text-[10px] text-indigo-200 font-medium hidden sm:inline">
              Sở Giáo dục và Đào tạo Đồng Tháp
            </span>
          </div>
        </div>

        {/* Academic Controls & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Year & Semester Selector Pill */}
          <div className="flex items-center bg-indigo-800/90 rounded-lg p-1 border border-indigo-700/70 text-xs">
            <div className="flex items-center gap-1 px-2 py-0.5 text-indigo-200">
              <Calendar className="w-3 h-3 text-indigo-300" />
              <select
                value={config.academicYear}
                disabled={!isAdmin}
                onChange={e => onUpdateConfig({ ...config, academicYear: e.target.value })}
                className="bg-transparent font-semibold text-white focus:outline-hidden cursor-pointer disabled:cursor-not-allowed"
                title={!isAdmin ? "Đăng nhập Quản trị để thay đổi năm học" : ""}
              >
                <option value="2026 - 2027" className="bg-slate-800 text-white">2026 - 2027</option>
                <option value="2025 - 2026" className="bg-slate-800 text-white">2025 - 2026</option>
                <option value="2027 - 2028" className="bg-slate-800 text-white">2027 - 2028</option>
              </select>
            </div>
            <div className="h-3.5 w-px bg-indigo-700 mx-0.5"></div>
            <select
              value={config.semester}
              disabled={!isAdmin}
              onChange={e => onUpdateConfig({ ...config, semester: e.target.value as any })}
              className="bg-indigo-600 font-bold text-white px-2 py-0.5 rounded text-xs focus:outline-hidden cursor-pointer shadow-xs disabled:opacity-75 disabled:cursor-not-allowed"
              title={!isAdmin ? "Đăng nhập Quản trị để thay đổi học kỳ" : ""}
            >
              <option value="HK1" className="bg-slate-800 text-white">HK1</option>
              <option value="HK2" className="bg-slate-800 text-white">HK2</option>
            </select>
          </div>

          {/* Conflict indicator button */}
          <button
            onClick={onOpenConflictDrawer}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              errorCount > 0
                ? 'bg-rose-500/20 border-rose-400/50 text-rose-200 hover:bg-rose-500/30'
                : warningCount > 0
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-200 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/30'
            }`}
            title="Kiểm tra xung đột & định mức"
          >
            {errorCount > 0 ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-300 animate-pulse" />
            ) : warningCount > 0 ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            )}
            <span className="hidden sm:inline">
              {errorCount > 0 ? `${errorCount} lỗi` : warningCount > 0 ? `${warningCount} lưu ý` : 'Hợp lệ'}
            </span>
          </button>

          {/* Cloud Auto-Sync Indicator & Manual Save */}
          <div className="flex items-center gap-1">
            <button
              onClick={isAdmin ? onSaveToCloud : undefined}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                isAdmin ? 'cursor-pointer' : 'cursor-default'
              } ${
                cloudSyncStatus === 'saving'
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                  : cloudSyncStatus === 'synced'
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/30'
                  : 'bg-rose-500/20 border-rose-400/50 text-rose-200'
              }`}
              title={
                cloudSyncStatus === 'saving'
                  ? 'Đang tự động lưu lên đám mây Firebase...'
                  : lastSyncedAt
                  ? `Đã lưu đám mây lúc ${new Date(lastSyncedAt).toLocaleTimeString('vi-VN')}`
                  : 'Đã kết nối Đám mây Firebase'
              }
            >
              {cloudSyncStatus === 'saving' ? (
                <RefreshCw className="w-3.5 h-3.5 text-amber-300 animate-spin" />
              ) : cloudSyncStatus === 'synced' ? (
                <CloudCheck className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <Cloud className="w-3.5 h-3.5 text-rose-300" />
              )}
              <span className="hidden xl:inline text-[11px]">
                {cloudSyncStatus === 'saving'
                  ? 'Đang lưu Cloud...'
                  : 'Cloud Firebase'}
              </span>
            </button>

            {/* Hidden File Input for JSON restore */}
            {isAdmin && (
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept=".json"
                className="hidden"
              />
            )}

            {/* Backup Button (Admin only) */}
            {isAdmin && (
              <button
                onClick={onExportJsonBackup}
                className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-indigo-200 hover:text-white bg-indigo-800/80 hover:bg-indigo-700 border border-indigo-700 transition-all cursor-pointer"
                title="Tải file bản sao lưu toàn bộ dữ liệu (.json) về máy tính"
              >
                <Download className="w-3 h-3 text-indigo-300" />
                <span className="text-[11px]">Sao lưu</span>
              </button>
            )}
          </div>

          {/* Admin vs Read-Only Controls */}
          {isAdmin ? (
            <>
              {/* AI Auto Assign button */}
              <button
                onClick={onOpenAutoAssign}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Tự động phân công thông minh"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Tự Động Gán</span>
              </button>

              {/* Excel Import button */}
              <button
                onClick={onOpenImportModal}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-100 bg-indigo-800 hover:bg-indigo-700 border border-indigo-700 transition-all cursor-pointer"
                title="Nhập dữ liệu từ file Excel của trường"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-300" />
                <span>Nhập Excel</span>
              </button>

              {/* Excel Export button (Admin only) */}
              <button
                onClick={onExportExcel}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs transition-all cursor-pointer"
                title="Xuất bảng phân công ra file Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                <span>Xuất Excel</span>
              </button>

              {/* Reset (Admin only) */}
              <button
                onClick={onResetData}
                className="p-1 text-indigo-300 hover:text-white hover:bg-indigo-800 rounded-md transition-all cursor-pointer"
                title="Khôi phục dữ liệu mẫu ban đầu"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </>
          ) : null}

          {/* Role Badges & Login / Logout Actions */}
          {isAdmin ? (
            <div className="flex items-center gap-1.5 pl-1">
              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-bold"
                title="Đang đăng nhập với quyền Quản trị viên (Được phép chỉnh sửa & cấu hình)"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Quản Trị</span>
              </div>
              <button
                onClick={onLogoutAdmin}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-800 hover:bg-rose-900/80 border border-indigo-700 hover:border-rose-500/50 text-indigo-200 hover:text-rose-200 text-xs font-semibold transition-all cursor-pointer"
                title="Đăng xuất quyền Quản trị (Về chế độ xem tự do)"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Thoát</span>
              </button>
            </div>
          ) : userRole === 'teacher' ? (
            <div className="flex items-center gap-1.5 pl-1">
              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/20 border border-sky-400/50 text-sky-300 text-xs font-bold"
                title="Đang đăng nhập với quyền Giáo viên (Xem toàn bộ nội dung, không chỉnh sửa)"
              >
                <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Giáo Viên (Chỉ Xem)</span>
              </div>
              <button
                onClick={onOpenAdminLogin}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-xs font-bold transition-all cursor-pointer"
                title="Nâng quyền lên Quản trị viên để chỉnh sửa"
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span className="hidden md:inline">Quản trị</span>
              </button>
              <button
                onClick={onLogoutAdmin}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-800 hover:bg-rose-900/80 border border-indigo-700 hover:border-rose-500/50 text-indigo-200 hover:text-rose-200 text-xs font-semibold transition-all cursor-pointer"
                title="Đăng xuất về chế độ xem tự do"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Thoát</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 pl-1">
              <div
                className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-300 text-[11px] font-medium"
                title="Chế độ xem tự do: Được xem Thời khóa biểu toàn trường"
              >
                <Eye className="w-3 h-3 text-indigo-400" />
                <span>Xem Tự Do (TKB)</span>
              </div>
              <button
                onClick={onOpenAdminLogin}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                title="Đăng nhập Giáo viên (giaovien@123) hoặc Quản trị viên"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Đăng Nhập</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub Metrics Bar - High Density */}
      <div className="bg-indigo-950/80 border-t border-indigo-800/80 px-4 sm:px-6 lg:px-8 py-1.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-indigo-200 text-[11px]">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>Giáo viên:</span>
              <strong className="text-white font-bold">{totalTeachers} GV</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Lớp học:</span>
              <strong className="text-white font-bold">{totalClasses} Lớp</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tiến độ gán tiết:</span>
              <strong className="text-emerald-300 font-bold">{assignedPercentage}%</strong>
            </div>
          </div>

          {/* Compact progress bar */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider hidden sm:inline">
              Tổng định mức
            </span>
            <div className="w-36 sm:w-44 bg-indigo-900 h-1.5 rounded-full overflow-hidden shrink-0 border border-indigo-800">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  assignedPercentage === 100
                    ? 'bg-emerald-400'
                    : assignedPercentage > 75
                    ? 'bg-emerald-400'
                    : 'bg-amber-400'
                }`}
                style={{ width: `${assignedPercentage}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-white">{assignedPercentage}%</span>
          </div>
        </div>
      </div>
    </header>
  );
};
