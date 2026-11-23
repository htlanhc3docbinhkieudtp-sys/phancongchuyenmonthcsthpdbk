import ExcelJS from 'exceljs';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { SchoolConfig, Teacher, Department } from '../types';

export type ExamRoundKey = 'gk1' | 'ck1' | 'gk2' | 'ck2';

export interface ExamProctoringPeriodsRecord {
  gk1?: number; // Coi kiểm tra giữa kỳ 1
  ck1?: number; // Coi kiểm tra cuối kỳ 1
  gk2?: number; // Coi kiểm tra giữa kỳ 2
  ck2?: number; // Coi kiểm tra cuối kỳ 2
  updatedAt?: number;
}

export type ExamProctoringPeriodsMap = Record<string, ExamProctoringPeriodsRecord>;

export const EXAM_ROUND_META: Array<{
  key: ExamRoundKey;
  shortLabel: string;
  compactTag: string;
  fullLabel: string;
  semester: 'HK1' | 'HK2';
}> = [
  { key: 'gk1', shortLabel: 'Coi KTGK1', compactTag: 'KTGK1', fullLabel: 'Coi kiểm tra giữa kỳ 1', semester: 'HK1' },
  { key: 'ck1', shortLabel: 'Coi KTCK1', compactTag: 'KTCK1', fullLabel: 'Coi kiểm tra cuối kỳ 1', semester: 'HK1' },
  { key: 'gk2', shortLabel: 'Coi KTGK2', compactTag: 'KTGK2', fullLabel: 'Coi kiểm tra giữa kỳ 2', semester: 'HK2' },
  { key: 'ck2', shortLabel: 'Coi KTCK2', compactTag: 'KTCK2', fullLabel: 'Coi kiểm tra cuối kỳ 2', semester: 'HK2' },
];

