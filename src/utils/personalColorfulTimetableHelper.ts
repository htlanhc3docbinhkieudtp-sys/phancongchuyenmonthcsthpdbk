import {
  ClassGroup,
  Department,
  SchoolTimetable,
  Teacher,
  TimetableSlot
} from '../types';
import {
  DAYS_OF_WEEK,
  PERIODS,
  getUnifiedSubjectName
} from './timetableHelper';
import {
  GradeCampusFilter,
  GradeSessionExportMode,
  resolveCleanTeacherName
} from './timetableGradeA4ExportHelper';

export type PersonalPdfTargetType = 'TEACHER' | 'CLASS';
export type PersonalColorIntensity = 'SOFT' | 'ACCENT' | 'MINIMAL';
export type HeaderColorPresetId = 'BLUE' | 'TEAL' | 'INDIGO';

export interface HeaderColorPreset {
  id: HeaderColorPresetId;
  label: string;
  bannerBg: string;
  bannerBorder: string;
  badgeBg: string;
  badgeText: string;
  tableHeaderBg: string;
  tableHeaderText: string;
  infoBarBg: string;
  infoBarBorder: string;
  footerAccent: string;
}

export const HEADER_COLOR_PRESETS: Record<HeaderColorPresetId, HeaderColorPreset> = {
  BLUE: {
    id: 'BLUE',
    label: 'Xanh Dương',
    bannerBg: '#1E40AF',
    bannerBorder: '#1D4ED8',
    badgeBg: '#DBEAFE',
    badgeText: '#1E3A8A',
    tableHeaderBg: '#2563EB',
    tableHeaderText: '#FFFFFF',
    infoBarBg: '#F8FAFC',
    infoBarBorder: '#CBD5E1',
    footerAccent: '#1D4ED8'
  },
  TEAL: {
    id: 'TEAL',
    label: 'Xanh Ngọc',
    bannerBg: '#0F766E',
    bannerBorder: '#0D9488',
    badgeBg: '#CCFBF1',
    badgeText: '#134E4A',
    tableHeaderBg: '#0D9488',
    tableHeaderText: '#FFFFFF',
    infoBarBg: '#F8FAFC',
    infoBarBorder: '#CBD5E1',
    footerAccent: '#0F766E'
  },
  INDIGO: {
    id: 'INDIGO',
    label: 'Chàm Thanh Lịch',
    bannerBg: '#3730A3',
    bannerBorder: '#4338CA',
    badgeBg: '#E0E7FF',
    badgeText: '#312E81',
    tableHeaderBg: '#4338CA',
    tableHeaderText: '#FFFFFF',
    infoBarBg: '#F8FAFC',
    infoBarBorder: '#CBD5E1',
    footerAccent: '#4338CA'
  }
};

export interface SubjectColorTheme {
  id: string;
  bg: string;
  bgSoft: string;
  border: string;
  accent: string;
  titleColor: string;
  subColor: string;
  pillBg: string;
  pillText: string;
}

