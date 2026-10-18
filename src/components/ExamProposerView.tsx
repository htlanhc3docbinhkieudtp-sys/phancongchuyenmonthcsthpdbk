import React, { useState, useMemo, useEffect } from 'react';
import {
  FileQuestion,
  ShieldCheck,
  Download,
  Printer,
  Sparkles,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  ChevronDown,
  Info,
  X,
  FileSpreadsheet,
  Check,
  Award
} from 'lucide-react';
import {
  ClassGroup,
  Subject,
  Teacher,
  Assignment,
  TimetableSlot,
  SchoolConfig,
  SchoolTimetable
} from '../types';
import {
  ExamPeriod,
  EXAM_PERIODS,
  FocusedExamSubjectItem,
  ExamProposalMap,
  buildFocusedExamItems,
  loadExamProposals,
  saveExamProposals,
  generateAutoExamProposals,
  exportExamProposalsToExcel
} from '../utils/examProposerHelper';

interface ExamProposerViewProps {
  config: SchoolConfig;
  classes: ClassGroup[];
  subjects: Subject[];
  teachers: Teacher[];
  assignments: Assignment[];
  timetable?: SchoolTimetable;
  weeklyTimetables?: Record<number, SchoolTimetable>;
  currentWeek?: number;
  onShowToast?: (msg: string) => void;
}

