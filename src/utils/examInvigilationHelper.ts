import { Teacher, Department, ClassGroup, Subject, SchoolConfig, TimetableSlot } from '../types';
import { calculateAllActualWorkloads, TeacherActualWorkload } from './actualTeachingHoursHelper';
import { OFFICIAL_WEEK_7_SLOTS } from '../data/officialWeek7Timetable';
import { OFFICIAL_WEEK_8_SLOTS } from '../data/officialWeek8Timetable';

export type ExamPeriodType = 'GK1' | 'CK1' | 'GK2' | 'CK2';

export interface ExamSessionConfig {
  id: string; // e.g. 'gk1-mon-morning'
  periodType: ExamPeriodType;
  dayOfWeek: number; // 2..6 (Thứ 2..Thứ 6)
  dayName: string; // 'Thứ Hai', 'Thứ Ba'...
  dateStr: string; // '02/11/2026'
  session: 'SANG' | 'CHIEU';
  sessionName: string; // 'Buổi Sáng', 'Buổi Chiều'
  targetGrade: string; // 'Khối 11 & 12' or 'Khối 10'
  examSubjects: string[]; // ['Ngữ văn 11, 12', 'Vật lí 11, 12']
  requiredInvigilators: number; // 17 for Morning (K11+12), 11 for Afternoon (K10)
  roomCount: number; // e.g. 14 rooms morning (K12: 8 + K11: 6), 9 rooms afternoon
  hallwayCount: number; // 3 morning, 2 afternoon
}

export interface InvigilatorAssignment {
  teacherId: string;
  teacherName: string;
  teacherCode: string;
  departmentName: string;
  role: 'ROOM' | 'HALLWAY'; // Giám thị phòng thi / Giám thị hành lang
  roomOrHallwayNumber: string; // 'Phòng 01', 'Phòng 02'... 'Hành lang 01'
  initialBalance: number; // Số tiết âm ban đầu (ví dụ: -7)
  subjectTaught?: string;
}

export interface SessionInvigilationPlan {
  sessionId: string;
  config: ExamSessionConfig;
  assignments: InvigilatorAssignment[];
  notes?: string;
}

export interface TeacherInvigilationSummary {
  teacherId: string;
  teacherName: string;
  teacherCode: string;
  departmentName: string;
  initialBalance: number; // Tiết thừa/thiếu ban đầu
  teachingPeriods: number; // Tiết dạy
  standardPeriods: number; // Định mức
  reductionPeriods: number; // Giảm trừ
  assignedSessionsCount: number; // Số buổi coi kiểm tra
  assignedRoomCount: number; // Số buổi coi trong phòng
  assignedHallwayCount: number; // Số buổi coi hành lang
  convertedPeriods: number; // Tiết quy đổi (mỗi buổi coi quy đổi tương đương 2.5 hoặc 3 tiết)
  netBalanceAfter: number; // Cân đối sau khi cộng tiết coi kiểm tra
  sessionDetails: Array<{
    dateStr: string;
    dayName: string;
    sessionName: string;
    targetGrade: string;
    role: 'ROOM' | 'HALLWAY';
    roomOrHallwayNumber: string;
    subjects: string[];
  }>;
}

/**
 * 10 buổi kiểm tra tập trung Giữa HK1 (02/11/2026 -> 06/11/2026) theo Kế hoạch 50/KH
 */
