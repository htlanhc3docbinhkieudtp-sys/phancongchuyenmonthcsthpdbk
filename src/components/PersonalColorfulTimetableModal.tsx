import React, { useEffect, useMemo, useState } from 'react';
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
  HEADER_COLOR_PRESETS,
  HeaderColorPresetId,
  PersonalColorIntensity,
  PersonalPdfTargetType,
  buildClassSubjectSummary,
  buildTeacherPrintItems,
  buildTeacherScheduleRows,
  getSubjectColorTheme
} from '../utils/personalColorfulTimetableHelper';
import { exportPersonalVectorPdf } from '../utils/personalVectorPdfExportHelper';
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  GraduationCap,
  Info,
  Loader2,
  Lock,
  Palette,
  Printer,
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
  onShowToast?: (msg: string) => void;
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
  isAdmin = false,
  onShowToast
}) => {
  const [targetType, setTargetType] = useState<PersonalPdfTargetType>(initialTargetType);
  const [selectedCampus, setSelectedCampus] = useState<GradeCampusFilter>(initialCampus);
  const [selectedGrade, setSelectedGrade] = useState<string>(initialGrade);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>(initialDepartmentId);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(initialTeacherId);
  const [onlyActiveTeachers, setOnlyActiveTeachers] = useState<boolean>(true);
  const [sessionMode, setSessionMode] = useState<GradeSessionExportMode>('SMART_A4');
  const [colorIntensity, setColorIntensity] = useState<PersonalColorIntensity>('SOFT');
  const [headerColorPreset, setHeaderColorPreset] = useState<HeaderColorPresetId>(
    initialTargetType === 'CLASS' ? 'BLUE' : 'INDIGO'
  );
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [showSecondaryDetail, setShowSecondaryDetail] = useState<boolean>(true);
  const [showSummaryLegend, setShowSummaryLegend] = useState<boolean>(true);
  const [locationName, setLocationName] = useState<string>('Đốc Binh Kiều');
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [lastExportInfo, setLastExportInfo] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTargetType(initialTargetType);
      setSelectedCampus(initialCampus);
      setSelectedGrade(initialGrade);
      setSelectedClassId(initialClassId);
      setSelectedDepartmentId(initialDepartmentId);
      setSelectedTeacherId(initialTeacherId);
      setHeaderColorPreset(initialTargetType === 'CLASS' ? 'BLUE' : 'INDIGO');
      setPreviewIndex(0);
      setLastExportInfo(null);
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

  const totalSheets = targetType === 'TEACHER' ? teacherItems.length : classItems.length;

  useEffect(() => {
    setPreviewIndex(prev => {
      if (totalSheets === 0) return 0;
      return Math.min(prev, totalSheets - 1);
    });
  }, [totalSheets]);

  if (!isOpen || !isAdmin) return null;

  const safeIndex = totalSheets > 0 ? Math.min(previewIndex, totalSheets - 1) : 0;
  const activePreset = HEADER_COLOR_PRESETS[headerColorPreset] || HEADER_COLOR_PRESETS.BLUE;

  const handleDownloadVectorPdf = async () => {
    if (!isAdmin || totalSheets === 0 || isExportingPdf) return;
    try {
      setIsExportingPdf(true);
      setLastExportInfo(null);
      const res = await exportPersonalVectorPdf({
        targetType,
        config,
        classes,
        teachers,
        departments,
        timetable,
        currentWeek,
        teacherItems,
        classItems,
        slotMap,
        sessionMode,
        colorIntensity,
        headerColorPreset,
        fontSize,
        showSecondaryDetail,
        showSummaryLegend,
        locationName
      });
      const msg = `Đã tải file ${res.fileName} (${res.pageCount} trang A4 · ~${res.approxKb} KB)`;
      setLastExportInfo(msg);
      onShowToast?.(msg);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo file PDF.';
      onShowToast?.(msg);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrintCurrentSheet = () => {
    if (!isAdmin || totalSheets === 0) return;
    window.print();
  };

  const today = new Date();
  const dateString = `${locationName}, ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;

  const activeTeacherItem = targetType === 'TEACHER' ? teacherItems[safeIndex] : undefined;
  const activeClassItem = targetType === 'CLASS' ? classItems[safeIndex] : undefined;

  const modalContent = (
    <div className="personal-colorful-print-root fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:m-0 print:static print:block print:bg-white print:overflow-visible">
      <style>{`
        @media print {
          #root {
            display: none !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: #ffffff !important;
            overflow: visible !important;
          }
          .personal-colorful-print-root,
          .personal-colorful-print-root * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          .personal-colorful-print-root,
          .personal-colorful-print-dialog,
          .personal-colorful-print-scroll {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            overflow: visible !important;
          }
          .personal-colorful-print-sheet {
            width: 198mm !important;
            height: 284mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="personal-colorful-print-dialog bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-[96vw] xl:max-w-[1220px] max-h-[96vh] flex flex-col overflow-hidden print:block print:w-full print:max-w-none print:max-h-none print:border-none print:shadow-none print:rounded-none print:overflow-visible">
        {/* Top Modal Header - Clean & Crisp */}
        <div className="bg-slate-900 text-white px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold tracking-tight uppercase">
                  Xuất PDF Thời Khóa Biểu Cá Nhân (Lớp & Giáo Viên)
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-400/15 text-amber-200 border border-amber-300/30 whitespace-nowrap">
                  <Lock className="w-3 h-3" />
                  <span>Chỉ Quản trị viên</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Phối màu nhẹ nhàng, thanh lịch · Tạo file PDF vector siêu nhẹ dưới 1 giây để gửi Zalo / Email
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadVectorPdf}
              disabled={totalSheets === 0 || isExportingPdf}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Tạo và tải ngay file PDF vector siêu nhẹ (khoảng 0.3 - 0.8 giây)"
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>
                {isExportingPdf
                  ? 'Đang tạo PDF nhẹ...'
                  : `Tải PDF Nhẹ Ngay (${totalSheets} trang)`}
              </span>
            </button>

            <button
              type="button"
              onClick={handlePrintCurrentSheet}
              disabled={totalSheets === 0}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="In trực tiếp 1 trang đang xem trước qua trình duyệt"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In trang này</span>
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

        {/* Filter & Appearance Controls Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 space-y-2.5 shrink-0 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Mode Toggle: TEACHER vs CLASS */}
            <div className="inline-flex rounded-xl bg-slate-200/80 p-1 border border-slate-300">
              <button
                type="button"
                onClick={() => {
                  setTargetType('TEACHER');
                  setHeaderColorPreset('INDIGO');
                  setPreviewIndex(0);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  targetType === 'TEACHER'
                    ? 'bg-indigo-700 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>TKB Giáo Viên ({availableTeacherDropdownItems.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetType('CLASS');
                  setHeaderColorPreset('BLUE');
                  setPreviewIndex(0);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  targetType === 'CLASS'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <Users2 className="w-3.5 h-3.5" />
                <span>TKB Từng Lớp ({availableClassDropdownItems.length})</span>
              </button>
            </div>

            {/* Clean Tone & Intensity Selectors */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1 whitespace-nowrap">
                <Palette className="w-3.5 h-3.5 text-indigo-600" />
                <span>Mức màu:</span>
              </span>
              <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200">
                {[
                  { id: 'SOFT' as const, label: 'Tươi sáng nhẹ' },
                  { id: 'ACCENT' as const, label: 'Nhấn viền mảnh' },
                  { id: 'MINIMAL' as const, label: 'Tối giản siêu nhẹ' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setColorIntensity(opt.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all whitespace-nowrap ${
                      colorIntensity === opt.id
                        ? 'bg-slate-800 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200">
                {(Object.keys(HEADER_COLOR_PRESETS) as HeaderColorPresetId[]).map(pid => {
                  const p = HEADER_COLOR_PRESETS[pid];
                  return (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => setHeaderColorPreset(pid)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap ${
                        headerColorPreset === pid
                          ? 'bg-slate-100 text-slate-900 ring-1 ring-slate-300'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                        style={{ backgroundColor: p.bannerBg }}
                      />
                      <span>{p.label}</span>
                    </button>
                  );
                })}
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
                      setPreviewIndex(0);
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
                      setPreviewIndex(0);
                    }}
                    className="h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
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
                    onChange={e => {
                      setSelectedTeacherId(e.target.value);
                      setPreviewIndex(0);
                    }}
                    className="h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden min-w-[210px]"
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
                    onChange={e => {
                      setOnlyActiveTeachers(e.target.checked);
                      setPreviewIndex(0);
                    }}
                    className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
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
                      setPreviewIndex(0);
                    }}
                    className="h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
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
                    onChange={e => {
                      setSelectedClassId(e.target.value);
                      setPreviewIndex(0);
                    }}
                    className="h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-w-[165px]"
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

          {/* Display Options & Fast Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs pt-2 border-t border-slate-200/80">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 whitespace-nowrap">Buổi:</span>
                <select
                  value={sessionMode}
                  onChange={e => setSessionMode(e.target.value as GradeSessionExportMode)}
                  className="h-8 px-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="SMART_A4">Gọn A4 (Ca chính + Tiết trái buổi)</option>
                  <option value="ALL">Đầy đủ cả 2 buổi (10 tiết)</option>
                  <option value="MAIN_ONLY">Chỉ 1 ca chính (5 tiết)</option>
                  <option value="SANG">Chỉ Buổi Sáng</option>
                  <option value="CHIEU">Chỉ Buổi Chiều</option>
                </select>
              </div>

              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 cursor-pointer font-bold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={showSecondaryDetail}
                  onChange={e => setShowSecondaryDetail(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                />
                <span>{targetType === 'TEACHER' ? 'Hiện tên Môn' : 'Hiện tên GV'}</span>
              </label>

              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 cursor-pointer font-bold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={showSummaryLegend}
                  onChange={e => setShowSummaryLegend(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                />
                <span>Tổng hợp tiết cuối trang</span>
              </label>

              <div className="flex items-center gap-1">
                <span className="font-bold text-slate-700 whitespace-nowrap">Cỡ chữ:</span>
                <div className="inline-flex rounded-lg bg-white p-0.5 border border-slate-200 text-[11px]">
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
                        fontSize === f.id ? 'bg-indigo-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-slate-700">
              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-2 py-0.5">
                <span className="text-[11px] font-bold text-slate-600">Địa danh:</span>
                <input
                  type="text"
                  value={locationName}
                  onChange={e => setLocationName(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-900 w-24 focus:outline-hidden"
                />
              </div>
              {totalSheets > 1 && (
                <div className="inline-flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewIndex(i => Math.max(0, i - 1))}
                    disabled={safeIndex === 0}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-35 cursor-pointer"
                    title="Trang trước"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-[11px] font-extrabold text-slate-800 tabular-nums whitespace-nowrap">
                    Xem trang {safeIndex + 1} / {totalSheets}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewIndex(i => Math.min(totalSheets - 1, i + 1))}
                    disabled={safeIndex >= totalSheets - 1}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-35 cursor-pointer"
                    title="Trang sau"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {lastExportInfo && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{lastExportInfo}</span>
            </div>
          )}
        </div>

        {/* Single-Page Paginated A4 Preview (Zero DOM Lag) */}
        <div className="personal-colorful-print-scroll flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/80 print:p-0 print:m-0 print:bg-white print:overflow-visible">
          {totalSheets === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-500 max-w-md mx-auto shadow-sm print:hidden">
              <Info className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="font-bold text-slate-800">Không có dữ liệu phù hợp với bộ lọc</p>
              <p className="text-xs text-slate-500 mt-1">
                Vui lòng chọn lại điểm trường, tổ chuyên môn, khối hoặc bật hiển thị tất cả giáo viên.
              </p>
            </div>
          ) : targetType === 'TEACHER' && activeTeacherItem ? (
            (() => {
              const item = activeTeacherItem;
              const t = item.teacher;
              const rows = buildTeacherScheduleRows(item, sessionMode);
              const summaryText = item.classBreakdown
                .map(b => `${b.className} (${b.subjectName}: ${b.count}t)`)
                .join(' · ');

              const fontSizeClass =
                fontSize === 'sm'
                  ? 'text-[8.5pt] leading-[1.2]'
                  : fontSize === 'md'
                  ? rows.length <= 7
                    ? 'text-[9.5pt] leading-[1.22]'
                    : 'text-[8.8pt] leading-[1.18]'
                  : rows.length <= 7
                  ? 'text-[10.2pt] leading-[1.24]'
                  : 'text-[9.3pt] leading-[1.18]';

              const cellPadStyle =
                rows.length <= 5
                  ? '14px 4px'
                  : rows.length <= 7
                  ? '10px 4px'
                  : '6px 4px';

              return (
                <div
                  className="bg-white text-slate-900 p-[6mm] rounded-xl shadow-md border border-slate-300 mx-auto w-full max-w-[210mm] personal-colorful-print-sheet print:shadow-none print:border-none print:p-0 print:m-0"
                  style={{
                    fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
                    fontSynthesis: 'none'
                  }}
                >
                  <div className="flex flex-col min-h-[275mm]">
                    {/* Clean Solid Banner */}
                    <div
                      className="rounded-xl px-4 py-3 text-white flex items-center justify-between gap-3"
                      style={{ backgroundColor: activePreset.bannerBg }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-white p-1 flex items-center justify-center shrink-0">
                          <img
                            src="/logo-sm.png"
                            alt="Logo trường"
                            className="w-full h-full object-contain rounded-full"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[7.5pt] font-bold uppercase tracking-wider text-blue-100">
                            {config.schoolName || 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU'}
                          </div>
                          <h1 className="text-[13.5pt] font-extrabold leading-tight text-white mt-0.5">
                            THỜI KHÓA BIỂU GIÁO VIÊN: {item.cleanName.toUpperCase()}
                          </h1>
                          <div className="text-[8.3pt] font-medium text-blue-100 mt-0.5">
                            {item.departmentName} · {item.campusName}
                          </div>
                        </div>
                      </div>

                      <div
                        className="text-center shrink-0 rounded-lg px-3 py-1.5"
                        style={{
                          backgroundColor: activePreset.badgeBg,
                          color: activePreset.badgeText
                        }}
                      >
                        <div className="text-[10pt] font-extrabold tabular-nums">
                          TUẦN {currentWeek}
                        </div>
                        <div className="text-[7.8pt] font-bold tabular-nums">
                          {weekInfo.startDateShort} – {weekInfo.endDateShort}
                        </div>
                        <div className="text-[7pt] font-semibold tabular-nums">
                          NH {config.academicYear || '2026 - 2027'}
                        </div>
                      </div>
                    </div>

                    {/* Clean Single Info Strip */}
                    <div
                      className="grid grid-cols-4 divide-x divide-slate-200 rounded-lg border mt-2.5 text-left"
                      style={{
                        backgroundColor: activePreset.infoBarBg,
                        borderColor: activePreset.infoBarBorder
                      }}
                    >
                      <div className="px-2.5 py-1.5">
                        <div className="text-[7pt] font-bold uppercase text-slate-500">
                          Mã GV & Định mức
                        </div>
                        <div className="text-[8.8pt] font-extrabold text-slate-900 tabular-nums">
                          {t.code} · {t.baseStandardPeriods}t/tuần
                        </div>
                      </div>
                      <div className="px-2.5 py-1.5">
                        <div className="text-[7pt] font-bold uppercase text-slate-500">
                          Tiết giảng dạy TKB
                        </div>
                        <div className="text-[8.8pt] font-extrabold text-slate-900 tabular-nums">
                          {item.totalPeriods} tiết ({item.sessionCount} buổi)
                        </div>
                      </div>
                      <div className="px-2.5 py-1.5">
                        <div className="text-[7pt] font-bold uppercase text-slate-500">
                          TB tiết / buổi
                        </div>
                        <div className="text-[8.8pt] font-extrabold text-slate-900 tabular-nums">
                          {item.avgPerSession} tiết/buổi
                        </div>
                      </div>
                      <div className="px-2.5 py-1.5">
                        <div className="text-[7pt] font-bold uppercase text-slate-500">
                          {item.homeroomClassName ? 'Chủ nhiệm & Ngày nghỉ' : 'Ngày nghỉ trọn'}
                        </div>
                        <div className="text-[8.6pt] font-extrabold text-slate-900 truncate">
                          {item.homeroomClassName ? `CN ${item.homeroomClassName} · ` : ''}
                          {item.freeDays.length > 0 ? item.freeDays.join(', ') : 'Dạy 6 ngày'}
                        </div>
                      </div>
                    </div>

                    {/* Clean Teacher Schedule Table */}
                    <div className="mt-2.5">
                      <table className={`w-full table-fixed border-collapse border border-slate-300 text-center ${fontSizeClass}`}>
                        <colgroup>
                          <col style={{ width: '7.5%' }} />
                          <col style={{ width: '7%' }} />
                          {DAYS_OF_WEEK.map(d => (
                            <col key={`tcol-${d.value}`} style={{ width: '14.25%' }} />
                          ))}
                        </colgroup>
                        <thead>
                          <tr
                            style={{
                              backgroundColor: activePreset.tableHeaderBg,
                              color: activePreset.tableHeaderText
                            }}
                          >
                            <th className="px-1 py-2 font-extrabold uppercase border border-blue-300/40">
                              Buổi
                            </th>
                            <th className="px-1 py-2 font-extrabold uppercase border border-blue-300/40">
                              Tiết
                            </th>
                            {DAYS_OF_WEEK.map(d => (
                              <th
                                key={d.value}
                                className="px-1 py-2 font-extrabold uppercase border border-blue-300/40"
                              >
                                {d.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(rowMeta => (
                            <tr
                              key={`${rowMeta.session}_${rowMeta.period}`}
                              style={{
                                borderBottom: rowMeta.isLastRowOfSession
                                  ? '2px solid #94A3B8'
                                  : '1px solid #CBD5E1'
                              }}
                            >
                              {rowMeta.showSessionCell && (
                                <td
                                  rowSpan={rowMeta.sessionRowSpan}
                                  className="px-1 font-extrabold text-center align-middle uppercase border-r border-slate-300"
                                  style={{
                                    backgroundColor:
                                      colorIntensity === 'MINIMAL'
                                        ? '#F8FAFC'
                                        : rowMeta.session === 'SANG'
                                        ? '#FFFBEB'
                                        : '#EEF2FF',
                                    color:
                                      colorIntensity === 'MINIMAL'
                                        ? '#334155'
                                        : rowMeta.session === 'SANG'
                                        ? '#B45309'
                                        : '#3730A3'
                                  }}
                                >
                                  {rowMeta.sessionLabel}
                                </td>
                              )}

                              <td className="px-1 font-bold text-slate-700 bg-slate-50 border-r border-slate-300 tabular-nums">
                                T{rowMeta.period}
                              </td>

                              {DAYS_OF_WEEK.map(day => {
                                const daySlots =
                                  item.slotByDaySessionPeriod.get(
                                    `${day.value}_${rowMeta.session}_${rowMeta.period}`
                                  ) || [];

                                if (daySlots.length === 0) {
                                  return (
                                    <td
                                      key={day.value}
                                      className="border-r border-slate-200 last:border-r-0 bg-white"
                                      style={{ padding: cellPadStyle }}
                                    />
                                  );
                                }

                                const isCollision = daySlots.length > 1;
                                const primarySlot = daySlots[0];
                                const subName = getUnifiedSubjectName(primarySlot);
                                const clsName =
                                  classMap.get(primarySlot.classId)?.name || primarySlot.className;
                                const subTheme = getSubjectColorTheme(primarySlot.subjectId, subName);
                                const classTheme =
                                  item.classBreakdown.find(b => b.className === clsName)?.theme ||
                                  subTheme;

                                return (
                                  <td
                                    key={day.value}
                                    className="border-r border-slate-200 last:border-r-0 align-middle"
                                    style={{
                                      padding: cellPadStyle,
                                      backgroundColor: isCollision
                                        ? '#FFE4E6'
                                        : colorIntensity === 'SOFT'
                                        ? classTheme.bg
                                        : '#FFFFFF',
                                      borderLeft:
                                        colorIntensity === 'ACCENT' && !isCollision
                                          ? `3px solid ${classTheme.accent}`
                                          : undefined
                                    }}
                                  >
                                    {daySlots.map(s => {
                                      const sSub = getUnifiedSubjectName(s);
                                      const sCls = classMap.get(s.classId)?.name || s.className;
                                      return (
                                        <div key={s.id} className="leading-tight">
                                          <div
                                            className="font-extrabold"
                                            style={{
                                              color: isCollision
                                                ? '#BE123C'
                                                : colorIntensity === 'SOFT'
                                                ? classTheme.titleColor
                                                : '#0F172A'
                                            }}
                                          >
                                            {sCls}
                                          </div>
                                          {showSecondaryDetail && (
                                            <div className="text-[82%] font-medium text-slate-600 mt-0.5">
                                              {sSub}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {isCollision && (
                                      <div className="text-[72%] font-bold text-rose-700 mt-0.5">
                                        Trùng {daySlots.length} lớp
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Compact Summary & Footer */}
                    <div className="mt-auto pt-3 space-y-2">
                      {showSummaryLegend && summaryText && (
                        <div className="rounded-lg px-3 py-1.5 bg-slate-50 border border-slate-200 text-[7.8pt] text-slate-700 leading-snug">
                          <span className="font-bold text-slate-900">Phân bố dạy: </span>
                          <span>{summaryText}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-300 text-[8pt]">
                        <div className="text-slate-700 italic">
                          Kính chúc Quý Thầy/Cô một tuần giảng dạy nhiều sức khỏe, niềm vui và hiệu quả!
                        </div>
                        <div className="text-right shrink-0 font-bold text-slate-800">
                          <div>{dateString}</div>
                          <div style={{ color: activePreset.footerAccent }} className="uppercase">
                            BGH {config.schoolName || 'THCS & THPT ĐỐC BINH KIỀU'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : activeClassItem ? (
            (() => {
              const item = activeClassItem;
              const cls = item.classGroup;
              const classRows = buildClassScheduleRows(item, slotMap, sessionMode);
              const summary = buildClassSubjectSummary(cls, slotMap);
              const summaryText = summary.chips
                .map(c => `${c.subjectName} (${c.count}t)`)
                .join(' · ');

              const fontSizeClass =
                fontSize === 'sm'
                  ? 'text-[8.5pt] leading-[1.2]'
                  : fontSize === 'md'
                  ? classRows.length <= 7
                    ? 'text-[9.5pt] leading-[1.22]'
                    : 'text-[8.8pt] leading-[1.18]'
                  : classRows.length <= 7
                  ? 'text-[10.2pt] leading-[1.24]'
                  : 'text-[9.3pt] leading-[1.18]';

              const cellPadStyle =
                classRows.length <= 5
                  ? '14px 4px'
                  : classRows.length <= 7
                  ? '10px 4px'
                  : '6px 4px';

              return (
                <div
                  className="bg-white text-slate-900 p-[6mm] rounded-xl shadow-md border border-slate-300 mx-auto w-full max-w-[210mm] personal-colorful-print-sheet print:shadow-none print:border-none print:p-0 print:m-0"
                  style={{
                    fontFamily: "'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif",
                    fontSynthesis: 'none'
                  }}
                >
                  <div className="flex flex-col min-h-[275mm]">
                    {/* Clean Solid Banner */}
                    <div
                      className="rounded-xl px-4 py-3 text-white flex items-center justify-between gap-3"
                      style={{ backgroundColor: activePreset.bannerBg }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-white p-1 flex items-center justify-center shrink-0">
                          <img
                            src="/logo-sm.png"
                            alt="Logo trường"
                            className="w-full h-full object-contain rounded-full"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[7.5pt] font-bold uppercase tracking-wider text-blue-100">
                            {config.schoolName || 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU'}
                          </div>
                          <h1 className="text-[13.5pt] font-extrabold leading-tight text-white mt-0.5">
                            THỜI KHÓA BIỂU LỚP {cls.name} (KHỐI {cls.grade})
                          </h1>
                          <div className="text-[8.3pt] font-medium text-blue-100 mt-0.5">
                            {item.campusName}
                          </div>
                        </div>
                      </div>

                      <div
                        className="text-center shrink-0 rounded-lg px-3 py-1.5"
                        style={{
                          backgroundColor: activePreset.badgeBg,
                          color: activePreset.badgeText
                        }}
                      >
                        <div className="text-[10pt] font-extrabold tabular-nums">
                          TUẦN {currentWeek}
                        </div>
                        <div className="text-[7.8pt] font-bold tabular-nums">
                          {weekInfo.startDateShort} – {weekInfo.endDateShort}
                        </div>
                        <div className="text-[7pt] font-semibold tabular-nums">
                          NH {config.academicYear || '2026 - 2027'}
                        </div>
                      </div>
                    </div>

                    {/* Clean Single Info Strip */}
                    <div
                      className="grid grid-cols-4 divide-x divide-slate-200 rounded-lg border mt-2.5 text-left"
                      style={{
                        backgroundColor: activePreset.infoBarBg,
                        borderColor: activePreset.infoBarBorder
                      }}
                    >
                      <div className="px-2.5 py-1.5">
                        <div className="text-[7pt] font-bold uppercase text-slate-500">
                          Giáo viên chủ nhiệm
                        </div>
                        <div className="text-[8.8pt] font-extrabold text-slate-900 truncate">
                          {item.homeroomName}
                        </div>
                      </div>
                      <div className="px-2.5 py-1.5">
                        <div className="text-[7pt] font-bold uppercase text-slate-500">
                          Ca học chính
                        </div>
                        <div className="text-[8.8pt] font-extrabold text-slate-900">
                          Buổi {item.primarySession === 'SANG' ? 'Sáng' : 'Chiều'} ({item.campusShort})
                        </div>
                      </div>
                      <div className="px-2.5 py-1.5">
                        <div className="text-[7pt] font-bold uppercase text-slate-500">
                          Tổng số tiết tuần
                        </div>
                        <div className="text-[8.8pt] font-extrabold text-slate-900 tabular-nums">
                          {summary.totalPeriods} tiết / tuần
                        </div>
                      </div>
                      <div className="px-2.5 py-1.5">
                        <div className="text-[7pt] font-bold uppercase text-slate-500">
                          Ngày bắt đầu áp dụng
                        </div>
                        <div className="text-[8.8pt] font-extrabold text-slate-900 tabular-nums">
                          Thứ Hai, {weekInfo.startDateShort}
                        </div>
                      </div>
                    </div>

                    {/* Clean Class Timetable Grid */}
                    <div className="mt-2.5">
                      <table className={`w-full table-fixed border-collapse border border-slate-300 text-center ${fontSizeClass}`}>
                        <colgroup>
                          <col style={{ width: '7.5%' }} />
                          <col style={{ width: '7%' }} />
                          {DAYS_OF_WEEK.map(d => (
                            <col key={`ccol-${d.value}`} style={{ width: '14.25%' }} />
                          ))}
                        </colgroup>
                        <thead>
                          <tr
                            style={{
                              backgroundColor: activePreset.tableHeaderBg,
                              color: activePreset.tableHeaderText
                            }}
                          >
                            <th className="px-1 py-2 font-extrabold uppercase border border-blue-300/40">
                              Buổi
                            </th>
                            <th className="px-1 py-2 font-extrabold uppercase border border-blue-300/40">
                              Tiết
                            </th>
                            {DAYS_OF_WEEK.map(d => (
                              <th
                                key={d.value}
                                className="px-1 py-2 font-extrabold uppercase border border-blue-300/40"
                              >
                                {d.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {classRows.map(rowMeta => (
                            <tr
                              key={`${rowMeta.session}_${rowMeta.period}`}
                              style={{
                                borderBottom: rowMeta.isLastRowOfSession
                                  ? '2px solid #94A3B8'
                                  : '1px solid #CBD5E1'
                              }}
                            >
                              {rowMeta.showSessionCell && (
                                <td
                                  rowSpan={rowMeta.sessionRowSpan}
                                  className="px-1 font-extrabold text-center align-middle uppercase border-r border-slate-300"
                                  style={{
                                    backgroundColor:
                                      colorIntensity === 'MINIMAL'
                                        ? '#F8FAFC'
                                        : rowMeta.session === 'SANG'
                                        ? '#FFFBEB'
                                        : '#EEF2FF',
                                    color:
                                      colorIntensity === 'MINIMAL'
                                        ? '#334155'
                                        : rowMeta.session === 'SANG'
                                        ? '#B45309'
                                        : '#3730A3'
                                  }}
                                >
                                  {rowMeta.sessionLabel}
                                </td>
                              )}

                              <td className="px-1 font-bold text-slate-700 bg-slate-50 border-r border-slate-300 tabular-nums">
                                T{rowMeta.period}
                              </td>

                              {DAYS_OF_WEEK.map(day => {
                                const slot =
                                  slotMap.get(`${cls.id}_${day.value}_${rowMeta.session}_${rowMeta.period}`) ||
                                  slotMap.get(`${cls.name}_${day.value}_${rowMeta.session}_${rowMeta.period}`);

                                if (!slot || !slot.subjectName) {
                                  return (
                                    <td
                                      key={day.value}
                                      className="border-r border-slate-200 last:border-r-0 bg-white"
                                      style={{ padding: cellPadStyle }}
                                    />
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
                                    className="border-r border-slate-200 last:border-r-0 align-middle"
                                    style={{
                                      padding: cellPadStyle,
                                      backgroundColor:
                                        colorIntensity === 'SOFT' ? theme.bg : '#FFFFFF',
                                      borderLeft:
                                        colorIntensity === 'ACCENT'
                                          ? `3px solid ${theme.accent}`
                                          : undefined
                                    }}
                                  >
                                    <div className="leading-tight">
                                      <div
                                        className="font-extrabold"
                                        style={{
                                          color:
                                            colorIntensity === 'SOFT'
                                              ? theme.titleColor
                                              : '#0F172A'
                                        }}
                                      >
                                        {subjectName}
                                      </div>
                                      {teacherName && (
                                        <div className="text-[82%] font-medium text-slate-600 mt-0.5">
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

                    {/* Compact Summary & Footer */}
                    <div className="mt-auto pt-3 space-y-2">
                      {showSummaryLegend && summaryText && (
                        <div className="rounded-lg px-3 py-1.5 bg-slate-50 border border-slate-200 text-[7.8pt] text-slate-700 leading-snug">
                          <span className="font-bold text-slate-900">
                            Phân bố môn ({summary.totalPeriods}t):{' '}
                          </span>
                          <span>{summaryText}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-300 text-[8pt]">
                        <div className="text-slate-700 italic">
                          Chúc các em học sinh lớp {cls.name} một tuần học tập vui vẻ, chăm ngoan và tiến bộ!
                        </div>
                        <div className="text-right shrink-0 font-bold text-slate-800">
                          <div>{dateString}</div>
                          <div style={{ color: activePreset.footerAccent }} className="uppercase">
                            BGH {config.schoolName || 'THCS & THPT ĐỐC BINH KIỀU'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : null}
        </div>

        {/* Bottom Export Bar */}
        <div className="bg-white border-t border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 shrink-0 print:hidden">
          <div className="font-medium text-slate-700">
            Xuất trực tiếp bằng bộ tạo PDF vector nhẹ (tự căn vừa khít khổ A4 đứng, không cần chờ hộp thoại in).
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
              onClick={handleDownloadVectorPdf}
              disabled={totalSheets === 0 || isExportingPdf}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>
                {isExportingPdf
                  ? 'Đang tạo PDF...'
                  : `Tải File PDF Nhẹ (${totalSheets} Trang)`}
              </span>
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
