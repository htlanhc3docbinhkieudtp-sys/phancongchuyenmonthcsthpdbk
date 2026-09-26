import * as fs from 'fs';
import * as path from 'path';
import { initialClasses, initialSubjects, initialTeachers, initialAssignments, initialSchoolConfig } from './src/data/initialData';
import { OFFICIAL_WEEK_2_SLOTS } from './src/data/officialWeek2Timetable';

// 1. Prepare JSON Export
const exportData = {
  schoolInfo: {
    name: "TRƯỜNG THCS & THPT ĐỐC BINH KIỀU",
    academicYear: initialSchoolConfig.academicYear || "2026 - 2027",
    semester: initialSchoolConfig.semester || "HK1",
    targetWeek: 2,
    description: "Dữ liệu thời khóa biểu Tuần 2 chính thức toàn trường (53 lớp: 14 THPT, 24 THCS Đốc Binh Kiều, 15 THCS Tân Kiều)"
  },
  campuses: [
    { id: "THPTDBK", name: "Điểm chính (THPT)", totalClasses: 14 },
    { id: "THCSDBK", name: "Điểm Đốc Binh Kiều (THCS)", totalClasses: 24 },
    { id: "THCSTK", name: "Điểm Tân Kiều (THCS)", totalClasses: 15 }
  ],
  classes: initialClasses.map(c => ({
    id: c.id,
    name: c.name,
    grade: c.grade,
    level: c.level,
    campus: c.campus,
    session: ['9', '8', '11', '12'].includes(c.grade) ? 'SANG' : 'CHIEU',
    homeroomTeacherId: c.homeroomTeacherId
  })),
  teachers: initialTeachers.map(t => ({
    id: t.id,
    name: t.name,
    code: t.code,
    departmentId: t.departmentId,
    campus: t.campus,
    isDualCampus: t.isDualCampus || false
  })),
  subjects: initialSubjects.map(s => ({
    id: s.id,
    name: s.name,
    shortName: s.shortName,
    departmentId: s.departmentId
  })),
  timetableWeek2Slots: OFFICIAL_WEEK_2_SLOTS
};

// Write JSON file
fs.writeFileSync(
  path.join(process.cwd(), 'TKB_TUAN_2_DU_LIEU_CHUAN.json'),
  JSON.stringify(exportData, null, 2),
  'utf-8'
);

// 2. Prepare Markdown Prompt for Google AI Studio
let md = `# DỮ LIỆU THỜI KHÓA BIỂU TUẦN 2 - TRƯỜNG THCS & THPT ĐỐC BINH KIỀU\n\n`;
md += `> **Mục đích:** Dùng làm dữ liệu đầu vào (Context / Dataset) cho Google AI Studio để xây dựng thuật toán xếp TKB hoặc phân tích TKB Tuần 2.\n`;
md += `> **Năm học:** ${exportData.schoolInfo.academicYear} | **Học kỳ:** ${exportData.schoolInfo.semester} | **Áp dụng:** Tuần 2\n`;
md += `> **Quy mô:** 53 Lớp học, ${initialTeachers.length} Giáo viên, 3 Điểm trường, ${OFFICIAL_WEEK_2_SLOTS.length} Tiết học.\n\n`;

md += `## 1. QUY ĐỊNH BUỔI HỌC VÀ ĐIỂM TRƯỜNG\n`;
md += `- **Buổi Sáng (Tiết 1 -> Tiết 5):** Khối 8, Khối 9 (THCS) và Khối 11, Khối 12 (THPT).\n`;
md += `- **Buổi Chiều (Tiết 1 -> Tiết 5):** Khối 6, Khối 7 (THCS) và Khối 10 (THPT).\n`;
md += `- **3 Điểm trường:**\n`;
md += `  + **Điểm chính (THPT):** 14 lớp (10CB1-5, 11CB1-4, 12CB1-5)\n`;
md += `  + **Điểm Đốc Binh Kiều (THCS DBK):** 24 lớp (6A1-6, 7A1-6, 8A1-6, 9A1-6)\n`;
md += `  + **Điểm Tân Kiều (THCS TK):** 15 lớp (6A7-10, 7A7-9, 8A7-10, 9A7-10)\n\n`;