export const MIDTERM_1_SESSIONS: ExamSessionConfig[] = [
  // SÁNG KHỐI 11 & 12 (17 giám thị mỗi buổi: 14 phòng + 3 hành lang)
  {
    id: 'gk1-t2-sang',
    periodType: 'GK1',
    dayOfWeek: 2,
    dayName: 'Thứ Hai',
    dateStr: '02/11/2026',
    session: 'SANG',
    sessionName: 'Buổi Sáng',
    targetGrade: 'Khối 11 & Khối 12',
    examSubjects: ['Ngữ văn 11, 12 (90p)', 'Vật lí 11, 12 (45p/50p)'],
    requiredInvigilators: 17,
    roomCount: 14,
    hallwayCount: 3,
  },
  {
    id: 'gk1-t3-sang',
    periodType: 'GK1',
    dayOfWeek: 3,
    dayName: 'Thứ Ba',
    dateStr: '03/11/2026',
    session: 'SANG',
    sessionName: 'Buổi Sáng',
    targetGrade: 'Khối 11 & Khối 12',
    examSubjects: ['Toán 11, 12 (90p)', 'Sinh học 11, 12 (45p/50p)'],
    requiredInvigilators: 17,
    roomCount: 14,
    hallwayCount: 3,
  },
  {
    id: 'gk1-t4-sang',
    periodType: 'GK1',
    dayOfWeek: 4,
    dayName: 'Thứ Tư',
    dateStr: '04/11/2026',
    session: 'SANG',
    sessionName: 'Buổi Sáng',
    targetGrade: 'Khối 11 & Khối 12',
    examSubjects: ['Tiếng Anh 11, 12 (60p)', 'Địa lí 11, 12 (45p/50p)'],
    requiredInvigilators: 17,
    roomCount: 14,
    hallwayCount: 3,
  },
  {
    id: 'gk1-t5-sang',
    periodType: 'GK1',
    dayOfWeek: 5,
    dayName: 'Thứ Năm',
    dateStr: '05/11/2026',
    session: 'SANG',
    sessionName: 'Buổi Sáng',
    targetGrade: 'Khối 11 & Khối 12',
    examSubjects: ['Hóa học / GDKT&PL 11, 12', 'Tin học / Công nghệ 11, 12'],
    requiredInvigilators: 17,
    roomCount: 14,
    hallwayCount: 3,
  },
  {
    id: 'gk1-t6-sang',
    periodType: 'GK1',
    dayOfWeek: 6,
    dayName: 'Thứ Sáu',
    dateStr: '06/11/2026',
    session: 'SANG',
    sessionName: 'Buổi Sáng',
    targetGrade: 'Khối 11 & Khối 12',
    examSubjects: ['Lịch sử 11, 12 (45p/50p)'],
    requiredInvigilators: 17,
    roomCount: 14,
    hallwayCount: 3,
  },

  // CHIỀU KHỐI 10 (11 giám thị mỗi buổi: 9 phòng + 2 hành lang)
  {
    id: 'gk1-t2-chieu',
    periodType: 'GK1',
    dayOfWeek: 2,
    dayName: 'Thứ Hai',
    dateStr: '02/11/2026',
    session: 'CHIEU',
    sessionName: 'Buổi Chiều',
    targetGrade: 'Khối 10',
    examSubjects: ['Ngữ văn 10 (90p)', 'Vật lí 10 (45p)'],
    requiredInvigilators: 11,
    roomCount: 9,
    hallwayCount: 2,
  },
  {
    id: 'gk1-t3-chieu',
    periodType: 'GK1',
    dayOfWeek: 3,
    dayName: 'Thứ Ba',
    dateStr: '03/11/2026',
    session: 'CHIEU',
    sessionName: 'Buổi Chiều',
    targetGrade: 'Khối 10',
    examSubjects: ['Toán 10 (90p)', 'Sinh học 10 (45p)'],
    requiredInvigilators: 11,
    roomCount: 9,
    hallwayCount: 2,
  },
  {
    id: 'gk1-t4-chieu',
    periodType: 'GK1',
    dayOfWeek: 4,
    dayName: 'Thứ Tư',
    dateStr: '04/11/2026',
    session: 'CHIEU',
    sessionName: 'Buổi Chiều',
    targetGrade: 'Khối 10',
    examSubjects: ['Tiếng Anh 10 (60p)', 'Địa lí 10 (45p)'],
    requiredInvigilators: 11,
    roomCount: 9,
    hallwayCount: 2,
  },
  {
    id: 'gk1-t5-chieu',
    periodType: 'GK1',
    dayOfWeek: 5,
    dayName: 'Thứ Năm',
    dateStr: '05/11/2026',
    session: 'CHIEU',
    sessionName: 'Buổi Chiều',
    targetGrade: 'Khối 10',
    examSubjects: ['Hóa học / GDKT&PL 10', 'Tin học / Công nghệ 10'],
    requiredInvigilators: 11,
    roomCount: 9,
    hallwayCount: 2,
  },
  {
    id: 'gk1-t6-chieu',
    periodType: 'GK1',
    dayOfWeek: 6,
    dayName: 'Thứ Sáu',
    dateStr: '06/11/2026',
    session: 'CHIEU',
    sessionName: 'Buổi Chiều',
    targetGrade: 'Khối 10',
    examSubjects: ['Lịch sử 10 (45p)'],
    requiredInvigilators: 11,
    roomCount: 9,
    hallwayCount: 2,
  },
];

