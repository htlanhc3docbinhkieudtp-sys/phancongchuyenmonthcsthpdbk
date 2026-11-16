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
  getWeekDateRange,
  normalizeTimetableSlots
} from './timetableHelper';

export type GradeCampusFilter = 'ALL' | 'THPT' | 'DBK' | 'TK';
export type GradeGroupingMode = 'BY_CAMPUS_GRADE' | 'MERGED_BY_GRADE';
export type GradeSessionExportMode = 'SMART_A4' | 'MAIN_ONLY' | 'SANG' | 'CHIEU' | 'ALL';
export type GradePaperOrientation = 'landscape' | 'portrait';

export interface GradePrintBlock {
  id: string;
  campusCode: 'THPT' | 'DBK' | 'TK' | 'MERGED';
  campusName: string;
  campusShort: string;
  grade: string;
  gradeLabel: string;
  title: string;
  subtitle: string;
  classes: ClassGroup[];
  primarySession: 'SANG' | 'CHIEU';
}

export interface GradeScheduleRowMeta {
  dayValue: number;
  dayLabel: string;
  dayRowSpan: number;
  showDayCell: boolean;
  session: 'SANG' | 'CHIEU';
  sessionLabel: string;
  sessionRowSpan: number;
  showSessionCell: boolean;
  period: number;
  isLastRowOfDay: boolean;
}

export interface ExportGradeA4ExcelOptions {
  isAdmin: boolean;
  config: SchoolConfig;
  classes: ClassGroup[];
  teachers: Teacher[];
  timetable: SchoolTimetable;
  currentWeek: number;
  campusFilter?: GradeCampusFilter;
  gradeFilter?: string;
  groupingMode?: GradeGroupingMode;
  sessionMode?: GradeSessionExportMode;
  orientation?: GradePaperOrientation;
  compactOneLine?: boolean;
  creatorName?: string;
  locationName?: string;
}

/**
 * Resolve clean teacher full name for notice-board display (avoid cryptic codes like Sơn.VV).
 */
export function resolveCleanTeacherName(
  slot: TimetableSlot | undefined,
  teacherMap: Map<string, Teacher>,
  teachers: Teacher[]
): string {
  if (!slot) return '';
  if (slot.teacherId) {
    const found = teacherMap.get(slot.teacherId);
    if (found) return found.name;
  }
  if (slot.teacherName && !slot.teacherName.includes('.')) {
    return slot.teacherName.replace(/^Thầy\s+|^Cô\s+/i, '').trim();
  }
  const searchKey = slot.teacherCode || slot.teacherName || '';
  if (searchKey) {
    const cleanSearch = searchKey.split('.')[0].trim();
    const foundByAlias = teachers.find(
      t =>
        t.name.endsWith(cleanSearch) ||
        t.name.includes(cleanSearch) ||
        t.code.includes(cleanSearch)
    );
    if (foundByAlias) return foundByAlias.name;
  }
  return (slot.teacherName || slot.teacherCode || '').trim();
}

/**
 * Build indexed lookup map from normalized timetable slots.
 */
export function buildNormalizedSlotMap(timetable?: SchoolTimetable): {
  slots: TimetableSlot[];
  slotMap: Map<string, TimetableSlot>;
} {
  const slots = normalizeTimetableSlots(timetable?.slots || []);
  const slotMap = new Map<string, TimetableSlot>();
  slots.forEach(s => {
    slotMap.set(`${s.classId}_${s.dayOfWeek}_${s.session}_${s.period}`, s);
    slotMap.set(`${s.className}_${s.dayOfWeek}_${s.session}_${s.period}`, s);
  });
  return { slots, slotMap };
}

/**
 * Group classes into Grade A4 blocks matching "BẢNG TỔNG HỢP THỜI KHÓA BIỂU TOÀN TRƯỜNG"
 * or merged by Grade (6-12).
 */
