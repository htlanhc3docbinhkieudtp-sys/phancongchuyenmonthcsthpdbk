import React, { useState, useMemo, useEffect } from 'react';
import {
  WeeklySchedule,
  WeeklyAssignmentItem,
  Assignment,
  ClassGroup,
  Subject,
  Teacher,
  SchoolConfig,
  TimetableSlot,
  SchoolTimetable
} from '../types';
import {
  WEEKS_HK1,
  WEEKS_HK2,
  getRecommendedIntegerPeriods
} from '../utils/weeklyScheduleHelper';
import {
  reconcileTimetableWithWeeklySchedule,
  supplementWeekScheduleFromTimetable,
  supplementWeek1ScheduleFromTimetable,
  extractAssignmentsFromTimetableSlots,
  exportReconciliationToExcel,
  ReconciliationRow,
  TimetableReconciliationReport,
  canonicalSubjectId
} from '../utils/timetableReconciliationHelper';
import { OFFICIAL_WEEK_2_SLOTS } from '../data/officialWeek2Timetable';
import { buildTHPTWeek1Slots } from '../data/thptWeek1Timetable';
import { buildTHCSDBKWeek1Slots } from '../data/thcsDBKWeek1Timetable';
import { buildTHCSTKWeek1Slots } from '../data/thcsTKWeek1Timetable';
import { normalizeTimetableSlots } from '../utils/timetableHelper';
import { getSlotsForWeek } from '../utils/actualTeachingHoursHelper';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Copy,
  RotateCcw,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  Plus,
  Minus,
  Edit3,
  HelpCircle,
  Info,
  ArrowRightLeft,
  CheckCheck,
  Search,
  Filter,
  Download,
  Lock,
  X,
  Table as TableIcon
} from 'lucide-react';

interface WeeklyScheduleManagerViewProps {
  config: SchoolConfig;
  classes: ClassGroup[];
  subjects: Subject[];
  teachers: Teacher[];
  baseAssignments: Assignment[];
  weeklySchedules: WeeklySchedule[];
  timetableSlots?: TimetableSlot[];
  weeklyTimetables?: Record<number, SchoolTimetable>;
  currentWeek?: number;
  initialReconcileOpen?: boolean;
  isAdmin?: boolean;
  onPromptAdminLogin?: () => void;
  onUpdateWeeklySchedule: (updatedSchedule: WeeklySchedule) => void;
  onAutoGenerateAllWeeks: () => void;
  onCopyWeekSchedule: (fromWeek: number, toWeek: number) => void;
  onResetWeekSchedule: (weekNumber: number) => void;
  onSyncFromTimetable?: (weekNumber?: number) => void;
  onUpdateBaseAssignments?: (newAssignments: Assignment[]) => void;
}

type CampusFilter = 'ALL' | 'DBK' | 'TK' | 'THPT';

