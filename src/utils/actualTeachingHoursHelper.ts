import {
  SchoolConfig,
  Teacher,
  Department,
  ClassGroup,
  Subject,
  TimetableSlot,
  SchoolTimetable,
} from '../types';
import { OFFICIAL_WEEK_2_SLOTS } from '../data/officialWeek2Timetable';
import {
  KHTN_8_WEEKS,
  KHTN_9_WEEKS,
  KHTN_8_CLASS_ASSIGNMENTS,
  KHTN_9_CLASS_ASSIGNMENTS,
} from '../data/khtnCurriculumSchedule';
import {
  CONG_NGHE_8_WEEKS,
  CONG_NGHE_9_WEEKS,
  CONG_NGHE_8_CLASS_ASSIGNMENTS,
  CONG_NGHE_9_CLASS_ASSIGNMENTS,
} from '../data/congNgheCurriculumSchedule';

export interface TeacherSubjectRow {
  classes: string;
  classList: string[];
  subject: string;
  periods: number;
}

export interface TeacherActualWorkload {
  teacherId: string;
  teacherName: string;
  callingName: string;
  teacherCode: string;
  departmentId: string;
  departmentName: string;
  campus: string;
  level: 'THPT' | 'THCS';
  role: string;

  // Detail rows for the selected week
  rows: TeacherSubjectRow[];

  // Kiêm nhiệm info
  duties: string;
  dutyList: string[];
  reductionPeriods: number;

  // Calculations for selected week
  teachingPeriods: number;
  totalPeriods: number;
  standardPeriods: number;
  weeklyBalance: number;

  // Cumulative to selected week
  cumulativeBalance: number;

  // Multi-week breakdown
  weeklyTotals: Record<number, number>;
  weeklyTeaching: Record<number, number>;
  weeklyBalances: Record<number, number>;
  semesterTotalTeaching: number;
  semesterTotalPeriods: number;
  semesterRequiredPeriods: number;
  semesterBalance: number;
}

/**
 * Format subject display name cleanly
 */
export function formatActualSubjectName(subName: string): string {
  if (!subName) return 'Khác';
  const s = subName.trim();
  if (
    s.includes('HĐTN') ||
    s.includes('HĐ TN') ||
    s.includes('Hoạt động trải nghiệm')
  ) {
    return 'Hoạt động trải nghiệm hướng nghiệp';
  }
  if (s === 'Toán học') return 'Toán';
  if (s.includes('GD QP') || s.includes('GDQP')) {
    return 'GD Quốc phòng & An ninh';
  }
  if (s.includes('GD KTPL') || s.includes('GDKT&PL') || s.includes('GDKT & PL')) {
    return 'Giáo dục kinh tế & Pháp luật';
  }
  return s;
}

/**
 * Adjust KHTN slots for Grade 8 and Grade 9 according to the weekly curriculum distribution
 */
