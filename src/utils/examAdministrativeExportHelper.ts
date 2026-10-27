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
 * Xuất file Excel PHÂN BỔ GIÁO VIÊN COI KIỂM TRA GIỮA KỲ 1 đúng 100% theo mẫu của Thầy gửi
 * (Gồm Bảng Khối 11 & 12 Sáng - 17 giám thị/buổi và Bảng Khối 10 Chiều - 11 giám thị/buổi)
 */
export async function exportUserTemplateAllocationExcel(
  academicYear: string,
  morningRows: Array<{
    grade12: string;
    subject12: string;
    rooms12: number | string;
    grade11: string;
    subject11: string;
    rooms11: number | string;
    invigilators: number;
    teachersList: string;
  }>,
  afternoonRows: Array<{
    grade10: string;
    subject10: string;
    rooms10: number | string;
    invigilators: number;
    teachersList: string;
  }>,
  sessionPlans?: Array<{
    sessionName: string;
    dayName: string;
    dateStr: string;
    targetGrade: string;
    subjects: string[];
    invigilators: Array<{
      role: string;
      numberStr: string;
      name: string;
      code: string;
      department: string;
      balance: number;
    }>;
  }>
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Trường THCS và THPT Đốc Binh Kiều';
  wb.lastModifiedBy = 'Ban Giám Hiệu';
  wb.created = new Date();

  const yellowTitleFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFFF00' }, // Vàng tươi nguyên bản như ảnh
  };

  const yellowHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFEB3B' },
  };

  const greenHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFA7F3D0' }, // Xanh nhạt cho cột Khối
  };

  const purpleFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE9D5FF' }, // Tím nhạt cho Khối 12
  };

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };

  // ==========================================
  // SHEET 1: KHỐI 11 & 12 (BUỔI SÁNG - 17 GIÁM THỊ)
  // ==========================================
  const ws1 = wb.addWorksheet('KHOI_11_12_BUOI_SANG', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      showGridLines: true,
    },
  });

  // Set widths
  ws1.columns = [
    { width: 8 },  // A: KHỐI 12
    { width: 16 }, // B: MÔN 12
    { width: 11 }, // C: Số phòng 12
    { width: 8 },  // D: KHỐI 11
    { width: 16 }, // E: MÔN 11
    { width: 11 }, // F: Số phòng 11
    { width: 13 }, // G: Số giám thị
    { width: 75 }, // H: Họ và tên giáo viên coi kiểm tra
  ];

  // Row 1: Tiêu đề vàng rực
  ws1.mergeCells('A1:H1');
  const tCell1 = ws1.getCell('A1');
  tCell1.value = 'PHÂN BỔ GIÁO VIÊN COI KIỂM TRA GIỮA KỲ 1 - KHỐI 11 & 12 (BUỔI SÁNG)';
  tCell1.font = { name: 'Times New Roman', size: 16, bold: true, color: { argb: 'FFFF0000' } };
  tCell1.alignment = { horizontal: 'center', vertical: 'middle' };
  tCell1.fill = yellowTitleFill;
  tCell1.border = borderAll;
  ws1.getRow(1).height = 36;

  // Row 2: Header
  const hRow1 = ws1.getRow(2);
  hRow1.height = 28;
  const headers1 = ['KHỐI', 'MÔN', 'Số phòng', 'KHỐI', 'MÔN', 'Số phòng', 'Số giám thị', 'Họ và tên giáo viên coi kiểm tra'];
  headers1.forEach((h, idx) => {
    const c = hRow1.getCell(idx + 1);
    c.value = h;
    c.font = { name: 'Times New Roman', size: 11, bold: true, color: idx === 7 ? { argb: 'FFDC2626' } : { argb: 'FF000000' } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = borderAll;
    c.fill = idx === 6 ? yellowHeaderFill : idx === 0 || idx === 3 ? greenHeaderFill : {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8FAFC' }
    };
  });

  // Data rows
  morningRows.forEach((r, idx) => {
    const row = ws1.getRow(idx + 3);
    row.height = 26;

    row.getCell(1).value = r.grade12;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(1).fill = purpleFill;
    row.getCell(1).font = { name: 'Times New Roman', size: 11, bold: true };
    row.getCell(1).border = borderAll;

    row.getCell(2).value = r.subject12;
    row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(2).font = { name: 'Times New Roman', size: 11, bold: true };
    row.getCell(2).border = borderAll;

    row.getCell(3).value = r.rooms12;
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).font = { name: 'Times New Roman', size: 11 };
    row.getCell(3).border = borderAll;

    row.getCell(4).value = r.grade11;
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(4).fill = greenHeaderFill;
    row.getCell(4).font = { name: 'Times New Roman', size: 11, bold: true };
    row.getCell(4).border = borderAll;

    row.getCell(5).value = r.subject11;
    row.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(5).font = { name: 'Times New Roman', size: 11, bold: true };
    row.getCell(5).border = borderAll;

    row.getCell(6).value = r.rooms11;
    row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(6).font = { name: 'Times New Roman', size: 11 };
    row.getCell(6).border = borderAll;

    row.getCell(7).value = r.invigilators;
    row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(7).font = { name: 'Times New Roman', size: 11, bold: true };
    row.getCell(7).fill = yellowHeaderFill;
    row.getCell(7).border = borderAll;

    row.getCell(8).value = r.teachersList;
    row.getCell(8).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    row.getCell(8).font = { name: 'Times New Roman', size: 10.5 };
    row.getCell(8).border = borderAll;
  });

  // ==========================================
  // SHEET 2: KHỐI 10 (BUỔI CHIỀU - 11 GIÁM THỊ)
  // ==========================================
  const ws2 = wb.addWorksheet('KHOI_10_BUOI_CHIEU', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      showGridLines: true,
    },
  });

  ws2.columns = [
    { width: 8 },  // A: KHỐI 10
    { width: 18 }, // B: MÔN
    { width: 12 }, // C: Số phòng
    { width: 14 }, // D: Số giám thị
    { width: 85 }, // E: Họ và tên giáo viên coi kiểm tra
  ];

  ws2.mergeCells('A1:E1');
  const tCell2 = ws2.getCell('A1');
  tCell2.value = 'PHÂN BỔ GIÁO VIÊN COI KIỂM TRA GIỮA KỲ 1 - KHỐI 10 (BUỔI CHIỀU)';
  tCell2.font = { name: 'Times New Roman', size: 16, bold: true, color: { argb: 'FFFF0000' } };
  tCell2.alignment = { horizontal: 'center', vertical: 'middle' };
  tCell2.fill = yellowTitleFill;
  tCell2.border = borderAll;
  ws2.getRow(1).height = 36;

  const hRow2 = ws2.getRow(2);
  hRow2.height = 28;
  const headers2 = ['KHỐI', 'MÔN', 'Số phòng', 'Số giám thị', 'Họ và tên giáo viên coi kiểm tra'];
  headers2.forEach((h, idx) => {
    const c = hRow2.getCell(idx + 1);
    c.value = h;
    c.font = { name: 'Times New Roman', size: 11, bold: true, color: idx === 4 ? { argb: 'FFDC2626' } : { argb: 'FF000000' } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = borderAll;
    c.fill = idx === 3 ? yellowHeaderFill : idx === 0 ? greenHeaderFill : {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8FAFC' }
    };
  });

  afternoonRows.forEach((r, idx) => {
    const row = ws2.getRow(idx + 3);
    row.height = 26;

    row.getCell(1).value = r.grade10;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(1).fill = greenHeaderFill;
    row.getCell(1).font = { name: 'Times New Roman', size: 11, bold: true };
    row.getCell(1).border = borderAll;

    row.getCell(2).value = r.subject10;
    row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(2).font = { name: 'Times New Roman', size: 11, bold: true };
    row.getCell(2).border = borderAll;

    row.getCell(3).value = r.rooms10;
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).font = { name: 'Times New Roman', size: 11 };
    row.getCell(3).border = borderAll;

    row.getCell(4).value = r.invigilators;
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(4).font = { name: 'Times New Roman', size: 11, bold: true };
    row.getCell(4).fill = yellowHeaderFill;
    row.getCell(4).border = borderAll;

    row.getCell(5).value = r.teachersList;
    row.getCell(5).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    row.getCell(5).font = { name: 'Times New Roman', size: 10.5 };
    row.getCell(5).border = borderAll;
  });

  // ==========================================
  // SHEET 3: LỊCH 10 BUỔI CHI TIẾT (5 SÁNG X 17 GT + 5 CHIỀU X 11 GT)
  // ==========================================
  if (sessionPlans && sessionPlans.length > 0) {
    const ws3 = wb.addWorksheet('LICH_10_BUOI_CHI_TIET', {
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
    });

    ws3.columns = [
      { width: 14 }, // Ngày
      { width: 12 }, // Buổi
      { width: 18 }, // Đối tượng
      { width: 26 }, // Môn kiểm tra
      { width: 16 }, // Phòng / Vị trí
      { width: 26 }, // Họ tên giáo viên
      { width: 12 }, // Mã GV
      { width: 18 }, // Tổ chuyên môn
      { width: 12 }, // Tiết âm đầu
      { width: 18 }, // Ký tên
    ];

    ws3.mergeCells('A1:J1');
    const tCell3 = ws3.getCell('A1');
    tCell3.value = 'LỊCH PHÂN CÔNG GIÁM THỊ COI KIỂM TRA GIỮA KỲ 1 (TỪ 02/11 ĐẾN 06/11/2026)';
    tCell3.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
    tCell3.alignment = { horizontal: 'center', vertical: 'middle' };
    ws3.getRow(1).height = 30;

    const hRow3 = ws3.getRow(2);
    hRow3.height = 26;
    const headers3 = ['Ngày kiểm tra', 'Buổi', 'Khối lớp', 'Môn kiểm tra', 'Vị trí coi thi', 'Họ và tên giáo viên', 'Mã GV', 'Tổ chuyên môn', 'Độ âm tiết', 'Ký nhận nhiệm vụ'];
    headers3.forEach((h, idx) => {
      const c = hRow3.getCell(idx + 1);
      c.value = h;
      c.font = { name: 'Times New Roman', size: 10.5, bold: true };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      c.border = borderAll;
    });

    let curRow = 3;
    sessionPlans.forEach(sp => {
      sp.invigilators.forEach(inv => {
        const row = ws3.getRow(curRow++);
        row.height = 22;
        row.getCell(1).value = `${sp.dayName} (${sp.dateStr})`;
        row.getCell(2).value = sp.sessionName;
        row.getCell(3).value = sp.targetGrade;
        row.getCell(4).value = sp.subjects.join(', ');
        row.getCell(5).value = inv.numberStr;
        row.getCell(6).value = inv.name;
        row.getCell(7).value = inv.code;
        row.getCell(8).value = inv.department;
        row.getCell(9).value = inv.balance < 0 ? `${inv.balance} tiết` : `+${inv.balance} tiết`;
        row.getCell(10).value = '';

        [1, 2, 3, 5, 7, 9].forEach(col => {
          row.getCell(col).alignment = { horizontal: 'center', vertical: 'middle' };
        });
        [4, 6, 8, 10].forEach(col => {
          row.getCell(col).alignment = { horizontal: 'left', vertical: 'middle' };
        });

        for (let c = 1; c <= 10; c++) {
          row.getCell(c).border = borderAll;
          row.getCell(c).font = { name: 'Times New Roman', size: 10 };
        }
      });
    });
  }

  const fileName = `Bang_Phan_Bo_Giao_Vien_Coi_Kiem_Tra_Giua_HK1_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
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
