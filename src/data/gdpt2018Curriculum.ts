// Dữ liệu Chuẩn Khung Tiết GDPT 2018 dành cho Cấp THPT và Cấp THCS
// Trường THPT Đốc Binh Kiều (Kế hoạch năm học: HK1: 18 tuần, HK2: 17 tuần, Cả năm: 35 tuần)

export interface ThptSubjectItem {
  stt: number;
  name: string;
  shortCode?: string;
  category: 'bat_buoc' | 'lua_chon' | 'chuyen_de' | 'hoat_dong_bat_buoc' | 'tu_chon';
  categoryLabel: string;
  totalPeriods: number; // Cả năm
  hk1Periods: number;   // Số tiết HK1 (18 tuần)
  hk1Weeks: number;     // 18
  hk1Rate: number;      // Tiết/tuần HK1
  hk2Periods: number;   // Số tiết HK2 (17 tuần)
  hk2Weeks: number;     // 17 (hoặc 12 với AI)
  hk2Rate: number;      // Tiết/tuần HK2
  note?: string;
}

export interface ThcsSubjectItem {
  tt: number;
  name: string;
  shortCode?: string;
  grades: {
    '6': { hk1: number; hk2: number; total: number };
    '7': { hk1: number; hk2: number; total: number };
    '8': { hk1: number; hk2: number; total: number };
    '9': { hk1: number; hk2: number; total: number };
  };
  note?: string;
}

