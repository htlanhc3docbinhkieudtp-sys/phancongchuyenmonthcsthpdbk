import fs from 'fs';
import { initialClasses, initialSubjects } from '../src/data/initialData';
import { officialStaffList } from '../src/data/schoolStaffData';
import { matchClass, matchTeacher, matchSubject } from '../src/utils/vietSchoolImportHelper';
import { TimetableSlot } from '../src/types';

const rawMarkdown = fs.readFileSync('scripts/user_raw_tkb.md', 'utf8');
const lines = rawMarkdown.split(/\r?\n/);

function cleanText(str: string) {
  if (!str) return '';
  return str.replace(/\*\*/g, '').replace(/\[|\]/g, '').trim();
}

const dbkDay7Idx = lines.findIndex((l, idx) => idx > 500 && l.includes('Thứ 7'));
const thptT25Idx = lines.findIndex((l, idx) => idx > dbkDay7Idx && l.includes('11CB2-Toán'));
const thptT67Idx = lines.findIndex((l, idx) => idx > thptT25Idx && l.includes('Thứ 6') && l.includes('Thứ 7'));

function extractTeacherTables(startLine: number, endLine: number) {
  const tables: Array<{ header: string[]; rows: string[][] }> = [];
  let current: { header: string[]; rows: string[][] } | null = null;

  for (let i = startLine; i < endLine; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|') || !line.endsWith('|')) continue;
    if (/^\|(\s*[:-]+\s*\|)+$/.test(line)) continue;

    const cells = line.slice(1, -1).split('|').map(cleanText);
    if (cells.every(c => c === '')) continue;

    if (cells.some(c => c.includes('Giáo Viên') || c === 'Thứ 7' || (c.includes('Thứ 6') && cells.includes('Thứ 7')))) {
      if (current) tables.push(current);
      current = { header: cells, rows: [] };
      continue;
    }

    if (cells[0].includes('THỜI KHÓA BIỂU')) {
      continue;
    }

    if (current) {
      current.rows.push(cells);
    }
  }

  if (current) tables.push(current);
  return tables;
}

const dbkTablesPart1 = extractTeacherTables(0, dbkDay7Idx);
const dbkTablesPart2 = extractTeacherTables(dbkDay7Idx, thptT25Idx);
const thptTablesPart1 = extractTeacherTables(thptT25Idx - 5, thptT67Idx);
const thptTablesPart2 = extractTeacherTables(thptT67Idx, lines.length);

interface RawSlot {
  campus: 'THCS' | 'THPT';
  rawTeacher: string;
  session: 'S' | 'C';
  period: number;
  day: number;
  cellVal: string;
}

const rawSlots: RawSlot[] = [];

// DBK
for (let t = 0; t < dbkTablesPart1.length; t++) {
  const p1 = dbkTablesPart1[t];
  const p2 = dbkTablesPart2[t];

  let rawTeacher = '';
  for (const r of p1.rows) {
    if (r[0] && r[0] !== 'Giáo Viên') {
      rawTeacher = r[0];
      break;
    }
  }

  const dayColMap1: Record<number, number> = {};
  p1.header.forEach((h, colIdx) => {
    const dayMatch = h.match(/Thứ\s*(\d)/i);
    if (dayMatch) {
      dayColMap1[colIdx] = parseInt(dayMatch[1], 10);
    }
  });

  let currentSession: 'S' | 'C' = 'C';
  for (let rIdx = 0; rIdx < p1.rows.length; rIdx++) {
    const row = p1.rows[rIdx];
    if (row[1] === 'S' || row[1] === 'C') {
      currentSession = row[1] as 'S' | 'C';
    }
    const period = parseInt(row[2], 10);
    if (isNaN(period)) continue;

    for (const [colIdxStr, day] of Object.entries(dayColMap1)) {
      const colIdx = parseInt(colIdxStr, 10);
      const cellVal = row[colIdx] || '';
      if (cellVal.trim()) {
        rawSlots.push({
          campus: 'THCS',
          rawTeacher,
          session: currentSession,
          period,
          day,
          cellVal: cellVal.trim()
        });
      }
    }

    if (p2 && p2.rows[rIdx]) {
      const cellVal = p2.rows[rIdx][0] || '';
      if (cellVal.trim()) {
        rawSlots.push({
          campus: 'THCS',
          rawTeacher,
          session: currentSession,
          period,
          day: 7,
          cellVal: cellVal.trim()
        });
      }
    }
  }
}

