import * as fs from 'fs';
import * as path from 'path';
import { initialClasses, initialSubjects, initialTeachers, initialSchoolConfig } from './src/data/initialData';
import { OFFICIAL_WEEK_2_SLOTS } from './src/data/officialWeek2Timetable';

function getCampusLabel(cls: { campus?: string; level?: string }): string {
  if (cls.campus === 'THPTDBK' || cls.level === 'THPT') {
    return 'Điểm chính (THPT)';
  }
  if (cls.campus === 'THCSTK') {
    return 'Điểm Tân Kiều (THCS)';
  }
  return 'Điểm Đốc Binh Kiều (THCS)';
}

function getClassSession(cls: { grade: string; level?: string }): 'Sáng' | 'Chiều' {
  // THPT (Khối 10, 11, 12) -> Buổi Sáng
  if (cls.level === 'THPT' || ['10', '11', '12'].includes(cls.grade)) {
    return 'Sáng';
  }
  // THCS Khối 8, 9 -> Buổi Sáng
  if (['8', '9'].includes(cls.grade)) {
    return 'Sáng';
  }
  // THCS Khối 6, 7 -> Buổi Chiều
  return 'Chiều';
}

function exportToCSV(filename: string, headers: string[], dataRows: (string | number)[][]) {
  const rows = [headers, ...dataRows];
  const csvContent = rows
    .map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  fs.writeFileSync(path.join(process.cwd(), filename), '\uFEFF' + csvContent, 'utf-8');
  console.log(`Exported ${filename}: ${dataRows.length} rows`);
}

// 1. DANH_SACH_53_LOP.csv
const classHeaders = ['STT', 'MaLop', 'TenLop', 'Khối', 'CấpHọc', 'ĐiểmTrường', 'BuổiHọc'];
const classRows = initialClasses.map((c, idx) => {
  const campus = getCampusLabel(c);
  const session = getClassSession(c);
  return [idx + 1, c.id, c.name, `Khối ${c.grade}`, c.level, campus, session];
});
exportToCSV('DANH_SACH_53_LOP.csv', classHeaders, classRows);

// 2. DANH_SACH_GIAO_VIEN.csv
const teacherHeaders = ['STT', 'MãID', 'TênGiáoViên', 'MãViếtTắt', 'TổChuyênMôn', 'ĐiểmTrường', 'DạyNhiềuCơSở'];
const teacherRows = initialTeachers.map((t, idx) => {
  const campus = t.campus === 'THPTDBK' ? 'Điểm chính (THPT)' : (t.campus === 'THCSTK' ? 'Điểm Tân Kiều (THCS)' : (t.campus === 'THCSDBK' ? 'Điểm Đốc Binh Kiều (THCS)' : 'Toàn trường'));
  return [
    idx + 1,
    t.id,
    t.name,
    t.code,
    t.departmentId || '',
    campus,
    t.isDualCampus ? 'Có' : 'Không'
  ];
});
exportToCSV('DANH_SACH_GIAO_VIEN.csv', teacherHeaders, teacherRows);

// 3. DANH_SACH_MON_HOC.csv
const subjectHeaders = ['STT', 'MãMôn', 'TênMônHọc', 'TênViếtTắt', 'MãTổ'];
const subjectRows = initialSubjects.map((s, idx) => [
  idx + 1,
  s.id,
  s.name,
  s.shortName,
  s.departmentId
]);
exportToCSV('DANH_SACH_MON_HOC.csv', subjectHeaders, subjectRows);

// 4. TKB_TUAN_2_TIET_HOC.csv (1.538 slots)
const sortedSlots = [...OFFICIAL_WEEK_2_SLOTS].sort((a, b) => {
  if (a.className !== b.className) return a.className.localeCompare(b.className);
  if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
  return a.period - b.period;
});

const slotHeaders = ['STT', 'ĐiểmTrường', 'Khối', 'Lớp', 'Thứ', 'Buổi', 'Tiết', 'MônHọc', 'GiáoViênGiảngDạy', 'MãGV'];
const slotRows = sortedSlots.map((s, idx) => {
  const cls = initialClasses.find(c => c.name === s.className || c.id === s.classId);
  const campus = cls ? getCampusLabel(cls) : (s.className.includes('CB') ? 'Điểm chính (THPT)' : 'Điểm Đốc Binh Kiều (THCS)');
  const grade = cls ? `Khối ${cls.grade}` : '';
  const session = cls ? getClassSession(cls) : (s.session === 'SANG' ? 'Sáng' : 'Chiều');

  return [
    idx + 1,
    campus,
    grade,
    s.className,
    `Thứ ${s.dayOfWeek}`,
    session,
    `Tiết ${s.period}`,
    s.subjectName || '',
    s.teacherName || '',
    s.teacherCode || ''
  ];
});
exportToCSV('TKB_TUAN_2_TIET_HOC.csv', slotHeaders, slotRows);

