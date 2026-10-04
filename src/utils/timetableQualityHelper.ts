import { TimetableSlot, Teacher, ClassGroup, Subject } from '../types';

export type QualityTier = 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';

export interface GapDetail {
  dayOfWeek: number;
  session: 'SANG' | 'CHIEU';
  missingPeriods: number[];
  taughtPeriods: number[];
  description: string;
}

export interface SinglePeriodDetail {
  dayOfWeek: number;
  session: 'SANG' | 'CHIEU';
  period: number;
  className: string;
  subjectName: string;
  description: string;
}

export interface TeacherQualityMetric {
  teacherId: string;
  teacherName: string;
  teacherCode: string;
  departmentId: string;
  departmentName: string;
  campus?: string;
  
  // Teaching load
  totalPeriods: number;
  assignedClassesCount: number;
  assignedClassesList: string[];
  mainSubjectName: string;
  isSinglePeriodSubject: boolean; // Môn 1 tiết/tuần (Mỹ thuật, Âm nhạc, GDĐP...)

  // Session stats
  sessionCount: number; // Số buổi dạy trong tuần
  daysWithTeaching: number; // Số ngày có mặt ở trường
  freeDays: number; // Số ngày nghỉ hoàn toàn trong tuần (Thứ 2 -> Thứ 7)
  freeHalfDays: number; // Số buổi nghỉ trọn vẹn (trong tổng số 12 buổi sáng/chiều)

  // Days off details
  taughtDayList: number[];
  offDayList: number[];
  offDayNames: string[];
  isMondayOff: boolean;
  isSaturdayOff: boolean;
  isFridayOff: boolean;
  hasWeekendCombo: boolean;
  hasDoubleCombo: boolean;

  // Quality issues (Khuyết tật TKB)
  totalGaps: number; // Tổng số tiết lủng (tiết trống chờ giữa buổi)
  gapDetails: GapDetail[]; // Chi tiết từng tiết lủng
  
  singlePeriodSessions: number; // Số buổi phải lên trường chỉ để dạy duy nhất 1 tiết
  singlePeriodDetails: SinglePeriodDetail[];

  splitShiftDays: number; // Số ngày phải dạy cả 2 ca Sáng + Chiều
  splitShiftDayNames: string[];

  maxPeriodsInSession: number; // Số tiết dạy nhiều nhất trong 1 buổi (quá tải nếu 5 tiết)
  heavySessionCount: number; // Số buổi dạy 4-5 tiết

  // Campus mobility
  campusesTaught: string[];
  isCrossCampus: boolean; // Dạy cả Điểm chính và Điểm Tân Kiều

  // Overall Score (0 - 100) & Tier
  score: number;
  tier: QualityTier;
  tierLabel: string;
  tierColor: string;

  // Objective root cause diagnosis
  primaryFactor: string; // Nguyên nhân chính (Đặc thù môn học / Liên ca / Liên điểm / Thuật toán)
  diagnosisNotes: string[];
  suggestedAction: string;
}

export interface SchoolQualitySummary {
  weekNumber: number;
  totalTeachersTeaching: number;
  averageScore: number;
  totalGapsInSchool: number;
  teachersWithGapsCount: number;
  teachersWithSplitShiftsCount: number;
  teachersWithSinglePeriodSessionsCount: number;

  tierCounts: {
    EXCELLENT: number; // 90 - 100
    GOOD: number;      // 75 - 89
    AVERAGE: number;   // 60 - 74
    POOR: number;      // < 60
  };

  departmentStats: {
    deptId: string;
    deptName: string;
    teacherCount: number;
    averageScore: number;
    totalGaps: number;
  }[];

  topConvenientTeachers: TeacherQualityMetric[];
  topInconvenientTeachers: TeacherQualityMetric[];
  allTeachers: TeacherQualityMetric[];

  // Days off audit lists
  mondayOffTeachers: TeacherQualityMetric[];
  saturdayOffTeachers: TeacherQualityMetric[];
  bothMondaySaturdayOffTeachers: TeacherQualityMetric[];
  zeroOffDayTeachers: TeacherQualityMetric[];
}

const DAY_NAMES: Record<number, string> = {
  2: 'Thứ Hai',
  3: 'Thứ Ba',
  4: 'Thứ Tư',
  5: 'Thứ Năm',
  6: 'Thứ Sáu',
  7: 'Thứ Bảy'
};

