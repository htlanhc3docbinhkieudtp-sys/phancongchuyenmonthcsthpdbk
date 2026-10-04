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

export interface TeacherSemesterQualityMetric {
  teacherId: string;
  teacherName: string;
  teacherCode: string;
  departmentId: string;
  departmentName: string;
  campus?: string;
  mainSubjectName: string;
  assignedClassesList: string[];
  
  // Aggregate stats across weeks in semester
  totalWeeksEvaluated: number;
  avgPeriodsPerWeek: number;
  
  // Core 3 Criteria (3 Tiêu chí cốt lõi)
  totalFreeDays: number;          // Tổng số ngày nghỉ (Thứ 2 -> Thứ 7)
  avgFreeDaysPerWeek: number;     // Số ngày nghỉ TB / tuần
  
  totalFreeHalfDays: number;      // Tổng số buổi nghỉ (trong tổng số tuần * 12 buổi)
  avgFreeHalfDaysPerWeek: number; // Số buổi nghỉ TB / tuần
  
  totalGaps: number;              // Tổng số tiết bị lủng (trống)
  avgGapsPerWeek: number;         // Số tiết lủng TB / tuần
  
  // Single period sessions
  totalSinglePeriodSessions: number;
  
  // Weekend combo counts
  mondayOffCount: number;
  saturdayOffCount: number;
  bothOffCount: number;
  zeroOffDayWeeksCount: number;
  
  // Quality classification
  badWeeksCount: number;
  averageWeeksCount: number;
  goodWeeksCount: number;
  
  avgScore: number;
  overallStatus: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'FREQUENTLY_BAD';
  statusLabel: string;
  statusColor: string;
  
  // Balancing suggestion for scheduler
  isFrequentlyBad: boolean;
  balancingSuggestions: string[];
  weeklyHistory: {
    week: number;
    score: number;
    tier: QualityTier;
    freeDays: number;
    freeHalfDays: number;
    gaps: number;
    singleSessions: number;
  }[];
}

export interface SemesterQualitySummary {
  semester: 'HK1' | 'HK2' | 'ALL_YEAR';
  semesterLabel: string;
  weeksCount: number;
  evaluatedWeeks: number[];
  totalTeachers: number;
  frequentlyBadTeachersCount: number;
  avgScore: number;
  totalGapsInSemester: number;
  
  // Ranked lists
  frequentlyBadTeachers: TeacherSemesterQualityMetric[];
  allTeachers: TeacherSemesterQualityMetric[];
  departmentStats: {
    deptId: string;
    deptName: string;
    teacherCount: number;
    avgScore: number;
    totalGaps: number;
    avgFreeDays: number;
    frequentlyBadCount: number;
  }[];
}

/**
 * Phân tích tổng hợp chất lượng TKB theo Học kỳ 1, Học kỳ 2 hoặc Cả năm
 * Dựa trên 3 tiêu chí cốt lõi: Số ngày nghỉ, Số buổi nghỉ, Số tiết lủng
 */
