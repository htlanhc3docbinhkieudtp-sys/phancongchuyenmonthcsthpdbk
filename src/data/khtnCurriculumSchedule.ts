/**
 * BẢNG PHÂN PHỐI TIẾT & PHÂN CÔNG CHUYÊN MÔN MÔN KHOA HỌC TỰ NHIÊN (KHTN) KHỐI 8 & 9
 * Theo kế hoạch giáo dục và phân phối chương trình chính thức
 */

export interface KhtnWeeklyDistribution {
  ly: number;
  sinh: number;
  hoa: number;
}

// Bảng phân phối tiết từng tuần Khối 8
export const KHTN_8_WEEKS: Record<number, KhtnWeeklyDistribution> = {
  // HỌC KỲ I (Tuần 1 - 18: Lý 24, Sinh 24, Hoá 24 = 72 tiết)
  1:  { ly: 3, sinh: 0, hoa: 1 },
  2:  { ly: 3, sinh: 0, hoa: 1 },
  3:  { ly: 2, sinh: 0, hoa: 2 },
  4:  { ly: 2, sinh: 0, hoa: 2 },
  5:  { ly: 1, sinh: 2, hoa: 1 },
  6:  { ly: 1, sinh: 2, hoa: 1 },
  7:  { ly: 1, sinh: 2, hoa: 1 },
  8:  { ly: 1, sinh: 2, hoa: 1 },
  9:  { ly: 1, sinh: 1, hoa: 2 },
  10: { ly: 1, sinh: 2, hoa: 1 },
  11: { ly: 1, sinh: 2, hoa: 1 },
  12: { ly: 1, sinh: 2, hoa: 1 },
  13: { ly: 1, sinh: 2, hoa: 1 },
  14: { ly: 1, sinh: 2, hoa: 1 },
  15: { ly: 1, sinh: 2, hoa: 1 },
  16: { ly: 1, sinh: 1, hoa: 2 },
  17: { ly: 1, sinh: 1, hoa: 2 },
  18: { ly: 1, sinh: 1, hoa: 2 },

  // HỌC KỲ II (Tuần 19 - 35: Lý 22, Sinh 24, Hoá 22 = 68 tiết)
  19: { ly: 1, sinh: 2, hoa: 1 },
  20: { ly: 1, sinh: 2, hoa: 1 },
  21: { ly: 1, sinh: 2, hoa: 1 },
  22: { ly: 1, sinh: 1, hoa: 2 },
  23: { ly: 1, sinh: 1, hoa: 2 },
  24: { ly: 1, sinh: 1, hoa: 2 },
  25: { ly: 2, sinh: 1, hoa: 1 },
  26: { ly: 2, sinh: 1, hoa: 1 },
  27: { ly: 1, sinh: 2, hoa: 1 },
  28: { ly: 2, sinh: 1, hoa: 1 },
  29: { ly: 2, sinh: 1, hoa: 1 },
  30: { ly: 2, sinh: 1, hoa: 1 },
  31: { ly: 1, sinh: 1, hoa: 2 },
  32: { ly: 1, sinh: 1, hoa: 2 },
  33: { ly: 1, sinh: 2, hoa: 1 },
  34: { ly: 1, sinh: 2, hoa: 1 },
  35: { ly: 1, sinh: 2, hoa: 1 },
};

