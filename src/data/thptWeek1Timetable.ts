import { TimetableSlot } from '../types';

interface RawSlotDef {
  classId: string;
  className: string;
  day: number;
  period: number;
  subjectName: string;
  subjectId: string;
  teacherName: string;
  teacherCode: string;
  teacherId: string;
  room: string;
  isSpecial?: boolean;
}

// Teacher code lookup dictionary with full names, codes and IDs
export const THPT_TEACHER_LOOKUP: Record<string, { id: string; name: string; code: string }> = {
  'CToàn': { id: 'tch-t-5', name: 'Lê Cao Toàn', code: 'Toàn.LC' },
  'Lê Cao Toàn': { id: 'tch-t-5', name: 'Lê Cao Toàn', code: 'Toàn.LC' },
  'Toàn.LC': { id: 'tch-t-5', name: 'Lê Cao Toàn', code: 'Toàn.LC' },

  'VToàn': { id: 'tch-t-6', name: 'Lê Văn Toàn', code: 'Toàn.LV' },
  'Lê Văn Toàn': { id: 'tch-t-6', name: 'Lê Văn Toàn', code: 'Toàn.LV' },
  'Toàn.LV': { id: 'tch-t-6', name: 'Lê Văn Toàn', code: 'Toàn.LV' },

  'Tới': { id: 'tch-t-1', name: 'Nguyễn Văn Tới', code: 'Tới.NV (TT)' },
  'Nguyễn Văn Tới': { id: 'tch-t-1', name: 'Nguyễn Văn Tới', code: 'Tới.NV (TT)' },
  'Tới.NV': { id: 'tch-t-1', name: 'Nguyễn Văn Tới', code: 'Tới.NV (TT)' },

  'Giang': { id: 'tch-t-4', name: 'Trần Văn Giang', code: 'Giang.TV' },
  'Trần Văn Giang': { id: 'tch-t-4', name: 'Trần Văn Giang', code: 'Giang.TV' },
  'Giang.TV': { id: 'tch-t-4', name: 'Trần Văn Giang', code: 'Giang.TV' },

  'Hương': { id: 'tch-t-7', name: 'Võ Thị Ngọc Hương', code: 'Hương.VTN (12CB3)' },
  'Võ Thị Ngọc Hương': { id: 'tch-t-7', name: 'Võ Thị Ngọc Hương', code: 'Hương.VTN (12CB3)' },
  'Hương.VTN': { id: 'tch-t-7', name: 'Võ Thị Ngọc Hương', code: 'Hương.VTN (12CB3)' },

  'Thùy': { id: 'tch-khtn-3', name: 'Phạm Biên Thùy', code: 'Thùy.PB' },
  'Phạm Biên Thùy': { id: 'tch-khtn-3', name: 'Phạm Biên Thùy', code: 'Thùy.PB' },
  'Thùy.PB': { id: 'tch-khtn-3', name: 'Phạm Biên Thùy', code: 'Thùy.PB' },

  'Hiền': { id: 'tch-khtn-6', name: 'Trần Thị Ngọc Hiền', code: 'Hiền.TTN' },
  'Trần Thị Ngọc Hiền': { id: 'tch-khtn-6', name: 'Trần Thị Ngọc Hiền', code: 'Hiền.TTN' },
  'Hiền.TTN': { id: 'tch-khtn-6', name: 'Trần Thị Ngọc Hiền', code: 'Hiền.TTN' },

  'Phi': { id: 'tch-khtn-8', name: 'Phạm Long Phi', code: 'Phi.PL (11CB2)' },
  'Phạm Long Phi': { id: 'tch-khtn-8', name: 'Phạm Long Phi', code: 'Phi.PL (11CB2)' },
  'Phi.PL': { id: 'tch-khtn-8', name: 'Phạm Long Phi', code: 'Phi.PL (11CB2)' },

  'Thơ': { id: 'tch-khtn-7', name: 'Phan Thị Ngọc Thơ', code: 'Thơ.PTN (12CB1)' },
  'Phan Thị Ngọc Thơ': { id: 'tch-khtn-7', name: 'Phan Thị Ngọc Thơ', code: 'Thơ.PTN (12CB1)' },
  'Thơ.PTN': { id: 'tch-khtn-7', name: 'Phan Thị Ngọc Thơ', code: 'Thơ.PTN (12CB1)' },

  'Kiều': { id: 'tch-khtn-9', name: 'Trần Thị Kiều', code: 'Kiều.TT (10CB2)' },
  'Trần Thị Kiều': { id: 'tch-khtn-9', name: 'Trần Thị Kiều', code: 'Kiều.TT (10CB2)' },
  'Kiều.TT': { id: 'tch-khtn-9', name: 'Trần Thị Kiều', code: 'Kiều.TT (10CB2)' },

  'Huỳnh': { id: 'tch-khtn-1', name: 'Bùi Kim Huỳnh', code: 'Huỳnh.BK (11CB1)' },
  'Bùi Kim Huỳnh': { id: 'tch-khtn-1', name: 'Bùi Kim Huỳnh', code: 'Huỳnh.BK (11CB1)' },
  'Huỳnh.BK': { id: 'tch-khtn-1', name: 'Bùi Kim Huỳnh', code: 'Huỳnh.BK (11CB1)' },

  'Tùng': { id: 'tch-khtn-5', name: 'Cao Văn Tùng', code: 'Tùng.CV (10CB1)' },
  'Cao Văn Tùng': { id: 'tch-khtn-5', name: 'Cao Văn Tùng', code: 'Tùng.CV (10CB1)' },
  'Tùng.CV': { id: 'tch-khtn-5', name: 'Cao Văn Tùng', code: 'Tùng.CV (10CB1)' },

  'Nhịnh': { id: 'tch-v-4', name: 'Hồ Văn Nhịnh', code: 'Nhịnh.HV (10CB5)' },
  'Hồ Văn Nhịnh': { id: 'tch-v-4', name: 'Hồ Văn Nhịnh', code: 'Nhịnh.HV (10CB5)' },
  'Nhịnh.HV': { id: 'tch-v-4', name: 'Hồ Văn Nhịnh', code: 'Nhịnh.HV (10CB5)' },

  'Ny': { id: 'tch-v-5', name: 'Lê Thị Mỹ Ny', code: 'Ny.LTM (10CB3)' },
  'Lê Thị Mỹ Ny': { id: 'tch-v-5', name: 'Lê Thị Mỹ Ny', code: 'Ny.LTM (10CB3)' },
  'Ny.LTM': { id: 'tch-v-5', name: 'Lê Thị Mỹ Ny', code: 'Ny.LTM (10CB3)' },

  'Lắm': { id: 'tch-v-1', name: 'Tô Thị Lắm', code: 'Lắm.TT' },
  'Tô Thị Lắm': { id: 'tch-v-1', name: 'Tô Thị Lắm', code: 'Lắm.TT' },
  'Tô Thị  Lắm': { id: 'tch-v-1', name: 'Tô Thị Lắm', code: 'Lắm.TT' },
  'Lắm.TT': { id: 'tch-v-1', name: 'Tô Thị Lắm', code: 'Lắm.TT' },

  'Duyên': { id: 'tch-v-6', name: 'Trương Thị Mỹ Duyên', code: 'Duyên.TTM (12CB2)' },
  'Trương Thị Mỹ Duyên': { id: 'tch-v-6', name: 'Trương Thị Mỹ Duyên', code: 'Duyên.TTM (12CB2)' },
  'Duyên.TTM': { id: 'tch-v-6', name: 'Trương Thị Mỹ Duyên', code: 'Duyên.TTM (12CB2)' },

  'Trang': { id: 'tch-ls-4', name: 'Nguyễn Thị Bé Trang', code: 'Trang.NTB (12CB4)' },
  'Nguyễn Thị Bé Trang': { id: 'tch-ls-4', name: 'Nguyễn Thị Bé Trang', code: 'Trang.NTB (12CB4)' },
  'Trang.NTB': { id: 'tch-ls-4', name: 'Nguyễn Thị Bé Trang', code: 'Trang.NTB (12CB4)' },

  'Rỡ': { id: 'tch-ls-5', name: 'Trần Văn Rỡ', code: 'Rỡ.TV (11CB3)' },
  'Trần Văn Rỡ': { id: 'tch-ls-5', name: 'Trần Văn Rỡ', code: 'Rỡ.TV (11CB3)' },
  'Rỡ.TV': { id: 'tch-ls-5', name: 'Trần Văn Rỡ', code: 'Rỡ.TV (11CB3)' },

  'Sơn': { id: 'tch-ls-2', name: 'Trịnh Văn Sơn', code: 'Sơn.TV (12CB5)' },
  'Trịnh Văn Sơn': { id: 'tch-ls-2', name: 'Trịnh Văn Sơn', code: 'Sơn.TV (12CB5)' },
  'Sơn.TV': { id: 'tch-ls-2', name: 'Trịnh Văn Sơn', code: 'Sơn.TV (12CB5)' },

  'Tuấn': { id: 'tch-ls-7', name: 'Ngô Anh Tuấn', code: 'Tuấn.NA' },
  'Ngô Anh Tuấn': { id: 'tch-ls-7', name: 'Ngô Anh Tuấn', code: 'Tuấn.NA' },
  'Tuấn.NA': { id: 'tch-ls-7', name: 'Ngô Anh Tuấn', code: 'Tuấn.NA' },

  'Hòa': { id: 'tch-ls-6', name: 'Trần Phước Hòa', code: 'Hòa.TP' },
  'Trần Phước Hòa': { id: 'tch-ls-6', name: 'Trần Phước Hòa', code: 'Hòa.TP' },
  'Hòa.TP': { id: 'tch-ls-6', name: 'Trần Phước Hòa', code: 'Hòa.TP' },

  'Quốc': { id: 'tch-av-5', name: 'Ngô Bảo Quốc', code: 'Quốc.NB' },
  'Ngô Bảo Quốc': { id: 'tch-av-5', name: 'Ngô Bảo Quốc', code: 'Quốc.NB' },
  'Quốc.NB': { id: 'tch-av-5', name: 'Ngô Bảo Quốc', code: 'Quốc.NB' },

  'Anh': { id: 'tch-av-7', name: 'Nguyễn Thị Vân Anh', code: 'Anh.NTV' },
  'VAnh': { id: 'tch-av-7', name: 'Nguyễn Thị Vân Anh', code: 'Anh.NTV' },
  'Nguyễn Thị Vân Anh': { id: 'tch-av-7', name: 'Nguyễn Thị Vân Anh', code: 'Anh.NTV' },
  'Anh.NTV': { id: 'tch-av-7', name: 'Nguyễn Thị Vân Anh', code: 'Anh.NTV' },

  'Bền': { id: 'tch-av-6', name: 'Trương Sơn Bền', code: 'Bền.TS' },
  'Trương Sơn Bền': { id: 'tch-av-6', name: 'Trương Sơn Bền', code: 'Bền.TS' },
  'Bền.TS': { id: 'tch-av-6', name: 'Trương Sơn Bền', code: 'Bền.TS' },

  'Thi': { id: 'tch-av-4', name: 'Võ Thị Hiền Thi', code: 'Thi.VTH' },
  'Võ Thị Hiền Thi': { id: 'tch-av-4', name: 'Võ Thị Hiền Thi', code: 'Thi.VTH' },
  'Thi.VTH': { id: 'tch-av-4', name: 'Võ Thị Hiền Thi', code: 'Thi.VTH' },

  'Liên': { id: 'tch-av-8', name: 'Đào Thị Ngọc Liên', code: 'Liên.ĐTN (11CB4)' },
  'Đào Thị Ngọc Liên': { id: 'tch-av-8', name: 'Đào Thị Ngọc Liên', code: 'Liên.ĐTN (11CB4)' },
  'Liên.ĐTN': { id: 'tch-av-8', name: 'Đào Thị Ngọc Liên', code: 'Liên.ĐTN (11CB4)' },

  'Diễm': { id: 'tch-av-9', name: 'Lê Thị Thu Diễm', code: 'Diễm.LTT (10CB4)' },
  'Lê Thị Thu Diễm': { id: 'tch-av-9', name: 'Lê Thị Thu Diễm', code: 'Diễm.LTT (10CB4)' },
  'Diễm.LTT': { id: 'tch-av-9', name: 'Lê Thị Thu Diễm', code: 'Diễm.LTT (10CB4)' },

  'Hiếu': { id: 'tch-av-2', name: 'Nguyễn Trung Hiếu', code: 'Hiếu.NT (Tin)' },
  'Nguyễn Trung Hiếu': { id: 'tch-av-2', name: 'Nguyễn Trung Hiếu', code: 'Hiếu.NT (Tin)' },
  'Hiếu.NT': { id: 'tch-av-2', name: 'Nguyễn Trung Hiếu', code: 'Hiếu.NT (Tin)' },

  'Trí': { id: 'tch-bgh-2', name: 'Nguyễn Minh Trí', code: 'Trí.NM (PHT)' },
  'Nguyễn Minh Trí': { id: 'tch-bgh-2', name: 'Nguyễn Minh Trí', code: 'Trí.NM (PHT)' },
  'Trí.NM': { id: 'tch-bgh-2', name: 'Nguyễn Minh Trí', code: 'Trí.NM (PHT)' },

  'Ngân': { id: 'tch-td-4', name: 'Hồ Hoài Ngân', code: 'Ngân.HH' },
  'Hồ Hoài Ngân': { id: 'tch-td-4', name: 'Hồ Hoài Ngân', code: 'Ngân.HH' },
  'Ngân.HH': { id: 'tch-td-4', name: 'Hồ Hoài Ngân', code: 'Ngân.HH' },

  'Ẩn': { id: 'tch-td-6', name: 'Lê Ngọc Ẩn', code: 'Ẩn.LN (7A4)' },
  'Lê Ngọc Ẩn': { id: 'tch-td-6', name: 'Lê Ngọc Ẩn', code: 'Ẩn.LN (7A4)' },
  'Lê Ngọc Ẩn (ĐBK)': { id: 'tch-td-6', name: 'Lê Ngọc Ẩn', code: 'Ẩn.LN (7A4)' },
  'Ẩn.LN': { id: 'tch-td-6', name: 'Lê Ngọc Ẩn', code: 'Ẩn.LN (7A4)' },

  'Rạng': { id: 'tch-td-2', name: 'Nguyễn Kim Rạng', code: 'Rạng.NK' },
  'Nguyễn Kim Rạng': { id: 'tch-td-2', name: 'Nguyễn Kim Rạng', code: 'Rạng.NK' },
  'Rang': { id: 'tch-td-2', name: 'Nguyễn Kim Rạng', code: 'Rạng.NK' },
  'Rạng.NK': { id: 'tch-td-2', name: 'Nguyễn Kim Rạng', code: 'Rạng.NK' },

  'Trường': { id: 'tch-ls-8', name: 'Phạm Nguyễn Văn Trường', code: 'Trường.PNV' },
  'Phạm Nguyễn Văn Trường': { id: 'tch-ls-8', name: 'Phạm Nguyễn Văn Trường', code: 'Trường.PNV' },
  'Trường.PNV': { id: 'tch-ls-8', name: 'Phạm Nguyễn Văn Trường', code: 'Trường.PNV' },
};

