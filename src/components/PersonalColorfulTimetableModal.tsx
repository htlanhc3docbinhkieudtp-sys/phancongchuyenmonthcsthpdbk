import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ClassGroup,
  Department,
  SchoolConfig,
  SchoolTimetable,
  Teacher
} from '../types';
import {
  DAYS_OF_WEEK,
  getUnifiedSubjectName,
  getWeekDateRange
} from '../utils/timetableHelper';
import {
  GradeCampusFilter,
  GradeSessionExportMode,
  buildNormalizedSlotMap,
  resolveCleanTeacherName
} from '../utils/timetableGradeA4ExportHelper';
import {
  buildClassPrintItems,
  buildClassScheduleRows
} from '../utils/timetableClassA4ExportHelper';
import {
  DAY_RAINBOW_THEMES,
  PersonalColorIntensity,
  PersonalPdfTargetType,
  buildClassSubjectSummary,
  buildTeacherPrintItems,
  buildTeacherScheduleRows,
  getSubjectColorTheme
} from '../utils/personalColorfulTimetableHelper';
import {
  Building2,
  CheckCircle2,
  GraduationCap,
  Info,
  Lock,
  Palette,
  Printer,
  Sparkles,
  UserCheck,
  Users2,
  X
} from 'lucide-react';

interface PersonalColorfulTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SchoolConfig;
  classes: ClassGroup[];
  teachers: Teacher[];
  departments: Department[];
  timetable: SchoolTimetable;
  currentWeek: number;
  initialTargetType?: PersonalPdfTargetType;
  initialCampus?: GradeCampusFilter;
  initialGrade?: string;
  initialClassId?: string;
  initialTeacherId?: string;
  initialDepartmentId?: string;
  isAdmin?: boolean;
}

const A4_PORTRAIT_TARGET_HEIGHT_PX = 1066;
const A4_PORTRAIT_MAX_SAFE_HEIGHT_PX = 1072;

interface SheetMetric {
  padY: number;
  scale: number;
}