/**
 * Phân tích và chấm điểm chất lượng TKB của từng giáo viên và toàn trường
 */
export function analyzeTimetableQuality(
  slots: TimetableSlot[],
  teachers: Teacher[],
  classes: ClassGroup[],
  subjects: Subject[],
  weekNumber: number = 1
): SchoolQualitySummary {
  const teacherMap = new Map<string, Teacher>(teachers.map(t => [t.id, t]));
  const classMap = new Map<string, ClassGroup>(classes.map(c => [c.id, c]));
  const subjectMap = new Map<string, Subject>(subjects.map(s => [s.id, s]));

  // Department name lookup
  const deptMap: Record<string, string> = {
    'dept-toan': 'Tổ Toán',
    'dept-ngu-van': 'Tổ Ngữ Văn',
    'dept-khxh': 'Tổ Lịch sử - Địa lý - GDCD',
    'dept-khtn': 'Tổ Lý - Hóa - Sinh - Công nghệ',
    'dept-tieng-anh-tin': 'Tổ Tiếng Anh - Tin học',
    'dept-gdtc-qpan-nt': 'Tổ GDTC - QPAN - Nghệ thuật',
    'dept-bgh': 'Ban Giám Hiệu'
  };

  const metrics: TeacherQualityMetric[] = [];

  teachers.forEach(teacher => {
    const tSlots = slots.filter(s => s.teacherId === teacher.id);
    if (tSlots.length === 0) return; // Không có tiết trong tuần

    // Nhóm slots theo buổi: key = `${dayOfWeek}_${session}`
    const sessionSlotsMap: Record<string, TimetableSlot[]> = {};
    const daySessionsMap: Record<number, Set<'SANG' | 'CHIEU'>> = {};
    const classesSet = new Set<string>();
    const subjectsCount: Record<string, number> = {};
    const campusesSet = new Set<string>();

    tSlots.forEach(s => {
      const sessKey = `${s.dayOfWeek}_${s.session}`;
      if (!sessionSlotsMap[sessKey]) sessionSlotsMap[sessKey] = [];
      sessionSlotsMap[sessKey].push(s);

      if (!daySessionsMap[s.dayOfWeek]) daySessionsMap[s.dayOfWeek] = new Set();
      daySessionsMap[s.dayOfWeek].add(s.session);

      classesSet.add(s.classId);
      subjectsCount[s.subjectId] = (subjectsCount[s.subjectId] || 0) + 1;

      const cls = classMap.get(s.classId);
      if (cls?.campus) {
        campusesSet.add(cls.campus);
      } else if (cls?.level === 'THPT') {
        campusesSet.add('Điểm chính');
      } else {
        campusesSet.add('Điểm ĐBK');
      }
    });

    // Xác định môn chính
    let mainSubjectId = '';
    let maxSubCount = 0;
    Object.entries(subjectsCount).forEach(([sId, count]) => {
      if (count > maxSubCount) {
        maxSubCount = count;
        mainSubjectId = sId;
      }
    });
    const mainSubjectObj = subjectMap.get(mainSubjectId);
    const mainSubjectName = mainSubjectObj?.name || 'Chuyên môn';

    // Môn 1 tiết/tuần: Mỹ thuật, Âm nhạc, GDĐP, HĐTNHN, Công nghệ...
    const isSinglePeriodSubject = ['Mỹ thuật', 'Âm nhạc', 'Giáo dục địa phương', 'Nghệ thuật'].some(m => 
      mainSubjectName.toLowerCase().includes(m.toLowerCase())
    ) || (classesSet.size >= 10 && tSlots.length <= classesSet.size * 1.5);

    // Tính toán tiết lủng (Gaps) và buổi 1 tiết
    let totalGaps = 0;
    const gapDetails: GapDetail[] = [];
    let singlePeriodSessions = 0;
    const singlePeriodDetails: SinglePeriodDetail[] = [];
    let maxPeriodsInSession = 0;
    let heavySessionCount = 0;

    Object.entries(sessionSlotsMap).forEach(([sessKey, sessionSlots]) => {
      const [dayStr, sessionStr] = sessKey.split('_');
      const dayOfWeek = parseInt(dayStr, 10);
      const session = sessionStr as 'SANG' | 'CHIEU';
      const periods = sessionSlots.map(s => s.period).sort((a, b) => a - b);

      if (periods.length > maxPeriodsInSession) {
        maxPeriodsInSession = periods.length;
      }
      if (periods.length >= 4) {
        heavySessionCount++;
      }

      if (periods.length === 1) {
        singlePeriodSessions++;
        const s = sessionSlots[0];
        const cls = classMap.get(s.classId);
        const sub = subjectMap.get(s.subjectId);
        singlePeriodDetails.push({
          dayOfWeek,
          session,
          period: s.period,
          className: cls?.name || s.classId,
          subjectName: sub?.name || s.subjectId,
          description: `${DAY_NAMES[dayOfWeek]} (${session === 'SANG' ? 'Sáng' : 'Chiều'}): Tiết ${s.period} - Lớp ${cls?.name || s.classId}`
        });
      }

      // Phát hiện tiết lủng giữa min period và max period
      if (periods.length >= 2) {
        const minP = periods[0];
        const maxP = periods[periods.length - 1];
        const missingPeriods: number[] = [];
        for (let p = minP + 1; p < maxP; p++) {
          if (!periods.includes(p)) {
            missingPeriods.push(p);
          }
        }
        if (missingPeriods.length > 0) {
          totalGaps += missingPeriods.length;
          gapDetails.push({
            dayOfWeek,
            session,
            missingPeriods,
            taughtPeriods: periods,
            description: `${DAY_NAMES[dayOfWeek]} (${session === 'SANG' ? 'Sáng' : 'Chiều'}): Trống Tiết ${missingPeriods.join(', ')} (Dạy Tiết ${periods.join(', ')})`
          });
        }
      }
    });

    // Tính số ngày dạy cả 2 ca
    const splitShiftDayNames: string[] = [];
    Object.entries(daySessionsMap).forEach(([dayStr, sessSet]) => {
      if (sessSet.size >= 2) {
        splitShiftDayNames.push(DAY_NAMES[parseInt(dayStr, 10)]);
      }
    });
    const splitShiftDays = splitShiftDayNames.length;

    const daysWithTeaching = Object.keys(daySessionsMap).length;
    const sessionCount = Object.keys(sessionSlotsMap).length;
    const freeDays = Math.max(0, 6 - daysWithTeaching); // Thứ 2 đến Thứ 7 (6 ngày)
    const freeHalfDays = Math.max(0, 12 - sessionCount); // 12 buổi

    const taughtDayList = Object.keys(daySessionsMap).map(d => parseInt(d, 10)).sort((a, b) => a - b);
    const allDays = [2, 3, 4, 5, 6, 7];
    const offDayList = allDays.filter(d => !taughtDayList.includes(d));
    const offDayNames = offDayList.map(d => DAY_NAMES[d]);
    const isMondayOff = offDayList.includes(2);
    const isSaturdayOff = offDayList.includes(7);
    const isFridayOff = offDayList.includes(6);
    const hasWeekendCombo = isSaturdayOff || isMondayOff;
    const hasDoubleCombo = isSaturdayOff && isMondayOff;

    const isCrossCampus = campusesSet.size > 1;

    // TÍNH ĐIỂM CHẤT LƯỢNG (QUALITY SCORE) TRÊN THANG 100
    // Điểm gốc = 100
    // - Trừ 12 điểm cho mỗi tiết lủng (tiết chờ đợi giữa buổi)
    // - Trừ 8 điểm cho mỗi buổi chỉ lên trường dạy đúng 1 tiết
    // - Trừ 6 điểm cho mỗi ngày phải dạy cả Sáng + Chiều
    // - Trừ 6 điểm nếu dạy liên 2 điểm trường
    // - Điểm thưởng nhỏ nếu tiết xếp thành khối liền mạch (0 gap) và có ngày nghỉ trọn vẹn
    let score = 100;
    score -= totalGaps * 12;
    score -= singlePeriodSessions * 8;
    score -= splitShiftDays * 6;
    if (isCrossCampus) score -= 6;

    // Thưởng nhẹ cho TKB gọn gàng
    if (totalGaps === 0) score += 3;
    if (freeDays >= 2) score += 2;

    score = Math.max(5, Math.min(100, Math.round(score)));

    // Xếp loại TKB
    let tier: QualityTier = 'GOOD';
    let tierLabel = 'Thuận lợi';
    let tierColor = 'text-blue-700 bg-blue-50 border-blue-200';

    if (score >= 90) {
      tier = 'EXCELLENT';
      tierLabel = 'Rất đẹp / Tối ưu';
      tierColor = 'text-emerald-700 bg-emerald-50 border-emerald-300';
    } else if (score >= 75) {
      tier = 'GOOD';
      tierLabel = 'Thuận lợi / Đẹp';
      tierColor = 'text-blue-700 bg-blue-50 border-blue-200';
    } else if (score >= 60) {
      tier = 'AVERAGE';
      tierLabel = 'Bình thường';
      tierColor = 'text-amber-700 bg-amber-50 border-amber-200';
    } else {
      tier = 'POOR';
      tierLabel = 'Bất tiện / Cần tối ưu';
      tierColor = 'text-rose-700 bg-rose-50 border-rose-200';
    }

    // CHẨN ĐOÁN NGUYÊN NHÂN KHÁCH QUAN (Bản chất: do đâu?)
    let primaryFactor = 'Bình thường';
    const diagnosisNotes: string[] = [];
    let suggestedAction = 'Duy trì lịch hiện tại';

    if (isSinglePeriodSubject) {
      primaryFactor = 'Đặc thù môn học 1 tiết/tuần';
      diagnosisNotes.push(`Dạy môn ${mainSubjectName} trên ${classesSet.size} lớp khác nhau, cơ cấu 1 tiết/tuần bắt buộc phải rải rác nhiều ca.`);
    } else if (isCrossCampus) {
      primaryFactor = 'Phân công liên 2 điểm trường';
      diagnosisNotes.push(`Giáo viên phải giảng dạy chéo giữa các điểm trường (${Array.from(campusesSet).join(', ')}).`);
    } else if (splitShiftDays >= 3) {
      primaryFactor = 'Dạy cả 2 ca Sáng & Chiều';
      diagnosisNotes.push(`Dạy đồng thời các khối sáng (K8, 9 hoặc THPT) và khối chiều (K6, 7), có ${splitShiftDays} ngày phải ở trường cả ngày.`);
    } else if (totalGaps >= 3) {
      primaryFactor = 'Ràng buộc thuật toán né trùng lịch';
      diagnosisNotes.push(`Bị ${totalGaps} tiết lủng do phần mềm ưu tiên né trùng lịch cho các môn chính của lớp.`);
      suggestedAction = 'Có thể đảo chéo tiết với GV khác trong tổ để gom các tiết lủng lại liền nhau.';
    } else if (score >= 90) {
      primaryFactor = 'Cơ cấu môn tập trung & xếp liền tiết';
      diagnosisNotes.push(`Các tiết dạy được xếp theo khối liền mạch (0 tiết lủng), tập trung gọn gàng trong 1 ca học.`);
    }

    const assignedClassesList = Array.from(classesSet).map(cId => classMap.get(cId)?.name || cId);

    metrics.push({
      teacherId: teacher.id,
      teacherName: teacher.name,
      teacherCode: teacher.code || '',
      departmentId: teacher.departmentId,
      departmentName: deptMap[teacher.departmentId] || teacher.departmentId,
      campus: teacher.campus,
      totalPeriods: tSlots.length,
      assignedClassesCount: classesSet.size,
      assignedClassesList,
      mainSubjectName,
      isSinglePeriodSubject,
      sessionCount,
      daysWithTeaching,
      freeDays,
      freeHalfDays,
      taughtDayList,
      offDayList,
      offDayNames,
      isMondayOff,
      isSaturdayOff,
      isFridayOff,
      hasWeekendCombo,
      hasDoubleCombo,
      totalGaps,
      gapDetails,
      singlePeriodSessions,
      singlePeriodDetails,
      splitShiftDays,
      splitShiftDayNames,
      maxPeriodsInSession,
      heavySessionCount,
      campusesTaught: Array.from(campusesSet),
      isCrossCampus,
      score,
      tier,
      tierLabel,
      tierColor,
      primaryFactor,
      diagnosisNotes,
      suggestedAction
    });
  });

  // Sắp xếp
  metrics.sort((a, b) => b.score - a.score);

  const topConvenientTeachers = metrics.filter(m => m.score >= 85).slice(0, 15);
  const topInconvenientTeachers = [...metrics].reverse().filter(m => m.score <= 70).slice(0, 15);

  const totalGapsInSchool = metrics.reduce((s, m) => s + m.totalGaps, 0);
  const averageScore = Math.round(metrics.reduce((s, m) => s + m.score, 0) / (metrics.length || 1));

  // Department Breakdown
  const deptGroups: Record<string, TeacherQualityMetric[]> = {};
  metrics.forEach(m => {
    if (!deptGroups[m.departmentId]) deptGroups[m.departmentId] = [];
    deptGroups[m.departmentId].push(m);
  });

  const departmentStats = Object.entries(deptGroups).map(([deptId, list]) => ({
    deptId,
    deptName: deptMap[deptId] || deptId,
    teacherCount: list.length,
    averageScore: Math.round(list.reduce((s, m) => s + m.score, 0) / (list.length || 1)),
    totalGaps: list.reduce((s, m) => s + m.totalGaps, 0)
  })).sort((a, b) => b.averageScore - a.averageScore);

  return {
    weekNumber,
    totalTeachersTeaching: metrics.length,
    averageScore,
    totalGapsInSchool,
    teachersWithGapsCount: metrics.filter(m => m.totalGaps > 0).length,
    teachersWithSplitShiftsCount: metrics.filter(m => m.splitShiftDays > 0).length,
    teachersWithSinglePeriodSessionsCount: metrics.filter(m => m.singlePeriodSessions > 0).length,
    tierCounts: {
      EXCELLENT: metrics.filter(m => m.tier === 'EXCELLENT').length,
      GOOD: metrics.filter(m => m.tier === 'GOOD').length,
      AVERAGE: metrics.filter(m => m.tier === 'AVERAGE').length,
      POOR: metrics.filter(m => m.tier === 'POOR').length,
    },
    departmentStats,
    topConvenientTeachers,
    topInconvenientTeachers,
    allTeachers: metrics,

    // Days off audit lists
    mondayOffTeachers: metrics.filter(m => m.isMondayOff),
    saturdayOffTeachers: metrics.filter(m => m.isSaturdayOff),
    bothMondaySaturdayOffTeachers: metrics.filter(m => m.hasDoubleCombo),
    zeroOffDayTeachers: metrics.filter(m => m.freeDays === 0)
  };
}