export function buildGradePrintBlocks(
  classes: ClassGroup[],
  campusFilter: GradeCampusFilter = 'ALL',
  gradeFilter: string = 'ALL',
  groupingMode: GradeGroupingMode = 'BY_CAMPUS_GRADE'
): GradePrintBlock[] {
  const filtered = classes.filter(cls => {
    if (campusFilter === 'THPT' && cls.level !== 'THPT' && cls.campus !== 'THPTDBK') return false;
    if (campusFilter === 'DBK' && (cls.level === 'THPT' || cls.campus === 'THCSTK')) return false;
    if (campusFilter === 'TK' && (cls.level === 'THPT' || cls.campus !== 'THCSTK')) return false;
    if (gradeFilter !== 'ALL' && cls.grade !== gradeFilter) return false;
    return true;
  });

  if (filtered.length === 0) return [];

  if (groupingMode === 'MERGED_BY_GRADE') {
    const gradeMap = new Map<string, ClassGroup[]>();
    filtered.forEach(cls => {
      const list = gradeMap.get(cls.grade) || [];
      list.push(cls);
      gradeMap.set(cls.grade, list);
    });

    const canonicalGrades = ['10', '11', '12', '6', '7', '8', '9'];
    const allGrades = [
      ...canonicalGrades.filter(g => gradeMap.has(g)),
      ...Array.from(gradeMap.keys()).filter(g => !canonicalGrades.includes(g))
    ];

    return allGrades.map(g => {
      const list = [...(gradeMap.get(g) || [])].sort((a, b) =>
        a.name.localeCompare(b.name, 'vi', { numeric: true })
      );
      const isAfternoon = g === '6' || g === '7';
      const isTHPT = g === '10' || g === '11' || g === '12';
      const campusSubtitle =
        campusFilter === 'THPT'
          ? 'ĐIỂM TRƯỜNG CHÍNH (KHỐI THPT)'
          : campusFilter === 'DBK'
          ? 'ĐIỂM TRƯỜNG THCS ĐỐC BINH KIỀU'
          : campusFilter === 'TK'
          ? 'ĐIỂM TRƯỜNG THCS TÂN KIỀU'
          : isTHPT
          ? 'ĐIỂM TRƯỜNG CHÍNH (KHỐI THPT)'
          : 'TOÀN TRƯỜNG (ĐIỂM ĐỐC BINH KIỀU & ĐIỂM TÂN KIỀU)';

      return {
        id: `MERGED_K${g}`,
        campusCode: 'MERGED',
        campusName: campusSubtitle,
        campusShort: isTHPT ? 'THPT' : 'Toàn khối',
        grade: g,
        gradeLabel: `KHỐI ${g}`,
        title: `THỜI KHÓA BIỂU KHỐI ${g}`,
        subtitle: campusSubtitle,
        classes: list,
        primarySession: isAfternoon ? 'CHIEU' : 'SANG'
      };
    });
  }

  // Default: BY_CAMPUS_GRADE matching BẢNG TỔNG HỢP THỜI KHÓA BIỂU TOÀN TRƯỜNG
  const getCampusInfo = (campus: 'THPT' | 'DBK' | 'TK') => {
    switch (campus) {
      case 'THPT':
        return {
          code: 'THPT' as const,
          name: 'ĐIỂM TRƯỜNG CHÍNH (KHỐI THPT)',
          short: 'Điểm chính'
        };
      case 'DBK':
        return {
          code: 'DBK' as const,
          name: 'ĐIỂM TRƯỜNG THCS ĐỐC BINH KIỀU',
          short: 'Điểm ĐBK'
        };
      case 'TK':
        return {
          code: 'TK' as const,
          name: 'ĐIỂM TRƯỜNG THCS TÂN KIỀU',
          short: 'Điểm Tân Kiều'
        };
    }
  };

  const groupMap = new Map<string, { campus: 'THPT' | 'DBK' | 'TK'; grade: string; list: ClassGroup[] }>();
  filtered.forEach(c => {
    const campusKey: 'THPT' | 'DBK' | 'TK' =
      c.campus === 'THCSTK' ? 'TK' : c.level === 'THPT' || c.campus === 'THPTDBK' ? 'THPT' : 'DBK';
    const key = `${campusKey}_${c.grade}`;
    const item = groupMap.get(key) || { campus: campusKey, grade: c.grade, list: [] };
    item.list.push(c);
    groupMap.set(key, item);
  });

  const orderedKeys = [
    'THPT_10', 'THPT_11', 'THPT_12',
    'DBK_6', 'DBK_7', 'DBK_8', 'DBK_9',
    'TK_6', 'TK_7', 'TK_8', 'TK_9'
  ];

  const allKeys = [
    ...orderedKeys.filter(k => groupMap.has(k)),
    ...Array.from(groupMap.keys()).filter(k => !orderedKeys.includes(k))
  ];

  const blocks: GradePrintBlock[] = [];
  allKeys.forEach(k => {
    const item = groupMap.get(k);
    if (item && item.list.length > 0) {
      item.list.sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
      const cInfo = getCampusInfo(item.campus);
      const isAfternoon = item.grade === '6' || item.grade === '7';
      blocks.push({
        id: k,
        campusCode: item.campus,
        campusName: cInfo.name,
        campusShort: cInfo.short,
        grade: item.grade,
        gradeLabel: `KHỐI ${item.grade}`,
        title: `THỜI KHÓA BIỂU KHỐI ${item.grade}`,
        subtitle: cInfo.name,
        classes: item.list,
        primarySession: isAfternoon ? 'CHIEU' : 'SANG'
      });
    }
  });

  return blocks;
}