export function analyzeSemesterQuality(
  weeklyTimetables: Record<number, any>,
  teachers: Teacher[],
  classes: ClassGroup[],
  subjects: Subject[],
  targetScope: 'HK1' | 'HK2' | 'ALL_YEAR' = 'HK1'
): SemesterQualitySummary {
  const deptMap: Record<string, string> = {
    'dept-toan': 'Tổ Toán',
    'dept-ngu-van': 'Tổ Ngữ Văn',
    'dept-khxh': 'Tổ Lịch sử - Địa lý - GDCD',
    'dept-khtn': 'Tổ Lý - Hóa - Sinh - Công nghệ',
    'dept-tieng-anh-tin': 'Tổ Tiếng Anh - Tin học',
    'dept-gdtc-qpan-nt': 'Tổ GDTC - QPAN - Nghệ thuật',
    'dept-bgh': 'Ban Giám Hiệu'
  };

  // Determine weeks to evaluate
  let candidateWeeks: number[] = [];
  let semesterLabel = 'Học kỳ 1 (Tuần 1 - Tuần 18)';
  if (targetScope === 'HK1') {
    candidateWeeks = Array.from({ length: 18 }, (_, i) => i + 1);
    semesterLabel = 'Học kỳ 1 (Tuần 1 - Tuần 18)';
  } else if (targetScope === 'HK2') {
    candidateWeeks = Array.from({ length: 17 }, (_, i) => i + 19);
    semesterLabel = 'Học kỳ 2 (Tuần 19 - Tuần 35)';
  } else {
    candidateWeeks = Array.from({ length: 35 }, (_, i) => i + 1);
    semesterLabel = 'Cả năm học (Tuần 1 - Tuần 35)';
  }

  // Filter weeks that actually have timetable slots
  const evaluatedWeeks = candidateWeeks.filter(
    w => weeklyTimetables[w]?.slots && weeklyTimetables[w].slots.length > 0
  );

  // If no weeks found, fall back to whatever is available (e.g. at least week 1)
  const finalWeeks = evaluatedWeeks.length > 0 ? evaluatedWeeks : [1];

  // Pre-calculate weekly quality summaries for each active week
  const weeklySummaries = new Map<number, SchoolQualitySummary>();
  finalWeeks.forEach(w => {
    const slots = weeklyTimetables[w]?.slots || [];
    if (slots.length > 0) {
      weeklySummaries.set(w, analyzeTimetableQuality(slots, teachers, classes, subjects, w));
    }
  });

  const teacherMetrics: TeacherSemesterQualityMetric[] = [];

  teachers.forEach(tch => {
    const history: TeacherSemesterQualityMetric['weeklyHistory'] = [];
    let sumScore = 0;
    let sumPeriods = 0;
    let sumFreeDays = 0;
    let sumFreeHalfDays = 0;
    let sumGaps = 0;
    let sumSingleSessions = 0;
    let monOff = 0;
    let satOff = 0;
    let bothOff = 0;
    let zeroOff = 0;
    let badCount = 0;
    let avgCount = 0;
    let goodCount = 0;
    let mainSub = tch.notes?.split('-')?.[1]?.trim() || 'Chuyên môn';
    const assignedClasses = new Set<string>();

    finalWeeks.forEach(w => {
      const q = weeklySummaries.get(w);
      if (!q) return;
      const m = q.allTeachers.find(x => x.teacherId === tch.id);
      if (m) {
        history.push({
          week: w,
          score: m.score,
          tier: m.tier,
          freeDays: m.freeDays,
          freeHalfDays: m.freeHalfDays,
          gaps: m.totalGaps,
          singleSessions: m.singlePeriodSessions
        });

        sumScore += m.score;
        sumPeriods += m.totalPeriods;
        sumFreeDays += m.freeDays;
        sumFreeHalfDays += m.freeHalfDays;
        sumGaps += m.totalGaps;
        sumSingleSessions += m.singlePeriodSessions;
        mainSub = m.mainSubjectName || mainSub;
        m.assignedClassesList.forEach(c => assignedClasses.add(c));

        if (m.isMondayOff) monOff++;
        if (m.isSaturdayOff) satOff++;
        if (m.hasDoubleCombo) bothOff++;
        if (m.freeDays === 0) zeroOff++;

        if (m.tier === 'POOR' || m.score < 65) {
          badCount++;
        } else if (m.tier === 'AVERAGE') {
          avgCount++;
        } else {
          goodCount++;
        }
      }
    });

    const evaluatedCount = history.length;
    if (evaluatedCount === 0) return;

    const avgScore = Math.round(sumScore / evaluatedCount);
    const avgPeriods = Math.round((sumPeriods / evaluatedCount) * 10) / 10;
    const avgFreeDays = Math.round((sumFreeDays / evaluatedCount) * 10) / 10;
    const avgFreeHalfDays = Math.round((sumFreeHalfDays / evaluatedCount) * 10) / 10;
    const avgGaps = Math.round((sumGaps / evaluatedCount) * 10) / 10;

    // Determine if teacher is frequently disadvantaged / frequently bad
    // Criteria for "Thường xuyên bị TKB xấu":
    // 1. badWeeksCount >= 40% số tuần đã xếp
    // 2. OR avgScore < 68
    // 3. OR (avgFreeDays <= 1.2 && avgPeriods <= 17 && sumGaps >= 5)
    // 4. OR sumGaps >= evaluatedCount * 1.8
    const isFrequentlyBad = (badCount >= Math.ceil(evaluatedCount * 0.4)) ||
      (avgScore < 68) ||
      (avgFreeDays <= 1.2 && avgPeriods <= 17 && sumGaps >= 4) ||
      (sumGaps >= evaluatedCount * 1.6);

    let overallStatus: TeacherSemesterQualityMetric['overallStatus'] = 'GOOD';
    let statusLabel = 'TKB Tương đối thuận lợi';
    let statusColor = 'text-blue-700 bg-blue-50 border-blue-200';

    if (isFrequentlyBad) {
      overallStatus = 'FREQUENTLY_BAD';
      statusLabel = 'Thường xuyên bị xấu (Cần cân đối)';
      statusColor = 'text-rose-700 bg-rose-50 border-rose-300 font-black';
    } else if (avgScore >= 85 && avgFreeDays >= 2 && avgGaps <= 0.8) {
      overallStatus = 'EXCELLENT';
      statusLabel = 'TKB Rất Đẹp & Tối Ưu';
      statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-300';
    } else if (avgScore >= 75) {
      overallStatus = 'GOOD';
      statusLabel = 'TKB Thuận Lợi';
      statusColor = 'text-blue-700 bg-blue-50 border-blue-200';
    } else {
      overallStatus = 'AVERAGE';
      statusLabel = 'TKB Trung bình';
      statusColor = 'text-amber-700 bg-amber-50 border-amber-200';
    }

    // Generate balancing suggestions for scheduler
    const balancingSuggestions: string[] = [];
    if (tch.name.includes('Lê Thái Phương') || (mainSub.includes('Hóa') && assignedClasses.has('7A5'))) {
      balancingSuggestions.push('Rà soát tiết HĐTNHN lớp 7A5: Điều chuyển sang GV khối 7 hoặc khóa cố định vào buổi có sẵn để giảm từ 5 ngày xuống 3-4 ngày dạy/tuần.');
    }
    if (sumGaps >= 6) {
      balancingSuggestions.push(`Bị lủng tổng cộng ${sumGaps} tiết (TB ${avgGaps} tiết/tuần). Cần ưu tiên đảo tiết với GV cùng tổ để triệt tiêu các khoảng trống.`);
    }
    if (avgFreeDays <= 1.2 && avgPeriods <= 17) {
      balancingSuggestions.push(`Số tiết chỉ ${avgPeriods} nhưng phải đi dạy ${Math.round((6 - avgFreeDays)*10)/10} ngày/tuần. Cần gom tiết lại trong 3-4 buổi để tăng ngày nghỉ.`);
    }
    if (sumSingleSessions >= 2) {
      balancingSuggestions.push(`Có ${sumSingleSessions} buổi chỉ lên trường dạy 1 tiết đơn độc. Cần chuyển các tiết đơn độc sang buổi khác.`);
    }
    if (monOff === 0 && satOff === 0 && evaluatedCount >= 3) {
      balancingSuggestions.push(`Chưa từng được nghỉ Thứ Hai hoặc Thứ Bảy (${evaluatedCount} tuần qua). Cần luân phiên bố trí 1 ngày nghỉ đầu/cuối tuần.`);
    }

    if (balancingSuggestions.length === 0) {
      balancingSuggestions.push('Lịch hiện tại phân bổ hợp lý, tiếp tục duy trì mức độ cân đối.');
    }

    teacherMetrics.push({
      teacherId: tch.id,
      teacherName: tch.name,
      teacherCode: tch.code || '',
      departmentId: tch.departmentId,
      departmentName: deptMap[tch.departmentId] || tch.departmentId,
      campus: tch.campus,
      mainSubjectName: mainSub,
      assignedClassesList: Array.from(assignedClasses),
      totalWeeksEvaluated: evaluatedCount,
      avgPeriodsPerWeek: avgPeriods,
      totalFreeDays: sumFreeDays,
      avgFreeDaysPerWeek: avgFreeDays,
      totalFreeHalfDays: sumFreeHalfDays,
      avgFreeHalfDaysPerWeek: avgFreeHalfDays,
      totalGaps: sumGaps,
      avgGapsPerWeek: avgGaps,
      totalSinglePeriodSessions: sumSingleSessions,
      mondayOffCount: monOff,
      saturdayOffCount: satOff,
      bothOffCount: bothOff,
      zeroOffDayWeeksCount: zeroOff,
      badWeeksCount: badCount,
      averageWeeksCount: avgCount,
      goodWeeksCount: goodCount,
      avgScore,
      overallStatus,
      statusLabel,
      statusColor,
      isFrequentlyBad,
      balancingSuggestions,
      weeklyHistory: history
    });
  });

  // Sort teachers: frequently bad teachers first (lowest avgScore, highest gaps, lowest free days)
  teacherMetrics.sort((a, b) => {
    if (a.isFrequentlyBad && !b.isFrequentlyBad) return -1;
    if (!a.isFrequentlyBad && b.isFrequentlyBad) return 1;
    return a.avgScore - b.avgScore;
  });

  const frequentlyBadTeachers = teacherMetrics.filter(t => t.isFrequentlyBad);
  const totalGapsInSemester = teacherMetrics.reduce((s, t) => s + t.totalGaps, 0);
  const avgScore = Math.round(teacherMetrics.reduce((s, t) => s + t.avgScore, 0) / (teacherMetrics.length || 1));

  // Department Breakdown
  const deptGroups: Record<string, TeacherSemesterQualityMetric[]> = {};
  teacherMetrics.forEach(m => {
    if (!deptGroups[m.departmentId]) deptGroups[m.departmentId] = [];
    deptGroups[m.departmentId].push(m);
  });

  const departmentStats = Object.entries(deptGroups).map(([deptId, list]) => ({
    deptId,
    deptName: deptMap[deptId] || deptId,
    teacherCount: list.length,
    avgScore: Math.round(list.reduce((s, m) => s + m.avgScore, 0) / (list.length || 1)),
    totalGaps: list.reduce((s, m) => s + m.totalGaps, 0),
    avgFreeDays: Math.round((list.reduce((s, m) => s + m.avgFreeDaysPerWeek, 0) / (list.length || 1)) * 10) / 10,
    frequentlyBadCount: list.filter(m => m.isFrequentlyBad).length
  })).sort((a, b) => a.avgScore - b.avgScore);

  return {
    semester: targetScope,
    semesterLabel,
    weeksCount: finalWeeks.length,
    evaluatedWeeks: finalWeeks,
    totalTeachers: teacherMetrics.length,
    frequentlyBadTeachersCount: frequentlyBadTeachers.length,
    avgScore,
    totalGapsInSemester,
    frequentlyBadTeachers,
    allTeachers: teacherMetrics,
    departmentStats
  };
}

