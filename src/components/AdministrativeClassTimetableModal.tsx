import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ClassGroup,
  SchoolConfig,
  SchoolTimetable,
  Teacher
} from '../types';
import { DAYS_OF_WEEK, getUnifiedSubjectName, getWeekDateRange } from '../utils/timetableHelper';
import {
  GradeCampusFilter,
  GradeSessionExportMode,
  buildNormalizedSlotMap,
  resolveCleanTeacherName
} from '../utils/timetableGradeA4ExportHelper';
import {
  buildClassPrintItems,
  buildClassScheduleRows,
  exportTimetableClassesA4Excel
} from '../utils/timetableClassA4ExportHelper';
import {
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  GraduationCap,
  Info,
  Lock,
  Printer,
  Users2,
  X
} from 'lucide-react';

interface AdministrativeClassTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SchoolConfig;
  classes: ClassGroup[];
  teachers: Teacher[];
  timetable: SchoolTimetable;
  currentWeek: number;
  initialCampus?: GradeCampusFilter;
  initialGrade?: string;
  initialClassId?: string;
  initialSession?: GradeSessionExportMode;
  isAdmin?: boolean;
  onShowToast?: (msg: string) => void;
}

const A4_PORTRAIT_TARGET_HEIGHT_PX = 1066;
const A4_PORTRAIT_MAX_SAFE_HEIGHT_PX = 1074;

interface SheetMetric {
  padY: number;
  scale: number;
}