// Subject code lookup dictionary
export const THPT_SUBJECT_LOOKUP: Record<string, { id: string; fullName: string }> = {
  'Chào cờ': { id: 'sub-chao-co', fullName: 'Chào cờ' },
  'SHL': { id: 'sub-shl', fullName: 'Sinh hoạt lớp' },
  'Toán': { id: 'sub-toan', fullName: 'Toán học' },
  'Ngữ văn': { id: 'sub-van', fullName: 'Ngữ văn' },
  'Ngoại ngữ': { id: 'sub-anh', fullName: 'Tiếng Anh' },
  'Tiếng Anh': { id: 'sub-anh', fullName: 'Tiếng Anh' },
  'Vật lí': { id: 'sub-li', fullName: 'Vật lí' },
  'Vật lý': { id: 'sub-li', fullName: 'Vật lí' },
  'Hóa học': { id: 'sub-hoa', fullName: 'Hóa học' },
  'Sinh học': { id: 'sub-sinh', fullName: 'Sinh học' },
  'Lịch Sử': { id: 'sub-su', fullName: 'Lịch sử' },
  'Lịch sử': { id: 'sub-su', fullName: 'Lịch sử' },
  'Địa Lí': { id: 'sub-dia', fullName: 'Địa lí' },
  'Địa lí': { id: 'sub-dia', fullName: 'Địa lí' },
  'GD KTPL': { id: 'sub-gdktpl', fullName: 'GDKT & Pháp luật' },
  'GDKT&PL': { id: 'sub-gdktpl', fullName: 'GDKT & Pháp luật' },
  'GDKT & PL': { id: 'sub-gdktpl', fullName: 'GDKT & Pháp luật' },
  'Tin học': { id: 'sub-tin', fullName: 'Tin học' },
  'Công nghệ': { id: 'sub-cn', fullName: 'Công nghệ' },
  'GDTC': { id: 'sub-gdtc', fullName: 'Giáo dục thể chất' },
  'GD QP-AN': { id: 'sub-gdqp', fullName: 'GD Quốc phòng & An ninh' },
  'GDQP-AN': { id: 'sub-gdqp', fullName: 'GD Quốc phòng & An ninh' },
  'GDQPAN': { id: 'sub-gdqp', fullName: 'GD Quốc phòng & An ninh' },
  'GDQP': { id: 'sub-gdqp', fullName: 'GD Quốc phòng & An ninh' },
  'HĐ TN-HN(CĐ)': { id: 'sub-hdtn', fullName: 'HĐTN - HN' },
  'HĐ TN-HN': { id: 'sub-hdtn', fullName: 'HĐTN - HN' },
  'HĐTN-HN': { id: 'sub-hdtn', fullName: 'HĐTN - HN' },
  'HĐTN, HN': { id: 'sub-hdtn', fullName: 'HĐTN - HN' },
};

