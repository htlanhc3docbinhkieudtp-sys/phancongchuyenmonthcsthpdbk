import { TimetableSlot, Teacher, ClassGroup, Subject } from '../types';
import ExcelJS from 'exceljs';

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

  // Session stats & Golden Ratio
  sessionCount: number; // Số buổi dạy trong tuần
  periodsPerSession: number; // Tỷ lệ vàng: Số tiết thực tế trên TKB / Số buổi đi dạy (Không tính kiêm nhiệm)
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

  // 3 YẾU TỐ QUYẾT ĐỊNH SỐ NGÀY NGHỈ (KẾT LUẬN RÀ SOÁT CỦA BGH):
  isHomeroom: boolean; // 1. Có chủ nhiệm hay không (tiết Chào cờ sáng T2 và Sinh hoạt cuối tuần)
  homeroomClassName?: string; // Tên lớp chủ nhiệm
  morningPeriods: number; // Số tiết dạy buổi Sáng
  afternoonPeriods: number; // Số tiết dạy buổi Chiều
  isBothShifts: boolean; // 2. Có dạy cả 2 buổi sáng/chiều không
  morningAfternoonRatioText: string; // 3. Tỷ lệ số tiết sáng/chiều
  isNearEqualShifts: boolean; // Số tiết dạy sáng chiều có gần bằng nhau không
  grade67Periods: number; // Trường hợp đặc biệt: Dạy trái buổi khối 6, 7
  hasSpecialShiftCase: boolean; // Có trường hợp đặc biệt khác (chỉ dạy 3 tiết 1 buổi, dạy trái buổi K6,7)
  specialShiftDescription?: string;

  // THƯỚC ĐO CHÍNH: SỐ TIẾT DẠY / BUỔI (CHỈ ĐẠO BAN GIÁM HIỆU):
  ratioCategory: 'VERY_LOW' | 'VERY_HIGH' | 'BALANCED'; // Nhóm thấp nhất (<2.5) / cao nhất (>=4.2) / cân đối (2.5-4.1)
  ratioCategoryLabel: string;
  isProposalEligible: boolean; // Thuộc nhóm quá thấp hoặc quá cao để chủ động đề xuất điều chỉnh
  proposalDeadlineNote: string; // Trao đổi đề xuất chậm nhất Thứ 4 hàng tuần (Thứ 5 tạo TKB mới)

  // Objective root cause diagnosis
  primaryFactor: string; // Nguyên nhân chính (Đặc thù môn học / Liên ca / Liên điểm / Thuật toán)
  diagnosisNotes: string[];
  suggestedAction: string;
}

export interface SchoolQualitySummary {
  weekNumber: number;
  totalTeachersTeaching: number;
  averageScore: number;
  avgPeriodsPerSession: number; // Tỷ lệ trung bình toàn trường (tiết/buổi)
  totalGapsInSchool: number;
  teachersWithGapsCount: number;
  teachersWithSplitShiftsCount: number;
  teachersWithSinglePeriodSessionsCount: number;