export const AdministrativeClassTimetableModal: React.FC<AdministrativeClassTimetableModalProps> = ({
  isOpen,
  onClose,
  config,
  classes,
  teachers,
  timetable,
  currentWeek,
  initialCampus = 'ALL',
  initialGrade = 'ALL',
  initialClassId = 'ALL',
  initialSession = 'SMART_A4',
  isAdmin = false,
  onShowToast
}) => {
  const [selectedCampus, setSelectedCampus] = useState<GradeCampusFilter>(initialCampus);
  const [selectedGrade, setSelectedGrade] = useState<string>(initialGrade);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [sessionMode, setSessionMode] = useState<GradeSessionExportMode>(initialSession);
  const [compactOneLine, setCompactOneLine] = useState<boolean>(false);
  const [showTeacherName, setShowTeacherName] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [creatorName, setCreatorName] = useState<string>(config.vicePrincipalName || 'Nguyễn Minh Trí');
  const [locationName, setLocationName] = useState<string>('Đốc Binh Kiều');
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [sheetMetrics, setSheetMetrics] = useState<Record<string, SheetMetric>>({});

  const headerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const theadRefs = useRef<Record<string, HTMLTableSectionElement | null>>({});
  const tbodyRefs = useRef<Record<string, HTMLTableSectionElement | null>>({});
  const sigRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (isOpen) {
      setSelectedCampus(initialCampus);
      setSelectedGrade(initialGrade);
      setSelectedClassId(initialClassId);
      setSessionMode(initialSession);
      setExportError(null);
    }
  }, [isOpen, initialCampus, initialGrade, initialClassId, initialSession]);

  const weekInfo = useMemo(() => {
    return getWeekDateRange(currentWeek, config.academicYear);
  }, [currentWeek, config.academicYear]);

  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);
  const { slotMap } = useMemo(() => buildNormalizedSlotMap(timetable), [timetable]);

  // All classes matching campus & grade for class selector dropdown
  const availableClassDropdownItems = useMemo(() => {
    return buildClassPrintItems(classes, teachers, slotMap, selectedCampus, selectedGrade, 'ALL');
  }, [classes, teachers, slotMap, selectedCampus, selectedGrade]);

  // Active classes to render & export
  const classItems = useMemo(() => {
    return buildClassPrintItems(
      classes,
      teachers,
      slotMap,
      selectedCampus,
      selectedGrade,
      selectedClassId
    );
  }, [classes, teachers, slotMap, selectedCampus, selectedGrade, selectedClassId]);

  useLayoutEffect(() => {
    if (!isOpen || !isAdmin) return;

    const measureAll = () => {
      const nextMetrics: Record<string, SheetMetric> = {};
      classItems.forEach(item => {
        const clsId = item.classGroup.id;
        const headerEl = headerRefs.current[clsId];
        const theadEl = theadRefs.current[clsId];
        const tbodyEl = tbodyRefs.current[clsId];
        const sigEl = sigRefs.current[clsId];
        if (!headerEl || !theadEl || !tbodyEl || !sigEl) return;

        const rowCount = Math.max(1, tbodyEl.querySelectorAll('tr').length);
        const appliedPadY = Number(tbodyEl.dataset.appliedPadY || '4');
        const extraPadAlreadyApplied = Math.max(0, (appliedPadY - 4) * 2 * rowCount);

        const headerH = headerEl.offsetHeight;
        const theadH = theadEl.offsetHeight;
        const tbodyH = tbodyEl.offsetHeight;
        const sigH = sigEl.offsetHeight;

        const chromeOverhead = 14;
        const baseTbodyH = Math.max(60, tbodyH - extraPadAlreadyApplied);
        const baseTotalH = headerH + theadH + baseTbodyH + sigH + chromeOverhead;

        let nextPadY = 4;
        let nextScale = 1;

        if (baseTotalH < A4_PORTRAIT_TARGET_HEIGHT_PX) {
          const freePx = A4_PORTRAIT_TARGET_HEIGHT_PX - baseTotalH;
          const rawPadY = 4 + Math.max(0, freePx - 10) / (2 * rowCount);
          nextPadY = Math.min(48, Math.max(4, Math.floor(rawPadY * 10) / 10));

          if (Math.abs(appliedPadY - nextPadY) <= 0.3 && appliedPadY >= 4) {
            nextPadY = appliedPadY;
          }

          const actualTotalH = headerH + theadH + tbodyH + sigH + chromeOverhead;
          if (Math.abs(appliedPadY - nextPadY) < 0.05 && actualTotalH > A4_PORTRAIT_MAX_SAFE_HEIGHT_PX) {
            nextScale = Math.max(
              0.65,
              Number((A4_PORTRAIT_MAX_SAFE_HEIGHT_PX / actualTotalH).toFixed(3))
            );
          }
        } else {
          nextPadY = 4;
          const rawScale = A4_PORTRAIT_MAX_SAFE_HEIGHT_PX / baseTotalH;
          nextScale = Math.max(0.65, Number(rawScale.toFixed(3)));
        }

        nextMetrics[clsId] = { padY: nextPadY, scale: nextScale };
      });

      setSheetMetrics(prev => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(nextMetrics);
        if (
          prevKeys.length === nextKeys.length &&
          nextKeys.every(
            k =>
              prev[k] &&
              Math.abs(prev[k].padY - nextMetrics[k].padY) < 0.1 &&
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
    classItems,
    sessionMode,
    fontSize,
    compactOneLine,
    showTeacherName,
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
      const result = await exportTimetableClassesA4Excel({
        isAdmin,
        config,
        classes,
        teachers,
        timetable,
        currentWeek,
        campusFilter: selectedCampus,
        gradeFilter: selectedGrade,
        classIdFilter: selectedClassId,
        sessionMode,
        orientation: 'portrait',
        compactOneLine,
        showTeacherName,
        creatorName,
        locationName
      });
      onShowToast?.(
        `Đã xuất file Excel chuẩn A4 cho ${result.exportedSheetCount} lớp (${result.fileName})`
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Đã xảy ra lỗi khi xuất file Excel cho lớp. Vui lòng thử lại.';
      setExportError(msg);
      onShowToast?.(msg);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const modalContent = (
    <div className="admin-timetable-print-root fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:m-0 print:static print:block print:bg-white print:overflow-visible">
      <style>{`
        .admin-class-print-table tbody td {
          padding-top: var(--row-pad-y, 4px);
          padding-bottom: var(--row-pad-y, 4px);
        }
        @media print {
          #root {
            display: none !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
          }
          @page {
            size: A4 portrait;
            margin: 4.5mm 5mm;
          }
          .admin-timetable-print-root,
          .admin-timetable-print-dialog,
          .admin-timetable-print-scroll {
            position: static !important;
            inset: auto !important;
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            transform: none !important;
            overflow: visible !important;
          }
          .admin-timetable-print-scroll > * {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }
          .admin-timetable-print-sheet {
            width: 200mm !important;
            height: 285mm !important;
            max-height: 285mm !important;
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
            min-height: calc(284mm / var(--a4-fit-scale, 1)) !important;
            transform: scale(var(--a4-fit-scale, 1));
            transform-origin: top left;
          }
        }
      `}</style>

      <div className="admin-timetable-print-dialog bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-[98vw] max-h-[96vh] flex flex-col overflow-hidden print:block print:w-full print:max-w-none print:max-h-none print:border-none print:shadow-none print:rounded-none print:overflow-visible">
        {/* Top Header Bar - Hidden when printing */}
        <div className="bg-slate-900 text-white px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shrink-0">
              <Users2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-normal uppercase">
                  Xuất & In Thời Khóa Biểu Cho Từng Lớp (53 Lớp • Khổ A4 Đứng)
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30 whitespace-nowrap">
                  <Lock className="w-3 h-3" />
                  <span>Chỉ Quản trị viên</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Mỗi lớp học 1 trang A4 đứng / 1 sheet Excel riêng biệt • Phù hợp dán tại lớp học hoặc giao GVCN
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel || classItems.length === 0}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Tải file Excel chia từng sheet riêng cho mỗi lớp (tối đa 53 sheet), trang trí sẵn khổ A4 đứng"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>
                {isExportingExcel
                  ? 'Đang xuất...'
                  : `Xuất Excel (${classItems.length} Lớp)`}
              </span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={classItems.length === 0}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Mở hộp thoại In hoặc Lưu PDF khổ A4 đứng (mỗi lớp 1 trang)"
            >
              <Printer className="w-4 h-4" />
              <span>In / Lưu PDF ({classItems.length} Trang)</span>
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
            {/* Campus selector */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700 flex items-center gap-1 whitespace-nowrap">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Điểm trường:</span>
              </span>
              <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1 border border-slate-200">
                {[
                  { id: 'ALL' as const, label: 'Tất cả (53 lớp)' },
                  { id: 'THPT' as const, label: 'THPT Chính (14)' },
                  { id: 'DBK' as const, label: 'Đốc Binh Kiều (24)' },
                  { id: 'TK' as const, label: 'Tân Kiều (15)' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedCampus(item.id);
                      setSelectedGrade('ALL');
                      setSelectedClassId('ALL');
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
                onChange={e => {
                  setSelectedGrade(e.target.value);
                  setSelectedClassId('ALL');
                }}
                className="h-8 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="ALL">Tất cả các khối</option>
                {(selectedCampus === 'ALL' || selectedCampus === 'THPT') && (
                  <optgroup label="Khối THPT">
                    <option value="10">Khối 10</option>
                    <option value="11">Khối 11</option>
                    <option value="12">Khối 12</option>
                  </optgroup>
                )}
                {(selectedCampus === 'ALL' || selectedCampus === 'DBK' || selectedCampus === 'TK') && (
                  <optgroup label="Khối THCS">
                    <option value="6">Khối 6</option>
                    <option value="7">Khối 7</option>
                    <option value="8">Khối 8</option>
                    <option value="9">Khối 9</option>
                  </optgroup>
                )}
              </select>
            </div>

            {/* Single class selector */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700 flex items-center gap-1 whitespace-nowrap">
                <Users2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Lớp:</span>
              </span>
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="h-8 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden min-w-[155px]"
              >
                <option value="ALL">
                  Tất cả ({availableClassDropdownItems.length} lớp)
                </option>
                {availableClassDropdownItems.map(item => (
                  <option key={item.classGroup.id} value={item.classGroup.id}>
                    Lớp {item.classGroup.name} ({item.campusShort})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-3">
              {/* Session mode */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 whitespace-nowrap">Buổi hiển thị:</span>
                <select
                  value={sessionMode}
                  onChange={e => setSessionMode(e.target.value as GradeSessionExportMode)}
                  className="h-8 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="SMART_A4">Chuẩn A4 (Ca chính + Tiết trái buổi có dạy)</option>
                  <option value="ALL">Đầy đủ cả 2 buổi (Sáng & Chiều - 10 tiết)</option>
                  <option value="MAIN_ONLY">Chỉ 1 ca chính của lớp (5 tiết)</option>
                  <option value="SANG">Chỉ Buổi Sáng (Tiết 1 - 5)</option>
                  <option value="CHIEU">Chỉ Buổi Chiều (Tiết 1 - 5)</option>
                </select>
              </div>

              {/* Teacher display toggle */}
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 cursor-pointer font-bold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={showTeacherName}
                  onChange={e => setShowTeacherName(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                />
                <span>Hiện tên Giáo viên</span>
              </label>

              {/* Compact 1 line toggle */}
              {showTeacherName && (
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
              )}

              {/* Font size */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 whitespace-nowrap">Cỡ chữ:</span>
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-[11px]">
                  {[
                    { id: 'sm' as const, label: 'Nhỏ' },
                    { id: 'md' as const, label: 'Chuẩn' },
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

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-2.5 text-slate-600">
              <span className="font-bold text-indigo-900 flex items-center gap-1 tabular-nums whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{classItems.length} trang A4 đứng</span>
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
        <div className="admin-timetable-print-scroll flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/70 space-y-6 print:p-0 print:m-0 print:bg-white print:overflow-visible print:space-y-0">
          {classItems.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-500 max-w-md mx-auto shadow-sm print:hidden">
              <Info className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="font-bold text-slate-800">Không có lớp học nào thỏa mãn điều kiện lọc</p>
              <p className="text-xs text-slate-500 mt-1">
                Vui lòng chọn lại điểm trường, khối hoặc tên lớp bên trên.
              </p>
            </div>
          ) : (
            classItems.map((item, idx) => {
              const cls = item.classGroup;
              const classRows = buildClassScheduleRows(item, slotMap, sessionMode);
              const metric = sheetMetrics[cls.id] ?? { padY: 8, scale: 1 };
              const fitScale = metric.scale;
              const rowPadY = metric.padY;

              const fontSizeClass =
                fontSize === 'sm'
                  ? 'text-[8.5pt] leading-[1.16]'
                  : fontSize === 'md'
                  ? classRows.length <= 7
                    ? 'text-[9.8pt] leading-[1.22]'
                    : 'text-[9pt] leading-[1.18]'
                  : classRows.length <= 7
                  ? 'text-[10.8pt] leading-[1.24]'
                  : 'text-[9.6pt] leading-[1.18]';

              const hasPageBreakAfter = idx < classItems.length - 1;

              return (
                <div
                  key={cls.id}
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
                      Trang {idx + 1}/{classItems.length} • Lớp {cls.name} ({item.campusShort}) • GVCN: {item.homeroomName}
                    </span>
                    <span className="text-indigo-700 font-bold tabular-nums">
                      Khổ A4 Đứng • {fitScale < 1 ? `Tự co ${Math.round(fitScale * 100)}%` : `Phủ kín A4 (${classRows.length} tiết/ngày)`}
                    </span>
                  </div>

                  <div
                    className="admin-timetable-a4-inner flex flex-col"
                    style={{
                      ['--a4-fit-scale' as string]: fitScale,
                      minHeight: fitScale === 1 ? '284mm' : undefined,
                      fontFamily: "'Tinos', 'Times New Roman', 'Be Vietnam Pro', serif",
                      fontSynthesis: 'none',
                      letterSpacing: 'normal'
                    }}
                  >
                    {/* Top Administrative Header */}
                    <div
                      ref={el => {
                        headerRefs.current[cls.id] = el;
                      }}
                      className="border-b border-black pb-2 mb-2"
                    >
                      <div className="flex justify-between items-start text-xs uppercase">
                        <div className="text-center w-[46%]">
                          <div className="text-[9.5pt] font-normal leading-tight text-black">
                            {config.subTitle || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP'}
                          </div>
                          <div className="text-[10pt] font-bold text-black mt-0.5">
                            {config.schoolName || 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU'}
                          </div>
                          <div className="w-28 h-[1px] bg-black mx-auto mt-1" />
                        </div>

                        <div className="text-center w-[50%]">
                          <div className="text-[9.5pt] font-bold leading-tight text-black">
                            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                          </div>
                          <div className="text-[9.5pt] font-bold normal-case text-black mt-0.5">
                            Độc lập - Tự do - Hạnh phúc
                          </div>
                          <div className="w-32 h-[1px] bg-black mx-auto mt-1" />
                        </div>
                      </div>

                      {/* Main Title & Class Metadata */}
                      <div className="text-center mt-2.5">
                        <h1 className="text-[14pt] font-bold uppercase text-black leading-tight tracking-normal">
                          THỜI KHÓA BIỂU LỚP {cls.name} (KHỐI {cls.grade})
                        </h1>
                        <div className="text-[10pt] font-bold text-black mt-1">
                          Giáo viên chủ nhiệm: {item.homeroomName} • {item.campusName}
                        </div>
                        <div className="text-[9pt] font-bold italic text-slate-900 mt-0.5">
                          Tuần {currentWeek} (Từ ngày {weekInfo.startDateShort} đến ngày {weekInfo.endDateShort}) • Năm học {config.academicYear || '2026 - 2027'} • Áp dụng từ Thứ Hai, {weekInfo.startDateShort}
                        </div>
                      </div>
                    </div>

                    {/* Class Weekly Grid: Buổi | Tiết | Thứ 2..Thứ 7 */}
                    <div className="overflow-x-auto print:overflow-visible my-1">
                      <table
                        className={`w-full table-fixed border-collapse border-[1.5pt] border-black text-center ${fontSizeClass} admin-class-print-table`}
                        style={{
                          ['--row-pad-y' as string]: `${rowPadY}px`,
                          fontFamily: "'Tinos', 'Times New Roman', 'Be Vietnam Pro', serif",
                          fontSynthesis: 'none',
                          letterSpacing: 'normal'
                        }}
                      >
                        <colgroup>
                          <col style={{ width: '8%' }} />
                          <col style={{ width: '7%' }} />
                          {DAYS_OF_WEEK.map(d => (
                            <col key={`col-${d.value}`} style={{ width: '14.16%' }} />
                          ))}
                        </colgroup>

                        <thead
                          ref={el => {
                            theadRefs.current[cls.id] = el;
                          }}
                        >
                          <tr className="bg-slate-200 font-bold border-b-[1.5pt] border-black">
                            <th className="border border-black px-1 py-2 text-center">BUỔI</th>
                            <th className="border border-black px-1 py-2 text-center">TIẾT</th>
                            {DAYS_OF_WEEK.map(d => (
                              <th key={d.value} className="border border-black px-1 py-2 text-center uppercase">
                                {d.label}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody
                          ref={el => {
                            tbodyRefs.current[cls.id] = el;
                          }}
                          data-applied-pad-y={rowPadY}
                        >
                          {classRows.map(rowMeta => (
                            <tr
                              key={`${rowMeta.session}_${rowMeta.period}`}
                              className={`${
                                rowMeta.isLastRowOfSession
                                  ? 'border-b-[1.5pt] border-black'
                                  : 'border-b border-black'
                              } ${rowMeta.period % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}`}
                            >
                              {rowMeta.showSessionCell && (
                                <td
                                  rowSpan={rowMeta.sessionRowSpan}
                                  className={`border border-black px-1 font-bold text-center align-middle uppercase ${
                                    rowMeta.session === 'SANG' ? 'bg-indigo-50/70' : 'bg-amber-50/70'
                                  }`}
                                >
                                  {rowMeta.sessionLabel}
                                </td>
                              )}

                              <td className="border border-black px-1 font-bold text-center align-middle tabular-nums bg-slate-100/70">
                                Tiết {rowMeta.period}
                              </td>

                              {DAYS_OF_WEEK.map(day => {
                                const slot =
                                  slotMap.get(`${cls.id}_${day.value}_${rowMeta.session}_${rowMeta.period}`) ||
                                  slotMap.get(`${cls.name}_${day.value}_${rowMeta.session}_${rowMeta.period}`);

                                if (!slot || !slot.subjectName) {
                                  return (
                                    <td
                                      key={day.value}
                                      className="border border-black px-1 text-center text-slate-400 font-normal"
                                    >
                                      -
                                    </td>
                                  );
                                }

                                const subjectName = getUnifiedSubjectName(slot);
                                const teacherName = showTeacherName
                                  ? resolveCleanTeacherName(slot, teacherMap, teachers)
                                  : '';
                                const isSpecial =
                                  slot.isSpecialActivity ||
                                  subjectName.includes('Chào cờ') ||
                                  subjectName.includes('Sinh hoạt');

                                return (
                                  <td
                                    key={day.value}
                                    className={`border border-black px-1 text-center align-middle ${
                                      isSpecial ? 'bg-amber-100/70' : ''
                                    }`}
                                  >
                                    {compactOneLine || !teacherName ? (
                                      <div className="text-black">
                                        <span className="font-bold">{subjectName}</span>
                                        {teacherName && (
                                          <span className="text-[86%] text-slate-800 italic">
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
                                        <div
                                          className="text-[86%] text-slate-800 italic mt-0.5"
                                          title={teacherName}
                                        >
                                          {teacherName}
                                        </div>
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
                        sigRefs.current[cls.id] = el;
                      }}
                      className="mt-auto pt-2 text-black print-avoid-break flex items-end justify-between gap-4"
                    >
                      <div className="text-[8.5pt] italic text-slate-700 pb-1">
                        * Học sinh chuẩn bị đầy đủ sách vở và dụng cụ học tập theo Thời khóa biểu Tuần {currentWeek}.
                      </div>

                      <div className="w-64 text-center shrink-0">
                        <div className="text-[9pt] italic text-black">
                          {locationName}, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                        </div>
                        <div className="text-[9.5pt] font-bold uppercase text-black">
                          KT. HIỆU TRƯỞNG
                        </div>
                        <div className="text-[10pt] font-bold uppercase text-black">
                          PHÓ HIỆU TRƯỞNG
                        </div>
                        <div className="text-[8.5pt] italic text-slate-700">
                          (Ký và ghi rõ họ tên)
                        </div>
                        <div className="h-9 flex items-end justify-center font-bold text-[10pt] text-black">
                          {creatorName || 'Nguyễn Minh Trí'}
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
            Mẹo in chuẩn 53 Lớp (A4 Đứng): Chọn <strong>Khổ giấy: A4</strong>, <strong>Hướng: Dọc (Portrait)</strong>, tỷ lệ{' '}
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
              disabled={isExportingExcel || classItems.length === 0}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Xuất Excel ({classItems.length} Lớp)</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={classItems.length === 0}
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

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