// Data for Grade 10: [Day, Period, 10CB1, 10CB2, 10CB3, 10CB4, 10CB5]
export const RAW_GRADE_10_MATRIX: string[][] = [
  // Thứ 2 (Day 2)
  ["2", "1", "Chào cờ-Tùng", "Chào cờ-Kiều", "Chào cờ-Ny", "Chào cờ-Diễm", "Chào cờ-Nhịnh"],
  ["2", "2", "Ngữ văn-Duyên", "Lịch Sử-Sơn", "GD QP-AN-Rạng", "Tin học-Diễm", "GD KTPL-Trường"],
  ["2", "3", "Sinh học-Tùng", "Hóa học-Kiều", "Tin học-Diễm", "GDTC-Ẩn", "Ngoại ngữ-Anh"],
  ["2", "4", "Hóa học-Kiều", "Ngoại ngữ-Quốc", "GD KTPL-Trường", "GDTC-Ẩn", "Vật lí-Hiền"],
  ["2", "5", "Vật lí-Hiền", "Địa Lí-Hòa", "HĐ TN-HN(CĐ)-Kiều", "Ngoại ngữ-Anh", "Toán-Giang"],
  // Thứ 3 (Day 3)
  ["3", "1", "Sinh học-Tùng", "HĐ TN-HN(CĐ)-Kiều", "Lịch Sử-Sơn", "GD QP-AN-Rạng", "Tin học-Hiếu"],
  ["3", "2", "HĐ TN-HN(CĐ)-Tùng", "GD QP-AN-Rạng", "Vật lí-Hiền", "HĐ TN-HN(CĐ)-Kiều", "Ngữ văn-Nhịnh"],
  ["3", "3", "Hóa học-Kiều", "Vật lí-Hiền", "Toán-CToàn", "Ngoại ngữ-Anh", "Toán-Giang"],
  ["3", "4", "Tin học-Diễm", "Toán-CToàn", "Ngoại ngữ-Quốc", "Vật lí-Hiền", "HĐ TN-HN(CĐ)-Kiều"],
  ["3", "5", "Toán-Hương", "Toán-CToàn", "HĐ TN-HN(CĐ)-Kiều", "Tin học-Diễm", "Ngoại ngữ-Anh"],
  // Thứ 4 (Day 4)
  ["4", "1", "Hóa học-Kiều", "Ngoại ngữ-Quốc", "Tin học-Diễm", "Toán-Hương", "Ngoại ngữ-Anh"],
  ["4", "2", "Tin học-Diễm", "HĐ TN-HN(CĐ)-Kiều", "Ngoại ngữ-Quốc", "Toán-Hương", "GDTC-Rạng"],
  ["4", "3", "Ngoại ngữ-Thi", "Tin học-Diễm", "Vật lí-Hiền", "Ngữ văn-Duyên", "GDTC-Rạng"],
  ["4", "4", "Vật lí-Hiền", "Ngữ văn-Nhịnh", "Địa Lí-Hòa", "GD KTPL-Trường", "Toán-Giang"],
  ["4", "5", "Lịch Sử-Trang", "Vật lí-Hiền", "Ngữ văn-Ny", "Địa Lí-Hòa", "Toán-Giang"],
  // Thứ 5 (Day 5)
  ["5", "1", "Toán-Hương", "GDTC-Ẩn", "Toán-CToàn", "Vật lí-Hiền", "Lịch Sử-Trang"],
  ["5", "2", "Toán-Hương", "GDTC-Ẩn", "Toán-CToàn", "Ngoại ngữ-Anh", "Tin học-Hiếu"],
  ["5", "3", "Ngoại ngữ-Thi", "Toán-CToàn", "Ngữ văn-Ny", "Lịch Sử-Trang", "Vật lí-Hiền"],
  ["5", "4", "", "", "", "", ""],
  ["5", "5", "", "", "", "", ""],
  // Thứ 6 (Day 6)
  ["6", "1", "Ngữ văn-Duyên", "Ngoại ngữ-Quốc", "Toán-CToàn", "Vật lí-Hiền", "Địa Lí-Hòa"],
  ["6", "2", "GD QP-AN-Rạng", "Toán-CToàn", "GD KTPL-Trường", "Địa Lí-Hòa", "Ngữ văn-Nhịnh"],
  ["6", "3", "GDTC-Ẩn", "Ngữ văn-Nhịnh", "Vật lí-Hiền", "HĐ TN-HN(CĐ)-Kiều", "GD QP-AN-Rạng"],
  ["6", "4", "GDTC-Ẩn", "Hóa học-Kiều", "Ngoại ngữ-Quốc", "Tin học-Diễm", "Vật lí-Hiền"],
  ["6", "5", "Ngoại ngữ-Thi", "Tin học-Diễm", "Địa Lí-Hòa", "Ngữ văn-Duyên", "HĐ TN-HN(CĐ)-Kiều"],
  // Thứ 7 (Day 7)
  ["7", "1", "HĐ TN-HN(CĐ)-Tùng", "Ngữ văn-Nhịnh", "GDTC-Ẩn", "Toán-Hương", "GD KTPL-Trường"],
  ["7", "2", "Sinh học-Tùng", "Tin học-Diễm", "GDTC-Ẩn", "Toán-Hương", "Địa Lí-Hòa"],
  ["7", "3", "Ngữ văn-Duyên", "Địa Lí-Hòa", "Tin học-Diễm", "GD KTPL-Trường", "Ngữ văn-Nhịnh"],
  ["7", "4", "Toán-Hương", "Hóa học-Kiều", "Ngữ văn-Ny", "Ngữ văn-Duyên", "Tin học-Hiếu"],
  ["7", "5", "SHL-Tùng", "SHL-Kiều", "SHL-Ny", "SHL-Diễm", "SHL-Nhịnh"],
];

