import React, { useState, useMemo } from 'react';
import {
  SchoolTimetable,
  TimetableSlot,
  ClassGroup,
  Subject,
  Teacher,
  SchoolConfig,
  Assignment
} from '../types';
import {
  DAYS_OF_WEEK,
  PERIODS,
  exportTimetableToExcel,
  generateInitialTimetable,
  getWeekDateRange,
  getUnifiedSubjectName
} from '../utils/timetableHelper';
import {
  Search,
  Filter,
  Printer,
  FileSpreadsheet,
  Upload,
  Sparkles,
  Calendar,
  Building2,
  GraduationCap,
  School,
  BookOpen,
  User,
  Users2,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Edit3,
  X,
  Layers,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Lock
} from 'lucide-react';
import { TimetableImportModal } from './TimetableImportModal';
import { AutoScheduleModal } from './AutoScheduleModal';
import { CopyTimetableModal } from './CopyTimetableModal';

type CampusFilter = 'ALL' | 'THPT' | 'DBK' | 'TK';
type ViewMode = 'BY_CLASS' | 'BY_TEACHER' | 'MASTER_GRID';
type SessionFilter = 'ALL' | 'SANG' | 'CHIEU';

interface SchoolTimetableViewProps {
  config: SchoolConfig;
  classes: ClassGroup[];
  subjects: Subject[];
  teachers: Teacher[];
  assignments: Assignment[];
  timetable: SchoolTimetable;
  currentWeek?: number;
  weeklyTimetables?: Record<number, SchoolTimetable>;
  onSelectWeek?: (week: number) => void;
  onCopyTimetableToWeek?: (sourceWeek: number, targetWeeks: number[], overwrite: boolean) => void;
  onRestoreWeek1Official?: () => void;
  isAdmin?: boolean;
  onPromptAdminLogin?: () => void;
  onUpdateTimetable: (updatedTimetable: SchoolTimetable) => void;
  onImportTimetableBatch?: (
    importedSlots: TimetableSlot[],
    targetWeek: number,
    applyToSubsequentWeeks: boolean,
    syncWeeklySchedule: boolean
  ) => void;
  onResetTimetable?: () => void;
}

