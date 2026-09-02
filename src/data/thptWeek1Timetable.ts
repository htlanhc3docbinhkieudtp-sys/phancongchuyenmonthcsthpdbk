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

// Teacher code lookup dictionary with full names
export const THPT_TEACHER_LOOKUP: Record<string, { id: string; name: string; code: string }> = {
  'Tùng': { id: 'tch-khtn-5', name: 'Phan Hoàng Tùng', code: 'Phan Hoàng Tùng' },
  'Kiều': { id: 'tch-khtn-9', name: 'Đoàn Kiều', code: 'Đoàn Kiều' },
  'Ny': { id: 'tch-v-5', name: 'Nguyễn Thị Cẩm Ny', code: 'Nguyễn Thị Cẩm Ny' },
  'Diễm': { id: 'tch-av-9', name: 'Huỳnh Thị Bích Diễm', code: 'Huỳnh Thị Bích Diễm' },
  'Nhịnh': { id: 'tch-v-4', name: 'Võ Thị Nhịnh', code: 'Võ Thị Nhịnh' },
  'Hương': { id: 'tch-t-7', name: 'Lê Thị Ngọc Hương', code: 'Lê Thị Ngọc Hương' },
  'Sơn': { id: 'tch-ls-2', name: 'Võ Văn Sơn', code: 'Võ Văn Sơn' },
  'Ẩn': { id: 'tch-td-6', name: 'Nguyễn Văn Ẩn', code: 'Nguyễn Văn Ẩn' },
  'Rạng': { id: 'tch-td-2', name: 'Đặng Văn Rạng', code: 'Đặng Văn Rạng' },
  'Hiền': { id: 'tch-khtn-6', name: 'Nguyễn Thị Thu Hiền', code: 'Nguyễn Thị Thu Hiền' },
  'Duyên': { id: 'tch-v-6', name: 'Hồ Thị Mỹ Duyên', code: 'Hồ Thị Mỹ Duyên' },
  'Hòa': { id: 'tch-ls-6', name: 'Huỳnh Thị Hòa', code: 'Huỳnh Thị Hòa' },
  'Giang': { id: 'tch-t-4', name: 'Hoàng Văn Giang', code: 'Hoàng Văn Giang' },
  'Anh': { id: 'tch-av-7', name: 'Lê Văn Anh', code: 'Lê Văn Anh' },
  'Thi': { id: 'tch-av-4', name: 'Trần Thị Thi', code: 'Trần Thị Thi' },
  'Hiếu': { id: 'tch-av-2', name: 'Nguyễn Minh Hiếu', code: 'Nguyễn Minh Hiếu' },
  'CToàn': { id: 'tch-t-5', name: 'Nguyễn Chí Toàn', code: 'Nguyễn Chí Toàn' },
  'Trang': { id: 'tch-ls-4', name: 'Nguyễn Thị Trang', code: 'Nguyễn Thị Trang' },
  'Quốc': { id: 'tch-av-5', name: 'Huỳnh Văn Quốc', code: 'Huỳnh Văn Quốc' },
  'Trường': { id: 'tch-ls-8', name: 'Huỳnh Nhựt Trường', code: 'Huỳnh Nhựt Trường' },
  'Bền': { id: 'tch-av-6', name: 'Lê Văn Bền', code: 'Lê Văn Bền' },
  'Huỳnh': { id: 'tch-khtn-1', name: 'Nguyễn Văn Huỳnh', code: 'Nguyễn Văn Huỳnh' },
  'Phi': { id: 'tch-khtn-8', name: 'Đoàn Hồng Phi', code: 'Đoàn Hồng Phi' },
  'Rỡ': { id: 'tch-ls-5', name: 'Lê Văn Rỡ', code: 'Lê Văn Rỡ' },
  'Liên': { id: 'tch-av-8', name: 'Nguyễn Thị Kiều Liên', code: 'Nguyễn Thị Kiều Liên' },
  'Thơ': { id: 'tch-khtn-7', name: 'Nguyễn Thị Bích Thơ', code: 'Nguyễn Thị Bích Thơ' },
  'Lắm': { id: 'tch-v-1', name: 'Phan Văn Lắm', code: 'Phan Văn Lắm' },
  'Tuấn': { id: 'tch-ls-7', name: 'Nguyễn Công Tuấn', code: 'Nguyễn Công Tuấn' },
  'VToàn': { id: 'tch-t-6', name: 'Võ Văn Toàn', code: 'Võ Văn Toàn' },
  'Thùy': { id: 'tch-khtn-3', name: 'Nguyễn Thị Bích Thùy', code: 'Nguyễn Thị Bích Thùy' },
  'Ngân': { id: 'tch-td-4', name: 'Nguyễn Thị Mỹ Ngân', code: 'Nguyễn Thị Mỹ Ngân' },
  'Tới': { id: 'tch-t-1', name: 'Nguyễn Văn Tới', code: 'Nguyễn Văn Tới' },
  'Trí': { id: 'tch-bgh-2', name: 'Nguyễn Minh Trí', code: 'Nguyễn Minh Trí' },
};

