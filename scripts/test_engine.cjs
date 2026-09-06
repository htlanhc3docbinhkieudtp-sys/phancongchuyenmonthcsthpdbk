const fs = require('fs');

const rawMarkdown = fs.readFileSync('scripts/user_raw_tkb.md', 'utf8');
const lines = rawMarkdown.split(/\r?\n/);

function cleanText(str) {
  if (!str) return '';
  return str.replace(/\*\*/g, '').replace(/\[|\]/g, '').trim();
}

// 1. Split markdown into sections
const dbkDay7Idx = lines.findIndex((l, idx) => idx > 500 && l.includes('Thứ 7'));
const thptT25Idx = lines.findIndex((l, idx) => idx > dbkDay7Idx && l.includes('11CB2-Toán'));
const thptT67Idx = lines.findIndex((l, idx) => idx > thptT25Idx && l.includes('Thứ 6') && l.includes('Thứ 7'));

console.log('Section line indices:', { dbkDay7Idx, thptT25Idx, thptT67Idx });

// Helper to extract teacher tables from a lines range
function extractTeacherTables(startLine, endLine) {
  const tables = [];
  let current = null;

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
console.log('DBK Tables Part 1:', dbkTablesPart1.length, 'Part 2 (Day 7):', dbkTablesPart2.length);

const thptTablesPart1 = extractTeacherTables(thptT25Idx - 5, thptT67Idx);
const thptTablesPart2 = extractTeacherTables(thptT67Idx, lines.length);
console.log('THPT Tables Part 1:', thptTablesPart1.length, 'Part 2 (Day 6-7):', thptTablesPart2.length);

// Now let's extract slots from each teacher
const extractedSlots = [];

// Parse DBK
for (let t = 0; t < dbkTablesPart1.length; t++) {
  const p1 = dbkTablesPart1[t];
  const p2 = dbkTablesPart2[t];

  // Get teacher name from first non-empty cell in col 0 of p1 rows
  let teacherName = '';
  for (const r of p1.rows) {
    if (r[0] && r[0] !== 'Giáo Viên') {
      teacherName = r[0];
      break;
    }
  }

  // Column mapping for p1 header:
  // Usually: [Giáo Viên, Buổi, Tiết, Thứ 2, Thứ 3, Thứ 4, Thứ 5, Thứ 6]
  // Let's find day columns
  const dayColMap1 = {};
  p1.header.forEach((h, colIdx) => {
    const dayMatch = h.match(/Thứ\s*(\d)/i);
    if (dayMatch) {
      dayColMap1[colIdx] = parseInt(dayMatch[1], 10);
    }
  });

  let currentSession = 'C';
  for (let rIdx = 0; rIdx < p1.rows.length; rIdx++) {
    const row = p1.rows[rIdx];
    if (row[1] === 'S' || row[1] === 'C') {
      currentSession = row[1];
    }
    const period = parseInt(row[2], 10);
    if (isNaN(period)) continue;

    // Check days in p1
    for (const [colIdxStr, day] of Object.entries(dayColMap1)) {
      const colIdx = parseInt(colIdxStr, 10);
      const cellVal = row[colIdx] || '';
      if (cellVal.trim()) {
        extractedSlots.push({
          campus: 'THCS',
          teacherName,
          session: currentSession,
          period,
          day,
          cellVal: cellVal.trim()
        });
      }
    }

    // Check Day 7 in p2 corresponding row
    if (p2 && p2.rows[rIdx]) {
      const p2Row = p2.rows[rIdx];
      const cellVal = p2Row[0] || '';
      if (cellVal.trim()) {
        extractedSlots.push({
          campus: 'THCS',
          teacherName,
          session: currentSession,
          period,
          day: 7,
          cellVal: cellVal.trim()
        });
      }
    }
  }
}

// Parse THPT
for (let t = 0; t < thptTablesPart1.length; t++) {
  const p1 = thptTablesPart1[t];
  const p2 = thptTablesPart2[t];

  let teacherName = '';
  for (const r of p1.rows) {
    if (r[0] && r[0] !== 'Giáo Viên') {
      teacherName = r[0];
      break;
    }
  }

  const dayColMap1 = {};
  p1.header.forEach((h, colIdx) => {
    const dayMatch = h.match(/Thứ\s*(\d)/i);
    if (dayMatch) {
      dayColMap1[colIdx] = parseInt(dayMatch[1], 10);
    }
  });

  const dayColMap2 = {};
  if (p2) {
    p2.header.forEach((h, colIdx) => {
      const dayMatch = h.match(/Thứ\s*(\d)/i);
      if (dayMatch) {
        dayColMap2[colIdx] = parseInt(dayMatch[1], 10);
      }
    });
  }

  let currentSession = 'S';
  for (let rIdx = 0; rIdx < p1.rows.length; rIdx++) {
    const row = p1.rows[rIdx];
    if (row[1] === 'S' || row[1] === 'C') {
      currentSession = row[1];
    }
    const period = parseInt(row[2], 10);
    if (isNaN(period)) continue;

    // Check days in p1
    for (const [colIdxStr, day] of Object.entries(dayColMap1)) {
      const colIdx = parseInt(colIdxStr, 10);
      const cellVal = row[colIdx] || '';
      if (cellVal.trim()) {
        extractedSlots.push({
          campus: 'THPT',
          teacherName,
          session: currentSession,
          period,
          day,
          cellVal: cellVal.trim()
        });
      }
    }

    // Check Days in p2
    if (p2 && p2.rows[rIdx]) {
      const p2Row = p2.rows[rIdx];
      for (const [colIdxStr, day] of Object.entries(dayColMap2)) {
        const colIdx = parseInt(colIdxStr, 10);
        const cellVal = p2Row[colIdx] || '';
        if (cellVal.trim()) {
          extractedSlots.push({
            campus: 'THPT',
            teacherName,
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

console.log('Total extracted slots from both campuses:', extractedSlots.length);
console.log('THCS slots count:', extractedSlots.filter(s => s.campus === 'THCS').length);
console.log('THPT slots count:', extractedSlots.filter(s => s.campus === 'THPT').length);
console.log('Sample slots:', extractedSlots.slice(0, 10));