export function adjustKhtnSlotsForWeek(
  baseSlots: TimetableSlot[],
  weekNumber: number
): TimetableSlot[] {
  const dist8 = KHTN_8_WEEKS[weekNumber] || { ly: 1, sinh: 1, hoa: 2 };
  const dist9 = KHTN_9_WEEKS[weekNumber] || { ly: 1, sinh: 1, hoa: 2 };

  const k89ClassIds = new Set([
    ...KHTN_8_CLASS_ASSIGNMENTS.map((c) => c.classId),
    ...KHTN_9_CLASS_ASSIGNMENTS.map((c) => c.classId),
  ]);

  // Keep non-KHTN slots for Grade 8 and 9, and keep all slots for other classes
  const nonKhtnSlots = baseSlots.filter((s) => {
    if (!k89ClassIds.has(s.classId)) return true;
    const sub = (s.subjectId || '').toLowerCase();
    const name = (s.subjectName || '').toLowerCase();
    const isKhtn =
      sub.includes('khtn') ||
      sub.includes('li') ||
      sub.includes('hoa') ||
      sub.includes('sinh') ||
      name.includes('khoa học tự nhiên') ||
      name.includes('vật lí') ||
      name.includes('hóa học') ||
      name.includes('sinh học') ||
      name.includes('khtn');
    return !isKhtn;
  });

  const adaptedSlots: TimetableSlot[] = [...nonKhtnSlots];

  // Add precise slots for Grade 8
  for (const c of KHTN_8_CLASS_ASSIGNMENTS) {
    for (let i = 0; i < dist8.ly; i++) {
      adaptedSlots.push({
        id: `slot-khtn8-ly-${c.classId}-w${weekNumber}-${i}`,
        classId: c.classId,
        className: c.className,
        teacherId: c.lyTeacherId,
        subjectId: 'sub-li',
        subjectName: 'Vật lí (KHTN)',
        dayOfWeek: 2 + i,
        session: 'SANG',
        period: 1,
      });
    }
    for (let i = 0; i < dist8.hoa; i++) {
      adaptedSlots.push({
        id: `slot-khtn8-hoa-${c.classId}-w${weekNumber}-${i}`,
        classId: c.classId,
        className: c.className,
        teacherId: c.hoaTeacherId,
        subjectId: 'sub-hoa',
        subjectName: 'Hóa học (KHTN)',
        dayOfWeek: 2 + i,
        session: 'SANG',
        period: 2,
      });
    }
    for (let i = 0; i < dist8.sinh; i++) {
      adaptedSlots.push({
        id: `slot-khtn8-sinh-${c.classId}-w${weekNumber}-${i}`,
        classId: c.classId,
        className: c.className,
        teacherId: c.sinhTeacherId,
        subjectId: 'sub-sinh',
        subjectName: 'Sinh học (KHTN)',
        dayOfWeek: 3 + i,
        session: 'SANG',
        period: 3,
      });
    }
  }

  // Add precise slots for Grade 9
  for (const c of KHTN_9_CLASS_ASSIGNMENTS) {
    for (let i = 0; i < dist9.ly; i++) {
      adaptedSlots.push({
        id: `slot-khtn9-ly-${c.classId}-w${weekNumber}-${i}`,
        classId: c.classId,
        className: c.className,
        teacherId: c.lyTeacherId,
        subjectId: 'sub-li',
        subjectName: 'Vật lí (KHTN)',
        dayOfWeek: 2 + i,
        session: 'SANG',
        period: 1,
      });
    }
    for (let i = 0; i < dist9.hoa; i++) {
      adaptedSlots.push({
        id: `slot-khtn9-hoa-${c.classId}-w${weekNumber}-${i}`,
        classId: c.classId,
        className: c.className,
        teacherId: c.hoaTeacherId,
        subjectId: 'sub-hoa',
        subjectName: 'Hóa học (KHTN)',
        dayOfWeek: 2 + i,
        session: 'SANG',
        period: 2,
      });
    }
    for (let i = 0; i < dist9.sinh; i++) {
      adaptedSlots.push({
        id: `slot-khtn9-sinh-${c.classId}-w${weekNumber}-${i}`,
        classId: c.classId,
        className: c.className,
        teacherId: c.sinhTeacherId,
        subjectId: 'sub-sinh',
        subjectName: 'Sinh học (KHTN)',
        dayOfWeek: 3 + i,
        session: 'SANG',
        period: 3,
      });
    }
  }

  return adaptedSlots;
}

/**
 * Adjust Công nghệ slots for Grade 8 and Grade 9 according to the 52-period annual curriculum:
 * - Khối 8 (52t/năm): HK1 = 26t (T1-8 dạy 2t/w, T9-18 dạy 1t/w); HK2 = 26t (T19-27 dạy 2t/w, T28-35 dạy 1t/w)
 * - Khối 9 (52t/năm): HK1 = 18t (T1-18 dạy 1t/w); HK2 = 34t (T19-35 dạy 2t/w)
 */
export function adjustCongNgheSlotsForWeek(
  baseSlots: TimetableSlot[],
  weekNumber: number
): TimetableSlot[] {
  const p8 = CONG_NGHE_8_WEEKS[weekNumber] ?? (weekNumber <= 8 ? 2 : 1);
  const p9 = CONG_NGHE_9_WEEKS[weekNumber] ?? (weekNumber <= 18 ? 1 : 2);

  const k89ClassIds = new Set([
    ...CONG_NGHE_8_CLASS_ASSIGNMENTS.map((c) => c.classId),
    ...CONG_NGHE_9_CLASS_ASSIGNMENTS.map((c) => c.classId),
  ]);

  // Filter out existing Công nghệ slots for Grade 8 and 9, keep other slots
  const nonCnSlots = baseSlots.filter((s) => {
    if (!k89ClassIds.has(s.classId)) return true;
    const sub = (s.subjectId || '').toLowerCase();
    const name = (s.subjectName || '').toLowerCase();
    const isCn = sub === 'sub-cn' || name.includes('công nghệ') || name.includes('c.nghệ');
    return !isCn;
  });

  const adaptedSlots: TimetableSlot[] = [...nonCnSlots];

  // Add precise slots for Grade 8
  for (const c of CONG_NGHE_8_CLASS_ASSIGNMENTS) {
    for (let i = 0; i < p8; i++) {
      adaptedSlots.push({
        id: `slot-cn8-${c.classId}-w${weekNumber}-${i}`,
        classId: c.classId,
        className: c.className,
        teacherId: c.teacherId,
        subjectId: 'sub-cn',
        subjectName: 'Công nghệ',
        dayOfWeek: 2 + i * 2,
        session: 'SANG',
        period: 4,
      });
    }
  }

  // Add precise slots for Grade 9
  for (const c of CONG_NGHE_9_CLASS_ASSIGNMENTS) {
    for (let i = 0; i < p9; i++) {
      adaptedSlots.push({
        id: `slot-cn9-${c.classId}-w${weekNumber}-${i}`,
        classId: c.classId,
        className: c.className,
        teacherId: c.teacherId,
        subjectId: 'sub-cn',
        subjectName: 'Công nghệ',
        dayOfWeek: 3 + i * 2,
        session: 'SANG',
        period: 4,
      });
    }
  }

  return adaptedSlots;
}