// 1. Dữ liệu cấp THPT (Lớp 10, 11, 12)
export const THPT_CURRICULUM: ThptSubjectItem[] = [
  // Môn học bắt buộc
  {
    stt: 1,
    name: 'Ngữ Văn',
    shortCode: 'Văn',
    category: 'bat_buoc',
    categoryLabel: 'Môn học bắt buộc',
    totalPeriods: 105,
    hk1Periods: 54,
    hk1Weeks: 18,
    hk1Rate: 3,
    hk2Periods: 51,
    hk2Weeks: 17,
    hk2Rate: 3,
    note: '54 tiết HK1 (3 tiết/tuần), 51 tiết HK2 (3 tiết/tuần)'
  },
  {
    stt: 2,
    name: 'Toán',
    shortCode: 'Toán',
    category: 'bat_buoc',
    categoryLabel: 'Môn học bắt buộc',
    totalPeriods: 105,
    hk1Periods: 54,
    hk1Weeks: 18,
    hk1Rate: 3,
    hk2Periods: 51,
    hk2Weeks: 17,
    hk2Rate: 3,
    note: '54 tiết HK1 (3 tiết/tuần), 51 tiết HK2 (3 tiết/tuần)'
  },
  {
    stt: 3,
    name: 'Tiếng Anh',
    shortCode: 'Anh',
    category: 'bat_buoc',
    categoryLabel: 'Môn học bắt buộc',
    totalPeriods: 105,
    hk1Periods: 54,
    hk1Weeks: 18,
    hk1Rate: 3,
    hk2Periods: 51,
    hk2Weeks: 17,
    hk2Rate: 3,
    note: '54 tiết HK1 (3 tiết/tuần), 51 tiết HK2 (3 tiết/tuần)'
  },
  {
    stt: 4,
    name: 'Giáo dục thể chất',
    shortCode: 'GDTC',
    category: 'bat_buoc',
    categoryLabel: 'Môn học bắt buộc',
    totalPeriods: 70,
    hk1Periods: 36,
    hk1Weeks: 18,
    hk1Rate: 2,
    hk2Periods: 34,
    hk2Weeks: 17,
    hk2Rate: 2,
    note: '36 tiết HK1 (2 tiết/tuần), 34 tiết HK2 (2 tiết/tuần)'
  },
  {
    stt: 5,
    name: 'Giáo dục QPAN',
    shortCode: 'GDQP',
    category: 'bat_buoc',
    categoryLabel: 'Môn học bắt buộc',
    totalPeriods: 35,
    hk1Periods: 18,
    hk1Weeks: 18,
    hk1Rate: 1,
    hk2Periods: 17,
    hk2Weeks: 17,
    hk2Rate: 1,
    note: '18 tiết HK1 (1 tiết/tuần), 17 tiết HK2 (1 tiết/tuần)'
  },
  {
    stt: 6,
    name: 'Lịch sử',
    shortCode: 'Sử',
    category: 'bat_buoc',
    categoryLabel: 'Môn học bắt buộc',
    totalPeriods: 52,
    hk1Periods: 18,
    hk1Weeks: 18,
    hk1Rate: 1,
    hk2Periods: 34,
    hk2Weeks: 17,
    hk2Rate: 2,
    note: 'HK1 học 1 tiết/tuần (18 tiết), HK2 học 2 tiết/tuần (34 tiết)'
  },

  // Môn học lựa chọn (chọn 4 môn học từ 9 môn)
  {
    stt: 1,
    name: 'Vật lí',
    shortCode: 'Lí',
    category: 'lua_chon',
    categoryLabel: 'Môn học lựa chọn (chọn 4 môn)',
    totalPeriods: 70,
    hk1Periods: 36,
    hk1Weeks: 18,
    hk1Rate: 2,
    hk2Periods: 34,
    hk2Weeks: 17,
    hk2Rate: 2,
    note: '36 tiết HK1 (2 tiết/tuần), 34 tiết HK2 (2 tiết/tuần)'
  },
  {
    stt: 2,
    name: 'Hóa học',
    shortCode: 'Hóa',
    category: 'lua_chon',
    categoryLabel: 'Môn học lựa chọn (chọn 4 môn)',
    totalPeriods: 70,
    hk1Periods: 36,
    hk1Weeks: 18,
    hk1Rate: 2,
    hk2Periods: 34,
    hk2Weeks: 17,
    hk2Rate: 2,
    note: '36 tiết HK1 (2 tiết/tuần), 34 tiết HK2 (2 tiết/tuần)'
  },
  {
    stt: 3,
    name: 'Sinh học',
    shortCode: 'Sinh',
    category: 'lua_chon',
    categoryLabel: 'Môn học lựa chọn (chọn 4 môn)',
    totalPeriods: 70,
    hk1Periods: 36,
    hk1Weeks: 18,
    hk1Rate: 2,
    hk2Periods: 34,
    hk2Weeks: 17,
    hk2Rate: 2,
    note: '36 tiết HK1 (2 tiết/tuần), 34 tiết HK2 (2 tiết/tuần)'
  },
  {
    stt: 4,
    name: 'Tin học',
    shortCode: 'Tin',
    category: 'lua_chon',
    categoryLabel: 'Môn học lựa chọn (chọn 4 môn)',
    totalPeriods: 70,
    hk1Periods: 36,
    hk1Weeks: 18,
    hk1Rate: 2,
    hk2Periods: 34,
    hk2Weeks: 17,
    hk2Rate: 2,
    note: '36 tiết HK1 (2 tiết/tuần), 34 tiết HK2 (2 tiết/tuần)'
  },
  {
    stt: 5,
    name: 'Địa lý',
    shortCode: 'Địa',
    category: 'lua_chon',
    categoryLabel: 'Môn học lựa chọn (chọn 4 môn)',
    totalPeriods: 70,
    hk1Periods: 36,
    hk1Weeks: 18,
    hk1Rate: 2,
    hk2Periods: 34,
    hk2Weeks: 17,
    hk2Rate: 2,
    note: '36 tiết HK1 (2 tiết/tuần), 34 tiết HK2 (2 tiết/tuần)'
  },
  {
    stt: 6,
    name: 'GDKT&PL',
    shortCode: 'GDKT&PL',
    category: 'lua_chon',
    categoryLabel: 'Môn học lựa chọn (chọn 4 môn)',
    totalPeriods: 70,
    hk1Periods: 36,
    hk1Weeks: 18,
    hk1Rate: 2,
    hk2Periods: 34,
    hk2Weeks: 17,
    hk2Rate: 2,
    note: '36 tiết HK1 (2 tiết/tuần), 34 tiết HK2 (2 tiết/tuần)'
  },
  {
    stt: 7,
    name: 'Công Nghệ (CN)',
    shortCode: 'Công nghệ',
    category: 'lua_chon',
    categoryLabel: 'Môn học lựa chọn (chọn 4 môn)',
    totalPeriods: 70,
    hk1Periods: 36,
    hk1Weeks: 18,
    hk1Rate: 2,
    hk2Periods: 34,
    hk2Weeks: 17,
    hk2Rate: 2,
    note: '36 tiết HK1 (2 tiết/tuần), 34 tiết HK2 (2 tiết/tuần)'
  },

  // Chuyên đề học tập lựa chọn (3 cụm chuyên đề của 3 môn)
  {
    stt: 1,
    name: 'Cụm chuyên đề Toán',
    shortCode: 'CĐ-Toán',
    category: 'chuyen_de',
    categoryLabel: 'Chuyên đề học tập lựa chọn (chọn 3 cụm)',
    totalPeriods: 35,
    hk1Periods: 18,
    hk1Weeks: 18,
    hk1Rate: 1,
    hk2Periods: 17,
    hk2Weeks: 17,
    hk2Rate: 1,
    note: '18 tiết HK1 (1 tiết/tuần), 17 tiết HK2 (1 tiết/tuần)'
  },
  {
    stt: 2,
    name: 'Cụm chuyên đề Ngữ Văn',
    shortCode: 'CĐ-Văn',
    category: 'chuyen_de',
    categoryLabel: 'Chuyên đề học tập lựa chọn (chọn 3 cụm)',
    totalPeriods: 35,
    hk1Periods: 18,
    hk1Weeks: 18,
    hk1Rate: 1,
    hk2Periods: 17,
    hk2Weeks: 17,
    hk2Rate: 1,
    note: '18 tiết HK1 (1 tiết/tuần), 17 tiết HK2 (1 tiết/tuần)'
  },
  {
    stt: 3,
    name: 'Cụm chuyên đề Hóa học',
    shortCode: 'CĐ-Hóa',
    category: 'chuyen_de',
    categoryLabel: 'Chuyên đề học tập lựa chọn (chọn 3 cụm)',
    totalPeriods: 35,
    hk1Periods: 18,
    hk1Weeks: 18,
    hk1Rate: 1,
    hk2Periods: 17,
    hk2Weeks: 17,
    hk2Rate: 1,
    note: '18 tiết HK1 (1 tiết/tuần), 17 tiết HK2 (1 tiết/tuần)'
  },
  {
    stt: 4,
    name: 'Cụm chuyên đề Vật lí',
    shortCode: 'CĐ-Lí',
    category: 'chuyen_de',
    categoryLabel: 'Chuyên đề học tập lựa chọn (chọn 3 cụm)',
    totalPeriods: 35,
    hk1Periods: 18,
    hk1Weeks: 18,
    hk1Rate: 1,
    hk2Periods: 17,
    hk2Weeks: 17,
    hk2Rate: 1,
    note: '18 tiết HK1 (1 tiết/tuần), 17 tiết HK2 (1 tiết/tuần)'
  },
  {
    stt: 5,
    name: 'Cụm chuyên đề Địa lí',
    shortCode: 'CĐ-Địa',
    category: 'chuyen_de',
    categoryLabel: 'Chuyên đề học tập lựa chọn (chọn 3 cụm)',
    totalPeriods: 35,
    hk1Periods: 18,
    hk1Weeks: 18,
    hk1Rate: 1,
    hk2Periods: 17,
    hk2Weeks: 17,
    hk2Rate: 1,
    note: '18 tiết HK1 (1 tiết/tuần), 17 tiết HK2 (1 tiết/tuần)'
  },
  {
    stt: 6,
    name: 'Cụm chuyên đề Lịch sử',
    shortCode: 'CĐ-Sử',
    category: 'chuyen_de',
    categoryLabel: 'Chuyên đề học tập lựa chọn (chọn 3 cụm)',
    totalPeriods: 35,
    hk1Periods: 18,
    hk1Weeks: 18,
    hk1Rate: 1,
    hk2Periods: 17,
    hk2Weeks: 17,
    hk2Rate: 1,
    note: '18 tiết HK1 (1 tiết/tuần), 17 tiết HK2 (1 tiết/tuần)'
  },
  {
    stt: 7,
    name: 'Cụm chuyên đề Tin học',
    shortCode: 'CĐ-Tin',
    category: 'chuyen_de',
    categoryLabel: 'Chuyên đề học tập lựa chọn (chọn 3 cụm)',
    totalPeriods: 35,
    hk1Periods: 18,
    hk1Weeks: 18,
    hk1Rate: 1,
    hk2Periods: 17,
    hk2Weeks: 17,
    hk2Rate: 1,
    note: '18 tiết HK1 (1 tiết/tuần), 17 tiết HK2 (1 tiết/tuần)'
  },

  // Hoạt động giáo dục bắt buộc
  {
    stt: 1,
    name: 'HĐ TrN HN',
    shortCode: 'HĐTNHN',
    category: 'hoat_dong_bat_buoc',
    categoryLabel: 'Hoạt động giáo dục bắt buộc',
    totalPeriods: 105,
    hk1Periods: 54,
    hk1Weeks: 18,
    hk1Rate: 3,
    hk2Periods: 51,
    hk2Weeks: 17,
    hk2Rate: 3,
    note: 'Bao gồm Chào cờ, Sinh hoạt lớp và HĐ Trải nghiệm hướng nghiệp theo chủ đề'
  },
  {
    stt: 2,
    name: 'ND GDĐP',
    shortCode: 'GDĐP',
    category: 'hoat_dong_bat_buoc',
    categoryLabel: 'Hoạt động giáo dục bắt buộc',
    totalPeriods: 35,
    hk1Periods: 18,
    hk1Weeks: 18,
    hk1Rate: 1,
    hk2Periods: 17,
    hk2Weeks: 17,
    hk2Rate: 1,
    note: '18 tiết HK1 (1 tiết/tuần), 17 tiết HK2 (1 tiết/tuần)'
  },
  {
    stt: 3,
    name: 'Giáo dục trí tuệ nhân tạo (AI)',
    shortCode: 'AI',
    category: 'hoat_dong_bat_buoc',
    categoryLabel: 'Hoạt động giáo dục bắt buộc',
    totalPeriods: 12,
    hk1Periods: 0,
    hk1Weeks: 18,
    hk1Rate: 0,
    hk2Periods: 12,
    hk2Weeks: 12,
    hk2Rate: 1,
    note: 'Bố trí học trong 12 tuần của Học kỳ II (1 tiết/tuần)'
  }
];