// Data for Grade 11: [Day, Period, 11CB1, 11CB2, 11CB3, 11CB4]
export const RAW_GRADE_11_MATRIX: string[][] = [
  // Thứ 2 (Day 2)
  ["2", "1", "Chào cờ-Huỳnh", "Chào cờ-Phi", "Chào cờ-Rỡ", "Chào cờ-Liên"],
  ["2", "2", "Vật lí-Thùy", "Lịch Sử-Rỡ", "Ngữ văn-Nhịnh", "Tin học-Liên"],
  ["2", "3", "Hóa học-Thơ", "Ngoại ngữ-Quốc", "HĐ TN-HN(CĐ)-Phi", "GD KTPL-Trường"],
  ["2", "4", "Ngoại ngữ-Anh", "Hóa học-Phi", "Tin học-Liên", "Toán-Giang"],
  ["2", "5", "HĐ TN-HN(CĐ)-Phi", "Tin học-Liên", "GD KTPL-Trường", "Ngoại ngữ-Quốc"],
  // Thứ 3 (Day 3)
  ["3", "1", "Toán-VToàn", "Ngữ văn-Nhịnh", "Toán-Giang", "Tin học-Liên"],
  ["3", "2", "Toán-VToàn", "Tin học-Liên", "Toán-Giang", "Ngữ văn-Lắm"],
  ["3", "3", "Hóa học-Thơ", "Ngoại ngữ-Quốc", "Ngữ văn-Nhịnh", "HĐ TN-HN(CĐ)-Phi"],
  ["3", "4", "Sinh học-Huỳnh", "HĐ TN-HN(CĐ)-Phi", "Ngoại ngữ-Anh", "GD QP-AN-Rạng"],
  ["3", "5", "Ngữ văn-Lắm", "Hóa học-Phi", "Vật lí-Hiền", "Ngoại ngữ-Quốc"],
  // Thứ 4 (Day 4)
  ["4", "1", "Toán-VToàn", "Toán-CToàn", "Toán-Giang", "Lịch Sử-Rỡ"],
  ["4", "2", "Ngoại ngữ-Anh", "Toán-CToàn", "Toán-Giang", "Ngữ văn-Lắm"],
  ["4", "3", "Lịch Sử-Rỡ", "GDTC-Ngân", "Ngoại ngữ-Anh", "Toán-Giang"],
  ["4", "4", "Hóa học-Thơ", "GDTC-Ngân", "Lịch Sử-Rỡ", "HĐ TN-HN(CĐ)-Phi"],
  ["4", "5", "HĐ TN-HN(CĐ)-Phi", "Ngữ văn-Nhịnh", "Địa Lí-Tuấn", "GD KTPL-Trường"],
  // Thứ 5 (Day 5)
  ["5", "1", "Sinh học-Huỳnh", "Địa Lí-Tuấn", "Ngoại ngữ-Anh", "Ngữ văn-Lắm"],
  ["5", "2", "Ngữ văn-Lắm", "HĐ TN-HN(CĐ)-Phi", "Vật lí-Hiền", "Địa Lí-Tuấn"],
  ["5", "3", "Ngoại ngữ-Anh", "Hóa học-Phi", "Địa Lí-Tuấn", "Vật lí-Thùy"],
  ["5", "4", "", "", "", ""],
  ["5", "5", "", "", "", ""],
  // Thứ 6 (Day 6)
  ["6", "1", "Vật lí-Thùy", "Ngữ văn-Nhịnh", "GDTC-Ngân", "Địa Lí-Tuấn"],
  ["6", "2", "Toán-VToàn", "Vật lí-Thùy", "GDTC-Ngân", "Ngoại ngữ-Quốc"],
  ["6", "3", "GDTC-Ngân", "Ngoại ngữ-Quốc", "GD KTPL-Trường", "Vật lí-Thùy"],
  ["6", "4", "GDTC-Ngân", "Toán-CToàn", "Tin học-Liên", "Toán-Giang"],
  ["6", "5", "Tin học-Liên", "Toán-CToàn", "Vật lí-Hiền", "Toán-Giang"],
  // Thứ 7 (Day 7)
  ["7", "1", "Ngữ văn-Lắm", "Vật lí-Thùy", "GD QP-AN-Rạng", "Tin học-Liên"],
  ["7", "2", "Tin học-Liên", "Địa Lí-Tuấn", "Ngữ văn-Nhịnh", "Vật lí-Thùy"],
  ["7", "3", "Sinh học-Huỳnh", "GD QP-AN-Rạng", "Tin học-Liên", "GDTC-Ngân"],
  ["7", "4", "GD QP-AN-Rạng", "Tin học-Liên", "HĐ TN-HN(CĐ)-Phi", "GDTC-Ngân"],
  ["7", "5", "SHL-Huỳnh", "SHL-Phi", "SHL-Rỡ", "SHL-Liên"],
];