export const SchoolTimetableView: React.FC<SchoolTimetableViewProps> = ({
  config,
  classes,
  subjects,
  teachers,
  assignments,
  timetable,
  currentWeek = 1,
  weeklyTimetables = {},
  onSelectWeek,
  onCopyTimetableToWeek,
  onRestoreWeek1Official,
  isAdmin = false,
  onPromptAdminLogin,
  onUpdateTimetable,
  onImportTimetableBatch,
  onResetTimetable
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('BY_CLASS');
  const [selectedCampus, setSelectedCampus] = useState<CampusFilter>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('ALL');
  const [selectedSession, setSelectedSession] = useState<SessionFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAutoScheduleModalOpen, setIsAutoScheduleModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);


  // Selected single class for focused view in BY_CLASS
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');

  // Editing slot modal
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);

  // Fast maps
  const teacherMap = useMemo(() => new Map<string, Teacher>(teachers.map(t => [t.id, t])), [teachers]);
  const subjectMap = useMemo(() => new Map<string, Subject>(subjects.map(s => [s.id, s])), [subjects]);
  const classMap = useMemo(() => new Map<string, ClassGroup>(classes.map(c => [c.id, c])), [classes]);

  // Slot lookup: Map<`${classId}_${day}_${session}_${period}`, TimetableSlot>
  const slotMap = useMemo(() => {
    const map = new Map<string, TimetableSlot>();
    timetable.slots.forEach(s => {
      map.set(`${s.classId}_${s.dayOfWeek}_${s.session}_${s.period}`, s);
    });
    return map;
  }, [timetable.slots]);

  // Teacher Slot lookup: Map<`${teacherId}_${day}_${session}_${period}`, TimetableSlot[]>
  const teacherSlotsMap = useMemo(() => {
    const map = new Map<string, TimetableSlot[]>();
    timetable.slots.forEach(s => {
      if (s.teacherId) {
        const key = `${s.teacherId}_${s.dayOfWeek}_${s.session}_${s.period}`;
        const list = map.get(key) || [];
        list.push(s);
        map.set(key, list);
      }
    });
    return map;
  }, [timetable.slots]);

  // Detect collisions (where a teacher is assigned to 2+ classes in the same slot)
  const teacherCollisions = useMemo(() => {
    const set = new Set<string>();
    teacherSlotsMap.forEach((slots, key) => {
      if (slots.length > 1) {
        set.add(key);
      }
    });
    return set;
  }, [teacherSlotsMap]);

  // Filtered classes
  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
      // Campus filter
      if (selectedCampus === 'THPT' && cls.level !== 'THPT' && cls.campus !== 'THPTDBK') return false;
      if (selectedCampus === 'DBK' && (cls.level === 'THPT' || cls.campus === 'THCSTK')) return false;
      if (selectedCampus === 'TK' && (cls.level === 'THPT' || cls.campus !== 'THCSTK')) return false;

      // Grade filter
      if (selectedGrade !== 'ALL' && cls.grade !== selectedGrade) return false;

      // Single class filter
      if (selectedClassId !== 'ALL' && cls.id !== selectedClassId) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesClass = cls.name.toLowerCase().includes(term);
        const matchesHomeroom = cls.homeroomTeacherId && (teacherMap.get(cls.homeroomTeacherId)?.name.toLowerCase().includes(term));
        if (!matchesClass && !matchesHomeroom) {
          // Check if any slot has this subject or teacher
          const hasMatchingSlot = timetable.slots.some(
            s => s.classId === cls.id && (
              (s.subjectName && (
                s.subjectName.toLowerCase().includes(term) ||
                getUnifiedSubjectName(s).toLowerCase().includes(term)
              )) ||
              (s.teacherName && s.teacherName.toLowerCase().includes(term)) ||
              (s.teacherCode && s.teacherCode.toLowerCase().includes(term))
            )
          );
          if (!hasMatchingSlot) return false;
        }
      }

      return true;
    });
  }, [classes, selectedCampus, selectedGrade, selectedClassId, searchTerm, teacherMap, timetable.slots]);

  // Filtered teachers for BY_TEACHER view
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      if (selectedTeacherId !== 'ALL' && t.id !== selectedTeacherId) return false;

      // Campus filter
      if (selectedCampus === 'THPT' && t.campus && t.campus !== 'THPTDBK') return false;
      if (selectedCampus === 'DBK' && t.campus && t.campus !== 'THCSDBK') return false;
      if (selectedCampus === 'TK' && t.campus && t.campus !== 'THCSTK') return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(term);
        const matchesCode = t.code.toLowerCase().includes(term);
        if (!matchesName && !matchesCode) return false;
      }

      return true;
    });
  }, [teachers, selectedTeacherId, selectedCampus, searchTerm]);

  // Total statistics
  const stats = useMemo(() => {
    let totalSlots = 0;
    const activeTeachers = new Set<string>();
    timetable.slots.forEach(s => {
      if (s.subjectName) {
        totalSlots++;
        if (s.teacherId) activeTeachers.add(s.teacherId);
      }
    });

    return {
      totalSlots,
      activeTeacherCount: activeTeachers.size,
      totalClasses: classes.length,
      collisionCount: teacherCollisions.size
    };
  }, [timetable.slots, classes.length, teacherCollisions]);

  // Helper to get unified subject display name
  const getSubjectDisplayName = (slot?: TimetableSlot | { classId?: string; className?: string; subjectName?: string }) => {
    if (!slot?.subjectName) return '';
    return getUnifiedSubjectName(slot);
  };

  // Helper to get full, clean teacher display name (never showing cryptic codes like Sơn.VV)
  const getTeacherDisplayName = (slot?: TimetableSlot) => {
    if (!slot) return '';
    if (slot.teacherId) {
      const found = teacherMap.get(slot.teacherId);
      if (found) return found.name;
    }
    if (slot.teacherName && !slot.teacherName.includes('.')) {
      return slot.teacherName;
    }
    const searchKey = slot.teacherCode || slot.teacherName || '';
    if (searchKey) {
      const cleanSearch = searchKey.split('.')[0].trim();
      const foundByAlias = teachers.find(t => t.name.endsWith(cleanSearch) || t.name.includes(cleanSearch) || t.code.includes(cleanSearch));
      if (foundByAlias) return foundByAlias.name;
    }
    return slot.teacherName || slot.teacherCode || '';
  };

  // Handle saving an edited slot
  const handleSaveSlot = (updatedSlot: TimetableSlot) => {
    const unifiedName = getUnifiedSubjectName(updatedSlot);
    const normalizedSlot: TimetableSlot = {
      ...updatedSlot,
      subjectName: unifiedName || updatedSlot.subjectName
    };

    const existingIndex = timetable.slots.findIndex(
      s => s.classId === normalizedSlot.classId &&
           s.dayOfWeek === normalizedSlot.dayOfWeek &&
           s.session === normalizedSlot.session &&
           s.period === normalizedSlot.period
    );

    let newSlots = [...timetable.slots];
    if (existingIndex >= 0) {
      newSlots[existingIndex] = normalizedSlot;
    } else {
      newSlots.push(normalizedSlot);
    }

    onUpdateTimetable({
      ...timetable,
      slots: newSlots,
      updatedAt: Date.now()
    });
    setEditingSlot(null);
  };

  const handleImportSuccess = (
    importedSlots: TimetableSlot[],
    targetWeek: number,
    applyToSubsequentWeeks: boolean,
    syncWeeklySchedule: boolean
  ) => {
    if (onImportTimetableBatch) {
      onImportTimetableBatch(importedSlots, targetWeek, applyToSubsequentWeeks, syncWeeklySchedule);
    } else {
      onUpdateTimetable({
        ...timetable,
        weekNumber: targetWeek,
        slots: importedSlots,
        updatedAt: Date.now()
      });
    }
  };

  const handleAutoGenerate = () => {
    if (!isAdmin && onPromptAdminLogin) {
      onPromptAdminLogin();
      return;
    }
    const fresh = generateInitialTimetable(classes, subjects, teachers, assignments, config);
    onUpdateTimetable(fresh);
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-white">
                  Thời Khóa Biểu Toàn Trường
                </h2>
                <span className="px-2 py-0.5 bg-indigo-600/80 text-[11px] font-bold rounded-full border border-indigo-400/30">
                  {config.semester || 'HK1'} • {config.academicYear || '2026 - 2027'}
                </span>
              </div>
              <p className="text-xs text-indigo-200/90 font-medium mt-0.5">
                Áp dụng cho cả 3 điểm trường: THPT (14 lớp) • THCS Đốc Binh Kiều • THCS Tân Kiều ({stats.totalClasses} lớp)
              </p>
            </div>
          </div>

          {/* Quick Action buttons */}
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {isAdmin && (
              <>
                <button
                  onClick={() => setIsAutoScheduleModalOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-black rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer ring-2 ring-amber-400/40 animate-pulse-subtle"
                  title="Tự động sắp xếp thời khóa biểu theo thuật toán CSP và các quy tắc sư phạm"
                >
                  <Sparkles className="w-4 h-4 text-amber-100" />
                  <span>Xếp TKB Tự Động (Thuật Toán)</span>
                </button>

                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer ring-2 ring-emerald-400/40"
                  title="Nhập và cập nhật thời khóa biểu trực tiếp từ phần mềm VietSchool (Excel/CSV)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                  <span>Nhập TKB VietSchool</span>
                </button>

                <button
                  onClick={() => exportTimetableToExcel(timetable, classes, teachers, config)}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Xuất Excel TKB</span>
                </button>
              </>
            )}

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In TKB / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Week Selection Toolbar & Primary Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 print:hidden space-y-3">
        {/* WEEK SELECTION BAR */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Left: Week selector with dates */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 text-indigo-900">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-black uppercase tracking-wider">Chọn Tuần:</span>
              </div>

              {/* Prev button */}
              <button
                type="button"
                onClick={() => onSelectWeek && onSelectWeek(Math.max(1, currentWeek - 1))}
                disabled={currentWeek <= 1}
                className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none rounded-xl text-slate-700 transition-colors cursor-pointer border border-slate-200"
                title="Tuần trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Week dropdown */}
              <div className="relative min-w-[260px] sm:min-w-[300px]">
                <select
                  value={currentWeek}
                  onChange={(e) => onSelectWeek && onSelectWeek(Number(e.target.value))}
                  className="w-full h-10 pl-3.5 pr-8 bg-slate-50 hover:bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all cursor-pointer shadow-2xs"
                >
                  <optgroup label="Học Kỳ I (Tuần 1 - 18)">
                    {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => {
                      const info = getWeekDateRange(w);
                      const hasCustom = weeklyTimetables && weeklyTimetables[w];
                      return (
                        <option key={w} value={w}>
                          Tuần {w}: {info.startDate} - {info.endDate} {hasCustom ? '★' : ''} {w === 1 ? '• (TKB Gốc chuẩn)' : ''}
                        </option>
                      );
                    })}
                  </optgroup>
                  <optgroup label="Học Kỳ II (Tuần 19 - 35)">
                    {Array.from({ length: 17 }, (_, i) => i + 19).map((w) => {
                      const info = getWeekDateRange(w);
                      const hasCustom = weeklyTimetables && weeklyTimetables[w];
                      return (
                        <option key={w} value={w}>
                          Tuần {w}: {info.startDate} - {info.endDate} {hasCustom ? '★' : ''}
                        </option>
                      );
                    })}
                  </optgroup>
                </select>
              </div>

              {/* Next button */}
              <button
                type="button"
                onClick={() => onSelectWeek && onSelectWeek(Math.min(35, currentWeek + 1))}
                disabled={currentWeek >= 35}
                className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none rounded-xl text-slate-700 transition-colors cursor-pointer border border-slate-200"
                title="Tuần sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Status Badge */}
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-100/90 border border-slate-200 rounded-xl text-xs text-slate-800">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  currentWeek === 1
                    ? 'bg-emerald-500 animate-pulse'
                    : (timetable.slots && timetable.slots.length > 0)
                    ? 'bg-indigo-500'
                    : 'bg-amber-400'
                }`}></span>
                <span className="font-bold">
                  {currentWeek === 1
                    ? 'Tuần 1: TKB Chuẩn Chính Thức (38 lớp: 14 THPT + 24 THCS ĐBK)'
                    : weeklyTimetables && weeklyTimetables[currentWeek] && weeklyTimetables[currentWeek].slots && weeklyTimetables[currentWeek].slots.length > 0
                    ? `Tuần ${currentWeek}: Đã có TKB (${weeklyTimetables[currentWeek].slots.length} tiết)`
                    : `Tuần ${currentWeek}: Để trống (Chờ sao chép)`}
                </span>
              </div>
            </div>

            {/* Right: Week Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin ? (
                <>
                  {currentWeek === 1 && (!weeklyTimetables[2] || !weeklyTimetables[2].slots || weeklyTimetables[2].slots.length === 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onCopyTimetableToWeek) {
                          onCopyTimetableToWeek(1, [2], true);
                          alert('Đã sao chép thành công Thời khóa biểu từ Tuần 1 sang Tuần 2!');
                        }
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Sao chép toàn bộ TKB Tuần 1 sang Tuần 2"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao Chép Sang Tuần 2</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    title={`Nhập TKB VietSchool trực tiếp cho Tuần ${currentWeek}`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Đẩy TKB VietSchool vào Tuần {currentWeek}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCopyModalOpen(true)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Sao chép thời khóa biểu tuần này sang các tuần khác"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao Chép TKB Sang Tuần Khác...</span>
                  </button>

                  {onRestoreWeek1Official && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Khôi phục lại dữ liệu Thời khóa biểu Tuần 1 chuẩn chính thức (14 lớp THPT + 24 lớp THCS Đốc Binh Kiều từ hình ảnh ma trận)?')) {
                          onRestoreWeek1Official();
                        }
                      }}
                      className="px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Nạp lại dữ liệu TKB Tuần 1 chuẩn chính thức của 14 lớp THPT & 24 lớp THCS Đốc Binh Kiều"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                      <span>Khôi Phục TKB Tuần 1 Chuẩn</span>
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onPromptAdminLogin && onPromptAdminLogin()}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                  title="Nhập mật khẩu để sao chép TKB và chỉnh sửa tiết học"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Đăng nhập Quản trị</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Week pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">Chuyển nhanh:</span>
            {Array.from({ length: 18 }, (_, i) => i + 1).map(w => {
              const isSelected = currentWeek === w;
              const hasCustom = (w === 1) || (weeklyTimetables && weeklyTimetables[w] && weeklyTimetables[w].slots && weeklyTimetables[w].slots.length > 0);
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => onSelectWeek && onSelectWeek(w)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-2xs font-extrabold ring-2 ring-indigo-300'
                      : hasCustom
                      ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                  }`}
                  title={`Tuần ${w} ${hasCustom ? '(Đã có TKB)' : '(Để trống)'}`}
                >
                  T{w}{hasCustom && w !== 1 ? '•' : ''}
                </button>
              );
            })}
            <span className="text-slate-300 mx-1">|</span>
            {Array.from({ length: 17 }, (_, i) => i + 19).map(w => {
              const isSelected = currentWeek === w;
              const hasCustom = weeklyTimetables && weeklyTimetables[w] && weeklyTimetables[w].slots && weeklyTimetables[w].slots.length > 0;
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => onSelectWeek && onSelectWeek(w)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-2xs font-extrabold ring-2 ring-indigo-300'
                      : hasCustom
                      ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                  }`}
                  title={`Tuần ${w} ${hasCustom ? '(Đã có TKB)' : '(Để trống)'}`}
                >
                  T{w}{hasCustom ? '•' : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Highlighted Auto-Schedule Banner (Admin only) */}
        {isAdmin && (
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-3.5 sm:p-4 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-amber-300/40">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs shrink-0">
                <Sparkles className="w-6 h-6 text-amber-100" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-tight">
                    Công Cụ Xếp Thời Khóa Biểu Tự Động (Thuật Toán CSP)
                  </h3>
                  <span className="px-2 py-0.5 bg-white/25 text-[10px] font-extrabold rounded-full">
                    Mới
                  </span>
                </div>
                <p className="text-xs text-amber-50 font-medium">
                  Tự động xếp theo từng điểm trường (THPT, THCS ĐBK, THCS Tân Kiều), bảo đảm không trùng giờ, tránh nắng Thể dục & tối ưu tiết đôi.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAutoScheduleModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-amber-50 text-amber-900 text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-600 fill-amber-600" />
              <span>Mở Trình Xếp TKB Tự Động</span>
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3.5">
          {/* Top row: View Mode Switcher + Campus Selector */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            {/* View Mode Buttons */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
              <button
                onClick={() => setViewMode('BY_CLASS')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'BY_CLASS'
                    ? 'bg-indigo-600 text-white shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Xem Theo Lớp Học</span>
              </button>

              <button
                onClick={() => setViewMode('BY_TEACHER')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'BY_TEACHER'
                    ? 'bg-indigo-600 text-white shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Users2 className="w-4 h-4" />
                <span>Xem Theo Giáo Viên</span>
              </button>

              <button
                onClick={() => setViewMode('MASTER_GRID')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'MASTER_GRID'
                    ? 'bg-indigo-600 text-white shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Bảng Tổng Hợp Toàn Trường</span>
              </button>
            </div>

            {/* Campus Buttons */}
            <div className="flex flex-wrap items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200 gap-1">
              <button
                onClick={() => { setSelectedCampus('ALL'); setSelectedGrade('ALL'); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCampus === 'ALL'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Tất cả 3 điểm trường</span>
              </button>

              <button
                onClick={() => { setSelectedCampus('THPT'); setSelectedGrade('ALL'); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCampus === 'THPT'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>THPT (14 lớp)</span>
              </button>

              <button
                onClick={() => { setSelectedCampus('DBK'); setSelectedGrade('ALL'); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCampus === 'DBK'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <School className="w-3.5 h-3.5" />
                <span>THCS Đốc Binh Kiều</span>
              </button>

              <button
                onClick={() => { setSelectedCampus('TK'); setSelectedGrade('ALL'); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCampus === 'TK'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>THCS Tân Kiều</span>
              </button>
            </div>
          </div>

          {/* Bottom row: Detailed Dropdown Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {/* Grade Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Lọc theo Khối
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full h-9 px-3 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="ALL">Tất cả các khối (6-12)</option>
                {selectedCampus === 'THPT' || selectedCampus === 'ALL' ? (
                  <optgroup label="Khối THPT">
                    <option value="10">Khối 10 (5 lớp)</option>
                    <option value="11">Khối 11 (5 lớp)</option>
                    <option value="12">Khối 12 (4 lớp)</option>
                  </optgroup>
                ) : null}
                {selectedCampus === 'DBK' || selectedCampus === 'TK' || selectedCampus === 'ALL' ? (
                  <optgroup label="Khối THCS">
                    <option value="6">Khối 6</option>
                    <option value="7">Khối 7</option>
                    <option value="8">Khối 8</option>
                    <option value="9">Khối 9</option>
                  </optgroup>
                ) : null}
              </select>
            </div>

            {/* If BY_CLASS, show Class selector */}
            {viewMode === 'BY_CLASS' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Chọn Lớp Học
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="ALL">Tất cả các lớp ({filteredClasses.length} lớp)</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} - Khối {cls.grade} ({cls.campus === 'THCSTK' ? 'Tân Kiều' : cls.level === 'THPT' ? 'THPT' : 'THCS ĐBK'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* If BY_TEACHER, show Teacher selector */}
            {viewMode === 'BY_TEACHER' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Chọn Giáo Viên
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="ALL">Tất cả giáo viên ({teachers.length} GV)</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code}) - {t.role}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Session Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Buổi học
              </label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value as SessionFilter)}
                className="w-full h-9 px-3 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="ALL">Cả ngày (Sáng & Chiều)</option>
                <option value="SANG">Chỉ Buổi Sáng (Tiết 1 - 5)</option>
                <option value="CHIEU">Chỉ Buổi Chiều (Tiết 1 - 5)</option>
              </select>
            </div>

            {/* Search Input */}
            <div className={viewMode === 'MASTER_GRID' ? 'sm:col-span-2' : ''}>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Tìm nhanh
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm lớp, môn học, giáo viên..."
                  className="w-full h-9 pl-9 pr-3 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Conflict Alert Banner if any */}
          {stats.collisionCount > 0 && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  <strong>Phát hiện {stats.collisionCount} trùng tiết giáo viên:</strong> Có giáo viên được xếp dạy cùng 1 tiết ở 2 lớp khác nhau.
                </span>
              </div>
              <span className="font-bold underline text-rose-700 cursor-pointer" onClick={() => setViewMode('BY_TEACHER')}>
                Kiểm tra theo giáo viên
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Main Views */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Empty Week Information Banner (Tuần để trống theo yêu cầu) */}
        {currentWeek > 1 && (!timetable.slots || timetable.slots.length === 0) && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0 shadow-2xs">
                <Calendar className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm sm:text-base text-amber-950">
                    Thời Khóa Biểu Tuần {currentWeek} đang để trống
                  </h4>
                  <span className="px-2 py-0.5 bg-amber-200/80 text-amber-900 text-[10px] font-black rounded-md">
                    {getWeekDateRange(currentWeek).startDate} - {getWeekDateRange(currentWeek).endDate}
                  </span>
                </div>
                <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                  Theo thiết lập của trường, thời khóa biểu từ Tuần 2 trở đi để trống để Quản trị viên chủ động theo dõi. 
                  Khi hết Tuần 1 hoặc khi không cần thay đổi lịch học, Quản trị viên có thể bấm sao chép từ Tuần 1 sang.
                </p>
              </div>
            </div>

            {isAdmin ? (
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (onCopyTimetableToWeek) {
                      onCopyTimetableToWeek(1, [currentWeek], true);
                      alert(`Đã sao chép thành công Thời khóa biểu từ Tuần 1 sang Tuần ${currentWeek}!`);
                    }
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>Sao chép TKB Tuần 1 sang Tuần {currentWeek}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCopyModalOpen(true)}
                  className="w-full sm:w-auto px-3.5 py-2.5 bg-white hover:bg-amber-100/50 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Tùy chọn khác...</span>
                </button>
              </div>
            ) : (
              <div className="text-xs text-amber-800 font-semibold italic bg-amber-100/60 px-3 py-2 rounded-xl border border-amber-200 shrink-0">
                Chưa áp dụng TKB cho tuần này
              </div>
            )}
          </div>
        )}

        {/* VIEW 1: BY_CLASS (Thời Khóa Biểu Từng Lớp Học) */}
        {viewMode === 'BY_CLASS' && (
          <div className="space-y-6">
            {filteredClasses.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500">
                <GraduationCap className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-sm">Không tìm thấy lớp học nào phù hợp với bộ lọc</p>
                <p className="text-xs text-slate-400 mt-1">Vui lòng thay đổi lựa chọn khối hoặc điểm trường</p>
              </div>
            ) : (
              filteredClasses.map(cls => {
                const homeroomTeacher = cls.homeroomTeacherId ? teacherMap.get(cls.homeroomTeacherId) : undefined;
                const campusLabel = cls.campus === 'THPTDBK' || cls.level === 'THPT'
                  ? 'THPT Đốc Binh Kiều'
                  : cls.campus === 'THCSTK'
                  ? 'THCS Tân Kiều'
                  : 'THCS Đốc Binh Kiều';

                return (
                  <div
                    key={cls.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden print:border-none print:shadow-none print:break-inside-avoid"
                  >
                    {/* Class Header Card */}
                    <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xs border border-indigo-400/30">
                          {cls.name}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-white uppercase">
                              Lớp {cls.name} • Khối {cls.grade}
                            </h3>
                            <span className="px-2 py-0.5 bg-white/10 text-indigo-200 text-[10px] font-bold rounded-md">
                              {campusLabel}
                            </span>
                          </div>
                          <p className="text-xs text-indigo-200/90 font-medium">
                            GVCN: <strong className="text-white">{homeroomTeacher?.name || 'Chưa phân công'}</strong>
                            {cls.roomNumber && ` • Phòng: ${cls.roomNumber}`}
                          </p>
                        </div>
                      </div>

                      <div className="text-xs text-indigo-200 flex items-center gap-3">
                        <span>Học kỳ {config.semester || 'HK1'}</span>
                        <span>•</span>
                        <span>Năm học {config.academicYear || '2026 - 2027'}</span>
                      </div>
                    </div>

                    {/* Class Timetable Grid */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-center text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                            <th className="py-2.5 px-3 w-16 border-r border-slate-200">Buổi</th>
                            <th className="py-2.5 px-2 w-14 border-r border-slate-200">Tiết</th>
                            {DAYS_OF_WEEK.map(d => (
                              <th key={d.value} className="py-2.5 px-3 border-r border-slate-200 last:border-r-0 min-w-[130px]">
                                {d.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {/* MORNING (BUỔI SÁNG) */}
                          {(selectedSession === 'ALL' || selectedSession === 'SANG') && (
                            <>
                              {PERIODS.map((p, pIndex) => (
                                <tr key={`SANG_${p}`} className="hover:bg-slate-50/80 transition-colors">
                                  {pIndex === 0 && (
                                    <td
                                      rowSpan={5}
                                      className="bg-indigo-50/60 font-black text-indigo-900 border-r border-slate-200 uppercase tracking-widest text-[11px] p-2"
                                    >
                                      Sáng
                                    </td>
                                  )}
                                  <td className="font-bold text-slate-600 bg-slate-50/50 border-r border-slate-200 py-2.5">
                                    Tiết {p}
                                  </td>
                                  {DAYS_OF_WEEK.map(d => {
                                    const slot = slotMap.get(`${cls.id}_${d.value}_SANG_${p}`);
                                    const isCollision = slot?.teacherId && teacherCollisions.has(`${slot.teacherId}_${d.value}_SANG_${p}`);
                                    const isFlagActivity = slot?.isSpecialActivity;

                                    return (
                                      <td
                                        key={d.value}
                                        onClick={() => {
                                          if (isAdmin) {
                                            setEditingSlot(slot || {
                                              id: `${cls.id}_${d.value}_SANG_${p}`,
                                              classId: cls.id,
                                              className: cls.name,
                                              dayOfWeek: d.value,
                                              session: 'SANG',
                                              period: p
                                            });
                                          } else if (onPromptAdminLogin) {
                                            onPromptAdminLogin();
                                          }
                                        }}
                                        className={`p-2 border-r border-slate-200 last:border-r-0 transition-all ${
                                          isAdmin ? 'cursor-pointer hover:bg-indigo-50/80' : ''
                                        } ${
                                          isFlagActivity
                                            ? 'bg-amber-50/80'
                                            : isCollision
                                            ? 'bg-rose-100/90'
                                            : slot?.subjectName
                                            ? 'bg-white'
                                            : 'bg-slate-50/30'
                                        }`}
                                      >
                                        {slot?.subjectName ? (
                                          <div className="space-y-0.5">
                                            <div className="font-extrabold text-slate-900 text-xs">
                                              {getSubjectDisplayName(slot)}
                                            </div>
                                            {getTeacherDisplayName(slot) && (
                                              <div className="text-[11px] font-semibold text-indigo-700">
                                                {getTeacherDisplayName(slot)}
                                              </div>
                                            )}
                                            {isCollision && (
                                              <span className="inline-block text-[9px] font-bold text-rose-700 bg-rose-200 px-1 py-0.2 rounded-sm">
                                                Trùng lịch GV
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-slate-300 font-light italic text-[11px]">-</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </>
                          )}

                          {/* AFTERNOON (BUỔI CHIỀU) */}
                          {(selectedSession === 'ALL' || selectedSession === 'CHIEU') && (
                            <>
                              {PERIODS.map((p, pIndex) => (
                                <tr key={`CHIEU_${p}`} className="hover:bg-slate-50/80 transition-colors">
                                  {pIndex === 0 && (
                                    <td
                                      rowSpan={5}
                                      className="bg-amber-50/60 font-black text-amber-900 border-r border-slate-200 uppercase tracking-widest text-[11px] p-2"
                                    >
                                      Chiều
                                    </td>
                                  )}
                                  <td className="font-bold text-slate-600 bg-slate-50/50 border-r border-slate-200 py-2.5">
                                    Tiết {p}
                                  </td>
                                  {DAYS_OF_WEEK.map(d => {
                                    const slot = slotMap.get(`${cls.id}_${d.value}_CHIEU_${p}`);
                                    const isCollision = slot?.teacherId && teacherCollisions.has(`${slot.teacherId}_${d.value}_CHIEU_${p}`);

                                    return (
                                      <td
                                        key={d.value}
                                        onClick={() => {
                                          if (isAdmin) {
                                            setEditingSlot(slot || {
                                              id: `${cls.id}_${d.value}_CHIEU_${p}`,
                                              classId: cls.id,
                                              className: cls.name,
                                              dayOfWeek: d.value,
                                              session: 'CHIEU',
                                              period: p
                                            });
                                          } else if (onPromptAdminLogin) {
                                            onPromptAdminLogin();
                                          }
                                        }}
                                        className={`p-2 border-r border-slate-200 last:border-r-0 transition-all ${
                                          isAdmin ? 'cursor-pointer hover:bg-amber-50/80' : ''
                                        } ${
                                          isCollision
                                            ? 'bg-rose-100/90'
                                            : slot?.subjectName
                                            ? 'bg-white'
                                            : 'bg-slate-50/30'
                                        }`}
                                      >
                                        {slot?.subjectName ? (
                                          <div className="space-y-0.5">
                                            <div className="font-extrabold text-slate-900 text-xs">
                                              {getSubjectDisplayName(slot)}
                                            </div>
                                            {getTeacherDisplayName(slot) && (
                                              <div className="text-[11px] font-semibold text-amber-800">
                                                {getTeacherDisplayName(slot)}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-slate-300 font-light italic text-[11px]">-</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* VIEW 2: BY_TEACHER (Thời Khóa Biểu Từng Giáo Viên) */}
        {viewMode === 'BY_TEACHER' && (
          <div className="space-y-6">
            {filteredTeachers.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500">
                <Users2 className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-sm">Không tìm thấy giáo viên nào</p>
              </div>
            ) : (
              filteredTeachers.map(teacher => {
                // Calculate weekly teaching stats for this teacher
                let teacherTotalPeriods = 0;
                timetable.slots.forEach(s => {
                  if (s.teacherId === teacher.id && s.subjectName) {
                    teacherTotalPeriods++;
                  }
                });

                return (
                  <div
                    key={teacher.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden print:border-none print:shadow-none print:break-inside-avoid"
                  >
                    {/* Teacher Card Header */}
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xs border border-indigo-400/30">
                          {teacher.code || teacher.name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-white uppercase">
                              {teacher.name} ({teacher.code})
                            </h3>
                            <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-200 text-[10px] font-bold rounded-md border border-indigo-400/30">
                              {teacher.role}
                            </span>
                          </div>
                          <p className="text-xs text-indigo-200/90 font-medium">
                            Cơ sở: {teacher.campus === 'THCSTK' ? 'Tân Kiều' : teacher.campus === 'THCSDBK' ? 'THCS ĐBK' : 'THPT'} • Tổng tiết TKB: <strong className="text-white">{teacherTotalPeriods} tiết/tuần</strong>
                          </p>
                        </div>
                      </div>

                      <div className="text-xs text-indigo-200 flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-white/10 rounded-lg font-bold text-white">
                          Định mức: {teacher.baseStandardPeriods}t
                        </span>
                      </div>
                    </div>

                    {/* Teacher Schedule Grid */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-center text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                            <th className="py-2.5 px-3 w-16 border-r border-slate-200">Buổi</th>
                            <th className="py-2.5 px-2 w-14 border-r border-slate-200">Tiết</th>
                            {DAYS_OF_WEEK.map(d => (
                              <th key={d.value} className="py-2.5 px-3 border-r border-slate-200 last:border-r-0 min-w-[130px]">
                                {d.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {/* MORNING */}
                          {(selectedSession === 'ALL' || selectedSession === 'SANG') && (
                            <>
                              {PERIODS.map((p, pIndex) => (
                                <tr key={`T_SANG_${p}`} className="hover:bg-slate-50/80 transition-colors">
                                  {pIndex === 0 && (
                                    <td
                                      rowSpan={5}
                                      className="bg-indigo-50/60 font-black text-indigo-900 border-r border-slate-200 uppercase tracking-widest text-[11px] p-2"
                                    >
                                      Sáng
                                    </td>
                                  )}
                                  <td className="font-bold text-slate-600 bg-slate-50/50 border-r border-slate-200 py-2.5">
                                    Tiết {p}
                                  </td>
                                  {DAYS_OF_WEEK.map(d => {
                                    const slots = teacherSlotsMap.get(`${teacher.id}_${d.value}_SANG_${p}`) || [];
                                    const isCollision = slots.length > 1;

                                    return (
                                      <td
                                        key={d.value}
                                        className={`p-2 border-r border-slate-200 last:border-r-0 ${
                                          isCollision
                                            ? 'bg-rose-100/90'
                                            : slots.length > 0
                                            ? 'bg-indigo-50/40'
                                            : 'bg-white'
                                        }`}
                                      >
                                        {slots.length > 0 ? (
                                          <div className="space-y-1">
                                            {slots.map(s => {
                                              const targetCls = classMap.get(s.classId);
                                              return (
                                                <div key={s.id} className="p-1 rounded-md bg-white border border-indigo-100 shadow-2xs">
                                                  <span className="font-black text-indigo-950 text-xs inline-block mr-1">
                                                    {targetCls?.name || s.className}
                                                  </span>
                                                  <span className="text-[11px] text-slate-600 font-semibold">
                                                    ({getSubjectDisplayName(s)})
                                                  </span>
                                                </div>
                                              );
                                            })}
                                            {isCollision && (
                                              <span className="block text-[9px] font-bold text-rose-700 bg-rose-200 px-1 rounded-xs">
                                                Trùng lịch!
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-slate-300 italic text-[11px]">-</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </>
                          )}

                          {/* AFTERNOON */}
                          {(selectedSession === 'ALL' || selectedSession === 'CHIEU') && (
                            <>
                              {PERIODS.map((p, pIndex) => (
                                <tr key={`T_CHIEU_${p}`} className="hover:bg-slate-50/80 transition-colors">
                                  {pIndex === 0 && (
                                    <td
                                      rowSpan={5}
                                      className="bg-amber-50/60 font-black text-amber-900 border-r border-slate-200 uppercase tracking-widest text-[11px] p-2"
                                    >
                                      Chiều
                                    </td>
                                  )}
                                  <td className="font-bold text-slate-600 bg-slate-50/50 border-r border-slate-200 py-2.5">
                                    Tiết {p}
                                  </td>
                                  {DAYS_OF_WEEK.map(d => {
                                    const slots = teacherSlotsMap.get(`${teacher.id}_${d.value}_CHIEU_${p}`) || [];
                                    const isCollision = slots.length > 1;

                                    return (
                                      <td
                                        key={d.value}
                                        className={`p-2 border-r border-slate-200 last:border-r-0 ${
                                          isCollision
                                            ? 'bg-rose-100/90'
                                            : slots.length > 0
                                            ? 'bg-amber-50/40'
                                            : 'bg-white'
                                        }`}
                                      >
                                        {slots.length > 0 ? (
                                          <div className="space-y-1">
                                            {slots.map(s => {
                                              const targetCls = classMap.get(s.classId);
                                              return (
                                                <div key={s.id} className="p-1 rounded-md bg-white border border-amber-100 shadow-2xs">
                                                  <span className="font-black text-amber-950 text-xs inline-block mr-1">
                                                    {targetCls?.name || s.className}
                                                  </span>
                                                  <span className="text-[11px] text-slate-600 font-semibold">
                                                    ({getSubjectDisplayName(s)})
                                                  </span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <span className="text-slate-300 italic text-[11px]">-</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* VIEW 3: MASTER_GRID (Bảng Tổng Hợp Toàn Trường) */}
        {viewMode === 'MASTER_GRID' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-tight">
                  Bảng Tổng Hợp Thời Khóa Biểu Toàn Trường
                </h3>
                <p className="text-xs text-indigo-200">
                  Hiển thị tất cả {filteredClasses.length} lớp học trên cùng một bảng ma trận
                </p>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[75vh]">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-slate-100 text-slate-800 font-black sticky top-0 z-10 shadow-2xs">
                  <tr className="border-b border-slate-300 divide-x divide-slate-200">
                    <th className="py-2.5 px-3 w-12 text-center sticky left-0 bg-slate-100 z-20">STT</th>
                    <th className="py-2.5 px-3 min-w-[90px] sticky left-12 bg-slate-100 z-20">Lớp</th>
                    <th className="py-2.5 px-3 min-w-[130px]">GVCN</th>
                    {DAYS_OF_WEEK.map(d => (
                      <th key={d.value} colSpan={5} className="text-center py-2 bg-indigo-900 text-white font-extrabold border-l border-white/20">
                        {d.label}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-300 divide-x divide-slate-200 text-[10px] text-slate-600 font-bold bg-slate-50">
                    <th className="sticky left-0 bg-slate-50 z-20"></th>
                    <th className="sticky left-12 bg-slate-50 z-20"></th>
                    <th></th>
                    {DAYS_OF_WEEK.map(d => (
                      <React.Fragment key={d.value}>
                        {PERIODS.map(p => (
                          <th key={p} className="text-center py-1 px-1.5 w-16 bg-slate-50">
                            T{p}
                          </th>
                        ))}
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredClasses.map((cls, idx) => {
                    const homeroom = cls.homeroomTeacherId ? teacherMap.get(cls.homeroomTeacherId) : undefined;
                    return (
                      <tr key={cls.id} className="hover:bg-indigo-50/40 transition-colors divide-x divide-slate-100">
                        <td className="py-2 px-2 text-center font-bold text-slate-500 sticky left-0 bg-white z-10">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-black text-indigo-950 sticky left-12 bg-white z-10">
                          {cls.name}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-700 whitespace-nowrap">
                          {homeroom?.name || '-'}
                        </td>

                        {DAYS_OF_WEEK.map(d => (
                          <React.Fragment key={d.value}>
                            {PERIODS.map(p => {
                              const slot = slotMap.get(`${cls.id}_${d.value}_SANG_${p}`);
                              return (
                                <td
                                  key={p}
                                  className={`p-1 text-center border-r border-slate-100 ${
                                    slot?.isSpecialActivity
                                      ? 'bg-amber-50 font-bold text-amber-900'
                                      : slot?.subjectName
                                      ? 'bg-white'
                                      : 'bg-slate-50/50'
                                  }`}
                                >
                                  {slot?.subjectName ? (
                                    <div className="leading-tight">
                                      <div className="font-bold text-[11px] text-slate-900 truncate" title={getSubjectDisplayName(slot)}>
                                        {getSubjectDisplayName(slot)}
                                      </div>
                                      {getTeacherDisplayName(slot) && (
                                        <div className="text-[10px] text-indigo-700 font-semibold truncate" title={getTeacherDisplayName(slot)}>
                                          {getTeacherDisplayName(slot)}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 text-[10px]">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 4. Slot Edit Modal (For Admin) */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-300" />
                <h3 className="text-sm font-black uppercase">
                  Chỉnh sửa Tiết học: Lớp {editingSlot.className || classMap.get(editingSlot.classId)?.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingSlot(null)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 font-medium">
                Thứ {editingSlot.dayOfWeek} • {editingSlot.session === 'SANG' ? 'Buổi Sáng' : 'Buổi Chiều'} • Tiết {editingSlot.period}
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Môn học
                </label>
                <select
                  value={
                    editingSlot.subjectName === 'HĐTNHN (Sinh hoạt lớp)'
                      ? 'sub-hdtn-shl'
                      : editingSlot.subjectName === 'HĐTNHN (Chuyên đề)'
                      ? 'sub-hdtn-cd'
                      : editingSlot.subjectId || ''
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'sub-hdtn-shl') {
                      setEditingSlot({
                        ...editingSlot,
                        subjectId: 'sub-hdtn',
                        subjectName: 'HĐTNHN (Sinh hoạt lớp)'
                      });
                    } else if (val === 'sub-hdtn-cd') {
                      setEditingSlot({
                        ...editingSlot,
                        subjectId: 'sub-hdtn',
                        subjectName: 'HĐTNHN (Chuyên đề)'
                      });
                    } else {
                      const sub = subjectMap.get(val);
                      setEditingSlot({
                        ...editingSlot,
                        subjectId: val,
                        subjectName: sub?.name || ''
                      });
                    }
                  }}
                  className="w-full h-9 px-3 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="">-- Để trống (Không có tiết) --</option>
                  <option value="sub-hdtn">Chào cờ / Hoạt động trải nghiệm</option>
                  <option value="sub-hdtn-shl">HĐTNHN (Sinh hoạt lớp)</option>
                  <option value="sub-hdtn-cd">HĐTNHN (Chuyên đề)</option>
                  <option value="sub-shl">Sinh hoạt lớp</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Teacher */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Giáo viên giảng dạy
                </label>
                <select
                  value={editingSlot.teacherId || ''}
                  onChange={(e) => {
                    const t = teacherMap.get(e.target.value);
                    setEditingSlot({
                      ...editingSlot,
                      teacherId: e.target.value,
                      teacherName: t?.name || '',
                      teacherCode: t?.code || ''
                    });
                  }}
                  className="w-full h-9 px-3 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="">-- Chưa gán giáo viên --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code}) - {t.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Room */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phòng học / Ghi chú
                </label>
                <input
                  type="text"
                  value={editingSlot.room || ''}
                  onChange={(e) => setEditingSlot({ ...editingSlot, room: e.target.value })}
                  placeholder="Ví dụ: P.101, Phòng Tin học, Sân bóng..."
                  className="w-full h-9 px-3 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
              <button
                onClick={() => {
                  // Clear slot
                  handleSaveSlot({
                    ...editingSlot,
                    subjectId: '',
                    subjectName: '',
                    teacherId: '',
                    teacherName: '',
                    teacherCode: '',
                    room: ''
                  });
                }}
                className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
              >
                Xóa tiết này
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingSlot(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleSaveSlot(editingSlot)}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Import Modal */}
      <TimetableImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        classes={classes}
        subjects={subjects}
        teachers={teachers}
        config={config}
        currentWeek={currentWeek}
        onImportSuccess={handleImportSuccess}
      />

      {/* 6. Auto Schedule Modal */}
      <AutoScheduleModal
        isOpen={isAutoScheduleModalOpen}
        onClose={() => setIsAutoScheduleModalOpen(false)}
        classes={classes}
        subjects={subjects}
        teachers={teachers}
        assignments={assignments}
        config={config}
        currentTimetable={timetable}
        onApplyTimetable={(newTimetable) => {
          onUpdateTimetable(newTimetable);
        }}
      />

      {/* 7. Copy Timetable Modal */}
      <CopyTimetableModal
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        currentWeek={currentWeek}
        availableWeeksWithData={Object.keys(weeklyTimetables).map(Number)}
        onConfirmCopy={(sourceWeek, targetWeeks, overwrite) => {
          if (onCopyTimetableToWeek) {
            onCopyTimetableToWeek(sourceWeek, targetWeeks, overwrite);
          }
        }}
      />
    </div>
  );
};

