import * as XLSX from 'xlsx';
import {
  TimetableSlot,
  ClassGroup,
  Subject,
  Teacher,
  SchoolConfig
} from '../types';
import { THPT_TEACHER_LOOKUP } from '../data/thptWeek1Timetable';
import { getUnifiedSubjectName, normalizeTimetableSlots } from './timetableHelper';

export interface VietSchoolParseResult {
  slots: TimetableSlot[];
  recognizedClasses: string[];
  unrecognizedClasses: string[];
  recognizedTeachers: string[];
  unrecognizedTeachers: string[];
  campusStats: {
    thptSlots: number;
    thcsDbkSlots: number;
    thcsTkSlots: number;
  };
  errors: string[];
  warnings: string[];
  sheetNames: string[];
  detectedFormat: string;
  successCount: number;
}

// Teacher nickname dictionary for Điểm Đốc Binh Kiều
const THCS_DBK_TEACHER_LOOKUP: Record<string, { id: string; name: string; code: string }> = {
  // BGH & Chuyên môn
  'Sơn': { id: 'tch-ls-2', name: 'Trịnh Văn Sơn', code: 'Sơn.TV' },
  'Hòa': { id: 'tch-ls-6', name: 'Trần Phước Hòa', code: 'Hòa.TP' },
  'Tuấn': { id: 'tch-ls-7', name: 'Ngô Anh Tuấn', code: 'Tuấn.NA' },
  // Tổ Toán
  'Tới': { id: 'tch-t-1', name: 'Nguyễn Văn Tới', code: 'Tới.NV' },
  'Lang': { id: 'tch-t-3', name: 'Nguyễn Thị Bích Lang', code: 'Lang.NTB' },
  'Giang': { id: 'tch-t-4', name: 'Trần Văn Giang', code: 'Giang.TV' },
  'CToàn': { id: 'tch-t-5', name: 'Lê Cao Toàn', code: 'Toàn.LC' },
  'VToàn': { id: 'tch-t-6', name: 'Lê Văn Toàn', code: 'Toàn.LV' },
  'Lê Bình': { id: 'tch-t-8', name: 'Lê Thị Bình', code: 'Bình.LT' },
  'Thái Hùng': { id: 'tch-t-9', name: 'Nguyễn Thái Hùng', code: 'Hùng.NThái' },
  'Ngoan': { id: 'tch-t-10', name: 'Nguyễn Văn Ngoan', code: 'Ngoan.NV' },
  'Nguyễn': { id: 'tch-t-11', name: 'Nguyễn Quốc Nguyễn', code: 'Nguyễn.NQ' },
  'Văn Tài': { id: 'tch-t-12', name: 'Nguyễn Văn Tài', code: 'Tài.NV' },
  // Tổ Ngữ văn
  'Nghĩa': { id: 'tch-v-2', name: 'Trương Văn Nghĩa', code: 'Nghĩa.TV' },
  'Lâm': { id: 'tch-v-8', name: 'Phạm Thanh Lâm', code: 'Lâm.PT' },
  'Xoa': { id: 'tch-v-9', name: 'Nguyễn Thị Kim Xoa', code: 'Xoa.NTK' },
  'Dương': { id: 'tch-v-10', name: 'Hứa Thùy Dương', code: 'Dương.HT' },
  'An': { id: 'tch-v-11', name: 'Lê Thị Hoài An', code: 'An.LTH' },
  // Tổ KHXH
  'Thúy': { id: 'tch-ls-1', name: 'Lê Hồng Thúy', code: 'Thúy.LH' },
  'Lê The': { id: 'tch-ls-9', name: 'Lê Thị Kim The', code: 'The.LTK' },
  'Tân': { id: 'tch-ls-10', name: 'Nguyễn Quốc Tấn', code: 'Tấn.NQ' },
  'Đỉnh': { id: 'tch-ls-11', name: 'Nguyễn Thị Kim Đỉnh', code: 'Đỉnh.NTK' },
  'Lý': { id: 'tch-ls-12', name: 'Nguyễn Thị Lý', code: 'Lý.NT' },
  'Xe': { id: 'tch-ls-13', name: 'Nguyễn Thị Xe', code: 'Xe.NT' },
  // Tổ KHTN
  'Thị Hiếu': { id: 'tch-khtn-4', name: 'Nguyễn Thị Hiếu', code: 'Hiếu.NT' },
  'Thị Hậu': { id: 'tch-khtn-10', name: 'Trần Thị Hậu', code: 'Hậu.TTH' },
  'Phương': { id: 'tch-khtn-11', name: 'Lê Thái Phương', code: 'Phương.LT' },
  'H Toàn': { id: 'tch-khtn-12', name: 'Võ Hoàng Toàn', code: 'Toàn.VH' },
  'Thắm': { id: 'tch-khtn-13', name: 'Nguyễn Thị Thắm', code: 'Thắm.NT' },
  'Nhung': { id: 'tch-khtn-16', name: 'Nguyễn Thị Cẩm Nhung', code: 'Nhung.NTC' },
  'Nguyễn Ngân': { id: 'tch-khtn-17', name: 'Nguyễn Kim Ngân', code: 'Ngân.NK' },
  'Tài': { id: 'tch-khtn-18', name: 'Hồ Thị Ngọc Tài', code: 'Tài.HTN' },
  'Hải': { id: 'tch-khtn-22', name: 'Trần Phi Hải', code: 'Hải.TP' },
  'Cẩm': { id: 'tch-khtn-23', name: 'Trần Thị Cẩm', code: 'Cẩm.TT' },
  'Lê Ngân': { id: 'tch-khtn-24', name: 'Lê Kim Ngân', code: 'Ngân.LK' },
  // Tổ Tiếng Anh - Tin
  'Khanh': { id: 'tch-av-3', name: 'Nguyễn Thị Mai Khanh', code: 'Khanh.NTM' },
  'Hậu': { id: 'tch-av-10', name: 'Trần Thanh Hậu', code: 'Hậu.TT' },
  'Thảo': { id: 'tch-av-11', name: 'Hồ Mai Thảo', code: 'Thảo.HM' },
  'Thùy Dương': { id: 'tch-av-12', name: 'Nguyễn Thị Thùy Dương', code: 'Dương.NTT' },
  'Lộc': { id: 'tch-av-13', name: 'Mai Phước Lộc', code: 'Lộc.MP' },
  'Phướng': { id: 'tch-av-14', name: 'Bùi Kim Phướng', code: 'Phướng.BK' },
  'Huỳnh Như': { id: 'tch-av-11', name: 'Nguyễn Huỳnh Như', code: 'Như.NH' },
  'Huyền': { id: 'tch-av-12', name: 'Nguyễn Thị Ngọc Huyền', code: 'Huyền.NTN' },
  'Chi': { id: 'tch-av-13', name: 'Lê Thị Mỹ Chi', code: 'Chi.LTM' },
  'Ngọc Như': { id: 'tch-av-14', name: 'Trần Ngọc Như', code: 'Như.TN' },
  // Tổ GDTC - QPAN - Nghệ thuật
  'Nguyện': { id: 'tch-td-1', name: 'Lê Văn Nguyên', code: 'Nguyên.LV' },
  'Nguyên': { id: 'tch-td-1', name: 'Lê Văn Nguyên', code: 'Nguyên.LV' },
  'Đạt': { id: 'tch-td-5', name: 'Lê Minh Đạt', code: 'Đạt.LM' },
  'Ẩn': { id: 'tch-td-6', name: 'Lê Ngọc Ẩn', code: 'Ẩn.LN' },
  'Dân': { id: 'tch-td-7', name: 'Huỳnh Thanh Dân', code: 'Dân.HT' },
  'Thanh Hùng': { id: 'tch-td-8', name: 'Nguyễn Thanh Hùng', code: 'Hùng.NThanh' },
  'Hận': { id: 'tch-td-8', name: 'Nguyễn Quốc Hận', code: 'Hận.NQ' },
  'Lưu': { id: 'tch-td-7', name: 'Lê Thanh Lưu', code: 'Lưu.LT' },
  'Xanh': { id: 'tch-td-9', name: 'Lê Thị Tuyết Xanh', code: 'Xanh.LTT' },
  'Quốc(TK)': { id: 'tch-td-10', name: 'Trần Thị Mỹ Quốc', code: 'Quốc.TTM' },
  'Văn(TK)': { id: 'tch-td-12', name: 'Nguyễn Anh Văn', code: 'Văn.NA' },
  'Rạng': { id: 'tch-td-2', name: 'Nguyễn Kim Rạng', code: 'Rạng.NK' },
  'Rang': { id: 'tch-td-2', name: 'Nguyễn Kim Rạng', code: 'Rạng.NK' },
  'Nguyễn Kim Rạng': { id: 'tch-td-2', name: 'Nguyễn Kim Rạng', code: 'Rạng.NK' },
  'Nguyễn Kim Rang': { id: 'tch-td-2', name: 'Nguyễn Kim Rạng', code: 'Rạng.NK' },
  'Rạng.NK': { id: 'tch-td-2', name: 'Nguyễn Kim Rạng', code: 'Rạng.NK' },
  'Rang.NK': { id: 'tch-td-2', name: 'Nguyễn Kim Rạng', code: 'Rạng.NK' }
};