/**
 * Get timetable slots for a specific week
 */
export function getSlotsForWeek(
  weekNumber: number,
  weeklyTimetables?: Record<number, SchoolTimetable>,
  fallbackTimetable?: SchoolTimetable
): TimetableSlot[] {
  let baseSlots: TimetableSlot[] = [];
  if (weeklyTimetables && weeklyTimetables[weekNumber]?.slots?.length > 0) {
    baseSlots = weeklyTimetables[weekNumber].slots;
  } else if (weekNumber === 2 && OFFICIAL_WEEK_2_SLOTS?.length > 0) {
    baseSlots = OFFICIAL_WEEK_2_SLOTS;
  } else if (weeklyTimetables && weeklyTimetables[1]?.slots?.length > 0) {
    baseSlots = weeklyTimetables[1].slots;
  } else if (fallbackTimetable?.slots?.length > 0) {
    baseSlots = fallbackTimetable.slots;
  } else if (OFFICIAL_WEEK_2_SLOTS?.length > 0) {
    baseSlots = OFFICIAL_WEEK_2_SLOTS;
  }

  if (baseSlots.length === 0) return [];

  const khtnAdjusted = adjustKhtnSlotsForWeek(baseSlots, weekNumber);
  return adjustCongNgheSlotsForWeek(khtnAdjusted, weekNumber);
}

/**
 * Extract actual teaching assignments & duty reductions for a single teacher in a specific week
 */