// Subject code lookup dictionary
export const THPT_SUBJECT_LOOKUP: Record<string, { id: string; fullName: string }> = {
  'Chào cờ': { id: 'sub-hdtn', fullName: 'Chào cờ' },
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
  'HĐ TN-HN': { id: 'sub-hdtn', fullName: 'HĐTN - HN' },
  'HĐTN-HN': { id: 'sub-hdtn', fullName: 'HĐTN - HN' },
  'HĐTN, HN': { id: 'sub-hdtn', fullName: 'HĐTN - HN' },
};

// Data for Grade 10, 11, 12 from images
// Matrix layout: [Day, Period, 10CB1, 10CB2, 10CB3, 10CB4, 10CB5]
export const RAW_GRADE_10_MATRIX: string[][] = [
  // Thứ 2 (Day 2)
  ['2', '1', 'Chào cờ-Tùng', 'Chào cờ-Kiều', 'Chào cờ-Ny', 'Chào cờ-Diễm', 'Chào cờ-Nhịnh'],
  ['2', '2', 'Toán-Hương', 'Hóa học-Kiều', 'Lịch Sử-Sơn', 'Tin học-Diễm', 'Ngữ văn-Nhịnh'],
  ['2', '3', 'HĐ TN-HN-Tùng', 'GDTC-Ẩn', 'GD QP-AN-Rạng', 'Toán-Hương', 'Vật lí-Hiền'],
  ['2', '4', 'Ngữ văn-Duyên', 'GDTC-Ẩn', 'Vật lí-Hiền', 'Địa Lí-Hòa', 'Toán-Giang'],
  ['2', '5', 'Sinh học-Tùng', 'Vật lí-Hiền', 'Địa Lí-Hòa', 'Ngữ văn-Duyên', 'Ngoại ngữ-Anh'],
  // Thứ 3 (Day 3)
  ['3', '1', 'Ngoại ngữ-Thi', 'Địa Lí-Hòa', 'HĐ TN-HN-Kiều', 'Ngoại ngữ-Anh', 'Tin học-Hiếu'],
  ['3', '2', 'Hóa học-Kiều', 'Ngữ văn-Nhịnh', 'Toán-CToàn', 'Địa Lí-Hòa', 'GDTC-Rạng'],
  ['3', '3', 'Lịch Sử-Trang', 'Ngoại ngữ-Quốc', 'Toán-CToàn', 'Vật lí-Hiền', 'GDTC-Rạng'],
  ['3', '4', 'Toán-Hương', 'Tin học-Diễm', 'GD KTPL-Trường', 'GD QP-AN-Rạng', 'Địa Lí-Hòa'],
  ['3', '5', 'Toán-Hương', 'Lịch Sử-Sơn', 'Tin học-Diễm', 'Ngữ văn-Duyên', 'Vật lí-Hiền'],
  // Thứ 4 (Day 4)
  ['4', '1', 'Hóa học-Kiều', 'Ngoại ngữ-Quốc', 'Địa Lí-Hòa', 'Vật lí-Hiền', 'Lịch Sử-Trang'],
  ['4', '2', 'Vật lí-Hiền', 'HĐ TN-HN-Kiều', 'Ngoại ngữ-Quốc', 'Ngoại ngữ-Anh', 'Tin học-Hiếu'],
  ['4', '3', 'Ngoại ngữ-Thi', 'Toán-CToàn', 'Vật lí-Hiền', 'Toán-Hương', 'HĐ TN-HN-Kiều'],
  ['4', '4', 'Sinh học-Tùng', 'Toán-CToàn', 'Ngữ văn-Ny', 'Toán-Hương', 'GD KTPL-Trường'],
  ['4', '5', 'Toán-Hương', 'Hóa học-Kiều', 'Toán-CToàn', 'GD KTPL-Trường', 'Ngoại ngữ-Anh'],
  // Thứ 5 (Day 5)
  ['5', '1', 'Tin học-Diễm', 'Ngữ văn-Nhịnh', 'Toán-CToàn', 'Ngữ văn-Duyên', 'Toán-Giang'],
  ['5', '2', 'Ngữ văn-Duyên', 'Toán-CToàn', 'GD KTPL-Trường', 'Tin học-Diễm', 'Ngữ văn-Nhịnh'],
  ['5', '3', 'Ngoại ngữ-Thi', 'Tin học-Diễm', 'Ngoại ngữ-Quốc', 'GD KTPL-Trường', 'Tin học-Hiếu'],
  ['5', '4', '', '', '', '', ''],
  ['5', '5', '', '', '', '', ''],
  // Thứ 6 (Day 6)
  ['6', '1', 'Ngữ văn-Duyên', 'Ngoại ngữ-Quốc', 'Vật lí-Hiền', 'Lịch Sử-Trang', 'Ngoại ngữ-Anh'],
  ['6', '2', 'Vật lí-Hiền', 'GD QP-AN-Rạng', 'Ngoại ngữ-Quốc', 'Ngoại ngữ-Anh', 'Địa Lí-Hòa'],
  ['6', '3', 'GDTC-Ẩn', 'Địa Lí-Hòa', 'HĐ TN-HN-Kiều', 'Toán-Hương', 'GD QP-AN-Rạng'],
  ['6', '4', 'GDTC-Ẩn', 'Ngữ văn-Nhịnh', 'Tin học-Diễm', 'HĐ TN-HN-Kiều', 'Toán-Giang'],
  ['6', '5', 'Hóa học-Kiều', 'Toán-CToàn', 'Ngữ văn-Ny', 'Tin học-Diễm', 'Toán-Giang'],
  // Thứ 7 (Day 7)
  ['7', '1', 'Tin học-Diễm', 'Vật lí-Hiền', 'GDTC-Ẩn', 'HĐ TN-HN-Kiều', 'GD KTPL-Trường'],
  ['7', '2', 'GD QP-AN-Rạng', 'Tin học-Diễm', 'GDTC-Ẩn', 'Vật lí-Hiền', 'HĐ TN-HN-Kiều'],
  ['7', '3', 'HĐ TN-HN-Tùng', 'Hóa học-Kiều', 'Tin học-Diễm', 'GDTC-Ẩn', 'Vật lí-Hiền'],
  ['7', '4', 'Sinh học-Tùng', 'HĐ TN-HN-Kiều', 'Ngữ văn-Ny', 'GDTC-Ẩn', 'Ngữ văn-Nhịnh'],
  ['7', '5', 'SHL-Tùng', 'SHL-Kiều', 'SHL-Ny', 'SHL-Diễm', 'SHL-Nhịnh'],
];

