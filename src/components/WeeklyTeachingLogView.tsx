import React, { useState, useMemo, useEffect } from 'react';
import {
  SchoolConfig,
  Teacher,
  Department,
  ClassGroup,
  Subject,
  WeeklySchedule,
  WorkloadStats,
  SchoolTimetable,
} from '../types';
import {
  calculateAllActualWorkloads,
  exportActualWeeklyExcel,
  exportActualMultiWeekExcel,
  TeacherActualWorkload,
} from '../utils/actualTeachingHoursHelper';
import {
  Search,
  Printer,
  FileSpreadsheet,
  TrendingUp,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  PlusCircle,
  X,
  Building2,
  Check,
  RotateCcw,
} from 'lucide-react';

interface WeeklyTeachingLogViewProps {
  config: SchoolConfig;
  teachers: Teacher[];
  departments: Department[];
  classes: ClassGroup[];
  subjects: Subject[];
  weeklySchedules?: WeeklySchedule[];
  baseWorkloads?: WorkloadStats[];
  weeklyTimetables?: Record<number, SchoolTimetable>;
  currentWeek?: number;
  timetable?: SchoolTimetable;
  isAdmin?: boolean;
  onOpenWeeklyScheduleManager?: () => void;
}

type ViewMode = 'WEEKLY_DETAIL' | 'MULTI_WEEK';
type LevelScope = 'THPT' | 'THCS' | 'ALL';
type StatusFilter = 'ALL' | 'SURPLUS' | 'EXACT' | 'DEFICIT';

const ADJUSTMENT_STORAGE_KEY = 'docbinhkieu_actual_teaching_hours_adjustments_v1';

