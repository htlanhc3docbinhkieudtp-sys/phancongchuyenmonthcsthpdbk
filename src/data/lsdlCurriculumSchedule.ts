/**
 * BẢNG PHÂN PHỐI TIẾT & PHÂN CÔNG CHUYÊN MÔN MÔN LỊCH SỬ - ĐỊA LÍ (THCS)
 * Theo kế hoạch giáo dục nhà trường và quy chuẩn thời khóa biểu chính thức (35 tuần):
 *
 * Khối 6 (105 tiết/năm): 3 tiết/tuần (HK1: 18w * 3 = 54t, HK2: 17w * 3 = 51t)
 * - 6A1 -> 6A4: 1 GV dạy trọn gói Lịch sử và Địa lí (Thầy Nguyễn Quốc Tấn: 3t/tuần).
 * - 6A5, 6A6: 2 GV (Sử: Thầy Nguyễn Quốc Tấn, Địa: Thầy Trần Phước Hòa).
 * - 6A7 -> 6A10: 2 GV (Sử: Cô Châu Thị Kim Hà, Địa: Cô Nguyễn Thị Kim Sang).
 *
 * Khối 7 (105 tiết/năm): 3 tiết/tuần (HK1: 18w * 3 = 54t, HK2: 17w * 3 = 51t)
 * - 7A1 -> 7A4: 2 GV (Sử: Cô Lê Thị Kim The, Địa: Cô Nguyễn Thị Kim Đỉnh).
 * - 7A5, 7A6: 2 GV (Sử: Cô Lê Thị Kim The, Địa: Thầy Ngô Anh Tuấn).
 * - 7A7 -> 7A9: 1 GV dạy trọn gói Lịch sử và Địa lí (Cô Phạm Thị Mỹ Châu: 3t/tuần).
 *
 * Khối 8 (105 tiết/năm: Sử 50t, Địa 55t):
 * - Sử 8: HK1 = 26t (T1-4: 2t/w, T5-9: 1t/w, T10-13: 2t/w, T14-18: 1t/w)
 *         HK2 = 24t (T19-22: 2t/w, T23-27: 1t/w, T28-30: 2t/w, T31-35: 1t/w)
 * - Địa 8: HK1 = 28t (T1-4: 1t/w, T5-9: 2t/w, T10-13: 1t/w, T14-18: 2t/w)
 *          HK2 = 27t (T19-22: 1t/w, T23-27: 2t/w, T28-30: 1t/w, T31-35: 2t/w)
 * - Tổng Sử + Địa mỗi tuần luôn = 3 tiết/tuần!
 * - Phân công:
 *   + 8A1 -> 8A3: Sử - Cô Lê Thị Kim The; Địa - Cô Nguyễn Thị Kim Đỉnh
 *   + 8A4 -> 8A6: Sử - Thầy Nguyễn Quốc Tấn; Địa - Cô Nguyễn Thị Kim Đỉnh
 *   + 8A7 -> 8A10: Sử - Cô Châu Thị Kim Hà; Địa - Cô Nguyễn Thị Kim Sang
 *
 * Khối 9 (105 tiết/năm: Sử 52t, Địa 53t):
 * - Sử 9: HK1 = 26t (T1-4: 2t/w, T5-9: 1t/w, T10-13: 2t/w, T14-18: 1t/w)
 *         HK2 = 26t (T19-22: 2t/w, T23-27: 1t/w, T28-30: 2t/w, T31-33: 1t/w, T34: 3t/w, T35: 1t/w)
 * - Địa 9: HK1 = 28t (T1-4: 1t/w, T5-9: 2t/w, T10-13: 1t/w, T14-18: 2t/w)
 *          HK2 = 25t (T19-22: 1t/w, T23-27: 2t/w, T28-30: 1t/w, T31-33: 2t/w, T34: 0t/w, T35: 2t/w)
 * - Tổng Sử + Địa mỗi tuần luôn = 3 tiết/tuần!
 * - Phân công:
 *   + 9A1, 9A2: Sử - Thầy Trịnh Văn Sơn; Địa - Cô Nguyễn Thị Lý
 *   + 9A3, 9A4: Sử - Cô Lê Thị Kim The; Địa - Cô Nguyễn Thị Lý
 *   + 9A5, 9A6: Sử - Cô Lê Thị Kim The; Địa - Cô Nguyễn Thị Kim Đỉnh
 *   + 9A7 -> 9A10: Sử - Cô Châu Thị Kim Hà; Địa - Cô Phạm Thị Mỹ Châu
 */

