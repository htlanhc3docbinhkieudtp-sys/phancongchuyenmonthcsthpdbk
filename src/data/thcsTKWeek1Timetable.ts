import { TimetableSlot } from '../types';

interface RawSlot {
  d: number; // day: 2 (Mon) to 7 (Sat)
  p: number; // period: 1 to 5
  text: string; // e.g. "TOÁN - Nhuận" or "CHÀO CỜ"
}

// Map of Teacher ID & Full Name & Code based on the official School Staff list for Tân Kiều campus
const TEACHER_MAP: Record<string, { id: string; name: string; code: string }> = {
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

const HOMEROOM_MAP: Record<string, string> = {
  '6A7': 'Sang',
  '6A8': 'Điệp',
  '6A9': 'Diễm',
  '6A10': 'Lụa',
  '7A7': 'Phương',
  '7A8': 'Châu',
  '7A9': 'Chính',
  '8A7': 'Tiến',
  '8A8': 'Phượng',
  '8A9': 'Hậu',
  '8A10': 'Nhuận',
  '9A7': 'Huy',
  '9A8': 'Giàu',
  '9A9': 'Ngân',
  '9A10': 'Tín'
};

function parseSlotText(raw: string, className: string): {
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  teacherCode: string;
  isSpecialActivity?: boolean;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      subjectId: '',
      subjectName: '',
      teacherId: '',
      teacherName: '',
      teacherCode: ''
    };
  }

  // Chào cờ
  if (trimmed === 'CHÀO CỜ' || trimmed.startsWith('CHÀO CỜ')) {
    const gvcnKey = HOMEROOM_MAP[className] || '';
    const teacherInfo = TEACHER_MAP[gvcnKey] || { id: '', name: 'GVCN', code: 'GVCN' };
    return {
      subjectId: 'sub-hdtn',
      subjectName: 'Chào cờ',
      teacherId: teacherInfo.id,
      teacherName: teacherInfo.name,
      teacherCode: teacherInfo.code,
      isSpecialActivity: true
    };
  }

  // Sinh hoạt lớp
  if (trimmed.startsWith('SHL')) {
    const parts = trimmed.split('-');
    const teacherKey = parts.length > 1 ? parts[1].trim() : (HOMEROOM_MAP[className] || '');
    const teacherInfo = TEACHER_MAP[teacherKey] || { id: '', name: 'GVCN', code: 'GVCN' };
    return {
      subjectId: 'sub-shl',
      subjectName: 'Sinh hoạt lớp',
      teacherId: teacherInfo.id,
      teacherName: teacherInfo.name,
      teacherCode: teacherInfo.code,
      isSpecialActivity: true
    };
  }

  // Splitting subject and teacher (e.g. "TOÁN - Nhuận" or "HĐ QML - Diễm")
  let rawSub = trimmed;
  let rawTch = '';

  if (trimmed.includes('-')) {
    const idx = trimmed.lastIndexOf('-');
    rawSub = trimmed.substring(0, idx).trim();
    rawTch = trimmed.substring(idx + 1).trim();
  }

  const teacherInfo = TEACHER_MAP[rawTch] || { id: '', name: rawTch, code: rawTch };

  let subjectId = 'sub-other';
  let subjectName = rawSub;

  const upperSub = rawSub.toUpperCase().replace(/\s+/g, ' ').trim();

  if (upperSub === 'TOÁN' || upperSub === 'TOAN') {
    subjectId = 'sub-toan';
    subjectName = 'Toán học';
  } else if (upperSub === 'VĂN' || upperSub === 'VAN') {
    subjectId = 'sub-van';
    subjectName = 'Ngữ văn';
  } else if (upperSub === 'TA' || upperSub === 'ANH' || upperSub === 'NGOẠI NGỮ') {
    subjectId = 'sub-anh';
    subjectName = 'Tiếng Anh';
  } else if (upperSub === 'KHTN') {
    subjectId = 'sub-khtn-cs';
    subjectName = 'Khoa học tự nhiên';
  } else if (upperSub === 'LÝ' || upperSub === 'LY' || upperSub === 'VẬT LÍ' || upperSub === 'VẬT LÝ') {
    subjectId = 'sub-li';
    subjectName = 'Vật lí';
  } else if (upperSub === 'HOÁ' || upperSub === 'HÓA' || upperSub === 'HOA') {
    subjectId = 'sub-hoa';
    subjectName = 'Hóa học';
  } else if (upperSub === 'SINH' || upperSub === 'SINH HỌC') {
    subjectId = 'sub-sinh';
    subjectName = 'Sinh học';
  } else if (upperSub === 'SỬ' || upperSub === 'SU' || upperSub === 'LỊCH SỬ') {
    subjectId = 'sub-su';
    subjectName = 'Lịch sử';
  } else if (upperSub === 'ĐỊA' || upperSub === 'DIA' || upperSub === 'ĐỊA LÝ' || upperSub === 'ĐỊA LÍ') {
    subjectId = 'sub-dia';
    subjectName = 'Địa lí';
  } else if (upperSub === 'S&Đ' || upperSub === 'S&D' || upperSub === 'LS-ĐL' || upperSub === 'LS&ĐL') {
    subjectId = 'sub-lsdl-cs';
    subjectName = 'Lịch sử và Địa lí';
  } else if (upperSub === 'GDCD') {
    subjectId = 'sub-gdcd';
    subjectName = 'Giáo dục công dân';
  } else if (upperSub === 'TIN' || upperSub === 'TIN HỌC') {
    subjectId = 'sub-tin';
    subjectName = 'Tin học';
  } else if (upperSub === 'CN' || upperSub === 'CÔNG NGHỆ') {
    subjectId = 'sub-cn';
    subjectName = 'Công nghệ';
  } else if (upperSub === 'GDTC' || upperSub === 'THỂ DỤC') {
    subjectId = 'sub-gdtc';
    subjectName = 'Giáo dục thể chất';
  } else if (upperSub === 'AN' || upperSub === 'ÂM NHẠC') {
    subjectId = 'sub-am-nhac';
    subjectName = 'Âm nhạc';
  } else if (upperSub === 'MT' || upperSub === 'MỸ THUẬT') {
    subjectId = 'sub-my-thuat';
    subjectName = 'Mỹ thuật';
  } else if (upperSub.startsWith('SHL') || upperSub.startsWith('SINH HOẠT LỚP')) {
    subjectId = 'sub-shl';
    subjectName = 'Sinh hoạt lớp';
  } else if (upperSub.startsWith('HĐ QML') || upperSub === 'HD QML' || upperSub.startsWith('HĐCN') || upperSub.includes('QUY MÔ LỚP') || upperSub.includes('CHỦ NHIỆM')) {
    subjectId = 'sub-hdtn-cd';
    subjectName = 'HĐTNHN (Quy mô lớp)';
  } else if (upperSub.startsWith('HĐ CĐ') || upperSub === 'HD CD' || upperSub.startsWith('HĐTN') || upperSub.startsWith('HDTN') || upperSub.includes('CHỦ ĐỀ') || upperSub.includes('CHUYÊN ĐỀ')) {
    subjectId = 'sub-hdtn-cd';
    subjectName = 'HĐTNHN (Chuyên đề)';
  } else if (upperSub === 'CHÀO CỜ' || upperSub.startsWith('CHÀO CỜ')) {
    subjectId = 'sub-chao-co';
    subjectName = 'Chào cờ';
  }

  return {
    subjectId,
    subjectName,
    teacherId: teacherInfo.id,
    teacherName: teacherInfo.name,
    teacherCode: teacherInfo.code
  };
}