/**
 * Compute day/session/period rows for a GradePrintBlock.
 * In SMART_A4 mode: shows full 5 periods of the main session + ONLY active periods of the opposite session
 * (e.g., GDTC/GDQP), omitting empty opposite-session periods so each grade fits cleanly on 1 A4 page.
 */
export function buildScheduleRowsForBlock(
  block: GradePrintBlock,
  slotMap: Map<string, TimetableSlot>,
  sessionMode: GradeSessionExportMode = 'SMART_A4'
): GradeScheduleRowMeta[] {
  const rows: GradeScheduleRowMeta[] = [];

  const hasSlotAt = (dayVal: number, sess: 'SANG' | 'CHIEU', period: number): boolean => {
    return block.classes.some(c => {
      const s =
        slotMap.get(`${c.id}_${dayVal}_${sess}_${period}`) ||
        slotMap.get(`${c.name}_${dayVal}_${sess}_${period}`);
      return Boolean(s && s.subjectName && s.subjectName.trim());
    });
  };

  DAYS_OF_WEEK.forEach(day => {
    const daySessions: { session: 'SANG' | 'CHIEU'; periods: number[] }[] = [];

    if (sessionMode === 'SANG') {
      daySessions.push({ session: 'SANG', periods: [...PERIODS] });
    } else if (sessionMode === 'CHIEU') {
      daySessions.push({ session: 'CHIEU', periods: [...PERIODS] });
    } else if (sessionMode === 'MAIN_ONLY') {
      daySessions.push({ session: block.primarySession, periods: [...PERIODS] });
    } else if (sessionMode === 'ALL') {
      daySessions.push({ session: 'SANG', periods: [...PERIODS] });
      daySessions.push({ session: 'CHIEU', periods: [...PERIODS] });
    } else {
      // SMART_A4: main session all 5 periods; opposite session only periods with at least 1 lesson
      const oppositeSession: 'SANG' | 'CHIEU' =
        block.primarySession === 'SANG' ? 'CHIEU' : 'SANG';
      const oppositeActivePeriods = PERIODS.filter(p => hasSlotAt(day.value, oppositeSession, p));

      if (block.primarySession === 'SANG') {
        daySessions.push({ session: 'SANG', periods: [...PERIODS] });
        if (oppositeActivePeriods.length > 0) {
          daySessions.push({ session: 'CHIEU', periods: oppositeActivePeriods });
        }
      } else {
        if (oppositeActivePeriods.length > 0) {
          daySessions.push({ session: 'SANG', periods: oppositeActivePeriods });
        }
        daySessions.push({ session: 'CHIEU', periods: [...PERIODS] });
      }
    }

    const totalPeriodsForDay = daySessions.reduce((acc, s) => acc + s.periods.length, 0);
    let dayRowCursor = 0;

    daySessions.forEach(sessGroup => {
      const sessLabel = sessGroup.session === 'SANG' ? 'Sáng' : 'Chiều';
      sessGroup.periods.forEach((p, pIdx) => {
        const isFirstOfDay = dayRowCursor === 0;
        const isFirstOfSession = pIdx === 0;
        const isLastOfDay = dayRowCursor === totalPeriodsForDay - 1;
        rows.push({
          dayValue: day.value,
          dayLabel: day.label,
          dayRowSpan: totalPeriodsForDay,
          showDayCell: isFirstOfDay,
          session: sessGroup.session,
          sessionLabel: sessLabel,
          sessionRowSpan: sessGroup.periods.length,
          showSessionCell: isFirstOfSession,
          period: p,
          isLastRowOfDay: isLastOfDay
        });
        dayRowCursor++;
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
 * Build and download an A4 print-ready Excel workbook organized by Grade
 * matching "BẢNG TỔNG HỢP THỜI KHÓA BIỂU TOÀN TRƯỜNG".
 * Admin-only enforced.
 */
export async function exportTimetableGradeA4Excel(
  options: ExportGradeA4ExcelOptions
): Promise<{ exportedSheetCount: number; fileName: string }> {
  if (!options.isAdmin) {
    throw new Error('Chỉ tài khoản quản trị mới được phép xuất Thời khóa biểu theo khối.');
  }

  const {
    config,
    classes,
    teachers,
    timetable,
    currentWeek,
    campusFilter = 'ALL',
    gradeFilter = 'ALL',
    groupingMode = 'BY_CAMPUS_GRADE',
    sessionMode = 'SMART_A4',
    orientation = 'portrait',
    compactOneLine = false,
    creatorName,
    locationName = 'Đốc Binh Kiều'
  } = options;

  const blocks = buildGradePrintBlocks(classes, campusFilter, gradeFilter, groupingMode);
  if (blocks.length === 0) {
    throw new Error('Không có khối/lớp nào phù hợp để xuất file Excel.');
  }

  const teacherMap = new Map<string, Teacher>(teachers.map(t => [t.id, t]));
  const { slotMap } = buildNormalizedSlotMap(timetable);
  const weekInfo = getWeekDateRange(currentWeek, config.academicYear);

  const wb = new ExcelJS.Workbook();
  wb.creator = creatorName || config.vicePrincipalName || 'Nguyễn Minh Trí';
  wb.lastModifiedBy = 'Ban Giám hiệu - Trường THCS và THPT Đốc Binh Kiều';
  wb.created = new Date();
  wb.modified = new Date();

  const usedSheetNames = new Set<string>();

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF334155' } },
    left: { style: 'thin', color: { argb: 'FF334155' } },
    bottom: { style: 'thin', color: { argb: 'FF334155' } },
    right: { style: 'thin', color: { argb: 'FF334155' } }
  };

  const dayBottomBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF334155' } },
    left: { style: 'thin', color: { argb: 'FF334155' } },
    bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
    right: { style: 'thin', color: { argb: 'FF334155' } }
  };

  blocks.forEach(block => {
    let baseName =
      block.campusCode === 'MERGED'
        ? `Khoi ${block.grade}`
        : `Khoi ${block.grade} (${block.campusCode})`;
    baseName = baseName.replace(/[:\\/?*[\]]/g, '_').substring(0, 28);
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
        fitToHeight: 1, // Strict 1-page A4 tall & wide for immediate notice-board printing
        horizontalCentered: true,
        verticalCentered: false,
        margins: {
          left: 0.24,
          right: 0.24,
          top: 0.26,
          bottom: 0.26,
          header: 0.12,
          footer: 0.12
        }
      },
      views: [{ showGridLines: true }]
    });

    const totalCols = 3 + block.classes.length;
    const lastColLetter = getExcelColLetter(totalCols);
    const leftAgencyEnd = Math.min(Math.max(3, Math.floor(totalCols * 0.44)), totalCols - 1);
    const leftAgencyEndLetter = getExcelColLetter(leftAgencyEnd);
    const rightMottoStartLetter = getExcelColLetter(leftAgencyEnd + 1);

    // Column widths balanced cleanly for A4 Portrait
    const classCount = block.classes.length;
    const classColWidth =
      orientation === 'landscape'
        ? classCount <= 4
          ? 24
          : classCount <= 6
          ? 20
          : classCount <= 8
          ? 16.5
          : 14.5
        : classCount <= 4
        ? 21
        : classCount <= 6
        ? 16
        : classCount <= 8
        ? 13
        : 11;

    ws.getColumn(1).width = 9;   // THỨ
    ws.getColumn(2).width = 6.8; // BUỔI
    ws.getColumn(3).width = 5;   // TIẾT
    for (let i = 4; i <= totalCols; i++) {
      ws.getColumn(i).width = classColWidth;
    }

    // Row 1: Agency & National Motto
    ws.mergeCells(`A1:${leftAgencyEndLetter}1`);
    const cA1 = ws.getCell('A1');
    cA1.value = (config.subTitle || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP').toUpperCase();
    cA1.font = { name: 'Times New Roman', size: 10, bold: false, color: { argb: 'FF1E293B' } };
    cA1.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`${rightMottoStartLetter}1:${lastColLetter}1`);
    const cR1 = ws.getCell(`${rightMottoStartLetter}1`);
    cR1.value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
    cR1.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
    cR1.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 17;

    // Row 2: School Name & Independence Motto
    ws.mergeCells(`A2:${leftAgencyEndLetter}2`);
    const cA2 = ws.getCell('A2');
    cA2.value = (config.schoolName || 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU').toUpperCase();
    cA2.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } };
    cA2.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(`${rightMottoStartLetter}2:${lastColLetter}2`);
    const cR2 = ws.getCell(`${rightMottoStartLetter}2`);
    cR2.value = 'Độc lập - Tự do - Hạnh phúc';
    cR2.font = { name: 'Times New Roman', size: 10.5, bold: true, underline: true, color: { argb: 'FF0F172A' } };
    cR2.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 17;

    // Row 3: Title
    ws.mergeCells(`A3:${lastColLetter}3`);
    const cTitle = ws.getCell('A3');
    cTitle.value = `${block.title.toUpperCase()} — ${block.subtitle.toUpperCase()}`;
    cTitle.font = { name: 'Times New Roman', size: 13, bold: true, color: { argb: 'FF0F172A' } };
    cTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(3).height = 22;

    // Row 4: Week & Date Range
    ws.mergeCells(`A4:${lastColLetter}4`);
    const cSub = ws.getCell('A4');
    cSub.value = `Tuần ${currentWeek} (Từ ngày ${weekInfo.startDateShort} đến ngày ${weekInfo.endDateShort}) • Năm học ${config.academicYear || '2026 - 2027'} • Áp dụng từ Thứ Hai, ${weekInfo.startDateShort}`;
    cSub.font = { name: 'Times New Roman', size: 9.5, italic: true, bold: true, color: { argb: 'FF334155' } };
    cSub.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(4).height = 16;

    // Row 5 & 6: Table Headers (THỨ | BUỔI | TIẾT | Classes + GVCN)
    const headerRow1Values = ['THỨ', 'BUỔI', 'TIẾT', ...block.classes.map(c => c.name)];
    const rHeader1 = ws.getRow(5);
    rHeader1.values = headerRow1Values;
    rHeader1.height = 20;

    const headerRow2Values = [
      '',
      '',
      '',
      ...block.classes.map(c => {
        const homeroom = c.homeroomTeacherId ? teacherMap.get(c.homeroomTeacherId) : undefined;
        return homeroom
          ? `GVCN: ${homeroom.name.replace(/^Thầy\s+|^Cô\s+/i, '')}`
          : '-';
      })
    ];
    const rHeader2 = ws.getRow(6);
    rHeader2.values = headerRow2Values;
    rHeader2.height = 17;

    ws.mergeCells('A5:A6');
    ws.mergeCells('B5:B6');
    ws.mergeCells('C5:C6');

    for (let col = 1; col <= totalCols; col++) {
      const cell1 = rHeader1.getCell(col);
      cell1.font = {
        name: 'Times New Roman',
        size: col <= 3 ? 9.5 : 10.5,
        bold: true,
        color: { argb: col <= 3 ? 'FF0F172A' : 'FF1E1B4B' }
      };
      cell1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell1.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: col <= 3 ? 'FFE2E8F0' : 'FFF1F5F9' }
      };
      cell1.border = thinBorder;

      const cell2 = rHeader2.getCell(col);
      cell2.font = {
        name: 'Times New Roman',
        size: 8.5,
        italic: true,
        bold: col <= 3,
        color: { argb: 'FF334155' }
      };
      cell2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell2.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: col <= 3 ? 'FFE2E8F0' : 'FFF8FAFC' }
      };
      cell2.border = {
        ...thinBorder,
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } }
      };
    }

    // Data Rows
    const scheduleRows = buildScheduleRowsForBlock(block, slotMap, sessionMode);
    const totalDataRows = scheduleRows.length;
    const baseDataRowHeight = compactOneLine
      ? totalDataRows <= 34
        ? 17
        : 15
      : totalDataRows <= 34
      ? 25
      : totalDataRows <= 45
      ? 22
      : 19;

    const subjectFontSize = classCount >= 8 ? 8 : totalDataRows > 45 ? 8.5 : 9;
    const teacherFontSize = classCount >= 8 ? 7 : totalDataRows > 45 ? 7.5 : 8;

    let currentRowIdx = 7;

    scheduleRows.forEach((rowMeta, idx) => {
      const row = ws.getRow(currentRowIdx);
      row.height = baseDataRowHeight;

      const rowFillColor = rowMeta.dayValue % 2 === 1 ? 'FFF8FAFC' : 'FFFFFFFF';

      // Day cell (merged when showDayCell)
      const cDay = row.getCell(1);
      if (rowMeta.showDayCell) {
        cDay.value = rowMeta.dayLabel;
      }
      cDay.font = { name: 'Times New Roman', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      cDay.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cDay.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cDay.border = rowMeta.isLastRowOfDay ? dayBottomBorder : thinBorder;

      // Session cell (merged when showSessionCell)
      const cSess = row.getCell(2);
      if (rowMeta.showSessionCell) {
        cSess.value = rowMeta.sessionLabel;
      }
      cSess.font = {
        name: 'Times New Roman',
        size: 8.5,
        bold: true,
        color: { argb: rowMeta.session === 'SANG' ? 'FF312E81' : 'FF92400E' }
      };
      cSess.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cSess.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowMeta.session === 'SANG' ? 'FFEEF2FF' : 'FFFFFBEB' }
      };
      cSess.border = rowMeta.isLastRowOfDay ? dayBottomBorder : thinBorder;

      // Period cell
      const cPeriod = row.getCell(3);
      cPeriod.value = rowMeta.period;
      cPeriod.font = { name: 'Times New Roman', size: 9, bold: true, color: { argb: 'FF334155' } };
      cPeriod.alignment = { horizontal: 'center', vertical: 'middle' };
      cPeriod.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowFillColor } };
      cPeriod.border = rowMeta.isLastRowOfDay ? dayBottomBorder : thinBorder;

      // Class cells
      block.classes.forEach((cls, clsIdx) => {
        const cell = row.getCell(4 + clsIdx);
        const slot =
          slotMap.get(`${cls.id}_${rowMeta.dayValue}_${rowMeta.session}_${rowMeta.period}`) ||
          slotMap.get(`${cls.name}_${rowMeta.dayValue}_${rowMeta.session}_${rowMeta.period}`);

        cell.border = rowMeta.isLastRowOfDay ? dayBottomBorder : thinBorder;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        if (!slot || !slot.subjectName) {
          cell.value = '-';
          cell.font = { name: 'Times New Roman', size: 8, color: { argb: 'FF94A3B8' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowFillColor } };
          return;
        }

        const subName = getUnifiedSubjectName(slot);
        const teacherName = resolveCleanTeacherName(slot, teacherMap, teachers);
        const isSpecial =
          slot.isSpecialActivity ||
          subName.includes('Chào cờ') ||
          subName.includes('Sinh hoạt');

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isSpecial ? 'FFFEF3C7' : rowFillColor }
        };

        if (compactOneLine) {
          cell.value = teacherName ? `${subName} (${teacherName})` : subName;
          cell.font = {
            name: 'Times New Roman',
            size: subjectFontSize,
            bold: isSpecial,
            color: { argb: 'FF0F172A' }
          };
        } else if (teacherName) {
          cell.value = {
            richText: [
              {
                text: `${subName}\n`,
                font: {
                  name: 'Times New Roman',
                  size: subjectFontSize,
                  bold: true,
                  color: { argb: 'FF0F172A' }
                }
              },
              {
                text: teacherName,
                font: {
                  name: 'Times New Roman',
                  size: teacherFontSize,
                  italic: true,
                  color: { argb: 'FF334155' }
                }
              }
            ]
          };
        } else {
          cell.value = subName;
          cell.font = {
            name: 'Times New Roman',
            size: subjectFontSize,
            bold: true,
            color: { argb: 'FF0F172A' }
          };
        }
      });

      // Perform merges after row creation
      if (rowMeta.showSessionCell && rowMeta.sessionRowSpan > 1) {
        ws.mergeCells(`B${currentRowIdx}:B${currentRowIdx + rowMeta.sessionRowSpan - 1}`);
      }
      if (rowMeta.showDayCell && rowMeta.dayRowSpan > 1) {
        ws.mergeCells(`A${currentRowIdx}:A${currentRowIdx + rowMeta.dayRowSpan - 1}`);
      }

      currentRowIdx++;
    });

    // Blank spacer row
    ws.getRow(currentRowIdx).height = 6;
    currentRowIdx++;

    // Signature block at bottom right
    const sigSpanCols = totalCols >= 6 ? 3 : 2;
    const sigStartCol = Math.max(1, totalCols - sigSpanCols + 1);
    const sigStartLetter = getExcelColLetter(sigStartCol);

    const now = new Date();
    const rDate = ws.getRow(currentRowIdx++);
    rDate.height = 15;
    ws.mergeCells(`${sigStartLetter}${rDate.number}:${lastColLetter}${rDate.number}`);
    const cDate = ws.getCell(`${sigStartLetter}${rDate.number}`);
    cDate.value = `${locationName}, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
    cDate.font = { name: 'Times New Roman', size: 9.5, italic: true, color: { argb: 'FF0F172A' } };
    cDate.alignment = { horizontal: 'center', vertical: 'middle' };

    const rRole = ws.getRow(currentRowIdx++);
    rRole.height = 16;
    ws.mergeCells(`${sigStartLetter}${rRole.number}:${lastColLetter}${rRole.number}`);
    const cRole = ws.getCell(`${sigStartLetter}${rRole.number}`);
    cRole.value = 'KT. HIỆU TRƯỞNG\nPHÓ HIỆU TRƯỞNG';
    cRole.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cRole.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    rRole.height = 28;

    const rSignGap = ws.getRow(currentRowIdx++);
    rSignGap.height = 28;

    const rSigner = ws.getRow(currentRowIdx++);
    rSigner.height = 17;
    ws.mergeCells(`${sigStartLetter}${rSigner.number}:${lastColLetter}${rSigner.number}`);
    const cSigner = ws.getCell(`${sigStartLetter}${rSigner.number}`);
    cSigner.value = creatorName || config.vicePrincipalName || 'Nguyễn Minh Trí';
    cSigner.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
    cSigner.alignment = { horizontal: 'center', vertical: 'middle' };

    // Explicitly define print area up to the signature block
    ws.pageSetup.printArea = `A1:${lastColLetter}${rSigner.number}`;
  });

  const scopeSuffix =
    gradeFilter !== 'ALL'
      ? `Khoi_${gradeFilter}_${campusFilter}`
      : campusFilter !== 'ALL'
      ? `Diem_${campusFilter}`
      : groupingMode === 'MERGED_BY_GRADE'
      ? 'Toan_Truong_Gop_Khoi'
      : 'Theo_Khoi_Diem';
  const fileName = `TKB_Tuan${currentWeek}_${scopeSuffix}_Chuan_A4.xlsx`;

  const buffer = await wb.xlsx.writeBuffer();
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

  return {
    exportedSheetCount: blocks.length,
    fileName
  };
}
