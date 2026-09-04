import {
  WeeklySchedule,
  WeeklyAssignmentItem,
  Assignment,
  ClassGroup,
  Subject,
  Teacher,
  Department,
  SchoolConfig,
  TeacherWeeklyWorkload,
  WorkloadStats
} from '../types';
import * as XLSX from 'xlsx';

/**
 * Number of weeks per semester:
 * HK1: 18 weeks (Tuần 1 -> Tuần 18)
 * HK2: 17 weeks (Tuần 19 -> Tuần 35)
 */
export const WEEKS_HK1 = Array.from({ length: 18 }, (_, i) => i + 1);
export const WEEKS_HK2 = Array.from({ length: 17 }, (_, i) => i + 19);

/**
 * Intelligent balanced weekly period distribution pattern generator for GDPT 2018.
 * Given a subject and grade in a specific week, calculates the exact integer periods for that week.
 *
 * Example:
 * - KHTN Khối 8 (Lý 1.3, Hóa 1.3, Sinh 1.4 -> tổng 4t/tuần, 72t/kỳ):
 *   W1: Lí 1, Hóa 2, Sinh 1 (4t)
 *   W2: Lí 2, Hóa 1, Sinh 1 (4t)
 *   W3: Lí 1, Hóa 1, Sinh 2 (4t)
 *   -> Over 18 weeks: 24 Lí + 24 Hóa + 24 Sinh = 72t (or 23 Lí, 23 Hóa, 26 Sinh).
 *
 * - KHTN Khối 9 (Lý 1.3, Hóa 1.7, Sinh 1.0 -> tổng 4t/tuần, 72t/kỳ):
 *   W1: Lí 1, Hóa 2, Sinh 1 (4t)
 *   W2: Lí 2, Hóa 1, Sinh 1 (4t)
 *   W3: Lí 1, Hóa 2, Sinh 1 (4t)
 *   -> Over 18 weeks: 24 Lí + 30 Hóa + 18 Sinh = 72t.
 *
 * - Lịch sử & Địa lí (Sử 1.5, Địa 1.5 -> tổng 3t/tuần):
 *   Tuần lẻ: Sử 2, Địa 1 (3t)
 *   Tuần chẵn: Sử 1, Địa 2 (3t)
 *   -> 27 Sử + 27 Địa = 54t.
 */
export function getRecommendedIntegerPeriods(
  subjectId: string,
  grade: string,
  weekNumber: number,
  basePeriods: number
): number {
  // 1. KHTN Grade 8 (Lí 1.3, Hóa 1.3, Sinh 1.4)
  if (grade === '8') {
    const cycle = (weekNumber - 1) % 3;
    if (subjectId === 'sub-li') {
      return cycle === 1 ? 2 : 1; // Tuần 2, 5, 8... được 2 tiết, còn lại 1 tiết
    }
    if (subjectId === 'sub-hoa') {
      return cycle === 0 ? 2 : 1; // Tuần 1, 4, 7... được 2 tiết, còn lại 1 tiết
    }
    if (subjectId === 'sub-sinh') {
      return cycle === 2 ? 2 : 1; // Tuần 3, 6, 9... được 2 tiết, còn lại 1 tiết
    }
  }

  // 2. KHTN Grade 9 (Lí 1.3, Hóa 1.7, Sinh 1.0)
  if (grade === '9') {
    const cycle = (weekNumber - 1) % 3;
    if (subjectId === 'sub-li') {
      return cycle === 1 ? 2 : 1; // Tuần 2, 5, 8... được 2 tiết, còn lại 1 tiết
    }
    if (subjectId === 'sub-hoa') {
      return cycle === 1 ? 1 : 2; // Tuần 1, 3, 4, 6... được 2 tiết, tuần 2 được 1 tiết
    }
    if (subjectId === 'sub-sinh') {
      return 1; // Cố định 1 tiết/tuần * 18 = 18 tiết
    }
  }

  // 3. Lịch sử & Địa lí (Sử 1.5, Địa 1.5)
  if (['6', '7', '8', '9'].includes(grade)) {
    const isOddWeek = weekNumber % 2 !== 0;
    if (subjectId === 'sub-su') {
      return isOddWeek ? 2 : 1; // Tuần lẻ 2 tiết, tuần chẵn 1 tiết
    }
    if (subjectId === 'sub-dia') {
      return isOddWeek ? 1 : 2; // Tuần lẻ 1 tiết, tuần chẵn 2 tiết
    }
  }

  // For other standard subjects, round to integer or keep exact integer
  return Math.round(basePeriods);
}

