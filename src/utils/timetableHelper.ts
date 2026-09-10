import * as XLSX from 'xlsx';
import {
  TimetableSlot,
  SchoolTimetable,
  ClassGroup,
  Subject,
  Teacher,
  Assignment,
  SchoolConfig
} from '../types';
import { buildTHPTWeek1Slots } from '../data/thptWeek1Timetable';
import { buildTHCSDBKWeek1Slots } from '../data/thcsDBKWeek1Timetable';
import { buildTHCSTKWeek1Slots } from '../data/thcsTKWeek1Timetable';

export const DAYS_OF_WEEK = [
  { value: 2, label: 'Thứ Hai', shortLabel: 'Thứ 2' },
  { value: 3, label: 'Thứ Ba', shortLabel: 'Thứ 3' },
  { value: 4, label: 'Thứ Tư', shortLabel: 'Thứ 4' },
  { value: 5, label: 'Thứ Năm', shortLabel: 'Thứ 5' },
  { value: 6, label: 'Thứ Sáu', shortLabel: 'Thứ 6' },
  { value: 7, label: 'Thứ Bảy', shortLabel: 'Thứ 7' },
];

export const PERIODS = [1, 2, 3, 4, 5];

/**
 * Generate a smart initial timetable based on current assignments and classes
 */
