import ExcelJS from 'exceljs';
import { SchoolConfig } from '../types';
import { TeacherActualWorkload } from './actualTeachingHoursHelper';

// Standard borders for executive administrative documents
const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
};

const headerBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'medium', color: { argb: 'FF1E293B' } },
  left: { style: 'thin', color: { argb: 'FF475569' } },
  bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
  right: { style: 'thin', color: { argb: 'FF475569' } },
};

const doubleBottomBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF1E293B' } },
  left: { style: 'thin', color: { argb: 'FF475569' } },
  bottom: { style: 'double', color: { argb: 'FF1E293B' } },
  right: { style: 'thin', color: { argb: 'FF475569' } },
};

/**
 * Convert column index (1-based) to Excel column letter (e.g., 1 -> A, 27 -> AA)
 */
function getColumnLetter(colIndex: number): string {
  let temp: number;
  let letter = '';
  while (colIndex > 0) {
    temp = (colIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = (colIndex - temp - 1) / 26;
  }
  return letter;
}

/**
 * Trigger download of ExcelJS workbook in browser
 */
async function triggerBrowserDownload(wb: ExcelJS.Workbook, fileName: string): Promise<void> {
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
 * Format campus display
 */
function formatCampusName(t: TeacherActualWorkload): string {
  const raw = (t.campus || '').toUpperCase();
  if (raw.includes('TÂN KIỀU') || raw.includes('TK')) return 'THCS Tân Kiều';
  if (raw.includes('THPT') || raw.includes('CHÍNH') || t.teacherId.startsWith('tch-bgh-1') || t.teacherId.startsWith('tch-bgh-2')) {
    return 'Điểm chính (THPT)';
  }
  return 'THCS Đốc Binh Kiều';
}

/**
 * EXPORT EXECUTIVE MULTI-WEEK EXCEL (CẢ NĂM HỌC / HỌC KỲ)
 * Beautiful, executive-grade, fully formatted and styled for immediate printing & submission.
 */
export async function exportExecutiveMultiWeekExcel(
  workloads: TeacherActualWorkload[],
  totalWeeks: number,
  config: SchoolConfig,
  startWeek: number = 1,
  endWeek?: number,
  semesterName: string = 'Cả năm học'
): Promise<void> {
  const effectiveEndWeek = endWeek || (startWeek === 19 ? 35 : startWeek + totalWeeks - 1);
  const weekCount = effectiveEndWeek - startWeek + 1;
  const isFullYear = startWeek === 1 && effectiveEndWeek >= 35;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Trường THCS và THPT Đốc Binh Kiều';
  wb.lastModifiedBy = 'Hệ thống Quản lý Phân công Chuyên môn';
  wb.created = new Date();
  wb.modified = new Date();

  const sheetName = isFullYear ? 'Tong_Hop_Ca_Nam' : `Tong_Hop_${semesterName.replace(/\s+/g, '_')}`;
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 8 }],
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4 standard (ExcelJS.PaperSize.A4)
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
      printTitlesRow: '7:8',
      showGridLines: true,
    },
  });

  // Calculate total columns: 6 base + weekCount + 6 summary = 12 + weekCount
  const totalColumns = 6 + weekCount + 6;
  const lastColLetter = getColumnLetter(totalColumns);

  // ==========================================
  // 1. ADMINISTRATIVE HEADER (DÒNG 1 - 3)
  // ==========================================
  // Left: School Agency
  ws.mergeCells('A1:E1');
  const cellA1 = ws.getCell('A1');
  cellA1.value = 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP';
  cellA1.font = { name: 'Times New Roman', size: 10, bold: false };
  cellA1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A2:E2');
  const cellA2 = ws.getCell('A2');
  cellA2.value = (config.schoolName || 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU').toUpperCase();
  cellA2.font = { name: 'Times New Roman', size: 10.5, bold: true };
  cellA2.alignment = { horizontal: 'center', vertical: 'middle' };

  // Right: National Motto
  const rightStartCol = Math.max(7 + weekCount, totalColumns - 6);
  const rightStartLetter = getColumnLetter(rightStartCol);

  ws.mergeCells(`${rightStartLetter}1:${lastColLetter}1`);
  const cellRight1 = ws.getCell(`${rightStartLetter}1`);
  cellRight1.value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  cellRight1.font = { name: 'Times New Roman', size: 10, bold: true };
  cellRight1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`${rightStartLetter}2:${lastColLetter}2`);
  const cellRight2 = ws.getCell(`${rightStartLetter}2`);
  cellRight2.value = 'Độc lập - Tự do - Hạnh phúc';
  cellRight2.font = { name: 'Times New Roman', size: 10.5, bold: true, underline: true };
  cellRight2.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.addRow([]); // Row 3 empty spacer

  // ==========================================
  // 2. MAIN DOCUMENT TITLE & METADATA (DÒNG 4 - 6)
  // ==========================================
  // Row 4: Main Title
  const titleRowIndex = 4;
  ws.mergeCells(`A${titleRowIndex}:${lastColLetter}${titleRowIndex}`);
  const titleCell = ws.getCell(`A${titleRowIndex}`);
  titleCell.value = isFullYear
    ? 'BẢNG TỔNG HỢP SỐ TIẾT THỰC DẠY VÀ THỪA / THIẾU TIẾT CẢ NĂM HỌC'
    : `BẢNG TỔNG HỢP SỐ TIẾT THỰC DẠY VÀ THỪA / THIẾU TIẾT - ${semesterName.toUpperCase()}`;
  titleCell.font = { name: 'Times New Roman', size: 15, bold: true, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(titleRowIndex).height = 28;

  // Row 5: Subtitle
  const subTitleRowIndex = 5;
  ws.mergeCells(`A${subTitleRowIndex}:${lastColLetter}${subTitleRowIndex}`);
  const subTitleCell = ws.getCell(`A${subTitleRowIndex}`);
  subTitleCell.value = `Năm học: ${config.academicYear || '2026 - 2027'} • Chu kỳ ${weekCount} tuần (Từ Tuần ${startWeek} đến Tuần ${effectiveEndWeek}) • Cập nhật chính thức theo Thời khóa biểu`;
  subTitleCell.font = { name: 'Times New Roman', size: 11, italic: true, color: { argb: 'FF334155' } };
  subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(subTitleRowIndex).height = 20;

  // Row 6: KPI Executive Strip
  const totalTeachers = workloads.length;
  const totalActualTeaching = workloads.reduce((sum, w) => sum + w.semesterTotalTeaching, 0);
  const totalReductionAll = workloads.reduce((sum, w) => sum + w.reductionPeriods * weekCount, 0);
  const totalConverted = workloads.reduce((sum, w) => sum + w.semesterTotalPeriods, 0);
  const totalRequired = workloads.reduce((sum, w) => sum + w.semesterRequiredPeriods, 0);
  const totalBalance = workloads.reduce((sum, w) => sum + w.semesterBalance, 0);
  const surplusCount = workloads.filter((w) => w.semesterBalance > 0).length;
  const exactCount = workloads.filter((w) => w.semesterBalance === 0).length;
  const deficitCount = workloads.filter((w) => w.semesterBalance < 0).length;

  const kpiRowIndex = 6;
  ws.mergeCells(`A${kpiRowIndex}:${lastColLetter}${kpiRowIndex}`);
  const kpiCell = ws.getCell(`A${kpiRowIndex}`);
  kpiCell.value = `THỐNG KÊ TOÀN TRƯỜNG: ${totalTeachers} Giáo viên • Tổng tiết dạy: ${totalActualTeaching.toLocaleString()}t • Kiêm nhiệm quy đổi: ${totalReductionAll.toLocaleString()}t • Tổng quy đổi: ${totalConverted.toLocaleString()}t • Định mức cả năm: ${totalRequired.toLocaleString()}t • Cân đối toàn trường: ${totalBalance > 0 ? `+${totalBalance}` : totalBalance}t (${surplusCount} GV thừa tiết, ${exactCount} GV đủ định mức, ${deficitCount} GV thiếu tiết)`;
  kpiCell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF1E3A8A' } };
  kpiCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
  kpiCell.alignment = { horizontal: 'center', vertical: 'middle' };
  kpiCell.border = thinBorder;
  ws.getRow(kpiRowIndex).height = 22;

  // ==========================================
  // 3. TABLE COLUMN HEADERS (DÒNG 7 & 8)
  // ==========================================
  // Header Row 7: Group Headings
  const r7 = ws.getRow(7);
  const r8 = ws.getRow(8);
  r7.height = 24;
  r8.height = 24;

  // Base Column Definitions
  // 1: STT
  ws.mergeCells('A7:A8');
  ws.getCell('A7').value = 'STT';

  // 2: Họ và Tên
  ws.mergeCells('B7:B8');
  ws.getCell('B7').value = 'Họ và Tên Giáo Viên';

  // 3: Điểm trường
  ws.mergeCells('C7:C8');
  ws.getCell('C7').value = 'Điểm Trường';

  // 4: Tổ chuyên môn
  ws.mergeCells('D7:D8');
  ws.getCell('D7').value = 'Tổ Chuyên Môn';

  // 5: Kiêm nhiệm
  ws.mergeCells('E7:E8');
  ws.getCell('E7').value = 'Nhiệm Vụ Kiêm Nhiệm';

  // 6: Định mức / Tuần
  ws.mergeCells('F7:F8');
  ws.getCell('F7').value = 'Định Mức / Tuần';

  // Multi-week Block (Cols 7 to 6 + weekCount)
  const firstWeekColLetter = getColumnLetter(7);
  const lastWeekColLetter = getColumnLetter(6 + weekCount);
  ws.mergeCells(`${firstWeekColLetter}7:${lastWeekColLetter}7`);
  const multiWeekHeaderCell = ws.getCell(`${firstWeekColLetter}7`);
  multiWeekHeaderCell.value = `SỐ TIẾT THỪA (+) / THIẾU (-) HÀNG TUẦN (TUẦN ${startWeek} ĐẾN TUẦN ${effectiveEndWeek})`;

  for (let wk = startWeek; wk <= effectiveEndWeek; wk++) {
    const colIdx = 7 + (wk - startWeek);
    const colLetter = getColumnLetter(colIdx);
    const cell = ws.getCell(`${colLetter}8`);
    cell.value = `T${wk}`;
  }

  // Summary Block
  const cTeaching = getColumnLetter(7 + weekCount);
  ws.mergeCells(`${cTeaching}7:${cTeaching}8`);
  ws.getCell(`${cTeaching}7`).value = isFullYear ? 'Tổng Dạy\n(35 Tuần)' : 'Tổng Dạy\n(Kỳ)';

  const cReduction = getColumnLetter(8 + weekCount);
  ws.mergeCells(`${cReduction}7:${cReduction}8`);
  ws.getCell(`${cReduction}7`).value = 'Tổng KN\nQuy Đổi';

  const cTotal = getColumnLetter(9 + weekCount);
  ws.mergeCells(`${cTotal}7:${cTotal}8`);
  ws.getCell(`${cTotal}7`).value = 'Tổng Tiết\nQuy Đổi';

  const cRequired = getColumnLetter(10 + weekCount);
  ws.mergeCells(`${cRequired}7:${cRequired}8`);
  ws.getCell(`${cRequired}7`).value = isFullYear ? 'Định Mức\nCả Năm' : 'Định Mức\nHọc Kỳ';

  const cBalance = getColumnLetter(11 + weekCount);
  ws.mergeCells(`${cBalance}7:${cBalance}8`);
  ws.getCell(`${cBalance}7`).value = isFullYear ? 'CÂN ĐỐI CẢ NĂM\n(THỪA / THIẾU)' : 'CÂN ĐỐI KỲ\n(THỪA / THIẾU)';

  const cEval = getColumnLetter(12 + weekCount);
  ws.mergeCells(`${cEval}7:${cEval}8`);
  ws.getCell(`${cEval}7`).value = 'Đánh Giá\nPhân Loại';

  // Style Header Cells
  for (let c = 1; c <= totalColumns; c++) {
    const letter = getColumnLetter(c);
    const cell7 = ws.getCell(`${letter}7`);
    const cell8 = ws.getCell(`${letter}8`);

    [cell7, cell8].forEach((cell) => {
      cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = headerBorder;
    });

    // Color code header columns
    if (c <= 6) {
      // General info columns: Deep Navy
      cell7.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      cell8.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    } else if (c <= 6 + weekCount) {
      // Weekly columns
      const weekNum = startWeek + (c - 7);
      const isPastOrCurrent = weekNum <= 10;
      const fg = isPastOrCurrent ? 'FF0284C7' : 'FF0369A1';
      cell7.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } };
      cell8.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fg } };
    } else if (c === 11 + weekCount) {
      // Balance column: Distinctive Gold / Dark Amber
      cell7.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB45309' } };
      cell8.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB45309' } };
    } else {
      // Summary columns: Slate Blue
      cell7.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      cell8.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    }
  }

  // ==========================================
  // 4. DATA ROWS
  // ==========================================
  let currentRowIdx = 9;

  workloads.forEach((w, idx) => {
    const row = ws.getRow(currentRowIdx);
    row.height = 22;
    const isEven = idx % 2 === 0;
    const rowBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    // 1: STT
    const cellSTT = row.getCell(1);
    cellSTT.value = idx + 1;
    cellSTT.alignment = { horizontal: 'center', vertical: 'middle' };

    // 2: Họ và tên
    const cellName = row.getCell(2);
    cellName.value = w.teacherName;
    cellName.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
    cellName.alignment = { horizontal: 'left', vertical: 'middle' };

    // 3: Điểm trường
    const cellCampus = row.getCell(3);
    cellCampus.value = formatCampusName(w);
    cellCampus.alignment = { horizontal: 'center', vertical: 'middle' };
    cellCampus.font = { name: 'Times New Roman', size: 10 };

    // 4: Tổ chuyên môn
    const cellDept = row.getCell(4);
    cellDept.value = w.departmentName;
    cellDept.alignment = { horizontal: 'left', vertical: 'middle' };
    cellDept.font = { name: 'Times New Roman', size: 10 };

    // 5: Kiêm nhiệm
    const cellDuties = row.getCell(5);
    cellDuties.value = w.duties || '—';
    cellDuties.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    cellDuties.font = { name: 'Times New Roman', size: 9.5 };

    // 6: Định mức / Tuần
    const cellStd = row.getCell(6);
    cellStd.value = w.standardPeriods;
    cellStd.alignment = { horizontal: 'center', vertical: 'middle' };
    cellStd.font = { name: 'Times New Roman', size: 10, bold: true };

    // Base cells fill & border
    for (let c = 1; c <= 6; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;
      if (!cell.font) cell.font = { name: 'Times New Roman', size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
    }

    // Weekly Balances
    for (let wk = startWeek; wk <= effectiveEndWeek; wk++) {
      const colIdx = 7 + (wk - startWeek);
      const cell = row.getCell(colIdx);
      const bal = w.weeklyBalances?.[wk] ?? ((w.weeklyTotals[wk] ?? 0) - w.standardPeriods);

      cell.value = bal;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;

      if (bal < 0) {
        cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFB91C1C' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      } else if (bal > 0) {
        cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF15803D' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
      } else {
        cell.font = { name: 'Times New Roman', size: 10, color: { argb: 'FF64748B' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      }
    }

    // Summary Columns
    // Tổng Dạy
    const c1 = row.getCell(7 + weekCount);
    c1.value = w.semesterTotalTeaching;
    c1.alignment = { horizontal: 'right', vertical: 'middle' };
    c1.font = { name: 'Times New Roman', size: 10, bold: true };
    c1.border = thinBorder;
    c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };

    // Tổng KN Quy Đổi
    const c2 = row.getCell(8 + weekCount);
    c2.value = w.reductionPeriods * weekCount;
    c2.alignment = { horizontal: 'right', vertical: 'middle' };
    c2.font = { name: 'Times New Roman', size: 10 };
    c2.border = thinBorder;
    c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };

    // Tổng Quy Đổi
    const c3 = row.getCell(9 + weekCount);
    c3.value = w.semesterTotalPeriods;
    c3.alignment = { horizontal: 'right', vertical: 'middle' };
    c3.font = { name: 'Times New Roman', size: 10, bold: true };
    c3.border = thinBorder;
    c3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };

    // Định Mức Cả Năm
    const c4 = row.getCell(10 + weekCount);
    c4.value = w.semesterRequiredPeriods;
    c4.alignment = { horizontal: 'right', vertical: 'middle' };
    c4.font = { name: 'Times New Roman', size: 10 };
    c4.border = thinBorder;
    c4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };

    // CÂN ĐỐI CẢ NĂM (THỪA / THIẾU)
    const cBal = row.getCell(11 + weekCount);
    const balance = w.semesterBalance;
    cBal.value = balance;
    cBal.alignment = { horizontal: 'center', vertical: 'middle' };
    cBal.border = thinBorder;

    if (balance < 0) {
      cBal.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF991B1B' } };
      cBal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
    } else if (balance > 0) {
      cBal.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF92400E' } };
      cBal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF08A' } };
    } else {
      cBal.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF065F46' } };
      cBal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    }

    // Đánh Giá / Phân Loại
    const cEvalCell = row.getCell(12 + weekCount);
    let evalText = 'Đủ định mức';
    if (balance < -35) evalText = `Thiếu nhiều (${balance}t)`;
    else if (balance < 0) evalText = `Thiếu nhẹ (${balance}t)`;
    else if (balance > 0) evalText = `Thừa (+${balance}t)`;

    cEvalCell.value = evalText;
    cEvalCell.alignment = { horizontal: 'center', vertical: 'middle' };
    cEvalCell.border = thinBorder;
    cEvalCell.font = {
      name: 'Times New Roman',
      size: 9.5,
      bold: balance !== 0,
      color: { argb: balance < 0 ? 'FF991B1B' : balance > 0 ? 'FF92400E' : 'FF065F46' },
    };
    cEvalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };

    currentRowIdx++;
  });

  // ==========================================
  // 5. GRAND TOTAL SUMMARY ROW
  // ==========================================
  const sumRow = ws.getRow(currentRowIdx);
  sumRow.height = 26;

  ws.mergeCells(`A${currentRowIdx}:C${currentRowIdx}`);
  const sumLabel = ws.getCell(`A${currentRowIdx}`);
  sumLabel.value = `TỔNG CỘNG TOÀN TRƯỜNG (${workloads.length} GIÁO VIÊN)`;
  sumLabel.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
  sumLabel.alignment = { horizontal: 'center', vertical: 'middle' };

  // Fill summary row styles across columns
  for (let c = 1; c <= totalColumns; c++) {
    const cell = sumRow.getCell(c);
    cell.border = doubleBottomBorder;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    if (!cell.font) cell.font = { name: 'Times New Roman', size: 10, bold: true };
  }

  // Summary per week
  for (let wk = startWeek; wk <= effectiveEndWeek; wk++) {
    const colIdx = 7 + (wk - startWeek);
    const sumWk = workloads.reduce((sum, w) => {
      const bal = w.weeklyBalances?.[wk] ?? ((w.weeklyTotals[wk] ?? 0) - w.standardPeriods);
      return sum + bal;
    }, 0);
    const cell = sumRow.getCell(colIdx);
    cell.value = sumWk;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.font = {
      name: 'Times New Roman',
      size: 10,
      bold: true,
      color: { argb: sumWk < 0 ? 'FF991B1B' : sumWk > 0 ? 'FF15803D' : 'FF0F172A' },
    };
  }

  // Summary totals
  const sumTeachCell = sumRow.getCell(7 + weekCount);
  sumTeachCell.value = totalActualTeaching;
  sumTeachCell.alignment = { horizontal: 'right', vertical: 'middle' };

  const sumReductCell = sumRow.getCell(8 + weekCount);
  sumReductCell.value = totalReductionAll;
  sumReductCell.alignment = { horizontal: 'right', vertical: 'middle' };

  const sumTotalCell = sumRow.getCell(9 + weekCount);
  sumTotalCell.value = totalConverted;
  sumTotalCell.alignment = { horizontal: 'right', vertical: 'middle' };

  const sumReqCell = sumRow.getCell(10 + weekCount);
  sumReqCell.value = totalRequired;
  sumReqCell.alignment = { horizontal: 'right', vertical: 'middle' };

  const sumBalCell = sumRow.getCell(11 + weekCount);
  sumBalCell.value = totalBalance;
  sumBalCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sumBalCell.font = {
    name: 'Times New Roman',
    size: 11,
    bold: true,
    color: { argb: totalBalance < 0 ? 'FF991B1B' : totalBalance > 0 ? 'FF92400E' : 'FF065F46' },
  };

  const sumEvalCell = sumRow.getCell(12 + weekCount);
  sumEvalCell.value = `${surplusCount} thừa / ${deficitCount} thiếu`;
  sumEvalCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sumEvalCell.font = { name: 'Times New Roman', size: 9.5, bold: true };

  currentRowIdx += 2;

  // ==========================================
  // 6. EXECUTIVE ADMINISTRATIVE SIGNATURE BLOCK
  // ==========================================
  const dateStr = `Đồng Tháp, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`;

  // Date row (aligned right)
  const signDateColStart = Math.max(7 + weekCount, totalColumns - 6);
  const signDateStartLetter = getColumnLetter(signDateColStart);
  ws.mergeCells(`${signDateStartLetter}${currentRowIdx}:${lastColLetter}${currentRowIdx}`);
  const dateCell = ws.getCell(`${signDateStartLetter}${currentRowIdx}`);
  dateCell.value = dateStr;
  dateCell.font = { name: 'Times New Roman', size: 10.5, italic: true };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

  currentRowIdx++;

  // Signature titles
  const signTitleRow = currentRowIdx;
  ws.getRow(signTitleRow).height = 20;

  // Position 1: Người Lập Bảng (Left: cols A-E)
  ws.mergeCells(`A${signTitleRow}:E${signTitleRow}`);
  const sign1 = ws.getCell(`A${signTitleRow}`);
  sign1.value = 'NGƯỜI LẬP BẢNG';
  sign1.font = { name: 'Times New Roman', size: 11, bold: true };
  sign1.alignment = { horizontal: 'center', vertical: 'middle' };

  // Position 2: Tổ Trưởng Chuyên Môn (Middle)
  const midStartCol = Math.floor(totalColumns / 2) - 3;
  const midEndCol = midStartCol + 5;
  const midStartLetter = getColumnLetter(midStartCol);
  const midEndLetter = getColumnLetter(midEndCol);
  ws.mergeCells(`${midStartLetter}${signTitleRow}:${midEndLetter}${signTitleRow}`);
  const sign2 = ws.getCell(`${midStartLetter}${signTitleRow}`);
  sign2.value = 'TỔ TRƯỞNG CHUYÊN MÔN';
  sign2.font = { name: 'Times New Roman', size: 11, bold: true };
  sign2.alignment = { horizontal: 'center', vertical: 'middle' };

  // Position 3: Ban Giám Hiệu Phê Duyệt (Right)
  ws.mergeCells(`${signDateStartLetter}${signTitleRow}:${lastColLetter}${signTitleRow}`);
  const sign3 = ws.getCell(`${signDateStartLetter}${signTitleRow}`);
  sign3.value = 'HIỆU TRƯỞNG / PHÓ HIỆU TRƯỞNG DUYỆT';
  sign3.font = { name: 'Times New Roman', size: 11, bold: true };
  sign3.alignment = { horizontal: 'center', vertical: 'middle' };

  currentRowIdx++;

  // Subtitle: (Ký và ghi rõ họ tên)
  ws.mergeCells(`A${currentRowIdx}:E${currentRowIdx}`);
  ws.getCell(`A${currentRowIdx}`).value = '(Ký và ghi rõ họ tên)';
  ws.getCell(`A${currentRowIdx}`).font = { name: 'Times New Roman', size: 9.5, italic: true };
  ws.getCell(`A${currentRowIdx}`).alignment = { horizontal: 'center', vertical: 'top' };

  ws.mergeCells(`${midStartLetter}${currentRowIdx}:${midEndLetter}${currentRowIdx}`);
  ws.getCell(`${midStartLetter}${currentRowIdx}`).value = '(Ký và ghi rõ họ tên)';
  ws.getCell(`${midStartLetter}${currentRowIdx}`).font = { name: 'Times New Roman', size: 9.5, italic: true };
  ws.getCell(`${midStartLetter}${currentRowIdx}`).alignment = { horizontal: 'center', vertical: 'top' };

  ws.mergeCells(`${signDateStartLetter}${currentRowIdx}:${lastColLetter}${currentRowIdx}`);
  ws.getCell(`${signDateStartLetter}${currentRowIdx}`).value = '(Ký, đóng dấu và ghi rõ họ tên)';
  ws.getCell(`${signDateStartLetter}${currentRowIdx}`).font = { name: 'Times New Roman', size: 9.5, italic: true };
  ws.getCell(`${signDateStartLetter}${currentRowIdx}`).alignment = { horizontal: 'center', vertical: 'top' };

  // Spacing for handwritten signature
  currentRowIdx += 5;

  // Signatory Names
  ws.mergeCells(`A${currentRowIdx}:E${currentRowIdx}`);
  const signName1 = ws.getCell(`A${currentRowIdx}`);
  signName1.value = 'Cán bộ quản lý TKB';
  signName1.font = { name: 'Times New Roman', size: 10.5, bold: true };
  signName1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`${midStartLetter}${currentRowIdx}:${midEndLetter}${currentRowIdx}`);
  const signName2 = ws.getCell(`${midStartLetter}${currentRowIdx}`);
  signName2.value = 'Các Tổ trưởng Chuyên môn';
  signName2.font = { name: 'Times New Roman', size: 10.5, bold: true };
  signName2.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`${signDateStartLetter}${currentRowIdx}:${lastColLetter}${currentRowIdx}`);
  const signName3 = ws.getCell(`${signDateStartLetter}${currentRowIdx}`);
  signName3.value = 'Nguyễn Minh Trí / Phan Thanh Thảo';
  signName3.font = { name: 'Times New Roman', size: 10.5, bold: true };
  signName3.alignment = { horizontal: 'center', vertical: 'middle' };

  // ==========================================
  // 7. COLUMN WIDTHS CONFIGURATION
  // ==========================================
  ws.columns = [
    { width: 6 },   // 1: STT
    { width: 24 },  // 2: Họ và tên
    { width: 20 },  // 3: Điểm trường
    { width: 22 },  // 4: Tổ chuyên môn
    { width: 26 },  // 5: Kiêm nhiệm
    { width: 12 },  // 6: Định mức / tuần
    ...Array(weekCount).fill({ width: 5.5 }), // T1..T35
    { width: 12 },  // Tổng Dạy
    { width: 12 },  // Tổng KN
    { width: 13 },  // Tổng Quy Đổi
    { width: 13 },  // Định Mức Cả Năm
    { width: 17 },  // CÂN ĐỐI CẢ NĂM
    { width: 16 },  // Đánh Giá
  ];

  const safeSemName = isFullYear ? 'Ca_Nam_Hoc' : semesterName.replace(/\s+/g, '_');
  const safeYear = (config.academicYear || '2026-2027').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Bang_Tong_Hop_So_Tiet_Thuc_Day_${safeSemName}_${safeYear}.xlsx`;

  await triggerBrowserDownload(wb, fileName);
}

/**
 * EXPORT EXECUTIVE SINGLE WEEK DETAIL EXCEL
 * Beautiful, executive-grade single week teaching report with full subjects, classes, reduction periods.
 */
export async function exportExecutiveWeeklyExcel(
  selectedWeek: number,
  workloads: TeacherActualWorkload[],
  config: SchoolConfig,
  useShortName: boolean = false,
  displayDept: string = 'Tất cả tổ chuyên môn',
  scopeLabel: string = 'Toàn trường',
  leaderName: string = ''
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Trường THCS và THPT Đốc Binh Kiều';
  wb.lastModifiedBy = 'Hệ thống Quản lý Phân công Chuyên môn';

  const ws = wb.addWorksheet(`Tuan_${selectedWeek}`, {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 7 }],
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
      printTitlesRow: '6:7',
      showGridLines: true,
    },
  });

  const totalColumns = 9;
  const lastColLetter = getColumnLetter(totalColumns);

  // Administrative Header
  ws.mergeCells('A1:D1');
  const cellA1 = ws.getCell('A1');
  cellA1.value = 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP';
  cellA1.font = { name: 'Times New Roman', size: 10, bold: false };
  cellA1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A2:D2');
  const cellA2 = ws.getCell('A2');
  cellA2.value = (config.schoolName || 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU').toUpperCase();
  cellA2.font = { name: 'Times New Roman', size: 10.5, bold: true };
  cellA2.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`F1:${lastColLetter}1`);
  const cellRight1 = ws.getCell('F1');
  cellRight1.value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  cellRight1.font = { name: 'Times New Roman', size: 10, bold: true };
  cellRight1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`F2:${lastColLetter}2`);
  const cellRight2 = ws.getCell('F2');
  cellRight2.value = 'Độc lập - Tự do - Hạnh phúc';
  cellRight2.font = { name: 'Times New Roman', size: 10.5, bold: true, underline: true };
  cellRight2.alignment = { horizontal: 'center', vertical: 'middle' };

  // Title
  ws.mergeCells(`A4:${lastColLetter}4`);
  const titleCell = ws.getCell('A4');
  titleCell.value = `BẢNG THEO DÕI SỐ TIẾT THỰC DẠY VÀ THỪA / THIẾU TIẾT - TUẦN ${selectedWeek}`;
  titleCell.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(4).height = 26;

  ws.mergeCells(`A5:${lastColLetter}5`);
  const subTitleCell = ws.getCell('A5');
  subTitleCell.value = `Năm học: ${config.academicYear || '2026 - 2027'} • Đối tượng: ${scopeLabel} • Đơn vị: ${displayDept}`;
  subTitleCell.font = { name: 'Times New Roman', size: 10.5, italic: true };
  subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(5).height = 20;

  // Table Headers (Row 6 & 7)
  const headers = [
    'STT',
    'Họ và Tên Giáo Viên',
    'Lớp Giảng Dạy',
    'Môn Học Giảng Dạy',
    'Tiết Dạy\nThực Tế',
    'Nhiệm Vụ Kiêm Nhiệm\n& Tiết Giảm Trừ',
    'Tổng Tiết\nQuy Đổi',
    'Thừa / Thiếu\nTuần Này',
    'Ký Xác Nhận',
  ];

  const headerRow = ws.getRow(7);
  headerRow.height = 26;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = headerBorder;
  });

  let currentRowIdx = 8;
  workloads.forEach((w, idx) => {
    const row = ws.getRow(currentRowIdx);
    row.height = 22;
    const isEven = idx % 2 === 0;
    const rowBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    row.getCell(1).value = idx + 1;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(2).value = w.teacherName;
    row.getCell(2).font = { name: 'Times New Roman', size: 10.5, bold: true };
    row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

    const classStr = w.rows?.map((r) => r.classes).filter(Boolean).join(', ') || '—';
    row.getCell(3).value = classStr;
    row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

    const subjStr = w.rows?.map((r) => `${r.subject} (${r.periods}t)`).filter(Boolean).join('; ') || '—';
    row.getCell(4).value = subjStr;
    row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

    row.getCell(5).value = w.teachingPeriods;
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(5).font = { name: 'Times New Roman', size: 10, bold: true };

    const dutyStr = w.duties ? `${w.duties} (+${w.reductionPeriods}t)` : '—';
    row.getCell(6).value = dutyStr;
    row.getCell(6).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

    row.getCell(7).value = w.totalPeriods;
    row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(7).font = { name: 'Times New Roman', size: 10, bold: true };

    const balCell = row.getCell(8);
    balCell.value = w.weeklyBalance;
    balCell.alignment = { horizontal: 'center', vertical: 'middle' };
    if (w.weeklyBalance < 0) {
      balCell.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF991B1B' } };
      balCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    } else if (w.weeklyBalance > 0) {
      balCell.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF15803D' } };
      balCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
    } else {
      balCell.font = { name: 'Times New Roman', size: 10, color: { argb: 'FF64748B' } };
      balCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
    }

    row.getCell(9).value = ''; // Ký xác nhận
    row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };

    for (let c = 1; c <= totalColumns; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;
      if (!cell.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      if (!cell.font) cell.font = { name: 'Times New Roman', size: 10 };
    }

    currentRowIdx++;
  });

  // Summary row
  const sumRow = ws.getRow(currentRowIdx);
  sumRow.height = 24;
  ws.mergeCells(`A${currentRowIdx}:D${currentRowIdx}`);
  sumRow.getCell(1).value = `TỔNG CỘNG (${workloads.length} GIÁO VIÊN)`;
  sumRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  sumRow.getCell(1).font = { name: 'Times New Roman', size: 10.5, bold: true };

  for (let c = 1; c <= totalColumns; c++) {
    const cell = sumRow.getCell(c);
    cell.border = doubleBottomBorder;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    if (!cell.font) cell.font = { name: 'Times New Roman', size: 10, bold: true };
  }

  const sumTeach = workloads.reduce((sum, w) => sum + w.teachingPeriods, 0);
  const sumReduct = workloads.reduce((sum, w) => sum + w.reductionPeriods, 0);
  const sumTotal = workloads.reduce((sum, w) => sum + w.totalPeriods, 0);
  const sumBal = workloads.reduce((sum, w) => sum + w.weeklyBalance, 0);

  sumRow.getCell(5).value = sumTeach;
  sumRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

  sumRow.getCell(6).value = `+${sumReduct}t KN`;
  sumRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };

  sumRow.getCell(7).value = sumTotal;
  sumRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };

  const sumBalCell = sumRow.getCell(8);
  sumBalCell.value = sumBal;
  sumBalCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sumBalCell.font = {
    name: 'Times New Roman',
    size: 10.5,
    bold: true,
    color: { argb: sumBal < 0 ? 'FF991B1B' : sumBal > 0 ? 'FF15803D' : 'FF0F172A' },
  };

  currentRowIdx += 2;

  // Signature Block
  const dateStr = `Đồng Tháp, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`;
  ws.mergeCells(`F${currentRowIdx}:${lastColLetter}${currentRowIdx}`);
  ws.getCell(`F${currentRowIdx}`).value = dateStr;
  ws.getCell(`F${currentRowIdx}`).font = { name: 'Times New Roman', size: 10.5, italic: true };
  ws.getCell(`F${currentRowIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };

  currentRowIdx++;
  ws.mergeCells(`A${currentRowIdx}:D${currentRowIdx}`);
  ws.getCell(`A${currentRowIdx}`).value = 'TỔ TRƯỞNG CHUYÊN MÔN';
  ws.getCell(`A${currentRowIdx}`).font = { name: 'Times New Roman', size: 11, bold: true };
  ws.getCell(`A${currentRowIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`F${currentRowIdx}:${lastColLetter}${currentRowIdx}`);
  ws.getCell(`F${currentRowIdx}`).value = 'PHÓ HIỆU TRƯỞNG';
  ws.getCell(`F${currentRowIdx}`).font = { name: 'Times New Roman', size: 11, bold: true };
  ws.getCell(`F${currentRowIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };

  currentRowIdx++;
  ws.mergeCells(`A${currentRowIdx}:D${currentRowIdx}`);
  ws.getCell(`A${currentRowIdx}`).value = '(Ký và ghi rõ họ tên)';
  ws.getCell(`A${currentRowIdx}`).font = { name: 'Times New Roman', size: 9.5, italic: true };
  ws.getCell(`A${currentRowIdx}`).alignment = { horizontal: 'center', vertical: 'top' };

  ws.mergeCells(`F${currentRowIdx}:${lastColLetter}${currentRowIdx}`);
  ws.getCell(`F${currentRowIdx}`).value = '(Ký và ghi rõ họ tên)';
  ws.getCell(`F${currentRowIdx}`).font = { name: 'Times New Roman', size: 9.5, italic: true };
  ws.getCell(`F${currentRowIdx}`).alignment = { horizontal: 'center', vertical: 'top' };

  currentRowIdx += 4;
  ws.mergeCells(`A${currentRowIdx}:D${currentRowIdx}`);
  ws.getCell(`A${currentRowIdx}`).value = leaderName || '';
  ws.getCell(`A${currentRowIdx}`).font = { name: 'Times New Roman', size: 10.5, bold: true };
  ws.getCell(`A${currentRowIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`F${currentRowIdx}:${lastColLetter}${currentRowIdx}`);
  ws.getCell(`F${currentRowIdx}`).value = 'Nguyễn Minh Trí';
  ws.getCell(`F${currentRowIdx}`).font = { name: 'Times New Roman', size: 10.5, bold: true };
  ws.getCell(`F${currentRowIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.columns = [
    { width: 6 },   // STT
    { width: 22 },  // Họ tên
    { width: 22 },  // Lớp dạy
    { width: 28 },  // Môn dạy
    { width: 10 },  // Tiết dạy
    { width: 22 },  // Kiêm nhiệm
    { width: 12 },  // Tổng quy đổi
    { width: 14 },  // Thừa thiếu
    { width: 16 },  // Ký nhận
  ];

  const fileName = `So_Tiet_Thuc_Day_Tuan_${selectedWeek}_${(config.academicYear || '2026-2027').replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  await triggerBrowserDownload(wb, fileName);
}