export const ExamProposerView: React.FC<ExamProposerViewProps> = ({
  config,
  classes,
  subjects,
  teachers,
  assignments,
  timetable,
  weeklyTimetables,
  currentWeek = 7,
  onShowToast,
}) => {
  const academicYear = config.academicYear || '2026 - 2027';

  // 1. Current Exam Period selection
  const [selectedPeriod, setSelectedPeriod] = useState<ExamPeriod>('GK1');

  // 2. Load latest slots from current week or timetable
  const activeSlots = useMemo(() => {
    if (weeklyTimetables && weeklyTimetables[currentWeek]?.slots?.length) {
      return weeklyTimetables[currentWeek].slots;
    }
    if (weeklyTimetables && weeklyTimetables[7]?.slots?.length) {
      return weeklyTimetables[7].slots;
    }
    if (timetable?.slots?.length) {
      return timetable.slots;
    }
    return [];
  }, [weeklyTimetables, currentWeek, timetable]);

  // 3. Build focused exam items with teacher stats
  const allExamItems = useMemo(() => {
    return buildFocusedExamItems(classes, subjects, teachers, assignments, activeSlots);
  }, [classes, subjects, teachers, assignments, activeSlots]);

  // 4. Proposals state, loaded per academicYear & selectedPeriod
  const [proposals, setProposals] = useState<ExamProposalMap>(() => {
    return loadExamProposals(academicYear, 'GK1');
  });

  // Reload proposals when selectedPeriod changes
  useEffect(() => {
    setProposals(loadExamProposals(academicYear, selectedPeriod));
  }, [academicYear, selectedPeriod]);

  // 5. Filters state
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'THCS' | 'THPT'>('ALL');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 6. Fast teacher map
  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);

  // 7. Save change handler
  const handleUpdateProposal = (itemId: string, field: string, value: any) => {
    setProposals(prev => {
      const existing = prev[itemId] || {
        primaryTeacherId: '',
        primaryTeacherName: '',
        durationMinutes: 45,
        examFormat: 'Trắc nghiệm + Tự luận',
      };

      const updated = {
        ...existing,
        [field]: value,
        updatedAt: Date.now(),
      };

      // If updating primaryTeacherId, also record primaryTeacherName
      if (field === 'primaryTeacherId') {
        const t = teacherMap.get(value);
        updated.primaryTeacherName = t?.name || '';
      }
      // If updating reserveTeacherId, also record reserveTeacherName
      if (field === 'reserveTeacherId') {
        const t = teacherMap.get(value);
        updated.reserveTeacherName = t?.name || '';
      }

      const next = { ...prev, [itemId]: updated };
      saveExamProposals(academicYear, selectedPeriod, next);
      return next;
    });
  };

  // 8. Auto-proposal action
  const handleAutoPropose = () => {
    const auto = generateAutoExamProposals(allExamItems);
    setProposals(prev => {
      const merged = { ...prev, ...auto };
      saveExamProposals(academicYear, selectedPeriod, merged);
      return merged;
    });
    onShowToast?.(`Đã tự động đề xuất người ra đề theo số lớp phụ trách cho ${Object.keys(auto).length} môn/khối!`);
  };

  // 9. Reset action
  const handleResetProposals = () => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ đề xuất người ra đề của đợt "${EXAM_PERIODS.find(p => p.id === selectedPeriod)?.name}"?`)) {
      setProposals({});
      saveExamProposals(academicYear, selectedPeriod, {});
      onShowToast?.('Đã đặt lại danh sách đề xuất người ra đề!');
    }
  };

  // 10. Export Excel action
  const [isExporting, setIsExporting] = useState(false);
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      await exportExamProposalsToExcel(filteredItems, proposals, academicYear, selectedPeriod);
      onShowToast?.('Đã xuất thành công file Excel Bảng đề xuất người ra đề!');
    } catch (err) {
      console.error(err);
      onShowToast?.('Có lỗi xảy ra khi xuất file Excel');
    } finally {
      setIsExporting(false);
    }
  };

  // 11. Print action
  const handlePrint = () => {
    window.print();
  };

  // 12. Filtered items
  const filteredItems = useMemo(() => {
    return allExamItems.filter(item => {
      if (levelFilter !== 'ALL' && item.level !== levelFilter) return false;
      if (gradeFilter !== 'ALL' && item.grade !== gradeFilter) return false;
      if (subjectFilter !== 'ALL' && item.subjectKey !== subjectFilter) return false;

      const prop = proposals[item.id];
      const isAssigned = Boolean(prop?.primaryTeacherId && prop?.primaryTeacherName);
      if (statusFilter === 'ASSIGNED' && !isAssigned) return false;
      if (statusFilter === 'UNASSIGNED' && isAssigned) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchSubject = item.subjectName.toLowerCase().includes(q);
        const matchGrade = item.gradeLabel.toLowerCase().includes(q);
        const matchTeacher = item.teachers.some(t => t.teacherName.toLowerCase().includes(q) || t.teacherCode.toLowerCase().includes(q));
        const matchAssigned = (prop?.primaryTeacherName?.toLowerCase().includes(q)) || (prop?.reserveTeacherName?.toLowerCase().includes(q));
        const matchClass = item.teachers.some(t => t.classes.some(c => c.className.toLowerCase().includes(q)));
        if (!matchSubject && !matchGrade && !matchTeacher && !matchAssigned && !matchClass) {
          return false;
        }
      }

      return true;
    });
  }, [allExamItems, levelFilter, gradeFilter, subjectFilter, statusFilter, searchTerm, proposals]);

  // 13. KPI Stats
  const kpiStats = useMemo(() => {
    const totalItems = allExamItems.length;
    let assignedCount = 0;
    let totalClassesCount = 0;
    const allTeacherIds = new Set<string>();

    allExamItems.forEach(item => {
      const prop = proposals[item.id];
      if (prop?.primaryTeacherId && prop?.primaryTeacherName) {
        assignedCount++;
      }
      totalClassesCount += item.totalClassesInGrade;
      item.teachers.forEach(t => allTeacherIds.add(t.teacherId));
    });

    const completionRate = totalItems > 0 ? Math.round((assignedCount / totalItems) * 100) : 0;

    return {
      totalItems,
      assignedCount,
      unassignedCount: totalItems - assignedCount,
      completionRate,
      totalClassesCount,
      totalTeachersCount: allTeacherIds.size,
    };
  }, [allExamItems, proposals]);

  // Unique subject list for filter dropdown
  const uniqueSubjects = useMemo(() => {
    const map = new Map<string, string>();
    allExamItems.forEach(item => {
      if (!map.has(item.subjectKey)) {
        map.set(item.subjectKey, item.subjectName);
      }
    });
    return Array.from(map.entries()).map(([key, name]) => ({ key, name }));
  }, [allExamItems]);

  return (
    <div className="space-y-6 pb-16 print:p-0 print:m-0 print:space-y-4">
      {/* 1. Header Banner & Security Badge */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <FileQuestion className="w-3.5 h-3.5 text-indigo-600" />
                Kiểm Tra Tập Trung
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                Bảo mật BGH • Chỉ Quản trị viên
              </span>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                Năm học: <strong className="text-slate-800">{academicYear}</strong>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Đề Xuất Người Ra Đề Kiểm Tra Tập Trung
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
              Bảng thống kê số lớp phụ trách theo môn, theo khối và theo giáo viên giảng dạy thực tế. Ban Giám Hiệu căn cứ vào số lớp và năng lực chuyên môn để chỉ định người ra đề chính & đề dự bị/phản biện.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 print:hidden shrink-0">
            <button
              onClick={handleAutoPropose}
              title="Tự động gợi ý người dạy nhiều lớp nhất làm đề chính"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-xs hover:shadow transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gợi ý tự động</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              title="Xuất bảng đề xuất ra file Excel"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
            </button>

            <button
              onClick={handlePrint}
              title="In bảng phân công ra đề"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-700 hover:bg-slate-800 text-white shadow-xs hover:shadow transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In bảng</span>
            </button>

            <button
              onClick={handleResetProposals}
              title="Đặt lại đề xuất kỳ này"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đặt lại</span>
            </button>
          </div>
        </div>

        {/* Exam Period Pill Tabs */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              Đợt kiểm tra:
            </span>
            <div className="inline-flex p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
              {EXAM_PERIODS.map(p => {
                const isSelected = selectedPeriod === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPeriod(p.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-indigo-700 shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-xs text-slate-500 italic">
            Dữ liệu phân công được tự động lưu theo từng đợt kiểm tra.
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 print:hidden">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng môn - khối</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{kpiStats.totalItems}</span>
            <span className="text-xs text-slate-500">môn/khối</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            THCS: 24 • THPT: 33 môn/khối
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đã chọn người ra đề</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{kpiStats.assignedCount}</span>
            <span className="text-xs font-bold text-emerald-700">({kpiStats.completionRate}%)</span>
          </div>
          <div className="mt-1 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${kpiStats.completionRate}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chưa phân công</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black ${kpiStats.unassignedCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
              {kpiStats.unassignedCount}
            </span>
            <span className="text-xs text-slate-500">môn/khối cần chỉ định</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {kpiStats.unassignedCount === 0 ? '✨ Đã hoàn thành 100%' : 'Cần chọn giáo viên phụ trách'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">GV tham gia dạy</span>
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{kpiStats.totalTeachersCount}</span>
            <span className="text-xs text-slate-500">giáo viên</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Trong {kpiStats.totalClassesCount} lượt lớp kiểm tra
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 print:hidden">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm theo môn, khối, tên GV, tên lớp..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 placeholder-slate-400 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Level Filter */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                onClick={() => setLevelFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                  levelFilter === 'ALL' ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả ({allExamItems.length})
              </button>
              <button
                onClick={() => setLevelFilter('THCS')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                  levelFilter === 'THCS' ? 'bg-white text-blue-700 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cấp THCS (24)
              </button>
              <button
                onClick={() => setLevelFilter('THPT')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                  levelFilter === 'THPT' ? 'bg-white text-purple-700 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cấp THPT (33)
              </button>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ASSIGNED">Đã phân công</option>
              <option value="UNASSIGNED">Chưa phân công</option>
            </select>
          </div>
        </div>

        {/* Secondary filters (Grade & Subject dropdowns) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <span className="font-bold text-slate-400">Lọc chi tiết:</span>

          {/* Grade filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-500">Khối:</span>
            <select
              value={gradeFilter}
              onChange={e => setGradeFilter(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="ALL">Tất cả các khối</option>
              <option value="6">Khối 6</option>
              <option value="7">Khối 7</option>
              <option value="8">Khối 8</option>
              <option value="9">Khối 9</option>
              <option value="10">Khối 10</option>
              <option value="11">Khối 11</option>
              <option value="12">Khối 12</option>
            </select>
          </div>

          {/* Subject filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-500">Môn:</span>
            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="ALL">Tất cả các môn kiểm tra</option>
              {uniqueSubjects.map(s => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {(gradeFilter !== 'ALL' || subjectFilter !== 'ALL' || statusFilter !== 'ALL' || levelFilter !== 'ALL' || searchTerm) && (
            <button
              onClick={() => {
                setLevelFilter('ALL');
                setGradeFilter('ALL');
                setSubjectFilter('ALL');
                setStatusFilter('ALL');
                setSearchTerm('');
              }}
              className="ml-auto text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}

          <span className="ml-auto text-[11px] text-slate-500">
            Hiển thị <strong>{filteredItems.length}</strong> / {allExamItems.length} môn-khối
          </span>
        </div>
      </div>

      {/* 4. Print Header (Visible only on print) */}
      <div className="hidden print:block text-center space-y-1 mb-4">
        <div className="text-xs uppercase font-bold text-slate-700">SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP — TRƯỜNG THPT ĐỐC BINH KIỀU</div>
        <h2 className="text-lg font-black uppercase text-slate-900">
          BẢNG ĐỀ XUẤT PHÂN CÔNG NGƯỜI RA ĐỀ KIỂM TRA TẬP TRUNG
        </h2>
        <div className="text-xs text-slate-600">
          KỲ KIỂM TRA: {EXAM_PERIODS.find(p => p.id === selectedPeriod)?.name.toUpperCase()} • NĂM HỌC: {academicYear}
        </div>
      </div>

      {/* 5. Main Statistics Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border-slate-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 text-slate-700 border-b border-slate-200/90 text-[11px] uppercase tracking-wider font-extrabold select-none">
                <th className="py-3 px-3 text-center w-12">STT</th>
                <th className="py-3 px-3 text-center w-20">Khối</th>
                <th className="py-3 px-3 w-40">Môn kiểm tra</th>
                <th className="py-3 px-3 text-center w-24">Số lớp</th>
                <th className="py-3 px-4 min-w-[320px]">
                  Thống kê GV giảng dạy & Số lớp phụ trách
                  <span className="block text-[10px] font-normal text-slate-500 lowercase">
                    (nhấp vào thẻ để chọn nhanh người ra đề)
                  </span>
                </th>
                <th className="py-3 px-3 min-w-[210px] bg-indigo-50/50 text-indigo-900 border-x border-indigo-100">
                  Người ra đề CHÍNH <span className="text-rose-500">*</span>
                </th>
                <th className="py-3 px-3 min-w-[190px]">Người ra đề DỰ BỊ / PHẢN BIỆN</th>
                <th className="py-3 px-2 text-center w-20">Thời lượng</th>
                <th className="py-3 px-3 w-36">Hình thức</th>
                <th className="py-3 px-3 w-44">Ghi chú</th>
                <th className="py-3 px-3 text-center w-24">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 italic">
                    <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Không tìm thấy môn/khối nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const prop = proposals[item.id] || {
                    primaryTeacherId: '',
                    primaryTeacherName: '',
                    durationMinutes: item.defaultDuration,
                    examFormat: item.defaultFormat,
                  };

                  const isAssigned = Boolean(prop.primaryTeacherId && prop.primaryTeacherName);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isAssigned ? 'bg-white' : 'bg-amber-50/20'
                      }`}
                    >
                      {/* STT */}
                      <td className="py-3 px-3 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>

                      {/* Khối & Cấp */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-black ${
                            item.level === 'THPT'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {item.gradeLabel}
                        </span>
                        <span className="block text-[10px] text-slate-500 mt-0.5 font-semibold">
                          {item.level}
                        </span>
                      </td>

                      {/* Môn kiểm tra */}
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-slate-900 text-[13px]">
                          {item.subjectName}
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {item.level === 'THCS' ? 'Kiểm tra tập trung THCS' : 'Kiểm tra tập trung THPT'}
                        </span>
                      </td>

                      {/* Số lớp trong khối */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                          {item.totalClassesInGrade} lớp
                        </span>
                      </td>

                      {/* Thống kê giáo viên & số lớp phụ trách */}
                      <td className="py-3 px-4">
                        {item.teachers.length === 0 ? (
                          <span className="text-slate-400 italic text-[11px]">
                            Chưa có dữ liệu phân công giảng dạy
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {item.teachers.map(t => {
                              const isPrimary = prop.primaryTeacherId === t.teacherId;
                              const isReserve = prop.reserveTeacherId === t.teacherId;
                              const classListStr = t.classes.map(c => c.className).join(', ');

                              return (
                                <div
                                  key={t.teacherId}
                                  className={`group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                                    isPrimary
                                      ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold ring-1 ring-indigo-400'
                                      : isReserve
                                      ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                                      : 'bg-slate-50 hover:bg-slate-100/90 border-slate-200 text-slate-700'
                                  }`}
                                  title={`${t.teacherName} dạy ${t.classCount} lớp: ${classListStr}`}
                                >
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1">
                                      <span className="font-bold text-[12px]">{t.teacherName}</span>
                                      {isPrimary && (
                                        <span className="text-[9px] px-1 py-0.2 bg-indigo-600 text-white rounded-xs font-black">
                                          ĐỀ CHÍNH
                                        </span>
                                      )}
                                      {isReserve && (
                                        <span className="text-[9px] px-1 py-0.2 bg-amber-600 text-white rounded-xs font-black">
                                          DỰ BỊ
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-500">
                                      <strong className="text-slate-700 font-bold">{t.classCount} lớp:</strong>{' '}
                                      {classListStr}
                                    </span>
                                  </div>

                                  {/* Quick assign buttons on hover */}
                                  <div className="hidden group-hover:flex items-center gap-1 ml-1 print:hidden">
                                    {!isPrimary && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateProposal(item.id, 'primaryTeacherId', t.teacherId)}
                                        title="Chọn làm người ra đề chính"
                                        className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[10px] font-bold cursor-pointer"
                                      >
                                        Đề chính
                                      </button>
                                    )}
                                    {!isReserve && !isPrimary && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateProposal(item.id, 'reserveTeacherId', t.teacherId)}
                                        title="Chọn làm người ra đề dự bị/phản biện"
                                        className="p-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-[10px] font-bold cursor-pointer"
                                      >
                                        Dự bị
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Người ra đề CHÍNH */}
                      <td className="py-3 px-3 bg-indigo-50/20 border-x border-indigo-100">
                        <div className="space-y-1">
                          <select
                            value={prop.primaryTeacherId || ''}
                            onChange={e => handleUpdateProposal(item.id, 'primaryTeacherId', e.target.value)}
                            className={`w-full text-xs font-bold py-1.5 px-2.5 rounded-xl border transition-all ${
                              prop.primaryTeacherId
                                ? 'bg-white border-indigo-300 text-indigo-900 shadow-2xs font-extrabold'
                                : 'bg-white border-rose-300 text-rose-600 font-medium'
                            }`}
                          >
                            <option value="">-- Chọn GV ra đề chính --</option>
                            <optgroup label="Giáo viên đang dạy khối này">
                              {item.teachers.map(t => (
                                <option key={t.teacherId} value={t.teacherId}>
                                  {t.teacherName} ({t.classCount} lớp)
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Tất cả giáo viên trong trường">
                              {teachers
                                .filter(t => !item.teachers.some(it => it.teacherId === t.id))
                                .map(t => (
                                  <option key={t.id} value={t.id}>
                                    {t.name} ({t.code || 'GV'})
                                  </option>
                                ))}
                            </optgroup>
                          </select>

                          {prop.primaryTeacherName && (
                            <div className="flex items-center justify-between text-[11px] text-emerald-700 px-1 font-semibold">
                              <span className="flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600" />
                                {prop.primaryTeacherName}
                              </span>
                              <button
                                onClick={() => handleUpdateProposal(item.id, 'primaryTeacherId', '')}
                                title="Bỏ chọn"
                                className="text-slate-400 hover:text-rose-500 p-0.5 print:hidden"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Người ra đề DỰ BỊ / PHẢN BIỆN */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <select
                            value={prop.reserveTeacherId || ''}
                            onChange={e => handleUpdateProposal(item.id, 'reserveTeacherId', e.target.value)}
                            className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium"
                          >
                            <option value="">-- Chọn GV dự bị/phản biện --</option>
                            <optgroup label="Giáo viên đang dạy khối này">
                              {item.teachers.map(t => (
                                <option key={t.teacherId} value={t.teacherId}>
                                  {t.teacherName} ({t.classCount} lớp)
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Tất cả giáo viên trong trường">
                              {teachers
                                .filter(t => !item.teachers.some(it => it.teacherId === t.id))
                                .map(t => (
                                  <option key={t.id} value={t.id}>
                                    {t.name} ({t.code || 'GV'})
                                  </option>
                                ))}
                            </optgroup>
                          </select>

                          {prop.reserveTeacherName && (
                            <div className="flex items-center justify-between text-[11px] text-amber-700 px-1 font-semibold">
                              <span>Dự bị: {prop.reserveTeacherName}</span>
                              <button
                                onClick={() => handleUpdateProposal(item.id, 'reserveTeacherId', '')}
                                title="Bỏ chọn"
                                className="text-slate-400 hover:text-rose-500 p-0.5 print:hidden"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Thời lượng */}
                      <td className="py-3 px-2 text-center">
                        <select
                          value={prop.durationMinutes || item.defaultDuration}
                          onChange={e => handleUpdateProposal(item.id, 'durationMinutes', Number(e.target.value))}
                          className="py-1 px-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-800 text-center"
                        >
                          <option value={45}>45p</option>
                          <option value={60}>60p</option>
                          <option value={90}>90p</option>
                        </select>
                      </td>

                      {/* Hình thức */}
                      <td className="py-3 px-3">
                        <select
                          value={prop.examFormat || item.defaultFormat}
                          onChange={e => handleUpdateProposal(item.id, 'examFormat', e.target.value)}
                          className="w-full py-1.5 px-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium"
                        >
                          <option value="Trắc nghiệm 100%">Trắc nghiệm 100%</option>
                          <option value="Tự luận 100%">Tự luận 100%</option>
                          <option value="Trắc nghiệm + Tự luận">Trắc nghiệm + Tự luận</option>
                          <option value="Trắc nghiệm + Thực hành">Trắc nghiệm + Thực hành</option>
                        </select>
                      </td>

                      {/* Ghi chú */}
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          value={prop.notes || ''}
                          onChange={e => handleUpdateProposal(item.id, 'notes', e.target.value)}
                          placeholder="Hạn nộp đề, ma trận..."
                          className="w-full py-1.5 px-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400"
                        />
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3 px-3 text-center">
                        {isAssigned ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Đã chọn
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            Còn trống
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Footer Signature Block (Printed only) */}
      <div className="hidden print:grid grid-cols-3 gap-6 pt-10 text-center text-xs">
        <div>
          <div className="font-bold text-slate-900 uppercase">Người Lập Bảng</div>
          <div className="text-slate-500 text-[10px] italic mb-16">(Ký và ghi rõ họ tên)</div>
          <div className="font-bold text-slate-800">Phụ trách Chuyên môn</div>
        </div>
        <div>
          <div className="font-bold text-slate-900 uppercase">Phó Hiệu Trưởng Duyệt</div>
          <div className="text-slate-500 text-[10px] italic mb-16">(Ký và ghi rõ họ tên)</div>
          <div className="font-bold text-slate-800">Nguyễn Minh Trí</div>
        </div>
        <div>
          <div className="font-bold text-slate-900 uppercase">Hiệu Trưởng Phê Duyệt</div>
          <div className="text-slate-500 text-[10px] italic mb-16">(Ký và đóng dấu)</div>
          <div className="font-bold text-slate-800">Lê Thanh Cường</div>
        </div>
      </div>
    </div>
  );
};