export function generateInitialTimetable(
  classes: ClassGroup[],
  subjects: Subject[],
  teachers: Teacher[],
  assignments: Assignment[],
  config: SchoolConfig
): SchoolTimetable {
  const teacherMap = new Map(teachers.map(t => [t.id, t]));
  const subjectMap = new Map(subjects.map(s => [s.id, s]));
  const slots: TimetableSlot[] = [];

  // 1. Populate exact THPT Week 1 slots (14 classes: 10CB1-5, 11CB1-4, 12CB1-5)
  const thptWeek1Slots = buildTHPTWeek1Slots();
  slots.push(...thptWeek1Slots);

  // 2. Populate exact THCS Đốc Binh Kiều Week 1 slots (24 classes: 6A1-6, 7A1-6, 8A1-6, 9A1-6)
  const thcsDBKWeek1Slots = buildTHCSDBKWeek1Slots();
  slots.push(...thcsDBKWeek1Slots);

  // 3. Populate exact THCS Tân Kiều Week 1 slots (15 classes: 6A7-10, 7A7-9, 8A7-10, 9A7-10)
  const thcsTKWeek1Slots = buildTHCSTKWeek1Slots();
  slots.push(...thcsTKWeek1Slots);

  const officialClassIds = new Set([
    // THPT (14 lớp)
    'cls-10cb1', 'cls-10cb2', 'cls-10cb3', 'cls-10cb4', 'cls-10cb5',
    'cls-11cb1', 'cls-11cb2', 'cls-11cb3', 'cls-11cb4',
    'cls-12cb1', 'cls-12cb2', 'cls-12cb3', 'cls-12cb4', 'cls-12cb5',
    // THCS DBK (24 lớp)
    'cls-6a1', 'cls-6a2', 'cls-6a3', 'cls-6a4', 'cls-6a5', 'cls-6a6',
    'cls-7a1', 'cls-7a2', 'cls-7a3', 'cls-7a4', 'cls-7a5', 'cls-7a6',
    'cls-8a1', 'cls-8a2', 'cls-8a3', 'cls-8a4', 'cls-8a5', 'cls-8a6',
    'cls-9a1', 'cls-9a2', 'cls-9a3', 'cls-9a4', 'cls-9a5', 'cls-9a6',
    // THCS TK (15 lớp)
    'cls-6a7', 'cls-6a8', 'cls-6a9', 'cls-6a10',
    'cls-7a7', 'cls-7a8', 'cls-7a9',
    'cls-8a7', 'cls-8a8', 'cls-8a9', 'cls-8a10',
    'cls-9a7', 'cls-9a8', 'cls-9a9', 'cls-9a10'
  ]);

  // Group assignments by class
  const classAssignmentsMap = new Map<string, Assignment[]>();
  classes.forEach(c => classAssignmentsMap.set(c.id, []));
  assignments.forEach(a => {
    const list = classAssignmentsMap.get(a.classId);
    if (list) list.push(a);
  });

  // Track teacher busy slots
  const teacherBusy = new Set<string>();
  slots.forEach(s => {
    if (s.teacherId) {
      teacherBusy.add(`${s.dayOfWeek}_${s.session}_${s.period}_${s.teacherId}`);
    }
  });

  // Determine standard session for any remaining classes not in the official list
  classes.filter(cls => !officialClassIds.has(cls.id)).forEach((cls) => {
    const isMorning = ['9', '8', '11', '12'].includes(cls.grade);
    const session = isMorning ? 'SANG' : 'CHIEU';
    const classAssignments = classAssignmentsMap.get(cls.id) || [];

    // Create a pool of subject periods to place
    const periodPool: { subjectId: string; teacherId: string }[] = [];

    classAssignments.forEach(asg => {
      const pCount = Math.min(Math.round(asg.periodsPerWeek || 1), 6);
      for (let i = 0; i < pCount; i++) {
        periodPool.push({
          subjectId: asg.subjectId,
          teacherId: asg.teacherId
        });
      }
    });

    // Place Monday P1: Chào cờ / HĐTN
    const homeroomTeacher = cls.homeroomTeacherId ? teacherMap.get(cls.homeroomTeacherId) : undefined;
    slots.push({
      id: `${cls.id}_2_${session}_1`,
      classId: cls.id,
      className: cls.name,
      dayOfWeek: 2,
      session,
      period: 1,
      subjectId: 'sub-hdtn',
      subjectName: 'Chào cờ / HĐTN',
      teacherId: cls.homeroomTeacherId || '',
      teacherName: homeroomTeacher?.name || 'GVCN',
      teacherCode: homeroomTeacher?.code || 'GVCN',
      room: '',
      isSpecialActivity: true
    });

    // Place Saturday P5: Sinh hoạt lớp (SHL)
    slots.push({
      id: `${cls.id}_7_${session}_5`,
      classId: cls.id,
      className: cls.name,
      dayOfWeek: 7,
      session,
      period: 5,
      subjectId: 'sub-shl',
      subjectName: 'Sinh hoạt lớp',
      teacherId: cls.homeroomTeacherId || '',
      teacherName: homeroomTeacher?.name || 'GVCN',
      teacherCode: homeroomTeacher?.code || 'GVCN',
      room: '',
      isSpecialActivity: true
    });

    // Fill remaining slots
    let poolIndex = 0;
    for (let day = 2; day <= 7; day++) {
      for (let period = 1; period <= 5; period++) {
        // Skip already filled special slots
        if (day === 2 && period === 1) continue;
        if (day === 7 && period === 5) continue;

        if (poolIndex < periodPool.length) {
          // Find an item in pool whose teacher is not busy
          let chosenIndex = -1;
          for (let i = poolIndex; i < periodPool.length; i++) {
            const item = periodPool[i];
            const busyKey = `${day}_${session}_${period}_${item.teacherId}`;
            if (!teacherBusy.has(busyKey)) {
              chosenIndex = i;
              break;
            }
          }

          if (chosenIndex === -1) {
            chosenIndex = poolIndex;
          }

          const item = periodPool[chosenIndex];
          if (chosenIndex !== poolIndex) {
            periodPool[chosenIndex] = periodPool[poolIndex];
            periodPool[poolIndex] = item;
          }

          const teacher = teacherMap.get(item.teacherId);
          const subject = subjectMap.get(item.subjectId);

          if (item.teacherId) {
            teacherBusy.add(`${day}_${session}_${period}_${item.teacherId}`);
          }

          slots.push({
            id: `${cls.id}_${day}_${session}_${period}`,
            classId: cls.id,
            className: cls.name,
            dayOfWeek: day,
            session,
            period,
            subjectId: item.subjectId,
            subjectName: subject?.name || subject?.shortName || 'Môn học',
            teacherId: item.teacherId,
            teacherName: teacher?.name || '',
            teacherCode: teacher?.code || '',
            room: ''
          });

          poolIndex++;
        } else {
          slots.push({
            id: `${cls.id}_${day}_${session}_${period}`,
            classId: cls.id,
            className: cls.name,
            dayOfWeek: day,
            session,
            period,
            room: ''
          });
        }
      }
    }
  });

  return {
    id: `tkb_${config.semester || 'HK1'}_tuan1`,
    academicYear: config.academicYear || '2026 - 2027',
    semester: config.semester || 'HK1',
    appliedDate: 'Áp dụng Tuần 1 (từ ngày 07/09/2026)',
    title: `Thời Khóa Biểu Tuần 1 - ${config.semester === 'HK2' ? 'Học kỳ II' : 'Học kỳ I'} Năm học ${config.academicYear || '2026 - 2027'}`,
    slots,
    updatedAt: Date.now(),
    notes: 'TKB Tuần 1 chính thức toàn trường (14 lớp THPT, 24 lớp THCS Đốc Binh Kiều, 15 lớp THCS Tân Kiều)'
  };
}

