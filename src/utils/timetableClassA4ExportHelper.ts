import ExcelJS from 'exceljs';
import {
  ClassGroup,
  SchoolConfig,
  SchoolTimetable,
  Teacher,
  TimetableSlot
} from '../types';
import {
  DAYS_OF_WEEK,
  PERIODS,
  getUnifiedSubjectName,
  getWeekDateRange
} from './timetableHelper';
import {
  GradeCampusFilter,
  GradePaperOrientation,
  GradeSessionExportMode,
  buildNormalizedSlotMap,
  resolveCleanTeacherName
} from './timetableGradeA4ExportHelper';
import { OFFICIAL_53_CLASS_META } from '../data/officialGddpAiAssignments';

export interface ClassPrintItem {
  classGroup: ClassGroup;
  campusCode: 'THPT' | 'DBK' | 'TK';
  campusName: string;
  campusShort: string;
  homeroomName: string;
  primarySession: 'SANG' | 'CHIEU';
}

export interface ClassScheduleRowMeta {
  session: 'SANG' | 'CHIEU';
  sessionLabel: string;
  sessionRowSpan: number;
  showSessionCell: boolean;
  period: number;
  isLastRowOfSession: boolean;
}

export interface ExportClassA4ExcelOptions {
  isAdmin: boolean;
  config: SchoolConfig;
  classes: ClassGroup[];
  teachers: Teacher[];
  timetable: SchoolTimetable;
  currentWeek: number;
  campusFilter?: GradeCampusFilter;
  gradeFilter?: string;
  classIdFilter?: string;
  sessionMode?: GradeSessionExportMode;
  orientation?: GradePaperOrientation;
  compactOneLine?: boolean;
  showTeacherName?: boolean;
  creatorName?: string;
  locationName?: string;
}

const OFFICIAL_META_BY_NAME = new Map(
  OFFICIAL_53_CLASS_META.map(m => [m.className.toUpperCase(), m])
);

const CAMPUS_RANK: Record<'THPT' | 'DBK' | 'TK', number> = {
  THPT: 0,
  DBK: 1,
  TK: 2
};

function getCampusTuple(cls: ClassGroup): {
  code: 'THPT' | 'DBK' | 'TK';
  name: string;
  short: string;
} {
  if (cls.campus === 'THCSTK') {
    return {
      code: 'TK',
      name: 'ĐIỂM TRƯỜNG THCS TÂN KIỀU',
      short: 'Điểm Tân Kiều'
    };
  }
  if (cls.level === 'THPT' || cls.campus === 'THPTDBK') {
    return {
      code: 'THPT',
      name: 'ĐIỂM TRƯỜNG CHÍNH (KHỐI THPT)',
      short: 'Điểm chính'
    };
  }
  return {
    code: 'DBK',
    name: 'ĐIỂM TRƯỜNG THCS ĐỐC BINH KIỀU',
    short: 'Điểm Đốc Binh Kiều'
  };
}

/**
 * Determine primary session ('SANG' | 'CHIEU') for an individual class using actual slot counts first,
 * then canonical 53-class metadata, then grade heuristic.
 */
export function resolveClassPrimarySession(
  cls: ClassGroup,
  slotMap: Map<string, TimetableSlot>
): 'SANG' | 'CHIEU' {
  let morningCount = 0;
  let afternoonCount = 0;
  DAYS_OF_WEEK.forEach(d => {
    PERIODS.forEach(p => {
      const sMorning =
        slotMap.get(`${cls.id}_${d.value}_SANG_${p}`) ||
        slotMap.get(`${cls.name}_${d.value}_SANG_${p}`);
      if (sMorning && sMorning.subjectName && sMorning.subjectName.trim()) {
        morningCount++;
      }
      const sAfternoon =
        slotMap.get(`${cls.id}_${d.value}_CHIEU_${p}`) ||
        slotMap.get(`${cls.name}_${d.value}_CHIEU_${p}`);
      if (sAfternoon && sAfternoon.subjectName && sAfternoon.subjectName.trim()) {
        afternoonCount++;
      }
    });
  });

  if (morningCount > afternoonCount) return 'SANG';
  if (afternoonCount > morningCount) return 'CHIEU';

  const meta = OFFICIAL_META_BY_NAME.get(cls.name.toUpperCase());
  if (meta) return meta.session;

  return cls.grade === '6' || cls.grade === '7' ? 'CHIEU' : 'SANG';
}

