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
  Layers,
  CheckCircle2,
  SlidersHorizontal,
  Download,
  Eye,
  Info,
  Maximize2
} from 'lucide-react';
import ExcelJS from 'exceljs';

type CampusFilter = 'ALL' | 'THPT' | 'DBK' | 'TK';
type PageBreakMode = 'BY_CAMPUS' | 'BY_GRADE' | 'CONTINUOUS';

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
  initialSession?: 'ALL' | 'SANG' | 'CHIEU';
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
  initialSession = 'ALL'
}) => {
  const [selectedCampus, setSelectedCampus] = useState<CampusFilter>(initialCampus);
  const [selectedGrade, setSelectedGrade] = useState<string>(initialGrade);
  const [selectedSession, setSelectedSession] = useState<'ALL' | 'SANG' | 'CHIEU'>(initialSession);
  const [pageBreakMode, setPageBreakMode] = useState<PageBreakMode>('BY_CAMPUS');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('sm');
  const [creatorName, setCreatorName] = useState<string>(config.vicePrincipalName || 'Nguyễn Minh Trí');
  const [principalName, setPrincipalName] = useState<string>(config.principalName || 'Lê Thanh Cường');
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
      map.set(`${s.classId}_${s.dayOfWeek}_${s.session}_${s.period}`, s);
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

  // Filtered classes according to campus & grade
  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
      if (selectedCampus === 'THPT' && cls.level !== 'THPT' && cls.campus !== 'THPTDBK') return false;
      if (selectedCampus === 'DBK' && (cls.level === 'THPT' || cls.campus === 'THCSTK')) return false;
      if (selectedCampus === 'TK' && (cls.level === 'THPT' || cls.campus !== 'THCSTK')) return false;
      if (selectedGrade !== 'ALL' && cls.grade !== selectedGrade) return false;
      return true;
    });
  }, [classes, selectedCampus, selectedGrade]);

  // Group classes into printable blocks depending on pageBreakMode
  interface PrintBlock {
    id: string;
    campusCode: 'THPT' | 'DBK' | 'TK';
    campusName: string;
    gradeLabel: string;
    title: string;
    subtitle: string;
    classes: ClassGroup[];
  }

  const printBlocks = useMemo<PrintBlock[]>(() => {
    if (filteredClasses.length === 0) return [];

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

    if (pageBreakMode === 'CONTINUOUS') {
      let campusTitle = 'TOÀN TRƯỜNG (CẢ 3 ĐIỂM TRƯỜNG)';
      if (selectedCampus === 'THPT') campusTitle = 'ĐIỂM TRƯỜNG CHÍNH (KHỐI THPT)';
      if (selectedCampus === 'DBK') campusTitle = 'ĐIỂM TRƯỜNG THCS ĐỐC BINH KIỀU';
      if (selectedCampus === 'TK') campusTitle = 'ĐIỂM TRƯỜNG THCS TÂN KIỀU';

      let gradeTitle = selectedGrade === 'ALL' ? 'TẤT CẢ CÁC KHỐI LỚP' : `KHỐI ${selectedGrade}`;

      return [
        {
          id: 'continuous-block',
          campusCode: selectedCampus === 'ALL' ? 'THPT' : selectedCampus,
          campusName: campusTitle,
          gradeLabel: gradeTitle,
          title: `THỜI KHÓA BIỂU ${campusTitle} - ${gradeTitle}`,
          subtitle: `Tuần ${currentWeek} (${weekInfo.startDateShort} - ${weekInfo.endDateShort}) • Năm học ${config.academicYear || '2026 - 2027'}`,
          classes: filteredClasses
        }
      ];
    }

    if (pageBreakMode === 'BY_GRADE') {
      // Group by campus + grade
      const map = new Map<string, { campus: 'THPT' | 'DBK' | 'TK'; grade: string; list: ClassGroup[] }>();
      filteredClasses.forEach(c => {
        const campusKey: 'THPT' | 'DBK' | 'TK' =
          c.campus === 'THCSTK' ? 'TK' : c.level === 'THPT' || c.campus === 'THPTDBK' ? 'THPT' : 'DBK';
        const key = `${campusKey}_${c.grade}`;
        const item = map.get(key) || { campus: campusKey, grade: c.grade, list: [] };
        item.list.push(c);
        map.set(key, item);
      });

      const blocks: PrintBlock[] = [];
      map.forEach((item, key) => {
        const cInfo = getCampusInfo(item.campus);
        blocks.push({
          id: key,
          campusCode: item.campus,
          campusName: cInfo.name,
          gradeLabel: `KHỐI ${item.grade}`,
          title: `THỜI KHÓA BIỂU ${cInfo.name} - KHỐI ${item.grade}`,
          subtitle: `Tuần ${currentWeek} (${weekInfo.startDateShort} - ${weekInfo.endDateShort}) • Năm học ${config.academicYear || '2026 - 2027'}`,
          classes: item.list
        });
      });
      return blocks;
    }

    // Default: BY_CAMPUS
    const map = new Map<'THPT' | 'DBK' | 'TK', ClassGroup[]>();
    filteredClasses.forEach(c => {
      const campusKey: 'THPT' | 'DBK' | 'TK' =
        c.campus === 'THCSTK' ? 'TK' : c.level === 'THPT' || c.campus === 'THPTDBK' ? 'THPT' : 'DBK';
      const list = map.get(campusKey) || [];
      list.push(c);
      map.set(campusKey, list);
    });

    const blocks: PrintBlock[] = [];
    (['THPT', 'DBK', 'TK'] as const).forEach(campusKey => {
      const list = map.get(campusKey);
      if (list && list.length > 0) {
        const cInfo = getCampusInfo(campusKey);
        blocks.push({
          id: `campus-${campusKey}`,
          campusCode: campusKey,
          campusName: cInfo.name,
          gradeLabel: selectedGrade === 'ALL' ? 'TẤT CẢ CÁC KHỐI' : `KHỐI ${selectedGrade}`,
          title: `THỜI KHÓA BIỂU ${cInfo.name}`,
          subtitle: `Tuần ${currentWeek} (${weekInfo.startDateShort} - ${weekInfo.endDateShort}) • Năm học ${config.academicYear || '2026 - 2027'}`,
          classes: list
        });
      }
    });
    return blocks;
  }, [filteredClasses, pageBreakMode, selectedCampus, selectedGrade, currentWeek, weekInfo, config.academicYear]);

  // Action: Print / Save to PDF
  const handlePrint = () => {
    window.print();
  };

  // Action: Export formatted administrative Excel using ExcelJS
  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      const wb = new ExcelJS.Workbook();
      wb.creator = config.schoolName || 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU';
      wb.lastModifiedBy = creatorName;
      wb.created = new Date();
      wb.modified = new Date();

      printBlocks.forEach((block, bIdx) => {
        const sheetName = block.gradeLabel.includes('KHỐI')
          ? `${block.campusCode}_${block.gradeLabel.replace(/\s+/g, '')}`.slice(0, 31)
          : `${block.campusCode}_TKB`.slice(0, 31);
        const ws = wb.addWorksheet(sheetName || `Sheet${bIdx + 1}`);

        ws.pageSetup = {
          orientation: 'landscape',
          paperSize: 9, // A4
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: {
            left: 0.3,
            right: 0.3,
            top: 0.4,
            bottom: 0.4,
            header: 0.2,
            footer: 0.2
          }
        };

        // Row 1: Header Đơn vị + Quốc hiệu
        ws.mergeCells('A1:G1');
        ws.getCell('A1').value = config.subTitle || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP';
        ws.getCell('A1').font = { name: 'Times New Roman', size: 10, bold: true };
        ws.getCell('A1').alignment = { horizontal: 'center' };

        ws.mergeCells('H1:AE1');
        ws.getCell('H1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
        ws.getCell('H1').font = { name: 'Times New Roman', size: 10, bold: true };
        ws.getCell('H1').alignment = { horizontal: 'center' };

        // Row 2: Tên trường + Tiêu ngữ
        ws.mergeCells('A2:G2');
        ws.getCell('A2').value = config.schoolName || 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU';
        ws.getCell('A2').font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
        ws.getCell('A2').alignment = { horizontal: 'center' };

        ws.mergeCells('H2:AE2');
        ws.getCell('H2').value = 'Độc lập - Tự do - Hạnh phúc';
        ws.getCell('H2').font = { name: 'Times New Roman', size: 10, bold: true, underline: true };
        ws.getCell('H2').alignment = { horizontal: 'center' };

        // Row 3: Empty
        ws.addRow([]);

        // Row 4: Main Title
        ws.mergeCells('A4:AE4');
        ws.getCell('A4').value = block.title.toUpperCase();
        ws.getCell('A4').font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF0F172A' } };
        ws.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };

        // Row 5: Subtitle
        ws.mergeCells('A5:AE5');
        ws.getCell('A5').value = `Tuần ${currentWeek} (${weekInfo.startDateShort} - ${weekInfo.endDateShort}) • Năm học ${config.academicYear || '2026 - 2027'} (Áp dụng từ Thứ Hai, ${weekInfo.startDateShort})`;
        ws.getCell('A5').font = { name: 'Times New Roman', size: 10, italic: true, bold: true, color: { argb: 'FF334155' } };
        ws.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };

        // Row 6: Empty
        ws.addRow([]);

        // Row 7: Table Header (Day groups)
        const headerRow1 = [
          'STT',
          'Lớp',
          'GVCN',
          'Buổi'
        ];
        DAYS_OF_WEEK.forEach(d => {
          headerRow1.push(d.label, '', '', '', '');
        });
        const r7 = ws.addRow(headerRow1);
        r7.font = { name: 'Times New Roman', size: 10, bold: true };
        r7.alignment = { horizontal: 'center', vertical: 'middle' };

        ws.mergeCells('A7:A8');
        ws.mergeCells('B7:B8');
        ws.mergeCells('C7:C8');
        ws.mergeCells('D7:D8');

        let colIdx = 5;
        DAYS_OF_WEEK.forEach(() => {
          ws.mergeCells(7, colIdx, 7, colIdx + 4);
          colIdx += 5;
        });

        // Row 8: Period numbers T1 - T5
        const headerRow2 = ['', '', '', ''];
        DAYS_OF_WEEK.forEach(() => {
          PERIODS.forEach(p => headerRow2.push(`T${p}`));
        });
        const r8 = ws.addRow(headerRow2);
        r8.font = { name: 'Times New Roman', size: 9, bold: true };
        r8.alignment = { horizontal: 'center', vertical: 'middle' };

        // Style table headers
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

        // Data rows
        block.classes.forEach((cls, idx) => {
          const isMainAfternoon = cls.grade === '6' || cls.grade === '7' || /^[67]A/i.test(cls.name);
          const primarySession = isMainAfternoon ? 'CHIEU' : 'SANG';
          const homeroom = cls.homeroomTeacherId ? teacherMap.get(cls.homeroomTeacherId) : undefined;

          const rowData: (string | number)[] = [
            idx + 1,
            cls.name,
            homeroom?.name || '-',
            primarySession === 'SANG' ? 'Sáng' : 'Chiều'
          ];

          DAYS_OF_WEEK.forEach(d => {
            PERIODS.forEach(p => {
              const slot = selectedSession === 'SANG'
                ? slotMap.get(`${cls.id}_${d.value}_SANG_${p}`)
                : selectedSession === 'CHIEU'
                ? slotMap.get(`${cls.id}_${d.value}_CHIEU_${p}`)
                : (slotMap.get(`${cls.id}_${d.value}_${primarySession}_${p}`) ||
                   slotMap.get(`${cls.id}_${d.value}_${primarySession === 'SANG' ? 'CHIEU' : 'SANG'}_${p}`));

              if (slot?.subjectName) {
                const sub = getUnifiedSubjectName(slot);
                const teacherName = getTeacherDisplayName(slot);
                rowData.push(teacherName ? `${sub}\n(${teacherName})` : sub);
              } else {
                rowData.push('-');
              }
            });
          });

          const dataRow = ws.addRow(rowData);
          dataRow.height = 32;
          dataRow.font = { name: 'Times New Roman', size: 9 };
          dataRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

          dataRow.eachCell((cell, colNumber) => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF000000' } },
              left: { style: 'thin', color: { argb: 'FF000000' } },
              bottom: { style: 'thin', color: { argb: 'FF000000' } },
              right: { style: 'thin', color: { argb: 'FF000000' } }
            };

            if (idx % 2 === 1) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF8FAFC' }
              };
            }

            if (colNumber === 2) {
              cell.font = { name: 'Times New Roman', size: 10, bold: true };
            }
          });
        });

        // Signatures block: Chỉ Phó Hiệu trưởng Nguyễn Minh Trí
        ws.addRow([]);
        const dateRow = ws.addRow([]);
        ws.mergeCells(dateRow.number, 22, dateRow.number, 32);
        ws.getCell(dateRow.number, 22).value = `Tháp Mười, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`;
        ws.getCell(dateRow.number, 22).font = { name: 'Times New Roman', size: 10, italic: true };
        ws.getCell(dateRow.number, 22).alignment = { horizontal: 'center' };

        const sigTitles = ws.addRow([]);
        ws.mergeCells(sigTitles.number, 22, sigTitles.number, 32);
        ws.getCell(sigTitles.number, 22).value = 'PHÓ HIỆU TRƯỞNG';
        sigTitles.font = { name: 'Times New Roman', size: 10, bold: true };
        sigTitles.alignment = { horizontal: 'center' };

        const sigNotes = ws.addRow([]);
        ws.mergeCells(sigNotes.number, 22, sigNotes.number, 32);
        ws.getCell(sigNotes.number, 22).value = '(Ký và ghi rõ họ tên)';
        sigNotes.font = { name: 'Times New Roman', size: 9, italic: true };
        sigNotes.alignment = { horizontal: 'center' };

        ws.addRow([]);
        ws.addRow([]);
        ws.addRow([]);

        const sigNames = ws.addRow([]);
        ws.mergeCells(sigNames.number, 22, sigNames.number, 32);
        ws.getCell(sigNames.number, 22).value = creatorName || 'Nguyễn Minh Trí';
        sigNames.font = { name: 'Times New Roman', size: 10, bold: true };
        sigNames.alignment = { horizontal: 'center' };

        // Column widths
        ws.getColumn(1).width = 5;  // STT
        ws.getColumn(2).width = 9;  // Lớp
        ws.getColumn(3).width = 16; // GVCN
        ws.getColumn(4).width = 7;  // Buổi
        for (let c = 5; c <= 34; c++) {
          ws.getColumn(c).width = 9;
        }
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TKB_HanhChinh_Tuan${currentWeek}_${selectedCampus}_${selectedGrade}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lỗi khi xuất file Excel:', err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      {/* Container */}
      <div className="bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 w-full max-w-7xl max-h-[96vh] flex flex-col overflow-hidden">
        {/* Top Header - Hidden when printing */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5 sm:p-4 flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black uppercase tracking-tight">
                  Xuất PDF & In Thời Khóa Biểu Chuẩn Hành Chính
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/30 text-rose-200 border border-rose-400/30">
                  Tuần {currentWeek}
                </span>
              </div>
              <p className="text-xs text-indigo-200/90 font-medium">
                Đầy đủ Quốc hiệu - Tiêu ngữ, Bảng ma trận theo Điểm trường & Khối lớp, Khung chữ ký 3 bên cuối trang
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Xuất dữ liệu TKB ra file Excel đầy đủ bảng biểu, kẻ khung và chữ ký hành chính"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isExportingExcel ? 'Đang xuất...' : 'Xuất Excel Hành Chính'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer ring-2 ring-rose-400/40"
              title="Mở hộp thoại In hoặc Lưu file PDF khổ A4 Ngang"
            >
              <Printer className="w-4 h-4" />
              <span>In / Lưu PDF Ngay</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar - Hidden when printing */}
        <div className="bg-white border-b border-slate-200 p-3 sm:p-4 space-y-3 shrink-0 print:hidden shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Campus selector */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600 flex items-center gap-1">
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
                  Tất cả (53 lớp)
                </button>
                <button
                  onClick={() => { setSelectedCampus('THPT'); setSelectedGrade('ALL'); }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    selectedCampus === 'THPT' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Điểm chính THPT (14 lớp)
                </button>
                <button
                  onClick={() => { setSelectedCampus('DBK'); setSelectedGrade('ALL'); }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    selectedCampus === 'DBK' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Điểm Đốc Binh Kiều (24 lớp)
                </button>
                <button
                  onClick={() => { setSelectedCampus('TK'); setSelectedGrade('ALL'); }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    selectedCampus === 'TK' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Điểm Tân Kiều (15 lớp)
                </button>
              </div>
            </div>

            {/* Grade selector */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600 flex items-center gap-1">
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
                    <option value="10">Khối 10 (5 lớp)</option>
                    <option value="11">Khối 11 (4 lớp)</option>
                    <option value="12">Khối 12 (5 lớp)</option>
                  </optgroup>
                )}
                {(selectedCampus === 'ALL' || selectedCampus === 'DBK' || selectedCampus === 'TK') && (
                  <optgroup label="Khối THCS">
                    <option value="6">Khối 6</option>
                    <option value="7">Khối 7</option>
                    <option value="8">Khối 8</option>
                    <option value="9">Khối 9</option>
                  </optgroup>
                )}
              </select>
            </div>

            {/* Session selector */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">Buổi:</span>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value as any)}
                className="h-8 px-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="ALL">Cả ngày (Sáng & Chiều)</option>
                <option value="SANG">Chỉ Buổi Sáng</option>
                <option value="CHIEU">Chỉ Buổi Chiều</option>
              </select>
            </div>

            {/* Page Break Mode */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Ngắt trang:</span>
              </span>
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  onClick={() => setPageBreakMode('BY_CAMPUS')}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                    pageBreakMode === 'BY_CAMPUS' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Mỗi Điểm trường in thành một phần tài liệu riêng biệt"
                >
                  Theo Điểm trường
                </button>
                <button
                  onClick={() => setPageBreakMode('BY_GRADE')}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                    pageBreakMode === 'BY_GRADE' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Mỗi Khối lớp in thành 1 trang A4 ngang riêng (Rất tiện dán hoặc phát theo khối)"
                >
                  Theo Khối lớp
                </button>
                <button
                  onClick={() => setPageBreakMode('CONTINUOUS')}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                    pageBreakMode === 'CONTINUOUS' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="In liên tục toàn bộ"
                >
                  Liên tục
                </button>
              </div>
            </div>

            {/* Font size zoom */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">Cỡ chữ in:</span>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-[11px]">
                <button
                  onClick={() => setFontSize('sm')}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                    fontSize === 'sm' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Nhỏ (7pt)
                </button>
                <button
                  onClick={() => setFontSize('md')}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                    fontSize === 'md' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Vừa (8pt)
                </button>
                <button
                  onClick={() => setFontSize('lg')}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                    fontSize === 'lg' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Lớn (9pt)
                </button>
              </div>
            </div>
          </div>

          {/* Quick Info & Signatures customizer */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-4">
              <span className="font-bold text-indigo-900 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Số lớp xuất: <strong className="text-slate-900">{filteredClasses.length} lớp</strong></span>
              </span>
              <span>Tổng số trang/bản in dự kiến: <strong className="text-slate-900">{printBlocks.length} bản</strong></span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500">Người ký duyệt:</span>
              <div className="flex items-center gap-1 bg-slate-100 border border-slate-300 rounded px-2 py-0.5">
                <span className="text-[11px] font-bold text-slate-700">Phó Hiệu trưởng:</span>
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

        {/* Document Print & Preview Area */}
        <div
          ref={printAreaRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/70 space-y-6 print:p-0 print:m-0 print:bg-white print:overflow-visible print:space-y-0"
        >
          {printBlocks.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-500 max-w-md mx-auto shadow-sm">
              <Info className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="font-bold text-slate-800">Không có lớp học nào thỏa mãn điều kiện lọc</p>
              <p className="text-xs text-slate-500 mt-1">Vui lòng chọn lại điểm trường hoặc khối lớp bên trên.</p>
            </div>
          ) : (
            printBlocks.map((block, blockIndex) => {
              const tableFontSizeClass =
                fontSize === 'sm' ? 'text-[7pt] leading-tight' : fontSize === 'md' ? 'text-[8pt] leading-tight' : 'text-[9pt] leading-normal';

              return (
                <div
                  key={block.id}
                  className={`bg-white text-black p-6 sm:p-8 rounded-xl shadow-md border border-slate-300 mx-auto max-w-[297mm] admin-timetable-print-sheet print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:rounded-none ${
                    blockIndex > 0 ? 'print:break-before-page' : ''
                  }`}
                  style={{ minHeight: '210mm' }}
                >
                  {/* Administrative Header (Quốc hiệu, Tiêu ngữ, Tên trường) */}
                  <div className="border-b border-black/80 pb-2 mb-3">
                    <div className="flex justify-between items-start text-xs uppercase font-serif">
                      {/* Left: Agency & School */}
                      <div className="text-center w-[45%]">
                        <div className="text-[10pt] font-normal leading-tight text-slate-800">
                          {config.subTitle || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP'}
                        </div>
                        <div className="text-[11pt] font-black tracking-tight text-slate-950 mt-0.5">
                          {config.schoolName || 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU'}
                        </div>
                        <div className="w-32 h-[1px] bg-black mx-auto mt-1.5" />
                      </div>

                      {/* Right: National Motto */}
                      <div className="text-center w-[50%]">
                        <div className="text-[10pt] font-black leading-tight text-slate-950">
                          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                        </div>
                        <div className="text-[10.5pt] font-bold normal-case text-slate-900 mt-0.5">
                          Độc lập - Tự do - Hạnh phúc
                        </div>
                        <div className="w-40 h-[1.5px] bg-black mx-auto mt-1" />
                      </div>
                    </div>

                    {/* Main Title */}
                    <div className="text-center mt-3 font-serif">
                      <h1 className="text-[14pt] font-black uppercase tracking-tight text-slate-950">
                        {block.title}
                      </h1>
                      <div className="text-[10pt] font-bold italic text-slate-800 mt-0.5">
                        Tuần {currentWeek} (Từ ngày {weekInfo.startDateShort} đến ngày {weekInfo.endDateShort}) • Năm học {config.academicYear || '2026 - 2027'}
                      </div>
                      <div className="text-[9pt] italic text-slate-600 mt-0.5">
                        (Áp dụng thực hiện từ ngày Thứ Hai, {weekInfo.startDateShort} • Học kỳ {config.semester || 'HK1'})
                      </div>
                    </div>
                  </div>

                  {/* Timetable Matrix Table */}
                  <div className="overflow-x-auto print:overflow-visible">
                    <table
                      className={`w-full border-collapse border border-black text-center font-serif ${tableFontSizeClass} admin-timetable-print-table`}
                    >
                      <thead>
                        <tr className="bg-slate-100 font-bold border-b border-black">
                          <th rowSpan={2} className="border border-black p-1 w-7 text-center">STT</th>
                          <th rowSpan={2} className="border border-black p-1 min-w-[50px] text-center">Lớp</th>
                          <th rowSpan={2} className="border border-black p-1 min-w-[100px] text-left">GV Chủ Nhiệm</th>
                          <th rowSpan={2} className="border border-black p-1 w-10 text-center">Buổi</th>
                          {DAYS_OF_WEEK.map(d => (
                            <th
                              key={d.value}
                              colSpan={5}
                              className="border border-black p-1 text-center font-bold bg-slate-200/80"
                            >
                              {d.label.toUpperCase()}
                            </th>
                          ))}
                        </tr>
                        <tr className="bg-slate-50 font-bold border-b border-black text-[90%]">
                          {DAYS_OF_WEEK.map(d => (
                            <React.Fragment key={d.value}>
                              {PERIODS.map(p => (
                                <th key={p} className="border border-black p-0.5 text-center min-w-[42px]">
                                  T{p}
                                </th>
                              ))}
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {block.classes.map((cls, idx) => {
                          const isMainAfternoon = cls.grade === '6' || cls.grade === '7' || /^[67]A/i.test(cls.name);
                          const primarySession = isMainAfternoon ? 'CHIEU' : 'SANG';
                          const homeroom = cls.homeroomTeacherId ? teacherMap.get(cls.homeroomTeacherId) : undefined;

                          return (
                            <tr
                              key={cls.id}
                              className={`border-b border-black transition-colors ${
                                idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'
                              }`}
                            >
                              <td className="border border-black p-1 text-center font-semibold text-slate-700">
                                {idx + 1}
                              </td>
                              <td className="border border-black p-1 font-black text-slate-950 whitespace-nowrap">
                                {cls.name}
                              </td>
                              <td className="border border-black p-1 text-left whitespace-nowrap font-medium text-slate-800">
                                {homeroom?.name || '-'}
                              </td>
                              <td className="border border-black p-1 font-bold text-center text-slate-800">
                                {primarySession === 'SANG' ? 'S' : 'C'}
                              </td>

                              {DAYS_OF_WEEK.map(d => (
                                <React.Fragment key={d.value}>
                                  {PERIODS.map(p => {
                                    const slot = selectedSession === 'SANG'
                                      ? slotMap.get(`${cls.id}_${d.value}_SANG_${p}`)
                                      : selectedSession === 'CHIEU'
                                      ? slotMap.get(`${cls.id}_${d.value}_CHIEU_${p}`)
                                      : (slotMap.get(`${cls.id}_${d.value}_${primarySession}_${p}`) ||
                                         slotMap.get(`${cls.id}_${d.value}_${primarySession === 'SANG' ? 'CHIEU' : 'SANG'}_${p}`));

                                    const isSpecial = slot?.isSpecialActivity ||
                                      slot?.subjectName?.includes('Chào cờ') ||
                                      slot?.subjectName?.includes('Sinh hoạt');

                                    return (
                                      <td
                                        key={p}
                                        className={`border border-black p-0.5 text-center leading-tight ${
                                          isSpecial
                                            ? 'bg-amber-100/70 font-bold'
                                            : ''
                                        }`}
                                      >
                                        {slot?.subjectName ? (
                                          <div>
                                            <div className="font-bold text-slate-950 truncate" title={getUnifiedSubjectName(slot)}>
                                              {getUnifiedSubjectName(slot)}
                                            </div>
                                            {getTeacherDisplayName(slot) && (
                                              <div className="text-[85%] text-slate-700 italic truncate" title={getTeacherDisplayName(slot)}>
                                                {getTeacherDisplayName(slot)}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 font-light">-</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </React.Fragment>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Administrative Signatures Block (Chỉ Phó Hiệu trưởng Nguyễn Minh Trí) */}
                  <div className="mt-4 pt-2 font-serif text-black print:avoid-break">
                    <div className="flex justify-end">
                      <div className="w-80 text-center">
                        <div className="text-xs italic mb-1 text-slate-800">
                          Tháp Mười, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                        </div>
                        <div className="font-bold uppercase text-[11pt] tracking-wider text-slate-950">
                          PHÓ HIỆU TRƯỞNG
                        </div>
                        <div className="text-[9pt] italic text-slate-700">
                          (Ký và ghi rõ họ tên)
                        </div>
                        <div className="h-20 flex items-end justify-center font-bold text-[11pt] text-slate-950">
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
              Mẹo in đẹp: Khi hộp thoại in mở ra, hãy chọn <strong>Khổ giấy: A4</strong>, <strong>Định hướng: Ngang (Landscape)</strong> và bật <strong>Đồ họa nền (Background graphics)</strong>.
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