export const PersonalColorfulTimetableModal: React.FC<PersonalColorfulTimetableModalProps> = ({
  isOpen,
  onClose,
  config,
  classes,
  teachers,
  departments,
  timetable,
  currentWeek,
  initialTargetType = 'TEACHER',
  initialCampus = 'ALL',
  initialGrade = 'ALL',
  initialClassId = 'ALL',
  initialTeacherId = 'ALL',
  initialDepartmentId = 'ALL',
  isAdmin = false
}) => {
  const [targetType, setTargetType] = useState<PersonalPdfTargetType>(initialTargetType);
  const [selectedCampus, setSelectedCampus] = useState<GradeCampusFilter>(initialCampus);
  const [selectedGrade, setSelectedGrade] = useState<string>(initialGrade);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>(initialDepartmentId);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(initialTeacherId);
  const [onlyActiveTeachers, setOnlyActiveTeachers] = useState<boolean>(true);
  const [sessionMode, setSessionMode] = useState<GradeSessionExportMode>('SMART_A4');
  const [colorIntensity, setColorIntensity] = useState<PersonalColorIntensity>('RAINBOW');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [showSecondaryDetail, setShowSecondaryDetail] = useState<boolean>(true);
  const [showSummaryLegend, setShowSummaryLegend] = useState<boolean>(true);
  const [locationName, setLocationName] = useState<string>('Đốc Binh Kiều');
  const [sheetMetrics, setSheetMetrics] = useState<Record<string, SheetMetric>>({});

  const headerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const theadRefs = useRef<Record<string, HTMLTableSectionElement | null>>({});
  const tbodyRefs = useRef<Record<string, HTMLTableSectionElement | null>>({});
  const footerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (isOpen) {
      setTargetType(initialTargetType);
      setSelectedCampus(initialCampus);
      setSelectedGrade(initialGrade);
      setSelectedClassId(initialClassId);
      setSelectedDepartmentId(initialDepartmentId);
      setSelectedTeacherId(initialTeacherId);
    }
  }, [
    isOpen,
    initialTargetType,
    initialCampus,
    initialGrade,
    initialClassId,
    initialDepartmentId,
    initialTeacherId
  ]);

  const weekInfo = useMemo(() => {
    return getWeekDateRange(currentWeek, config.academicYear);
  }, [currentWeek, config.academicYear]);

  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);
  const classMap = useMemo(() => new Map(classes.map(c => [c.id, c])), [classes]);
  const { slotMap } = useMemo(() => buildNormalizedSlotMap(timetable), [timetable]);

  const availableClassDropdownItems = useMemo(() => {
    return buildClassPrintItems(classes, teachers, slotMap, selectedCampus, selectedGrade, 'ALL');
  }, [classes, teachers, slotMap, selectedCampus, selectedGrade]);

  const classItems = useMemo(() => {
    if (targetType !== 'CLASS') return [];
    return buildClassPrintItems(
      classes,
      teachers,
      slotMap,
      selectedCampus,
      selectedGrade,
      selectedClassId
    );
  }, [targetType, classes, teachers, slotMap, selectedCampus, selectedGrade, selectedClassId]);

  const availableTeacherDropdownItems = useMemo(() => {
    return buildTeacherPrintItems(teachers, departments, classes, timetable, {
      campusFilter: selectedCampus,
      departmentFilter: selectedDepartmentId,
      teacherIdFilter: 'ALL',
      onlyActiveTeachers
    });
  }, [teachers, departments, classes, timetable, selectedCampus, selectedDepartmentId, onlyActiveTeachers]);

  const teacherItems = useMemo(() => {
    if (targetType !== 'TEACHER') return [];
    return buildTeacherPrintItems(teachers, departments, classes, timetable, {
      campusFilter: selectedCampus,
      departmentFilter: selectedDepartmentId,
      teacherIdFilter: selectedTeacherId,
      onlyActiveTeachers
    });
  }, [
    targetType,
    teachers,
    departments,
    classes,
    timetable,
    selectedCampus,
    selectedDepartmentId,
    selectedTeacherId,
    onlyActiveTeachers
  ]);

  const activeItemKeys = useMemo(() => {
    return targetType === 'TEACHER'
      ? teacherItems.map(t => t.teacher.id)
      : classItems.map(c => c.classGroup.id);
  }, [targetType, teacherItems, classItems]);

  useLayoutEffect(() => {
    if (!isOpen || !isAdmin || activeItemKeys.length === 0) return;

    const measureAll = () => {
      const nextMetrics: Record<string, SheetMetric> = {};

      activeItemKeys.forEach(itemKey => {
        const headerEl = headerRefs.current[itemKey];
        const theadEl = theadRefs.current[itemKey];
        const tbodyEl = tbodyRefs.current[itemKey];
        const footerEl = footerRefs.current[itemKey];
        if (!headerEl || !theadEl || !tbodyEl || !footerEl) return;

        const rowCount = Math.max(1, tbodyEl.querySelectorAll('tr').length);
        const appliedPadY = Number(tbodyEl.dataset.appliedPadY || '4');
        const extraPadAlreadyApplied = Math.max(0, (appliedPadY - 4) * 2 * rowCount);

        const headerH = headerEl.offsetHeight;
        const theadH = theadEl.offsetHeight;
        const tbodyH = tbodyEl.offsetHeight;
        const footerH = footerEl.offsetHeight;

        const chromeOverhead = 14;
        const baseTbodyH = Math.max(60, tbodyH - extraPadAlreadyApplied);
        const baseTotalH = headerH + theadH + baseTbodyH + footerH + chromeOverhead;

        let nextPadY = 4;
        let nextScale = 1;

        if (baseTotalH < A4_PORTRAIT_TARGET_HEIGHT_PX) {
          const freePx = A4_PORTRAIT_TARGET_HEIGHT_PX - baseTotalH;
          const rawPadY = 4 + Math.max(0, freePx - 12) / (2 * rowCount);
          nextPadY = Math.min(44, Math.max(4, Math.floor(rawPadY * 10) / 10));

          if (Math.abs(appliedPadY - nextPadY) <= 0.3 && appliedPadY >= 4) {
            nextPadY = appliedPadY;
          }

          const actualTotalH = headerH + theadH + tbodyH + footerH + chromeOverhead;
          if (Math.abs(appliedPadY - nextPadY) < 0.05 && actualTotalH > A4_PORTRAIT_MAX_SAFE_HEIGHT_PX) {
            nextScale = Math.max(
              0.68,
              Number((A4_PORTRAIT_MAX_SAFE_HEIGHT_PX / actualTotalH).toFixed(3))
            );
          }
        } else {
          nextPadY = 4;
          const rawScale = A4_PORTRAIT_MAX_SAFE_HEIGHT_PX / baseTotalH;
          nextScale = Math.max(0.68, Number(rawScale.toFixed(3)));
        }

        nextMetrics[itemKey] = { padY: nextPadY, scale: nextScale };
      });

      setSheetMetrics(prev => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(nextMetrics);
        if (
          prevKeys.length === nextKeys.length &&
          nextKeys.every(
            k =>
              prev[k] &&
              Math.abs(prev[k].padY - nextMetrics[k].padY) < 0.15 &&
              Math.abs(prev[k].scale - nextMetrics[k].scale) < 0.003
          )
        ) {
          return prev;
        }
        return nextMetrics;
      });
    };

    const rafId = requestAnimationFrame(measureAll);
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(measureAll).catch(() => {});
    }
    return () => cancelAnimationFrame(rafId);
  }, [
    isOpen,
    isAdmin,
    activeItemKeys,
    sessionMode,
    colorIntensity,
    fontSize,
    showSecondaryDetail,
    showSummaryLegend,
    locationName,
    currentWeek,
    sheetMetrics
  ]);

  if (!isOpen || !isAdmin) return null;

  const totalSheets = activeItemKeys.length;
  const handlePrint = () => {
    if (!isAdmin || totalSheets === 0) return;
    window.print();
  };

  const today = new Date();
  const dateString = `${locationName}, ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;
  const isRainbow = colorIntensity === 'RAINBOW';

  const modalContent = (
    <div className="personal-colorful-print-root fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:m-0 print:static print:block print:bg-white print:overflow-visible">
      <style>{`
        .personal-colorful-table tbody td {
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
          .personal-colorful-print-root,
          .personal-colorful-print-root * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 4.5mm 5mm;
          }
          .personal-colorful-print-root,
          .personal-colorful-print-dialog,
          .personal-colorful-print-scroll {
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
          .personal-colorful-print-scroll > * {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }
          .personal-colorful-print-sheet {
            width: 200mm !important;
            height: 285mm !important;
            max-height: 285mm !important;
            overflow: hidden !important;
            margin: 0 auto !important;
            padding: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .personal-sheet-page-break {
            page-break-after: always !important;
            break-after: page !important;
          }
          .personal-a4-inner {
            width: calc(100% / var(--a4-fit-scale, 1)) !important;
            min-height: calc(284mm / var(--a4-fit-scale, 1)) !important;
            transform: scale(var(--a4-fit-scale, 1));
            transform-origin: top left;
          }
        }
      `}</style>

      <div className="personal-colorful-print-dialog bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-[98vw] max-h-[96vh] flex flex-col overflow-hidden print:block print:w-full print:max-w-none print:max-h-none print:border-none print:shadow-none print:rounded-none print:overflow-visible">
        {/* Top Modal Header - Hidden on Print */}
        <div
          className="text-white px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden"
          style={{
            background:
              'linear-gradient(120deg, #1E1B4B 0%, #312E81 35%, #6D28D9 70%, #BE185D 100%)'
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white/15 border border-white/25 rounded-xl text-amber-300 shrink-0">
              <Palette className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold tracking-tight uppercase">
                  Xuất PDF Màu Tươi Sáng Gửi Cá Nhân (Lớp & Giáo Viên)
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-400/20 text-amber-200 border border-amber-300/35 whitespace-nowrap">
                  <Lock className="w-3 h-3" />
                  <span>Chỉ Quản trị viên</span>
                </span>
              </div>
              <p className="text-xs text-indigo-100 mt-0.5">
                Phối màu cầu vồng tươi sáng theo từng môn, từng lớp & từng thứ trong tuần • Chuẩn 1 trang A4 đứng để gửi Zalo / Email
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              disabled={totalSheets === 0}
              className="px-4 py-2 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-500 hover:to-rose-600 disabled:opacity-50 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Lưu file PDF rực rỡ sắc màu hoặc in trực tiếp trên khổ A4 đứng"
            >
              <Printer className="w-4 h-4" />
              <span>Xuất / Lưu PDF ({totalSheets} Trang A4)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
              title="Đóng hộp thoại"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Appearance Controls Bar - Hidden on Print */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 space-y-2.5 shrink-0 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Segmented Mode Toggle: TEACHER vs CLASS */}
            <div className="inline-flex rounded-xl bg-slate-200/80 p-1 border border-slate-300">
              <button
                type="button"
                onClick={() => setTargetType('TEACHER')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  targetType === 'TEACHER'
                    ? 'bg-gradient-to-r from-violet-600 to-rose-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>TKB Giáo Viên ({availableTeacherDropdownItems.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setTargetType('CLASS')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  targetType === 'CLASS'
                    ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <Users2 className="w-3.5 h-3.5" />
                <span>TKB Từng Lớp ({availableClassDropdownItems.length})</span>
              </button>
            </div>

            {/* Color Palette Style Selector */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1 whitespace-nowrap">
                <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                <span>Bảng màu:</span>
              </span>
              <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setColorIntensity('RAINBOW')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all whitespace-nowrap ${
                    colorIntensity === 'RAINBOW'
                      ? 'bg-gradient-to-r from-sky-500 via-fuchsia-500 to-amber-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cầu vồng Rực rỡ (Nhiều màu)
                </button>
                <button
                  type="button"
                  onClick={() => setColorIntensity('PASTEL')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all whitespace-nowrap ${
                    colorIntensity === 'PASTEL'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pastel Tươi Sáng
                </button>
              </div>
            </div>
          </div>

          {/* Entity Filters */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700 flex items-center gap-1 whitespace-nowrap">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Điểm:</span>
              </span>
              <div className="inline-flex flex-wrap rounded-xl bg-white p-1 border border-slate-200">
                {[
                  { id: 'ALL' as const, label: 'Tất cả' },
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
                      setSelectedClassId('ALL');
                      setSelectedTeacherId('ALL');
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

            {targetType === 'TEACHER' ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700 whitespace-nowrap">Tổ CM:</span>
                  <select
                    value={selectedDepartmentId}
                    onChange={e => {
                      setSelectedDepartmentId(e.target.value);
                      setSelectedTeacherId('ALL');
                    }}
                    className="h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-violet-500 focus:outline-hidden"
                  >
                    <option value="ALL">Tất cả các tổ</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700 whitespace-nowrap">Giáo viên:</span>
                  <select
                    value={selectedTeacherId}
                    onChange={e => setSelectedTeacherId(e.target.value)}
                    className="h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-violet-500 focus:outline-hidden min-w-[210px]"
                  >
                    <option value="ALL">
                      Tất cả ({availableTeacherDropdownItems.length} giáo viên)
                    </option>
                    {availableTeacherDropdownItems.map(item => (
                      <option key={item.teacher.id} value={item.teacher.id}>
                        {item.cleanName} ({item.totalPeriods}t · {item.campusShort})
                      </option>
                    ))}
                  </select>
                </div>

                <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 cursor-pointer font-bold text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={onlyActiveTeachers}
                    onChange={e => setOnlyActiveTeachers(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-violet-600 cursor-pointer"
                  />
                  <span>Chỉ GV có tiết tuần {currentWeek}</span>
                </label>
              </>
            ) : (
              <>
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
                    className="h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
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

                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700 whitespace-nowrap">Lớp:</span>
                  <select
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                    className="h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-hidden min-w-[165px]"
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
              </>
            )}
          </div>

          {/* Display Options Row */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs pt-2 border-t border-slate-200/80">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 whitespace-nowrap">Buổi hiển thị:</span>
                <select
                  value={sessionMode}
                  onChange={e => setSessionMode(e.target.value as GradeSessionExportMode)}
                  className="h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="SMART_A4">Gọn đẹp A4 (Ca chính + Tiết trái buổi có dạy)</option>
                  <option value="ALL">Đầy đủ cả 2 buổi (Sáng & Chiều - 10 tiết)</option>
                  <option value="MAIN_ONLY">Chỉ 1 ca chính (5 tiết)</option>
                  <option value="SANG">Chỉ Buổi Sáng (Tiết 1 - 5)</option>
                  <option value="CHIEU">Chỉ Buổi Chiều (Tiết 1 - 5)</option>
                </select>
              </div>

              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 cursor-pointer font-bold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={showSecondaryDetail}
                  onChange={e => setShowSecondaryDetail(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                />
                <span>{targetType === 'TEACHER' ? 'Hiện tên Môn học' : 'Hiện tên Giáo viên'}</span>
              </label>

              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 cursor-pointer font-bold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={showSummaryLegend}
                  onChange={e => setShowSummaryLegend(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                />
                <span>Hiện bảng màu tổng hợp môn/lớp</span>
              </label>

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 whitespace-nowrap">Cỡ chữ:</span>
                <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200 text-[11px]">
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
                        fontSize === f.id ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-slate-700">
              <span className="font-bold text-indigo-900 flex items-center gap-1 tabular-nums whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{totalSheets} trang A4 đứng</span>
              </span>
              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-2 py-0.5">
                <span className="text-[11px] font-bold text-slate-600">Địa danh:</span>
                <input
                  type="text"
                  value={locationName}
                  onChange={e => setLocationName(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-900 w-24 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Printable A4 Pages Container */}
        <div className="personal-colorful-print-scroll flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/80 space-y-6 print:p-0 print:m-0 print:bg-white print:overflow-visible print:space-y-0">
          {totalSheets === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-500 max-w-md mx-auto shadow-sm print:hidden">
              <Info className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="font-bold text-slate-800">Không có dữ liệu phù hợp với bộ lọc</p>
              <p className="text-xs text-slate-500 mt-1">
                Vui lòng chọn lại điểm trường, tổ chuyên môn, khối hoặc bật hiển thị tất cả giáo viên.
              </p>
            </div>
          ) : targetType === 'TEACHER' ? (
            /* ================= TEACHER COLORFUL A4 SHEETS ================= */
            teacherItems.map((item, idx) => {
              const t = item.teacher;
              const rows = buildTeacherScheduleRows(item, sessionMode);
              const metric = sheetMetrics[t.id] ?? { padY: 8, scale: 1 };
              const fitScale = metric.scale;
              const rowPadY = metric.padY;

              const fontSizeClass =
                fontSize === 'sm'
                  ? 'text-[8.5pt] leading-[1.15]'
                  : fontSize === 'md'
                  ? rows.length <= 7
                    ? 'text-[9.8pt] leading-[1.2]'
                    : 'text-[9pt] leading-[1.16]'
                  : rows.length <= 7
                  ? 'text-[10.8pt] leading-[1.22]'
                  : 'text-[9.6pt] leading-[1.16]';

              const hasPageBreakAfter = idx < teacherItems.length - 1;

              return (
                <div
                  key={t.id}
                  className={`bg-white text-slate-900 p-[4.5mm] rounded-xl shadow-md border border-slate-300 mx-auto w-full max-w-[210mm] personal-colorful-print-sheet print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:rounded-none ${
                    hasPageBreakAfter ? 'personal-sheet-page-break' : ''
                  }`}
                  style={{
                    fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
                    fontSynthesis: 'none'
                  }}
                >
                  {/* Screen-only page badge */}
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pb-2 mb-2 border-b border-slate-200 print:hidden">
                    <span className="tabular-nums">
                      Trang {idx + 1}/{teacherItems.length} · {item.cleanName} ({t.code}) · {item.departmentName}
                    </span>
                    <span className="text-violet-700 font-bold tabular-nums">
                      Khổ A4 Đứng · {fitScale < 1 ? `Tự co ${Math.round(fitScale * 100)}%` : `Phủ kín A4 (${rows.length} tiết/ngày)`}
                    </span>
                  </div>

                  <div
                    className="personal-a4-inner flex flex-col"
                    style={{
                      ['--a4-fit-scale' as string]: fitScale,
                      minHeight: fitScale === 1 ? '284mm' : undefined,
                      fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
                      fontSynthesis: 'none',
                      letterSpacing: 'normal'
                    }}
                  >
                    {/* Header Banner + Colorful Stats */}
                    <div
                      ref={el => {
                        headerRefs.current[t.id] = el;
                      }}
                      className="mb-2"
                    >
                      {/* Multi-color Top Accent Bar */}
                      <div
                        className="h-[4px] w-full rounded-t-lg"
                        style={{
                          background:
                            'linear-gradient(90deg, #0EA5E9 0%, #10B981 20%, #8B5CF6 40%, #F59E0B 60%, #EC4899 80%, #14B8A6 100%)'
                        }}
                      />

                      <div
                        className="rounded-b-xl px-4 py-3 text-white flex items-center justify-between gap-3"
                        style={{
                          background: isRainbow
                            ? 'linear-gradient(125deg, #2563EB 0%, #7C3AED 45%, #DB2777 82%, #F97316 100%)'
                            : 'linear-gradient(125deg, #0284C7 0%, #6366F1 55%, #EC4899 100%)'
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-full bg-white p-1 flex items-center justify-center shrink-0 shadow-xs">
                            <img
                              src="/logo.png"
                              alt="Logo trường"
                              className="w-full h-full object-contain rounded-full"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[8pt] font-bold uppercase tracking-wider text-amber-200">
                              {config.schoolName || 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU'}
                            </div>
                            <h1 className="text-[14pt] font-extrabold leading-tight text-white mt-0.5">
                              THỜI KHÓA BIỂU GIÁO VIÊN: {item.cleanName.toUpperCase()}
                            </h1>
                            <div className="text-[8.8pt] font-semibold text-white/95 mt-0.5">
                              {item.departmentName} · {item.campusName}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 bg-white/18 border border-white/30 rounded-xl px-3 py-1.5">
                          <div className="text-[10.5pt] font-extrabold text-amber-200 tabular-nums">
                            TUẦN {currentWeek}
                          </div>
                          <div className="text-[8pt] font-bold text-white tabular-nums">
                            {weekInfo.startDateShort} – {weekInfo.endDateShort}
                          </div>
                          <div className="text-[7.5pt] font-semibold text-white/90 tabular-nums">
                            Năm học {config.academicYear || '2026 - 2027'}
                          </div>
                        </div>
                      </div>

                      {/* 4 Colorful Info Tiles */}
                      <div className="grid grid-cols-4 gap-2 mt-2 text-left">
                        <div
                          className="rounded-lg px-2.5 py-1.5 border"
                          style={{ backgroundColor: '#EFF6FF', borderColor: '#93C5FD' }}
                        >
                          <div className="text-[7.5pt] font-bold uppercase text-blue-700">
                            Mã GV & Định mức
                          </div>
                          <div className="text-[9.5pt] font-extrabold text-blue-950 tabular-nums">
                            {t.code} · {t.baseStandardPeriods}t/tuần
                          </div>
                        </div>

                        <div
                          className="rounded-lg px-2.5 py-1.5 border"
                          style={{ backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' }}
                        >
                          <div className="text-[7.5pt] font-bold uppercase text-emerald-700">
                            Tiết giảng dạy TKB
                          </div>
                          <div className="text-[9.5pt] font-extrabold text-emerald-950 tabular-nums">
                            {item.totalPeriods} tiết ({item.sessionCount} buổi)
                          </div>
                        </div>

                        <div
                          className="rounded-lg px-2.5 py-1.5 border"
                          style={{ backgroundColor: '#FFF7ED', borderColor: '#FDBA74' }}
                        >
                          <div className="text-[7.5pt] font-bold uppercase text-orange-700">
                            Trung bình / Buổi
                          </div>
                          <div className="text-[9.5pt] font-extrabold text-orange-950 tabular-nums">
                            {item.avgPerSession} tiết/buổi
                          </div>
                        </div>

                        <div
                          className="rounded-lg px-2.5 py-1.5 border"
                          style={{ backgroundColor: '#FDF2F8', borderColor: '#F9A8D4' }}
                        >
                          <div className="text-[7.5pt] font-bold uppercase text-pink-700">
                            {item.homeroomClassName ? 'Chủ nhiệm & Ngày nghỉ' : 'Ngày nghỉ trọn ngày'}
                          </div>
                          <div className="text-[9pt] font-extrabold text-pink-950 truncate">
                            {item.homeroomClassName ? `CN ${item.homeroomClassName} · ` : ''}
                            {item.freeDays.length > 0 ? item.freeDays.join(', ') : 'Dạy 6 ngày'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Teacher Weekly Grid */}
                    <div className="my-0.5">
                      <table
                        className={`w-full table-fixed border-collapse rounded-xl overflow-hidden text-center ${fontSizeClass} personal-colorful-table`}
                        style={{
                          ['--row-pad-y' as string]: `${rowPadY}px`,
                          border: '1.5px solid #CBD5E1',
                          fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
                          fontSynthesis: 'none',
                          letterSpacing: 'normal'
                        }}
                      >
                        <colgroup>
                          <col style={{ width: '8%' }} />
                          <col style={{ width: '7%' }} />
                          {DAYS_OF_WEEK.map(d => (
                            <col key={`tcol-${d.value}`} style={{ width: '14.16%' }} />
                          ))}
                        </colgroup>

                        <thead
                          ref={el => {
                            theadRefs.current[t.id] = el;
                          }}
                        >
                          <tr>
                            <th
                              className="px-1 py-2 text-center font-extrabold text-white uppercase border border-white/40"
                              style={{ background: '#0F172A' }}
                            >
                              BUỔI
                            </th>
                            <th
                              className="px-1 py-2 text-center font-extrabold text-white uppercase border border-white/40"
                              style={{ background: '#334155' }}
                            >
                              TIẾT
                            </th>
                            {DAYS_OF_WEEK.map(d => {
                              const dayTheme = DAY_RAINBOW_THEMES[d.value];
                              return (
                                <th
                                  key={d.value}
                                  className="px-1 py-2 text-center font-extrabold uppercase border border-white/40"
                                  style={{
                                    background: isRainbow
                                      ? dayTheme.headerGradient
                                      : dayTheme.headerBg,
                                    color: dayTheme.headerText
                                  }}
                                >
                                  {d.label}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>

                        <tbody
                          ref={el => {
                            tbodyRefs.current[t.id] = el;
                          }}
                          data-applied-pad-y={rowPadY}
                        >
                          {rows.map(rowMeta => (
                            <tr
                              key={`${rowMeta.session}_${rowMeta.period}`}
                              style={{
                                borderBottom: rowMeta.isLastRowOfSession
                                  ? '2px solid #94A3B8'
                                  : '1px solid #E2E8F0'
                              }}
                            >
                              {rowMeta.showSessionCell && (
                                <td
                                  rowSpan={rowMeta.sessionRowSpan}
                                  className="px-1 font-extrabold text-center align-middle uppercase border-r border-slate-300"
                                  style={{
                                    background:
                                      rowMeta.session === 'SANG'
                                        ? 'linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)'
                                        : 'linear-gradient(180deg, #EDE9FE 0%, #DDD6FE 100%)',
                                    color: rowMeta.session === 'SANG' ? '#B45309' : '#5B21B6'
                                  }}
                                >
                                  {rowMeta.sessionLabel}
                                </td>
                              )}

                              <td
                                className="px-1 font-extrabold text-center align-middle tabular-nums border-r border-slate-300"
                                style={{
                                  backgroundColor:
                                    rowMeta.session === 'SANG' ? '#FFFBEB' : '#F5F3FF',
                                  color: rowMeta.session === 'SANG' ? '#92400E' : '#4C1D95'
                                }}
                              >
                                Tiết {rowMeta.period}
                              </td>

                              {DAYS_OF_WEEK.map(day => {
                                const dayTheme = DAY_RAINBOW_THEMES[day.value];
                                const daySlots =
                                  item.slotByDaySessionPeriod.get(
                                    `${day.value}_${rowMeta.session}_${rowMeta.period}`
                                  ) || [];

                                if (daySlots.length === 0) {
                                  return (
                                    <td
                                      key={day.value}
                                      className="px-1 text-center align-middle border-r border-slate-200 last:border-r-0"
                                      style={{ backgroundColor: dayTheme.colTint }}
                                    >
                                      <span className="text-slate-300 font-normal">·</span>
                                    </td>
                                  );
                                }

                                const isCollision = daySlots.length > 1;
                                const primarySlot = daySlots[0];
                                const subName = getUnifiedSubjectName(primarySlot);
                                const targetCls = classMap.get(primarySlot.classId);
                                const clsName = targetCls?.name || primarySlot.className;
                                const subTheme = getSubjectColorTheme(primarySlot.subjectId, subName);
                                const cellTheme = isRainbow
                                  ? getSubjectColorTheme(
                                      primarySlot.subjectId,
                                      subName
                                    )
                                  : subTheme;
                                // For rainbow variety across classes, blend class theme on card + subject badge
                                const classBadgeTheme =
                                  item.classBreakdown.find(b => b.className === clsName)?.theme ||
                                  cellTheme;
                                const cardTheme = isRainbow ? classBadgeTheme : subTheme;

                                return (
                                  <td
                                    key={day.value}
                                    className="px-1 text-center align-middle border-r border-slate-200 last:border-r-0"
                                    style={{
                                      backgroundColor: isCollision
                                        ? '#FFE4E6'
                                        : isRainbow
                                        ? cardTheme.bg
                                        : cardTheme.bgSoft
                                    }}
                                  >
                                    <div className="space-y-0.5">
                                      {daySlots.map(s => {
                                        const sSub = getUnifiedSubjectName(s);
                                        const sCls = classMap.get(s.classId)?.name || s.className;
                                        const sSubTheme = getSubjectColorTheme(s.subjectId, sSub);
                                        const sCardTheme = isRainbow
                                          ? item.classBreakdown.find(b => b.className === sCls)
                                              ?.theme || sSubTheme
                                          : sSubTheme;

                                        return (
                                          <div
                                            key={s.id}
                                            className="rounded-md px-1.5 py-0.5 mx-auto"
                                            style={{
                                              borderTop: `2.5px solid ${sCardTheme.accent}`,
                                              backgroundColor: '#FFFFFFB8'
                                            }}
                                          >
                                            <div
                                              className="font-extrabold tracking-tight"
                                              style={{ color: sCardTheme.titleColor }}
                                            >
                                              {sCls}
                                            </div>
                                            {showSecondaryDetail && (
                                              <div
                                                className="text-[82%] font-bold mt-0.5 rounded px-1 py-0.2 inline-block max-w-full truncate"
                                                style={{
                                                  backgroundColor: sSubTheme.pillBg,
                                                  color: sSubTheme.pillText
                                                }}
                                              >
                                                {sSub}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                      {isCollision && (
                                        <div className="text-[72%] font-extrabold text-rose-700 uppercase">
                                          Trùng {daySlots.length} lớp
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Colorful Class/Subject Legend + Encouraging Footer */}
                    <div
                      ref={el => {
                        footerRefs.current[t.id] = el;
                      }}
                      className="mt-auto pt-2 space-y-2 print-avoid-break"
                    >
                      {showSummaryLegend && item.classBreakdown.length > 0 && (
                        <div
                          className="rounded-xl p-2 border"
                          style={{
                            backgroundColor: '#F8FAFC',
                            borderColor: '#CBD5E1'
                          }}
                        >
                          <div className="text-[7.5pt] font-extrabold uppercase text-slate-600 mb-1">
                            Phân bố lớp & môn giảng dạy Tuần {currentWeek}:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {item.classBreakdown.map(entry => (
                              <span
                                key={`${entry.className}_${entry.subjectName}`}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[8pt] font-bold border"
                                style={{
                                  backgroundColor: entry.theme.bg,
                                  borderColor: entry.theme.border,
                                  color: entry.theme.subColor
                                }}
                              >
                                <span
                                  className="font-extrabold"
                                  style={{ color: entry.theme.titleColor }}
                                >
                                  {entry.className}
                                </span>
                                <span>· {entry.subjectName}</span>
                                <span
                                  className="rounded px-1 font-extrabold tabular-nums"
                                  style={{
                                    backgroundColor: entry.theme.pillBg,
                                    color: entry.theme.pillText
                                  }}
                                >
                                  {entry.count}t
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div
                        className="flex items-center justify-between gap-3 pt-1.5 border-t-2 text-[8.3pt]"
                        style={{ borderColor: '#E2E8F0' }}
                      >
                        <div className="font-semibold text-indigo-800 italic">
                          Kính chúc Quý Thầy/Cô một tuần giảng dạy thật nhiều sức khỏe, niềm vui và hiệu quả!
                        </div>
                        <div className="text-right font-bold text-slate-700 shrink-0">
                          <div>{dateString}</div>
                          <div className="text-[8pt] text-violet-700 uppercase">
                            BGH {config.schoolName || 'THCS & THPT ĐỐC BINH KIỀU'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            /* ================= CLASS COLORFUL A4 SHEETS ================= */
            classItems.map((item, idx) => {
              const cls = item.classGroup;
              const classRows = buildClassScheduleRows(item, slotMap, sessionMode);
              const classSummary = buildClassSubjectSummary(cls, slotMap);
              const metric = sheetMetrics[cls.id] ?? { padY: 8, scale: 1 };
              const fitScale = metric.scale;
              const rowPadY = metric.padY;

              const fontSizeClass =
                fontSize === 'sm'
                  ? 'text-[8.5pt] leading-[1.15]'
                  : fontSize === 'md'
                  ? classRows.length <= 7
                    ? 'text-[9.8pt] leading-[1.2]'
                    : 'text-[9pt] leading-[1.16]'
                  : classRows.length <= 7
                  ? 'text-[10.8pt] leading-[1.22]'
                  : 'text-[9.6pt] leading-[1.16]';

              const hasPageBreakAfter = idx < classItems.length - 1;

              return (
                <div
                  key={cls.id}
                  className={`bg-white text-slate-900 p-[4.5mm] rounded-xl shadow-md border border-slate-300 mx-auto w-full max-w-[210mm] personal-colorful-print-sheet print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:rounded-none ${
                    hasPageBreakAfter ? 'personal-sheet-page-break' : ''
                  }`}
                  style={{
                    fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
                    fontSynthesis: 'none'
                  }}
                >
                  {/* Screen-only page badge */}
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pb-2 mb-2 border-b border-slate-200 print:hidden">
                    <span className="tabular-nums">
                      Trang {idx + 1}/{classItems.length} · Lớp {cls.name} ({item.campusShort}) · GVCN: {item.homeroomName}
                    </span>
                    <span className="text-sky-700 font-bold tabular-nums">
                      Khổ A4 Đứng · {fitScale < 1 ? `Tự co ${Math.round(fitScale * 100)}%` : `Phủ kín A4 (${classRows.length} tiết/ngày)`}
                    </span>
                  </div>

                  <div
                    className="personal-a4-inner flex flex-col"
                    style={{
                      ['--a4-fit-scale' as string]: fitScale,
                      minHeight: fitScale === 1 ? '284mm' : undefined,
                      fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
                      fontSynthesis: 'none',
                      letterSpacing: 'normal'
                    }}
                  >
                    {/* Header Banner + Colorful Info Tiles */}
                    <div
                      ref={el => {
                        headerRefs.current[cls.id] = el;
                      }}
                      className="mb-2"
                    >
                      <div
                        className="h-[4px] w-full rounded-t-lg"
                        style={{
                          background:
                            'linear-gradient(90deg, #F43F5E 0%, #F59E0B 20%, #10B981 40%, #0EA5E9 60%, #8B5CF6 80%, #EC4899 100%)'
                        }}
                      />

                      <div
                        className="rounded-b-xl px-4 py-3 text-white flex items-center justify-between gap-3"
                        style={{
                          background: isRainbow
                            ? 'linear-gradient(125deg, #0284C7 0%, #4F46E5 42%, #C026D3 78%, #F43F5E 100%)'
                            : 'linear-gradient(125deg, #0EA5E9 0%, #6366F1 55%, #EC4899 100%)'
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-full bg-white p-1 flex items-center justify-center shrink-0 shadow-xs">
                            <img
                              src="/logo.png"
                              alt="Logo trường"
                              className="w-full h-full object-contain rounded-full"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[8pt] font-bold uppercase tracking-wider text-amber-200">
                              {config.schoolName || 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU'}
                            </div>
                            <h1 className="text-[14.5pt] font-extrabold leading-tight text-white mt-0.5">
                              THỜI KHÓA BIỂU LỚP {cls.name} (KHỐI {cls.grade})
                            </h1>
                            <div className="text-[8.8pt] font-semibold text-white/95 mt-0.5">
                              {item.campusName}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 bg-white/18 border border-white/30 rounded-xl px-3 py-1.5">
                          <div className="text-[10.5pt] font-extrabold text-amber-200 tabular-nums">
                            TUẦN {currentWeek}
                          </div>
                          <div className="text-[8pt] font-bold text-white tabular-nums">
                            {weekInfo.startDateShort} – {weekInfo.endDateShort}
                          </div>
                          <div className="text-[7.5pt] font-semibold text-white/90 tabular-nums">
                            Năm học {config.academicYear || '2026 - 2027'}
                          </div>
                        </div>
                      </div>

                      {/* 4 Colorful Class Info Tiles */}
                      <div className="grid grid-cols-4 gap-2 mt-2 text-left">
                        <div
                          className="rounded-lg px-2.5 py-1.5 border"
                          style={{ backgroundColor: '#FDF2F8', borderColor: '#F9A8D4' }}
                        >
                          <div className="text-[7.5pt] font-bold uppercase text-pink-700">
                            Giáo viên chủ nhiệm
                          </div>
                          <div className="text-[9.5pt] font-extrabold text-pink-950 truncate">
                            {item.homeroomName}
                          </div>
                        </div>

                        <div
                          className="rounded-lg px-2.5 py-1.5 border"
                          style={{ backgroundColor: '#EFF6FF', borderColor: '#93C5FD' }}
                        >
                          <div className="text-[7.5pt] font-bold uppercase text-blue-700">
                            Ca học chính
                          </div>
                          <div className="text-[9.5pt] font-extrabold text-blue-950">
                            Buổi {item.primarySession === 'SANG' ? 'Sáng' : 'Chiều'} ({item.campusShort})
                          </div>
                        </div>

                        <div
                          className="rounded-lg px-2.5 py-1.5 border"
                          style={{ backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' }}
                        >
                          <div className="text-[7.5pt] font-bold uppercase text-emerald-700">
                            Tổng tiết tuần
                          </div>
                          <div className="text-[9.5pt] font-extrabold text-emerald-950 tabular-nums">
                            {classSummary.totalPeriods} tiết / tuần
                          </div>
                        </div>

                        <div
                          className="rounded-lg px-2.5 py-1.5 border"
                          style={{ backgroundColor: '#FFFBEB', borderColor: '#FCD34D' }}
                        >
                          <div className="text-[7.5pt] font-bold uppercase text-amber-700">
                            Ngày áp dụng
                          </div>
                          <div className="text-[9.5pt] font-extrabold text-amber-950 tabular-nums">
                            Thứ Hai, {weekInfo.startDateShort}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Class Weekly Grid */}
                    <div className="my-0.5">
                      <table
                        className={`w-full table-fixed border-collapse rounded-xl overflow-hidden text-center ${fontSizeClass} personal-colorful-table`}
                        style={{
                          ['--row-pad-y' as string]: `${rowPadY}px`,
                          border: '1.5px solid #CBD5E1',
                          fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
                          fontSynthesis: 'none',
                          letterSpacing: 'normal'
                        }}
                      >
                        <colgroup>
                          <col style={{ width: '8%' }} />
                          <col style={{ width: '7%' }} />
                          {DAYS_OF_WEEK.map(d => (
                            <col key={`ccol-${d.value}`} style={{ width: '14.16%' }} />
                          ))}
                        </colgroup>

                        <thead
                          ref={el => {
                            theadRefs.current[cls.id] = el;
                          }}
                        >
                          <tr>
                            <th
                              className="px-1 py-2 text-center font-extrabold text-white uppercase border border-white/40"
                              style={{ background: '#0F172A' }}
                            >
                              BUỔI
                            </th>
                            <th
                              className="px-1 py-2 text-center font-extrabold text-white uppercase border border-white/40"
                              style={{ background: '#334155' }}
                            >
                              TIẾT
                            </th>
                            {DAYS_OF_WEEK.map(d => {
                              const dayTheme = DAY_RAINBOW_THEMES[d.value];
                              return (
                                <th
                                  key={d.value}
                                  className="px-1 py-2 text-center font-extrabold uppercase border border-white/40"
                                  style={{
                                    background: isRainbow
                                      ? dayTheme.headerGradient
                                      : dayTheme.headerBg,
                                    color: dayTheme.headerText
                                  }}
                                >
                                  {d.label}
                                </th>
                              );
                            })}
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
                              style={{
                                borderBottom: rowMeta.isLastRowOfSession
                                  ? '2px solid #94A3B8'
                                  : '1px solid #E2E8F0'
                              }}
                            >
                              {rowMeta.showSessionCell && (
                                <td
                                  rowSpan={rowMeta.sessionRowSpan}
                                  className="px-1 font-extrabold text-center align-middle uppercase border-r border-slate-300"
                                  style={{
                                    background:
                                      rowMeta.session === 'SANG'
                                        ? 'linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)'
                                        : 'linear-gradient(180deg, #EDE9FE 0%, #DDD6FE 100%)',
                                    color: rowMeta.session === 'SANG' ? '#B45309' : '#5B21B6'
                                  }}
                                >
                                  {rowMeta.sessionLabel}
                                </td>
                              )}

                              <td
                                className="px-1 font-extrabold text-center align-middle tabular-nums border-r border-slate-300"
                                style={{
                                  backgroundColor:
                                    rowMeta.session === 'SANG' ? '#FFFBEB' : '#F5F3FF',
                                  color: rowMeta.session === 'SANG' ? '#92400E' : '#4C1D95'
                                }}
                              >
                                Tiết {rowMeta.period}
                              </td>

                              {DAYS_OF_WEEK.map(day => {
                                const dayTheme = DAY_RAINBOW_THEMES[day.value];
                                const slot =
                                  slotMap.get(`${cls.id}_${day.value}_${rowMeta.session}_${rowMeta.period}`) ||
                                  slotMap.get(`${cls.name}_${day.value}_${rowMeta.session}_${rowMeta.period}`);

                                if (!slot || !slot.subjectName) {
                                  return (
                                    <td
                                      key={day.value}
                                      className="px-1 text-center align-middle border-r border-slate-200 last:border-r-0"
                                      style={{ backgroundColor: dayTheme.colTint }}
                                    >
                                      <span className="text-slate-300 font-normal">·</span>
                                    </td>
                                  );
                                }

                                const subjectName = getUnifiedSubjectName(slot);
                                const teacherName = showSecondaryDetail
                                  ? resolveCleanTeacherName(slot, teacherMap, teachers)
                                  : '';
                                const theme = getSubjectColorTheme(slot.subjectId, subjectName);

                                return (
                                  <td
                                    key={day.value}
                                    className="px-1 text-center align-middle border-r border-slate-200 last:border-r-0"
                                    style={{
                                      backgroundColor: isRainbow ? theme.bg : theme.bgSoft
                                    }}
                                  >
                                    <div
                                      className="rounded-md px-1 py-0.5 mx-auto"
                                      style={{
                                        borderTop: `2.5px solid ${theme.accent}`,
                                        backgroundColor: '#FFFFFFB8'
                                      }}
                                    >
                                      <div
                                        className="font-extrabold leading-tight"
                                        style={{ color: theme.titleColor }}
                                      >
                                        {subjectName}
                                      </div>
                                      {teacherName && (
                                        <div
                                          className="text-[82%] font-semibold mt-0.5 leading-tight"
                                          style={{ color: theme.subColor }}
                                        >
                                          {teacherName}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Bottom Colorful Subject Chips + Cheerful Student Footer */}
                    <div
                      ref={el => {
                        footerRefs.current[cls.id] = el;
                      }}
                      className="mt-auto pt-2 space-y-2 print-avoid-break"
                    >
                      {showSummaryLegend && classSummary.chips.length > 0 && (
                        <div
                          className="rounded-xl p-2 border"
                          style={{
                            backgroundColor: '#F8FAFC',
                            borderColor: '#CBD5E1'
                          }}
                        >
                          <div className="text-[7.5pt] font-extrabold uppercase text-slate-600 mb-1">
                            Bảng màu & số tiết các môn học trong tuần ({classSummary.totalPeriods} tiết):
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {classSummary.chips.map(chip => (
                              <span
                                key={chip.subjectName}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[7.8pt] font-bold border"
                                style={{
                                  backgroundColor: chip.theme.bg,
                                  borderColor: chip.theme.border,
                                  color: chip.theme.titleColor
                                }}
                              >
                                <span>{chip.subjectName}</span>
                                <span
                                  className="rounded px-1 font-extrabold tabular-nums"
                                  style={{
                                    backgroundColor: chip.theme.pillBg,
                                    color: chip.theme.pillText
                                  }}
                                >
                                  {chip.count}t
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div
                        className="flex items-center justify-between gap-3 pt-1.5 border-t-2 text-[8.3pt]"
                        style={{ borderColor: '#E2E8F0' }}
                      >
                        <div className="font-semibold text-sky-800 italic">
                          Chúc các em học sinh lớp {cls.name} một tuần học tập thật vui vẻ, chăm ngoan và đạt kết quả cao!
                        </div>
                        <div className="text-right font-bold text-slate-700 shrink-0">
                          <div>{dateString}</div>
                          <div className="text-[8pt] text-indigo-700 uppercase">
                            BGH {config.schoolName || 'THCS & THPT ĐỐC BINH KIỀU'}
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

        {/* Bottom Print Bar - Hidden on Print */}
        <div className="bg-white border-t border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 shrink-0 print:hidden">
          <div className="font-medium text-slate-700">
            Mẹo lưu PDF nhiều màu đẹp: Chọn Máy in = <strong>Lưu dưới dạng PDF (Save as PDF)</strong>, Khổ giấy ={' '}
            <strong>A4 (Dọc)</strong>, và bật <strong>Đồ họa nền (Background graphics)</strong>.
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
              onClick={handlePrint}
              disabled={totalSheets === 0}
              className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-rose-600 hover:from-violet-700 hover:to-rose-700 disabled:opacity-50 text-white font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Xuất / Lưu PDF Màu ({totalSheets} Trang)</span>
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