/**
 * Ensure THPT, THCS DBK, and THCS TK classes contain timetable data.
 * IMPORTANT: If existingSlots already has slots (user edits or saved state),
 * it preserves them so manual modifications are NEVER wiped out on reload.
 */
export function ensureTHPTOfficialSlots(existingSlots: TimetableSlot[]): TimetableSlot[] {
  if (existingSlots && existingSlots.length > 0) {
    return normalizeTimetableSlots(existingSlots);
  }

  const thptWeek1Slots = buildTHPTWeek1Slots();
  const thcsDBKWeek1Slots = buildTHCSDBKWeek1Slots();
  const thcsTKWeek1Slots = buildTHCSTKWeek1Slots();
  return normalizeTimetableSlots([...thptWeek1Slots, ...thcsDBKWeek1Slots, ...thcsTKWeek1Slots]);
}

/**
 * Normalizes subject names for HĐTNHN and Sinh hoạt lớp:
 * - Thứ 7, tiết cuối cùng (tiết 5) của mọi lớp đều là "Sinh hoạt lớp"
 * - Tiết sinh hoạt lớp (SHL) -> Sinh hoạt lớp (mã sub-shl)
 * - Tiết hoạt động quy mô lớp / chuyên đề -> HĐTNHN (Quy mô lớp) / HĐTNHN (Chuyên đề)
 */
export function getUnifiedSubjectName(slot: { classId?: string; className?: string; subjectName?: string; dayOfWeek?: number; period?: number }): string {
  if (!slot?.subjectName) return '';
  const sub = slot.subjectName.trim();
  const cName = (slot.className || '').trim().toUpperCase();
  const cId = (slot.classId || '').toLowerCase();

  // 1. Thứ 7, tiết cuối cùng (tiết 5) của tất cả các lớp ĐỀU là Sinh hoạt lớp
  if (slot.dayOfWeek === 7 && slot.period === 5) {
    return 'Sinh hoạt lớp';
  }

  // 2. Các tiết SHL / Sinh hoạt lớp
  if (sub === 'SHL' || sub.startsWith('SHL-') || sub.startsWith('SHL -') || sub === 'Sinh hoạt lớp' || sub.startsWith('Sinh hoạt lớp')) {
    return 'Sinh hoạt lớp';
  }

  // Check if class is grade 6-9 (THCS DBK or TK: 6A1..6A10, 7A1..7A9, 8A1..8A10, 9A1..9A10)
  const isTHCS = /^[6789]A\d+/i.test(cName) || cId.includes('-6') || cId.includes('-7') || cId.includes('-8') || cId.includes('-9');

  if (isTHCS) {
    // Sửa nhầm: nếu bị ghi là HĐTNHN (Sinh hoạt lớp)
    if (sub === 'HĐTNHN (Sinh hoạt lớp)') {
      if (slot.dayOfWeek === 7 && slot.period === 5) {
        return 'Sinh hoạt lớp';
      }
      return 'HĐTNHN (Quy mô lớp)';
    }

    // Tiết hoạt động chủ nhiệm, hoạt động quy mô lớp sửa lại là HĐTNHN (Quy mô lớp)
    if (
      sub === 'HĐCN' ||
      sub.startsWith('HĐCN') ||
      sub === 'HĐ Chủ nhiệm' ||
      sub.startsWith('HĐ Chủ nhiệm') ||
      sub === 'HĐ QML' ||
      sub.startsWith('HĐ QML') ||
      sub === 'HĐTN: Quy mô lớp' ||
      sub.toLowerCase().includes('quy mô lớp') ||
      sub.toLowerCase().includes('chủ nhiệm')
    ) {
      return 'HĐTNHN (Quy mô lớp)';
    }

    // Tiết hoạt động trải nghiệm theo chủ đề sửa lại thành HĐTNHN (Chuyên đề)
    if (
      sub === 'HĐ CĐ' ||
      sub.startsWith('HĐ CĐ') ||
      sub === 'HĐTN: Hoạt động Chủ đề' ||
      sub === 'HĐTN - HN' ||
      sub === 'HĐ TN-HN' ||
      sub === 'HĐTN' ||
      sub === 'HĐ TN' ||
      sub.toLowerCase().includes('chuyên đề') ||
      sub.toLowerCase().includes('chủ đề') ||
      sub.toLowerCase().includes('trải nghiệm theo chủ đề')
    ) {
      return 'HĐTNHN (Chuyên đề)';
    }
  }

  return sub;
}

