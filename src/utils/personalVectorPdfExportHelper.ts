import { jsPDF } from 'jspdf';
import {
  ClassGroup,
  Department,
  SchoolConfig,
  SchoolTimetable,
  Teacher,
  TimetableSlot
} from '../types';
import {
  DAYS_OF_WEEK,
  getUnifiedSubjectName,
  getWeekDateRange
} from './timetableHelper';
import {
  GradeSessionExportMode,
  resolveCleanTeacherName
} from './timetableGradeA4ExportHelper';
import {
  ClassPrintItem,
  buildClassScheduleRows
} from './timetableClassA4ExportHelper';
import {
  HEADER_COLOR_PRESETS,
  HeaderColorPreset,
  HeaderColorPresetId,
  PersonalColorIntensity,
  PersonalPdfTargetType,
  TeacherPrintItem,
  buildClassSubjectSummary,
  buildTeacherScheduleRows,
  getSubjectColorTheme
} from './personalColorfulTimetableHelper';

interface CachedPdfAssets {
  regularFontBase64: string;
  boldFontBase64: string;
  logoDataUrl: string | null;
}

let cachedAssetsPromise: Promise<CachedPdfAssets> | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode.apply(null, Array.from(sub)));
  }
  return btoa(chunks.join(''));
}

async function fetchFontBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Không thể tải font tiếng Việt (${url})`);
  }
  const buf = await res.arrayBuffer();
  return arrayBufferToBase64(buf);
}

async function fetchLogoDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function loadPdfAssets(): Promise<CachedPdfAssets> {
  if (!cachedAssetsPromise) {
    cachedAssetsPromise = Promise.all([
      fetchFontBase64('/fonts/NotoSans-Regular.ttf'),
      fetchFontBase64('/fonts/NotoSans-Bold.ttf'),
      fetchLogoDataUrl('/logo-sm.png')
    ])
      .then(([regularFontBase64, boldFontBase64, logoDataUrl]) => ({
        regularFontBase64,
        boldFontBase64,
        logoDataUrl
      }))
      .catch(err => {
        cachedAssetsPromise = null;
        throw err;
      });
  }
  return cachedAssetsPromise;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map(c => c + c)
          .join('')
      : clean.slice(0, 6);
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [15, 23, 42];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function setFillHex(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setFillColor(r, g, b);
}

function setDrawHex(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setDrawColor(r, g, b);
}

function setTextHex(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setTextColor(r, g, b);
}

function sanitizeFilenameSegment(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export interface ExportPersonalVectorPdfOptions {
  targetType: PersonalPdfTargetType;
  config: SchoolConfig;
  classes: ClassGroup[];
  teachers: Teacher[];
  departments: Department[];
  timetable: SchoolTimetable;
  currentWeek: number;
  teacherItems: TeacherPrintItem[];
  classItems: ClassPrintItem[];
  slotMap: Map<string, TimetableSlot>;
  sessionMode: GradeSessionExportMode;
  colorIntensity: PersonalColorIntensity;
  headerColorPreset: HeaderColorPresetId;
  fontSize: 'sm' | 'md' | 'lg';
  showSecondaryDetail: boolean;
  showSummaryLegend: boolean;
  locationName: string;
  creatorName?: string;
}

export interface ExportPersonalVectorPdfResult {
  fileName: string;
  pageCount: number;
  approxKb: number;
}

function drawBannerHeader(
  doc: jsPDF,
  opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    preset: HeaderColorPreset;
    logoDataUrl: string | null;
    schoolName: string;
    title: string;
    subtitle: string;
    weekNumber: number;
    dateRangeText: string;
    academicYear: string;
  }
): void {
  const {
    x,
    y,
    w,
    h,
    preset,
    logoDataUrl,
    schoolName,
    title,
    subtitle,
    weekNumber,
    dateRangeText,
    academicYear
  } = opts;

  setFillHex(doc, preset.bannerBg);
  setDrawHex(doc, preset.bannerBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  // School Emblem (single cached image alias across entire multi-page PDF)
  const circleCx = x + 9;
  const circleCy = y + h / 2;
  doc.setFillColor(255, 255, 255);
  doc.circle(circleCx, circleCy, 5.6, 'F');
  if (logoDataUrl) {
    doc.addImage(
      logoDataUrl,
      'PNG',
      circleCx - 4.7,
      circleCy - 4.7,
      9.4,
      9.4,
      'school-logo',
      'FAST'
    );
  }

  // Week Badge on right
  const badgeW = 44;
  const badgeH = h - 3.6;
  const badgeX = x + w - badgeW - 3;
  const badgeY = y + 1.8;
  setFillHex(doc, preset.badgeBg);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.6, 1.6, 'F');

  const badgeCx = badgeX + badgeW / 2;
  setTextHex(doc, preset.badgeText);
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(9.5);
  doc.text(`TUẦN ${weekNumber}`, badgeCx, badgeY + 4.8, { align: 'center' });
  doc.setFontSize(7.8);
  doc.text(dateRangeText, badgeCx, badgeY + 8.8, { align: 'center' });
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(6.8);
  doc.text(`Năm học ${academicYear}`, badgeCx, badgeY + 12.2, { align: 'center' });

  // Center-Left Text
  const textX = x + 17.5;
  const maxTextW = badgeX - textX - 4;

  doc.setTextColor(219, 234, 254);
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(7.3);
  doc.text(schoolName.toUpperCase(), textX, y + 4.7, { maxWidth: maxTextW });

  doc.setTextColor(255, 255, 255);
  doc.setFont('NotoSans', 'bold');
  let titleSize = 13;
  doc.setFontSize(titleSize);
  while (doc.getTextWidth(title) > maxTextW && titleSize > 9.5) {
    titleSize -= 0.4;
    doc.setFontSize(titleSize);
  }
  doc.text(title, textX, y + 10.4, { maxWidth: maxTextW });

  doc.setTextColor(224, 231, 255);
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8.1);
  doc.text(subtitle, textX, y + 14.9, { maxWidth: maxTextW });
}

function drawInfoStrip(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  preset: HeaderColorPreset,
  cells: Array<{ label: string; value: string }>
): void {
  setFillHex(doc, preset.infoBarBg);
  setDrawHex(doc, preset.infoBarBorder);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'FD');

  const colW = w / cells.length;
  cells.forEach((cell, idx) => {
    const cx = x + idx * colW;
    if (idx > 0) {
      setDrawHex(doc, '#E2E8F0');
      doc.setLineWidth(0.2);
      doc.line(cx, y + 1.5, cx, y + h - 1.5);
    }

    setTextHex(doc, '#64748B');
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(6.6);
    doc.text(cell.label.toUpperCase(), cx + 3, y + 3.5, {
      maxWidth: colW - 5
    });

    setTextHex(doc, '#0F172A');
    doc.setFont('NotoSans', 'bold');
    let valSize = 8.6;
    doc.setFontSize(valSize);
    while (doc.getTextWidth(cell.value) > colW - 5.5 && valSize > 6.8) {
      valSize -= 0.3;
      doc.setFontSize(valSize);
    }
    doc.text(cell.value, cx + 3, y + 7.7, { maxWidth: colW - 5 });
  });
}

function drawCompactSummaryBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  label: string,
  bodyText: string
): number {
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(7.6);
  const fullText = `${label} ${bodyText}`;
  const lines = doc.splitTextToSize(fullText, w - 5) as string[];
  const shownLines = lines.slice(0, 2);
  const boxH = Math.max(6.8, shownLines.length * 3.5 + 2.8);

  setFillHex(doc, '#F8FAFC');
  setDrawHex(doc, '#CBD5E1');
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, boxH, 1.4, 1.4, 'FD');

  setTextHex(doc, '#334155');
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(7.6);
  shownLines.forEach((line, i) => {
    doc.text(line, x + 2.5, y + 3.9 + i * 3.5);
  });

  return boxH;
}

function drawSignatureFooter(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  wishText: string,
  dateString: string,
  creatorName: string,
  compact: boolean
): void {
  const sigW = 68;
  const sigCenterX = x + w - sigW / 2;

  // Left subtle encouragement note aligned neatly with top of signature block
  setTextHex(doc, '#475569');
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(7.8);
  doc.text(wishText, x, y + 4.2, { maxWidth: w - sigW - 8 });

  // Formal Administrative Signature Block on right (matching Grade Timetable PDF)
  setTextHex(doc, '#0F172A');
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(compact ? 7.6 : 8.1);
  doc.text(dateString, sigCenterX, y + 3.5, { align: 'center' });

  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(compact ? 7.8 : 8.2);
  doc.text('KT. HIỆU TRƯỞNG', sigCenterX, y + (compact ? 7.1 : 7.4), { align: 'center' });

  doc.setFontSize(compact ? 8.1 : 8.6);
  doc.text('PHÓ HIỆU TRƯỞNG', sigCenterX, y + (compact ? 10.6 : 11.2), { align: 'center' });

  setTextHex(doc, '#475569');
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(compact ? 6.8 : 7.2);
  doc.text('(Ký và ghi rõ họ tên)', sigCenterX, y + (compact ? 13.7 : 14.6), { align: 'center' });

  setTextHex(doc, '#0F172A');
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(compact ? 8.3 : 8.8);
  doc.text(creatorName || 'Nguyễn Minh Trí', sigCenterX, y + (compact ? 20.5 : 23.5), {
    align: 'center'
  });
}

export async function exportPersonalVectorPdf(
  options: ExportPersonalVectorPdfOptions
): Promise<ExportPersonalVectorPdfResult> {
  const {
    targetType,
    config,
    classes,
    teachers,
    currentWeek,
    teacherItems,
    classItems,
    slotMap,
    sessionMode,
    colorIntensity,
    headerColorPreset,
    fontSize,
    showSecondaryDetail,
    showSummaryLegend,
    locationName,
    creatorName = 'Nguyễn Minh Trí'
  } = options;

  const itemsCount = targetType === 'TEACHER' ? teacherItems.length : classItems.length;
  if (itemsCount === 0) {
    throw new Error('Không có dữ liệu phù hợp để xuất PDF.');
  }

  const assets = await loadPdfAssets();
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true
  });

  doc.addFileToVFS('NotoSans-Regular.ttf', assets.regularFontBase64);
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.addFileToVFS('NotoSans-Bold.ttf', assets.boldFontBase64);
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
  doc.setFont('NotoSans', 'normal');

  const preset = HEADER_COLOR_PRESETS[headerColorPreset] || HEADER_COLOR_PRESETS.BLUE;
  const weekInfo = getWeekDateRange(currentWeek, config.academicYear);
  const dateRangeText = `${weekInfo.startDateShort} – ${weekInfo.endDateShort}`;
  const today = new Date();
  const dateString = `${locationName}, ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;
  const schoolName = config.schoolName || 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU';

  const teacherMap = new Map(teachers.map(t => [t.id, t]));
  const classMap = new Map(classes.map(c => [c.id, c]));

  // A4 Landscape: 297 x 210 mm
  const marginX = 8;
  const pageW = 297;
  const pageMaxY = 203.5;
  const usableW = pageW - marginX * 2; // 281mm
  const colSessionW = 13.5;
  const colPeriodW = 12.5;
  const colDayW = (usableW - colSessionW - colPeriodW) / 6; // 42.5mm per Day!

  const baseScaleFont = fontSize === 'sm' ? -0.6 : fontSize === 'lg' ? 0.6 : 0;

  if (targetType === 'TEACHER') {
    teacherItems.forEach((item, pageIdx) => {
      if (pageIdx > 0) {
        doc.addPage('a4', 'landscape');
      }

      const t = item.teacher;
      const rows = buildTeacherScheduleRows(item, sessionMode);

      let cursorY = 6.5;
      drawBannerHeader(doc, {
        x: marginX,
        y: cursorY,
        w: usableW,
        h: 17,
        preset,
        logoDataUrl: assets.logoDataUrl,
        schoolName,
        title: `THỜI KHÓA BIỂU GIÁO VIÊN: ${item.cleanName.toUpperCase()}`,
        subtitle: `${item.departmentName} · ${item.campusName}`,
        weekNumber: currentWeek,
        dateRangeText,
        academicYear: config.academicYear || '2026 - 2027'
      });
      cursorY += 19;

      drawInfoStrip(doc, marginX, cursorY, usableW, 9.5, preset, [
        { label: 'Họ tên giáo viên & Định mức', value: `${item.cleanName} · ${t.baseStandardPeriods}t/tuần` },
        { label: 'Tiết giảng dạy TKB', value: `${item.totalPeriods} tiết (${item.sessionCount} buổi)` },
        { label: 'TB tiết / buổi', value: `${item.avgPerSession} tiết/buổi` },
        {
          label: item.homeroomClassName ? 'Chủ nhiệm & Ngày nghỉ' : 'Ngày nghỉ trọn',
          value: `${item.homeroomClassName ? `CN ${item.homeroomClassName} · ` : ''}${
            item.freeDays.length > 0 ? item.freeDays.join(', ') : 'Dạy 6 ngày'
          }`
        }
      ]);
      cursorY += 11.5;

      let summaryText = '';
      let estimatedSummaryH = 0;
      if (showSummaryLegend && item.classBreakdown.length > 0) {
        summaryText = item.classBreakdown
          .map(b => `${b.className} (${b.subjectName}: ${b.count}t)`)
          .join(' · ');
        doc.setFont('NotoSans', 'normal');
        doc.setFontSize(7.6);
        const lines = doc.splitTextToSize(`Phân bố dạy: ${summaryText}`, usableW - 5) as string[];
        estimatedSummaryH = Math.max(6.8, Math.min(2, lines.length) * 3.5 + 2.8) + 2.5;
      }

      const gridTopY = cursorY;
      const theadH = 7.6;
      const tbodyTopY = gridTopY + theadH;
      const fullSigH = 25;
      const compactSigH = 22;

      const comfortableRowH = rows.length <= 5 ? 19.5 : rows.length <= 7 ? 15.8 : 13.5;
      const maxRowHForFullSig =
        (pageMaxY - fullSigH - estimatedSummaryH - 4 - tbodyTopY) / Math.max(1, rows.length);
      const maxRowHForCompactSig =
        (pageMaxY - compactSigH - estimatedSummaryH - 3 - tbodyTopY) / Math.max(1, rows.length);

      let rowH = Math.min(comfortableRowH, maxRowHForFullSig);
      let useCompactSig = false;
      if (rowH < 11.4) {
        rowH = Math.max(10.8, Math.min(comfortableRowH, maxRowHForCompactSig));
        useCompactSig = true;
      }

      // Draw Table Header
      setFillHex(doc, preset.tableHeaderBg);
      doc.rect(marginX, gridTopY, usableW, theadH, 'F');
      setDrawHex(doc, '#CBD5E1');
      doc.setLineWidth(0.25);
      doc.rect(marginX, gridTopY, usableW, theadH, 'S');

      doc.setTextColor(255, 255, 255);
      doc.setFont('NotoSans', 'bold');
      doc.setFontSize(7.8);
      const headerCenterY = gridTopY + theadH / 2 + 1.1;
      doc.text('BUỔI', marginX + colSessionW / 2, headerCenterY, { align: 'center' });
      doc.text('TIẾT', marginX + colSessionW + colPeriodW / 2, headerCenterY, { align: 'center' });

      setDrawHex(doc, '#93C5FD');
      doc.setLineWidth(0.2);
      doc.line(marginX + colSessionW, gridTopY, marginX + colSessionW, gridTopY + theadH);
      doc.line(
        marginX + colSessionW + colPeriodW,
        gridTopY,
        marginX + colSessionW + colPeriodW,
        gridTopY + theadH
      );

      DAYS_OF_WEEK.forEach((d, dIdx) => {
        const dx = marginX + colSessionW + colPeriodW + dIdx * colDayW;
        if (dIdx > 0) {
          doc.line(dx, gridTopY, dx, gridTopY + theadH);
        }
        doc.text(d.label.toUpperCase(), dx + colDayW / 2, headerCenterY, {
          align: 'center'
        });
      });

      // Draw Rows
      rows.forEach((rowMeta, rIdx) => {
        const ry = tbodyTopY + rIdx * rowH;

        if (rowMeta.showSessionCell) {
          const spanH = rowMeta.sessionRowSpan * rowH;
          const sessBg =
            colorIntensity === 'MINIMAL'
              ? '#F8FAFC'
              : rowMeta.session === 'SANG'
              ? '#FFFBEB'
              : '#EEF2FF';
          const sessColor =
            colorIntensity === 'MINIMAL'
              ? '#334155'
              : rowMeta.session === 'SANG'
              ? '#B45309'
              : '#3730A3';

          setFillHex(doc, sessBg);
          setDrawHex(doc, '#CBD5E1');
          doc.setLineWidth(0.22);
          doc.rect(marginX, ry, colSessionW, spanH, 'FD');

          setTextHex(doc, sessColor);
          doc.setFont('NotoSans', 'bold');
          doc.setFontSize(8.2);
          doc.text(rowMeta.sessionLabel.toUpperCase(), marginX + colSessionW / 2, ry + spanH / 2 + 1.1, {
            align: 'center'
          });
        }

        const px = marginX + colSessionW;
        setFillHex(doc, '#F8FAFC');
        setDrawHex(doc, '#CBD5E1');
        doc.setLineWidth(0.2);
        doc.rect(px, ry, colPeriodW, rowH, 'FD');
        setTextHex(doc, '#334155');
        doc.setFont('NotoSans', 'bold');
        doc.setFontSize(8);
        doc.text(`Tiết ${rowMeta.period}`, px + colPeriodW / 2, ry + rowH / 2 + 1.1, {
          align: 'center'
        });

        DAYS_OF_WEEK.forEach((day, dIdx) => {
          const dx = marginX + colSessionW + colPeriodW + dIdx * colDayW;
          const daySlots =
            item.slotByDaySessionPeriod.get(`${day.value}_${rowMeta.session}_${rowMeta.period}`) || [];

          if (daySlots.length === 0) {
            setFillHex(doc, '#FFFFFF');
            setDrawHex(doc, '#E2E8F0');
            doc.setLineWidth(0.2);
            doc.rect(dx, ry, colDayW, rowH, 'FD');
            return;
          }

          const isCollision = daySlots.length > 1;
          const primarySlot = daySlots[0];
          const subName = getUnifiedSubjectName(primarySlot);
          const clsName = classMap.get(primarySlot.classId)?.name || primarySlot.className;
          const subTheme = getSubjectColorTheme(primarySlot.subjectId, subName);
          const classTheme =
            item.classBreakdown.find(b => b.className === clsName)?.theme || subTheme;

          const cellBg = isCollision
            ? '#FFE4E6'
            : colorIntensity === 'SOFT'
            ? classTheme.bg
            : '#FFFFFF';

          setFillHex(doc, cellBg);
          setDrawHex(doc, '#CBD5E1');
          doc.setLineWidth(0.2);
          doc.rect(dx, ry, colDayW, rowH, 'FD');

          if (colorIntensity === 'ACCENT' && !isCollision) {
            setFillHex(doc, classTheme.accent);
            doc.rect(dx + 0.25, ry + 0.25, 1.2, rowH - 0.5, 'F');
          }

          if (isCollision) {
            const label = daySlots
              .map(s => classMap.get(s.classId)?.name || s.className)
              .join(' / ');
            setTextHex(doc, '#BE123C');
            doc.setFont('NotoSans', 'bold');
            doc.setFontSize(8.2);
            doc.text(label, dx + colDayW / 2, ry + rowH / 2, {
              align: 'center',
              maxWidth: colDayW - 3
            });
            doc.setFontSize(6.6);
            doc.text(`Trùng ${daySlots.length} lớp`, dx + colDayW / 2, ry + rowH / 2 + 3.8, {
              align: 'center'
            });
          } else {
            const titleColor =
              colorIntensity === 'SOFT' ? classTheme.titleColor : '#0F172A';
            const titleFs = (rows.length <= 7 ? 9.6 : 8.5) + baseScaleFont;
            const subFs = (rows.length <= 7 ? 7.7 : 6.9) + baseScaleFont;

            if (showSecondaryDetail) {
              doc.setFont('NotoSans', 'normal');
              doc.setFontSize(subFs);
              const subLines = (doc.splitTextToSize(subName, colDayW - 4) as string[]).slice(0, 2);
              const blockH = 3.8 + subLines.length * (subFs * 0.39);
              const startTextY = ry + (rowH - blockH) / 2 + 2.6;

              doc.setFont('NotoSans', 'bold');
              doc.setFontSize(titleFs);
              setTextHex(doc, titleColor);
              doc.text(clsName, dx + colDayW / 2, startTextY, {
                align: 'center',
                maxWidth: colDayW - 3
              });

              doc.setFont('NotoSans', 'normal');
              doc.setFontSize(subFs);
              setTextHex(doc, '#475569');
              subLines.forEach((line, lIdx) => {
                doc.text(line, dx + colDayW / 2, startTextY + 3.7 + lIdx * (subFs * 0.39), {
                  align: 'center'
                });
              });
            } else {
              doc.setFont('NotoSans', 'bold');
              doc.setFontSize(titleFs);
              setTextHex(doc, titleColor);
              doc.text(clsName, dx + colDayW / 2, ry + rowH / 2 + 1.2, {
                align: 'center',
                maxWidth: colDayW - 3
              });
            }
          }
        });

        if (rowMeta.isLastRowOfSession) {
          const bottomY = ry + rowH;
          setDrawHex(doc, '#94A3B8');
          doc.setLineWidth(0.45);
          doc.line(marginX, bottomY, marginX + usableW, bottomY);
        }
      });

      // Natural flow right below grid/summary when there is spare room; pushed cleanly down if tight
      let afterGridY = tbodyTopY + rows.length * rowH;
      if (showSummaryLegend && summaryText) {
        const boxH = drawCompactSummaryBox(
          doc,
          marginX,
          afterGridY + 2.5,
          usableW,
          'Phân bố dạy:',
          summaryText
        );
        afterGridY = afterGridY + 2.5 + boxH;
      }

      const sigNeededH = useCompactSig ? compactSigH : fullSigH;
      const sigY = Math.min(afterGridY + 3.5, pageMaxY - sigNeededH);

      drawSignatureFooter(
        doc,
        marginX,
        sigY,
        usableW,
        'Kính chúc Quý Thầy/Cô một tuần giảng dạy nhiều sức khỏe, niềm vui và hiệu quả!',
        dateString,
        creatorName,
        useCompactSig
      );
    });

    const singleName =
      teacherItems.length === 1
        ? `_${sanitizeFilenameSegment(teacherItems[0].cleanName)}`
        : `_${teacherItems.length}_GV`;
    const fileName = `TKB_Tuan_${currentWeek}_GiaoVien${singleName}_A4Ngang.pdf`;
    const outBuffer = doc.output('arraybuffer');
    doc.save(fileName);
    return {
      fileName,
      pageCount: teacherItems.length,
      approxKb: Math.max(1, Math.round(outBuffer.byteLength / 1024))
    };
  }

  /* ===================== CLASS VECTOR PDF (A4 LANDSCAPE) ===================== */
  classItems.forEach((item, pageIdx) => {
    if (pageIdx > 0) {
      doc.addPage('a4', 'landscape');
    }

    const cls = item.classGroup;
    const rows = buildClassScheduleRows(item, slotMap, sessionMode);
    const summary = buildClassSubjectSummary(cls, slotMap);

    let cursorY = 6.5;
    drawBannerHeader(doc, {
      x: marginX,
      y: cursorY,
      w: usableW,
      h: 17,
      preset,
      logoDataUrl: assets.logoDataUrl,
      schoolName,
      title: `THỜI KHÓA BIỂU LỚP ${cls.name} (KHỐI ${cls.grade})`,
      subtitle: `${item.campusName}`,
      weekNumber: currentWeek,
      dateRangeText,
      academicYear: config.academicYear || '2026 - 2027'
    });
    cursorY += 19;

    drawInfoStrip(doc, marginX, cursorY, usableW, 9.5, preset, [
      { label: 'Giáo viên chủ nhiệm', value: item.homeroomName },
      {
        label: 'Ca học chính',
        value: `Buổi ${item.primarySession === 'SANG' ? 'Sáng' : 'Chiều'} (${item.campusShort})`
      },
      { label: 'Tổng số tiết tuần', value: `${summary.totalPeriods} tiết / tuần` },
      { label: 'Ngày bắt đầu áp dụng', value: `Thứ Hai, ${weekInfo.startDateShort}` }
    ]);
    cursorY += 11.5;

    let summaryText = '';
    let estimatedSummaryH = 0;
    if (showSummaryLegend && summary.chips.length > 0) {
      summaryText = summary.chips.map(c => `${c.subjectName} (${c.count}t)`).join(' · ');
      doc.setFont('NotoSans', 'normal');
      doc.setFontSize(7.6);
      const lines = doc.splitTextToSize(
        `Phân bố môn (${summary.totalPeriods}t): ${summaryText}`,
        usableW - 5
      ) as string[];
      estimatedSummaryH = Math.max(6.8, Math.min(2, lines.length) * 3.5 + 2.8) + 2.5;
    }

    const gridTopY = cursorY;
    const theadH = 7.6;
    const tbodyTopY = gridTopY + theadH;
    const fullSigH = 25;
    const compactSigH = 22;

    const comfortableRowH = rows.length <= 5 ? 19.5 : rows.length <= 7 ? 15.8 : 13.5;
    const maxRowHForFullSig =
      (pageMaxY - fullSigH - estimatedSummaryH - 4 - tbodyTopY) / Math.max(1, rows.length);
    const maxRowHForCompactSig =
      (pageMaxY - compactSigH - estimatedSummaryH - 3 - tbodyTopY) / Math.max(1, rows.length);

    let rowH = Math.min(comfortableRowH, maxRowHForFullSig);
    let useCompactSig = false;
    if (rowH < 11.4) {
      rowH = Math.max(10.8, Math.min(comfortableRowH, maxRowHForCompactSig));
      useCompactSig = true;
    }

    // Header
    setFillHex(doc, preset.tableHeaderBg);
    doc.rect(marginX, gridTopY, usableW, theadH, 'F');
    setDrawHex(doc, '#CBD5E1');
    doc.setLineWidth(0.25);
    doc.rect(marginX, gridTopY, usableW, theadH, 'S');

    doc.setTextColor(255, 255, 255);
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(7.8);
    const headerCenterY = gridTopY + theadH / 2 + 1.1;
    doc.text('BUỔI', marginX + colSessionW / 2, headerCenterY, { align: 'center' });
    doc.text('TIẾT', marginX + colSessionW + colPeriodW / 2, headerCenterY, { align: 'center' });

    setDrawHex(doc, '#93C5FD');
    doc.setLineWidth(0.2);
    doc.line(marginX + colSessionW, gridTopY, marginX + colSessionW, gridTopY + theadH);
    doc.line(
      marginX + colSessionW + colPeriodW,
      gridTopY,
      marginX + colSessionW + colPeriodW,
      gridTopY + theadH
    );

    DAYS_OF_WEEK.forEach((d, dIdx) => {
      const dx = marginX + colSessionW + colPeriodW + dIdx * colDayW;
      if (dIdx > 0) {
        doc.line(dx, gridTopY, dx, gridTopY + theadH);
      }
      doc.text(d.label.toUpperCase(), dx + colDayW / 2, headerCenterY, {
        align: 'center'
      });
    });

    // Rows
    rows.forEach((rowMeta, rIdx) => {
      const ry = tbodyTopY + rIdx * rowH;

      if (rowMeta.showSessionCell) {
        const spanH = rowMeta.sessionRowSpan * rowH;
        const sessBg =
          colorIntensity === 'MINIMAL'
            ? '#F8FAFC'
            : rowMeta.session === 'SANG'
            ? '#FFFBEB'
            : '#EEF2FF';
        const sessColor =
          colorIntensity === 'MINIMAL'
            ? '#334155'
            : rowMeta.session === 'SANG'
            ? '#B45309'
            : '#3730A3';

        setFillHex(doc, sessBg);
        setDrawHex(doc, '#CBD5E1');
        doc.setLineWidth(0.22);
        doc.rect(marginX, ry, colSessionW, spanH, 'FD');

        setTextHex(doc, sessColor);
        doc.setFont('NotoSans', 'bold');
        doc.setFontSize(8.2);
        doc.text(rowMeta.sessionLabel.toUpperCase(), marginX + colSessionW / 2, ry + spanH / 2 + 1.1, {
          align: 'center'
        });
      }

      const px = marginX + colSessionW;
      setFillHex(doc, '#F8FAFC');
      setDrawHex(doc, '#CBD5E1');
      doc.setLineWidth(0.2);
      doc.rect(px, ry, colPeriodW, rowH, 'FD');
      setTextHex(doc, '#334155');
      doc.setFont('NotoSans', 'bold');
      doc.setFontSize(8);
      doc.text(`Tiết ${rowMeta.period}`, px + colPeriodW / 2, ry + rowH / 2 + 1.1, {
        align: 'center'
      });

      DAYS_OF_WEEK.forEach((day, dIdx) => {
        const dx = marginX + colSessionW + colPeriodW + dIdx * colDayW;
        const slot =
          slotMap.get(`${cls.id}_${day.value}_${rowMeta.session}_${rowMeta.period}`) ||
          slotMap.get(`${cls.name}_${day.value}_${rowMeta.session}_${rowMeta.period}`);

        if (!slot || !slot.subjectName) {
          setFillHex(doc, '#FFFFFF');
          setDrawHex(doc, '#E2E8F0');
          doc.setLineWidth(0.2);
          doc.rect(dx, ry, colDayW, rowH, 'FD');
          return;
        }

        const subjectName = getUnifiedSubjectName(slot);
        const teacherName = showSecondaryDetail
          ? resolveCleanTeacherName(slot, teacherMap, teachers)
          : '';
        const theme = getSubjectColorTheme(slot.subjectId, subjectName);

        const cellBg = colorIntensity === 'SOFT' ? theme.bg : '#FFFFFF';
        setFillHex(doc, cellBg);
        setDrawHex(doc, '#CBD5E1');
        doc.setLineWidth(0.2);
        doc.rect(dx, ry, colDayW, rowH, 'FD');

        if (colorIntensity === 'ACCENT') {
          setFillHex(doc, theme.accent);
          doc.rect(dx + 0.25, ry + 0.25, 1.2, rowH - 0.5, 'F');
        }

        const titleColor = colorIntensity === 'SOFT' ? theme.titleColor : '#0F172A';
        const subFs = (rows.length <= 7 ? 8.8 : 7.8) + baseScaleFont;
        const tchFs = (rows.length <= 7 ? 7.6 : 6.8) + baseScaleFont;

        doc.setFont('NotoSans', 'bold');
        doc.setFontSize(subFs);
        const subLines = (doc.splitTextToSize(subjectName, colDayW - 4) as string[]).slice(0, 2);

        if (teacherName) {
          doc.setFont('NotoSans', 'normal');
          doc.setFontSize(tchFs);
          const tchLines = (doc.splitTextToSize(teacherName, colDayW - 4) as string[]).slice(0, 2);
          const totalBlockH =
            subLines.length * (subFs * 0.42) + 1.4 + tchLines.length * (tchFs * 0.4);
          const startTextY = ry + (rowH - totalBlockH) / 2 + subFs * 0.34;

          doc.setFont('NotoSans', 'bold');
          doc.setFontSize(subFs);
          setTextHex(doc, titleColor);
          subLines.forEach((line, lIdx) => {
            doc.text(line, dx + colDayW / 2, startTextY + lIdx * (subFs * 0.42), {
              align: 'center'
            });
          });

          const tchStartY = startTextY + subLines.length * (subFs * 0.42) + 0.7;
          doc.setFont('NotoSans', 'normal');
          doc.setFontSize(tchFs);
          setTextHex(doc, '#475569');
          tchLines.forEach((line, lIdx) => {
            doc.text(line, dx + colDayW / 2, tchStartY + lIdx * (tchFs * 0.4), {
              align: 'center'
            });
          });
        } else {
          const totalBlockH = subLines.length * (subFs * 0.42);
          const startTextY = ry + (rowH - totalBlockH) / 2 + subFs * 0.34;
          setTextHex(doc, titleColor);
          subLines.forEach((line, lIdx) => {
            doc.text(line, dx + colDayW / 2, startTextY + lIdx * (subFs * 0.42), {
              align: 'center'
            });
          });
        }
      });

      if (rowMeta.isLastRowOfSession) {
        const bottomY = ry + rowH;
        setDrawHex(doc, '#94A3B8');
        doc.setLineWidth(0.45);
        doc.line(marginX, bottomY, marginX + usableW, bottomY);
      }
    });

    let afterGridY = tbodyTopY + rows.length * rowH;
    if (showSummaryLegend && summaryText) {
      const boxH = drawCompactSummaryBox(
        doc,
        marginX,
        afterGridY + 2.5,
        usableW,
        `Phân bố môn (${summary.totalPeriods}t):`,
        summaryText
      );
      afterGridY = afterGridY + 2.5 + boxH;
    }

    const sigNeededH = useCompactSig ? compactSigH : fullSigH;
    const sigY = Math.min(afterGridY + 3.5, pageMaxY - sigNeededH);

    drawSignatureFooter(
      doc,
      marginX,
      sigY,
      usableW,
      `Chúc các em học sinh lớp ${cls.name} một tuần học tập vui vẻ, chăm ngoan và tiến bộ!`,
      dateString,
      creatorName,
      useCompactSig
    );
  });

  const singleName =
    classItems.length === 1
      ? `_Lop_${sanitizeFilenameSegment(classItems[0].classGroup.name)}`
      : `_${classItems.length}_Lop`;
  const fileName = `TKB_Tuan_${currentWeek}${singleName}_A4Ngang.pdf`;
  const outBuffer = doc.output('arraybuffer');
  doc.save(fileName);
  return {
    fileName,
    pageCount: classItems.length,
    approxKb: Math.max(1, Math.round(outBuffer.byteLength / 1024))
  };
}