export const WeeklyTeachingLogView: React.FC<WeeklyTeachingLogViewProps> = ({
  config,
  teachers,
  departments,
  classes,
  subjects,
  weeklyTimetables,
  currentWeek = 1,
  timetable,
  isAdmin = false,
  onOpenWeeklyScheduleManager,
}) => {
  // Selected period in week selector: 'HK1' | 'HK2' | '1'..'35'
  const [selectedPeriod, setSelectedPeriod] = useState<string>('HK1');
  const isSemesterView = selectedPeriod === 'HK1' || selectedPeriod === 'HK2';
  const activeSemester: 'HK1' | 'HK2' =
    selectedPeriod === 'HK2'
      ? 'HK2'
      : selectedPeriod === 'HK1'
      ? 'HK1'
      : Number(selectedPeriod) > 18
      ? 'HK2'
      : 'HK1';

  const startWeek = activeSemester === 'HK2' ? 19 : 1;
  const endWeek = activeSemester === 'HK2' ? 35 : 18;
  const totalWeeks = endWeek - startWeek + 1;
  const semesterName = activeSemester === 'HK1' ? 'Học kỳ 1' : 'Học kỳ 2';

  const semesterWeeks = useMemo(() => {
    const list: number[] = [];
    for (let w = startWeek; w <= endWeek; w++) {
      list.push(w);
    }
    return list;
  }, [startWeek, endWeek]);

  // Selected week number for single-week calculations
  const selectedWeekNum = useMemo(() => {
    if (isSemesterView) {
      return currentWeek >= startWeek && currentWeek <= endWeek
        ? currentWeek
        : startWeek;
    }
    const num = Number(selectedPeriod);
    return isNaN(num) || num < 1 || num > 35 ? 1 : num;
  }, [isSemesterView, selectedPeriod, currentWeek, startWeek, endWeek]);

  // Level scope - defaults to 'THPT' as explicitly instructed by user
  const [levelScope, setLevelScope] = useState<LevelScope>('THPT');

  // View mode: Weekly Detail (Excel Template) vs Multi-week Overview
  const [viewMode, setViewMode] = useState<ViewMode>('MULTI_WEEK');

  // Matrix cell display mode: 'BALANCE' (± Thừa/Thiếu) | 'TEACHING' (Tiết dạy) | 'TOTAL' (Tổng quy đổi)
  const [cellDisplayMode, setCellDisplayMode] = useState<'BALANCE' | 'TEACHING' | 'TOTAL'>('BALANCE');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  // Display style: Full name (Tô Thị Lắm) by default as requested by user
  const [useShortName, setUseShortName] = useState<boolean>(false);

  // Manual Adjustments / Overtime offsets per teacher
  const [manualAdjustments, setManualAdjustments] = useState<
    Record<string, number>
  >(() => {
    try {
      const saved = localStorage.getItem(ADJUSTMENT_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    // Default initial demonstration offset for Cô Lắm (+2 at Week 3) if not yet adjusted
    return {
      'tch-v-1': 2,
    };
  });

  const [adjustModalTeacher, setAdjustModalTeacher] =
    useState<TeacherActualWorkload | null>(null);
  const [adjustInputVal, setAdjustInputVal] = useState<number>(0);

  // Save manual adjustments
  const handleSaveAdjustment = (teacherId: string, value: number) => {
    setManualAdjustments((prev) => {
      const next = { ...prev, [teacherId]: value };
      try {
        localStorage.setItem(ADJUSTMENT_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
    setAdjustModalTeacher(null);
  };

  // Calculate actual workloads from timetable slots
  const allWorkloads = useMemo(() => {
    return calculateAllActualWorkloads(
      selectedWeekNum,
      teachers,
      departments,
      classes,
      subjects,
      config,
      weeklyTimetables,
      timetable,
      totalWeeks,
      manualAdjustments,
      startWeek,
      endWeek
    );
  }, [
    selectedWeekNum,
    teachers,
    departments,
    classes,
    subjects,
    config,
    weeklyTimetables,
    timetable,
    totalWeeks,
    manualAdjustments,
    startWeek,
    endWeek,
  ]);

  // Filter workloads based on Level, Department, Search, and Status
  const filteredWorkloads = useMemo(() => {
    return allWorkloads.filter((item) => {
      // Level filter
      if (levelScope === 'THPT' && item.level !== 'THPT') return false;
      if (levelScope === 'THCS' && item.level !== 'THCS') return false;

      // Department filter
      if (selectedDept !== 'ALL' && item.departmentId !== selectedDept)
        return false;

      // Status filter
      if (statusFilter === 'SURPLUS' && item.cumulativeBalance <= 0) return false;
      if (statusFilter === 'EXACT' && item.cumulativeBalance !== 0) return false;
      if (statusFilter === 'DEFICIT' && item.cumulativeBalance >= 0) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchName = item.teacherName.toLowerCase().includes(query);
        const matchCalling = item.callingName.toLowerCase().includes(query);
        const matchCode = item.teacherCode.toLowerCase().includes(query);
        const matchDept = item.departmentName.toLowerCase().includes(query);
        const matchSubject = item.rows.some((r) =>
          r.subject.toLowerCase().includes(query)
        );
        const matchClass = item.rows.some((r) =>
          r.classes.toLowerCase().includes(query)
        );
        if (
          !matchName &&
          !matchCalling &&
          !matchCode &&
          !matchDept &&
          !matchSubject &&
          !matchClass
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allWorkloads, levelScope, selectedDept, statusFilter, searchTerm]);

  // Department list filtered by selected level
  const availableDepartments = useMemo(() => {
    if (levelScope === 'ALL') return departments;
    const activeDeptIds = new Set(
      allWorkloads
        .filter((w) => w.level === levelScope)
        .map((w) => w.departmentId)
    );
    return departments.filter((d) => activeDeptIds.has(d.id));
  }, [departments, allWorkloads, levelScope]);

  // Summary statistics
  const stats = useMemo(() => {
    const list = filteredWorkloads;
    const totalTeachers = list.length;
    const isSem = isSemesterView || viewMode === 'MULTI_WEEK';

    const totalTeachingPeriods = list.reduce(
      (sum, w) => sum + (isSem ? w.semesterTotalTeaching : w.teachingPeriods),
      0
    );
    const totalReductionPeriods = list.reduce(
      (sum, w) => sum + (isSem ? w.reductionPeriods * totalWeeks : w.reductionPeriods),
      0
    );
    const totalConvertedPeriods = list.reduce(
      (sum, w) => sum + (isSem ? w.semesterTotalPeriods : w.totalPeriods),
      0
    );
    const surplusCount = list.filter((w) =>
      isSem ? w.semesterBalance > 0 : w.cumulativeBalance > 0
    ).length;
    const exactCount = list.filter((w) =>
      isSem ? w.semesterBalance === 0 : w.cumulativeBalance === 0
    ).length;
    const deficitCount = list.filter((w) =>
      isSem ? w.semesterBalance < 0 : w.cumulativeBalance < 0
    ).length;

    return {
      totalTeachers,
      totalTeachingPeriods,
      totalReductionPeriods,
      totalConvertedPeriods,
      surplusCount,
      exactCount,
      deficitCount,
    };
  }, [filteredWorkloads, isSemesterView, viewMode, totalWeeks]);

  // Handle period change from dropdown or mode buttons
  const handlePeriodChange = (val: string) => {
    setSelectedPeriod(val);
    if (val === 'HK1' || val === 'HK2') {
      setViewMode('MULTI_WEEK');
    } else {
      setViewMode('WEEKLY_DETAIL');
    }
  };

  // Handle previous / next week
  const handlePrevWeek = () => {
    if (selectedPeriod === 'HK2') {
      handlePeriodChange('HK1');
    } else if (selectedPeriod === 'HK1') {
      // already at first semester
    } else {
      const w = Number(selectedPeriod);
      if (w > 1) {
        handlePeriodChange(String(w - 1));
      } else {
        handlePeriodChange('HK1');
      }
    }
  };

  const handleNextWeek = () => {
    if (selectedPeriod === 'HK1') {
      handlePeriodChange('1');
    } else if (selectedPeriod === 'HK2') {
      // already at HK2
    } else {
      const w = Number(selectedPeriod);
      if (w < 35) {
        handlePeriodChange(String(w + 1));
      } else {
        handlePeriodChange('HK2');
      }
    }
  };

  // Export handlers
  const handleExportExcel = () => {
    if (isSemesterView || viewMode === 'MULTI_WEEK') {
      exportActualMultiWeekExcel(
        filteredWorkloads,
        totalWeeks,
        config,
        startWeek,
        endWeek,
        semesterName
      );
    } else {
      exportActualWeeklyExcel(
        selectedWeekNum,
        filteredWorkloads,
        config,
        useShortName
      );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="weekly-teaching-log-view" className="space-y-4">
      {/* Top Banner & Control Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center p-2 rounded-lg bg-yellow-400 text-black font-bold shadow-sm">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Số Tiết Thực Dạy
                </h1>
                <p className="text-xs text-slate-500">
                  Phân công giảng dạy trích xuất từ Thời Khóa Biểu thực tế •
                  Tự động tính tiết dạy, kiêm nhiệm, định mức và thừa/thiếu
                </p>
              </div>
            </div>
          </div>

          {/* Level Scope Segmented Switch */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                id="btn-scope-thpt"
                onClick={() => setLevelScope('THPT')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  levelScope === 'THPT'
                    ? 'bg-emerald-600 text-white shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                Cấp THPT (Khối 10 - 12)
                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-white/20">
                  Đang xem
                </span>
              </button>
              <button
                id="btn-scope-thcs"
                onClick={() => setLevelScope('THCS')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  levelScope === 'THCS'
                    ? 'bg-emerald-600 text-white shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cấp THCS (Khối 6 - 9)
              </button>
              <button
                id="btn-scope-all"
                onClick={() => setLevelScope('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  levelScope === 'ALL'
                    ? 'bg-emerald-600 text-white shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Toàn trường
              </button>
            </div>
          </div>
        </div>

        {/* View Mode & Week Selection Navigation */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-2">
            <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
              <button
                id="btn-mode-hk1"
                onClick={() => handlePeriodChange('HK1')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                  selectedPeriod === 'HK1'
                    ? 'bg-white text-emerald-900 font-bold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5 text-emerald-600" />
                Tổng hợp Học kỳ 1 (18 tuần)
              </button>
              <button
                id="btn-mode-hk2"
                onClick={() => handlePeriodChange('HK2')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                  selectedPeriod === 'HK2'
                    ? 'bg-white text-blue-900 font-bold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5 text-blue-600" />
                Tổng hợp Học kỳ 2 (17 tuần)
              </button>
              <button
                id="btn-mode-weekly"
                onClick={() => {
                  if (selectedPeriod === 'HK1' || selectedPeriod === 'HK2') {
                    handlePeriodChange(String(selectedWeekNum));
                  } else {
                    setViewMode('WEEKLY_DETAIL');
                  }
                }}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                  viewMode === 'WEEKLY_DETAIL' && !isSemesterView
                    ? 'bg-white text-slate-900 font-bold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-yellow-600" />
                Chi tiết từng tuần (Mẫu Excel)
              </button>
            </div>

            {/* Name format toggle */}
            {viewMode === 'WEEKLY_DETAIL' && (
              <button
                id="btn-toggle-shortname"
                onClick={() => setUseShortName(!useShortName)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
                title="Chuyển đổi giữa Họ và tên đầy đủ và Tên gọi"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span>{useShortName ? 'Xem Họ và tên đầy đủ' : 'Đang hiện: Họ và tên đầy đủ'}</span>
              </button>
            )}
          </div>

          {/* Week Selector Controls */}
          <div className="flex items-center gap-2">
            <button
              id="btn-prev-week"
              onClick={handlePrevWeek}
              disabled={selectedPeriod === 'HK1'}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Tuần trước / Học kỳ trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-700">Chọn tuần / Học kỳ:</span>
              <select
                id="select-active-week"
                value={selectedPeriod}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <optgroup label="Tổng hợp học kỳ">
                  <option value="HK1">Học kỳ 1 (Tuần 1 - Tuần 18)</option>
                  <option value="HK2">Học kỳ 2 (Tuần 19 - Tuần 35)</option>
                </optgroup>
                <optgroup label="Từng tuần (Học kỳ 1: T1 - T18)">
                  {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={String(w)}>
                      Tuần {w} {w === currentWeek ? '(Hiện tại)' : ''}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Từng tuần (Học kỳ 2: T19 - T35)">
                  {Array.from({ length: 17 }, (_, i) => i + 19).map((w) => (
                    <option key={w} value={String(w)}>
                      Tuần {w} {w === currentWeek ? '(Hiện tại)' : ''}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <button
              id="btn-next-week"
              onClick={handleNextWeek}
              disabled={selectedPeriod === 'HK2'}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Tuần sau / Học kỳ sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Export & Print */}
            <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-2">
              <button
                id="btn-export-excel"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Xuất Excel
              </button>

              <button
                id="btn-print-report"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                In
              </button>
            </div>
          </div>
        </div>

        {/* Filter bar: Search, Dept, Status */}
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-teacher"
              type="text"
              placeholder="Tìm theo tên GV, môn, lớp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department filter */}
          <div>
            <select
              id="select-department-filter"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
            >
              <option value="ALL">Tất cả tổ chuyên môn</option>
              {availableDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <select
              id="select-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
            >
              <option value="ALL">Tất cả tình trạng tiết</option>
              <option value="SURPLUS">Thừa tiết (+)</option>
              <option value="EXACT">Đủ định mức (0)</option>
              <option value="DEFICIT">Thiếu tiết (-)</option>
            </select>
          </div>

          {/* Info pill */}
          <div className="flex items-center justify-end text-[11px] text-slate-500 font-medium pr-1">
            <span>
              Định mức: THPT <strong>{config.standardThptPeriods || 17}t</strong>, THCS <strong>{config.standardThcsPeriods || 19}t</strong> (GVCN -4t, Tổ trưởng -3t, Tổ phó -1t, Phổ cập -4t, Con nhỏ -3t)
            </span>
          </div>
        </div>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 print:hidden">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium">
            Số giáo viên ({levelScope})
          </span>
          <div className="text-lg font-bold text-slate-900 mt-0.5">
            {stats.totalTeachers} <span className="text-xs font-normal text-slate-400">GV</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium">
            Tiết thực dạy ({isSemesterView || viewMode === 'MULTI_WEEK' ? `Cả ${semesterName}` : `Tuần ${selectedWeekNum}`})
          </span>
          <div className="text-lg font-bold text-blue-700 mt-0.5">
            {stats.totalTeachingPeriods} <span className="text-xs font-normal text-slate-400">tiết</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium">
            Quy đổi kiêm nhiệm ({isSemesterView || viewMode === 'MULTI_WEEK' ? `Cả ${semesterName}` : `Tuần ${selectedWeekNum}`})
          </span>
          <div className="text-lg font-bold text-indigo-700 mt-0.5">
            {stats.totalReductionPeriods} <span className="text-xs font-normal text-slate-400">tiết</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium">
            Thừa tiết ({isSemesterView || viewMode === 'MULTI_WEEK' ? 'Cả kỳ > 0' : 'Lũy kế > 0'})
          </span>
          <div className="text-lg font-bold text-emerald-600 mt-0.5 flex items-center gap-1">
            {stats.surplusCount} <span className="text-xs font-normal text-slate-400">GV</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium">
            Đủ định mức (= 0)
          </span>
          <div className="text-lg font-bold text-slate-700 mt-0.5">
            {stats.exactCount} <span className="text-xs font-normal text-slate-400">GV</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium">
            Thiếu tiết ({isSemesterView || viewMode === 'MULTI_WEEK' ? 'Cả kỳ < 0' : 'Lũy kế < 0'})
          </span>
          <div className="text-lg font-bold text-amber-600 mt-0.5 flex items-center gap-1">
            {stats.deficitCount} <span className="text-xs font-normal text-slate-400">GV</span>
          </div>
        </div>
      </div>

      {/* KHTN 8 & 9 Curriculum Schedule Note for THCS */}
      {(levelScope === 'THCS' || levelScope === 'ALL') && (
        <div className="space-y-2 print:hidden">
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="font-semibold text-emerald-950 flex items-center gap-2">
                <span>Đặc thù môn Khoa học tự nhiên (KHTN) Khối 8 & Khối 9:</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-200 text-emerald-900">
                  Đã đồng bộ 18 tuần
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Môn KHTN 8 (Lý 24t, Hóa 24t, Sinh 24t) và KHTN 9 (Lý 24t, Hóa 29t, Sinh 19t) được hệ thống tự động tính toán chính xác theo từng tuần và phân môn cụ thể cho từng giáo viên (Cô Phượng, Thầy Văn, Thầy Toàn, Cô Thắm, Cô Hậu, Cô Tài, Cô Giàu, Cô Nhung, Cô Ngân, Cô Hiếu, Cô Phương), đảm bảo tổng số tiết học kỳ 1 và số tiết thực dạy từng tuần khớp 100% với phân công chuyên môn.
              </p>
            </div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-950">
            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="font-semibold text-amber-950 flex items-center gap-2">
                <span>Đặc thù môn Công nghệ (C.Nghệ) Khối 8 & Khối 9 (52 tiết/năm):</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                  Đã đồng bộ 52 tiết/năm
                </span>
              </div>
              <div className="text-[11px] text-amber-900 leading-relaxed space-y-0.5">
                <p>
                  • <strong>Khối 8 (52t/năm - HK1: 26t, HK2: 26t)</strong>: Tuần 1–8 dạy 2 tiết/tuần; Tuần 9–18 dạy 1 tiết/tuần. Phân công: Thầy <strong>Trần Phi Hải</strong> (8A1–8A6, HK1: 156t), Thầy <strong>Phan Văn Tặt</strong> (8A7–8A10, HK1: 104t).
                </p>
                <p>
                  • <strong>Khối 9 (52t/năm - HK1: 18t, HK2: 34t)</strong>: Tuần 1–18 dạy 1 tiết/tuần. Phân công: Cô <strong>Trần Thị Cẩm</strong> (9A1–9A3, HK1: 54t), Cô <strong>Lê Kim Ngân</strong> (9A4–9A6, HK1: 54t), Cô <strong>Nguyễn Thị Ngọc Diễm</strong> (9A7–9A10, HK1: 72t).
                </p>
                <p>
                  • <strong>Điều chỉnh HĐTNHN Khối 8 từ Tuần 4</strong>: Thầy <strong>Thái Văn Tiến</strong> nhận thêm HĐTNHN lớp 8A9, 8A10 (4 tiết/tuần) từ Thầy <strong>Phan Văn Tặt</strong> (Tuần 1–3: Thầy Tặt 27t/w, Thầy Tiến 0t; Tuần 4–8: Thầy Tặt 23t/w, Thầy Tiến 4t/w; Tuần 9–18: Thầy Tặt 19t/w, Thầy Tiến 4t/w).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: WEEKLY DETAIL VIEW (EXCEL TEMPLATE) */}
      {viewMode === 'WEEKLY_DETAIL' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header title for Print */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Bảng Số Tiết Thực Dạy • Tuần {selectedWeekNum} • {levelScope === 'THPT' ? 'Cấp THPT' : levelScope === 'THCS' ? 'Cấp THCS' : 'Toàn trường'}
              </h2>
            </div>
            <div className="text-xs text-slate-500">
              Hiển thị {filteredWorkloads.length} giáo viên
            </div>
          </div>

          <div className="overflow-x-auto">
            {/* The Excel-style Table */}
            <table
              id="actual-teaching-hours-table"
              className="w-full border-collapse text-xs text-slate-800"
              style={{ minWidth: '860px' }}
            >
              <thead>
                <tr className="bg-[#FFFF00] text-black font-bold border-b border-black">
                  <th
                    className="border border-black px-3 py-2 text-center"
                    style={{ width: '150px' }}
                  >
                    Họ và tên GV
                  </th>
                  <th
                    className="border border-black px-3 py-2 text-left"
                    style={{ width: '220px' }}
                  >
                    Lớp dạy
                  </th>
                  <th
                    className="border border-black px-3 py-2 text-left"
                    style={{ width: '280px' }}
                  >
                    Môn dạy
                  </th>
                  <th
                    className="border border-black px-3 py-2 text-center"
                    style={{ width: '85px' }}
                  >
                    Tiết dạy
                  </th>
                  <th
                    className="border border-black px-3 py-2 text-center"
                    style={{ width: '130px' }}
                  >
                    Kiêm nhiệm
                  </th>
                  <th
                    className="border border-black px-3 py-2 text-center"
                    style={{ width: '90px' }}
                  >
                    Tổng tiết
                  </th>
                  <th
                    className="border border-black px-3 py-2 text-center"
                    style={{ width: '140px' }}
                  >
                    Thừa/thiếu tiết đến tuần hiện tại
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkloads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="border border-slate-300 px-4 py-8 text-center text-slate-500"
                    >
                      Không tìm thấy giáo viên nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredWorkloads.map((teacherWorkload) => {
                    const rowCount =
                      teacherWorkload.rows.length > 0
                        ? teacherWorkload.rows.length
                        : 1;
                    const displayName = useShortName
                      ? teacherWorkload.callingName
                      : teacherWorkload.teacherName;

                    const cumBalance = teacherWorkload.cumulativeBalance;
                    const balanceColor =
                      cumBalance > 0
                        ? 'text-emerald-700 font-bold'
                        : cumBalance < 0
                        ? 'text-rose-700 font-bold'
                        : 'text-slate-700 font-bold';

                    const balanceDisplay =
                      cumBalance > 0 ? `+${cumBalance}` : `${cumBalance}`;

                    if (teacherWorkload.rows.length === 0) {
                      return (
                        <tr
                          key={teacherWorkload.teacherId}
                          className="hover:bg-amber-50/50 transition-colors"
                        >
                          <td className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-900 bg-slate-50/40">
                            {displayName}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-slate-400 italic">
                            —
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-slate-400 italic">
                            —
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-center font-medium">
                            0
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-center">
                            {teacherWorkload.duties}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-900">
                            {teacherWorkload.totalPeriods}
                          </td>
                          <td
                            className={`border border-slate-300 px-3 py-2 text-center ${balanceColor}`}
                          >
                            {balanceDisplay}
                          </td>
                        </tr>
                      );
                    }

                    return teacherWorkload.rows.map((subRow, rIdx) => (
                      <tr
                        key={`${teacherWorkload.teacherId}_${rIdx}`}
                        className="hover:bg-amber-50/40 transition-colors"
                      >
                        {/* Column 1: Tên GV (Rowspanned) */}
                        {rIdx === 0 && (
                          <td
                            rowSpan={rowCount}
                            className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-900 bg-slate-50/40 align-middle"
                          >
                            <div className="font-bold text-sm text-slate-900">
                              {displayName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-normal">
                              {teacherWorkload.departmentName}
                            </div>
                          </td>
                        )}

                        {/* Column 2: Lớp dạy */}
                        <td className="border border-slate-300 px-3 py-2 text-left font-medium text-slate-800">
                          {subRow.classes}
                        </td>

                        {/* Column 3: Môn dạy */}
                        <td className="border border-slate-300 px-3 py-2 text-left font-medium text-slate-900">
                          {subRow.subject}
                        </td>

                        {/* Column 4: Tiết dạy */}
                        <td className="border border-slate-300 px-3 py-2 text-center font-semibold text-slate-900">
                          {subRow.periods}
                        </td>

                        {/* Column 5: Kiêm nhiệm (Rowspanned) */}
                        {rIdx === 0 && (
                          <td
                            rowSpan={rowCount}
                            className="border border-slate-300 px-3 py-2 text-center text-slate-800 align-middle font-medium"
                          >
                            {teacherWorkload.duties !== '—' ? (
                              <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-800 font-semibold">
                                {teacherWorkload.duties}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                            {teacherWorkload.reductionPeriods > 0 && (
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                (+{teacherWorkload.reductionPeriods} tiết QĐ)
                              </div>
                            )}
                          </td>
                        )}

                        {/* Column 6: Tổng tiết (Rowspanned) */}
                        {rIdx === 0 && (
                          <td
                            rowSpan={rowCount}
                            className="border border-slate-300 px-3 py-2 text-center font-bold text-base text-slate-900 align-middle bg-slate-50/20"
                          >
                            {teacherWorkload.totalPeriods}
                            <div className="text-[10px] text-slate-500 font-normal">
                              {teacherWorkload.teachingPeriods} dạy +{' '}
                              {teacherWorkload.reductionPeriods} KN
                            </div>
                          </td>
                        )}

                        {/* Column 7: Thừa/thiếu tiết đến tuần hiện tại (Rowspanned) */}
                        {rIdx === 0 && (
                          <td
                            rowSpan={rowCount}
                            className={`border border-slate-300 px-3 py-2 text-center align-middle ${balanceColor}`}
                          >
                            <div className="inline-flex items-center gap-1">
                              <span className="text-sm font-bold">
                                {balanceDisplay}
                              </span>
                              {isAdmin && (
                                <button
                                  onClick={() => {
                                    setAdjustModalTeacher(teacherWorkload);
                                    setAdjustInputVal(
                                      manualAdjustments[
                                        teacherWorkload.teacherId
                                      ] || 0
                                    );
                                  }}
                                  className="text-[10px] text-slate-400 hover:text-slate-700 underline print:hidden ml-1"
                                  title="Ghi nhận tiết bù / dạy thay"
                                >
                                  [±]
                                </button>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-normal">
                              {cumBalance > 0
                                ? 'Thừa tiết'
                                : cumBalance < 0
                                ? 'Thiếu tiết'
                                : 'Đủ chuẩn'}
                            </div>
                          </td>
                        )}
                      </tr>
                    ));
                  })
                )}
              </tbody>

              {/* Table Footer Total Row */}
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900">
                  <td className="border border-slate-300 px-3 py-2.5 text-center">
                    TỔNG CỘNG
                  </td>
                  <td
                    colSpan={2}
                    className="border border-slate-300 px-3 py-2.5 text-left text-slate-700"
                  >
                    {filteredWorkloads.length} giáo viên • Quy đổi kiêm nhiệm: {stats.totalReductionPeriods} tiết
                  </td>
                  <td className="border border-slate-300 px-3 py-2.5 text-center text-blue-800">
                    {stats.totalTeachingPeriods}
                  </td>
                  <td className="border border-slate-300 px-3 py-2.5 text-center text-slate-600">
                    +{stats.totalReductionPeriods}
                  </td>
                  <td className="border border-slate-300 px-3 py-2.5 text-center text-emerald-800 text-base">
                    {stats.totalConvertedPeriods}
                  </td>
                  <td className="border border-slate-300 px-3 py-2.5 text-center text-slate-800">
                    {stats.surplusCount} thừa / {stats.deficitCount} thiếu
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: MULTI-WEEK MATRIX VIEW ("Tổng thể các tuần / Học kỳ") */}
      {viewMode === 'MULTI_WEEK' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Bảng Tổng Hợp Thừa / Thiếu Tiết Dạy • {semesterName.toUpperCase()} ({startWeek === 1 ? 'Tuần 1 - 18' : 'Tuần 19 - 35'}, {totalWeeks} Tuần) • {levelScope === 'THPT' ? 'Cấp THPT' : levelScope === 'THCS' ? 'Cấp THCS' : 'Toàn trường'}
                </h2>
                <div className="text-xs text-slate-500 mt-0.5">
                  Theo dõi số tiết thừa (+) hoặc thiếu (-) theo từng tuần và tổng hợp cả {semesterName}
                </div>
              </div>
            </div>

            {/* Cell Display Mode Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Hiển thị ô tuần:</span>
              <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  id="btn-cell-balance"
                  onClick={() => setCellDisplayMode('BALANCE')}
                  className={`px-2.5 py-1 rounded-md transition-all font-semibold ${
                    cellDisplayMode === 'BALANCE'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Hiển thị độ thừa (+) hoặc thiếu (-) của từng tuần"
                >
                  ± Thừa/Thiếu tuần
                </button>
                <button
                  id="btn-cell-teaching"
                  onClick={() => setCellDisplayMode('TEACHING')}
                  className={`px-2.5 py-1 rounded-md transition-all font-semibold ${
                    cellDisplayMode === 'TEACHING'
                      ? 'bg-white text-blue-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Hiển thị số tiết thực dạy trong tuần"
                >
                  Tiết thực dạy
                </button>
                <button
                  id="btn-cell-total"
                  onClick={() => setCellDisplayMode('TOTAL')}
                  className={`px-2.5 py-1 rounded-md transition-all font-semibold ${
                    cellDisplayMode === 'TOTAL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Hiển thị tổng tiết quy đổi (Dạy + Kiêm nhiệm)"
                >
                  Tổng tiết quy đổi
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table
              id="multi-week-teaching-hours-table"
              className="w-full border-collapse text-xs text-slate-800"
              style={{ minWidth: '1180px' }}
            >
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="border border-slate-300 px-2 py-2 text-center w-10">
                    STT
                  </th>
                  <th className="border border-slate-300 px-3 py-2 text-left w-36">
                    Giáo viên
                  </th>
                  <th className="border border-slate-300 px-3 py-2 text-left w-32">
                    Tổ chuyên môn
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center w-24">
                    Kiêm nhiệm
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center w-14" title="Định mức tiết/tuần">
                    ĐM/T
                  </th>

                  {/* Week Columns for the active semester */}
                  {semesterWeeks.map((w) => (
                    <th
                      key={w}
                      className={`border border-slate-300 px-1 py-2 text-center w-11 text-[11px] ${
                        String(w) === selectedPeriod
                          ? 'bg-yellow-200 text-black font-extrabold'
                          : ''
                      }`}
                    >
                      T{w}
                    </th>
                  ))}

                  <th className="border border-slate-300 px-2 py-2 text-center w-16 bg-blue-50 font-bold text-blue-900" title="Tổng tiết dạy thực tế cả học kỳ">
                    Tổng Dạy
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center w-16 bg-indigo-50 font-bold text-indigo-900" title="Tổng tiết giảm trừ kiêm nhiệm cả học kỳ">
                    Tổng KN
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center w-16 bg-emerald-50 font-bold text-emerald-900" title="Tổng tiết quy đổi cả học kỳ (Dạy + KN)">
                    Tổng QĐ
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center w-16 bg-slate-50" title="Định mức tiết cả học kỳ">
                    ĐM Kỳ
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center w-20 font-bold" title={`Lũy kế đến tuần ${selectedWeekNum}`}>
                    Lũy kế T{selectedWeekNum}
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center w-24 font-extrabold bg-amber-50 text-amber-950" title={`Tổng thừa hoặc thiếu của cả ${semesterName}`}>
                    Thừa/Thiếu {activeSemester}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkloads.map((w, idx) => {
                  const cumBal = w.cumulativeBalance;
                  const cumColor =
                    cumBal > 0
                      ? 'text-emerald-700 font-bold'
                      : cumBal < 0
                      ? 'text-rose-700 font-bold'
                      : 'text-slate-600';

                  const semBal = w.semesterBalance;
                  const semColor =
                    semBal > 0
                      ? 'text-emerald-700'
                      : semBal < 0
                      ? 'text-rose-700'
                      : 'text-slate-600';

                  return (
                    <tr
                      key={w.teacherId}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-500 font-medium">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-300 px-3 py-1.5 font-bold text-slate-900">
                        {w.teacherName}
                        {w.callingName && w.callingName !== w.teacherName && (
                          <span className="text-[10px] text-slate-400 font-normal ml-1">
                            ({w.callingName})
                          </span>
                        )}
                      </td>
                      <td className="border border-slate-300 px-3 py-1.5 text-slate-700">
                        {w.departmentName}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-800">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700">
                          {w.duties}
                        </span>
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-bold text-slate-700">
                        {w.standardPeriods}
                      </td>

                      {/* Week totals / balances */}
                      {semesterWeeks.map((wk) => {
                        const bal =
                          w.weeklyBalances?.[wk] ??
                          ((w.weeklyTotals?.[wk] ?? 0) - w.standardPeriods);
                        const teachingP = w.weeklyTeaching?.[wk] ?? 0;
                        const totalP = w.weeklyTotals?.[wk] ?? 0;

                        return (
                          <td
                            key={wk}
                            className={`border border-slate-300 px-1 py-1 text-center text-[11px] ${
                              String(wk) === selectedPeriod
                                ? 'bg-yellow-100/70 font-bold'
                                : ''
                            }`}
                            title={`Tuần ${wk}: Dạy ${teachingP}t + KN ${w.reductionPeriods}t = ${totalP}t (Định mức: ${w.standardPeriods}t) -> Thừa/thiếu: ${
                              bal > 0 ? `+${bal}` : bal
                            } tiết`}
                          >
                            <div className="flex flex-col items-center justify-center min-h-[30px]">
                              {cellDisplayMode === 'BALANCE' ? (
                                <>
                                  {bal > 0 ? (
                                    <span className="inline-block px-1.5 py-0.5 rounded font-bold text-[11px] text-emerald-800 bg-emerald-100/90">
                                      +{bal}
                                    </span>
                                  ) : bal < 0 ? (
                                    <span className="inline-block px-1.5 py-0.5 rounded font-bold text-[11px] text-rose-800 bg-rose-100/90">
                                      {bal}
                                    </span>
                                  ) : (
                                    <span className="inline-block px-1.5 py-0.5 rounded font-medium text-[11px] text-slate-500 bg-slate-100">
                                      0
                                    </span>
                                  )}
                                  <span className="text-[9px] text-slate-400 font-normal">
                                    {teachingP}t
                                  </span>
                                </>
                              ) : cellDisplayMode === 'TEACHING' ? (
                                <span className="font-semibold text-blue-800">
                                  {teachingP}
                                </span>
                              ) : (
                                <span className="font-semibold text-slate-800">
                                  {totalP}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      <td className="border border-slate-300 px-2 py-1.5 text-center font-bold text-blue-900 bg-blue-50/40">
                        {w.semesterTotalTeaching}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-medium text-indigo-900 bg-indigo-50/40">
                        {w.reductionPeriods * totalWeeks}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-bold text-emerald-900 bg-emerald-50/40">
                        {w.semesterTotalPeriods}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-600 bg-slate-50/40">
                        <span className="font-semibold">{w.semesterRequiredPeriods}</span>
                        <div className="text-[10px] text-slate-400">
                          ({w.standardPeriods}t × {totalWeeks}T)
                        </div>
                      </td>
                      <td
                        className={`border border-slate-300 px-2 py-1.5 text-center ${cumColor}`}
                      >
                        {cumBal > 0 ? `+${cumBal}` : cumBal}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center bg-slate-50/60">
                        <div className={`text-sm font-extrabold ${semColor}`}>
                          {semBal > 0 ? `+${semBal}` : semBal}
                        </div>
                        <div className="text-[10px] font-medium text-slate-500">
                          {semBal > 0
                            ? 'Thừa tiết'
                            : semBal < 0
                            ? 'Thiếu tiết'
                            : 'Đủ chuẩn'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Multi-week table footer summary */}
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900">
                  <td className="border border-slate-300 px-2 py-2 text-center">
                    ∑
                  </td>
                  <td
                    colSpan={4}
                    className="border border-slate-300 px-3 py-2 text-left text-slate-700"
                  >
                    TỔNG CỘNG ({filteredWorkloads.length} giáo viên)
                  </td>

                  {/* Week column sums */}
                  {semesterWeeks.map((wk) => {
                    const totalTeachingThisWeek = filteredWorkloads.reduce(
                      (sum, w) => sum + (w.weeklyTeaching?.[wk] ?? 0),
                      0
                    );
                    const totalBalanceThisWeek = filteredWorkloads.reduce(
                      (sum, w) =>
                        sum +
                        (w.weeklyBalances?.[wk] ??
                          ((w.weeklyTotals?.[wk] ?? 0) - w.standardPeriods)),
                      0
                    );

                    return (
                      <td
                        key={wk}
                        className="border border-slate-300 px-1 py-1.5 text-center text-[11px]"
                      >
                        {cellDisplayMode === 'BALANCE' ? (
                          <span
                            className={`font-bold ${
                              totalBalanceThisWeek > 0
                                ? 'text-emerald-700'
                                : totalBalanceThisWeek < 0
                                ? 'text-rose-700'
                                : 'text-slate-600'
                            }`}
                          >
                            {totalBalanceThisWeek > 0
                              ? `+${totalBalanceThisWeek}`
                              : totalBalanceThisWeek}
                          </span>
                        ) : (
                          <span className="font-bold text-blue-900">
                            {totalTeachingThisWeek}
                          </span>
                        )}
                      </td>
                    );
                  })}

                  <td className="border border-slate-300 px-2 py-2 text-center font-bold text-blue-900 bg-blue-100/50">
                    {filteredWorkloads.reduce((sum, w) => sum + w.semesterTotalTeaching, 0)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center font-bold text-indigo-900 bg-indigo-100/50">
                    {filteredWorkloads.reduce((sum, w) => sum + w.reductionPeriods * totalWeeks, 0)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center font-bold text-emerald-900 bg-emerald-100/50">
                    {filteredWorkloads.reduce((sum, w) => sum + w.semesterTotalPeriods, 0)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-700 bg-slate-100">
                    {filteredWorkloads.reduce((sum, w) => sum + w.semesterRequiredPeriods, 0)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-800">
                    {stats.surplusCount} thừa / {stats.deficitCount} thiếu
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center font-extrabold bg-amber-100/60 text-slate-900">
                    {(() => {
                      const netSem = filteredWorkloads.reduce(
                        (sum, w) => sum + w.semesterBalance,
                        0
                      );
                      return netSem > 0 ? `+${netSem}` : netSem;
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Manual Adjustment / Compensation Modal */}
      {adjustModalTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Ghi nhận tiết bù / dạy thay
              </h3>
              <button
                onClick={() => setAdjustModalTeacher(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Điều chỉnh số tiết chênh lệch lũy kế cho giáo viên{' '}
              <strong className="text-slate-900">
                {adjustModalTeacher.teacherName}
              </strong>{' '}
              ({adjustModalTeacher.callingName}) do dạy thay, bồi dưỡng học sinh
              giỏi hoặc bù tiết.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số tiết điều chỉnh (+ hoặc -):
                </label>
                <input
                  type="number"
                  value={adjustInputVal}
                  onChange={(e) => setAdjustInputVal(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Ví dụ: nhập +2 để cộng 2 tiết thừa, nhập -1 để trừ 1 tiết.
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setAdjustModalTeacher(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() =>
                  handleSaveAdjustment(
                    adjustModalTeacher.teacherId,
                    adjustInputVal
                  )
                }
                className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-slate-900 text-xs font-bold shadow-sm transition-colors"
              >
                Lưu điều chỉnh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