export function normalizeTimetableSlots(slots: TimetableSlot[]): TimetableSlot[] {
  return (slots || []).map(s => {
    const unifiedName = getUnifiedSubjectName(s);
    let subjectName = unifiedName || s.subjectName;
    let subjectId = s.subjectId;

    // Thứ 7, tiết 5 luôn là Sinh hoạt lớp
    if (s.dayOfWeek === 7 && s.period === 5) {
      subjectName = 'Sinh hoạt lớp';
      subjectId = 'sub-shl';
    } else if (subjectName === 'Sinh hoạt lớp' || subjectName === 'SHL') {
      subjectName = 'Sinh hoạt lớp';
      subjectId = 'sub-shl';
    } else if (subjectName === 'HĐTNHN (Chuyên đề)') {
      subjectId = 'sub-hdtn-cd';
    } else if (subjectName === 'HĐTNHN (Quy mô lớp)' || subjectName === 'HĐTNHN (Sinh hoạt lớp)') {
      subjectName = 'HĐTNHN (Quy mô lớp)';
      subjectId = 'sub-hdtn-cd';
    } else if (subjectName === 'Chào cờ') {
      subjectId = 'sub-chao-co';
    } else if (subjectName === 'HĐTN - HN' || subjectName === 'HĐTN-HN' || subjectName === 'HĐTN, HN' || subjectName === 'HĐ Trải nghiệm, Hướng nghiệp (THPT)' || subjectName === 'HĐ Trải nghiệm, Hướng nghiệp') {
      subjectId = 'sub-hdtn';
    }

    // Teacher name correction: Nguyễn Kim Rạng
    let teacherId = s.teacherId;
    let teacherName = s.teacherName;
    let teacherCode = s.teacherCode;
    const tNameLower = (teacherName || '').toLowerCase();
    if (
      teacherId === 'tch-td-2' ||
      tNameLower === 'nguyễn kim rang' ||
      tNameLower === 'nguyen kim rang' ||
      tNameLower === 'đặng văn rạng' ||
      tNameLower === 'dang van rang' ||
      tNameLower === 'rang' ||
      (teacherCode && teacherCode.toLowerCase() === 'rang.nk')
    ) {
      teacherId = 'tch-td-2';
      teacherName = 'Nguyễn Kim Rạng';
      teacherCode = 'Rạng.NK';
    } else if (
      teacherId === 'tch-ls-1' ||
      tNameLower === 'lê hồng thủy' ||
      tNameLower === 'le hong thuy' ||
      (teacherCode && teacherCode.toLowerCase() === 'thủy.lh')
    ) {
      teacherId = 'tch-ls-1';
      teacherName = 'Lê Hồng Thúy';
      teacherCode = 'Thúy.LH';
    } else if (
      teacherId === 'tch-td-1' ||
      tNameLower === 'lê văn nguyện' ||
      (teacherCode && teacherCode.toLowerCase() === 'nguyện.lv')
    ) {
      teacherId = 'tch-td-1';
      teacherName = 'Lê Văn Nguyên';
      teacherCode = 'Nguyên.LV';
    } else if (
      teacherId === 'tch-khtn-15' ||
      tNameLower === 'võ ngọc đỉnh văn' ||
      tNameLower === 'vo ngoc dinh van'
    ) {
      teacherId = 'tch-khtn-15';
      teacherName = 'Võ Ngọc Đình Văn';
      teacherCode = 'Văn.VNĐ';
    }

    // Enforce school shift rules:
    // Khối 10, 11, 12 (THPT): 100% Buổi Sáng (Morning only, never Afternoon)
    // Khối 8, 9 (THCS): Buổi Sáng
    // Khối 6, 7 (THCS): Buổi Chiều
    let session = s.session;
    let period = s.period;
    const cName = (s.className || '').toUpperCase();
    const cId = (s.classId || '').toLowerCase();

    const isTHPT = /^(?:10|11|12)CB/i.test(cName) || cId.includes('-10') || cId.includes('-11') || cId.includes('-12');
    const isGrade89 = /^[89]A/i.test(cName) || cId.includes('-8') || cId.includes('-9');
    const isGrade67 = /^[67]A/i.test(cName) || cId.includes('-6') || cId.includes('-7');

    if (isTHPT || isGrade89) {
      session = 'SANG';
      if (period > 5) period = period - 5;
    } else if (isGrade67) {
      session = 'CHIEU';
      if (period > 5) period = period - 5;
    } else if (period > 5) {
      period = period - 5;
    }

    const newId = `${s.classId}_${s.dayOfWeek}_${session}_${period}`;

    return {
      ...s,
      id: newId,
      session,
      period,
      subjectName,
      subjectId,
      teacherId,
      teacherName,
      teacherCode
    };
  });
}