/**
 * Xuất file Excel báo cáo tổng hợp chất lượng TKB Học kỳ
 */
export function exportSemesterQualityReportExcel(
  summary: SemesterQualitySummary,
  academicYear: string = '2026 - 2027'
) {
  import('xlsx').then((XLSX) => {
    const wb = XLSX.utils.book_new();
    const rows: (string | number)[][] = [];

    // Header
    rows.push(['SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP', '', '', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM']);
    rows.push(['TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU', '', '', 'Độc lập - Tự do - Hạnh phúc']);
    rows.push([]);
    rows.push([`BÁO CÁO TỔNG HỢP ĐÁNH GIÁ TỐT - XẤU THỜI KHÓA BIỂU (${summary.semesterLabel.toUpperCase()})`]);
    rows.push([`Năm học: ${academicYear} • Các tuần đã đánh giá: Tuần ${summary.evaluatedWeeks.join(', ')} • Tổng số GV: ${summary.totalTeachers}`]);
    rows.push([`Số GV thường xuyên bị TKB xấu cần cân đối: ${summary.frequentlyBadTeachersCount} người • Điểm trung bình: ${summary.avgScore}/100 • Tổng tiết lủng: ${summary.totalGapsInSemester} tiết`]);
    rows.push([]);

    // Table Header
    rows.push([
      'STT',
      'Họ và tên GV',
      'Tổ chuyên môn',
      'Môn chính',
      'Số tiết TB/Tuần',
      '1. Số ngày nghỉ TB/Tuần',
      '2. Số buổi nghỉ TB/Tuần',
      '3. Tổng tiết lủng HK',
      'Tiết lủng TB/Tuần',
      'Buổi 1 tiết',
      'Nghỉ Thứ 2 (tuần)',
      'Nghỉ Thứ 7 (tuần)',
      'Số tuần bị xấu',
      'Điểm TB (100)',
      'Đánh giá chất lượng',
      'Khuyến nghị cân đối chủ động khi xếp TKB'
    ]);

    summary.allTeachers.forEach((m, idx) => {
      rows.push([
        idx + 1,
        m.teacherName,
        m.departmentName,
        m.mainSubjectName,
        m.avgPeriodsPerWeek,
        m.avgFreeDaysPerWeek,
        m.avgFreeHalfDaysPerWeek,
        m.totalGaps,
        m.avgGapsPerWeek,
        m.totalSinglePeriodSessions,
        `${m.mondayOffCount}/${m.totalWeeksEvaluated}`,
        `${m.saturdayOffCount}/${m.totalWeeksEvaluated}`,
        `${m.badWeeksCount}/${m.totalWeeksEvaluated}`,
        m.avgScore,
        m.statusLabel,
        m.balancingSuggestions.join(' | ')
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 24 },
      { wch: 22 },
      { wch: 18 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 28 },
      { wch: 45 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, `Danh_Gia_TKB_${summary.semester}`);
    XLSX.writeFile(wb, `Danh_Gia_TKB_${summary.semester}_${academicYear.replace(/\s+/g, '_')}.xlsx`);
  });
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