/**
 * Generate a complete 18-week schedule for Semester 1 (and 17-week for Semester 2)
 * based on current semester assignments with integer period balancing.
 */
export function generateBalancedWeeklySchedules(
  semester: 'HK1' | 'HK2',
  assignments: Assignment[],
  classes: ClassGroup[],
  subjects: Subject[]
): WeeklySchedule[] {
  const weeks = semester === 'HK1' ? WEEKS_HK1 : WEEKS_HK2;
  const subjectMap = new Map(subjects.map(s => [s.id, s]));
  const classMap = new Map(classes.map(c => [c.id, c]));

  return weeks.map(weekNumber => {
    const weeklyAssignments: WeeklyAssignmentItem[] = assignments.map(a => {
      const cls = classMap.get(a.classId);
      const sub = subjectMap.get(a.subjectId);
      const grade = cls?.grade || '10';

      const basePeriods = a.periodsPerWeek || sub?.defaultPeriods[grade] || 2;
      const integerPeriods = getRecommendedIntegerPeriods(a.subjectId, grade, weekNumber, basePeriods);

      return {
        classId: a.classId,
        subjectId: a.subjectId,
        teacherId: a.teacherId,
        periods: integerPeriods,
        note: ''
      };
    });

    return {
      weekNumber,
      semester,
      title: `Tuần ${weekNumber}`,
      assignments: weeklyAssignments,
      updatedAt: Date.now()
    };
  });
}

/**
 * Calculate weekly actual teaching workloads for all teachers across all weeks in the semester.
 */
export function calculateTeacherWeeklyWorkloads(
  teachers: Teacher[],
  departments: Department[],
  classes: ClassGroup[],
  subjects: Subject[],
  weeklySchedules: WeeklySchedule[],
  semester: 'HK1' | 'HK2',
  baseWorkloads: WorkloadStats[]
): TeacherWeeklyWorkload[] {
  const weeks = semester === 'HK1' ? WEEKS_HK1 : WEEKS_HK2;
  const numWeeks = weeks.length;

  const departmentMap = new Map(departments.map(d => [d.id, d.name]));
  const classMap = new Map(classes.map(c => [c.id, c]));
  const subjectMap = new Map(subjects.map(s => [s.id, s]));
  const baseWorkloadMap = new Map(baseWorkloads.map(w => [w.teacherId, w]));

  return teachers.map(teacher => {
    const deptName = departmentMap.get(teacher.departmentId) || 'Chưa phân tổ';
    const baseW = baseWorkloadMap.get(teacher.id);
    const reduction = baseW ? baseW.reductionPeriods : (teacher.customReductionPeriods || 0);
    const standard = teacher.baseStandardPeriods || (teacher.campus?.includes('THPT') ? 17 : 19);
    const targetWeekly = Math.max(0, standard - reduction);

    // Active weeks: only weeks that have an explicit schedule in weeklySchedules
    const activeWeeks = weeks.filter(wNum =>
      weeklySchedules.some(ws => ws.weekNumber === wNum && ws.semester === semester)
    );
    const activeWeeksCount = activeWeeks.length;

    const weeklyPeriods: Record<number, number | undefined> = {};
    const weeklyDetails: Record<
      number,
      {
        classId: string;
        className: string;
        subjectId: string;
        subjectName: string;
        periods: number;
        note?: string;
      }[]
    > = {};

    let totalActual = 0;

    weeks.forEach(wNum => {
      const scheduleForWeek = weeklySchedules.find(ws => ws.weekNumber === wNum && ws.semester === semester);

      if (scheduleForWeek) {
        let weekSum = 0;
        const details: {
          classId: string;
          className: string;
          subjectId: string;
          subjectName: string;
          periods: number;
          note?: string;
        }[] = [];

        scheduleForWeek.assignments
          .filter(a => a.teacherId === teacher.id)
          .forEach(a => {
            const cls = classMap.get(a.classId);
            const sub = subjectMap.get(a.subjectId);
            const p = a.periods || 0;
            weekSum += p;
            details.push({
              classId: a.classId,
              className: cls ? cls.name : a.classId,
              subjectId: a.subjectId,
              subjectName: sub ? sub.shortName : a.subjectId,
              periods: p,
              note: a.note
            });
          });

        weeklyPeriods[wNum] = weekSum;
        weeklyDetails[wNum] = details;
        totalActual += weekSum;
      } else {
        // Tuần chưa lập phân công: KHÔNG ghi sẵn số tiết!
        weeklyPeriods[wNum] = undefined;
        weeklyDetails[wNum] = [];
      }
    });

    const currentRequired = targetWeekly * activeWeeksCount;
    const currentBalance = totalActual - currentRequired;
    const totalRequired = targetWeekly * numWeeks;
    const semesterBalance = totalActual - totalRequired;

    return {
      teacherId: teacher.id,
      teacherName: teacher.name,
      teacherCode: teacher.code,
      gender: teacher.gender,
      campus: teacher.campus,
      departmentId: teacher.departmentId,
      departmentName: deptName,
      role: teacher.role,
      reductionPeriods: reduction,
      baseStandardPeriods: standard,
      targetWeeklyPeriods: targetWeekly,
      weeklyPeriods,
      totalActualPeriods: totalActual,
      totalRequiredPeriods: totalRequired,
      semesterBalance,
      activeWeeksCount,
      currentRequiredPeriods: currentRequired,
      currentBalance,
      weeklyDetails
    };
  });
}