// Data for Grade 12: [Day, Period, 12CB1, 12CB2, 12CB3, 12CB4, 12CB5]
export const RAW_GRADE_12_MATRIX: string[][] = [
  // Thứ 2 (Day 2)
  ["2", "1", "Chào cờ-Thơ", "Chào cờ-Duyên", "Chào cờ-Hương", "Chào cờ-Trang", "Chào cờ-Sơn"],
  ["2", "2", "Ngữ văn-Ny", "Sinh học-Huỳnh", "Toán-Hương", "Lịch Sử-Trang", "Công nghệ-Tùng"],
  ["2", "3", "Ngữ văn-Ny", "GD QP-AN-Rạng", "Toán-Hương", "Vật lí-Thùy", "Lịch Sử-Sơn"],
  ["2", "4", "Ngoại ngữ-Thi", "Hóa học-Thơ", "HĐ TN-HN(CĐ)-Rỡ", "Địa Lí-Hòa", "GD QP-AN-Rạng"],
  ["2", "5", "HĐ TN-HN(CĐ)-Thơ", "Ngoại ngữ-Thi", "Lịch Sử-Rỡ", "Ngữ văn-Ny", "Ngoại ngữ-Bền"],
  // Thứ 3 (Day 3)
  ["3", "1", "Sinh học-Huỳnh", "HĐ TN-HN(CĐ)-Duyên", "GDTC-Ngân", "Ngữ văn-Ny", "Ngữ văn-Lắm"],
  ["3", "2", "Tin học-Hiếu", "Ngữ văn-Duyên", "GDTC-Ngân", "Ngữ văn-Ny", "Sinh học-Huỳnh"],
  ["3", "3", "Lịch Sử-Sơn", "Sinh học-Huỳnh", "Ngữ văn-Lắm", "GD QP-AN-Rạng", "Toán-VToàn"],
  ["3", "4", "Hóa học-Thơ", "Lịch Sử-Trang", "Toán-Hương", "Ngoại ngữ-Thi", "Toán-VToàn"],
  ["3", "5", "HĐ TN-HN(CĐ)-Thơ", "Toán-VToàn", "Ngoại ngữ-Thi", "HĐ TN-HN(CĐ)-Trang", "HĐ TN-HN(CĐ)-Trí"],
  // Thứ 4 (Day 4)
  ["4", "1", "GD QP-AN-Rạng", "GDTC-Ngân", "Ngoại ngữ-Thi", "Lịch Sử-Trang", "Ngữ văn-Lắm"],
  ["4", "2", "Ngoại ngữ-Thi", "GDTC-Ngân", "Lịch Sử-Rỡ", "HĐ TN-HN(CĐ)-Trang", "Toán-VToàn"],
  ["4", "3", "Lịch Sử-Sơn", "Lịch Sử-Trang", "Địa Lí-Tuấn", "Ngữ văn-Ny", "HĐ TN-HN(CĐ)-Trí"],
  ["4", "4", "Ngữ văn-Ny", "Ngữ văn-Duyên", "Vật lí-Thùy", "Ngoại ngữ-Thi", "Địa Lí-Tuấn"],
  ["4", "5", "Hóa học-Thơ", "Ngữ văn-Duyên", "HĐ TN-HN(CĐ)-Rỡ", "Vật lí-Thùy", "Ngoại ngữ-Bền"],
  // Thứ 5 (Day 5)
  ["5", "1", "Toán-Tới", "Tin học-Hiếu", "Vật lí-Thùy", "GD KTPL-Trường", "GDTC-Ngân"],
  ["5", "2", "Vật lí-Thùy", "Ngoại ngữ-Thi", "GD KTPL-Trường", "Toán-Tới", "GDTC-Ngân"],
  ["5", "3", "Lịch Sử-Sơn", "Toán-VToàn", "Ngữ văn-Lắm", "GDTC-Ngân", "Sinh học-Huỳnh"],
  ["5", "4", "Ngữ văn-Ny", "Toán-VToàn", "Ngữ văn-Lắm", "GDTC-Ngân", "Lịch Sử-Sơn"],
  ["5", "5", "", "", "", "", ""],
  // Thứ 6 (Day 6)
  ["6", "1", "Tin học-Hiếu", "Ngoại ngữ-Thi", "GD QP-AN-Rạng", "GD KTPL-Trường", "Ngữ văn-Lắm"],
  ["6", "2", "Ngoại ngữ-Thi", "Ngữ văn-Duyên", "Địa Lí-Tuấn", "Tin học-Hiếu", "Ngữ văn-Lắm"],
  ["6", "3", "Toán-Tới", "Địa Lí-Hòa", "Tin học-Hiếu", "Ngoại ngữ-Thi", "Toán-VToàn"],
  ["6", "4", "Toán-Tới", "HĐ TN-HN(CĐ)-Duyên", "Ngoại ngữ-Thi", "Địa Lí-Hòa", "GD KTPL-Trường"],
  ["6", "5", "Vật lí-Thùy", "Toán-VToàn", "GD KTPL-Trường", "Toán-Tới", "Ngoại ngữ-Bền"],
  // Thứ 7 (Day 7)
  ["7", "1", "GDTC-Ngân", "Địa Lí-Hòa", "Tin học-Hiếu", "Toán-Tới", "Địa Lí-Tuấn"],
  ["7", "2", "GDTC-Ngân", "Tin học-Hiếu", "Ngữ văn-Lắm", "Toán-Tới", "GD KTPL-Trường"],
  ["7", "3", "Toán-Tới", "Lịch Sử-Trang", "Toán-Hương", "Tin học-Hiếu", "Công nghệ-Tùng"],
  ["7", "4", "Sinh học-Huỳnh", "Hóa học-Thơ", "Lịch Sử-Rỡ", "Lịch Sử-Trang", "Lịch Sử-Sơn"],
  ["7", "5", "SHL-Thơ", "SHL-Duyên", "SHL-Hương", "SHL-Trang", "SHL-Sơn"],
];

