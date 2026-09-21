/**
 * BẢNG PHÂN PHỐI TIẾT & PHÂN CÔNG CHUYÊN MÔN MÔN CÔNG NGHỆ (C.NGHỆ) KHỐI 8 & 9 (52 TIẾT/NĂM)
 * Theo kế hoạch giáo dục nhà trường và quy chuẩn thời khóa biểu chính thức:
 *
 * Khối 8 (52 tiết/năm):
 * - Học kỳ I (26 tiết): Tuần 1 -> 8: 2 tiết/tuần; Tuần 9 -> 18: 1 tiết/tuần.
 * - Học kỳ II (26 tiết): Tuần 19 -> 27: 2 tiết/tuần; Tuần 28 -> 35: 1 tiết/tuần.
 *
 * Khối 9 (52 tiết/năm):
 * - Học kỳ I (18 tiết): Tuần 1 -> 18: 1 tiết/tuần.
 * - Học kỳ II (34 tiết): Tuần 19 -> 35: 2 tiết/tuần.
 */

export interface CongNgheWeeklyDistribution {
  week: number;
  periodsPerWeek: number;
  semester: 1 | 2;
}

// Bảng số tiết từng tuần của môn Công nghệ Khối 8 (35 tuần)
export const CONG_NGHE_8_WEEKS: Record<number, number> = {
  // HỌC KỲ I (Tuần 1 - 18: Tổng 26 tiết)
  1: 2,
  2: 2,
  3: 2,
  4: 2,
  5: 2,
  6: 2,
  7: 2,
  8: 2,
  9: 1,
  10: 1,
  11: 1,
  12: 1,
  13: 1,
  14: 1,
  15: 1,
  16: 1,
  17: 1,
  18: 1,

  // HỌC KỲ II (Tuần 19 - 35: Tổng 26 tiết)
  19: 2,
  20: 2,
  21: 2,
  22: 2,
  23: 2,
  24: 2,
  25: 2,
  26: 2,
  27: 2,
  28: 1,
  29: 1,
  30: 1,
  31: 1,
  32: 1,
  33: 1,
  34: 1,
  35: 1,
};

// Bảng số tiết từng tuần của môn Công nghệ Khối 9 (35 tuần)
export const CONG_NGHE_9_WEEKS: Record<number, number> = {
  // HỌC KỲ I (Tuần 1 - 18: Tổng 18 tiết, mỗi tuần 1 tiết)
  1: 1,
  2: 1,
  3: 1,
  4: 1,
  5: 1,
  6: 1,
  7: 1,
  8: 1,
  9: 1,
  10: 1,
  11: 1,
  12: 1,
  13: 1,
  14: 1,
  15: 1,
  16: 1,
  17: 1,
  18: 1,

  // HỌC KỲ II (Tuần 19 - 35: Tổng 34 tiết, 17 tuần * 2 tiết/tuần)
  19: 2,
  20: 2,
  21: 2,
  22: 2,
  23: 2,
  24: 2,
  25: 2,
  26: 2,
  27: 2,
  28: 2,
  29: 2,
  30: 2,
  31: 2,
  32: 2,
  33: 2,
  34: 2,
  35: 2,
};

export interface CongNgheClassAssignment {
  classId: string;
  className: string;
  campus: 'THCSDBK' | 'THCSTK';
  grade: '8' | '9';
  teacherId: string;
  teacherName: string;
}

// Danh sách phân công môn Công nghệ Khối 8 (10 lớp)
export const CONG_NGHE_8_CLASS_ASSIGNMENTS: CongNgheClassAssignment[] = [
  {
    classId: 'cls-8a1',
    className: '8A1',
    campus: 'THCSDBK',
    grade: '8',
    teacherId: 'tch-khtn-22',
    teacherName: 'Trần Phi Hải',
  },
  {
    classId: 'cls-8a2',
    className: '8A2',
    campus: 'THCSDBK',
    grade: '8',
    teacherId: 'tch-khtn-22',
    teacherName: 'Trần Phi Hải',
  },
  {
    classId: 'cls-8a3',
    className: '8A3',
    campus: 'THCSDBK',
    grade: '8',
    teacherId: 'tch-khtn-22',
    teacherName: 'Trần Phi Hải',
  },
  {
    classId: 'cls-8a4',
    className: '8A4',
    campus: 'THCSDBK',
    grade: '8',
    teacherId: 'tch-khtn-22',
    teacherName: 'Trần Phi Hải',
  },
  {
    classId: 'cls-8a5',
    className: '8A5',
    campus: 'THCSDBK',
    grade: '8',
    teacherId: 'tch-khtn-22',
    teacherName: 'Trần Phi Hải',
  },
  {
    classId: 'cls-8a6',
    className: '8A6',
    campus: 'THCSDBK',
    grade: '8',
    teacherId: 'tch-khtn-22',
    teacherName: 'Trần Phi Hải',
  },
  {
    classId: 'cls-8a7',
    className: '8A7',
    campus: 'THCSTK',
    grade: '8',
    teacherId: 'tch-khtn-26',
    teacherName: 'Phan Văn Tặt',
  },
  {
    classId: 'cls-8a8',
    className: '8A8',
    campus: 'THCSTK',
    grade: '8',
    teacherId: 'tch-khtn-26',
    teacherName: 'Phan Văn Tặt',
  },
  {
    classId: 'cls-8a9',
    className: '8A9',
    campus: 'THCSTK',
    grade: '8',
    teacherId: 'tch-khtn-26',
    teacherName: 'Phan Văn Tặt',
  },
  {
    classId: 'cls-8a10',
    className: '8A10',
    campus: 'THCSTK',
    grade: '8',
    teacherId: 'tch-khtn-26',
    teacherName: 'Phan Văn Tặt',
  },
];