/**
 * Export complete weekly teaching log to Excel.
 */
export function exportWeeklyWorkloadExcel(
  config: SchoolConfig,
  workloads: TeacherWeeklyWorkload[],
  semester: 'HK1' | 'HK2'
) {
  const weeks = semester === 'HK1' ? WEEKS_HK1 : WEEKS_HK2;
  const wb = XLSX.utils.book_new();

  // 1. Header rows
  const rows: (string | number)[][] = [
    [config.schoolName.toUpperCase(), '', '', '', '', '', '', '', '', '', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'],
    ['BỘ PHẬN CHUYÊN MÔN', '', '', '', '', '', '', '', '', '', 'Độc lập - Tự do - Hạnh phúc'],
    [],
    [`SỔ THEO DÕI SỐ TIẾT THỰC DẠY HÀNG TUẦN CỦA GIÁO VIÊN - ${semester === 'HK1' ? 'HỌC KỲ I' : 'HỌC KỲ II'} NĂM HỌC ${config.academicYear}`],
    [],
    [
      'STT',
      'Họ và tên giáo viên',
      'Mã GV',
      'Tổ chuyên môn',
      'Định mức chuẩn (tuần)',
      'Giảm trừ (tuần)',
      'Định mức thực hiện/tuần',
      ...weeks.map(w => `Tuần ${w}`),
      'Tổng thực dạy',
      'Định mức lũy kế',
      'Chênh lệch (+/-)'
    ]
  ];

  workloads.forEach((w, idx) => {
    const row: (string | number)[] = [
      idx + 1,
      w.teacherName,
      w.teacherCode,
      w.departmentName,
      w.baseStandardPeriods,
      w.reductionPeriods,
      w.targetWeeklyPeriods,
      ...weeks.map(wn => {
        const val = w.weeklyPeriods[wn];
        return val !== undefined ? val : '-';
      }),
      w.totalActualPeriods,
      w.currentRequiredPeriods ?? w.totalRequiredPeriods,
      (w.currentBalance ?? w.semesterBalance) > 0 ? `+${w.currentBalance ?? w.semesterBalance}` : (w.currentBalance ?? w.semesterBalance)
    ];
    rows.push(row);
  });

  // Footer signatures
  rows.push([]);
  rows.push(['', '', '', '', '', '', '', '', '', '', `Đốc Binh Kiều, ngày ..... tháng ..... năm 2026`]);
  rows.push(['', 'NGƯỜI LẬP BẢNG', '', '', '', '', '', '', '', '', 'HIỆU TRƯỞNG']);
  rows.push([]);
  rows.push([]);
  rows.push(['', config.vicePrincipalName || 'Nguyễn Minh Trí', '', '', '', '', '', '', '', '', config.principalName || 'Lê Thanh Cường']);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 24 }, // Tên
    { wch: 12 }, // Mã
    { wch: 18 }, // Tổ
    { wch: 14 }, // Định mức
    { wch: 12 }, // Giảm trừ
    { wch: 16 }, // Thực hiện
    ...weeks.map(() => ({ wch: 8 })), // Tuần 1..18
    { wch: 14 }, // Tổng thực dạy
    { wch: 14 }, // Định mức kỳ
    { wch: 14 }  // Chênh lệch
  ];

  XLSX.utils.book_append_sheet(wb, ws, `Theo_Doi_Tiet_Day_${semester}`);
  XLSX.writeFile(wb, `So_Theo_Doi_Tiet_Thuc_Day_${semester}_${config.academicYear.replace(/\s+/g, '')}.xlsx`);
}