// Calm, airy, tasteful pastel palette (low saturation, high readability, clean print)
export const VIVID_MULTI_PALETTE: SubjectColorTheme[] = [
  {
    id: 'sky',
    bg: '#EFF6FF',
    bgSoft: '#F8FAFC',
    border: '#BFDBFE',
    accent: '#3B82F6',
    titleColor: '#1E40AF',
    subColor: '#475569',
    pillBg: '#DBEAFE',
    pillText: '#1E40AF'
  },
  {
    id: 'rose',
    bg: '#FFF1F2',
    bgSoft: '#FFF5F6',
    border: '#FECDD3',
    accent: '#F43F5E',
    titleColor: '#9F1239',
    subColor: '#475569',
    pillBg: '#FFE4E6',
    pillText: '#9F1239'
  },
  {
    id: 'violet',
    bg: '#F5F3FF',
    bgSoft: '#FAF8FF',
    border: '#DDD6FE',
    accent: '#8B5CF6',
    titleColor: '#5B21B6',
    subColor: '#475569',
    pillBg: '#EDE9FE',
    pillText: '#5B21B6'
  },
  {
    id: 'emerald',
    bg: '#ECFDF5',
    bgSoft: '#F3FEF9',
    border: '#A7F3D0',
    accent: '#10B981',
    titleColor: '#065F46',
    subColor: '#475569',
    pillBg: '#D1FAE5',
    pillText: '#065F46'
  },
  {
    id: 'amber',
    bg: '#FFFBEB',
    bgSoft: '#FEFCE8',
    border: '#FDE68A',
    accent: '#F59E0B',
    titleColor: '#92400E',
    subColor: '#475569',
    pillBg: '#FEF3C7',
    pillText: '#92400E'
  },
  {
    id: 'orange',
    bg: '#FFF7ED',
    bgSoft: '#FFFAF5',
    border: '#FED7AA',
    accent: '#F97316',
    titleColor: '#9A3412',
    subColor: '#475569',
    pillBg: '#FFEDD5',
    pillText: '#9A3412'
  },
  {
    id: 'teal',
    bg: '#F0FDFA',
    bgSoft: '#F6FEFD',
    border: '#99F6E4',
    accent: '#14B8A6',
    titleColor: '#115E59',
    subColor: '#475569',
    pillBg: '#CCFBF1',
    pillText: '#115E59'
  },
  {
    id: 'indigo',
    bg: '#EEF2FF',
    bgSoft: '#F5F7FF',
    border: '#C7D2FE',
    accent: '#6366F1',
    titleColor: '#3730A3',
    subColor: '#475569',
    pillBg: '#E0E7FF',
    pillText: '#3730A3'
  },
  {
    id: 'cyan',
    bg: '#ECFEFF',
    bgSoft: '#F4FEFF',
    border: '#A5F3FC',
    accent: '#06B6D4',
    titleColor: '#155E75',
    subColor: '#475569',
    pillBg: '#CFFAFE',
    pillText: '#155E75'
  },
  {
    id: 'slate-blue',
    bg: '#F1F5F9',
    bgSoft: '#F8FAFC',
    border: '#CBD5E1',
    accent: '#64748B',
    titleColor: '#1E293B',
    subColor: '#475569',
    pillBg: '#E2E8F0',
    pillText: '#1E293B'
  }
];