export function calculateTeacherSingleWeek(
  teacher: Teacher,
  weekNumber: number,
  slots: TimetableSlot[],
  classes: ClassGroup[],
  departments: Department[],
  config: SchoolConfig,
  classMap: Map<string, ClassGroup>,
  homeroomMap: Map<string, ClassGroup>
): {
  rows: TeacherSubjectRow[];
  duties: string;
  dutyList: string[];
  reductionPeriods: number;
  teachingPeriods: number;
  totalPeriods: number;
  standardPeriods: number;
  weeklyBalance: number;
  level: 'THPT' | 'THCS';
} {
  const isTHPT =
    teacher.campus === 'THPTDBK' ||
    teacher.baseStandardPeriods === 17 ||
    slots.some(
      (s) =>
        s.teacherId === teacher.id &&
        s.className &&
        (s.className.startsWith('10') ||
          s.className.startsWith('11') ||
          s.className.startsWith('12'))
    );
  const level: 'THPT' | 'THCS' = isTHPT ? 'THPT' : 'THCS';

  // Specific leadership and role teaching quotas per government regulations & school rules:
  // 4 Người lãnh đạo (Ban Giám Hiệu):
  // - Hiệu trưởng: Thầy Lê Thanh Cường (Định mức 2 tiết/tuần)
  // - 3 Phó Hiệu trưởng: Nguyễn Minh Trí, Phan Thanh Thảo, Nguyễn Thanh Tòng (Định mức 4 tiết/tuần)
  // Lãnh đạo không tính tiết kiêm nhiệm vì định mức đã rất thấp (2t và 4t), không có kiêm nhiệm + tiết.
  const isHT =
    teacher.id === 'tch-bgh-1' ||
    teacher.name === 'Lê Thanh Cường' ||
    teacher.code === 'Cường.LT (HT)' ||
    (teacher.role === 'HieuTruong' && teacher.name === 'Lê Thanh Cường');

  const isPHT =
    !isHT &&
    (teacher.id === 'tch-bgh-2' ||
      teacher.id === 'tch-bgh-3' ||
      teacher.id === 'tch-bgh-4' ||
      teacher.name === 'Nguyễn Minh Trí' ||
      teacher.name === 'Phan Thanh Thảo' ||
      teacher.name === 'Nguyễn Thanh Tòng' ||
      teacher.code === 'Trí.NM (PHT)' ||
      teacher.code === 'Thảo.PT (PHT)' ||
      teacher.code === 'Tòng.NT (PHT)');

  const isLeader = isHT || isPHT;

  const isTPT =
    teacher.role === 'TongPhuTrachDoi' ||
    teacher.code?.includes('(TPT') ||
    teacher.notes?.toLowerCase().includes('tổng phụ trách') ||
    teacher.duties?.some((d) => d.type === 'TongPhuTrachDoi') ||
    teacher.baseStandardPeriods === 6;

  let standardPeriods = isTHPT
    ? config.standardThptPeriods || 17
    : config.standardThcsPeriods || 19;

  if (isHT) {
    standardPeriods = 2;
  } else if (isPHT) {
    standardPeriods = 4;
  } else if (isTPT) {
    standardPeriods = 6;
  } else if (teacher.baseStandardPeriods && teacher.baseStandardPeriods < standardPeriods) {
    standardPeriods = teacher.baseStandardPeriods;
  }

  const isHomeroom = homeroomMap.has(teacher.id);
  const hrClass = homeroomMap.get(teacher.id);

  // Filter slots for this teacher in this week
  const tSlots = slots.filter((s) => s.teacherId === teacher.id);

  // Exclude homeroom non-teaching slots if teacher is homeroom teacher
  const teachingSlots = tSlots.filter((s) => {
    if (isHomeroom) {
      if (s.subjectId === 'sub-chao-co' || s.subjectName === 'Chào cờ') return false;
      if (s.subjectId === 'sub-shl' || s.subjectName === 'Sinh hoạt lớp') return false;
    }
    return true;
  });

  // Count occurrences by class & raw subject
  const classSubCount = new Map<
    string,
    { classId: string; className: string; subjectName: string; count: number }
  >();

  teachingSlots.forEach((s) => {
    const clsName = s.className || classMap.get(s.classId)?.name || 'Lớp';
    const subName = s.subjectName || 'Môn';
    const key = `${s.classId || clsName}_${subName}`;
    if (!classSubCount.has(key)) {
      classSubCount.set(key, {
        classId: s.classId,
        className: clsName,
        subjectName: subName,
        count: 0,
      });
    }
    classSubCount.get(key)!.count++;
  });

  // Group into display subjects (handling Chuyên đề vs Core)
  const groups = new Map<string, { classes: Set<string>; periods: number }>();

  function addGroup(displayName: string, className: string, count: number) {
    if (!groups.has(displayName)) {
      groups.set(displayName, { classes: new Set(), periods: 0 });
    }
    groups.get(displayName)!.classes.add(className);
    groups.get(displayName)!.periods += count;
  }

  for (const item of classSubCount.values()) {
    const cls = classMap.get(item.classId);
    const subFormatted = formatActualSubjectName(item.subjectName);

    // Check if this class has a special topic (Chuyên đề học tập) taught by this teacher
    let hasSpecialTopic = false;
    if (cls && (cls.level === 'THPT' || cls.grade === '10' || cls.grade === '11' || cls.grade === '12') && cls.specialTopics) {
      for (const cd of Object.values(cls.specialTopics)) {
        if (cd && cd.teacherId === teacher.id) {
          const matchVan =
            (cd.title === 'Văn' || cd.title === 'Ngữ văn') &&
            subFormatted === 'Ngữ văn';
          const matchToan =
            (cd.title === 'Toán' || cd.title === 'Toán học') &&
            subFormatted === 'Toán';
          const matchSu =
            (cd.title === 'Lịch sử' || cd.title === 'Sử') &&
            subFormatted === 'Lịch sử';
          const matchLy =
            (cd.title === 'Vật lí' || cd.title === 'Vật lý') &&
            subFormatted.includes('Vật lí');
          const matchHoa =
            cd.title === 'Hóa học' && subFormatted.includes('Hóa học');
          const matchSinh =
            cd.title === 'Sinh học' && subFormatted.includes('Sinh học');
          const matchTin =
            cd.title === 'Tin học' && subFormatted.includes('Tin học');

          if (
            matchVan ||
            matchToan ||
            matchSu ||
            matchLy ||
            matchHoa ||
            matchSinh ||
            matchTin
          ) {
            hasSpecialTopic = true;
            break;
          }
        }
      }
    }

    if (hasSpecialTopic && item.count > 1) {
      const cdSubjectName = `Chuyên đề học tập môn ${subFormatted}`;
      addGroup(cdSubjectName, item.className, 1);
      addGroup(subFormatted, item.className, item.count - 1);
    } else {
      addGroup(subFormatted, item.className, item.count);
    }
  }

  // Calculate duty reductions (Kiêm nhiệm) per official rules:
  // - Tổ trưởng: +3 tiết/tuần
  // - Tổ phó: +1 tiết/tuần
  // - Phổ cập: +4 tiết/tuần
  // - Con nhỏ: +3 tiết/tuần
  // - Phó Bí thư đoàn trường: +6 tiết/tuần
  // - Bí thư đoàn trường: +12 tiết/tuần
  // - Giáo viên chủ nhiệm (GVCN): +4 tiết/tuần
  const dutyList: string[] = [];
  let reductionPeriods = 0;

  // Lãnh đạo (Hiệu trưởng 2t, Phó Hiệu trưởng 4t) KHÔNG tính tiết kiêm nhiệm vì định mức đã rất thấp.
  // Xóa bỏ phần kiêm nhiệm và + tiết của lãnh đạo theo đúng chỉ đạo.
  if (!isLeader) {
    if (isTPT) {
      dutyList.push('TPT Đội');
    }

    // 2. Kiểm tra danh sách kiêm nhiệm chính thức (teacher.duties)
    if (teacher.duties && teacher.duties.length > 0) {
      teacher.duties.forEach((d) => {
        // Loại bỏ nếu có nhầm lẫn loại HieuTruong / PhoHieuTruong trong duties
        if (d.type === 'HieuTruong' || d.type === 'PhoHieuTruong') return;
        let red = d.reductionPeriods;
        if (red === undefined || red === null) {
          if (d.type === 'ToTruong') red = 3;
          else if (d.type === 'ToPho') red = 1;
          else if (d.type === 'PhoCap') red = 4;
          else if (d.type === 'ConNho') red = 3;
          else if (d.type === 'PhoBiThuDoan') red = 6;
          else if (d.type === 'BiThuDoan') red = 12;
          else red = 0;
        }
        reductionPeriods += red;
        const label = d.type === 'ToTruong' ? 'Tổ trưởng' :
                      d.type === 'ToPho' ? 'Tổ phó' :
                      d.type === 'PhoCap' ? 'Phổ cập' :
                      d.type === 'ConNho' ? 'Con nhỏ' :
                      d.type === 'PhoBiThuDoan' ? 'Phó Bí thư đoàn' :
                      d.type === 'BiThuDoan' ? 'Bí thư đoàn' : d.name;
        if (!dutyList.includes(label)) {
          dutyList.push(label);
        }
      });
    } else {
      // Dự phòng khi chưa có mảng duties
      if (teacher.role === 'ToTruong' || teacher.code?.includes('(TT')) {
        if (!dutyList.includes('Tổ trưởng')) dutyList.push('Tổ trưởng');
        reductionPeriods += 3;
      } else if (teacher.role === 'ToPho' || teacher.code?.includes('(TP')) {
        if (!dutyList.includes('Tổ phó')) dutyList.push('Tổ phó');
        reductionPeriods += 1;
      }

      if (teacher.role === 'PhoBiThuDoan' || teacher.code?.includes('(PBT')) {
        if (!dutyList.includes('Phó Bí thư đoàn')) dutyList.push('Phó Bí thư đoàn');
        reductionPeriods += 6;
      } else if (teacher.role === 'BiThuDoan' || teacher.code?.includes('(BT')) {
        if (!dutyList.includes('Bí thư đoàn')) dutyList.push('Bí thư đoàn');
        reductionPeriods += 12;
      }

      if (teacher.role === 'PhoCap' || teacher.code?.includes('PC-') || teacher.code?.toLowerCase().includes('phổ cập')) {
        if (!dutyList.includes('Phổ cập')) dutyList.push('Phổ cập');
        reductionPeriods += 4;
      }

      if (teacher.role === 'ConNho' || teacher.code?.toLowerCase().includes('con nhỏ')) {
        if (!dutyList.includes('Con nhỏ')) dutyList.push('Con nhỏ');
        reductionPeriods += 3;
      }
    }

    // 3. Giảm trừ tùy biến khác (nếu có)
    if (teacher.customReductionPeriods) {
      reductionPeriods += teacher.customReductionPeriods;
    }

    // 4. Giáo viên chủ nhiệm (GVCN: +4 tiết/tuần không phân biệt cấp THPT hay THCS)
    if (isHomeroom) {
      if (!dutyList.includes('GVCN')) dutyList.push('GVCN');
      reductionPeriods += 4;
    }
  }

  // Convert groups into rows
  const rows: TeacherSubjectRow[] = [];
  // Sort order: Core subjects first, then Chuyên đề, then HĐTN
  const sortedGroupEntries = Array.from(groups.entries()).sort((a, b) => {
    const isCdA = a[0].includes('Chuyên đề');
    const isCdB = b[0].includes('Chuyên đề');
    const isHdA = a[0].includes('Hoạt động trải nghiệm');
    const isHdB = b[0].includes('Hoạt động trải nghiệm');
    if (isCdA && !isCdB) return 1;
    if (!isCdA && isCdB) return -1;
    if (isHdA && !isHdB) return 1;
    if (!isHdA && isHdB) return -1;
    return a[0].localeCompare(b[0], 'vi');
  });

  for (const [subName, g] of sortedGroupEntries) {
    // Sort class names (e.g. 10CB1, 10CB4, 11CB1, 12CB2, ...)
    const sortedClasses = Array.from(g.classes).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b, 'vi');
    });

    rows.push({
      classes: sortedClasses.join(', '),
      classList: sortedClasses,
      subject: subName,
      periods: g.periods,
    });
  }

  const teachingPeriods = rows.reduce((sum, r) => sum + r.periods, 0);
  const totalPeriods = teachingPeriods + reductionPeriods;
  const weeklyBalance = totalPeriods - standardPeriods;

  return {
    rows,
    duties: dutyList.length > 0 ? dutyList.join(', ') : '—',
    dutyList,
    reductionPeriods,
    teachingPeriods,
    totalPeriods,
    standardPeriods,
    weeklyBalance,
    level,
  };
}