function parseCell(cellText: string): { subject: string; teacherAlias: string } {
  const trimmed = (cellText || '').trim();
  if (!trimmed) return { subject: '', teacherAlias: '' };
  
  const hyphenIdx = trimmed.lastIndexOf('-');
  if (hyphenIdx === -1) {
    return { subject: trimmed, teacherAlias: '' };
  }
  return {
    subject: trimmed.substring(0, hyphenIdx).trim(),
    teacherAlias: trimmed.substring(hyphenIdx + 1).trim()
  };
}

export function buildTHPTWeek1Slots(): TimetableSlot[] {
  const slots: TimetableSlot[] = [];

  // Grade 10 classes
  const g10Classes = [
    { id: 'cls-10cb1', name: '10CB1', room: 'P.10-1' },
    { id: 'cls-10cb2', name: '10CB2', room: 'P.10-2' },
    { id: 'cls-10cb3', name: '10CB3', room: 'P.10-3' },
    { id: 'cls-10cb4', name: '10CB4', room: 'P.10-4' },
    { id: 'cls-10cb5', name: '10CB5', room: 'P.10-5' },
  ];

  RAW_GRADE_10_MATRIX.forEach(row => {
    const day = parseInt(row[0], 10);
    const period = parseInt(row[1], 10);

    g10Classes.forEach((cls, idx) => {
      const cell = row[2 + idx];
      const { subject, teacherAlias } = parseCell(cell);
      if (subject) {
        const subInfo = THPT_SUBJECT_LOOKUP[subject] || { id: 'sub-other', fullName: subject };
        const tchInfo = THPT_TEACHER_LOOKUP[teacherAlias] || { id: '', name: teacherAlias, code: teacherAlias };
        const isSpecial = subject.includes('Chào cờ') || subject.includes('SHL');

        slots.push({
          id: `${cls.id}_${day}_SANG_${period}`,
          classId: cls.id,
          className: cls.name,
          dayOfWeek: day,
          session: 'SANG',
          period,
          subjectId: subInfo.id,
          subjectName: subInfo.fullName,
          teacherId: tchInfo.id,
          teacherName: tchInfo.name,
          teacherCode: tchInfo.code,
          room: '',
          isSpecialActivity: isSpecial
        });
      } else {
        slots.push({
          id: `${cls.id}_${day}_SANG_${period}`,
          classId: cls.id,
          className: cls.name,
          dayOfWeek: day,
          session: 'SANG',
          period,
          room: ''
        });
      }
    });
  });

  // Grade 11 classes
  const g11Classes = [
    { id: 'cls-11cb1', name: '11CB1' },
    { id: 'cls-11cb2', name: '11CB2' },
    { id: 'cls-11cb3', name: '11CB3' },
    { id: 'cls-11cb4', name: '11CB4' },
  ];

  RAW_GRADE_11_MATRIX.forEach(row => {
    const day = parseInt(row[0], 10);
    const period = parseInt(row[1], 10);

    g11Classes.forEach((cls, idx) => {
      const cell = row[2 + idx];
      const { subject, teacherAlias } = parseCell(cell);
      if (subject) {
        const subInfo = THPT_SUBJECT_LOOKUP[subject] || { id: 'sub-other', fullName: subject };
        const tchInfo = THPT_TEACHER_LOOKUP[teacherAlias] || { id: '', name: teacherAlias, code: teacherAlias };
        const isSpecial = subject.includes('Chào cờ') || subject.includes('SHL');

        slots.push({
          id: `${cls.id}_${day}_SANG_${period}`,
          classId: cls.id,
          className: cls.name,
          dayOfWeek: day,
          session: 'SANG',
          period,
          subjectId: subInfo.id,
          subjectName: subInfo.fullName,
          teacherId: tchInfo.id,
          teacherName: tchInfo.name,
          teacherCode: tchInfo.code,
          room: '',
          isSpecialActivity: isSpecial
        });
      } else {
        slots.push({
          id: `${cls.id}_${day}_SANG_${period}`,
          classId: cls.id,
          className: cls.name,
          dayOfWeek: day,
          session: 'SANG',
          period,
          room: ''
        });
      }
    });
  });

  // Grade 12 classes
  const g12Classes = [
    { id: 'cls-12cb1', name: '12CB1' },
    { id: 'cls-12cb2', name: '12CB2' },
    { id: 'cls-12cb3', name: '12CB3' },
    { id: 'cls-12cb4', name: '12CB4' },
    { id: 'cls-12cb5', name: '12CB5' },
  ];

  RAW_GRADE_12_MATRIX.forEach(row => {
    const day = parseInt(row[0], 10);
    const period = parseInt(row[1], 10);

    g12Classes.forEach((cls, idx) => {
      const cell = row[2 + idx];
      const { subject, teacherAlias } = parseCell(cell);
      if (subject) {
        const subInfo = THPT_SUBJECT_LOOKUP[subject] || { id: 'sub-other', fullName: subject };
        const tchInfo = THPT_TEACHER_LOOKUP[teacherAlias] || { id: '', name: teacherAlias, code: teacherAlias };
        const isSpecial = subject.includes('Chào cờ') || subject.includes('SHL');

        slots.push({
          id: `${cls.id}_${day}_SANG_${period}`,
          classId: cls.id,
          className: cls.name,
          dayOfWeek: day,
          session: 'SANG',
          period,
          subjectId: subInfo.id,
          subjectName: subInfo.fullName,
          teacherId: tchInfo.id,
          teacherName: tchInfo.name,
          teacherCode: tchInfo.code,
          room: '',
          isSpecialActivity: isSpecial
        });
      } else {
        slots.push({
          id: `${cls.id}_${day}_SANG_${period}`,
          classId: cls.id,
          className: cls.name,
          dayOfWeek: day,
          session: 'SANG',
          period,
          room: ''
        });
      }
    });
  });

  return slots;
}