// Teacher nickname dictionary for Điểm Tân Kiều
const THCS_TK_TEACHER_LOOKUP: Record<string, { id: string; name: string; code: string }> = {
  'Nhuận': { id: 'tch-t-15', name: 'Trần Văn Nhuận', code: 'Nhuận.TV' },
  'Hà': { id: 'tch-ls-14', name: 'Châu Thị Kim Hà', code: 'Hà.CTK' },
  'Tín': { id: 'tch-t-13', name: 'Nguyễn Thành Tín', code: 'Tín.NT' },
  'Tuyền': { id: 'tch-av-1', name: 'Lê Thị Ngọc Tuyền', code: 'Tuyền.LTN' },
  'Nga': { id: 'tch-t-14', name: 'Huỳnh Thị Huỳnh Nga', code: 'Nga.HTH' },
  'Vi': { id: 'tch-v-tk-vi', name: 'Nguyễn Hiền Vi', code: 'Vi.NH' },
  'Châu': { id: 'tch-ls-3', name: 'Phạm Thị Mỹ Châu', code: 'Châu.PTM' },
  'Diễm': { id: 'tch-khtn-25', name: 'Nguyễn Thị Ngọc Diễm', code: 'Diễm.NTN' },
  'Phượng': { id: 'tch-khtn-14', name: 'Nguyễn Thị Bích Phượng', code: 'Phượng.NTB' },
  'Sang': { id: 'tch-ls-15', name: 'Nguyễn Thị Kim Sang', code: 'Sang.NTK' },
  'Hậu': { id: 'tch-av-16', name: 'Lê Phước Hậu', code: 'Hậu.LP' },
  'Tặt': { id: 'tch-khtn-26', name: 'Phan Văn Tặt', code: 'Tặt.PV' },
  'Phương': { id: 'tch-khtn-19', name: 'Trần Kim Phương', code: 'Phương.TK' },
  'Chính': { id: 'tch-td-11', name: 'Lê Văn Chính', code: 'Chính.LV' },
  'Lụa': { id: 'tch-khtn-21', name: 'Nguyễn Thị Lụa', code: 'Lụa.NT' },
  'Huy': { id: 'tch-t-2', name: 'Trần Quốc Huy', code: 'Huy.TQ' },
  'Bền': { id: 'tch-av-6', name: 'Trương Sơn Bền', code: 'Bền.TS' },
  'Ngân': { id: 'tch-ls-16', name: 'Nguyễn Mỹ Ngân', code: 'Ngân.NM' },
  'Điệp': { id: 'tch-td-3', name: 'Lê Thị Ngọc Điệp', code: 'Điệp.LTN' },
  'A.Văn': { id: 'tch-td-12', name: 'Nguyễn Anh Văn', code: 'Văn.NA' },
  'Quốc': { id: 'tch-td-10', name: 'Trần Thị Mỹ Quốc', code: 'Quốc.TTM' },
  'Thảo': { id: 'tch-v-13', name: 'Nguyễn Thị Thảo', code: 'Thảo.NT' },
  'Nhi': { id: 'tch-v-3', name: 'Huỳnh Thị Vân Nhi', code: 'Nhi.HTV' },
  'Thành': { id: 'tch-av-15', name: 'Lê Minh Thành', code: 'Thành.LM' },
  'Tiến': { id: 'tch-khtn-2', name: 'Thái Văn Tiến', code: 'Tiến.TV' },
  'Đ.Văn': { id: 'tch-khtn-15', name: 'Võ Ngọc Đình Văn', code: 'Văn.VNĐ' },
  'Giàu': { id: 'tch-khtn-20', name: 'Đinh Thị Giàu', code: 'Giàu.ĐT' },
  'Tòng': { id: 'tch-bgh-4', name: 'Nguyễn Thanh Tòng', code: 'Tòng.NT' }
};

// Common homeroom teacher map for classes
const HOMEROOM_FALLBACK_MAP: Record<string, string> = {
  // THPT
  '10CB1': 'Tùng', '10CB2': 'Kiều', '10CB3': 'Ny', '10CB4': 'Diễm', '10CB5': 'Nhịnh',
  '11CB1': 'Huỳnh', '11CB2': 'Phi', '11CB3': 'Rỡ', '11CB4': 'Liên',
  '12CB1': 'Thơ', '12CB2': 'Duyên', '12CB3': 'Hương', '12CB4': 'Trang', '12CB5': 'Sơn',
  // THCS DBK
  '6A1': 'Tài', '6A2': 'Thắm', '6A3': 'Phướng', '6A4': 'Thanh Hùng', '6A5': 'Lê Ngân', '6A6': 'Lê Bình',
  '7A1': 'Ngoan', '7A2': 'Lộc', '7A3': 'Nguyễn', '7A4': 'Ẩn', '7A5': 'Thị Hiếu', '7A6': 'Cẩm',
  '8A1': 'Thái Hùng', '8A2': 'Hải', '8A3': 'Xe', '8A4': 'Nguyễn Ngân', '8A5': 'H Toàn', '8A6': 'Dân',
  '9A1': 'Nhung', '9A2': 'Thị Hậu', '9A3': 'Lang', '9A4': 'Văn Tài', '9A5': 'Thảo', '9A6': 'Phương',
  // THCS TK
  '6A7': 'Sang', '6A8': 'Điệp', '6A9': 'Diễm', '6A10': 'Lụa',
  '7A7': 'Phương', '7A8': 'Châu', '7A9': 'Chính',
  '8A7': 'Tiến', '8A8': 'Phượng', '8A9': 'Hậu', '8A10': 'Nhuận',
  '9A7': 'Huy', '9A8': 'Giàu', '9A9': 'Ngân', '9A10': 'Tín'
};

/**
 * Remove Vietnamese accents and special punctuation for fuzzy matching
 */
export function removeVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Smart class matcher: handles VietSchool notations
 * e.g. "10A1" -> "10CB1", "6/1" -> "6A7", "Lớp 10CB1" -> "10CB1"
 */
export function matchClass(rawClassName: string, classes: ClassGroup[]): ClassGroup | undefined {
  if (!rawClassName) return undefined;
  const clean = rawClassName.trim().replace(/^Lớp\s+/i, '').replace(/^Khối\s+/i, '').trim();
  const upper = clean.toUpperCase();
  const lower = clean.toLowerCase();

  // 1. Direct match by name or ID
  const direct = classes.find(
    c => c.name.toUpperCase() === upper || c.id.toLowerCase() === lower
  );
  if (direct) return direct;

  // 2. VietSchool THPT mapping: 10A1 -> 10CB1, 10C1 -> 10CB1, 10-1 -> 10CB1, 101 -> 10CB1
  const thptMatch = upper.match(/^(10|11|12)(?:CB|A|B|C|T|V|\/|-)?(\d+)$/);
  if (thptMatch) {
    const grade = thptMatch[1];
    const num = thptMatch[2];
    const targetName = `${grade}CB${num}`;
    const found = classes.find(c => c.name.toUpperCase() === targetName);
    if (found) return found;
  }

  // 2b. VietSchool 3-digit shorthand (e.g. 101 -> 10CB1, 112 -> 11CB2, 125 -> 12CB5)
  const threeDigitMatch = upper.match(/^(10|11|12)([1-5])$/);
  if (threeDigitMatch) {
    const grade = threeDigitMatch[1];
    const num = threeDigitMatch[2];
    const targetName = `${grade}CB${num}`;
    const found = classes.find(c => c.name.toUpperCase() === targetName);
    if (found) return found;
  }

  // 3. VietSchool Tân Kiều slash notation: 6/1 -> 6A7, 6/2 -> 6A8, etc.
  const slashMatch = clean.match(/^([6789])[\/](\d+)$/);
  if (slashMatch) {
    const grade = slashMatch[1];
    const branchNum = parseInt(slashMatch[2], 10);
    // Tân Kiều classes in our system are numbered after DBK (e.g. 6A7..6A10 is 6/1..6/4)
    // 6/1 -> 6A7 (offset + 6)
    const targetA = `${grade}A${branchNum + 6}`;
    const found = classes.find(c => c.name.toUpperCase() === targetA);
    if (found) return found;
  }

  // 4. Normalized without spaces and punctuation
  const cleanKey = upper.replace(/[^A-Z0-9]/g, '');
  const foundClean = classes.find(c => c.name.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanKey);
  if (foundClean) return foundClean;

  return undefined;
}

/**
 * Smart teacher matcher: looks up by full name, code, dot abbreviation, or VietSchool nickname
 */