  // Thống kê theo Thước đo chính: Số tiết dạy/buổi (BGH)
  ratioStats: {
    veryLowCount: number;       // Nhóm thấp nhất (< 2.5 tiết/buổi)
    veryHighCount: number;      // Nhóm cao nhất (>= 4.2 tiết/buổi)
    balancedCount: number;      // Nhóm cân đối (2.5 - 4.1 tiết/buổi)
    proposalEligibleCount: number; // Tổng số GV thuộc nhóm cần xem xét điều chỉnh
  };

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

export const isSchoolLeader = (t: Teacher): boolean => {
  if (!t) return false;
  const name = (t.name || '').trim();
  const role = (t.role as string) || '';
  const code = t.code || '';
  const dept = t.departmentId || '';
  const notes = t.notes || '';

  return (
    dept === 'dept-bgh' ||
    role === 'HieuTruong' ||
    role === 'PhoHieuTruong' ||
    role === 'HT' ||
    role === 'PHT' ||
    code.includes('(HT)') ||
    code.includes('(PHT)') ||
    notes.includes('Hiệu trưởng') ||
    notes.includes('Phó Hiệu trưởng') ||
    name === 'Lê Thanh Cường' ||
    name === 'Nguyễn Minh Trí' ||
    name === 'Phan Thanh Thảo' ||
    name === 'Nguyễn Thanh Tòng'
  );
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
  // Loại trừ Ban Giám Hiệu vì dạy rất ít tiết (theo yêu cầu chỉ đạo)
  const eligibleTeachers = teachers.filter(t => !isSchoolLeader(t));
  const teacherMap = new Map<string, Teacher>(eligibleTeachers.map(t => [t.id, t]));
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

  eligibleTeachers.forEach(teacher => {
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

    // TỶ LỆ VÀNG ĐÁNH GIÁ TKB (THEO CHỈ ĐẠO CỦA BGH):
    // Số tiết thực dạy trên TKB chia cho số buổi đi dạy (Không tính kiêm nhiệm)
    const periodsPerSession = sessionCount > 0 ? Number((tSlots.length / sessionCount).toFixed(2)) : 0;

    // TÍNH ĐIỂM CHẤT LƯỢNG DỰA TRÊN TỶ LỆ TIẾT THỰC DẠY / SỐ BUỔI ĐI DẠY (Thang 100):
    // 1. Điểm tỷ lệ (Tối đa 50 điểm): 5.0 t/b đạt 50đ, 4.0 t/b đạt 42đ, 3.2 t/b đạt 34đ, 2.4 t/b đạt 24đ
    const ratioScore = Math.min(50, Math.round((periodsPerSession / 5.0) * 50));

    // 2. Điểm số ngày nghỉ trọn ngày (Tối đa 30 điểm):
    const daysScore = Math.min(30, freeDays * 10);

    // 3. Điểm số tiết lủng (Tối đa 20 điểm):
    const gapsScore = Math.max(0, 20 - totalGaps * 5);

    let score = ratioScore + daysScore + gapsScore;

    // Trừ nhẹ nếu có buổi chỉ dạy 1 tiết đơn độc (tối đa -4đ)
    if (singlePeriodSessions > 0) {
      score -= Math.min(4, singlePeriodSessions * 2);
    }

    score = Math.max(10, Math.min(100, Math.round(score)));

    // Xếp loại TKB chuẩn xác theo Tỷ lệ Tiết thực dạy / Số buổi đi dạy:
    // Càng cao càng gọn gàng & thuận lợi, càng thấp càng dàn trải & bất tiện.
    let tier: QualityTier = 'GOOD';
    let tierLabel = 'Thuận lợi / Đẹp';
    let tierColor = 'text-blue-700 bg-blue-50 border-blue-200';

    if (periodsPerSession >= 4.0 && totalGaps <= 1) {
      tier = 'EXCELLENT';
      tierLabel = 'Rất đẹp / Tối ưu';
      tierColor = 'text-emerald-700 bg-emerald-50 border-emerald-300';
    } else if (periodsPerSession >= 3.2 && totalGaps <= 2) {
      tier = 'GOOD';
      tierLabel = 'Thuận lợi / Đẹp';
      tierColor = 'text-blue-700 bg-blue-50 border-blue-200';
    } else if (periodsPerSession >= 2.4 && totalGaps <= 3) {
      tier = 'AVERAGE';
      tierLabel = 'Bình thường';
      tierColor = 'text-amber-700 bg-amber-50 border-amber-200';
    } else {
      // Dưới 2.4 tiết/buổi: mỗi buổi lên trường chỉ dạy 1-2 tiết, lịch bị xé vụn và dàn trải
      tier = 'POOR';
      tierLabel = 'Bất tiện / Cần cân đối';
      tierColor = 'text-rose-700 bg-rose-50 border-rose-200';
    }

    // CHẨN ĐOÁN NGUYÊN NHÂN KHÁCH QUAN (Bản chất: do đâu?)
    let primaryFactor = 'Bình thường';
    const diagnosisNotes: string[] = [];
    let suggestedAction = 'Duy trì lịch hiện tại';

    if (periodsPerSession >= 4.0) {
      primaryFactor = 'TKB rất gọn & tập trung cao';
      diagnosisNotes.push(`TKB cực kỳ tối ưu: Đạt tỷ lệ ${periodsPerSession} tiết/buổi (${tSlots.length} tiết thực dạy trên ${sessionCount} buổi). Mỗi buổi đến trường dạy tập trung 4-5 tiết, không lãng phí công đi lại.`);
    } else if (periodsPerSession < 2.4) {
      primaryFactor = 'TKB bị dàn trải nhiều buổi';
      diagnosisNotes.push(`TKB bị phân tán: Tỷ lệ chỉ đạt ${periodsPerSession} tiết/buổi (${tSlots.length} tiết thực dạy nhưng đi dạy tới ${sessionCount} buổi). Mỗi buổi chỉ dạy 1-2 tiết.`);
      suggestedAction = 'Cần gom các tiết lẻ lại thành 1 ca học để giải phóng bớt buổi dạy cho giáo viên.';
    }

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
    }

    const assignedClassesList = Array.from(classesSet).map(cId => classMap.get(cId)?.name || cId);

    // 3 YẾU TỐ QUYẾT ĐỊNH SỐ NGÀY NGHỈ (KẾT LUẬN RÀ SOÁT CỦA BGH):
    // 1. Có chủ nhiệm hay không
    const homeroomClass = classes.find(c => c.homeroomTeacherId === teacher.id);
    const isHomeroom = !!homeroomClass;
    const homeroomClassName = homeroomClass?.name;

    // 2. Có dạy sáng chiều không & Số tiết dạy sáng chiều có gần bằng nhau không
    const morningPeriods = tSlots.filter(s => s.session === 'SANG').length;
    const afternoonPeriods = tSlots.filter(s => s.session === 'CHIEU').length;
    const isBothShifts = morningPeriods > 0 && afternoonPeriods > 0;
    const morningAfternoonDiff = Math.abs(morningPeriods - afternoonPeriods);
    const isNearEqualShifts = isBothShifts && morningAfternoonDiff <= 4;
    const morningAfternoonRatioText = isBothShifts
      ? `${morningPeriods}S / ${afternoonPeriods}C ${isNearEqualShifts ? '(Gần bằng)' : ''}`
      : morningPeriods > 0 ? `${morningPeriods} tiết Sáng` : `${afternoonPeriods} tiết Chiều`;

    // 3. Các trường hợp đặc biệt: Chỉ dạy 3 tiết 1 buổi, Dạy trái buổi khối 6, 7 nhiều tiết
    const grade67Periods = tSlots.filter(s => {
      const cls = classMap.get(s.classId);
      return cls?.grade === '6' || cls?.grade === '7';
    }).length;

    const has3PeriodSession = Object.values(sessionSlotsMap).some(slots => slots.length === 3);
    const hasSpecialShiftCase = has3PeriodSession || grade67Periods >= 4 || isCrossCampus;
    let specialShiftDescription = '';
    if (grade67Periods >= 4) specialShiftDescription = `Dạy trái buổi K6,7 (${grade67Periods} tiết)`;
    else if (has3PeriodSession) specialShiftDescription = 'Có buổi dạy 3 tiết';
    else if (isCrossCampus) specialShiftDescription = 'Giảng dạy liên 2 điểm trường';

    // THƯỚC ĐO CHÍNH CỐT LÕI (CHỈ ĐẠO BAN GIÁM HIỆU):
    // Số tiết dạy bình quân trong 1 buổi (periodsPerSession)
    let ratioCategory: 'VERY_LOW' | 'VERY_HIGH' | 'BALANCED' = 'BALANCED';
    let ratioCategoryLabel = 'Cân đối (2.5 - 4.1 tiết/buổi)';

    if (periodsPerSession < 2.5) {
      ratioCategory = 'VERY_LOW';
      ratioCategoryLabel = 'Nhóm Thấp Nhất (< 2.5 tiết/buổi) — Dàn trải';
    } else if (periodsPerSession >= 4.2) {
      ratioCategory = 'VERY_HIGH';
      ratioCategoryLabel = 'Nhóm Cao Nhất (≥ 4.2 tiết/buổi) — Quá tải';
    }

    const isProposalEligible = ratioCategory === 'VERY_LOW' || ratioCategory === 'VERY_HIGH';
    const proposalDeadlineNote = 'Trao đổi đề xuất BGH chậm nhất Thứ Tư hàng tuần (Thứ Năm tạo TKB mới)';

    // Gắn thông báo chẩn đoán theo kết luận của BGH
    if (isHomeroom) {
      diagnosisNotes.push(`Chủ nhiệm lớp ${homeroomClassName}: Có tiết Chào cờ (Sáng T2) và Sinh hoạt lớp (cuối tuần), neo lịch 2 đầu tuần nên số ngày nghỉ trọn ngày bị chi phối.`);
    }
    if (isBothShifts) {
      diagnosisNotes.push(`Dạy cả hai buổi Sáng & Chiều (${morningAfternoonRatioText}). ${isNearEqualShifts ? 'Số tiết sáng chiều gần bằng nhau nên phải có mặt nhiều buổi ở trường.' : ''}`);
    }
    if (grade67Periods >= 4) {
      diagnosisNotes.push(`Dạy trái buổi khối 6, 7 (${grade67Periods} tiết), làm phát sinh thêm ca học buổi chiều.`);
    }
    if (isProposalEligible) {
      diagnosisNotes.push(`📢 QUY ĐỊNH BGH: Thầy/Cô thuộc ${ratioCategoryLabel}. Nếu có nguyện vọng điều chỉnh TKB, vui lòng chủ động trao đổi đề xuất với BGH chậm nhất Thứ Tư hàng tuần (Thứ Năm tạo TKB mới).`);
    }

    // Bổ sung chẩn đoán tải cao (nhiều tiết, nhiều lớp)
    if (tSlots.length >= 21 || classesSet.size >= 8) {
      diagnosisNotes.unshift(`Dạy định mức cao (${tSlots.length} tiết thực tế trên ${classesSet.size} lớp: ${assignedClassesList.join(', ')}). Đạt hiệu suất ${periodsPerSession} tiết/buổi.`);
    }

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
      periodsPerSession,
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
      isHomeroom,
      homeroomClassName,
      morningPeriods,
      afternoonPeriods,
      isBothShifts,
      morningAfternoonRatioText,
      isNearEqualShifts,
      grade67Periods,
      hasSpecialShiftCase,
      specialShiftDescription,
      ratioCategory,
      ratioCategoryLabel,
      isProposalEligible,
      proposalDeadlineNote,
      primaryFactor,
      diagnosisNotes,
      suggestedAction
    });
  });

  // SẮP XẾP DANH SÁCH TOÀN TRƯỜNG THEO ĐÚNG CHỈ ĐẠO CỦA BGH:
  // 1/ Tỷ lệ số tiết thực dạy / số buổi đi dạy: từ CAO xuống THẤP (TKB đẹp nhất xếp đầu)
  // 2/ Số ngày nghỉ (trọn ngày): từ CAO xuống THẤP
  // 3/ Số buổi nghỉ: từ CAO xuống THẤP
  // 4/ Số tiết lủng: từ THẤP lên CAO (ít lủng hơn xếp trước)
  metrics.sort((a, b) => {
    if (b.periodsPerSession !== a.periodsPerSession) return b.periodsPerSession - a.periodsPerSession;
    if (b.freeDays !== a.freeDays) return b.freeDays - a.freeDays;
    if (b.freeHalfDays !== a.freeHalfDays) return b.freeHalfDays - a.freeHalfDays;
    if (a.totalGaps !== b.totalGaps) return a.totalGaps - b.totalGaps;
    return b.totalPeriods - a.totalPeriods;
  });

  // Top thuận lợi (TKB đẹp nhất theo tỷ lệ Tiết thực dạy / Số buổi đi dạy)
  const topConvenientTeachers = metrics.slice(0, 15);

  // Top bất tiện nhất (cần cân đối): sắp xếp từ người có tỷ lệ Tiết/Buổi thấp nhất (bị dàn trải nhiều buổi nhất)
  const topInconvenientTeachers = [...metrics].sort((a, b) => {
    if (a.periodsPerSession !== b.periodsPerSession) return a.periodsPerSession - b.periodsPerSession;
    if (a.freeDays !== b.freeDays) return a.freeDays - b.freeDays;
    if (a.freeHalfDays !== b.freeHalfDays) return a.freeHalfDays - b.freeHalfDays;
    return b.totalGaps - a.totalGaps;
  }).slice(0, 15);

  const totalGapsInSchool = metrics.reduce((s, m) => s + m.totalGaps, 0);
  const averageScore = Math.round(metrics.reduce((s, m) => s + m.score, 0) / (metrics.length || 1));
  const avgPeriodsPerSession = Number((metrics.reduce((s, m) => s + m.periodsPerSession, 0) / (metrics.length || 1)).toFixed(2));

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
    avgPeriodsPerSession,
    totalGapsInSchool,
    teachersWithGapsCount: metrics.filter(m => m.totalGaps > 0).length,
    teachersWithSplitShiftsCount: metrics.filter(m => m.splitShiftDays > 0).length,
    teachersWithSinglePeriodSessionsCount: metrics.filter(m => m.singlePeriodSessions > 0).length,
    ratioStats: {
      veryLowCount: metrics.filter(m => m.ratioCategory === 'VERY_LOW').length,
      veryHighCount: metrics.filter(m => m.ratioCategory === 'VERY_HIGH').length,
      balancedCount: metrics.filter(m => m.ratioCategory === 'BALANCED').length,
      proposalEligibleCount: metrics.filter(m => m.isProposalEligible).length,
    },
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
  assignedClassesCount: number;
  assignedClassesList: string[];
  
  // Aggregate stats across weeks in semester
  totalWeeksEvaluated: number;
  avgPeriodsPerWeek: number;
  avgSessionsPerWeek: number;     // Số buổi đi dạy TB / tuần
  periodsPerSession: number;      // Tỷ lệ vàng: Số tiết thực dạy TB / Số buổi đi dạy TB (Không tính kiêm nhiệm)
  
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

  // 3 YẾU TỐ QUYẾT ĐỊNH SỐ NGÀY NGHỈ (KẾT LUẬN RÀ SOÁT CỦA BGH):
  isHomeroom: boolean; // 1. Có chủ nhiệm hay không
  homeroomClassName?: string; // Tên lớp chủ nhiệm
  morningPeriods: number; // Số tiết dạy Sáng TB
  afternoonPeriods: number; // Số tiết dạy Chiều TB
  isBothShifts: boolean; // 2. Có dạy cả 2 buổi sáng/chiều không
  morningAfternoonRatioText: string; // 3. Tỷ lệ số tiết sáng/chiều
  isNearEqualShifts: boolean; // Số tiết sáng chiều có gần bằng nhau không
  grade67Periods: number; // Trái buổi khối 6, 7
  hasSpecialShiftCase: boolean;
  specialShiftDescription?: string;

  // THƯỚC ĐO CHÍNH: SỐ TIẾT DẠY / BUỔI (CHỈ ĐẠO BAN GIÁM HIỆU):
  ratioCategory: 'VERY_LOW' | 'VERY_HIGH' | 'BALANCED';
  ratioCategoryLabel: string;
  isProposalEligible: boolean;
  proposalDeadlineNote: string;
  
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
  avgPeriodsPerSession: number;   // Tỷ lệ trung bình toàn trường (tiết/buổi)
  totalGapsInSemester: number;

  // Thống kê theo Thước đo chính: Số tiết dạy/buổi (BGH)
  ratioStats: {
    veryLowCount: number;
    veryHighCount: number;
    balancedCount: number;
    proposalEligibleCount: number;
  };
  
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

  // Loại trừ Ban Giám Hiệu vì dạy rất ít tiết (theo chỉ đạo)
  const eligibleTeachers = teachers.filter(t => !isSchoolLeader(t));
  const teacherMetrics: TeacherSemesterQualityMetric[] = [];

  eligibleTeachers.forEach(tch => {
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
    // Số buổi dạy TB: 12 buổi trừ đi số buổi nghỉ TB
    const avgSessionsPerWeek = Math.round(((12 * evaluatedCount - sumFreeHalfDays) / evaluatedCount) * 10) / 10;
    // TỶ LỆ VÀNG CHÍNH XÁC NHẤT (Theo chỉ đạo BGH): Số tiết thực dạy TB / Số buổi dạy TB (Không tính kiêm nhiệm)
    const periodsPerSession = avgSessionsPerWeek > 0 ? Number((avgPeriods / avgSessionsPerWeek).toFixed(2)) : 0;

    // Xác định giáo viên thực sự thường xuyên bị TKB xấu theo tỷ lệ Tiết thực dạy / Số buổi đi dạy:
    // Dưới 2.5 tiết/buổi là dàn trải nhiều buổi, mất công đi lại
    const isFrequentlyBad = 
      (periodsPerSession < 2.5) ||
      (periodsPerSession < 2.8 && avgGaps >= 1.5) ||
      (avgGaps >= 3.0);

    let overallStatus: TeacherSemesterQualityMetric['overallStatus'] = 'GOOD';
    let statusLabel = 'TKB Thuận Lợi / Đẹp';
    let statusColor = 'text-blue-700 bg-blue-50 border-blue-200';

    if (isFrequentlyBad) {
      overallStatus = 'FREQUENTLY_BAD';
      statusLabel = 'Thường xuyên bị xấu (Cần cân đối)';
      statusColor = 'text-rose-700 bg-rose-50 border-rose-300 font-black';
    } else if (periodsPerSession >= 4.0 && avgGaps <= 1.0) {
      overallStatus = 'EXCELLENT';
      statusLabel = 'TKB Rất Đẹp & Tối Ưu';
      statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-300';
    } else if (periodsPerSession >= 3.2 && avgGaps <= 1.5) {
      overallStatus = 'GOOD';
      statusLabel = 'TKB Thuận Lợi / Đẹp';
      statusColor = 'text-blue-700 bg-blue-50 border-blue-200';
    } else if (periodsPerSession >= 2.4 && avgGaps <= 2.0) {
      overallStatus = 'AVERAGE';
      statusLabel = 'TKB Bình thường';
      statusColor = 'text-amber-700 bg-amber-50 border-amber-200';
    } else {
      overallStatus = 'FREQUENTLY_BAD';
      statusLabel = 'TKB Bị Dàn Trải / Cần Cân Đối';
      statusColor = 'text-rose-700 bg-rose-50 border-rose-300';
    }

    // Generate balancing suggestions for scheduler
    const balancingSuggestions: string[] = [];
    if (periodsPerSession >= 4.0) {
      balancingSuggestions.push(`Lịch rất gọn gàng: Hiệu suất cao đạt TB ${periodsPerSession} tiết/buổi trên ${avgSessionsPerWeek} buổi dạy. Tiếp tục duy trì.`);
    } else if (periodsPerSession < 2.5) {
      balancingSuggestions.push(`TKB bị dàn trải nhiều buổi: Dạy ${avgPeriods} tiết/tuần nhưng phải đi dạy ${avgSessionsPerWeek} buổi (TB chỉ ${periodsPerSession} tiết/buổi). Cần gom tiết lại thành các buổi 4-5 tiết để giải phóng buổi dạy.`);
    }

    if (avgPeriods >= 21 || assignedClasses.size >= 8) {
      balancingSuggestions.push(`Định mức dạy rất cao (TB ${avgPeriods} tiết/tuần trên ${assignedClasses.size} lớp: ${Array.from(assignedClasses).join(', ')}). Với quy mô lớn, việc ít buổi nghỉ hơn giáo viên ít tiết là bình thường.`);
    }
    if (tch.name.includes('Lê Thái Phương') || (mainSub.includes('Hóa') && assignedClasses.has('7A5'))) {
      balancingSuggestions.push('Rà soát tiết HĐTNHN lớp 7A5: Điều chuyển sang GV khối 7 hoặc khóa cố định vào buổi có sẵn để giảm từ 5 ngày xuống 3-4 ngày dạy/tuần.');
    }
    if (sumGaps >= 6) {
      balancingSuggestions.push(`Bị lủng tổng cộng ${sumGaps} tiết (TB ${avgGaps} tiết/tuần). Cần ưu tiên đảo tiết với GV cùng tổ để triệt tiêu các khoảng trống.`);
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
      assignedClassesCount: assignedClasses.size,
      assignedClassesList: Array.from(assignedClasses),
      totalWeeksEvaluated: evaluatedCount,
      avgPeriodsPerWeek: avgPeriods,
      avgSessionsPerWeek,
      periodsPerSession,
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

  // Sắp xếp danh sách toàn trường theo chỉ đạo BGH:
  // 1/ Tỷ lệ số tiết thực dạy TB / số buổi đi dạy TB: từ CAO xuống THẤP (TKB đẹp nhất xếp đầu)
  // 2/ Số ngày nghỉ TB/tuần: từ CAO xuống THẤP
  // 3/ Số buổi nghỉ TB/tuần: từ CAO xuống THẤP
  // 4/ Số tiết lủng: từ THẤP lên CAO (ít lủng hơn xếp trước)
  teacherMetrics.sort((a, b) => {
    if (b.periodsPerSession !== a.periodsPerSession) return b.periodsPerSession - a.periodsPerSession;
    if (b.avgFreeDaysPerWeek !== a.avgFreeDaysPerWeek) return b.avgFreeDaysPerWeek - a.avgFreeDaysPerWeek;
    if (b.avgFreeHalfDaysPerWeek !== a.avgFreeHalfDaysPerWeek) return b.avgFreeHalfDaysPerWeek - a.avgFreeHalfDaysPerWeek;
    if (a.totalGaps !== b.totalGaps) return a.totalGaps - b.totalGaps;
    return b.avgScore - a.avgScore;
  });

  // Frequently bad teachers (cần cân đối): sắp xếp từ người có tỷ lệ Tiết/Buổi thấp nhất (bị dàn trải nhiều buổi nhất)
  const frequentlyBadTeachers = teacherMetrics
    .filter(t => t.isFrequentlyBad)
    .sort((a, b) => {
      if (a.periodsPerSession !== b.periodsPerSession) return a.periodsPerSession - b.periodsPerSession;
      return a.avgFreeDaysPerWeek - b.avgFreeDaysPerWeek;
    });
  const totalGapsInSemester = teacherMetrics.reduce((s, t) => s + t.totalGaps, 0);
  const avgScore = Math.round(teacherMetrics.reduce((s, t) => s + t.avgScore, 0) / (teacherMetrics.length || 1));
  const avgPeriodsPerSession = Number((teacherMetrics.reduce((s, m) => s + m.periodsPerSession, 0) / (teacherMetrics.length || 1)).toFixed(2));

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
    avgPeriodsPerSession,
    totalGapsInSemester,
    frequentlyBadTeachers,
    allTeachers: teacherMetrics,
    departmentStats
  };
}

/**
 * Xuất file Excel báo cáo tổng hợp chất lượng TKB Học kỳ chuẩn văn bản hành chính với ExcelJS
 * Đầy đủ kẻ khung bảng biểu, tô màu phân cấp chất lượng, tỷ lệ vàng và chữ ký 3 bên
 */
export async function exportSemesterQualityReportExcel(
  summary: SemesterQualitySummary,
  academicYear: string = '2026 - 2027'
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Trường THCS và THPT Đốc Binh Kiều';
  wb.created = new Date();

  const ws = wb.addWorksheet(`Danh_Gia_TKB_${summary.semester}`, {
    views: [{ showGridLines: true }]
  });

  // Borders
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };
  const headerBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF1E3A8A' } },
    left: { style: 'thin', color: { argb: 'FF1E3A8A' } },
    bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
    right: { style: 'thin', color: { argb: 'FF1E3A8A' } }
  };

  // 1. Quốc hiệu - Tiêu ngữ & Đơn vị ban hành (Nghị định 30/2020/NĐ-CP)
  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP';
  ws.getCell('A1').font = { name: 'Arial', size: 10, bold: false };
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('I1:S1');
  ws.getCell('I1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  ws.getCell('I1').font = { name: 'Arial', size: 10.5, bold: true };
  ws.getCell('I1').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A2:F2');
  ws.getCell('A2').value = 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU';
  ws.getCell('A2').font = { name: 'Arial', size: 10.5, bold: true };
  ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('I2:S2');
  ws.getCell('I2').value = 'Độc lập - Tự do - Hạnh phúc';
  ws.getCell('I2').font = { name: 'Arial', size: 10.5, bold: true, underline: true };
  ws.getCell('I2').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A3:F3');
  ws.getCell('A3').value = 'Số: ..... /BC-TKB-DBK';
  ws.getCell('A3').font = { name: 'Arial', size: 9.5, italic: true };
  ws.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('I3:S3');
  ws.getCell('I3').value = 'Đồng Tháp, ngày ..... tháng ..... năm 2026';
  ws.getCell('I3').font = { name: 'Arial', size: 10, italic: true };
  ws.getCell('I3').alignment = { horizontal: 'center', vertical: 'middle' };

  // 2. Tiêu đề báo cáo
  ws.mergeCells('A5:S5');
  ws.getCell('A5').value = 'BÁO CÁO TỔNG HỢP XẾP HẠNG & ĐÁNH GIÁ CHẤT LƯỢNG THỜI KHÓA BIỂU';
  ws.getCell('A5').font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FF1E3A8A' } };
  ws.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(5).height = 30;

  ws.mergeCells('A6:S6');
  ws.getCell('A6').value = `(${summary.semesterLabel.toUpperCase()} - NĂM HỌC ${academicYear})`;
  ws.getCell('A6').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0F766E' } };
  ws.getCell('A6').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(6).height = 22;

  ws.mergeCells('A7:S7');
  ws.getCell('A7').value = '* CĂN CỨ ĐÁNH GIÁ TKB ĐẸP/XẤU: TỶ LỆ SỐ TIẾT THỰC DẠY / SỐ BUỔI ĐI DẠY (KHÔNG TÍNH KIÊM NHIỆM)';
  ws.getCell('A7').font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFB45309' } };
  ws.getCell('A7').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(7).height = 20;

  // 3. Khối tổng hợp số liệu KPI
  ws.mergeCells('A9:S9');
  ws.getCell('A9').value = `THỐNG KÊ TOÀN TRƯỜNG: Các tuần đánh giá: Tuần ${summary.evaluatedWeeks.join(', ')}  |  Tổng số GV: ${summary.totalTeachers} người  |  Điểm trung bình: ${summary.avgScore}/100  |  Hiệu suất bình quân: ${summary.avgPeriodsPerSession} tiết/buổi  |  Số GV cần cân đối: ${summary.frequentlyBadTeachersCount} người  |  Tổng tiết lủng cả HK: ${summary.totalGapsInSemester} tiết`;
  ws.getCell('A9').font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF1E293B' } };
  ws.getCell('A9').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  ws.getCell('A9').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getCell('A9').border = thinBorder;
  ws.getRow(9).height = 26;

  // 4. Headers của bảng dữ liệu
  const headers = [
    'Hạng TKB',
    'Mã GV',
    'Họ và tên giáo viên',
    'Tổ chuyên môn',
    'Môn chính',
    'Số tiết TB/Tuần\n(Thực dạy TKB)',
    'Số buổi dạy TB\n(Buổi/tuần)',
    'TỶ LỆ TIẾT / BUỔI\n(TIÊU CHÍ VÀNG)',
    'Xếp loại TKB\nHọc kỳ',
    'Số ngày nghỉ TB\n(Trọn ngày)',
    'Số buổi nghỉ TB\n(Buổi/tuần)',
    'Tổng tiết lủng\n(Cả học kỳ)',
    'Tiết lủng TB\n(Tiết/tuần)',
    'Tổng buổi 1 tiết\n(Buổi đơn độc)',
    'Nghỉ Thứ 2\n(Số tuần)',
    'Nghỉ Thứ 7\n(Số tuần)',
    'Tuần TKB xấu\n(Số tuần)',
    'Điểm TB\n(Thang 100)',
    'Đề xuất cân đối & Giải pháp cho BGH'
  ];

  const headerRow = ws.getRow(11);
  headerRow.height = 42;

  headers.forEach((h, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.value = h;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = headerBorder;

    // Cột tiêu chí vàng (Cột 8) tô màu xanh ngọc nổi bật
    if (colIdx === 7) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } };
      cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
    } else {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    }
  });

  // Đảm bảo danh sách được xếp hạng từ TKB đẹp nhất (tỷ lệ cao nhất) đến xấu nhất
  const sortedTeachers = [...summary.allTeachers].sort((a, b) => {
    if (b.periodsPerSession !== a.periodsPerSession) return b.periodsPerSession - a.periodsPerSession;
    if (b.avgFreeDaysPerWeek !== a.avgFreeDaysPerWeek) return b.avgFreeDaysPerWeek - a.avgFreeDaysPerWeek;
    if (b.avgFreeHalfDaysPerWeek !== a.avgFreeHalfDaysPerWeek) return b.avgFreeHalfDaysPerWeek - a.avgFreeHalfDaysPerWeek;
    if (a.totalGaps !== b.totalGaps) return a.totalGaps - b.totalGaps;
    return b.avgPeriodsPerWeek - a.avgPeriodsPerWeek;
  });

  // 5. Thêm dữ liệu từng giáo viên
  sortedTeachers.forEach((m, idx) => {
    const rIdx = 12 + idx;
    const row = ws.getRow(rIdx);
    row.height = 26;

    const isEven = idx % 2 === 1;
    const baseZebraFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isEven ? 'FFF8FAFC' : 'FFFFFFFF' }
    };

    // Giá trị các cột
    row.getCell(1).value = idx + 1; // Hạng TKB
    row.getCell(2).value = m.teacherCode || '-';
    row.getCell(3).value = m.teacherName;
    row.getCell(4).value = m.departmentName;
    row.getCell(5).value = m.mainSubjectName;
    row.getCell(6).value = m.avgPeriodsPerWeek;
    row.getCell(7).value = m.avgSessionsPerWeek;
    row.getCell(8).value = m.periodsPerSession; // Tiêu chí vàng
    row.getCell(9).value = m.statusLabel;
    row.getCell(10).value = m.avgFreeDaysPerWeek;
    row.getCell(11).value = m.avgFreeHalfDaysPerWeek;
    row.getCell(12).value = m.totalGaps;
    row.getCell(13).value = m.avgGapsPerWeek;
    row.getCell(14).value = m.totalSinglePeriodSessions;
    row.getCell(15).value = `${m.mondayOffCount}/${m.totalWeeksEvaluated}`;
    row.getCell(16).value = `${m.saturdayOffCount}/${m.totalWeeksEvaluated}`;
    row.getCell(17).value = `${m.badWeeksCount}/${m.totalWeeksEvaluated}`;
    row.getCell(18).value = m.avgScore;
    row.getCell(19).value = m.balancingSuggestions.join(' | ') || 'Lịch dạy ổn định, duy trì.';

    // Định dạng cell
    for (let c = 1; c <= 19; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;
      cell.fill = baseZebraFill;
      cell.font = { name: 'Arial', size: 9.5 };

      // Căn lề
      if (c === 3 || c === 4 || c === 5) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else if (c === 19) {
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }

    // Họ tên đậm
    row.getCell(3).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    // Hạng TKB đậm
    row.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E40AF' } };

    // CỘT 8: TIÊU CHÍ VÀNG - TÔ MÀU ĐẶC BIỆT THEO TỶ LỆ TIẾT/BUỔI
    const ratioCell = row.getCell(8);
    ratioCell.numFmt = '0.00';
    if (m.periodsPerSession >= 4.0) {
      ratioCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
      ratioCell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF166534' } };
    } else if (m.periodsPerSession >= 3.2) {
      ratioCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      ratioCell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF1E40AF' } };
    } else if (m.periodsPerSession >= 2.4) {
      ratioCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      ratioCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF92400E' } };
    } else {
      // Dưới 2.4: TKB Xấu (dàn trải nhiều buổi, mỗi buổi chỉ 1-2 tiết)
      ratioCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      ratioCell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF991B1B' } };
    }

    // CỘT 9: XẾP LOẠI TKB
    const statusCell = row.getCell(9);
    if (m.overallStatus === 'EXCELLENT') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
      statusCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF166534' } };
    } else if (m.overallStatus === 'GOOD') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      statusCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF1E40AF' } };
    } else if (m.overallStatus === 'AVERAGE') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      statusCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF92400E' } };
    } else {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      statusCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF991B1B' } };
    }
  });

  // 6. Khung chữ ký phê duyệt (Chỉ Phó Hiệu trưởng Nguyễn Minh Trí)
  const lastDataRow = 12 + sortedTeachers.length;
  const sigDateRow = lastDataRow + 2;
  const sigRoleRow = sigDateRow + 1;
  const sigTitleRow = sigRoleRow + 1;
  const sigGuideRow = sigTitleRow + 1;
  const sigNameRow = sigGuideRow + 5;

  ws.mergeCells(`O${sigDateRow}:S${sigDateRow}`);
  ws.getCell(`O${sigDateRow}`).value = 'Đồng Tháp, ngày ..... tháng ..... năm 2026';
  ws.getCell(`O${sigDateRow}`).font = { name: 'Arial', size: 10, italic: true };
  ws.getCell(`O${sigDateRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  // Dòng chức danh
  ws.mergeCells(`O${sigRoleRow}:S${sigRoleRow}`);
  ws.getCell(`O${sigRoleRow}`).value = 'KT. HIỆU TRƯỞNG';
  ws.getCell(`O${sigRoleRow}`).font = { name: 'Arial', size: 10.5, bold: true };
  ws.getCell(`O${sigRoleRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`O${sigTitleRow}:S${sigTitleRow}`);
  ws.getCell(`O${sigTitleRow}`).value = 'PHÓ HIỆU TRƯỞNG';
  ws.getCell(`O${sigTitleRow}`).font = { name: 'Arial', size: 11, bold: true };
  ws.getCell(`O${sigTitleRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  // Dòng hướng dẫn ký
  ws.mergeCells(`O${sigGuideRow}:S${sigGuideRow}`);
  ws.getCell(`O${sigGuideRow}`).value = '(Ký và ghi rõ họ tên)';
  ws.getCell(`O${sigGuideRow}`).font = { name: 'Arial', size: 9, italic: true };
  ws.getCell(`O${sigGuideRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  // Họ tên Phó Hiệu trưởng
  ws.mergeCells(`O${sigNameRow}:S${sigNameRow}`);
  ws.getCell(`O${sigNameRow}`).value = 'Nguyễn Minh Trí';
  ws.getCell(`O${sigNameRow}`).font = { name: 'Arial', size: 11, bold: true };
  ws.getCell(`O${sigNameRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  // 7. Thiết lập độ rộng cột tỉ mỉ
  const colWidths = [
    10, // 1. Hạng TKB
    10, // 2. Mã GV
    25, // 3. Họ và tên
    22, // 4. Tổ CM
    18, // 5. Môn chính
    16, // 6. Tiết TB
    14, // 7. Buổi TB
    18, // 8. TỶ LỆ TIẾT/BUỔI (VÀNG)
    20, // 9. Xếp loại
    15, // 10. Ngày nghỉ TB
    15, // 11. Buổi nghỉ TB
    14, // 12. Tổng lủng
    13, // 13. Lủng TB
    14, // 14. Buổi 1 tiết
    13, // 15. Nghỉ T2
    13, // 16. Nghỉ T7
    13, // 17. Tuần xấu
    12, // 18. Điểm TB
    45  // 19. Đề xuất
  ];

  colWidths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // Tải file trực tiếp về máy
  const fileName = `Bao_Cao_Danh_Gia_TKB_${summary.semester}_${academicYear.replace(/\s+/g, '_')}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export interface TeacherMultiWeekDaysOffRecord {
  teacherId: string;
  teacherName: string;
  teacherCode: string;
  departmentName: string;
  mainSubjectName: string;
  totalPeriods: number;
  assignedClassesCount: number;
  assignedClassesList: string[];
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
  const classMap = new Map<string, ClassGroup>(classes.map(c => [c.id, c]));
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
  const eligibleTeachers = teachers.filter(t => !isSchoolLeader(t));

  eligibleTeachers.forEach(teacher => {
    // Check if teacher has teaching periods in any of the checked weeks
    let hasAnySlots = false;
    let totalPeriodsW1 = 0;
    const classesSet = new Set<string>();
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
        tSlots.forEach(s => classesSet.add(s.classId));
        if (w === 1 || totalPeriodsW1 === 0) totalPeriodsW1 = tSlots.length;

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

    const assignedClassesList = Array.from(classesSet).map(cId => classMap.get(cId)?.name || cId);

    records.push({
      teacherId: teacher.id,
      teacherName: teacher.name,
      teacherCode: teacher.code || '',
      departmentName: deptMap[teacher.departmentId] || teacher.departmentId,
      mainSubjectName: teacher.notes?.split('-')?.[1]?.trim() || 'Chuyên môn',
      totalPeriods: totalPeriodsW1 || 0,
      assignedClassesCount: classesSet.size,
      assignedClassesList,
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
 * Xuất file Excel báo cáo chi tiết đánh giá chất lượng TKB Tuần chuẩn văn bản hành chính với ExcelJS
 * Đầy đủ kẻ khung bảng biểu, tô màu phân cấp chất lượng, tỷ lệ vàng và chữ ký 3 bên
 */
export async function exportTimetableQualityReportExcel(
  summary: SchoolQualitySummary,
  academicYear: string = '2026 - 2027'
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Trường THCS và THPT Đốc Binh Kiều';
  wb.created = new Date();

  const ws = wb.addWorksheet(`Danh_Gia_TKB_Tuan_${summary.weekNumber}`, {
    views: [{ showGridLines: true }]
  });

  // Borders
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };
  const headerBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF1E3A8A' } },
    left: { style: 'thin', color: { argb: 'FF1E3A8A' } },
    bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
    right: { style: 'thin', color: { argb: 'FF1E3A8A' } }
  };

  // 1. Quốc hiệu - Tiêu ngữ & Đơn vị ban hành (Nghị định 30/2020/NĐ-CP)
  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP';
  ws.getCell('A1').font = { name: 'Arial', size: 10, bold: false };
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('I1:S1');
  ws.getCell('I1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  ws.getCell('I1').font = { name: 'Arial', size: 10.5, bold: true };
  ws.getCell('I1').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A2:F2');
  ws.getCell('A2').value = 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU';
  ws.getCell('A2').font = { name: 'Arial', size: 10.5, bold: true };
  ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('I2:S2');
  ws.getCell('I2').value = 'Độc lập - Tự do - Hạnh phúc';
  ws.getCell('I2').font = { name: 'Arial', size: 10.5, bold: true, underline: true };
  ws.getCell('I2').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A3:F3');
  ws.getCell('A3').value = 'Số: ..... /BC-TKB-DBK';
  ws.getCell('A3').font = { name: 'Arial', size: 9.5, italic: true };
  ws.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('I3:S3');
  ws.getCell('I3').value = 'Đồng Tháp, ngày ..... tháng ..... năm 2026';
  ws.getCell('I3').font = { name: 'Arial', size: 10, italic: true };
  ws.getCell('I3').alignment = { horizontal: 'center', vertical: 'middle' };

  // 2. Tiêu đề báo cáo
  ws.mergeCells('A5:S5');
  ws.getCell('A5').value = `BÁO CÁO XẾP HẠNG & ĐÁNH GIÁ CHẤT LƯỢNG THỜI KHÓA BIỂU - TUẦN ${summary.weekNumber}`;
  ws.getCell('A5').font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FF1E3A8A' } };
  ws.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(5).height = 30;

  ws.mergeCells('A6:S6');
  ws.getCell('A6').value = `(NĂM HỌC ${academicYear} - TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU)`;
  ws.getCell('A6').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0F766E' } };
  ws.getCell('A6').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(6).height = 22;

  ws.mergeCells('A7:S7');
  ws.getCell('A7').value = '* CĂN CỨ ĐÁNH GIÁ TKB ĐẸP/XẤU: TỶ LỆ SỐ TIẾT THỰC DẠY / SỐ BUỔI ĐI DẠY (KHÔNG TÍNH KIÊM NHIỆM)';
  ws.getCell('A7').font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFB45309' } };
  ws.getCell('A7').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(7).height = 20;

  // 3. Khối tổng hợp KPI
  ws.mergeCells('A9:S9');
  ws.getCell('A9').value = `TỔNG HỢP TOÀN TRƯỜNG: Tổng số GV giảng dạy: ${summary.totalTeachersTeaching} người  |  Điểm trung bình: ${summary.averageScore}/100  |  Hiệu suất bình quân: ${summary.avgPeriodsPerSession} tiết/buổi  |  Tổng tiết lủng: ${summary.totalGapsInSchool} tiết  |  GV có tiết lủng: ${summary.teachersWithGapsCount} người  |  GV dạy cả 2 ca: ${summary.teachersWithSplitShiftsCount} người`;
  ws.getCell('A9').font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF1E293B' } };
  ws.getCell('A9').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  ws.getCell('A9').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getCell('A9').border = thinBorder;
  ws.getRow(9).height = 26;

  // 4. Headers của bảng dữ liệu
  const headers = [
    'Hạng TKB',
    'Mã GV',
    'Họ và tên giáo viên',
    'Tổ chuyên môn',
    'Môn chính',
    'Số tiết dạy/T\n(Thực tế TKB)',
    'Số buổi đi dạy\n(Buổi/tuần)',
    'TỶ LỆ TIẾT / BUỔI\n(TIÊU CHÍ VÀNG)',
    'Xếp loại TKB\n(Đẹp / Xấu)',
    'Số ngày nghỉ\n(Trọn ngày)',
    'Chi tiết thứ nghỉ\n(Thứ trong tuần)',
    'Số buổi nghỉ\n(Buổi trống)',
    'Số tiết lủng\n(Tiết trống)',
    'Buổi 1 tiết\n(Đơn lẻ)',
    'Ngày dạy 2 ca\n(Sáng + Chiều)',
    'Số lớp dạy\n(Tổng lớp)',
    'Danh sách lớp phụ trách',
    'Điểm tiện lợi\n(Thang 100)',
    'Nguyên nhân chính & Khuyến nghị điều chỉnh TKB'
  ];

  const headerRow = ws.getRow(11);
  headerRow.height = 42;

  headers.forEach((h, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.value = h;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = headerBorder;

    // Cột tiêu chí vàng (Cột 8) tô màu xanh ngọc nổi bật
    if (colIdx === 7) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } };
      cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
    } else {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    }
  });

  // Đảm bảo danh sách được xếp hạng từ TKB đẹp nhất (tỷ lệ cao nhất) đến xấu nhất
  const sortedTeachers = [...summary.allTeachers].sort((a, b) => {
    if (b.periodsPerSession !== a.periodsPerSession) return b.periodsPerSession - a.periodsPerSession;
    if (b.freeDays !== a.freeDays) return b.freeDays - a.freeDays;
    if (b.freeHalfDays !== a.freeHalfDays) return b.freeHalfDays - a.freeHalfDays;
    if (a.totalGaps !== b.totalGaps) return a.totalGaps - b.totalGaps;
    return b.totalPeriods - a.totalPeriods;
  });

  // 5. Thêm dữ liệu từng giáo viên
  sortedTeachers.forEach((m, idx) => {
    const rIdx = 12 + idx;
    const row = ws.getRow(rIdx);
    row.height = 26;

    const isEven = idx % 2 === 1;
    const baseZebraFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isEven ? 'FFF8FAFC' : 'FFFFFFFF' }
    };

    // Gán dữ liệu
    row.getCell(1).value = idx + 1; // Hạng TKB
    row.getCell(2).value = m.teacherCode || '-';
    row.getCell(3).value = m.teacherName;
    row.getCell(4).value = m.departmentName;
    row.getCell(5).value = m.mainSubjectName;
    row.getCell(6).value = m.totalPeriods; // Thực tế trên TKB
    row.getCell(7).value = m.sessionCount; // Số buổi đi dạy
    row.getCell(8).value = m.periodsPerSession; // Tiêu chí vàng
    row.getCell(9).value = m.tierLabel;
    row.getCell(10).value = m.freeDays;
    row.getCell(11).value = m.offDayNames.length > 0 ? m.offDayNames.join(', ') : 'Không';
    row.getCell(12).value = m.freeHalfDays;
    row.getCell(13).value = m.totalGaps;
    row.getCell(14).value = m.singlePeriodSessions;
    row.getCell(15).value = m.splitShiftDays;
    row.getCell(16).value = m.assignedClassesCount;
    row.getCell(17).value = m.assignedClassesList.join(', ');
    row.getCell(18).value = m.score;
    row.getCell(19).value = m.diagnosisNotes.join('; ') || m.primaryFactor;

    // Định dạng cell
    for (let c = 1; c <= 19; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;
      cell.fill = baseZebraFill;
      cell.font = { name: 'Arial', size: 9.5 };

      // Căn lề
      if (c === 3 || c === 4 || c === 5 || c === 17) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else if (c === 19) {
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }

    // Họ tên đậm
    row.getCell(3).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    // Hạng TKB đậm
    row.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E40AF' } };

    // CỘT 8: TIÊU CHÍ VÀNG - TÔ MÀU ĐẶC BIỆT THEO TỶ LỆ TIẾT/BUỔI
    const ratioCell = row.getCell(8);
    ratioCell.numFmt = '0.00';
    if (m.periodsPerSession >= 4.0) {
      ratioCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
      ratioCell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF166534' } };
    } else if (m.periodsPerSession >= 3.2) {
      ratioCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      ratioCell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF1E40AF' } };
    } else if (m.periodsPerSession >= 2.4) {
      ratioCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      ratioCell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF92400E' } };
    } else {
      // Dưới 2.4: TKB Xấu (dàn trải nhiều buổi, mỗi buổi chỉ 1-2 tiết)
      ratioCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      ratioCell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF991B1B' } };
    }

    // CỘT 9: XẾP LOẠI TKB
    const tierCell = row.getCell(9);
    if (m.tier === 'EXCELLENT') {
      tierCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
      tierCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF166534' } };
    } else if (m.tier === 'GOOD') {
      tierCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      tierCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF1E40AF' } };
    } else if (m.tier === 'AVERAGE') {
      tierCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      tierCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF92400E' } };
    } else {
      tierCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      tierCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF991B1B' } };
    }
  });

  // 6. Khung chữ ký phê duyệt (Chỉ Phó Hiệu trưởng Nguyễn Minh Trí)
  const lastDataRow = 12 + sortedTeachers.length;
  const sigDateRow = lastDataRow + 2;
  const sigRoleRow = sigDateRow + 1;
  const sigTitleRow = sigRoleRow + 1;
  const sigGuideRow = sigTitleRow + 1;
  const sigNameRow = sigGuideRow + 5;

  ws.mergeCells(`O${sigDateRow}:S${sigDateRow}`);
  ws.getCell(`O${sigDateRow}`).value = 'Đồng Tháp, ngày ..... tháng ..... năm 2026';
  ws.getCell(`O${sigDateRow}`).font = { name: 'Arial', size: 10, italic: true };
  ws.getCell(`O${sigDateRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  // Dòng quyền hạn & chức danh
  ws.mergeCells(`O${sigRoleRow}:S${sigRoleRow}`);
  ws.getCell(`O${sigRoleRow}`).value = 'KT. HIỆU TRƯỞNG';
  ws.getCell(`O${sigRoleRow}`).font = { name: 'Arial', size: 10.5, bold: true };
  ws.getCell(`O${sigRoleRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`O${sigTitleRow}:S${sigTitleRow}`);
  ws.getCell(`O${sigTitleRow}`).value = 'PHÓ HIỆU TRƯỞNG';
  ws.getCell(`O${sigTitleRow}`).font = { name: 'Arial', size: 11, bold: true };
  ws.getCell(`O${sigTitleRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  // Dòng hướng dẫn ký
  ws.mergeCells(`O${sigGuideRow}:S${sigGuideRow}`);
  ws.getCell(`O${sigGuideRow}`).value = '(Ký và ghi rõ họ tên)';
  ws.getCell(`O${sigGuideRow}`).font = { name: 'Arial', size: 9, italic: true };
  ws.getCell(`O${sigGuideRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  // Họ tên Phó Hiệu trưởng
  ws.mergeCells(`O${sigNameRow}:S${sigNameRow}`);
  ws.getCell(`O${sigNameRow}`).value = 'Nguyễn Minh Trí';
  ws.getCell(`O${sigNameRow}`).font = { name: 'Arial', size: 11, bold: true };
  ws.getCell(`O${sigNameRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

  // 7. Thiết lập độ rộng cột
  const colWidths = [
    10, // 1. Hạng TKB
    10, // 2. Mã GV
    25, // 3. Họ và tên
    22, // 4. Tổ CM
    18, // 5. Môn chính
    16, // 6. Tiết thực tế TKB
    14, // 7. Buổi đi dạy
    18, // 8. TỶ LỆ TIẾT/BUỔI (VÀNG)
    20, // 9. Xếp loại
    14, // 10. Ngày nghỉ
    18, // 11. Chi tiết thứ nghỉ
    14, // 12. Buổi nghỉ
    14, // 13. Tiết lủng
    12, // 14. Buổi 1 tiết
    13, // 15. Ngày 2 ca
    11, // 16. Số lớp
    30, // 17. Danh sách lớp
    12, // 18. Điểm tiện lợi
    45  // 19. Đề xuất & Chẩn đoán
  ];

  colWidths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // Tải file trực tiếp về máy
  const fileName = `Bao_Cao_Danh_Gia_TKB_Tuan_${summary.weekNumber}_${academicYear.replace(/\s+/g, '_')}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