/**
 * Kiểm tra xem giáo viên có thuộc diện loại trừ coi kiểm tra hay không:
 * 1. Ban Giám Hiệu (Hiệu trưởng & Phó Hiệu trưởng là Ban Chỉ đạo, Hội đồng coi thi)
 * 2. Giáo viên môn Tin học (Quy tắc người dùng: HK2 sẽ tăng tiết đột biến do dạy AI)
 */
export function isExcludedFromInvigilation(teacher: Teacher): boolean {
  // 1. Ban Giám Hiệu
  const isBgh =
    teacher.id.startsWith('tch-bgh') ||
    teacher.role === 'HieuTruong' ||
    teacher.role === 'PhoHieuTruong' ||
    teacher.code?.includes('PHT') ||
    teacher.code?.includes('HT') ||
    ['Lê Thanh Cường', 'Nguyễn Minh Trí', 'Phan Thanh Thảo', 'Nguyễn Thanh Tòng'].includes(teacher.name.trim());
  if (isBgh) return true;

  // 2. Giáo viên môn Tin học
  const isTinHoc =
    teacher.departmentId === 'dept-tin' ||
    teacher.code?.includes('(Tin)') ||
    teacher.code?.toLowerCase().includes('tin') ||
    teacher.name.toLowerCase().includes('tin học') ||
    teacher.notes?.toLowerCase().includes('tin học') ||
    ['Nguyễn Trung Hiếu', 'Đào Thị Ngọc Liên', 'Lê Phước Hậu', 'Lê Thị Thu Diễm', 'Bùi Kim Phướng', 'Mai Phước Lộc'].some(
      n => teacher.name.trim().toLowerCase().includes(n.toLowerCase())
    );
  if (isTinHoc) return true;

  // 3. Quy tắc cốt lõi: Phân công coi kiểm tra cấp THPT chỉ lấy nhân sự ở ĐIỂM CHÍNH (THPT Đốc Binh Kiều),
  // Tuyệt đối KHÔNG lấy nhân sự từ 2 điểm trường THCS (THCS Đốc Binh Kiều & Tân Kiều)
  const isThcsCampus =
    teacher.campus === 'THCSDBK' ||
    teacher.campus === 'THCSTK' ||
    teacher.campus !== 'THPTDBK';
  if (isThcsCampus) return true;

  return false;
}

/**
 * Lấy danh sách giáo viên đủ điều kiện coi thi, sắp xếp theo mức độ âm tiết nhiều nhất (từ âm nặng nhất đến dương)
 */
export function getEligibleInvigilatorsRankedByDeficit(
  teachers: Teacher[],
  departments: Department[],
  classes: ClassGroup[],
  config: SchoolConfig,
  slots: TimetableSlot[] = OFFICIAL_WEEK_7_SLOTS,
  subjects: Subject[] = []
): Array<{
  teacher: Teacher;
  workload?: TeacherActualWorkload;
  balance: number;
  teachingPeriods: number;
  standardPeriods: number;
  reductionPeriods: number;
}> {
  const workloads = calculateAllActualWorkloads(7, teachers, departments, classes, subjects, config);
  const workloadMap = new Map<string, TeacherActualWorkload>(workloads.map(w => [w.teacherId, w]));

  const list: Array<{
    teacher: Teacher;
    workload?: TeacherActualWorkload;
    balance: number;
    teachingPeriods: number;
    standardPeriods: number;
    reductionPeriods: number;
  }> = [];

  teachers.forEach(t => {
    if (isExcludedFromInvigilation(t)) return;

    const wl = workloadMap.get(t.id);
    const balance = wl ? (wl.semesterBalance < 0 ? wl.semesterBalance : wl.weeklyBalance) : 0;
    const teachingPeriods = wl ? wl.teachingPeriods : 0;
    const standardPeriods = wl ? wl.standardPeriods : 17;
    const reductionPeriods = wl ? wl.reductionPeriods : 0;

    list.push({
      teacher: t,
      workload: wl,
      balance,
      teachingPeriods,
      standardPeriods,
      reductionPeriods,
    });
  });

  // Sắp xếp: Âm nhiều tiết nhất đứng đầu (balance càng nhỏ càng xếp trước)
  list.sort((a, b) => {
    if (a.balance !== b.balance) return a.balance - b.balance;
    // Nếu cùng âm bằng nhau: ưu tiên GV cấp THPT (vì kiểm tra THPT) rồi đến THCS
    const aIsThpt = a.teacher.campus === 'THPTDBK' ? 1 : 0;
    const bIsThpt = b.teacher.campus === 'THPTDBK' ? 1 : 0;
    if (aIsThpt !== bIsThpt) return bIsThpt - aIsThpt;
    return a.teacher.name.localeCompare(b.teacher.name);
  });

  return list;
}

