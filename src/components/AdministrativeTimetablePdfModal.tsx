import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ClassGroup,
  SchoolConfig,
  SchoolTimetable,
  Subject,
  Teacher
} from '../types';
import { getUnifiedSubjectName, getWeekDateRange } from '../utils/timetableHelper';
import {
  GradeCampusFilter,
  GradeGroupingMode,
  GradeSessionExportMode,
  buildGradePrintBlocks,
  buildNormalizedSlotMap,
  buildScheduleRowsForBlock,
  exportTimetableGradeA4Excel,
  resolveCleanTeacherName
} from '../utils/timetableGradeA4ExportHelper';
import {
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  GraduationCap,
  Info,
  Layers,
  Lock,
  Printer,
  X
} from 'lucide-react';

interface AdministrativeTimetablePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SchoolConfig;
  classes: ClassGroup[];
  subjects: Subject[];
  teachers: Teacher[];
  timetable: SchoolTimetable;
  currentWeek: number;
  initialCampus?: GradeCampusFilter;
  initialGrade?: string;
  initialGroupingMode?: GradeGroupingMode;
  initialSession?: GradeSessionExportMode;
  isAdmin?: boolean;
  onShowToast?: (msg: string) => void;
}

// A4 Portrait (210mm x 297mm) with 3.5mm top/bottom margins -> 290mm (~1096px at 96dpi) printable height.
// Target 1072px (~283.6mm) inside 287mm print sheet container so rows expand cleanly and signature sits near bottom edge.
const A4_PORTRAIT_TARGET_HEIGHT_PX = 1072;
const A4_PORTRAIT_MAX_SAFE_HEIGHT_PX = 1082;

interface SheetMetric {
  padY: number;
  scale: number;
}

