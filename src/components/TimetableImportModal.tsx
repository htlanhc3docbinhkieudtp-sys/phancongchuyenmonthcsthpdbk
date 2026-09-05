import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  FileText,
  Sparkles,
  ClipboardList,
  Calendar,
  Layers,
  Check,
  Search,
  Filter,
  ArrowRight,
  Info,
  RefreshCw
} from 'lucide-react';
import {
  TimetableSlot,
  ClassGroup,
  Subject,
  Teacher,
  SchoolConfig
} from '../types';
import {
  parseVietSchoolTimetable,
  generateVietSchoolSampleExcel,
  VietSchoolParseResult
} from '../utils/vietSchoolImportHelper';

interface TimetableImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassGroup[];
  subjects: Subject[];
  teachers: Teacher[];
  config: SchoolConfig;
  currentWeek?: number;
  onImportSuccess: (
    importedSlots: TimetableSlot[],
    targetWeek: number,
    applyToSubsequentWeeks: boolean,
    syncWeeklySchedule: boolean
  ) => void;
}

export const TimetableImportModal: React.FC<TimetableImportModalProps> = ({
  isOpen,
  onClose,
  classes,
  subjects,
  teachers,
  config,
  currentWeek = 1,
  onImportSuccess
}) => {
  const [activeMode, setActiveMode] = useState<'file' | 'paste'>('file');
  const [dragActive, setDragActive] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Target week configuration
  const [targetWeek, setTargetWeek] = useState<number>(currentWeek || 1);
  const [applyToSubsequentWeeks, setApplyToSubsequentWeeks] = useState(true);
  const [syncWeeklySchedule, setSyncWeeklySchedule] = useState(true);

  // Filter preview slots
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'THPT' | 'DBK' | 'TK'>('ALL');
  const [previewSearch, setPreviewSearch] = useState('');

  const [parseResults, setParseResults] = useState<VietSchoolParseResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSemester = config.semester || 'HK1';
  const totalWeeks = currentSemester === 'HK1' ? 18 : 35;

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    setIsLoading(true);
    setFileName(file.name);
    const isTextFile = /\.(csv|tsv|txt)$/i.test(file.name);

    if (isTextFile) {
      const textReader = new FileReader();
      textReader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          if (text) {
            const res = parseVietSchoolTimetable(text, classes, subjects, teachers);
            setParseResults(res);
          }
        } catch (err: any) {
          setParseResults({
            slots: [],
            recognizedClasses: [],
            unrecognizedClasses: [],
            recognizedTeachers: [],
            unrecognizedTeachers: [],
            campusStats: { thptSlots: 0, thcsDbkSlots: 0, thcsTkSlots: 0 },
            errors: [`Lỗi phân tích tệp CSV: ${err?.message || 'Không thể đọc tệp'}`],
            warnings: [],
            sheetNames: [],
            detectedFormat: 'Không xác định',
            successCount: 0
          });
        } finally {
          setIsLoading(false);
        }
      };
      textReader.onerror = () => {
        setIsLoading(false);
        alert('Không thể đọc tệp văn bản/CSV đã chọn.');
      };
      textReader.readAsText(file, 'utf-8');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (buffer) {
          const res = parseVietSchoolTimetable(buffer, classes, subjects, teachers);
          setParseResults(res);
        }
      } catch (err: any) {
        setParseResults({
          slots: [],
          recognizedClasses: [],
          unrecognizedClasses: [],
          recognizedTeachers: [],
          unrecognizedTeachers: [],
          campusStats: { thptSlots: 0, thcsDbkSlots: 0, thcsTkSlots: 0 },
          errors: [`Lỗi phân tích tệp Excel: ${err?.message || 'Không thể đọc tệp Excel'}`],
          warnings: [],
          sheetNames: [],
          detectedFormat: 'Không xác định',
          successCount: 0
        });
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setIsLoading(false);
      alert('Không thể đọc tệp đã chọn.');
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
    setIsLoading(true);
    try {
      const res = parseVietSchoolTimetable(pasteText, classes, subjects, teachers);
      setParseResults(res);
      setFileName('Dữ liệu dán từ clipboard');
    } catch (err: any) {
      setParseResults({
        slots: [],
        recognizedClasses: [],
        unrecognizedClasses: [],
        recognizedTeachers: [],
        unrecognizedTeachers: [],
        campusStats: { thptSlots: 0, thcsDbkSlots: 0, thcsTkSlots: 0 },
        errors: [`Lỗi phân tích văn bản: ${err?.message || 'Lỗi xử lý'}`],
        warnings: [],
        sheetNames: [],
        detectedFormat: 'Văn bản dán',
        successCount: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadSample = () => {
    generateVietSchoolSampleExcel(classes, teachers);
  };

  const handleApply = () => {
    if (parseResults && parseResults.slots.length > 0) {
      onImportSuccess(
        parseResults.slots,
        targetWeek,
        applyToSubsequentWeeks,
        syncWeeklySchedule
      );
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-indigo-950 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-400/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-white">
                  Nhập Thời Khóa Biểu Trực Tiếp Từ VietSchool
                </h3>
                <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-200 text-[11px] font-bold rounded-full border border-emerald-400/30">
                  Tự động nhận diện
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                Đẩy TKB đã xếp từ phần mềm VietSchool lên webapp ngay lập tức mà không cần sửa code
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-emerald-200 hover:text-white transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Week and Scope Settings Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-slate-700">Áp dụng cho:</span>
              <select
                value={targetWeek}
                onChange={(e) => setTargetWeek(Number(e.target.value))}
                className="bg-white border border-slate-300 text-slate-900 font-bold px-3 py-1.5 rounded-lg shadow-2xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
              >
                {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w}>
                    Tuần {w} {w === currentWeek ? '(Tuần đang xem)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-slate-700 cursor-pointer font-medium hover:text-slate-900">
              <input
                type="checkbox"
                checked={applyToSubsequentWeeks}
                onChange={(e) => setApplyToSubsequentWeeks(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Áp dụng cho Tuần {targetWeek} và tất cả các tuần tiếp theo của học kỳ</span>
            </label>
          </div>

          <label className="flex items-center gap-2 text-indigo-900 bg-indigo-50/80 px-2.5 py-1.5 rounded-lg border border-indigo-200 cursor-pointer font-bold hover:bg-indigo-100 transition-colors">
            <input
              type="checkbox"
              checked={syncWeeklySchedule}
              onChange={(e) => setSyncWeeklySchedule(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded-sm border-indigo-300 focus:ring-indigo-500 cursor-pointer"
            />
            <span>Đồng bộ ngay bảng Phân công & Số tiết dạy thực tế</span>
          </label>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-slate-100 px-4 sm:px-5 pt-2.5 gap-2 shrink-0">
          <button
            onClick={() => { setActiveMode('file'); }}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-t border-x ${
              activeMode === 'file'
                ? 'bg-white text-emerald-800 border-slate-200 -mb-px shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Tải Tệp VietSchool (.xlsx, .xls, .csv)</span>
          </button>
          <button
            onClick={() => { setActiveMode('paste'); }}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-t border-x ${
              activeMode === 'paste'
                ? 'bg-white text-indigo-700 border-slate-200 -mb-px shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-indigo-600" />
            <span>Dán Bảng TKB (Copy từ VietSchool / Excel)</span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeMode === 'file' ? (
            <div className="space-y-3">
              {/* Drag & Drop zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-emerald-500 bg-emerald-50/60 ring-4 ring-emerald-200/50'
                    : 'border-slate-300 hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv, .tsv, .txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  {isLoading ? (
                    <RefreshCw className="w-7 h-7 animate-spin text-emerald-600" />
                  ) : (
                    <FileSpreadsheet className="w-7 h-7" />
                  )}
                </div>

                <h4 className="text-sm sm:text-base font-bold text-slate-800 mb-1">
                  {fileName ? (
                    <span className="text-emerald-700">Đã chọn: {fileName} (Nhấp để chọn lại)</span>
                  ) : (
                    'Kéo thả file Excel xuất từ VietSchool vào đây hoặc nhấp để chọn tệp'
                  )}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Hệ thống tự động đọc bảng ma trận TKB, phân tách Môn học - Giáo viên, nhận diện tất cả các lớp của THPT, THCS Đốc Binh Kiều và Tân Kiều.
                </p>
              </div>

              {/* Sample Download Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-3 bg-teal-50/70 rounded-xl border border-teal-200 gap-2">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-teal-700 shrink-0" />
                  <span className="text-xs text-teal-900 font-medium">
                    Bạn muốn tham khảo định dạng VietSchool mẫu của trường THCS-THPT Đốc Binh Kiều?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 active:scale-95 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải Tệp VietSchool Mẫu</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-600" />
                  <span>Sao chép các dòng/cột từ VietSchool hoặc Excel rồi dán (Ctrl+V) vào khung dưới đây:</span>
                </label>
              </div>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Thứ	Tiết	10CB1	10CB2	11CB1...&#10;Thứ 2	1	Chào cờ-Tùng	Chào cờ-Kiều	Chào cờ-Huỳnh...&#10;Thứ 2	2	Toán-Hương	Ngữ văn-Nhịnh	Tiếng Anh-Ny..."
                rows={7}
                className="w-full text-xs font-mono p-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPasteText('')}
                  disabled={!pasteText}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 disabled:opacity-40 cursor-pointer font-medium"
                >
                  Xóa nội dung
                </button>
                <button
                  type="button"
                  onClick={handlePasteParse}
                  disabled={!pasteText.trim() || isLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>Phân Tích Bảng Dữ Liệu</span>
                </button>
              </div>
            </div>
          )}

          {/* Parse Results Preview Card */}
          {parseResults && (
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/50 space-y-3">
              {/* Summary Status Header */}
              <div className={`p-4 border-b ${
                parseResults.successCount > 0
                  ? 'bg-emerald-500/10 border-emerald-200'
                  : 'bg-rose-50 border-rose-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {parseResults.successCount > 0 ? (
                      <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-2xs">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="p-2 bg-rose-600 text-white rounded-xl shadow-2xs">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        {parseResults.successCount > 0
                          ? `Đã nhận diện thành công: ${parseResults.successCount} tiết học`
                          : 'Không nhận diện được tiết học'}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Định dạng phát hiện: <span className="font-bold text-slate-800">{parseResults.detectedFormat}</span> • Quét qua {parseResults.sheetNames.length} sheet ({parseResults.sheetNames.join(', ')})
                      </p>
                    </div>
                  </div>

                  {/* Campus Breakdown Badges */}
                  {parseResults.successCount > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg shadow-2xs">
                        THPT: <span className="text-indigo-600">{parseResults.campusStats.thptSlots}</span> tiết
                      </span>
                      <span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg shadow-2xs">
                        THCS ĐBK: <span className="text-teal-600">{parseResults.campusStats.thcsDbkSlots}</span> tiết
                      </span>
                      <span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg shadow-2xs">
                        THCS TK: <span className="text-amber-600">{parseResults.campusStats.thcsTkSlots}</span> tiết
                      </span>
                      <span className="px-2.5 py-1 bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-lg">
                        {parseResults.recognizedClasses.length} lớp
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Errors & Warnings if any */}
              {parseResults.errors.length > 0 && (
                <div className="p-3 mx-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                  <p className="text-xs font-bold text-rose-800">Lỗi phân tích:</p>
                  {parseResults.errors.map((err, idx) => (
                    <p key={idx} className="text-xs text-rose-700 leading-relaxed">
                      • {err}
                    </p>
                  ))}
                </div>
              )}

              {parseResults.warnings.length > 0 && (
                <div className="p-3 mx-4 max-h-32 overflow-y-auto bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <p className="text-xs font-bold text-amber-800">
                    Cảnh báo ({parseResults.warnings.length} lưu ý về tên GV hoặc lớp):
                  </p>
                  {parseResults.warnings.slice(0, 10).map((warn, idx) => (
                    <p key={idx} className="text-xs text-amber-700">
                      • {warn}
                    </p>
                  ))}
                  {parseResults.warnings.length > 10 && (
                    <p className="text-xs text-amber-600 italic">
                      ...và {parseResults.warnings.length - 10} cảnh báo khác
                    </p>
                  )}
                </div>
              )}

              {/* Mini Interactive Preview Table */}
              {parseResults.successCount > 0 && (
                <div className="px-4 pb-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <span className="text-xs font-bold text-slate-700">
                      Xem trước dữ liệu các tiết học đã bóc tách:
                    </span>

                    {/* Filter controls */}
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={previewSearch}
                          onChange={(e) => setPreviewSearch(e.target.value)}
                          placeholder="Tìm lớp, môn, GV..."
                          className="text-xs pl-8 pr-2.5 py-1 bg-white border border-slate-300 rounded-lg w-36 sm:w-44 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <select
                        value={previewFilter}
                        onChange={(e) => setPreviewFilter(e.target.value as any)}
                        className="text-xs bg-white border border-slate-300 rounded-lg px-2 py-1 font-semibold text-slate-700 focus:outline-hidden"
                      >
                        <option value="ALL">Tất cả điểm trường</option>
                        <option value="THPT">THPT</option>
                        <option value="DBK">THCS ĐBK</option>
                        <option value="TK">THCS Tân Kiều</option>
                      </select>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto bg-white">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-1.5 px-3">Lớp</th>
                          <th className="py-1.5 px-3">Thứ</th>
                          <th className="py-1.5 px-3">Tiết</th>
                          <th className="py-1.5 px-3">Môn Học</th>
                          <th className="py-1.5 px-3">Giáo Viên Giảng Dạy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {parseResults.slots
                          .filter((s) => {
                            const cls = classes.find(c => c.id === s.classId);
                            if (previewFilter === 'THPT' && cls?.level !== 'THPT') return false;
                            if (previewFilter === 'DBK') {
                              if (cls?.level !== 'THCS') return false;
                              if (cls?.campus === 'THCSTK' || /^[6789]A([789]|10)$/i.test(cls.name)) return false;
                            }
                            if (previewFilter === 'TK') {
                              if (cls?.campus !== 'THCSTK' && !(/^[6789]A([789]|10)$/i.test(cls?.name || ''))) return false;
                            }
                            if (previewSearch.trim()) {
                              const q = previewSearch.toLowerCase();
                              return s.className.toLowerCase().includes(q) ||
                                     s.subjectName.toLowerCase().includes(q) ||
                                     s.teacherName.toLowerCase().includes(q);
                            }
                            return true;
                          })
                          .slice(0, 100)
                          .map((slot, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80">
                              <td className="py-1 px-3 font-bold text-indigo-700">{slot.className}</td>
                              <td className="py-1 px-3">Thứ {slot.dayOfWeek}</td>
                              <td className="py-1 px-3">Tiết {slot.period}</td>
                              <td className="py-1 px-3 font-medium text-slate-900">{slot.subjectName}</td>
                              <td className="py-1 px-3">
                                {slot.teacherName ? (
                                  <span className="text-slate-800 font-semibold">{slot.teacherName}</span>
                                ) : (
                                  <span className="text-slate-400 italic">Chưa có GV</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 px-5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              Dữ liệu sẽ được lưu vào hệ thống và tự động sao lưu lên đám mây Firestore.
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={!parseResults || parseResults.successCount === 0}
              className="px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Áp Dụng {parseResults?.successCount || 0} Tiết Vào Tuần {targetWeek}
                {applyToSubsequentWeeks ? ` (và các tuần tiếp theo)` : ''}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