const SUBJECT_COLOR_BY_ID: Record<string, SubjectColorTheme> = {
  'sub-toan': VIVID_MULTI_PALETTE[0],     // Soft Sky
  'sub-van': VIVID_MULTI_PALETTE[1],      // Soft Rose
  'sub-anh': VIVID_MULTI_PALETTE[2],      // Soft Violet
  'sub-li': VIVID_MULTI_PALETTE[7],       // Soft Indigo
  'sub-hoa': VIVID_MULTI_PALETTE[6],      // Soft Teal
  'sub-sinh': VIVID_MULTI_PALETTE[3],     // Soft Emerald
  'sub-khtn-cs': VIVID_MULTI_PALETTE[8],  // Soft Cyan
  'sub-su': VIVID_MULTI_PALETTE[4],       // Soft Amber
  'sub-dia': VIVID_MULTI_PALETTE[5],      // Soft Orange
  'sub-lsdl-cs': VIVID_MULTI_PALETTE[4],  // Soft Amber
  'sub-gdcd': VIVID_MULTI_PALETTE[2],     // Soft Violet
  'sub-gdktpl': VIVID_MULTI_PALETTE[2],   // Soft Violet
  'sub-tin': VIVID_MULTI_PALETTE[0],      // Soft Sky
  'sub-cn': VIVID_MULTI_PALETTE[3],       // Soft Emerald
  'sub-gdtc': VIVID_MULTI_PALETTE[5],     // Soft Orange
  'sub-qpan': VIVID_MULTI_PALETTE[6],     // Soft Teal
  'sub-am-nhac': VIVID_MULTI_PALETTE[1],  // Soft Rose
  'sub-my-thuat': VIVID_MULTI_PALETTE[1], // Soft Rose
  'sub-gddp': VIVID_MULTI_PALETTE[8],     // Soft Cyan
  'sub-hdtn-cd': VIVID_MULTI_PALETTE[7],  // Soft Indigo
  'sub-chao-co': VIVID_MULTI_PALETTE[4],  // Soft Amber
  'sub-shl': VIVID_MULTI_PALETTE[6],      // Soft Teal
  'sub-ai': VIVID_MULTI_PALETTE[0]        // Soft Sky
};

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getSubjectColorTheme(subjectId?: string, subjectName?: string): SubjectColorTheme {
  if (subjectId && SUBJECT_COLOR_BY_ID[subjectId]) {
    return SUBJECT_COLOR_BY_ID[subjectId];
  }
  const lower = (subjectName || '').toLowerCase();
  if (lower.includes('toán')) return SUBJECT_COLOR_BY_ID['sub-toan'];
  if (lower.includes('văn')) return SUBJECT_COLOR_BY_ID['sub-van'];
  if (lower.includes('anh') || lower.includes('ngoại ngữ')) return SUBJECT_COLOR_BY_ID['sub-anh'];
  if (lower.includes('vật lí') || lower.includes('vật lý')) return SUBJECT_COLOR_BY_ID['sub-li'];
  if (lower.includes('hóa')) return SUBJECT_COLOR_BY_ID['sub-hoa'];
  if (lower.includes('sinh học')) return SUBJECT_COLOR_BY_ID['sub-sinh'];
  if (lower.includes('khoa học tự nhiên') || lower.includes('khtn')) return SUBJECT_COLOR_BY_ID['sub-khtn-cs'];
  if (lower.includes('lịch sử và địa')) return SUBJECT_COLOR_BY_ID['sub-lsdl-cs'];
  if (lower.includes('lịch sử')) return SUBJECT_COLOR_BY_ID['sub-su'];
  if (lower.includes('địa phương') || lower.includes('gdđp')) return SUBJECT_COLOR_BY_ID['sub-gddp'];
  if (lower.includes('địa')) return SUBJECT_COLOR_BY_ID['sub-dia'];
  if (lower.includes('kt & pl') || lower.includes('gdcd') || lower.includes('công dân')) return SUBJECT_COLOR_BY_ID['sub-gdcd'];
  if (lower.includes('tin')) return SUBJECT_COLOR_BY_ID['sub-tin'];
  if (lower.includes('công nghệ')) return SUBJECT_COLOR_BY_ID['sub-cn'];
  if (lower.includes('thể chất') || lower.includes('gdtc')) return SUBJECT_COLOR_BY_ID['sub-gdtc'];
  if (lower.includes('gdqp') || lower.includes('quốc phòng')) return SUBJECT_COLOR_BY_ID['sub-qpan'];
  if (lower.includes('âm nhạc')) return SUBJECT_COLOR_BY_ID['sub-am-nhac'];
  if (lower.includes('mỹ thuật')) return SUBJECT_COLOR_BY_ID['sub-my-thuat'];
  if (lower.includes('chào cờ')) return SUBJECT_COLOR_BY_ID['sub-chao-co'];
  if (lower.includes('sinh hoạt lớp') || lower === 'shl') return SUBJECT_COLOR_BY_ID['sub-shl'];
  if (lower.includes('hđtn') || lower.includes('trải nghiệm')) return SUBJECT_COLOR_BY_ID['sub-hdtn-cd'];
  if (lower.includes('trí tuệ') || lower.includes('ai')) return SUBJECT_COLOR_BY_ID['sub-ai'];

  const idx = hashString(subjectId || subjectName || 'x') % VIVID_MULTI_PALETTE.length;
  return VIVID_MULTI_PALETTE[idx];
}

export function getClassColorTheme(className: string): SubjectColorTheme {
  const idx = hashString(className.toUpperCase()) % VIVID_MULTI_PALETTE.length;
  return VIVID_MULTI_PALETTE[idx];
}

export interface ClassSubjectSummaryChip {
  subjectName: string;
  count: number;
  theme: SubjectColorTheme;
}