// Matrix layout for Grade 11: [Day, Period, 11CB1, 11CB2, 11CB3, 11CB4]
export const RAW_GRADE_11_MATRIX: string[][] = [
  // Thứ 2
  ['2', '1', 'Chào cờ-Huỳnh', 'Chào cờ-Phi', 'Chào cờ-Rỡ', 'Chào cờ-Liên'],
  ['2', '2', 'GD QP-AN-Rạng', 'Tin học-Liên', 'Vật lí-Hiền', 'GDTC-Ngân'],
  ['2', '3', 'Hóa học-Thơ', 'HĐ TN-HN-Phi', 'Tin học-Liên', 'GDTC-Ngân'],
  ['2', '4', 'HĐ TN-HN-Phi', 'Ngữ văn-Nhịnh', 'Ngoại ngữ-Anh', 'Địa Lí-Tuấn'],
  ['2', '5', 'Ngữ văn-Lắm', 'Hóa học-Phi', 'Ngữ văn-Nhịnh', 'Toán-Giang'],
  // Thứ 3
  ['3', '1', 'Tin học-Liên', 'Địa Lí-Tuấn', 'Ngữ văn-Nhịnh', 'Ngoại ngữ-Quốc'],
  ['3', '2', 'Ngoại ngữ-Anh', 'Ngoại ngữ-Quốc', 'Địa Lí-Tuấn', 'Tin học-Liên'],
  ['3', '3', 'Ngữ văn-Lắm', 'Ngữ văn-Nhịnh', 'Ngoại ngữ-Anh', 'Toán-Giang'],
  ['3', '4', 'Sinh học-Huỳnh', 'Toán-CToàn', 'Vật lí-Hiền', 'Toán-Giang'],
  ['3', '5', 'Toán-VToàn', 'Toán-CToàn', 'Toán-Giang', 'Ngữ văn-Lắm'],
  // Thứ 4
  ['4', '1', 'Toán-VToàn', 'Lịch Sử-Rỡ', 'GDTC-Ngân', 'Địa Lí-Tuấn'],
  ['4', '2', 'Toán-VToàn', 'Toán-CToàn', 'GDTC-Ngân', 'GD KTPL-Trường'],
  ['4', '3', 'Ngoại ngữ-Anh', 'GDTC-Ngân', 'Tin học-Liên', 'Lịch Sử-Rỡ'],
  ['4', '4', 'Ngữ văn-Lắm', 'GDTC-Ngân', 'Ngoại ngữ-Anh', 'Tin học-Liên'],
  ['4', '5', 'Tin học-Liên', 'Vật lí-Thùy', 'Vật lí-Hiền', 'Ngữ văn-Lắm'],
  // Thứ 5
  ['5', '1', 'Lịch Sử-Rỡ', 'Ngoại ngữ-Quốc', 'GD QP-AN-Rạng', 'GD KTPL-Trường'],
  ['5', '2', 'HĐ TN-HN-Phi', 'Vật lí-Thùy', 'Toán-Giang', 'Ngoại ngữ-Quốc'],
  ['5', '3', 'Sinh học-Huỳnh', 'Ngữ văn-Nhịnh', 'HĐ TN-HN-Phi', 'Vật lí-Thùy'],
  ['5', '4', '', '', '', ''],
  ['5', '5', '', '', '', ''],
  // Thứ 6
  ['6', '1', 'GDTC-Ngân', 'Địa Lí-Tuấn', 'Toán-Giang', 'Tin học-Liên'],
  ['6', '2', 'GDTC-Ngân', 'Tin học-Liên', 'Toán-Giang', 'Vật lí-Thùy'],
  ['6', '3', 'Ngoại ngữ-Anh', 'Ngoại ngữ-Quốc', 'Địa Lí-Tuấn', 'Toán-Giang'],
  ['6', '4', 'Hóa học-Thơ', 'Toán-CToàn', 'GD KTPL-Trường', 'HĐ TN-HN-Phi'],
  ['6', '5', 'Vật lí-Thùy', 'Hóa học-Phi', 'Ngữ văn-Nhịnh', 'Ngoại ngữ-Quốc'],
  // Thứ 7
  ['7', '1', 'Toán-VToàn', 'GD QP-AN-Rạng', 'HĐ TN-HN-Phi', 'Vật lí-Thùy'],
  ['7', '2', 'Vật lí-Thùy', 'HĐ TN-HN-Phi', 'GD KTPL-Trường', 'Ngữ văn-Lắm'],
  ['7', '3', 'Sinh học-Huỳnh', 'Hóa học-Phi', 'Tin học-Liên', 'GD QP-AN-Rạng'],
  ['7', '4', 'Hóa học-Thơ', 'Tin học-Liên', 'Lịch Sử-Rỡ', 'HĐ TN-HN-Phi'],
  ['7', '5', 'SHL-Huỳnh', 'SHL-Phi', 'SHL-Rỡ', 'SHL-Liên'],
];

