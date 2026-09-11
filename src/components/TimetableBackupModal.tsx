import React, { useState, useEffect } from 'react';
import {
  History,
  Download,
  Upload,
  RotateCcw,
  X,
  Save,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Calendar,
  Layers
} from 'lucide-react';
import { SchoolTimetable } from '../types';
import {
  getTimetableSnapshots,
  saveTimetableSnapshot,
  TimetableSnapshotItem
} from '../services/firebase';

interface TimetableBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTimetable: SchoolTimetable;
  currentWeek: number;
  onRestoreTimetable: (restored: SchoolTimetable) => void;
  isAdmin: boolean;
  onShowToast?: (msg: string) => void;
}

export const TimetableBackupModal: React.FC<TimetableBackupModalProps> = ({
  isOpen,
  onClose,
  currentTimetable,
  currentWeek,
  onRestoreTimetable,
  isAdmin,
  onShowToast
}) => {
  const [snapshots, setSnapshots] = useState<TimetableSnapshotItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const fetchBackups = async () => {
    setIsLoading(true);
    try {
      const list = await getTimetableSnapshots();
      setSnapshots(list);
    } catch (err) {
      console.warn('Lỗi tải danh sách bản sao lưu:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBackups();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateManualBackup = async () => {
    if (!currentTimetable?.slots?.length) {
      alert('Không có dữ liệu tiết học để sao lưu.');
      return;
    }
    setIsCreating(true);
    try {
      const desc = customNote.trim() || `Bản sao lưu thủ công Tuần ${currentWeek} (${currentTimetable.slots.length} tiết)`;
      const ok = await saveTimetableSnapshot(currentTimetable, desc, 'Quản trị viên');
      if (ok) {
        if (onShowToast) onShowToast('Đã tạo bản sao lưu an toàn thành công lên Đám mây!');
        setCustomNote('');
        await fetchBackups();
      } else {
        alert('Không thể lưu bản sao lưu lên Đám mây. Vui lòng kiểm tra mạng.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = (item: TimetableSnapshotItem) => {
    if (!isAdmin) {
      alert('Chỉ tài khoản Quản trị viên mới có quyền khôi phục thời khóa biểu.');
      return;
    }
    const confirmed = window.confirm(
      `Xác nhận khôi phục Thời khóa biểu từ bản lưu:\n"${item.description}"\n(Tạo lúc: ${new Date(item.createdAt).toLocaleString('vi-VN')}, gồm ${item.slotCount} tiết)?`
    );
    if (!confirmed) return;

    onRestoreTimetable(item.timetable);
    if (onShowToast) {
      onShowToast(`Đã khôi phục thành công Thời khóa biểu (${item.slotCount} tiết) từ bản sao lưu!`);
    }
    onClose();
  };

  const handleExportJson = () => {
    if (!currentTimetable?.slots?.length) {
      alert('Không có dữ liệu tiết học để xuất.');
      return;
    }
    const filename = `TKB_Tuan_${currentWeek}_${new Date().toISOString().slice(0, 10)}.json`;
    const jsonStr = JSON.stringify(currentTimetable, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast(`Đã tải về máy tính file sao lưu "${filename}"!`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.slots) && parsed.slots.length > 0) {
          const confirmed = window.confirm(
            `Đã đọc file sao lưu hợp lệ gồm ${parsed.slots.length} tiết học.\nBạn có muốn nạp vào Thời khóa biểu Tuần ${currentWeek} ngay bây giờ không?`
          );
          if (confirmed) {
            onRestoreTimetable(parsed);
            if (onShowToast) onShowToast(`Đã nạp thành công ${parsed.slots.length} tiết học từ file JSON!`);
            onClose();
          }
        } else {
          alert('File JSON không chứa cấu trúc Thời khóa biểu hợp lệ (thiếu mảng slots).');
        }
      } catch (err) {
        alert('Lỗi khi đọc file JSON: ' + (err instanceof Error ? err.message : String(err)));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                Trung Tâm Sao Lưu & Khôi Phục Thời Khóa Biểu
              </h2>
              <p className="text-xs text-slate-500">
                Bảo vệ dữ liệu toàn vẹn, chống mất mát và cho phép quay lại phiên bản bất kỳ lúc nào
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar (Export/Import/Create) */}
        <div className="p-6 bg-indigo-50/50 border-b border-indigo-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Ghi chú bản sao lưu (VD: Đã sửa trùng tiết thầy Văn...)"
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
            />
            <button
              type="button"
              disabled={isCreating}
              onClick={handleCreateManualBackup}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isCreating ? 'Đang lưu...' : 'Tạo Bản Sao Lưu Đám Mây'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-indigo-100">
            <button
              type="button"
              onClick={handleExportJson}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              title="Tải toàn bộ TKB tuần hiện tại về máy tính dưới dạng file .json để lưu trữ an toàn"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Xuất file (.json)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              title="Chọn file sao lưu .json từ máy tính để khôi phục lại"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>Nạp file (.json)</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Body / Snapshots List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <span>Các phiên bản đã được sao lưu trên Đám Mây (Firebase):</span>
            </h3>
            <button
              type="button"
              onClick={fetchBackups}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Làm mới danh sách</span>
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Đang tải lịch sử các phiên bản sao lưu từ Đám mây...</span>
            </div>
          ) : snapshots.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 p-6">
              <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">Chưa có bản sao lưu nào được ghi nhận</p>
              <p className="text-xs text-slate-400 mt-1">
                Bấm vào nút "Tạo Bản Sao Lưu Đám Mây" ở trên hoặc hệ thống sẽ tự động sao lưu mỗi khi có chỉnh sửa.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {snapshots.map((item, idx) => {
                const dateStr = new Date(item.createdAt).toLocaleString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                });
                const isLatest = idx === 0;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isLatest
                        ? 'bg-indigo-50/40 border-indigo-200'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-sm">
                          {item.description}
                        </span>
                        {isLatest && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-full">
                            Mới nhất
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {dateStr}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          Tuần {item.weekNumber} ({item.slotCount} tiết)
                        </span>
                        <span>•</span>
                        <span>Người lưu: {item.createdBy || 'Quản trị'}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRestore(item)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-end sm:self-center"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Khôi phục bản này</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-amber-700">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Mẹo: Bạn có thể bấm "Xuất file (.json)" để lưu 1 bản sao trên máy tính cá nhân để an tâm tuyệt đối!</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