export function buildClassSubjectSummary(
  classGroup: ClassGroup,
  slotMap: Map<string, TimetableSlot>
): { totalPeriods: number; chips: ClassSubjectSummaryChip[] } {
  const counts = new Map<string, { subjectName: string; subjectId?: string; count: number }>();
  let totalPeriods = 0;

  DAYS_OF_WEEK.forEach(d => {
    (['SANG', 'CHIEU'] as const).forEach(sess => {
      PERIODS.forEach(p => {
        const slot =
          slotMap.get(`${classGroup.id}_${d.value}_${sess}_${p}`) ||
          slotMap.get(`${classGroup.name}_${d.value}_${sess}_${p}`);
        if (slot && slot.subjectName && slot.subjectName.trim()) {
          totalPeriods++;
          const subName = getUnifiedSubjectName(slot);
          const cur = counts.get(subName) || {
            subjectName: subName,
            subjectId: slot.subjectId,
            count: 0
          };
          cur.count++;
          counts.set(subName, cur);
        }
      });
    });
  });

  const chips = Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.subjectName.localeCompare(b.subjectName, 'vi'))
    .map(item => ({
      subjectName: item.subjectName,
      count: item.count,
      theme: getSubjectColorTheme(item.subjectId, item.subjectName)
    }));

  return { totalPeriods, chips };
}

export interface TeacherClassSummaryChip {
  className: string;
  subjectName: string;
  count: number;
  theme: SubjectColorTheme;
}

export interface TeacherPrintItem {
  teacher: Teacher;
  cleanName: string;
  campusCode: 'THPT' | 'DBK' | 'TK';
  campusName: string;
  campusShort: string;
  departmentName: string;
  homeroomClassName: string | null;
  slots: TimetableSlot[];
  slotByDaySessionPeriod: Map<string, TimetableSlot[]>;
  totalPeriods: number;
  sessionCount: number;
  avgPerSession: string;
  freeDays: string[];
  primarySession: 'SANG' | 'CHIEU';
  classBreakdown: TeacherClassSummaryChip[];
}

export interface TeacherScheduleRowMeta {
  session: 'SANG' | 'CHIEU';
  sessionLabel: string;
  sessionRowSpan: number;
  showSessionCell: boolean;
  period: number;
  isLastRowOfSession: boolean;
}

function getTeacherCampusTuple(
  teacher: Teacher,
  teacherSlots: TimetableSlot[],
  classMap: Map<string, ClassGroup>
): { code: 'THPT' | 'DBK' | 'TK'; name: string; short: string } {
  const c = teacher.campus;
  if (c === 'THCSTK') {
    return {
      code: 'TK',
      name: 'Điểm trường THCS Tân Kiều',
      short: 'Điểm Tân Kiều'
    };
  }
  if (c === 'THCSDBK') {
    return {
      code: 'DBK',
      name: 'Điểm trường THCS Đốc Binh Kiều',
      short: 'Điểm Đốc Binh Kiều'
    };
  }
  if (c === 'THPTDBK') {
    return {
      code: 'THPT',
      name: 'Điểm trường chính (THPT)',
      short: 'Điểm chính (THPT)'
    };
  }

  for (const s of teacherSlots) {
    const cls = classMap.get(s.classId);
    if (cls?.campus === 'THCSTK') {
      return {
        code: 'TK',
        name: 'Điểm trường THCS Tân Kiều',
        short: 'Điểm Tân Kiều'
      };
    }
    if (cls?.level === 'THPT') {
      return {
        code: 'THPT',
        name: 'Điểm trường chính (THPT)',
        short: 'Điểm chính (THPT)'
      };
    }
  }
  return {
    code: 'DBK',
    name: 'Điểm trường THCS Đốc Binh Kiều',
    short: 'Điểm Đốc Binh Kiều'
  };
}