// ----------------------------------------------------
// IMAGE 1 DATA: Khối 6 (6A7-6A10) & Khối 7 (7A7-7A9) - BUỔI CHIỀU
// ----------------------------------------------------
const rawImage1: Record<string, RawSlot[]> = {
  '6A7': [
    // T2
    { d: 2, p: 1, text: 'TOÁN - Nhuận' },
    { d: 2, p: 2, text: 'TOÁN - Nhuận' },
    { d: 2, p: 3, text: 'HĐ QML - Diễm' },
    { d: 2, p: 4, text: 'VĂN - Vi' },
    { d: 2, p: 5, text: 'CHÀO CỜ' },
    // T3
    { d: 3, p: 1, text: 'KHTN - Lụa' },
    { d: 3, p: 2, text: 'SỬ - Hà' },
    { d: 3, p: 3, text: 'SỬ - Hà' },
    { d: 3, p: 4, text: 'KHTN - Lụa' },
    { d: 3, p: 5, text: 'AN - A.Văn' },
    // T4
    { d: 4, p: 1, text: 'KHTN - Lụa' },
    { d: 4, p: 2, text: 'KHTN - Lụa' },
    { d: 4, p: 3, text: 'MT - Quốc' },
    { d: 4, p: 4, text: 'ĐỊA - Sang' },
    { d: 4, p: 5, text: 'GDTC - Điệp' },
    // T5
    { d: 5, p: 1, text: 'GDCD - Ngân' },
    { d: 5, p: 2, text: 'TA - Thành' },
    { d: 5, p: 3, text: 'VĂN - Vi' },
    { d: 5, p: 4, text: 'VĂN - Vi' },
    // T6
    { d: 6, p: 1, text: 'TOÁN - Nhuận' },
    { d: 6, p: 2, text: 'TOÁN - Nhuận' },
    { d: 6, p: 3, text: 'VĂN - Vi' },
    { d: 6, p: 4, text: 'HĐ CĐ - Diễm' },
    { d: 6, p: 5, text: 'TIN - Hậu' },
    // T7
    { d: 7, p: 1, text: 'TA - Thành' },
    { d: 7, p: 2, text: 'TA - Thành' },
    { d: 7, p: 3, text: 'GDTC - Điệp' },
    { d: 7, p: 4, text: 'CN - Diễm' },
    { d: 7, p: 5, text: 'SHL - Sang' }
  ],

  '6A8': [
    // T2
    { d: 2, p: 1, text: 'SỬ - Hà' },
    { d: 2, p: 2, text: 'KHTN - Lụa' },
    { d: 2, p: 3, text: 'KHTN - Lụa' },
    { d: 2, p: 4, text: 'HĐ CĐ - Diễm' },
    { d: 2, p: 5, text: 'CHÀO CỜ' },
    // T3
    { d: 3, p: 1, text: 'TA - Tuyền' },
    { d: 3, p: 2, text: 'TA - Tuyền' },
    { d: 3, p: 3, text: 'GDTC - Điệp' },
    { d: 3, p: 4, text: 'AN - A.Văn' },
    { d: 3, p: 5, text: 'KHTN - Lụa' },
    // T4
    { d: 4, p: 1, text: 'CN - Diễm' },
    { d: 4, p: 2, text: 'SỬ - Hà' },
    { d: 4, p: 3, text: 'ĐỊA - Sang' },
    { d: 4, p: 4, text: 'VĂN - Vi' },
    { d: 4, p: 5, text: 'VĂN - Vi' },
    // T5
    { d: 5, p: 1, text: 'MT - Quốc' },
    { d: 5, p: 2, text: 'GDCD - Ngân' },
    { d: 5, p: 3, text: 'TOÁN - Nhuận' },
    { d: 5, p: 4, text: 'TOÁN - Nhuận' },
    // T6
    { d: 6, p: 1, text: 'HĐ QML - Diễm' },
    { d: 6, p: 2, text: 'KHTN - Lụa' },
    { d: 6, p: 3, text: 'TA - Tuyền' },
    { d: 6, p: 4, text: 'VĂN - Vi' },
    { d: 6, p: 5, text: 'VĂN - Vi' },
    // T7
    { d: 7, p: 1, text: 'TOÁN - Nhuận' },
    { d: 7, p: 2, text: 'TOÁN - Nhuận' },
    { d: 7, p: 3, text: 'TIN - Hậu' },
    { d: 7, p: 4, text: 'GDTC - Điệp' },
    { d: 7, p: 5, text: 'SHL - Điệp' }
  ],

  '6A9': [
    // T2
    { d: 2, p: 1, text: 'TOÁN - Tín' },
    { d: 2, p: 2, text: 'TOÁN - Tín' },
    { d: 2, p: 3, text: 'KHTN - Phượng' },
    { d: 2, p: 4, text: 'KHTN - Phượng' },
    { d: 2, p: 5, text: 'CHÀO CỜ' },
    // T3
    { d: 3, p: 1, text: 'KHTN - Phượng' },
    { d: 3, p: 2, text: 'KHTN - Phượng' },
    { d: 3, p: 3, text: 'TA - Tuyền' },
    { d: 3, p: 4, text: 'GDTC - Điệp' },
    { d: 3, p: 5, text: 'GDCD - Ngân' },
    // T4
    { d: 4, p: 1, text: 'SỬ - Hà' },
    { d: 4, p: 2, text: 'HĐ CĐ - Diễm' },
    { d: 4, p: 3, text: 'GDTC - Điệp' },
    { d: 4, p: 4, text: 'VĂN - Nhi' },
    { d: 4, p: 5, text: 'VĂN - Nhi' },
    // T5
    { d: 5, p: 1, text: 'VĂN - Nhi' },
    { d: 5, p: 2, text: 'VĂN - Nhi' },
    { d: 5, p: 3, text: 'SỬ - Hà' },
    { d: 5, p: 4, text: 'AN - A.Văn' },
    // T6
    { d: 6, p: 1, text: 'TA - Tuyền' },
    { d: 6, p: 2, text: 'TA - Tuyền' },
    { d: 6, p: 3, text: 'TOÁN - Tín' },
    { d: 6, p: 4, text: 'TOÁN - Tín' },
    { d: 6, p: 5, text: 'MT - Quốc' },
    // T7
    { d: 7, p: 1, text: 'HĐ QML - Diễm' },
    { d: 7, p: 2, text: 'TIN - Hậu' },
    { d: 7, p: 3, text: 'CN - Diễm' },
    { d: 7, p: 4, text: 'ĐỊA - Sang' },
    { d: 7, p: 5, text: 'SHL - Diễm' }
  ],

  '6A10': [
    // T2
    { d: 2, p: 1, text: 'TA - Tuyền' },
    { d: 2, p: 2, text: 'TA - Tuyền' },
    { d: 2, p: 3, text: 'ĐỊA - Sang' },
    { d: 2, p: 4, text: 'TIN - Hậu' },
    { d: 2, p: 5, text: 'CHÀO CỜ' },
    // T3
    { d: 3, p: 1, text: 'TOÁN - Huy' },
    { d: 3, p: 2, text: 'TOÁN - Huy' },
    { d: 3, p: 3, text: 'AN - A.Văn' },
    { d: 3, p: 4, text: 'GDCD - Ngân' },
    { d: 3, p: 5, text: 'GDTC - Điệp' },
    // T4
    { d: 4, p: 1, text: 'MT - Quốc' },
    { d: 4, p: 2, text: 'VĂN - Thảo' },
    { d: 4, p: 3, text: 'VĂN - Thảo' },
    { d: 4, p: 4, text: 'GDTC - Điệp' },
    { d: 4, p: 5, text: 'HĐ CĐ - Lụa' },
    // T5
    { d: 5, p: 1, text: 'SỬ - Hà' },
    { d: 5, p: 2, text: 'SỬ - Hà' },
    { d: 5, p: 3, text: 'VĂN - Thảo' },
    { d: 5, p: 4, text: 'VĂN - Thảo' },
    // T6
    { d: 6, p: 1, text: 'HĐ QML - Lụa' },
    { d: 6, p: 2, text: 'CN - Diễm' },
    { d: 6, p: 3, text: 'KHTN - Lụa' },
    { d: 6, p: 4, text: 'KHTN - Lụa' },
    { d: 6, p: 5, text: 'TA - Tuyền' },
    // T7
    { d: 7, p: 1, text: 'KHTN - Lụa' },
    { d: 7, p: 2, text: 'KHTN - Lụa' },
    { d: 7, p: 3, text: 'TOÁN - Huy' },
    { d: 7, p: 4, text: 'TOÁN - Huy' },
    { d: 7, p: 5, text: 'SHL - Lụa' }
  ],

  '7A7': [
    // T2
    { d: 2, p: 1, text: 'TOÁN - Nga' },
    { d: 2, p: 2, text: 'TOÁN - Nga' },
    { d: 2, p: 3, text: 'TIN - Hậu' },
    { d: 2, p: 4, text: 'HĐ QML - Phương' },
    { d: 2, p: 5, text: 'CHÀO CỜ' },
    // T3
    { d: 3, p: 1, text: 'KHTN - Phương' },
    { d: 3, p: 2, text: 'AN - A.Văn' },
    { d: 3, p: 3, text: 'TA - Bền' },
    { d: 3, p: 4, text: 'S&Đ - Châu' },
    { d: 3, p: 5, text: 'S&Đ - Châu' },
    // T4
    { d: 4, p: 1, text: 'S&Đ - Châu' },
    { d: 4, p: 2, text: 'KHTN - Phương' },
    { d: 4, p: 3, text: 'VĂN - Vi' },
    { d: 4, p: 4, text: 'MT - Quốc' },
    { d: 4, p: 5, text: 'GDTC - Chính' },
    // T5
    { d: 5, p: 1, text: 'VĂN - Vi' },
    { d: 5, p: 2, text: 'VĂN - Vi' },
    { d: 5, p: 3, text: 'TOÁN - Nga' },
    { d: 5, p: 4, text: 'GDCD - Ngân' },
    // T6
    { d: 6, p: 1, text: 'KHTN - Phương' },
    { d: 6, p: 2, text: 'KHTN - Phương' },
    { d: 6, p: 3, text: 'HĐ CĐ - Phương' },
    { d: 6, p: 4, text: 'TA - Bền' },
    { d: 6, p: 5, text: 'CN - Tặt' },
    // T7
    { d: 7, p: 1, text: 'TA - Bền' },
    { d: 7, p: 2, text: 'VĂN - Vi' },
    { d: 7, p: 3, text: 'TOÁN - Nga' },
    { d: 7, p: 4, text: 'GDTC - Chính' },
    { d: 7, p: 5, text: 'SHL - Phương' }
  ],

  '7A8': [
    // T2
    { d: 2, p: 1, text: 'VĂN - Vi' },
    { d: 2, p: 2, text: 'VĂN - Vi' },
    { d: 2, p: 3, text: 'HĐ QML - Tặt' },
    { d: 2, p: 4, text: 'GDTC - Chính' },
    { d: 2, p: 5, text: 'CHÀO CỜ' },
    // T3
    { d: 3, p: 1, text: 'HĐ CĐ - Tặt' },
    { d: 3, p: 2, text: 'GDCD - Ngân' },
    { d: 3, p: 3, text: 'S&Đ - Châu' },
    { d: 3, p: 4, text: 'TA - Bền' },
    { d: 3, p: 5, text: 'KHTN - Phương' },
    // T4
    { d: 4, p: 1, text: 'KHTN - Phương' },
    { d: 4, p: 2, text: 'S&Đ - Châu' },
    { d: 4, p: 3, text: 'S&Đ - Châu' },
    { d: 4, p: 4, text: 'GDTC - Chính' },
    { d: 4, p: 5, text: 'CN - Tặt' },
    // T5
    { d: 5, p: 1, text: 'TOÁN - Nga' },
    { d: 5, p: 2, text: 'TOÁN - Nga' },
    { d: 5, p: 3, text: 'AN - A.Văn' },
    { d: 5, p: 4, text: 'MT - Quốc' },
    // T6
    { d: 6, p: 1, text: 'TA - Bền' },
    { d: 6, p: 2, text: 'TA - Bền' },
    { d: 6, p: 3, text: 'TIN - Hậu' },
    { d: 6, p: 4, text: 'KHTN - Phương' },
    { d: 6, p: 5, text: 'KHTN - Phương' },
    // T7
    { d: 7, p: 1, text: 'TOÁN - Nga' },
    { d: 7, p: 2, text: 'TOÁN - Nga' },
    { d: 7, p: 3, text: 'VĂN - Vi' },
    { d: 7, p: 4, text: 'VĂN - Vi' },
    { d: 7, p: 5, text: 'SHL - Châu' }
  ],

  '7A9': [
    // T2
    { d: 2, p: 1, text: 'S&Đ - Châu' },
    { d: 2, p: 2, text: 'S&Đ - Châu' },
    { d: 2, p: 3, text: 'TOÁN - Nga' },
    { d: 2, p: 4, text: 'HĐ QML - Tặt' },
    { d: 2, p: 5, text: 'CHÀO CỜ' },
    // T3
    { d: 3, p: 1, text: 'TOÁN - Nga' },
    { d: 3, p: 2, text: 'TOÁN - Nga' },
    { d: 3, p: 3, text: 'KHTN - Phương' },
    { d: 3, p: 4, text: 'KHTN - Phương' },
    { d: 3, p: 5, text: 'GDTC - Chính' },
    // T4
    { d: 4, p: 1, text: 'VĂN - Vi' },
    { d: 4, p: 2, text: 'VĂN - Vi' },
    { d: 4, p: 3, text: 'GDTC - Chính' },
    { d: 4, p: 4, text: 'HĐ CĐ - Tặt' },
    { d: 4, p: 5, text: 'MT - Quốc' },
    // T5
    { d: 5, p: 1, text: 'AN - A.Văn' },
    { d: 5, p: 2, text: 'TA - Bền' },
    { d: 5, p: 3, text: 'GDCD - Ngân' },
    { d: 5, p: 4, text: 'TOÁN - Nga' },
    // T6
    { d: 6, p: 1, text: 'VĂN - Vi' },
    { d: 6, p: 2, text: 'VĂN - Vi' },
    { d: 6, p: 3, text: 'CN - Tặt' },
    { d: 6, p: 4, text: 'TIN - Hậu' },
    { d: 6, p: 5, text: 'TA - Bền' },
    // T7
    { d: 7, p: 1, text: 'KHTN - Phương' },
    { d: 7, p: 2, text: 'KHTN - Phương' },
    { d: 7, p: 3, text: 'TA - Bền' },
    { d: 7, p: 4, text: 'S&Đ - Châu' },
    { d: 7, p: 5, text: 'SHL - Chính' }
  ]
};

