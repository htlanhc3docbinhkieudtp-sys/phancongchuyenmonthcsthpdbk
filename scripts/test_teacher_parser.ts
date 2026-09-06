import fs from 'fs';
import { initialClasses, initialSubjects } from '../src/data/initialData';
import { officialStaffList } from '../src/data/schoolStaffData';
import { ClassGroup, Subject, Teacher, TimetableSlot } from '../src/types';
import { matchClass, matchTeacher, matchSubject, VietSchoolParseResult } from '../src/utils/vietSchoolImportHelper';
import { normalizeTimetableSlots } from '../src/utils/timetableHelper';

function cleanText(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str).replace(/\*\*/g, '').replace(/\[|\]/g, '').trim();
}

function normalizeTeacherRaw(raw: string): string {
  let clean = cleanText(raw)
    .replace(/\s+/g, ' ')
    .replace(/\(ĐBK\)/gi, '')
    .replace(/\(Tân Kiều\)/gi, '')
    .replace(/\(Tân Kiểu\)/gi, '')
    .replace(/\(TK\)/gi, '')
    .trim();

  if (clean.toLowerCase().includes('lê tnị hoài an')) {
    clean = 'Lê Thị Hoài An';
  }
  if (clean.toLowerCase().includes('ng thị kim xoa')) {
    clean = 'Nguyễn Thị Kim Xoa';
  }
  return clean;
}

function deconstructCell(cellVal: string): { rawClassName: string; rawSubjectName: string } {
  const trimmed = cleanText(cellVal);
  const dashIdx = trimmed.indexOf('-');
  if (dashIdx > 0) {
    return {
      rawClassName: trimmed.substring(0, dashIdx).trim(),
      rawSubjectName: trimmed.substring(dashIdx + 1).trim()
    };
  }
  const parts = trimmed.split(/\s+/);
  return {
    rawClassName: parts[0] || '',
    rawSubjectName: parts.slice(1).join(' ')
  };
}