// Bảng phân phối tiết từng tuần Khối 9
export const KHTN_9_WEEKS: Record<number, KhtnWeeklyDistribution> = {
  // HỌC KỲ I (Tuần 1 - 18: Lý 24, Sinh 19, Hoá 29 = 72 tiết)
  1:  { ly: 0, sinh: 1, hoa: 3 },
  2:  { ly: 2, sinh: 1, hoa: 1 },
  3:  { ly: 2, sinh: 1, hoa: 1 },
  4:  { ly: 2, sinh: 1, hoa: 1 },
  5:  { ly: 2, sinh: 1, hoa: 1 },
  6:  { ly: 2, sinh: 1, hoa: 1 },
  7:  { ly: 2, sinh: 1, hoa: 1 },
  8:  { ly: 2, sinh: 1, hoa: 1 },
  9:  { ly: 1, sinh: 2, hoa: 1 },
  10: { ly: 1, sinh: 1, hoa: 2 },
  11: { ly: 1, sinh: 1, hoa: 2 },
  12: { ly: 1, sinh: 1, hoa: 2 },
  13: { ly: 1, sinh: 1, hoa: 2 },
  14: { ly: 1, sinh: 1, hoa: 2 },
  15: { ly: 1, sinh: 1, hoa: 2 },
  16: { ly: 1, sinh: 1, hoa: 2 },
  17: { ly: 1, sinh: 1, hoa: 2 },
  18: { ly: 1, sinh: 1, hoa: 2 },

  // HỌC KỲ II (Tuần 19 - 35: Lý 21, Sinh 17, Hoá 30 = 68 tiết)
  19: { ly: 2, sinh: 1, hoa: 1 },
  20: { ly: 2, sinh: 1, hoa: 1 },
  21: { ly: 2, sinh: 1, hoa: 1 },
  22: { ly: 2, sinh: 1, hoa: 1 },
  23: { ly: 1, sinh: 1, hoa: 2 },
  24: { ly: 1, sinh: 1, hoa: 2 },
  25: { ly: 1, sinh: 1, hoa: 2 },
  26: { ly: 1, sinh: 1, hoa: 2 },
  27: { ly: 1, sinh: 1, hoa: 2 },
  28: { ly: 1, sinh: 1, hoa: 2 },
  29: { ly: 1, sinh: 1, hoa: 2 },
  30: { ly: 1, sinh: 1, hoa: 2 },
  31: { ly: 1, sinh: 1, hoa: 2 },
  32: { ly: 1, sinh: 1, hoa: 2 },
  33: { ly: 1, sinh: 1, hoa: 2 },
  34: { ly: 1, sinh: 1, hoa: 2 },
  35: { ly: 1, sinh: 1, hoa: 2 },
};

// Phân công giáo viên từng phân môn theo lớp
export interface KhtnClassAssignment {
  classId: string;
  className: string;
  campus: 'THCSDBK' | 'THCSTK';
  grade: '8' | '9';
  lyTeacherId: string;
  lyTeacherName: string;
  hoaTeacherId: string;
  hoaTeacherName: string;
  sinhTeacherId: string;
  sinhTeacherName: string;
}

export const KHTN_8_CLASS_ASSIGNMENTS: KhtnClassAssignment[] = [
  {
    classId: 'cls-8a1',
    className: '8A1',
    campus: 'THCSDBK',
    grade: '8',
    lyTeacherId: 'tch-khtn-13',
    lyTeacherName: 'Nguyễn Thị Thắm',
    hoaTeacherId: 'tch-khtn-11',
    hoaTeacherName: 'Lê Thái Phương',
    sinhTeacherId: 'tch-khtn-12',
    sinhTeacherName: 'Võ Hoàng Toàn',
  },
  {
    classId: 'cls-8a2',
    className: '8A2',
    campus: 'THCSDBK',
    grade: '8',
    lyTeacherId: 'tch-khtn-13',
    lyTeacherName: 'Nguyễn Thị Thắm',
    hoaTeacherId: 'tch-khtn-11',
    hoaTeacherName: 'Lê Thái Phương',
    sinhTeacherId: 'tch-khtn-18',
    sinhTeacherName: 'Hồ Thị Ngọc Tài',
  },
  {
    classId: 'cls-8a3',
    className: '8A3',
    campus: 'THCSDBK',
    grade: '8',
    lyTeacherId: 'tch-khtn-13',
    lyTeacherName: 'Nguyễn Thị Thắm',
    hoaTeacherId: 'tch-khtn-18',
    hoaTeacherName: 'Hồ Thị Ngọc Tài',
    sinhTeacherId: 'tch-khtn-18',
    sinhTeacherName: 'Hồ Thị Ngọc Tài',
  },
  {
    classId: 'cls-8a4',
    className: '8A4',
    campus: 'THCSDBK',
    grade: '8',
    lyTeacherId: 'tch-khtn-13',
    lyTeacherName: 'Nguyễn Thị Thắm',
    hoaTeacherId: 'tch-khtn-17',
    hoaTeacherName: 'Nguyễn Kim Ngân',
    sinhTeacherId: 'tch-khtn-18',
    sinhTeacherName: 'Hồ Thị Ngọc Tài',
  },
  {
    classId: 'cls-8a5',
    className: '8A5',
    campus: 'THCSDBK',
    grade: '8',
    lyTeacherId: 'tch-khtn-10',
    lyTeacherName: 'Trần Thị Hậu',
    hoaTeacherId: 'tch-khtn-12',
    hoaTeacherName: 'Võ Hoàng Toàn',
    sinhTeacherId: 'tch-khtn-12',
    sinhTeacherName: 'Võ Hoàng Toàn',
  },
  {
    classId: 'cls-8a6',
    className: '8A6',
    campus: 'THCSDBK',
    grade: '8',
    lyTeacherId: 'tch-khtn-10',
    lyTeacherName: 'Trần Thị Hậu',
    hoaTeacherId: 'tch-khtn-12',
    hoaTeacherName: 'Võ Hoàng Toàn',
    sinhTeacherId: 'tch-khtn-12',
    sinhTeacherName: 'Võ Hoàng Toàn',
  },
  {
    classId: 'cls-8a7',
    className: '8A7',
    campus: 'THCSTK',
    grade: '8',
    lyTeacherId: 'tch-khtn-14',
    lyTeacherName: 'Nguyễn Thị Bích Phượng',
    hoaTeacherId: 'tch-khtn-15',
    hoaTeacherName: 'Võ Ngọc Đình Văn',
    sinhTeacherId: 'tch-khtn-15',
    sinhTeacherName: 'Võ Ngọc Đình Văn',
  },
  {
    classId: 'cls-8a8',
    className: '8A8',
    campus: 'THCSTK',
    grade: '8',
    lyTeacherId: 'tch-khtn-14',
    lyTeacherName: 'Nguyễn Thị Bích Phượng',
    hoaTeacherId: 'tch-khtn-15',
    hoaTeacherName: 'Võ Ngọc Đình Văn',
    sinhTeacherId: 'tch-khtn-15',
    sinhTeacherName: 'Võ Ngọc Đình Văn',
  },
  {
    classId: 'cls-8a9',
    className: '8A9',
    campus: 'THCSTK',
    grade: '8',
    lyTeacherId: 'tch-khtn-14',
    lyTeacherName: 'Nguyễn Thị Bích Phượng',
    hoaTeacherId: 'tch-khtn-15',
    hoaTeacherName: 'Võ Ngọc Đình Văn',
    sinhTeacherId: 'tch-khtn-15',
    sinhTeacherName: 'Võ Ngọc Đình Văn',
  },
  {
    classId: 'cls-8a10',
    className: '8A10',
    campus: 'THCSTK',
    grade: '8',
    lyTeacherId: 'tch-khtn-14',
    lyTeacherName: 'Nguyễn Thị Bích Phượng',
    hoaTeacherId: 'tch-khtn-15',
    hoaTeacherName: 'Võ Ngọc Đình Văn',
    sinhTeacherId: 'tch-khtn-15',
    sinhTeacherName: 'Võ Ngọc Đình Văn',
  },
];

