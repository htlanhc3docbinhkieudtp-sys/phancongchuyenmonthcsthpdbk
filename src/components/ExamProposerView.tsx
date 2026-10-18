import React, { useState, useMemo } from 'react';
import {
  FileQuestion,
  ShieldCheck,
  Download,
  Printer,
  Sparkles,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  Users,
  BookOpen,
  Calendar,
  X,
  Check,
  Star,
  Info,
  Clock
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
  FocusedExamSubjectItem,
  YearExamProposalMap,
  buildFocusedExamItems,
  loadYearExamProposals,
  saveYearExamProposals,
  generateAutoExamProposalsForGK1,
  exportYearExamProposalsToExcel
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

  // Load latest slots from current week or timetable
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

  // Build focused exam items with teacher stats and subject-specific teacher lists
  const allExamItems = useMemo(() => {
    return buildFocusedExamItems(classes, subjects, teachers, assignments, activeSlots);
  }, [classes, subjects, teachers, assignments, activeSlots]);

  // Proposals state across the 4 periods for the full school year
  const [proposals, setProposals] = useState<YearExamProposalMap>(() => {
    return loadYearExamProposals(academicYear);
  });

  // Filters state
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'THCS' | 'THPT'>('ALL');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Fast teacher map
  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);

  // Update proposal handler for any period (gk1, ck1, gk2, ck2)
  const handleUpdatePeriodTeacher = (itemId: string, periodKey: 'gk1' | 'ck1' | 'gk2' | 'ck2', teacherId: string) => {
    setProposals(prev => {
      const existing = prev[itemId] || {
        durationMinutes: 45,
        examFormat: 'Trắc nghiệm + Tự luận',
      };

      const tch = teacherMap.get(teacherId);
      const teacherName = tch?.name || '';

      const updated = {
        ...existing,
        [`${periodKey}TeacherId`]: teacherId || undefined,
        [`${periodKey}TeacherName`]: teacherName || undefined,
        updatedAt: Date.now(),
      };

      const next = { ...prev, [itemId]: updated };
      saveYearExamProposals(academicYear, next);
      return next;
    });
  };

  const handleUpdateField = (itemId: string, field: string, value: any) => {
    setProposals(prev => {
      const existing = prev[itemId] || {
        durationMinutes: 45,
        examFormat: 'Trắc nghiệm + Tự luận',
      };

      const updated = {
        ...existing,
        [field]: value,
        updatedAt: Date.now(),
      };

      const next = { ...prev, [itemId]: updated };
      saveYearExamProposals(academicYear, next);
      return next;
    });
  };

  // Auto-propose action for Giữa HK1 (based on teacher with most classes in that grade)
  const handleAutoProposeGK1 = () => {
    const auto = generateAutoExamProposalsForGK1(allExamItems);
    setProposals(prev => {
      const merged: YearExamProposalMap = { ...prev };
      Object.keys(auto).forEach(k => {
        merged[k] = {
          ...merged[k],
          gk1TeacherId: auto[k].gk1TeacherId,
          gk1TeacherName: auto[k].gk1TeacherName,
          durationMinutes: merged[k]?.durationMinutes || auto[k].durationMinutes,
          examFormat: merged[k]?.examFormat || auto[k].examFormat,
          notes: merged[k]?.notes || auto[k].notes,
          updatedAt: Date.now(),
        };
      });
      saveYearExamProposals(academicYear, merged);
      return merged;
    });
    onShowToast?.(`Đã tự động đề xuất người ra đề Giữa HK1 theo số lớp phụ trách cho ${Object.keys(auto).length} môn/khối!`);
  };

  // Reset proposals
  const handleResetProposals = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách đề xuất người ra đề của năm học này?')) {
      setProposals({});
      saveYearExamProposals(academicYear, {});
      onShowToast?.('Đã đặt lại danh sách đề xuất người ra đề!');
    }
  };

  // Export Excel action
  const [isExporting, setIsExporting] = useState(false);
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      await exportYearExamProposalsToExcel(filteredItems, proposals, academicYear);
      onShowToast?.('Đã xuất thành công file Excel Bảng phân công người ra đề 4 đợt!');
    } catch (err) {
      console.error(err);
      onShowToast?.('Có lỗi xảy ra khi xuất file Excel');
    } finally {
      setIsExporting(false);
    }
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return allExamItems.filter(item => {
      if (levelFilter !== 'ALL' && item.level !== levelFilter) return false;
      if (gradeFilter !== 'ALL' && item.grade !== gradeFilter) return false;
      if (subjectFilter !== 'ALL' && item.subjectKey !== subjectFilter) return false;

      const prop = proposals[item.id];
      const isAssignedGK1 = Boolean(prop?.gk1TeacherId && prop?.gk1TeacherName);
      if (statusFilter === 'ASSIGNED' && !isAssignedGK1) return false;
      if (statusFilter === 'UNASSIGNED' && isAssignedGK1) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchSubject = item.subjectName.toLowerCase().includes(q);
        const matchGrade = item.gradeLabel.toLowerCase().includes(q);
        const matchTeacher = item.teachers.some(t => t.teacherName.toLowerCase().includes(q) || t.teacherCode.toLowerCase().includes(q));
        const matchAssigned = (prop?.gk1TeacherName?.toLowerCase().includes(q)) ||
                              (prop?.ck1TeacherName?.toLowerCase().includes(q)) ||
                              (prop?.gk2TeacherName?.toLowerCase().includes(q)) ||
                              (prop?.ck2TeacherName?.toLowerCase().includes(q));
        const matchClass = item.teachers.some(t => t.classes.some(c => c.className.toLowerCase().includes(q)));
        if (!matchSubject && !matchGrade && !matchTeacher && !matchAssigned && !matchClass) {
          return false;
        }
      }

      return true;
    });
  }, [allExamItems, levelFilter, gradeFilter, subjectFilter, statusFilter, searchTerm, proposals]);

  // KPI Stats for Giữa HK1 (and overall)
  const kpiStats = useMemo(() => {
    const totalItems = allExamItems.length;
    let gk1Count = 0;
    let ck1Count = 0;
    let gk2Count = 0;
    let ck2Count = 0;

    allExamItems.forEach(item => {
      const prop = proposals[item.id];
      if (prop?.gk1TeacherId && prop?.gk1TeacherName) gk1Count++;
      if (prop?.ck1TeacherId && prop?.ck1TeacherName) ck1Count++;
      if (prop?.gk2TeacherId && prop?.gk2TeacherName) gk2Count++;
      if (prop?.ck2TeacherId && prop?.ck2TeacherName) ck2Count++;
    });

    const completionRateGK1 = totalItems > 0 ? Math.round((gk1Count / totalItems) * 100) : 0;

    return {
      totalItems,
      gk1Count,
      ck1Count,
      gk2Count,
      ck2Count,
      unassignedGK1: totalItems - gk1Count,
      completionRateGK1,
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
    <div className="space-y-5 pb-16 print:p-0 print:m-0 print:space-y-4">
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
              Bảng Đề Xuất Người Ra Đề Kiểm Tra Tập Trung
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
              Thống kê số lớp phụ trách theo môn, theo khối và giáo viên giảng dạy. Bố trí gọn gàng 4 đợt kiểm tra trong cùng 1 ô: 
              <strong className="text-indigo-700 font-bold ml-1">Giữa HK1 (hiện tại)</strong>, 
              <span className="text-slate-700 font-medium ml-1">Học kỳ 1</span>, 
              <span className="text-slate-700 font-medium ml-1">Giữa HK2</span> và 
              <span className="text-slate-700 font-medium ml-1">Học kỳ 2</span>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 print:hidden shrink-0">
            <button
              onClick={handleAutoProposeGK1}
              title="Tự động gợi ý người dạy nhiều lớp nhất khối làm đề Giữa HK1"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-xs hover:shadow transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gợi ý tự động Giữa HK1</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              title="Xuất bảng phân công ra file Excel"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
            </button>

            <button
              onClick={() => window.print()}
              title="In bảng phân công ra đề"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-700 hover:bg-slate-800 text-white shadow-xs hover:shadow transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In bảng</span>
            </button>

            <button
              onClick={handleResetProposals}
              title="Đặt lại đề xuất"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đặt lại</span>
            </button>
          </div>
        </div>

        {/* Progress & Period Focus Note */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              Tiến độ 4 đợt trong năm:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 font-black flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                Giữa HK1: {kpiStats.gk1Count}/{kpiStats.totalItems} ({kpiStats.completionRateGK1}%)
              </span>
              <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold">
                Cuối HK1: {kpiStats.ck1Count}/{kpiStats.totalItems}
              </span>
              <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold">
                Giữa HK2: {kpiStats.gk2Count}/{kpiStats.totalItems}
              </span>
              <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold">
                Cuối HK2: {kpiStats.ck2Count}/{kpiStats.totalItems}
              </span>
            </div>
          </div>

          <div className="text-xs text-indigo-700 font-semibold bg-indigo-50/70 px-2.5 py-1 rounded-lg border border-indigo-100">
            🎯 <strong>Đang ưu tiên:</strong> Chọn người ra đề <strong>Giữa HK1</strong> trước (3 đợt còn lại sẽ chọn khi đến hạn)
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng môn - khối</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{kpiStats.totalItems}</span>
            <span className="text-xs text-slate-500">môn/khối</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            THCS: 24 môn • THPT: 33 môn
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đã chọn Giữa HK1</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{kpiStats.gk1Count}</span>
            <span className="text-xs font-bold text-emerald-700">({kpiStats.completionRateGK1}%)</span>
          </div>
          <div className="mt-1 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${kpiStats.completionRateGK1}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chưa chọn Giữa HK1</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className={`text-2xl font-black ${kpiStats.unassignedGK1 > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
              {kpiStats.unassignedGK1}
            </span>
            <span className="text-xs text-slate-500">môn cần chỉ định</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {kpiStats.unassignedGK1 === 0 ? '✨ Đã hoàn tất 100%' : 'Cần chọn GV ra đề Giữa HK1'}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Môn tập trung</span>
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">11 môn THPT</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            6 môn THCS kiểm tra tập trung
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2.5 print:hidden">
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Level Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
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

            {/* Status Filter for Giữa HK1 */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Tất cả tình trạng Giữa HK1</option>
              <option value="ASSIGNED">Đã chọn người ra đề</option>
              <option value="UNASSIGNED">Chưa chọn người ra đề</option>
            </select>
          </div>
        </div>

        {/* Secondary filters */}
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
              <option value="ALL">Tất cả khối</option>
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
              <option value="ALL">Tất cả môn kiểm tra</option>
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
          NĂM HỌC: {academicYear} • BỐ TRÍ 4 ĐỢT: GIỮA HK1, HỌC KỲ 1, GIỮA HK2, HỌC KỲ 2
        </div>
      </div>

      {/* 5. Main Harmonious Table (Gom 4 đợt kiểm tra vào 1 ô duy nhất) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border-slate-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 text-slate-700 border-b border-slate-200/90 text-[11px] uppercase tracking-wider font-extrabold select-none">
                <th className="py-3 px-2 text-center w-10">STT</th>
                <th className="py-3 px-2 text-center w-16">Khối</th>
                <th className="py-3 px-3 w-36">Môn kiểm tra</th>
                <th className="py-3 px-2 text-center w-16">Số lớp</th>
                <th className="py-3 px-3 min-w-[240px]">
                  Thống kê GV đang dạy & Số lớp
                  <span className="block text-[10px] font-normal text-slate-500 lowercase">
                    (bấm thẻ để gán nhanh Giữa HK1)
                  </span>
                </th>
                
                {/* CỘT DUY NHẤT: GOM 4 ĐỢT KIỂM TRA VÀO 1 Ô */}
                <th className="py-3 px-3 min-w-[360px] max-w-[420px] bg-indigo-50/70 text-indigo-950 border-x border-indigo-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                      <span className="font-black text-slate-900">Người ra đề 4 đợt kiểm tra</span>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                      GHK1 • HK1 • GHK2 • HK2
                    </span>
                  </div>
                  <span className="block text-[9px] font-normal text-slate-500 mt-0.5">
                    Đang chọn trước đợt ⭐ <strong>Giữa HK1</strong>; 3 đợt còn lại sẽ chọn khi đến hạn
                  </span>
                </th>

                <th className="py-3 px-2 text-center w-28">Thời lượng & Hình thức</th>
                <th className="py-3 px-2 w-32">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                    <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Không tìm thấy môn/khối nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const prop = proposals[item.id] || {
                    durationMinutes: item.defaultDuration,
                    examFormat: item.defaultFormat,
                  };

                  const isGK1Assigned = Boolean(prop.gk1TeacherId && prop.gk1TeacherName);

                  // Compact Dropdown strictly listing teachers of this subject
                  const renderCompactTeacherSelect = (
                    periodKey: 'gk1' | 'ck1' | 'gk2' | 'ck2',
                    currentTeacherId?: string,
                    currentTeacherName?: string,
                    isCurrentHighlight: boolean = false
                  ) => {
                    return (
                      <div className="relative flex items-center">
                        <select
                          value={currentTeacherId || ''}
                          onChange={e => handleUpdatePeriodTeacher(item.id, periodKey, e.target.value)}
                          className={`w-full text-[11px] py-1 px-1.5 pr-5 rounded-md border transition-all cursor-pointer truncate ${
                            currentTeacherId
                              ? isCurrentHighlight
                                ? 'bg-indigo-50/70 border-indigo-400 text-indigo-950 font-black'
                                : 'bg-emerald-50/50 border-emerald-300 text-emerald-950 font-bold'
                              : isCurrentHighlight
                              ? 'bg-amber-50/60 border-amber-300 text-amber-900 font-medium'
                              : 'bg-white border-slate-200 text-slate-400 font-normal hover:border-slate-300'
                          }`}
                        >
                          <option value="">-- Chưa chọn --</option>
                          {item.teachers.length > 0 && (
                            <optgroup label={`GV dạy ${item.subjectName} khối ${item.grade}`}>
                              {item.teachers.map(t => (
                                <option key={t.teacherId} value={t.teacherId}>
                                  {t.teacherName} ({t.classCount} lớp)
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {item.otherSubjectTeachers.length > 0 && (
                            <optgroup label={`GV khác cùng dạy ${item.subjectName}`}>
                              {item.otherSubjectTeachers.map(t => (
                                <option key={t.teacherId} value={t.teacherId}>
                                  {t.teacherName}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>

                        {currentTeacherId && (
                          <button
                            type="button"
                            onClick={() => handleUpdatePeriodTeacher(item.id, periodKey, '')}
                            title="Xóa lựa chọn"
                            className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 p-0.5 print:hidden cursor-pointer"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    );
                  };

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isGK1Assigned ? 'bg-white' : 'bg-amber-50/15'
                      }`}
                    >
                      {/* STT */}
                      <td className="py-2.5 px-2 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>

                      {/* Khối & Cấp */}
                      <td className="py-2.5 px-2 text-center">
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
                      <td className="py-2.5 px-3">
                        <div className="font-extrabold text-slate-900 text-[13px]">
                          {item.subjectName}
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {item.level === 'THCS' ? 'Tập trung THCS' : 'Tập trung THPT'}
                        </span>
                      </td>

                      {/* Số lớp trong khối */}
                      <td className="py-2.5 px-2 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                          {item.totalClassesInGrade} lớp
                        </span>
                      </td>

                      {/* Thống kê giáo viên & số lớp phụ trách */}
                      <td className="py-2.5 px-3">
                        {item.teachers.length === 0 ? (
                          <span className="text-slate-400 italic text-[11px]">
                            Chưa có dữ liệu phân công giảng dạy
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {item.teachers.map(t => {
                              const isGK1 = prop.gk1TeacherId === t.teacherId;
                              const classListStr = t.classes.map(c => c.className).join(', ');

                              return (
                                <div
                                  key={t.teacherId}
                                  className={`group relative flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs transition-all ${
                                    isGK1
                                      ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold ring-1 ring-indigo-400'
                                      : 'bg-slate-50 hover:bg-slate-100/90 border-slate-200 text-slate-700'
                                  }`}
                                  title={`${t.teacherName} dạy ${t.classCount} lớp: ${classListStr}`}
                                >
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1">
                                      <span className="font-bold text-[11px]">{t.teacherName}</span>
                                      {isGK1 && (
                                        <span className="text-[9px] px-1 py-0.1 bg-indigo-600 text-white rounded-xs font-black">
                                          GHK1
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-500">
                                      <strong className="text-slate-700 font-bold">{t.classCount} lớp:</strong>{' '}
                                      {classListStr}
                                    </span>
                                  </div>

                                  {/* Quick assign button to Giữa HK1 */}
                                  {!isGK1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdatePeriodTeacher(item.id, 'gk1', t.teacherId)}
                                      title="Gán nhanh làm người ra đề Giữa HK1"
                                      className="hidden group-hover:inline-flex p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[10px] font-bold cursor-pointer shrink-0 print:hidden"
                                    >
                                      + GHK1
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* CỘT DUY NHẤT: 4 ĐỢT KIỂM TRA GOM TRONG 1 Ô */}
                      <td className="py-2.5 px-3 bg-indigo-50/15 border-x border-indigo-100">
                        {/* Display on Web: Compact 2x2 Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 print:hidden">
                          {/* 1. Giữa HK1 (Đợt hiện tại - Nổi bật) */}
                          <div
                            className={`p-1.5 rounded-lg border transition-all ${
                              prop.gk1TeacherId
                                ? 'bg-indigo-50/80 border-indigo-300 shadow-2xs'
                                : 'bg-amber-50/50 border-amber-300 shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-extrabold mb-1">
                              <span className="flex items-center gap-1 text-indigo-950">
                                <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                                <span>Giữa HK1:</span>
                              </span>
                              {prop.gk1TeacherName ? (
                                <span className="text-[9px] px-1 bg-emerald-100 text-emerald-800 rounded-xs font-bold">
                                  Đã chọn
                                </span>
                              ) : (
                                <span className="text-[9px] px-1 bg-amber-100 text-amber-800 rounded-xs font-bold animate-pulse">
                                  Cần chọn
                                </span>
                              )}
                            </div>
                            {renderCompactTeacherSelect('gk1', prop.gk1TeacherId, prop.gk1TeacherName, true)}
                          </div>

                          {/* 2. Học kỳ 1 (Cuối HK1) */}
                          <div
                            className={`p-1.5 rounded-lg border transition-all ${
                              prop.ck1TeacherId
                                ? 'bg-slate-50 border-emerald-300'
                                : 'bg-slate-50/60 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 mb-1">
                              <span>Học kỳ 1:</span>
                              {prop.ck1TeacherName && (
                                <span className="text-[9px] px-1 bg-emerald-100 text-emerald-800 rounded-xs font-bold">
                                  Đã chọn
                                </span>
                              )}
                            </div>
                            {renderCompactTeacherSelect('ck1', prop.ck1TeacherId, prop.ck1TeacherName, false)}
                          </div>

                          {/* 3. Giữa HK2 */}
                          <div
                            className={`p-1.5 rounded-lg border transition-all ${
                              prop.gk2TeacherId
                                ? 'bg-slate-50 border-emerald-300'
                                : 'bg-slate-50/60 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 mb-1">
                              <span>Giữa HK2:</span>
                              {prop.gk2TeacherName && (
                                <span className="text-[9px] px-1 bg-emerald-100 text-emerald-800 rounded-xs font-bold">
                                  Đã chọn
                                </span>
                              )}
                            </div>
                            {renderCompactTeacherSelect('gk2', prop.gk2TeacherId, prop.gk2TeacherName, false)}
                          </div>

                          {/* 4. Học kỳ 2 (Cuối HK2) */}
                          <div
                            className={`p-1.5 rounded-lg border transition-all ${
                              prop.ck2TeacherId
                                ? 'bg-slate-50 border-emerald-300'
                                : 'bg-slate-50/60 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 mb-1">
                              <span>Học kỳ 2:</span>
                              {prop.ck2TeacherName && (
                                <span className="text-[9px] px-1 bg-emerald-100 text-emerald-800 rounded-xs font-bold">
                                  Đã chọn
                                </span>
                              )}
                            </div>
                            {renderCompactTeacherSelect('ck2', prop.ck2TeacherId, prop.ck2TeacherName, false)}
                          </div>
                        </div>

                        {/* Display on Print (Clean text layout) */}
                        <div className="hidden print:block text-[10px] space-y-0.5">
                          <div><strong>GHK1:</strong> {prop.gk1TeacherName || '---'}</div>
                          <div><strong>HK1:</strong> {prop.ck1TeacherName || '---'}</div>
                          <div><strong>GHK2:</strong> {prop.gk2TeacherName || '---'}</div>
                          <div><strong>HK2:</strong> {prop.ck2TeacherName || '---'}</div>
                        </div>
                      </td>

                      {/* Thời lượng & Hình thức thi (Gom thành 1 ô xếp tầng) */}
                      <td className="py-2.5 px-2 text-center">
                        <div className="space-y-1">
                          <select
                            value={prop.durationMinutes || item.defaultDuration}
                            onChange={e => handleUpdateField(item.id, 'durationMinutes', Number(e.target.value))}
                            className="w-full py-1 px-1.5 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-800 text-center"
                          >
                            <option value={45}>45 phút</option>
                            <option value={60}>60 phút</option>
                            <option value={90}>90 phút</option>
                          </select>
                          <select
                            value={prop.examFormat || item.defaultFormat}
                            onChange={e => handleUpdateField(item.id, 'examFormat', e.target.value)}
                            className="w-full py-1 px-1 text-[10px] rounded-lg border border-slate-200 bg-white text-slate-700"
                          >
                            <option value="Trắc nghiệm 100%">Trắc nghiệm 100%</option>
                            <option value="Tự luận 100%">Tự luận 100%</option>
                            <option value="Trắc nghiệm + Tự luận">TN + Tự luận</option>
                            <option value="Trắc nghiệm + Thực hành">TN + Thực hành</option>
                          </select>
                        </div>
                      </td>

                      {/* Ghi chú */}
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          value={prop.notes || ''}
                          onChange={e => handleUpdateField(item.id, 'notes', e.target.value)}
                          placeholder="Hạn nộp, ma trận..."
                          className="w-full py-1.5 px-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400"
                        />
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
