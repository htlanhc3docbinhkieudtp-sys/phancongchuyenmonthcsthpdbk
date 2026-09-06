import * as XLSX from 'xlsx';
import fs from 'fs';
import { initialClasses, initialSubjects } from '../src/data/initialData';
import { officialStaffList } from '../src/data/schoolStaffData';
import { parseVietSchoolTimetable } from '../src/utils/vietSchoolImportHelper';

// Let's create an Excel workbook in Teacher-Centric format
const wb = XLSX.utils.book_new();
const wsData: any[][] = [
  ['THỜI KHÓA BIỂU THEO GIÁO VIÊN', '', '', '', '', '', '', '', ''],
  ['Giáo Viên', 'Buổi', 'Tiết', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'],
  ['Lê Cao Toàn', 'C', 1, '', '', '', '', '', ''],
  ['', '', 2, '', '', '', '', '', ''],
  ['', '', 3, '', '', '', '', '', ''],
  ['', '', 4, '', '7A5-Toán', '', '', '7A5-Toán', ''],
  ['', '', 5, '', '7A5-Toán', '', '', '7A5-Toán', ''],
  ['Lê Thị Bình (ĐBK)', 'C', 1, '', '6A5-Toán', '6A4-Toán', '6A2-Toán', '', '6A6-HĐ TN-HN(SHL)'],
  ['', '', 2, '', '6A5-Toán', '6A4-Toán', '6A4-Toán', '', '6A2-Toán'],
  ['', '', 3, '', '', '', '6A2-Toán', '', ''],
  ['', '', 4, '', '', '', '6A5-Toán', '', '6A6-Toán'],
  ['', '', 5, '', '', '', '', '', '6A6-SHL']
];
const ws = XLSX.utils.aoa_to_sheet(wsData);
XLSX.utils.book_append_sheet(wb, ws, 'TKB_GV');

const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

console.log('Testing parseVietSchoolTimetable with Excel buffer in Teacher-Centric format:');
const result = parseVietSchoolTimetable(excelBuffer, initialClasses, initialSubjects, officialStaffList);
console.log('Detected format:', result.detectedFormat);
console.log('Success count:', result.successCount);
console.log('Slots:', result.slots.map(s => `${s.className} ${s.subjectName} T${s.dayOfWeek} Tiết ${s.period} (${s.teacherName})`));
