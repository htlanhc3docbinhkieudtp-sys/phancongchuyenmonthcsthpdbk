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
  'Sơn': { id: 'tch-ls-2', name: 'Trịnh Văn Sơn', code: 'Sơn.TV' },
  'Hòa': { id: 'tch-ls-6', name: 'Trần Phước Hòa', code: 'Hòa.TP' },
  'Tuấn': { id: 'tch-ls-7', name: 'Ngô Anh Tuấn', code: 'Tuấn.NA' },
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
  'Nghĩa': { id: 'tch-v-2', name: 'Trương Văn Nghĩa', code: 'Nghĩa.TV' },
  'Lâm': { id: 'tch-v-8', name: 'Phạm Thanh Lâm', code: 'Lâm.PT' },
  'Xoa': { id: 'tch-v-9', name: 'Nguyễn Thị Kim Xoa', code: 'Xoa.NTK' },
  'Dương': { id: 'tch-v-10', name: 'Hứa Thùy Dương', code: 'Dương.HT' },
  'An': { id: 'tch-v-11', name: 'Lê Thị Hoài An', code: 'An.LTH' },
  'Thúy': { id: 'tch-ls-1', name: 'Lê Hồng Thủy', code: 'Thủy.LH' },
  'Lê The': { id: 'tch-ls-9', name: 'Lê Thị Kim The', code: 'The.LTK' },
  'Tân': { id: 'tch-ls-10', name: 'Nguyễn Quốc Tấn', code: 'Tấn.NQ' },
  'Đỉnh': { id: 'tch-ls-11', name: 'Nguyễn Thị Kim Đỉnh', code: 'Đỉnh.NTK' },
  'Lý': { id: 'tch-ls-12', name: 'Nguyễn Thị Lý', code: 'Lý.NT' },
  'Xe': { id: 'tch-ls-13', name: 'Nguyễn Thị Xe', code: 'Xe.NT' },
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
  'Khanh': { id: 'tch-av-3', name: 'Nguyễn Thị Mai Khanh', code: 'Khanh.NTM' },
  'Đào': { id: 'tch-av-10', name: 'Nguyễn Thị Như Đào', code: 'Đào.NTN' },
  'Huỳnh Như': { id: 'tch-av-11', name: 'Nguyễn Huỳnh Như', code: 'Như.NH' },
  'Huyền': { id: 'tch-av-12', name: 'Nguyễn Thị Ngọc Huyền', code: 'Huyền.NTN' },
  'Chi': { id: 'tch-av-13', name: 'Lê Thị Mỹ Chi', code: 'Chi.LTM' },
  'Ngọc Như': { id: 'tch-av-14', name: 'Trần Ngọc Như', code: 'Như.TN' },
  'Ẩn': { id: 'tch-td-6', name: 'Nguyễn Văn Ẩn', code: 'Ẩn.NV' },
  'Lưu': { id: 'tch-td-7', name: 'Lê Thanh Lưu', code: 'Lưu.LT' },
  'Hận': { id: 'tch-td-8', name: 'Nguyễn Quốc Hận', code: 'Hận.NQ' },
  'Nguyên': { id: 'tch-td-9', name: 'Nguyễn Thị Thảo Nguyên', code: 'Nguyên.NTT' }
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
  '12CB1': 'Lắm', '12CB2': 'Tuấn', '12CB3': 'VToàn', '12CB4': 'Trang', '12CB5': 'Sơn',
  // THCS DBK
  '6A1': 'Tài', '6A2': 'Thắm', '6A3': 'Ngọc Như', '6A4': 'Hận', '6A5': 'Lê Ngân', '6A6': 'Lê Bình',
  '7A1': 'Ngoan', '7A2': 'Chi', '7A3': 'Nguyễn', '7A4': 'Ẩn', '7A5': 'Thị Hiếu', '7A6': 'Cẩm',
  '8A1': 'Thái Hùng', '8A2': 'Hải', '8A3': 'Huyền', '8A4': 'Nguyễn Ngân', '8A5': 'H Toàn', '8A6': 'Lưu',
  '9A1': 'Nhung', '9A2': 'Thị Hậu', '9A3': 'Lang', '9A4': 'Văn Tài', '9A5': 'Huỳnh Như', '9A6': 'Phương',
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

  // 2. VietSchool THPT mapping: 10A1 -> 10CB1, 10C1 -> 10CB1, 10-1 -> 10CB1
  const thptMatch = upper.match(/^(10|11|12)(?:CB|A|C|T|V|\/|-)?(\d+)$/);
  if (thptMatch) {
    const grade = thptMatch[1];
    const num = thptMatch[2];
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
  if (THPT_TEACHER_LOOKUP[clean]) return THPT_TEACHER_LOOKUP[clean];
  if (THCS_DBK_TEACHER_LOOKUP[clean]) return THCS_DBK_TEACHER_LOOKUP[clean];
  if (THCS_TK_TEACHER_LOOKUP[clean]) return THCS_TK_TEACHER_LOOKUP[clean];

  // 3. Dot code matching (e.g. "Hương.LTN" or "LTN.Hương" or "Kiều.ĐT")
  if (clean.includes('.')) {
    const parts = clean.split('.');
    const p1 = parts[0].trim().toLowerCase();
    const p2 = parts[1]?.trim().toLowerCase() || '';

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
    return lastName === lower;
  });

  if (byGivenName.length === 1) {
    return { id: byGivenName[0].id, name: byGivenName[0].name, code: byGivenName[0].code };
  } else if (byGivenName.length > 1) {
    // Disambiguate by campus
    if (targetClass) {
      const campusMatch = byGivenName.find(t => t.campus === targetClass.campus);
      if (campusMatch) return { id: campusMatch.id, name: campusMatch.name, code: campusMatch.code };
    }
    // Pick the first one
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
  if (upper.startsWith('SHL') || upper.startsWith('SINH HOẠT LỚP') || upper === 'HĐCN' || upper === 'HĐ QML' || upper.includes('QUY MÔ LỚP')) {
    if (isTHCS) {
      return { id: 'sub-hdtn-shl', name: 'HĐTNHN (Sinh hoạt lớp)' };
    }
    return { id: 'sub-shl', name: 'Sinh hoạt lớp' };
  }

  // 3. Hoạt động trải nghiệm (HĐTN)
  if (upper.startsWith('HĐ CĐ') || upper.startsWith('HĐTN') || upper.startsWith('HĐ TN') || upper.includes('CHỦ ĐỀ') || upper.includes('CHUYÊN ĐỀ') || upper.includes('TRẢI NGHIỆM')) {
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
    return { id: 'sub-li', name: 'Vật lí' };
  }
  if (upper === 'HÓA HỌC' || upper === 'HOÁ HỌC' || upper === 'HÓA' || upper === 'HOÁ') {
    return { id: 'sub-hoa', name: 'Hóa học' };
  }
  if (upper === 'SINH HỌC' || upper === 'SINH') {
    return { id: 'sub-sinh', name: 'Sinh học' };
  }
  if (upper === 'KHTN' || upper === 'KHOA HỌC TỰ NHIÊN') {
    return { id: 'sub-khtn-cs', name: 'Khoa học tự nhiên' };
  }
  if (upper === 'LỊCH SỬ' || upper === 'SỬ' || upper === 'SU') {
    return { id: 'sub-su', name: 'Lịch sử' };
  }
  if (upper === 'ĐỊA LÍ' || upper === 'ĐỊA LÝ' || upper === 'ĐỊA') {
    return { id: 'sub-dia', name: 'Địa lí' };
  }
  if (upper === 'LỊCH SỬ VÀ ĐỊA LÍ' || upper === 'LS-ĐL' || upper === 'LS&ĐL' || upper === 'S&Đ') {
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
 * Deconstructs a cell string from VietSchool (e.g. "Toán-Hương", "Toán\nHương", "Toán (Hương)")
 */
export function deconstructCellText(cellValue: any): { subjectText: string; teacherText: string } {
  if (cellValue === null || cellValue === undefined) {
    return { subjectText: '', teacherText: '' };
  }

  let text = String(cellValue).trim();
  if (!text || text === '-' || text === 'x' || text === 'X' || text === ' nghỉ') {
    return { subjectText: '', teacherText: '' };
  }

  // 1. Newline separated: "Toán\nNguyễn Văn A"
  if (text.includes('\n')) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      return { subjectText: lines[0], teacherText: lines[1].replace(/[()]/g, '').trim() };
    }
    return { subjectText: lines[0], teacherText: '' };
  }

  // 2. Parenthesis notation: "Toán (Hương)" or "Toán(Hương.LTN)"
  const parenMatch = text.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (parenMatch) {
    return {
      subjectText: parenMatch[1].trim(),
      teacherText: parenMatch[2].trim()
    };
  }

  // 3. Hyphen notation: "Toán - Hương" or "Chào cờ-Tùng"
  // Note: Some subjects have hyphen inside: "GD QP-AN", "HĐ TN-HN", "LS-ĐL"
  if (text.includes('-')) {
    const lastHyphen = text.lastIndexOf('-');
    const leftPart = text.substring(0, lastHyphen).trim();
    const rightPart = text.substring(lastHyphen + 1).trim();

    // Check if right part is just part of subject name (e.g. AN in GD QP-AN, or HN in HĐ TN-HN)
    const upperRight = rightPart.toUpperCase();
    if (upperRight === 'AN' || upperRight === 'HN' || upperRight === 'ĐL' || upperRight === 'PL') {
      return { subjectText: text, teacherText: '' };
    }

    return { subjectText: leftPart, teacherText: rightPart };
  }

  // Just subject name alone
  return { subjectText: text, teacherText: '' };
}

