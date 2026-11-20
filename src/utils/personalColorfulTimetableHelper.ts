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
export type PersonalColorIntensity = 'RAINBOW' | 'PASTEL';

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

export interface DayRainbowTheme {
  dayValue: number;
  headerBg: string;
  headerGradient: string;
  headerText: string;
  accentHex: string;
  colTint: string;
}

export const DAY_RAINBOW_THEMES: Record<number, DayRainbowTheme> = {
  2: {
    dayValue: 2,
    headerBg: '#2563EB',
    headerGradient: 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)',
    headerText: '#FFFFFF',
    accentHex: '#2563EB',
    colTint: '#F8FBFF'
  },
  3: {
    dayValue: 3,
    headerBg: '#059669',
    headerGradient: 'linear-gradient(135deg, #059669 0%, #34D399 100%)',
    headerText: '#FFFFFF',
    accentHex: '#059669',
    colTint: '#F6FEF9'
  },
  4: {
    dayValue: 4,
    headerBg: '#7C3AED',
    headerGradient: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
    headerText: '#FFFFFF',
    accentHex: '#7C3AED',
    colTint: '#FAF7FF'
  },
  5: {
    dayValue: 5,
    headerBg: '#EA580C',
    headerGradient: 'linear-gradient(135deg, #EA580C 0%, #FB923C 100%)',
    headerText: '#FFFFFF',
    accentHex: '#EA580C',
    colTint: '#FFF9F4'
  },
  6: {
    dayValue: 6,
    headerBg: '#E11D48',
    headerGradient: 'linear-gradient(135deg, #E11D48 0%, #FB7185 100%)',
    headerText: '#FFFFFF',
    accentHex: '#E11D48',
    colTint: '#FFF7F9'
  },
  7: {
    dayValue: 7,
    headerBg: '#0D9488',
    headerGradient: 'linear-gradient(135deg, #0D9488 0%, #2DD4BF 100%)',
    headerText: '#FFFFFF',
    accentHex: '#0D9488',
    colTint: '#F4FEFC'
  }
};

export const VIVID_MULTI_PALETTE: SubjectColorTheme[] = [
  {
    id: 'sky',
    bg: '#DFF2FE',
    bgSoft: '#F0F9FF',
    border: '#38BDF8',
    accent: '#0284C7',
    titleColor: '#0369A1',
    subColor: '#0C4A6E',
    pillBg: '#BAE6FD',
    pillText: '#075985'
  },
  {
    id: 'rose',
    bg: '#FFE4EA',
    bgSoft: '#FFF1F3',
    border: '#FB7185',
    accent: '#E11D48',
    titleColor: '#BE123C',
    subColor: '#881337',
    pillBg: '#FECDD3',
    pillText: '#9F1239'
  },
  {
    id: 'violet',
    bg: '#EFE7FF',
    bgSoft: '#F7F3FF',
    border: '#A78BFA',
    accent: '#7C3AED',
    titleColor: '#6D28D9',
    subColor: '#4C1D95',
    pillBg: '#DDD6FE',
    pillText: '#5B21B6'
  },
  {
    id: 'emerald',
    bg: '#D7FCE4',
    bgSoft: '#ECFDF5',
    border: '#34D399',
    accent: '#059669',
    titleColor: '#047857',
    subColor: '#064E3B',
    pillBg: '#A7F3D0',
    pillText: '#065F46'
  },
  {
    id: 'amber',
    bg: '#FEF0C7',
    bgSoft: '#FFFBEB',
    border: '#FBBF24',
    accent: '#D97706',
    titleColor: '#B45309',
    subColor: '#78350F',
    pillBg: '#FDE68A',
    pillText: '#92400E'
  },
  {
    id: 'orange',
    bg: '#FFE8D6',
    bgSoft: '#FFF7ED',
    border: '#FB923C',
    accent: '#EA580C',
    titleColor: '#C2410C',
    subColor: '#7C2D12',
    pillBg: '#FED7AA',
    pillText: '#9A3412'
  },
  {
    id: 'teal',
    bg: '#CEFBF4',
    bgSoft: '#F0FDFA',
    border: '#2DD4BF',
    accent: '#0D9488',
    titleColor: '#0F766E',
    subColor: '#134E4A',
    pillBg: '#99F6E4',
    pillText: '#115E59'
  },
  {
    id: 'fuchsia',
    bg: '#FCE4FF',
    bgSoft: '#FDF4FF',
    border: '#E879F9',
    accent: '#C026D3',
    titleColor: '#A21CAF',
    subColor: '#701A75',
    pillBg: '#F5D0FE',
    pillText: '#86198F'
  },
  {
    id: 'indigo',
    bg: '#E0E7FF',
    bgSoft: '#EEF2FF',
    border: '#818CF8',
    accent: '#4F46E5',
    titleColor: '#4338CA',
    subColor: '#312E81',
    pillBg: '#C7D2FE',
    pillText: '#3730A3'
  },
  {
    id: 'lime',
    bg: '#E9FCCB',
    bgSoft: '#F7FEE7',
    border: '#A3E635',
    accent: '#65A30D',
    titleColor: '#4D7C0F',
    subColor: '#365314',
    pillBg: '#D9F99D',
    pillText: '#3F6212'
  },
  {
    id: 'cyan',
    bg: '#CFFAFE',
    bgSoft: '#ECFEFF',
    border: '#22D3EE',
    accent: '#0891B2',
    titleColor: '#0E7490',
    subColor: '#164E63',
    pillBg: '#A5F3FC',
    pillText: '#155E75'
  },
  {
    id: 'pink',
    bg: '#FCE7F3',
    bgSoft: '#FDF2F8',
    border: '#F472B6',
    accent: '#DB2777',
    titleColor: '#BE185D',
    subColor: '#831843',
    pillBg: '#FBCFE8',
    pillText: '#9D174D'
  }
];