// Tổng hợp quy chuẩn cấp THPT cho 1 học sinh theo kế hoạch nhà trường
export const THPT_SUMMARY = {
  totalYearPeriods: 1009,
  hk1Periods: 504,
  hk2Periods: 505,
  hk1WeeklyAverage: 28,
  hk2WeeklyAverage: 29.71,
  yearWeeklyAverage: 28.84,
  ruleDescription: 'Học sinh học 6 môn bắt buộc (472 tiết) + 4 môn lựa chọn (280 tiết) + 3 cụm chuyên đề (105 tiết) + Hoạt động GD bắt buộc (152 tiết) = Tổng 1.009 tiết.'
};

// 2. Dữ liệu cấp THCS (Lớp 6, 7, 8, 9)
export const THCS_CURRICULUM: ThcsSubjectItem[] = [
  {
    tt: 1,
    name: 'Ngữ văn',
    shortCode: 'Văn',
    grades: {
      '6': { hk1: 72, hk2: 68, total: 140 },
      '7': { hk1: 72, hk2: 68, total: 140 },
      '8': { hk1: 72, hk2: 68, total: 140 },
      '9': { hk1: 72, hk2: 68, total: 140 },
    },
    note: '4 tiết/tuần (72t HK1, 68t HK2)'
  },
  {
    tt: 2,
    name: 'Toán',
    shortCode: 'Toán',
    grades: {
      '6': { hk1: 72, hk2: 68, total: 140 },
      '7': { hk1: 72, hk2: 68, total: 140 },
      '8': { hk1: 72, hk2: 68, total: 140 },
      '9': { hk1: 72, hk2: 68, total: 140 },
    },
    note: '4 tiết/tuần (72t HK1, 68t HK2)'
  },
  {
    tt: 3,
    name: 'Ngoại ngữ 1',
    shortCode: 'Anh',
    grades: {
      '6': { hk1: 54, hk2: 51, total: 105 },
      '7': { hk1: 54, hk2: 51, total: 105 },
      '8': { hk1: 54, hk2: 51, total: 105 },
      '9': { hk1: 54, hk2: 51, total: 105 },
    },
    note: '3 tiết/tuần (54t HK1, 51t HK2)'
  },
  {
    tt: 4,
    name: 'GDCD',
    shortCode: 'GDCD',
    grades: {
      '6': { hk1: 18, hk2: 17, total: 35 },
      '7': { hk1: 18, hk2: 17, total: 35 },
      '8': { hk1: 18, hk2: 17, total: 35 },
      '9': { hk1: 18, hk2: 17, total: 35 },
    },
    note: '1 tiết/tuần (18t HK1, 17t HK2)'
  },
  {
    tt: 5,
    name: 'LS và ĐL',
    shortCode: 'LS-ĐL',
    grades: {
      '6': { hk1: 54, hk2: 51, total: 105 },
      '7': { hk1: 54, hk2: 51, total: 105 },
      '8': { hk1: 54, hk2: 51, total: 105 },
      '9': { hk1: 54, hk2: 51, total: 105 },
    },
    note: '3 tiết/tuần (54t HK1, 51t HK2)'
  },
  {
    tt: 6,
    name: 'KHTN',
    shortCode: 'KHTN',
    grades: {
      '6': { hk1: 70, hk2: 70, total: 140 },
      '7': { hk1: 70, hk2: 70, total: 140 },
      '8': { hk1: 70, hk2: 70, total: 140 },
      '9': { hk1: 70, hk2: 70, total: 140 },
    },
    note: '70 tiết HK1 (~3.89t/tuần), 70 tiết HK2 (~4.12t/tuần)'
  },
  {
    tt: 7,
    name: 'Công nghệ',
    shortCode: 'Công nghệ',
    grades: {
      '6': { hk1: 18, hk2: 17, total: 35 },
      '7': { hk1: 18, hk2: 17, total: 35 },
      '8': { hk1: 26, hk2: 26, total: 52 },
      '9': { hk1: 18, hk2: 34, total: 52 },
    },
    note: 'Lớp 6,7: 35t (1t/w). Lớp 8: 52t (HK1 26t: T1-8 dạy 2t/w, T9-18 dạy 1t/w; HK2 26t: T19-27 dạy 2t/w, T28-35 dạy 1t/w). Lớp 9: 52t (HK1 18t: T1-18 dạy 1t/w; HK2 34t: T19-35 dạy 2t/w).'
  },
  {
    tt: 8,
    name: 'Tin học',
    shortCode: 'Tin',
    grades: {
      '6': { hk1: 18, hk2: 17, total: 35 },
      '7': { hk1: 18, hk2: 17, total: 35 },
      '8': { hk1: 18, hk2: 17, total: 35 },
      '9': { hk1: 18, hk2: 17, total: 35 },
    },
    note: '1 tiết/tuần (18t HK1, 17t HK2)'
  },
  {
    tt: 9,
    name: 'GDTC',
    shortCode: 'GDTC',
    grades: {
      '6': { hk1: 36, hk2: 34, total: 70 },
      '7': { hk1: 36, hk2: 34, total: 70 },
      '8': { hk1: 36, hk2: 34, total: 70 },
      '9': { hk1: 36, hk2: 34, total: 70 },
    },
    note: '2 tiết/tuần (36t HK1, 34t HK2)'
  },
  {
    tt: 10,
    name: 'Nghệ thuật',
    shortCode: 'Nghệ thuật',
    grades: {
      '6': { hk1: 36, hk2: 34, total: 70 },
      '7': { hk1: 36, hk2: 34, total: 70 },
      '8': { hk1: 36, hk2: 34, total: 70 },
      '9': { hk1: 36, hk2: 34, total: 70 },
    },
    note: '2 tiết/tuần (Âm nhạc 1 tiết + Mỹ thuật 1 tiết)'
  },
  {
    tt: 11,
    name: 'HĐTNHN',
    shortCode: 'HĐTNHN',
    grades: {
      '6': { hk1: 54, hk2: 51, total: 105 },
      '7': { hk1: 54, hk2: 51, total: 105 },
      '8': { hk1: 54, hk2: 51, total: 105 },
      '9': { hk1: 54, hk2: 51, total: 105 },
    },
    note: '3 tiết/tuần (54t HK1, 51t HK2)'
  },
  {
    tt: 12,
    name: 'GDĐP',
    shortCode: 'GDĐP',
    grades: {
      '6': { hk1: 18, hk2: 17, total: 35 },
      '7': { hk1: 18, hk2: 17, total: 35 },
      '8': { hk1: 18, hk2: 17, total: 35 },
      '9': { hk1: 18, hk2: 17, total: 35 },
    },
    note: '1 tiết/tuần (18t HK1, 17t HK2)'
  },
  {
    tt: 13,
    name: 'Trí tuệ nhân tạo (AI)',
    shortCode: 'AI',
    grades: {
      '6': { hk1: 0, hk2: 12, total: 12 },
      '7': { hk1: 0, hk2: 12, total: 12 },
      '8': { hk1: 0, hk2: 12, total: 12 },
      '9': { hk1: 0, hk2: 12, total: 12 },
    },
    note: 'HK1: 0 tiết. HK2: 12 tiết trong 12 tuần (1 tiết/tuần)'
  }
];

export const THCS_SUMMARY = {
  '6': {
    hk1Total: 520,
    hk2Total: 507,
    yearTotal: 1027,
    hk1Avg: 28.9,
    hk2Avg: 29.8,
    yearAvg: 29.3
  },
  '7': {
    hk1Total: 520,
    hk2Total: 507,
    yearTotal: 1027,
    hk1Avg: 28.9,
    hk2Avg: 29.8,
    yearAvg: 29.3
  },
  '8': {
    hk1Total: 528,
    hk2Total: 516,
    yearTotal: 1044,
    hk1Avg: 29.3,
    hk2Avg: 30.4,
    yearAvg: 29.8
  },
  '9': {
    hk1Total: 520,
    hk2Total: 524,
    yearTotal: 1044,
    hk1Avg: 28.9,
    hk2Avg: 30.8,
    yearAvg: 29.8
  }
};