export const AdministrativeTimetablePdfModal: React.FC<AdministrativeTimetablePdfModalProps> = ({
  isOpen,
  onClose,
  config,
  classes,
  teachers,
  timetable,
  currentWeek,
  initialCampus = 'ALL',
  initialGrade = 'ALL',
  initialGroupingMode = 'BY_CAMPUS_GRADE',
  initialSession = 'SMART_A4',
  isAdmin = false,
  onShowToast
}) => {
  const [selectedCampus, setSelectedCampus] = useState<GradeCampusFilter>(initialCampus);
  const [selectedGrade, setSelectedGrade] = useState<string>(initialGrade);
  const [groupingMode, setGroupingMode] = useState<GradeGroupingMode>(initialGroupingMode);
  const [sessionMode, setSessionMode] = useState<GradeSessionExportMode>(initialSession);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('sm');
  const [compactOneLine, setCompactOneLine] = useState<boolean>(false);
  const [creatorName, setCreatorName] = useState<string>(config.vicePrincipalName || 'Nguyễn Minh Trí');
  const [locationName, setLocationName] = useState<string>('Đốc Binh Kiều');
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [sheetMetrics, setSheetMetrics] = useState<Record<string, SheetMetric>>({});

  const headerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const theadRefs = useRef<Record<string, HTMLTableSectionElement | null>>({});
  const tbodyRefs = useRef<Record<string, HTMLTableSectionElement | null>>({});
  const sigRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Sync incoming filters whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedCampus(initialCampus);
      setSelectedGrade(initialGrade);
      setGroupingMode(initialGroupingMode);
      setSessionMode(initialSession);
      setExportError(null);
    }
  }, [isOpen, initialCampus, initialGrade, initialGroupingMode, initialSession]);

  const weekInfo = useMemo(() => {
    return getWeekDateRange(currentWeek, config.academicYear);
  }, [currentWeek, config.academicYear]);

  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);

  const { slotMap } = useMemo(() => buildNormalizedSlotMap(timetable), [timetable]);

  const printBlocks = useMemo(() => {
    return buildGradePrintBlocks(classes, selectedCampus, selectedGrade, groupingMode);
  }, [classes, selectedCampus, selectedGrade, groupingMode]);

  const totalClassesCount = useMemo(() => {
    return printBlocks.reduce((acc, b) => acc + b.classes.length, 0);
  }, [printBlocks]);

  // Measure each rendered A4 Portrait sheet, expand row padding to fill full A4 height, and guarantee 1-page fit
  useLayoutEffect(() => {
    if (!isOpen || !isAdmin) return;

    const measureAll = () => {
      const nextMetrics: Record<string, SheetMetric> = {};
      printBlocks.forEach(block => {
        const headerEl = headerRefs.current[block.id];
        const theadEl = theadRefs.current[block.id];
        const tbodyEl = tbodyRefs.current[block.id];
        const sigEl = sigRefs.current[block.id];
        if (!headerEl || !theadEl || !tbodyEl || !sigEl) return;

        const rowCount = Math.max(1, tbodyEl.querySelectorAll('tr').length);
        const appliedPadY = Number(tbodyEl.dataset.appliedPadY || '1.5');
        const extraPadAlreadyApplied = Math.max(0, (appliedPadY - 1.5) * 2 * rowCount);

        const headerH = headerEl.offsetHeight;
        const theadH = theadEl.offsetHeight;
        const tbodyH = tbodyEl.offsetHeight;
        const sigH = sigEl.offsetHeight;

        const chromeOverhead = 10;
        const baseTbodyH = Math.max(40, tbodyH - extraPadAlreadyApplied);
        const baseTotalH = headerH + theadH + baseTbodyH + sigH + chromeOverhead;

        let nextPadY = 1.5;
        let nextScale = 1;

        if (baseTotalH < A4_PORTRAIT_TARGET_HEIGHT_PX) {
          const freePx = A4_PORTRAIT_TARGET_HEIGHT_PX - baseTotalH;
          const rawPadY = 1.5 + Math.max(0, freePx - 8) / (2 * rowCount);
          nextPadY = Math.min(18, Math.max(1.5, Math.floor(rawPadY * 10) / 10));

          if (Math.abs(appliedPadY - nextPadY) <= 0.2 && appliedPadY >= 1.5) {
            nextPadY = appliedPadY;
          }

          const actualTotalH = headerH + theadH + tbodyH + sigH + chromeOverhead;
          if (Math.abs(appliedPadY - nextPadY) < 0.05 && actualTotalH > A4_PORTRAIT_MAX_SAFE_HEIGHT_PX) {
            nextScale = Math.max(
              0.55,
              Number((A4_PORTRAIT_MAX_SAFE_HEIGHT_PX / actualTotalH).toFixed(3))
            );
          }
        } else {
          nextPadY = 1.5;
          const rawScale = A4_PORTRAIT_MAX_SAFE_HEIGHT_PX / baseTotalH;
          nextScale = Math.max(0.55, Number(rawScale.toFixed(3)));
        }

        nextMetrics[block.id] = { padY: nextPadY, scale: nextScale };
      });

      setSheetMetrics(prev => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(nextMetrics);
        if (
          prevKeys.length === nextKeys.length &&
          nextKeys.every(
            k =>
              prev[k] &&
              Math.abs(prev[k].padY - nextMetrics[k].padY) < 0.05 &&
              Math.abs(prev[k].scale - nextMetrics[k].scale) < 0.002
          )
        ) {
          return prev;
        }
        return nextMetrics;
      });
    };

    measureAll();
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(measureAll).catch(() => {});
    }
  }, [
    isOpen,
    isAdmin,
    printBlocks,
    sessionMode,
    fontSize,
    compactOneLine,
    creatorName,
    locationName,
    currentWeek,
    sheetMetrics
  ]);

  // Strict admin-only enforcement
  if (!isOpen || !isAdmin) return null;

  const handlePrint = () => {
    if (!isAdmin) return;
    setExportError(null);
    window.print();
  };

  const handleExportExcel = async () => {
    if (!isAdmin) return;
    try {
      setIsExportingExcel(true);
      setExportError(null);
      const result = await exportTimetableGradeA4Excel({
        isAdmin,
        config,
        classes,
        teachers,
        timetable,
        currentWeek,
        campusFilter: selectedCampus,
        gradeFilter: selectedGrade,
        groupingMode,
        sessionMode,
        orientation: 'portrait',
        compactOneLine,
        creatorName,
        locationName
      });
      onShowToast?.(
        `Đã xuất file Excel chuẩn A4 đứng (${result.exportedSheetCount} khối): ${result.fileName}`
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Đã xảy ra lỗi khi xuất file Excel. Vui lòng thử lại.';
      setExportError(msg);
      onShowToast?.(msg);
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:m-0 print:static print:block print:bg-white print:overflow-visible">
      {/* Strict A4 Portrait print stylesheet, dynamic row expansion & single-page bottom-pinned layout */}
      <style>{`
        .admin-timetable-print-table tbody td {
          padding-top: var(--row-pad-y, 1.5px);
          padding-bottom: var(--row-pad-y, 1.5px);
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 3.5mm 4.5mm;
          }
          .admin-timetable-print-sheet {
            width: 201mm !important;
            height: 287mm !important;
            max-height: 287mm !important;
            overflow: hidden !important;
            margin: 0 auto !important;
            padding: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .admin-sheet-page-break {
            page-break-after: always !important;
            break-after: page !important;
          }
          .admin-timetable-a4-inner {
            width: calc(100% / var(--a4-fit-scale, 1)) !important;
            min-height: calc(286mm / var(--a4-fit-scale, 1)) !important;
            transform: scale(var(--a4-fit-scale, 1));
            transform-origin: top left;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-[98vw] max-h-[96vh] flex flex-col overflow-hidden print:block print:w-full print:max-w-none print:max-h-none print:border-none print:shadow-none print:rounded-none print:overflow-visible">
        {/* Top Header Bar - Hidden when printing */}
        <div className="bg-slate-900 text-white px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-rose-600 rounded-xl text-white shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-normal uppercase">
                  Xuất & In Thời Khóa Biểu Theo Khối (Khổ A4 Đứng)
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30 whitespace-nowrap">
                  <Lock className="w-3 h-3" />
                  <span>Chỉ Quản trị viên</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Đúng bố cục Bảng Tổng Hợp Toàn Trường • Tự căn vừa đúng 1 trang A4 đứng/khối để in dán bảng thông báo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel || printBlocks.length === 0}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Tải file Excel chia từng sheet theo khối, căn sẵn khổ A4 đứng vừa 1 trang"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isExportingExcel ? 'Đang xuất...' : 'Xuất Excel A4 Đứng'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={printBlocks.length === 0}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Mở hộp thoại In hoặc Lưu PDF khổ A4 đứng từng khối"
            >
              <Printer className="w-4 h-4" />
              <span>In / Lưu PDF A4 Đứng</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Đóng hộp thoại"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Configuration Controls Bar - Hidden when printing */}
        <div className="bg-white border-b border-slate-200 p-3 sm:p-4 space-y-3 shrink-0 print:hidden">
          {exportError && (
            <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-2">
              <span>{exportError}</span>
              <button
                type="button"
                onClick={() => setExportError(null)}
                className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Grouping mode */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700 flex items-center gap-1 whitespace-nowrap">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Cách chia bảng:</span>
              </span>
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setGroupingMode('BY_CAMPUS_GRADE')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
                    groupingMode === 'BY_CAMPUS_GRADE'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Theo Khối & Điểm (Giống Bảng Tổng Hợp)
                </button>
                <button
                  type="button"
                  onClick={() => setGroupingMode('MERGED_BY_GRADE')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
                    groupingMode === 'MERGED_BY_GRADE'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Gộp chung theo Khối (6–12)
                </button>
              </div>
            </div>

            {/* Campus selector */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700 flex items-center gap-1 whitespace-nowrap">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Điểm trường:</span>
              </span>
              <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1 border border-slate-200">
                {[
                  { id: 'ALL' as const, label: 'Tất cả (3 điểm)' },
                  { id: 'THPT' as const, label: 'THPT Chính' },
                  { id: 'DBK' as const, label: 'Đốc Binh Kiều' },
                  { id: 'TK' as const, label: 'Tân Kiều' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedCampus(item.id);
                      setSelectedGrade('ALL');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
                      selectedCampus === item.id
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grade selector */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700 flex items-center gap-1 whitespace-nowrap">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                <span>Khối:</span>
              </span>
              <select
                value={selectedGrade}
                onChange={e => setSelectedGrade(e.target.value)}
                className="h-8 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="ALL">Tất cả các khối</option>
                {(selectedCampus === 'ALL' || selectedCampus === 'THPT') && (
                  <optgroup label="Khối THPT">
                    <option value="10">Khối 10 (5 lớp: 10CB1 - 10CB5)</option>
                    <option value="11">Khối 11 (4 lớp: 11CB1 - 11CB4)</option>
                    <option value="12">Khối 12 (5 lớp: 12CB1 - 12CB5)</option>
                  </optgroup>
                )}
                {(selectedCampus === 'ALL' || selectedCampus === 'DBK' || selectedCampus === 'TK') && (
                  <optgroup label="Khối THCS">
                    <option value="6">Khối 6 (ĐBK: 6A1-6A6 • TK: 6A7-6A10)</option>
                    <option value="7">Khối 7 (ĐBK: 7A1-7A6 • TK: 7A7-7A9)</option>
                    <option value="8">Khối 8 (ĐBK: 8A1-8A6 • TK: 8A7-8A10)</option>
                    <option value="9">Khối 9 (ĐBK: 9A1-9A6 • TK: 9A7-9A10)</option>
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-3">
              {/* Session mode */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 whitespace-nowrap">Số dòng tiết:</span>
                <select
                  value={sessionMode}
                  onChange={e => setSessionMode(e.target.value as GradeSessionExportMode)}
                  className="h-8 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="SMART_A4">Chuẩn A4 (Ẩn tiết trái buổi trống - Đủ 100% tiết học)</option>
                  <option value="MAIN_ONLY">Chỉ 1 ca chính (Sáng hoặc Chiều - Chữ lớn nhất)</option>
                  <option value="SANG">Chỉ Buổi Sáng (Tiết 1 - 5)</option>
                  <option value="CHIEU">Chỉ Buổi Chiều (Tiết 1 - 5)</option>
                  <option value="ALL">Đầy đủ cả 2 buổi (10 tiết/ngày)</option>
                </select>
              </div>

              {/* Cell display mode */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 whitespace-nowrap">Hiển thị ô:</span>
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setCompactOneLine(false)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all whitespace-nowrap ${
                      !compactOneLine
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    2 dòng (Môn + GV)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompactOneLine(true)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all whitespace-nowrap ${
                      compactOneLine
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Gọn 1 dòng
                  </button>
                </div>
              </div>

              {/* Font size */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 whitespace-nowrap">Cỡ chữ:</span>
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-[11px]">
                  {[
                    { id: 'sm' as const, label: 'Chuẩn' },
                    { id: 'md' as const, label: 'Vừa' },
                    { id: 'lg' as const, label: 'Lớn' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFontSize(f.id)}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer whitespace-nowrap ${
                        fontSize === f.id ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Signature & metadata */}
            <div className="flex flex-wrap items-center gap-2.5 text-slate-600">
              <span className="font-bold text-indigo-900 flex items-center gap-1 tabular-nums whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {printBlocks.length} trang A4 đứng ({totalClassesCount} lớp)
                </span>
              </span>

              <div className="flex items-center gap-1 bg-slate-100 border border-slate-300 rounded px-2 py-0.5">
                <span className="text-[11px] font-bold text-slate-700">Địa danh:</span>
                <input
                  type="text"
                  value={locationName}
                  onChange={e => setLocationName(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-900 w-28 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 border border-slate-300 rounded px-2 py-0.5">
                <span className="text-[11px] font-bold text-slate-700">Người ký:</span>
                <input
                  type="text"
                  value={creatorName}
                  onChange={e => setCreatorName(e.target.value)}
                  className="bg-transparent text-xs font-bold text-indigo-950 w-32 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Print Preview & Print Sheets Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/70 space-y-6 print:p-0 print:m-0 print:bg-white print:overflow-visible print:space-y-0">
          {printBlocks.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-500 max-w-md mx-auto shadow-sm print:hidden">
              <Info className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="font-bold text-slate-800">Không có lớp học nào thỏa mãn điều kiện lọc</p>
              <p className="text-xs text-slate-500 mt-1">
                Vui lòng chọn lại điểm trường hoặc khối lớp bên trên.
              </p>
            </div>
          ) : (
            printBlocks.map((block, blockIndex) => {
              const scheduleRows = buildScheduleRowsForBlock(block, slotMap, sessionMode);
              const metric = sheetMetrics[block.id] ?? { padY: 1.5, scale: 1 };
              const fitScale = metric.scale;
              const rowPadY = metric.padY;
              const classColPercent = (85 / Math.max(1, block.classes.length)).toFixed(2);

              const fontSizeClass =
                fontSize === 'sm'
                  ? scheduleRows.length <= 36 && block.classes.length <= 6
                    ? 'text-[7.4pt] leading-[1.1]'
                    : 'text-[6.9pt] leading-[1.08]'
                  : fontSize === 'md'
                  ? 'text-[7.7pt] leading-[1.1]'
                  : 'text-[8.4pt] leading-[1.12]';

              const hasPageBreakAfter = blockIndex < printBlocks.length - 1;

              return (
                <div
                  key={block.id}
                  className={`bg-white text-black p-[4.5mm] rounded-xl shadow-md border border-slate-300 mx-auto w-full max-w-[210mm] admin-timetable-print-sheet print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:rounded-none ${
                    hasPageBreakAfter ? 'admin-sheet-page-break' : ''
                  }`}
                  style={{
                    fontFamily: "'Tinos', 'Times New Roman', 'Be Vietnam Pro', serif",
                    fontSynthesis: 'none'
                  }}
                >
                  {/* Screen-only page badge */}
                  <div className="flex items-center justify-between text-[11px] font-sans font-semibold text-slate-500 pb-2 mb-2 border-b border-slate-200 print:hidden">
                    <span className="tabular-nums">
                      Trang A4 đứng {blockIndex + 1}/{printBlocks.length} • {block.gradeLabel} ({block.campusShort}) • {block.classes.length} lớp • {scheduleRows.length} dòng tiết
                    </span>
                    <span className="text-indigo-700 font-bold tabular-nums">
                      Khổ A4 Đứng • {fitScale < 1 ? `Tự co ${Math.round(fitScale * 100)}% vừa khít 1 trang` : `Phủ kín trang A4 (đệm dòng ${rowPadY.toFixed(1)}px)`}
                    </span>
                  </div>

                  <div
                    className="admin-timetable-a4-inner flex flex-col"
                    style={{
                      ['--a4-fit-scale' as string]: fitScale,
                      minHeight: fitScale === 1 ? '286mm' : undefined,
                      fontFamily: "'Tinos', 'Times New Roman', 'Be Vietnam Pro', serif",
                      fontSynthesis: 'none',
                      letterSpacing: 'normal'
                    }}
                  >
                    {/* Top Administrative Header */}
                    <div
                      ref={el => {
                        headerRefs.current[block.id] = el;
                      }}
                      className="border-b border-black pb-1 mb-1"
                    >
                      <div className="flex justify-between items-start text-xs uppercase">
                        <div className="text-center w-[46%]">
                          <div className="text-[9pt] font-normal leading-tight text-black">
                            {config.subTitle || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP'}
                          </div>
                          <div className="text-[9.5pt] font-bold text-black mt-0.5">
                            {config.schoolName || 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU'}
                          </div>
                          <div className="w-28 h-[1px] bg-black mx-auto mt-0.5" />
                        </div>

                        <div className="text-center w-[50%]">
                          <div className="text-[9pt] font-bold leading-tight text-black">
                            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                          </div>
                          <div className="text-[9pt] font-bold normal-case text-black mt-0.5">
                            Độc lập - Tự do - Hạnh phúc
                          </div>
                          <div className="w-32 h-[1px] bg-black mx-auto mt-0.5" />
                        </div>
                      </div>

                      {/* Main Title & Subtitle */}
                      <div className="text-center mt-1">
                        <h1 className="text-[11.5pt] font-bold uppercase text-black leading-tight tracking-normal">
                          {block.title} — {block.subtitle}
                        </h1>
                        <div className="text-[8.5pt] font-bold italic text-slate-900 mt-0.5">
                          Tuần {currentWeek} (Từ ngày {weekInfo.startDateShort} đến ngày {weekInfo.endDateShort}) • Năm học {config.academicYear || '2026 - 2027'} • Áp dụng từ Thứ Hai, {weekInfo.startDateShort}
                        </div>
                      </div>
                    </div>

                    {/* Timetable Matrix Table matching BẢNG TỔNG HỢP THỜI KHÓA BIỂU TOÀN TRƯỜNG */}
                    <div className="overflow-x-auto print:overflow-visible my-1">
                      <table
                        className={`w-full table-fixed border-collapse border border-black text-center ${fontSizeClass} admin-timetable-print-table`}
                        style={{
                          ['--row-pad-y' as string]: `${rowPadY}px`,
                          fontFamily: "'Tinos', 'Times New Roman', 'Be Vietnam Pro', serif",
                          fontSynthesis: 'none',
                          letterSpacing: 'normal'
                        }}
                      >
                        <colgroup>
                          <col style={{ width: '6.5%' }} />
                          <col style={{ width: '5%' }} />
                          <col style={{ width: '3.5%' }} />
                          {block.classes.map(cls => (
                            <col key={`col-${cls.id}`} style={{ width: `${classColPercent}%` }} />
                          ))}
                        </colgroup>

                        <thead
                          ref={el => {
                            theadRefs.current[block.id] = el;
                          }}
                        >
                          <tr className="bg-slate-100 font-bold border-b border-black">
                            <th rowSpan={2} className="border border-black px-0.5 py-0.5 text-center bg-slate-200/80">
                              THỨ
                            </th>
                            <th rowSpan={2} className="border border-black px-0.5 py-0.5 text-center bg-slate-200/80">
                              BUỔI
                            </th>
                            <th rowSpan={2} className="border border-black px-0.5 py-0.5 text-center bg-slate-200/80">
                              TIẾT
                            </th>
                            {block.classes.map(cls => (
                              <th
                                key={cls.id}
                                className="border border-black px-0.5 py-0.5 font-bold text-center bg-slate-100"
                              >
                                {cls.name}
                              </th>
                            ))}
                          </tr>
                          <tr className="bg-slate-50 font-normal border-b border-black text-[84%] italic text-slate-800">
                            {block.classes.map(cls => {
                              const homeroom = cls.homeroomTeacherId
                                ? teacherMap.get(cls.homeroomTeacherId)
                                : undefined;
                              return (
                                <th
                                  key={`gvcn-${cls.id}`}
                                  className="border border-black px-0.5 py-0.5 text-center font-bold text-slate-800"
                                >
                                  {homeroom
                                    ? `GVCN: ${homeroom.name.replace(/^Thầy\s+|^Cô\s+/i, '')}`
                                    : '-'}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>

                        <tbody
                          ref={el => {
                            tbodyRefs.current[block.id] = el;
                          }}
                          data-applied-pad-y={rowPadY}
                        >
                          {scheduleRows.map(rowMeta => (
                            <tr
                              key={`${rowMeta.dayValue}_${rowMeta.session}_${rowMeta.period}`}
                              className={`${
                                rowMeta.isLastRowOfDay ? 'border-b-[1.5pt] border-black' : 'border-b border-black'
                              } ${rowMeta.dayValue % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                            >
                              {rowMeta.showDayCell && (
                                <td
                                  rowSpan={rowMeta.dayRowSpan}
                                  className="border border-black px-0.5 font-bold text-center align-middle bg-slate-100/90"
                                >
                                  {rowMeta.dayLabel}
                                </td>
                              )}

                              {rowMeta.showSessionCell && (
                                <td
                                  rowSpan={rowMeta.sessionRowSpan}
                                  className="border border-black px-0.5 font-bold text-center align-middle bg-slate-50"
                                >
                                  {rowMeta.sessionLabel}
                                </td>
                              )}

                              <td className="border border-black px-0.5 font-bold text-center align-middle tabular-nums">
                                {rowMeta.period}
                              </td>

                              {block.classes.map(cls => {
                                const slot =
                                  slotMap.get(`${cls.id}_${rowMeta.dayValue}_${rowMeta.session}_${rowMeta.period}`) ||
                                  slotMap.get(`${cls.name}_${rowMeta.dayValue}_${rowMeta.session}_${rowMeta.period}`);

                                if (!slot || !slot.subjectName) {
                                  return (
                                    <td
                                      key={cls.id}
                                      className="border border-black px-0.5 text-center text-slate-400 font-normal"
                                    >
                                      -
                                    </td>
                                  );
                                }

                                const subjectName = getUnifiedSubjectName(slot);
                                const teacherName = resolveCleanTeacherName(slot, teacherMap, teachers);
                                const isSpecial =
                                  slot.isSpecialActivity ||
                                  subjectName.includes('Chào cờ') ||
                                  subjectName.includes('Sinh hoạt');

                                return (
                                  <td
                                    key={cls.id}
                                    className={`border border-black px-0.5 text-center align-middle ${
                                      isSpecial ? 'bg-amber-100/70' : ''
                                    }`}
                                  >
                                    {compactOneLine ? (
                                      <div className="text-black">
                                        <span className="font-bold">{subjectName}</span>
                                        {teacherName && (
                                          <span className="text-[85%] text-slate-800 italic">
                                            {' '}
                                            ({teacherName})
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <>
                                        <div className="font-bold text-black">
                                          {subjectName}
                                        </div>
                                        {teacherName && (
                                          <div
                                            className="text-[85%] text-slate-800 italic"
                                            title={teacherName}
                                          >
                                            {teacherName}
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Administrative Signature Block - Pinned near bottom edge of A4 Portrait sheet */}
                    <div
                      ref={el => {
                        sigRefs.current[block.id] = el;
                      }}
                      className="mt-auto pt-1 text-black print-avoid-break"
                    >
                      <div className="flex justify-end">
                        <div className="w-64 text-center">
                          <div className="text-[8.5pt] italic text-black">
                            {locationName}, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                          </div>
                          <div className="text-[9pt] font-bold uppercase text-black">
                            KT. HIỆU TRƯỞNG
                          </div>
                          <div className="text-[9.5pt] font-bold uppercase text-black">
                            PHÓ HIỆU TRƯỞNG
                          </div>
                          <div className="text-[8pt] italic text-slate-700">
                            (Ký và ghi rõ họ tên)
                          </div>
                          <div className="h-7 flex items-end justify-center font-bold text-[9.5pt] text-black">
                            {creatorName || 'Nguyễn Minh Trí'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Bar - Hidden when printing */}
        <div className="bg-white border-t border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 shrink-0 print:hidden">
          <div className="font-medium text-slate-700">
            Mẹo in chuẩn A4 Đứng: Chọn <strong>Khổ giấy: A4</strong>, <strong>Hướng: Dọc (Portrait)</strong>, tỷ lệ{' '}
            <strong>Mặc định (100%)</strong> và bật <strong>Đồ họa nền (Background graphics)</strong>.
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel || printBlocks.length === 0}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Xuất Excel A4 Đứng</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={printBlocks.length === 0}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In / Lưu PDF A4 Đứng</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