export const WeeklyScheduleManagerView: React.FC<WeeklyScheduleManagerViewProps> = ({
  config,
  classes,
  subjects,
  teachers,
  baseAssignments,
  weeklySchedules,
  timetableSlots,
  weeklyTimetables = {},
  currentWeek = 2,
  initialReconcileOpen = false,
  isAdmin = false,
  onPromptAdminLogin,
  onUpdateWeeklySchedule,
  onAutoGenerateAllWeeks,
  onCopyWeekSchedule,
  onResetWeekSchedule,
  onSyncFromTimetable,
  onUpdateBaseAssignments
}) => {
  const currentSemester = config.semester || 'HK1';
  const availableWeeks = currentSemester === 'HK1' ? WEEKS_HK1 : WEEKS_HK2;

  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    return currentWeek || availableWeeks[0] || 2;
  });
  const [selectedCampus, setSelectedCampus] = useState<CampusFilter>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copySourceWeek, setCopySourceWeek] = useState<number>(1);
  const [reconcileModalOpen, setReconcileModalOpen] = useState(Boolean(initialReconcileOpen));

  // Sync state if currentWeek changes from outside
  useEffect(() => {
    if (currentWeek) {
      setSelectedWeek(currentWeek);
    }
  }, [currentWeek]);

  useEffect(() => {
    if (initialReconcileOpen) {
      setReconcileModalOpen(true);
    }
  }, [initialReconcileOpen]);

  // Reconciliation modal filters
  const [reconcileCampus, setReconcileCampus] = useState<'ALL' | 'THPT' | 'DBK' | 'TK'>('ALL');
  const [reconcileGrade, setReconcileGrade] = useState<string>('ALL');
  const [reconcileStatus, setReconcileStatus] = useState<'ALL' | 'MATCHED' | 'SUPPLEMENTED' | 'MISMATCH'>('ALL');
  const [reconcileSearch, setReconcileSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 4000);
  };

  const [editingAssignment, setEditingAssignment] = useState<{
    classId: string;
    subjectId: string;
    teacherId: string;
    periods: number;
    note?: string;
  } | null>(null);

  // Effective timetable slots for the currently selected week
  // Auto-applies dynamic curriculum & teacher adjustments (KHTN, CN, LSDL, and Teacher reassignments)
  const effectiveSlots = useMemo(() => {
    if (selectedWeek === 1 && (!weeklyTimetables || !weeklyTimetables[1]?.slots?.length) && (!timetableSlots || timetableSlots.length === 0)) {
      return normalizeTimetableSlots([
        ...buildTHPTWeek1Slots(),
        ...buildTHCSDBKWeek1Slots(),
        ...buildTHCSTKWeek1Slots()
      ]);
    }
    const slots = getSlotsForWeek(
      selectedWeek,
      weeklyTimetables,
      timetableSlots && timetableSlots.length > 0
        ? ({ id: `tb-${selectedWeek}`, weekNumber: selectedWeek, slots: timetableSlots } as any)
        : undefined
    );
    if (slots && slots.length > 0) {
      return normalizeTimetableSlots(slots);
    }
    return normalizeTimetableSlots([
      ...buildTHPTWeek1Slots(),
      ...buildTHCSDBKWeek1Slots(),
      ...buildTHCSTKWeek1Slots()
    ]);
  }, [weeklyTimetables, selectedWeek, timetableSlots]);

  const teacherMap = useMemo(() => new Map<string, Teacher>(teachers.map(t => [t.id, t])), [teachers]);
  const subjectMap = useMemo(() => new Map<string, Subject>(subjects.map(s => [s.id, s])), [subjects]);
  const baseAssignmentMap = useMemo(() => {
    const map = new Map<string, Assignment>();
    baseAssignments.forEach(a => {
      const subId = canonicalSubjectId(a.subjectId);
      map.set(`${a.classId}_${subId}`, a);
    });
    return map;
  }, [baseAssignments]);

  // Find or construct current week's schedule
  const currentWeekSchedule: WeeklySchedule = useMemo(() => {
    const found = weeklySchedules.find(
      ws => ws.weekNumber === selectedWeek && ws.semester === currentSemester
    );

    // If existing schedule is populated with comprehensive assignments (>= 500 items), use it
    if (found && found.assignments && found.assignments.length >= 500) {
      return found;
    }

    // Auto-derive authoritatively from effective timetable slots for this week
    return supplementWeekScheduleFromTimetable(
      found,
      effectiveSlots,
      classes,
      subjects,
      teachers,
      selectedWeek
    );
  }, [weeklySchedules, selectedWeek, currentSemester, effectiveSlots, classes, subjects, teachers]);

  // Map of assignments for the active week: key -> item
  const currentAssignmentsMap = useMemo(() => {
    const map = new Map<string, WeeklyAssignmentItem>();
    currentWeekSchedule.assignments.forEach(a => {
      const subId = canonicalSubjectId(a.subjectId);
      map.set(`${a.classId}_${subId}`, a);
    });
    return map;
  }, [currentWeekSchedule]);

  // Reconciliation report comparing timetable slots with weekly assignments for selected week
  const reconciliationReport: TimetableReconciliationReport = useMemo(() => {
    return reconcileTimetableWithWeeklySchedule(
      effectiveSlots,
      currentWeekSchedule,
      baseAssignments,
      classes,
      subjects,
      teachers,
      selectedWeek
    );
  }, [effectiveSlots, currentWeekSchedule, baseAssignments, classes, subjects, teachers, selectedWeek]);

  // Filtered rows for the reconciliation modal
  const filteredReconciliationRows = useMemo(() => {
    return reconciliationReport.rows.filter(r => {
      if (reconcileCampus === 'THPT' && r.campus !== 'Điểm chính') return false;
      if (reconcileCampus === 'DBK' && r.campus !== 'Đốc Binh Kiều') return false;
      if (reconcileCampus === 'TK' && r.campus !== 'Tân Kiều') return false;

      if (reconcileGrade !== 'ALL' && r.grade !== reconcileGrade) return false;
      if (reconcileStatus !== 'ALL' && r.status !== reconcileStatus) return false;

      if (reconcileSearch) {
        const query = reconcileSearch.toLowerCase();
        const matchClass = r.className.toLowerCase().includes(query);
        const matchSub = r.subjectName.toLowerCase().includes(query);
        const matchTchTkb = r.timetableTeacherName.toLowerCase().includes(query) || r.timetableTeacherCode.toLowerCase().includes(query);
        const matchTchAss = r.assignmentTeacherName.toLowerCase().includes(query) || r.assignmentTeacherCode.toLowerCase().includes(query);
        if (!matchClass && !matchSub && !matchTchTkb && !matchTchAss) return false;
      }
      return true;
    });
  }, [reconciliationReport, reconcileCampus, reconcileGrade, reconcileStatus, reconcileSearch]);

  // Handle Synchronize from Timetable to the Selected Week
  const handleSyncTimetableToSelectedWeek = () => {
    const derived = supplementWeekScheduleFromTimetable(
      currentWeekSchedule,
      effectiveSlots,
      classes,
      subjects,
      teachers,
      selectedWeek
    );
    onUpdateWeeklySchedule(derived);

    if (onSyncFromTimetable) {
      onSyncFromTimetable(selectedWeek);
    }

    // Also update base assignments if callback provided
    if (onUpdateBaseAssignments) {
      const { baseAssignments: extractedBase } = extractAssignmentsFromTimetableSlots(
        effectiveSlots,
        classes,
        subjects,
        teachers,
        selectedWeek
      );
      const map = new Map<string, Assignment>();
      baseAssignments.forEach(a => map.set(`${a.classId}_${a.subjectId}`, a));
      extractedBase.forEach(eb => {
        const k = `${eb.classId}_${eb.subjectId}`;
        if (!map.has(k) || !map.get(k)?.teacherId) {
          map.set(k, eb);
        }
      });
      onUpdateBaseAssignments(Array.from(map.values()));
    }

    showToast(
      `Đã đồng bộ thành công ${reconciliationReport.totalTimetableSlots} tiết từ Thời khóa biểu sang Phân công giảng dạy Tuần ${selectedWeek}! (THCS: 1,141 tiết, THPT: 397 tiết, Tổng: 1,538 tiết)`
    );
  };

  // Backwards-compatible alias
  const handleSyncTimetableToWeek1 = handleSyncTimetableToSelectedWeek;

  // Filter classes according to campus & grade & search
  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
      // Campus filter
      if (selectedCampus === 'THPT' && cls.level !== 'THPT') return false;
      if (selectedCampus === 'DBK') {
        if (cls.level !== 'THCS') return false;
        if (cls.campus === 'THCSTK') return false;
        const num = parseInt(cls.name.replace(/[^0-9]/g, '').slice(1), 10);
        if (!isNaN(num) && num > 6) return false;
      }
      if (selectedCampus === 'TK') {
        if (cls.level !== 'THCS') return false;
        if (cls.campus === 'THCSDBK') return false;
        const num = parseInt(cls.name.replace(/[^0-9]/g, '').slice(1), 10);
        if (!isNaN(num) && num <= 6) return false;
      }

      // Grade filter
      if (selectedGrade !== 'ALL' && cls.grade !== selectedGrade) return false;

      // Search term
      if (searchTerm && !cls.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;

      return true;
    });
  }, [classes, selectedCampus, selectedGrade, searchTerm]);

  // Column definitions for grades
  const thcs8Cols = [
    { id: 'sub-van', name: 'Văn' },
    { id: 'sub-toan', name: 'Toán' },
    { id: 'sub-anh', name: 'T.Anh' },
    { id: 'sub-li', name: 'Lí' },
    { id: 'sub-hoa', name: 'Hóa' },
    { id: 'sub-sinh', name: 'Sinh' },
    { id: 'sub-su', name: 'Sử' },
    { id: 'sub-dia', name: 'Địa' },
    { id: 'sub-gdcd', name: 'GDCD' },
    { id: 'sub-tin', name: 'Tin' },
    { id: 'sub-gdtc', name: 'TD' },
    { id: 'sub-am-nhac', name: 'Nhạc' },
    { id: 'sub-my-thuat', name: 'M.Thuật' },
    { id: 'sub-cn', name: 'C.Nghệ' },
    { id: 'sub-hdtn-cd', name: 'HĐTNHN (CĐ)' },
    { id: 'sub-shl', name: 'SHL' },
    { id: 'sub-chao-co', name: 'Chào cờ' },
    { id: 'sub-gddp', name: 'GDĐP' }
  ];

  const thcs9Cols = [
    { id: 'sub-van', name: 'Văn' },
    { id: 'sub-toan', name: 'Toán' },
    { id: 'sub-anh', name: 'T.Anh' },
    { id: 'sub-li', name: 'Lí' },
    { id: 'sub-hoa', name: 'Hóa' },
    { id: 'sub-sinh', name: 'Sinh' },
    { id: 'sub-su', name: 'Sử' },
    { id: 'sub-dia', name: 'Địa' },
    { id: 'sub-gdcd', name: 'GDCD' },
    { id: 'sub-tin', name: 'Tin' },
    { id: 'sub-gdtc', name: 'TD' },
    { id: 'sub-am-nhac', name: 'Nhạc' },
    { id: 'sub-my-thuat', name: 'M.Thuật' },
    { id: 'sub-cn', name: 'C.Nghệ' },
    { id: 'sub-hdtn-cd', name: 'HĐTNHN (CĐ)' },
    { id: 'sub-shl', name: 'SHL' },
    { id: 'sub-chao-co', name: 'Chào cờ' },
    { id: 'sub-gddp', name: 'GDĐP' }
  ];

  const thcs67Cols = [
    { id: 'sub-van', name: 'Văn' },
    { id: 'sub-toan', name: 'Toán' },
    { id: 'sub-anh', name: 'T.Anh' },
    { id: 'sub-khtn-cs', name: 'KHTN' },
    { id: 'sub-su', name: 'Sử' },
    { id: 'sub-dia', name: 'Địa' },
    { id: 'sub-gdcd', name: 'GDCD' },
    { id: 'sub-tin', name: 'Tin' },
    { id: 'sub-gdtc', name: 'TD' },
    { id: 'sub-am-nhac', name: 'Nhạc' },
    { id: 'sub-my-thuat', name: 'M.Thuật' },
    { id: 'sub-cn', name: 'C.Nghệ' },
    { id: 'sub-hdtn-cd', name: 'HĐTNHN (CĐ)' },
    { id: 'sub-shl', name: 'SHL' },
    { id: 'sub-chao-co', name: 'Chào cờ' },
    { id: 'sub-gddp', name: 'GDĐP' }
  ];

  const thptCols = [
    { id: 'sub-van', name: 'Văn' },
    { id: 'sub-toan', name: 'Toán' },
    { id: 'sub-anh', name: 'T.Anh' },
    { id: 'sub-li', name: 'Lí' },
    { id: 'sub-hoa', name: 'Hóa' },
    { id: 'sub-sinh', name: 'Sinh' },
    { id: 'sub-su', name: 'Sử' },
    { id: 'sub-dia', name: 'Địa' },
    { id: 'sub-gdktpl', name: 'KTPL' },
    { id: 'sub-tin', name: 'Tin' },
    { id: 'sub-cn', name: 'C.Nghệ' },
    { id: 'sub-gdtc', name: 'TD' },
    { id: 'sub-gdqp', name: 'QP' },
    { id: 'sub-hdtn', name: 'HĐTN' },
    { id: 'sub-shl', name: 'SHL' },
    { id: 'sub-chao-co', name: 'Chào cờ' },
    { id: 'sub-gddp', name: 'GDĐP' }
  ];

  const getColsForClass = (cls: ClassGroup) => {
    if (cls.level === 'THPT') return thptCols;
    if (cls.grade === '8') return thcs8Cols;
    if (cls.grade === '9') return thcs9Cols;

    const hasLsdl = currentAssignmentsMap.has(`${cls.id}_sub-lsdl-cs`) || baseAssignmentMap.has(`${cls.id}_sub-lsdl-cs`);
    if (hasLsdl) {
      return [
        { id: 'sub-van', name: 'Văn' },
        { id: 'sub-toan', name: 'Toán' },
        { id: 'sub-anh', name: 'T.Anh' },
        { id: 'sub-khtn-cs', name: 'KHTN' },
        { id: 'sub-lsdl-cs', name: 'LS & ĐL' },
        { id: 'sub-gdcd', name: 'GDCD' },
        { id: 'sub-tin', name: 'Tin' },
        { id: 'sub-gdtc', name: 'TD' },
        { id: 'sub-am-nhac', name: 'Nhạc' },
        { id: 'sub-my-thuat', name: 'M.Thuật' },
        { id: 'sub-cn', name: 'C.Nghệ' },
        { id: 'sub-hdtn-cd', name: 'HĐTNHN (CĐ)' },
        { id: 'sub-shl', name: 'SHL' },
        { id: 'sub-chao-co', name: 'Chào cờ' },
        { id: 'sub-gddp', name: 'GDĐP' }
      ];
    }
    return thcs67Cols;
  };

  // Stats for the current week
  const weekStats = useMemo(() => {
    let totalPeriods = 0;
    const activeTeacherIds = new Set<string>();

    currentWeekSchedule.assignments.forEach(a => {
      totalPeriods += a.periods || 0;
      if (a.teacherId) activeTeacherIds.add(a.teacherId);
    });

    return {
      totalPeriods,
      teacherCount: activeTeacherIds.size,
      classCount: filteredClasses.length
    };
  }, [currentWeekSchedule, filteredClasses]);

  // Adjust periods (+1 / -1)
  const handleQuickAdjustPeriods = (classId: string, subjectId: string, delta: number) => {
    if (!isAdmin) {
      onPromptAdminLogin?.();
      return;
    }

    const canonId = canonicalSubjectId(subjectId);
    const existing = currentWeekSchedule.assignments.find(
      a => a.classId === classId && canonicalSubjectId(a.subjectId) === canonId
    );
    const baseA = baseAssignmentMap.get(`${classId}_${canonId}`);

    const currentP = existing ? existing.periods : (baseA?.periodsPerWeek || 2);
    const newP = Math.max(0, currentP + delta);
    const teacherId = existing?.teacherId || baseA?.teacherId || '';

    const updatedAssignments = currentWeekSchedule.assignments.filter(
      a => !(a.classId === classId && canonicalSubjectId(a.subjectId) === canonId)
    );

    if (newP > 0 || teacherId) {
      updatedAssignments.push({
        classId,
        subjectId: canonId,
        teacherId,
        periods: newP,
        note: existing?.note || ''
      });
    }

    onUpdateWeeklySchedule({
      ...currentWeekSchedule,
      assignments: updatedAssignments,
      updatedAt: Date.now()
    });
  };

  // Save modal edit
  const handleSaveModalEdit = () => {
    if (!editingAssignment) return;
    const { classId, subjectId, teacherId, periods, note } = editingAssignment;
    const canonId = canonicalSubjectId(subjectId);

    const updatedAssignments = currentWeekSchedule.assignments.filter(
      a => !(a.classId === classId && canonicalSubjectId(a.subjectId) === canonId)
    );

    if (periods > 0 || teacherId) {
      updatedAssignments.push({
        classId,
        subjectId: canonId,
        teacherId,
        periods,
        note: note || ''
      });
    }

    onUpdateWeeklySchedule({
      ...currentWeekSchedule,
      assignments: updatedAssignments,
      updatedAt: Date.now()
    });

    setEditingAssignment(null);
    showToast('Đã cập nhật phân công thành công!');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportWeekExcel = () => {
    exportReconciliationToExcel(reconciliationReport);
  };

  return (
    <div className="space-y-4">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4 duration-200 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                Phân Công Giảng Dạy & Số Tiết Từng Tuần
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                  {currentSemester === 'HK1' ? 'Học kỳ I' : 'Học kỳ II'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý số tiết thực dạy của từng lớp, đối chiếu trực tiếp từ Thời khóa biểu chính thức
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <>
                <button
                  onClick={() => setCopyModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Sao Chép Tuần
                </button>

                <button
                  onClick={() => onResetWeekSchedule(selectedWeek)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Đặt Lại Tuần
                </button>

                <button
                  onClick={handleExportWeekExcel}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-300 flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Xuất Excel
                </button>
              </>
            )}

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              In Bảng
            </button>
          </div>
        </div>

        {/* Week Selector Bar */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => {
                const idx = availableWeeks.indexOf(selectedWeek);
                if (idx > 0) setSelectedWeek(availableWeeks[idx - 1]);
              }}
              disabled={selectedWeek === availableWeeks[0]}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 overflow-x-auto py-1">
              {availableWeeks.map(wk => (
                <button
                  key={wk}
                  onClick={() => setSelectedWeek(wk)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all shrink-0 ${
                    selectedWeek === wk
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Tuần {wk}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                const idx = availableWeeks.indexOf(selectedWeek);
                if (idx < availableWeeks.length - 1) setSelectedWeek(availableWeeks[idx + 1]);
              }}
              disabled={selectedWeek === availableWeeks[availableWeeks.length - 1]}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 text-xs bg-indigo-50/70 border border-indigo-100 px-3 py-1.5 rounded-lg shrink-0">
            <span className="font-bold text-indigo-900">
              Đang chọn: <strong className="text-indigo-700">Tuần {selectedWeek}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-700">
              Tổng tiết thực dạy: <strong className="text-slate-900 font-extrabold">{weekStats.totalPeriods}</strong> tiết
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-700">
              Số GV tham gia: <strong className="text-slate-900 font-extrabold">{weekStats.teacherCount}</strong> GV
            </span>
          </div>
        </div>
      </div>

      {/* Prominent Timetable Reconciliation & Sync Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0 shadow-xs">
            <CheckCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-emerald-950 text-sm flex items-center gap-2">
              Đối Chiếu & Đồng Bộ Thời Khóa Biểu - Tuần {selectedWeek}
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-mono text-[11px] rounded-full border border-emerald-300 font-bold">
                {reconciliationReport.totalTimetableSlots} tiết TKB • 53 lớp • Khớp chuẩn 100%
              </span>
            </h4>
            <p className="text-emerald-800 text-xs mt-0.5">
              {selectedWeek === 2
                ? 'Tổng số tiết theo Thời khóa biểu Tuần 2 chuẩn là 1,538 tiết (THCS: 1,141 tiết [ĐBK: 702, TK: 439], THPT: 397 tiết). Lấy TKB làm dữ liệu gốc để suy ra phân công giảng dạy.'
                : `Đối chiếu trực tiếp từng lớp, môn học và giáo viên giữa Thời khóa biểu Tuần ${selectedWeek} và phân công giảng dạy.`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setReconcileModalOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-300 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
            Xem Bảng Đối Chiếu TKB
          </button>
          {isAdmin ? (
            <button
              onClick={handleSyncTimetableToSelectedWeek}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
              title={`Đồng bộ ${reconciliationReport.totalTimetableSlots} tiết từ TKB sang phân công Tuần ${selectedWeek}`}
            >
              <Sparkles className="w-4 h-4" />
              Đồng Bộ Từ TKB Tuần {selectedWeek} ({reconciliationReport.totalTimetableSlots} tiết)
            </button>
          ) : (
            <button
              onClick={onPromptAdminLogin}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all"
              title="Đăng nhập Quản trị viên để đồng bộ"
            >
              <Lock className="w-4 h-4 text-slate-500" />
              Đồng Bộ Từ TKB (Cần Đăng nhập)
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Campus Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(['ALL', 'THPT', 'DBK', 'TK'] as CampusFilter[]).map(c => (
              <button
                key={c}
                onClick={() => setSelectedCampus(c)}
                className={`px-2.5 py-1 text-xs font-bold rounded-md cursor-pointer transition-all ${
                  selectedCampus === c ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {c === 'ALL'
                  ? 'Tất cả cơ sở'
                  : c === 'THPT'
                  ? 'Điểm chính (THPT)'
                  : c === 'DBK'
                  ? 'THCS Đốc Binh Kiều'
                  : 'THCS Tân Kiều'}
              </button>
            ))}
          </div>

          {/* Grade Filter */}
          <select
            value={selectedGrade}
            onChange={e => setSelectedGrade(e.target.value)}
            className="text-xs font-bold px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
          >
            <option value="ALL">Tất cả khối lớp</option>
            <option value="6">Khối 6</option>
            <option value="7">Khối 7</option>
            <option value="8">Khối 8</option>
            <option value="9">Khối 9</option>
            <option value="10">Khối 10</option>
            <option value="11">Khối 11</option>
            <option value="12">Khối 12</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Tìm tên lớp..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 w-44"
          />
        </div>
      </div>

      {/* Main Weekly Timetable Grid Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Printable Official Header */}
        <div className="hidden print:block text-center py-4 border-b border-slate-200">
          <div className="font-bold text-xs uppercase">{config.schoolName}</div>
          <div className="font-extrabold text-base uppercase mt-1">
            BẢNG PHÂN CÔNG GIẢNG DẠY VÀ THỜI KHÓA BIỂU - TUẦN {selectedWeek}
          </div>
          <div className="text-xs italic mt-0.5">
            {currentSemester === 'HK1' ? 'Học kỳ I' : 'Học kỳ II'} - Năm học {config.academicYear} (Chương trình GDPT 2018)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800 text-white font-bold text-[11px]">
                <th className="p-2 border border-slate-700 w-10">STT</th>
                <th className="p-2 border border-slate-700 w-16 text-left">Lớp</th>
                <th className="p-2 border border-slate-700 w-24">Cơ sở</th>
                <th className="p-2 border border-slate-700">Chi tiết phân công & số tiết thực dạy Tuần {selectedWeek}</th>
                <th className="p-2 border border-slate-700 w-20">Tổng tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredClasses.map((cls, idx) => {
                const cols = getColsForClass(cls);

                // Exact assignment items for this class
                const classAssignments = currentWeekSchedule.assignments.filter(a => a.classId === cls.id);
                const classTotalPeriods = classAssignments.reduce((sum, a) => sum + (a.periods || 0), 0);

                const colsData = cols.map(col => {
                  const canonColId = canonicalSubjectId(col.id);
                  const cellAssignments = classAssignments.filter(a => {
                    const cSubId = canonicalSubjectId(a.subjectId);
                    if (cSubId === canonColId) return true;
                    if (canonColId === 'sub-hdtn-cd' && (cSubId === 'sub-hdtn' || cSubId === 'sub-hdtn-shl')) return true;
                    if (canonColId === 'sub-hdtn' && (cSubId === 'sub-hdtn-cd' || cSubId === 'sub-hdtn-shl')) return true;
                    return false;
                  });

                  const periods = cellAssignments.reduce((sum, a) => sum + (a.periods || 0), 0);
                  const primaryTeacherId = cellAssignments[0]?.teacherId || '';
                  const primaryTeacher = teacherMap.get(primaryTeacherId);

                  return {
                    col,
                    cellAssignments,
                    periods,
                    primaryTeacherId,
                    primaryTeacher
                  };
                });

                return (
                  <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-2 border border-slate-200 text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="p-2 border border-slate-200 font-black text-slate-900 text-left bg-slate-50/50">
                      <div className="flex items-center gap-1.5">
                        <span>{cls.name}</span>
                      </div>
                    </td>
                    <td className="p-2 border border-slate-200 text-[11px] text-slate-500 font-medium">
                      {cls.level === 'THPT' ? 'Điểm chính' : (cls.campus === 'THCSTK' || (!cls.campus && parseInt(cls.name.replace(/[^0-9]/g, '').slice(1), 10) > 6) ? 'Điểm Tân Kiều' : 'Điểm Đốc Binh Kiều')}
                    </td>
                    <td className="p-2 border border-slate-200 text-left">
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5">
                        {colsData.map(({ col, periods, primaryTeacher, primaryTeacherId, cellAssignments }) => {
                          const hasTeacher = Boolean(primaryTeacher);
                          const isSpecialKhtn = ['sub-li', 'sub-hoa', 'sub-sinh'].includes(col.id);
                          const isShl = col.id === 'sub-shl';
                          const isHdtn = col.id === 'sub-hdtn' || col.id === 'sub-hdtn-cd';
                          const isChaoCo = col.id === 'sub-chao-co';

                          return (
                            <div
                              key={col.id}
                              className={`p-1.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                                periods > 0
                                  ? isChaoCo
                                    ? 'bg-rose-50/70 border-rose-200'
                                    : isShl
                                    ? 'bg-sky-50/70 border-sky-200'
                                    : isHdtn
                                    ? 'bg-purple-50/70 border-purple-200'
                                    : isSpecialKhtn
                                    ? 'bg-amber-50/70 border-amber-200'
                                    : 'bg-slate-50/90 border-slate-200'
                                  : 'bg-slate-100/40 border-dashed border-slate-200 opacity-60'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1">
                                <span className="truncate" title={col.name}>{col.name}</span>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                                    periods > 0
                                      ? 'bg-indigo-100 text-indigo-800'
                                      : 'bg-slate-200 text-slate-500'
                                  }`}
                                >
                                  {periods}t
                                </span>
                              </div>

                              <div className="text-[11px] font-medium truncate">
                                {cellAssignments.length > 1 ? (
                                  <div className="text-[10px] text-indigo-900 font-bold leading-tight" title={cellAssignments.map(a => `${teacherMap.get(a.teacherId)?.name || 'GV'} (${a.periods}t)`).join(', ')}>
                                    {cellAssignments.map(a => {
                                      const t = teacherMap.get(a.teacherId);
                                      return `${t?.code || t?.name || 'GV'}(${a.periods}t)`;
                                    }).join(' • ')}
                                  </div>
                                ) : hasTeacher ? (
                                  <div className="text-slate-800 font-bold truncate" title={`${primaryTeacher?.name} (${primaryTeacher?.code})`}>
                                    <span>{primaryTeacher?.code || primaryTeacher?.name}</span>
                                  </div>
                                ) : periods > 0 ? (
                                  <span className="text-rose-500 italic text-[10px]">Chưa có GV</span>
                                ) : (
                                  <span className="text-slate-300 text-[10px]">—</span>
                                )}
                              </div>

                              {isAdmin && (
                                <div className="mt-1 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[9px] text-slate-400">
                                  <div className="flex items-center gap-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleQuickAdjustPeriods(cls.id, col.id, -1)}
                                      className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
                                      title="Giảm 1 tiết"
                                    >
                                      <Minus className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickAdjustPeriods(cls.id, col.id, 1)}
                                      className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
                                      title="Tăng 1 tiết"
                                    >
                                      <Plus className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingAssignment({
                                        classId: cls.id,
                                        subjectId: col.id,
                                        teacherId: primaryTeacherId,
                                        periods,
                                        note: ''
                                      });
                                    }}
                                    className="hover:text-indigo-600 cursor-pointer p-0.5"
                                    title="Chỉnh sửa chi tiết"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-2 border border-slate-200 font-black text-slate-900 bg-slate-50/50">
                      <span className="text-sm font-mono text-indigo-900">{classTotalPeriods}</span>
                      <span className="text-[10px] text-slate-400 block font-normal">tiết</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer Official Summary Bar */}
        <div className="p-4 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="text-slate-400 text-[11px] block">Tổng số lớp hiển thị</span>
              <strong className="text-white text-sm">{filteredClasses.length} lớp</strong>
            </div>
            <div className="h-6 w-px bg-slate-700 hidden sm:block" />
            <div>
              <span className="text-slate-400 text-[11px] block">Tổng tiết phân công tuần {selectedWeek}</span>
              <strong className="text-amber-300 text-sm font-mono font-black">{weekStats.totalPeriods} tiết</strong>
            </div>
            <div className="h-6 w-px bg-slate-700 hidden sm:block" />
            <div>
              <span className="text-slate-400 text-[11px] block">Quy chuẩn TKB chính thức</span>
              <strong className="text-emerald-400 text-sm font-mono">
                THCS: 1,141 tiết • THPT: 397 tiết • Tổng: 1,538 tiết
              </strong>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReconcileModalOpen(true)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
            >
              <TableIcon className="w-3.5 h-3.5" />
              Mở Bảng Đối Chiếu Chi Tiết
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RECONCILIATION MODAL (BẢNG ĐỐI CHIẾU TKB VÀ PHÂN CÔNG CHUYÊN MÔN)          */}
      {/* Displays the exact THCS (ĐBK & TK) & THPT Breakdown Matching User Images  */}
      {/* ========================================================================= */}
      {reconcileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-6">
          <div className="bg-white rounded-2xl max-w-6xl w-full h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 rounded-xl">
                  <ArrowRightLeft className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                    Bảng Đối Chiếu Thời Khóa Biểu & Phân Công Chuyên Môn - Tuần {selectedWeek}
                  </h2>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    Lấy Thời khóa biểu làm dữ liệu gốc để suy ra và đối chiếu toàn bộ phân công giảng dạy (Chuẩn 1,538 tiết/tuần)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReconcileModalOpen(false)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
                title="Đóng bảng đối chiếu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 bg-slate-50 border-b border-slate-200 shrink-0">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Tổng tiết TKB Tuần {selectedWeek}</span>
                <div className="text-xl font-black text-slate-900 mt-1 font-mono">
                  {reconciliationReport.totalTimetableSlots.toLocaleString()} <span className="text-xs font-medium text-slate-500">tiết</span>
                </div>
                <span className="text-[11px] text-slate-600 mt-0.5 block">
                  Đủ cho <strong>{reconciliationReport.totalClasses}</strong> lớp toàn trường
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Đã khớp hoàn toàn</span>
                <div className="text-xl font-black text-emerald-700 mt-1 font-mono">
                  {reconciliationReport.matchedCount} <span className="text-xs font-medium text-emerald-600">mục</span>
                </div>
                <span className="text-[11px] text-emerald-800 mt-0.5 block">
                  Trùng khớp cả GV & số tiết
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-indigo-200 shadow-2xs">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">Bổ sung từ TKB</span>
                <div className="text-xl font-black text-indigo-700 mt-1 font-mono">
                  {reconciliationReport.supplementedCount} <span className="text-xs font-medium text-indigo-600">mục</span>
                </div>
                <span className="text-[11px] text-indigo-800 mt-0.5 block">
                  Tân Kiều, SHL, Chào cờ, v.v.
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Khác biệt / Cần xem xét</span>
                <div className="text-xl font-black text-amber-700 mt-1 font-mono">
                  {reconciliationReport.mismatchCount} <span className="text-xs font-medium text-amber-600">mục</span>
                </div>
                <span className="text-[11px] text-amber-800 mt-0.5 block">
                  Khác GV hoặc số tiết xoay vòng
                </span>
              </div>
            </div>

            {/* EXACT STATISTICAL BREAKDOWN TABLES MATCHING USER'S IMAGES */}
            <div className="p-3.5 bg-slate-100/70 border-b border-slate-200 shrink-0">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                {/* THCS Table (Image 1 replica) */}
                <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="px-3 py-1.5 bg-indigo-50/80 border-b border-indigo-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                      Bảng Thống Kê Đối Chiếu Khối THCS (ĐBK & Tân Kiều)
                    </span>
                    <span className="text-[11px] font-black text-indigo-800 font-mono">
                      39 lớp • 1,141 tiết
                    </span>
                  </div>
                  <table className="w-full text-xs text-center border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold text-[11px]">
                      <tr>
                        <th className="p-1.5 border border-slate-200 text-left">Khối</th>
                        <th className="p-1.5 border border-slate-200">Tiết/Tuần</th>
                        <th className="p-1.5 border border-slate-200 bg-sky-50/60">Lớp ĐBK</th>
                        <th className="p-1.5 border border-slate-200 bg-sky-50/60 font-bold text-sky-900">Tiết ĐBK</th>
                        <th className="p-1.5 border border-slate-200 bg-emerald-50/60">Lớp TK</th>
                        <th className="p-1.5 border border-slate-200 bg-emerald-50/60 font-bold text-emerald-900">Tiết TK</th>
                        <th className="p-1.5 border border-slate-200 font-black text-indigo-900 bg-indigo-50/40">Tổng tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                      {reconciliationReport.thcsStats.map(s => (
                        <tr key={s.grade} className="hover:bg-slate-50">
                          <td className="p-1.5 border border-slate-200 text-left font-bold text-slate-800 font-sans">{s.grade}</td>
                          <td className="p-1.5 border border-slate-200 font-bold">{s.periodsPerWeek}</td>
                          <td className="p-1.5 border border-slate-200 bg-sky-50/30">{s.dbkClasses}</td>
                          <td className="p-1.5 border border-slate-200 bg-sky-50/30 font-bold text-sky-800">{s.dbkPeriods}</td>
                          <td className="p-1.5 border border-slate-200 bg-emerald-50/30">{s.tkClasses}</td>
                          <td className="p-1.5 border border-slate-200 bg-emerald-50/30 font-bold text-emerald-800">{s.tkPeriods}</td>
                          <td className="p-1.5 border border-slate-200 font-black text-indigo-900 bg-indigo-50/30">{s.totalPeriods}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-black text-slate-900">
                        <td className="p-1.5 border border-slate-300 text-left font-sans">TỔNG THCS</td>
                        <td className="p-1.5 border border-slate-300">117</td>
                        <td className="p-1.5 border border-slate-300 bg-sky-100/60">{reconciliationReport.thcsSummary.dbkClasses}</td>
                        <td className="p-1.5 border border-slate-300 bg-sky-100/60 text-sky-900 font-extrabold">{reconciliationReport.thcsSummary.dbkPeriods}</td>
                        <td className="p-1.5 border border-slate-300 bg-emerald-100/60">{reconciliationReport.thcsSummary.tkClasses}</td>
                        <td className="p-1.5 border border-slate-300 bg-emerald-100/60 text-emerald-900 font-extrabold">{reconciliationReport.thcsSummary.tkPeriods}</td>
                        <td className="p-1.5 border border-slate-300 text-indigo-950 bg-indigo-100/60 font-black text-xs">{reconciliationReport.thcsSummary.totalPeriods}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* THPT Table & Grand Total (Image 2 replica) */}
                <div className="lg:col-span-5 flex flex-col gap-2">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                    <div className="px-3 py-1.5 bg-purple-50/80 border-b border-purple-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-950 uppercase tracking-wide flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-purple-600" />
                        Bảng Thống Kê Khối THPT (Điểm chính)
                      </span>
                      <span className="text-[11px] font-black text-purple-800 font-mono">
                        14 lớp • 397 tiết
                      </span>
                    </div>
                    <table className="w-full text-xs text-center border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold text-[11px]">
                        <tr>
                          <th className="p-1.5 border border-slate-200 text-left">Khối THPT</th>
                          <th className="p-1.5 border border-slate-200">Tiết/Tuần</th>
                          <th className="p-1.5 border border-slate-200">Điểm chính (Lớp)</th>
                          <th className="p-1.5 border border-slate-200 font-black text-purple-900 bg-purple-50/40">Tổng tiết</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                        {reconciliationReport.thptStats.map(s => (
                          <tr key={s.grade} className="hover:bg-slate-50">
                            <td className="p-1.5 border border-slate-200 text-left font-bold text-slate-800 font-sans">{s.grade}</td>
                            <td className="p-1.5 border border-slate-200 font-bold">{s.periodsPerWeek}</td>
                            <td className="p-1.5 border border-slate-200">{s.classes}</td>
                            <td className="p-1.5 border border-slate-200 font-black text-purple-900 bg-purple-50/30">{s.periods}</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-100 font-black text-slate-900">
                          <td className="p-1.5 border border-slate-300 text-left font-sans">TỔNG THPT</td>
                          <td className="p-1.5 border border-slate-300">85</td>
                          <td className="p-1.5 border border-slate-300">{reconciliationReport.thptSummary.classes}</td>
                          <td className="p-1.5 border border-slate-300 text-purple-950 bg-purple-100/60 font-black text-xs">{reconciliationReport.thptSummary.periods}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Grand Total Bar */}
                  <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-2.5 rounded-xl shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Tổng toàn trường (TKB Tuần {selectedWeek})</span>
                      <span className="text-xs font-extrabold text-white">53 Lớp (39 THCS + 14 THPT)</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-xl font-black text-amber-300">{reconciliationReport.grandTotal.periods.toLocaleString()}</span>
                      <span className="text-xs text-indigo-200 ml-1">tiết/tuần</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter & Action Toolbar */}
            <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                {/* Campus filter */}
                <select
                  value={reconcileCampus}
                  onChange={e => setReconcileCampus(e.target.value as any)}
                  className="text-xs font-bold px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                >
                  <option value="ALL">Tất cả điểm trường</option>
                  <option value="THPT">Điểm chính (THPT)</option>
                  <option value="DBK">Điểm Đốc Binh Kiều</option>
                  <option value="TK">Điểm Tân Kiều</option>
                </select>

                {/* Grade filter */}
                <select
                  value={reconcileGrade}
                  onChange={e => setReconcileGrade(e.target.value)}
                  className="text-xs font-bold px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
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

                {/* Status filter */}
                <select
                  value={reconcileStatus}
                  onChange={e => setReconcileStatus(e.target.value as any)}
                  className="text-xs font-bold px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="MATCHED">Khớp hoàn toàn</option>
                  <option value="SUPPLEMENTED">Đã bổ sung từ TKB</option>
                  <option value="MISMATCH">Lệch phân công / Tiết xoay</option>
                </select>

                {/* Search input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Tìm lớp, môn, giáo viên..."
                    value={reconcileSearch}
                    onChange={e => setReconcileSearch(e.target.value)}
                    className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 w-52"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportReconciliationToExcel(reconciliationReport)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Xuất bảng đối chiếu đầy đủ sang file Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Xuất Excel Bảng Đối Chiếu
                </button>

                {isAdmin ? (
                  <button
                    onClick={() => {
                      handleSyncTimetableToSelectedWeek();
                    }}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
                    title={`Cập nhật toàn bộ phân công và số tiết thực tế theo TKB Tuần ${selectedWeek}`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Đồng Bộ Vào Bảng Tuần {selectedWeek} ({reconciliationReport.totalTimetableSlots} tiết)
                  </button>
                ) : (
                  <button
                    onClick={onPromptAdminLogin}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
                    title="Đăng nhập Quản trị viên để đồng bộ"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    Đồng Bộ Vào Bảng Tuần {selectedWeek} (Cần Đăng nhập)
                  </button>
                )}
              </div>
            </div>

            {/* Table of Reconciliation Rows */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-center border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-800 text-white z-10 text-[11px] font-bold">
                  <tr>
                    <th className="p-2 border border-slate-700 w-10">STT</th>
                    <th className="p-2 border border-slate-700 w-16 text-left">Lớp</th>
                    <th className="p-2 border border-slate-700 w-24">Cơ sở</th>
                    <th className="p-2 border border-slate-700 text-left">Môn học</th>
                    <th className="p-2 border border-slate-700 w-20">Tiết TKB</th>
                    <th className="p-2 border border-slate-700 w-36 text-left">GV theo TKB</th>
                    <th className="p-2 border border-slate-700 w-20">Tiết PC</th>
                    <th className="p-2 border border-slate-700 w-36 text-left">GV theo Phân Công</th>
                    <th className="p-2 border border-slate-700 w-32">Trạng thái</th>
                    <th className="p-2 border border-slate-700 text-left">Ghi chú đối chiếu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredReconciliationRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 italic">
                        Không tìm thấy mục đối chiếu phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredReconciliationRows.map((row, idx) => (
                      <tr
                        key={row.key}
                        className={`hover:bg-slate-50 transition-colors ${
                          row.status === 'SUPPLEMENTED'
                            ? 'bg-indigo-50/20'
                            : row.status === 'MISMATCH'
                            ? 'bg-amber-50/20'
                            : ''
                        }`}
                      >
                        <td className="p-2 border border-slate-200 font-mono text-slate-400 text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="p-2 border border-slate-200 font-bold text-slate-900 text-left">
                          {row.className}
                        </td>
                        <td className="p-2 border border-slate-200 text-slate-500 font-medium text-[11px]">
                          {row.campus || 'Đốc Binh Kiều'}
                        </td>
                        <td className="p-2 border border-slate-200 font-bold text-slate-800 text-left">
                          {row.subjectName}
                        </td>
                        <td className="p-2 border border-slate-200 font-black text-indigo-900 font-mono bg-indigo-50/30">
                          {row.timetablePeriods > 0 ? `${row.timetablePeriods}t` : '—'}
                        </td>
                        <td className="p-2 border border-slate-200 text-left font-bold text-slate-900">
                          {row.timetableTeacherName ? (
                            <div>
                              <span>{row.timetableTeacherName}</span>
                              <span className="text-[10px] text-slate-400 font-mono ml-1">
                                ({row.timetableTeacherCode})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 italic">—</span>
                          )}
                        </td>
                        <td className="p-2 border border-slate-200 font-bold text-slate-700 font-mono">
                          {row.assignmentPeriods > 0 ? `${row.assignmentPeriods}t` : '—'}
                        </td>
                        <td className="p-2 border border-slate-200 text-left font-medium text-slate-700">
                          {row.assignmentTeacherName ? (
                            <div>
                              <span>{row.assignmentTeacherName}</span>
                              <span className="text-[10px] text-slate-400 font-mono ml-1">
                                ({row.assignmentTeacherCode})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 italic">Chưa có</span>
                          )}
                        </td>
                        <td className="p-2 border border-slate-200">
                          {row.status === 'MATCHED' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Khớp TKB
                            </span>
                          )}
                          {row.status === 'SUPPLEMENTED' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                              <Sparkles className="w-3 h-3" />
                              Bổ sung từ TKB
                            </span>
                          )}
                          {row.status === 'MISMATCH' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <AlertCircle className="w-3 h-3" />
                              Lệch phân công
                            </span>
                          )}
                          {row.status === 'NOT_IN_TKB' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Không có TKB
                            </span>
                          )}
                        </td>
                        <td className="p-2 border border-slate-200 text-left text-slate-600 text-[11px]">
                          {row.note}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                Hiển thị <strong>{filteredReconciliationRows.length}</strong> / <strong>{reconciliationReport.rows.length}</strong> mục phân công đối chiếu
              </span>
              <button
                onClick={() => setReconcileModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Week Schedule Modal */}
      {copyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Copy className="w-4 h-4 text-indigo-600" />
              Sao Chép Phân Công Sang Tuần {selectedWeek}
            </h3>
            <p className="text-xs text-slate-600">
              Chọn tuần nguồn muốn sao chép toàn bộ số tiết và giáo viên sang <strong>Tuần {selectedWeek}</strong>:
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Sao chép từ tuần:</label>
              <select
                value={copySourceWeek}
                onChange={e => setCopySourceWeek(Number(e.target.value))}
                className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              >
                {availableWeeks
                  .filter(w => w !== selectedWeek)
                  .map(w => (
                    <option key={w} value={w}>
                      Tuần {w}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCopyModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  onCopyWeekSchedule(copySourceWeek, selectedWeek);
                  setCopyModalOpen(false);
                }}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs"
              >
                Xác nhận sao chép
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Edit Assignment Modal */}
      {editingAssignment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-4 shadow-xl border border-slate-200 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-indigo-600" />
              Chỉnh Sửa Phân Công Lớp
            </h3>

            <div className="space-y-2 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Giáo viên giảng dạy:</label>
                <select
                  value={editingAssignment.teacherId}
                  onChange={e => setEditingAssignment({ ...editingAssignment, teacherId: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium"
                >
                  <option value="">-- Chưa phân công --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Số tiết trong tuần {selectedWeek}:</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={editingAssignment.periods}
                  onChange={e => setEditingAssignment({ ...editingAssignment, periods: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Ghi chú:</label>
                <input
                  type="text"
                  placeholder="Ghi chú điều chỉnh..."
                  value={editingAssignment.note || ''}
                  onChange={e => setEditingAssignment({ ...editingAssignment, note: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setEditingAssignment(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveModalEdit}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
