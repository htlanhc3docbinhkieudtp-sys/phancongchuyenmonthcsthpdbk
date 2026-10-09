import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  Search,
  Building,
  Clock,
  Layers,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Scale,
  Calendar,
  Eye,
  Check,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  Printer
} from 'lucide-react';
import { TimetableSlot, Teacher, ClassGroup, Subject, SchoolConfig, SchoolTimetable } from '../types';
import {
  analyzeTimetableQuality,
  analyzeMultiWeekDaysOff,
  analyzeSemesterQuality,
  exportTimetableQualityReportExcel,
  exportSemesterQualityReportExcel,
  isSchoolLeader,
  TeacherQualityMetric,
  TeacherSemesterQualityMetric,
  SemesterQualitySummary,
  QualityTier
} from '../utils/timetableQualityHelper';

interface TimetableQualityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  currentWeek: number;
  onSelectWeek?: (week: number) => void;
  weeklyTimetables?: Record<number, SchoolTimetable>;
  activeSlots: TimetableSlot[];
  teachers: Teacher[];
  classes: ClassGroup[];
  subjects: Subject[];
  assignments?: any[];
  config: SchoolConfig;
  onNavigateToTeacherSchedule?: (teacherId: string) => void;
}

export const TimetableQualityAuditModal: React.FC<TimetableQualityAuditModalProps> = ({
  isOpen,
  onClose,
  isAdmin = false,
  currentWeek,
  onSelectWeek,
  weeklyTimetables = {},
  activeSlots,
  teachers,
  classes,
  subjects,
  assignments,
  config,
  onNavigateToTeacherSchedule
}) => {
  const [auditScope, setAuditScope] = useState<'WEEK' | 'HK1' | 'HK2' | 'ALL_YEAR'>('WEEK');
  const [selectedAuditWeek, setSelectedAuditWeek] = useState<number>(currentWeek);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'BALANCING' | 'ALL_TEACHERS' | 'DEPARTMENTS' | 'DAYS_OFF_AUDIT' | 'ADMIN_REPORT'>('OVERVIEW');
  const [printFontSize, setPrintFontSize] = useState<'6.8pt' | '7.2pt' | '7.8pt' | '8.5pt'>('7.2pt');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('ALL');
  const [selectedWorkloadFilter, setSelectedWorkloadFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LIGHT'>('ALL');
  const [daysOffFilter, setDaysOffFilter] = useState<'ALL' | 'ALWAYS_MONDAY_OFF' | 'ALWAYS_SATURDAY_OFF' | 'ALWAYS_BOTH_OFF' | 'NEVER_OFF'>('ALL');
  const [selectedTeacherDetail, setSelectedTeacherDetail] = useState<TeacherQualityMetric | TeacherSemesterQualityMetric | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Synchronize with external week when opened
  React.useEffect(() => {
    setSelectedAuditWeek(currentWeek);
  }, [currentWeek, isOpen]);

  // Determine which slots to analyze for the selected audit week
  const slotsToAnalyze = useMemo(() => {
    if (weeklyTimetables[selectedAuditWeek]?.slots && weeklyTimetables[selectedAuditWeek].slots.length > 0) {
      return weeklyTimetables[selectedAuditWeek].slots;
    }
    if (selectedAuditWeek === currentWeek && activeSlots.length > 0) {
      return activeSlots;
    }
    if (weeklyTimetables[1]?.slots && weeklyTimetables[1].slots.length > 0) {
      return weeklyTimetables[1].slots;
    }
    return activeSlots;
  }, [selectedAuditWeek, currentWeek, weeklyTimetables, activeSlots]);

  // Run full quality analysis for single week
  const weeklySummary = useMemo(() => {
    return analyzeTimetableQuality(
      slotsToAnalyze,
      teachers,
      classes,
      subjects,
      selectedAuditWeek
    );
  }, [slotsToAnalyze, teachers, classes, subjects, selectedAuditWeek]);

  // Run semester quality analysis for HK1 / HK2 / ALL_YEAR
  const semesterSummary: SemesterQualitySummary = useMemo(() => {
    const scope = auditScope === 'WEEK' ? 'HK1' : auditScope;
    return analyzeSemesterQuality(
      weeklyTimetables,
      teachers,
      classes,
      subjects,
      scope
    );
  }, [weeklyTimetables, teachers, classes, subjects, auditScope]);

  // Multi-week days off analysis (Weeks 1 to 6)
  const multiWeekSummary = useMemo(() => {
    return analyzeMultiWeekDaysOff(
      weeklyTimetables,
      teachers,
      classes,
      subjects,
      [1, 2, 3, 4, 5, 6]
    );
  }, [weeklyTimetables, teachers, classes, subjects]);

  // Filtered days off records
  const filteredDaysOffRecords = useMemo(() => {
    return multiWeekSummary.records.filter(r => {
      // Exclude school leaders completely
      const teacherObj = teachers.find(t => t.id === r.teacherId);
      if (teacherObj && isSchoolLeader(teacherObj)) return false;
      if (daysOffFilter === 'ALWAYS_MONDAY_OFF' && r.streakPattern !== 'ALWAYS_MONDAY_OFF' && r.streakPattern !== 'ALWAYS_BOTH_OFF') return false;
      if (daysOffFilter === 'ALWAYS_SATURDAY_OFF' && r.streakPattern !== 'ALWAYS_SATURDAY_OFF' && r.streakPattern !== 'ALWAYS_BOTH_OFF') return false;
      if (daysOffFilter === 'ALWAYS_BOTH_OFF' && r.streakPattern !== 'ALWAYS_BOTH_OFF') return false;
      if (daysOffFilter === 'NEVER_OFF' && r.streakPattern !== 'NEVER_OFF') return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        if (!r.teacherName.toLowerCase().includes(q) && !r.teacherCode.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [multiWeekSummary.records, daysOffFilter, searchTerm, teachers]);

  // Filtered teachers list for Tab ALL_TEACHERS (Weekly)
  const filteredWeeklyTeachers = useMemo(() => {
    return weeklySummary.allTeachers.filter(t => {
      // Exclude school leaders completely
      const teacherObj = teachers.find(tch => tch.id === t.teacherId);
      if (teacherObj && isSchoolLeader(teacherObj)) return false;
      if (selectedDeptFilter !== 'ALL' && t.departmentId !== selectedDeptFilter) return false;
      if (selectedTierFilter !== 'ALL' && t.tier !== selectedTierFilter) return false;
      if (selectedWorkloadFilter === 'HIGH' && t.totalPeriods < 20) return false;
      if (selectedWorkloadFilter === 'MEDIUM' && (t.totalPeriods < 15 || t.totalPeriods >= 20)) return false;
      if (selectedWorkloadFilter === 'LIGHT' && t.totalPeriods >= 15) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchName = t.teacherName.toLowerCase().includes(query);
        const matchCode = t.teacherCode.toLowerCase().includes(query);
        const matchSub = t.mainSubjectName.toLowerCase().includes(query);
        if (!matchName && !matchCode && !matchSub) return false;
      }
      return true;
    }).sort((a, b) => {
      // 1/ TIÊU CHÍ VÀNG CỐT LÕI (CHỈ ĐẠO BGH): Tỷ lệ số tiết thực dạy / số buổi đi dạy (Không tính kiêm nhiệm): từ CAO xuống THẤP
      if (b.periodsPerSession !== a.periodsPerSession) return b.periodsPerSession - a.periodsPerSession;
      // 2/ Số ngày nghỉ (trọn ngày) từ CAO xuống THẤP
      if (b.freeDays !== a.freeDays) return b.freeDays - a.freeDays;
      // 3/ Số buổi nghỉ từ CAO xuống THẤP
      if (b.freeHalfDays !== a.freeHalfDays) return b.freeHalfDays - a.freeHalfDays;
      // 4/ Số tiết lủng từ THẤP lên CAO (ít lủng hơn xếp trước)
      if (a.totalGaps !== b.totalGaps) return a.totalGaps - b.totalGaps;
      return b.totalPeriods - a.totalPeriods;
    });
  }, [weeklySummary.allTeachers, selectedDeptFilter, selectedTierFilter, selectedWorkloadFilter, searchTerm, teachers]);

  // Filtered teachers list for Tab ALL_TEACHERS (Semester)
  const filteredSemesterTeachers = useMemo(() => {
    return semesterSummary.allTeachers.filter(t => {
      // Exclude school leaders completely
      const teacherObj = teachers.find(tch => tch.id === t.teacherId);
      if (teacherObj && isSchoolLeader(teacherObj)) return false;
      if (selectedDeptFilter !== 'ALL' && t.departmentId !== selectedDeptFilter) return false;
      if (selectedTierFilter === 'EXCELLENT' && t.overallStatus !== 'EXCELLENT') return false;
      if (selectedTierFilter === 'GOOD' && t.overallStatus !== 'GOOD') return false;
      if (selectedTierFilter === 'AVERAGE' && t.overallStatus !== 'AVERAGE') return false;
      if (selectedTierFilter === 'POOR' && t.overallStatus !== 'FREQUENTLY_BAD') return false;
      if (selectedWorkloadFilter === 'HIGH' && t.avgPeriodsPerWeek < 20) return false;
      if (selectedWorkloadFilter === 'MEDIUM' && (t.avgPeriodsPerWeek < 15 || t.avgPeriodsPerWeek >= 20)) return false;
      if (selectedWorkloadFilter === 'LIGHT' && t.avgPeriodsPerWeek >= 15) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchName = t.teacherName.toLowerCase().includes(query);
        const matchCode = t.teacherCode.toLowerCase().includes(query);
        const matchSub = t.mainSubjectName.toLowerCase().includes(query);
        if (!matchName && !matchCode && !matchSub) return false;
      }
      return true;
    }).sort((a, b) => {
      // 1/ TIÊU CHÍ VÀNG CỐT LÕI (CHỈ ĐẠO BGH): Tỷ lệ số tiết thực dạy TB / số buổi đi dạy TB: từ CAO xuống THẤP
      if (b.periodsPerSession !== a.periodsPerSession) return b.periodsPerSession - a.periodsPerSession;
      // 2/ Số ngày nghỉ TB/tuần từ CAO xuống THẤP
      if (b.avgFreeDaysPerWeek !== a.avgFreeDaysPerWeek) return b.avgFreeDaysPerWeek - a.avgFreeDaysPerWeek;
      // 3/ Số buổi nghỉ TB/tuần từ CAO xuống THẤP
      if (b.avgFreeHalfDaysPerWeek !== a.avgFreeHalfDaysPerWeek) return b.avgFreeHalfDaysPerWeek - a.avgFreeHalfDaysPerWeek;
      // 4/ Số tiết lủng từ THẤP lên CAO (ít lủng hơn xếp trước)
      if (a.totalGaps !== b.totalGaps) return a.totalGaps - b.totalGaps;
      return b.avgPeriodsPerWeek - a.avgPeriodsPerWeek;
    });
  }, [semesterSummary.allTeachers, selectedDeptFilter, selectedTierFilter, selectedWorkloadFilter, searchTerm, teachers]);

  // Frequently bad teachers list for Tab BALANCING (Những người có TKB xấu nhất cần cân đối: Tỷ lệ tiết/buổi thấp nhất)
  const balancingList = useMemo(() => {
    if (auditScope === 'WEEK') {
      return weeklySummary.allTeachers
        .filter(t => {
          const teacherObj = teachers.find(tch => tch.id === t.teacherId);
          if (teacherObj && isSchoolLeader(teacherObj)) return false;
          // Tuyệt đối không xếp là xấu nếu đạt tỷ lệ cao (>= 3.4 tiết/buổi) và ít tiết lủng (<= 1)
          if (t.periodsPerSession >= 3.4 && t.totalGaps <= 1) return false;
          // Thực sự bị xấu: Tỷ lệ thấp < 2.5 tiết/buổi HOẶC 0 ngày nghỉ HOẶC dính >= 3 tiết lủng HOẶC điểm < 55
          return t.periodsPerSession < 2.5 || t.freeDays === 0 || (t.freeDays <= 1 && t.freeHalfDays <= 4) || t.totalGaps >= 3 || t.score < 55;
        })
        .sort((a, b) => {
          // Xếp người bị xấu nhất lên đầu: 1. Tỷ lệ Tiết/Buổi thấp nhất (dàn trải nhất) -> 2. Ít ngày nghỉ nhất -> 3. Nhiều tiết lủng nhất
          if (a.periodsPerSession !== b.periodsPerSession) return a.periodsPerSession - b.periodsPerSession;
          if (a.freeDays !== b.freeDays) return a.freeDays - b.freeDays;
          if (a.freeHalfDays !== b.freeHalfDays) return a.freeHalfDays - b.freeHalfDays;
          return b.totalGaps - a.totalGaps;
        });
    } else {
      return semesterSummary.allTeachers
        .filter(t => {
          const teacherObj = teachers.find(tch => tch.id === t.teacherId);
          if (teacherObj && isSchoolLeader(teacherObj)) return false;
          // Tuyệt đối không xếp là xấu nếu đạt tỷ lệ cao và ít tiết lủng
          if (t.periodsPerSession >= 3.4 && t.totalGaps <= 2) return false;
          return t.isFrequentlyBad || t.periodsPerSession < 2.5 || t.avgFreeDaysPerWeek < 1.0 || t.avgGapsPerWeek >= 2.0;
        })
        .sort((a, b) => {
          // Xếp người bị xấu nhất lên đầu: 1. Tỷ lệ Tiết/Buổi TB thấp nhất -> 2. Ít ngày nghỉ TB -> 3. Nhiều tiết lủng
          if (a.periodsPerSession !== b.periodsPerSession) return a.periodsPerSession - b.periodsPerSession;
          if (a.avgFreeDaysPerWeek !== b.avgFreeDaysPerWeek) return a.avgFreeDaysPerWeek - b.avgFreeDaysPerWeek;
          return b.totalGaps - a.totalGaps;
        });
    }
  }, [auditScope, weeklySummary.allTeachers, semesterSummary.allTeachers, teachers]);

  if (!isOpen || !isAdmin) return null;

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      if (auditScope === 'WEEK') {
        await exportTimetableQualityReportExcel(weeklySummary, config.academicYear || '2026 - 2027');
      } else {
        await exportSemesterQualityReportExcel(semesterSummary, config.academicYear || '2026 - 2027');
      }
    } catch (err) {
      console.error('Lỗi xuất file Excel:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleViewTeacherTkb = (teacherId: string) => {
    if (onNavigateToTeacherSchedule) {
      onNavigateToTeacherSchedule(teacherId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 print:static print:p-0 print:m-0 print:bg-transparent print:backdrop-blur-none print:block">
      <div className="bg-white w-full max-w-7xl max-h-[94vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden print:max-w-none print:max-h-none print:rounded-none print:shadow-none print:border-none print:overflow-visible">
        
        {/* 1. Modal Header with Scope Switcher */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-indigo-600 border border-amber-400/40 rounded-2xl text-white shadow-md">
              <Scale className="w-6 h-6 text-yellow-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                  Đánh Giá Thời Khóa Biểu Tốt - Xấu Giáo Viên
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-600 text-white shadow-xs">
                  Chỉ Quản trị viên
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/30 text-amber-200 border border-amber-400/40">
                  Dựa trên 3 tiêu chí cốt lõi
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Đã loại trừ Ban Giám Hiệu
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {auditScope === 'WEEK' ? `Tuần ${selectedAuditWeek}` : semesterSummary.semesterLabel}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Đánh giá theo: <strong className="text-yellow-300">1. Số ngày nghỉ</strong> • <strong className="text-yellow-300">2. Số buổi nghỉ</strong> • <strong className="text-yellow-300">3. Số tiết bị lủng (trống)</strong>. Đã gắn kèm <strong className="text-cyan-300">Số tiết & Số lớp</strong> để có cái nhìn tổng thể (GV dạy ~27 tiết/tuần ít buổi nghỉ là bình thường).
              </p>
            </div>
          </div>

          {/* Scope Selector & Top Actions */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {/* Scope Switcher: Tuần, HK1, HK2, Cả năm */}
            <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-white/20 gap-1 text-xs">
              <button
                type="button"
                onClick={() => setAuditScope('WEEK')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  auditScope === 'WEEK'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="Xem đánh giá theo từng tuần cụ thể"
              >
                <Calendar className="w-3.5 h-3.5 text-yellow-300" />
                <span>Hàng tuần</span>
              </button>

              <button
                type="button"
                onClick={() => setAuditScope('HK1')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  auditScope === 'HK1'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="Tổng hợp đánh giá toàn bộ Học kỳ 1 (Tuần 1 - 18)"
              >
                <span>Học kỳ 1</span>
              </button>

              <button
                type="button"
                onClick={() => setAuditScope('HK2')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  auditScope === 'HK2'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="Tổng hợp đánh giá toàn bộ Học kỳ 2 (Tuần 19 - 35)"
              >
                <span>Học kỳ 2</span>
              </button>

              <button
                type="button"
                onClick={() => setAuditScope('ALL_YEAR')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  auditScope === 'ALL_YEAR'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="Tổng hợp cả năm học (Tuần 1 - 35)"
              >
                <span>Cả năm</span>
              </button>
            </div>

            {/* Week Dropdown if in WEEK scope */}
            {auditScope === 'WEEK' && (
              <div className="flex items-center gap-1 bg-white/10 border border-white/20 rounded-xl px-2 py-1 text-xs text-white">
                <Clock className="w-3.5 h-3.5 text-yellow-300" />
                <span className="font-bold text-[11px]">Tuần:</span>
                <select
                  value={selectedAuditWeek}
                  onChange={(e) => {
                    const wk = parseInt(e.target.value, 10);
                    setSelectedAuditWeek(wk);
                    if (onSelectWeek) onSelectWeek(wk);
                  }}
                  className="bg-slate-800 text-white font-bold text-xs rounded-lg px-2 py-0.5 border border-white/20 focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w} className="bg-slate-900 text-white">
                      Tuần {w} {weeklyTimetables[w] ? '★' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer active:scale-95"
              title={auditScope === 'WEEK' ? `Xuất Excel đánh giá TKB Tuần ${selectedAuditWeek}` : `Xuất Excel báo cáo đánh giá ${semesterSummary.semesterLabel}`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Xuất Excel</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('ADMIN_REPORT');
                setTimeout(() => {
                  window.print();
                }, 250);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all cursor-pointer active:scale-95"
              title="In hoặc Lưu PDF theo chuẩn văn bản hành chính (Nghị định 30/2020/NĐ-CP)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In / Xuất PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Top Summary: CORE EVALUATION CRITERIA BANNER (Bao gồm Tiêu chí cốt lõi Tiết dạy TB/Buổi) */}
        <div className="bg-slate-50 p-3 sm:p-4 border-b border-slate-200 shrink-0 print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Tiêu chí cốt lõi: Số Tiết Dạy TB / Buổi (Thước đo số 1 TKB Đẹp hay Xấu) */}
            <div className="bg-white p-3 rounded-2xl border-2 border-emerald-400 shadow-sm relative overflow-hidden bg-gradient-to-b from-emerald-50/50 to-white">
              <div className="flex items-center justify-between">
                <span className="text-emerald-950 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-black">⭐</span>
                  Tiết Dạy TB / Buổi
                </span>
                <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-[9.5pt] font-black rounded-md shadow-2xs">
                  Tiêu chí Vàng
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-800">
                  {auditScope === 'WEEK'
                    ? `${weeklySummary.avgPeriodsPerSession.toFixed(2)}`
                    : `${semesterSummary.avgPeriodsPerSession.toFixed(2)}`
                  }
                </span>
                <span className="text-xs text-slate-600 font-bold">tiết/buổi</span>
              </div>
              <div className="text-[10.5px] text-slate-600 mt-1 flex flex-col gap-0.5 leading-tight">
                <div className="flex items-center justify-between">
                  <span>Rất đẹp: <strong className="text-emerald-700 font-extrabold">&ge; 3.5 - 4.5</strong></span>
                  <span>Bị xấu: <strong className="text-rose-600 font-extrabold">&lt; 2.5 t/b</strong></span>
                </div>
                <span className="text-[9.5px] text-slate-400 italic">Tính từ tiết thực tế TKB (không tính kiêm nhiệm)</span>
              </div>
            </div>

            {/* Criteria 1: Số Ngày Nghỉ */}
            <div className="bg-white p-3 rounded-2xl border-2 border-emerald-200 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-emerald-800 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-black">1</span>
                  Số Ngày Được Nghỉ
                </span>
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md">
                  Thứ 2 &rarr; Thứ 7
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-700">
                  {auditScope === 'WEEK'
                    ? `${(weeklySummary.allTeachers.reduce((s, t) => s + t.freeDays, 0) / (weeklySummary.totalTeachersTeaching || 1)).toFixed(1)} ngày`
                    : `${(semesterSummary.allTeachers.reduce((s, t) => s + t.avgFreeDaysPerWeek, 0) / (semesterSummary.totalTeachers || 1)).toFixed(1)} ngày/tuần`
                  }
                </span>
                <span className="text-xs text-slate-500 font-semibold">trung bình</span>
              </div>
              <div className="text-[11px] text-slate-600 mt-1 flex items-center justify-between">
                <span>Nhiều nhất: <strong className="text-emerald-700">3 - 4 ngày</strong></span>
                <span>Ít nhất: <strong className="text-rose-600">0 - 1 ngày</strong></span>
              </div>
            </div>

            {/* Criteria 2: Số Buổi Nghỉ */}
            <div className="bg-white p-3 rounded-2xl border-2 border-blue-200 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-blue-800 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-black">2</span>
                  Số Buổi Được Nghỉ
                </span>
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-extrabold rounded-md">
                  Tổng 12 buổi
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-black text-blue-700">
                  {auditScope === 'WEEK'
                    ? `${(weeklySummary.allTeachers.reduce((s, t) => s + t.freeHalfDays, 0) / (weeklySummary.totalTeachersTeaching || 1)).toFixed(1)} buổi`
                    : `${(semesterSummary.allTeachers.reduce((s, t) => s + t.avgFreeHalfDaysPerWeek, 0) / (semesterSummary.totalTeachers || 1)).toFixed(1)} buổi/tuần`
                  }
                </span>
                <span className="text-xs text-slate-500 font-semibold">trung bình</span>
              </div>
              <div className="text-[11px] text-slate-600 mt-1 flex items-center justify-between">
                <span>Nghỉ &ge; 7 buổi: <strong className="text-blue-700 font-bold">Thuận lợi</strong></span>
                <span>Nghỉ &le; 5 buổi: <strong className="text-rose-600 font-bold">Bất tiện</strong></span>
              </div>
            </div>

            {/* Criteria 3: Số Tiết Lủng */}
            <div className="bg-white p-3 rounded-2xl border-2 border-amber-300 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-amber-800 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center font-black">3</span>
                  Số Tiết Bị Lủng ("Trống")
                </span>
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-extrabold rounded-md">
                  Chờ giữa buổi
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-600">
                  {auditScope === 'WEEK'
                    ? `${weeklySummary.totalGapsInSchool} tiết`
                    : `${semesterSummary.totalGapsInSemester} tiết`
                  }
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  {auditScope === 'WEEK' ? 'toàn trường tuần này' : `tổng tích lũy ${semesterSummary.weeksCount} tuần`}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                {auditScope === 'WEEK' ? (
                  <span>Có <strong className="text-amber-800">{weeklySummary.teachersWithGapsCount} giáo viên</strong> bị tiết lủng</span>
                ) : (
                  <span>TB: <strong className="text-amber-800">{(semesterSummary.totalGapsInSemester / (semesterSummary.weeksCount || 1)).toFixed(1)} tiết/tuần</strong></span>
                )}
              </div>
            </div>

            {/* Summary & Balancing Need */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-3 rounded-2xl border-2 border-indigo-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-indigo-900 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Cần Cân Đối Chủ Động
                </span>
                <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[10px] font-extrabold rounded-md animate-pulse">
                  {balancingList.length} GV
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-rose-700">{balancingList.length}</span>
                <span className="text-xs text-slate-600 font-bold">giáo viên bị TKB xấu</span>
              </div>
              <div className="text-[11px] text-slate-600 mt-1 flex items-center justify-between">
                <span>Điểm TB: <strong className="text-indigo-900">{auditScope === 'WEEK' ? weeklySummary.averageScore : semesterSummary.avgScore}/100</strong></span>
                <button
                  onClick={() => setActiveTab('BALANCING')}
                  className="text-[11px] text-indigo-700 hover:text-indigo-900 font-extrabold underline cursor-pointer"
                >
                  Xem gợi ý &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Navigation Tabs */}
        <div className="px-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 overflow-x-auto print:hidden">
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'OVERVIEW'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl font-extrabold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Báo Cáo Tổng Quan & 3 Tiêu Chí
            </button>

            <button
              onClick={() => setActiveTab('BALANCING')}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'BALANCING'
                  ? 'border-rose-600 text-rose-700 bg-rose-50/60 rounded-t-xl font-extrabold'
                  : 'border-transparent text-rose-600 hover:text-rose-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>2. Cân Đối Chủ Động (GV Thường Xuyên Bị Xấu)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-black">
                {balancingList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ALL_TEACHERS')}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'ALL_TEACHERS'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl font-extrabold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>3. Toàn Bộ Giáo Viên</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-extrabold">
                {auditScope === 'WEEK' ? weeklySummary.allTeachers.length : semesterSummary.allTeachers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('DEPARTMENTS')}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'DEPARTMENTS'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl font-extrabold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              4. Theo Tổ Chuyên Môn
            </button>

            <button
              onClick={() => setActiveTab('DAYS_OFF_AUDIT')}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'DAYS_OFF_AUDIT'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl font-extrabold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>5. Kiểm Tra Nghỉ Thứ 2 / Thứ 7</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-900 font-black">
                {multiWeekSummary.alwaysBothOffCount + multiWeekSummary.alwaysSaturdayOffCount + multiWeekSummary.alwaysMondayOffCount} GV
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ADMIN_REPORT')}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'ADMIN_REPORT'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl font-extrabold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-indigo-600" />
              <span>6. Văn Bản Hành Chính (In / PDF)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-extrabold">
                NĐ 30/2020
              </span>
            </button>
          </div>
        </div>

        {/* 4. Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 print:overflow-visible print:p-0 print:m-0 print:space-y-0">
          
          {/* TAB 1: OVERVIEW & COMPARISON */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-4">
              
              {/* Executive Pedagogical Diagnostic Box */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50/60 to-purple-50 border border-blue-200/90 rounded-2xl p-4 text-slate-800 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-blue-600 text-white rounded-xl shrink-0 mt-0.5 shadow-sm">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-tight flex items-center gap-2 flex-wrap">
                        <span>Bộ Tiêu Chí Đánh Giá Thời Khóa Biểu Đẹp Hay Xấu</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-200 text-blue-900">
                          {auditScope === 'WEEK' ? `Dữ liệu Tuần ${selectedAuditWeek}` : semesterSummary.semesterLabel}
                        </span>
                      </h3>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        Hệ thống căn cứ trực tiếp vào <strong>Số tiết dạy trung bình/buổi</strong> (từ số tiết thực tế trên TKB, không tính kiêm nhiệm) kết hợp <strong>3 tiêu chí cơ bản</strong> của giáo viên để phân định TKB Đẹp hay Xấu:
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 pt-1">
                      {/* Tiêu chí cốt lõi: Số tiết dạy trung bình / buổi */}
                      <div className="bg-white/95 p-3 rounded-xl border-2 border-emerald-400 shadow-2xs bg-gradient-to-b from-emerald-50/50 to-white">
                        <div className="font-black text-emerald-950 flex items-center gap-1.5 text-xs">
                          <span className="text-emerald-600 text-sm">⭐</span>
                          Tiêu chí Cốt lõi: Tiết dạy TB/Buổi
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          • Lấy <strong>số tiết thực dạy trên TKB / số buổi đi dạy</strong> (không tính kiêm nhiệm).<br/>
                          • <strong className="text-emerald-700">TKB Đẹp:</strong> &ge; 3.5 - 4.5 tiết/buổi (dạy tập trung, ít buổi lên trường).<br/>
                          • <strong className="text-rose-600">TKB Xấu:</strong> &lt; 2.5 tiết/buổi (bị xé lẻ, mỗi buổi chỉ 1-2 tiết).
                        </p>
                      </div>

                      <div className="bg-white/95 p-3 rounded-xl border-2 border-emerald-200 shadow-2xs">
                        <div className="font-black text-emerald-950 flex items-center gap-1.5 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Tiêu chí 1: Số ngày được nghỉ
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          • Đánh giá số ngày trọn vẹn trong tuần (Thứ 2 &rarr; Thứ 7) không có tiết nào.<br/>
                          • <strong className="text-emerald-700">Tốt:</strong> Nghỉ &ge; 2 - 3 ngày/tuần.<br/>
                          • <strong className="text-rose-600">Xấu:</strong> Nghỉ 0 ngày hoặc chỉ nghỉ 1 ngày dù định mức tiết ít (12 - 16 tiết).
                        </p>
                      </div>

                      <div className="bg-white/95 p-3 rounded-xl border-2 border-blue-200 shadow-2xs">
                        <div className="font-black text-blue-950 flex items-center gap-1.5 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          Tiêu chí 2: Số buổi được nghỉ
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          • Đánh giá số buổi trọn vẹn (trong tổng 12 buổi sáng/chiều) không phải lên trường.<br/>
                          • <strong className="text-blue-700">Tốt:</strong> Nghỉ &ge; 7 - 9 buổi.<br/>
                          • <strong className="text-rose-600">Xấu:</strong> Nghỉ &le; 5 buổi do phải dạy cả sáng lẫn chiều hoặc có buổi chỉ dạy 1 tiết đơn độc.
                        </p>
                      </div>

                      <div className="bg-white/95 p-3 rounded-xl border-2 border-amber-300 shadow-2xs">
                        <div className="font-black text-amber-950 flex items-center gap-1.5 text-xs">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          Tiêu chí 3: Số tiết bị lủng ("trống")
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          • Đánh giá số tiết trống chờ đợi giữa các tiết trong cùng một buổi dạy.<br/>
                          • <strong className="text-emerald-700">Tốt:</strong> 0 tiết lủng (xếp liền mạch khối).<br/>
                          • <strong className="text-rose-600">Xấu:</strong> Bị lủng từ 2 - 5+ tiết trong tuần (ngồi chờ 1-2 tiết giữa buổi).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Side-by-side Top Convenient vs Top Inconvenient */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* Column 1: Top Convenient ("Đẹp") */}
                <div className="bg-white rounded-2xl border border-emerald-200 shadow-2xs overflow-hidden flex flex-col">
                  <div className="p-3.5 bg-emerald-50/80 border-b border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                      <h4 className="font-extrabold text-xs text-emerald-950 uppercase tracking-tight">
                        Top Giáo Viên Có TKB Tốt Nhất ("Đẹp")
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Nghỉ nhiều, 0 tiết lủng
                    </span>
                  </div>

                  <div className="p-2 divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[380px]">
                    {(auditScope === 'WEEK' ? weeklySummary.topConvenientTeachers : semesterSummary.allTeachers.filter(t => t.avgScore >= 80).slice(0, 10)).map((t: any, idx) => (
                      <div key={t.teacherId} className="p-2.5 hover:bg-emerald-50/30 transition-colors flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{t.teacherName}</span>
                              <span className="text-[10px] font-normal text-slate-500">({t.mainSubjectName})</span>
                            </div>
                            <div className="text-[10px] text-slate-600 mt-0.5 flex flex-wrap items-center gap-2">
                              <span className="font-extrabold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {auditScope === 'WEEK' ? `${t.totalPeriods} tiết` : `${t.avgPeriodsPerWeek} tiết/T`} • {t.assignedClassesCount} lớp
                              </span>
                              <span className="font-black text-emerald-900 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-300" title="Tiêu chí vàng: Số tiết thực dạy trên TKB / Số buổi đi dạy (Không tính kiêm nhiệm)">
                                ⭐ {t.periodsPerSession.toFixed(2)} tiết/buổi
                              </span>
                              {t.assignedClassesList?.length > 0 && (
                                <span className="text-[10px] text-slate-500 max-w-[140px] truncate" title={t.assignedClassesList.join(', ')}>
                                  ({t.assignedClassesList.join(', ')})
                                </span>
                              )}
                              <span>•</span>
                              <span className="text-emerald-700 font-bold">
                                {auditScope === 'WEEK' ? `Nghỉ ${t.freeDays} ngày` : `Nghỉ ${t.avgFreeDaysPerWeek} ngày/T`}
                              </span>
                              <span>•</span>
                              <span className="text-blue-700 font-bold">
                                {auditScope === 'WEEK' ? `Nghỉ ${t.freeHalfDays} buổi` : `Nghỉ ${t.avgFreeHalfDaysPerWeek} buổi/T`}
                              </span>
                              <span>•</span>
                              <span className="text-amber-800 font-bold">
                                {auditScope === 'WEEK' ? `${t.totalGaps} tiết lủng` : `Tổng ${t.totalGaps} lủng`}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-black text-emerald-700 text-xs">{auditScope === 'WEEK' ? t.score : t.avgScore}đ</span>
                          <button
                            onClick={() => handleViewTeacherTkb(t.teacherId)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                            title="Xem chi tiết TKB của GV"
                          >
                            Xem TKB
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 italic">
                    Đặc điểm: Tiết được xếp tập trung theo khối liền mạch (0 tiết lủng), số ngày nghỉ nhiều (2 - 4 ngày).
                  </div>
                </div>

                {/* Column 2: Top Inconvenient ("Cần tối ưu / Xấu") */}
                <div className="bg-white rounded-2xl border border-rose-200 shadow-2xs overflow-hidden flex flex-col">
                  <div className="p-3.5 bg-rose-50/80 border-b border-rose-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                      <h4 className="font-extrabold text-xs text-rose-950 uppercase tracking-tight">
                        Top Giáo Viên TKB Bất Tiện Nhất ("Xấu & Cần Cân Đối")
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                      Ưu tiên xếp bù tuần sau
                    </span>
                  </div>

                  <div className="p-2 divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[380px]">
                    {(auditScope === 'WEEK' ? weeklySummary.topInconvenientTeachers : semesterSummary.frequentlyBadTeachers.slice(0, 10)).map((t: any, idx) => (
                      <div key={t.teacherId} className="p-2.5 hover:bg-rose-50/30 transition-colors text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 font-black flex items-center justify-center text-[10px]">
                              {idx + 1}
                            </span>
                            <div className="font-bold text-slate-900">
                              <span>{t.teacherName}</span>
                              <span className="ml-1 text-[10px] font-normal text-slate-500">({t.mainSubjectName})</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="font-black text-rose-700 text-xs">{auditScope === 'WEEK' ? t.score : t.avgScore}đ</span>
                            <button
                              onClick={() => handleViewTeacherTkb(t.teacherId)}
                              className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                              title="Mở xem TKB của thầy/cô này để điều chỉnh"
                            >
                              Xem & Sửa TKB
                            </button>
                          </div>
                        </div>

                        {/* 3 Criteria stats & Workload */}
                        <div className="flex flex-wrap items-center gap-2 pl-7 text-[10px]">
                          <span className="text-slate-900 font-extrabold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {auditScope === 'WEEK' ? `${t.totalPeriods} tiết` : `${t.avgPeriodsPerWeek} tiết/T`} • {t.assignedClassesCount} lớp
                          </span>
                          <span className="font-black text-rose-900 bg-rose-100/90 px-1.5 py-0.5 rounded border border-rose-300" title="Tiêu chí vàng: Số tiết thực dạy trên TKB / Số buổi đi dạy (Không tính kiêm nhiệm)">
                            ⭐ {t.periodsPerSession.toFixed(2)} tiết/buổi
                          </span>
                          {t.assignedClassesList?.length > 0 && (
                            <span className="text-slate-500 max-w-[140px] truncate" title={t.assignedClassesList.join(', ')}>
                              ({t.assignedClassesList.join(', ')})
                            </span>
                          )}
                          <span>•</span>
                          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-900 rounded font-bold">
                            {auditScope === 'WEEK' ? `Nghỉ ${t.freeDays} ngày` : `Nghỉ ${t.avgFreeDaysPerWeek} ngày/T`}
                          </span>
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-bold">
                            {auditScope === 'WEEK' ? `${t.totalGaps} tiết lủng` : `Tổng ${t.totalGaps} lủng`}
                          </span>
                          {(t.singlePeriodSessions > 0 || t.totalSinglePeriodSessions > 0) && (
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-900 rounded font-bold">
                              {auditScope === 'WEEK' ? `${t.singlePeriodSessions} buổi 1 tiết` : `${t.totalSinglePeriodSessions} buổi 1 tiết`}
                            </span>
                          )}
                        </div>

                        {/* Reason / Suggestion */}
                        <div className="pl-7 text-[10px] text-slate-600 italic">
                          {auditScope === 'WEEK'
                            ? (t.diagnosisNotes?.[0] || t.primaryFactor)
                            : (t.balancingSuggestions?.[0] || 'Cần ưu tiên gom tiết và tăng ngày nghỉ.')}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 italic">
                    Ghi chú: Ban Giám Hiệu dựa vào danh sách này để chủ động đảo tiết, gom ca và xếp bù ngày nghỉ ở các tuần sau.
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: BALANCING ASSISTANT FOR FREQUENTLY BAD TIMETABLES */}
          {activeTab === 'BALANCING' && (
            <div className="space-y-4">
              {/* Header Box */}
              <div className="p-4 bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border-2 border-rose-200 rounded-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="font-black text-sm text-rose-950 uppercase tracking-tight flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-rose-600" />
                      <span>Danh Sách Giáo Viên Thường Xuyên Bị TKB Xấu Cần Chủ Động Cân Đối</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-600 text-white font-extrabold">
                        {balancingList.length} giáo viên
                      </span>
                    </h3>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Đây là những thầy cô bị thiệt thòi về <strong>3 tiêu chí: Số ngày nghỉ ít, số buổi nghỉ ít, dính nhiều tiết lủng hoặc bị buổi dạy 1 tiết</strong>.
                      Khi xếp TKB cho tuần tiếp theo, người xếp lịch nên ưu tiên mở TKB của các thầy cô này để điều chỉnh trước!
                    </p>
                  </div>

                  <button
                    onClick={handleExportExcel}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Xuất Danh Sách Cân Đối</span>
                  </button>
                </div>
              </div>

              {/* Balancing Cards / Table */}
              <div className="grid grid-cols-1 gap-3">
                {balancingList.map((t: any, idx: number) => {
                  const isPhuong = t.teacherName.includes('Lê Thái Phương');
                  const isQuoc = t.teacherName.includes('Trần Thị Mỹ Quốc');
                  const isBen = t.teacherName.includes('Trương Sơn Bền');
                  const isTai = t.teacherName.includes('Hồ Thị Ngọc Tài');

                  return (
                    <div
                      key={t.teacherId}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        isPhuong
                          ? 'bg-amber-50/70 border-amber-400 shadow-md ring-2 ring-amber-300/40'
                          : 'bg-white border-slate-200 hover:border-rose-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        {/* Left: Info & 3 Criteria Metrics */}
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-800 font-black text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-black text-slate-900 text-sm">{t.teacherName}</span>
                            <span className="text-xs text-slate-500 font-semibold">({t.teacherCode || t.mainSubjectName})</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {t.departmentName}
                            </span>
                            {isPhuong && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-300">
                                Đối tượng trọng điểm phân tích
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.score <= 65 || t.avgScore <= 68 ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                              Điểm: {auditScope === 'WEEK' ? t.score : t.avgScore}/100
                            </span>
                          </div>

                          {/* Khối lượng phân công & 3 Core Criteria Pill Badges */}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {/* Workload: Số tiết & Số lớp */}
                            <div className="px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center gap-1.5 shadow-2xs">
                              <span className="text-slate-500 text-[11px] font-medium">Khối lượng:</span>
                              <strong className="text-indigo-950 font-black">
                                {auditScope === 'WEEK' ? `${t.totalPeriods} tiết` : `${t.avgPeriodsPerWeek} tiết/tuần`} • {t.assignedClassesCount} lớp
                              </strong>
                              {t.assignedClassesList?.length > 0 && (
                                <span className="text-[10px] text-indigo-700 font-semibold max-w-[220px] truncate" title={t.assignedClassesList.join(', ')}>
                                  ({t.assignedClassesList.join(', ')})
                                </span>
                              )}
                            </div>

                            {/* High workload flag */}
                            {(t.totalPeriods >= 20 || t.avgPeriodsPerWeek >= 20) && (
                              <span className="px-2 py-0.5 rounded-xl text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300">
                                ⚖️ Tải cao (~27 tiết)
                              </span>
                            )}

                            {/* Tiêu chí cốt lõi: Tiết dạy TB / buổi */}
                            <div className="px-2.5 py-1 rounded-xl bg-emerald-100/90 border-2 border-emerald-400 flex items-center gap-1.5 shadow-2xs">
                              <span className="text-emerald-950 text-[11px] font-black flex items-center gap-0.5">
                                <span>⭐</span> Tiết TB/buổi:
                              </span>
                              <strong className="text-emerald-900 font-black">
                                {t.periodsPerSession.toFixed(2)} t/b
                              </strong>
                              <span className="text-[10px] text-emerald-800 font-bold">
                                ({auditScope === 'WEEK' ? `${t.totalPeriods} tiết / ${t.sessionCount} buổi` : `${t.avgPeriodsPerWeek}t / ${t.avgSessionsPerWeek}b`})
                              </span>
                            </div>

                            <div className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-1.5">
                              <span className="text-slate-500 text-[11px]">1. Số ngày nghỉ:</span>
                              <strong className="text-emerald-800 font-black">
                                {auditScope === 'WEEK' ? `${t.freeDays} ngày/tuần` : `${t.avgFreeDaysPerWeek} ngày/tuần`}
                              </strong>
                            </div>

                            <div className="px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-1.5">
                              <span className="text-slate-500 text-[11px]">2. Số buổi nghỉ:</span>
                              <strong className="text-blue-800 font-black">
                                {auditScope === 'WEEK' ? `${t.freeHalfDays}/12 buổi` : `${t.avgFreeHalfDaysPerWeek}/12 buổi`}
                              </strong>
                            </div>

                            <div className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-300 flex items-center gap-1.5">
                              <span className="text-slate-500 text-[11px]">3. Tiết lủng:</span>
                              <strong className="text-amber-800 font-black">
                                {auditScope === 'WEEK' ? `${t.totalGaps} tiết lủng` : `Tổng ${t.totalGaps} lủng (TB ${t.avgGapsPerWeek}/T)`}
                              </strong>
                            </div>

                            {(t.singlePeriodSessions > 0 || t.totalSinglePeriodSessions > 0) && (
                              <div className="px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200 flex items-center gap-1.5">
                                <span className="text-slate-500 text-[11px]">Buổi 1 tiết lẻ:</span>
                                <strong className="text-purple-800 font-black">
                                  {auditScope === 'WEEK' ? `${t.singlePeriodSessions} buổi` : `${t.totalSinglePeriodSessions} buổi`}
                                </strong>
                              </div>
                            )}

                            {auditScope !== 'WEEK' && (
                              <div className="px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-1.5">
                                <span className="text-slate-500 text-[11px]">Số tuần bị xấu:</span>
                                <strong className="text-rose-800 font-black">
                                  {t.badWeeksCount}/{t.totalWeeksEvaluated} tuần
                                </strong>
                              </div>
                            )}
                          </div>

                          {/* High workload contextual explanation banner */}
                          {(t.totalPeriods >= 20 || t.avgPeriodsPerWeek >= 20) && (
                            <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-950 flex items-center gap-1.5">
                              <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>
                                <strong>Góc nhìn tổng thể:</strong> Giáo viên dạy tải cao ({auditScope === 'WEEK' ? t.totalPeriods : t.avgPeriodsPerWeek} tiết trên {t.assignedClassesCount} lớp). Với số tiết nhiều (~27 tiết/tuần), việc được nghỉ ít buổi/ngày hơn các giáo viên ít tiết là hoàn toàn bình thường. Nhà trường chỉ cần tập trung <strong>triệt tiêu tiết lủng</strong> và <strong>gom tiết tránh buổi 1 tiết</strong>.
                              </span>
                            </div>
                          )}

                          {/* Specific Actionable Recommendation */}
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-1">
                            <div className="font-bold text-slate-900 flex items-center gap-1 text-[11px] uppercase tracking-wide">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Gợi Ý Điều Chỉnh Chủ Động Cho Tuần Tiếp Theo:</span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-slate-700">
                              {isPhuong ? (
                                <span>
                                  👉 <strong>Thầy Lê Thái Phương:</strong> Có dạy 1 tiết <strong>HĐTNHN (Quy mô lớp) của lớp 7A5</strong>. Tiết khối 7 này làm vỡ khung lịch khối 8, 9, khiến thầy bị rải 5 ngày/tuần và có buổi dạy 1 tiết.
                                  <strong> Đề xuất:</strong> Điều chuyển tiết 7A5 sang cho GV khác tại khối 7 HOẶC khóa cố định tiết 7A5 vào buổi có sẵn (Thứ 2/4/7) để gom lịch xuống 3-4 ngày dạy/tuần!
                                </span>
                              ) : isQuoc ? (
                                <span>
                                  👉 <strong>Cô Trần Thị Mỹ Quốc (Mỹ thuật):</strong> Dạy 19 lớp rải rác. Đề xuất: Đảo chéo tiết với các giáo viên khác trong tổ để gom các tiết trống lủng lại liền nhau.
                                </span>
                              ) : isBen ? (
                                <span>
                                  👉 <strong>Thầy Trương Sơn Bền:</strong> Chỉ có 12 tiết nhưng bị nhiều buổi 1 tiết. Đề xuất: Gom các tiết lẻ sang buổi khác để giải phóng trọn vẹn 2-3 ngày nghỉ trong tuần.
                                </span>
                              ) : isTai ? (
                                <span>
                                  👉 <strong>Cô Hồ Thị Ngọc Tài:</strong> Có tới 5 buổi chỉ lên trường dạy 1 tiết. Đề xuất: Gộp các tiết đơn độc thành các ca 2-3 tiết liền.
                                </span>
                              ) : (
                                <span>
                                  {auditScope === 'WEEK'
                                    ? (t.suggestedAction || t.diagnosisNotes?.[0] || 'Cần gom tiết lại trong 3-4 buổi để tăng ngày nghỉ.')
                                    : (t.balancingSuggestions?.[0] || 'Cần ưu tiên gom tiết và luân phiên ngày nghỉ cuối tuần.')}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Right: Direct Action Button */}
                        <div className="flex lg:flex-col items-center justify-end gap-2 shrink-0">
                          <button
                            onClick={() => handleViewTeacherTkb(t.teacherId)}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            title="Chuyển ngay tới Thời khóa biểu của giáo viên này để xem và điều chỉnh"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem & Chỉnh TKB</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ALL TEACHERS TABLE (3 CRITERIA INTEGRATED) */}
          {activeTab === 'ALL_TEACHERS' && (
            <div className="space-y-3">
              {/* Filter Bar */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên giáo viên, mã hoặc môn học..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                {/* Dept Filter */}
                <select
                  value={selectedDeptFilter}
                  onChange={(e) => setSelectedDeptFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none"
                >
                  <option value="ALL">Tất cả tổ chuyên môn</option>
                  <option value="dept-toan">Tổ Toán</option>
                  <option value="dept-ngu-van">Tổ Ngữ Văn</option>
                  <option value="dept-khxh">Tổ Lịch sử - Địa lý - GDCD</option>
                  <option value="dept-khtn">Tổ Lý - Hóa - Sinh - Công nghệ</option>
                  <option value="dept-tieng-anh-tin">Tổ Tiếng Anh - Tin học</option>
                  <option value="dept-gdtc-qpan-nt">Tổ GDTC - QPAN - Nghệ thuật</option>
                </select>

                {/* Tier Filter */}
                <select
                  value={selectedTierFilter}
                  onChange={(e) => setSelectedTierFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none"
                >
                  <option value="ALL">Tất cả xếp loại</option>
                  <option value="EXCELLENT">TKB Rất Đẹp (&ge;85-90đ)</option>
                  <option value="GOOD">TKB Thuận Lợi (75-89đ)</option>
                  <option value="AVERAGE">TKB Trung Bình (60-74đ)</option>
                  <option value="POOR">TKB Xấu / Bất Lợi (&lt;60-68đ)</option>
                </select>

                {/* Workload Filter */}
                <select
                  value={selectedWorkloadFilter}
                  onChange={(e) => setSelectedWorkloadFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none"
                >
                  <option value="ALL">Tất cả định mức số tiết</option>
                  <option value="HIGH">Dạy tải cao (~27 tiết / &ge;20t)</option>
                  <option value="MEDIUM">Định mức vừa (15 - 19t)</option>
                  <option value="LIGHT">Ít tiết (&lt;15t)</option>
                </select>
              </div>

              {/* Golden Ratio Guidance Banner */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs shadow-2xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-slate-900 flex items-center gap-1.5 text-xs">
                    <Scale className="w-4 h-4 text-emerald-700" />
                    <span>Căn cứ xếp hạng TKB chuẩn hóa:</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-black text-[11px] shadow-2xs flex items-center gap-1">
                    <span>⭐</span> <span>Tiêu chí cốt lõi: Tiết thực dạy / Số buổi đi dạy (Cao &rarr; Thấp)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-extrabold text-[11px] border border-emerald-300">
                    1️⃣ Số ngày nghỉ
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-900 font-extrabold text-[11px] border border-blue-300">
                    2️⃣ Số buổi nghỉ
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-extrabold text-[11px] border border-amber-300">
                    3️⃣ Số tiết lủng (Thấp &rarr; Cao)
                  </span>
                </div>
                <span className="text-[11px] text-emerald-800 font-medium italic">
                  *Chỉ tính tiết thực tế trên TKB, không tính kiêm nhiệm. Tỷ lệ cao (4-5 t/b) nghĩa là TKB rất đẹp, gọn gàng, ít buổi phải đến trường.
                </span>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-[480px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-2 text-center w-12 font-black text-indigo-950 bg-indigo-100/60">
                          Hạng
                        </th>
                        <th className="py-2.5 px-3 min-w-[130px]">Giáo viên</th>
                        <th className="py-2.5 px-3 min-w-[110px]">Môn & Tổ</th>
                        <th className="py-2.5 px-2 text-center bg-indigo-50/70 text-indigo-950 font-black border-l border-indigo-200" title="Số tiết thực tế trên TKB (Không tính kiêm nhiệm)">
                          Tiết TKB
                        </th>
                        <th className="py-2.5 px-2 text-center bg-indigo-50/70 text-indigo-950 font-black" title="Số buổi có giờ dạy trong tuần">
                          Buổi Dạy
                        </th>
                        <th className="py-2.5 px-3 text-center bg-emerald-100/90 text-emerald-950 font-black border-x border-emerald-300 shadow-xs" title="Tiêu chí vàng cốt lõi: Số tiết thực dạy chia cho số buổi đi dạy">
                          <div className="flex flex-col items-center">
                            <span className="flex items-center gap-1 text-[11px] text-emerald-950">
                              <span>⭐</span> Tiết / Buổi
                            </span>
                            <span className="text-[9px] font-black text-emerald-700 uppercase">(Cao &rarr; Thấp)</span>
                          </div>
                        </th>
                        <th className="py-2.5 px-3 text-center">Xếp Loại TKB</th>
                        <th className="py-2.5 px-3 text-center bg-emerald-50/50 text-emerald-900 border-x border-emerald-200">
                          1. Ngày Nghỉ
                        </th>
                        <th className="py-2.5 px-3 text-center bg-blue-50/50 text-blue-900 border-x border-blue-200">
                          2. Buổi Nghỉ
                        </th>
                        <th className="py-2.5 px-3 text-center bg-amber-50/50 text-amber-900 border-x border-amber-200">
                          3. Tiết Lủng
                        </th>
                        <th className="py-2.5 px-2 text-center">Buổi 1 Tiết</th>
                        <th className="py-2.5 px-2 text-center">Số Lớp</th>
                        <th className="py-2.5 px-3 min-w-[160px]">Nhận Xét / Cân Đối</th>
                        <th className="py-2.5 px-2 text-center">Xem TKB</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditScope === 'WEEK' ? (
                        filteredWeeklyTeachers.map((t, idx) => (
                          <tr key={t.teacherId} className="hover:bg-slate-50 transition-colors">
                            {/* Hạng TKB */}
                            <td className="py-2 px-2 text-center font-black text-indigo-700 bg-indigo-50/30">
                              #{idx + 1}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900">
                              <div>{t.teacherName}</div>
                              {t.teacherCode && <div className="text-[10px] text-slate-400 font-normal">{t.teacherCode}</div>}
                            </td>
                            <td className="py-2 px-3 text-slate-700">
                              <div className="font-semibold text-slate-900">{t.mainSubjectName}</div>
                              <div className="text-[10px] text-slate-500">{t.departmentName}</div>
                            </td>

                            {/* Số tiết thực tế TKB (không tính kiêm nhiệm) */}
                            <td className="py-2 px-2 text-center bg-indigo-50/20 border-l border-indigo-100">
                              <span className="font-black text-slate-900 text-xs">{t.totalPeriods}t</span>
                              {t.totalPeriods >= 20 && (
                                <div className="text-[9px] font-black text-blue-800 bg-blue-100/80 rounded px-1 mt-0.5 whitespace-nowrap">
                                  Tải cao
                                </div>
                              )}
                            </td>

                            {/* Số buổi đi dạy */}
                            <td className="py-2 px-2 text-center bg-indigo-50/20">
                              <span className="font-bold text-slate-800 text-xs">{t.sessionCount} buổi</span>
                            </td>

                            {/* TIÊU CHÍ VÀNG: TỶ LỆ TIẾT / BUỔI */}
                            <td className="py-2 px-3 text-center bg-emerald-50/50 border-x border-emerald-200">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black shadow-2xs border ${
                                t.periodsPerSession >= 4.0
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : t.periodsPerSession >= 3.2
                                  ? 'bg-blue-100 text-blue-900 border-blue-300'
                                  : t.periodsPerSession >= 2.4
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-rose-100 text-rose-900 border-rose-300'
                              }`}>
                                {t.periodsPerSession.toFixed(2)} t/b
                              </span>
                            </td>

                            {/* Xếp loại TKB */}
                            <td className="py-2 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${t.tierColor}`}>
                                {t.tierLabel}
                              </span>
                            </td>
                            
                            {/* 1. Free days */}
                            <td className="py-2 px-3 text-center bg-emerald-50/30 border-x border-emerald-100 font-black">
                              <span className={`px-2 py-0.5 rounded-lg text-xs ${
                                t.freeDays >= 2 ? 'bg-emerald-100 text-emerald-800 font-black' : t.freeDays === 0 ? 'bg-rose-100 text-rose-800 font-black' : 'text-slate-800'
                              }`}>
                                {t.freeDays} ngày
                              </span>
                            </td>

                            {/* 2. Free half-days */}
                            <td className="py-2 px-3 text-center bg-blue-50/30 border-x border-blue-100 font-bold text-blue-900">
                              {t.freeHalfDays}/12 buổi
                            </td>

                            {/* 3. Gaps */}
                            <td className="py-2 px-3 text-center bg-amber-50/30 border-x border-amber-100">
                              {t.totalGaps > 0 ? (
                                <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black text-xs" title={t.gapDetails.map(g => g.description).join('\n')}>
                                  {t.totalGaps} tiết
                                </span>
                              ) : (
                                <span className="text-slate-400 font-bold">0</span>
                              )}
                            </td>

                            <td className="py-2 px-2 text-center">
                              {t.singlePeriodSessions > 0 ? (
                                <span className="inline-block px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold text-[11px]" title={t.singlePeriodDetails.map(s => s.description).join('\n')}>
                                  {t.singlePeriodSessions}
                                </span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>

                            {/* Số lớp */}
                            <td className="py-2 px-2 text-center">
                              <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-800 text-[11px]" title={t.assignedClassesList.join(', ')}>
                                {t.assignedClassesCount}
                              </span>
                            </td>

                            <td className="py-2 px-3 text-[11px] text-slate-600 max-w-[200px]">
                              {t.diagnosisNotes[0] || t.primaryFactor}
                            </td>

                            <td className="py-2 px-2 text-center">
                              <button
                                onClick={() => handleViewTeacherTkb(t.teacherId)}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                                title="Xem TKB của giáo viên"
                              >
                                Xem TKB
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        filteredSemesterTeachers.map((t, idx) => (
                          <tr key={t.teacherId} className="hover:bg-slate-50 transition-colors">
                            {/* Hạng TKB */}
                            <td className="py-2 px-2 text-center font-black text-indigo-700 bg-indigo-50/30">
                              #{idx + 1}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900">
                              <div>{t.teacherName}</div>
                              {t.teacherCode && <div className="text-[10px] text-slate-400 font-normal">{t.teacherCode}</div>}
                            </td>
                            <td className="py-2 px-3 text-slate-700">
                              <div className="font-semibold text-slate-900">{t.mainSubjectName}</div>
                              <div className="text-[10px] text-slate-500">{t.departmentName}</div>
                            </td>

                            {/* Số tiết TB */}
                            <td className="py-2 px-2 text-center bg-indigo-50/20 border-l border-indigo-100">
                              <span className="font-black text-slate-900 text-xs">{t.avgPeriodsPerWeek}t/t</span>
                              {t.avgPeriodsPerWeek >= 20 && (
                                <div className="text-[9px] font-black text-blue-800 bg-blue-100/80 rounded px-1 mt-0.5 whitespace-nowrap">
                                  Tải cao
                                </div>
                              )}
                            </td>

                            {/* Số buổi đi dạy TB */}
                            <td className="py-2 px-2 text-center bg-indigo-50/20">
                              <span className="font-bold text-slate-800 text-xs">{t.avgSessionsPerWeek} b/t</span>
                            </td>

                            {/* TIÊU CHÍ VÀNG: TỶ LỆ TIẾT / BUỔI */}
                            <td className="py-2 px-3 text-center bg-emerald-50/50 border-x border-emerald-200">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black shadow-2xs border ${
                                t.periodsPerSession >= 4.0
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : t.periodsPerSession >= 3.2
                                  ? 'bg-blue-100 text-blue-900 border-blue-300'
                                  : t.periodsPerSession >= 2.4
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-rose-100 text-rose-900 border-rose-300'
                              }`}>
                                {t.periodsPerSession.toFixed(2)} t/b
                              </span>
                            </td>

                            {/* Xếp loại chất lượng HK */}
                            <td className="py-2 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${t.statusColor}`}>
                                {t.statusLabel}
                              </span>
                            </td>
                            
                            {/* 1. Free days average */}
                            <td className="py-2 px-3 text-center bg-emerald-50/30 border-x border-emerald-100 font-black">
                              <span className={`px-2 py-0.5 rounded-lg text-xs ${
                                t.avgFreeDaysPerWeek >= 2 ? 'bg-emerald-100 text-emerald-800 font-black' : t.avgFreeDaysPerWeek <= 1 ? 'bg-rose-100 text-rose-800 font-black' : 'text-slate-800'
                              }`}>
                                {t.avgFreeDaysPerWeek} ng/t
                              </span>
                            </td>

                            {/* 2. Free half-days average */}
                            <td className="py-2 px-3 text-center bg-blue-50/30 border-x border-blue-100 font-bold text-blue-900">
                              {t.avgFreeHalfDaysPerWeek}/12 buổi
                            </td>

                            {/* 3. Gaps total & average */}
                            <td className="py-2 px-3 text-center bg-amber-50/30 border-x border-amber-100">
                              {t.totalGaps > 0 ? (
                                <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black text-xs">
                                  {t.totalGaps} (TB {t.avgGapsPerWeek}/t)
                                </span>
                              ) : (
                                <span className="text-slate-400 font-bold">0</span>
                              )}
                            </td>

                            <td className="py-2 px-2 text-center">
                              {t.totalSinglePeriodSessions > 0 ? (
                                <span className="inline-block px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold text-[11px]">
                                  {t.totalSinglePeriodSessions}
                                </span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>

                            {/* Số lớp */}
                            <td className="py-2 px-2 text-center">
                              <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-800 text-[11px]" title={t.assignedClassesList.join(', ')}>
                                {t.assignedClassesCount}
                              </span>
                            </td>

                            <td className="py-2 px-3 text-[11px] text-slate-600 max-w-[200px]">
                              {t.balancingSuggestions[0]}
                            </td>

                            <td className="py-2 px-2 text-center">
                              <button
                                onClick={() => handleViewTeacherTkb(t.teacherId)}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                                title="Xem TKB của giáo viên"
                              >
                                Xem TKB
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DEPARTMENTS BENCHMARKS */}
          {activeTab === 'DEPARTMENTS' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-xs uppercase tracking-tight text-slate-800 mb-1">
                  Xếp Hạng Tính Thuận Tiện Của Thời Khóa Biểu Giữa Các Tổ Chuyên Môn
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Số liệu so sánh khách quan điểm thuận tiện trung bình, số ngày nghỉ và tổng số tiết lủng của từng tổ:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(auditScope === 'WEEK' ? weeklySummary.departmentStats : semesterSummary.departmentStats).map((dept: any) => (
                    <div key={dept.deptId} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-xs text-slate-900">{dept.deptName}</div>
                          <div className="text-[10px] text-slate-500">{dept.teacherCount} giáo viên giảng dạy</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                          (dept.averageScore || dept.avgScore) >= 80 ? 'bg-emerald-100 text-emerald-800' : (dept.averageScore || dept.avgScore) >= 70 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {dept.averageScore || dept.avgScore}đ
                        </span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Hiệu suất bình quân tổ:</span>
                          <span className="font-extrabold text-emerald-800">⭐ {dept.avgPeriodsPerSession ? dept.avgPeriodsPerSession.toFixed(2) : '0'} tiết/buổi</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Tổng tiết lủng trong tổ:</span>
                          <span className="font-bold text-amber-600">{dept.totalGaps} tiết</span>
                        </div>
                        {dept.frequentlyBadCount !== undefined && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Số GV cần cân đối:</span>
                            <span className={`font-bold ${dept.frequentlyBadCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                              {dept.frequentlyBadCount} GV
                            </span>
                          </div>
                        )}
                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              (dept.averageScore || dept.avgScore) >= 80 ? 'bg-emerald-500' : (dept.averageScore || dept.avgScore) >= 70 ? 'bg-blue-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${dept.averageScore || dept.avgScore}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DAYS OFF & LONG WEEKEND AUDIT */}
          {activeTab === 'DAYS_OFF_AUDIT' && (
            <div className="space-y-4">
              
              {/* Executive Verification Banner */}
              <div className="bg-gradient-to-r from-amber-50 via-orange-50/50 to-red-50 border border-amber-300 rounded-2xl p-4 text-slate-800 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-600 text-white rounded-xl shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-tight flex items-center gap-2 flex-wrap">
                        <span>Kết Quả Xác Minh Của Ban Giám Hiệu Về Ý Kiến Ngày Nghỉ Đầu / Cuối Tuần</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                          Xác nhận: Phản ánh là hoàn toàn ĐÚNG SỰ THẬT
                        </span>
                      </h3>
                      <p className="text-slate-700 mt-1 leading-relaxed">
                        Hệ thống đã kiểm tra đối soát chéo trên toàn bộ các tuần học (Tuần 1 &rarr; Tuần 6). Kết quả đối chiếu số liệu thực tế như sau:
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                      <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200 shadow-2xs space-y-1">
                        <div className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                          1. Nghỉ Thứ Hai liên tục (Đầu tuần):
                        </div>
                        <p className="text-[11px] text-slate-600">
                          • Có <strong>6 giáo viên giảng dạy</strong> được nghỉ Thứ Hai liên tục từ 4 đến 5 tuần (tiêu biểu: Cô Lê Thị Hoài An, Cô Lê Thị Kim The, Thầy Hồ Hoài Ngân, Cô Lê Thị Ngọc Tuyền, Thầy Phạm Thanh Lâm, Thầy Ngô Bảo Quốc).
                        </p>
                      </div>

                      <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200 shadow-2xs space-y-1">
                        <div className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                          2. Nghỉ Thứ Bảy liên tục (Cuối tuần):
                        </div>
                        <p className="text-[11px] text-slate-600">
                          • Có <strong>10 giáo viên</strong> được nghỉ Thứ Bảy liên tục từ 4 đến 5 tuần (tiêu biểu: Thầy Lê Cao Toàn, Thầy Lê Văn Toàn, Cô Nguyễn Thị Mai Khanh, Cô Nguyễn Thị Kim Đỉnh, Cô Nguyễn Thị Vân Anh, Cô Nguyễn Thị Thùy Dương, Cô Võ Thị Hiền Thi, Cô Huỳnh Thị Vân Nhi, Cô Nguyễn Thị Lý).
                        </p>
                      </div>

                      <div className="bg-white/90 p-2.5 rounded-xl border border-rose-200 shadow-2xs space-y-1">
                        <div className="font-bold text-rose-950 text-xs flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          3. Ngược lại: Giáo viên dạy cả 6/6 ngày:
                        </div>
                        <p className="text-[11px] text-slate-600">
                          • <strong>Thầy Trương Sơn Bền (Tiếng Anh)</strong> dạy 12 tiết nhưng bị rải kín cả <strong>6 ngày từ Thứ 2 đến Thứ 7</strong> ở Tuần 1, và các tuần sau vẫn dính 4 buổi dạy 1 tiết lẻ!
                        </p>
                      </div>
                    </div>

                    <div className="bg-amber-100/70 p-2.5 rounded-xl border border-amber-300/80 text-[11px] text-amber-950">
                      <strong>Nguyên nhân kỹ thuật:</strong> Hiện tượng "liên tục trong nhiều tuần" xuất phát từ việc phần mềm sử dụng tính năng <em>"Sao chép Thời khóa biểu sang tuần khác"</em> từ Tuần 1 sang các tuần tiếp theo. Khi nhân bản khung TKB gốc, toàn bộ các ngày nghỉ Thứ 2 hoặc Thứ 7 của giáo viên ở Tuần 1 bị sao chép nguyên vẹn, khiến một số thầy cô được cố định ngày nghỉ đầu/cuối tuần suốt nhiều tuần mà không được xoay vòng.
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-slate-600 text-xs mr-1">Bộ lọc phản ánh:</span>
                  <button
                    onClick={() => setDaysOffFilter('ALL')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                      daysOffFilter === 'ALL'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Tất cả giáo viên ({multiWeekSummary.records.length})
                  </button>
                  <button
                    onClick={() => setDaysOffFilter('ALWAYS_MONDAY_OFF')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      daysOffFilter === 'ALWAYS_MONDAY_OFF'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-amber-900 hover:bg-amber-50 border border-amber-200'
                    }`}
                  >
                    <span>Nghỉ Thứ 2 liên tục</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white font-extrabold">
                      {multiWeekSummary.alwaysMondayOffCount}
                    </span>
                  </button>
                  <button
                    onClick={() => setDaysOffFilter('ALWAYS_SATURDAY_OFF')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      daysOffFilter === 'ALWAYS_SATURDAY_OFF'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-blue-900 hover:bg-blue-50 border border-blue-200'
                    }`}
                  >
                    <span>Nghỉ Thứ 7 liên tục</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white font-extrabold">
                      {multiWeekSummary.alwaysSaturdayOffCount}
                    </span>
                  </button>
                  <button
                    onClick={() => setDaysOffFilter('ALWAYS_BOTH_OFF')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      daysOffFilter === 'ALWAYS_BOTH_OFF'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-emerald-900 hover:bg-emerald-50 border border-emerald-200'
                    }`}
                  >
                    <span>Nghỉ cả T2 & T7</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white font-extrabold">
                      {multiWeekSummary.alwaysBothOffCount}
                    </span>
                  </button>
                  <button
                    onClick={() => setDaysOffFilter('NEVER_OFF')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      daysOffFilter === 'NEVER_OFF'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white text-rose-900 hover:bg-rose-50 border border-rose-200'
                    }`}
                  >
                    <span>Dạy cả 6 ngày (Không nghỉ)</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white font-extrabold">
                      {multiWeekSummary.neverOffCount}
                    </span>
                  </button>
                </div>

                <div className="relative min-w-[180px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm tên giáo viên..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Multi-week Days Off Verification Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-[440px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-10">STT</th>
                        <th className="py-2.5 px-3">Họ và tên Giáo viên</th>
                        <th className="py-2.5 px-3">Tổ chuyên môn</th>
                        <th className="py-2.5 px-2 text-center bg-indigo-50/70 text-indigo-950 font-black border-l border-indigo-200">
                          Số Tiết
                        </th>
                        <th className="py-2.5 px-2 text-center bg-indigo-50/70 text-indigo-950 font-black border-r border-indigo-200">
                          Số Lớp
                        </th>
                        <th className="py-2.5 px-2 text-center bg-amber-50 text-amber-900 border-x border-amber-200">Tuần 1</th>
                        <th className="py-2.5 px-2 text-center bg-amber-50 text-amber-900 border-x border-amber-200">Tuần 2</th>
                        <th className="py-2.5 px-2 text-center bg-amber-50 text-amber-900 border-x border-amber-200">Tuần 3</th>
                        <th className="py-2.5 px-2 text-center bg-amber-50 text-amber-900 border-x border-amber-200">Tuần 4</th>
                        <th className="py-2.5 px-2 text-center bg-amber-50 text-amber-900 border-x border-amber-200">Tuần 5</th>
                        <th className="py-2.5 px-2 text-center bg-amber-50 text-amber-900 border-x border-amber-200">Tuần 6</th>
                        <th className="py-2.5 px-3 text-center">TB Ngày Nghỉ/T</th>
                        <th className="py-2.5 px-3">Kết Luận Xác Minh & Ghi Chú</th>
                        <th className="py-2.5 px-2 text-center">Xem TKB</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDaysOffRecords.map((r, idx) => {
                        const renderWeekBadge = (w: number) => {
                          const isMon = r.mondayOffWeeks.includes(w);
                          const isSat = r.saturdayOffWeeks.includes(w);
                          if (isMon && isSat) {
                            return <span className="inline-block px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-extrabold text-[10px]">Nghỉ T2+T7</span>;
                          }
                          if (isMon) {
                            return <span className="inline-block px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold text-[10px]">Nghỉ T2</span>;
                          }
                          if (isSat) {
                            return <span className="inline-block px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-900 font-extrabold text-[10px]">Nghỉ T7</span>;
                          }
                          if (r.zeroOffWeeks.includes(w)) {
                            return <span className="inline-block px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-900 font-bold text-[10px]">Dạy 6 ngày</span>;
                          }
                          return <span className="text-slate-400 text-[10px]">Nghỉ giữa tuần</span>;
                        };

                        return (
                          <tr key={r.teacherId} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2 px-3 text-center text-slate-500 font-semibold">{idx + 1}</td>
                            <td className="py-2 px-3 font-bold text-slate-900">
                              <div>{r.teacherName}</div>
                              {r.teacherCode && <div className="text-[10px] text-slate-400 font-normal">{r.teacherCode}</div>}
                            </td>
                            <td className="py-2 px-3 text-slate-700">
                              <div className="font-semibold text-slate-900">{r.mainSubjectName}</div>
                              <div className="text-[10px] text-slate-500">{r.departmentName}</div>
                            </td>

                            {/* Số tiết */}
                            <td className="py-2 px-2 text-center bg-indigo-50/20 border-l border-indigo-100">
                              <span className="font-black text-slate-900 text-xs">{r.totalPeriods} tiết</span>
                              {r.totalPeriods >= 20 && (
                                <div className="text-[9px] font-black text-blue-800 bg-blue-100/80 rounded px-1 mt-0.5 whitespace-nowrap">
                                  Tải cao
                                </div>
                              )}
                            </td>

                            {/* Số lớp */}
                            <td className="py-2 px-2 text-center bg-indigo-50/20 border-r border-indigo-100">
                              <span className="px-2 py-0.5 rounded-lg bg-white border border-indigo-200 font-extrabold text-indigo-950 text-xs shadow-2xs" title={r.assignedClassesList?.join(', ')}>
                                {r.assignedClassesCount} lớp
                              </span>
                              <div className="text-[10px] text-slate-500 max-w-[110px] truncate mx-auto mt-0.5" title={r.assignedClassesList?.join(', ')}>
                                {r.assignedClassesList?.join(', ')}
                              </div>
                            </td>

                            <td className="py-2 px-1 text-center bg-amber-50/40 border-x border-amber-100">{renderWeekBadge(1)}</td>
                            <td className="py-2 px-1 text-center bg-amber-50/40 border-x border-amber-100">{renderWeekBadge(2)}</td>
                            <td className="py-2 px-1 text-center bg-amber-50/40 border-x border-amber-100">{renderWeekBadge(3)}</td>
                            <td className="py-2 px-1 text-center bg-amber-50/40 border-x border-amber-100">{renderWeekBadge(4)}</td>
                            <td className="py-2 px-1 text-center bg-amber-50/40 border-x border-amber-100">{renderWeekBadge(5)}</td>
                            <td className="py-2 px-1 text-center bg-amber-50/40 border-x border-amber-100">{renderWeekBadge(6)}</td>
                            <td className="py-2 px-3 text-center font-black text-slate-900">
                              <span className={`px-2 py-0.5 rounded-lg text-xs ${
                                r.avgOffDays >= 3 ? 'bg-emerald-100 text-emerald-900 font-black' : r.avgOffDays === 0 ? 'bg-rose-100 text-rose-900 font-black' : 'text-slate-800'
                              }`}>
                                {r.avgOffDays} ngày
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-700 max-w-[260px]">
                              <div className="font-bold text-slate-900">{r.streakDescription}</div>
                              {r.notes && <div className="text-[10px] text-slate-500 italic mt-0.5">{r.notes}</div>}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                onClick={() => handleViewTeacherTkb(r.teacherId)}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                                title="Xem chi tiết TKB của GV"
                              >
                                Xem TKB
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action plan for BGH */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                <h4 className="font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Đề Xuất Hướng Xử Lý Cân Bằng Ngày Nghỉ Cho Ban Giám Hiệu
                </h4>
                <div className="text-slate-600 leading-relaxed space-y-1">
                  <p>
                    1. <strong>Xoay vòng ngày nghỉ định kỳ:</strong> Với các môn có nhiều giáo viên (Toán, Văn, Anh, KHTN), BGH có thể chỉ đạo Tổ trưởng luân phiên ngày nghỉ Thứ 2 và Thứ 7 giữa các giáo viên (ví dụ: GV A nghỉ T2 trong HK1, sang HK2 xoay sang GV B), tránh để tình trạng cố định suốt cả năm học.
                  </p>
                  <p>
                    2. <strong>Giải phóng ngày nghỉ cho giáo viên đi dạy 6/6 ngày:</strong> Trường hợp Thầy Trương Sơn Bền (dạy 12 tiết nhưng đi cả 6 ngày), chỉ cần gộp 2 buổi dạy 1 tiết lẻ vào các buổi khác là thầy có thể được nghỉ trọn vẹn 1 hoặc 2 ngày trong tuần.
                  </p>
                  <p>
                    3. <strong>Minh bạch hóa các trường hợp ưu tiên theo quy định:</strong> Giải thích công khai cho hội đồng trường các trường hợp nghỉ cố định có lý do chính đáng được pháp luật bảo vệ (như Cô Nguyễn Thị Vân Anh nuôi con nhỏ dưới 12 tháng, BGH có ngày họp chuyên trách, TPT Đội hoạt động phong trào).
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 6: OFFICIAL ADMINISTRATIVE REPORT (CHỈNH CHU THEO NGHỊ ĐỊNH 30/2020/NĐ-CP) */}
          {activeTab === 'ADMIN_REPORT' && (
            <div className="space-y-4">
              {/* Screen toolbar (hidden when printing) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                    <Printer className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-tight flex items-center gap-2">
                      <span>Văn Bản Báo Cáo Hành Chính Đánh Giá TKB</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-black">
                        Nghị định 30/2020/NĐ-CP
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Thiết kế khung bảng hoàn chỉnh, đầy đủ Quốc hiệu - Tiêu ngữ, Căn cứ 3 tiêu chí cốt lõi và Chữ ký 3 bên để in ấn hoặc lưu PDF.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
                    <span className="font-semibold text-[11px]">Cỡ chữ in:</span>
                    <select
                      value={printFontSize}
                      onChange={(e) => setPrintFontSize(e.target.value as any)}
                      className="text-xs font-bold bg-transparent border-none focus:outline-none cursor-pointer text-indigo-900"
                    >
                      <option value="6.8pt">Nhỏ (6.8pt - Gọn nhất)</option>
                      <option value="7.2pt">Chuẩn (7.2pt - Đẹp mắt)</option>
                      <option value="7.8pt">Vừa (7.8pt)</option>
                      <option value="8.5pt">Lớn (8.5pt)</option>
                    </select>
                  </div>

                  <button
                    onClick={handleExportExcel}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs transition-all cursor-pointer"
                    title="Xuất file Excel báo cáo chuẩn văn bản hành chính"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Xuất Excel</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all cursor-pointer active:scale-95"
                    title="Mở hộp thoại In hoặc Lưu dưới dạng PDF (Ctrl + P)"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>In Ngay / Lưu PDF</span>
                  </button>
                </div>
              </div>

              {/* Administrative Document Preview & Print Container */}
              <div
                style={{ ['--print-font-size' as any]: printFontSize }}
                className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 sm:p-8 space-y-6 quality-audit-print-container print:p-0 print:border-none print:shadow-none print:m-0 font-['Times_New_Roman',serif] text-black"
              >
                {/* 1. Quốc hiệu - Tiêu ngữ & Đơn vị chủ quản (Không cần số liệu văn bản) */}
                <table className="w-full border-none mb-3">
                  <tbody>
                    <tr className="align-top">
                      <td className="w-1/2 text-center p-0 border-none">
                        <div className="text-[10pt] uppercase tracking-normal">
                          SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP
                        </div>
                        <div className="text-[10.5pt] uppercase font-bold tracking-tight">
                          {config.schoolName || 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU'}
                        </div>
                        <div className="w-28 mx-auto my-1 border-b-2 border-black"></div>
                      </td>
                      <td className="w-1/2 text-center p-0 border-none">
                        <div className="text-[10pt] uppercase font-bold">
                          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                        </div>
                        <div className="text-[10.5pt] font-bold">
                          Độc lập - Tự do - Hạnh phúc
                        </div>
                        <div className="w-36 mx-auto my-1 border-b-2 border-black"></div>
                        <div className="text-[9pt] italic font-normal mt-0.5">
                          Đồng Tháp, ngày ..... tháng ..... năm 2026
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* 2. Tiêu đề báo cáo */}
                <div className="text-center my-3">
                  <h1 className="text-[13pt] sm:text-[14pt] font-bold uppercase tracking-wide">
                    {auditScope === 'WEEK'
                      ? `BÁO CÁO ĐÁNH GIÁ CHẤT LƯỢNG & TÍNH THUẬN TIỆN THỜI KHÓA BIỂU - TUẦN ${selectedAuditWeek}`
                      : `BÁO CÁO TỔNG HỢP ĐÁNH GIÁ CHẤT LƯỢNG THỜI KHÓA BIỂU (${semesterSummary.semesterLabel.toUpperCase()})`
                    }
                  </h1>
                  <div className="text-[10pt] italic mt-0.5 font-semibold text-slate-800">
                    Năm học {config.academicYear || '2026 - 2027'} &bull; Áp dụng đánh giá cho toàn thể đội ngũ giáo viên
                  </div>
                  <div className="text-[9pt] italic mt-1.5 text-slate-700 bg-slate-50 py-1.5 px-3 border border-slate-300 inline-block rounded-md">
                    * Căn cứ xếp hạng TKB Đẹp/Xấu theo chỉ đạo: <strong>Tỷ lệ số tiết thực dạy trên TKB / Số buổi đi dạy</strong> (không tính kiêm nhiệm). Hạng 1 là TKB đẹp nhất (tập trung 4-5 tiết/buổi, ít buổi đến trường).
                  </div>
                </div>

                {/* 3. Phần I: Số liệu tổng hợp */}
                <div className="space-y-1.5 text-[9.5pt]">
                  <div className="font-bold uppercase text-[10pt]">
                    I. SỐ LIỆU TỔNG HỢP TOÀN TRƯỜNG
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border border-black p-2.5 bg-slate-50/70 text-[9pt]">
                    <div>
                      &bull; Tổng số GV tham gia: <strong>{auditScope === 'WEEK' ? weeklySummary.totalTeachersTeaching : semesterSummary.totalTeachers} GV</strong>
                    </div>
                    <div>
                      &bull; Điểm trung bình: <strong>{auditScope === 'WEEK' ? weeklySummary.averageScore : semesterSummary.avgScore}/100</strong>
                    </div>
                    <div>
                      &bull; Hiệu suất bình quân: <strong>{auditScope === 'WEEK' ? weeklySummary.avgPeriodsPerSession : semesterSummary.avgPeriodsPerSession} tiết/buổi</strong>
                    </div>
                    <div>
                      &bull; Tổng số tiết lủng: <strong>{auditScope === 'WEEK' ? weeklySummary.totalGapsInSchool : semesterSummary.totalGapsInSemester} tiết</strong>
                    </div>
                    <div>
                      &bull; Số GV cần cân đối lại: <strong className="text-rose-800">{balancingList.length} GV</strong>
                    </div>
                    <div className="col-span-2 sm:col-span-4 text-[8.5pt] text-slate-700 border-t border-slate-300 pt-1 mt-1">
                      Cơ cấu phân loại: Rất đẹp/Tối ưu: <strong>{auditScope === 'WEEK' ? weeklySummary.tierCounts.EXCELLENT : semesterSummary.allTeachers.filter(t => t.overallStatus === 'EXCELLENT').length} GV</strong> &bull; Thuận lợi/Đẹp: <strong>{auditScope === 'WEEK' ? weeklySummary.tierCounts.GOOD : semesterSummary.allTeachers.filter(t => t.overallStatus === 'GOOD').length} GV</strong> &bull; Bình thường: <strong>{auditScope === 'WEEK' ? weeklySummary.tierCounts.AVERAGE : semesterSummary.allTeachers.filter(t => t.overallStatus === 'AVERAGE').length} GV</strong> &bull; Cần cân đối: <strong>{auditScope === 'WEEK' ? weeklySummary.tierCounts.POOR : semesterSummary.frequentlyBadTeachersCount} GV</strong>
                    </div>
                  </div>
                </div>

                {/* 4. Phần II: Bảng phân loại chi tiết có đóng khung kẻ bảng chuẩn hành chính */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-bold uppercase text-[10pt]">
                    <span>II. BẢNG XẾP HẠNG & ĐÁNH GIÁ CHI TIẾT TỪNG GIÁO VIÊN</span>
                    <span className="text-[8.5pt] normal-case italic font-normal text-slate-600">
                      (Xếp hạng theo Tỷ lệ Tiết thực dạy / Buổi đi dạy &rarr; Ngày nghỉ &rarr; Buổi nghỉ &rarr; Tiết lủng)
                    </span>
                  </div>

                  <div className="overflow-x-auto print:overflow-visible quality-audit-print-table-wrapper">
                    <table className="w-full border-collapse border border-black quality-audit-print-table text-[8pt]">
                      <thead>
                        <tr className="bg-slate-100 font-bold border-b border-black text-center">
                          <th className="border border-black p-1 w-9">Hạng</th>
                          <th className="border border-black p-1 w-12">Mã GV</th>
                          <th className="border border-black p-1 text-left min-w-[125px]">Họ và Tên</th>
                          <th className="border border-black p-1 text-left min-w-[100px]">Tổ CM</th>
                          <th className="border border-black p-1 min-w-[60px]">Môn</th>
                          <th className="border border-black p-1 w-12" title="Số tiết thực tế trên TKB (không tính kiêm nhiệm)">Tiết TKB</th>
                          <th className="border border-black p-1 w-12" title="Số buổi đi dạy">Buổi Dạy</th>
                          <th className="border border-black p-1 min-w-[85px] bg-emerald-100 text-emerald-950 font-black">
                            ⭐ Tiết/Buổi
                          </th>
                          <th className="border border-black p-1 min-w-[95px]">Xếp Loại</th>
                          <th className="border border-black p-1 min-w-[80px]">1. Ngày Nghỉ</th>
                          <th className="border border-black p-1 min-w-[60px]">2. Buổi Nghỉ</th>
                          <th className="border border-black p-1 min-w-[55px]">3. Tiết Lủng</th>
                          <th className="border border-black p-1 w-10">Lớp</th>
                          <th className="border border-black p-1 text-left min-w-[150px]">Đề Xuất & Ghi Chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditScope === 'WEEK' ? (
                          weeklySummary.allTeachers.map((t, idx) => (
                            <tr key={t.teacherId} className="border-b border-black/40 hover:bg-slate-50">
                              <td className="border border-black p-1 text-center font-bold text-indigo-900">#{idx + 1}</td>
                              <td className="border border-black p-1 text-center font-mono font-bold text-[7.5pt]">{t.teacherCode || '-'}</td>
                              <td className="border border-black p-1 font-bold text-left">{t.teacherName}</td>
                              <td className="border border-black p-1 text-left">{t.departmentName}</td>
                              <td className="border border-black p-1 text-center">{t.mainSubjectName}</td>
                              <td className="border border-black p-1 text-center font-bold">{t.totalPeriods}t</td>
                              <td className="border border-black p-1 text-center font-bold">{t.sessionCount}b</td>
                              <td className="border border-black p-1 text-center bg-emerald-50/70 font-black text-emerald-950">
                                {t.periodsPerSession.toFixed(2)} t/b
                              </td>
                              <td className="border border-black p-1 text-center font-bold text-[7.5pt]">
                                {t.tierLabel}
                              </td>
                              <td className="border border-black p-1 text-center font-bold">
                                {t.freeDays} ngày
                                {t.offDayNames.length > 0 && (
                                  <div className="text-[7pt] font-normal text-slate-600">({t.offDayNames.join(', ')})</div>
                                )}
                              </td>
                              <td className="border border-black p-1 text-center font-bold">{t.freeHalfDays} buổi</td>
                              <td className="border border-black p-1 text-center font-bold">
                                {t.totalGaps > 0 ? `${t.totalGaps} tiết` : '-'}
                              </td>
                              <td className="border border-black p-1 text-center">{t.assignedClassesCount}</td>
                              <td className="border border-black p-1 text-left text-[7pt] leading-tight">
                                {t.diagnosisNotes[0] || t.suggestedAction || '-'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          semesterSummary.allTeachers.map((t, idx) => (
                            <tr key={t.teacherId} className="border-b border-black/40 hover:bg-slate-50">
                              <td className="border border-black p-1 text-center font-bold text-indigo-900">#{idx + 1}</td>
                              <td className="border border-black p-1 text-center font-mono font-bold text-[7.5pt]">{t.teacherCode || '-'}</td>
                              <td className="border border-black p-1 font-bold text-left">{t.teacherName}</td>
                              <td className="border border-black p-1 text-left">{t.departmentName}</td>
                              <td className="border border-black p-1 text-center">{t.mainSubjectName}</td>
                              <td className="border border-black p-1 text-center font-bold">{t.avgPeriodsPerWeek}t/t</td>
                              <td className="border border-black p-1 text-center font-bold">{t.avgSessionsPerWeek}b/t</td>
                              <td className="border border-black p-1 text-center bg-emerald-50/70 font-black text-emerald-950">
                                {t.periodsPerSession.toFixed(2)} t/b
                              </td>
                              <td className="border border-black p-1 text-center font-bold text-[7.5pt]">
                                {t.statusLabel}
                              </td>
                              <td className="border border-black p-1 text-center font-bold">
                                {t.avgFreeDaysPerWeek} ng/t
                              </td>
                              <td className="border border-black p-1 text-center font-bold">{t.avgFreeHalfDaysPerWeek} b/t</td>
                              <td className="border border-black p-1 text-center font-bold">
                                {t.totalGaps > 0 ? `${t.totalGaps}t (${t.avgGapsPerWeek}/t)` : '-'}
                              </td>
                              <td className="border border-black p-1 text-center">{t.assignedClassesCount}</td>
                              <td className="border border-black p-1 text-left text-[7pt] leading-tight">
                                {t.balancingSuggestions[0] || '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. Phần III: Chữ ký phê duyệt (Chỉ Phó Hiệu trưởng Nguyễn Minh Trí) */}
                <div className="pt-4 border-t border-black text-black">
                  <div className="flex justify-end">
                    <div className="w-80 text-center font-bold text-[9.5pt]">
                      <div className="text-[9.5pt] italic font-normal mb-1">
                        Đồng Tháp, ngày ..... tháng ..... năm 2026
                      </div>
                      <div className="uppercase tracking-wider">
                        KT. HIỆU TRƯỞNG
                      </div>
                      <div className="text-[10.5pt] font-black uppercase tracking-wider text-black">
                        PHÓ HIỆU TRƯỞNG
                      </div>
                      <div className="font-normal italic text-[8.5pt] text-slate-700 mt-0.5">
                        (Ký và ghi rõ họ tên)
                      </div>
                      <div className="h-16 flex items-end justify-center font-bold text-[10.5pt] text-black">
                        {config.vicePrincipalName || 'Nguyễn Minh Trí'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 text-xs print:hidden">
          <div className="flex items-center gap-2 text-slate-500">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span>
              Công cụ đánh giá 3 tiêu chí: Số ngày nghỉ • Số buổi nghỉ • Tiết lủng để BGH cân đối thời khóa biểu công bằng, khoa học.
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => {
                setActiveTab('ADMIN_REPORT');
                setTimeout(() => {
                  window.print();
                }, 250);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="In hoặc Lưu PDF theo chuẩn văn bản hành chính (NĐ 30/2020)"
            >
              <Printer className="w-4 h-4" />
              <span>In / Xuất PDF Hành Chính</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{auditScope === 'WEEK' ? 'Xuất Excel Tuần' : 'Xuất Excel Học Kỳ'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
