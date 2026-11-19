import ExcelJS from 'exceljs';
import {
  Teacher,
  Assignment,
  ClassGroup,
  Department,
  Subject,
  SchoolConfig,
  WorkloadStats
} from '../types';
import { getTeacherDutiesList } from './workloadCalculator';

/**
 * Loại bỏ toàn bộ các đuôi trong ngoặc đơn như lớp chủ nhiệm (12CB3), (11CB1),
 * chức vụ kiêm nhiệm (HT), (PHT), (TT), (TP), (TPT), (TP-9A7),...
 */
export function cleanTeacherDisplay(text?: string): string {
  if (!text) return '';
  return text.replace(/\s*\([^)]*\)/g, '').trim();
}

function colIndexToLetter(colIndex: number): string {
  let n = colIndex;
  let letter = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

function estimateWrappedHeight(textsAndWidths: Array<{ text: string; width: number }>, minHeight = 22): number {
  let maxLines = 1;
  textsAndWidths.forEach(({ text, width }) => {
    if (!text) return;
    const effectiveCharsPerLine = Math.max(8, Math.floor(width * 0.92));
    const segments = String(text).split(/\r?\n/);
    let totalLines = 0;
    segments.forEach((seg) => {
      totalLines += Math.max(1, Math.ceil(seg.length / effectiveCharsPerLine));
    });
    if (totalLines > maxLines) maxLines = totalLines;
  });
  return Math.max(minHeight, maxLines * 14.5 + 6);
}

export async function buildComprehensiveWorkbookBuffer(
  config: SchoolConfig,
  departments: Department[],
  subjects: Subject[],
  classes: ClassGroup[],
  teachers: Teacher[],
  assignments: Assignment[],
  workloads: WorkloadStats[]
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = config.vicePrincipalName || 'Nguyễn Minh Trí';
  wb.lastModifiedBy = 'Hệ thống Quản lý Phân công Chuyên môn';
  wb.created = new Date();
  wb.modified = new Date();

  const teacherMap = new Map(teachers.map(t => [t.id, t]));
  const _deptMap = new Map(departments.map(d => [d.id, d.name]));
  void _deptMap;

  const displayAcademicYear = (!config.academicYear || config.academicYear.includes('2024'))
    ? '2026 - 2027'
    : config.academicYear;

  const displaySemester = config.semester === 'HK1' ? 'HỌC KỲ I' : 'HỌC KỲ II';
  const displayVicePrincipal = (config.vicePrincipalName && config.vicePrincipalName.includes('-'))
    ? config.vicePrincipalName.split('-')[0].trim()
    : (config.vicePrincipalName || 'Nguyễn Minh Trí');
  const displayPrincipal = config.principalName || 'Lê Thanh Cường';
  const displaySubTitle = (config.subTitle || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP').toUpperCase();
  const displaySchoolName = (config.schoolName || 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU').toUpperCase();

  const getSubjectsForLevel = (level: 'THPT' | 'THCS') => subjects.filter(sub => {
    if (sub.id === 'sub-nv') return false;
    if (sub.id === 'sub-qpan' || sub.id === 'sub-hdtn-shl') return false;
    const grades = level === 'THPT' ? ['10', '11', '12'] : ['6', '7', '8', '9'];
    return grades.some(grade => (sub.defaultPeriods[grade] || 0) > 0);
  });

  const getAssignmentForSubject = (classId: string, subjectId: string) => {
    const subjectIds = subjectId === 'sub-gdqp'
      ? ['sub-gdqp', 'sub-qpan']
      : subjectId === 'sub-shl'
      ? ['sub-shl']
      : subjectId === 'sub-hdtn-qml'
      ? ['sub-hdtn-qml', 'sub-hdtn-shl']
      : [subjectId];
    const assignment = assignments.find(a => a.classId === classId && subjectIds.includes(a.subjectId));
    if (assignment || !['sub-su', 'sub-dia'].includes(subjectId)) return assignment;

    return assignments.find(a => a.classId === classId && a.subjectId === 'sub-lsdl-cs');
  };

  const applyDecree30Header = (
    ws: ExcelJS.Worksheet,
    totalCols: number,
    leftEndCol: number,
    rightStartCol: number
  ) => {
    const leftEndLetter = colIndexToLetter(leftEndCol);
    const rightStartLetter = colIndexToLetter(rightStartCol);
    const lastColLetter = colIndexToLetter(totalCols);

    ws.mergeCells(`A1:${leftEndLetter}1`);
    const cLeft1 = ws.getCell('A1');
    cLeft1.value = displaySubTitle;
    cLeft1.font = { name: 'Times New Roman', size: 10, bold: false, color: { argb: 'FF1E293B' } };
    cLeft1.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`A2:${leftEndLetter}2`);
    const cLeft2 = ws.getCell('A2');
    cLeft2.value = displaySchoolName;
    cLeft2.font = { name: 'Times New Roman', size: 10.5, bold: true, underline: true, color: { argb: 'FF0F172A' } };
    cLeft2.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`${rightStartLetter}1:${lastColLetter}1`);
    const cRight1 = ws.getCell(`${rightStartLetter}1`);
    cRight1.value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
    cRight1.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
    cRight1.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`${rightStartLetter}2:${lastColLetter}2`);
    const cRight2 = ws.getCell(`${rightStartLetter}2`);
    cRight2.value = 'Độc lập - Tự do - Hạnh phúc';
    cRight2.font = { name: 'Times New Roman', size: 10.5, bold: true, underline: true, color: { argb: 'FF0F172A' } };
    cRight2.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getRow(1).height = 18;
    ws.getRow(2).height = 19;
    ws.getRow(3).height = 8;
  };

  const getGradeFillArgb = (grade: string): string => {
    switch (grade) {
      case '10':
      case '6':
        return 'FFEFF6FF'; // Soft Blue
      case '11':
      case '7':
        return 'FFECFDF5'; // Soft Emerald
      case '12':
      case '8':
        return 'FFFEF3C7'; // Soft Amber
      case '9':
        return 'FFF3E8FF'; // Soft Purple
      default:
        return 'FFF1F5F9';
    }
  };

  const getGradeTextArgb = (grade: string): string => {
    switch (grade) {
      case '10':
      case '6':
        return 'FF1D4ED8';
      case '11':
      case '7':
        return 'FF047857';
      case '12':
      case '8':
        return 'FFB45309';
      case '9':
        return 'FF7E22CE';
      default:
        return 'FF0F172A';
    }
  };

  // Helper function to build a formatted matrix worksheet for a level
  const buildLevelSheet = (level: 'THPT' | 'THCS', sheetName: string) => {
    const isThpt = level === 'THPT';
    const levelClasses = classes.filter(c => c.level === level);
    const levelSubjects = getSubjectsForLevel(level);

    const colHeaders: string[] = [
      'STT',
      'Lớp',
      'Khối',
      'Sĩ số',
      'Giáo viên Chủ nhiệm (GVCN)'
    ];
    const colWidths: number[] = [5.5, 9, 9.5, 7.5, 22];

    levelSubjects.forEach(sub => {
      const p = sub.defaultPeriods[isThpt ? '10' : '6'] || 0;
      colHeaders.push(`${sub.name}\n(${p}t)`);
      colWidths.push(18);
    });

    if (isThpt) {
      colHeaders.push('Chuyên đề 1\n(CĐ1)');
      colHeaders.push('Chuyên đề 2\n(CĐ2)');
      colHeaders.push('Chuyên đề 3\n(CĐ3)');
      colWidths.push(23, 23, 23);
    }

    colHeaders.push('Ghi chú');
    colWidths.push(15);

    const totalCols = colHeaders.length;
    const lastColLetter = colIndexToLetter(totalCols);

    const ws = wb.addWorksheet(sheetName, {
      views: [{ state: 'frozen', xSplit: 2, ySplit: 6, showGridLines: false }],
      pageSetup: {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.25, right: 0.25, top: 0.3, bottom: 0.35, header: 0.15, footer: 0.15 },
        printTitlesRow: '6:6',
      },
    });

    // 1. Decree 30 Administrative Header (Rows 1-2)
    const leftEndCol = Math.min(6, Math.floor(totalCols / 2));
    const rightStartCol = Math.max(leftEndCol + 1, totalCols - 6);
    applyDecree30Header(ws, totalCols, leftEndCol, rightStartCol);

    // 2. Title & Subtitle Banner (Rows 4-5)
    ws.mergeCells(`A4:${lastColLetter}4`);
    const titleCell = ws.getCell('A4');
    titleCell.value = `BẢNG TỔNG HỢP PHÂN CÔNG CHUYÊN MÔN GIẢNG DẠY - CẤP ${isThpt ? 'THPT (KHỐI 10 - 12)' : 'THCS (KHỐI 6 - 9)'}`;
    titleCell.font = { name: 'Times New Roman', size: 13.5, bold: true, color: { argb: 'FF1E3A8A' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = {
      top: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      bottom: { style: 'thin', color: { argb: 'FFC7D2FE' } },
      left: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      right: { style: 'medium', color: { argb: 'FF1E3A8A' } },
    };
    ws.getRow(4).height = 28;

    ws.mergeCells(`A5:${lastColLetter}5`);
    const subCell = ws.getCell('A5');
    subCell.value = `${displaySemester} - NĂM HỌC ${displayAcademicYear} (Chương trình GDPT 2018) • Tổng quy mô: ${levelClasses.length} lớp học`;
    subCell.font = { name: 'Times New Roman', size: 10.5, italic: true, bold: true, color: { argb: 'FF334155' } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subCell.border = {
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      right: { style: 'medium', color: { argb: 'FF1E3A8A' } },
    };
    ws.getRow(5).height = 20;

    // 3. Column Headers (Row 6)
    const headerRow = ws.getRow(6);
    headerRow.height = 34;
    const topicStartCol = isThpt ? 6 + levelSubjects.length : totalCols + 1;
    const topicEndCol = isThpt ? topicStartCol + 2 : totalCols;

    colHeaders.forEach((headerText, idx) => {
      const colNumber = idx + 1;
      const cell = headerRow.getCell(colNumber);
      cell.value = headerText;
      cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

      let headerBg = 'FF1E3A8A'; // Deep Navy for fixed info cols (1-5)
      if (colNumber > 5 && colNumber < topicStartCol && colNumber < totalCols) {
        headerBg = 'FF334155'; // Slate for subject cols
      } else if (colNumber >= topicStartCol && colNumber <= topicEndCol) {
        headerBg = 'FF0F766E'; // Deep Teal for CĐ1-3
      } else if (colNumber === totalCols) {
        headerBg = 'FF475569'; // Ghi chú
      }

      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBg } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF0F172A' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        left: { style: colNumber === 1 ? 'medium' : 'thin', color: { argb: colNumber === 1 ? 'FF0F172A' : 'FF94A3B8' } },
        right: { style: colNumber === totalCols ? 'medium' : 'thin', color: { argb: colNumber === totalCols ? 'FF0F172A' : 'FF94A3B8' } },
      };
    });

    // 4. Data Rows
    let currentRowIdx = 7;
    let totalStudents = 0;

    levelClasses.forEach((cls, idx) => {
      totalStudents += cls.studentCount || 0;
      const hrTeacher = cls.homeroomTeacherId ? teacherMap.get(cls.homeroomTeacherId) : undefined;
      const hrName = hrTeacher ? cleanTeacherDisplay(hrTeacher.name) : '—';

      const prevCls = idx > 0 ? levelClasses[idx - 1] : null;
      const isNewGrade = prevCls !== null && prevCls.grade !== cls.grade;
      const isEven = idx % 2 === 0;
      const rowBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

      const rowValues: (string | number)[] = [
        idx + 1,
        cls.name,
        `Khối ${cls.grade}`,
        cls.studentCount || 0,
        hrName,
      ];

      levelSubjects.forEach(sub => {
        const periods = sub.defaultPeriods[cls.grade] || 0;
        if (periods === 0) {
          rowValues.push('—');
          return;
        }
        const assignment = getAssignmentForSubject(cls.id, sub.id);
        const assignedTeacher = assignment ? teacherMap.get(assignment.teacherId) : null;
        const displayedTeacher = assignedTeacher || (
          !isThpt && sub.id === 'sub-shl' && cls.homeroomTeacherId
            ? teacherMap.get(cls.homeroomTeacherId)
            : null
        );
        rowValues.push(displayedTeacher ? cleanTeacherDisplay(displayedTeacher.name) : '—');
      });

      if (isThpt) {
        (['cd1', 'cd2', 'cd3'] as const).forEach(key => {
          const topic = cls.specialTopics?.[key];
          if (topic) {
            const t = teacherMap.get(topic.teacherId);
            rowValues.push(`${topic.title} - ${t ? cleanTeacherDisplay(t.name) : ''}`);
          } else {
            rowValues.push('—');
          }
        });
      }

      rowValues.push(''); // Ghi chú

      const row = ws.getRow(currentRowIdx++);
      const wrapPairs = rowValues.map((val, cIdx) => ({
        text: typeof val === 'string' ? val : '',
        width: colWidths[cIdx] || 15,
      }));
      row.height = estimateWrappedHeight(wrapPairs, 22);

      rowValues.forEach((val, cIdx) => {
        const colNumber = cIdx + 1;
        const cell = row.getCell(colNumber);
        cell.value = val;

        const isDash = val === '—' || val === '';
        const isCenter = colNumber <= 4 || isDash;

        cell.alignment = {
          horizontal: isCenter ? 'center' : 'left',
          vertical: 'middle',
          wrapText: true,
        };

        let cellFill = rowBg;
        let fontColor = isDash ? 'FF94A3B8' : 'FF0F172A';
        let isBold = colNumber === 2 || colNumber === 3 || colNumber === 5;

        if (colNumber === 3) {
          cellFill = getGradeFillArgb(String(cls.grade));
          fontColor = getGradeTextArgb(String(cls.grade));
        } else if (colNumber === 2) {
          fontColor = 'FF1E3A8A';
        } else if (colNumber === 5 && !isDash) {
          isBold = true;
        }

        cell.font = {
          name: 'Times New Roman',
          size: 10,
          bold: isBold,
          color: { argb: fontColor },
        };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cellFill } };
        cell.border = {
          top: {
            style: isNewGrade ? 'medium' : 'thin',
            color: { argb: isNewGrade ? 'FF1E3A8A' : 'FFCBD5E1' },
          },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: {
            style: colNumber === 1 || colNumber === 6 ? 'medium' : 'thin',
            color: { argb: colNumber === 1 ? 'FF0F172A' : colNumber === 6 ? 'FF94A3B8' : 'FFCBD5E1' },
          },
          right: {
            style: colNumber === totalCols ? 'medium' : 'thin',
            color: { argb: colNumber === totalCols ? 'FF0F172A' : 'FFCBD5E1' },
          },
        };
      });
    });

    // 5. Total Row
    const totalRowIdx = currentRowIdx++;
    const totalRow = ws.getRow(totalRowIdx);
    totalRow.height = 25;

    ws.mergeCells(`A${totalRowIdx}:B${totalRowIdx}`);
    totalRow.getCell(1).value = 'TỔNG CỘNG';
    totalRow.getCell(3).value = `${levelClasses.length} lớp`;
    totalRow.getCell(4).value = totalStudents;
    totalRow.getCell(4).numFmt = '#,##0';
    totalRow.getCell(5).value = `Toàn cấp ${level} • ${levelSubjects.length} môn học`;

    for (let c = 1; c <= totalCols; c++) {
      const cell = totalRow.getCell(c);
      cell.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
      cell.alignment = {
        horizontal: c === 5 ? 'left' : 'center',
        vertical: 'middle',
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF0F172A' } },
        bottom: { style: 'double', color: { argb: 'FF0F172A' } },
        left: { style: c === 1 ? 'medium' : 'thin', color: { argb: c === 1 ? 'FF0F172A' : 'FF94A3B8' } },
        right: { style: c === totalCols ? 'medium' : 'thin', color: { argb: c === totalCols ? 'FF0F172A' : 'FF94A3B8' } },
      };
    }

    // 6. Signature Block
    currentRowIdx += 1; // blank row after total
    const dateRowIdx = currentRowIdx++;
    const signLeftStart = 2;
    const signLeftEnd = Math.min(5, totalCols);
    const signRightStart = Math.max(signLeftEnd + 2, totalCols - 4);
    const signLeftS = colIndexToLetter(signLeftStart);
    const signLeftE = colIndexToLetter(signLeftEnd);
    const signRightS = colIndexToLetter(signRightStart);

    const now = new Date();
    ws.mergeCells(`${signRightS}${dateRowIdx}:${lastColLetter}${dateRowIdx}`);
    const dateCell = ws.getCell(`${signRightS}${dateRowIdx}`);
    dateCell.value = `Đốc Binh Kiều, ngày ${String(now.getDate()).padStart(2, '0')} tháng ${String(now.getMonth() + 1).padStart(2, '0')} năm ${now.getFullYear()}`;
    dateCell.font = { name: 'Times New Roman', size: 10, italic: true, color: { argb: 'FF334155' } };
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

    const signTitleIdx = currentRowIdx++;
    ws.getRow(signTitleIdx).height = 20;
    ws.mergeCells(`${signLeftS}${signTitleIdx}:${signLeftE}${signTitleIdx}`);
    const sLeftTitle = ws.getCell(`${signLeftS}${signTitleIdx}`);
    sLeftTitle.value = 'NGƯỜI LẬP BẢNG';
    sLeftTitle.font = { name: 'Times New Roman', size: 10.5, bold: true };
    sLeftTitle.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`${signRightS}${signTitleIdx}:${lastColLetter}${signTitleIdx}`);
    const sRightTitle = ws.getCell(`${signRightS}${signTitleIdx}`);
    sRightTitle.value = 'HIỆU TRƯỞNG';
    sRightTitle.font = { name: 'Times New Roman', size: 10.5, bold: true };
    sRightTitle.alignment = { horizontal: 'center', vertical: 'middle' };

    const signSubIdx = currentRowIdx++;
    ws.getRow(signSubIdx).height = 17;
    ws.mergeCells(`${signLeftS}${signSubIdx}:${signLeftE}${signSubIdx}`);
    const sLeftSub = ws.getCell(`${signLeftS}${signSubIdx}`);
    sLeftSub.value = '(Ký và ghi rõ họ tên)';
    sLeftSub.font = { name: 'Times New Roman', size: 9.5, italic: true };
    sLeftSub.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`${signRightS}${signSubIdx}:${lastColLetter}${signSubIdx}`);
    const sRightSub = ws.getCell(`${signRightS}${signSubIdx}`);
    sRightSub.value = '(Ký tên, đóng dấu)';
    sRightSub.font = { name: 'Times New Roman', size: 9.5, italic: true };
    sRightSub.alignment = { horizontal: 'center', vertical: 'middle' };

    currentRowIdx += 3; // signature whitespace
    const signNameIdx = currentRowIdx;
    ws.getRow(signNameIdx).height = 22;
    ws.mergeCells(`${signLeftS}${signNameIdx}:${signLeftE}${signNameIdx}`);
    const sLeftName = ws.getCell(`${signLeftS}${signNameIdx}`);
    sLeftName.value = displayVicePrincipal;
    sLeftName.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } };
    sLeftName.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`${signRightS}${signNameIdx}:${lastColLetter}${signNameIdx}`);
    const sRightName = ws.getCell(`${signRightS}${signNameIdx}`);
    sRightName.value = displayPrincipal;
    sRightName.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } };
    sRightName.alignment = { horizontal: 'center', vertical: 'middle' };

    // Apply column widths and print area
    ws.columns = colWidths.map((w) => ({ width: w }));
    ws.pageSetup.printArea = `A1:${lastColLetter}${signNameIdx}`;

    return ws;
  };

  // ==========================================
  // SHEET 1 & SHEET 2: THPT & THCS
  // ==========================================
  buildLevelSheet('THPT', 'THPT (Khối 10-12)');
  buildLevelSheet('THCS', 'THCS (Khối 6-9)');

  // ==========================================
  // SHEET 3: THỐNG KÊ ĐỊNH MỨC GIÁO VIÊN
  // ==========================================
  const statsCols = [
    { header: 'STT', width: 5.5 },
    { header: 'Mã GV', width: 13 },
    { header: 'Họ và tên giáo viên', width: 23 },
    { header: 'Tổ chuyên môn', width: 22 },
    { header: 'Điểm trường', width: 14 },
    { header: 'Chức vụ / Kiêm nhiệm', width: 28 },
    { header: 'Chủ nhiệm\nlớp', width: 11 },
    { header: 'ĐM chuẩn', width: 10 },
    { header: 'Tổng giảm', width: 10 },
    { header: 'ĐM sau\ngiảm', width: 11 },
    { header: 'Số tiết\ndạy', width: 10 },
    { header: 'Chênh lệch\n(+/-)', width: 13 },
    { header: 'Danh sách lớp & môn phụ trách', width: 46 },
  ];
  const statsTotalCols = statsCols.length;
  const statsLastLetter = colIndexToLetter(statsTotalCols);

  const wsStats = wb.addWorksheet('Thống Kê Định Mức GV', {
    views: [{ state: 'frozen', xSplit: 3, ySplit: 6, showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.25, right: 0.25, top: 0.3, bottom: 0.35, header: 0.15, footer: 0.15 },
      printTitlesRow: '6:6',
    },
  });

  applyDecree30Header(wsStats, statsTotalCols, 5, 8);

  wsStats.mergeCells(`A4:${statsLastLetter}4`);
  const sTitle = wsStats.getCell('A4');
  sTitle.value = `THỐNG KÊ ĐỊNH MỨC & PHÂN CÔNG GIẢNG DẠY - NĂM HỌC ${displayAcademicYear}`;
  sTitle.font = { name: 'Times New Roman', size: 13.5, bold: true, color: { argb: 'FF1E3A8A' } };
  sTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
  sTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  sTitle.border = {
    top: { style: 'medium', color: { argb: 'FF1E3A8A' } },
    bottom: { style: 'thin', color: { argb: 'FFC7D2FE' } },
    left: { style: 'medium', color: { argb: 'FF1E3A8A' } },
    right: { style: 'medium', color: { argb: 'FF1E3A8A' } },
  };
  wsStats.getRow(4).height = 28;

  const surplusTeachers = workloads.filter(w => w.balance > 0).length;
  const deficitTeachers = workloads.filter(w => w.balance < 0).length;
  const exactTeachers = workloads.length - surplusTeachers - deficitTeachers;

  wsStats.mergeCells(`A5:${statsLastLetter}5`);
  const sSub = wsStats.getCell('A5');
  sSub.value = `${displaySemester} • Tổng số: ${workloads.length} giáo viên (${surplusTeachers} thừa tiết, ${exactTeachers} đủ định mức, ${deficitTeachers} thiếu tiết)`;
  sSub.font = { name: 'Times New Roman', size: 10.5, italic: true, bold: true, color: { argb: 'FF334155' } };
  sSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  sSub.alignment = { horizontal: 'center', vertical: 'middle' };
  sSub.border = {
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'medium', color: { argb: 'FF1E3A8A' } },
    right: { style: 'medium', color: { argb: 'FF1E3A8A' } },
  };
  wsStats.getRow(5).height = 20;

  const sHeaderRow = wsStats.getRow(6);
  sHeaderRow.height = 32;
  statsCols.forEach((colDef, idx) => {
    const colNumber = idx + 1;
    const cell = sHeaderRow.getCell(colNumber);
    cell.value = colDef.header;
    cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colNumber === 12 ? 'FF0F766E' : colNumber <= 7 ? 'FF1E3A8A' : 'FF334155' },
    };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: colNumber === 1 ? 'medium' : 'thin', color: { argb: colNumber === 1 ? 'FF0F172A' : 'FF94A3B8' } },
      right: { style: colNumber === statsTotalCols ? 'medium' : 'thin', color: { argb: colNumber === statsTotalCols ? 'FF0F172A' : 'FF94A3B8' } },
    };
  });

  let sRowIdx = 7;
  let sumBase = 0;
  let sumReduction = 0;
  let sumTarget = 0;
  let sumAssigned = 0;
  let sumBalance = 0;

  workloads.forEach((w, idx) => {
    const teacher = teacherMap.get(w.teacherId);
    const dutiesStr = teacher
      ? getTeacherDutiesList(teacher).map(d => `${d.name} (${d.reduction > 0 ? `-${d.reduction}t` : 'ĐM 2t'})`).join('; ') || 'GV bộ môn'
      : 'GV bộ môn';
    const classListStr = w.assignedClasses
      .map(c => `${c.className} (${c.subjectName}: ${c.periods}t)`)
      .join(', ') || '—';
    const baseStd = teacher?.baseStandardPeriods || (teacher?.campus === 'THPTDBK' ? 17 : 19);

    sumBase += baseStd;
    sumReduction += w.reductionPeriods;
    sumTarget += w.targetPeriods;
    sumAssigned += w.assignedPeriods;
    sumBalance += w.balance;

    const rowValues: (string | number)[] = [
      idx + 1,
      cleanTeacherDisplay(teacher?.code),
      cleanTeacherDisplay(w.teacherName),
      w.departmentName,
      teacher?.campus === 'THPTDBK' ? 'THPT ĐBK' : teacher?.campus === 'THCSDBK' ? 'THCS ĐBK' : 'THCS Tân Kiều',
      dutiesStr,
      w.homeroomClass || '—',
      baseStd,
      w.reductionPeriods,
      w.targetPeriods,
      w.assignedPeriods,
      w.balance > 0 ? `+${w.balance}` : w.balance,
      classListStr,
    ];

    const row = wsStats.getRow(sRowIdx++);
    row.height = estimateWrappedHeight(
      [
        { text: dutiesStr, width: statsCols[5].width },
        { text: classListStr, width: statsCols[12].width },
        { text: w.departmentName, width: statsCols[3].width },
      ],
      22
    );

    const rowBg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';

    rowValues.forEach((val, cIdx) => {
      const colNumber = cIdx + 1;
      const cell = row.getCell(colNumber);
      cell.value = val;

      const isLeft = colNumber === 3 || colNumber === 4 || colNumber === 6 || colNumber === 13;
      cell.alignment = {
        horizontal: isLeft ? 'left' : 'center',
        vertical: 'middle',
        wrapText: true,
      };

      let fillArgb = rowBg;
      let fontArgb = 'FF0F172A';
      let isBold = colNumber === 3 || colNumber === 11 || colNumber === 12;

      if (colNumber === 12) {
        if (w.balance < 0) {
          fillArgb = 'FFFEE2E2';
          fontArgb = 'FF991B1B';
        } else if (w.balance > 0) {
          fillArgb = 'FFDCFCE7';
          fontArgb = 'FF15803D';
        } else {
          fillArgb = 'FFF1F5F9';
          fontArgb = 'FF334155';
        }
      } else if (colNumber === 7 && val === '—') {
        fontArgb = 'FF94A3B8';
      }

      cell.font = {
        name: 'Times New Roman',
        size: 10,
        bold: isBold,
        color: { argb: fontArgb },
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: colNumber === 1 ? 'medium' : 'thin', color: { argb: colNumber === 1 ? 'FF0F172A' : 'FFCBD5E1' } },
        right: { style: colNumber === statsTotalCols ? 'medium' : 'thin', color: { argb: colNumber === statsTotalCols ? 'FF0F172A' : 'FFCBD5E1' } },
      };
    });
  });

  // Total row on Sheet 3
  const sTotalRowIdx = sRowIdx++;
  const sTotalRow = wsStats.getRow(sTotalRowIdx);
  sTotalRow.height = 25;
  wsStats.mergeCells(`A${sTotalRowIdx}:G${sTotalRowIdx}`);
  sTotalRow.getCell(1).value = `TỔNG CỘNG (${workloads.length} GIÁO VIÊN)`;
  sTotalRow.getCell(8).value = sumBase;
  sTotalRow.getCell(9).value = sumReduction;
  sTotalRow.getCell(10).value = sumTarget;
  sTotalRow.getCell(11).value = sumAssigned;
  sTotalRow.getCell(12).value = sumBalance > 0 ? `+${sumBalance}` : sumBalance;
  sTotalRow.getCell(13).value = `${surplusTeachers} thừa / ${exactTeachers} đủ / ${deficitTeachers} thiếu`;

  for (let c = 1; c <= statsTotalCols; c++) {
    const cell = sTotalRow.getCell(c);
    cell.font = {
      name: 'Times New Roman',
      size: 10.5,
      bold: true,
      color: { argb: c === 12 ? (sumBalance < 0 ? 'FF991B1B' : sumBalance > 0 ? 'FF15803D' : 'FF0F172A') : 'FF0F172A' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: c === 1 ? 'medium' : 'thin', color: { argb: c === 1 ? 'FF0F172A' : 'FF94A3B8' } },
      right: { style: c === statsTotalCols ? 'medium' : 'thin', color: { argb: c === statsTotalCols ? 'FF0F172A' : 'FF94A3B8' } },
    };
  }

  // Signature block on Sheet 3
  sRowIdx += 1;
  const sDateIdx = sRowIdx++;
  const now3 = new Date();
  wsStats.mergeCells(`I${sDateIdx}:M${sDateIdx}`);
  wsStats.getCell(`I${sDateIdx}`).value = `Đốc Binh Kiều, ngày ${String(now3.getDate()).padStart(2, '0')} tháng ${String(now3.getMonth() + 1).padStart(2, '0')} năm ${now3.getFullYear()}`;
  wsStats.getCell(`I${sDateIdx}`).font = { name: 'Times New Roman', size: 10, italic: true, color: { argb: 'FF334155' } };
  wsStats.getCell(`I${sDateIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };

  const sSignTitleIdx = sRowIdx++;
  wsStats.getRow(sSignTitleIdx).height = 20;
  wsStats.mergeCells(`B${sSignTitleIdx}:F${sSignTitleIdx}`);
  wsStats.getCell(`B${sSignTitleIdx}`).value = 'NGƯỜI LẬP BẢNG';
  wsStats.getCell(`B${sSignTitleIdx}`).font = { name: 'Times New Roman', size: 10.5, bold: true };
  wsStats.getCell(`B${sSignTitleIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };

  wsStats.mergeCells(`I${sSignTitleIdx}:M${sSignTitleIdx}`);
  wsStats.getCell(`I${sSignTitleIdx}`).value = 'HIỆU TRƯỞNG';
  wsStats.getCell(`I${sSignTitleIdx}`).font = { name: 'Times New Roman', size: 10.5, bold: true };
  wsStats.getCell(`I${sSignTitleIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };

  const sSignSubIdx = sRowIdx++;
  wsStats.mergeCells(`B${sSignSubIdx}:F${sSignSubIdx}`);
  wsStats.getCell(`B${sSignSubIdx}`).value = '(Ký và ghi rõ họ tên)';
  wsStats.getCell(`B${sSignSubIdx}`).font = { name: 'Times New Roman', size: 9.5, italic: true };
  wsStats.getCell(`B${sSignSubIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };

  wsStats.mergeCells(`I${sSignSubIdx}:M${sSignSubIdx}`);
  wsStats.getCell(`I${sSignSubIdx}`).value = '(Ký tên, đóng dấu)';
  wsStats.getCell(`I${sSignSubIdx}`).font = { name: 'Times New Roman', size: 9.5, italic: true };
  wsStats.getCell(`I${sSignSubIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };

  sRowIdx += 3;
  wsStats.mergeCells(`B${sRowIdx}:F${sRowIdx}`);
  wsStats.getCell(`B${sRowIdx}`).value = displayVicePrincipal;
  wsStats.getCell(`B${sRowIdx}`).font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } };
  wsStats.getCell(`B${sRowIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };

  wsStats.mergeCells(`I${sRowIdx}:M${sRowIdx}`);
  wsStats.getCell(`I${sRowIdx}`).value = displayPrincipal;
  wsStats.getCell(`I${sRowIdx}`).font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } };
  wsStats.getCell(`I${sRowIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };

  wsStats.columns = statsCols.map(c => ({ width: c.width }));
  wsStats.pageSetup.printArea = `A1:${statsLastLetter}${sRowIdx}`;

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

export async function exportComprehensiveExcel(
  config: SchoolConfig,
  departments: Department[],
  subjects: Subject[],
  classes: ClassGroup[],
  teachers: Teacher[],
  assignments: Assignment[],
  workloads: WorkloadStats[]
) {
  const displayAcademicYear = (!config.academicYear || config.academicYear.includes('2024'))
    ? '2026 - 2027'
    : config.academicYear;

  const buffer = await buildComprehensiveWorkbookBuffer(
    config,
    departments,
    subjects,
    classes,
    teachers,
    assignments,
    workloads
  );

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bang_Tong_Hop_Phan_Cong_Chuyen_Mon_${displayAcademicYear.replace(/\s+/g, '_')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function generateExcelTemplate() {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // Template 1: Danh sách giáo viên
  const gvHeaders = [
    ['MẪU NHẬP DANH SÁCH GIÁO VIÊN & ĐỊNH MỨC'],
    ['Mã GV', 'Họ và tên', 'Giới tính (Nam/Nữ)', 'Tổ chuyên môn', 'Môn giảng dạy', 'Chức vụ (GVBM/ToTruong/ToPho/BiThuDoan)', 'Định mức chuẩn (17)', 'SĐT', 'Email'],
    ['Hùng.NV', 'Nguyễn Văn Hùng', 'Nam', 'Tổ Toán - Tin học', 'Toán học', 'ToTruong', 17, '0912345678', 'hung@moet.edu.vn'],
    ['Thảo.LTT', 'Lê Thị Thu Thảo', 'Nữ', 'Tổ Ngữ văn', 'Ngữ văn', 'ToTruong', 17, '0903555666', 'thao@moet.edu.vn'],
    ['Nhi.PTY', 'Phan Thị Yến Nhi', 'Nữ', 'Tổ Tiếng Anh', 'Tiếng Anh', 'GVBM', 17, '0979888999', 'nhi@moet.edu.vn'],
  ];
  const wsGV = XLSX.utils.aoa_to_sheet(gvHeaders);
  XLSX.utils.book_append_sheet(wb, wsGV, 'DanhSachGiaoVien');

  // Template 2: Phân công lớp - môn
  const pcHeaders = [
    ['MẪU PHÂN CÔNG GIẢNG DẠY (LỚP - MÔN - GIÁO VIÊN)'],
    ['Tên Lớp', 'Môn học', 'Tên Giáo viên giảng dạy', 'Số tiết/tuần', 'Ghi chú'],
    ['10A1', 'Toán học', 'Nguyễn Văn Hùng', 4, ''],
    ['10A1', 'Ngữ văn', 'Lê Thị Thu Thảo', 4, ''],
    ['10A1', 'Tiếng Anh', 'Phan Thị Yến Nhi', 3, ''],
    ['10A2', 'Toán học', 'Nguyễn Văn Hùng', 4, ''],
    ['10A2', 'Ngữ văn', 'Lê Thị Thu Thảo', 4, ''],
  ];
  const wsPC = XLSX.utils.aoa_to_sheet(pcHeaders);
  XLSX.utils.book_append_sheet(wb, wsPC, 'PhanCongGiangDay');

  XLSX.writeFile(wb, 'Mau_Nhap_Phan_Cong_Chuyen_Mon_Doc_Binh_Kieu.xlsx');
}

export interface ExcelImportResult {
  teachersImported: number;
  assignmentsImported: number;
  classesImported: number;
  errors: string[];
  newTeachers?: Partial<Teacher>[];
  newAssignments?: Partial<Assignment>[];
}

export function parsePastedData(
  text: string,
  currentTeachers: Teacher[],
  currentClasses: ClassGroup[],
  currentSubjects: Subject[],
  currentDepartments: Department[]
): ExcelImportResult {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) {
    throw new Error('Dữ liệu dán vào trống. Vui lòng copy các dòng từ bảng Excel.');
  }

  const errors: string[] = [];
  let teachersImported = 0;
  let assignmentsImported = 0;
  let classesImported = 0;

  const importedTeachers: Partial<Teacher>[] = [];
  const importedAssignments: Partial<Assignment>[] = [];

  // Parse lines as tab-separated or comma/semicolon-separated
  const rows = lines.map(line => {
    if (line.includes('\t')) return line.split('\t').map(c => c.trim());
    if (line.includes(';')) return line.split(';').map(c => c.trim());
    if (line.includes(',')) return line.split(',').map(c => c.trim());
    return line.split(/\s{2,}/).map(c => c.trim());
  });

  // Find header if any
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const rowStr = rows[i].map(c => c.toLowerCase()).join(' ');
    if (rowStr.includes('giáo viên') || rowStr.includes('họ và tên') || rowStr.includes('môn') || rowStr.includes('lớp') || rowStr.includes('tổ')) {
      headerIdx = i;
      break;
    }
  }

  const startRow = headerIdx !== -1 ? headerIdx + 1 : 0;
  const headers = headerIdx !== -1 ? rows[headerIdx].map(c => c.toLowerCase()) : [];

  // Case 1: Lớp - Môn - GV (hoặc các cột tương tự)
  const classColIdx = headers.findIndex(h => /lớp|tên lớp|class/i.test(h));
  const subColIdx = headers.findIndex(h => /môn|môn học|subject/i.test(h));
  const teacherColIdx = headers.findIndex(h => /giáo viên|gv|họ và tên|gv dạy|tên gv/i.test(h));

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (row.length < 2) continue;

    // If matches Lớp, Môn, GV
    if (classColIdx !== -1 && subColIdx !== -1 && teacherColIdx !== -1) {
      const className = row[classColIdx];
      const subName = row[subColIdx];
      const teacherName = row[teacherColIdx];

      const matchedClass = currentClasses.find(c => c.name.toLowerCase() === className.toLowerCase());
      const matchedSubject = currentSubjects.find(
        s => s.name.toLowerCase().includes(subName.toLowerCase()) || subName.toLowerCase().includes(s.shortName.toLowerCase())
      );
      const matchedTeacher = currentTeachers.find(
        t => t.name.toLowerCase().includes(teacherName.toLowerCase()) || teacherName.toLowerCase().includes(t.name.toLowerCase())
      );

      if (matchedClass && matchedSubject && matchedTeacher) {
        importedAssignments.push({
          id: `paste-${matchedClass.id}-${matchedSubject.id}`,
          classId: matchedClass.id,
          subjectId: matchedSubject.id,
          teacherId: matchedTeacher.id,
          periodsPerWeek: matchedSubject.defaultPeriods[matchedClass.grade] || 2,
        });
        assignmentsImported++;
      }
    } else {
      // Heuristic row check:
      // Try to find teacher or class or subject in row items
      let foundTeacher: Teacher | undefined;
      let foundClass: ClassGroup | undefined;
      let foundSubject: Subject | undefined;

      row.forEach(cell => {
        const cLower = cell.toLowerCase();
        if (!foundClass) {
          foundClass = currentClasses.find(cls => cls.name.toLowerCase() === cLower);
        }
        if (!foundSubject) {
          foundSubject = currentSubjects.find(s => s.name.toLowerCase() === cLower || s.shortName.toLowerCase() === cLower || cLower.includes(s.name.toLowerCase()));
        }
        if (!foundTeacher) {
          foundTeacher = currentTeachers.find(t => t.name.toLowerCase() === cLower || cLower.includes(t.name.toLowerCase()) || (t.code && cLower === t.code.toLowerCase()));
        }
      });

      // If found both class, subject, and teacher
      if (foundClass && foundSubject && foundTeacher) {
        importedAssignments.push({
          id: `paste-h-${(foundClass as ClassGroup).id}-${(foundSubject as Subject).id}`,
          classId: (foundClass as ClassGroup).id,
          subjectId: (foundSubject as Subject).id,
          teacherId: (foundTeacher as Teacher).id,
          periodsPerWeek: (foundSubject as Subject).defaultPeriods[(foundClass as ClassGroup).grade] || 2,
        });
        assignmentsImported++;
      } else if (foundTeacher && !foundClass && !foundSubject) {
        // Teacher listing
        teachersImported++;
      }
    }
  }

  return {
    teachersImported,
    assignmentsImported,
    classesImported,
    errors,
    newTeachers: importedTeachers,
    newAssignments: importedAssignments,
  };
}

export async function parseExcelFile(
  file: File,
  currentTeachers: Teacher[],
  currentClasses: ClassGroup[],
  currentSubjects: Subject[],
  currentDepartments: Department[]
): Promise<ExcelImportResult> {
  const XLSX = await import('xlsx');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const errors: string[] = [];
        let teachersImported = 0;
        let assignmentsImported = 0;
        let classesImported = 0;

        const importedTeachers: Partial<Teacher>[] = [];
        const importedAssignments: Partial<Assignment>[] = [];

        // Check sheets
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

          if (rows.length === 0) return;

          // Find header row in sheet
          let headerIdx = -1;
          for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const rowStr = rows[i].map(c => String(c).toLowerCase().trim()).join(' ');
            if (rowStr.includes('giáo viên') || rowStr.includes('họ và tên') || rowStr.includes('môn') || rowStr.includes('lớp')) {
              headerIdx = i;
              break;
            }
          }

          if (headerIdx === -1) return;

          const headers = rows[headerIdx].map(c => String(c).trim());

          // Case A: Table of Assignments (Lớp, Môn, Giáo viên)
          const classColIdx = headers.findIndex(h => /lớp|tên lớp|class/i.test(h));
          const subColIdx = headers.findIndex(h => /môn|môn học|subject/i.test(h));
          const teacherColIdx = headers.findIndex(h => /giáo viên|gv|họ và tên|gv dạy|tên gv/i.test(h));
          const periodColIdx = headers.findIndex(h => /tiết|số tiết|periods/i.test(h));

          if (classColIdx !== -1 && subColIdx !== -1 && teacherColIdx !== -1) {
            for (let r = headerIdx + 1; r < rows.length; r++) {
              const row = rows[r];
              const className = String(row[classColIdx] || '').trim();
              const subName = String(row[subColIdx] || '').trim();
              const teacherName = String(row[teacherColIdx] || '').trim();
              const periods = Number(row[periodColIdx]) || 0;

              if (!className || !subName || !teacherName) continue;

              // Find or match class
              const matchedClass = currentClasses.find(c => c.name.toLowerCase() === className.toLowerCase());
              const matchedSubject = currentSubjects.find(
                s => s.name.toLowerCase().includes(subName.toLowerCase()) || subName.toLowerCase().includes(s.shortName.toLowerCase())
              );
              const matchedTeacher = currentTeachers.find(
                t => t.name.toLowerCase().includes(teacherName.toLowerCase()) || teacherName.toLowerCase().includes(t.name.toLowerCase())
              );

              if (matchedClass && matchedSubject && matchedTeacher) {
                importedAssignments.push({
                  id: `imp-${matchedClass.id}-${matchedSubject.id}`,
                  classId: matchedClass.id,
                  subjectId: matchedSubject.id,
                  teacherId: matchedTeacher.id,
                  periodsPerWeek: periods || matchedSubject.defaultPeriods[matchedClass.grade] || 2,
                });
                assignmentsImported++;
              }
            }
          }

          // Case B: Matrix Sheet (STT, Khối, Lớp, GVCN, [Toán], [Văn], [Anh]...)
          if (classColIdx !== -1 && subColIdx === -1 && headers.length > 5) {
            // Find subject columns
            const matchedSubCols: { colIndex: number; subject: Subject }[] = [];
            headers.forEach((h, colI) => {
              const foundSub = currentSubjects.find(
                s => h.toLowerCase().includes(s.shortName.toLowerCase()) || h.toLowerCase().includes(s.name.toLowerCase())
              );
              if (foundSub) {
                matchedSubCols.push({ colIndex: colI, subject: foundSub });
              }
            });

            if (matchedSubCols.length > 0) {
              for (let r = headerIdx + 1; r < rows.length; r++) {
                const row = rows[r];
                const className = String(row[classColIdx] || '').trim();
                if (!className) continue;

                const matchedClass = currentClasses.find(c => c.name.toLowerCase() === className.toLowerCase());
                if (!matchedClass) continue;

                matchedSubCols.forEach(({ colIndex, subject }) => {
                  const teacherCell = String(row[colIndex] || '').trim();
                  if (!teacherCell) return;

                  const matchedTeacher = currentTeachers.find(
                    t => t.name.toLowerCase().includes(teacherCell.toLowerCase()) || teacherCell.toLowerCase().includes(t.name.toLowerCase())
                  );

                  if (matchedTeacher) {
                    importedAssignments.push({
                      id: `imp-mat-${matchedClass.id}-${subject.id}`,
                      classId: matchedClass.id,
                      subjectId: subject.id,
                      teacherId: matchedTeacher.id,
                      periodsPerWeek: subject.defaultPeriods[matchedClass.grade] || 2,
                    });
                    assignmentsImported++;
                  }
                });
              }
            }
          }
        });

        resolve({
          teachersImported,
          assignmentsImported,
          classesImported,
          errors,
          newTeachers: importedTeachers,
          newAssignments: importedAssignments,
        });
      } catch (err: any) {
        reject(new Error(`Không thể đọc file Excel: ${err.message}`));
      }
    };

    reader.onerror = () => reject(new Error('Lỗi khi đọc file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Xuất file Excel Bảng Tổng Hợp Giáo Viên Kiêm Nhiệm & Giảm Trừ Định Mức
 */
export async function exportConcurrentDutiesExcel(
  config: SchoolConfig,
  teachers: Teacher[],
  classes: ClassGroup[],
  departments: Department[],
  workloads?: WorkloadStats[]
) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const deptMap = new Map(departments.map(d => [d.id, d.name]));
  const workloadMap = workloads ? new Map(workloads.map(w => [w.teacherId, w])) : new Map();

  const homeroomMap = new Map<string, ClassGroup>();
  classes.forEach(c => {
    if (c.homeroomTeacherId) {
      homeroomMap.set(c.homeroomTeacherId, c);
    }
  });

  const excelRows: any[][] = [];

  // Formal Administrative Header
  excelRows.push([config.subTitle.toUpperCase(), '', '', '', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM']);
  excelRows.push([config.schoolName.toUpperCase(), '', '', '', 'Độc lập - Tự do - Hạnh phúc']);
  excelRows.push([]);
  excelRows.push([
    `BẢNG TỔNG HỢP GIÁO VIÊN KIÊM NHIỆM & GIẢM ĐỊNH MỨC TIẾT DẠY - NĂM HỌC ${config.academicYear}`
  ]);
  excelRows.push([
    `(Căn cứ Thông tư 28/2009/TT-BGDĐT, TT 15/2020/TT-BGDĐT và Thông tư 05/2025/TT-BGDĐT của Bộ GD&ĐT)`
  ]);
  excelRows.push([]);

  // Column Headers
  excelRows.push([
    'STT',
    'Mã GV',
    'Họ và tên giáo viên',
    'Giới tính',
    'Tổ chuyên môn',
    'Điểm trường / Cấp học',
    'Chủ nhiệm lớp (GVCN)',
    'Tiết giảm CN',
    'Chức vụ & Kiêm nhiệm',
    'Tiết giảm kiêm nhiệm',
    'Giảm trừ khác',
    'Tổng số tiết giảm',
    'Định mức chuẩn gốc',
    'Định mức thực tế sau giảm',
    'Số tiết thực dạy',
    'Chênh lệch (+Dư / -Thiếu)',
    'Căn cứ quy định pháp lý',
    'Ghi chú'
  ]);

  let stt = 1;
  teachers.forEach(t => {
    const isHT =
      t.id === 'tch-bgh-1' ||
      t.name === 'Lê Thanh Cường' ||
      t.code === 'Cường.LT (HT)' ||
      (t.role === 'HieuTruong' && t.name === 'Lê Thanh Cường');
    const isPHT =
      !isHT &&
      (t.id === 'tch-bgh-2' ||
        t.id === 'tch-bgh-3' ||
        t.id === 'tch-bgh-4' ||
        ['Nguyễn Minh Trí', 'Phan Thanh Thảo', 'Nguyễn Thanh Tòng'].includes(t.name) ||
        t.code === 'Trí.NM (PHT)' ||
        t.code === 'Thảo.PT (PHT)' ||
        t.code === 'Tòng.NT (PHT)');
    const isLeader = isHT || isPHT;

    const isTPT =
      t.id === 'tch-ls-12' ||
      t.name === 'Nguyễn Thị Lý' ||
      t.role === 'TongPhuTrachDoi' ||
      t.code?.includes('(TPT') ||
      t.duties?.some(d => d.type === 'TongPhuTrachDoi');

    const hrClass = homeroomMap.get(t.id);
    const hrReduction = isLeader ? 0 : hrClass ? (hrClass.level === 'THCS' ? 4 : (config.homeroomReduction || 3)) : 0;

    let dutyReduction = 0;
    const dutyNames: string[] = [];
    if (t.duties && t.duties.length > 0) {
      t.duties.forEach(d => {
        if (d.reductionPeriods > 0) {
          dutyNames.push(`${d.name} (-${d.reductionPeriods}t)`);
        } else if (d.type === 'TongPhuTrachDoi' || d.name.includes('Tổng phụ trách')) {
          dutyNames.push(`${d.name} (ĐM 2t/tuần)`);
        } else {
          dutyNames.push(d.name);
        }
        dutyReduction += d.reductionPeriods;
      });
    } else if (t.role && t.role !== 'GVBM' && !isLeader) {
      const presetDuties = getTeacherDutiesList(t);
      presetDuties.forEach(pd => {
        if (pd.reduction > 0) {
          dutyNames.push(`${pd.name} (-${pd.reduction}t)`);
        } else if (pd.shortLabel === 'TPT Đội' || pd.name.includes('Tổng phụ trách')) {
          dutyNames.push(`${pd.name} (ĐM 2t/tuần)`);
        } else {
          dutyNames.push(pd.name);
        }
        dutyReduction += pd.reduction;
      });
    }

    const customReduction = isLeader ? 0 : (t.customReductionPeriods || 0);
    const totalReduction = hrReduction + dutyReduction + customReduction;

    const baseStandard = isHT
      ? 2
      : isPHT
      ? 4
      : isTPT
      ? (t.baseStandardPeriods && t.baseStandardPeriods > 0 ? t.baseStandardPeriods : 2)
      : (t.campus === 'THPTDBK' ? 17 : 19);
    const targetPeriods = Math.max(0, baseStandard - totalReduction);

    const workload = workloadMap.get(t.id);
    const assignedPeriods = workload ? workload.assignedPeriods : 0;
    const balance = assignedPeriods - targetPeriods;

    let legalBasis = 'Chuẩn GVBM';
    if (isLeader) {
      legalBasis = 'Định mức BGH (TT 28/2009 & TT 15/2017)';
    } else if (isTPT) {
      legalBasis = 'TPT Đội: ĐM 2t/tuần (TT 28/2009 & TT 05/2025)';
    } else {
      const basisArr: string[] = [];
      if (hrClass) basisArr.push('GVCN: -3t/-4t (TT 28/2009)');
      if (dutyNames.some(d => d.includes('Tổ trưởng') || d.includes('Tổ phó'))) basisArr.push('Tổ CM: -3t/-1t (TT 15/2020)');
      if (dutyNames.some(d => d.includes('Đoàn') || d.includes('Phổ cập'))) basisArr.push('Đoàn/PC: (TT 05/2025)');
      if (dutyNames.some(d => d.includes('Nuôi con'))) basisArr.push('Con nhỏ: (TT 28/2009)');
      if (dutyNames.some(d => d.includes('Công đoàn') || d.includes('Thanh tra') || d.includes('Thư ký'))) basisArr.push('Đoàn thể/HĐ');
      if (basisArr.length > 0) legalBasis = basisArr.join('; ');
    }

    excelRows.push([
      stt++,
      cleanTeacherDisplay(t.code),
      cleanTeacherDisplay(t.name),
      t.gender,
      deptMap.get(t.departmentId) || '',
      t.campus === 'THPTDBK' ? 'THPT Đốc Binh Kiều' : t.campus === 'THCSDBK' ? 'THCS Đốc Binh Kiều' : 'THCS Tân Kiều',
      hrClass ? hrClass.name : '',
      hrReduction > 0 ? hrReduction : '',
      dutyNames.join('; '),
      dutyReduction > 0 ? dutyReduction : '',
      customReduction > 0 ? customReduction : '',
      totalReduction,
      baseStandard,
      targetPeriods,
      assignedPeriods,
      balance >= 0 ? `+${balance}` : `${balance}`,
      legalBasis,
      t.notes || ''
    ]);
  });

  excelRows.push([]);
  excelRows.push([]);
  excelRows.push(['', '', '', '', 'NGƯỜI LẬP BẢNG', '', '', '', '', '', '', 'HIỆU TRƯỞNG']);
  excelRows.push(['', '', '', '', '(Ký và ghi rõ họ tên)', '', '', '', '', '', '', '(Ký tên, đóng dấu)']);
  excelRows.push([]);
  excelRows.push([]);
  excelRows.push([]);
  excelRows.push(['', '', '', '', config.vicePrincipalName || 'Nguyễn Minh Trí', '', '', '', '', '', '', config.principalName || 'Lê Thanh Cường']);

  const ws = XLSX.utils.aoa_to_sheet(excelRows);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 15 }, // Mã GV
    { wch: 25 }, // Họ tên
    { wch: 10 }, // Giới tính
    { wch: 24 }, // Tổ CM
    { wch: 22 }, // Điểm trường
    { wch: 14 }, // Lớp CN
    { wch: 12 }, // Tiết giảm CN
    { wch: 30 }, // Chức vụ
    { wch: 12 }, // Tiết giảm kiêm nhiệm
    { wch: 12 }, // Giảm khác
    { wch: 14 }, // Tổng giảm
    { wch: 14 }, // Chuẩn gốc
    { wch: 16 }, // Sau giảm
    { wch: 14 }, // Thực dạy
    { wch: 14 }, // Chênh lệch
    { wch: 35 }, // Căn cứ
    { wch: 30 }  // Ghi chú
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Danh Sách Kiêm Nhiệm');
  XLSX.writeFile(wb, `Danh_Sach_Kiem_Nhiem_Giam_Tru_${config.academicYear.replace(/\s+/g, '_')}.xlsx`);
}