export const KHTN_9_CLASS_ASSIGNMENTS: KhtnClassAssignment[] = [
  {
    classId: 'cls-9a1',
    className: '9A1',
    campus: 'THCSDBK',
    grade: '9',
    lyTeacherId: 'tch-khtn-10',
    lyTeacherName: 'Trần Thị Hậu',
    hoaTeacherId: 'tch-khtn-11',
    hoaTeacherName: 'Lê Thái Phương',
    sinhTeacherId: 'tch-khtn-16',
    sinhTeacherName: 'Nguyễn Thị Cẩm Nhung',
  },
  {
    classId: 'cls-9a2',
    className: '9A2',
    campus: 'THCSDBK',
    grade: '9',
    lyTeacherId: 'tch-khtn-10',
    lyTeacherName: 'Trần Thị Hậu',
    hoaTeacherId: 'tch-khtn-11',
    hoaTeacherName: 'Lê Thái Phương',
    sinhTeacherId: 'tch-khtn-16',
    sinhTeacherName: 'Nguyễn Thị Cẩm Nhung',
  },
  {
    classId: 'cls-9a3',
    className: '9A3',
    campus: 'THCSDBK',
    grade: '9',
    lyTeacherId: 'tch-khtn-13',
    lyTeacherName: 'Nguyễn Thị Thắm',
    hoaTeacherId: 'tch-khtn-12',
    hoaTeacherName: 'Võ Hoàng Toàn',
    sinhTeacherId: 'tch-khtn-4',
    sinhTeacherName: 'Nguyễn Thị Hiếu',
  },
  {
    classId: 'cls-9a4',
    className: '9A4',
    campus: 'THCSDBK',
    grade: '9',
    lyTeacherId: 'tch-khtn-13',
    lyTeacherName: 'Nguyễn Thị Thắm',
    hoaTeacherId: 'tch-khtn-12',
    hoaTeacherName: 'Võ Hoàng Toàn',
    sinhTeacherId: 'tch-khtn-4',
    sinhTeacherName: 'Nguyễn Thị Hiếu',
  },
  {
    classId: 'cls-9a5',
    className: '9A5',
    campus: 'THCSDBK',
    grade: '9',
    lyTeacherId: 'tch-khtn-10',
    lyTeacherName: 'Trần Thị Hậu',
    hoaTeacherId: 'tch-khtn-11',
    hoaTeacherName: 'Lê Thái Phương',
    sinhTeacherId: 'tch-khtn-4',
    sinhTeacherName: 'Nguyễn Thị Hiếu',
  },
  {
    classId: 'cls-9a6',
    className: '9A6',
    campus: 'THCSDBK',
    grade: '9',
    lyTeacherId: 'tch-khtn-13',
    lyTeacherName: 'Nguyễn Thị Thắm',
    hoaTeacherId: 'tch-khtn-11',
    hoaTeacherName: 'Lê Thái Phương',
    sinhTeacherId: 'tch-khtn-4',
    sinhTeacherName: 'Nguyễn Thị Hiếu',
  },
  {
    classId: 'cls-9a7',
    className: '9A7',
    campus: 'THCSTK',
    grade: '9',
    lyTeacherId: 'tch-khtn-14',
    lyTeacherName: 'Nguyễn Thị Bích Phượng',
    hoaTeacherId: 'tch-khtn-20',
    hoaTeacherName: 'Đinh Thị Giàu',
    sinhTeacherId: 'tch-khtn-20',
    sinhTeacherName: 'Đinh Thị Giàu',
  },
  {
    classId: 'cls-9a8',
    className: '9A8',
    campus: 'THCSTK',
    grade: '9',
    lyTeacherId: 'tch-khtn-14',
    lyTeacherName: 'Nguyễn Thị Bích Phượng',
    hoaTeacherId: 'tch-khtn-20',
    hoaTeacherName: 'Đinh Thị Giàu',
    sinhTeacherId: 'tch-khtn-20',
    sinhTeacherName: 'Đinh Thị Giàu',
  },
  {
    classId: 'cls-9a9',
    className: '9A9',
    campus: 'THCSTK',
    grade: '9',
    lyTeacherId: 'tch-khtn-14',
    lyTeacherName: 'Nguyễn Thị Bích Phượng',
    hoaTeacherId: 'tch-khtn-20',
    hoaTeacherName: 'Đinh Thị Giàu',
    sinhTeacherId: 'tch-khtn-20',
    sinhTeacherName: 'Đinh Thị Giàu',
  },
  {
    classId: 'cls-9a10',
    className: '9A10',
    campus: 'THCSTK',
    grade: '9',
    lyTeacherId: 'tch-khtn-14',
    lyTeacherName: 'Nguyễn Thị Bích Phượng',
    hoaTeacherId: 'tch-khtn-15',
    hoaTeacherName: 'Võ Ngọc Đình Văn',
    sinhTeacherId: 'tch-khtn-20',
    sinhTeacherName: 'Đinh Thị Giàu',
  },
];