export function buildTeacherPrintItems(
  teachers: Teacher[],
  departments: Department[],
  classes: ClassGroup[],
  timetable: SchoolTimetable | undefined,
  options: {
    campusFilter?: GradeCampusFilter;
    departmentFilter?: string;
    teacherIdFilter?: string;
    onlyActiveTeachers?: boolean;
  } = {}
): TeacherPrintItem[] {
  const {
    campusFilter = 'ALL',
    departmentFilter = 'ALL',
    teacherIdFilter = 'ALL',
    onlyActiveTeachers = true
  } = options;

  const deptMap = new Map(departments.map((d, idx) => [d.id, { dept: d, order: idx }]));
  const classMap = new Map(classes.map(c => [c.id, c]));
  const homeroomByTeacherId = new Map<string, string>();
  classes.forEach(c => {
    if (c.homeroomTeacherId) {
      homeroomByTeacherId.set(c.homeroomTeacherId, c.name);
    }
  });

  const rawSlotsByTeacher = new Map<string, TimetableSlot[]>();
  (timetable?.slots || []).forEach(s => {
    if (!s.teacherId || !s.subjectName) return;
    const list = rawSlotsByTeacher.get(s.teacherId) || [];
    list.push(s);
    rawSlotsByTeacher.set(s.teacherId, list);
  });

  const items: TeacherPrintItem[] = [];

  teachers.forEach(teacher => {
    if (teacherIdFilter !== 'ALL' && teacher.id !== teacherIdFilter) return;
    if (departmentFilter !== 'ALL' && teacher.departmentId !== departmentFilter) return;

    const teacherSlots = rawSlotsByTeacher.get(teacher.id) || [];
    if (onlyActiveTeachers && teacherIdFilter === 'ALL' && teacherSlots.length === 0) {
      return;
    }

    const campusTuple = getTeacherCampusTuple(teacher, teacherSlots, classMap);

    if (campusFilter !== 'ALL' && teacherIdFilter === 'ALL') {
      const teachesInCampus = teacherSlots.some(s => {
        const cls = classMap.get(s.classId);
        if (!cls) return false;
        if (campusFilter === 'THPT') return cls.level === 'THPT' || cls.campus === 'THPTDBK';
        if (campusFilter === 'TK') return cls.campus === 'THCSTK';
        return cls.level !== 'THPT' && cls.campus !== 'THCSTK';
      });
      if (campusTuple.code !== campusFilter && !teachesInCampus) {
        return;
      }
    }

    const slotByDaySessionPeriod = new Map<string, TimetableSlot[]>();
    const sessionSet = new Set<string>();
    const teachingDaySet = new Set<number>();
    let sangCount = 0;
    let chieuCount = 0;

    const classSubMap = new Map<
      string,
      { className: string; subjectName: string; subjectId?: string; count: number }
    >();

    teacherSlots.forEach(s => {
      const key = `${s.dayOfWeek}_${s.session}_${s.period}`;
      const arr = slotByDaySessionPeriod.get(key) || [];
      arr.push(s);
      slotByDaySessionPeriod.set(key, arr);

      sessionSet.add(`${s.dayOfWeek}_${s.session}`);
      teachingDaySet.add(s.dayOfWeek);
      if (s.session === 'SANG') sangCount++;
      else chieuCount++;

      const targetCls = classMap.get(s.classId);
      const clsName = targetCls?.name || s.className || '';
      const subName = getUnifiedSubjectName(s);
      const csKey = `${clsName}__${subName}`;
      const existing = classSubMap.get(csKey) || {
        className: clsName,
        subjectName: subName,
        subjectId: s.subjectId,
        count: 0
      };
      existing.count++;
      classSubMap.set(csKey, existing);
    });

    const freeDays = DAYS_OF_WEEK.filter(d => !teachingDaySet.has(d.value)).map(d => d.shortLabel);
    const totalPeriods = teacherSlots.length;
    const sessionCount = sessionSet.size;
    const avgPerSession = sessionCount > 0 ? (totalPeriods / sessionCount).toFixed(1) : '0';

    const classBreakdown = Array.from(classSubMap.values())
      .sort(
        (a, b) =>
          a.className.localeCompare(b.className, 'vi', { numeric: true }) ||
          b.count - a.count
      )
      .map(entry => ({
        className: entry.className,
        subjectName: entry.subjectName,
        count: entry.count,
        theme: getClassColorTheme(entry.className)
      }));

    const deptEntry = deptMap.get(teacher.departmentId);

    items.push({
      teacher,
      cleanName: resolveCleanTeacherName(
        {
          id: '',
          classId: '',
          className: '',
          dayOfWeek: 2,
          session: 'SANG',
          period: 1,
          subjectId: '',
          subjectName: '',
          teacherId: teacher.id,
          teacherName: teacher.name,
          teacherCode: teacher.code
        },
        new Map([[teacher.id, teacher]]),
        teachers
      ),
      campusCode: campusTuple.code,
      campusName: campusTuple.name,
      campusShort: campusTuple.short,
      departmentName: deptEntry?.dept.name || 'Chuyên môn',
      homeroomClassName: homeroomByTeacherId.get(teacher.id) || null,
      slots: teacherSlots,
      slotByDaySessionPeriod,
      totalPeriods,
      sessionCount,
      avgPerSession,
      freeDays,
      primarySession: chieuCount > sangCount ? 'CHIEU' : 'SANG',
      classBreakdown
    });
  });

  items.sort((a, b) => {
    const orderA = deptMap.get(a.teacher.departmentId)?.order ?? 99;
    const orderB = deptMap.get(b.teacher.departmentId)?.order ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.teacher.name.localeCompare(b.teacher.name, 'vi');
  });

  return items;
}