export interface TeacherMultiWeekDaysOffRecord {
  teacherId: string;
  teacherName: string;
  teacherCode: string;
  departmentName: string;
  mainSubjectName: string;
  totalPeriods: number;
  mondayOffWeeks: number[];
  saturdayOffWeeks: number[];
  bothOffWeeks: number[];
  zeroOffWeeks: number[];
  avgOffDays: number;
  streakPattern: 'ALWAYS_MONDAY_OFF' | 'ALWAYS_SATURDAY_OFF' | 'ALWAYS_BOTH_OFF' | 'NEVER_OFF' | 'BALANCED';
  streakDescription: string;
  notes: string;
}

export interface MultiWeekDaysOffSummary {
  checkedWeeks: number[];
  records: TeacherMultiWeekDaysOffRecord[];
  alwaysMondayOffCount: number;
  alwaysSaturdayOffCount: number;
  alwaysBothOffCount: number;
  neverOffCount: number;
}

/**
 * Phân tích đối soát ngày nghỉ Thứ Hai, Thứ Bảy và số ngày nghỉ qua nhiều tuần liên tiếp
 */
export function analyzeMultiWeekDaysOff(
  weeklyTimetables: Record<number, { slots?: TimetableSlot[] }>,
  teachers: Teacher[],
  classes: ClassGroup[],
  subjects: Subject[],
  weeksToCheck: number[] = [1, 2, 3, 4, 5]
): MultiWeekDaysOffSummary {
  const teacherMap = new Map<string, Teacher>(teachers.map(t => [t.id, t]));
  const subjectMap = new Map<string, Subject>(subjects.map(s => [s.id, s]));

  const deptMap: Record<string, string> = {
    'dept-toan': 'Tổ Toán',
    'dept-ngu-van': 'Tổ Ngữ Văn',
    'dept-khxh': 'Tổ Lịch sử - Địa lý - GDCD',
    'dept-khtn': 'Tổ Lý - Hóa - Sinh - Công nghệ',
    'dept-tieng-anh-tin': 'Tổ Tiếng Anh - Tin học',
    'dept-gdtc-qpan-nt': 'Tổ GDTC - QPAN - Nghệ thuật',
    'dept-bgh': 'Ban Giám Hiệu'
  };

  const records: TeacherMultiWeekDaysOffRecord[] = [];

  teachers.forEach(teacher => {
    // Check if teacher has teaching periods in any of the checked weeks
    let hasAnySlots = false;
    let totalPeriodsW1 = 0;
    const mondayOffWeeks: number[] = [];
    const saturdayOffWeeks: number[] = [];
    const bothOffWeeks: number[] = [];
    const zeroOffWeeks: number[] = [];
    let totalOffDaysSum = 0;
    let weeksWithSlotsCount = 0;

    weeksToCheck.forEach(w => {
      const slots = weeklyTimetables[w]?.slots || [];
      const tSlots = slots.filter(s => s.teacherId === teacher.id);
      if (tSlots.length > 0) {
        hasAnySlots = true;
        weeksWithSlotsCount++;
        if (w === 1) totalPeriodsW1 = tSlots.length;

        const taughtDays = new Set(tSlots.map(s => s.dayOfWeek));
        const allDays = [2, 3, 4, 5, 6, 7];
        const offDays = allDays.filter(d => !taughtDays.has(d));
        totalOffDaysSum += offDays.length;

        const isMonOff = !taughtDays.has(2);
        const isSatOff = !taughtDays.has(7);

        if (isMonOff) mondayOffWeeks.push(w);
        if (isSatOff) saturdayOffWeeks.push(w);
        if (isMonOff && isSatOff) bothOffWeeks.push(w);
        if (offDays.length === 0) zeroOffWeeks.push(w);
      }
    });

    if (!hasAnySlots) return;

    const avgOffDays = weeksWithSlotsCount > 0 ? Math.round((totalOffDaysSum / weeksWithSlotsCount) * 10) / 10 : 0;
    const totalChecked = weeksWithSlotsCount || 1;

    let streakPattern: 'ALWAYS_MONDAY_OFF' | 'ALWAYS_SATURDAY_OFF' | 'ALWAYS_BOTH_OFF' | 'NEVER_OFF' | 'BALANCED' = 'BALANCED';
    let streakDescription = `Nghỉ bình thường (trung bình ${avgOffDays} ngày/tuần)`;

    if (bothOffWeeks.length >= Math.ceil(totalChecked * 0.8)) {
      streakPattern = 'ALWAYS_BOTH_OFF';
      streakDescription = `Nghỉ cả Thứ 2 & Thứ 7 liên tục (${bothOffWeeks.length}/${totalChecked} tuần)`;
    } else if (mondayOffWeeks.length >= Math.ceil(totalChecked * 0.8)) {
      streakPattern = 'ALWAYS_MONDAY_OFF';
      streakDescription = `Nghỉ Thứ 2 liên tục (${mondayOffWeeks.length}/${totalChecked} tuần)`;
    } else if (saturdayOffWeeks.length >= Math.ceil(totalChecked * 0.8)) {
      streakPattern = 'ALWAYS_SATURDAY_OFF';
      streakDescription = `Nghỉ Thứ 7 liên tục (${saturdayOffWeeks.length}/${totalChecked} tuần)`;
    } else if (zeroOffWeeks.length >= Math.ceil(totalChecked * 0.8)) {
      streakPattern = 'NEVER_OFF';
      streakDescription = `Đi dạy cả 6 ngày, không có ngày nghỉ (${zeroOffWeeks.length}/${totalChecked} tuần)`;
    }

    records.push({
      teacherId: teacher.id,
      teacherName: teacher.name,
      teacherCode: teacher.code || '',
      departmentName: deptMap[teacher.departmentId] || teacher.departmentId,
      mainSubjectName: teacher.notes?.split('-')?.[1]?.trim() || 'Chuyên môn',
      totalPeriods: totalPeriodsW1 || 0,
      mondayOffWeeks,
      saturdayOffWeeks,
      bothOffWeeks,
      zeroOffWeeks,
      avgOffDays,
      streakPattern,
      streakDescription,
      notes: teacher.notes || ''
    });
  });

  records.sort((a, b) => {
    // Sort: both off first, then never off, then sat off, then mon off, then avg off days
    const orderScore = (r: TeacherMultiWeekDaysOffRecord) => {
      if (r.streakPattern === 'ALWAYS_BOTH_OFF') return 100;
      if (r.streakPattern === 'NEVER_OFF') return 90;
      if (r.streakPattern === 'ALWAYS_SATURDAY_OFF') return 80;
      if (r.streakPattern === 'ALWAYS_MONDAY_OFF') return 70;
      return r.avgOffDays;
    };
    return orderScore(b) - orderScore(a);
  });

  return {
    checkedWeeks: weeksToCheck,
    records,
    alwaysMondayOffCount: records.filter(r => r.streakPattern === 'ALWAYS_MONDAY_OFF').length,
    alwaysSaturdayOffCount: records.filter(r => r.streakPattern === 'ALWAYS_SATURDAY_OFF').length,
    alwaysBothOffCount: records.filter(r => r.streakPattern === 'ALWAYS_BOTH_OFF').length,
    neverOffCount: records.filter(r => r.streakPattern === 'NEVER_OFF').length
  };
}