export const ALL_KHTN_CLASS_ASSIGNMENTS = [
  ...KHTN_8_CLASS_ASSIGNMENTS,
  ...KHTN_9_CLASS_ASSIGNMENTS,
];

/**
 * Lấy số tiết KHTN 8 & 9 của một giáo viên trong một tuần cụ thể
 */
export function getTeacherKhtnPeriodsForWeek(
  teacherId: string,
  weekNumber: number
): {
  total: number;
  k8: { ly: number; hoa: number; sinh: number; total: number; classes: string[] };
  k9: { ly: number; hoa: number; sinh: number; total: number; classes: string[] };
  breakdown: Array<{
    className: string;
    subDiscipline: 'Lý' | 'Hóa' | 'Sinh';
    periods: number;
  }>;
} {
  const dist8 = KHTN_8_WEEKS[weekNumber] || { ly: 1, sinh: 1, hoa: 2 };
  const dist9 = KHTN_9_WEEKS[weekNumber] || { ly: 1, sinh: 1, hoa: 2 };

  const res = {
    total: 0,
    k8: { ly: 0, hoa: 0, sinh: 0, total: 0, classes: [] as string[] },
    k9: { ly: 0, hoa: 0, sinh: 0, total: 0, classes: [] as string[] },
    breakdown: [] as Array<{
      className: string;
      subDiscipline: 'Lý' | 'Hóa' | 'Sinh';
      periods: number;
    }>,
  };

  // Khối 8
  for (const item of KHTN_8_CLASS_ASSIGNMENTS) {
    let hasClass = false;
    if (item.lyTeacherId === teacherId && dist8.ly > 0) {
      res.k8.ly += dist8.ly;
      res.k8.total += dist8.ly;
      res.total += dist8.ly;
      res.breakdown.push({ className: item.className, subDiscipline: 'Lý', periods: dist8.ly });
      hasClass = true;
    }
    if (item.hoaTeacherId === teacherId && dist8.hoa > 0) {
      res.k8.hoa += dist8.hoa;
      res.k8.total += dist8.hoa;
      res.total += dist8.hoa;
      res.breakdown.push({ className: item.className, subDiscipline: 'Hóa', periods: dist8.hoa });
      hasClass = true;
    }
    if (item.sinhTeacherId === teacherId && dist8.sinh > 0) {
      res.k8.sinh += dist8.sinh;
      res.k8.total += dist8.sinh;
      res.total += dist8.sinh;
      res.breakdown.push({ className: item.className, subDiscipline: 'Sinh', periods: dist8.sinh });
      hasClass = true;
    }
    if (hasClass && !res.k8.classes.includes(item.className)) {
      res.k8.classes.push(item.className);
    }
  }

  // Khối 9
  for (const item of KHTN_9_CLASS_ASSIGNMENTS) {
    let hasClass = false;
    if (item.lyTeacherId === teacherId && dist9.ly > 0) {
      res.k9.ly += dist9.ly;
      res.k9.total += dist9.ly;
      res.total += dist9.ly;
      res.breakdown.push({ className: item.className, subDiscipline: 'Lý', periods: dist9.ly });
      hasClass = true;
    }
    if (item.hoaTeacherId === teacherId && dist9.hoa > 0) {
      res.k9.hoa += dist9.hoa;
      res.k9.total += dist9.hoa;
      res.total += dist9.hoa;
      res.breakdown.push({ className: item.className, subDiscipline: 'Hóa', periods: dist9.hoa });
      hasClass = true;
    }
    if (item.sinhTeacherId === teacherId && dist9.sinh > 0) {
      res.k9.sinh += dist9.sinh;
      res.k9.total += dist9.sinh;
      res.total += dist9.sinh;
      res.breakdown.push({ className: item.className, subDiscipline: 'Sinh', periods: dist9.sinh });
      hasClass = true;
    }
    if (hasClass && !res.k9.classes.includes(item.className)) {
      res.k9.classes.push(item.className);
    }
  }

  return res;
}