// THPT
for (let t = 0; t < thptTablesPart1.length; t++) {
  const p1 = thptTablesPart1[t];
  const p2 = thptTablesPart2[t];

  let rawTeacher = '';
  for (const r of p1.rows) {
    if (r[0] && r[0] !== 'Giáo Viên') {
      rawTeacher = r[0];
      break;
    }
  }

  const dayColMap1: Record<number, number> = {};
  p1.header.forEach((h, colIdx) => {
    const dayMatch = h.match(/Thứ\s*(\d)/i);
    if (dayMatch) {
      dayColMap1[colIdx] = parseInt(dayMatch[1], 10);
    }
  });

  const dayColMap2: Record<number, number> = {};
  if (p2) {
    p2.header.forEach((h, colIdx) => {
      const dayMatch = h.match(/Thứ\s*(\d)/i);
      if (dayMatch) {
        dayColMap2[colIdx] = parseInt(dayMatch[1], 10);
      }
    });
  }

  let currentSession: 'S' | 'C' = 'S';
  for (let rIdx = 0; rIdx < p1.rows.length; rIdx++) {
    const row = p1.rows[rIdx];
    if (row[1] === 'S' || row[1] === 'C') {
      currentSession = row[1] as 'S' | 'C';
    }
    const period = parseInt(row[2], 10);
    if (isNaN(period)) continue;

    for (const [colIdxStr, day] of Object.entries(dayColMap1)) {
      const colIdx = parseInt(colIdxStr, 10);
      const cellVal = row[colIdx] || '';
      if (cellVal.trim()) {
        rawSlots.push({
          campus: 'THPT',
          rawTeacher,
          session: currentSession,
          period,
          day,
          cellVal: cellVal.trim()
        });
      }
    }

    if (p2 && p2.rows[rIdx]) {
      for (const [colIdxStr, day] of Object.entries(dayColMap2)) {
        const colIdx = parseInt(colIdxStr, 10);
        const cellVal = p2.rows[rIdx][colIdx] || '';
        if (cellVal.trim()) {
          rawSlots.push({
            campus: 'THPT',
            rawTeacher,
            session: currentSession,
            period,
            day,
            cellVal: cellVal.trim()
          });
        }
      }
    }
  }
}

console.log('Parsed rawSlots count:', rawSlots.length);

// Now test matching
const unmatchedClasses = new Set<string>();
const unmatchedTeachers = new Set<string>();
const matchedSlots: TimetableSlot[] = [];

for (const item of rawSlots) {
  // cellVal is usually "ClassName-SubjectName"
  // e.g. "7A5-Toán", "6A6-Chào cờ", "11CB2-Toán", "6A4-Lịch sử và Địa lý"
  const dashIdx = item.cellVal.indexOf('-');
  let rawClassName = '';
  let rawSubjectName = '';

  if (dashIdx > 0) {
    rawClassName = item.cellVal.substring(0, dashIdx).trim();
    rawSubjectName = item.cellVal.substring(dashIdx + 1).trim();
  } else {
    // maybe separated by space or colon?
    const parts = item.cellVal.split(/\s+/);
    rawClassName = parts[0];
    rawSubjectName = parts.slice(1).join(' ');
  }

  // Teacher name clean up: e.g. "Lê Thị Bình (ĐBK)" -> "Lê Thị Bình"
  // Special typo in VietSchool: "Lê Tnị Hoài An" -> "Lê Thị Hoài An"
  let cleanTeacher = item.rawTeacher
    .replace(/\s+/g, ' ')
    .replace(/\(ĐBK\)/gi, '')
    .replace(/\(Tân Kiều\)/gi, '')
    .replace(/\(Tân Kiểu\)/gi, '')
    .replace(/\(TK\)/gi, '')
    .trim();

  if (cleanTeacher.toLowerCase().includes('lê tnị hoài an')) {
    cleanTeacher = 'Lê Thị Hoài An';
  }
  if (cleanTeacher.toLowerCase().includes('ng thị kim xoa')) {
    cleanTeacher = 'Nguyễn Thị Kim Xoa';
  }

  const matchedCls = matchClass(rawClassName, initialClasses);
  if (!matchedCls) {
    unmatchedClasses.add(rawClassName);
    continue;
  }

  const matchedTch = matchTeacher(cleanTeacher, officialStaffList, matchedCls);
  if (!matchedTch) {
    unmatchedTeachers.add(cleanTeacher + ' (original: ' + item.rawTeacher + ')');
    continue;
  }

  const matchedSub = matchSubject(rawSubjectName, initialSubjects, matchedCls);

  matchedSlots.push({
    id: `slot-${matchedCls.id}-d${item.day}-p${item.period}`,
    classId: matchedCls.id,
    subjectId: matchedSub.id,
    teacherId: matchedTch.id,
    dayOfWeek: item.day,
    session: 'SANG',
    period: item.period,
    room: matchedCls.roomNumber || 'Phòng học'
  });
}

console.log('Successfully matched slots:', matchedSlots.length);
console.log('Unmatched classes count:', unmatchedClasses.size, Array.from(unmatchedClasses));
console.log('Unmatched teachers count:', unmatchedTeachers.size, Array.from(unmatchedTeachers));

// Campus breakdown
const thptSlots = matchedSlots.filter(s => {
  const cls = initialClasses.find(c => c.id === s.classId);
  return cls?.level === 'THPT';
});
const thcsSlots = matchedSlots.filter(s => {
  const cls = initialClasses.find(c => c.id === s.classId);
  return cls?.level === 'THCS';
});

console.log('THPT matched slots:', thptSlots.length);
console.log('THCS matched slots:', thcsSlots.length);
