import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { initialClasses, initialTeachers, initialSchoolConfig } from './src/data/initialData';
import { OFFICIAL_WEEK_2_SLOTS } from './src/data/officialWeek2Timetable';

// Create flat tabular CSV and Excel
const headers = ['STT', 'CoSo', 'Khoi', 'Lop', 'Thu', 'Buoi', 'Tiet', 'MonHoc', 'GiaoVien', 'MaGV'];

const sortedSlots = [...OFFICIAL_WEEK_2_SLOTS].sort((a, b) => {
  if (a.className !== b.className) return a.className.localeCompare(b.className);
  if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
  return a.period - b.period;
});

const rows: any[][] = [headers];

sortedSlots.forEach((s, idx) => {
  const cls = initialClasses.find(c => c.name === s.className || c.id === s.classId);
  const coSo = cls?.campus === 'THPTDBK' ? 'THPT' : (cls?.campus === 'THCSTK' ? 'THCS_TanKieu' : 'THCS_DocBinhKieu');
  const khoi = cls?.grade || '';
  const buoi = s.session === 'SANG' ? 'Sang' : 'Chieu';

  rows.push([
    idx + 1,
    coSo,
    khoi,
    s.className,
    s.dayOfWeek,
    buoi,
    s.period,
    s.subjectName || '',
    s.teacherName || '',
    s.teacherCode || ''
  ]);
});

// 1. Export CSV
const csvContent = rows.map(r => r.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
fs.writeFileSync(path.join(process.cwd(), 'TKB_TUAN_2_DANH_SACH_TIET.csv'), '\uFEFF' + csvContent, 'utf-8');

// 2. Export Excel (.xlsx)
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(rows);
XLSX.utils.book_append_sheet(wb, ws, 'TKB_Tuan_2');

// Add Sheet 2: Danh sách lớp
const classHeaders = ['STT', 'MaLop', 'TenLop', 'Khoi', 'Cap', 'CoSo', 'Buoi'];
const classRows: any[][] = [classHeaders];
initialClasses.forEach((c, idx) => {
  const coSo = c.campus === 'THPTDBK' ? 'THPT' : (c.campus === 'THCSTK' ? 'THCS_TanKieu' : 'THCS_DocBinhKieu');
  const buoi = ['9', '8', '11', '12'].includes(c.grade) ? 'Sang' : 'Chieu';
  classRows.push([idx + 1, c.id, c.name, c.grade, c.level, coSo, buoi]);
});
const wsClass = XLSX.utils.aoa_to_sheet(classRows);
XLSX.utils.book_append_sheet(wb, wsClass, 'Danh_Sach_53_Lop');

// Add Sheet 3: Danh sách Giáo viên
const teacherHeaders = ['STT', 'MaID', 'TenGiaoVien', 'MaVietTat', 'CoSo'];
const teacherRows: any[][] = [teacherHeaders];
initialTeachers.forEach((t, idx) => {
  teacherRows.push([idx + 1, t.id, t.name, t.code, t.campus]);
});
const wsTeacher = XLSX.utils.aoa_to_sheet(teacherRows);
XLSX.utils.book_append_sheet(wb, wsTeacher, 'Danh_Sach_Giao_Vien');

XLSX.writeFile(wb, path.join(process.cwd(), 'TKB_TUAN_2_DAY_DU.xlsx'));

console.log('CSV and Excel generated successfully!');