// 5. TKB_TUAN_2_MA_TRAN_LOP.csv (Bảng ma trận 53 lớp)
const matrixHeaders = [
  'STT', 'ĐiểmTrường', 'Khối', 'Lớp', 'BuổiHọc',
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
  const campus = getCampusLabel(cls);
  const session = getClassSession(cls);
  const row: (string | number)[] = [idx + 1, campus, `Khối ${cls.grade}`, cls.name, session];

  for (let d = 2; d <= 7; d++) {
    for (let p = 1; p <= 5; p++) {
      const cell = slotMap.get(`${cls.name}_${d}_${p}`) || '';
      row.push(cell);
    }
  }
  return row;
});
exportToCSV('TKB_TUAN_2_MA_TRAN_LOP.csv', matrixHeaders, matrixRows);

// Also update TKB_TUAN_2_PROMPT_GOOGLE_AI_STUDIO.md with exact rules
let md = `# DỮ LIỆU THỜI KHÓA BIỂU TUẦN 2 - TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU\n\n`;
md += `> **Mục đích:** Dữ liệu chuẩn Thời khóa biểu Tuần 2 để nạp vào Google AI Studio.\n`;
md += `> **Năm học:** ${initialSchoolConfig.academicYear || '2026 - 2027'} | **Học kỳ:** ${initialSchoolConfig.semester || 'HK1'} | **Tuần:** Tuần 2\n\n`;

md += `## 1. PHÂN BỐ ĐIỂM TRƯỜNG VÀ BUỔI HỌC\n`;
md += `- **Điểm chính (THPT - 14 lớp):** Gồm 10CB1-5 (5 lớp), 11CB1-4 (4 lớp), 12CB1-5 (5 lớp). **TẤT CẢ 14 LỚP ĐỀU HỌC BUỔI SÁNG (Tiết 1 -> Tiết 5)**.\n`;
md += `- **Điểm Đốc Binh Kiều (THCS - 24 lớp):**\n`;
md += `  + **Buổi Sáng:** Khối 8 (6 lớp: 8A1-6) và Khối 9 (6 lớp: 9A1-6).\n`;
md += `  + **Buổi Chiều:** Khối 6 (6 lớp: 6A1-6) và Khối 7 (6 lớp: 7A1-6).\n`;
md += `- **Điểm Tân Kiều (THCS - 15 lớp):**\n`;
md += `  + **Buổi Sáng:** Khối 8 (4 lớp: 8A7-10) và Khối 9 (4 lớp: 9A7-10).\n`;
md += `  + **Buổi Chiều:** Khối 6 (4 lớp: 6A7-10) và Khối 7 (3 lớp: 7A7-9).\n\n`;

md += `## 2. DANH SÁCH 53 LỚP HỌC\n`;
md += `| STT | Mã Lớp | Tên Lớp | Khối | Cấp Học | Điểm Trường | Buổi Học |\n`;
md += `|:---:|:---|:---|:---:|:---:|:---|:---:|\n`;
initialClasses.forEach((c, idx) => {
  md += `| ${idx + 1} | \`${c.id}\` | **${c.name}** | Khối ${c.grade} | ${c.level} | ${getCampusLabel(c)} | ${getClassSession(c)} |\n`;
});
md += `\n`;

md += `## 3. THỜI KHÓA BIỂU CHI TIẾT (1538 TIẾT)\n`;
md += `| Lớp | Thứ | Buổi | Tiết | Môn Học | Giáo Viên Giảng Dạy | Mã GV | Điểm Trường |\n`;
md += `|:---|:---:|:---:|:---:|:---|:---|:---:|:---|\n`;
sortedSlots.forEach(s => {
  const cls = initialClasses.find(c => c.name === s.className || c.id === s.classId);
  const campus = cls ? getCampusLabel(cls) : '';
  const session = cls ? getClassSession(cls) : (s.session === 'SANG' ? 'Sáng' : 'Chiều');
  md += `| **${s.className}** | Thứ ${s.dayOfWeek} | ${session} | Tiết ${s.period} | ${s.subjectName || ''} | ${s.teacherName || ''} | ${s.teacherCode || ''} | ${campus} |\n`;
});

fs.writeFileSync(path.join(process.cwd(), 'TKB_TUAN_2_PROMPT_GOOGLE_AI_STUDIO.md'), md, 'utf-8');
console.log('Updated TKB_TUAN_2_PROMPT_GOOGLE_AI_STUDIO.md');