export function buildTeacherScheduleRows(
  item: TeacherPrintItem,
  sessionMode: GradeSessionExportMode = 'SMART_A4'
): TeacherScheduleRowMeta[] {
  const hasSlotAt = (sess: 'SANG' | 'CHIEU', period: number): boolean => {
    return DAYS_OF_WEEK.some(d => {
      const arr = item.slotByDaySessionPeriod.get(`${d.value}_${sess}_${period}`);
      return Boolean(arr && arr.length > 0);
    });
  };

  const sessions: { session: 'SANG' | 'CHIEU'; periods: number[] }[] = [];

  if (sessionMode === 'SANG') {
    sessions.push({ session: 'SANG', periods: [...PERIODS] });
  } else if (sessionMode === 'CHIEU') {
    sessions.push({ session: 'CHIEU', periods: [...PERIODS] });
  } else if (sessionMode === 'MAIN_ONLY') {
    sessions.push({ session: item.primarySession, periods: [...PERIODS] });
  } else if (sessionMode === 'ALL') {
    sessions.push({ session: 'SANG', periods: [...PERIODS] });
    sessions.push({ session: 'CHIEU', periods: [...PERIODS] });
  } else {
    const sangActive = PERIODS.filter(p => hasSlotAt('SANG', p));
    const chieuActive = PERIODS.filter(p => hasSlotAt('CHIEU', p));

    if (sangActive.length > 0 && chieuActive.length === 0) {
      sessions.push({ session: 'SANG', periods: [...PERIODS] });
    } else if (chieuActive.length > 0 && sangActive.length === 0) {
      sessions.push({ session: 'CHIEU', periods: [...PERIODS] });
    } else if (sangActive.length > 0 && chieuActive.length > 0) {
      if (item.primarySession === 'SANG') {
        sessions.push({ session: 'SANG', periods: [...PERIODS] });
        sessions.push({ session: 'CHIEU', periods: chieuActive });
      } else {
        sessions.push({ session: 'SANG', periods: sangActive });
        sessions.push({ session: 'CHIEU', periods: [...PERIODS] });
      }
    } else {
      sessions.push({ session: 'SANG', periods: [...PERIODS] });
    }
  }

  const rows: TeacherScheduleRowMeta[] = [];
  sessions.forEach(sessGroup => {
    const sessLabel = sessGroup.session === 'SANG' ? 'Sáng' : 'Chiều';
    sessGroup.periods.forEach((p, idx) => {
      rows.push({
        session: sessGroup.session,
        sessionLabel: sessLabel,
        sessionRowSpan: sessGroup.periods.length,
        showSessionCell: idx === 0,
        period: p,
        isLastRowOfSession: idx === sessGroup.periods.length - 1
      });
    });
  });

  return rows;
}
