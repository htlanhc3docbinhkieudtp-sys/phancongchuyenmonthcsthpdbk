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
import { setBrowserFavicon } from '../utils/faviconHelper';
import { FirestoreWriteQuotaBadge } from './FirestoreWriteQuotaBadge';

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
  onForceSyncFromCloud?: () => void;
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
  onForceSyncFromCloud,
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
    if (!isAdmin) {
      alert('Chỉ tài khoản Quản trị viên mới có quyền thay đổi logo trường.');
      e.target.value = '';
      return;
    }
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
          setBrowserFavicon(dataUrl);
        } catch (err) {
          console.error('Error saving logo:', err);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleLogoClick = () => {
    if (!isAdmin) {
      alert('Chỉ tài khoản Quản trị viên mới có quyền thay đổi logo trường. Vui lòng đăng nhập quyền Quản trị.');
      onOpenAdminLogin();
      return;
    }
    logoFileInputRef.current?.click();
  };

  return (
    <header className="bg-indigo-900 text-white sticky top-0 z-30 shadow-md shrink-0">
      {/* Top Main Nav Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Brand & School info */}
        <div className="flex items-center gap-3">
          <div
            className="relative group shrink-0"
            title={
              isAdmin
                ? "Nhấp để tải lên/thay đổi tệp Logo trường"
                : "Logo Trường THCS & THPT Đốc Binh Kiều (Chỉ Quản trị viên mới có quyền đổi logo)"
            }
          >
            <img
              src={config.logoUrl || '/logo.png'}
              alt="Logo Trường THCS & THPT Đốc Binh Kiều"
              className={`w-10 h-10 object-contain rounded-full bg-white shadow-sm p-0.5 border-2 border-white/40 transition-transform ${
                isAdmin ? 'cursor-pointer hover:scale-105' : 'cursor-default'
              }`}
              onClick={handleLogoClick}
            />
            {isAdmin && (
              <button
                type="button"
                onClick={() => logoFileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 bg-amber-500 hover:bg-amber-400 text-slate-900 p-0.5 rounded-full shadow-xs border border-white cursor-pointer"
                title="Thay ảnh logo trường (Dành cho Quản trị viên)"
              >
                <Upload className="w-2.5 h-2.5" />
              </button>
            )}
            <input
              ref={logoFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={!isAdmin}
              onChange={handleLogoFileChange}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-indigo-200 leading-tight">
              Sở Giáo dục và Đào tạo Đồng Tháp
            </span>
            <h1 className="text-xs sm:text-base font-extrabold tracking-tight uppercase text-white whitespace-nowrap leading-tight">
              Trường THCS & THPT Đốc Binh Kiều
            </h1>
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

          {/* Cloud Auto-Sync Indicator & Manual Save / Refresh */}
          <div className="flex items-center gap-1.5">
            <FirestoreWriteQuotaBadge />

            {/* If Admin: Save to Cloud button */}
            {isAdmin && (
              <button
                onClick={onSaveToCloud}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                  cloudSyncStatus === 'saving'
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                    : cloudSyncStatus === 'synced'
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/30'
                    : 'bg-rose-500/20 border-rose-400/50 text-rose-200'
                }`}
                title={
                  cloudSyncStatus === 'saving'
                    ? 'Đang tự động lưu lên đám mây Firebase...'
                    : cloudSyncStatus === 'offline'
                    ? 'Dữ liệu chưa lưu lên Cloud. Bấm để lưu lên Firebase cho tất cả các máy.'
                    : lastSyncedAt
                    ? `Đã lưu đám mây lúc ${new Date(lastSyncedAt).toLocaleTimeString('vi-VN')}. Bấm để lưu lại.`
                    : 'Bấm để lưu toàn bộ TKB và Phân công lên Firebase Cloud'
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
                    : cloudSyncStatus === 'offline'
                    ? 'Lưu Cloud ngay'
                    : 'Lưu Cloud'}
                </span>
              </button>
            )}

            {/* Refresh / Sync from Cloud for ALL devices (Admin & Teachers/Colleagues) */}
            <button
              onClick={onForceSyncFromCloud}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border border-indigo-400/40 bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/30 transition-all cursor-pointer shadow-2xs"
              title="Đồng bộ từ Cloud: Tải thời khóa biểu mới nhất từ Đám mây Firebase để đảm bảo đồng nhất với các máy khác"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cloudSyncStatus === 'saving' ? 'animate-spin' : ''}`} />
              <span className="text-[11px]">Làm mới Cloud</span>
            </button>

            {/* File Input for JSON restore */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".json"
              className="hidden"
            />

            {/* Backup & Restore Buttons */}
            <button
              onClick={onExportJsonBackup}
              className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-indigo-200 hover:text-white bg-indigo-800/80 hover:bg-indigo-700 border border-indigo-700 transition-all cursor-pointer"
              title="Tải file bản sao lưu toàn bộ dữ liệu (.json) về máy tính"
            >
              <Download className="w-3 h-3 text-indigo-300" />
              <span className="text-[11px]">Sao lưu</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-indigo-200 hover:text-white bg-indigo-800/80 hover:bg-indigo-700 border border-indigo-700 transition-all cursor-pointer"
              title="Khôi phục dữ liệu từ file sao lưu JSON (khớp 100% dữ liệu máy thật)"
            >
              <Upload className="w-3 h-3 text-emerald-300" />
              <span className="text-[11px]">Khôi phục JSON</span>
            </button>
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

          {/* Admin Status & Logout Action */}
          <div className="flex items-center gap-2 pl-2 border-l border-indigo-700/60">
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-bold"
              title="Đang đăng nhập với quyền Quản trị viên (Toàn quyền)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Quản Trị Viên</span>
            </div>
            <button
              onClick={onLogoutAdmin}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 hover:border-rose-500 text-rose-200 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
              title="Đăng xuất và khóa hệ thống"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
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
