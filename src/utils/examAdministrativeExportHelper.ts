import ExcelJS from 'exceljs';
import { Teacher, Department } from '../types';
import { FocusedExamSubjectItem, YearExamProposalMap } from './examProposerHelper';

export interface AdministrativeExportOptions {
  decisionNumber?: string;
  decisionDateText?: string;
  examDaysText?: string;
  submissionDeadlineText?: string;
  locationDateText?: string;
}

const DEFAULT_OPTIONS: Required<AdministrativeExportOptions> = {
  decisionNumber: '50/KH-THCS&THPTĐBK',
  decisionDateText: 'ngày 16 tháng 10 năm 2026',
  examDaysText: 'Tuần 9: Từ 02/11/2026 đến 06/11/2026',
  submissionDeadlineText: 'Trước 17h00 ngày 25/10/2026 (nộp cho PHT Nguyễn Minh Trí)',
  locationDateText: 'Đồng Tháp, ngày 16 tháng 10 năm 2026',
};

// Chuẩn đường viền bảng
const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF475569' } },
  left: { style: 'thin', color: { argb: 'FF475569' } },
  bottom: { style: 'thin', color: { argb: 'FF475569' } },
  right: { style: 'thin', color: { argb: 'FF475569' } },
};

const headerBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'medium', color: { argb: 'FF1E293B' } },
  left: { style: 'thin', color: { argb: 'FF475569' } },
  bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
  right: { style: 'thin', color: { argb: 'FF475569' } },
};

/**
 * Thêm phần Quốc hiệu, Tiêu ngữ và Tên đơn vị ban hành theo chuẩn Nghị định 30/2020/NĐ-CP
 */
function appendAdministrativeHeader(
  ws: ExcelJS.Worksheet,
  title: string,
  academicYear: string,
  options: Required<AdministrativeExportOptions>,
  totalColumns: number,
  subtitleKpi?: string
) {
  const leftEndCol = Math.floor(totalColumns * 0.45);
  const rightStartCol = leftEndCol + 1;

  const leftEndColLetter = getColLetter(leftEndCol);
  const rightStartColLetter = getColLetter(rightStartCol);
  const lastColLetter = getColLetter(totalColumns);

  // Row 1: Tên cơ quan chủ quản / Quốc hiệu
  ws.mergeCells(`A1:${leftEndColLetter}1`);
  const cellA1 = ws.getCell('A1');
  cellA1.value = 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP';
  cellA1.font = { name: 'Times New Roman', size: 10.5, bold: false };
  cellA1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`${rightStartColLetter}1:${lastColLetter}1`);
  const cellR1 = ws.getCell(`${rightStartColLetter}1`);
  cellR1.value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  cellR1.font = { name: 'Times New Roman', size: 11, bold: true };
  cellR1.alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 2: Tên trường / Tiêu ngữ
  ws.mergeCells(`A2:${leftEndColLetter}2`);
  const cellA2 = ws.getCell('A2');
  cellA2.value = 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU';
  cellA2.font = { name: 'Times New Roman', size: 11, bold: true };
  cellA2.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`${rightStartColLetter}2:${lastColLetter}2`);
  const cellR2 = ws.getCell(`${rightStartColLetter}2`);
  cellR2.value = 'Độc lập - Tự do - Hạnh phúc';
  cellR2.font = { name: 'Times New Roman', size: 11.5, bold: true, underline: true };
  cellR2.alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 3: Số quyết định / Địa danh, ngày tháng
  ws.mergeCells(`A3:${leftEndColLetter}3`);
  const cellA3 = ws.getCell('A3');
  cellA3.value = `Số: ${options.decisionNumber}`;
  cellA3.font = { name: 'Times New Roman', size: 10, italic: true };
  cellA3.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`${rightStartColLetter}3:${lastColLetter}3`);
  const cellR3 = ws.getCell(`${rightStartColLetter}3`);
  cellR3.value = options.locationDateText;
  cellR3.font = { name: 'Times New Roman', size: 10.5, italic: true };
  cellR3.alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 5: Tiêu đề văn bản (in hoa đậm, cỡ lớn)
  ws.mergeCells(`A5:${lastColLetter}5`);
  const cellTitle = ws.getCell('A5');
  cellTitle.value = title.toUpperCase();
  cellTitle.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF0F172A' } };
  cellTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(5).height = 28;

  // Row 6: Năm học
  ws.mergeCells(`A6:${lastColLetter}6`);
  const cellYear = ws.getCell('A6');
  cellYear.value = `NĂM HỌC ${academicYear}`;
  cellYear.font = { name: 'Times New Roman', size: 12, bold: true };
  cellYear.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(6).height = 20;

  // Row 7: Căn cứ Quyết định thành lập ban
  ws.mergeCells(`A7:${lastColLetter}7`);
  const cellRef = ws.getCell('A7');
  cellRef.value = `(Kèm theo Quyết định số: ${options.decisionNumber} ${options.decisionDateText} của Hiệu trưởng Trường THCS và THPT Đốc Binh Kiều)`;
  cellRef.font = { name: 'Times New Roman', size: 10, italic: true };
  cellRef.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(7).height = 19;

  if (subtitleKpi) {
    ws.mergeCells(`A8:${lastColLetter}8`);
    const cellKpi = ws.getCell('A8');
    cellKpi.value = subtitleKpi;
    cellKpi.font = { name: 'Times New Roman', size: 9.5, italic: true, color: { argb: 'FF475569' } };
    cellKpi.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(8).height = 18;
  }
}