export function roundPeriods(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatPeriodNumber(value: number): string {
  const rounded = roundPeriods(value);
  if (Object.is(rounded, -0) || rounded === 0) return '0';
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

/**
 * Dữ liệu chính thức Coi kiểm tra giữa kỳ 1 (71 giáo viên, tổng 719.95 tiết):
 * - Điểm THCS & BGH: 43 giáo viên từ "KÊ TIẾT COI KIỂM TRA GK1.xlsx" (432.65 tiết)
 * - Điểm chính (THPT): 28 giáo viên từ "THỐNG KÊ TIẾT COI KIỂM TRA GIỮA HỌC KÌ I ĐIỂM CHÍNH" (287.3 tiết)
 */
export const OFFICIAL_GK1_PROCTORING_PERIODS: Record<string, number> = {
  // --- Điểm THCS & BGH (43 GV = 432.65 tiết) ---
  'tch-bgh-4': 1,     // Nguyễn Thanh Tòng (Ban Giám Hiệu)
  'tch-t-2': 9,       // Trần Quốc Huy (Tổ Toán)
  'tch-t-9': 9,       // Nguyễn Thái Hùng (Tổ Toán)
  'tch-t-10': 9,      // Nguyễn Văn Ngoan (Tổ Toán)
  'tch-t-11': 9,      // Nguyễn Quốc Nguyễn (Tổ Toán)
  'tch-t-12': 9,      // Nguyễn Văn Tài (Tổ Toán)
  'tch-t-13': 9,      // Nguyễn Thành Tín (Tổ Toán)
  'tch-v-2': 9,       // Trương Văn Nghĩa (Tổ Ngữ Văn)
  'tch-v-8': 9,       // Phạm Thanh Lâm (Tổ Ngữ Văn)
  'tch-v-9': 9,       // Nguyễn Thị Kim Xoa (Tổ Ngữ Văn)
  'tch-ls-1': 9,      // Lê Hồng Thúy (Tổ Lịch sử - Địa lý - GDCD)
  'tch-ls-9': 8.66,   // Lê Thị Kim The (Tổ Lịch sử - Địa lý - GDCD)
  'tch-ls-10': 9,     // Nguyễn Quốc Tấn (Tổ Lịch sử - Địa lý - GDCD)
  'tch-ls-13': 9.33,  // Nguyễn Thị Xe (Tổ Lịch sử - Địa lý - GDCD)
  'tch-ls-15': 9,     // Nguyễn Thị Kim Sang (Tổ Lịch sử - Địa lý - GDCD)
  'tch-ls-16': 9,     // Nguyễn Mỹ Ngân (Tổ Lịch sử - Địa lý - GDCD)
  'tch-ls-14': 9,     // Châu Thị Kim Hà (Tổ Lịch sử - Địa lý - GDCD)
  'tch-khtn-2': 4,    // Thái Văn Tiến (Tổ KHTN)
  'tch-khtn-10': 9.33,// Trần Thị Hậu (Tổ KHTN)
  'tch-khtn-11': 9,   // Lê Thái Phương (Tổ KHTN)
  'tch-khtn-13': 9.33,// Nguyễn Thị Thắm (Tổ KHTN)
  'tch-khtn-14': 9,   // Nguyễn Thị Bích Phượng (Tổ KHTN)
  'tch-khtn-16': 9,   // Nguyễn Thị Cẩm Nhung (Tổ KHTN)
  'tch-khtn-17': 9,   // Nguyễn Kim Ngân (Tổ KHTN)
  'tch-khtn-18': 9,   // Hồ Thị Ngọc Tài (Tổ KHTN)
  'tch-khtn-19': 10,  // Trần Kim Phương (Tổ KHTN)
  'tch-khtn-20': 10,  // Đinh Thị Giàu (Tổ KHTN)
  'tch-khtn-21': 10,  // Nguyễn Thị Lụa (Tổ KHTN)
  'tch-khtn-22': 9,   // Trần Phi Hải (Tổ KHTN)
  'tch-khtn-25': 11,  // Nguyễn Thị Ngọc Diễm (Tổ KHTN)
  'tch-khtn-26': 11,  // Phan Văn Tặt (Tổ KHTN)
  'tch-av-1': 9,      // Lê Thị Ngọc Tuyền (Tổ Tiếng Anh - Tin học)
  'tch-av-3': 9,      // Nguyễn Thị Mai Khanh (Tổ Tiếng Anh - Tin học)
  'tch-av-10': 9,     // Trần Thanh Hậu (Tổ Tiếng Anh - Tin học)
  'tch-av-16': 24,    // Lê Phước Hậu (Tổ Tiếng Anh - Tin học)
  'tch-td-1': 9,      // Lê Văn Nguyên (Tổ GDTC - QPAN - Nghệ thuật)
  'tch-td-3': 8,      // Lê Thị Ngọc Điệp (Tổ GDTC - QPAN - Nghệ thuật)
  'tch-td-6': 9,      // Lê Ngọc Ẩn (Tổ GDTC - QPAN - Nghệ thuật)
  'tch-td-7': 9,      // Huỳnh Thanh Dân (Tổ GDTC - QPAN - Nghệ thuật)
  'tch-td-8': 9,      // Nguyễn Thanh Hùng (Tổ GDTC - QPAN - Nghệ thuật)
  'tch-td-10': 24,    // Trần Thị Mỹ Quốc (Tổ GDTC - QPAN - Nghệ thuật)
  'tch-td-11': 16,    // Lê Văn Chính (Tổ GDTC - QPAN - Nghệ thuật)
  'tch-td-12': 24,    // Nguyễn Anh Văn (Tổ GDTC - QPAN - Nghệ thuật)

  // --- Điểm chính cấp THPT (28 GV = 288.3 tiết) ---
  'tch-av-5': 17.2,   // Ngô Bảo Quốc (Thầy Quốc)
  'tch-av-6': 19,     // Trương Sơn Bền (Thầy Bền)
  'tch-khtn-3': 13.8, // Phạm Biên Thùy (Thầy Thuỳ)
  'tch-ls-5': 13.6,   // Trần Văn Rỡ (Thầy Rỡ)
  'tch-t-1': 11.4,    // Nguyễn Văn Tới (Thầy Tới)
  'tch-v-5': 9.6,     // Lê Thị Mỹ Ny (Cô Ny)
  'tch-khtn-5': 10.7, // Cao Văn Tùng (Thầy Tùng)
  'tch-khtn-8': 10.9, // Phạm Long Phi (Thầy Phi)
  'tch-av-4': 12.9,   // Võ Thị Hiền Thi (Cô Thi)
  'tch-t-7': 7.3,     // Võ Thị Ngọc Hương (Cô Hương)
  'tch-av-8': 7.3,    // Đào Thị Ngọc Liên (Cô Liên)
  'tch-av-9': 5.3,    // Lê Thị Thu Diễm (Cô Diễm)
  'tch-ls-4': 8.6,    // Nguyễn Thị Bé Trang (Cô Trang)
  'tch-ls-2': 12,     // Trịnh Văn Sơn (Thầy Sơn)
  'tch-t-4': 8.3,     // Trần Văn Giang (Thầy Giang)
  'tch-t-5': 12.9,    // Lê Cao Toàn (Thầy C Toàn)
  'tch-v-1': 9.1,     // Tô Thị Lắm (Cô Lắm)
  'tch-td-2': 4,      // Nguyễn Kim Rạng (Cô Rạng)
  'tch-khtn-6': 8,    // Trần Thị Ngọc Hiền (Cô Hiền)
  'tch-khtn-1': 12.4, // Bùi Kim Huỳnh (Cô Huỳnh)
  'tch-ls-8': 12.4,   // Phạm Nguyễn Văn Trường (Thầy Trường)
  'tch-v-6': 10.3,    // Trương Thị Mỹ Duyên (Cô Duyên)
  'tch-v-4': 12.3,    // Hồ Văn Nhịnh (Thầy Nhịnh)
  'tch-av-7': 12.6,   // Nguyễn Thị Vân Anh (Cô Vân Anh)
  'tch-t-6': 7.3,     // Lê Văn Toàn (Thầy V Toàn)
  'tch-ls-7': 9.8,    // Ngô Anh Tuấn (Thầy Tuấn)
  'tch-khtn-7': 4.2,  // Phan Thị Ngọc Thơ (Cô Thơ)
  'tch-av-2': 4.1,    // Nguyễn Trung Hiếu (Thầy Hiếu)
};

export function getDefaultExamProctoringPeriods(): ExamProctoringPeriodsMap {
  const map: ExamProctoringPeriodsMap = {};
  Object.entries(OFFICIAL_GK1_PROCTORING_PERIODS).forEach(([teacherId, gk1]) => {
    map[teacherId] = { gk1 };
  });
  return map;
}

export function mergeWithOfficialGk1Defaults(
  raw?: ExamProctoringPeriodsMap | null
): ExamProctoringPeriodsMap {
  const defaults = getDefaultExamProctoringPeriods();
  if (!raw || typeof raw !== 'object') return defaults;

  const merged: ExamProctoringPeriodsMap = { ...defaults };
  Object.entries(raw).forEach(([teacherId, rec]) => {
    if (!rec || typeof rec !== 'object') return;
    const base = merged[teacherId] || {};
    merged[teacherId] = {
      gk1: rec.gk1 !== undefined ? roundPeriods(Number(rec.gk1) || 0) : base.gk1,
      ck1: rec.ck1 !== undefined ? roundPeriods(Number(rec.ck1) || 0) : base.ck1,
      gk2: rec.gk2 !== undefined ? roundPeriods(Number(rec.gk2) || 0) : base.gk2,
      ck2: rec.ck2 !== undefined ? roundPeriods(Number(rec.ck2) || 0) : base.ck2,
      updatedAt: rec.updatedAt || base.updatedAt,
    };
  });
  return merged;
}

export function getExamProctoringStorageKey(academicYear = '2026 - 2027'): string {
  const cleanYear = academicYear.replace(/\s+/g, '_');
  return `docbinhkieu_exam_proctoring_periods_v1_${cleanYear}`;
}

export function getExamProctoringDocId(academicYear = '2026 - 2027'): string {
  return academicYear.trim().replace(/[^a-zA-Z0-9]/g, '_');
}

export function loadExamProctoringPeriods(
  academicYear = '2026 - 2027'
): ExamProctoringPeriodsMap {
  if (typeof window === 'undefined' || !window.localStorage) {
    return getDefaultExamProctoringPeriods();
  }
  try {
    const raw = window.localStorage.getItem(getExamProctoringStorageKey(academicYear));
    if (!raw) {
      return getDefaultExamProctoringPeriods();
    }
    const parsed = JSON.parse(raw) as ExamProctoringPeriodsMap;
    return mergeWithOfficialGk1Defaults(parsed);
  } catch (err) {
    console.warn('Could not load exam proctoring periods from localStorage:', err);
    return getDefaultExamProctoringPeriods();
  }
}

export function saveExamProctoringPeriods(
  academicYear = '2026 - 2027',
  map: ExamProctoringPeriodsMap
): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      getExamProctoringStorageKey(academicYear),
      JSON.stringify(map)
    );
  } catch (err) {
    console.warn('Could not save exam proctoring periods to localStorage:', err);
  }
}

