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
  // 1. Independent Sandbox Weekly Timetables State
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

    // Default: Clone official weekly timetables or generate baseline from Week 8
    const baseSlots =
      weeklyTimetables?.[8]?.slots ||
      weeklyTimetables?.[7]?.slots ||
      OFFICIAL_WEEK_8_SLOTS ||
      OFFICIAL_WEEK_7_SLOTS ||
      timetable?.slots ||
      [];

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

  // Teacher map for easy lookup
  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers]);
  const teacherByName = useMemo(() => new Map(teachers.map((t) => [t.name, t])), [teachers]);

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
    // Check 8A1: if only Nguyễn Thái Hùng teaches HĐTN in 8A1, then it's consolidated
    const slots8A1Hdtn = sampleWeekSlots.filter(
      (s) =>
        (s.className === '8A1' || s.classId === 'cls-8a1') &&
        (s.subjectId.includes('hdtn') || s.subjectName.includes('HĐTNHN'))
    );
    const uniqueTeachers = new Set(slots8A1Hdtn.map((s) => s.teacherName));
    return uniqueTeachers.size === 1 && uniqueTeachers.has('Nguyễn Thái Hùng');
  }, [draftWeeklyTimetables, currentWeek]);

  // 1. ACTION: Pilot Consolidate 19 classes HĐTNHN
  const handleApplyHdtnConsolidation = () => {
    if (
      !window.confirm(
        'Bạn có muốn thí điểm gom toàn bộ 19 lớp HĐTNHN về 1 giáo viên duy nhất trong bản Dự thảo không?\n\n' +
          '• Ưu tiên 1: Người thiếu tiết nhiều nhất cả năm.\n' +
          '• Ưu tiên 2: Giáo viên chủ nhiệm.\n' +
          '• Tuyệt đối né 100% giáo viên môn Tin học.\n\n' +
          '(Thao tác này chỉ chạy trong bản Dự thảo, KHÔNG làm thay đổi Thời khóa biểu chính thức của trường).'
      )
    ) {
      return;
    }

    const nextDraft: Record<number, SchoolTimetable> = { ...draftWeeklyTimetables };
    let totalUpdatedSlots = 0;

    // Apply from Week 1 to Week 35 (or active semester)
    Object.keys(nextDraft).forEach((wKey) => {
      const wNum = Number(wKey);
      const tbl = nextDraft[wNum];
      if (!tbl || !tbl.slots) return;

      const updatedSlots = tbl.slots.map((slot) => {
        const isHdtn =
          slot.subjectId.includes('hdtn') ||
          slot.subjectName.toLowerCase().includes('hđtn') ||
          slot.subjectName.toLowerCase().includes('trải nghiệm') ||
          slot.subjectName.toLowerCase().includes('chuyên đề') ||
          slot.subjectName.toLowerCase().includes('quy mô lớp');

        if (!isHdtn) return slot;

        const targetConsolidation = CONSOLIDATION_19_CLASSES_MAP[slot.className];
        if (!targetConsolidation) return slot;

        const targetTeacher =
          teacherByName.get(targetConsolidation.teacherName) ||
          (targetConsolidation.teacherId
            ? teacherMap.get(targetConsolidation.teacherId)
            : null);

        if (!targetTeacher) return slot;

        // Only update if teacher is currently different
        if (slot.teacherName !== targetTeacher.name) {
          totalUpdatedSlots++;
          return {
            ...slot,
            teacherId: targetTeacher.id,
            teacherName: targetTeacher.name,
            teacherCode: targetTeacher.code,
          };
        }
        return slot;
      });

      nextDraft[wNum] = {
        ...tbl,
        slots: updatedSlots,
        updatedAt: Date.now(),
      };
    });

    persistDraft(nextDraft);
    if (onShowToast) {
      onShowToast(
        `Đã thí điểm gom thành công 19 lớp HĐTNHN về 1 giáo viên (${totalUpdatedSlots} tiết được gán lại)! Bảng số tiết đã được tính toán lại ngay lập tức.`
      );
    }
  };

  // 2. ACTION: Reset draft from official Week 8 baseline
  const handleResetToOfficialWeek8 = () => {
    if (
      !window.confirm(
        'Bạn có chắc chắn muốn đặt lại toàn bộ bản Dự thảo về nguyên bản Thời Khóa Biểu Tuần 8 chính thức không? Mọi thay đổi thử nghiệm trước đó trong Dự thảo sẽ được làm mới.'
      )
    ) {
      return;
    }

    const baseSlots =
      weeklyTimetables?.[8]?.slots ||
      OFFICIAL_WEEK_8_SLOTS ||
      weeklyTimetables?.[7]?.slots ||
      timetable?.slots ||
      [];

    const freshDraft: Record<number, SchoolTimetable> = {};
    for (let w = 1; w <= 35; w++) {
      const existing = weeklyTimetables?.[w];
      freshDraft[w] = {
        id: `draft-tkb-week-${w}`,
        academicYear: config.academicYear,
        semester: w <= 18 ? 'HK1' : 'HK2',
        weekNumber: w,
        slots: existing?.slots && existing.slots.length > 0 ? [...existing.slots] : [...baseSlots],
        updatedAt: Date.now(),
      };
    }

    persistDraft(freshDraft);
    try {
      localStorage.removeItem(DRAFT_SANDBOX_STORAGE_KEY);
    } catch {
      /* ignore */
    }

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

  // Unique subjects in selected class
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

  // When selectedClassId changes, auto pick first subject
  useEffect(() => {
    if (classSubjects.length > 0 && (!selectedSubjectId || !classSubjects.some((cs) => cs.subjectId === selectedSubjectId))) {
      setSelectedSubjectId(classSubjects[0].subjectId);
    }
  }, [classSubjects, selectedSubjectId]);

  // Currently assigned teacher for selected class & subject
  const currentAssignedTeacher = useMemo(() => {
    const match = classSubjects.find((cs) => cs.subjectId === selectedSubjectId);
    return match ? match.teacherName : '';
  }, [classSubjects, selectedSubjectId]);

  // Execute single reassignment in sandbox
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
      {/* Pilot Sandbox Control Banner */}
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
              {isHdtnConsolidatedInDraft && (
                <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold text-xs rounded-full flex items-center gap-1">
                  ⭐ Đã thí điểm gom 19 lớp HĐTNHN về 1 GV
                </span>
              )}
            </div>

            <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              Bảng Phân Công Chuyên Môn Dự Thảo & Thử Nghiệm Số Tiết
            </h2>
            <p className="text-xs text-purple-200/90 max-w-3xl leading-relaxed">
              Đây là không gian <b>thử nghiệm an toàn (Sandbox)</b> để Thầy chạy thử các phương án phân công mới, 
              kiểm tra số tiết thừa/thiếu cả năm và từng tuần của 101 giáo viên. Mọi điều chỉnh tại đây 
              <b> tuyệt đối không làm ảnh hưởng</b> đến dữ liệu thời khóa biểu hay phân công đang vận hành của nhà trường.
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

      {/* Renders the full calculation engine & visual design of Số Tiết Thực Dạy, but backed by Sandbox state */}
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
        customDescription="Số liệu phân công chuyên môn và số tiết thừa/thiếu được tính toán tự động trong không gian Dự Thảo độc lập"
      />

      {/* Modal: Đổi Giáo viên cho Lớp & Môn thử nghiệm */}
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
