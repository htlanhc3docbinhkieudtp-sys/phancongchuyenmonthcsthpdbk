import * as fs from 'fs';
import { initialClasses, initialTeachers, initialSubjects } from './src/data/initialData';
import { parseTeacherCentricFromMarkdown } from './src/utils/vietSchoolImportHelper';

// Let's test the ĐC section
const dcSection = `
|THỜI KHÓA BIỂU TKB.1409.2026 ĐC NĂM HỌC 2026-2027 ÁP DỤNG NGÀY 14-09-2026||||||||
| :-: | :- | :- | :- | :- | :- | :- | :- |
|**Giáo Viên**|**Buổi**|**Tiết**|**Thứ 2**|**Thứ 3**|**Thứ 4**|**Thứ 5**||
|Lê Cao Toàn|S|1||11CB2-Toán||||
|||2||||||
|||3||10CB3-Toán||||
|||4|10CB3-Toán|10CB3-Toán|10CB2-Toán|||
|||5|11CB2-Toán|10CB2-Toán|10CB2-Toán|||
|||||||||
|THỜI KHÓA BIỂU TKB.1409.2026 ĐC NĂM HỌC 2026-2027 ÁP DỤNG NGÀY 14-09-2026||||||||
|**Giáo Viên**|**Buổi**|**Tiết**|**Thứ 2**|**Thứ 3**|**Thứ 4**|**Thứ 5**||
|Trường|S|1||12CB3-GD KTPL|10CB3-GD KTPL|||
|||2|10CB5-GD KTPL|11CB4-GD KTPL|12CB4-GD KTPL|||
|||3|10CB4-GD KTPL|12CB5-GD KTPL|12CB3-GD KTPL|||
|||4|12CB4-GD KTPL|10CB5-GD KTPL||||
|||5|10CB3-GD KTPL|10CB4-GD KTPL|11CB3-GD KTPL|||

|||
| :-: | :- |
|**Thứ 6**|**Thứ 7**|
|11CB2-Toán||
|11CB2-Toán||
|10CB3-Toán||
|||
|10CB2-Toán||
`;

const res = parseTeacherCentricFromMarkdown(dcSection, initialClasses, initialSubjects, initialTeachers);
console.log("Parsed slots count:", res.slots.length);
res.slots.forEach(s => {
  console.log(`Slot: ${s.className} - ${s.subjectName} - T${s.dayOfWeek} ${s.session} Tiết ${s.period} -> GV: ${s.teacherName}`);
});