/**
 * Universal VietSchool Timetable Parser
 * Parses any VietSchool Excel file, CSV, TSV or pasted content
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
    if (typeof fileData === 'string') {
      const trimmed = fileData.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        // Raw JSON
        const rawJson = JSON.parse(trimmed);
        const arrayRows = Array.isArray(rawJson) ? rawJson : [rawJson];
        const ws = XLSX.utils.json_to_sheet(arrayRows);
        workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, ws, 'JSON_Data');
      } else {
        // Tab-delimited (TSV) or CSV pasted text
        const rows = trimmed.split(/\r?\n/).map(line => {
          if (line.includes('\t')) return line.split('\t');
          return line.split(',');
        });
        const ws = XLSX.utils.aoa_to_sheet(rows);
        workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, ws, 'Pasted_Data');
      }
    } else {
      workbook = XLSX.read(fileData, { type: 'buffer' });
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

  // Iterate over all sheets in the workbook
  sheetNames.forEach(sheetName => {
    const ws = workbook.Sheets[sheetName];
    if (!ws) return;

    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!rawRows || rawRows.length === 0) return;

    // Determine layout of this sheet:
    // Format A: Matrix by Class columns (VietSchool main format)
    // Scan rows 0 to 15 to find a row where multiple cells are recognized class names
    let classHeaderRowIndex = -1;
    let colClassMap = new Map<number, ClassGroup>();

    for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      let matchCount = 0;
      const tempMap = new Map<number, ClassGroup>();

      for (let c = 0; c < row.length; c++) {
        const cellVal = String(row[c] || '').trim();
        if (!cellVal) continue;
        const matched = matchClass(cellVal, classes);
        if (matched) {
          matchCount++;
          tempMap.set(c, matched);
        }
      }

      // If at least 3 classes match in a row, this is definitely the Class Header row!
      if (matchCount >= 2 && matchCount > colClassMap.size) {
        classHeaderRowIndex = r;
        colClassMap = tempMap;
      }
    }

    // A. If Class-by-Column Matrix is detected
    if (classHeaderRowIndex >= 0 && colClassMap.size > 0) {
      detectedFormat = 'VietSchool - Ma trận Lớp theo cột';
      let currentDay = 2; // Default Monday (Thứ 2)
      let currentPeriod = 1;

      colClassMap.forEach(cg => recognizedClassNames.add(cg.name));

      // Scan rows below the header
      for (let r = classHeaderRowIndex + 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0) continue;

        // Check first 3 columns for Day and Period indicators
        const col0 = String(row[0] || '').trim();
        const col1 = String(row[1] || '').trim();
        const col2 = String(row[2] || '').trim();

        // 1. Detect Day (Thứ 2 -> 7)
        const dayCandidates = `${col0} ${col1} ${col2}`;
        const dayMatch = dayCandidates.match(/(?:Thứ|Thu|T)\s*([2-7]|Hai|Ba|Tư|Tu|Năm|Nam|Sáu|Sau|Bảy|Bay)/i);
        if (dayMatch) {
          const rawDay = dayMatch[1].toLowerCase();
          if (rawDay === '2' || rawDay === 'hai') currentDay = 2;
          else if (rawDay === '3' || rawDay === 'ba') currentDay = 3;
          else if (rawDay === '4' || rawDay === 'tư' || rawDay === 'tu') currentDay = 4;
          else if (rawDay === '5' || rawDay === 'năm' || rawDay === 'nam') currentDay = 5;
          else if (rawDay === '6' || rawDay === 'sáu' || rawDay === 'sau') currentDay = 6;
          else if (rawDay === '7' || rawDay === 'bảy' || rawDay === 'bay') currentDay = 7;
        }

        // 2. Detect Period (Tiết 1 -> 5)
        const periodMatch = `${col0} ${col1} ${col2}`.match(/(?:Tiết|Tiet|T|P)\s*([1-5])/i);
        if (periodMatch) {
          currentPeriod = parseInt(periodMatch[1], 10);
        } else {
          // If no explicit period text, check if col0 or col1 is just a single digit 1..5
          const digit0 = parseInt(col0, 10);
          const digit1 = parseInt(col1, 10);
          if (!isNaN(digit1) && digit1 >= 1 && digit1 <= 5) {
            currentPeriod = digit1;
          } else if (!isNaN(digit0) && digit0 >= 1 && digit0 <= 5) {
            currentPeriod = digit0;
          }
        }

        const session: 'SANG' | 'CHIEU' = currentPeriod > 5 ? 'CHIEU' : 'SANG';
        const effectivePeriod = currentPeriod > 5 ? currentPeriod - 5 : currentPeriod;

        // Now read cells for each class column
        colClassMap.forEach((targetClass, colIdx) => {
          const cellContent = row[colIdx];
          if (!cellContent) return;

          const { subjectText, teacherText } = deconstructCellText(cellContent);
          if (!subjectText) return;

          // Match subject
          const matchedSubject = matchSubject(subjectText, subjects, targetClass);

          // Match teacher
          let matchedTeacher = matchTeacher(teacherText, teachers, targetClass);

          // If no teacher specified for Chào cờ or SHL, assign homeroom teacher
          if (!matchedTeacher && (matchedSubject.id === 'sub-chao-co' || matchedSubject.id === 'sub-shl' || matchedSubject.name.includes('Sinh hoạt'))) {
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

          slots.push({
            id: `${targetClass.id}_${currentDay}_${session}_${effectivePeriod}`,
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
          });
        });
      }
      return;
    }

    // B. Check for Flat List format (Columns: Lớp, Thứ, Tiết, Môn, Giáo viên)
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

        slots.push({
          id: `${targetClass.id}_${dayVal}_${session}_${effectivePeriod}`,
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
        });
      }
      return;
    }

    // C. Check for Per-Class Block format (Từng bảng nhỏ cho mỗi lớp trong cùng 1 sheet)
    // Looking for "LỚP: 10CB1" or "LỚP 6A1"
    for (let r = 0; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      for (let c = 0; c < row.length; c++) {
        const cellText = String(row[c] || '').trim();
        const classHeaderMatch = cellText.match(/LỚP\s*[:\s]\s*([A-Z0-9\/]+)/i);
        if (classHeaderMatch) {
          const matchedClass = matchClass(classHeaderMatch[1], classes);
          if (matchedClass) {
            recognizedClassNames.add(matchedClass.name);
            detectedFormat = 'VietSchool - Bảng chi tiết từng lớp';

            // Find days row in the next 3 rows
            let dayRowIdx = -1;
            const dayColMap = new Map<number, number>(); // colIdx -> day (2..7)
            for (let dr = r + 1; dr <= Math.min(rawRows.length - 1, r + 4); dr++) {
              const dRow = rawRows[dr];
              if (!dRow) continue;
              for (let dc = 0; dc < dRow.length; dc++) {
                const dText = String(dRow[dc] || '').toLowerCase();
                if (dText.includes('hai') || dText === 'thứ 2' || dText === 't2' || dText === '2') dayColMap.set(dc, 2);
                else if (dText.includes('ba') || dText === 'thứ 3' || dText === 't3' || dText === '3') dayColMap.set(dc, 3);
                else if (dText.includes('tư') || dText.includes('tu') || dText === 'thứ 4' || dText === 't4' || dText === '4') dayColMap.set(dc, 4);
                else if (dText.includes('năm') || dText.includes('nam') || dText === 'thứ 5' || dText === 't5' || dText === '5') dayColMap.set(dc, 5);
                else if (dText.includes('sáu') || dText.includes('sau') || dText === 'thứ 6' || dText === 't6' || dText === '6') dayColMap.set(dc, 6);
                else if (dText.includes('bảy') || dText.includes('bay') || dText === 'thứ 7' || dText === 't7' || dText === '7') dayColMap.set(dc, 7);
              }
              if (dayColMap.size >= 4) {
                dayRowIdx = dr;
                break;
              }
            }

            if (dayRowIdx >= 0 && dayColMap.size > 0) {
              // Read period rows (Tiết 1..5)
              for (let pr = dayRowIdx + 1; pr <= Math.min(rawRows.length - 1, dayRowIdx + 12); pr++) {
                const pRow = rawRows[pr];
                if (!pRow) continue;
                // Check if new class starts
                const checkNewClass = String(pRow[0] || '').trim();
                if (checkNewClass.toLowerCase().includes('lớp')) break;

                const pMatch = String(pRow[0] || pRow[1] || '').match(/([1-5])/);
                const periodNum = pMatch ? parseInt(pMatch[1], 10) : (pr - dayRowIdx);
                if (periodNum < 1 || periodNum > 5) continue;

                dayColMap.forEach((day, col) => {
                  const content = pRow[col];
                  if (!content) return;
                  const { subjectText, teacherText } = deconstructCellText(content);
                  if (!subjectText) return;

                  const sub = matchSubject(subjectText, subjects, matchedClass);
                  const tch = matchTeacher(teacherText, teachers, matchedClass);

                  slots.push({
                    id: `${matchedClass.id}_${day}_SANG_${periodNum}`,
                    classId: matchedClass.id,
                    className: matchedClass.name,
                    dayOfWeek: day,
                    session: 'SANG',
                    period: periodNum,
                    subjectId: sub.id,
                    subjectName: sub.name,
                    teacherId: tch?.id || '',
                    teacherName: tch?.name || teacherText,
                    teacherCode: tch?.code || teacherText,
                    room: matchedClass.roomNumber || matchedClass.name
                  });
                });
              }
            }
          }
        }
      }
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
