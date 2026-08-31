import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  FileText,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  TimetableSlot,
  ClassGroup,
  Subject,
  Teacher,
  SchoolConfig
} from '../types';
import {
  parseImportedTimetable,
  getTimetableSampleCSV
} from '../utils/timetableHelper';

interface TimetableImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassGroup[];
  subjects: Subject[];
  teachers: Teacher[];
  config: SchoolConfig;
  onImportSuccess: (importedSlots: TimetableSlot[]) => void;
}

export const TimetableImportModal: React.FC<TimetableImportModalProps> = ({
  isOpen,
  onClose,
  classes,
  subjects,
  teachers,
  config,
  onImportSuccess
}) => {
  const [activeMode, setActiveMode] = useState<'file' | 'paste'>('file');
  const [dragActive, setDragActive] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parseResults, setParseResults] = useState<{
    slots: TimetableSlot[];
    errors: string[];
    successCount: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (buffer) {
        const res = parseImportedTimetable(buffer, classes, subjects, teachers);
        setParseResults(res);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handlePasteParse = () => {
    if (!pasteText.trim()) return;

    // Check if it's JSON or TSV/CSV
    let res: { slots: TimetableSlot[]; errors: string[]; successCount: number };
    if (pasteText.trim().startsWith('[') || pasteText.trim().startsWith('{')) {
      res = parseImportedTimetable(pasteText, classes, subjects, teachers);
    } else {
      // Convert TSV/Text to workbook
      try {
        const rows = pasteText.split('\n').map(r => r.split('\t').length > 1 ? r.split('\t') : r.split(','));
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data');
        const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        res = parseImportedTimetable(buf, classes, subjects, teachers);
      } catch (err: any) {
        res = { slots: [], errors: [`Lỗi phân tích văn bản: ${err?.message}`], successCount: 0 };
      }
    }
    setParseResults(res);
  };

  const handleDownloadTemplate = () => {
    // Generate full Excel template with sample rows and column guide
    const wb = XLSX.utils.book_new();
    const headers = ['Lớp', 'Thứ', 'Buổi', 'Tiết', 'Môn Học', 'Giáo Viên Giảng Dạy', 'Mã GV', 'Phòng Học', 'Ghi Chú'];
    const sampleRows: any[][] = [
      headers,
      ['10A1', 2, 'Sáng', 1, 'Chào cờ / HĐTN', 'Đoàn Kiều.T', 'Kiều.ĐT', 'P.101', 'Tiết 1 đầu tuần'],
      ['10A1', 2, 'Sáng', 2, 'Toán', 'Đoàn Kiều.T', 'Kiều.ĐT', 'P.101', ''],
      ['10A1', 2, 'Sáng', 3, 'Toán', 'Đoàn Kiều.T', 'Kiều.ĐT', 'P.101', ''],
      ['10A1', 2, 'Sáng', 4, 'Ngữ văn', 'Lê Văn Anh', 'Anh.LV', 'P.101', ''],
      ['10A1', 2, 'Sáng', 5, 'Tiếng Anh', 'Phạm Thị Hoa', 'Hoa.PT', 'P.101', ''],
      ['10A2', 2, 'Sáng', 1, 'Chào cờ / HĐTN', 'Trần Văn Bình', 'Bình.TV', 'P.102', ''],
      ['6A1', 2, 'Sáng', 1, 'Chào cờ / HĐTN', 'Hoàng Văn Giang', 'Giang.HV', 'P.201', 'ĐBK'],
      ['6/1', 2, 'Sáng', 1, 'Chào cờ / HĐTN', 'Phạm Văn Nam', 'Nam.PV', 'P.TK1', 'Tân Kiều']
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_TKB');
    XLSX.writeFile(wb, 'Mau_Nhap_Thoi_Khoa_Bieu.xlsx');
  };

  const handleApply = () => {
    if (parseResults && parseResults.slots.length > 0) {
      onImportSuccess(parseResults.slots);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/15">
              <FileSpreadsheet className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase tracking-tight">
                Nhập / Cập Nhật Thời Khóa Biểu
              </h3>
              <p className="text-xs text-indigo-200">
                Nhập dữ liệu TKB từ file Excel, CSV hoặc dán trực tiếp nội dung TKB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2">
          <button
            onClick={() => { setActiveMode('file'); setParseResults(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all cursor-pointer flex items-center gap-2 border-t border-x ${
              activeMode === 'file'
                ? 'bg-white text-indigo-700 border-slate-200 -mb-px'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Tải tệp Excel / CSV (.xlsx, .csv)</span>
          </button>
          <button
            onClick={() => { setActiveMode('paste'); setParseResults(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all cursor-pointer flex items-center gap-2 border-t border-x ${
              activeMode === 'paste'
                ? 'bg-white text-indigo-700 border-slate-200 -mb-px'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Dán nội dung bảng TKB</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeMode === 'file' ? (
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  Kéo thả tệp Excel vào đây hoặc nhấp để chọn tệp
                </h4>
                <p className="text-xs text-slate-500">
                  Hỗ trợ định dạng .xlsx, .xls, .csv (Tối đa 10MB)
                </p>
              </div>

              {/* Template Download */}
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-700" />
                  <span className="text-xs text-amber-900 font-medium">
                    Chưa có định dạng chuẩn? Tải mẫu Excel chuẩn của trường:
                  </span>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải Mẫu Excel</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Dán nội dung bảng TKB từ Excel / Khung chat (Dạng cột phân cách bằng tab/phẩy):
                </label>
                <button
                  onClick={() => setPasteText(getTimetableSampleCSV())}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                >
                  Dán dữ liệu mẫu
                </button>
              </div>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Lớp	Thứ	Buổi	Tiết	Môn Học	Giáo Viên	Mã GV	Phòng..."
                rows={7}
                className="w-full text-xs font-mono p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <div className="flex justify-end">
                <button
                  onClick={handlePasteParse}
                  disabled={!pasteText.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Kiểm tra dữ liệu</span>
                </button>
              </div>
            </div>
          )}

          {/* Results Summary */}
          {parseResults && (
            <div className="p-4 rounded-xl border space-y-2.5 transition-all bg-slate-50 border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {parseResults.successCount > 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                  )}
                  <h4 className="text-sm font-bold text-slate-800">
                    Kết quả đọc dữ liệu: Đã đọc được {parseResults.successCount} tiết học
                  </h4>
                </div>
              </div>

              {parseResults.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto p-2.5 bg-rose-50 border border-rose-200 rounded-lg space-y-1">
                  <p className="text-xs font-bold text-rose-800">Cảnh báo / Lỗi:</p>
                  {parseResults.errors.map((err, idx) => (
                    <p key={idx} className="text-xs text-rose-700">
                      • {err}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all cursor-pointer"
          >
            Hủy Bỏ
          </button>

          <button
            onClick={handleApply}
            disabled={!parseResults || parseResults.successCount === 0}
            className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Áp Dụng Vào Thời Khóa Biểu ({parseResults?.successCount || 0} tiết)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
