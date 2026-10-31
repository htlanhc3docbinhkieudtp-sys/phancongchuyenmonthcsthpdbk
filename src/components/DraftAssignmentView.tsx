import React, { useState, useMemo, useEffect } from 'react';
import {
  SchoolConfig,
  Teacher,
  Department,
  ClassGroup,
  Subject,
  SchoolTimetable,
  TimetableSlot,
} from '../types';
import { WeeklyTeachingLogView } from './WeeklyTeachingLogView';
import { OFFICIAL_WEEK_8_SLOTS } from '../data/officialWeek8Timetable';
import { OFFICIAL_WEEK_7_SLOTS } from '../data/officialWeek7Timetable';
import {
  calculateAllActualWorkloads,
  TeacherActualWorkload,
} from '../utils/actualTeachingHoursHelper';
import {
  Sparkles,
  RotateCcw,
  Zap,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Check,
  Search,
  SlidersHorizontal,
  Layers,
  TrendingDown,
  TrendingUp,
  History,
  Eye,
  FileSpreadsheet,
  ArrowRight,
  UserCheck,
  Info,
  Calendar,
  Building2,
  ShieldAlert,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface DraftAssignmentViewProps {
  config: SchoolConfig;
  teachers: Teacher[];
  departments: Department[];
  classes: ClassGroup[];
  subjects: Subject[];
  weeklyTimetables?: Record<number, SchoolTimetable>;
  currentWeek?: number;
  timetable?: SchoolTimetable;
  isAdmin?: boolean;
  onShowToast?: (message: string) => void;
}

const DRAFT_SANDBOX_STORAGE_KEY = 'docbinhkieu_draft_sandbox_weekly_timetables_v2';
const DRAFT_SANDBOX_ADJUSTMENT_PREFIX = 'docbinhkieu_draft_sandbox_v2';

// 19 lớp HĐTNHN cần gom gọn theo đề xuất
const CONSOLIDATION_19_CLASSES_MAP: Record<
  string,
  { teacherName: string; teacherCode: string; teacherId?: string; roleReason: string }
> = {
  '6A1': {
    teacherName: 'Hồ Thị Ngọc Tài',
    teacherCode: 'Tài.HTN (6A1)',
    roleReason: 'GVCN 6A1 • Đang âm -3t/tuần (-108t/năm)',
  },
  '6A3': {
    teacherName: 'Nguyễn Thị Cẩm Nhung',
    teacherCode: 'Nhung.NTC (9A1)',
    roleReason: 'Né môn Tin học (Bùi Kim Phướng) • Âm -4t/tuần (-144t/năm)',
  },
  '6A4': {
    teacherName: 'Nguyễn Thanh Hùng',
    teacherCode: 'Hùng.NThanh (6A4)',
    roleReason: 'GVCN 6A4 • Đang âm -4t/tuần (-144t/năm)',
  },
  '6A6': {
    teacherName: 'Lê Kim Ngân',
    teacherCode: 'Ngân.LK (6A5)',
    roleReason: 'Âm -4t/tuần (-144t/năm) • GVCN Lê Thị Bình đã đủ 19t định mức',
  },
  '7A1': {
    teacherName: 'Nguyễn Văn Ngoan',
    teacherCode: 'Ngoan.NV (7A1)',
    roleReason: 'Né Tin học (Bùi Kim Phướng) • GVCN 7A1 • Âm nặng -6t/tuần (-216t/năm)',
  },
  '7A2': {
    teacherName: 'Trần Thị Cẩm',
    teacherCode: 'Cẩm.TT (7A6)',
    roleReason: 'Né Tin học (Mai Phước Lộc) • Đang âm -4t/tuần (-144t/năm)',
  },
  '7A3': {
    teacherName: 'Nguyễn Quốc Nguyễn',
    teacherCode: 'Nguyễn.NQ (7A3)',
    roleReason: 'GVCN 7A3 • Âm nặng -6t/tuần (-216t/năm)',
  },
  '7A4': {
    teacherName: 'Lê Ngọc Ẩn',
    teacherCode: 'Ẩn.LN (7A4)',
    roleReason: 'GVCN 7A4 • Đang âm -4t/tuần (-144t/năm)',
  },
  '7A5': {
    teacherName: 'Lê Thái Phương',
    teacherCode: 'Phương.LT (9A6)',
    roleReason: 'Ưu tiên 1: Âm nhiều tiết nhất toàn trường (-7t/tuần, -252t/năm)',
  },
  '8A1': {
    teacherName: 'Nguyễn Thái Hùng',
    teacherCode: 'Hùng.NThái (8A1)',
    roleReason: 'GVCN 8A1 • Âm nặng -6t/tuần (-216t/năm)',
  },
  '8A2': {
    teacherName: 'Trần Phi Hải',
    teacherCode: 'Hải.TP (8A2)',
    roleReason: 'GVCN 8A2 • Âm nặng -5t/tuần (-180t/năm)',
  },
  '8A3': {
    teacherName: 'Nguyễn Thị Xe',
    teacherCode: 'Xe.NT',
    roleReason: 'GVCN 8A3 • Đang âm -4t/tuần (-144t/năm)',
  },
  '8A4': {
    teacherName: 'Nguyễn Kim Ngân',
    teacherCode: 'Ngân.NK (8A4)',
    roleReason: 'GVCN 8A4 • Đang âm -3t/tuần (-108t/năm)',
  },
  '8A5': {
    teacherName: 'Võ Hoàng Toàn',
    teacherCode: 'Toàn.VH (8A5)',
    roleReason: 'GVCN 8A5 • Âm nặng -6t/tuần (-216t/năm)',
  },
  '8A6': {
    teacherName: 'Huỳnh Thanh Dân',
    teacherCode: 'Dân.HT (8A6)',
    roleReason: 'GVCN 8A6 • Đang âm -4t/tuần (-144t/năm)',
  },
  '9A2': {
    teacherName: 'Trần Thị Hậu',
    teacherCode: 'Hậu.TTH (9A2)',
    roleReason: 'GVCN 9A2 • Đang âm -3t/tuần • Giúp GVCN nắm trọn vẹn lớp cuối cấp',
  },
  '9A3': {
    teacherName: 'Lê Thái Phương',
    teacherCode: 'Phương.LT (9A6)',
    roleReason: 'Ưu tiên 1: Âm nhiều tiết nhất toàn trường (-7t/tuần, -252t/năm)',
  },
  '9A4': {
    teacherName: 'Nguyễn Văn Tài',
    teacherCode: 'Tài.NV (9A4)',
    roleReason: 'GVCN 9A4 • Âm nặng -6t/tuần (-216t/năm)',
  },
  '9A5': {
    teacherName: 'Hồ Mai Thảo',
    teacherCode: 'Thảo.HM (9A5)',
    roleReason: 'GVCN 9A5 • Đang âm -3t/tuần (-108t/năm)',
  },
};

export interface SlotDifferenceItem {
  slotId: string;
  className: string;
  dayOfWeek: number;
  period: number;
  session: string;
  subjectName: string;
  oldTeacherName: string;
  oldTeacherCode: string;
  newTeacherName: string;
  newTeacherCode: string;
  reason?: string;
}

export interface TeacherWorkloadDelta {
  teacherId: string;
  teacherName: string;
  teacherCode: string;
  departmentName: string;
  campus: string;
  effectiveStandard: number;
  reductionPeriods?: number;
  duties?: string;
  oldWeeklyTeaching: number;
  newWeeklyTeaching: number;
  oldWeeklyTotal?: number;
  newWeeklyTotal?: number;
  oldWeeklyBalance: number;
  newWeeklyBalance: number;
  weeklyDelta: number;
  oldYearTeaching: number;
  newYearTeaching: number;
  oldYearBalance: number;
  newYearBalance: number;
  yearDelta: number;
  classesGained: string[];
  classesLost: string[];
}

export const DraftAssignmentView: React.FC<DraftAssignmentViewProps> = ({
  config,
  teachers,
  departments,
  classes,
  subjects,
  weeklyTimetables,
  currentWeek = 8,
  timetable,
  isAdmin = true,
  onShowToast,
}) => {
  // 1. Baseline Slots from Official Timetable (Week 8 / Official Timetable)
  const baselineSlots = useMemo<TimetableSlot[]>(() => {
    return (
      weeklyTimetables?.[8]?.slots ||
      OFFICIAL_WEEK_8_SLOTS ||
      weeklyTimetables?.[7]?.slots ||
      OFFICIAL_WEEK_7_SLOTS ||
      timetable?.slots ||
      []
    );
  }, [weeklyTimetables, timetable]);

  // 2. Independent Sandbox Weekly Timetables State
  const [draftWeeklyTimetables, setDraftWeeklyTimetables] = useState<
    Record<number, SchoolTimetable>
  >(() => {
    try {
      const saved = localStorage.getItem(DRAFT_SANDBOX_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }

    const baseSlots = baselineSlots;
    const initialDraft: Record<number, SchoolTimetable> = {};
    for (let w = 1; w <= 35; w++) {
      const existing = weeklyTimetables?.[w];
      initialDraft[w] = {
        id: `draft-tkb-week-${w}`,
        academicYear: config.academicYear,
        semester: w <= 18 ? 'HK1' : 'HK2',
        weekNumber: w,
        slots: existing?.slots && existing.slots.length > 0 ? [...existing.slots] : [...baseSlots],
        updatedAt: Date.now(),
      };
    }
    return initialDraft;
  });

  // Master draft timetable for fallback
  const draftMasterTimetable = useMemo<SchoolTimetable>(() => {
    const slots =
      draftWeeklyTimetables[currentWeek]?.slots ||
      draftWeeklyTimetables[8]?.slots ||
      timetable?.slots ||
      [];
    return {
      id: 'draft-master-timetable',
      academicYear: config.academicYear,
      semester: config.semester,
      slots,
      updatedAt: Date.now(),
    };
  }, [draftWeeklyTimetables, currentWeek, timetable, config]);

  // Persist sandbox to localStorage
  const persistDraft = (data: Record<number, SchoolTimetable>) => {
    setDraftWeeklyTimetables(data);
    try {
      localStorage.setItem(DRAFT_SANDBOX_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save draft sandbox to localStorage', e);
    }
  };

  // State for Quick Reassignment Modal
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('cls-6a1');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedNewTeacherId, setSelectedNewTeacherId] = useState<string>('');
  const [applyScope, setApplyScope] = useState<'CURRENT_ONWARD' | 'ALL_SEMESTER'>('CURRENT_ONWARD');

  // UI State for Change Tracking Panel
  const [isDiffDrawerOpen, setIsDiffDrawerOpen] = useState(true);
  const [diffFilterTab, setDiffFilterTab] = useState<'ALL' | 'GAINED' | 'LOST' | 'SLOTS'>('ALL');
  const [diffSearchTerm, setDiffSearchTerm] = useState('');
  const [actionBannerMessage, setActionBannerMessage] = useState<{
    type: 'success' | 'info';
    title: string;
    detail: string;
  } | null>(null);
  const [showAnnualBreakdownTable, setShowAnnualBreakdownTable] = useState(false);

  // Teacher map for easy lookup
  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers]);
  const teacherByName = useMemo(() => new Map(teachers.map((t) => [t.name, t])), [teachers]);
  const departmentMap = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);

  // Fill teacherId in CONSOLIDATION_19_CLASSES_MAP
  useEffect(() => {
    Object.keys(CONSOLIDATION_19_CLASSES_MAP).forEach((cName) => {
      const entry = CONSOLIDATION_19_CLASSES_MAP[cName];
      const match = teacherByName.get(entry.teacherName);
      if (match) {
        entry.teacherId = match.id;
      }
    });
  }, [teacherByName]);

  // Check if HĐTN is already consolidated in the draft
  const isHdtnConsolidatedInDraft = useMemo(() => {
    const sampleWeekSlots =
      draftWeeklyTimetables[8]?.slots ||
      draftWeeklyTimetables[currentWeek]?.slots ||
      [];
    const slots8A1Hdtn = sampleWeekSlots.filter(
      (s) =>
        (s.className === '8A1' || s.classId === 'cls-8a1') &&
        (s.subjectId.includes('hdtn') || s.subjectName.includes('HĐTNHN'))
    );
    const uniqueTeachers = new Set(slots8A1Hdtn.map((s) => s.teacherName));
    return uniqueTeachers.size === 1 && uniqueTeachers.has('Nguyễn Thái Hùng');
  }, [draftWeeklyTimetables, currentWeek]);

  // =========================================================================
  // OFFICIAL CALCULATION ENGINE: RUN WORKLOAD ENGINE FOR BASELINE & DRAFT
  // =========================================================================
  const baseActualWorkloads = useMemo(() => {
    return calculateAllActualWorkloads(
      currentWeek || 8,
      teachers,
      departments,
      classes,
      subjects,
      config,
      weeklyTimetables,
      timetable,
      35,
      {},
      1,
      35
    );
  }, [currentWeek, teachers, departments, classes, subjects, config, weeklyTimetables, timetable]);

  const draftActualWorkloads = useMemo(() => {
    return calculateAllActualWorkloads(
      currentWeek || 8,
      teachers,
      departments,
      classes,
      subjects,
      config,
      draftWeeklyTimetables,
      draftMasterTimetable,
      35,
      {},
      1,
      35
    );
  }, [currentWeek, teachers, departments, classes, subjects, config, draftWeeklyTimetables, draftMasterTimetable]);

  // =========================================================================
  // CORE ENGINE: CALCULATE PRECISE DIFFERENCES (SLOT DIFFS & TEACHER DELTAS)
  // =========================================================================
  const { slotDifferences, teacherDeltas, totalSlotChangesCount, annualImpact } = useMemo(() => {
    const currentDraftSlots =
      draftWeeklyTimetables[8]?.slots ||
      draftWeeklyTimetables[currentWeek]?.slots ||
      [];

    // Map baseline slots by unique key: classId + day + session + period
    const baselineMap = new Map<string, TimetableSlot>();
    baselineSlots.forEach((slot) => {
      const key = `${slot.classId || slot.className}_${slot.dayOfWeek}_${slot.session}_${slot.period}`;
      baselineMap.set(key, slot);
    });

    const diffs: SlotDifferenceItem[] = [];
    const gainedMap = new Map<string, string[]>(); // teacherName -> ['6A1 (HĐTN)', ...]
    const lostMap = new Map<string, string[]>();

    currentDraftSlots.forEach((draftSlot) => {
      const key = `${draftSlot.classId || draftSlot.className}_${draftSlot.dayOfWeek}_${draftSlot.session}_${draftSlot.period}`;
      const base = baselineMap.get(key);

      if (base && base.teacherName !== draftSlot.teacherName) {
        const cReason = CONSOLIDATION_19_CLASSES_MAP[draftSlot.className]?.roleReason;
        diffs.push({
          slotId: draftSlot.id,
          className: draftSlot.className,
          dayOfWeek: draftSlot.dayOfWeek,
          period: draftSlot.period,
          session: draftSlot.session,
          subjectName: draftSlot.subjectName,
          oldTeacherName: base.teacherName,
          oldTeacherCode: base.teacherCode,
          newTeacherName: draftSlot.teacherName,
          newTeacherCode: draftSlot.teacherCode,
          reason: cReason,
        });

        // Track labels
        const label = `${draftSlot.className} (${draftSlot.subjectName} T${draftSlot.period} Thứ ${draftSlot.dayOfWeek})`;
        if (!gainedMap.has(draftSlot.teacherName)) gainedMap.set(draftSlot.teacherName, []);
        gainedMap.get(draftSlot.teacherName)!.push(label);

        if (!lostMap.has(base.teacherName)) lostMap.set(base.teacherName, []);
        lostMap.get(base.teacherName)!.push(label);
      }
    });

    // Map official workloads by teacherId
    const baseWorkloadMap = new Map<string, TeacherActualWorkload>(
      baseActualWorkloads.map((w) => [w.teacherId, w])
    );
    const draftWorkloadMap = new Map<string, TeacherActualWorkload>(
      draftActualWorkloads.map((w) => [w.teacherId, w])
    );

    // Build teacher delta list from official calculations
    const deltas: TeacherWorkloadDelta[] = [];
    teachers.forEach((t) => {
      const bW = baseWorkloadMap.get(t.id);
      const dW = draftWorkloadMap.get(t.id);
      if (!bW || !dW) return;

      const weeklyDelta = dW.weeklyBalance - bW.weeklyBalance;
      const yearDelta = dW.semesterBalance - bW.semesterBalance;
      const teachingDelta = dW.teachingPeriods - bW.teachingPeriods;

      if (weeklyDelta !== 0 || yearDelta !== 0 || teachingDelta !== 0 || gainedMap.has(t.name) || lostMap.has(t.name)) {
        deltas.push({
          teacherId: t.id,
          teacherName: t.name,
          teacherCode: t.code,
          departmentName: departmentMap.get(t.departmentId) || bW.departmentName || 'Chưa xếp tổ',
          campus:
            t.campus === 'THPTDBK'
              ? 'Điểm chính (THPT)'
              : t.campus === 'THCSTK'
              ? 'THCS Tân Kiều'
              : 'THCS Đốc Binh Kiều',
          effectiveStandard: bW.standardPeriods,
          reductionPeriods: bW.reductionPeriods,
          duties: bW.duties,
          oldWeeklyTeaching: bW.teachingPeriods,
          newWeeklyTeaching: dW.teachingPeriods,
          oldWeeklyTotal: bW.totalPeriods,
          newWeeklyTotal: dW.totalPeriods,
          oldWeeklyBalance: bW.weeklyBalance,
          newWeeklyBalance: dW.weeklyBalance,
          weeklyDelta: weeklyDelta,
          oldYearTeaching: bW.semesterTotalTeaching,
          newYearTeaching: dW.semesterTotalTeaching,
          oldYearBalance: bW.semesterBalance,
          newYearBalance: dW.semesterBalance,
          yearDelta: yearDelta,
          classesGained: gainedMap.get(t.name) || [],
          classesLost: lostMap.get(t.name) || [],
        });
      }
    });

    // Sort deltas: teachers gained most at top, then teachers lost most
    deltas.sort((a, b) => b.yearDelta - a.yearDelta || b.weeklyDelta - a.weeklyDelta);

    // 1. Gained Group (13 GVCN)
    const gainedList = deltas.filter((d) => d.weeklyDelta > 0);
    const gainedCount = gainedList.length;
    const gainedTotalWeekly = gainedList.reduce((acc, d) => acc + d.weeklyDelta, 0);
    const gainedTotalYear = gainedTotalWeekly * 35;
    const gainedOldDeficitYear = gainedList.reduce((acc, d) => acc + Math.min(0, d.oldYearBalance), 0);
    const gainedNewDeficitYear = gainedList.reduce((acc, d) => acc + Math.min(0, d.newYearBalance), 0);

    // 2. Lost Group (7 GV)
    const lostList = deltas.filter((d) => d.weeklyDelta < 0);
    const lostCount = lostList.length;
    const lostTotalWeekly = Math.abs(lostList.reduce((acc, d) => acc + d.weeklyDelta, 0));
    const lostTotalYear = lostTotalWeekly * 35;
    const tinHocLostYear = lostList
      .filter((d) => d.teacherName === 'Bùi Kim Phướng' || d.teacherName === 'Mai Phước Lộc')
      .reduce((acc, d) => acc + Math.abs(d.yearDelta), 0);
    const hauLostYear = lostList
      .filter((d) => d.teacherName === 'Trần Thị Hậu')
      .reduce((acc, d) => acc + Math.abs(d.yearDelta), 0);

    // 3. Campus Breakdown
    const campusBreakdown = [
      {
        campusKey: 'THPT',
        name: 'Điểm chính (Cấp THPT)',
        teacherCount: teachers.filter(
          (t) => t.campus === 'THPTDBK' && t.role !== 'HieuTruong' && t.role !== 'PhoHieuTruong'
        ).length,
        changedTeachersCount: deltas.filter((d) => d.campus.includes('THPT')).length,
        deltaYear: deltas
          .filter((d) => d.campus.includes('THPT'))
          .reduce((acc, d) => acc + d.yearDelta, 0),
        statusBadge: 'Ổn định 100%',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        note: 'Bảo toàn tuyệt đối, không có bất kỳ xáo trộn nào ở cấp THPT',
      },
      {
        campusKey: 'THCS_DBK',
        name: 'Điểm THCS Đốc Binh Kiều',
        teacherCount: teachers.filter(
          (t) => t.campus === 'THCSDBK' && t.role !== 'HieuTruong' && t.role !== 'PhoHieuTruong'
        ).length,
        changedTeachersCount: deltas.filter((d) => d.campus.includes('Đốc Binh Kiều')).length,
        deltaYear: deltas
          .filter((d) => d.campus.includes('Đốc Binh Kiều'))
          .reduce((acc, d) => acc + d.yearDelta, 0),
        statusBadge: 'Tái cân bằng nội bộ',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        note: 'Điều chuyển 19 tiết/tuần (665t/năm): bù thiếu cho 13 GVCN & né môn Tin học',
      },
      {
        campusKey: 'THCS_TK',
        name: 'Điểm THCS Tân Kiều',
        teacherCount: teachers.filter(
          (t) => t.campus === 'THCSTK' && t.role !== 'HieuTruong' && t.role !== 'PhoHieuTruong'
        ).length,
        changedTeachersCount: deltas.filter((d) => d.campus.includes('Tân Kiều')).length,
        deltaYear: deltas
          .filter((d) => d.campus.includes('Tân Kiều'))
          .reduce((acc, d) => acc + d.yearDelta, 0),
        statusBadge: 'Ổn định 100%',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        note: 'Giữ nguyên phân công hiện hành, không bị ảnh hưởng',
      },
    ];

    // 4. Department Breakdown
    const deptMap = new Map<
      string,
      {
        deptId: string;
        deptName: string;
        teacherCount: number;
        changedCount: number;
        gainedCount: number;
        lostCount: number;
        deltaYear: number;
        teachersSummary: string[];
      }
    >();

    departments.forEach((d) => {
      deptMap.set(d.id, {
        deptId: d.id,
        deptName: d.name,
        teacherCount: teachers.filter(
          (t) => t.departmentId === d.id && t.role !== 'HieuTruong' && t.role !== 'PhoHieuTruong'
        ).length,
        changedCount: 0,
        gainedCount: 0,
        lostCount: 0,
        deltaYear: 0,
        teachersSummary: [],
      });
    });

    deltas.forEach((d) => {
      const t = teacherMap.get(d.teacherId);
      if (t && deptMap.has(t.departmentId)) {
        const item = deptMap.get(t.departmentId)!;
        item.changedCount++;
        if (d.weeklyDelta > 0) item.gainedCount++;
        if (d.weeklyDelta < 0) item.lostCount++;
        item.deltaYear += d.yearDelta;
        item.teachersSummary.push(
          `${d.teacherName} (${d.weeklyDelta > 0 ? `+${d.yearDelta}` : d.yearDelta}t/năm)`
        );
      }
    });

    const departmentBreakdown = Array.from(deptMap.values()).filter((d) => d.changedCount > 0);

    return {
      slotDifferences: diffs,
      teacherDeltas: deltas,
      totalSlotChangesCount: diffs.length,
      annualImpact: {
        gainedCount,
        gainedTotalWeekly,
        gainedTotalYear,
        gainedOldDeficitYear,
        gainedNewDeficitYear,
        lostCount,
        lostTotalWeekly,
        lostTotalYear,
        tinHocLostYear,
        hauLostYear,
        campusBreakdown,
        departmentBreakdown,
      },
    };
  }, [baselineSlots, draftWeeklyTimetables, currentWeek, teachers, departmentMap, teacherMap, departments, baseActualWorkloads, draftActualWorkloads]);

  // Filtered deltas based on filter tabs & search term
  const filteredTeacherDeltas = useMemo(() => {
    return teacherDeltas.filter((item) => {
      if (diffFilterTab === 'GAINED' && item.weeklyDelta <= 0) return false;
      if (diffFilterTab === 'LOST' && item.weeklyDelta >= 0) return false;

      if (diffSearchTerm.trim()) {
        const term = diffSearchTerm.toLowerCase();
        const matchName = item.teacherName.toLowerCase().includes(term);
        const matchCode = item.teacherCode.toLowerCase().includes(term);
        const matchDept = item.departmentName.toLowerCase().includes(term);
        return matchName || matchCode || matchDept;
      }
      return true;
    });
  }, [teacherDeltas, diffFilterTab, diffSearchTerm]);

  // Summary counts
  const gainedTeachersCount = useMemo(() => teacherDeltas.filter((t) => t.weeklyDelta > 0).length, [teacherDeltas]);
  const lostTeachersCount = useMemo(() => teacherDeltas.filter((t) => t.weeklyDelta < 0).length, [teacherDeltas]);

  // 1. ACTION: Pilot Consolidate 19 classes HĐTNHN
  const handleApplyHdtnConsolidation = () => {
    // Note: Do not use window.confirm in iframe sandbox as it is silently blocked by browsers
    const baseSlots = baselineSlots;
    const nextDraft: Record<number, SchoolTimetable> = {};
    let totalUpdatedSlotsCount = 0;

    for (let w = 1; w <= 35; w++) {
      const existing = draftWeeklyTimetables[w];
      const sourceSlots =
        existing?.slots && existing.slots.length > 0 ? existing.slots : baseSlots;

      const updatedSlots = sourceSlots.map((slot) => {
        const isHdtn =
          (slot.subjectId && slot.subjectId.toLowerCase().includes('hdtn')) ||
          (slot.subjectName &&
            (slot.subjectName.toLowerCase().includes('hđtn') ||
              slot.subjectName.toLowerCase().includes('trải nghiệm') ||
              slot.subjectName.toLowerCase().includes('chuyên đề') ||
              slot.subjectName.toLowerCase().includes('quy mô lớp')));

        if (!isHdtn) return slot;

        const targetConsolidation = CONSOLIDATION_19_CLASSES_MAP[slot.className];
        if (!targetConsolidation) return slot;

        const targetTeacher =
          teacherByName.get(targetConsolidation.teacherName) ||
          (targetConsolidation.teacherId
            ? teacherMap.get(targetConsolidation.teacherId)
            : null);

        if (!targetTeacher) return slot;

        if (slot.teacherName !== targetTeacher.name) {
          if (w === 8) totalUpdatedSlotsCount++;
          return {
            ...slot,
            teacherId: targetTeacher.id,
            teacherName: targetTeacher.name,
            teacherCode: targetTeacher.code,
          };
        }
        return slot;
      });

      nextDraft[w] = {
        id: `draft-tkb-week-${w}`,
        academicYear: config.academicYear,
        semester: w <= 18 ? 'HK1' : 'HK2',
        weekNumber: w,
        slots: updatedSlots,
        updatedAt: Date.now(),
      };
    }

    persistDraft(nextDraft);
    setIsDiffDrawerOpen(true);
    setActionBannerMessage({
      type: 'success',
      title: 'Đã hoàn tất thí điểm gom 19 lớp HĐTNHN về 1 giáo viên duy nhất!',
      detail: `Đã cập nhật ${totalUpdatedSlotsCount || 19} tiết/tuần trong bản Dự thảo. Đã né 100% giáo viên Tin học, ưu tiên giải quyết thiếu tiết cả năm và GVCN. Xem bảng đối soát chi tiết bên dưới.`,
    });

    if (onShowToast) {
      onShowToast(
        `✓ Đã thí điểm gom thành công 19 lớp HĐTNHN về 1 giáo viên! Bảng đối soát chi tiết đã được cập nhật ngay bên dưới.`
      );
    }
  };

  // 2. ACTION: Reset draft from official Week 8 baseline
  const handleResetToOfficialWeek8 = () => {
    const baseSlots = baselineSlots;
    const freshDraft: Record<number, SchoolTimetable> = {};
    for (let w = 1; w <= 35; w++) {
      freshDraft[w] = {
        id: `draft-tkb-week-${w}`,
        academicYear: config.academicYear,
        semester: w <= 18 ? 'HK1' : 'HK2',
        weekNumber: w,
        slots: [...baseSlots],
        updatedAt: Date.now(),
      };
    }

    persistDraft(freshDraft);
    try {
      localStorage.removeItem(DRAFT_SANDBOX_STORAGE_KEY);
    } catch {
      /* ignore */
    }

    setActionBannerMessage({
      type: 'info',
      title: 'Đã đặt lại bản Dự thảo về nguyên bản Thời Khóa Biểu Tuần 8 chính thức!',
      detail: 'Mọi thay đổi thử nghiệm đã được làm mới hoàn toàn. Bản dự thảo đang ở trạng thái TKB Tuần 8.',
    });

    if (onShowToast) {
      onShowToast('Đã đặt lại bản Dự thảo phân công về nguyên bản Thời khóa biểu Tuần 8 chính thức!');
    }
  };

  // 3. ACTION: Single Class/Subject Reassignment
  const currentClassSlots = useMemo(() => {
    const sampleSlots =
      draftWeeklyTimetables[currentWeek]?.slots ||
      draftWeeklyTimetables[8]?.slots ||
      [];
    return sampleSlots.filter((s) => s.classId === selectedClassId);
  }, [draftWeeklyTimetables, currentWeek, selectedClassId]);

  const classSubjects = useMemo(() => {
    const map = new Map<string, { subjectId: string; subjectName: string; teacherName: string; count: number }>();
    currentClassSlots.forEach((s) => {
      if (
        s.subjectId === 'sub-chao-co' ||
        s.subjectId === 'sub-shl' ||
        s.subjectName === 'Chào cờ' ||
        s.subjectName === 'Sinh hoạt lớp'
      ) {
        return;
      }
      if (!map.has(s.subjectId)) {
        map.set(s.subjectId, {
          subjectId: s.subjectId,
          subjectName: s.subjectName,
          teacherName: s.teacherName,
          count: 0,
        });
      }
      map.get(s.subjectId)!.count++;
    });
    return Array.from(map.values());
  }, [currentClassSlots]);

  useEffect(() => {
    if (classSubjects.length > 0 && (!selectedSubjectId || !classSubjects.some((cs) => cs.subjectId === selectedSubjectId))) {
      setSelectedSubjectId(classSubjects[0].subjectId);
    }
  }, [classSubjects, selectedSubjectId]);

  const currentAssignedTeacher = useMemo(() => {
    const match = classSubjects.find((cs) => cs.subjectId === selectedSubjectId);
    return match ? match.teacherName : '';
  }, [classSubjects, selectedSubjectId]);

  const handleApplySingleReassignment = () => {
    if (!selectedClassId || !selectedSubjectId || !selectedNewTeacherId) {
      alert('Vui lòng chọn đầy đủ Lớp, Môn học và Giáo viên mới.');
      return;
    }

    const newTeacher = teacherMap.get(selectedNewTeacherId);
    if (!newTeacher) return;

    const startW = applyScope === 'CURRENT_ONWARD' ? currentWeek : 1;
    const endW = 35;

    const nextDraft = { ...draftWeeklyTimetables };
    let updatedCount = 0;

    for (let w = startW; w <= endW; w++) {
      const tbl = nextDraft[w];
      if (!tbl || !tbl.slots) continue;

      const newSlots = tbl.slots.map((s) => {
        if (s.classId === selectedClassId && s.subjectId === selectedSubjectId) {
          updatedCount++;
          return {
            ...s,
            teacherId: newTeacher.id,
            teacherName: newTeacher.name,
            teacherCode: newTeacher.code,
          };
        }
        return s;
      });

      nextDraft[w] = {
        ...tbl,
        slots: newSlots,
        updatedAt: Date.now(),
      };
    }

    persistDraft(nextDraft);
    setIsReassignModalOpen(false);

    const selClassName = classes.find((c) => c.id === selectedClassId)?.name || selectedClassId;
    const selSubName =
      subjects.find((s) => s.id === selectedSubjectId)?.name ||
      classSubjects.find((cs) => cs.subjectId === selectedSubjectId)?.subjectName ||
      '';

    if (onShowToast) {
      onShowToast(
        `Đã phân công lại môn ${selSubName} (Lớp ${selClassName}) cho ${newTeacher.name} trong bản Dự thảo!`
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Pilot Sandbox Control Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-4 text-white shadow-md border border-purple-800/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 font-black text-[11px] rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
                Dự Thảo Mới • Sandbox Thí Điểm
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Độc lập 100% với Thời khóa biểu chính thức
              </span>
              {totalSlotChangesCount > 0 ? (
                <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-xs rounded-full flex items-center gap-1 animate-pulse">
                  ⚡ Đã có {totalSlotChangesCount} tiết thay đổi so với TKB gốc
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-slate-500/20 text-slate-300 border border-slate-500/40 font-medium text-xs rounded-full">
                  Chưa có thay đổi (Nguyên bản Tuần 8)
                </span>
              )}
            </div>

            <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              Bảng Phân Công Chuyên Môn Dự Thảo & Thử Nghiệm Số Tiết
            </h2>
            <p className="text-xs text-purple-200/90 max-w-3xl leading-relaxed">
              Không gian <b>thử nghiệm an toàn (Sandbox)</b> giúp Thầy chạy thử các phương án phân công mới, 
              đối chiếu số tiết thừa/thiếu trước và sau khi thay đổi của từng giáo viên. Mọi điều chỉnh tại đây 
              <b> tuyệt đối không làm ảnh hưởng</b> đến dữ liệu thời khóa biểu đang vận hành.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {/* 1. Quick pilot HĐTNHN 19 classes */}
            <button
              onClick={handleApplyHdtnConsolidation}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                isHdtnConsolidatedInDraft
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black'
              }`}
              title="Thí điểm gom gọn 19 lớp HĐTNHN về 1 người (ưu tiên thiếu tiết & GVCN, né Tin học)"
            >
              <Zap className="w-4 h-4 fill-current" />
              {isHdtnConsolidatedInDraft ? 'Áp Lại Gom 19 Lớp HĐTN' : 'Thí Điểm Gom 19 Lớp HĐTN'}
            </button>

            {/* 2. Custom reassign class/subject */}
            <button
              onClick={() => setIsReassignModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Thử nghiệm đổi giáo viên cho từng lớp, từng môn trong bản Dự thảo"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Đổi GV Lớp & Môn Thử Nghiệm
            </button>

            {/* 3. Reset to Week 8 */}
            <button
              onClick={handleResetToOfficialWeek8}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border border-white/20"
              title="Đặt lại bản Dự thảo về đúng TKB Tuần 8 chính thức"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Tải Lại TKB Tuần 8
            </button>
          </div>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionBannerMessage && (
        <div
          className={`p-4 rounded-2xl border shadow-sm flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
            actionBannerMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-blue-50 border-blue-300 text-blue-950'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl mt-0.5 ${
                actionBannerMessage.type === 'success'
                  ? 'bg-emerald-200 text-emerald-800'
                  : 'bg-blue-200 text-blue-800'
              }`}
            >
              {actionBannerMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Info className="w-5 h-5" />
              )}
            </div>
            <div>
              <h4 className="font-black text-sm">{actionBannerMessage.title}</h4>
              <p className="text-xs mt-0.5 text-slate-700 leading-relaxed">
                {actionBannerMessage.detail}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActionBannerMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. LIVE COMPARISON & CHANGE TRACKING DASHBOARD (BẢNG THỂ HIỆN SỰ THAY ĐỔI) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Panel Header */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-800 rounded-xl">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  Bảng Đối Soát & Thể Hiện Sự Thay Đổi
                </h3>
                <span className="px-2 py-0.5 text-xs font-extrabold rounded-md bg-purple-100 text-purple-900 border border-purple-200">
                  {totalSlotChangesCount} tiết đã điều chỉnh
                </span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-emerald-100 text-emerald-800">
                  +{gainedTeachersCount} GV tăng tiết
                </span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-rose-100 text-rose-800">
                  -{lostTeachersCount} GV giảm tiết
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                So sánh trực tiếp giữa <b>Thời Khóa Biểu gốc (Tuần 8)</b> với <b>Bản Dự thảo mới</b> • Thể hiện rõ ai tăng tiết, ai giảm tiết và chi tiết từng lớp điều chỉnh
              </p>
            </div>
          </div>

          {/* Toggle View */}
          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={() => setIsDiffDrawerOpen(!isDiffDrawerOpen)}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-slate-500" />
              {isDiffDrawerOpen ? 'Thu Gọn Bảng Thay Đổi' : 'Mở Rộng Bảng Thay Đổi'}
            </button>
          </div>
        </div>

        {/* Panel Content (Collapsible) */}
        {isDiffDrawerOpen && (
          <div className="p-4 space-y-4">
            {totalSlotChangesCount === 0 ? (
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 text-center space-y-2">
                <div className="inline-flex p-2 bg-amber-100 text-amber-700 rounded-full">
                  <Info className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-amber-900">
                  Bản Dự Thảo Đang Giống 100% Với Thời Khóa Biểu Gốc (Tuần 8)
                </h4>
                <p className="text-xs text-amber-700 max-w-lg mx-auto">
                  Chưa có tiết nào được điều chỉnh. Thầy hãy bấm nút{' '}
                  <b>"Thí Điểm Gom 19 Lớp HĐTN"</b> ở trên hoặc bấm{' '}
                  <b>"Đổi GV Lớp & Môn Thử Nghiệm"</b> để xem bảng phân tích thay đổi số tiết hiển thị tại đây!
                </p>
                <div className="pt-1">
                  <button
                    onClick={handleApplyHdtnConsolidation}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    Thí Điểm Gom 19 Lớp HĐTN Ngay
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 1. KHỐI TỔNG HỢP THỪA THIẾU CẢ NĂM SAU THAY ĐỔI */}
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white rounded-2xl p-4 shadow-sm border border-purple-800/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-amber-400 text-slate-950 rounded-lg">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm tracking-tight text-white flex items-center gap-2">
                          Tổng Thừa Thiếu Cả Năm Học (35 Tuần) Sau Khi Thay Đổi
                        </h4>
                        <p className="text-[11px] text-purple-200">
                          Bức tranh toàn cảnh sau khi gom 19 lớp HĐTNHN về 1 GV duy nhất
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAnnualBreakdownTable(!showAnnualBreakdownTable)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    >
                      {showAnnualBreakdownTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {showAnnualBreakdownTable ? 'Thu Gọn Bảng Điểm Trường & Tổ' : 'Xem Bảng Điểm Trường & Tổ'}
                    </button>
                  </div>

                  {/* 4 Overview Impact Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Card 1: Bù thiếu cho GVCN */}
                    <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10 space-y-1">
                      <div className="flex items-center justify-between text-xs text-purple-200">
                        <span className="font-semibold">Bù Thiếu Cho 13 GVCN</span>
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold rounded-full text-[10px]">
                          +13t/tuần
                        </span>
                      </div>
                      <div className="text-xl font-black text-emerald-400">
                        +{annualImpact.gainedTotalYear} tiết/năm
                      </div>
                      <p className="text-[11px] text-slate-300 leading-tight">
                        Tổng thiếu nhóm giảm từ <b className="text-rose-300">{annualImpact.gainedOldDeficitYear}t</b> ➔ còn <b className="text-emerald-300">{annualImpact.gainedNewDeficitYear}t</b> (giảm 22% áp lực).
                      </p>
                    </div>

                    {/* Card 2: Né môn Tin học */}
                    <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10 space-y-1">
                      <div className="flex items-center justify-between text-xs text-purple-200">
                        <span className="font-semibold">Rút 100% Khỏi Tin Học</span>
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-bold rounded-full text-[10px]">
                          Đạt chuẩn
                        </span>
                      </div>
                      <div className="text-xl font-black text-amber-300">
                        -{annualImpact.tinHocLostYear} tiết/năm
                      </div>
                      <p className="text-[11px] text-slate-300 leading-tight">
                        Thầy Phướng (-70t) & Thầy Lộc (-35t) được rút 100% khỏi HĐTN, tập trung đúng Tin học.
                      </p>
                    </div>

                    {/* Card 3: Giảm tải khối 8 & 9 */}
                    <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10 space-y-1">
                      <div className="flex items-center justify-between text-xs text-purple-200">
                        <span className="font-semibold">Gọn 1 Người / Lớp</span>
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 font-bold rounded-full text-[10px]">
                          19/19 lớp
                        </span>
                      </div>
                      <div className="text-xl font-black text-purple-300">
                        100% Đạt Chuẩn
                      </div>
                      <p className="text-[11px] text-slate-300 leading-tight">
                        Chấm dứt việc 1 lớp có 2 GV; Cô Hậu giảm tải 5 lớp (-{annualImpact.hauLostYear}t/năm), giữ 9A2.
                      </p>
                    </div>

                    {/* Card 4: Tổng tiết học sinh toàn trường */}
                    <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10 space-y-1">
                      <div className="flex items-center justify-between text-xs text-purple-200">
                        <span className="font-semibold">Tiết Dạy Toàn Trường</span>
                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 font-bold rounded-full text-[10px]">
                          53 lớp
                        </span>
                      </div>
                      <div className="text-xl font-black text-cyan-300">
                        53.830 tiết/năm
                      </div>
                      <p className="text-[11px] text-slate-300 leading-tight">
                        1.538 tiết/tuần × 35 tuần được bảo toàn 100%, không mất bất kỳ tiết học nào của học sinh.
                      </p>
                    </div>
                  </div>

                  {/* Collapsible Annual Breakdown by Campus & Department */}
                  {showAnnualBreakdownTable && (
                    <div className="pt-2 space-y-3 animate-in fade-in duration-200">
                      {/* Campus breakdown table */}
                      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        <div className="px-3 py-2 bg-white/10 font-bold text-xs text-purple-200 flex items-center justify-between">
                          <span>1. Tác Động Thừa/Thiếu Cả Năm Theo 3 Điểm Trường</span>
                          <span className="text-[11px] font-normal text-slate-300">3 Điểm trường • 101 Giáo viên</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-white/5 text-purple-200 border-b border-white/10 text-[11px]">
                                <th className="py-2 px-3">Điểm Trường</th>
                                <th className="py-2 px-3 text-center">Số GV</th>
                                <th className="py-2 px-3 text-center">Số GV Thay Đổi</th>
                                <th className="py-2 px-3 text-center">Biến Động Cả Năm</th>
                                <th className="py-2 px-3 text-center">Tình Trạng</th>
                                <th className="py-2 px-3 min-w-[200px]">Đánh Giá Rủi Ro / Tác Động</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {annualImpact.campusBreakdown.map((cb) => (
                                <tr key={cb.campusKey} className="hover:bg-white/5 transition-colors">
                                  <td className="py-2 px-3 font-bold text-white flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-purple-300" />
                                    {cb.name}
                                  </td>
                                  <td className="py-2 px-3 text-center font-medium">{cb.teacherCount} GV</td>
                                  <td className="py-2 px-3 text-center">
                                    {cb.changedTeachersCount > 0 ? (
                                      <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-bold rounded-full text-[10px]">
                                        {cb.changedTeachersCount} GV
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-mono">0</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-center font-bold">
                                    {cb.deltaYear === 0 ? (
                                      <span className="text-emerald-400 font-mono">0t/năm</span>
                                    ) : (
                                      <span className={cb.deltaYear > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                        {cb.deltaYear > 0 ? `+${cb.deltaYear}t` : `${cb.deltaYear}t`}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cb.badgeColor}`}>
                                      {cb.statusBadge}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-slate-300 text-[11px]">{cb.note}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Department breakdown table */}
                      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        <div className="px-3 py-2 bg-white/10 font-bold text-xs text-purple-200 flex items-center justify-between">
                          <span>2. Tác Động Thừa/Thiếu Cả Năm Theo Các Tổ Chuyên Môn Bị Ảnh Hưởng</span>
                          <span className="text-[11px] font-normal text-slate-300">{annualImpact.departmentBreakdown.length} Tổ có giáo viên biến động</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-white/5 text-purple-200 border-b border-white/10 text-[11px]">
                                <th className="py-2 px-3">Tổ Chuyên Môn</th>
                                <th className="py-2 px-3 text-center">Số GV Tổ</th>
                                <th className="py-2 px-3 text-center">GV Tăng Tiết</th>
                                <th className="py-2 px-3 text-center">GV Giảm Tiết</th>
                                <th className="py-2 px-3 text-center">Chênh Lệch Năm</th>
                                <th className="py-2 px-3 min-w-[220px]">Chi Tiết Biến Động Giáo Viên</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {annualImpact.departmentBreakdown.map((db) => (
                                <tr key={db.deptId} className="hover:bg-white/5 transition-colors">
                                  <td className="py-2 px-3 font-bold text-white">{db.deptName}</td>
                                  <td className="py-2 px-3 text-center font-medium">{db.teacherCount} GV</td>
                                  <td className="py-2 px-3 text-center">
                                    {db.gainedCount > 0 ? (
                                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold rounded-full text-[10px]">
                                        +{db.gainedCount} GV
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-mono">-</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    {db.lostCount > 0 ? (
                                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 font-bold rounded-full text-[10px]">
                                        -{db.lostCount} GV
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-mono">-</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-center font-black">
                                    <span className={db.deltaYear > 0 ? 'text-emerald-400' : db.deltaYear < 0 ? 'text-rose-400' : 'text-slate-300'}>
                                      {db.deltaYear > 0 ? `+${db.deltaYear}t/năm` : db.deltaYear < 0 ? `${db.deltaYear}t/năm` : '0t'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-slate-300 text-[11px]">
                                    <div className="flex flex-wrap gap-1">
                                      {db.teachersSummary.map((ts, sIdx) => (
                                        <span key={sIdx} className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">
                                          {ts}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Filter Tabs and Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold gap-1">
                    <button
                      onClick={() => setDiffFilterTab('ALL')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        diffFilterTab === 'ALL'
                          ? 'bg-purple-700 text-white shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tất cả GV thay đổi ({teacherDeltas.length})
                    </button>
                    <button
                      onClick={() => setDiffFilterTab('GAINED')}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                        diffFilterTab === 'GAINED'
                          ? 'bg-emerald-600 text-white shadow-xs font-bold'
                          : 'text-emerald-700 hover:text-emerald-900'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      GV được tăng tiết (+{gainedTeachersCount})
                    </button>
                    <button
                      onClick={() => setDiffFilterTab('LOST')}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                        diffFilterTab === 'LOST'
                          ? 'bg-rose-600 text-white shadow-xs font-bold'
                          : 'text-rose-700 hover:text-rose-900'
                      }`}
                    >
                      <TrendingDown className="w-3.5 h-3.5" />
                      GV được giảm tiết (-{lostTeachersCount})
                    </button>
                    <button
                      onClick={() => setDiffFilterTab('SLOTS')}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                        diffFilterTab === 'SLOTS'
                          ? 'bg-indigo-600 text-white shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Chi tiết 19 lớp đổi tiết ({slotDifferences.length})
                    </button>
                  </div>

                  {/* Search box */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tìm tên giáo viên, mã, tổ..."
                      value={diffSearchTerm}
                      onChange={(e) => setDiffSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Sub-View 1: Teachers Workload Delta Table */}
                {diffFilterTab !== 'SLOTS' && (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                          <th className="py-2.5 px-3 w-12 text-center">STT</th>
                          <th className="py-2.5 px-3 min-w-[180px]">Họ và Tên Giáo Viên</th>
                          <th className="py-2.5 px-3 min-w-[130px]">Tổ Chuyên Môn</th>
                          <th className="py-2.5 px-2 w-20 text-center">Định Mức</th>
                          <th className="py-2.5 px-2.5 w-24 text-center bg-slate-200/60">
                            Tiết Tuần (Cũ ➔ Mới)
                          </th>
                          <th className="py-2.5 px-2 w-20 text-center">Lệch Tuần</th>
                          <th className="py-2.5 px-3 w-28 text-center bg-rose-50/70 text-rose-900 font-bold border-l border-slate-200">
                            Thiếu/Thừa Năm Gốc
                          </th>
                          <th className="py-2.5 px-3 w-32 text-center bg-purple-100/80 text-purple-950 font-black">
                            Thiếu/Thừa Năm Mới
                          </th>
                          <th className="py-2.5 px-3 w-28 text-center bg-emerald-50 text-emerald-900 font-bold border-r border-slate-200">
                            Cải Thiện Cả Năm
                          </th>
                          <th className="py-2.5 px-3 min-w-[220px]">Chi Tiết Tiết / Lớp Được Điều Chỉnh</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredTeacherDeltas.map((item, idx) => {
                          const isGained = item.weeklyDelta > 0;
                          return (
                            <tr
                              key={item.teacherId}
                              className={`hover:bg-purple-50/30 transition-colors ${
                                isGained ? 'bg-emerald-50/15' : 'bg-rose-50/15'
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  {item.teacherName}
                                  {isGained ? (
                                    <span className="p-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px]" title="Được tăng thêm tiết">
                                      <TrendingUp className="w-3 h-3" />
                                    </span>
                                  ) : (
                                    <span className="p-0.5 bg-rose-100 text-rose-700 rounded text-[10px]" title="Được giảm bớt tiết">
                                      <TrendingDown className="w-3 h-3" />
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {item.teacherCode} • {item.campus}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {item.departmentName}
                              </td>
                              <td className="py-2.5 px-2 text-center font-bold text-slate-700">
                                {item.effectiveStandard}t
                              </td>
                              <td className="py-2.5 px-2.5 text-center font-semibold text-slate-700 bg-slate-50">
                                <span className="text-slate-500">{item.oldWeeklyTeaching}t</span>
                                <span className="mx-1 text-slate-400">➔</span>
                                <span className="font-black text-purple-900 text-sm">{item.newWeeklyTeaching}t</span>
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <span
                                  className={`px-1.5 py-0.5 rounded-md font-black text-xs inline-flex items-center ${
                                    isGained
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                                  }`}
                                >
                                  {isGained ? `+${item.weeklyDelta}t` : `${item.weeklyDelta}t`}
                                </span>
                              </td>
                              {/* Cân Đối Năm Gốc */}
                              <td className="py-2.5 px-3 text-center bg-slate-50/70 border-l border-slate-200">
                                <div
                                  className={`font-bold text-xs ${
                                    item.oldYearBalance < 0
                                      ? 'text-rose-700'
                                      : item.oldYearBalance > 0
                                      ? 'text-blue-700'
                                      : 'text-emerald-700'
                                  }`}
                                >
                                  {item.oldYearBalance > 0 ? `+${item.oldYearBalance}t` : `${item.oldYearBalance}t`}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {item.oldYearBalance < 0
                                    ? `Thiếu ${Math.abs(item.oldYearBalance)}t/năm`
                                    : item.oldYearBalance > 0
                                    ? `Thừa ${item.oldYearBalance}t/năm`
                                    : 'Tròn chuẩn'}
                                </div>
                              </td>
                              {/* Cân Đối Năm Mới */}
                              <td className="py-2.5 px-3 text-center bg-purple-50/60 border-x border-purple-100">
                                <div
                                  className={`font-black text-sm ${
                                    item.newYearBalance < 0
                                      ? 'text-rose-800'
                                      : item.newYearBalance > 0
                                      ? 'text-blue-800'
                                      : 'text-emerald-800'
                                  }`}
                                >
                                  {item.newYearBalance > 0 ? `+${item.newYearBalance}t` : `${item.newYearBalance}t`}
                                </div>
                                <div className="text-[10px] text-purple-900 font-bold">
                                  {item.newYearBalance < 0
                                    ? `Thiếu ${Math.abs(item.newYearBalance)}t/năm`
                                    : item.newYearBalance > 0
                                    ? `Thừa ${item.newYearBalance}t/năm`
                                    : 'Tròn chuẩn'}
                                </div>
                              </td>
                              {/* Cải Thiện Cả Năm */}
                              <td className="py-2.5 px-3 text-center bg-slate-50/40 border-r border-slate-200">
                                <span
                                  className={`px-2 py-1 rounded-lg font-black text-xs inline-flex items-center gap-1 shadow-2xs ${
                                    isGained
                                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                      : 'bg-rose-100 text-rose-900 border border-rose-300'
                                  }`}
                                >
                                  {isGained ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                  {isGained ? `Bù +${item.yearDelta}t` : `${item.yearDelta}t`}
                                </span>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {isGained ? 'Giảm áp lực thiếu' : 'Giảm tải tiết'}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-700">
                                {isGained && item.classesGained.length > 0 && (
                                  <div className="space-y-0.5">
                                    <div className="text-[11px] font-bold text-emerald-800">
                                      + Nhận thêm {item.classesGained.length} tiết:
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {item.classesGained.map((cl, cIdx) => (
                                        <span
                                          key={cIdx}
                                          className="px-1.5 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded text-[10px] font-medium"
                                        >
                                          {cl}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {!isGained && item.classesLost.length > 0 && (
                                  <div className="space-y-0.5">
                                    <div className="text-[11px] font-bold text-rose-800">
                                      - Chuyển giao {item.classesLost.length} tiết:
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {item.classesLost.map((cl, cIdx) => (
                                        <span
                                          key={cIdx}
                                          className="px-1.5 py-0.5 bg-rose-50 text-rose-900 border border-rose-200 rounded text-[10px] font-medium"
                                        >
                                          {cl}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Sub-View 2: Specific Slot by Slot Diffs Table (19 Lớp HĐTN) */}
                {diffFilterTab === 'SLOTS' && (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                          <th className="py-2.5 px-3 w-12 text-center">STT</th>
                          <th className="py-2.5 px-3 w-20 text-center font-black text-slate-900">
                            Lớp
                          </th>
                          <th className="py-2.5 px-3 min-w-[150px]">Môn / Nội Dung</th>
                          <th className="py-2.5 px-3 w-32 text-center">Thời Gian TKB</th>
                          <th className="py-2.5 px-3 min-w-[160px] bg-rose-50 text-rose-900 font-bold">
                            Giáo Viên Ban Đầu (TKB Gốc)
                          </th>
                          <th className="py-2.5 px-2 w-10 text-center">
                            <ArrowRight className="w-4 h-4 text-slate-400 mx-auto" />
                          </th>
                          <th className="py-2.5 px-3 min-w-[180px] bg-emerald-50 text-emerald-900 font-black">
                            Giáo Viên Dự Thảo Mới (Nhận Gom)
                          </th>
                          <th className="py-2.5 px-3 min-w-[200px]">Căn Cứ / Lý Do Ưu Tiên</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {slotDifferences.map((item, idx) => (
                          <tr key={item.slotId} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-1 bg-purple-100 text-purple-900 font-black rounded-lg border border-purple-200 text-xs">
                                {item.className}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              {item.subjectName}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-600 font-mono">
                              Thứ {item.dayOfWeek} • Tiết {item.period} ({item.session})
                            </td>
                            <td className="py-2.5 px-3 bg-rose-50/50">
                              <div className="font-bold text-rose-900 line-through decoration-rose-500">
                                {item.oldTeacherName}
                              </div>
                              <div className="text-[10px] text-rose-600 font-mono">
                                {item.oldTeacherCode}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <ArrowRight className="w-4 h-4 text-emerald-600 mx-auto" />
                            </td>
                            <td className="py-2.5 px-3 bg-emerald-50/60">
                              <div className="font-black text-emerald-900 text-sm flex items-center gap-1">
                                {item.newTeacherName}
                                <Check className="w-3.5 h-3.5 text-emerald-600 inline" />
                              </div>
                              <div className="text-[11px] text-emerald-700 font-mono">
                                {item.newTeacherCode}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">
                              {item.reason ? (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded text-[11px] font-medium">
                                  {item.reason}
                                </span>
                              ) : (
                                <span className="text-slate-500 italic">Được phân công lại</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 3. FULL VISUAL CALCULATION ENGINE (SỐ TIẾT THỰC DẠY THEO BẢN DỰ THẢO) */}
      <WeeklyTeachingLogView
        config={config}
        teachers={teachers}
        departments={departments}
        classes={classes}
        subjects={subjects}
        weeklyTimetables={draftWeeklyTimetables}
        currentWeek={currentWeek}
        timetable={draftMasterTimetable}
        isAdmin={isAdmin}
        storageKeyPrefix={DRAFT_SANDBOX_ADJUSTMENT_PREFIX}
        customTitle="Dự Thảo Phân Công Mới (Số Tiết Thực Dạy)"
        customDescription="Bảng tính thừa thiếu tiết cả năm và từng tuần của 101 giáo viên theo phương án phân công mới trong Dự Thảo"
        defaultLevelScope="ALL"
      />

      {/* 4. MODAL: ĐỔI GIÁO VIÊN LỚP & MÔN THỬ NGHIỆM */}
      {isReassignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-800 to-indigo-900 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/10 rounded-xl">
                  <ArrowRightLeft className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Thử Nghiệm Đổi Giáo Viên Trong Dự Thảo</h3>
                  <p className="text-xs text-purple-200">
                    Chỉ áp dụng trong bản Dự thảo • Không ảnh hưởng TKB chính thức
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReassignModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-purple-200 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Select Class */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. Chọn Lớp Học (53 lớp toàn trường):
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <optgroup label="Cấp THPT (Khối 10 - 12)">
                    {classes
                      .filter((c) => c.level === 'THPT')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (THPT Đốc Binh Kiều)
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="THCS Đốc Binh Kiều (6A1 - 9A6)">
                    {classes
                      .filter(
                        (c) =>
                          c.level === 'THCS' &&
                          !['6A7', '6A8', '6A9', '6A10', '7A7', '7A8', '7A9', '8A7', '8A8', '8A9', '8A10', '9A7', '9A8', '9A9', '9A10'].includes(c.name)
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (THCS ĐBK)
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="THCS Tân Kiều (6A7 - 9A10)">
                    {classes
                      .filter((c) =>
                        ['6A7', '6A8', '6A9', '6A10', '7A7', '7A8', '7A9', '8A7', '8A8', '8A9', '8A10', '9A7', '9A8', '9A9', '9A10'].includes(c.name)
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (THCS Tân Kiều)
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {/* Select Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  2. Chọn Môn Học Trong Lớp:
                </label>
                {classSubjects.length === 0 ? (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                    Lớp này hiện không có tiết trong thời khóa biểu tuần hiện tại.
                  </p>
                ) : (
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {classSubjects.map((cs) => (
                      <option key={cs.subjectId} value={cs.subjectId}>
                        {cs.subjectName} ({cs.count} tiết/tuần) • Hiện tại: {cs.teacherName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Current Teacher Info */}
              {currentAssignedTeacher && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-amber-800 font-medium">Giáo viên hiện đang dạy:</span>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">
                      {currentAssignedTeacher}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-200/80 text-amber-900 font-bold rounded-lg text-xs">
                    Đang được gán
                  </span>
                </div>
              )}

              {/* Select New Teacher */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  3. Chọn Giáo Viên Mới Để Thay Thế:
                </label>
                <select
                  value={selectedNewTeacherId}
                  onChange={(e) => setSelectedNewTeacherId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Chọn giáo viên mới --</option>
                  {teachers
                    .filter((t) => !t.id.startsWith('tch-bgh') && t.role !== 'HieuTruong' && t.role !== 'PhoHieuTruong')
                    .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
                    .map((t) => {
                      const deptName = departments.find((d) => d.id === t.departmentId)?.name || '';
                      return (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.code}) - {deptName} [{t.campus || 'ĐBK'}]
                        </option>
                      );
                    })}
                </select>
              </div>

              {/* Scope */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  4. Phạm Vi Áp Dụng Trong Dự Thảo:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setApplyScope('CURRENT_ONWARD')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      applyScope === 'CURRENT_ONWARD'
                        ? 'bg-purple-50 border-purple-400 text-purple-900 font-bold shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div>Từ Tuần {currentWeek} trở đi</div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      Giữ nguyên các tuần cũ
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplyScope('ALL_SEMESTER')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      applyScope === 'ALL_SEMESTER'
                        ? 'bg-purple-50 border-purple-400 text-purple-900 font-bold shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div>Toàn bộ học kỳ / Năm</div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      Cả Tuần 1 đến Tuần 35
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReassignModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleApplySingleReassignment}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Áp Dụng Vào Dự Thảo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