/**
 * Thuật toán phân công tự động 140 suất giám thị (5 buổi sáng x 17 GT + 5 buổi chiều x 11 GT):
 * - Giáo viên âm nhiều tiết nhất sẽ được xếp coi nhiều buổi nhất (ví dụ 3-4 buổi).
 * - Các giáo viên âm tiếp theo được xếp 2-3 buổi.
 * - Các giáo viên âm nhẹ hoặc vừa đủ định mức được xếp 1-2 buổi.
 * - Đảm bảo trong 1 buổi không bị trùng giáo viên và không xếp quá tải cho 1 giáo viên trong cùng 1 ngày.
 */
export function generateAutoInvigilationAssignments(
  teachers: Teacher[],
  departments: Department[],
  classes: ClassGroup[],
  config: SchoolConfig,
  slots: TimetableSlot[] = OFFICIAL_WEEK_7_SLOTS
): Record<string, InvigilatorAssignment[]> {
  const ranked = getEligibleInvigilatorsRankedByDeficit(teachers, departments, classes, config, slots);
  const result: Record<string, InvigilatorAssignment[]> = {};

  // Thống kê số buổi đã được xếp cho từng giáo viên để dàn đều
  const teacherSessionCount = new Map<string, number>();
  ranked.forEach(r => teacherSessionCount.set(r.teacher.id, 0));

  // Xác định số buổi mong đợi dựa vào độ âm tiết của 28 giáo viên điểm chính:
  // - Âm nặng (từ 10 tiết trở lên): 6 - 7 buổi
  // - Âm trung bình (từ 6 đến 9 tiết): 5 - 6 buổi
  // - Âm nhẹ (từ 3 đến 5 tiết): 4 - 5 buổi
  // - Âm ít hoặc đủ định mức (0 đến 2 tiết): 3 - 4 buổi
  // - Dư tiết: 1 - 2 buổi
  const getTargetSessions = (bal: number) => {
    if (bal <= -10) return 7;
    if (bal <= -7) return 6;
    if (bal <= -4) return 5;
    if (bal <= -2) return 4;
    if (bal <= 0) return 3;
    return 2;
  };

  MIDTERM_1_SESSIONS.forEach(sessionConf => {
    const sessionAssignments: InvigilatorAssignment[] = [];
    const usedInThisSession = new Set<string>();

    // Sắp xếp các ứng viên khả thi cho buổi này:
    // 1. Chưa được phân trong buổi này
    // 2. Còn thiếu nhiều buổi so với độ âm (remain)
    // 3. Độ âm tiết ban đầu (càng âm nặng càng ưu tiên)
    // 4. Số buổi đã phân hiện tại
    const candidates = [...ranked].filter(r => !usedInThisSession.has(r.teacher.id));
    candidates.sort((a, b) => {
      const targetA = getTargetSessions(a.balance);
      const targetB = getTargetSessions(b.balance);
      const doneA = teacherSessionCount.get(a.teacher.id) || 0;
      const doneB = teacherSessionCount.get(b.teacher.id) || 0;

      const remainA = targetA - doneA;
      const remainB = targetB - doneB;

      if (remainA !== remainB) return remainB - remainA; // Cần thêm buổi hơn so với mục tiêu thì ưu tiên
      if (a.balance !== b.balance) return a.balance - b.balance; // Âm nhiều hơn ưu tiên
      return doneA - doneB;
    });

    const needed = sessionConf.requiredInvigilators;
    const chosen = candidates.slice(0, needed);

    chosen.forEach((cand, idx) => {
      usedInThisSession.add(cand.teacher.id);
      teacherSessionCount.set(cand.teacher.id, (teacherSessionCount.get(cand.teacher.id) || 0) + 1);

      // Phân chia: các số đầu là phòng thi, các số cuối là giám thị hành lang
      const isHallway = idx >= sessionConf.roomCount;
      const role: 'ROOM' | 'HALLWAY' = isHallway ? 'HALLWAY' : 'ROOM';
      const numberStr = isHallway
        ? `Hành lang 0${idx - sessionConf.roomCount + 1}`
        : `Phòng ${String(idx + 1).padStart(2, '0')}`;

      sessionAssignments.push({
        teacherId: cand.teacher.id,
        teacherName: cand.teacher.name,
        teacherCode: cand.teacher.code,
        departmentName: cand.workload?.departmentName || cand.teacher.departmentId,
        role,
        roomOrHallwayNumber: numberStr,
        initialBalance: cand.balance,
        subjectTaught: cand.workload?.rows?.[0]?.subject || cand.workload?.departmentName || cand.teacher.primarySubjectId || ''
      });
    });

    result[sessionConf.id] = sessionAssignments;
  });

  return result;
}