/**
 * Create an empty timetable structure for a given week
 */
export function createEmptyTimetableForWeek(
  weekNumber: number,
  academicYear: string = '2026 - 2027'
): SchoolTimetable {
  const semester: 'HK1' | 'HK2' = weekNumber >= 19 ? 'HK2' : 'HK1';
  const { startDate, endDate, fullTitle } = getWeekDateRange(weekNumber);

  return {
    id: `tkb_${semester}_tuan${weekNumber}`,
    academicYear,
    semester,
    weekNumber,
    appliedDate: `Áp dụng Tuần ${weekNumber} (từ ${startDate} đến ${endDate})`,
    title: fullTitle,
    slots: [],
    updatedAt: Date.now(),
    notes: `Thời khóa biểu Tuần ${weekNumber} hiện chưa áp dụng. Quản trị viên có thể sao chép từ Tuần 1 hoặc tạo mới.`
  };
}

/**
 * Calculate dates for each week (HK1 starts 07/09/2026, HK2 starts 18/01/2027)
 */
export function getWeekDateRange(weekNumber: number, academicYear: string = '2026 - 2027'): {
  startDate: string;
  endDate: string;
  startDateShort: string;
  endDateShort: string;
  label: string;
  fullTitle: string;
  realtimeLabel: string;
  headerString: string;
} {
  let startBase: Date;
  if (weekNumber >= 19) {
    // HK2 start: 18/01/2027
    startBase = new Date(2027, 0, 18);
    const offsetDays = (weekNumber - 19) * 7;
    startBase.setDate(startBase.getDate() + offsetDays);
  } else {
    // HK1 start: 07/09/2026
    startBase = new Date(2026, 8, 7);
    const offsetDays = (weekNumber - 1) * 7;
    startBase.setDate(startBase.getDate() + offsetDays);
  }

  const endBase = new Date(startBase);
  endBase.setDate(endBase.getDate() + 5); // Saturday

  const fmtFull = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const fmtShort = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${d.getMonth() + 1}/${d.getFullYear()}`;

  const startStr = fmtFull(startBase);
  const endStr = fmtFull(endBase);
  const startShort = fmtShort(startBase);
  const endShort = fmtShort(endBase);

  return {
    startDate: startStr,
    endDate: endStr,
    startDateShort: startShort,
    endDateShort: endShort,
    label: `Tuần ${weekNumber} (${startShort} - ${endShort})`,
    fullTitle: `Thời khóa biểu Tuần ${weekNumber} (Áp dụng từ ${startShort} đến ${endShort})`,
    realtimeLabel: `Tuần ${weekNumber} (${startShort} - ${endShort})`,
    headerString: `Tuần ${weekNumber} (${startShort} - ${endShort}) Năm học ${academicYear}`
  };
}

/**
 * Clone a timetable to another target week
 */
export function cloneTimetableForWeek(
  sourceTimetable: SchoolTimetable,
  targetWeek: number,
  academicYear: string = '2026 - 2027'
): SchoolTimetable {
  const semester: 'HK1' | 'HK2' = targetWeek >= 19 ? 'HK2' : 'HK1';
  const { startDate, endDate, fullTitle } = getWeekDateRange(targetWeek);

  // Clone slots with new week tag in ID
  const clonedSlots: TimetableSlot[] = normalizeTimetableSlots((sourceTimetable.slots || []).map(s => ({
    ...s,
    id: `${s.classId}_w${targetWeek}_${s.dayOfWeek}_${s.session}_${s.period}`
  })));

  return {
    id: `tkb_${semester}_tuan${targetWeek}`,
    academicYear,
    semester,
    weekNumber: targetWeek,
    appliedDate: `Áp dụng Tuần ${targetWeek} (từ ${startDate} đến ${endDate})`,
    title: fullTitle,
    slots: clonedSlots,
    updatedAt: Date.now(),
    notes: `Sao chép từ TKB Tuần ${sourceTimetable.weekNumber || 1} vào ngày ${new Date().toLocaleDateString('vi-VN')}`
  };
}

/**
 * Export Timetable to Excel with full sheets and formatting
 */
export function exportTimetableToExcel(
  timetable: SchoolTimetable,
  classes: ClassGroup[],
  teachers: Teacher[],
  config: SchoolConfig
) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet 1: Tổng hợp TKB toàn trường (Dạng ma trận Lớp x Các Thứ)
  const masterData: (string | number)[][] = [
    [`THỜI KHÓA BIỂU TOÀN TRƯỜNG - TRƯỜNG THCS & THPT ĐỐC BINH KIỀU`],
    [`Năm học: ${config.academicYear || '2026 - 2027'} • Học kỳ: ${config.semester || 'HK1'} • ${timetable.appliedDate || ''}`],
    [],
    [
      'STT',
      'Điểm trường',
      'Khối',
      'Lớp',
      'GVCN',
      'Buổi',
      // Thứ 2 (T1-T5)
      'T2 - Tiết 1', 'T2 - Tiết 2', 'T2 - Tiết 3', 'T2 - Tiết 4', 'T2 - Tiết 5',
      // Thứ 3 (T1-T5)
      'T3 - Tiết 1', 'T3 - Tiết 2', 'T3 - Tiết 3', 'T3 - Tiết 4', 'T3 - Tiết 5',
      // Thứ 4 (T1-T5)
      'T4 - Tiết 1', 'T4 - Tiết 2', 'T4 - Tiết 3', 'T4 - Tiết 4', 'T4 - Tiết 5',
      // Thứ 5 (T1-T5)
      'T5 - Tiết 1', 'T5 - Tiết 2', 'T5 - Tiết 3', 'T5 - Tiết 4', 'T5 - Tiết 5',
      // Thứ 6 (T1-T5)
      'T6 - Tiết 1', 'T6 - Tiết 2', 'T6 - Tiết 3', 'T6 - Tiết 4', 'T6 - Tiết 5',
      // Thứ 7 (T1-T5)
      'T7 - Tiết 1', 'T7 - Tiết 2', 'T7 - Tiết 3', 'T7 - Tiết 4', 'T7 - Tiết 5',
    ]
  ];

  const teacherMap = new Map(teachers.map(t => [t.id, t]));
  const slotMap = new Map<string, TimetableSlot>();
  timetable.slots.forEach(slot => {
    slotMap.set(`${slot.classId}_${slot.dayOfWeek}_${slot.session}_${slot.period}`, slot);
  });

  classes.forEach((cls, idx) => {
    const campusName = cls.campus === 'THPTDBK' || cls.level === 'THPT'
      ? 'THPT'
      : cls.campus === 'THCSTK'
      ? 'THCS Tân Kiều'
      : 'THCS Đốc Binh Kiều';
    const homeroomName = cls.homeroomTeacherId ? (teacherMap.get(cls.homeroomTeacherId)?.name || '') : '';
    const session = 'SANG';

    const row: (string | number)[] = [
      idx + 1,
      campusName,
      `Khối ${cls.grade}`,
      cls.name,
      homeroomName,
      session === 'SANG' ? 'Sáng' : 'Chiều'
    ];

    for (let day = 2; day <= 7; day++) {
      for (let p = 1; p <= 5; p++) {
        const slot = slotMap.get(`${cls.id}_${day}_${session}_${p}`);
        if (slot && slot.subjectName) {
          const tText = slot.teacherCode || slot.teacherName ? ` (${slot.teacherCode || slot.teacherName})` : '';
          row.push(`${slot.subjectName}${tText}`);
        } else {
          row.push('');
        }
      }
    }

    masterData.push(row);
  });

  const wsMaster = XLSX.utils.aoa_to_sheet(masterData);
  XLSX.utils.book_append_sheet(wb, wsMaster, 'TKB Toan Truong');

  // 2. Sheet 2: Danh sách chi tiết từng tiết (Dạng danh sách để dễ import/phân tích)
  const detailData: (string | number)[][] = [
    ['Lớp', 'Thứ', 'Buổi', 'Tiết', 'Môn Học', 'Giáo Viên Giảng Dạy', 'Mã GV', 'Ghi Chú']
  ];

  timetable.slots.forEach(s => {
    if (s.subjectName) {
      detailData.push([
        s.className || s.classId,
        s.dayOfWeek,
        s.session === 'SANG' ? 'Sáng' : 'Chiều',
        s.period,
        s.subjectName || '',
        s.teacherName || '',
        s.teacherCode || '',
        s.note || ''
      ]);
    }
  });

  const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Chi Tiet Tung Tiet');

  // Write file
  const fileName = `TKB_${config.academicYear.replace(/[^a-zA-Z0-9]/g, '_')}_${config.semester}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Parse Excel / CSV / JSON to Timetable slots
 */
export function parseImportedTimetable(
  fileData: ArrayBuffer | string,
  classes: ClassGroup[],
  subjects: Subject[],
  teachers: Teacher[]
): { slots: TimetableSlot[]; errors: string[]; successCount: number } {
  const errors: string[] = [];
  const slots: TimetableSlot[] = [];

  const classByName = new Map<string, ClassGroup>();
  classes.forEach(c => {
    classByName.set(c.name.trim().toLowerCase(), c);
    classByName.set(c.id.toLowerCase(), c);
  });

  const teacherByName = new Map<string, Teacher>();
  teachers.forEach(t => {
    teacherByName.set(t.name.trim().toLowerCase(), t);
    teacherByName.set(t.code.trim().toLowerCase(), t);
    teacherByName.set(t.id.toLowerCase(), t);
  });

  const subjectByName = new Map<string, Subject>();
  subjects.forEach(s => {
    subjectByName.set(s.name.trim().toLowerCase(), s);
    subjectByName.set(s.shortName.trim().toLowerCase(), s);
    subjectByName.set(s.id.toLowerCase(), s);
  });

  try {
    let rawRows: any[] = [];

    if (typeof fileData === 'string' && fileData.trim().startsWith('[')) {
      // JSON Array
      rawRows = JSON.parse(fileData);
    } else {
      // Excel or CSV Buffer
      const workbook = XLSX.read(fileData, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    }

    if (!rawRows || rawRows.length === 0) {
      return { slots: [], errors: ['Tập tin không có dữ liệu'], successCount: 0 };
    }

    // Check if it's Table/List format or Master Grid format
    const headerRow = (rawRows[0] || []).map((h: any) => String(h || '').trim().toLowerCase());
    const isDetailList = headerRow.some((h: string) => h.includes('lớp') || h.includes('class')) &&
                         headerRow.some((h: string) => h.includes('thứ') || h.includes('day'));

    if (isDetailList) {
      // Format: Lớp | Thứ | Buổi | Tiết | Môn | Giáo viên | Mã GV | Phòng
      const colLop = headerRow.findIndex((h: string) => h.includes('lớp') || h.includes('class'));
      const colThu = headerRow.findIndex((h: string) => h.includes('thứ') || h.includes('day'));
      const colBuoi = headerRow.findIndex((h: string) => h.includes('buổi') || h.includes('session'));
      const colTiet = headerRow.findIndex((h: string) => h.includes('tiết') || h.includes('period'));
      const colMon = headerRow.findIndex((h: string) => h.includes('môn') || h.includes('subject'));
      const colGv = headerRow.findIndex((h: string) => h.includes('giáo viên') || h.includes('gv') || h.includes('teacher'));
      const colMaGv = headerRow.findIndex((h: string) => h.includes('mã gv') || h.includes('code'));
      const colPhong = headerRow.findIndex((h: string) => h.includes('phòng') || h.includes('room'));

      for (let i = 1; i < rawRows.length; i++) {
        const r = rawRows[i];
        if (!r || r.length === 0) continue;

        const classNameRaw = String(r[colLop] || '').trim();
        if (!classNameRaw) continue;

        const targetClass = classByName.get(classNameRaw.toLowerCase());
        if (!targetClass) {
          errors.push(`Dòng ${i + 1}: Không tìm thấy lớp "${classNameRaw}" trong danh sách 28 lớp của trường.`);
          continue;
        }

        let dayVal = parseInt(String(r[colThu] || '2').replace(/[^0-9]/g, ''), 10);
        if (isNaN(dayVal) || dayVal < 2 || dayVal > 7) dayVal = 2;

        const sessionRaw = colBuoi >= 0 ? String(r[colBuoi] || '').toLowerCase() : '';
        const session: 'SANG' | 'CHIEU' = sessionRaw.includes('chiều') || sessionRaw.includes('chieu') || sessionRaw.includes('afternoon')
          ? 'CHIEU'
          : 'SANG';

        let periodVal = parseInt(String(r[colTiet] || '1').replace(/[^0-9]/g, ''), 10);
        if (isNaN(periodVal) || periodVal < 1 || periodVal > 5) periodVal = 1;

        const subjectNameRaw = colMon >= 0 ? String(r[colMon] || '').trim() : '';
        const teacherNameRaw = colGv >= 0 ? String(r[colGv] || '').trim() : '';
        const teacherCodeRaw = colMaGv >= 0 ? String(r[colMaGv] || '').trim() : '';

        const matchedSubject = subjectByName.get(subjectNameRaw.toLowerCase());
        const matchedTeacher = teacherByName.get(teacherCodeRaw.toLowerCase()) || teacherByName.get(teacherNameRaw.toLowerCase());

        slots.push({
          id: `${targetClass.id}_${dayVal}_${session}_${periodVal}`,
          classId: targetClass.id,
          className: targetClass.name,
          dayOfWeek: dayVal,
          session,
          period: periodVal,
          subjectId: matchedSubject?.id || '',
          subjectName: matchedSubject?.name || subjectNameRaw,
          teacherId: matchedTeacher?.id || '',
          teacherName: matchedTeacher?.name || teacherNameRaw,
          teacherCode: matchedTeacher?.code || teacherCodeRaw,
          room: ''
        });
      }
    } else {
      // Try parsing Matrix format or generic format
      errors.push('Định dạng chưa nhận diện được hoàn toàn, vui lòng dùng Mẫu Excel chuẩn của hệ thống để nhập chính xác nhất.');
    }
  } catch (err: any) {
    errors.push(`Lỗi khi đọc tệp: ${err?.message || 'Không thể giải mã dữ liệu'}`);
  }

  return {
    slots,
    errors,
    successCount: slots.length
  };
}

/**
 * Generate sample CSV template for download
 */
export function getTimetableSampleCSV(): string {
  return `Lớp,Thứ,Buổi,Tiết,Môn Học,Giáo Viên Giảng Dạy,Mã GV,Ghi Chú
10A1,2,Sáng,1,Chào cờ / HĐTN,Đoàn Kiều.T,Kiều.ĐT,Sinh hoạt toàn trường
10A1,2,Sáng,2,Toán,Đoàn Kiều.T,Kiều.ĐT,
10A1,2,Sáng,3,Toán,Đoàn Kiều.T,Kiều.ĐT,
10A1,2,Sáng,4,Ngữ văn,Lê Văn Anh,Anh.LV,
10A1,2,Sáng,5,Tiếng Anh,Phạm Thị Hoa,Hoa.PT,
10A2,2,Sáng,1,Chào cờ / HĐTN,Trần Văn Bình,Bình.TV,
10A2,2,Sáng,2,Ngữ văn,Lê Văn Anh,Anh.LV,
10A2,2,Sáng,3,Toán,Nguyễn Văn Cường,Cường.NV,
6A1,2,Sáng,1,Chào cờ / HĐTN,Hoàng Văn Giang,Giang.HV,ĐBK
6A1,2,Sáng,2,Toán,Hoàng Văn Giang,Giang.HV,
6/1,2,Sáng,1,Chào cờ / HĐTN,Phạm Văn Nam,Nam.PV,Tân Kiều`;
}
