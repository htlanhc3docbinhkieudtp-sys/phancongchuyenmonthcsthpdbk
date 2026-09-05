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

// Teacher nickname dictionary for THCS Đốc Binh Kiều
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
  'Thúy': { id: 'tch-ls-1', name: 'Lê Hồng Thủy', code: 'Thủy.LH' },
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
  'Nguyện': { id: 'tch-td-1', name: 'Lê Văn Nguyện', code: 'Nguyện.LV' },
  'Nguyên': { id: 'tch-td-1', name: 'Lê Văn Nguyện', code: 'Nguyện.LV' },
  'Đạt': { id: 'tch-td-5', name: 'Lê Minh Đạt', code: 'Đạt.LM' },
  'Ẩn': { id: 'tch-td-6', name: 'Lê Ngọc Ẩn', code: 'Ẩn.LN' },
  'Dân': { id: 'tch-td-7', name: 'Huỳnh Thanh Dân', code: 'Dân.HT' },
  'Thanh Hùng': { id: 'tch-td-8', name: 'Nguyễn Thanh Hùng', code: 'Hùng.NThanh' },
  'Hận': { id: 'tch-td-8', name: 'Nguyễn Quốc Hận', code: 'Hận.NQ' },
  'Lưu': { id: 'tch-td-7', name: 'Lê Thanh Lưu', code: 'Lưu.LT' },
  'Xanh': { id: 'tch-td-9', name: 'Lê Thị Tuyết Xanh', code: 'Xanh.LTT' },
  'Quốc(TK)': { id: 'tch-td-10', name: 'Trần Thị Mỹ Quốc', code: 'Quốc.TTM' },
  'Văn(TK)': { id: 'tch-td-12', name: 'Nguyễn Anh Văn', code: 'Văn.NA' }
};