/**
 * Calculate all actual teaching workloads for all teachers across weeks
 */
export function calculateAllActualWorkloads(
  selectedWeek: number,
  teachers: Teacher[],
  departments: Department[],
  classes: ClassGroup[],
  subjects: Subject[],
  config: SchoolConfig,
  weeklyTimetables?: Record<number, SchoolTimetable>,
  fallbackTimetable?: SchoolTimetable,
  totalWeeksInSemester: number = 18,
  manualAdjustments: Record<string, number> = {},
  startWeek: number = 1,
  endWeek?: number
): TeacherActualWorkload[] {
  const effectiveEndWeek = endWeek || (startWeek === 19 ? 35 : startWeek + totalWeeksInSemester - 1);
  const totalWeeksInThisSemester = effectiveEndWeek - startWeek + 1;

  const classMap = new Map(classes.map((c) => [c.id, c]));
  const homeroomMap = new Map<string, ClassGroup>();
  classes.forEach((c) => {
    if (c.homeroomTeacherId) {
      homeroomMap.set(c.homeroomTeacherId, c);
    }
  });

  const deptMap = new Map(departments.map((d) => [d.id, d.name]));

  // Cache slots per week to avoid redundant queries
  const weekSlotsCache = new Map<number, TimetableSlot[]>();
  for (let w = startWeek; w <= effectiveEndWeek; w++) {
    weekSlotsCache.set(
      w,
      getSlotsForWeek(w, weeklyTimetables, fallbackTimetable)
    );
  }
  // Also ensure selectedWeek is cached if outside the range
  if (!weekSlotsCache.has(selectedWeek)) {
    weekSlotsCache.set(
      selectedWeek,
      getSlotsForWeek(selectedWeek, weeklyTimetables, fallbackTimetable)
    );
  }

  const results: TeacherActualWorkload[] = [];

  for (const teacher of teachers) {
    const deptName = deptMap.get(teacher.departmentId) || 'Chưa phân tổ';
    const callingName = teacher.name.trim().split(/\s+/).pop() || teacher.name;

    // Calculate details for selected week
    const currentWeekSlots = weekSlotsCache.get(selectedWeek) || [];
    const weekData = calculateTeacherSingleWeek(
      teacher,
      selectedWeek,
      currentWeekSlots,
      classes,
      departments,
      config,
      classMap,
      homeroomMap
    );

    // Calculate multi-week statistics across the semester weeks
    const weeklyTotals: Record<number, number> = {};
    const weeklyTeaching: Record<number, number> = {};
    const weeklyBalances: Record<number, number> = {};
    let semesterTotalTeaching = 0;
    let semesterTotalPeriods = 0;
    let cumulativeBalanceToSelectedWeek = 0;

    for (let w = startWeek; w <= effectiveEndWeek; w++) {
      const wSlots = weekSlotsCache.get(w) || [];
      const wData = calculateTeacherSingleWeek(
        teacher,
        w,
        wSlots,
        classes,
        departments,
        config,
        classMap,
        homeroomMap
      );
      weeklyTotals[w] = wData.totalPeriods;
      weeklyTeaching[w] = wData.teachingPeriods;
      weeklyBalances[w] = wData.weeklyBalance;
      semesterTotalTeaching += wData.teachingPeriods;
      semesterTotalPeriods += wData.totalPeriods;

      if (w <= selectedWeek) {
        cumulativeBalanceToSelectedWeek += wData.weeklyBalance;
      }
    }

    // Apply manual adjustment (if any e.g. compensatory teaching, substitution)
    const extraAdjustment = manualAdjustments[teacher.id] || 0;
    cumulativeBalanceToSelectedWeek += extraAdjustment;

    const semesterRequiredPeriods =
      weekData.standardPeriods * totalWeeksInThisSemester;
    const semesterBalance =
      semesterTotalPeriods - semesterRequiredPeriods + extraAdjustment;

    results.push({
      teacherId: teacher.id,
      teacherName: teacher.name,
      callingName,
      teacherCode: teacher.code,
      departmentId: teacher.departmentId,
      departmentName: deptName,
      campus: teacher.campus || 'THPTDBK',
      level: weekData.level,
      role: teacher.role,
      rows: weekData.rows,
      duties: weekData.duties,
      dutyList: weekData.dutyList,
      reductionPeriods: weekData.reductionPeriods,
      teachingPeriods: weekData.teachingPeriods,
      totalPeriods: weekData.totalPeriods,
      standardPeriods: weekData.standardPeriods,
      weeklyBalance: weekData.weeklyBalance,
      cumulativeBalance: cumulativeBalanceToSelectedWeek,
      weeklyTotals,
      weeklyTeaching,
      weeklyBalances,
      semesterTotalTeaching,
      semesterTotalPeriods,
      semesterRequiredPeriods,
      semesterBalance,
    });
  }

  return results;
}

