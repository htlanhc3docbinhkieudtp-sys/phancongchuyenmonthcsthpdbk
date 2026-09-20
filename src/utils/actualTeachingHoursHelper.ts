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
 * Get timetable slots for a specific week
 */
export function getSlotsForWeek(
  weekNumber: number,
  weeklyTimetables?: Record<number, SchoolTimetable>,
  fallbackTimetable?: SchoolTimetable
): TimetableSlot[] {
  if (weeklyTimetables && weeklyTimetables[weekNumber]?.slots?.length > 0) {
    return weeklyTimetables[weekNumber].slots;
  }
  if (weekNumber === 2 && OFFICIAL_WEEK_2_SLOTS?.length > 0) {
    return OFFICIAL_WEEK_2_SLOTS;
  }
  if (weeklyTimetables && weeklyTimetables[1]?.slots?.length > 0) {
    return weeklyTimetables[1].slots;
  }
  if (fallbackTimetable?.slots?.length > 0) {
    return fallbackTimetable.slots;
  }
  return [];
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
  // - Hiệu trưởng: 2 tiết/tuần
  // - Phó Hiệu trưởng: 4 tiết/tuần
  // - Tổng phụ trách đội: 6 tiết/tuần
  // - Giáo viên THPT: 17 tiết/tuần
  // - Giáo viên THCS: 19 tiết/tuần
  const isHT =
    teacher.code?.includes('(HT)') ||
    teacher.notes?.toLowerCase().includes('hiệu trưởng (thpt') ||
    teacher.baseStandardPeriods === 2;
  const isPHT =
    teacher.code?.includes('(PHT)') ||
    teacher.notes?.toLowerCase().includes('phó hiệu trưởng') ||
    teacher.baseStandardPeriods === 4;
  const isTPT =
    teacher.role === 'TongPhuTrachDoi' ||
    teacher.code?.includes('(TPT') ||
    teacher.notes?.toLowerCase().includes('tổng phụ trách') ||
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
    if (cls && cls.grade === '12' && cls.specialTopics) {
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

  // 1. Hiệu trưởng / Phó Hiệu trưởng / Tổng phụ trách (định mức đã được hạ, thêm nhãn hiển thị)
  if (isHT) {
    dutyList.push('Hiệu trưởng');
  } else if (isPHT) {
    dutyList.push('Phó Hiệu trưởng');
  } else if (isTPT) {
    dutyList.push('TPT Đội');
  }

  // 2. Kiểm tra danh sách kiêm nhiệm chính thức (teacher.duties)
  if (teacher.duties && teacher.duties.length > 0) {
    teacher.duties.forEach((d) => {
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
  manualAdjustments: Record<string, number> = {}
): TeacherActualWorkload[] {
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
  for (let w = 1; w <= totalWeeksInSemester; w++) {
    weekSlotsCache.set(
      w,
      getSlotsForWeek(w, weeklyTimetables, fallbackTimetable)
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

    // Calculate multi-week statistics
    const weeklyTotals: Record<number, number> = {};
    const weeklyTeaching: Record<number, number> = {};
    let semesterTotalTeaching = 0;
    let semesterTotalPeriods = 0;
    let cumulativeBalanceToSelectedWeek = 0;

    for (let w = 1; w <= totalWeeksInSemester; w++) {
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
      weekData.standardPeriods * totalWeeksInSemester;
    const semesterBalance = semesterTotalPeriods - semesterRequiredPeriods;

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
 * Export Multi-Week Summary Matrix to Excel
 */
export function exportActualMultiWeekExcel(
  workloads: TeacherActualWorkload[],
  totalWeeks: number,
  config: SchoolConfig
) {
  import('xlsx').then((XLSX) => {
    const wb = XLSX.utils.book_new();
    const rows: (string | number)[][] = [];

    rows.push([config.schoolName || 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU']);
    rows.push([
      `BẢNG TỔNG HỢP TIẾT THỰC DẠY CẢ KỲ (${config.semester || 'HK1'} - ${totalWeeks} TUẦN) - CẤP THPT`,
    ]);
    rows.push([]);

    const header = [
      'STT',
      'Họ và Tên',
      'Tổ chuyên môn',
      'Kiêm nhiệm',
      'Định mức/T',
    ];
    for (let w = 1; w <= totalWeeks; w++) {
      header.push(`T${w}`);
    }
    header.push(
      'Tổng Thực Dạy',
      'Tổng Kiêm Nhiệm',
      'Tổng Quy Đổi',
      'Định Mức Kì',
      'Thừa/Thiếu Kì'
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
      for (let wk = 1; wk <= totalWeeks; wk++) {
        row.push(w.weeklyTotals[wk] ?? 0);
      }
      row.push(
        w.semesterTotalTeaching,
        w.reductionPeriods * totalWeeks,
        w.semesterTotalPeriods,
        w.semesterRequiredPeriods,
        w.semesterBalance > 0 ? `+${w.semesterBalance}` : w.semesterBalance
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
      ...Array(totalWeeks).fill({ wch: 6 }),
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Tong_Hop_Cac_Tuan');
    XLSX.writeFile(
      wb,
      `Tong_Hop_Tiet_Thuc_Day_THPT_${config.semester || 'HK1'}_${config.academicYear.replace(/\s+/g, '_')}.xlsx`
    );
  });
}