/**
 * Thêm phần chữ ký phê duyệt theo chuẩn thể thức văn bản hành chính nhà nước
 */
function appendAdministrativeSignatures(
  ws: ExcelJS.Worksheet,
  startRow: number,
  totalColumns: number,
  principalName = 'Lê Thanh Cường',
  vicePrincipalName = 'Nguyễn Minh Trí'
) {
  const leftEndCol = Math.floor(totalColumns * 0.38);
  const midStartCol = leftEndCol + 1;
  const midEndCol = Math.floor(totalColumns * 0.68);
  const rightStartCol = midEndCol + 1;

  const leftColLetter = getColLetter(leftEndCol);
  const midStartLetter = getColLetter(midStartCol);
  const midEndLetter = getColLetter(midEndCol);
  const rightStartLetter = getColLetter(rightStartCol);
  const lastColLetter = getColLetter(totalColumns);

  // Row 1: Nơi nhận & Ngày ký
  const r1 = startRow + 2;
  ws.getCell(`A${r1}`).value = 'Nơi nhận:';
  ws.getCell(`A${r1}`).font = { name: 'Times New Roman', size: 10, bold: true, italic: true };

  ws.mergeCells(`${rightStartLetter}${r1}:${lastColLetter}${r1}`);
  const dateCell = ws.getCell(`${rightStartLetter}${r1}`);
  dateCell.value = 'Tháp Mười, ngày ..... tháng ..... năm 2026';
  dateCell.font = { name: 'Times New Roman', size: 10, italic: true };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Nơi nhận chi tiết
  const r2 = r1 + 1;
  ws.getCell(`A${r2}`).value = '- BGH (để chỉ đạo);';
  ws.getCell(`A${r2}`).font = { name: 'Times New Roman', size: 9 };
  const r3 = r2 + 1;
  ws.getCell(`A${r3}`).value = '- Ban Ra đề, Coi KT (thực hiện);';
  ws.getCell(`A${r3}`).font = { name: 'Times New Roman', size: 9 };
  const r4 = r3 + 1;
  ws.getCell(`A${r4}`).value = '- Các tổ chuyên môn;';
  ws.getCell(`A${r4}`).font = { name: 'Times New Roman', size: 9 };
  const r5 = r4 + 1;
  ws.getCell(`A${r5}`).value = '- Lưu: VT, HS Ban coi thi.';
  ws.getCell(`A${r5}`).font = { name: 'Times New Roman', size: 9 };

  // Tiêu đề chức danh ký
  // Cột giữa: Người lập bảng / Phó Hiệu trưởng duyệt
  ws.mergeCells(`${midStartLetter}${r2}:${midEndLetter}${r2}`);
  const midTitleCell = ws.getCell(`${midStartLetter}${r2}`);
  midTitleCell.value = 'KT. HIỆU TRƯỞNG\nPHÓ HIỆU TRƯỞNG';
  midTitleCell.font = { name: 'Times New Roman', size: 10.5, bold: true };
  midTitleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  // Cột phải: Hiệu trưởng phê duyệt
  ws.mergeCells(`${rightStartLetter}${r2}:${lastColLetter}${r2}`);
  const rightTitleCell = ws.getCell(`${rightStartLetter}${r2}`);
  rightTitleCell.value = 'HIỆU TRƯỞNG';
  rightTitleCell.font = { name: 'Times New Roman', size: 11, bold: true };
  rightTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Hướng dẫn ký
  const rGuide = r2 + 1;
  ws.mergeCells(`${midStartLetter}${rGuide}:${midEndLetter}${rGuide}`);
  const midGuideCell = ws.getCell(`${midStartLetter}${rGuide}`);
  midGuideCell.value = '(Ký và ghi rõ họ tên)';
  midGuideCell.font = { name: 'Times New Roman', size: 9, italic: true };
  midGuideCell.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`${rightStartLetter}${rGuide}:${lastColLetter}${rGuide}`);
  const rightGuideCell = ws.getCell(`${rightStartLetter}${rGuide}`);
  rightGuideCell.value = '(Ký và đóng dấu)';
  rightGuideCell.font = { name: 'Times New Roman', size: 9, italic: true };
  rightGuideCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Tên người ký (cách 4 dòng để ký và đóng dấu)
  const rName = rGuide + 4;
  ws.mergeCells(`${midStartLetter}${rName}:${midEndLetter}${rName}`);
  const midNameCell = ws.getCell(`${midStartLetter}${rName}`);
  midNameCell.value = vicePrincipalName;
  midNameCell.font = { name: 'Times New Roman', size: 11, bold: true };
  midNameCell.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`${rightStartLetter}${rName}:${lastColLetter}${rName}`);
  const rightNameCell = ws.getCell(`${rightStartLetter}${rName}`);
  rightNameCell.value = principalName;
  rightNameCell.font = { name: 'Times New Roman', size: 11, bold: true };
  rightNameCell.alignment = { horizontal: 'center', vertical: 'middle' };
}