/**
 * Xuất file Excel báo cáo chi tiết đánh giá chất lượng TKB
 */
export function exportTimetableQualityReportExcel(
  summary: SchoolQualitySummary,
  academicYear: string = '2026 - 2027'
) {
  import('xlsx').then((XLSX) => {
    const wb = XLSX.utils.book_new();
    const rows: (string | number)[][] = [];

    // Header
    rows.push(['SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP', '', '', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM']);
    rows.push(['TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU', '', '', 'Độc lập - Tự do - Hạnh phúc']);
    rows.push([]);
    rows.push([`BÁO CÁO ĐÁNH GIÁ CHẤT LƯỢNG & TÍNH THUẬN TIỆN THỜI KHÓA BIỂU - TUẦN ${summary.weekNumber}`]);
    rows.push([`Năm học: ${academicYear} • Tổng số GV giảng dạy: ${summary.totalTeachersTeaching} • Điểm trung bình toàn trường: ${summary.averageScore}/100`]);
    rows.push([]);

    // Tổng hợp chung
    rows.push(['TỔNG HỢP TOÀN TRƯỜNG:']);
    rows.push(['- Tổng số tiết lủng (tiết trống chờ):', summary.totalGapsInSchool, 'tiết']);
    rows.push(['- Số giáo viên có tiết lủng:', summary.teachersWithGapsCount, 'giáo viên']);
    rows.push(['- Số giáo viên dạy cả 2 ca (Sáng + Chiều):', summary.teachersWithSplitShiftsCount, 'giáo viên']);
    rows.push(['- Phân loại TKB Rất đẹp (90-100đ):', summary.tierCounts.EXCELLENT, 'giáo viên']);
    rows.push(['- Phân loại TKB Thuận lợi (75-89đ):', summary.tierCounts.GOOD, 'giáo viên']);
    rows.push(['- Phân loại TKB Bình thường (60-74đ):', summary.tierCounts.AVERAGE, 'giáo viên']);
    rows.push(['- Phân loại TKB Bất tiện / Cần tối ưu (< 60đ):', summary.tierCounts.POOR, 'giáo viên']);
    rows.push([]);

    // Table Header
    rows.push([
      'STT',
      'Họ và tên GV',
      'Tổ chuyên môn',
      'Môn chính',
      'Số tiết/T',
      'Số buổi',
      'Số ngày',
      'Tiết lủng',
      'Buổi 1 tiết',
      'Ngày 2 ca',
      'Điểm tiện lợi (100)',
      'Xếp loại',
      'Nguyên nhân chính & Nhận xét khách quan'
    ]);

    summary.allTeachers.forEach((m, idx) => {
      rows.push([
        idx + 1,
        m.teacherName,
        m.departmentName,
        m.mainSubjectName,
        m.totalPeriods,
        m.sessionCount,
        m.daysWithTeaching,
        m.totalGaps,
        m.singlePeriodSessions,
        m.splitShiftDays,
        m.score,
        m.tierLabel,
        m.diagnosisNotes.join('; ') || m.primaryFactor
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 24 },
      { wch: 22 },
      { wch: 18 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
      { wch: 20 },
      { wch: 45 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, `Danh_Gia_TKB_Tuan_${summary.weekNumber}`);
    XLSX.writeFile(wb, `Danh_Gia_Chat_Luong_TKB_Tuan_${summary.weekNumber}_${academicYear.replace(/\s+/g, '_')}.xlsx`);
  });
}