export function matchTeacher(
  rawTeacher: string,
  teachers: Teacher[],
  targetClass?: ClassGroup
): { id: string; name: string; code: string } | undefined {
  if (!rawTeacher) return undefined;
  const clean = rawTeacher.trim();
  const upper = clean.toUpperCase();
  const lower = clean.toLowerCase();
  const noAccent = removeVietnameseAccents(clean);

  // Special priority for Nguyễn Kim Rạng (avoid any misinterpretation as Nguyễn Kim Rang)
  if (
    clean === 'Rạng' || clean === 'Rang' ||
    clean === 'Nguyễn Kim Rạng' || clean === 'Nguyễn Kim Rang' ||
    clean === 'Rạng.NK' || clean === 'Rang.NK' ||
    lower.includes('kim rang') || lower.includes('kim rạng') ||
    lower === 'đặng văn rạng' || lower === 'dang van rang'
  ) {
    return { id: 'tch-td-2', name: 'Nguyễn Kim Rạng', code: 'Rạng.NK' };
  }

  // 1. Match by ID or exact full name or exact code
  const exact = teachers.find(
    t => t.id.toLowerCase() === lower ||
         t.name.trim().toLowerCase() === lower ||
         t.code.trim().toLowerCase() === lower
  );
  if (exact) {
    if (exact.id === 'tch-td-2' || exact.name.toLowerCase().includes('kim rang')) {
      return { id: 'tch-td-2', name: 'Nguyễn Kim Rạng', code: 'Rạng.NK' };
    }
    return { id: exact.id, name: exact.name, code: exact.code };
  }

  // 2. Campus context-aware VietSchool lookup
  const isTHPT = targetClass?.level === 'THPT' || targetClass?.campus === 'THPTDBK';
  const isTK = targetClass?.campus === 'THCSTK' || (targetClass && /^[6789]A([789]|10)$/i.test(targetClass.name));
  const isDBK = !isTHPT && !isTK;

  if (isTHPT && THPT_TEACHER_LOOKUP[clean]) {
    return THPT_TEACHER_LOOKUP[clean];
  }
  if (isTK && THCS_TK_TEACHER_LOOKUP[clean]) {
    return THCS_TK_TEACHER_LOOKUP[clean];
  }
  if (isDBK && THCS_DBK_TEACHER_LOOKUP[clean]) {
    return THCS_DBK_TEACHER_LOOKUP[clean];
  }

  // Cross-check all 3 tables
  if (THCS_DBK_TEACHER_LOOKUP[clean]) return THCS_DBK_TEACHER_LOOKUP[clean];
  if (THCS_TK_TEACHER_LOOKUP[clean]) return THCS_TK_TEACHER_LOOKUP[clean];
  if (THPT_TEACHER_LOOKUP[clean]) return THPT_TEACHER_LOOKUP[clean];

  // Strip campus suffix e.g. "Quốc(TK)" -> "Quốc", "Văn(TK)" -> "Văn"
  const strippedSuffix = clean.replace(/\(TK\)|\(ĐBK\)|\(DBK\)/i, '').trim();
  if (strippedSuffix !== clean) {
    if (clean.includes('(TK)')) {
      if (THCS_TK_TEACHER_LOOKUP[strippedSuffix]) return THCS_TK_TEACHER_LOOKUP[strippedSuffix];
    }
    if (THCS_DBK_TEACHER_LOOKUP[strippedSuffix]) return THCS_DBK_TEACHER_LOOKUP[strippedSuffix];
    if (THCS_TK_TEACHER_LOOKUP[strippedSuffix]) return THCS_TK_TEACHER_LOOKUP[strippedSuffix];
    if (THPT_TEACHER_LOOKUP[strippedSuffix]) return THPT_TEACHER_LOOKUP[strippedSuffix];
  }

  // 3. Dot code matching (e.g. "Hương.LTN" or "LTN.Hương" or "Kiều.ĐT")
  if (clean.includes('.')) {
    const parts = clean.split('.');
    const p1 = parts[0].trim().toLowerCase();
    const dotMatch = teachers.find(t => {
      const tCodeLower = t.code.toLowerCase();
      return tCodeLower === lower ||
             tCodeLower.includes(p1) ||
             t.name.toLowerCase().endsWith(p1);
    });
    if (dotMatch) return { id: dotMatch.id, name: dotMatch.name, code: dotMatch.code };
  }

  // 4. Match by teacher's last name word (given name)
  const byGivenName = teachers.filter(t => {
    const parts = t.name.trim().split(' ');
    const lastName = parts[parts.length - 1].toLowerCase();
    return lastName === lower || removeVietnameseAccents(lastName) === noAccent;
  });

  if (byGivenName.length === 1) {
    return { id: byGivenName[0].id, name: byGivenName[0].name, code: byGivenName[0].code };
  } else if (byGivenName.length > 1) {
    if (targetClass) {
      const campusMatch = byGivenName.find(t => t.campus === targetClass.campus);
      if (campusMatch) return { id: campusMatch.id, name: campusMatch.name, code: campusMatch.code };
    }
    return { id: byGivenName[0].id, name: byGivenName[0].name, code: byGivenName[0].code };
  }

  // 5. Fuzzy match without accents
  const fuzzy = teachers.find(t => removeVietnameseAccents(t.name) === noAccent);
  if (fuzzy) return { id: fuzzy.id, name: fuzzy.name, code: fuzzy.code };

  return undefined;
}

/**
 * Smart subject matcher: normalizes VietSchool subject abbreviations
 */
export function matchSubject(
  rawSubject: string,
  subjects: Subject[],
  targetClass?: ClassGroup
): { id: string; name: string } {
  if (!rawSubject) return { id: '', name: '' };
  const clean = rawSubject.trim();
  const upper = clean.toUpperCase().replace(/\s+/g, ' ');
  const isTHCS = targetClass ? targetClass.level === 'THCS' : false;

  // 1. Chào cờ
  if (upper === 'CHÀO CỜ' || upper.startsWith('CHÀO CỜ') || upper === 'CC') {
    return { id: 'sub-chao-co', name: 'Chào cờ' };
  }

  // 2. Sinh hoạt lớp (SHL)
  if (upper.startsWith('SHL') || upper.startsWith('SINH HOẠT LỚP')) {
    return { id: 'sub-shl', name: 'Sinh hoạt lớp' };
  }
  if (upper === 'HĐCN' || upper === 'HĐ QML' || upper.includes('QUY MÔ LỚP') || upper.includes('HĐ TN-HN(SHL)') || upper.includes('HĐTNHN (SHL)')) {
    if (isTHCS) {
      return { id: 'sub-hdtn-cd', name: 'HĐTNHN (Quy mô lớp)' };
    }
    return { id: 'sub-shl', name: 'Sinh hoạt lớp' };
  }

  // 3. Hoạt động trải nghiệm (HĐTN)
  if (upper.startsWith('HĐ CĐ') || upper.includes('HĐ TN-HN(CĐ)') || upper.includes('HĐTNHN (CĐ)') || upper.startsWith('HĐTN') || upper.startsWith('HĐ TN') || upper.startsWith('HĐTNHN') || upper.includes('CHỦ ĐỀ') || upper.includes('CHUYÊN ĐỀ') || upper.includes('TRẢI NGHIỆM')) {
    if (isTHCS) {
      return { id: 'sub-hdtn-cd', name: 'HĐTNHN (Chuyên đề)' };
    }
    return { id: 'sub-hdtn', name: 'HĐTN - HN' };
  }

  // 4. Standard Subjects
  if (upper === 'TOÁN' || upper === 'TOAN') {
    return { id: 'sub-toan', name: 'Toán học' };
  }
  if (upper === 'NGỮ VĂN' || upper === 'VĂN' || upper === 'VAN') {
    return { id: 'sub-van', name: 'Ngữ văn' };
  }
  if (upper === 'TIẾNG ANH' || upper === 'NGOẠI NGỮ' || upper === 'ANH' || upper === 'TA') {
    return { id: 'sub-anh', name: 'Tiếng Anh' };
  }
  if (upper === 'VẬT LÍ' || upper === 'VẬT LÝ' || upper === 'LÝ' || upper === 'LI') {
    if (isTHCS) return { id: 'sub-khtn-cs', name: 'Khoa học tự nhiên' };
    return { id: 'sub-li', name: 'Vật lí' };
  }
  if (upper === 'HÓA HỌC' || upper === 'HOÁ HỌC' || upper === 'HÓA' || upper === 'HOÁ') {
    if (isTHCS) return { id: 'sub-khtn-cs', name: 'Khoa học tự nhiên' };
    return { id: 'sub-hoa', name: 'Hóa học' };
  }
  if (upper === 'SINH HỌC' || upper === 'SINH') {
    if (isTHCS) return { id: 'sub-khtn-cs', name: 'Khoa học tự nhiên' };
    return { id: 'sub-sinh', name: 'Sinh học' };
  }
  if (upper === 'KHTN' || upper === 'KHOA HỌC TỰ NHIÊN') {
    return { id: 'sub-khtn-cs', name: 'Khoa học tự nhiên' };
  }
  if (upper === 'LỊCH SỬ' || upper === 'SỬ' || upper === 'SU') {
    if (isTHCS) return { id: 'sub-lsdl-cs', name: 'Lịch sử và Địa lí' };
    return { id: 'sub-su', name: 'Lịch sử' };
  }
  if (upper === 'ĐỊA LÍ' || upper === 'ĐỊA LÝ' || upper === 'ĐỊA') {
    if (isTHCS) return { id: 'sub-lsdl-cs', name: 'Lịch sử và Địa lí' };
    return { id: 'sub-dia', name: 'Địa lí' };
  }
  if (upper === 'LỊCH SỬ VÀ ĐỊA LÍ' || upper === 'LỊCH SỬ VÀ ĐỊA LÝ' || upper === 'LS-ĐL' || upper === 'LS&ĐL' || upper === 'S&Đ') {
    return { id: 'sub-lsdl-cs', name: 'Lịch sử và Địa lí' };
  }
  if (upper === 'GD KTPL' || upper === 'GDKT&PL' || upper === 'GDKT & PL' || upper.includes('KINH TẾ')) {
    return { id: 'sub-gdktpl', name: 'GDKT & Pháp luật' };
  }
  if (upper === 'GDCD' || upper === 'GIÁO DỤC CÔNG DÂN') {
    return { id: 'sub-gdcd', name: 'Giáo dục công dân' };
  }
  if (upper === 'TIN HỌC' || upper === 'TIN') {
    return { id: 'sub-tin', name: 'Tin học' };
  }
  if (upper === 'CÔNG NGHỆ' || upper === 'CN') {
    return { id: 'sub-cn', name: 'Công nghệ' };
  }
  if (upper === 'GDTC' || upper === 'THỂ DỤC' || upper === 'GIÁO DỤC THỂ CHẤT') {
    return { id: 'sub-gdtc', name: 'Giáo dục thể chất' };
  }
  if (upper.startsWith('GD QP') || upper.startsWith('GDQP') || upper === 'QUỐC PHÒNG') {
    return { id: 'sub-gdqp', name: 'GD Quốc phòng & An ninh' };
  }
  if (upper === 'ÂM NHẠC' || upper === 'AN' || upper === 'NHẠC') {
    return { id: 'sub-am-nhac', name: 'Âm nhạc' };
  }
  if (upper === 'MỸ THUẬT' || upper === 'MT' || upper === 'VẼ') {
    return { id: 'sub-my-thuat', name: 'Mỹ thuật' };
  }
  if (upper === 'NGHỆ THUẬT') {
    return { id: 'sub-nghe-thuat', name: 'Nghệ thuật' };
  }

  if (upper === 'GDĐP' || upper === 'GD DP' || upper === 'GD ĐỊA PHƯƠNG' || upper === 'GIÁO DỤC ĐỊA PHƯƠNG' || upper === 'ĐỊA PHƯƠNG' || upper.includes('ĐỊA PHƯƠNG')) {
    return { id: 'sub-gddp', name: 'GD Địa phương' };
  }
  if (upper.startsWith('CĐ ') || upper.startsWith('CD ') || upper.startsWith('CHUYÊN ĐỀ ')) {
    const subPart = upper.replace(/^(?:CĐ|CD|CHUYÊN ĐỀ)\s+/i, '').trim();
    if (subPart.includes('TOÁN')) return { id: 'sub-toan', name: 'Toán học' };
    if (subPart.includes('VĂN')) return { id: 'sub-van', name: 'Ngữ văn' };
    if (subPart.includes('ANH')) return { id: 'sub-anh', name: 'Tiếng Anh' };
    if (subPart.includes('LÍ') || subPart.includes('LÝ')) return { id: 'sub-li', name: 'Vật lí' };
    if (subPart.includes('HÓA') || subPart.includes('HOÁ')) return { id: 'sub-hoa', name: 'Hóa học' };
    if (subPart.includes('SINH')) return { id: 'sub-sinh', name: 'Sinh học' };
    if (subPart.includes('SỬ')) return { id: 'sub-su', name: 'Lịch sử' };
    if (subPart.includes('ĐỊA')) return { id: 'sub-dia', name: 'Địa lí' };
    if (subPart.includes('TIN')) return { id: 'sub-tin', name: 'Tin học' };
  }

  // Direct subject match from app subjects
  const found = subjects.find(
    s => s.name.toUpperCase() === upper ||
         s.shortName.toUpperCase() === upper ||
         s.id.toUpperCase() === upper
  );
  if (found) return { id: found.id, name: found.name };

  return { id: 'sub-custom', name: clean };
}