/**
 * Xuất Bảng Phân Công COI KIỂM TRA Giữa Học Kỳ I (Chuẩn A4, Nghị định 30/2020/NĐ-CP)
 */
export async function exportMidTerm1ExamInvigilationExcel(
  teachers: Teacher[],
  departments: Department[],
  academicYear: string,
  userOptions?: AdministrativeExportOptions
): Promise<void> {
  const options = { ...DEFAULT_OPTIONS, ...userOptions };
  const deptMap = new Map(departments.map(d => [d.id, d.name]));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'THCS và THPT Đốc Binh Kiều';
  wb.lastModifiedBy = 'Ban Giám hiệu';
  wb.created = new Date();

  // Khổ giấy A4 Portrait, căn lề chuẩn Nghị định 30 (2.0 - 1.5 - 2.0 - 2.0 cm)
  const ws = wb.addWorksheet('Phan_Cong_Coi_KT_Giua_HK1', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.78, // ~2.0 cm
        right: 0.59, // ~1.5 cm
        top: 0.78,
        bottom: 0.78,
        header: 0.3,
        footer: 0.3,
      },
      showGridLines: true,
    },
  });

  const TOTAL_COLS = 8;
  const colWidths = [
    6,  // 1. STT
    24, // 2. Họ và tên CB-GV
    12, // 3. Mã GV
    22, // 4. Tổ chuyên môn
    20, // 5. Nhiệm vụ trong Ban coi KT
    18, // 6. Phòng / Ca coi thi
    14, // 7. Buổi coi
    16, // 8. Ký nhận nhiệm vụ
  ];

  colWidths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // 1. Header hành chính
  appendAdministrativeHeader(
    ws,
    'BẢNG PHÂN CÔNG CÁN BỘ, GIÁO VIÊN COI KIỂM TRA GIỮA HỌC KỲ I',
    academicYear,
    options,
    TOTAL_COLS,
    `Lịch kiểm tra tập trung: ${options.examDaysText} • Địa điểm: Điểm chính Đốc Binh Kiều & Điểm Tân Kiều`
  );

  // 2. Table Headers (Row 10)
  const headerRowIdx = 10;
  const headers = [
    'STT',
    'Họ và tên cán bộ, giáo viên',
    'Mã GV',
    'Tổ chuyên môn',
    'Nhiệm vụ phân công',
    'Phòng kiểm tra / Ca coi',
    'Buổi coi thi',
    'Ký nhận nhiệm vụ',
  ];

  const hRow = ws.getRow(headerRowIdx);
  hRow.height = 30;
  headers.forEach((h, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = h;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' }, // Màu xám nhạt thanh lịch công văn
    };
    cell.border = headerBorder;
  });

  // 3. Sắp xếp giáo viên: Ban Giám hiệu -> Các tổ chuyên môn
  const sortedTeachers = [...teachers].sort((a, b) => {
    const isBghA = a.role === 'HieuTruong' || a.role === 'PhoHieuTruong' || a.departmentId === 'dept-bgh';
    const isBghB = b.role === 'HieuTruong' || b.role === 'PhoHieuTruong' || b.departmentId === 'dept-bgh';
    if (isBghA && !isBghB) return -1;
    if (!isBghA && isBghB) return 1;

    const deptA = deptMap.get(a.departmentId) || '';
    const deptB = deptMap.get(b.departmentId) || '';
    if (deptA !== deptB) return deptA.localeCompare(deptB, 'vi');
    return a.name.localeCompare(b.name, 'vi');
  });

  // 4. Đổ dữ liệu từng cán bộ, giáo viên
  let startDataRow = 11;
  sortedTeachers.forEach((t, idx) => {
    const row = ws.getRow(startDataRow + idx);
    row.height = 24;

    const isEven = idx % 2 === 1;
    const baseFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isEven ? 'FFFBFDFE' : 'FFFFFFFF' },
    };

    let duty = 'Cán bộ coi kiểm tra';
    let room = 'Phòng theo lịch ban';
    let session = 'Theo ca thi';

    if (t.role === 'HieuTruong') {
      duty = 'Trưởng ban coi thi';
      room = 'Văn phòng Hội đồng';
      session = 'Toàn bộ các ca';
    } else if (t.role === 'PhoHieuTruong') {
      duty = 'Phó Trưởng ban (Thường trực)';
      room = 'Văn phòng Hội đồng';
      session = 'Toàn bộ các ca';
    } else if (t.duties?.some(d => d.type === 'ThuKyHoiDong' || d.type === 'GiaoVu')) {
      duty = 'Thư ký ban coi thi';
      room = 'Phòng thu bài & đề';
      session = 'Toàn bộ các ca';
    } else {
      // Phân theo cấp trường chính
      if (t.campus === 'THPTDBK') {
        session = 'Ca Sáng (THPT)';
      } else {
        session = 'Ca Chiều (THCS)';
      }
    }

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = t.name;
    row.getCell(3).value = t.code || '-';
    row.getCell(4).value = deptMap.get(t.departmentId) || 'Chưa phân tổ';
    row.getCell(5).value = duty;
    row.getCell(6).value = room;
    row.getCell(7).value = session;
    row.getCell(8).value = ''; // Chừa trống để ký nhận trực tiếp

    for (let c = 1; c <= TOTAL_COLS; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;
      cell.fill = baseFill;
      cell.font = { name: 'Times New Roman', size: 10 };

      if (c === 2) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.font = { name: 'Times New Roman', size: 10, bold: true };
      } else if (c === 4 || c === 5) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }
  });

  // 5. Thêm chữ ký phê duyệt hành chính
  const endDataRow = startDataRow + sortedTeachers.length;
  appendAdministrativeSignatures(ws, endDataRow, TOTAL_COLS);

  // 6. Tải file về máy người dùng
  const fileName = `Bang_Phan_Cong_Coi_Kiem_Tra_Giua_HK1_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  await downloadWorkbook(wb, fileName);
}

/**
 * Xuất Bảng Phân Công RA ĐỀ KIỂM TRA Giữa Học Kỳ I (Chuẩn A4, Nghị định 30/2020/NĐ-CP)
 */
export async function exportMidTerm1ExamMakerExcel(
  items: FocusedExamSubjectItem[],
  proposals: YearExamProposalMap,
  academicYear: string,
  userOptions?: AdministrativeExportOptions
): Promise<void> {
  const options = { ...DEFAULT_OPTIONS, ...userOptions };

  const wb = new ExcelJS.Workbook();
  wb.creator = 'THCS và THPT Đốc Binh Kiều';
  wb.lastModifiedBy = 'Ban Giám hiệu';
  wb.created = new Date();

  // Khổ giấy A4 Portrait, căn lề chuẩn
  const ws = wb.addWorksheet('Phan_Cong_Ra_De_Giua_HK1', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.78,
        right: 0.59,
        top: 0.78,
        bottom: 0.78,
        header: 0.3,
        footer: 0.3,
      },
      showGridLines: true,
    },
  });

  const TOTAL_COLS = 9;
  const colWidths = [
    6,  // 1. STT
    9,  // 2. Cấp
    10, // 3. Khối
    22, // 4. Môn kiểm tra
    10, // 5. Số lớp
    24, // 6. Giáo viên ra đề (đã chọn)
    12, // 7. Thời lượng
    18, // 8. Hình thức đề
    15, // 9. Ký nhận nộp đề
  ];

  colWidths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // 1. Header hành chính
  appendAdministrativeHeader(
    ws,
    'BẢNG PHÂN CÔNG GIÁO VIÊN RA ĐỀ KIỂM TRA GIỮA HỌC KỲ I',
    academicYear,
    options,
    TOTAL_COLS,
    `Hạn chót bàn giao đề & ma trận niêm phong: ${options.submissionDeadlineText} • Hình thức: Đề chính + Đề dự bị + Đáp án`
  );

  // 2. Table Headers
  const headerRowIdx = 10;
  const headers = [
    'STT',
    'Cấp học',
    'Khối',
    'Môn kiểm tra',
    'Số lớp',
    'Giáo viên được phân công ra đề',
    'Thời lượng',
    'Hình thức đề',
    'Ký nhận nộp đề',
  ];

  const hRow = ws.getRow(headerRowIdx);
  hRow.height = 30;
  headers.forEach((h, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = h;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };
    cell.border = headerBorder;
  });

  // 3. Đổ dữ liệu từng môn/khối
  let startDataRow = 11;
  items.forEach((item, idx) => {
    const prop = proposals[item.id];
    const row = ws.getRow(startDataRow + idx);
    row.height = 24;

    const isEven = idx % 2 === 1;
    const baseFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isEven ? 'FFFBFDFE' : 'FFFFFFFF' },
    };

    const teacherName = prop?.gk1TeacherName || '(Chưa chỉ định)';
    const duration = prop?.durationMinutes || item.defaultDuration;
    const format = prop?.examFormat || item.defaultFormat;

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = item.level;
    row.getCell(3).value = item.gradeLabel;
    row.getCell(4).value = item.subjectName;
    row.getCell(5).value = `${item.totalClassesInGrade} lớp`;
    row.getCell(6).value = teacherName;
    row.getCell(7).value = `${duration} phút`;
    row.getCell(8).value = format;
    row.getCell(9).value = ''; // Chừa trống để ký bàn giao đề niêm phong

    for (let c = 1; c <= TOTAL_COLS; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;
      cell.fill = baseFill;
      cell.font = { name: 'Times New Roman', size: 10 };

      if (c === 4) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.font = { name: 'Times New Roman', size: 10, bold: true };
      } else if (c === 6) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        if (prop?.gk1TeacherName) {
          cell.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } };
        } else {
          cell.font = { name: 'Times New Roman', size: 10, italic: true, color: { argb: 'FF94A3B8' } };
        }
      } else if (c === 8) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }
  });

  // 4. Thêm chữ ký phê duyệt hành chính
  const endDataRow = startDataRow + items.length;
  appendAdministrativeSignatures(ws, endDataRow, TOTAL_COLS);

  // 5. Tải file về máy người dùng
  const fileName = `Bang_Phan_Cong_Ra_De_Giua_HK1_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  await downloadWorkbook(wb, fileName);
}