/**
 * Build canonically ordered list of individual classes (up to all 53 classes).
 */
export function buildClassPrintItems(
  classes: ClassGroup[],
  teachers: Teacher[],
  slotMap: Map<string, TimetableSlot>,
  campusFilter: GradeCampusFilter = 'ALL',
  gradeFilter: string = 'ALL',
  classIdFilter: string = 'ALL'
): ClassPrintItem[] {
  const teacherMap = new Map(teachers.map(t => [t.id, t]));

  const filtered = classes.filter(cls => {
    if (campusFilter === 'THPT' && cls.level !== 'THPT' && cls.campus !== 'THPTDBK') return false;
    if (campusFilter === 'DBK' && (cls.level === 'THPT' || cls.campus === 'THCSTK')) return false;
    if (campusFilter === 'TK' && (cls.level === 'THPT' || cls.campus !== 'THCSTK')) return false;
    if (gradeFilter !== 'ALL' && cls.grade !== gradeFilter) return false;
    if (classIdFilter !== 'ALL' && cls.id !== classIdFilter && cls.name !== classIdFilter) {
      return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const campA = getCampusTuple(a).code;
    const campB = getCampusTuple(b).code;
    if (CAMPUS_RANK[campA] !== CAMPUS_RANK[campB]) {
      return CAMPUS_RANK[campA] - CAMPUS_RANK[campB];
    }
    const gradeA = Number(a.grade) || 0;
    const gradeB = Number(b.grade) || 0;
    if (gradeA !== gradeB) return gradeA - gradeB;
    return a.name.localeCompare(b.name, 'vi', { numeric: true });
  });

  return sorted.map(cls => {
    const campusInfo = getCampusTuple(cls);
    const hr = cls.homeroomTeacherId ? teacherMap.get(cls.homeroomTeacherId) : undefined;
    const homeroomName = hr ? hr.name.replace(/^Thầy\s+|^Cô\s+/i, '').trim() : 'Chưa phân công';
    return {
      classGroup: cls,
      campusCode: campusInfo.code,
      campusName: campusInfo.name,
      campusShort: campusInfo.short,
      homeroomName,
      primarySession: resolveClassPrimarySession(cls, slotMap)
    };
  });
}

/**
 * Compute session/period rows for a single class matrix (Thứ 2..Thứ 7 as columns).
 */
export function buildClassScheduleRows(
  item: ClassPrintItem,
  slotMap: Map<string, TimetableSlot>,
  sessionMode: GradeSessionExportMode = 'SMART_A4'
): ClassScheduleRowMeta[] {
  const cls = item.classGroup;
  const rows: ClassScheduleRowMeta[] = [];

  const hasSlotAt = (sess: 'SANG' | 'CHIEU', period: number): boolean => {
    return DAYS_OF_WEEK.some(d => {
      const s =
        slotMap.get(`${cls.id}_${d.value}_${sess}_${period}`) ||
        slotMap.get(`${cls.name}_${d.value}_${sess}_${period}`);
      return Boolean(s && s.subjectName && s.subjectName.trim());
    });
  };

  const sessions: { session: 'SANG' | 'CHIEU'; periods: number[] }[] = [];
  if (sessionMode === 'SANG') {
    sessions.push({ session: 'SANG', periods: [...PERIODS] });
  } else if (sessionMode === 'CHIEU') {
    sessions.push({ session: 'CHIEU', periods: [...PERIODS] });
  } else if (sessionMode === 'MAIN_ONLY') {
    sessions.push({ session: item.primarySession, periods: [...PERIODS] });
  } else if (sessionMode === 'ALL') {
    sessions.push({ session: 'SANG', periods: [...PERIODS] });
    sessions.push({ session: 'CHIEU', periods: [...PERIODS] });
  } else {
    // SMART_A4: full 5 periods of main session + active periods in opposite session
    const opposite: 'SANG' | 'CHIEU' = item.primarySession === 'SANG' ? 'CHIEU' : 'SANG';
    const oppositePeriods = PERIODS.filter(p => hasSlotAt(opposite, p));
    if (item.primarySession === 'SANG') {
      sessions.push({ session: 'SANG', periods: [...PERIODS] });
      if (oppositePeriods.length > 0) {
        sessions.push({ session: 'CHIEU', periods: oppositePeriods });
      }
    } else {
      if (oppositePeriods.length > 0) {
        sessions.push({ session: 'SANG', periods: oppositePeriods });
      }
      sessions.push({ session: 'CHIEU', periods: [...PERIODS] });
    }
  }

  sessions.forEach(sessGroup => {
    const sessLabel = sessGroup.session === 'SANG' ? 'Sáng' : 'Chiều';
    sessGroup.periods.forEach((p, idx) => {
      rows.push({
        session: sessGroup.session,
        sessionLabel: sessLabel,
        sessionRowSpan: sessGroup.periods.length,
        showSessionCell: idx === 0,
        period: p,
        isLastRowOfSession: idx === sessGroup.periods.length - 1
      });
    });
  });

  return rows;
}

function getExcelColLetter(colIdx: number): string {
  let letter = '';
  let temp = colIdx;
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

/**
 * Generate workbook buffer with 1 formatted A4 Portrait sheet per class (up to 53 classes).
 * Enforces isAdmin check.
 */
export async function buildClassA4WorkbookBuffer(
  options: ExportClassA4ExcelOptions
): Promise<{
  buffer: ArrayBuffer;
  exportedSheetCount: number;
  fileName: string;
}> {
  if (!options.isAdmin) {
    throw new Error('Chỉ tài khoản quản trị mới được phép xuất Thời khóa biểu cho lớp (53 lớp).');
  }

  const {
    config,
    classes,
    teachers,
    timetable,
    currentWeek,
    campusFilter = 'ALL',
    gradeFilter = 'ALL',
    classIdFilter = 'ALL',
    sessionMode = 'SMART_A4',
    orientation = 'portrait',
    compactOneLine = false,
    showTeacherName = true,
    creatorName,
    locationName = 'Đốc Binh Kiều'
  } = options;

  const teacherMap = new Map<string, Teacher>(teachers.map(t => [t.id, t]));
  const { slotMap } = buildNormalizedSlotMap(timetable);
  const classItems = buildClassPrintItems(
    classes,
    teachers,
    slotMap,
    campusFilter,
    gradeFilter,
    classIdFilter
  );

  if (classItems.length === 0) {
    throw new Error('Không có lớp học nào phù hợp với điều kiện lọc để xuất.');
  }

  const weekInfo = getWeekDateRange(currentWeek, config.academicYear);
  const wb = new ExcelJS.Workbook();
  wb.creator = creatorName || config.vicePrincipalName || 'Nguyễn Minh Trí';
  wb.lastModifiedBy = 'Ban Giám hiệu - Trường THCS và THPT Đốc Binh Kiều';
  wb.created = new Date();
  wb.modified = new Date();

  const usedSheetNames = new Set<string>();
  const mediumBoxColor = 'FF0F172A';
  const thinGridColor = 'FF475569';
  const sessionDividerColor = 'FF1E3A8A';
  const totalCols = 2 + DAYS_OF_WEEK.length; // BUỔI + TIẾT + 6 ngày (Thứ 2..Thứ 7) = 8 cols
  const lastColLetter = getExcelColLetter(totalCols); // 'H'

  const getCellBorder = (
    col: number,
    isLastRowOfSession: boolean,
    isVeryLastRow: boolean
  ): Partial<ExcelJS.Borders> => ({
    top: { style: 'thin', color: { argb: thinGridColor } },
    left: {
      style: col === 1 ? 'medium' : 'thin',
      color: { argb: col === 1 ? mediumBoxColor : thinGridColor }
    },
    right: {
      style: col === totalCols ? 'medium' : 'thin',
      color: { argb: col === totalCols ? mediumBoxColor : thinGridColor }
    },
    bottom: {
      style: isLastRowOfSession || isVeryLastRow ? 'medium' : 'thin',
      color: {
        argb: isVeryLastRow
          ? mediumBoxColor
          : isLastRowOfSession
          ? sessionDividerColor
          : thinGridColor
      }
    }
  });

  classItems.forEach(item => {
    const cls = item.classGroup;
    let baseName = cls.name.replace(/[:\\/?*[\]]/g, '_').substring(0, 28);
    let sheetName = baseName;
    let suffix = 2;
    while (usedSheetNames.has(sheetName)) {
      sheetName = `${baseName.substring(0, 25)}_${suffix++}`;
    }
    usedSheetNames.add(sheetName);

    const ws = wb.addWorksheet(sheetName, {
      pageSetup: {
        paperSize: 9, // A4
        orientation,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        horizontalCentered: true,
        verticalCentered: false,
        margins: {
          left: 0.24,
          right: 0.24,
          top: 0.24,
          bottom: 0.24,
          header: 0.1,
          footer: 0.1
        }
      },
      views: [{ showGridLines: false }]
    });

    // 8 balanced columns across A4 Portrait
    ws.getColumn(1).width = 8.5; // BUỔI
    ws.getColumn(2).width = 6.8; // TIẾT
    for (let c = 3; c <= totalCols; c++) {
      ws.getColumn(c).width = orientation === 'portrait' ? 14.8 : 20.5;
    }

    // Row 1: Agency & Motto
    ws.mergeCells('A1:D1');
    const cA1 = ws.getCell('A1');
    cA1.value = (config.subTitle || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP').toUpperCase();
    cA1.font = { name: 'Times New Roman', size: 10, bold: false, color: { argb: 'FF334155' } };
    cA1.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`E1:${lastColLetter}1`);
    const cR1 = ws.getCell('E1');
    cR1.value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
    cR1.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
    cR1.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 18;

    // Row 2: School Name & Independence Motto
    ws.mergeCells('A2:D2');
    const cA2 = ws.getCell('A2');
    cA2.value = (config.schoolName || 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU').toUpperCase();
    cA2.font = { name: 'Times New Roman', size: 10.5, bold: true, underline: true, color: { argb: 'FF1E3A8A' } };
    cA2.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`E2:${lastColLetter}2`);
    const cR2 = ws.getCell('E2');
    cR2.value = 'Độc lập - Tự do - Hạnh phúc';
    cR2.font = { name: 'Times New Roman', size: 10.5, bold: true, underline: true, color: { argb: 'FF0F172A' } };
    cR2.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 19;

    // Row 3: Decorative Title Banner
    ws.mergeCells(`A3:${lastColLetter}3`);
    const cTitle = ws.getCell('A3');
    cTitle.value = `THỜI KHÓA BIỂU LỚP ${cls.name.toUpperCase()} (KHỐI ${cls.grade})`;
    cTitle.font = { name: 'Times New Roman', size: 15, bold: true, color: { argb: 'FF1E3A8A' } };
    cTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    cTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
    for (let col = 1; col <= totalCols; col++) {
      ws.getRow(3).getCell(col).border = {
        top: { style: 'medium', color: { argb: 'FF1E3A8A' } },
        bottom: { style: 'thin', color: { argb: 'FFC7D2FE' } },
        left: col === 1 ? { style: 'medium', color: { argb: 'FF1E3A8A' } } : undefined,
        right: col === totalCols ? { style: 'medium', color: { argb: 'FF1E3A8A' } } : undefined
      };
    }
    ws.getRow(3).height = 28;

    // Row 4: Class Metadata Banner (GVCN, Campus, Week, Year)
    ws.mergeCells(`A4:${lastColLetter}4`);
    const cSub = ws.getCell('A4');
    cSub.value = `GVCN: ${item.homeroomName} • ${item.campusName} • Tuần ${currentWeek} (${weekInfo.startDateShort} – ${weekInfo.endDateShort}) • Năm học ${config.academicYear || '2026 - 2027'}`;
    cSub.font = { name: 'Times New Roman', size: 10, italic: true, bold: true, color: { argb: 'FF1E293B' } };
    cSub.alignment = { horizontal: 'center', vertical: 'middle' };
    cSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    for (let col = 1; col <= totalCols; col++) {
      ws.getRow(4).getCell(col).border = {
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: col === 1 ? { style: 'medium', color: { argb: 'FF1E3A8A' } } : undefined,
        right: col === totalCols ? { style: 'medium', color: { argb: 'FF1E3A8A' } } : undefined
      };
    }
    ws.getRow(4).height = 20;

    // Row 5: Slim spacer
    ws.getRow(5).height = 8;

    // Row 6: Table Header (BUỔI | TIẾT | Thứ 2..Thứ 7)
    const rHeader = ws.getRow(6);
    rHeader.values = ['BUỔI', 'TIẾT', ...DAYS_OF_WEEK.map(d => d.label.toUpperCase())];
    rHeader.height = 26;
    for (let col = 1; col <= totalCols; col++) {
      const cell = rHeader.getCell(col);
      cell.font = {
        name: 'Times New Roman',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: col <= 2 ? 'FF1E293B' : 'FF1E3A8A' }
      };
      cell.border = {
        top: { style: 'medium', color: { argb: mediumBoxColor } },
        left: {
          style: col === 1 ? 'medium' : 'thin',
          color: { argb: col === 1 ? mediumBoxColor : 'FF94A3B8' }
        },
        right: {
          style: col === totalCols ? 'medium' : 'thin',
          color: { argb: col === totalCols ? mediumBoxColor : 'FF94A3B8' }
        },
        bottom: { style: 'medium', color: { argb: mediumBoxColor } }
      };
    }

    // Data rows: scale row height nicely to fill A4 Portrait vertically
    const classRows = buildClassScheduleRows(item, slotMap, sessionMode);
    const totalDataRows = Math.max(1, classRows.length);
    const targetDataPt = orientation === 'portrait' ? 545 : 340;
    const dynamicRowHeight = Math.round((targetDataPt / totalDataRows) * 10) / 10;
    const rowHeight = Math.min(82, Math.max(compactOneLine ? 26 : 38, dynamicRowHeight));

    let currentRowIdx = 7;
    classRows.forEach((rowMeta, rIdx) => {
      const row = ws.getRow(currentRowIdx);
      row.height = rowHeight;
      const isVeryLastRow = rIdx === classRows.length - 1;
      const rowBg = rowMeta.period % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';

      // Col 1: BUỔI
      const cSess = row.getCell(1);
      if (rowMeta.showSessionCell) {
        cSess.value = rowMeta.sessionLabel.toUpperCase();
      }
      cSess.font = {
        name: 'Times New Roman',
        size: 11,
        bold: true,
        color: { argb: rowMeta.session === 'SANG' ? 'FF1E3A8A' : 'FF92400E' }
      };
      cSess.alignment = { horizontal: 'center', vertical: 'middle' };
      cSess.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowMeta.session === 'SANG' ? 'FFE0E7FF' : 'FFFEF3C7' }
      };
      cSess.border = getCellBorder(1, rowMeta.isLastRowOfSession, isVeryLastRow);

      // Col 2: TIẾT
      const cPeriod = row.getCell(2);
      cPeriod.value = `Tiết ${rowMeta.period}`;
      cPeriod.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF1E293B' } };
      cPeriod.alignment = { horizontal: 'center', vertical: 'middle' };
      cPeriod.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cPeriod.border = getCellBorder(2, rowMeta.isLastRowOfSession, isVeryLastRow);

      // Cols 3..8: Days (Thứ 2..Thứ 7)
      DAYS_OF_WEEK.forEach((day, dIdx) => {
        const colIdx = 3 + dIdx;
        const cell = row.getCell(colIdx);
        const slot =
          slotMap.get(`${cls.id}_${day.value}_${rowMeta.session}_${rowMeta.period}`) ||
          slotMap.get(`${cls.name}_${day.value}_${rowMeta.session}_${rowMeta.period}`);

        cell.border = getCellBorder(colIdx, rowMeta.isLastRowOfSession, isVeryLastRow);
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        if (!slot || !slot.subjectName) {
          cell.value = '-';
          cell.font = { name: 'Times New Roman', size: 10, color: { argb: 'FFCBD5E1' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          return;
        }

        const subName = getUnifiedSubjectName(slot);
        const teacherName = showTeacherName
          ? resolveCleanTeacherName(slot, teacherMap, teachers)
          : '';
        const subLower = subName.toLowerCase();
        const isSpecial =
          slot.isSpecialActivity ||
          subLower.includes('chào cờ') ||
          subLower.includes('sinh hoạt');
        const isGddp = subLower.includes('địa phương') || subLower.includes('gdđp');
        const isAi = subLower.includes('trí tuệ');

        const cellBg = isSpecial
          ? 'FFFEF08A'
          : isGddp
          ? 'FFECFEFF'
          : isAi
          ? 'FFF5F3FF'
          : rowBg;

        const subColor = isSpecial
          ? 'FF78350F'
          : isGddp
          ? 'FF0F766E'
          : isAi
          ? 'FF5B21B6'
          : 'FF0F172A';

        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cellBg } };

        const subPt = totalDataRows <= 6 ? 11.5 : 10;
        const tchPt = totalDataRows <= 6 ? 9.5 : 8.5;

        if (!teacherName) {
          cell.value = subName;
          cell.font = {
            name: 'Times New Roman',
            size: subPt,
            bold: true,
            color: { argb: subColor }
          };
        } else if (compactOneLine) {
          cell.value = `${subName} (${teacherName})`;
          cell.font = {
            name: 'Times New Roman',
            size: subPt - 0.5,
            bold: isSpecial,
            color: { argb: subColor }
          };
        } else {
          cell.value = {
            richText: [
              {
                text: `${subName}\n`,
                font: {
                  name: 'Times New Roman',
                  size: subPt,
                  bold: true,
                  color: { argb: subColor }
                }
              },
              {
                text: teacherName,
                font: {
                  name: 'Times New Roman',
                  size: tchPt,
                  italic: true,
                  color: { argb: isSpecial ? 'FF92400E' : 'FF334155' }
                }
              }
            ]
          };
        }
      });

      if (rowMeta.showSessionCell && rowMeta.sessionRowSpan > 1) {
        ws.mergeCells(`A${currentRowIdx}:A${currentRowIdx + rowMeta.sessionRowSpan - 1}`);
      }

      currentRowIdx++;
    });

    // Spacer row before signature
    ws.getRow(currentRowIdx).height = 10;
    currentRowIdx++;

    // Signature block at bottom right (Cols F..H) + notice-board note at bottom left (Cols A..E)
    const now = new Date();
    const rDate = ws.getRow(currentRowIdx++);
    rDate.height = 17;
    ws.mergeCells(`A${rDate.number}:E${rDate.number}`);
    const cNote = ws.getCell(`A${rDate.number}`);
    cNote.value = `Lưu ý: Học sinh thực hiện nghiêm túc TKB Tuần ${currentWeek} (áp dụng từ Thứ Hai, ${weekInfo.startDateShort}).`;
    cNote.font = { name: 'Times New Roman', size: 9, italic: true, color: { argb: 'FF64748B' } };
    cNote.alignment = { horizontal: 'left', vertical: 'middle' };

    ws.mergeCells(`F${rDate.number}:${lastColLetter}${rDate.number}`);
    const cDate = ws.getCell(`F${rDate.number}`);
    cDate.value = `${locationName}, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
    cDate.font = { name: 'Times New Roman', size: 10, italic: true, color: { argb: 'FF0F172A' } };
    cDate.alignment = { horizontal: 'center', vertical: 'middle' };

    const rRole = ws.getRow(currentRowIdx++);
    ws.mergeCells(`F${rRole.number}:${lastColLetter}${rRole.number}`);
    const cRole = ws.getCell(`F${rRole.number}`);
    cRole.value = 'KT. HIỆU TRƯỞNG\nPHÓ HIỆU TRƯỞNG';
    cRole.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
    cRole.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    rRole.height = 30;

    const rSignGap = ws.getRow(currentRowIdx++);
    rSignGap.height = 32;

    const rSigner = ws.getRow(currentRowIdx++);
    rSigner.height = 19;
    ws.mergeCells(`F${rSigner.number}:${lastColLetter}${rSigner.number}`);
    const cSigner = ws.getCell(`F${rSigner.number}`);
    cSigner.value = creatorName || config.vicePrincipalName || 'Nguyễn Minh Trí';
    cSigner.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
    cSigner.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.pageSetup.printArea = `A1:${lastColLetter}${rSigner.number}`;
  });

  const scopeSuffix =
    classIdFilter !== 'ALL' && classItems.length === 1
      ? `Lop_${classItems[0].classGroup.name}`
      : gradeFilter !== 'ALL'
      ? `Cac_Lop_Khoi_${gradeFilter}_${campusFilter}`
      : campusFilter !== 'ALL'
      ? `Cac_Lop_${campusFilter}`
      : `Tat_Ca_${classItems.length}_Lop`;

  const fileName = `TKB_Tuan${currentWeek}_${scopeSuffix}_Chuan_A4.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();

  return {
    buffer,
    exportedSheetCount: classItems.length,
    fileName
  };
}

/**
 * Download A4 print-ready Excel workbook containing 1 sheet per class (up to 53 classes).
 * Strictly Admin-only.
 */
export async function exportTimetableClassesA4Excel(
  options: ExportClassA4ExcelOptions
): Promise<{ exportedSheetCount: number; fileName: string }> {
  const { buffer, exportedSheetCount, fileName } = await buildClassA4WorkbookBuffer(options);
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  return { exportedSheetCount, fileName };
}