/**
 * Deconstructs a cell string from VietSchool (e.g. "Toán-Lang", "GDCD-Thúy", "Mỹ thuật-Quốc(TK)", "HĐTNHN (SHL) - Diễm")
 */
export function deconstructCellText(cellValue: any): { subjectText: string; teacherText: string } {
  if (cellValue === null || cellValue === undefined) {
    return { subjectText: '', teacherText: '' };
  }

  let text = String(cellValue).trim();
  if (!text || text === '-' || text === 'x' || text === 'X' || text === 'nghỉ') {
    return { subjectText: '', teacherText: '' };
  }

  // Standalone keywords
  if (text.toUpperCase() === 'CHÀO CỜ' || text.toUpperCase() === 'CHAO CO' || text.toUpperCase() === 'CC') {
    return { subjectText: 'Chào cờ', teacherText: '' };
  }

  if (text.toUpperCase() === 'SHL' || text.toUpperCase() === 'SINH HOẠT LỚP') {
    return { subjectText: 'Sinh hoạt lớp', teacherText: '' };
  }

  // 1. Newline separated: "Toán\nNguyễn Văn A"
  if (text.includes('\n')) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      return { subjectText: lines[0], teacherText: lines[1].replace(/^[(-]+|[)-]+$/g, '').trim() };
    }
    return { subjectText: lines[0], teacherText: '' };
  }

  // 2. Hyphen separated: "Môn - Giáo viên" or "Môn-Giáo viên"
  if (text.includes('-')) {
    const lastHyphen = text.lastIndexOf('-');
    const leftPart = text.substring(0, lastHyphen).trim();
    const rightPart = text.substring(lastHyphen + 1).trim();

    // Check if right part is just part of subject name (e.g. AN in GD QP-AN, or HN in HĐ TN-HN)
    const upperRight = rightPart.toUpperCase();
    if (upperRight === 'AN' && (leftPart.toUpperCase().includes('GD') || leftPart.toUpperCase().includes('QP'))) {
      return { subjectText: text, teacherText: '' };
    }
    if (upperRight === 'HN' && leftPart.toUpperCase().includes('TN')) {
      return { subjectText: text, teacherText: '' };
    }
    if ((upperRight === 'ĐL' || upperRight === 'DL') && leftPart.toUpperCase().includes('LS')) {
      return { subjectText: text, teacherText: '' };
    }
    if (upperRight === 'PL' && (leftPart.toUpperCase().includes('KT') || leftPart.toUpperCase().includes('GD'))) {
      return { subjectText: text, teacherText: '' };
    }

    if (leftPart && rightPart) {
      return { subjectText: leftPart, teacherText: rightPart };
    }
  }

  // 3. Parenthesis notation: "Toán (Hương)" (ignore campus tags like (TK))
  const parenMatch = text.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (parenMatch) {
    const pInside = parenMatch[2].trim();
    if (pInside.toUpperCase() !== 'TK' && pInside.toUpperCase() !== 'ĐBK' && pInside.toUpperCase() !== 'DBK') {
      return {
        subjectText: parenMatch[1].trim(),
        teacherText: pInside
      };
    }
  }

  // Just subject name alone
  return { subjectText: text, teacherText: '' };
}

/**
 * Normalizes teacher name from raw input or table headers
 */
export function normalizeTeacherRaw(raw: string): string {
  if (!raw) return '';
  let clean = String(raw)
    .replace(/\*\*/g, '')
    .replace(/\[|\]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\(ĐBK\)/gi, '')
    .replace(/\(Tân Kiều\)/gi, '')
    .replace(/\(Tân Kiểu\)/gi, '')
    .replace(/\(TK\)/gi, '')
    .trim();

  // Handle common export typos or contractions
  if (clean.toLowerCase().includes('lê tnị hoài an')) {
    clean = 'Lê Thị Hoài An';
  }
  if (clean.toLowerCase().includes('ng thị kim xoa')) {
    clean = 'Nguyễn Thị Kim Xoa';
  }
  return clean;
}

/**
 * Deconstructs cell value into Class and Subject (e.g. "7A5-Toán" -> class: "7A5", subject: "Toán")
 */