/**
 * Tính bảng tổng hợp và kê tiết coi kiểm tra cho toàn bộ giáo viên
 */
export function calculateTeacherInvigilationSummaries(
  teachers: Teacher[],
  departments: Department[],
  classes: ClassGroup[],
  config: SchoolConfig,
  assignmentsMap: Record<string, InvigilatorAssignment[]>,
  periodConversionRatio: number = 2.5 // Mỗi buổi coi kiểm tra quy đổi thành 2.5 tiết thực dạy (hoặc 3 tiết theo quy định nội bộ)
): TeacherInvigilationSummary[] {
  const ranked = getEligibleInvigilatorsRankedByDeficit(teachers, departments, classes, config);
  const deptMap = new Map<string, string>(departments.map(d => [d.id, d.name]));

  return ranked.map(item => {
    const t = item.teacher;
    const wl = item.workload;

    const mySessions: Array<{
      dateStr: string;
      dayName: string;
      sessionName: string;
      targetGrade: string;
      role: 'ROOM' | 'HALLWAY';
      roomOrHallwayNumber: string;
      subjects: string[];
    }> = [];

    let roomCount = 0;
    let hallwayCount = 0;

    MIDTERM_1_SESSIONS.forEach(sConf => {
      const list = assignmentsMap[sConf.id] || [];
      const match = list.find(a => a.teacherId === t.id);
      if (match) {
        if (match.role === 'ROOM') roomCount++;
        else hallwayCount++;

        mySessions.push({
          dateStr: sConf.dateStr,
          dayName: sConf.dayName,
          sessionName: sConf.sessionName,
          targetGrade: sConf.targetGrade,
          role: match.role,
          roomOrHallwayNumber: match.roomOrHallwayNumber,
          subjects: sConf.examSubjects
        });
      }
    });

    const totalSessions = roomCount + hallwayCount;
    const convertedPeriods = totalSessions * periodConversionRatio;
    const netBalanceAfter = item.balance + convertedPeriods;

    return {
      teacherId: t.id,
      teacherName: t.name,
      teacherCode: t.code,
      departmentName: deptMap.get(t.departmentId) || wl?.departmentName || 'Chưa xếp tổ',
      initialBalance: item.balance,
      teachingPeriods: wl?.teachingPeriods ?? item.teachingPeriods,
      standardPeriods: wl?.standardPeriods ?? item.standardPeriods,
      reductionPeriods: wl?.reductionPeriods ?? item.reductionPeriods,
      assignedSessionsCount: totalSessions,
      assignedRoomCount: roomCount,
      assignedHallwayCount: hallwayCount,
      convertedPeriods,
      netBalanceAfter,
      sessionDetails: mySessions
    };
  });
}