export interface LsdlClassAssignment {
  classId: string;
  className: string;
  grade: '6' | '7' | '8' | '9';
  type: 'SINGLE' | 'SPLIT'; // SINGLE = 1 GV dạy cả môn, SPLIT = 2 GV (Sử + Địa)
  // Nếu SINGLE
  teacherId?: string;
  teacherName?: string;
  // Nếu SPLIT
  historyTeacherId?: string;
  historyTeacherName?: string;
  geographyTeacherId?: string;
  geographyTeacherName?: string;
}

// Bảng số tiết Sử Khối 8 từng tuần (35 tuần, HK1: 26t, HK2: 24t, Cả năm: 50t)
export const SU_8_WEEKS: Record<number, number> = {
  // HK1 (26t)
  1: 2, 2: 2, 3: 2, 4: 2,
  5: 1, 6: 1, 7: 1, 8: 1, 9: 1,
  10: 2, 11: 2, 12: 2, 13: 2,
  14: 1, 15: 1, 16: 1, 17: 1, 18: 1,
  // HK2 (24t)
  19: 2, 20: 2, 21: 2, 22: 2,
  23: 1, 24: 1, 25: 1, 26: 1, 27: 1,
  28: 2, 29: 2, 30: 2,
  31: 1, 32: 1, 33: 1, 34: 1, 35: 1,
};

// Bảng số tiết Địa Khối 8 từng tuần (35 tuần, HK1: 28t, HK2: 27t, Cả năm: 55t)
export const DIA_8_WEEKS: Record<number, number> = {
  // HK1 (28t)
  1: 1, 2: 1, 3: 1, 4: 1,
  5: 2, 6: 2, 7: 2, 8: 2, 9: 2,
  10: 1, 11: 1, 12: 1, 13: 1,
  14: 2, 15: 2, 16: 2, 17: 2, 18: 2,
  // HK2 (27t)
  19: 1, 20: 1, 21: 1, 22: 1,
  23: 2, 24: 2, 25: 2, 26: 2, 27: 2,
  28: 1, 29: 1, 30: 1,
  31: 2, 32: 2, 33: 2, 34: 2, 35: 2,
};

// Bảng số tiết Sử Khối 9 từng tuần (35 tuần, HK1: 26t, HK2: 26t, Cả năm: 52t)
export const SU_9_WEEKS: Record<number, number> = {
  // HK1 (26t)
  1: 2, 2: 2, 3: 2, 4: 2,
  5: 1, 6: 1, 7: 1, 8: 1, 9: 1,
  10: 2, 11: 2, 12: 2, 13: 2,
  14: 1, 15: 1, 16: 1, 17: 1, 18: 1,
  // HK2 (26t)
  19: 2, 20: 2, 21: 2, 22: 2,
  23: 1, 24: 1, 25: 1, 26: 1, 27: 1,
  28: 2, 29: 2, 30: 2,
  31: 1, 32: 1, 33: 1,
  34: 3, // Đặc biệt tuần 34: 3 tiết
  35: 1,
};

// Bảng số tiết Địa Khối 9 từng tuần (35 tuần, HK1: 28t, HK2: 25t, Cả năm: 53t)
export const DIA_9_WEEKS: Record<number, number> = {
  // HK1 (28t)
  1: 1, 2: 1, 3: 1, 4: 1,
  5: 2, 6: 2, 7: 2, 8: 2, 9: 2,
  10: 1, 11: 1, 12: 1, 13: 1,
  14: 2, 15: 2, 16: 2, 17: 2, 18: 2,
  // HK2 (25t)
  19: 1, 20: 1, 21: 1, 22: 1,
  23: 2, 24: 2, 25: 2, 26: 2, 27: 2,
  28: 1, 29: 1, 30: 1,
  31: 2, 32: 2, 33: 2,
  34: 0, // Đặc biệt tuần 34: 0 tiết
  35: 2,
};