export function deconstructTeacherSlotCell(cellVal: string): { rawClassName: string; rawSubjectName: string } {
  const trimmed = String(cellVal || '')
    .replace(/\*\*/g, '')
    .replace(/\[|\]/g, '')
    .trim();
  if (!trimmed) return { rawClassName: '', rawSubjectName: '' };
  
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

/**
 * Dedicated Parser for Teacher-Centric Timetable in Markdown/Text format
 */
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

  interface TableBlock {
    header: string[];
    rows: string[][];
  }

  const allBlocks: TableBlock[] = [];
  let currentBlock: TableBlock | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|') || !line.endsWith('|')) continue;
    if (/^\|(\s*[:-]+\s*\|)+$/.test(line)) continue;

    const cells = line
      .slice(1, -1)
      .split('|')
      .map(c => c.replace(/\*\*/g, '').replace(/\[|\]/g, '').trim());

    const isHeader = cells.some(c => 
      c.includes('Giáo Viên') || 
      c === 'Thứ 7' || 
      (c.includes('Thứ 6') && cells.includes('Thứ 7')) ||
      (c.includes('Thứ 2') && c.includes('Thứ 3'))
    );

    if (isHeader) {
      if (currentBlock) allBlocks.push(currentBlock);
      currentBlock = { header: cells, rows: [] };
      continue;
    }

    if (cells[0].includes('THỜI KHÓA BIỂU')) {
      continue;
    }

    if (currentBlock) {
      // Keep row as-is (including empty period rows) so that line indices map accurately
      currentBlock.rows.push(cells);
    }
  }
  if (currentBlock) allBlocks.push(currentBlock);

  // Group blocks:
  // Primary blocks have "Giáo Viên" in header
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

  // Parse each primary block
  for (let bIdx = 0; bIdx < primaryBlocks.length; bIdx++) {
    const pBlock = primaryBlocks[bIdx];
    const sBlock = secondaryBlocks[bIdx];

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

    // Day column mapping for primary block
    const pDayColMap: Record<number, number> = {};
    pBlock.header.forEach((h, colIdx) => {
      const match = h.match(/Thứ\s*(\d)/i);
      if (match) {
        pDayColMap[colIdx] = parseInt(match[1], 10);
      }
    });

    // Day column mapping for secondary block
    const sDayColMap: Record<number, number> = {};
    if (sBlock) {
      sBlock.header.forEach((h, colIdx) => {
        const match = h.match(/Thứ\s*(\d)/i);
        if (match) {
          sDayColMap[colIdx] = parseInt(match[1], 10);
        }
      });
      if (Object.keys(sDayColMap).length === 0 && sBlock.header.some(h => h.includes('Thứ 7'))) {
        sDayColMap[0] = 7;
      }
    }

    // Filter valid period rows from pBlock to pair 1-to-1 with sBlock
    interface ValidPeriodRow {
      row: string[];
      period: number;
      session: 'SANG' | 'CHIEU';
      pIndex: number;
    }
    const validPRows: ValidPeriodRow[] = [];
    let currentSession: 'SANG' | 'CHIEU' = bIdx >= 49 ? 'SANG' : 'CHIEU';

    for (let r = 0; r < pBlock.rows.length; r++) {
      const row = pBlock.rows[r];
      if (row[1] === 'S' || row[1] === 'Sáng' || row[1] === 'SANG') {
        currentSession = 'SANG';
      } else if (row[1] === 'C' || row[1] === 'Chiều' || row[1] === 'CHIEU') {
        currentSession = 'CHIEU';
      }

      const period = parseInt(String(row[2] || '').replace(/[^0-9]/g, ''), 10);
      if (!isNaN(period) && period >= 1 && period <= 5) {
        validPRows.push({ row, period, session: currentSession, pIndex: validPRows.length });
      }
    }

    for (let rIdx = 0; rIdx < validPRows.length; rIdx++) {
      const { row, period, session } = validPRows[rIdx];

      // Extract days from primary block
      for (const [colIdxStr, day] of Object.entries(pDayColMap)) {
        const colIdx = parseInt(colIdxStr, 10);
        const cellVal = row[colIdx] || '';
        if (!cellVal.trim()) continue;

        const { rawClassName, rawSubjectName } = deconstructTeacherSlotCell(cellVal);
        if (!rawClassName) continue;

        const targetClass = matchClass(rawClassName, classes);
        if (!targetClass) {
          unrecognizedClassNames.add(rawClassName);
          continue;
        }
        recognizedClassNames.add(targetClass.name);

        const matchedSubject = matchSubject(rawSubjectName, subjects, targetClass);

        const slotId = `${targetClass.id}_${day}_${session}_${period}`;
        slots.push({
          id: slotId,
          classId: targetClass.id,
          className: targetClass.name,
          dayOfWeek: day,
          session: session,
          period,
          subjectId: matchedSubject.id,
          subjectName: matchedSubject.name,
          teacherId: matchedTeacher?.id || '',
          teacherName: matchedTeacher?.name || cleanTeacher,
          teacherCode: matchedTeacher?.code || cleanTeacher,
          room: ''
        });
      }

      // Extract days from secondary block matching index rIdx
      if (sBlock && sBlock.rows[rIdx]) {
        const sRow = sBlock.rows[rIdx];
        for (const [colIdxStr, day] of Object.entries(sDayColMap)) {
          const colIdx = parseInt(colIdxStr, 10);
          const cellVal = sRow[colIdx] || '';
          if (!cellVal.trim()) continue;

          const { rawClassName, rawSubjectName } = deconstructTeacherSlotCell(cellVal);
          if (!rawClassName) continue;

          const targetClass = matchClass(rawClassName, classes);
          if (!targetClass) {
            unrecognizedClassNames.add(rawClassName);
            continue;
          }
          recognizedClassNames.add(targetClass.name);

          const matchedSubject = matchSubject(rawSubjectName, subjects, targetClass);

          const slotId = `${targetClass.id}_${day}_${session}_${period}`;
          slots.push({
            id: slotId,
            classId: targetClass.id,
            className: targetClass.name,
            dayOfWeek: day,
            session: session,
            period,
            subjectId: matchedSubject.id,
            subjectName: matchedSubject.name,
            teacherId: matchedTeacher?.id || '',
            teacherName: matchedTeacher?.name || cleanTeacher,
            teacherCode: matchedTeacher?.code || cleanTeacher,
            room: ''
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

/**
 * Dedicated Parser for Teacher-Centric Timetable in Excel rows (any[][])
 */
export function parseTeacherCentricFromRows(
  rawRows: any[][],
  classes: ClassGroup[],
  subjects: Subject[],
  teachers: Teacher[]
): VietSchoolParseResult | null {
  if (!rawRows || rawRows.length < 2) return null;

  // Search for header row
  let headerRowIdx = -1;
  let colTeacher = -1;
  let colSession = -1;
  let colPeriod = -1;
  const dayColMap: Record<number, number> = {};

  for (let r = 0; r < Math.min(rawRows.length, 25); r++) {
    const row = rawRows[r] || [];
    const lowerCells = row.map(c => String(c || '').toLowerCase().trim());
    
    const tIdx = lowerCells.findIndex(c => c.includes('giáo viên') || c === 'gv');
    const pIdx = lowerCells.findIndex(c => c.includes('tiết') || c === 'period');
    
    if (tIdx >= 0 && pIdx >= 0) {
      headerRowIdx = r;
      colTeacher = tIdx;
      colPeriod = pIdx;
      colSession = lowerCells.findIndex(c => c.includes('buổi') || c.includes('ca') || c === 's/c');

      // Map days
      lowerCells.forEach((cell, cIdx) => {
        const match = cell.match(/thứ\s*(\d)/i) || cell.match(/^t(\d)$/i);
        if (match) {
          dayColMap[cIdx] = parseInt(match[1], 10);
        }
      });
      break;
    }
  }

  if (headerRowIdx === -1 || Object.keys(dayColMap).length === 0) {
    return null;
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const slots: TimetableSlot[] = [];
  const recognizedClassNames = new Set<string>();
  const unrecognizedClassNames = new Set<string>();
  const recognizedTeacherNames = new Set<string>();
  const unrecognizedTeacherNames = new Set<string>();

  let currentTeacher = '';
  let currentSession: 'SANG' | 'CHIEU' = 'SANG';

  for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    // Check if new header
    const lowerRow = row.map(c => String(c || '').toLowerCase().trim());
    if (lowerRow.some(c => c.includes('giáo viên')) && lowerRow.some(c => c.includes('tiết'))) {
      continue;
    }

    const tCell = String(row[colTeacher] || '').trim();
    if (tCell && !tCell.toLowerCase().includes('giáo viên')) {
      currentTeacher = normalizeTeacherRaw(tCell);
    }

    if (colSession >= 0) {
      const sCell = String(row[colSession] || '').trim().toUpperCase();
      if (sCell === 'S' || sCell.includes('SÁNG')) currentSession = 'SANG';
      else if (sCell === 'C' || sCell.includes('CHIỀU')) currentSession = 'CHIEU';
    }

    const periodVal = parseInt(String(row[colPeriod] || '').replace(/[^0-9]/g, ''), 10);
    if (isNaN(periodVal) || periodVal < 1 || periodVal > 5) continue;

    const matchedTeacher = matchTeacher(currentTeacher, teachers);
    if (currentTeacher) {
      if (matchedTeacher) recognizedTeacherNames.add(matchedTeacher.name);
      else unrecognizedTeacherNames.add(currentTeacher);
    }

    for (const [colIdxStr, day] of Object.entries(dayColMap)) {
      const colIdx = parseInt(colIdxStr, 10);
      const cellVal = String(row[colIdx] || '').trim();
      if (!cellVal) continue;

      const { rawClassName, rawSubjectName } = deconstructTeacherSlotCell(cellVal);
      if (!rawClassName) continue;

      const targetClass = matchClass(rawClassName, classes);
      if (!targetClass) {
        unrecognizedClassNames.add(rawClassName);
        continue;
      }
      recognizedClassNames.add(targetClass.name);

      const matchedSubject = matchSubject(rawSubjectName, subjects, targetClass);

      const slotId = `${targetClass.id}_${day}_${currentSession}_${periodVal}`;
      slots.push({
        id: slotId,
        classId: targetClass.id,
        className: targetClass.name,
        dayOfWeek: day,
        session: currentSession,
        period: periodVal,
        subjectId: matchedSubject.id,
        subjectName: matchedSubject.name,
        teacherId: matchedTeacher?.id || '',
        teacherName: matchedTeacher?.name || currentTeacher,
        teacherCode: matchedTeacher?.code || currentTeacher,
        room: ''
      });
    }
  }

  if (slots.length === 0) return null;

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

/**
 * Universal VietSchool Timetable Parser
 * Parses any VietSchool Excel file (multi-sheet), CSV, TSV or pasted content
 */
export function parseVietSchoolTimetable(
  fileData: ArrayBuffer | string,
  classes: ClassGroup[],
  subjects: Subject[],
  teachers: Teacher[]
): VietSchoolParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const slots: TimetableSlot[] = [];
  const recognizedClassNames = new Set<string>();
  const unrecognizedClassNames = new Set<string>();
  const recognizedTeacherNames = new Set<string>();
  const unrecognizedTeacherNames = new Set<string>();

  let workbook: XLSX.WorkBook;
  try {
    let textContent: string | null = null;

    if (typeof fileData === 'string') {
      textContent = fileData;
    } else {
      const uint8 = new Uint8Array(fileData);
      const isZip = uint8[0] === 0x50 && uint8[1] === 0x4B; // .xlsx (PK)
      const isOldXls = uint8[0] === 0xD0 && uint8[1] === 0xCF; // .xls (CFBF)
      if (!isZip && !isOldXls) {
        // Plain text, CSV or TSV file
        textContent = new TextDecoder('utf-8').decode(uint8);
      } else {
        workbook = XLSX.read(fileData, { type: 'buffer', codepage: 65001 });
      }
    }

    if (textContent !== null) {
      const trimmed = textContent.trim();
      
      // Fast path: Check if content is in Teacher-Centric format (Markdown tables or text)
      const hasTeacherCentricKeywords = 
        (trimmed.includes('Giáo Viên') || trimmed.includes('giáo viên') || trimmed.includes('GIÁO VIÊN')) &&
        (trimmed.includes('Tiết') || trimmed.includes('tiết') || trimmed.includes('TIẾT') || trimmed.includes('Buổi') || trimmed.includes('buổi')) &&
        (trimmed.includes('Thứ') || trimmed.includes('thứ') || trimmed.includes('THỨ'));

      if (hasTeacherCentricKeywords) {
        const teacherResult = parseTeacherCentricFromMarkdown(trimmed, classes, subjects, teachers);
        if (teacherResult && teacherResult.slots.length > 0) {
          return teacherResult;
        }
      }

      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        // Raw JSON
        const rawJson = JSON.parse(trimmed);
        const arrayRows = Array.isArray(rawJson) ? rawJson : [rawJson];
        const ws = XLSX.utils.json_to_sheet(arrayRows);
        workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, ws, 'JSON_Data');
      } else {
        // Parse CSV/TSV with XLSX.read type 'string' to handle quotes and delimiter cleanly
        try {
          workbook = XLSX.read(textContent, { type: 'string', raw: true });
        } catch {
          const rows = trimmed.split(/\r?\n/).map(line => {
            if (line.includes('\t')) return line.split('\t');
            return line.split(',');
          });
          const ws = XLSX.utils.aoa_to_sheet(rows);
          workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, ws, 'Pasted_Data');
        }
      }
    }
  } catch (err: any) {
    return {
      slots: [],
      recognizedClasses: [],
      unrecognizedClasses: [],
      recognizedTeachers: [],
      unrecognizedTeachers: [],
      campusStats: { thptSlots: 0, thcsDbkSlots: 0, thcsTkSlots: 0 },
      errors: [`Lỗi giải mã tập tin: ${err?.message || 'Tệp không đúng định dạng Excel'}`],
      warnings: [],
      sheetNames: [],
      detectedFormat: 'Không xác định',
      successCount: 0
    };
  }

  const sheetNames = workbook.SheetNames || [];
  let detectedFormat = 'VietSchool';

  // Process ALL sheets in workbook
  sheetNames.forEach(sheetName => {
    const ws = workbook.Sheets[sheetName];
    if (!ws) return;

    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!rawRows || rawRows.length === 0) return;

    // Check if Teacher-Centric format exists on this sheet
    const teacherCentricResult = parseTeacherCentricFromRows(rawRows, classes, subjects, teachers);
    if (teacherCentricResult && teacherCentricResult.slots.length > 0) {
      detectedFormat = teacherCentricResult.detectedFormat;
      teacherCentricResult.slots.forEach(s => slots.push(s));
      teacherCentricResult.recognizedClasses.forEach(c => recognizedClassNames.add(c));
      teacherCentricResult.unrecognizedClasses.forEach(c => unrecognizedClassNames.add(c));
      teacherCentricResult.recognizedTeachers.forEach(t => recognizedTeacherNames.add(t));
      teacherCentricResult.unrecognizedTeachers.forEach(t => unrecognizedTeacherNames.add(t));
      return;
    }

    // Check if Flat List format exists on row 0
    const headerRow = (rawRows[0] || []).map((h: any) => String(h || '').trim().toLowerCase());
    const colLop = headerRow.findIndex((h: string) => h.includes('lớp') || h.includes('class'));
    const colThu = headerRow.findIndex((h: string) => h.includes('thứ') || h.includes('day'));
    const colTiet = headerRow.findIndex((h: string) => h.includes('tiết') || h.includes('period'));
    const colMon = headerRow.findIndex((h: string) => h.includes('môn') || h.includes('subject'));
    const colGv = headerRow.findIndex((h: string) => h.includes('giáo viên') || h.includes('gv') || h.includes('teacher'));

    if (colLop >= 0 && colThu >= 0 && colTiet >= 0 && colMon >= 0) {
      detectedFormat = 'VietSchool - Danh sách chi tiết';
      for (let r = 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0) continue;

        const rawClassName = String(row[colLop] || '').trim();
        if (!rawClassName) continue;

        const targetClass = matchClass(rawClassName, classes);
        if (!targetClass) {
          unrecognizedClassNames.add(rawClassName);
          continue;
        }
        recognizedClassNames.add(targetClass.name);

        let dayVal = parseInt(String(row[colThu] || '2').replace(/[^0-9]/g, ''), 10);
        if (isNaN(dayVal) || dayVal < 2 || dayVal > 7) dayVal = 2;

        let periodVal = parseInt(String(row[colTiet] || '1').replace(/[^0-9]/g, ''), 10);
        if (isNaN(periodVal) || periodVal < 1 || periodVal > 10) periodVal = 1;

        const session: 'SANG' | 'CHIEU' = periodVal > 5 ? 'CHIEU' : 'SANG';
        const effectivePeriod = periodVal > 5 ? periodVal - 5 : periodVal;

        const subjectRaw = String(row[colMon] || '').trim();
        const teacherRaw = colGv >= 0 ? String(row[colGv] || '').trim() : '';

        const matchedSubject = matchSubject(subjectRaw, subjects, targetClass);
        const matchedTeacher = matchTeacher(teacherRaw, teachers, targetClass);

        if (teacherRaw) {
          if (matchedTeacher) recognizedTeacherNames.add(matchedTeacher.name);
          else unrecognizedTeacherNames.add(teacherRaw);
        }

        const slotId = `${targetClass.id}_${dayVal}_${session}_${effectivePeriod}`;
        const existingIdx = slots.findIndex(s => s.id === slotId);
        const newSlot: TimetableSlot = {
          id: slotId,
          classId: targetClass.id,
          className: targetClass.name,
          dayOfWeek: dayVal,
          session,
          period: effectivePeriod,
          subjectId: matchedSubject.id,
          subjectName: matchedSubject.name,
          teacherId: matchedTeacher?.id || '',
          teacherName: matchedTeacher?.name || teacherRaw,
          teacherCode: matchedTeacher?.code || teacherRaw,
          room: ''
        };
        if (existingIdx >= 0) slots[existingIdx] = newSlot;
        else slots.push(newSlot);
      }
      return;
    }

    // A single sheet can contain ONE or MULTIPLE timetable blocks stacked vertically
    // We scan through each row r from 0 to rawRows.length - 1 to find Header Rows
    let r = 0;
    while (r < rawRows.length) {
      const row = rawRows[r];
      if (!row || row.length === 0) {
        r++;
        continue;
      }

      // Check if this row is a Class Header row (contains at least 2 recognized class names)
      let matchCount = 0;
      const colClassMap = new Map<number, ClassGroup>();
      for (let c = 0; c < row.length; c++) {
        const cellVal = String(row[c] || '').trim();
        if (!cellVal) continue;
        const matched = matchClass(cellVal, classes);
        if (matched) {
          matchCount++;
          colClassMap.set(c, matched);
        }
      }

      if (matchCount >= 2) {
        // This is a timetable matrix block header!
        detectedFormat = 'VietSchool - Ma trận Lớp theo cột';
        colClassMap.forEach(cg => recognizedClassNames.add(cg.name));

        const firstClassCol = Math.min(...Array.from(colClassMap.keys()));

        // Helper to parse day of week safely
        const parseVietSchoolDay = (val: any): number | null => {
          if (val === null || val === undefined) return null;
          let str = String(val).toLowerCase().replace(/[\u00a0\s._-]+/g, ' ').trim();
          if (!str) return null;
          str = str.replace(/\([^)]*\)/g, '').replace(/[\/\-].*$/, '').trim();

          if (/^(?:thứ|thu|t)?\s*(?:hai|2)$/i.test(str) || str.includes('thứ 2') || str.includes('thứ hai') || str === '2' || str === 'hai') return 2;
          if (/^(?:thứ|thu|t)?\s*(?:ba|3)$/i.test(str) || str.includes('thứ 3') || str.includes('thứ ba') || str === '3' || str === 'ba') return 3;
          if (/^(?:thứ|thu|t)?\s*(?:tư|tu|4)$/i.test(str) || str.includes('thứ 4') || str.includes('thứ tư') || str === '4' || str === 'tư' || str === 'tu') return 4;
          if (/^(?:thứ|thu|t)?\s*(?:năm|nam|5)$/i.test(str) || str.includes('thứ 5') || str.includes('thứ năm') || str === '5' || str === 'năm' || str === 'nam') return 5;
          if (/^(?:thứ|thu|t)?\s*(?:sáu|sau|6)$/i.test(str) || str.includes('thứ 6') || str.includes('thứ sáu') || str === '6' || str === 'sáu' || str === 'sau') return 6;
          if (/^(?:thứ|thu|t)?\s*(?:bảy|bay|7)$/i.test(str) || str.includes('thứ 7') || str.includes('thứ bảy') || str === '7' || str === 'bảy' || str === 'bay') return 7;

          return null;
        };

        // Determine columns: Day, Session, Period by inspecting headers and data rows
        let colDayIdx = -1;
        let colSessionIdx = -1;
        let colPeriodIdx = -1;

        for (let c = 0; c < firstClassCol; c++) {
          const headerText = [
            String(rawRows[r - 2]?.[c] || ''),
            String(rawRows[r - 1]?.[c] || ''),
            String(row[c] || '')
          ].join(' ').toLowerCase();

          if (headerText.includes('thứ') || headerText.includes('ngày') || headerText.includes('thu') || headerText.includes('ngay') || headerText.includes('day')) {
            colDayIdx = c;
          } else if (headerText.includes('buổi') || headerText.includes('buoi') || headerText.includes('session') || headerText.includes('ca')) {
            colSessionIdx = c;
          } else if (headerText.includes('tiết') || headerText.includes('tiet') || headerText.includes('period')) {
            colPeriodIdx = c;
          }
        }

        // Score columns based on first 30 data rows
        if (colDayIdx === -1 || colPeriodIdx === -1) {
          const dayScores = new Array(firstClassCol).fill(0);
          const periodScores = new Array(firstClassCol).fill(0);
          const sessionScores = new Array(firstClassCol).fill(0);

          for (let sampleR = r + 1; sampleR < Math.min(rawRows.length, r + 30); sampleR++) {
            const sRow = rawRows[sampleR];
            if (!sRow) continue;
            for (let c = 0; c < firstClassCol; c++) {
              const val = String(sRow[c] || '').trim();
              if (!val) continue;
              if (parseVietSchoolDay(val) !== null) dayScores[c]++;
              if (/^(?:tiết|tiet|t)?\s*([1-9]|10)$/i.test(val) || /^[1-5][SCsc]$/i.test(val) || /^[SCsc][1-5]$/i.test(val)) periodScores[c]++;
              if (/^(?:sáng|chiều|sang|chieu|s|c)$/i.test(val)) sessionScores[c]++;
            }
          }

          if (colDayIdx === -1) {
            let maxDay = 0, bestCol = -1;
            dayScores.forEach((score, c) => { if (score > maxDay) { maxDay = score; bestCol = c; } });
            if (bestCol !== -1) colDayIdx = bestCol;
          }
          if (colPeriodIdx === -1) {
            let maxP = 0, bestCol = -1;
            periodScores.forEach((score, c) => { if (score > maxP && c !== colDayIdx) { maxP = score; bestCol = c; } });
            if (bestCol !== -1) colPeriodIdx = bestCol;
          }
          if (colSessionIdx === -1) {
            let maxS = 0, bestCol = -1;
            sessionScores.forEach((score, c) => { if (score > maxS && c !== colDayIdx && c !== colPeriodIdx) { maxS = score; bestCol = c; } });
            if (bestCol !== -1) colSessionIdx = bestCol;
          }
        }

        // Fallbacks if not explicitly found
        if (colDayIdx === -1 && firstClassCol >= 1) colDayIdx = 0;
        if (colPeriodIdx === -1) {
          if (firstClassCol >= 3) {
            colPeriodIdx = (colDayIdx === 0) ? 2 : 1;
            colSessionIdx = 1;
          } else if (firstClassCol >= 2) {
            colPeriodIdx = (colDayIdx === 0) ? 1 : 0;
          } else {
            colPeriodIdx = 0;
          }
        }

        let currentDay = 2; // Default Monday (Thứ 2)
        let lastSeenPeriod = -1;

        let dataRowIdx = r + 1;
        while (dataRowIdx < rawRows.length) {
          const dRow = rawRows[dataRowIdx];
          if (!dRow || dRow.length === 0) {
            dataRowIdx++;
            continue;
          }

          // Check if next row is the start of ANOTHER block
          let nextBlockClassCount = 0;
          for (let c = 0; c < dRow.length; c++) {
            const cellVal = String(dRow[c] || '').trim();
            if (cellVal && matchClass(cellVal, classes)) {
              nextBlockClassCount++;
            }
          }
          if (nextBlockClassCount >= 2) {
            break;
          }

          const entireRowText = dRow.join(' ').toLowerCase();

          // Check if metadata row
          if (entireRowText.includes('năm học') || entireRowText.includes('nam hoc') ||
              entireRowText.includes('học kỳ') || entireRowText.includes('hoc ky') ||
              entireRowText.includes('thời khóa biểu') || entireRowText.includes('thoi khoa bieu') ||
              entireRowText.includes('áp dụng') || entireRowText.includes('ap dung') ||
              (entireRowText.includes('trường') && !entireRowText.includes('lớp') && !entireRowText.includes('toán'))) {
            dataRowIdx++;
            continue;
          }

          // 1. Detect Day (Thứ 2 -> 7)
          let matchedDay: number | null = null;
          if (colDayIdx >= 0) {
            matchedDay = parseVietSchoolDay(dRow[colDayIdx]);
          }
          if (matchedDay === null) {
            for (let c = 0; c < firstClassCol; c++) {
              if (c === colPeriodIdx) continue;
              const d = parseVietSchoolDay(dRow[c]);
              if (d !== null) {
                matchedDay = d;
                break;
              }
            }
          }

          if (matchedDay !== null && matchedDay !== currentDay) {
            currentDay = matchedDay;
            lastSeenPeriod = -1;
          }

          // 2. Detect Period
          let rawPeriod = -1;
          if (colPeriodIdx >= 0) {
            const pVal = String(dRow[colPeriodIdx] || '').trim();
            const pMatch = pVal.match(/^(?:tiết|tiet|t)?\s*([0-9]|10)$/i);
            if (pMatch) {
              rawPeriod = parseInt(pMatch[1], 10);
            } else {
              const csMatch = pVal.match(/^([SCsc])\s*([1-5])$/);
              if (csMatch) {
                const p = parseInt(csMatch[2], 10);
                rawPeriod = csMatch[1].toUpperCase() === 'C' ? p + 5 : p;
              } else {
                const scMatch = pVal.match(/^([1-5])\s*([SCsc])$/);
                if (scMatch) {
                  const p = parseInt(scMatch[1], 10);
                  rawPeriod = scMatch[2].toUpperCase() === 'C' ? p + 5 : p;
                }
              }
            }
          }

          // Fallback: check first columns before first class for period digit 1..10
          if (rawPeriod === -1) {
            for (let c = 0; c < Math.min(firstClassCol, dRow.length); c++) {
              if (c === colDayIdx) continue;
              const val = String(dRow[c] || '').trim();
              const pMatch = val.match(/^(?:tiết|tiet|t)?\s*([1-9]|10)$/i);
              if (pMatch) {
                rawPeriod = parseInt(pMatch[1], 10);
                break;
              }
            }
          }

          if (rawPeriod === -1 || rawPeriod < 1 || rawPeriod > 10) {
            // Not a valid period row, skip
            dataRowIdx++;
            continue;
          }

          // 3. Day roll-over:
          // If no explicit Day cell in this row (matchedDay === null, e.g. merged cell in Excel),
          // but the period sequence reset (e.g. was 4 or 5, now 1 or 2):
          // This indicates we reached the NEXT DAY!
          if (matchedDay === null && lastSeenPeriod >= 4 && rawPeriod <= 2) {
            currentDay = Math.min(7, currentDay + 1);
            lastSeenPeriod = rawPeriod;
          } else {
            lastSeenPeriod = rawPeriod;
          }

          // Read cells for each class in this row
          colClassMap.forEach((targetClass, colIdx) => {
            const cellContent = dRow[colIdx];
            if (!cellContent) return;

            const { subjectText, teacherText } = deconstructCellText(cellContent);
            if (!subjectText) return;

            // Strict School Shift Rules:
            // Khối 10, 11, 12 (THPT): ALWAYS BUỔI SÁNG (Morning only, never Afternoon)
            // Khối 8, 9 (THCS): ALWAYS BUỔI SÁNG (Morning)
            // Khối 6, 7 (THCS): ALWAYS BUỔI CHIỀU (Afternoon)
            let session: 'SANG' | 'CHIEU' = 'SANG';
            const gradeNum = parseInt(targetClass.grade, 10);
            if (targetClass.level === 'THPT' || gradeNum >= 10 || /^(?:10|11|12)CB/i.test(targetClass.name)) {
              session = 'SANG';
            } else if (gradeNum === 8 || gradeNum === 9 || /^[89]A/i.test(targetClass.name)) {
              session = 'SANG';
            } else if (gradeNum === 6 || gradeNum === 7 || /^[67]A/i.test(targetClass.name)) {
              session = 'CHIEU';
            } else {
              session = rawPeriod > 5 ? 'CHIEU' : 'SANG';
            }

            // Normalize period within session (1..5)
            let effectivePeriod = rawPeriod;
            if (effectivePeriod > 5) {
              effectivePeriod = effectivePeriod - 5;
            }
            if (effectivePeriod < 1 || effectivePeriod > 5) return;

            const matchedSubject = matchSubject(subjectText, subjects, targetClass);
            let matchedTeacher = matchTeacher(teacherText, teachers, targetClass);

            // Assign homeroom teacher fallback for Chào cờ / SHL
            if (!matchedTeacher && (matchedSubject.id === 'sub-chao-co' || matchedSubject.id === 'sub-shl' || matchedSubject.id === 'sub-hdtn-shl' || matchedSubject.name.includes('Sinh hoạt') || matchedSubject.name.includes('Chào cờ'))) {
              if (targetClass.homeroomTeacherId) {
                const homeroom = teachers.find(t => t.id === targetClass.homeroomTeacherId);
                if (homeroom) {
                  matchedTeacher = { id: homeroom.id, name: homeroom.name, code: homeroom.code };
                }
              }
              if (!matchedTeacher && HOMEROOM_FALLBACK_MAP[targetClass.name]) {
                const fbName = HOMEROOM_FALLBACK_MAP[targetClass.name];
                matchedTeacher = matchTeacher(fbName, teachers, targetClass);
              }
            }

            if (teacherText) {
              if (matchedTeacher) {
                recognizedTeacherNames.add(matchedTeacher.name);
              } else {
                unrecognizedTeacherNames.add(teacherText);
                warnings.push(`Lớp ${targetClass.name}, Thứ ${currentDay}, Tiết ${effectivePeriod}: Giáo viên "${teacherText}" chưa có trong danh sách.`);
              }
            }

            const slotId = `${targetClass.id}_${currentDay}_${session}_${effectivePeriod}`;
            const existingIdx = slots.findIndex(s => s.id === slotId);
            const newSlot: TimetableSlot = {
              id: slotId,
              classId: targetClass.id,
              className: targetClass.name,
              dayOfWeek: currentDay,
              session,
              period: effectivePeriod,
              subjectId: matchedSubject.id,
              subjectName: matchedSubject.name,
              teacherId: matchedTeacher?.id || '',
              teacherName: matchedTeacher?.name || teacherText || '',
              teacherCode: matchedTeacher?.code || teacherText || '',
              room: ''
            };

            if (existingIdx >= 0) {
              slots[existingIdx] = newSlot;
            } else {
              slots.push(newSlot);
            }
          });

          dataRowIdx++;
        }

        r = dataRowIdx;
        continue;
      }

      r++;
    }
  });

  // Deduplicate slots by class, day, session, period (last write wins)
  const slotMap = new Map<string, TimetableSlot>();
  slots.forEach(s => {
    const key = `${s.classId}_${s.dayOfWeek}_${s.session}_${s.period}`;
    slotMap.set(key, s);
  });
  const dedupedSlots = Array.from(slotMap.values());

  // Count campus breakdown
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

  if (dedupedSlots.length === 0) {
    errors.push('Không nhận diện được tiết học nào từ tệp. Vui lòng kiểm tra định dạng hoặc dùng chức năng Tải Mẫu VietSchool để đối chiếu.');
  }

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
    sheetNames,
    detectedFormat,
    successCount: dedupedSlots.length
  };
}