const SUBJECT_COLOR_BY_ID: Record<string, SubjectColorTheme> = {
  'sub-toan': VIVID_MULTI_PALETTE[0],       // Sky
  'sub-van': VIVID_MULTI_PALETTE[1],        // Rose
  'sub-anh': VIVID_MULTI_PALETTE[2],        // Violet
  'sub-li': VIVID_MULTI_PALETTE[8],         // Indigo
  'sub-hoa': VIVID_MULTI_PALETTE[6],        // Teal
  'sub-sinh': VIVID_MULTI_PALETTE[3],       // Emerald
  'sub-khtn-cs': VIVID_MULTI_PALETTE[10],   // Cyan
  'sub-su': VIVID_MULTI_PALETTE[4],         // Amber
  'sub-dia': VIVID_MULTI_PALETTE[5],        // Orange
  'sub-lsdl-cs': {
    id: 'gold',
    bg: '#FEF9C3',
    bgSoft: '#FEFCE8',
    border: '#FACC15',
    accent: '#CA8A04',
    titleColor: '#A16207',
    subColor: '#713F12',
    pillBg: '#FEF08A',
    pillText: '#854D0E'
  },
  'sub-gdcd': VIVID_MULTI_PALETTE[7],       // Fuchsia
  'sub-gdktpl': VIVID_MULTI_PALETTE[7],     // Fuchsia
  'sub-tin': {
    id: 'cobalt',
    bg: '#DBEAFE',
    bgSoft: '#EFF6FF',
    border: '#60A5FA',
    accent: '#2563EB',
    titleColor: '#1D4ED8',
    subColor: '#1E3A8A',
    pillBg: '#BFDBFE',
    pillText: '#1E40AF'
  },
  'sub-cn': VIVID_MULTI_PALETTE[9],         // Lime
  'sub-gdtc': {
    id: 'coral-red',
    bg: '#FEE2E2',
    bgSoft: '#FEF2F2',
    border: '#F87171',
    accent: '#DC2626',
    titleColor: '#B91C1C',
    subColor: '#7F1D1D',
    pillBg: '#FECACA',
    pillText: '#991B1B'
  },
  'sub-qpan': {
    id: 'forest',
    bg: '#D1FAE5',
    bgSoft: '#ECFDF5',
    border: '#10B981',
    accent: '#047857',
    titleColor: '#065F46',
    subColor: '#064E3B',
    pillBg: '#A7F3D0',
    pillText: '#065F46'
  },
  'sub-am-nhac': VIVID_MULTI_PALETTE[11],   // Pink
  'sub-my-thuat': {
    id: 'watermelon',
    bg: '#FFE4E6',
    bgSoft: '#FFF1F2',
    border: '#FB7185',
    accent: '#F43F5E',
    titleColor: '#E11D48',
    subColor: '#881337',
    pillBg: '#FECDD3',
    pillText: '#9F1239'
  },
  'sub-gddp': {
    id: 'turquoise',
    bg: '#D5F7FF',
    bgSoft: '#ECFEFF',
    border: '#06B6D4',
    accent: '#0891B2',
    titleColor: '#0E7490',
    subColor: '#164E63',
    pillBg: '#A5F3FC',
    pillText: '#155E75'
  },
  'sub-hdtn-cd': {
    id: 'lavender',
    bg: '#EDE9FE',
    bgSoft: '#F5F3FF',
    border: '#A78BFA',
    accent: '#7C3AED',
    titleColor: '#5B21B6',
    subColor: '#4C1D95',
    pillBg: '#DDD6FE',
    pillText: '#5B21B6'
  },
  'sub-chao-co': {
    id: 'festival-gold',
    bg: '#FEF08A',
    bgSoft: '#FEF9C3',
    border: '#EF4444',
    accent: '#DC2626',
    titleColor: '#B91C1C',
    subColor: '#991B1B',
    pillBg: '#FDE047',
    pillText: '#991B1B'
  },
  'sub-shl': {
    id: 'mint-jade',
    bg: '#CCFBF1',
    bgSoft: '#F0FDFA',
    border: '#14B8A6',
    accent: '#0D9488',
    titleColor: '#0F766E',
    subColor: '#115E59',
    pillBg: '#99F6E4',
    pillText: '#115E59'
  },
  'sub-ai': {
    id: 'electric-ai',
    bg: '#E0E7FF',
    bgSoft: '#EEF2FF',
    border: '#0EA5E9',
    accent: '#0284C7',
    titleColor: '#0369A1',
    subColor: '#1E3A8A',
    pillBg: '#BAE6FD',
    pillText: '#075985'
  }
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

  // Fallback by taught slots
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
    // SMART_A4: full 5 periods of primary session + active periods in secondary session (or full if both rich)
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