// Danh sách phân công toàn bộ môn Lịch sử & Địa lí THCS (39 lớp)
export const LSDL_ALL_CLASS_ASSIGNMENTS: LsdlClassAssignment[] = [
  // Khối 6 (10 lớp)
  {
    classId: 'cls-6a1',
    className: '6A1',
    grade: '6',
    type: 'SINGLE',
    teacherId: 'tch-ls-10',
    teacherName: 'Nguyễn Quốc Tấn',
  },
  {
    classId: 'cls-6a2',
    className: '6A2',
    grade: '6',
    type: 'SINGLE',
    teacherId: 'tch-ls-10',
    teacherName: 'Nguyễn Quốc Tấn',
  },
  {
    classId: 'cls-6a3',
    className: '6A3',
    grade: '6',
    type: 'SINGLE',
    teacherId: 'tch-ls-10',
    teacherName: 'Nguyễn Quốc Tấn',
  },
  {
    classId: 'cls-6a4',
    className: '6A4',
    grade: '6',
    type: 'SINGLE',
    teacherId: 'tch-ls-10',
    teacherName: 'Nguyễn Quốc Tấn',
  },
  {
    classId: 'cls-6a5',
    className: '6A5',
    grade: '6',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-10',
    historyTeacherName: 'Nguyễn Quốc Tấn',
    geographyTeacherId: 'tch-ls-6',
    geographyTeacherName: 'Trần Phước Hòa',
  },
  {
    classId: 'cls-6a6',
    className: '6A6',
    grade: '6',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-10',
    historyTeacherName: 'Nguyễn Quốc Tấn',
    geographyTeacherId: 'tch-ls-6',
    geographyTeacherName: 'Trần Phước Hòa',
  },
  {
    classId: 'cls-6a7',
    className: '6A7',
    grade: '6',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-14',
    historyTeacherName: 'Châu Thị Kim Hà',
    geographyTeacherId: 'tch-ls-15',
    geographyTeacherName: 'Nguyễn Thị Kim Sang',
  },
  {
    classId: 'cls-6a8',
    className: '6A8',
    grade: '6',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-14',
    historyTeacherName: 'Châu Thị Kim Hà',
    geographyTeacherId: 'tch-ls-15',
    geographyTeacherName: 'Nguyễn Thị Kim Sang',
  },
  {
    classId: 'cls-6a9',
    className: '6A9',
    grade: '6',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-14',
    historyTeacherName: 'Châu Thị Kim Hà',
    geographyTeacherId: 'tch-ls-15',
    geographyTeacherName: 'Nguyễn Thị Kim Sang',
  },
  {
    classId: 'cls-6a10',
    className: '6A10',
    grade: '6',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-14',
    historyTeacherName: 'Châu Thị Kim Hà',
    geographyTeacherId: 'tch-ls-15',
    geographyTeacherName: 'Nguyễn Thị Kim Sang',
  },

  // Khối 7 (9 lớp)
  {
    classId: 'cls-7a1',
    className: '7A1',
    grade: '7',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-9',
    historyTeacherName: 'Lê Thị Kim The',
    geographyTeacherId: 'tch-ls-11',
    geographyTeacherName: 'Nguyễn Thị Kim Đỉnh',
  },
  {
    classId: 'cls-7a2',
    className: '7A2',
    grade: '7',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-9',
    historyTeacherName: 'Lê Thị Kim The',
    geographyTeacherId: 'tch-ls-11',
    geographyTeacherName: 'Nguyễn Thị Kim Đỉnh',
  },
  {
    classId: 'cls-7a3',
    className: '7A3',
    grade: '7',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-9',
    historyTeacherName: 'Lê Thị Kim The',
    geographyTeacherId: 'tch-ls-11',
    geographyTeacherName: 'Nguyễn Thị Kim Đỉnh',
  },
  {
    classId: 'cls-7a4',
    className: '7A4',
    grade: '7',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-9',
    historyTeacherName: 'Lê Thị Kim The',
    geographyTeacherId: 'tch-ls-11',
    geographyTeacherName: 'Nguyễn Thị Kim Đỉnh',
  },
  {
    classId: 'cls-7a5',
    className: '7A5',
    grade: '7',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-9',
    historyTeacherName: 'Lê Thị Kim The',
    geographyTeacherId: 'tch-ls-7',
    geographyTeacherName: 'Ngô Anh Tuấn',
  },
  {
    classId: 'cls-7a6',
    className: '7A6',
    grade: '7',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-9',
    historyTeacherName: 'Lê Thị Kim The',
    geographyTeacherId: 'tch-ls-7',
    geographyTeacherName: 'Ngô Anh Tuấn',
  },
  {
    classId: 'cls-7a7',
    className: '7A7',
    grade: '7',
    type: 'SINGLE',
    teacherId: 'tch-ls-3',
    teacherName: 'Phạm Thị Mỹ Châu',
  },
  {
    classId: 'cls-7a8',
    className: '7A8',
    grade: '7',
    type: 'SINGLE',
    teacherId: 'tch-ls-3',
    teacherName: 'Phạm Thị Mỹ Châu',
  },
  {
    classId: 'cls-7a9',
    className: '7A9',
    grade: '7',
    type: 'SINGLE',
    teacherId: 'tch-ls-3',
    teacherName: 'Phạm Thị Mỹ Châu',
  },

  // Khối 8 (10 lớp)
  {
    classId: 'cls-8a1',
    className: '8A1',
    grade: '8',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-9',
    historyTeacherName: 'Lê Thị Kim The',
    geographyTeacherId: 'tch-ls-11',
    geographyTeacherName: 'Nguyễn Thị Kim Đỉnh',
  },
  {
    classId: 'cls-8a2',
    className: '8A2',
    grade: '8',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-9',
    historyTeacherName: 'Lê Thị Kim The',
    geographyTeacherId: 'tch-ls-11',
    geographyTeacherName: 'Nguyễn Thị Kim Đỉnh',
  },
  {
    classId: 'cls-8a3',
    className: '8A3',
    grade: '8',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-9',
    historyTeacherName: 'Lê Thị Kim The',
    geographyTeacherId: 'tch-ls-11',
    geographyTeacherName: 'Nguyễn Thị Kim Đỉnh',
  },
  {
    classId: 'cls-8a4',
    className: '8A4',
    grade: '8',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-10',
    historyTeacherName: 'Nguyễn Quốc Tấn',
    geographyTeacherId: 'tch-ls-11',
    geographyTeacherName: 'Nguyễn Thị Kim Đỉnh',
  },
  {
    classId: 'cls-8a5',
    className: '8A5',
    grade: '8',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-10',
    historyTeacherName: 'Nguyễn Quốc Tấn',
    geographyTeacherId: 'tch-ls-11',
    geographyTeacherName: 'Nguyễn Thị Kim Đỉnh',
  },
  {
    classId: 'cls-8a6',
    className: '8A6',
    grade: '8',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-10',
    historyTeacherName: 'Nguyễn Quốc Tấn',
    geographyTeacherId: 'tch-ls-11',
    geographyTeacherName: 'Nguyễn Thị Kim Đỉnh',
  },
  {
    classId: 'cls-8a7',
    className: '8A7',
    grade: '8',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-14',
    historyTeacherName: 'Châu Thị Kim Hà',
    geographyTeacherId: 'tch-ls-15',
    geographyTeacherName: 'Nguyễn Thị Kim Sang',
  },
  {
    classId: 'cls-8a8',
    className: '8A8',
    grade: '8',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-14',
    historyTeacherName: 'Châu Thị Kim Hà',
    geographyTeacherId: 'tch-ls-15',
    geographyTeacherName: 'Nguyễn Thị Kim Sang',
  },
  {
    classId: 'cls-8a9',
    className: '8A9',
    grade: '8',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-14',
    historyTeacherName: 'Châu Thị Kim Hà',
    geographyTeacherId: 'tch-ls-15',
    geographyTeacherName: 'Nguyễn Thị Kim Sang',
  },
  {
    classId: 'cls-8a10',
    className: '8A10',
    grade: '8',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-14',
    historyTeacherName: 'Châu Thị Kim Hà',
    geographyTeacherId: 'tch-ls-15',
    geographyTeacherName: 'Nguyễn Thị Kim Sang',
  },

  // Khối 9 (10 lớp)
  {
    classId: 'cls-9a1',
    className: '9A1',
    grade: '9',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-2',
    historyTeacherName: 'Trịnh Văn Sơn',
    geographyTeacherId: 'tch-ls-12',
    geographyTeacherName: 'Nguyễn Thị Lý',
  },
  {
    classId: 'cls-9a2',
    className: '9A2',
    grade: '9',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-2',
    historyTeacherName: 'Trịnh Văn Sơn',
    geographyTeacherId: 'tch-ls-12',
    geographyTeacherName: 'Nguyễn Thị Lý',
  },
  {
    classId: 'cls-9a3',
    className: '9A3',
    grade: '9',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-9',
    historyTeacherName: 'Lê Thị Kim The',
    geographyTeacherId: 'tch-ls-12',
    geographyTeacherName: 'Nguyễn Thị Lý',
  },
  {
    classId: 'cls-9a4',
    className: '9A4',
    grade: '9',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-9',
    historyTeacherName: 'Lê Thị Kim The',
    geographyTeacherId: 'tch-ls-12',
    geographyTeacherName: 'Nguyễn Thị Lý',
  },
  {
    classId: 'cls-9a5',
    className: '9A5',
    grade: '9',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-9',
    historyTeacherName: 'Lê Thị Kim The',
    geographyTeacherId: 'tch-ls-11',
    geographyTeacherName: 'Nguyễn Thị Kim Đỉnh',
  },
  {
    classId: 'cls-9a6',
    className: '9A6',
    grade: '9',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-9',
    historyTeacherName: 'Lê Thị Kim The',
    geographyTeacherId: 'tch-ls-11',
    geographyTeacherName: 'Nguyễn Thị Kim Đỉnh',
  },
  {
    classId: 'cls-9a7',
    className: '9A7',
    grade: '9',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-14',
    historyTeacherName: 'Châu Thị Kim Hà',
    geographyTeacherId: 'tch-ls-3',
    geographyTeacherName: 'Phạm Thị Mỹ Châu',
  },
  {
    classId: 'cls-9a8',
    className: '9A8',
    grade: '9',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-14',
    historyTeacherName: 'Châu Thị Kim Hà',
    geographyTeacherId: 'tch-ls-3',
    geographyTeacherName: 'Phạm Thị Mỹ Châu',
  },
  {
    classId: 'cls-9a9',
    className: '9A9',
    grade: '9',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-14',
    historyTeacherName: 'Châu Thị Kim Hà',
    geographyTeacherId: 'tch-ls-3',
    geographyTeacherName: 'Phạm Thị Mỹ Châu',
  },
  {
    classId: 'cls-9a10',
    className: '9A10',
    grade: '9',
    type: 'SPLIT',
    historyTeacherId: 'tch-ls-14',
    historyTeacherName: 'Châu Thị Kim Hà',
    geographyTeacherId: 'tch-ls-3',
    geographyTeacherName: 'Phạm Thị Mỹ Châu',
  },
];