/**
 * Generate a standard VietSchool Sample Excel File with all 3 campuses
 */
export function generateVietSchoolSampleExcel(
  classes: ClassGroup[],
  teachers: Teacher[]
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Ma trận VietSchool (Khối THPT)
  const thptClasses = classes.filter(c => c.level === 'THPT' || c.campus === 'THPTDBK');
  const matrixHeaders = ['Thứ', 'Tiết', ...thptClasses.map(c => c.name)];
  const sampleMatrixData: any[][] = [
    ['TRƯỜNG THCS & THPT ĐỐC BINH KIỀU'],
    ['THỜI KHÓA BIỂU TOÀN TRƯỜNG (XUẤT TỪ VIETSCHOOL)'],
    [],
    matrixHeaders
  ];

  // Populate sample rows for Monday to Saturday (Period 1 to 5)
  const sampleSubs = [
    { sub: 'Chào cờ', tch: 'Tùng' },
    { sub: 'Toán', tch: 'Hương' },
    { sub: 'Ngữ văn', tch: 'Nhịnh' },
    { sub: 'Tiếng Anh', tch: 'Hoa' },
    { sub: 'Vật lí', tch: 'Hiền' },
    { sub: 'Hóa học', tch: 'Kiều' },
    { sub: 'Sinh học', tch: 'Tùng' },
    { sub: 'Lịch sử', tch: 'Sơn' },
    { sub: 'Địa lí', tch: 'Hòa' },
    { sub: 'GDTC', tch: 'Ẩn' },
    { sub: 'GD QP-AN', tch: 'Rạng' },
    { sub: 'HĐ TN-HN', tch: 'Tùng' },
    { sub: 'Tin học', tch: 'Diễm' },
    { sub: 'SHL', tch: 'Tùng' }
  ];

  for (let day = 2; day <= 7; day++) {
    for (let p = 1; p <= 5; p++) {
      const row: any[] = [day === 2 && p === 1 ? 'Thứ 2' : day, p];
      thptClasses.forEach((cls, cIdx) => {
        if (day === 2 && p === 1) {
          row.push(`Chào cờ-${HOMEROOM_FALLBACK_MAP[cls.name] || 'GVCN'}`);
        } else if (day === 7 && p === 5) {
          row.push(`SHL-${HOMEROOM_FALLBACK_MAP[cls.name] || 'GVCN'}`);
        } else {
          const sample = sampleSubs[(day * 3 + p * 2 + cIdx) % sampleSubs.length];
          row.push(`${sample.sub}-${sample.tch}`);
        }
      });
      sampleMatrixData.push(row);
    }
  }

  const wsMatrix = XLSX.utils.aoa_to_sheet(sampleMatrixData);
  XLSX.utils.book_append_sheet(wb, wsMatrix, 'TKB_THPT_VietSchool');

  // Sheet 2: Danh sách chi tiết mẫu
  const detailHeaders = ['Lớp', 'Thứ', 'Buổi', 'Tiết', 'Môn Học', 'Giáo Viên Giảng Dạy', 'Mã GV'];
  const sampleDetailData: any[][] = [
    detailHeaders,
    ['10CB1', 2, 'Sáng', 1, 'Chào cờ', 'Phan Hoàng Tùng', 'Tùng.PH'],
    ['10CB1', 2, 'Sáng', 2, 'Toán học', 'Lê Thị Ngọc Hương', 'Hương.LTN'],
    ['10CB1', 2, 'Sáng', 3, 'HĐTN - HN', 'Phan Hoàng Tùng', 'Tùng.PH'],
    ['6A1', 2, 'Sáng', 1, 'Chào cờ', 'Hồ Thị Ngọc Tài', 'Tài.HTN'],
    ['6A1', 2, 'Sáng', 2, 'Toán học', 'Nguyễn Văn Tới', 'Tới.NV'],
    ['6A7', 2, 'Sáng', 1, 'Chào cờ', 'Nguyễn Thị Kim Sang', 'Sang.NTK'],
    ['6A7', 2, 'Sáng', 2, 'Toán học', 'Trần Văn Nhuận', 'Nhuận.TV']
  ];
  const wsDetail = XLSX.utils.aoa_to_sheet(sampleDetailData);
  XLSX.utils.book_append_sheet(wb, wsDetail, 'TKB_DanhSach_ChiTiet');

  XLSX.writeFile(wb, 'Mau_TKB_VietSchool_Chuan.xlsx');
}