// ----------------------------------------------------
// IMAGE 2 DATA: Khối 8 (8A7-8A10) & Khối 9 (9A7-9A10) - BUỔI SÁNG
// ----------------------------------------------------
const rawImage2: Record<string, RawSlot[]> = {
  '8A7': [
    // T2
    { d: 2, p: 1, text: 'CHÀO CỜ' },
    { d: 2, p: 2, text: 'TOÁN - Nga' },
    { d: 2, p: 3, text: 'TOÁN - Nga' },
    { d: 2, p: 4, text: 'CN - Tặt' },
    { d: 2, p: 5, text: 'VĂN - Nhi' },
    // T3
    { d: 3, p: 1, text: 'GDTC - Điệp' },
    { d: 3, p: 2, text: 'CN - Tặt' },
    { d: 3, p: 3, text: 'TA - Tuyền' },
    { d: 3, p: 4, text: 'TA - Tuyền' },
    { d: 3, p: 5, text: 'HOÁ - Đ.Văn' },
    // T4
    { d: 4, p: 1, text: 'VĂN - Nhi' },
    { d: 4, p: 2, text: 'VĂN - Nhi' },
    { d: 4, p: 3, text: 'HĐ CĐ - Tiến' },
    { d: 4, p: 4, text: 'GDCD - Ngân' },
    { d: 4, p: 5, text: 'HĐ QML - Tiến' },
    // T5
    { d: 5, p: 1, text: 'GDTC - Điệp' },
    { d: 5, p: 2, text: 'AN - A.Văn' },
    { d: 5, p: 3, text: 'SỬ - Hà' },
    { d: 5, p: 4, text: 'SỬ - Hà' },
    { d: 5, p: 5, text: 'ĐỊA - Sang' },
    // T6
    { d: 6, p: 1, text: 'VĂN - Nhi' },
    { d: 6, p: 2, text: 'TIN - Hậu' },
    { d: 6, p: 3, text: 'LÝ - Phượng' },
    { d: 6, p: 4, text: 'MT - Quốc' },
    { d: 6, p: 5, text: 'TA - Tuyền' },
    // T7
    { d: 7, p: 1, text: 'HOÁ - Đ.Văn' },
    { d: 7, p: 2, text: 'HOÁ - Đ.Văn' },
    { d: 7, p: 3, text: 'TOÁN - Nga' },
    { d: 7, p: 4, text: 'TOÁN - Nga' },
    { d: 7, p: 5, text: 'SHL - Tiến' }
  ],

  '8A8': [
    // T2
    { d: 2, p: 1, text: 'CHÀO CỜ' },
    { d: 2, p: 2, text: 'HĐ QML - Tiến' },
    { d: 2, p: 3, text: 'HOÁ - Đ.Văn' },
    { d: 2, p: 4, text: 'VĂN - Thảo' },
    { d: 2, p: 5, text: 'CN - Tặt' },
    // T3
    { d: 3, p: 1, text: 'AN - A.Văn' },
    { d: 3, p: 2, text: 'GDTC - Điệp' },
    { d: 3, p: 3, text: 'TOÁN - Nga' },
    { d: 3, p: 4, text: 'TOÁN - Nga' },
    { d: 3, p: 5, text: 'CN - Tặt' },
    // T4
    { d: 4, p: 1, text: 'LÝ - Phượng' },
    { d: 4, p: 2, text: 'GDCD - Ngân' },
    { d: 4, p: 3, text: 'SỬ - Hà' },
    { d: 4, p: 4, text: 'HĐ CĐ - Tiến' },
    { d: 4, p: 5, text: 'SỬ - Hà' },
    // T5
    { d: 5, p: 1, text: 'TA - Thành' },
    { d: 5, p: 2, text: 'TA - Thành' },
    { d: 5, p: 3, text: 'GDTC - Điệp' },
    { d: 5, p: 4, text: 'ĐỊA - Sang' },
    { d: 5, p: 5, text: 'TIN - Hậu' },
    // T6
    { d: 6, p: 1, text: 'VĂN - Thảo' },
    { d: 6, p: 2, text: 'VĂN - Thảo' },
    { d: 6, p: 3, text: 'MT - Quốc' },
    { d: 6, p: 4, text: 'HOÁ - Đ.Văn' },
    { d: 6, p: 5, text: 'HOÁ - Đ.Văn' },
    // T7
    { d: 7, p: 1, text: 'TOÁN - Nga' },
    { d: 7, p: 2, text: 'TOÁN - Nga' },
    { d: 7, p: 3, text: 'VĂN - Thảo' },
    { d: 7, p: 4, text: 'TA - Thành' },
    { d: 7, p: 5, text: 'SHL - Phượng' }
  ],

  '8A9': [
    // T2
    { d: 2, p: 1, text: 'CHÀO CỜ' },
    { d: 2, p: 2, text: 'TOÁN - Nhuận' },
    { d: 2, p: 3, text: 'TOÁN - Nhuận' },
    { d: 2, p: 4, text: 'TA - Tuyền' },
    { d: 2, p: 5, text: 'TA - Tuyền' },
    // T3
    { d: 3, p: 1, text: 'HOÁ - Đ.Văn' },
    { d: 3, p: 2, text: 'SỬ - Hà' },
    { d: 3, p: 3, text: 'HĐ QML - Tặt' },
    { d: 3, p: 4, text: 'CN - Tặt' },
    { d: 3, p: 5, text: 'TA - Tuyền' },
    // T4
    { d: 4, p: 1, text: 'CN - Tặt' },
    { d: 4, p: 2, text: 'GDTC - Điệp' },
    { d: 4, p: 3, text: 'VĂN - Nhi' },
    { d: 4, p: 4, text: 'HOÁ - Đ.Văn' },
    { d: 4, p: 5, text: 'LÝ - Phượng' },
    // T5
    { d: 5, p: 1, text: 'AN - A.Văn' },
    { d: 5, p: 2, text: 'GDTC - Điệp' },
    { d: 5, p: 3, text: 'VĂN - Nhi' },
    { d: 5, p: 4, text: 'VĂN - Nhi' },
    { d: 5, p: 5, text: 'MT - Quốc' },
    // T6
    { d: 6, p: 1, text: 'TOÁN - Nhuận' },
    { d: 6, p: 2, text: 'TOÁN - Nhuận' },
    { d: 6, p: 3, text: 'TIN - Hậu' },
    { d: 6, p: 4, text: 'HĐ CĐ - Tặt' },
    { d: 6, p: 5, text: 'VĂN - Nhi' },
    // T7
    { d: 7, p: 1, text: 'ĐỊA - Sang' },
    { d: 7, p: 2, text: 'SỬ - Hà' },
    { d: 7, p: 3, text: 'HOÁ - Đ.Văn' },
    { d: 7, p: 4, text: 'GDCD - Ngân' },
    { d: 7, p: 5, text: 'SHL - Hậu' }
  ],

  '8A10': [
    // T2
    { d: 2, p: 1, text: 'CHÀO CỜ' },
    { d: 2, p: 2, text: 'HOÁ - Đ.Văn' },
    { d: 2, p: 3, text: 'TA - Thành' },
    { d: 2, p: 4, text: 'SỬ - Hà' },
    { d: 2, p: 5, text: 'SỬ - Hà' },
    // T3
    { d: 3, p: 1, text: 'CN - Tặt' },
    { d: 3, p: 2, text: 'AN - A.Văn' },
    { d: 3, p: 3, text: 'GDTC - Điệp' },
    { d: 3, p: 4, text: 'HOÁ - Đ.Văn' },
    { d: 3, p: 5, text: 'GDCD - Ngân' },
    // T4
    { d: 4, p: 1, text: 'GDTC - Điệp' },
    { d: 4, p: 2, text: 'HĐ QML - Tặt' },
    { d: 4, p: 3, text: 'HOÁ - Đ.Văn' },
    { d: 4, p: 4, text: 'LÝ - Phượng' },
    { d: 4, p: 5, text: 'HĐ CĐ - Tặt' },
    // T5
    { d: 5, p: 1, text: 'MT - Quốc' },
    { d: 5, p: 2, text: 'VĂN - Thảo' },
    { d: 5, p: 3, text: 'VĂN - Thảo' },
    { d: 5, p: 4, text: 'TOÁN - Nhuận' },
    { d: 5, p: 5, text: 'TOÁN - Nhuận' },
    // T6
    { d: 6, p: 1, text: 'TIN - Hậu' },
    { d: 6, p: 2, text: 'CN - Tặt' },
    { d: 6, p: 3, text: 'VĂN - Thảo' },
    { d: 6, p: 4, text: 'TA - Thành' },
    { d: 6, p: 5, text: 'TA - Thành' },
    // T7
    { d: 7, p: 1, text: 'VĂN - Thảo' },
    { d: 7, p: 2, text: 'ĐỊA - Sang' },
    { d: 7, p: 3, text: 'TOÁN - Nhuận' },
    { d: 7, p: 4, text: 'TOÁN - Nhuận' },
    { d: 7, p: 5, text: 'SHL - Nhuận' }
  ],

  '9A7': [
    // T2
    { d: 2, p: 1, text: 'CHÀO CỜ' },
    { d: 2, p: 2, text: 'TIN - Hậu' },
    { d: 2, p: 3, text: 'TOÁN - Huy' },
    { d: 2, p: 4, text: 'HOÁ - Giàu' },
    { d: 2, p: 5, text: 'VĂN - Thảo' },
    // T3
    { d: 3, p: 1, text: 'GDTC - Chính' },
    { d: 3, p: 2, text: 'SINH - Giàu' },
    { d: 3, p: 3, text: 'ĐỊA - Châu' },
    { d: 3, p: 4, text: 'HĐ CĐ - Tòng' },
    { d: 3, p: 5, text: 'HĐ QML - Tòng' },
    // T4
    { d: 4, p: 1, text: 'VĂN - Thảo' },
    { d: 4, p: 2, text: 'VĂN - Thảo' },
    { d: 4, p: 3, text: 'CN - Diễm' },
    { d: 4, p: 4, text: 'SỬ - Hà' },
    { d: 4, p: 5, text: 'GDCD - Ngân' },
    // T5
    { d: 5, p: 1, text: 'GDTC - Chính' },
    { d: 5, p: 2, text: 'SỬ - Hà' },
    { d: 5, p: 3, text: 'TA - Thành' },
    { d: 5, p: 4, text: 'AN - A.Văn' },
    // T6
    { d: 6, p: 1, text: 'MT - Quốc' },
    { d: 6, p: 2, text: 'LÝ - Phượng' },
    { d: 6, p: 3, text: 'HOÁ - Giàu' },
    { d: 6, p: 4, text: 'HOÁ - Giàu' },
    { d: 6, p: 5, text: 'VĂN - Thảo' },
    // T7
    { d: 7, p: 1, text: 'TA - Thành' },
    { d: 7, p: 2, text: 'TA - Thành' },
    { d: 7, p: 3, text: 'TOÁN - Huy' },
    { d: 7, p: 4, text: 'TOÁN - Huy' },
    { d: 7, p: 5, text: 'SHL - Huy' }
  ],

  '9A8': [
    // T2
    { d: 2, p: 1, text: 'CHÀO CỜ' },
    { d: 2, p: 2, text: 'TOÁN - Tín' },
    { d: 2, p: 3, text: 'VĂN - Nhi' },
    { d: 2, p: 4, text: 'VĂN - Nhi' },
    { d: 2, p: 5, text: 'HOÁ - Giàu' },
    // T3
    { d: 3, p: 1, text: 'TA - Thành' },
    { d: 3, p: 2, text: 'TA - Thành' },
    { d: 3, p: 3, text: 'GDCD - Ngân' },
    { d: 3, p: 4, text: 'HĐ CĐ - Giàu' },
    { d: 3, p: 5, text: 'HĐ QML - Giàu' },
    // T4
    { d: 4, p: 1, text: 'MT - Quốc' },
    { d: 4, p: 2, text: 'GDTC - Chính' },
    { d: 4, p: 3, text: 'LÝ - Phượng' },
    { d: 4, p: 4, text: 'VĂN - Nhi' },
    { d: 4, p: 5, text: 'HOÁ - Giàu' },
    // T5
    { d: 5, p: 1, text: 'TOÁN - Tín' },
    { d: 5, p: 2, text: 'TOÁN - Tín' },
    { d: 5, p: 3, text: 'AN - A.Văn' },
    { d: 5, p: 4, text: 'TIN - Hậu' },
    // T6
    { d: 6, p: 1, text: 'TOÁN - Tín' },
    { d: 6, p: 2, text: 'VĂN - Nhi' },
    { d: 6, p: 3, text: 'TA - Thành' },
    { d: 6, p: 4, text: 'CN - Diễm' },
    { d: 6, p: 5, text: 'SINH - Giàu' },
    // T7
    { d: 7, p: 1, text: 'GDTC - Chính' },
    { d: 7, p: 2, text: 'ĐỊA - Châu' },
    { d: 7, p: 3, text: 'SỬ - Hà' },
    { d: 7, p: 4, text: 'HOÁ - Giàu' },
    { d: 7, p: 5, text: 'SHL - Giàu' }
  ],

  '9A9': [
    // T2
    { d: 2, p: 1, text: 'CHÀO CỜ' },
    { d: 2, p: 2, text: 'VĂN - Nhi' },
    { d: 2, p: 3, text: 'HOÁ - Giàu' },
    { d: 2, p: 4, text: 'TOÁN - Huy' },
    { d: 2, p: 5, text: 'TOÁN - Huy' },
    // T3
    { d: 3, p: 1, text: 'HOÁ - Giàu' },
    { d: 3, p: 2, text: 'GDCD - Ngân' },
    { d: 3, p: 3, text: 'SỬ - Hà' },
    { d: 3, p: 4, text: 'SỬ - Hà' },
    { d: 3, p: 5, text: 'ĐỊA - Châu' },
    // T4
    { d: 4, p: 1, text: 'HOÁ - Giàu' },
    { d: 4, p: 2, text: 'SINH - Giàu' },
    { d: 4, p: 3, text: 'HĐ QML - Tặt' },
    { d: 4, p: 4, text: 'HĐ CĐ - Tặt' },
    { d: 4, p: 5, text: 'VĂN - Nhi' },
    // T5
    { d: 5, p: 1, text: 'TOÁN - Huy' },
    { d: 5, p: 2, text: 'TOÁN - Huy' },
    { d: 5, p: 3, text: 'GDTC - Chính' },
    { d: 5, p: 4, text: 'MT - Quốc' },
    // T6
    { d: 6, p: 1, text: 'TA - Thành' },
    { d: 6, p: 2, text: 'TA - Thành' },
    { d: 6, p: 3, text: 'CN - Diễm' },
    { d: 6, p: 4, text: 'VĂN - Nhi' },
    { d: 6, p: 5, text: 'TIN - Hậu' },
    // T7
    { d: 7, p: 1, text: 'AN - A.Văn' },
    { d: 7, p: 2, text: 'GDTC - Chính' },
    { d: 7, p: 3, text: 'TA - Thành' },
    { d: 7, p: 4, text: 'LÝ - Phượng' },
    { d: 7, p: 5, text: 'SHL - Ngân' }
  ],

  '9A10': [
    // T2
    { d: 2, p: 1, text: 'CHÀO CỜ' },
    { d: 2, p: 2, text: 'TA - Thành' },
    { d: 2, p: 3, text: 'TOÁN - Tín' },
    { d: 2, p: 4, text: 'HOÁ - Đ.Văn' },
    { d: 2, p: 5, text: 'HOÁ - Đ.Văn' },
    // T3
    { d: 3, p: 1, text: 'ĐỊA - Châu' },
    { d: 3, p: 2, text: 'GDTC - Chính' },
    { d: 3, p: 3, text: 'TA - Thành' },
    { d: 3, p: 4, text: 'GDCD - Ngân' },
    { d: 3, p: 5, text: 'SỬ - Hà' },
    // T4
    { d: 4, p: 1, text: 'HOÁ - Đ.Văn' },
    { d: 4, p: 2, text: 'CN - Diễm' },
    { d: 4, p: 3, text: 'SINH - Giàu' },
    { d: 4, p: 4, text: 'VĂN - Thảo' },
    { d: 4, p: 5, text: 'VĂN - Thảo' },
    // T5
    { d: 5, p: 1, text: 'VĂN - Thảo' },
    { d: 5, p: 2, text: 'GDTC - Chính' },
    { d: 5, p: 3, text: 'MT - Quốc' },
    { d: 5, p: 4, text: 'TA - Thành' },
    // T6
    { d: 6, p: 1, text: 'LÝ - Phượng' },
    { d: 6, p: 2, text: 'TOÁN - Tín' },
    { d: 6, p: 3, text: 'HĐ CĐ - Tặt' },
    { d: 6, p: 4, text: 'VĂN - Thảo' },
    { d: 6, p: 5, text: 'HĐ QML - Tặt' },
    // T7
    { d: 7, p: 1, text: 'TOÁN - Tín' },
    { d: 7, p: 2, text: 'TOÁN - Tín' },
    { d: 7, p: 3, text: 'TIN - Hậu' },
    { d: 7, p: 4, text: 'SỬ - Hà' },
    { d: 7, p: 5, text: 'SHL - Tín' }
  ]
};