/**
 * Xuất trọn bộ HỒ SƠ BAN RA ĐỀ & COI KIỂM TRA GIỮA HỌC KỲ I (gồm cả 2 sheet chuẩn A4 trong 1 file Excel)
 */
export async function exportFullMidTerm1DossierExcel(
  items: FocusedExamSubjectItem[],
  proposals: YearExamProposalMap,
  teachers: Teacher[],
  departments: Department[],
  academicYear: string,
  userOptions?: AdministrativeExportOptions
): Promise<void> {
  const options = { ...DEFAULT_OPTIONS, ...userOptions };
  const deptMap = new Map(departments.map(d => [d.id, d.name]));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'THCS và THPT Đốc Binh Kiều';
  wb.lastModifiedBy = 'Ban Giám hiệu';
  wb.created = new Date();

  // ==========================================
  // SHEET 1: BẢNG PHÂN CÔNG COI KIỂM TRA
  // ==========================================
  const wsCoi = wb.addWorksheet('1. Phan_Cong_Coi_Thi', {
    pageSetup: {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.78,
        right: 0.59,
        top: 0.78,
        bottom: 0.78,
        header: 0.3,
        footer: 0.3,
      },
      showGridLines: true,
    },
  });

  const COI_COLS = 8;
  const colWidthsCoi = [6, 24, 12, 22, 20, 18, 14, 16];
  colWidthsCoi.forEach((w, i) => {
    wsCoi.getColumn(i + 1).width = w;
  });

  appendAdministrativeHeader(
    wsCoi,
    'BẢNG PHÂN CÔNG CÁN BỘ, GIÁO VIÊN COI KIỂM TRA GIỮA HỌC KỲ I',
    academicYear,
    options,
    COI_COLS,
    `Lịch kiểm tra tập trung: ${options.examDaysText} • Điểm Đốc Binh Kiều & Tân Kiều`
  );

  const hRowCoi = wsCoi.getRow(10);
  hRowCoi.height = 30;
  [
    'STT',
    'Họ và tên cán bộ, giáo viên',
    'Mã GV',
    'Tổ chuyên môn',
    'Nhiệm vụ phân công',
    'Phòng kiểm tra / Ca coi',
    'Buổi coi thi',
    'Ký nhận nhiệm vụ',
  ].forEach((h, i) => {
    const cell = hRowCoi.getCell(i + 1);
    cell.value = h;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.font = { name: 'Times New Roman', size: 10, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = headerBorder;
  });

  const sortedTeachers = [...teachers].sort((a, b) => {
    const isBghA = a.role === 'HieuTruong' || a.role === 'PhoHieuTruong' || a.departmentId === 'dept-bgh';
    const isBghB = b.role === 'HieuTruong' || b.role === 'PhoHieuTruong' || b.departmentId === 'dept-bgh';
    if (isBghA && !isBghB) return -1;
    if (!isBghA && isBghB) return 1;
    const deptA = deptMap.get(a.departmentId) || '';
    const deptB = deptMap.get(b.departmentId) || '';
    if (deptA !== deptB) return deptA.localeCompare(deptB, 'vi');
    return a.name.localeCompare(b.name, 'vi');
  });

  sortedTeachers.forEach((t, idx) => {
    const row = wsCoi.getRow(11 + idx);
    row.height = 24;
    const isEven = idx % 2 === 1;
    const baseFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isEven ? 'FFFBFDFE' : 'FFFFFFFF' },
    };

    let duty = 'Cán bộ coi kiểm tra';
    let room = 'Phòng theo lịch ban';
    let session = t.campus === 'THPTDBK' ? 'Ca Sáng (THPT)' : 'Ca Chiều (THCS)';

    if (t.role === 'HieuTruong') {
      duty = 'Trưởng ban coi thi';
      room = 'Văn phòng Hội đồng';
      session = 'Toàn bộ các ca';
    } else if (t.role === 'PhoHieuTruong') {
      duty = 'Phó Trưởng ban (Thường trực)';
      room = 'Văn phòng Hội đồng';
      session = 'Toàn bộ các ca';
    } else if (t.duties?.some(d => d.type === 'ThuKyHoiDong' || d.type === 'GiaoVu')) {
      duty = 'Thư ký ban coi thi';
      room = 'Phòng thu bài & đề';
      session = 'Toàn bộ các ca';
    }

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = t.name;
    row.getCell(3).value = t.code || '-';
    row.getCell(4).value = deptMap.get(t.departmentId) || 'Chưa phân tổ';
    row.getCell(5).value = duty;
    row.getCell(6).value = room;
    row.getCell(7).value = session;
    row.getCell(8).value = '';

    for (let c = 1; c <= COI_COLS; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;
      cell.fill = baseFill;
      cell.font = { name: 'Times New Roman', size: 10 };
      if (c === 2) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.font = { name: 'Times New Roman', size: 10, bold: true };
      } else if (c === 4 || c === 5) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }
  });

  appendAdministrativeSignatures(wsCoi, 11 + sortedTeachers.length, COI_COLS);

  // ==========================================
  // SHEET 2: BẢNG PHÂN CÔNG RA ĐỀ KIỂM TRA
  // ==========================================
  const wsDe = wb.addWorksheet('2. Phan_Cong_Ra_De', {
    pageSetup: {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.78,
        right: 0.59,
        top: 0.78,
        bottom: 0.78,
        header: 0.3,
        footer: 0.3,
      },
      showGridLines: true,
    },
  });

  const DE_COLS = 9;
  const colWidthsDe = [6, 9, 10, 22, 10, 24, 12, 18, 15];
  colWidthsDe.forEach((w, i) => {
    wsDe.getColumn(i + 1).width = w;
  });

  appendAdministrativeHeader(
    wsDe,
    'BẢNG PHÂN CÔNG GIÁO VIÊN RA ĐỀ KIỂM TRA GIỮA HỌC KỲ I',
    academicYear,
    options,
    DE_COLS,
    `Hạn chót nộp đề niêm phong: ${options.submissionDeadlineText} • Bộ phận nhận đề: Ban Giám hiệu`
  );

  const hRowDe = wsDe.getRow(10);
  hRowDe.height = 30;
  [
    'STT',
    'Cấp học',
    'Khối',
    'Môn kiểm tra',
    'Số lớp',
    'Giáo viên được phân công ra đề',
    'Thời lượng',
    'Hình thức đề',
    'Ký nhận nộp đề',
  ].forEach((h, i) => {
    const cell = hRowDe.getCell(i + 1);
    cell.value = h;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.font = { name: 'Times New Roman', size: 10, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = headerBorder;
  });

  items.forEach((item, idx) => {
    const prop = proposals[item.id];
    const row = wsDe.getRow(11 + idx);
    row.height = 24;

    const isEven = idx % 2 === 1;
    const baseFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isEven ? 'FFFBFDFE' : 'FFFFFFFF' },
    };

    const teacherName = prop?.gk1TeacherName || '(Chưa chỉ định)';
    const duration = prop?.durationMinutes || item.defaultDuration;
    const format = prop?.examFormat || item.defaultFormat;

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = item.level;
    row.getCell(3).value = item.gradeLabel;
    row.getCell(4).value = item.subjectName;
    row.getCell(5).value = `${item.totalClassesInGrade} lớp`;
    row.getCell(6).value = teacherName;
    row.getCell(7).value = `${duration} phút`;
    row.getCell(8).value = format;
    row.getCell(9).value = '';

    for (let c = 1; c <= DE_COLS; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;
      cell.fill = baseFill;
      cell.font = { name: 'Times New Roman', size: 10 };

      if (c === 4) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.font = { name: 'Times New Roman', size: 10, bold: true };
      } else if (c === 6) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        if (prop?.gk1TeacherName) {
          cell.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } };
        } else {
          cell.font = { name: 'Times New Roman', size: 10, italic: true, color: { argb: 'FF94A3B8' } };
        }
      } else if (c === 8) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }
  });

  appendAdministrativeSignatures(wsDe, 11 + items.length, DE_COLS);

  // 3. Tải file trọn bộ
  const fileName = `Ho_So_Ban_Ra_De_Coi_Kiem_Tra_Giua_HK1_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  await downloadWorkbook(wb, fileName);
}

/**
 * Hàm hỗ trợ tải file Excel trong trình duyệt
 */
async function downloadWorkbook(wb: ExcelJS.Workbook, fileName: string): Promise<void> {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Chuyển số cột (1-based) thành chữ cái Excel (1 -> A, 2 -> B...)
 */
function getColLetter(colIdx: number): string {
  let letter = '';
  let temp = colIdx;
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}