/**
 * Merge multiple VietSchoolParseResult objects into a single cohesive result.
 * Useful when importing multiple files (e.g. 1 file per campus) at once or sequentially.
 */
export function mergeVietSchoolParseResults(results: VietSchoolParseResult[]): VietSchoolParseResult {
  const validResults = results.filter(r => r && (r.slots?.length > 0 || r.errors?.length > 0));
  if (validResults.length === 0) {
    return {
      slots: [],
      recognizedClasses: [],
      unrecognizedClasses: [],
      recognizedTeachers: [],
      unrecognizedTeachers: [],
      campusStats: { thptSlots: 0, thcsDbkSlots: 0, thcsTkSlots: 0 },
      errors: [],
      warnings: [],
      sheetNames: [],
      detectedFormat: 'Không xác định',
      successCount: 0
    };
  }
  if (validResults.length === 1) return validResults[0];

  const slotMap = new Map<string, TimetableSlot>();
  const recognizedClasses = new Set<string>();
  const unrecognizedClasses = new Set<string>();
  const recognizedTeachers = new Set<string>();
  const unrecognizedTeachers = new Set<string>();
  const errors: string[] = [];
  const warnings: string[] = [];
  const sheetNames = new Set<string>();
  const formats = new Set<string>();

  validResults.forEach(res => {
    (res.slots || []).forEach(slot => {
      const key = `${slot.classId}_${slot.dayOfWeek}_${slot.session}_${slot.period}`;
      slotMap.set(key, slot);
    });
    (res.recognizedClasses || []).forEach(c => recognizedClasses.add(c));
    (res.unrecognizedClasses || []).forEach(c => unrecognizedClasses.add(c));
    (res.recognizedTeachers || []).forEach(t => recognizedTeachers.add(t));
    (res.unrecognizedTeachers || []).forEach(t => unrecognizedTeachers.add(t));
    (res.sheetNames || []).forEach(s => sheetNames.add(s));
    if (res.detectedFormat) formats.add(res.detectedFormat);
    if (res.errors) errors.push(...res.errors);
    if (res.warnings) warnings.push(...res.warnings);
  });

  const allSlots = Array.from(slotMap.values());
  const thptSlots = allSlots.filter(s => s.className && /^1[012]/i.test(s.className)).length;
  const thcsTkSlots = allSlots.filter(s => s.className && (/^[6789]A([789]|10)$/i.test(s.className) || s.className.includes('TK'))).length;
  const thcsDbkSlots = allSlots.filter(s => s.className && !(/^1[012]/i.test(s.className)) && !(/^[6789]A([789]|10)$/i.test(s.className)) && !s.className.includes('TK')).length;

  return {
    slots: allSlots,
    recognizedClasses: Array.from(recognizedClasses).sort(),
    unrecognizedClasses: Array.from(unrecognizedClasses).sort(),
    recognizedTeachers: Array.from(recognizedTeachers).sort(),
    unrecognizedTeachers: Array.from(unrecognizedTeachers).sort(),
    campusStats: {
      thptSlots,
      thcsDbkSlots,
      thcsTkSlots
    },
    errors: Array.from(new Set(errors)),
    warnings: Array.from(new Set(warnings)),
    sheetNames: Array.from(sheetNames),
    detectedFormat: Array.from(formats).join(' + ') || 'VietSchool Tổng Hợp',
    successCount: allSlots.length
  };
}

