import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  ClipboardPaste,
  FileUp
} from 'lucide-react';
import {
  Teacher,
  ClassGroup,
  Subject,
  Department
} from '../types';
import {
  parseExcelFile,
  parsePastedData,
  generateExcelTemplate,
  ExcelImportResult
} from '../utils/excelHelper';

interface ExcelImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  classes: ClassGroup[];
  subjects: Subject[];
  departments: Department[];
  onApplyImport: (result: ExcelImportResult, mode: 'merge' | 'replace') => void;
  onExportExcel: () => void;
}

export const ExcelImportExportModal: React.FC<ExcelImportExportModalProps> = ({
  isOpen,
  onClose,
  teachers,
  classes,
  subjects,
  departments,
  onApplyImport,
  onExportExcel,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ExcelImportResult | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setSelectedFile(file);
    setErrorMsg(null);
    setLoading(true);
    try {
      const result = await parseExcelFile(file, teachers, classes, subjects, departments);
      setImportResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi đọc file Excel');
      setImportResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPastedText = () => {
    if (!pastedText.trim()) {
      setErrorMsg('Vui lòng dán nội dung bảng tính từ Excel vào khung bên dưới.');
      return;
    }
    setErrorMsg(null);
    try {
      const result = parsePastedData(pastedText, teachers, classes, subjects, departments);
      setImportResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể xử lý dữ liệu dán.');
      setImportResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleApply = () => {
    if (importResult) {
      onApplyImport(importResult, importMode);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Nhập & Xuất Dữ Liệu Excel Phân Công
              </h3>
              <p className="text-[11px] text-slate-500">
                Tương thích định dạng THCS và THPT Đốc Binh Kiều
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 pt-3 pb-1 text-xs">
          <button
            onClick={() => {
              setActiveTab('upload');
              setErrorMsg(null);
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded font-semibold transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>Nạp File Excel (.xlsx)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('paste');
              setErrorMsg(null);
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded font-semibold transition-all cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Dán Từ Excel (Ctrl + V)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-2 space-y-3 text-xs">
          {activeTab === 'upload' ? (
            <>
              {/* Action to Download Template */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <div>
                    <strong className="text-slate-800 font-semibold block text-[11px]">
                      File Excel Mẫu Chuẩn
                    </strong>
                    <span className="text-slate-500 text-[10px]">
                      Tải mẫu cấu trúc bảng giáo viên và ma trận phân công
                    </span>
                  </div>
                </div>
                <button
                  onClick={generateExcelTemplate}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer shrink-0"
                >
                  <Download className="w-3 h-3" />
                  <span>Tải File Mẫu</span>
                </button>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : selectedFile
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />

                <Upload className="w-6 h-6 text-indigo-600 mx-auto mb-1.5" />
                <div className="font-bold text-slate-800 text-xs">
                  {selectedFile ? selectedFile.name : 'Kéo thả file Excel vào đây'}
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  hoặc <span className="text-indigo-600 underline font-semibold">chọn file từ máy tính</span> (.xlsx, .xls, .csv)
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-600">
                Mở file Excel trên máy tính, bôi đen các dòng trong bảng phân công (Lớp, Môn, Giáo viên) hoặc danh sách giáo viên, nhấn <kbd className="px-1 py-0.5 bg-slate-100 border rounded font-mono text-[10px]">Ctrl + C</kbd> và dán vào bên dưới:
              </p>
              <textarea
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder="Dán các hàng sao chép từ Excel vào đây (Ví dụ: 10A1   Toán   Nguyễn Văn Hùng)..."
                rows={5}
                className="w-full p-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-slate-50"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleProcessPastedText}
                  className="px-3 py-1 rounded text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer shadow-2xs"
                >
                  Nhận Diện & Phân Tích Dữ Liệu
                </button>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="text-center py-1 text-indigo-600 font-semibold text-xs animate-pulse">
              Đang phân tích dữ liệu...
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-start gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-[11px]">Thông báo:</strong>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Import Result Preview */}
          {importResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2.5">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đã nhận diện thành công:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-700 font-medium text-[11px]">
                <div className="bg-white p-1.5 rounded border border-emerald-100">
                  Phân công: <strong className="text-emerald-700">{importResult.assignmentsImported} mục</strong>
                </div>
                <div className="bg-white p-1.5 rounded border border-emerald-100">
                  Giáo viên: <strong className="text-emerald-700">{importResult.teachersImported || teachers.length} GV</strong>
                </div>
              </div>

              {/* Mode choice */}
              <div className="pt-2 border-t border-emerald-200/60 text-[11px]">
                <span className="font-semibold text-slate-700 block mb-1">
                  Chế độ áp dụng dữ liệu:
                </span>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="text-indigo-600"
                    />
                    <span>Gộp thêm / Cập nhật</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-indigo-600"
                    />
                    <span>Thay thế toàn bộ cũ</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onExportExcel}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel hiện tại</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
            >
              Đóng
            </button>
            {importResult && (
              <button
                onClick={handleApply}
                className="px-3.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-2xs cursor-pointer"
              >
                Áp Dụng Dữ Liệu
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

