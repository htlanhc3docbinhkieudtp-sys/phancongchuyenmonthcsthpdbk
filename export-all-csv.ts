import * as fs from 'fs';
import * as path from 'path';
import { initialClasses, initialSubjects, initialTeachers, initialAssignments, initialSchoolConfig } from './src/data/initialData';
import { OFFICIAL_WEEK_2_SLOTS } from './src/data/officialWeek2Timetable';

function exportToCSV(filename: string, headers: string[], dataRows: (string | number)[][]) {
  const rows = [headers, ...dataRows];
  const csvContent = rows
    .map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  fs.writeFileSync(path.join(process.cwd(), filename), '\uFEFF' + csvContent, 'utf-8');
  console.log(`Exported ${filename}: ${dataRows.length} rows`);
}

// 1. File 1: TKB_TUAN_2_TIET_HOC.csv (1538 tiết chi tiết)
const sortedSlots = [...OFFICIAL_WEEK_2_SLOTS].sort((a, b) => {
  if (a.className !== b.className) return a.className.localeCompare(b.className);
  if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
  return a.period - b.period;
});

const slotHeaders = ['STT', 'Lop', 'Thu', 'Buoi', 'Tiet', 'MonHoc', 'GiaoVien', 'MaGV', 'CoSo', 'Khoi'];
const slotRows = sortedSlots.map((s, idx) => {
  const cls = initialClasses.find(c => c.name === s.className || c.id === s.classId);
  const coSo = cls?.campus === 'THPTDBK' ? 'THPT' : (cls?.campus === 'THCSTK' ? 'Tân Kiều' : 'Đốc Binh Kiều');
  const khoi = cls?.grade || '';
  const buoi = s.session === 'SANG' ? 'Sáng' : 'Chiều';
  return [
    idx + 1,
    s.className,
    s.dayOfWeek,
    buoi,
    s.period,
    s.subjectName || '',
    s.teacherName || '',
    s.teacherCode || '',
    coSo,
    khoi
  ];
});
exportToCSV('TKB_TUAN_2_TIET_HOC.csv', slotHeaders, slotRows);

// 2. File 2: DANH_SACH_53_LOP.csv
const classHeaders = ['STT', 'MaLop', 'TenLop', 'Khoi', 'CapHoc', 'CoSo', 'BuoiHoc'];
const classRows = initialClasses.map((c, idx) => {
  const coSo = c.campus === 'THPTDBK' ? 'Điểm chính (THPT)' : (c.campus === 'THCSTK' ? 'Điểm Tân Kiều (THCS)' : 'Điểm Đốc Binh Kiều (THCS)');
  const buoi = ['9', '8', '11', '12'].includes(c.grade) ? 'Sáng' : 'Chiều';
  return [idx + 1, c.id, c.name, c.grade, c.level, coSo, buoi];
});
exportToCSV('DANH_SACH_53_LOP.csv', classHeaders, classRows);

// 3. File 3: DANH_SACH_GIAO_VIEN.csv
const teacherHeaders = ['STT', 'MaID', 'TenGiaoVien', 'MaVietTat', 'ToChuyenMon', 'CoSo', 'Day2CoSo'];
const teacherRows = initialTeachers.map((t, idx) => {
  const coSo = t.campus === 'THPTDBK' ? 'Điểm chính' : (t.campus === 'THCSTK' ? 'Tân Kiều' : (t.campus === 'THCSDBK' ? 'Đốc Binh Kiều' : 'Toàn trường'));
  return [
    idx + 1,
    t.id,
    t.name,
    t.code,
    t.departmentId || '',
    coSo,
    t.isDualCampus ? 'Có' : 'Không'
  ];
});
exportToCSV('DANH_SACH_GIAO_VIEN.csv', teacherHeaders, teacherRows);

// 4. File 4: DANH_SACH_MON_HOC.csv
const subjectHeaders = ['STT', 'MaMon', 'TenMonHoc', 'TenVietTat', 'ToChuyenMon'];
const subjectRows = initialSubjects.map((s, idx) => [
  idx + 1,
  s.id,
  s.name,
  s.shortName,
  s.departmentId
]);
exportToCSV('DANH_SACH_MON_HOC.csv', subjectHeaders, subjectRows);

// 5. File 5: TKB_TUAN_2_MA_TRAN_LOP.csv (Dạng bảng ma trận trực quan Lớp x Thứ/Tiết)
const matrixHeaders = [
  'STT', 'CoSo', 'Khoi', 'Lop', 'Buoi',
  'T2_T1', 'T2_T2', 'T2_T3', 'T2_T4', 'T2_T5',
  'T3_T1', 'T3_T2', 'T3_T3', 'T3_T4', 'T3_T5',
  'T4_T1', 'T4_T2', 'T4_T3', 'T4_T4', 'T4_T5',
  'T5_T1', 'T5_T2', 'T5_T3', 'T5_T4', 'T5_T5',
  'T6_T1', 'T6_T2', 'T6_T3', 'T6_T4', 'T6_T5',
  'T7_T1', 'T7_T2', 'T7_T3', 'T7_T4', 'T7_T5'
];

const slotMap = new Map<string, string>();
OFFICIAL_WEEK_2_SLOTS.forEach(s => {
  const tCode = s.teacherCode ? ` (${s.teacherCode})` : '';
  slotMap.set(`${s.className}_${s.dayOfWeek}_${s.period}`, `${s.subjectName || ''}${tCode}`);
});

const matrixRows = initialClasses.map((cls, idx) => {
  const coSo = cls.campus === 'THPTDBK' ? 'THPT' : (cls.campus === 'THCSTK' ? 'Tân Kiều' : 'Đốc Binh Kiều');
  const buoi = ['9', '8', '11', '12'].includes(cls.grade) ? 'Sáng' : 'Chiều';
  const row: (string | number)[] = [idx + 1, coSo, cls.grade, cls.name, buoi];

  for (let d = 2; d <= 7; d++) {
    for (let p = 1; p <= 5; p++) {
      const cell = slotMap.get(`${cls.name}_${d}_${p}`) || '';
      row.push(cell);
    }
  }
  return row;
});
exportToCSV('TKB_TUAN_2_MA_TRAN_LOP.csv', matrixHeaders, matrixRows);