// Teacher nickname dictionary for THCS Tân Kiều
const THCS_TK_TEACHER_LOOKUP: Record<string, { id: string; name: string; code: string }> = {
  'Nhuận': { id: 'tch-t-15', name: 'Trần Văn Nhuận', code: 'Nhuận.TV' },
  'Hà': { id: 'tch-ls-14', name: 'Châu Thị Kim Hà', code: 'Hà.CTK' },
  'Tín': { id: 'tch-t-13', name: 'Nguyễn Thành Tín', code: 'Tín.NT' },
  'Tuyền': { id: 'tch-av-1', name: 'Lê Thị Ngọc Tuyền', code: 'Tuyền.LTN' },
  'Nga': { id: 'tch-t-14', name: 'Huỳnh Thị Huỳnh Nga', code: 'Nga.HTH' },
  'Vi': { id: 'tch-v-tk-vi', name: 'Trần Thị Thúy Vi', code: 'Vi.TTT' },
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
  'Đ.Văn': { id: 'tch-khtn-15', name: 'Võ Ngọc Đỉnh Văn', code: 'Văn.VNĐ' },
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

  // 1. Match by ID or exact full name or exact code
  const exact = teachers.find(
    t => t.id.toLowerCase() === lower ||
         t.name.trim().toLowerCase() === lower ||
         t.code.trim().toLowerCase() === lower
  );
  if (exact) return { id: exact.id, name: exact.name, code: exact.code };

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
  if (upper.startsWith('SHL') || upper.startsWith('SINH HOẠT LỚP') || upper === 'HĐCN' || upper === 'HĐ QML' || upper.includes('QUY MÔ LỚP') || upper.includes('HĐ TN-HN(SHL)') || upper.includes('HĐTNHN (SHL)')) {
    if (isTHCS) {
      return { id: 'sub-hdtn-shl', name: 'HĐTNHN (Sinh hoạt lớp)' };
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
          room: targetClass.roomNumber || targetClass.name
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

        // Determine columns: Day, Session, Period
        let colDayIdx = -1;
        let colSessionIdx = -1;
        let colPeriodIdx = -1;

        // Check columns before the first class column
        const firstClassCol = Math.min(...Array.from(colClassMap.keys()));
        for (let c = 0; c < firstClassCol; c++) {
          const headerText = String(row[c] || '').trim().toLowerCase();
          if (headerText.includes('thứ') || headerText.includes('ngày') || headerText.includes('thu') || headerText.includes('ngay') || headerText.includes('day')) {
            colDayIdx = c;
          } else if (headerText.includes('buổi') || headerText.includes('buoi') || headerText.includes('session') || headerText.includes('ca')) {
            colSessionIdx = c;
          } else if (headerText.includes('tiết') || headerText.includes('tiet') || headerText.includes('period')) {
            colPeriodIdx = c;
          }
        }

        // Fallbacks if not explicitly named
        if (colDayIdx === -1 && firstClassCol >= 1) colDayIdx = 0;
        if (colPeriodIdx === -1) {
          if (firstClassCol >= 3) {
            colSessionIdx = 1;
            colPeriodIdx = 2;
          } else if (firstClassCol >= 2) {
            colPeriodIdx = 1;
          }
        }

        // Determine default session for this block
        let blockDefaultSession: 'SANG' | 'CHIEU' = 'SANG';

        // Check sheetName for session indicator (e.g. "Khối 10 - Chiều", "TKB Chiều", "Sheet_Chieu")
        const lowerSheetName = sheetName.toLowerCase();
        if (lowerSheetName.includes('chiều') || lowerSheetName.includes('chieu') || lowerSheetName.endsWith('_c') || lowerSheetName.includes(' pm')) {
          blockDefaultSession = 'CHIEU';
        } else if (lowerSheetName.includes('sáng') || lowerSheetName.includes('sang') || lowerSheetName.endsWith('_s') || lowerSheetName.includes(' am')) {
          blockDefaultSession = 'SANG';
        }

        for (let lookback = Math.max(0, r - 6); lookback < r; lookback++) {
          const prevRowText = (rawRows[lookback] || []).join(' ').toLowerCase();
          if (prevRowText.includes('chiều') || prevRowText.includes('chieu')) {
            blockDefaultSession = 'CHIEU';
            break;
          } else if (prevRowText.includes('sáng') || prevRowText.includes('sang')) {
            blockDefaultSession = 'SANG';
            break;
          }
        }

        // If not explicitly declared in rows above, deduce from grade: 6, 7 -> CHIEU
        const blockClasses = Array.from(colClassMap.values());
        const isMostlyGrade67 = blockClasses.every(c => c.grade === '6' || c.grade === '7');
        if (isMostlyGrade67) {
          blockDefaultSession = 'CHIEU';
        }

        let currentDay = 2; // Default Monday (Thứ 2)
        let currentSession: 'SANG' | 'CHIEU' = blockDefaultSession;
        let currentPeriod = 1;
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

          // Check for section divider rows like "BUỔI CHIỀU" or "BUỔI SÁNG"
          if (entireRowText.includes('buổi chiều') || entireRowText.includes('buoi chieu') || (entireRowText.includes('chiều') && !entireRowText.includes('tiết') && !entireRowText.includes('thứ'))) {
            currentSession = 'CHIEU';
            lastSeenPeriod = -1;
            dataRowIdx++;
            continue;
          } else if (entireRowText.includes('buổi sáng') || entireRowText.includes('buoi sang') || (entireRowText.includes('sáng') && !entireRowText.includes('tiết') && !entireRowText.includes('thứ'))) {
            currentSession = 'SANG';
            lastSeenPeriod = -1;
            dataRowIdx++;
            continue;
          }

          // Check if metadata row: "Năm học", "Học kỳ", "Trường", "Áp dụng", "Thời khóa biểu"
          if (entireRowText.includes('năm học') || entireRowText.includes('nam hoc') ||
              entireRowText.includes('học kỳ') || entireRowText.includes('hoc ky') ||
              entireRowText.includes('thời khóa biểu') || entireRowText.includes('thoi khoa bieu') ||
              entireRowText.includes('áp dụng') || entireRowText.includes('ap dung') ||
              (entireRowText.includes('trường') && !entireRowText.includes('lớp'))) {
            dataRowIdx++;
            continue;
          }

          // 1. Detect Day (Thứ 2 -> 7)
          const colDayVal = colDayIdx >= 0 ? String(dRow[colDayIdx] || '').trim() : '';
          const cleanDayVal = colDayVal.toLowerCase().replace(/\s+/g, ' ').trim();
          let matchedDay = -1;
          if (/^(?:thứ|thu|t)?\s*2$|^thứ\s*hai$/i.test(cleanDayVal) || cleanDayVal.includes('thứ 2') || cleanDayVal.includes('thứ hai') || cleanDayVal === '2') matchedDay = 2;
          else if (/^(?:thứ|thu|t)?\s*3$|^thứ\s*ba$/i.test(cleanDayVal) || cleanDayVal.includes('thứ 3') || cleanDayVal.includes('thứ ba') || cleanDayVal === '3') matchedDay = 3;
          else if (/^(?:thứ|thu|t)?\s*4$|^thứ\s*(?:tư|tu)$/i.test(cleanDayVal) || cleanDayVal.includes('thứ 4') || cleanDayVal.includes('thứ tư') || cleanDayVal === '4') matchedDay = 4;
          else if (/^(?:thứ|thu|t)?\s*5$|^thứ\s*(?:năm|nam)$/i.test(cleanDayVal) || cleanDayVal.includes('thứ 5') || cleanDayVal.includes('thứ năm') || cleanDayVal === '5') matchedDay = 5;
          else if (/^(?:thứ|thu|t)?\s*6$|^thứ\s*(?:sáu|sau)$/i.test(cleanDayVal) || cleanDayVal.includes('thứ 6') || cleanDayVal.includes('thứ sáu') || cleanDayVal === '6') matchedDay = 6;
          else if (/^(?:thứ|thu|t)?\s*7$|^thứ\s*(?:bảy|bay)$/i.test(cleanDayVal) || cleanDayVal.includes('thứ 7') || cleanDayVal.includes('thứ bảy') || cleanDayVal === '7') matchedDay = 7;
          else if (/^[2-7]$/.test(cleanDayVal)) matchedDay = parseInt(cleanDayVal, 10);

          if (matchedDay !== -1 && matchedDay !== currentDay) {
            currentDay = matchedDay;
            // Day changed: reset session to the block's base session
            currentSession = blockDefaultSession;
            lastSeenPeriod = -1;
          }

          // Check if Day cell itself contains session indicator: e.g. "Thứ 2 (Chiều)", "2 - C"
          if (cleanDayVal.includes('chiều') || cleanDayVal.includes('chieu') || cleanDayVal.includes('(c)') || cleanDayVal.endsWith('-c')) {
            currentSession = 'CHIEU';
          } else if (cleanDayVal.includes('sáng') || cleanDayVal.includes('sang') || cleanDayVal.includes('(s)') || cleanDayVal.endsWith('-s')) {
            currentSession = 'SANG';
          }

          // 2. Detect Session from session column (Sáng / Chiều / S / C)
          if (colSessionIdx >= 0) {
            const colSessVal = String(dRow[colSessionIdx] || '').trim().toUpperCase();
            if (colSessVal === 'C' || colSessVal.startsWith('CHIỀU') || colSessVal.startsWith('CHIEU') || colSessVal.includes('CHIỀU')) {
              currentSession = 'CHIEU';
            } else if (colSessVal === 'S' || colSessVal.startsWith('SÁNG') || colSessVal.startsWith('SANG') || colSessVal.includes('SÁNG')) {
              currentSession = 'SANG';
            }
          }

          // 3. Detect Period (Tiết 1 -> 10, including S1..S5, C1..C5, 1C..5C)
          let rawPeriod = -1;
          let periodExplicitSession: 'SANG' | 'CHIEU' | null = null;

          if (colPeriodIdx >= 0) {
            const pVal = String(dRow[colPeriodIdx] || '').trim();
            const pMatch = pVal.match(/^(?:Tiết|Tiet|T)?\s*([0-9]|10)$/i);
            if (pMatch) {
              rawPeriod = parseInt(pMatch[1], 10);
            } else {
              // Format C1..C5 or S1..S5
              const csMatch = pVal.match(/^([SC])\s*([1-5])$/i);
              if (csMatch) {
                periodExplicitSession = csMatch[1].toUpperCase() === 'C' ? 'CHIEU' : 'SANG';
                rawPeriod = parseInt(csMatch[2], 10);
              } else {
                const scMatch = pVal.match(/^([1-5])\s*([SC])$/i);
                if (scMatch) {
                  periodExplicitSession = scMatch[2].toUpperCase() === 'C' ? 'CHIEU' : 'SANG';
                  rawPeriod = parseInt(scMatch[1], 10);
                }
              }
            }
          }

          // Fallback: check first columns before first class for period digit 1..10
          if (rawPeriod === -1) {
            for (let c = 0; c < Math.min(firstClassCol, dRow.length); c++) {
              const val = String(dRow[c] || '').trim();
              if (/^(?:10|[1-9])$/.test(val)) {
                rawPeriod = parseInt(val, 10);
                break;
              }
              const cs = val.match(/^([SC])\s*([1-5])$/i);
              if (cs) {
                periodExplicitSession = cs[1].toUpperCase() === 'C' ? 'CHIEU' : 'SANG';
                rawPeriod = parseInt(cs[2], 10);
                break;
              }
            }
          }

          if (rawPeriod === -1 || rawPeriod < 1 || rawPeriod > 10) {
            // Not a valid period row, skip
            dataRowIdx++;
            continue;
          }

          // Determine session and effective period
          let effectivePeriod = rawPeriod;
          let session = currentSession;

          if (periodExplicitSession) {
            session = periodExplicitSession;
            currentSession = session;
          } else if (rawPeriod > 5) {
            // Periods 6..10 are unambiguously afternoon!
            session = 'CHIEU';
            effectivePeriod = rawPeriod - 5;
            currentSession = 'CHIEU';
          } else {
            // Period is 1..5. Check if period sequence reset within the same day
            // E.g. Previous period was 3, 4, 5 and current period is 1 or 2 while still on the same day:
            if (lastSeenPeriod >= 3 && rawPeriod <= 2 && currentSession === 'SANG') {
              session = 'CHIEU';
              currentSession = 'CHIEU';
            }
          }

          lastSeenPeriod = rawPeriod;
          currentPeriod = effectivePeriod;

          // Read cells for each class in this row
          colClassMap.forEach((targetClass, colIdx) => {
            const cellContent = dRow[colIdx];
            if (!cellContent) return;

            const { subjectText, teacherText } = deconstructCellText(cellContent);
            if (!subjectText) return;

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
              room: targetClass.roomNumber || targetClass.name
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
  const detailHeaders = ['Lớp', 'Thứ', 'Buổi', 'Tiết', 'Môn Học', 'Giáo Viên Giảng Dạy', 'Mã GV', 'Phòng Học'];
  const sampleDetailData: any[][] = [
    detailHeaders,
    ['10CB1', 2, 'Sáng', 1, 'Chào cờ', 'Phan Hoàng Tùng', 'Tùng.PH', 'P.101'],
    ['10CB1', 2, 'Sáng', 2, 'Toán học', 'Lê Thị Ngọc Hương', 'Hương.LTN', 'P.101'],
    ['10CB1', 2, 'Sáng', 3, 'HĐTN - HN', 'Phan Hoàng Tùng', 'Tùng.PH', 'P.101'],
    ['6A1', 2, 'Sáng', 1, 'Chào cờ', 'Hồ Thị Ngọc Tài', 'Tài.HTN', 'P.6-1'],
    ['6A1', 2, 'Sáng', 2, 'Toán học', 'Nguyễn Văn Tới', 'Tới.NV', 'P.6-1'],
    ['6A7', 2, 'Sáng', 1, 'Chào cờ', 'Nguyễn Thị Kim Sang', 'Sang.NTK', 'P.6-7'],
    ['6A7', 2, 'Sáng', 2, 'Toán học', 'Trần Văn Nhuận', 'Nhuận.TV', 'P.6-7']
  ];
  const wsDetail = XLSX.utils.aoa_to_sheet(sampleDetailData);
  XLSX.utils.book_append_sheet(wb, wsDetail, 'TKB_DanhSach_ChiTiet');

  XLSX.writeFile(wb, 'Mau_TKB_VietSchool_Chuan.xlsx');
}