/**
 * Export Actual Teaching Hours table to Excel matching the exact visual format
 */
export function exportActualWeeklyExcel(
  selectedWeek: number,
  workloads: TeacherActualWorkload[],
  config: SchoolConfig,
  useShortName: boolean = true
) {
  import('xlsx').then((XLSX) => {
    const wb = XLSX.utils.book_new();

    const rows: (string | number)[][] = [];

    // Header info
    rows.push([config.schoolName || 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU']);
    rows.push([
      `SỔ TIẾT THỰC DẠY - TUẦN ${selectedWeek} (${config.semester || 'HK1'} NĂM HỌC ${config.academicYear || '2026-2027'})`,
    ]);
    rows.push([
      `Nguồn dữ liệu: Phân công giảng dạy theo Thời Khóa Biểu thực tế (Định mức chuẩn THPT: ${config.standardThptPeriods || 17} tiết/tuần)`,
    ]);
    rows.push([]);

    // Table Header
    const headerRowIndex = rows.length;
    rows.push([
      'Họ và tên GV',
      'Lớp dạy',
      'Môn dạy',
      'Tiết dạy',
      'Kiêm nhiệm',
      'Tổng tiết',
      'Thừa/thiếu tiết đến tuần hiện tại',
    ]);

    const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];

    // Title merges
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } });
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 6 } });
    merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: 6 } });

    workloads.forEach((t) => {
      const displayName = useShortName ? t.callingName : t.teacherName;
      const rowCount = t.rows.length > 0 ? t.rows.length : 1;
      const startRow = rows.length;

      if (t.rows.length === 0) {
        rows.push([
          displayName,
          '—',
          '—',
          0,
          t.duties,
          t.totalPeriods,
          t.cumulativeBalance > 0
            ? `+${t.cumulativeBalance}`
            : t.cumulativeBalance,
        ]);
      } else {
        t.rows.forEach((subRow, idx) => {
          if (idx === 0) {
            rows.push([
              displayName,
              subRow.classes,
              subRow.subject,
              subRow.periods,
              t.duties,
              t.totalPeriods,
              t.cumulativeBalance > 0
                ? `+${t.cumulativeBalance}`
                : t.cumulativeBalance,
            ]);
          } else {
            rows.push([
              '',
              subRow.classes,
              subRow.subject,
              subRow.periods,
              '',
              '',
              '',
            ]);
          }
        });

        if (rowCount > 1) {
          // Merge Tên GV (col 0)
          merges.push({
            s: { r: startRow, c: 0 },
            e: { r: startRow + rowCount - 1, c: 0 },
          });
          // Merge Kiêm nhiệm (col 4)
          merges.push({
            s: { r: startRow, c: 4 },
            e: { r: startRow + rowCount - 1, c: 4 },
          });
          // Merge Tổng tiết (col 5)
          merges.push({
            s: { r: startRow, c: 5 },
            e: { r: startRow + rowCount - 1, c: 5 },
          });
          // Merge Thừa/thiếu (col 6)
          merges.push({
            s: { r: startRow, c: 6 },
            e: { r: startRow + rowCount - 1, c: 6 },
          });
        }
      }
    });

    // Summary row
    const totalTeachingAll = workloads.reduce(
      (sum, w) => sum + w.teachingPeriods,
      0
    );
    const totalReductionAll = workloads.reduce(
      (sum, w) => sum + w.reductionPeriods,
      0
    );
    const totalPeriodsAll = workloads.reduce((sum, w) => sum + w.totalPeriods, 0);

    const summaryRowIdx = rows.length;
    rows.push([
      'TỔNG CỘNG',
      `${workloads.length} giáo viên`,
      `Quy đổi kiêm nhiệm: ${totalReductionAll} tiết`,
      totalTeachingAll,
      '',
      totalPeriodsAll,
      '',
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!merges'] = merges;
    ws['!cols'] = [
      { wch: 14 }, // Tên GV
      { wch: 32 }, // Lớp dạy
      { wch: 36 }, // Môn dạy
      { wch: 10 }, // Tiết dạy
      { wch: 18 }, // Kiêm nhiệm
      { wch: 12 }, // Tổng tiết
      { wch: 22 }, // Thừa/thiếu
    ];

    XLSX.utils.book_append_sheet(wb, ws, `TietThucDay_Tuan_${selectedWeek}`);
    XLSX.writeFile(
      wb,
      `So_Tiet_Thuc_Day_THPT_Tuan_${selectedWeek}_${config.academicYear.replace(/\s+/g, '_')}.xlsx`
    );
  });
}