md += `## 2. DANH SÁCH LỚP HỌC (53 LỚP)\n`;
md += `| STT | Mã Lớp | Tên Lớp | Khối | Cấp | Cơ sở | Buổi học |\n`;
md += `|:---:|:---|:---|:---:|:---:|:---|:---:|\n`;
exportData.classes.forEach((c, i) => {
  const campusLabel = c.campus === 'THPTDBK' ? 'Điểm chính (THPT)' : (c.campus === 'THCSTK' ? 'Tân Kiều' : 'Đốc Binh Kiều');
  md += `| ${i + 1} | \`${c.id}\` | **${c.name}** | Khối ${c.grade} | ${c.level} | ${campusLabel} | ${c.session === 'SANG' ? 'Sáng' : 'Chiều'} |\n`;
});
md += `\n`;

md += `## 3. DANH SÁCH GIÁO VIÊN (${initialTeachers.length} GV)\n`;
md += `| STT | Mã ID | Họ và Tên | Mã Viết Tắt | Điểm trường | Dạy 2 cơ sở |\n`;
md += `|:---:|:---|:---|:---|:---|:---:|\n`;
exportData.teachers.forEach((t, i) => {
  const campusLabel = t.campus === 'THPTDBK' ? 'Điểm chính' : (t.campus === 'THCSTK' ? 'Tân Kiều' : (t.campus === 'THCSDBK' ? 'Đốc Binh Kiều' : 'Toàn trường'));
  md += `| ${i + 1} | \`${t.id}\` | ${t.name} | **${t.code}** | ${campusLabel} | ${t.isDualCampus ? 'Có' : 'Không'} |\n`;
});
md += `\n`;

md += `## 4. CHI TIẾT THỜI KHÓA BIỂU TUẦN 2 (1538 TIẾT HỌC)\n`;
md += `Dưới đây là chi tiết từng tiết học của Tuần 2 theo định dạng chuẩn: \`Lớp | Thứ | Buổi | Tiết | Môn Học | Giáo Viên | Mã GV\`\n\n`;
md += `| Lớp | Thứ | Buổi | Tiết | Môn Học | Giáo Viên Giảng Dạy | Mã GV |\n`;
md += `|:---|:---:|:---:|:---:|:---|:---|:---:|\n`;

// Group slots by class name then day then period
const sortedSlots = [...OFFICIAL_WEEK_2_SLOTS].sort((a, b) => {
  if (a.className !== b.className) return a.className.localeCompare(b.className);
  if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
  return a.period - b.period;
});

sortedSlots.forEach(s => {
  const buoi = s.session === 'SANG' ? 'Sáng' : 'Chiều';
  md += `| **${s.className}** | Thứ ${s.dayOfWeek} | ${buoi} | Tiết ${s.period} | ${s.subjectName || ''} | ${s.teacherName || ''} | ${s.teacherCode || ''} |\n`;
});

fs.writeFileSync(
  path.join(process.cwd(), 'TKB_TUAN_2_PROMPT_GOOGLE_AI_STUDIO.md'),
  md,
  'utf-8'
);

console.log('Exported successfully!');
console.log('1. TKB_TUAN_2_DU_LIEU_CHUAN.json (' + fs.statSync('TKB_TUAN_2_DU_LIEU_CHUAN.json').size + ' bytes)');
console.log('2. TKB_TUAN_2_PROMPT_GOOGLE_AI_STUDIO.md (' + fs.statSync('TKB_TUAN_2_PROMPT_GOOGLE_AI_STUDIO.md').size + ' bytes)');