/**
 * Tính tổng số tiết KHTN 8 & 9 cả học kỳ I (tuần 1 đến 18)
 */
export function getTeacherKhtnHk1SemesterTotal(teacherId: string) {
  let totalK8 = 0;
  let totalK9 = 0;
  const k8ClassDetails: { className: string; subjects: string[]; periods: number }[] = [];
  const k9ClassDetails: { className: string; subjects: string[]; periods: number }[] = [];

  for (const item of KHTN_8_CLASS_ASSIGNMENTS) {
    let p = 0;
    const subs: string[] = [];
    if (item.lyTeacherId === teacherId) {
      p += 24;
      subs.push('Lý (24t)');
    }
    if (item.hoaTeacherId === teacherId) {
      p += 24;
      subs.push('Hóa (24t)');
    }
    if (item.sinhTeacherId === teacherId) {
      p += 24;
      subs.push('Sinh (24t)');
    }
    if (p > 0) {
      totalK8 += p;
      k8ClassDetails.push({ className: item.className, subjects: subs, periods: p });
    }
  }

  for (const item of KHTN_9_CLASS_ASSIGNMENTS) {
    let p = 0;
    const subs: string[] = [];
    if (item.lyTeacherId === teacherId) {
      p += 24;
      subs.push('Lý (24t)');
    }
    if (item.hoaTeacherId === teacherId) {
      p += 29;
      subs.push('Hóa (29t)');
    }
    if (item.sinhTeacherId === teacherId) {
      p += 19;
      subs.push('Sinh (19t)');
    }
    if (p > 0) {
      totalK9 += p;
      k9ClassDetails.push({ className: item.className, subjects: subs, periods: p });
    }
  }

  const grandTotal = totalK8 + totalK9;
  const avgPerWeek = grandTotal / 18;

  return {
    totalK8,
    totalK9,
    grandTotal,
    avgPerWeek,
    k8ClassDetails,
    k9ClassDetails,
  };
}
