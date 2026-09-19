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
  // Semester weeks
  const isHK1 = (config.semester || 'HK1') === 'HK1';
  const totalWeeks = isHK1 ? 18 : 17;
  const weekList = useMemo(() => {
    const list: number[] = [];
    const start = isHK1 ? 1 : 19;
    const end = isHK1 ? 18 : 35;
    for (let w = start; w <= end; w++) {
      list.push(w);
    }
    return list;
  }, [isHK1]);

  // Selected week (default to currentWeek or 1)
  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    return currentWeek >= 1 && currentWeek <= (isHK1 ? 18 : 35)
      ? currentWeek
      : isHK1
      ? 1
      : 19;
  });

  // Level scope - defaults to 'THPT' as explicitly instructed by user
  const [levelScope, setLevelScope] = useState<LevelScope>('THPT');

  // View mode: Weekly Detail (Excel Template) vs Multi-week Overview
  const [viewMode, setViewMode] = useState<ViewMode>('WEEKLY_DETAIL');

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

  // Sync selectedWeek if currentWeek prop changes externally
  useEffect(() => {
    if (currentWeek >= 1 && currentWeek <= (isHK1 ? 18 : 35)) {
      setSelectedWeek(currentWeek);
    }
  }, [currentWeek, isHK1]);

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
      selectedWeek,
      teachers,
      departments,
      classes,
      subjects,
      config,
      weeklyTimetables,
      timetable,
      totalWeeks,
      manualAdjustments
    );
  }, [
    selectedWeek,
    teachers,
    departments,
    classes,
    subjects,
    config,
    weeklyTimetables,
    timetable,
    totalWeeks,
    manualAdjustments,
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
    const totalTeachingPeriods = list.reduce(
      (sum, w) => sum + w.teachingPeriods,
      0
    );
    const totalReductionPeriods = list.reduce(
      (sum, w) => sum + w.reductionPeriods,
      0
    );
    const totalConvertedPeriods = list.reduce(
      (sum, w) => sum + w.totalPeriods,
      0
    );
    const surplusCount = list.filter((w) => w.cumulativeBalance > 0).length;
    const exactCount = list.filter((w) => w.cumulativeBalance === 0).length;
    const deficitCount = list.filter((w) => w.cumulativeBalance < 0).length;

    return {
      totalTeachers,
      totalTeachingPeriods,
      totalReductionPeriods,
      totalConvertedPeriods,
      surplusCount,
      exactCount,
      deficitCount,
    };
  }, [filteredWorkloads]);

  // Handle previous / next week
  const handlePrevWeek = () => {
    const idx = weekList.indexOf(selectedWeek);
    if (idx > 0) setSelectedWeek(weekList[idx - 1]);
  };

  const handleNextWeek = () => {
    const idx = weekList.indexOf(selectedWeek);
    if (idx < weekList.length - 1) setSelectedWeek(weekList[idx + 1]);
  };

  // Export handlers
  const handleExportExcel = () => {
    if (viewMode === 'WEEKLY_DETAIL') {
      exportActualWeeklyExcel(
        selectedWeek,
        filteredWorkloads,
        config,
        useShortName
      );
    } else {
      exportActualMultiWeekExcel(filteredWorkloads, totalWeeks, config);
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
                id="btn-mode-weekly"
                onClick={() => setViewMode('WEEKLY_DETAIL')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                  viewMode === 'WEEKLY_DETAIL'
                    ? 'bg-white text-slate-900 font-bold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-yellow-600" />
                Chi tiết theo tuần (Mẫu Excel)
              </button>
              <button
                id="btn-mode-multi"
                onClick={() => setViewMode('MULTI_WEEK')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                  viewMode === 'MULTI_WEEK'
                    ? 'bg-white text-slate-900 font-bold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5 text-blue-600" />
                Tổng thể các tuần ({totalWeeks} tuần)
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
              disabled={selectedWeek === weekList[0]}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Tuần trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-700">Tuần:</span>
              <select
                id="select-active-week"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {weekList.map((w) => (
                  <option key={w} value={w}>
                    Tuần {w} {w === currentWeek ? '(Hiện tại)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              id="btn-next-week"
              onClick={handleNextWeek}
              disabled={selectedWeek === weekList[weekList.length - 1]}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Tuần sau"
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
              Định mức THPT: <strong>{config.standardThptPeriods || 17}t/tuần</strong> (GVCN -4t, Tổ trưởng -3t)
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
            Tiết thực dạy (Tuần {selectedWeek})
          </span>
          <div className="text-lg font-bold text-blue-700 mt-0.5">
            {stats.totalTeachingPeriods} <span className="text-xs font-normal text-slate-400">tiết</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium">
            Quy đổi kiêm nhiệm
          </span>
          <div className="text-lg font-bold text-indigo-700 mt-0.5">
            {stats.totalReductionPeriods} <span className="text-xs font-normal text-slate-400">tiết</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium">
            Thừa tiết (Lũy kế {'>'} 0)
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
            Thiếu tiết (Lũy kế {'<'} 0)
          </span>
          <div className="text-lg font-bold text-amber-600 mt-0.5 flex items-center gap-1">
            {stats.deficitCount} <span className="text-xs font-normal text-slate-400">GV</span>
          </div>
        </div>
      </div>

      {/* VIEW 1: WEEKLY DETAIL VIEW (EXCEL TEMPLATE) */}
      {viewMode === 'WEEKLY_DETAIL' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header title for Print */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Bảng Số Tiết Thực Dạy • Tuần {selectedWeek} • {levelScope === 'THPT' ? 'Cấp THPT' : levelScope === 'THCS' ? 'Cấp THCS' : 'Toàn trường'}
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

      {/* VIEW 2: MULTI-WEEK MATRIX VIEW ("Tổng thể các tuần") */}
      {viewMode === 'MULTI_WEEK' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Bảng Tổng Thể Các Tuần • {config.semester || 'HK1'} ({totalWeeks} Tuần) • {levelScope === 'THPT' ? 'Cấp THPT' : levelScope === 'THCS' ? 'Cấp THCS' : 'Toàn trường'}
              </h2>
            </div>
            <div className="text-xs text-slate-500">
              Theo dõi sự biến động tiết dạy qua từng tuần
            </div>
          </div>

          <div className="overflow-x-auto">
            <table
              id="multi-week-teaching-hours-table"
              className="w-full border-collapse text-xs text-slate-800"
              style={{ minWidth: '1100px' }}
            >
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="border border-slate-300 px-2 py-2 text-center w-10">
                    STT
                  </th>
                  <th className="border border-slate-300 px-3 py-2 text-left w-36">
                    Giáo viên
                  </th>
                  <th className="border border-slate-300 px-3 py-2 text-left w-36">
                    Tổ chuyên môn
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center w-24">
                    Kiêm nhiệm
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center w-14">
                    ĐM/T
                  </th>

                  {/* Week Columns: T1 to T18 */}
                  {weekList.map((w) => (
                    <th
                      key={w}
                      className={`border border-slate-300 px-1 py-2 text-center w-10 text-[11px] ${
                        w === selectedWeek
                          ? 'bg-yellow-200 text-black font-extrabold'
                          : ''
                      }`}
                    >
                      T{w}
                    </th>
                  ))}

                  <th className="border border-slate-300 px-2 py-2 text-center w-16 bg-blue-50 font-bold text-blue-900">
                    Tổng Dạy
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center w-16 bg-indigo-50 font-bold text-indigo-900">
                    Tổng KN
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center w-16 bg-emerald-50 font-bold text-emerald-900">
                    Tổng QĐ
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center w-16 bg-slate-50">
                    ĐM Kỳ
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center w-20 font-bold">
                    Lũy kế T{selectedWeek}
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center w-20 font-bold">
                    Thừa/Thiếu Kỳ
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
                      ? 'text-emerald-700 font-bold'
                      : semBal < 0
                      ? 'text-rose-700 font-bold'
                      : 'text-slate-600';

                  return (
                    <tr
                      key={w.teacherId}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-500 font-medium">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-300 px-3 py-1.5 font-bold text-slate-900">
                        {w.teacherName}
                      </td>
                      <td className="border border-slate-300 px-3 py-1.5 text-slate-700">
                        {w.departmentName}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-800">
                        {w.duties}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold text-slate-700">
                        {w.standardPeriods}
                      </td>

                      {/* Week totals */}
                      {weekList.map((wk) => {
                        const totalW = w.weeklyTotals[wk] ?? 0;
                        const diff = totalW - w.standardPeriods;
                        const cellColor =
                          totalW === 0
                            ? 'text-slate-300'
                            : diff > 0
                            ? 'text-emerald-700 font-bold'
                            : diff < 0
                            ? 'text-amber-700 font-semibold'
                            : 'text-slate-800';

                        return (
                          <td
                            key={wk}
                            className={`border border-slate-300 px-1 py-1.5 text-center text-[11px] ${cellColor} ${
                              wk === selectedWeek ? 'bg-yellow-50 font-bold' : ''
                            }`}
                          >
                            {totalW}
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
                        {w.semesterRequiredPeriods}
                      </td>
                      <td
                        className={`border border-slate-300 px-2 py-1.5 text-center ${cumColor}`}
                      >
                        {cumBal > 0 ? `+${cumBal}` : cumBal}
                      </td>
                      <td
                        className={`border border-slate-300 px-2 py-1.5 text-center ${semColor}`}
                      >
                        {semBal > 0 ? `+${semBal}` : semBal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
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