// Matrix layout for Grade 12: [Day, Period, 12CB1, 12CB2, 12CB3, 12CB4, 12CB5]
export const RAW_GRADE_12_MATRIX: string[][] = [
  // Thứ 2
  ['2', '1', 'Chào cờ-Thơ', 'Chào cờ-Duyên', 'Chào cờ-Hương', 'Chào cờ-Trang', 'Chào cờ-Sơn'],
  ['2', '2', 'Hóa học-Thơ', 'HĐ TN-HN-Duyên', 'Lịch Sử-Rỡ', 'Ngữ văn-Ny', 'Sinh học-Huỳnh'],
  ['2', '3', 'Ngữ văn-Ny', 'Ngoại ngữ-Thi', 'Ngữ văn-Lắm', 'Lịch Sử-Trang', 'Lịch Sử-Sơn'],
  ['2', '4', 'HĐ TN-HN-Thơ', 'Lịch Sử-Trang', 'Ngữ văn-Lắm', 'Ngoại ngữ-Thi', 'Công nghệ-Tùng'],
  ['2', '5', 'Ngoại ngữ-Thi', 'Hóa học-Thơ', 'Địa Lí-Tuấn', 'HĐ TN-HN-Trang', 'Ngoại ngữ-Bền'],
  // Thứ 3
  ['3', '1', 'Toán-Tới', 'Lịch Sử-Trang', 'GD QP-AN-Rạng', 'GD KTPL-Trường', 'Ngữ văn-Lắm'],
  ['3', '2', 'Toán-Tới', 'Ngoại ngữ-Thi', 'Tin học-Hiếu', 'Lịch Sử-Trang', 'Ngữ văn-Lắm'],
  ['3', '3', 'Vật lí-Thùy', 'Địa Lí-Hòa', 'GD KTPL-Trường', 'Ngoại ngữ-Thi', 'Địa Lí-Tuấn'],
  ['3', '4', 'Lịch Sử-Sơn', 'HĐ TN-HN-Duyên', 'Ngoại ngữ-Thi', 'Toán-Tới', 'Toán-VToàn'],
  ['3', '5', 'Ngoại ngữ-Thi', 'Sinh học-Huỳnh', 'Vật lí-Thùy', 'Địa Lí-Hòa', 'Ngoại ngữ-Bền'],
  // Thứ 4
  ['4', '1', 'Tin học-Hiếu', 'Hóa học-Thơ', 'Ngoại ngữ-Thi', 'GD KTPL-Trường', 'Ngoại ngữ-Bền'],
  ['4', '2', 'Hóa học-Thơ', 'Ngoại ngữ-Thi', 'Toán-Hương', 'Địa Lí-Hòa', 'Địa Lí-Tuấn'],
  ['4', '3', 'Lịch Sử-Sơn', 'Lịch Sử-Trang', 'GD KTPL-Trường', 'Tin học-Hiếu', 'Toán-VToàn'],
  ['4', '4', 'Toán-Tới', 'Toán-VToàn', 'HĐ TN-HN-Rỡ', 'Vật lí-Thùy', 'Lịch Sử-Sơn'],
  ['4', '5', 'Ngữ văn-Ny', 'Toán-VToàn', 'Lịch Sử-Rỡ', 'Toán-Tới', 'Công nghệ-Tùng'],
  // Thứ 5
  ['5', '1', 'Vật lí-Thùy', 'Sinh học-Huỳnh', 'Tin học-Hiếu', 'Toán-Tới', 'GDTC-Ngân'],
  ['5', '2', 'Sinh học-Huỳnh', 'GD QP-AN-Rạng', 'HĐ TN-HN-Rỡ', 'Toán-Tới', 'GDTC-Ngân'],
  ['5', '3', 'Toán-Tới', 'Ngữ văn-Duyên', 'Lịch Sử-Rỡ', 'GDTC-Ngân', 'GD QP-AN-Rạng'],
  ['5', '4', 'GD QP-AN-Rạng', 'Tin học-Hiếu', 'Ngoại ngữ-Thi', 'GDTC-Ngân', 'HĐ TN-HN-Trí'],
  ['5', '5', '', '', '', '', ''],
  // Thứ 6
  ['6', '1', 'Ngữ văn-Ny', 'Địa Lí-Hòa', 'Vật lí-Thùy', 'GD QP-AN-Rạng', 'Ngữ văn-Lắm'],
  ['6', '2', 'Ngữ văn-Ny', 'Ngữ văn-Duyên', 'Địa Lí-Tuấn', 'Lịch Sử-Trang', 'Ngữ văn-Lắm'],
  ['6', '3', 'Lịch Sử-Sơn', 'GDTC-Ngân', 'Ngữ văn-Lắm', 'Vật lí-Thùy', 'Toán-VToàn'],
  ['6', '4', 'Ngoại ngữ-Thi', 'GDTC-Ngân', 'Toán-Hương', 'Ngữ văn-Ny', 'Toán-VToàn'],
  ['6', '5', 'HĐ TN-HN-Thơ', 'Toán-VToàn', 'Toán-Hương', 'Ngoại ngữ-Thi', 'GD KTPL-Trường'],
  // Thứ 7
  ['7', '1', 'Sinh học-Huỳnh', 'Tin học-Hiếu', 'GDTC-Ngân', 'Ngữ văn-Ny', 'HĐ TN-HN-Trí'],
  ['7', '2', 'Tin học-Hiếu', 'Toán-VToàn', 'GDTC-Ngân', 'Ngữ văn-Ny', 'Sinh học-Huỳnh'],
  ['7', '3', 'GDTC-Ngân', 'Ngữ văn-Duyên', 'Ngữ văn-Lắm', 'Tin học-Hiếu', 'GD KTPL-Trường'],
  ['7', '4', 'GDTC-Ngân', 'Ngữ văn-Duyên', 'Toán-Hương', 'HĐ TN-HN-Trang', 'Lịch Sử-Sơn'],
  ['7', '5', 'SHL-Thơ', 'SHL-Duyên', 'SHL-Hương', 'SHL-Trang', 'SHL-Sơn'],
];