function buildClassSchedule(
  classId: string,
  className: string,
  session: 'SANG' | 'CHIEU',
  rawSchedule: RawSlot[]
): TimetableSlot[] {
  const slots: TimetableSlot[] = [];
  const scheduleMap = new Map<string, string>();

  rawSchedule.forEach(item => {
    scheduleMap.set(`${item.d}_${item.p}`, item.text);
  });

  for (let day = 2; day <= 7; day++) {
    for (let period = 1; period <= 5; period++) {
      const key = `${day}_${period}`;
      const text = scheduleMap.get(key) || '';
      const parsed = parseSlotText(text, className);

      slots.push({
        id: `${classId}_${day}_${session}_${period}`,
        classId,
        className,
        dayOfWeek: day,
        session,
        period,
        subjectId: parsed.subjectId,
        subjectName: parsed.subjectName,
        teacherId: parsed.teacherId,
        teacherName: parsed.teacherName,
        teacherCode: parsed.teacherCode,
        room: '',
        isSpecialActivity: parsed.isSpecialActivity
      });
    }
  }

  return slots;
}

/**
 * Builds all official slots for Điểm Tân Kiều (15 classes: 6A7-6A10, 7A7-7A9, 8A7-8A10, 9A7-9A10)
 */
export function buildTHCSTKWeek1Slots(): TimetableSlot[] {
  const slots: TimetableSlot[] = [];

  // Image 1: 6A7 - 6A10 & 7A7 - 7A9 (Buổi Chiều)
  Object.entries(rawImage1).forEach(([className, rawSchedule]) => {
    const classId = `cls-${className.toLowerCase()}`;
    slots.push(...buildClassSchedule(classId, className, 'CHIEU', rawSchedule));
  });

  // Image 2: 8A7 - 8A10 & 9A7 - 9A10 (Buổi Sáng)
  Object.entries(rawImage2).forEach(([className, rawSchedule]) => {
    const classId = `cls-${className.toLowerCase()}`;
    slots.push(...buildClassSchedule(classId, className, 'SANG', rawSchedule));
  });

  return slots;
}