/**
 * Lấy số tiết dạy Lịch sử / Địa lí của 1 giáo viên trong 1 tuần cụ thể
 */
export function getLsdlPeriodsForTeacherInWeek(
  teacherId: string,
  weekNumber: number
): {
  totalPeriods: number;
  details: {
    className: string;
    subject: 'Lịch sử và Địa lí' | 'Lịch sử' | 'Địa lí';
    periods: number;
  }[];
} {
  const isHk1 = weekNumber >= 1 && weekNumber <= 18;
  const su8 = SU_8_WEEKS[weekNumber] ?? (isHk1 ? (weekNumber <= 4 ? 2 : 1) : 1);
  const dia8 = DIA_8_WEEKS[weekNumber] ?? (isHk1 ? (weekNumber <= 4 ? 1 : 2) : 2);
  const su9 = SU_9_WEEKS[weekNumber] ?? (isHk1 ? (weekNumber <= 4 ? 2 : 1) : 1);
  const dia9 = DIA_9_WEEKS[weekNumber] ?? (isHk1 ? (weekNumber <= 4 ? 1 : 2) : 2);

  const details: {
    className: string;
    subject: 'Lịch sử và Địa lí' | 'Lịch sử' | 'Địa lí';
    periods: number;
  }[] = [];

  for (const as of LSDL_ALL_CLASS_ASSIGNMENTS) {
    if (as.type === 'SINGLE' && as.teacherId === teacherId) {
      // 1 GV dạy trọn gói 3 tiết/tuần
      details.push({
        className: as.className,
        subject: 'Lịch sử và Địa lí',
        periods: 3,
      });
    } else if (as.type === 'SPLIT') {
      if (as.historyTeacherId === teacherId) {
        let p = 0;
        if (as.grade === '6' || as.grade === '7') {
          // Tuần 1 & 2 TKB xếp Sử 2 tiết
          p = 2;
        } else if (as.grade === '8') {
          p = su8;
        } else if (as.grade === '9') {
          p = su9;
        }
        if (p > 0) {
          details.push({
            className: as.className,
            subject: 'Lịch sử',
            periods: p,
          });
        }
      }

      if (as.geographyTeacherId === teacherId) {
        let p = 0;
        if (as.grade === '6' || as.grade === '7') {
          // Tuần 1 & 2 TKB xếp Địa 1 tiết
          p = 1;
        } else if (as.grade === '8') {
          p = dia8;
        } else if (as.grade === '9') {
          p = dia9;
        }
        if (p > 0) {
          details.push({
            className: as.className,
            subject: 'Địa lí',
            periods: p,
          });
        }
      }
    }
  }

  const totalPeriods = details.reduce((sum, d) => sum + d.periods, 0);
  return { totalPeriods, details };
}

/**
 * Lấy tổng số tiết Lịch sử / Địa lí của 1 giáo viên trong toàn bộ Học kỳ 1 (18 tuần)
 */
export function getLsdlHk1TotalForTeacher(teacherId: string): number {
  let total = 0;
  for (let w = 1; w <= 18; w++) {
    total += getLsdlPeriodsForTeacherInWeek(teacherId, w).totalPeriods;
  }
  return total;
}