export function subscribeExamProctoringPeriods(
  academicYear: string,
  onUpdate: (map: ExamProctoringPeriodsMap, updatedAt?: number, updatedBy?: string) => void,
  onError?: (err: unknown) => void
): () => void {
  const docId = getExamProctoringDocId(academicYear);
  const path = `exam_proctoring/${docId}`;
  const docRef = doc(db, 'exam_proctoring', docId);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const raw = (data.periods || {}) as ExamProctoringPeriodsMap;
        const merged = mergeWithOfficialGk1Defaults(raw);
        onUpdate(merged, data.updatedAt, data.lastUpdatedBy);
      } else {
        onUpdate(loadExamProctoringPeriods(academicYear), undefined, undefined);
      }
    },
    (error) => {
      console.warn('[Firestore] Exam proctoring subscription warning:', error);
      onError?.(error);
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch {
        // Ignored so client keeps running in cached offline mode
      }
    }
  );
}

export async function saveExamProctoringPeriodsToCloud(
  academicYear: string,
  map: ExamProctoringPeriodsMap,
  lastUpdatedBy = 'Ban Giám hiệu'
): Promise<boolean> {
  saveExamProctoringPeriods(academicYear, map);
  const docId = getExamProctoringDocId(academicYear);
  const path = `exam_proctoring/${docId}`;
  try {
    const docRef = doc(db, 'exam_proctoring', docId);
    const cleaned: ExamProctoringPeriodsMap = {};
    Object.entries(map).forEach(([tId, rec]) => {
      if (!rec) return;
      const entry: ExamProctoringPeriodsRecord = {};
      if (rec.gk1 !== undefined) entry.gk1 = roundPeriods(rec.gk1);
      if (rec.ck1 !== undefined) entry.ck1 = roundPeriods(rec.ck1);
      if (rec.gk2 !== undefined) entry.gk2 = roundPeriods(rec.gk2);
      if (rec.ck2 !== undefined) entry.ck2 = roundPeriods(rec.ck2);
      if (rec.updatedAt !== undefined) entry.updatedAt = rec.updatedAt;
      if (Object.keys(entry).length > 0) {
        cleaned[tId] = entry;
      }
    });

    await setDoc(
      docRef,
      {
        academicYear,
        periods: cleaned,
        updatedAt: Date.now(),
        lastUpdatedBy,
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.warn('[Firestore] Failed to save exam proctoring periods:', error);
    try {
      handleFirestoreError(error, OperationType.WRITE, path);
    } catch {
      // Ignored
    }
    return false;
  }
}

export async function fetchExamProctoringPeriodsFromCloud(
  academicYear: string
): Promise<ExamProctoringPeriodsMap | null> {
  const docId = getExamProctoringDocId(academicYear);
  const path = `exam_proctoring/${docId}`;
  try {
    const snap = await getDoc(doc(db, 'exam_proctoring', docId));
    if (snap.exists()) {
      const data = snap.data();
      return mergeWithOfficialGk1Defaults((data.periods || {}) as ExamProctoringPeriodsMap);
    }
    return null;
  } catch (error) {
    console.warn('[Firestore] Fetch proctoring periods warning:', error);
    try {
      handleFirestoreError(error, OperationType.GET, path);
    } catch {
      // Ignored
    }
    return null;
  }
}

/**
 * Parse uploaded Excel file matching format of KÊ TIẾT COI KIỂM TRA GK1.xlsx (STT, Họ và Tên, Tổ chuyên môn, Số tiết)
 */
export async function parseProctoringExcelFile(
  file: File,
  teachers: Teacher[]
): Promise<{
  matchedCount: number;
  unmatchedNames: string[];
  valuesByTeacherId: Record<string, number>;
}> {
  const buffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) {
    throw new Error('File Excel không có dữ liệu sheet hợp lệ.');
  }

  const normalizeName = (s: string) =>
    s.trim().replace(/\s+/g, ' ').toLowerCase();

  const teacherByName = new Map<string, Teacher>();
  teachers.forEach((t) => {
    teacherByName.set(normalizeName(t.name), t);
  });

  // Auto-detect header row & name/value columns
  let headerRowIdx = -1;
  let nameCol = 2;
  let valCol = 4;

  for (let r = 1; r <= Math.min(ws.rowCount, 12); r++) {
    const row = ws.getRow(r);
    const texts: string[] = [];
    for (let c = 1; c <= Math.min(ws.columnCount, 12); c++) {
      texts.push(String(row.getCell(c).value || '').toLowerCase().trim());
    }
    const foundNameIdx = texts.findIndex(
      (txt) => txt.includes('họ và tên') || txt.includes('họ tên') || txt.includes('giáo viên')
    );
    if (foundNameIdx !== -1) {
      headerRowIdx = r;
      nameCol = foundNameIdx + 1;
      const foundValIdx = texts.findIndex(
        (txt, idx) =>
          idx !== foundNameIdx &&
          (txt.includes('tiết') || txt.includes('coi') || txt.includes('kê') || txt.includes('gk') || txt.includes('ck'))
      );
      if (foundValIdx !== -1) {
        valCol = foundValIdx + 1;
      } else {
        valCol = Math.max(nameCol + 1, ws.columnCount);
      }
      break;
    }
  }

  const startRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 1;
  const valuesByTeacherId: Record<string, number> = {};
  const unmatchedNames: string[] = [];

  for (let r = startRow; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    let rawName = row.getCell(nameCol).value;
    if (rawName && typeof rawName === 'object' && 'richText' in rawName) {
      rawName = (rawName as { richText: Array<{ text: string }> }).richText
        .map((x) => x.text)
        .join('');
    }
    const nameStr = String(rawName || '').trim();
    if (!nameStr || nameStr.toLowerCase().includes('tổng cộng')) continue;

    let rawVal = row.getCell(valCol).value;
    if (rawVal && typeof rawVal === 'object' && 'result' in rawVal) {
      rawVal = (rawVal as { result: unknown }).result as ExcelJS.CellValue;
    }
    const numVal = Number(String(rawVal ?? '').replace(',', '.'));
    if (!Number.isFinite(numVal)) continue;

    const matched = teacherByName.get(normalizeName(nameStr));
    if (matched) {
      valuesByTeacherId[matched.id] = roundPeriods(numVal);
    } else {
      unmatchedNames.push(nameStr);
    }
  }

  return {
    matchedCount: Object.keys(valuesByTeacherId).length,
    unmatchedNames,
    valuesByTeacherId,
  };
}

/**
 * Export styled A4 Excel for Kê tiết coi kiểm tra 4 đợt (GK1, CK1, GK2, CK2)
 */
export async function exportProctoring4RoundsExcel(
  config: SchoolConfig,
  teachers: Teacher[],
  departments: Department[],
  proctoringMap: ExamProctoringPeriodsMap,
  yearBalanceByTeacherId?: Map<string, number>
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = config.vicePrincipalName || 'Nguyễn Minh Trí';
  wb.created = new Date();

  const ws = wb.addWorksheet('Ke_Tiet_Coi_KT_4_Dot', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 6, showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 },
      printTitlesRow: '6:6',
    },
  });

  const deptMap = new Map(departments.map((d) => [d.id, d.name]));
  const totalCols = 10;

  // Decree 30 Header
  ws.mergeCells('A1:D1');
  ws.getCell('A1').value = (config.subTitle || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP').toUpperCase();
  ws.getCell('A1').font = { name: 'Times New Roman', size: 10 };
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A2:D2');
  ws.getCell('A2').value = (config.schoolName || 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU').toUpperCase();
  ws.getCell('A2').font = { name: 'Times New Roman', size: 10.5, bold: true, underline: true };
  ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('E1:J1');
  ws.getCell('E1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  ws.getCell('E1').font = { name: 'Times New Roman', size: 10.5, bold: true };
  ws.getCell('E1').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('E2:J2');
  ws.getCell('E2').value = 'Độc lập - Tự do - Hạnh phúc';
  ws.getCell('E2').font = { name: 'Times New Roman', size: 10.5, bold: true, underline: true };
  ws.getCell('E2').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A4:J4');
  const titleCell = ws.getCell('A4');
  titleCell.value = `BẢNG KÊ TIẾT COI KIỂM TRA 4 ĐỢT (GK1 • CK1 • GK2 • CK2) - NĂM HỌC ${config.academicYear || '2026 - 2027'}`;
  titleCell.font = { name: 'Times New Roman', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = { top: { style: 'medium', color: { argb: 'FF1E3A8A' } } };
  ws.getRow(4).height = 26;

  const headers = [
    'STT',
    'Họ và Tên Giáo Viên',
    'Điểm Trường',
    'Tổ Chuyên Môn',
    'Coi KTGK1',
    'Coi KTCK1',
    'Coi KTGK2',
    'Coi KTCK2',
    'Tổng Coi KT',
    'Thừa/Thiếu Cả Năm',
  ];

  const hRow = ws.getRow(6);
  hRow.height = 28;
  headers.forEach((h, idx) => {
    const cell = hRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: idx >= 4 && idx <= 7 ? 'FF4338CA' : idx >= 8 ? 'FF0F766E' : 'FF1E3A8A' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: idx === 0 ? 'medium' : 'thin', color: { argb: idx === 0 ? 'FF0F172A' : 'FFCBD5E1' } },
      right: { style: idx === totalCols - 1 ? 'medium' : 'thin', color: { argb: idx === totalCols - 1 ? 'FF0F172A' : 'FFCBD5E1' } },
    };
  });

  let rowIdx = 7;
  let sumGk1 = 0;
  let sumCk1 = 0;
  let sumGk2 = 0;
  let sumCk2 = 0;

  teachers.forEach((t, idx) => {
    const rec = proctoringMap[t.id] || {};
    const gk1 = roundPeriods(rec.gk1 || 0);
    const ck1 = roundPeriods(rec.ck1 || 0);
    const gk2 = roundPeriods(rec.gk2 || 0);
    const ck2 = roundPeriods(rec.ck2 || 0);
    const totalExam = roundPeriods(gk1 + ck1 + gk2 + ck2);
    const yearBal = yearBalanceByTeacherId?.get(t.id);

    sumGk1 = roundPeriods(sumGk1 + gk1);
    sumCk1 = roundPeriods(sumCk1 + ck1);
    sumGk2 = roundPeriods(sumGk2 + gk2);
    sumCk2 = roundPeriods(sumCk2 + ck2);

    const r = ws.getRow(rowIdx++);
    r.height = 21;
    const rowBg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';

    const campusName =
      t.campus === 'THPTDBK' ? 'THPT ĐBK' : t.campus === 'THCSTK' ? 'THCS Tân Kiều' : 'THCS ĐBK';

    const vals: (string | number)[] = [
      idx + 1,
      t.name,
      campusName,
      deptMap.get(t.departmentId) || '',
      gk1 || '',
      ck1 || '',
      gk2 || '',
      ck2 || '',
      totalExam || '',
      yearBal !== undefined ? roundPeriods(yearBal) : '',
    ];

    vals.forEach((v, cIdx) => {
      const c = r.getCell(cIdx + 1);
      c.value = v;
      c.font = {
        name: 'Times New Roman',
        size: 10,
        bold: cIdx === 1 || cIdx === 8 || cIdx === 9,
        color: {
          argb:
            cIdx === 9 && typeof v === 'number'
              ? v < 0
                ? 'FFB91C1C'
                : v > 0
                ? 'FF15803D'
                : 'FF334155'
              : 'FF0F172A',
        },
      };
      c.alignment = {
        horizontal: cIdx === 1 || cIdx === 3 ? 'left' : 'center',
        vertical: 'middle',
      };
      c.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: cIdx === 4 && gk1 > 0 ? 'FFEDE9FE' : rowBg,
        },
      };
      c.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: cIdx === 0 ? 'medium' : 'thin', color: { argb: cIdx === 0 ? 'FF0F172A' : 'FFCBD5E1' } },
        right: { style: cIdx === totalCols - 1 ? 'medium' : 'thin', color: { argb: cIdx === totalCols - 1 ? 'FF0F172A' : 'FFCBD5E1' } },
      };
    });
  });

  // Total row
  const sumAll = roundPeriods(sumGk1 + sumCk1 + sumGk2 + sumCk2);
  const tRow = ws.getRow(rowIdx++);
  tRow.height = 24;
  ws.mergeCells(`A${tRow.number}:D${tRow.number}`);
  tRow.getCell(1).value = `TỔNG CỘNG (${teachers.length} GIÁO VIÊN)`;
  tRow.getCell(5).value = sumGk1;
  tRow.getCell(6).value = sumCk1;
  tRow.getCell(7).value = sumGk2;
  tRow.getCell(8).value = sumCk2;
  tRow.getCell(9).value = sumAll;
  tRow.getCell(10).value = '';

  for (let c = 1; c <= totalCols; c++) {
    const cell = tRow.getCell(c);
    cell.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: c === 1 ? 'medium' : 'thin', color: { argb: c === 1 ? 'FF0F172A' : 'FF94A3B8' } },
      right: { style: c === totalCols ? 'medium' : 'thin', color: { argb: c === totalCols ? 'FF0F172A' : 'FF94A3B8' } },
    };
  }

  // Signature block
  const now = new Date();
  rowIdx += 1;
  ws.mergeCells(`F${rowIdx}:J${rowIdx}`);
  ws.getCell(`F${rowIdx}`).value = `Đốc Binh Kiều, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  ws.getCell(`F${rowIdx}`).font = { name: 'Times New Roman', size: 10, italic: true };
  ws.getCell(`F${rowIdx}`).alignment = { horizontal: 'center' };
  rowIdx++;
  ws.mergeCells(`A${rowIdx}:D${rowIdx}`);
  ws.getCell(`A${rowIdx}`).value = 'NGƯỜI LẬP BẢNG';
  ws.getCell(`A${rowIdx}`).font = { name: 'Times New Roman', size: 10.5, bold: true };
  ws.getCell(`A${rowIdx}`).alignment = { horizontal: 'center' };
  ws.mergeCells(`F${rowIdx}:J${rowIdx}`);
  ws.getCell(`F${rowIdx}`).value = 'KT. HIỆU TRƯỞNG\nPHÓ HIỆU TRƯỞNG';
  ws.getCell(`F${rowIdx}`).font = { name: 'Times New Roman', size: 10.5, bold: true };
  ws.getCell(`F${rowIdx}`).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  ws.getRow(rowIdx).height = 28;
  rowIdx += 4;
  ws.mergeCells(`F${rowIdx}:J${rowIdx}`);
  ws.getCell(`F${rowIdx}`).value = config.vicePrincipalName || 'Nguyễn Minh Trí';
  ws.getCell(`F${rowIdx}`).font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } };
  ws.getCell(`F${rowIdx}`).alignment = { horizontal: 'center' };

  ws.columns = [
    { width: 6 },
    { width: 25 },
    { width: 15 },
    { width: 25 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 13 },
    { width: 16 },
  ];

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bang_Ke_Tiet_Coi_Kiem_Tra_4_Dot_${(config.academicYear || '2026_2027').replace(/\s+/g, '_')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
