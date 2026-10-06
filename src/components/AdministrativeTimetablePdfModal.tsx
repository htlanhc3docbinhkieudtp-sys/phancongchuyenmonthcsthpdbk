import React, { useState, useMemo, useRef } from 'react';
import {
  SchoolTimetable,
  TimetableSlot,
  ClassGroup,
  Subject,
  Teacher,
  SchoolConfig
} from '../types';
import {
  DAYS_OF_WEEK,
  PERIODS,
  getWeekDateRange,
  getUnifiedSubjectName
} from '../utils/timetableHelper';
import {
  Printer,
  FileSpreadsheet,
  X,
  Building2,
  GraduationCap,
  Calendar,
  CheckCircle2,
  Download,
  Info,
  Maximize2
} from 'lucide-react';
import ExcelJS from 'exceljs';

type CampusFilter = 'ALL' | 'THPT' | 'DBK' | 'TK';
type SessionFilter = 'AUTO' | 'SANG' | 'CHIEU' | 'ALL';

interface AdministrativeTimetablePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SchoolConfig;
  classes: ClassGroup[];
  subjects: Subject[];
  teachers: Teacher[];
  timetable: SchoolTimetable;
  currentWeek: number;
  initialCampus?: CampusFilter;
  initialGrade?: string;
  initialSession?: SessionFilter;
  isAdmin?: boolean;
}

interface GradePrintBlock {
  id: string;
  campusCode: 'THPT' | 'DBK' | 'TK';
  campusName: string;
  grade: string;
  gradeLabel: string;
  title: string;
  subtitle: string;
  classes: ClassGroup[];
  primarySession: 'SANG' | 'CHIEU';
}