export function parseTeacherCentricFromMarkdown(
  text: string,
  classes: ClassGroup[],
  subjects: Subject[],
  teachers: Teacher[]
): VietSchoolParseResult {
  const lines = text.split(/\r?\n/);
  const errors: string[] = [];
  const warnings: string[] = [];
  const slots: TimetableSlot[] = [];
  const recognizedClassNames = new Set<string>();
  const unrecognizedClassNames = new Set<string>();
  const recognizedTeacherNames = new Set<string>();
  const unrecognizedTeacherNames = new Set<string>();

  // Helper to extract table blocks with headers and rows
  interface TableBlock {
    header: string[];
    rows: string[][];
    startLine: number;
  }

  const allBlocks: TableBlock[] = [];
  let currentBlock: TableBlock | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|') || !line.endsWith('|')) continue;
    if (/^\|(\s*[:-]+\s*\|)+$/.test(line)) continue; // separator line

    const cells = line.slice(1, -1).split('|').map(cleanText);
    if (cells.every(c => c === '')) continue;

    // Check if header row: contains "Giáo Viên" or "Thứ"
    const isHeader = cells.some(c => 
      c.includes('Giáo Viên') || 
      c === 'Thứ 7' || 
      (c.includes('Thứ 6') && cells.includes('Thứ 7')) ||
      (c.includes('Thứ 2') && c.includes('Thứ 3'))
    );

    if (isHeader) {
      if (currentBlock) allBlocks.push(currentBlock);
      currentBlock = { header: cells, rows: [], startLine: i + 1 };
      continue;
    }

    if (cells[0].includes('THỜI KHÓA BIỂU')) {
      continue;
    }

    if (currentBlock) {
      currentBlock.rows.push(cells);
    }
  }
  if (currentBlock) allBlocks.push(currentBlock);

  // Group blocks:
  // Primary blocks have "Giáo Viên" in header (or col 0)
  // Secondary blocks have "Thứ 6/7" or "Thứ 7" without "Giáo Viên"
  const primaryBlocks: TableBlock[] = [];
  const secondaryBlocks: TableBlock[] = [];

  for (const block of allBlocks) {
    const hasTeacherHeader = block.header.some(c => c.includes('Giáo Viên'));
    if (hasTeacherHeader) {
      primaryBlocks.push(block);
    } else {
      secondaryBlocks.push(block);
    }
  }

  console.log(`Detected ${primaryBlocks.length} primary teacher blocks, ${secondaryBlocks.length} secondary day blocks`);

  // Parse each primary block
  for (let bIdx = 0; bIdx < primaryBlocks.length; bIdx++) {
    const pBlock = primaryBlocks[bIdx];
    const sBlock = secondaryBlocks[bIdx]; // matching secondary block if split

    // Identify teacher name
    let rawTeacher = '';
    for (const r of pBlock.rows) {
      if (r[0] && !r[0].includes('Giáo Viên')) {
        rawTeacher = r[0];
        break;
      }
    }

    const cleanTeacher = normalizeTeacherRaw(rawTeacher);
    const matchedTeacher = matchTeacher(cleanTeacher, teachers);
    if (cleanTeacher) {
      if (matchedTeacher) recognizedTeacherNames.add(matchedTeacher.name);
      else unrecognizedTeacherNames.add(cleanTeacher);
    }

    // Map day columns for primary block
    const pDayColMap: Record<number, number> = {};
    pBlock.header.forEach((h, colIdx) => {
      const match = h.match(/Thứ\s*(\d)/i);
      if (match) {
        pDayColMap[colIdx] = parseInt(match[1], 10);
      }
    });

    // Map day columns for secondary block
    const sDayColMap: Record<number, number> = {};
    if (sBlock) {
      sBlock.header.forEach((h, colIdx) => {
        const match = h.match(/Thứ\s*(\d)/i);
        if (match) {
          sDayColMap[colIdx] = parseInt(match[1], 10);
        }
      });
      // If sBlock header is just ["Thứ 7"], colIdx 0 is day 7
      if (Object.keys(sDayColMap).length === 0 && sBlock.header.some(h => h.includes('Thứ 7'))) {
        sDayColMap[0] = 7;
      }
    }

    let currentSession: 'SANG' | 'CHIEU' = 'CHIEU';

    for (let rIdx = 0; rIdx < pBlock.rows.length; rIdx++) {
      const row = pBlock.rows[rIdx];
      // Update session if specified
      if (row[1] === 'S' || row[1] === 'Sáng' || row[1] === 'SANG') {
        currentSession = 'SANG';
      } else if (row[1] === 'C' || row[1] === 'Chiều' || row[1] === 'CHIEU') {
        currentSession = 'CHIEU';
      }

      const period = parseInt(cleanText(row[2]).replace(/[^0-9]/g, ''), 10);
      if (isNaN(period) || period < 1 || period > 5) continue;

      // Extract from primary block
      for (const [colIdxStr, day] of Object.entries(pDayColMap)) {
        const colIdx = parseInt(colIdxStr, 10);
        const cellVal = row[colIdx] || '';
        if (!cellVal.trim()) continue;

        const { rawClassName, rawSubjectName } = deconstructCell(cellVal);
        if (!rawClassName) continue;

        const targetClass = matchClass(rawClassName, classes);
        if (!targetClass) {
          unrecognizedClassNames.add(rawClassName);
          continue;
        }
        recognizedClassNames.add(targetClass.name);

        const matchedSubject = matchSubject(rawSubjectName, subjects, targetClass);

        const slotId = `${targetClass.id}_${day}_${currentSession}_${period}`;
        slots.push({
          id: slotId,
          classId: targetClass.id,
          className: targetClass.name,
          dayOfWeek: day,
          session: currentSession,
          period,
          subjectId: matchedSubject.id,
          subjectName: matchedSubject.name,
          teacherId: matchedTeacher?.id || '',
          teacherName: matchedTeacher?.name || cleanTeacher,
          teacherCode: matchedTeacher?.code || cleanTeacher,
          room: targetClass.roomNumber || 'Phòng học'
        });
      }

      // Extract from secondary block
      if (sBlock && sBlock.rows[rIdx]) {
        const sRow = sBlock.rows[rIdx];
        for (const [colIdxStr, day] of Object.entries(sDayColMap)) {
          const colIdx = parseInt(colIdxStr, 10);
          const cellVal = sRow[colIdx] || '';
          if (!cellVal.trim()) continue;

          const { rawClassName, rawSubjectName } = deconstructCell(cellVal);
          if (!rawClassName) continue;

          const targetClass = matchClass(rawClassName, classes);
          if (!targetClass) {
            unrecognizedClassNames.add(rawClassName);
            continue;
          }
          recognizedClassNames.add(targetClass.name);

          const matchedSubject = matchSubject(rawSubjectName, subjects, targetClass);

          const slotId = `${targetClass.id}_${day}_${currentSession}_${period}`;
          slots.push({
            id: slotId,
            classId: targetClass.id,
            className: targetClass.name,
            dayOfWeek: day,
            session: currentSession,
            period,
            subjectId: matchedSubject.id,
            subjectName: matchedSubject.name,
            teacherId: matchedTeacher?.id || '',
            teacherName: matchedTeacher?.name || cleanTeacher,
            teacherCode: matchedTeacher?.code || cleanTeacher,
            room: targetClass.roomNumber || 'Phòng học'
          });
        }
      }
    }
  }

  // Deduplicate slots
  const slotMap = new Map<string, TimetableSlot>();
  slots.forEach(s => {
    const key = `${s.classId}_${s.dayOfWeek}_${s.session}_${s.period}`;
    slotMap.set(key, s);
  });
  const dedupedSlots = Array.from(slotMap.values());

  let thptSlots = 0;
  let thcsDbkSlots = 0;
  let thcsTkSlots = 0;

  dedupedSlots.forEach(s => {
    const cls = classes.find(c => c.id === s.classId);
    if (cls?.level === 'THPT' || cls?.campus === 'THPTDBK') {
      thptSlots++;
    } else if (cls?.campus === 'THCSTK' || /^[6789]A([789]|10)$/i.test(cls?.name || '')) {
      thcsTkSlots++;
    } else {
      thcsDbkSlots++;
    }
  });

  return {
    slots: normalizeTimetableSlots(dedupedSlots),
    recognizedClasses: Array.from(recognizedClassNames),
    unrecognizedClasses: Array.from(unrecognizedClassNames),
    recognizedTeachers: Array.from(recognizedTeacherNames),
    unrecognizedTeachers: Array.from(unrecognizedTeacherNames),
    campusStats: {
      thptSlots,
      thcsDbkSlots,
      thcsTkSlots
    },
    errors,
    warnings,
    sheetNames: ['Thời khóa biểu theo Giáo viên'],
    detectedFormat: 'VietSchool - Thời khóa biểu theo Giáo viên',
    successCount: dedupedSlots.length
  };
}

const rawMarkdown = fs.readFileSync('scripts/user_raw_tkb.md', 'utf8');
const result = parseTeacherCentricFromMarkdown(rawMarkdown, initialClasses, initialSubjects, officialStaffList);
console.log('Result:', {
  detectedFormat: result.detectedFormat,
  successCount: result.successCount,
  thptSlots: result.campusStats.thptSlots,
  thcsDbkSlots: result.campusStats.thcsDbkSlots,
  unrecognizedClasses: result.unrecognizedClasses,
  unrecognizedTeachers: result.unrecognizedTeachers
});