/**
 * Export Multi-Week Summary Matrix to Excel (Showing Weekly Balances & Semester Totals)
 */
export function exportActualMultiWeekExcel(
  workloads: TeacherActualWorkload[],
  totalWeeks: number,
  config: SchoolConfig,
  startWeek: number = 1,
  endWeek?: number,
  semesterName: string = 'Học kỳ 1'
) {
  const effectiveEndWeek = endWeek || (startWeek === 19 ? 35 : startWeek + totalWeeks - 1);
  const weekCount = effectiveEndWeek - startWeek + 1;

  import('xlsx').then((XLSX) => {
    const wb = XLSX.utils.book_new();
    const rows: (string | number)[][] = [];

    rows.push([config.schoolName || 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU']);
    rows.push([
      `BẢNG TỔNG HỢP THỪA/THIẾU TIẾT DẠY HÀNG TUẦN VÀ CẢ KỲ (${semesterName.toUpperCase()} - ${weekCount} TUẦN: T${startWeek} ĐẾN T${effectiveEndWeek})`,
    ]);
    rows.push([
      `Năm học: ${config.academicYear} • Ghi chú: Cột T1..T${effectiveEndWeek} thể hiện số tiết thừa(+) hoặc thiếu(-) của từng tuần`,
    ]);
    rows.push([]);

    const header = [
      'STT',
      'Họ và Tên',
      'Tổ chuyên môn',
      'Kiêm nhiệm',
      'Định mức/T',
    ];
    for (let w = startWeek; w <= effectiveEndWeek; w++) {
      header.push(`T${w}`);
    }
    header.push(
      'Tổng Dạy',
      'Tổng KN',
      'Tổng Quy Đổi',
      'Định Mức Kỳ',
      'TỔNG THỪA/THIẾU KỲ'
    );
    rows.push(header);

    workloads.forEach((w, idx) => {
      const row: (string | number)[] = [
        idx + 1,
        w.teacherName,
        w.departmentName,
        w.duties,
        w.standardPeriods,
      ];
      for (let wk = startWeek; wk <= effectiveEndWeek; wk++) {
        const bal = w.weeklyBalances?.[wk] ?? ((w.weeklyTotals[wk] ?? 0) - w.standardPeriods);
        row.push(bal > 0 ? `+${bal}` : `${bal}`);
      }
      row.push(
        w.semesterTotalTeaching,
        w.reductionPeriods * weekCount,
        w.semesterTotalPeriods,
        w.semesterRequiredPeriods,
        w.semesterBalance > 0 ? `+${w.semesterBalance}` : `${w.semesterBalance}`
      );
      rows.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 24 },
      { wch: 24 },
      { wch: 18 },
      { wch: 12 },
      ...Array(weekCount).fill({ wch: 7 }),
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
    ];

    const safeSemName = semesterName.replace(/\s+/g, '_');
    XLSX.utils.book_append_sheet(wb, ws, `Thua_Thieu_${safeSemName}`);
    XLSX.writeFile(
      wb,
      `Bang_Tong_Hop_Thua_Thieu_Tiet_Day_${safeSemName}_${config.academicYear.replace(/\s+/g, '_')}.xlsx`
    );
  });
}