function parseCell(cellText: string): { subject: string; teacherAlias: string } {
  const trimmed = (cellText || '').trim();
  if (!trimmed) return { subject: '', teacherAlias: '' };
  
  // Use lastIndexOf('-') because subject names may contain hyphens (e.g., 'GD QP-AN-Rạng', 'HĐ TN-HN-Tùng')
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
          room: cls.room,
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
          room: cls.room
        });
      }
    });
  });

  // Grade 11 classes
  const g11Classes = [
    { id: 'cls-11cb1', name: '11CB1', room: 'P.11-1' },
    { id: 'cls-11cb2', name: '11CB2', room: 'P.11-2' },
    { id: 'cls-11cb3', name: '11CB3', room: 'P.11-3' },
    { id: 'cls-11cb4', name: '11CB4', room: 'P.11-4' },
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
          room: cls.room,
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
          room: cls.room
        });
      }
    });
  });

  // Grade 12 classes
  const g12Classes = [
    { id: 'cls-12cb1', name: '12CB1', room: 'P.12-1' },
    { id: 'cls-12cb2', name: '12CB2', room: 'P.12-2' },
    { id: 'cls-12cb3', name: '12CB3', room: 'P.12-3' },
    { id: 'cls-12cb4', name: '12CB4', room: 'P.12-4' },
    { id: 'cls-12cb5', name: '12CB5', room: 'P.12-5' },
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
          room: cls.room,
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
          room: cls.room
        });
      }
    });
  });

  return slots;
}