export const AdministrativeTimetablePdfModal: React.FC<AdministrativeTimetablePdfModalProps> = ({
  isOpen,
  onClose,
  config,
  classes,
  subjects,
  teachers,
  timetable,
  currentWeek,
  initialCampus = 'ALL',
  initialGrade = 'ALL',
  initialSession = 'AUTO',
  isAdmin = true
}) => {
  const [selectedCampus, setSelectedCampus] = useState<CampusFilter>(initialCampus);
  const [selectedGrade, setSelectedGrade] = useState<string>(initialGrade);
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>(initialSession);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('sm');
  const [paperOrientation, setPaperOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [creatorName, setCreatorName] = useState<string>(config.vicePrincipalName || 'Nguyễn Minh Trí');
  const [locationName, setLocationName] = useState<string>('Tháp Mười');
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  const weekInfo = useMemo(() => {
    return getWeekDateRange(currentWeek, config.academicYear);
  }, [currentWeek, config.academicYear]);

  // Lookup maps
  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);
  const classMap = useMemo(() => new Map(classes.map(c => [c.id, c])), [classes]);

  const activeSlots = useMemo(() => {
    return timetable?.slots || [];
  }, [timetable?.slots]);

  const slotMap = useMemo(() => {
    const map = new Map<string, TimetableSlot>();
    activeSlots.forEach(s => {
      // Index by both classId and className to be resilient
      map.set(`${s.classId}_${s.dayOfWeek}_${s.session}_${s.period}`, s);
      map.set(`${s.className}_${s.dayOfWeek}_${s.session}_${s.period}`, s);
    });
    return map;
  }, [activeSlots]);

  // Clean teacher display name (never showing cryptic codes like Sơn.VV)
  const getTeacherDisplayName = (slot?: TimetableSlot) => {
    if (!slot) return '';
    if (slot.teacherId) {
      const t = teacherMap.get(slot.teacherId);
      if (t) return t.name;
    }
    if (slot.teacherName && slot.teacherName.trim()) {
      return slot.teacherName.replace(/^Thầy\s+|^Cô\s+/i, '');
    }
    return '';
  };

  // Group filtered classes by Campus + Grade
  // Each block will be 1 clean A4 page (vừa vặn 1 tờ A4)
  const printBlocks = useMemo<GradePrintBlock[]>(() => {
    // 1. Filter classes by campus & grade
    const filtered = classes.filter(cls => {
      if (selectedCampus === 'THPT' && cls.level !== 'THPT' && cls.campus !== 'THPTDBK') return false;
      if (selectedCampus === 'DBK' && (cls.level === 'THPT' || cls.campus === 'THCSTK')) return false;
      if (selectedCampus === 'TK' && (cls.level === 'THPT' || cls.campus !== 'THCSTK')) return false;
      if (selectedGrade !== 'ALL' && cls.grade !== selectedGrade) return false;
      return true;
    });

    if (filtered.length === 0) return [];

    const getCampusInfo = (campus: 'THPT' | 'DBK' | 'TK') => {
      switch (campus) {
        case 'THPT':
          return { code: 'THPT' as const, name: 'ĐIỂM TRƯỜNG CHÍNH (KHỐI THPT)' };
        case 'DBK':
          return { code: 'DBK' as const, name: 'ĐIỂM TRƯỜNG THCS ĐỐC BINH KIỀU' };
        case 'TK':
          return { code: 'TK' as const, name: 'ĐIỂM TRƯỜNG THCS TÂN KIỀU' };
      }
    };

    // Group by campus + grade
    const groupMap = new Map<string, { campus: 'THPT' | 'DBK' | 'TK'; grade: string; list: ClassGroup[] }>();
    filtered.forEach(c => {
      const campusKey: 'THPT' | 'DBK' | 'TK' =
        c.campus === 'THCSTK' ? 'TK' : c.level === 'THPT' || c.campus === 'THPTDBK' ? 'THPT' : 'DBK';
      const key = `${campusKey}_${c.grade}`;
      const item = groupMap.get(key) || { campus: campusKey, grade: c.grade, list: [] };
      item.list.push(c);
      groupMap.set(key, item);
    });

    // Define canonical order for blocks:
    // THPT 10, 11, 12 -> DBK 6, 7, 8, 9 -> TK 6, 7, 8, 9
    const blocks: GradePrintBlock[] = [];
    const orderedKeys = [
      'THPT_10', 'THPT_11', 'THPT_12',
      'DBK_6', 'DBK_7', 'DBK_8', 'DBK_9',
      'TK_6', 'TK_7', 'TK_8', 'TK_9'
    ];

    orderedKeys.forEach(k => {
      const item = groupMap.get(k);
      if (item && item.list.length > 0) {
        // Sort classes inside block alphabetically (e.g. 10CB1, 10CB2, 10CB3... or 6A1, 6A2...)
        item.list.sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));

        const cInfo = getCampusInfo(item.campus);
        const isAfternoon = item.grade === '6' || item.grade === '7';
        blocks.push({
          id: k,
          campusCode: item.campus,
          campusName: cInfo.name,
          grade: item.grade,
          gradeLabel: `KHỐI ${item.grade}`,
          title: `THỜI KHÓA BIỂU KHỐI ${item.grade}`,
          subtitle: `${cInfo.name}`,
          classes: item.list,
          primarySession: isAfternoon ? 'CHIEU' : 'SANG'
        });
      }
    });

    return blocks;
  }, [classes, selectedCampus, selectedGrade]);

  // Compute total classes in view
  const totalClassesCount = useMemo(() => {
    return printBlocks.reduce((acc, b) => acc + b.classes.length, 0);
  }, [printBlocks]);

  // Determine sessions to display for a block
  const getBlockSessions = (block: GradePrintBlock): ('SANG' | 'CHIEU')[] => {
    if (sessionFilter === 'SANG') return ['SANG'];
    if (sessionFilter === 'CHIEU') return ['CHIEU'];
    if (sessionFilter === 'ALL') return ['SANG', 'CHIEU'];

    // AUTO mode: Check if classes have slots in both or only primary session
    const hasMorning = block.classes.some(c =>
      [2, 3, 4, 5, 6, 7].some(d =>
        [1, 2, 3, 4, 5].some(p =>
          slotMap.has(`${c.id}_${d}_SANG_${p}`) || slotMap.has(`${c.name}_${d}_SANG_${p}`)
        )
      )
    );
    const hasAfternoon = block.classes.some(c =>
      [2, 3, 4, 5, 6, 7].some(d =>
        [1, 2, 3, 4, 5].some(p =>
          slotMap.has(`${c.id}_${d}_CHIEU_${p}`) || slotMap.has(`${c.name}_${d}_CHIEU_${p}`)
        )
      )
    );

    // If both have slots, show both, otherwise show active/primary session
    if (hasMorning && hasAfternoon) return ['SANG', 'CHIEU'];
    if (hasMorning) return ['SANG'];
    if (hasAfternoon) return ['CHIEU'];
    return [block.primarySession];
  };

  // Browser Print Trigger
  const handlePrint = () => {
    window.print();
  };

  // Administrative Excel Export formatted exactly in the new layout
  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      const wb = new ExcelJS.Workbook();
      wb.creator = creatorName || 'Phó Hiệu trưởng Nguyễn Minh Trí';
      wb.lastModifiedBy = 'Hệ thống Quản lý Thời khóa biểu';
      wb.created = new Date();
      wb.modified = new Date();

      printBlocks.forEach((block) => {
        const sheetName = `${block.gradeLabel} - ${block.campusCode}`.replace(/[:\\/?*[\]]/g, '_').substring(0, 31);
        const ws = wb.addWorksheet(sheetName);

        ws.pageSetup = {
          orientation: paperOrientation,
          paperSize: 9, // A4
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: {
            left: 0.3,
            right: 0.3,
            top: 0.35,
            bottom: 0.35,
            header: 0.2,
            footer: 0.2
          }
        };

        const totalCols = 3 + block.classes.length;
        const lastColLetter = String.fromCharCode(64 + Math.min(totalCols, 26));

        // Row 1: Header Đơn vị + Quốc hiệu (No document number)
        ws.mergeCells('A1:C1');
        ws.getCell('A1').value = config.subTitle || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP';
        ws.getCell('A1').font = { name: 'Times New Roman', size: 10, bold: true };
        ws.getCell('A1').alignment = { horizontal: 'center' };

        ws.mergeCells(`D1:${lastColLetter}1`);
        ws.getCell('D1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
        ws.getCell('D1').font = { name: 'Times New Roman', size: 10, bold: true };
        ws.getCell('D1').alignment = { horizontal: 'center' };

        // Row 2: Tên trường + Tiêu ngữ
        ws.mergeCells('A2:C2');
        ws.getCell('A2').value = config.schoolName || 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU';
        ws.getCell('A2').font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } };
        ws.getCell('A2').alignment = { horizontal: 'center' };

        ws.mergeCells(`D2:${lastColLetter}2`);
        ws.getCell('D2').value = 'Độc lập - Tự do - Hạnh phúc';
        ws.getCell('D2').font = { name: 'Times New Roman', size: 10, bold: true, underline: true };
        ws.getCell('D2').alignment = { horizontal: 'center' };

        // Row 3: Empty
        ws.addRow([]);

        // Row 4: Title
        ws.mergeCells(`A4:${lastColLetter}4`);
        ws.getCell('A4').value = `${block.title.toUpperCase()} - ${block.subtitle.toUpperCase()}`;
        ws.getCell('A4').font = { name: 'Times New Roman', size: 13, bold: true, color: { argb: 'FF0F172A' } };
        ws.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };

        // Row 5: Subtitle
        ws.mergeCells(`A5:${lastColLetter}5`);
        ws.getCell('A5').value = `Tuần ${currentWeek} (${weekInfo.startDateShort} - ${weekInfo.endDateShort}) • Năm học ${config.academicYear || '2026 - 2027'} (Áp dụng từ Thứ Hai, ${weekInfo.startDateShort})`;
        ws.getCell('A5').font = { name: 'Times New Roman', size: 9.5, italic: true, bold: true, color: { argb: 'FF334155' } };
        ws.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };

        // Row 6: Empty
        ws.addRow([]);

        // Row 7: Header row 1 (THỨ, BUỔI, TIẾT, and CLASS NAMES)
        const headerRow1 = ['THỨ', 'BUỔI', 'TIẾT'];
        block.classes.forEach(c => headerRow1.push(c.name));
        const r7 = ws.addRow(headerRow1);
        r7.font = { name: 'Times New Roman', size: 10, bold: true };
        r7.alignment = { horizontal: 'center', vertical: 'middle' };

        // Row 8: Header row 2 (GVCN under class names)
        const headerRow2 = ['', '', ''];
        block.classes.forEach(c => {
          const homeroom = c.homeroomTeacherId ? teacherMap.get(c.homeroomTeacherId) : undefined;
          headerRow2.push(homeroom ? `GVCN: ${homeroom.name.replace(/^Thầy\s+|^Cô\s+/i, '')}` : '-');
        });
        const r8 = ws.addRow(headerRow2);
        r8.font = { name: 'Times New Roman', size: 8.5, italic: true };
        r8.alignment = { horizontal: 'center', vertical: 'middle' };

        // Merge headers for THỨ, BUỔI, TIẾT across rows 7-8
        ws.mergeCells('A7:A8');
        ws.mergeCells('B7:B8');
        ws.mergeCells('C7:C8');

        // Style header cells
        [r7, r8].forEach(row => {
          row.eachCell(cell => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF1F5F9' }
            };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF000000' } },
              left: { style: 'thin', color: { argb: 'FF000000' } },
              bottom: { style: 'thin', color: { argb: 'FF000000' } },
              right: { style: 'thin', color: { argb: 'FF000000' } }
            };
          });
        });

        // Set column widths
        ws.getColumn(1).width = 12; // Thứ
        ws.getColumn(2).width = 10; // Buổi
        ws.getColumn(3).width = 7;  // Tiết
        for (let i = 4; i <= totalCols; i++) {
          ws.getColumn(i).width = 18; // Classes
        }

        // Data rows: Loop through Days -> Sessions -> Periods
        const sessions = getBlockSessions(block);
        let currentRowIndex = 9;

        DAYS_OF_WEEK.forEach(day => {
          const dayStartRow = currentRowIndex;
          const dayTotalRows = sessions.length * 5;

          sessions.forEach(sess => {
            const sessStartRow = currentRowIndex;
            const sessLabel = sess === 'SANG' ? 'Sáng' : 'Chiều';

            PERIODS.forEach(p => {
              const rowData: (string | number)[] = [
                day.label,
                sessLabel,
                p
              ];

              block.classes.forEach(c => {
                const slot = slotMap.get(`${c.id}_${day.value}_${sess}_${p}`) ||
                             slotMap.get(`${c.name}_${day.value}_${sess}_${p}`);
                if (slot && slot.subjectName) {
                  const subName = getUnifiedSubjectName(slot);
                  const tName = getTeacherDisplayName(slot);
                  rowData.push(tName ? `${subName}\n(${tName})` : subName);
                } else {
                  rowData.push('');
                }
              });

              const dataRow = ws.addRow(rowData);
              dataRow.font = { name: 'Times New Roman', size: 9 };
              dataRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

              dataRow.eachCell(cell => {
                cell.border = {
                  top: { style: 'thin', color: { argb: 'FF000000' } },
                  left: { style: 'thin', color: { argb: 'FF000000' } },
                  bottom: { style: 'thin', color: { argb: 'FF000000' } },
                  right: { style: 'thin', color: { argb: 'FF000000' } }
                };
              });

              currentRowIndex++;
            });

            // Merge Session cell across its 5 periods
            if (sessStartRow < currentRowIndex - 1) {
              ws.mergeCells(`B${sessStartRow}:B${currentRowIndex - 1}`);
            }
          });

          // Merge Day cell across all its periods
          if (dayStartRow < currentRowIndex - 1) {
            ws.mergeCells(`A${dayStartRow}:A${currentRowIndex - 1}`);
          }
        });

        // Spacing after table
        ws.addRow([]);
        currentRowIndex++;

        // Signature row: Right-aligned only for Vice Principal Nguyen Minh Tri
        const sigStartColLetter = String.fromCharCode(64 + Math.max(1, totalCols - 2));

        const rDate = ws.addRow([]);
        ws.mergeCells(`${sigStartColLetter}${rDate.number}:${lastColLetter}${rDate.number}`);
        ws.getCell(`${sigStartColLetter}${rDate.number}`).value = `${locationName}, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`;
        ws.getCell(`${sigStartColLetter}${rDate.number}`).font = { name: 'Times New Roman', size: 9.5, italic: true };
        ws.getCell(`${sigStartColLetter}${rDate.number}`).alignment = { horizontal: 'center' };

        const rTitle1 = ws.addRow([]);
        ws.mergeCells(`${sigStartColLetter}${rTitle1.number}:${lastColLetter}${rTitle1.number}`);
        ws.getCell(`${sigStartColLetter}${rTitle1.number}`).value = 'KT. HIỆU TRƯỞNG';
        ws.getCell(`${sigStartColLetter}${rTitle1.number}`).font = { name: 'Times New Roman', size: 10, bold: true };
        ws.getCell(`${sigStartColLetter}${rTitle1.number}`).alignment = { horizontal: 'center' };

        const rTitle2 = ws.addRow([]);
        ws.mergeCells(`${sigStartColLetter}${rTitle2.number}:${lastColLetter}${rTitle2.number}`);
        ws.getCell(`${sigStartColLetter}${rTitle2.number}`).value = 'PHÓ HIỆU TRƯỞNG';
        ws.getCell(`${sigStartColLetter}${rTitle2.number}`).font = { name: 'Times New Roman', size: 10.5, bold: true };
        ws.getCell(`${sigStartColLetter}${rTitle2.number}`).alignment = { horizontal: 'center' };

        const rNote = ws.addRow([]);
        ws.mergeCells(`${sigStartColLetter}${rNote.number}:${lastColLetter}${rNote.number}`);
        ws.getCell(`${sigStartColLetter}${rNote.number}`).value = '(Ký và ghi rõ họ tên)';
        ws.getCell(`${sigStartColLetter}${rNote.number}`).font = { name: 'Times New Roman', size: 8.5, italic: true };
        ws.getCell(`${sigStartColLetter}${rNote.number}`).alignment = { horizontal: 'center' };

        // 3 empty rows for handwritten signature
        ws.addRow([]);
        ws.addRow([]);
        ws.addRow([]);

        const rName = ws.addRow([]);
        ws.mergeCells(`${sigStartColLetter}${rName.number}:${lastColLetter}${rName.number}`);
        ws.getCell(`${sigStartColLetter}${rName.number}`).value = creatorName || 'Nguyễn Minh Trí';
        ws.getCell(`${sigStartColLetter}${rName.number}`).font = { name: 'Times New Roman', size: 11, bold: true };
        ws.getCell(`${sigStartColLetter}${rName.number}`).alignment = { horizontal: 'center' };
      });

      // Generate & save Excel buffer
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `TKB_HanhChinh_Tuan${currentWeek}_${selectedCampus}_${selectedGrade}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting Excel:', err);
      alert('Đã xảy ra lỗi khi xuất file Excel. Vui lòng thử lại!');
    } finally {
      setIsExportingExcel(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:m-0 print:static print:bg-white print:overflow-visible">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-[98vw] max-h-[96vh] flex flex-col overflow-hidden print:max-w-none print:max-h-none print:border-none print:shadow-none print:rounded-none">
        {/* Top Header Bar - Hidden when printing */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3 sm:px-6 flex items-center justify-between shrink-0 border-b border-indigo-900/50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-600/90 rounded-xl shadow-inner text-white">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black tracking-tight uppercase">
                  Xuất PDF & In Thời Khóa Biểu Chuẩn Hành Chính
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-400/30">
                  Theo Khối & Điểm Trường (Khổ A4)
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Mẫu TKB chuẩn: Cột ngang là Lớp • Cột trái là Thứ, Buổi, Tiết 1-5 • Chữ ký Phó Hiệu trưởng Nguyễn Minh Trí
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel || printBlocks.length === 0}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Xuất file Excel chuẩn bảng hành chính từng khối"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isExportingExcel ? 'Đang xuất...' : 'Xuất Excel Hành Chính'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer ring-2 ring-rose-400/40"
              title="Mở hộp thoại In hoặc Lưu file PDF khổ A4"
            >
              <Printer className="w-4 h-4" />
              <span>In / Lưu PDF Ngay</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Đóng hộp thoại"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Configuration Controls Bar - Hidden when printing */}
        <div className="bg-white border-b border-slate-200 p-3 sm:p-4 space-y-3 shrink-0 print:hidden shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Campus selector */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Điểm trường:</span>
              </span>
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  onClick={() => { setSelectedCampus('ALL'); setSelectedGrade('ALL'); }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    selectedCampus === 'ALL' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả (3 điểm)
                </button>
                <button
                  onClick={() => { setSelectedCampus('THPT'); setSelectedGrade('ALL'); }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    selectedCampus === 'THPT' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Điểm chính THPT
                </button>
                <button
                  onClick={() => { setSelectedCampus('DBK'); setSelectedGrade('ALL'); }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    selectedCampus === 'DBK' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Điểm Đốc Binh Kiều
                </button>
                <button
                  onClick={() => { setSelectedCampus('TK'); setSelectedGrade('ALL'); }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    selectedCampus === 'TK' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Điểm Tân Kiều
                </button>
              </div>
            </div>

            {/* Grade selector */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                <span>Khối lớp:</span>
              </span>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="h-8 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="ALL">Tất cả các khối</option>
                {(selectedCampus === 'ALL' || selectedCampus === 'THPT') && (
                  <optgroup label="Khối THPT">
                    <option value="10">Khối 10 (5 lớp: 10CB1 - 10CB5)</option>
                    <option value="11">Khối 11 (4 lớp: 11CB1 - 11CB4)</option>
                    <option value="12">Khối 12 (5 lớp: 12CB1 - 12CB5)</option>
                  </optgroup>
                )}
                {(selectedCampus === 'ALL' || selectedCampus === 'DBK' || selectedCampus === 'TK') && (
                  <optgroup label="Khối THCS">
                    <option value="6">Khối 6 (ĐBK: 6A1-6A6 • TK: 6A7-6A10)</option>
                    <option value="7">Khối 7 (ĐBK: 7A1-7A6 • TK: 7A7-7A9)</option>
                    <option value="8">Khối 8 (ĐBK: 8A1-8A6 • TK: 8A7-8A10)</option>
                    <option value="9">Khối 9 (ĐBK: 9A1-9A6 • TK: 9A7-9A10)</option>
                  </optgroup>
                )}
              </select>
            </div>

            {/* Session filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700">Buổi học:</span>
              <select
                value={sessionFilter}
                onChange={(e) => setSessionFilter(e.target.value as any)}
                className="h-8 px-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="AUTO">Tự động (Theo ca chính - Vừa vặn A4)</option>
                <option value="SANG">Chỉ Buổi Sáng (Tiết 1-5)</option>
                <option value="CHIEU">Chỉ Buổi Chiều (Tiết 1-5)</option>
                <option value="ALL">Cả hai buổi (Sáng & Chiều)</option>
              </select>
            </div>

            {/* Paper Orientation */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700">Khổ giấy in:</span>
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  onClick={() => setPaperOrientation('landscape')}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                    paperOrientation === 'landscape' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="In khổ giấy A4 Ngang (Khuyên dùng)"
                >
                  A4 Ngang
                </button>
                <button
                  onClick={() => setPaperOrientation('portrait')}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                    paperOrientation === 'portrait' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="In khổ giấy A4 Đứng"
                >
                  A4 Đứng
                </button>
              </div>
            </div>

            {/* Font size */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700">Cỡ chữ:</span>
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-[11px]">
                <button
                  onClick={() => setFontSize('sm')}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                    fontSize === 'sm' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Chuẩn (7.5pt)
                </button>
                <button
                  onClick={() => setFontSize('md')}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                    fontSize === 'md' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Vừa (8.5pt)
                </button>
                <button
                  onClick={() => setFontSize('lg')}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                    fontSize === 'lg' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Lớn (9.5pt)
                </button>
              </div>
            </div>
          </div>

          {/* Signatures & Metadata Customization */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-4">
              <span className="font-bold text-indigo-900 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Số khối lớp in: <strong className="text-slate-900">{printBlocks.length} khối ({totalClassesCount} lớp)</strong></span>
              </span>
              <span className="text-slate-500">
                Mỗi khối in thành <strong>1 tờ A4 riêng biệt</strong> (rất tiện phát hoặc dán thông báo)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 bg-slate-100 border border-slate-300 rounded px-2 py-0.5">
                <span className="text-[11px] font-bold text-slate-700">Địa danh:</span>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-900 w-24 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 border border-slate-300 rounded px-2 py-0.5">
                <span className="text-[11px] font-bold text-slate-700">Người ký (Phó Hiệu trưởng):</span>
                <input
                  type="text"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  className="bg-transparent text-xs font-black text-indigo-950 w-36 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Print Preview & Print Sheets Area */}
        <div
          ref={printAreaRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/70 space-y-8 print:p-0 print:m-0 print:bg-white print:overflow-visible print:space-y-0"
        >
          {printBlocks.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-500 max-w-md mx-auto shadow-sm">
              <Info className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="font-bold text-slate-800">Không có lớp học nào thỏa mãn điều kiện lọc</p>
              <p className="text-xs text-slate-500 mt-1">Vui lòng chọn lại điểm trường hoặc khối lớp bên trên.</p>
            </div>
          ) : (
            printBlocks.map((block, blockIndex) => {
              const sessions = getBlockSessions(block);
              const fontSizeClass =
                fontSize === 'sm'
                  ? 'text-[7.5pt] leading-tight'
                  : fontSize === 'md'
                  ? 'text-[8.5pt] leading-tight'
                  : 'text-[9.5pt] leading-normal';

              return (
                <div
                  key={block.id}
                  className={`bg-white text-black p-6 sm:p-8 rounded-xl shadow-md border border-slate-300 mx-auto admin-timetable-print-sheet print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:rounded-none ${
                    paperOrientation === 'landscape' ? 'max-w-[297mm]' : 'max-w-[210mm]'
                  } ${blockIndex > 0 ? 'print:break-before-page' : ''}`}
                  style={{
                    minHeight: paperOrientation === 'landscape' ? '205mm' : '290mm'
                  }}
                >
                  {/* Top Administrative Header (NO document number) */}
                  <div className="border-b border-black/80 pb-2 mb-2 font-serif">
                    <div className="flex justify-between items-start text-xs uppercase">
                      {/* Left: Agency & School */}
                      <div className="text-center w-[46%]">
                        <div className="text-[10pt] font-normal leading-tight text-black">
                          {config.subTitle || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP'}
                        </div>
                        <div className="text-[10.5pt] font-black tracking-tight text-black mt-0.5">
                          {config.schoolName || 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU'}
                        </div>
                        <div className="w-32 h-[1px] bg-black mx-auto mt-1" />
                      </div>

                      {/* Right: National Motto */}
                      <div className="text-center w-[50%]">
                        <div className="text-[10pt] font-bold leading-tight text-black">
                          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                        </div>
                        <div className="text-[10pt] font-bold normal-case text-black mt-0.5">
                          Độc lập - Tự do - Hạnh phúc
                        </div>
                        <div className="w-36 h-[1.5px] bg-black mx-auto mt-1" />
                      </div>
                    </div>

                    {/* Main Title & Subtitle */}
                    <div className="text-center mt-2.5">
                      <h1 className="text-[13.5pt] font-black uppercase tracking-tight text-black">
                        {block.title} — {block.subtitle}
                      </h1>
                      <div className="text-[9.5pt] font-bold italic text-slate-800 mt-0.5">
                        Tuần {currentWeek} (Từ ngày {weekInfo.startDateShort} đến ngày {weekInfo.endDateShort}) • Năm học {config.academicYear || '2026 - 2027'}
                      </div>
                      <div className="text-[8.5pt] italic text-slate-600 mt-0.2">
                        (Áp dụng thực hiện từ ngày Thứ Hai, {weekInfo.startDateShort} • Học kỳ {config.semester || 'HK1'})
                      </div>
                    </div>
                  </div>

                  {/* Timetable Table: Cột hàng ngang là Lớp • Cột trái là Thứ, Buổi, Tiết 1-5 */}
                  <div className="overflow-x-auto print:overflow-visible my-2">
                    <table
                      className={`w-full border-collapse border border-black text-center font-serif ${fontSizeClass} admin-timetable-print-table`}
                    >
                      <thead>
                        {/* Header Row 1: Left columns (THỨ, BUỔI, TIẾT) & Class Names */}
                        <tr className="bg-slate-100 font-bold border-b border-black">
                          <th rowSpan={2} className="border border-black p-1 w-12 text-center bg-slate-200/80">
                            THỨ
                          </th>
                          <th rowSpan={2} className="border border-black p-1 w-11 text-center bg-slate-200/80">
                            BUỔI
                          </th>
                          <th rowSpan={2} className="border border-black p-1 w-9 text-center bg-slate-200/80">
                            TIẾT
                          </th>
                          {block.classes.map(cls => (
                            <th
                              key={cls.id}
                              className="border border-black p-1 font-black text-center bg-slate-100 min-w-[70px]"
                            >
                              {cls.name}
                            </th>
                          ))}
                        </tr>

                        {/* Header Row 2: Homeroom Teachers (GVCN) under class names */}
                        <tr className="bg-slate-50 font-normal border-b border-black text-[85%] italic text-slate-800">
                          {block.classes.map(cls => {
                            const homeroom = cls.homeroomTeacherId ? teacherMap.get(cls.homeroomTeacherId) : undefined;
                            return (
                              <th key={`gvcn-${cls.id}`} className="border border-black p-0.5 text-center font-semibold text-slate-800">
                                {homeroom ? `GVCN: ${homeroom.name.replace(/^Thầy\s+|^Cô\s+/i, '')}` : '-'}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>

                      <tbody>
                        {DAYS_OF_WEEK.map(day => {
                          const totalPeriodsForDay = sessions.length * 5;

                          return sessions.map((sess, sessIdx) => {
                            const sessLabel = sess === 'SANG' ? 'Sáng' : 'Chiều';

                            return PERIODS.map((period, periodIdx) => {
                              const isFirstRowOfDay = sessIdx === 0 && periodIdx === 0;
                              const isFirstRowOfSession = periodIdx === 0;

                              return (
                                <tr
                                  key={`${day.value}_${sess}_${period}`}
                                  className={`border-b border-black ${
                                    day.value % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                                  }`}
                                >
                                  {/* Spanning cell: Day of week */}
                                  {isFirstRowOfDay && (
                                    <td
                                      rowSpan={totalPeriodsForDay}
                                      className="border border-black p-1 font-bold text-center align-middle bg-slate-100/90 whitespace-nowrap"
                                    >
                                      {day.label}
                                    </td>
                                  )}

                                  {/* Spanning cell: Session (Sáng/Chiều) */}
                                  {isFirstRowOfSession && (
                                    <td
                                      rowSpan={5}
                                      className="border border-black p-1 font-bold text-center align-middle bg-slate-50 whitespace-nowrap"
                                    >
                                      {sessLabel}
                                    </td>
                                  )}

                                  {/* Period number (1-5) */}
                                  <td className="border border-black p-1 font-bold text-center align-middle">
                                    {period}
                                  </td>

                                  {/* Class Cells across the row */}
                                  {block.classes.map(cls => {
                                    const slot = slotMap.get(`${cls.id}_${day.value}_${sess}_${period}`) ||
                                                 slotMap.get(`${cls.name}_${day.value}_${sess}_${period}`);

                                    const isSpecial =
                                      slot?.isSpecialActivity ||
                                      slot?.subjectName?.includes('Chào cờ') ||
                                      slot?.subjectName?.includes('Sinh hoạt');

                                    if (!slot || !slot.subjectName) {
                                      return (
                                        <td
                                          key={cls.id}
                                          className="border border-black p-0.5 text-center text-slate-400 font-light"
                                        >
                                          -
                                        </td>
                                      );
                                    }

                                    const subjectName = getUnifiedSubjectName(slot);
                                    const teacherName = getTeacherDisplayName(slot);

                                    return (
                                      <td
                                        key={cls.id}
                                        className={`border border-black p-0.5 text-center leading-tight align-middle ${
                                          isSpecial ? 'bg-amber-100/70' : ''
                                        }`}
                                      >
                                        <div className="font-bold text-black text-[100%] leading-tight">
                                          {subjectName}
                                        </div>
                                        {teacherName && (
                                          <div
                                            className="text-[85%] text-slate-800 italic leading-tight mt-0.5 truncate"
                                            title={teacherName}
                                          >
                                            {teacherName}
                                          </div>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            });
                          });
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Administrative Signatures Block (ONLY Vice Principal Nguyen Minh Tri) */}
                  <div className="mt-3 pt-1 font-serif text-black print:avoid-break">
                    <div className="flex justify-end">
                      <div className="w-72 text-center">
                        <div className="text-[9pt] italic mb-0.5 text-black">
                          {locationName}, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                        </div>
                        <div className="text-[10pt] font-bold uppercase tracking-wider text-black">
                          KT. HIỆU TRƯỞNG
                        </div>
                        <div className="text-[10.5pt] font-black uppercase tracking-wider text-black">
                          PHÓ HIỆU TRƯỞNG
                        </div>
                        <div className="text-[8.5pt] italic text-slate-700">
                          (Ký và ghi rõ họ tên)
                        </div>
                        <div className="h-14 flex items-end justify-center font-bold text-[10.5pt] text-black">
                          {creatorName || 'Nguyễn Minh Trí'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Bar - Hidden when printing */}
        <div className="bg-white border-t border-slate-200 p-3 px-4 flex items-center justify-between text-xs text-slate-600 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-medium text-slate-700">
              Mẹo in đẹp vừa khổ A4: Khi hộp thoại in mở ra, hãy chọn <strong>Khổ giấy: A4</strong>, <strong>Định hướng: {paperOrientation === 'landscape' ? 'Ngang (Landscape)' : 'Đứng (Portrait)'}</strong> và bật <strong>Đồ họa nền (Background graphics)</strong>.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
