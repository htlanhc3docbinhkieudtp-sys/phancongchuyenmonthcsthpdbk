/**
 * Dữ liệu chính thức trích xuất từ KẾ HOẠCH Số: 50/KH-THCS&THPTĐBK
 * Ngày ban hành: 16/10/2026 của Trường THCS và THPT Đốc Binh Kiều
 * Về việc tổ chức kiểm tra, đánh giá giữa học kỳ I năm học 2026 - 2027
 */

export interface ExamScheduleSlot {
  dayOfWeek: string;
  dateStr: string;
  timeSlot: string;
  session: 'Sáng' | 'Chiều';
  level: 'THCS' | 'THPT';
  grades: string[];
  subjectName: string;
  durationMinutes: number;
  note?: string;
}

export interface ExamMilestone {
  timeRange: string;
  content: string;
  leadUnit: string;
  output: string;
}

export const MID_TERM_1_PLAN_CONFIG = {
  planNumber: '50/KH-THCS&THPTĐBK',
  planDate: '16/10/2026',
  academicYear: '2026 - 2027',
  schoolName: 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU',
  governingBody: 'SỞ GDĐT TỈNH ĐỒNG THÁP',
  location: 'Đồng Tháp',
  
  // Lãnh đạo phụ trách
  principal: {
    name: 'Lê Thanh Cường',
    title: 'Hiệu trưởng',
    role: 'Trưởng ban Chỉ đạo',
  },
  vicePrincipalChuyenMon: {
    name: 'Nguyễn Minh Trí',
    title: 'Phó Hiệu trưởng',
    role: 'Phó Trưởng ban Thường trực (Chuyên môn toàn trường)',
    receiveExamEmail: 'nmtri.c3docbinhkieu@dongthap.edu.vn',
  },
  vicePrincipalTHCSDBK: {
    name: 'Phan Thanh Thảo',
    title: 'Phó Hiệu trưởng',
    role: 'Phụ trách Điểm trường Đốc Binh Kiều (24 lớp THCS A1-A6, 980 HS)',
  },
  vicePrincipalTHCSTK: {
    name: 'Nguyễn Thanh Tòng',
    title: 'Phó Hiệu trưởng',
    role: 'Phụ trách Điểm trường Tân Kiều (15 lớp THCS từ A7 trở đi, 602 HS)',
  },

  // Quy định nộp đề
  examSubmission: {
    deadlineText: 'Trước 17h00 ngày 25/10/2026',
    deadlineDate: '2026-10-25T17:00:00',
    recipientName: 'Thầy Phó Hiệu trưởng Nguyễn Minh Trí',
    recipientEmail: 'nmtri.c3docbinhkieu@dongthap.edu.vn',
    requiredFiles: [
      '01 Đề chính thức',
      '01 Đề dự bị',
      'Ma trận và Bản đặc tả chi tiết',
      'Hướng dẫn chấm & biểu điểm chi tiết (đến 0,25 điểm hoặc theo quy chuẩn)',
      'Phiếu soi đáp án trắc nghiệm (trộn tối thiểu 04 mã đề)',
    ],
    matrixRatio: 'Nhận biết 40% - Thông hiểu 30% - Vận dụng 30% (Khối 12 bám sát cấu trúc đề tốt nghiệp 2025 theo QĐ 764/QĐ-BGDĐT)',
    confidentialityRule: 'Đề kiểm tra là tài liệu MẬT. Nhà trường không tổ chức phản biện chéo giữa các GV trong tổ. Giáo viên ra đề tự kiểm tra tính chính xác về kiến thức, câu chữ, thời lượng, ký xác nhận trước khi nộp bảo mật trực tiếp cho PHT Chuyên môn.',
  },

  // Quy mô học sinh & phòng thi
  studentScale: {
    thptTotalClasses: 14,
    thptTotalStudents: 529,
    thptDetails: 'Khối 10: 5 lớp (203 HS); Khối 11: 4 lớp (141 HS); Khối 12: 5 lớp (185 HS) — Kiểm tra tập trung tại Điểm trường chính',
    thcsTotalClasses: 39,
    thcsTotalStudents: 1582,
    thcsDetails: 'Khối 6: 10 lớp (411 HS); Khối 7: 9 lớp (367 HS); Khối 8: 10 lớp (398 HS); Khối 9: 10 lớp (406 HS) — Cơ sở ĐBK (24 lớp, 980 HS) & Cơ sở Tân Kiều (15 lớp, 602 HS)',
  },

  // Môn kiểm tra tập trung vs tại lớp
  subjectCategories: {
    thcsConcentrated: ['Ngữ văn', 'Toán', 'Khoa học tự nhiên', 'Tiếng Anh', 'Lịch sử và Địa lí', 'Giáo dục công dân'],
    thcsInClass: ['Công nghệ', 'Tin học', 'Giáo dục thể chất', 'Nghệ thuật (Âm nhạc, Mỹ thuật)', 'Hoạt động trải nghiệm, hướng nghiệp'],
    thptConcentrated: ['Ngữ văn', 'Toán', 'Tiếng Anh', 'Vật lí', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lí', 'Giáo dục kinh tế và pháp luật', 'Tin học', 'Công nghệ (K12)'],
    thptInClass: ['Giáo dục thể chất', 'Giáo dục Quốc phòng và An ninh', 'Hoạt động trải nghiệm, hướng nghiệp'],
  },

  // Tiến độ thời gian (từ Bảng VIII Kế hoạch 50)
  milestones: [
    {
      timeRange: '16/10 - 20/10/2026',
      content: 'Ban hành Kế hoạch; Tổ chuyên môn thống nhất Ma trận, Bản đặc tả; công bố ma trận và đề cương ôn tập cho học sinh.',
      leadUnit: 'Ban Giám hiệu, Tổ trưởng chuyên môn',
      output: 'Kế hoạch ban hành; Đề cương gửi học sinh',
    },
    {
      timeRange: 'Trước 17h00 ngày 25/10/2026',
      content: 'Hoàn thành biên soạn đề chính thức, đề dự bị, hướng dẫn chấm; nộp đề bảo mật cho PHT chuyên môn (Thầy Nguyễn Minh Trí).',
      leadUnit: 'Giáo viên ra đề',
      output: '100% đề thi được duyệt bảo mật',
    },
    {
      timeRange: '26/10 - 30/10/2026',
      content: 'Lập danh sách phòng kiểm tra, số báo danh, sơ đồ phòng; in sao, đóng gói, niêm phong đề kiểm tra tại các điểm trường.',
      leadUnit: 'Tổ Văn phòng, Ban In sao đề',
      output: 'Túi đề niêm phong; DS phòng thi niêm yết',
    },
    {
      timeRange: '02/11 - 06/11/2026 (Tuần 9)',
      content: 'Tổ chức coi kiểm tra tập trung theo lịch tại 03 điểm trường; thu bài, bàn giao và làm phách bài tự luận.',
      leadUnit: 'Hội đồng coi kiểm tra, Tổ Văn phòng',
      output: 'Kiểm tra an toàn, đúng quy chế; bài rọc phách',
    },
    {
      timeRange: '04/11 - 10/11/2026',
      content: 'Chấm bài kiểm tra tập trung (chấm máy trắc nghiệm, chấm 2 vòng tự luận); ghép phách, đối soát điểm.',
      leadUnit: 'Tổ chấm thi, Tổ Văn phòng',
      output: '100% bài kiểm tra được chấm xong, bảo mật điểm',
    },
    {
      timeRange: 'Trước 17h00 ngày 14/11/2026',
      content: 'Hoàn thành nhập điểm giữa kỳ I vào hệ thống VnEdu; kiểm tra đối soát dữ liệu và khóa sổ điểm đợt 1.',
      leadUnit: 'Giáo viên bộ môn, Ban Quản trị CNTT',
      output: 'Điểm số cập nhật đầy đủ trên VnEdu',
    },
    {
      timeRange: '09/11 - 14/11/2026 (Tuần 10)',
      content: 'Trả bài, sửa bài trên lớp cho học sinh; thu bài lưu trữ; nhận đơn và giải quyết phúc khảo; tổ chức kiểm tra bù.',
      leadUnit: 'GV bộ môn, Hội đồng phúc khảo',
      output: 'Học sinh đối soát xong; giải quyết xong phúc khảo',
    },
    {
      timeRange: '16/11/2026 trở đi',
      content: 'Họp sơ kết rút kinh nghiệm; triển khai kế hoạch phụ đạo học sinh yếu kém và bồi dưỡng học sinh giỏi.',
      leadUnit: 'Ban Giám hiệu, Tổ chuyên môn',
      output: 'Các lớp phụ đạo, bồi dưỡng hoạt động',
    },
  ] as ExamMilestone[],
};

/**
 * Lịch thi chi tiết trích xuất từ Phụ lục I Kế hoạch 50
 */
export const OFFICIAL_EXAM_SCHEDULE: ExamScheduleSlot[] = [
  // --- THCS Khối 8 & 9 (Sáng) ---
  { dayOfWeek: 'Thứ Hai', dateStr: '02/11/2026', timeSlot: '7h30 - 9h00', session: 'Sáng', level: 'THCS', grades: ['8', '9'], subjectName: 'Ngữ văn', durationMinutes: 90 },
  { dayOfWeek: 'Thứ Hai', dateStr: '02/11/2026', timeSlot: '9h30 - 10h15', session: 'Sáng', level: 'THCS', grades: ['8', '9'], subjectName: 'Giáo dục công dân', durationMinutes: 45 },
  { dayOfWeek: 'Thứ Ba', dateStr: '03/11/2026', timeSlot: '7h30 - 9h00', session: 'Sáng', level: 'THCS', grades: ['8', '9'], subjectName: 'Toán', durationMinutes: 90 },
  { dayOfWeek: 'Thứ Ba', dateStr: '03/11/2026', timeSlot: '9h30 - 10h30', session: 'Sáng', level: 'THCS', grades: ['8', '9'], subjectName: 'Lịch sử và Địa lí', durationMinutes: 60 },
  { dayOfWeek: 'Thứ Tư', dateStr: '04/11/2026', timeSlot: '7h30 - 8h30', session: 'Sáng', level: 'THCS', grades: ['8', '9'], subjectName: 'Tiếng Anh', durationMinutes: 60 },
  { dayOfWeek: 'Thứ Tư', dateStr: '04/11/2026', timeSlot: '9h00 - 10h00', session: 'Sáng', level: 'THCS', grades: ['8', '9'], subjectName: 'Khoa học tự nhiên', durationMinutes: 60 },

  // --- THCS Khối 6 & 7 (Chiều) ---
  { dayOfWeek: 'Thứ Hai', dateStr: '02/11/2026', timeSlot: '13h30 - 15h00', session: 'Chiều', level: 'THCS', grades: ['6', '7'], subjectName: 'Ngữ văn', durationMinutes: 90 },
  { dayOfWeek: 'Thứ Hai', dateStr: '02/11/2026', timeSlot: '15h30 - 16h15', session: 'Chiều', level: 'THCS', grades: ['6', '7'], subjectName: 'Giáo dục công dân', durationMinutes: 45 },
  { dayOfWeek: 'Thứ Ba', dateStr: '03/11/2026', timeSlot: '13h30 - 15h00', session: 'Chiều', level: 'THCS', grades: ['6', '7'], subjectName: 'Toán', durationMinutes: 90 },
  { dayOfWeek: 'Thứ Ba', dateStr: '03/11/2026', timeSlot: '15h30 - 16h30', session: 'Chiều', level: 'THCS', grades: ['6', '7'], subjectName: 'Lịch sử và Địa lí', durationMinutes: 60 },
  { dayOfWeek: 'Thứ Tư', dateStr: '04/11/2026', timeSlot: '13h30 - 14h30', session: 'Chiều', level: 'THCS', grades: ['6', '7'], subjectName: 'Tiếng Anh', durationMinutes: 60 },
  { dayOfWeek: 'Thứ Tư', dateStr: '04/11/2026', timeSlot: '15h00 - 16h00', session: 'Chiều', level: 'THCS', grades: ['6', '7'], subjectName: 'Khoa học tự nhiên', durationMinutes: 60 },

  // --- THPT Khối 11 & 12 (Sáng) ---
  { dayOfWeek: 'Thứ Hai', dateStr: '02/11/2026', timeSlot: '7h30 - 9h00', session: 'Sáng', level: 'THPT', grades: ['11', '12'], subjectName: 'Ngữ văn', durationMinutes: 90 },
  { dayOfWeek: 'Thứ Hai', dateStr: '02/11/2026', timeSlot: '9h30 - 10h15 (K11) / 10h20 (K12)', session: 'Sáng', level: 'THPT', grades: ['11', '12'], subjectName: 'Vật lí', durationMinutes: 45, note: 'Khối 12: 50 phút' },
  { dayOfWeek: 'Thứ Ba', dateStr: '03/11/2026', timeSlot: '7h30 - 9h00', session: 'Sáng', level: 'THPT', grades: ['11', '12'], subjectName: 'Toán', durationMinutes: 90 },
  { dayOfWeek: 'Thứ Ba', dateStr: '03/11/2026', timeSlot: '9h30 - 10h15 (K11) / 10h20 (K12)', session: 'Sáng', level: 'THPT', grades: ['11', '12'], subjectName: 'Sinh học', durationMinutes: 45, note: 'Khối 12: 50 phút' },
  { dayOfWeek: 'Thứ Tư', dateStr: '04/11/2026', timeSlot: '7h30 - 8h30', session: 'Sáng', level: 'THPT', grades: ['11', '12'], subjectName: 'Tiếng Anh', durationMinutes: 60 },
  { dayOfWeek: 'Thứ Tư', dateStr: '04/11/2026', timeSlot: '9h00 - 9h45 (K11) / 9h50 (K12)', session: 'Sáng', level: 'THPT', grades: ['11', '12'], subjectName: 'Địa lí', durationMinutes: 45, note: 'Khối 12: 50 phút' },
  { dayOfWeek: 'Thứ Năm', dateStr: '05/11/2026', timeSlot: '7h30 - 8h15 (K11) / 8h20 (K12)', session: 'Sáng', level: 'THPT', grades: ['11', '12'], subjectName: 'Hóa học HOẶC GDKT&PL', durationMinutes: 45, note: 'Khối 12: 50 phút' },
  { dayOfWeek: 'Thứ Năm', dateStr: '05/11/2026', timeSlot: '8h45 - 9h30 (K11) / 9h35 (K12)', session: 'Sáng', level: 'THPT', grades: ['11', '12'], subjectName: 'Tin học HOẶC Công nghệ', durationMinutes: 45, note: 'Khối 12: 50 phút' },
  { dayOfWeek: 'Thứ Sáu', dateStr: '06/11/2026', timeSlot: '7h30 - 8h15 (K11) / 8h20 (K12)', session: 'Sáng', level: 'THPT', grades: ['11', '12'], subjectName: 'Lịch sử', durationMinutes: 45, note: 'Khối 12: 50 phút' },

  // --- THPT Khối 10 (Chiều) ---
  { dayOfWeek: 'Thứ Hai', dateStr: '02/11/2026', timeSlot: '13h30 - 15h00', session: 'Chiều', level: 'THPT', grades: ['10'], subjectName: 'Ngữ văn', durationMinutes: 90 },
  { dayOfWeek: 'Thứ Hai', dateStr: '02/11/2026', timeSlot: '15h30 - 16h15', session: 'Chiều', level: 'THPT', grades: ['10'], subjectName: 'Vật lí', durationMinutes: 45 },
  { dayOfWeek: 'Thứ Ba', dateStr: '03/11/2026', timeSlot: '13h30 - 15h00', session: 'Chiều', level: 'THPT', grades: ['10'], subjectName: 'Toán', durationMinutes: 90 },
  { dayOfWeek: 'Thứ Ba', dateStr: '03/11/2026', timeSlot: '15h30 - 16h15', session: 'Chiều', level: 'THPT', grades: ['10'], subjectName: 'Sinh học', durationMinutes: 45 },
  { dayOfWeek: 'Thứ Tư', dateStr: '04/11/2026', timeSlot: '13h30 - 14h30', session: 'Chiều', level: 'THPT', grades: ['10'], subjectName: 'Tiếng Anh', durationMinutes: 60 },
  { dayOfWeek: 'Thứ Tư', dateStr: '04/11/2026', timeSlot: '15h00 - 15h45', session: 'Chiều', level: 'THPT', grades: ['10'], subjectName: 'Địa lí', durationMinutes: 45 },
  { dayOfWeek: 'Thứ Năm', dateStr: '05/11/2026', timeSlot: '13h30 - 14h15', session: 'Chiều', level: 'THPT', grades: ['10'], subjectName: 'Hóa học HOẶC GDKT&PL', durationMinutes: 45 },
  { dayOfWeek: 'Thứ Năm', dateStr: '05/11/2026', timeSlot: '14h45 - 15h30', session: 'Chiều', level: 'THPT', grades: ['10'], subjectName: 'Tin học HOẶC Công nghệ', durationMinutes: 45 },
  { dayOfWeek: 'Thứ Sáu', dateStr: '06/11/2026', timeSlot: '13h30 - 14h15', session: 'Chiều', level: 'THPT', grades: ['10'], subjectName: 'Lịch sử', durationMinutes: 45 },
];

/**
 * Tạo nội dung email thông báo phân công ra đề MẬT cho 01 giáo viên
 * theo đúng tinh thần Kế hoạch số 50/KH-THCS&THPTĐBK
 */
export function generateTeacherAssignmentEmailContent(params: {
  teacherName: string;
  teacherEmail?: string;
  subjectName: string;
  gradeLabel: string;
  level: string;
  durationMinutes: number;
  examFormat: string;
}): {
  subject: string;
  htmlBody: string;
  plainText: string;
} {
  const { teacherName, subjectName, gradeLabel, level, durationMinutes, examFormat } = params;
  const cfg = MID_TERM_1_PLAN_CONFIG;

  const emailSubject = `[MẬT] Phân công ra đề kiểm tra Giữa Học kỳ I (Năm học 2026 - 2027) - Môn ${subjectName} ${gradeLabel}`;

  const plainText = `
KÍNH GỬI: Thầy/Cô ${teacherName}

Căn cứ Kế hoạch số 50/KH-THCS&THPTĐBK ngày 16/10/2026 của Trường THCS và THPT Đốc Binh Kiều về việc tổ chức kiểm tra, đánh giá giữa học kỳ I năm học 2026 - 2027;
Ban Giám hiệu nhà trường thông báo phân công Thầy/Cô thực hiện nhiệm vụ biên soạn đề kiểm tra như sau:

1. THÔNG TIN PHÂN CÔNG:
- Họ và tên giáo viên ra đề: Thầy/Cô ${teacherName}
- Môn kiểm tra: ${subjectName}
- Cấp học & Khối: ${level} - ${gradeLabel}
- Đợt kiểm tra: GIỮA HỌC KỲ I (Năm học 2026 - 2027)
- Thời lượng làm bài: ${durationMinutes} phút
- Hình thức đề: ${examFormat}

2. YÊU CẦU ĐỐI VỚI HỒ SƠ ĐỀ KIỂM TRA:
- Mỗi môn/khối biên soạn độc lập: 01 ĐỀ CHÍNH THỨC và 01 ĐỀ DỰ BỊ.
- Mỗi đề phải kèm theo:
  + Ma trận đề kiểm tra và Bản đặc tả chi tiết (thống nhất trong tổ/nhóm chuyên môn).
  + Hướng dẫn chấm, biểu điểm chi tiết (đến 0,25 điểm hoặc theo quy chuẩn).
  + Phiếu soi đáp án trắc nghiệm (đề trắc nghiệm trộn tối thiểu 04 mã đề khác nhau).
- Tỷ lệ các mức độ đánh giá: Nhận biết 40%; Thông hiểu 30%; Vận dụng 30%. Riêng khối 12 bám sát mức độ đề thi tốt nghiệp THPT năm 2025.

3. THỜI HẠN VÀ ĐỊA CHỈ NỘP ĐỀ:
- Thời hạn hoàn thành và nộp đề: Chậm nhất trước 17h00 ngày 25/10/2026.
- Người tiếp nhận và phê duyệt: ${cfg.examSubmission.recipientName}
- Email nhận file bảo mật: ${cfg.vicePrincipalChuyenMon.receiveExamEmail}

4. LƯU Ý ĐẶC BIỆT VỀ BẢO MẬT:
Đề kiểm tra là tài liệu MẬT. Nhà trường không tổ chức phản biện chéo giữa các giáo viên trong nhóm bộ môn nhằm tránh lộ nội dung đề. Thầy/Cô chịu trách nhiệm hoàn toàn về tính chính xác, khoa học, định dạng đề thi và tuyệt đối giữ bí mật nội dung ra đề.

Trân trọng cám ơn sự hợp tác và tinh thần trách nhiệm của Thầy/Cô!

BAN GIÁM HIỆU TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU
Phó Hiệu trưởng phụ trách Chuyên môn: ${cfg.vicePrincipalChuyenMon.name}
`.trim();

  const htmlBody = `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1e293b; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
  <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 24px; color: #ffffff; text-align: center;">
    <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.9;">SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP</p>
    <h2 style="margin: 4px 0 8px; font-size: 16px; font-weight: 700;">TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU</h2>
    <div style="display: inline-block; background-color: #ef4444; color: #ffffff; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 9999px; margin-top: 6px; letter-spacing: 1px;">
      TÀI LIỆU BẢO MẬT
    </div>
    <h1 style="margin: 12px 0 4px; font-size: 18px; font-weight: 800; color: #fbbf24;">THÔNG BÁO PHÂN CÔNG RA ĐỀ KIỂM TRA</h1>
    <p style="margin: 0; font-size: 13px; opacity: 0.95;">Giữa Học kỳ I — Năm học 2026 - 2027</p>
  </div>

  <div style="padding: 24px;">
    <p style="font-size: 15px; margin-top: 0;">Kính gửi: <strong>Thầy/Cô ${teacherName}</strong>,</p>
    <p style="font-size: 13.5px; color: #475569; text-align: justify;">
      Căn cứ Kế hoạch số <strong>50/KH-THCS&THPTĐBK</strong> ngày 16/10/2026 của Trường THCS và THPT Đốc Binh Kiều về việc tổ chức kiểm tra, đánh giá giữa học kỳ I năm học 2026 - 2027; Ban Giám hiệu nhà trường trân trọng thông báo phân công Thầy/Cô thực hiện nhiệm vụ biên soạn đề kiểm tra định kỳ với các nội dung chi tiết như sau:
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #2563eb; border-radius: 8px; padding: 16px; margin: 18px 0;">
      <h3 style="margin: 0 0 12px; font-size: 14px; color: #1e3a8a; text-transform: uppercase; font-weight: 700;">
        🎯 Thông tin nhiệm vụ ra đề
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 140px;">Giáo viên ra đề:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${teacherName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Môn kiểm tra:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #1d4ed8; font-size: 14.5px;">${subjectName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Cấp học & Khối:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${level} — ${gradeLabel}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Thời lượng làm bài:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #b45309;">${durationMinutes} phút</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Hình thức đề:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #334155;">${examFormat}</td>
        </tr>
      </table>
    </div>

    <div style="margin: 18px 0;">
      <h3 style="margin: 0 0 10px; font-size: 14px; color: #1e293b; font-weight: 700;">
        📑 Quy cách và hồ sơ nộp kèm:
      </h3>
      <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155;">
        <li style="margin-bottom: 6px;">Biên soạn độc lập <strong>01 đề chính thức</strong> và <strong>01 đề dự bị</strong>.</li>
        <li style="margin-bottom: 6px;">Kèm <strong>Ma trận đề kiểm tra</strong> và <strong>Bảng đặc tả chi tiết</strong> đã thống nhất trong tổ/nhóm chuyên môn.</li>
        <li style="margin-bottom: 6px;">Kèm <strong>Hướng dẫn chấm, biểu điểm chi tiết</strong> (chia nhỏ đến 0,25 điểm hoặc theo quy chuẩn).</li>
        <li style="margin-bottom: 6px;">Đề trắc nghiệm kèm <strong>Phiếu soi đáp án</strong> và trộn tối thiểu <strong>04 mã đề</strong> khác nhau.</li>
        <li>Tỷ lệ mức độ: <em>40% Nhận biết – 30% Thông hiểu – 30% Vận dụng</em> (Khối 12 bám sát định dạng thi tốt nghiệp 2025).</li>
      </ul>
    </div>

    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px 16px; margin: 18px 0;">
      <div style="display: flex; align-items: center; margin-bottom: 6px;">
        <span style="color: #dc2626; font-weight: 800; font-size: 13.5px;">⏰ THỜI HẠN VÀ ĐỊA CHỈ NỘP ĐỀ:</span>
      </div>
      <p style="margin: 0 0 6px; font-size: 13.5px; color: #991b1b;">
        Hạn chót: <strong>Trước 17h00 ngày 25/10/2026</strong>.
      </p>
      <p style="margin: 0; font-size: 13px; color: #7f1d1d;">
        Gửi bảo mật trực tiếp cho: <strong>${cfg.examSubmission.recipientName}</strong><br/>
        Email: <a href="mailto:${cfg.vicePrincipalChuyenMon.receiveExamEmail}" style="color: #2563eb; font-weight: 700; text-decoration: underline;">${cfg.vicePrincipalChuyenMon.receiveExamEmail}</a>
      </p>
    </div>

    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 14px; margin-top: 16px; font-size: 12.5px; color: #92400e; text-align: justify;">
      🔒 <strong>LƯU Ý BẢO MẬT:</strong> Đề kiểm tra là tài liệu <strong>MẬT</strong>. Nhà trường không tổ chức phản biện chéo giữa các giáo viên trong nhóm bộ môn nhằm tránh lộ đề. Thầy/Cô vui lòng bảo mật tuyệt đối thông tin phân công và nội dung đề kiểm tra.
    </div>
  </div>

  <div style="background-color: #f1f5f9; padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
    <strong>TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU</strong><br/>
    Hệ thống Quản lý Chuyên môn & Khảo thí Trường học
  </div>
</div>
`.trim();

  return {
    subject: emailSubject,
    htmlBody,
    plainText,
  };
}