// Danh sách phân công môn Công nghệ Khối 9 (10 lớp)
export const CONG_NGHE_9_CLASS_ASSIGNMENTS: CongNgheClassAssignment[] = [
  {
    classId: 'cls-9a1',
    className: '9A1',
    campus: 'THCSDBK',
    grade: '9',
    teacherId: 'tch-khtn-23',
    teacherName: 'Trần Thị Cẩm',
  },
  {
    classId: 'cls-9a2',
    className: '9A2',
    campus: 'THCSDBK',
    grade: '9',
    teacherId: 'tch-khtn-23',
    teacherName: 'Trần Thị Cẩm',
  },
  {
    classId: 'cls-9a3',
    className: '9A3',
    campus: 'THCSDBK',
    grade: '9',
    teacherId: 'tch-khtn-23',
    teacherName: 'Trần Thị Cẩm',
  },
  {
    classId: 'cls-9a4',
    className: '9A4',
    campus: 'THCSDBK',
    grade: '9',
    teacherId: 'tch-khtn-24',
    teacherName: 'Lê Kim Ngân',
  },
  {
    classId: 'cls-9a5',
    className: '9A5',
    campus: 'THCSDBK',
    grade: '9',
    teacherId: 'tch-khtn-24',
    teacherName: 'Lê Kim Ngân',
  },
  {
    classId: 'cls-9a6',
    className: '9A6',
    campus: 'THCSDBK',
    grade: '9',
    teacherId: 'tch-khtn-24',
    teacherName: 'Lê Kim Ngân',
  },
  {
    classId: 'cls-9a7',
    className: '9A7',
    campus: 'THCSTK',
    grade: '9',
    teacherId: 'tch-khtn-25',
    teacherName: 'Nguyễn Thị Ngọc Diễm',
  },
  {
    classId: 'cls-9a8',
    className: '9A8',
    campus: 'THCSTK',
    grade: '9',
    teacherId: 'tch-khtn-25',
    teacherName: 'Nguyễn Thị Ngọc Diễm',
  },
  {
    classId: 'cls-9a9',
    className: '9A9',
    campus: 'THCSTK',
    grade: '9',
    teacherId: 'tch-khtn-25',
    teacherName: 'Nguyễn Thị Ngọc Diễm',
  },
  {
    classId: 'cls-9a10',
    className: '9A10',
    campus: 'THCSTK',
    grade: '9',
    teacherId: 'tch-khtn-25',
    teacherName: 'Nguyễn Thị Ngọc Diễm',
  },
];

/**
 * Lấy số tiết môn Công nghệ cho một lớp trong một tuần cụ thể
 */
export function getCongNghePeriodsForClassAndWeek(grade: '8' | '9', weekNumber: number): number {
  if (grade === '8') {
    return CONG_NGHE_8_WEEKS[weekNumber] ?? (weekNumber <= 8 ? 2 : 1);
  }
  if (grade === '9') {
    return CONG_NGHE_9_WEEKS[weekNumber] ?? (weekNumber <= 18 ? 1 : 2);
  }
  return 1;
}

/**
 * Lấy chi tiết số tiết Công nghệ 8 & 9 của một giáo viên trong một tuần cụ thể
 */
export function getTeacherCongNgheWeeklyDetail(teacherId: string, weekNumber: number) {
  const p8 = CONG_NGHE_8_WEEKS[weekNumber] ?? (weekNumber <= 8 ? 2 : 1);
  const p9 = CONG_NGHE_9_WEEKS[weekNumber] ?? (weekNumber <= 18 ? 1 : 2);

  const k8Classes = CONG_NGHE_8_CLASS_ASSIGNMENTS.filter((c) => c.teacherId === teacherId);
  const k9Classes = CONG_NGHE_9_CLASS_ASSIGNMENTS.filter((c) => c.teacherId === teacherId);

  const totalK8 = k8Classes.length * p8;
  const totalK9 = k9Classes.length * p9;

  return {
    week: weekNumber,
    k8Classes: k8Classes.map((c) => c.className),
    k9Classes: k9Classes.map((c) => c.className),
    p8PerClass: p8,
    p9PerClass: p9,
    totalK8,
    totalK9,
    grandTotal: totalK8 + totalK9,
  };
}

/**
 * Tính tổng số tiết Công nghệ 8 & 9 cả học kỳ I (tuần 1 đến 18) của một giáo viên
 */
export function getTeacherCongNgheHk1SemesterTotal(teacherId: string) {
  const k8Classes = CONG_NGHE_8_CLASS_ASSIGNMENTS.filter((c) => c.teacherId === teacherId);
  const k9Classes = CONG_NGHE_9_CLASS_ASSIGNMENTS.filter((c) => c.teacherId === teacherId);

  // Khối 8: HK1 = 26 tiết/lớp
  const totalK8 = k8Classes.length * 26;
  // Khối 9: HK1 = 18 tiết/lớp
  const totalK9 = k9Classes.length * 18;

  const grandTotal = totalK8 + totalK9;
  const avgPerWeek = grandTotal / 18;

  return {
    k8ClassesCount: k8Classes.length,
    k8Classes: k8Classes.map((c) => c.className),
    totalK8,
    k9ClassesCount: k9Classes.length,
    k9Classes: k9Classes.map((c) => c.className),
    totalK9,
    grandTotal,
    avgPerWeek,
  };
}
