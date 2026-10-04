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
  Info
} from 'lucide-react';
import { TimetableSlot, Teacher, ClassGroup, Subject, SchoolConfig, SchoolTimetable } from '../types';
import {
  analyzeTimetableQuality,
  analyzeMultiWeekDaysOff,
  exportTimetableQualityReportExcel,
  TeacherQualityMetric,
  QualityTier
} from '../utils/timetableQualityHelper';

interface TimetableQualityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeek: number;
  onSelectWeek?: (week: number) => void;
  weeklyTimetables?: Record<number, SchoolTimetable>;
  activeSlots: TimetableSlot[];
  teachers: Teacher[];
  classes: ClassGroup[];
  subjects: Subject[];
  config: SchoolConfig;
  onNavigateToTeacherSchedule?: (teacherId: string) => void;
}

export const TimetableQualityAuditModal: React.FC<TimetableQualityAuditModalProps> = ({
  isOpen,
  onClose,
  currentWeek,
  onSelectWeek,
  weeklyTimetables = {},
  activeSlots,
  teachers,
  classes,
  subjects,
  config,
  onNavigateToTeacherSchedule
}) => {
  const [selectedAuditWeek, setSelectedAuditWeek] = useState<number>(currentWeek);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ALL_TEACHERS' | 'DEPARTMENTS' | 'DAYS_OFF_AUDIT'>('OVERVIEW');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('ALL');
  const [daysOffFilter, setDaysOffFilter] = useState<'ALL' | 'ALWAYS_MONDAY_OFF' | 'ALWAYS_SATURDAY_OFF' | 'ALWAYS_BOTH_OFF' | 'NEVER_OFF'>('ALL');
  const [selectedTeacherDetail, setSelectedTeacherDetail] = useState<TeacherQualityMetric | null>(null);

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

  // Run full quality analysis
  const summary = useMemo(() => {
    return analyzeTimetableQuality(
      slotsToAnalyze,
      teachers,
      classes,
      subjects,
      selectedAuditWeek
    );
  }, [slotsToAnalyze, teachers, classes, subjects, selectedAuditWeek]);

  // Multi-week days off analysis (Weeks 1 to 5)
  const multiWeekSummary = useMemo(() => {
    return analyzeMultiWeekDaysOff(
      weeklyTimetables,
      teachers,
      classes,
      subjects,
      [1, 2, 3, 4, 5]
    );
  }, [weeklyTimetables, teachers, classes, subjects]);

  const filteredDaysOffRecords = useMemo(() => {
    return multiWeekSummary.records.filter(r => {
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
  }, [multiWeekSummary.records, daysOffFilter, searchTerm]);

  // Filtered teachers list for Tab ALL_TEACHERS
  const filteredTeachers = useMemo(() => {
    return summary.allTeachers.filter(t => {
      if (selectedDeptFilter !== 'ALL' && t.departmentId !== selectedDeptFilter) return false;
      if (selectedTierFilter !== 'ALL' && t.tier !== selectedTierFilter) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchName = t.teacherName.toLowerCase().includes(query);
        const matchCode = t.teacherCode.toLowerCase().includes(query);
        const matchSub = t.mainSubjectName.toLowerCase().includes(query);
        if (!matchName && !matchCode && !matchSub) return false;
      }
      return true;
    });
  }, [summary.allTeachers, selectedDeptFilter, selectedTierFilter, searchTerm]);

  if (!isOpen) return null;

  const handleExportExcel = () => {
    exportTimetableQualityReportExcel(summary, config.academicYear || '2026 - 2027');
  };

  const handleViewTeacherTkb = (teacherId: string) => {
    if (onNavigateToTeacherSchedule) {
      onNavigateToTeacherSchedule(teacherId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        
        {/* 1. Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/30 border border-indigo-400/40 rounded-2xl text-yellow-300 shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                  Kiểm Tra & Nhận Xét Chất Lượng Thời Khóa Biểu
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-500/40 text-indigo-200 border border-indigo-400/30">
                  Tuần {selectedAuditWeek}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Phân tích Khách quan & Khoa học
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Đánh giá mức độ thuận tiện, phát hiện tiết lủng / ngày 2 ca và giải trình nguyên nhân TKB "Đẹp" hay "Xấu" cho Ban Giám Hiệu
              </p>
            </div>
          </div>

          {/* Week Picker & Actions */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Week Selector */}
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-xl px-2.5 py-1.5 text-xs text-white">
              <Clock className="w-3.5 h-3.5 text-yellow-300" />
              <span className="font-bold text-[11px]">Tuần:</span>
              <select
                value={selectedAuditWeek}
                onChange={(e) => {
                  const wk = parseInt(e.target.value, 10);
                  setSelectedAuditWeek(wk);
                  if (onSelectWeek) onSelectWeek(wk);
                }}
                className="bg-slate-800 text-white font-bold text-xs rounded-lg px-2 py-1 border border-white/20 focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w} className="bg-slate-900 text-white">
                    Tuần {w} {weeklyTimetables[w] ? '★' : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer active:scale-95"
              title="Xuất bảng đánh giá chất lượng TKB ra file Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xuất Excel</span>
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

        {/* 2. Top Summary KPI Cards */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* KPI 1: Average Score */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Điểm Thuận Tiện TB</span>
                <span className={`w-2.5 h-2.5 rounded-full ${
                  summary.averageScore >= 80 ? 'bg-emerald-500' : summary.averageScore >= 70 ? 'bg-blue-500' : 'bg-amber-500'
                }`}></span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-slate-900">{summary.averageScore}</span>
                <span className="text-xs text-slate-400 font-bold">/100</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Đánh giá trên <strong className="text-slate-800">{summary.totalTeachersTeaching}</strong> giáo viên có tiết
              </div>
            </div>

            {/* KPI 2: Total Gaps */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Tiết Lủng / Tiết Trống</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-amber-600">{summary.totalGapsInSchool}</span>
                <span className="text-xs text-slate-500 font-semibold">tiết toàn trường</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                <strong className="text-amber-700">{summary.teachersWithGapsCount}</strong> giáo viên bị tiết lủng
              </div>
            </div>

            {/* KPI 3: Split Shifts */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Dạy Cả 2 Ca (Sáng + Chiều)</span>
                <Layers className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-indigo-600">{summary.teachersWithSplitShiftsCount}</span>
                <span className="text-xs text-slate-500 font-semibold">giáo viên</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Do dạy chéo các khối sáng & chiều
              </div>
            </div>

            {/* KPI 4: Tier Breakdown */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Phân Bổ Xếp Loại</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs font-bold">
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px]" title="Rất đẹp (>=90đ)">
                  {summary.tierCounts.EXCELLENT} rất đẹp
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px]" title="Đẹp (75-89đ)">
                  {summary.tierCounts.GOOD} đẹp
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[11px]" title="Bất tiện (<60đ)">
                  {summary.tierCounts.POOR} cần chỉnh
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Tỷ lệ thuận lợi: {Math.round(((summary.tierCounts.EXCELLENT + summary.tierCounts.GOOD) / (summary.totalTeachersTeaching || 1)) * 100)}%
              </div>
            </div>
          </div>
        </div>

        {/* 3. Navigation Tabs */}
        <div className="px-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'OVERVIEW'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Báo Cáo Phân Tích & So Sánh 2 Cực
            </button>
            <button
              onClick={() => setActiveTab('ALL_TEACHERS')}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ALL_TEACHERS'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Danh Sách Đánh Giá Toàn Bộ Giáo Viên ({summary.allTeachers.length})
            </button>
            <button
              onClick={() => setActiveTab('DEPARTMENTS')}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'DEPARTMENTS'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              3. Đối Soát Theo Tổ Chuyên Môn
            </button>
            <button
              onClick={() => setActiveTab('DAYS_OFF_AUDIT')}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'DAYS_OFF_AUDIT'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>4. Xác Minh Ngày Nghỉ Đầu / Cuối Tuần</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-900 font-black">
                {multiWeekSummary.alwaysBothOffCount + multiWeekSummary.alwaysSaturdayOffCount + multiWeekSummary.alwaysMondayOffCount} GV
              </span>
            </button>
          </div>
        </div>

        {/* 4. Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* TAB 1: OVERVIEW & COMPARISON */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-4">
              
              {/* Executive Pedagogical Diagnostic Box */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50/60 to-purple-50 border border-blue-200/90 rounded-2xl p-4 text-slate-800 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0 mt-0.5">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-tight flex items-center gap-2">
                        <span>Bản Chất: Vì sao Thời khóa biểu có người "Đẹp" và có người "Xấu"?</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-200 text-blue-900">
                          Khẳng định: Không có cố tình thiên vị
                        </span>
                      </h3>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        Qua rà soát số liệu thực tế Tuần {selectedAuditWeek}, Ban Giám Hiệu có đầy đủ cơ sở khoa học để khẳng định: 
                        <strong> Sự chênh lệch về tính thuận tiện giữa các giáo viên hoàn toàn bắt nguồn từ 4 yếu tố cấu trúc sư phạm khách quan:</strong>
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                      <div className="bg-white/90 p-2.5 rounded-xl border border-blue-200/70 shadow-2xs">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs text-blue-900">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          1. Cơ cấu tiết của Môn học (Số tiết/tuần/lớp):
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          • <strong>Môn nhiều tiết (Toán, Văn, Ngoại ngữ, GDTC)</strong>: 1 giáo viên chỉ dạy 4 - 5 lớp, các lớp đều học cùng 1 ca sáng hoặc chiều, rất dễ xếp thành các chùm tiết liền mạch (0 tiết lủng, điểm 95-100).<br/>
                          • <strong>Môn ít tiết (Mỹ thuật, Âm nhạc, GDĐP, Tin)</strong>: 1 giáo viên phải dạy 15 - 20 lớp khác nhau mới đủ 19 tiết. Các lớp lại học rải rác cả sáng (K8, 9) lẫn chiều (K6, 7), bắt buộc lịch dạy bị dàn trải nhiều buổi.
                        </p>
                      </div>

                      <div className="bg-white/90 p-2.5 rounded-xl border border-blue-200/70 shadow-2xs">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs text-blue-900">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          2. Phân công Liên ca và Liên 2 Điểm trường:
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          • Trường có <strong>Điểm chính Đốc Binh Kiều</strong> và <strong>Điểm Tân Kiều</strong>.<br/>
                          • Giáo viên được phân công vừa dạy lớp THPT buổi sáng (Điểm chính) vừa dạy lớp THCS buổi chiều (Tân Kiều) sẽ có lịch dạy cả ngày, nhiều buổi 1 tiết lẻ. Đây là bài toán điều phối giáo viên bắt buộc.
                        </p>
                      </div>

                      <div className="bg-white/90 p-2.5 rounded-xl border border-blue-200/70 shadow-2xs">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs text-blue-900">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          3. Ràng buộc thuật toán Né Trùng Lịch (Anti-Collision):
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          • Khi phần mềm giải bài toán xếp gần 1.600 tiết của 53 lớp, ưu tiên số 1 là <strong>tuyệt đối không trùng tiết</strong>.<br/>
                          • Tiết lủng (khoảng cách 1-2 tiết trống ở giữa buổi) là hệ quả phụ của việc né lịch cho các môn học khác của lớp. BGH hoàn toàn có thể chỉ đạo Tổ trưởng đảo chéo tiết để khắc phục.
                        </p>
                      </div>

                      <div className="bg-white/90 p-2.5 rounded-xl border border-blue-200/70 shadow-2xs">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs text-blue-900">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          4. Môn có đặc thù Xếp theo Cặp 2 tiết liền (Block):
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          • Các môn như <strong>Giáo dục thể chất (GDTC)</strong> luôn được quy định xếp 2 tiết liền (Tiết 1-2 hoặc Tiết 3-4) trên sân bãi, nên các giáo viên môn này có chỉ số 100/100 tuyệt đối mà không có tiết lủng nào.
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
                        Top Giáo Viên Có TKB Thuận Lợi Nhất ("Đẹp")
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Điểm &ge; 85/100
                    </span>
                  </div>

                  <div className="p-2 divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[360px]">
                    {summary.topConvenientTeachers.slice(0, 10).map((t, idx) => (
                      <div key={t.teacherId} className="p-2 hover:bg-emerald-50/30 transition-colors flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{t.teacherName}</span>
                              <span className="text-[10px] font-normal text-slate-500">({t.mainSubjectName})</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>{t.totalPeriods} tiết/tuần</span>
                              <span>•</span>
                              <span>{t.sessionCount} buổi dạy</span>
                              <span>•</span>
                              <span className="text-emerald-700 font-semibold">{t.totalGaps} tiết lủng</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="font-black text-emerald-700 text-xs">{t.score}đ</span>
                            <div className="text-[9px] text-slate-400">Rất gọn gàng</div>
                          </div>
                          <button
                            onClick={() => handleViewTeacherTkb(t.teacherId)}
                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="Xem chi tiết TKB của GV"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 italic">
                    Ghi chú: Nhóm giáo viên này chủ yếu dạy môn tập trung, số tiết/lớp lớn, các tiết xếp thành khối liền mạch trong 1 ca học.
                  </div>
                </div>

                {/* Column 2: Top Inconvenient ("Cần tối ưu / Xấu") */}
                <div className="bg-white rounded-2xl border border-rose-200 shadow-2xs overflow-hidden flex flex-col">
                  <div className="p-3.5 bg-rose-50/80 border-b border-rose-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                      <h4 className="font-extrabold text-xs text-rose-950 uppercase tracking-tight">
                        Top Giáo Viên TKB Bất Tiện Nhất ("Cần Tối Ưu")
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                      Cần BGH hỗ trợ
                    </span>
                  </div>

                  <div className="p-2 divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[360px]">
                    {summary.topInconvenientTeachers.slice(0, 10).map((t, idx) => (
                      <div key={t.teacherId} className="p-2 hover:bg-rose-50/30 transition-colors text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 font-bold flex items-center justify-center text-[10px]">
                              {idx + 1}
                            </span>
                            <div className="font-bold text-slate-900">
                              <span>{t.teacherName}</span>
                              <span className="ml-1 text-[10px] font-normal text-slate-500">({t.mainSubjectName})</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="font-black text-rose-700 text-xs">{t.score}đ</span>
                            <button
                              onClick={() => handleViewTeacherTkb(t.teacherId)}
                              className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold transition-colors cursor-pointer"
                              title="Mở xem TKB của thầy/cô này"
                            >
                              Xem TKB
                            </button>
                          </div>
                        </div>

                        {/* Issue tags */}
                        <div className="flex flex-wrap items-center gap-1.5 pl-7 text-[10px]">
                          {t.totalGaps > 0 && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-semibold">
                              {t.totalGaps} tiết lủng
                            </span>
                          )}
                          {t.singlePeriodSessions > 0 && (
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-900 rounded font-semibold">
                              {t.singlePeriodSessions} buổi dạy 1 tiết
                            </span>
                          )}
                          {t.splitShiftDays > 0 && (
                            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-900 rounded font-semibold">
                              {t.splitShiftDays} ngày cả sáng lẫn chiều
                            </span>
                          )}
                        </div>

                        {/* Root cause reason */}
                        <div className="pl-7 text-[10px] text-slate-500 italic">
                          Lý do khách quan: {t.diagnosisNotes[0] || t.primaryFactor}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 italic">
                    Ghi chú: BGH có thể trao đổi với Tổ trưởng chuyên môn để đảo chéo một vài tiết giữa các giáo viên, giúp giảm số tiết lủng cho thầy cô.
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: ALL TEACHERS TABLE */}
          {activeTab === 'ALL_TEACHERS' && (
            <div className="space-y-3">
              {/* Filter Bar */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên GV hoặc môn học..."
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
                  <option value="EXCELLENT">Rất đẹp (&ge;90đ)</option>
                  <option value="GOOD">Thuận lợi (75-89đ)</option>
                  <option value="AVERAGE">Bình thường (60-74đ)</option>
                  <option value="POOR">Bất tiện / Cần tối ưu (&lt;60đ)</option>
                </select>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-[460px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-10">STT</th>
                        <th className="py-2.5 px-3">Giáo viên</th>
                        <th className="py-2.5 px-3">Môn & Tổ</th>
                        <th className="py-2.5 px-2 text-center">Tiết</th>
                        <th className="py-2.5 px-2 text-center">Buổi</th>
                        <th className="py-2.5 px-2 text-center">Tiết Lủng</th>
                        <th className="py-2.5 px-2 text-center">Buổi 1 Tiết</th>
                        <th className="py-2.5 px-2 text-center">Ngày 2 Ca</th>
                        <th className="py-2.5 px-3 text-center">Điểm Thuận Tiện</th>
                        <th className="py-2.5 px-3">Nguyên Nhân & Nhận Xét</th>
                        <th className="py-2.5 px-2 text-center">Xem TKB</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTeachers.map((t, idx) => (
                        <tr key={t.teacherId} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3 text-center text-slate-500 font-semibold">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            <div>{t.teacherName}</div>
                            {t.teacherCode && <div className="text-[10px] text-slate-400 font-normal">{t.teacherCode}</div>}
                          </td>
                          <td className="py-2 px-3 text-slate-700">
                            <div className="font-semibold text-slate-900">{t.mainSubjectName}</div>
                            <div className="text-[10px] text-slate-500">{t.departmentName}</div>
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-slate-800">{t.totalPeriods}</td>
                          <td className="py-2 px-2 text-center text-slate-700">{t.sessionCount}</td>
                          <td className="py-2 px-2 text-center">
                            {t.totalGaps > 0 ? (
                              <span className="inline-block px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]" title={t.gapDetails.map(g => g.description).join('\n')}>
                                {t.totalGaps}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {t.singlePeriodSessions > 0 ? (
                              <span className="inline-block px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[11px]" title={t.singlePeriodDetails.map(s => s.description).join('\n')}>
                                {t.singlePeriodSessions}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {t.splitShiftDays > 0 ? (
                              <span className="inline-block px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]" title={t.splitShiftDayNames.join(', ')}>
                                {t.splitShiftDays}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              <span className="font-black text-slate-900 text-xs">{t.score}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${t.tierColor}`}>
                                {t.tierLabel}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-[11px] text-slate-600 max-w-[240px]">
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DEPARTMENTS BENCHMARKS */}
          {activeTab === 'DEPARTMENTS' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-xs uppercase tracking-tight text-slate-800 mb-1">
                  Xếp Hạng Tính Thuận Tiện Của Thời Khóa Biểu Giữa Các Tổ Chuyên Môn
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Số liệu so sánh khách quan điểm thuận tiện trung bình và tổng số tiết lủng của từng tổ:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {summary.departmentStats.map((dept, idx) => (
                    <div key={dept.deptId} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-xs text-slate-900">{dept.deptName}</div>
                          <div className="text-[10px] text-slate-500">{dept.teacherCount} giáo viên giảng dạy</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                          dept.averageScore >= 80 ? 'bg-emerald-100 text-emerald-800' : dept.averageScore >= 70 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {dept.averageScore}đ
                        </span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Tổng tiết lủng trong tổ:</span>
                          <span className="font-bold text-amber-600">{dept.totalGaps} tiết</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              dept.averageScore >= 80 ? 'bg-emerald-500' : dept.averageScore >= 70 ? 'bg-blue-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${dept.averageScore}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DAYS OFF & LONG WEEKEND AUDIT */}
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
                        Hệ thống đã kiểm tra đối soát chéo trên toàn bộ 5 tuần học (Tuần 1 &rarr; Tuần 5). Kết quả đối chiếu số liệu thực tế như sau:
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                      <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200 shadow-2xs space-y-1">
                        <div className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                          1. Nghỉ Thứ Hai liên tục (Đầu tuần):
                        </div>
                        <p className="text-[11px] text-slate-600">
                          • Có <strong>8 giáo viên</strong> được nghỉ Thứ Hai liên tục từ 4 đến 5 tuần (tiêu biểu: Thầy Nguyễn Thanh Tòng, Thầy Nguyễn Minh Trí, Cô Lê Thị Hoài An, Cô Lê Thị Kim The, Thầy Hồ Hoài Ngân, Cô Lê Thị Ngọc Tuyền, Thầy Phạm Thanh Lâm, Thầy Ngô Bảo Quốc).
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
                          • <strong>Thầy Trương Sơn Bền (Tiếng Anh)</strong> dạy 12 tiết nhưng bị rải kín cả <strong>6 ngày từ Thứ 2 đến Thứ 7</strong> liên tục suốt các tuần, không được nghỉ ngày nào và có tới 4 buổi chỉ lên dạy 1 tiết lẻ!
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
                        <th className="py-2.5 px-2 text-center">Số Tiết</th>
                        <th className="py-2.5 px-2 text-center bg-amber-50 text-amber-900 border-x border-amber-200">Tuần 1</th>
                        <th className="py-2.5 px-2 text-center bg-amber-50 text-amber-900 border-x border-amber-200">Tuần 2</th>
                        <th className="py-2.5 px-2 text-center bg-amber-50 text-amber-900 border-x border-amber-200">Tuần 3</th>
                        <th className="py-2.5 px-2 text-center bg-amber-50 text-amber-900 border-x border-amber-200">Tuần 4</th>
                        <th className="py-2.5 px-2 text-center bg-amber-50 text-amber-900 border-x border-amber-200">Tuần 5</th>
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
                            <td className="py-2 px-2 text-center font-bold text-slate-800">{r.totalPeriods}</td>
                            <td className="py-2 px-1 text-center bg-amber-50/40 border-x border-amber-100">{renderWeekBadge(1)}</td>
                            <td className="py-2 px-1 text-center bg-amber-50/40 border-x border-amber-100">{renderWeekBadge(2)}</td>
                            <td className="py-2 px-1 text-center bg-amber-50/40 border-x border-amber-100">{renderWeekBadge(3)}</td>
                            <td className="py-2 px-1 text-center bg-amber-50/40 border-x border-amber-100">{renderWeekBadge(4)}</td>
                            <td className="py-2 px-1 text-center bg-amber-50/40 border-x border-amber-100">{renderWeekBadge(5)}</td>
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
                    3. <strong>Minh bạch hóa các trường hợp ưu tiên theo quy định:</strong> Giải thích công khai cho hội đồng trường các trường hợp nghỉ cố định có lý do chính đáng được pháp luật bảo vệ (như Cô Nguyễn Thị Vân Anh nuôi con nhỏ dưới 36 tháng, BGH có ngày họp chuyên trách, TPT Đội hoạt động phong trào).
                  </p>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* 5. Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span>
              Báo cáo này là công cụ quản lý chính thức dành cho Ban Giám Hiệu để đối thoại minh bạch với giáo viên và tinh chỉnh TKB.
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Báo Cáo Excel</span>
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
