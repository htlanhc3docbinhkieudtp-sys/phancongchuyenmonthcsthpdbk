import React, { useState, useMemo } from 'react';
import {
  WeeklySchedule,
  WeeklyAssignmentItem,
  Assignment,
  ClassGroup,
  Subject,
  Teacher,
  SchoolConfig,
  SchoolCampus
} from '../types';
import {
  WEEKS_HK1,
  WEEKS_HK2,
  getRecommendedIntegerPeriods
} from '../utils/weeklyScheduleHelper';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Copy,
  RotateCcw,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  Plus,
  Minus,
  Edit3,
  HelpCircle,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface WeeklyScheduleManagerViewProps {
  config: SchoolConfig;
  classes: ClassGroup[];
  subjects: Subject[];
  teachers: Teacher[];
  baseAssignments: Assignment[];
  weeklySchedules: WeeklySchedule[];
  isAdmin?: boolean;
  onPromptAdminLogin?: () => void;
  onUpdateWeeklySchedule: (updatedSchedule: WeeklySchedule) => void;
  onAutoGenerateAllWeeks: () => void;
  onCopyWeekSchedule: (fromWeek: number, toWeek: number) => void;
  onResetWeekSchedule: (weekNumber: number) => void;
}

type CampusFilter = 'ALL' | 'DBK' | 'TK' | 'THPT';

export const WeeklyScheduleManagerView: React.FC<WeeklyScheduleManagerViewProps> = ({
  config,
  classes,
  subjects,
  teachers,
  baseAssignments,
  weeklySchedules,
  isAdmin = false,
  onPromptAdminLogin,
  onUpdateWeeklySchedule,
  onAutoGenerateAllWeeks,
  onCopyWeekSchedule,
  onResetWeekSchedule
}) => {
  const currentSemester = config.semester || 'HK1';
  const availableWeeks = currentSemester === 'HK1' ? WEEKS_HK1 : WEEKS_HK2;

  const [selectedWeek, setSelectedWeek] = useState<number>(availableWeeks[0] || 1);
  const [selectedCampus, setSelectedCampus] = useState<CampusFilter>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copySourceWeek, setCopySourceWeek] = useState<number>(1);
  const [editingAssignment, setEditingAssignment] = useState<{
    classId: string;
    subjectId: string;
    teacherId: string;
    periods: number;
    note?: string;
  } | null>(null);

  const teacherMap = useMemo(() => new Map<string, Teacher>(teachers.map(t => [t.id, t])), [teachers]);
  const subjectMap = useMemo(() => new Map<string, Subject>(subjects.map(s => [s.id, s])), [subjects]);
  const baseAssignmentMap = useMemo(() => {
    const map = new Map<string, Assignment>();
    baseAssignments.forEach(a => {
      map.set(`${a.classId}_${a.subjectId}`, a);
    });
    return map;
  }, [baseAssignments]);

  // Find or construct current week's schedule
  const currentWeekSchedule: WeeklySchedule = useMemo(() => {
    const found = weeklySchedules.find(
      ws => ws.weekNumber === selectedWeek && ws.semester === currentSemester
    );
    if (found) return found;

    // Fallback: build default assignments for this week based on base plan + recommended integer periods
    const fallbackAssignments: WeeklyAssignmentItem[] = baseAssignments.map(a => {
      const cls = classes.find(c => c.id === a.classId);
      const grade = cls?.grade || '10';
      const baseP = a.periodsPerWeek || 2;
      const intP = getRecommendedIntegerPeriods(a.subjectId, grade, selectedWeek, baseP);
      return {
        classId: a.classId,
        subjectId: a.subjectId,
        teacherId: a.teacherId,
        periods: intP,
        note: ''
      };
    });

    return {
      weekNumber: selectedWeek,
      semester: currentSemester,
      title: `Tuần ${selectedWeek}`,
      assignments: fallbackAssignments,
      updatedAt: Date.now()
    };
  }, [weeklySchedules, selectedWeek, currentSemester, baseAssignments, classes]);

  const currentAssignmentsMap = useMemo(() => {
    const map = new Map<string, WeeklyAssignmentItem>();
    currentWeekSchedule.assignments.forEach(a => {
      map.set(`${a.classId}_${a.subjectId}`, a);
    });
    return map;
  }, [currentWeekSchedule]);

  // Filter classes according to campus & grade & search
  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
      // Campus filter
      if (selectedCampus === 'THPT' && cls.level !== 'THPT') return false;
      if (selectedCampus === 'DBK') {
        if (cls.level !== 'THCS') return false;
        if (cls.campus === 'THCSTK') return false;
        const num = parseInt(cls.name.replace(/[^0-9]/g, '').slice(1), 10);
        if (!isNaN(num) && num > 6) return false;
      }
      if (selectedCampus === 'TK') {
        if (cls.level !== 'THCS') return false;
        if (cls.campus === 'THCSDBK') return false;
        const num = parseInt(cls.name.replace(/[^0-9]/g, '').slice(1), 10);
        if (!isNaN(num) && num <= 6) return false;
      }

      // Grade filter
      if (selectedGrade !== 'ALL' && cls.grade !== selectedGrade) return false;

      // Search term
      if (searchTerm && !cls.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;

      return true;
    });
  }, [classes, selectedCampus, selectedGrade, searchTerm]);

  // Subject columns based on context
  const thcs8Cols = [
    { id: 'sub-van', name: 'Văn' },
    { id: 'sub-toan', name: 'Toán' },
    { id: 'sub-anh', name: 'T.Anh' },
    { id: 'sub-li', name: 'Lí (KHTN)' },
    { id: 'sub-hoa', name: 'Hóa (KHTN)' },
    { id: 'sub-sinh', name: 'Sinh (KHTN)' },
    { id: 'sub-su', name: 'Sử' },
    { id: 'sub-dia', name: 'Địa' },
    { id: 'sub-gdcd', name: 'GDCD' },
    { id: 'sub-tin', name: 'Tin' },
    { id: 'sub-gdtc', name: 'TD' },
    { id: 'sub-am-nhac', name: 'Nhạc' },
    { id: 'sub-my-thuat', name: 'M.Thuật' },
    { id: 'sub-cn', name: 'C.Nghệ' },
    { id: 'sub-hdtn', name: 'HĐTN' },
    { id: 'sub-gddp', name: 'GDĐP' }
  ];

  const thcs9Cols = [
    { id: 'sub-van', name: 'Văn' },
    { id: 'sub-toan', name: 'Toán' },
    { id: 'sub-anh', name: 'T.Anh' },
    { id: 'sub-li', name: 'Lí (KHTN)' },
    { id: 'sub-hoa', name: 'Hóa (KHTN)' },
    { id: 'sub-sinh', name: 'Sinh (KHTN)' },
    { id: 'sub-su', name: 'Sử' },
    { id: 'sub-dia', name: 'Địa' },
    { id: 'sub-gdcd', name: 'GDCD' },
    { id: 'sub-tin', name: 'Tin' },
    { id: 'sub-gdtc', name: 'TD' },
    { id: 'sub-am-nhac', name: 'Nhạc' },
    { id: 'sub-my-thuat', name: 'M.Thuật' },
    { id: 'sub-cn', name: 'C.Nghệ' },
    { id: 'sub-hdtn', name: 'HĐTN' },
    { id: 'sub-gddp', name: 'GDĐP' }
  ];

  const thcs67Cols = [
    { id: 'sub-van', name: 'Văn' },
    { id: 'sub-toan', name: 'Toán' },
    { id: 'sub-anh', name: 'T.Anh' },
    { id: 'sub-khtn-cs', name: 'KHTN' },
    { id: 'sub-su', name: 'Sử' },
    { id: 'sub-dia', name: 'Địa' },
    { id: 'sub-gdcd', name: 'GDCD' },
    { id: 'sub-tin', name: 'Tin' },
    { id: 'sub-gdtc', name: 'TD' },
    { id: 'sub-am-nhac', name: 'Nhạc' },
    { id: 'sub-my-thuat', name: 'M.Thuật' },
    { id: 'sub-cn', name: 'C.Nghệ' },
    { id: 'sub-hdtn', name: 'HĐTN' },
    { id: 'sub-gddp', name: 'GDĐP' }
  ];

  const thptCols = [
    { id: 'sub-van', name: 'Văn' },
    { id: 'sub-toan', name: 'Toán' },
    { id: 'sub-anh', name: 'T.Anh' },
    { id: 'sub-li', name: 'Lí' },
    { id: 'sub-hoa', name: 'Hóa' },
    { id: 'sub-sinh', name: 'Sinh' },
    { id: 'sub-su', name: 'Sử' },
    { id: 'sub-dia', name: 'Địa' },
    { id: 'sub-gdktpl', name: 'KTPL' },
    { id: 'sub-tin', name: 'Tin' },
    { id: 'sub-cn', name: 'C.Nghệ' },
    { id: 'sub-gdtc', name: 'TD' },
    { id: 'sub-gdqp', name: 'QP' },
    { id: 'sub-hdtn', name: 'HĐTN' },
    { id: 'sub-gddp', name: 'GDĐP' }
  ];

  const getColsForClass = (cls: ClassGroup) => {
    if (cls.level === 'THPT') return thptCols;
    if (cls.grade === '8') return thcs8Cols;
    if (cls.grade === '9') return thcs9Cols;
    return thcs67Cols;
  };

  // Stats for the current week
  const weekStats = useMemo(() => {
    let totalPeriods = 0;
    const activeTeacherIds = new Set<string>();

    currentWeekSchedule.assignments.forEach(a => {
      totalPeriods += a.periods || 0;
      if (a.teacherId) activeTeacherIds.add(a.teacherId);
    });

    return {
      totalPeriods,
      teacherCount: activeTeacherIds.size,
      classCount: filteredClasses.length
    };
  }, [currentWeekSchedule, filteredClasses]);

  // Adjust periods (+1 / -1)
  const handleQuickAdjustPeriods = (classId: string, subjectId: string, delta: number) => {
    if (!isAdmin) {
      onPromptAdminLogin?.();
      return;
    }

    const key = `${classId}_${subjectId}`;
    const existing = currentAssignmentsMap.get(key);
    const baseA = baseAssignmentMap.get(key);

    const currentP = existing ? existing.periods : (baseA?.periodsPerWeek || 2);
    const newP = Math.max(0, currentP + delta);
    const teacherId = existing?.teacherId || baseA?.teacherId || '';

    const updatedAssignments = currentWeekSchedule.assignments.filter(
      a => !(a.classId === classId && a.subjectId === subjectId)
    );

    if (newP > 0 || teacherId) {
      updatedAssignments.push({
        classId,
        subjectId,
        teacherId,
        periods: newP,
        note: existing?.note || ''
      });
    }

    onUpdateWeeklySchedule({
      ...currentWeekSchedule,
      assignments: updatedAssignments,
      updatedAt: Date.now()
    });
  };

  // Save modal edit
  const handleSaveModalEdit = () => {
    if (!editingAssignment) return;
    const { classId, subjectId, teacherId, periods, note } = editingAssignment;

    const updatedAssignments = currentWeekSchedule.assignments.filter(
      a => !(a.classId === classId && a.subjectId === subjectId)
    );

    if (periods > 0 || teacherId) {
      updatedAssignments.push({
        classId,
        subjectId,
        teacherId,
        periods,
        note
      });
    }

    onUpdateWeeklySchedule({
      ...currentWeekSchedule,
      assignments: updatedAssignments,
      updatedAt: Date.now()
    });

    setEditingAssignment(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportWeekExcel = () => {
    const rows: (string | number)[][] = [
      [config.schoolName.toUpperCase(), '', '', 'PHÂN CÔNG GIẢNG DẠY THỰC TẾ TUẦN ' + selectedWeek],
      [`NĂM HỌC ${config.academicYear} - ${currentSemester === 'HK1' ? 'HỌC KỲ I' : 'HỌC KỲ II'}`],
      [],
      ['STT', 'Lớp', 'Môn học', 'Giáo viên thực dạy tuần này', 'Mã GV', 'Số tiết thực dạy', 'Ghi chú']
    ];

    let stt = 1;
    filteredClasses.forEach(cls => {
      const cols = getColsForClass(cls);
      cols.forEach(col => {
        const item = currentAssignmentsMap.get(`${cls.id}_${col.id}`);
        if (item && item.periods > 0) {
          const t = teacherMap.get(item.teacherId);
          rows.push([
            stt++,
            cls.name,
            col.name,
            t ? t.name : '—',
            t ? t.code : '',
            item.periods,
            item.note || ''
          ]);
        }
      });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `TKB_Tuan_${selectedWeek}`);
    XLSX.writeFile(wb, `Phan_Cong_Tuan_${selectedWeek}_${config.academicYear.replace(/\s+/g, '')}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Top Banner & Title */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5 print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                <Calendar className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                  Phân Công Giảng Dạy & Thời Khóa Biểu Hàng Tuần
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Điều chỉnh số tiết nguyên thực tế hàng tuần theo phân phối GDPT 2018 (KHTN, Sử-Địa, GDĐP) • {config.academicYear}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              onClick={() => {
                if (!isAdmin) {
                  onPromptAdminLogin?.();
                  return;
                }
                if (window.confirm('Tự động tính toán & cân đối số tiết nguyên (1-2 tiết) cho KHTN Khối 8-9 và Lịch sử-Địa lí suốt 18 tuần để tổng kỳ khớp 100% tỷ lệ chuẩn?')) {
                  onAutoGenerateAllWeeks();
                }
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
              title="Cân đối tự động số tiết lẻ cho toàn bộ các tuần"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Tự Động Cân Đối 18 Tuần
            </button>

            <button
              onClick={() => {
                if (!isAdmin) {
                  onPromptAdminLogin?.();
                  return;
                }
                setCopyModalOpen(true);
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              Sao Chép Tuần
            </button>

            <button
              onClick={() => {
                if (!isAdmin) {
                  onPromptAdminLogin?.();
                  return;
                }
                if (window.confirm(`Khôi phục phân công Tuần ${selectedWeek} về định mức chuẩn ban đầu của học kỳ?`)) {
                  onResetWeekSchedule(selectedWeek);
                }
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Đặt Lại Tuần Này
            </button>

            <button
              onClick={handleExportWeekExcel}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-300 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Xuất Excel
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              In Bảng
            </button>
          </div>
        </div>

        {/* Week Selector Bar */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => {
                const idx = availableWeeks.indexOf(selectedWeek);
                if (idx > 0) setSelectedWeek(availableWeeks[idx - 1]);
              }}
              disabled={selectedWeek === availableWeeks[0]}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              {availableWeeks.map(wNum => {
                const isSelected = selectedWeek === wNum;
                return (
                  <button
                    key={wNum}
                    onClick={() => setSelectedWeek(wNum)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs scale-105'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Tuần {wNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                const idx = availableWeeks.indexOf(selectedWeek);
                if (idx < availableWeeks.length - 1) setSelectedWeek(availableWeeks[idx + 1]);
              }}
              disabled={selectedWeek === availableWeeks[availableWeeks.length - 1]}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 text-xs bg-indigo-50/70 border border-indigo-100 px-3 py-1.5 rounded-lg shrink-0">
            <span className="font-bold text-indigo-900">
              Đang chọn: <strong className="text-indigo-700">Tuần {selectedWeek}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-700">
              Tổng tiết thực dạy: <strong className="text-slate-900 font-extrabold">{weekStats.totalPeriods}</strong> tiết
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-700">
              Số GV tham gia: <strong className="text-slate-900 font-extrabold">{weekStats.teacherCount}</strong> GV
            </span>
          </div>
        </div>
      </div>

      {/* Info & Rule Notice */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">
            Quy tắc phân bổ số tiết nguyên môn tích hợp GDPT 2018 (KHTN Khối 8-9 & Lịch sử - Địa lí):
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-amber-800 pt-1">
            <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60">
              <span className="font-bold text-amber-950">KHTN Khối 8 (Lý 1.3 - Hóa 1.3 - Sinh 1.4):</span>
              <p className="text-slate-600 mt-0.5">Xoay vòng 3 tuần: (1-2-1), (2-1-1), (1-1-2) tiết/tuần. Tổng 18 tuần đạt đúng 72 tiết.</p>
            </div>
            <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60">
              <span className="font-bold text-amber-950">KHTN Khối 9 (Lý 1.3 - Hóa 1.7 - Sinh 1.0):</span>
              <p className="text-slate-600 mt-0.5">Sinh học cố định 1t/tuần; Lý xoay 1-2-1; Hóa xoay 2-1-2 tiết/tuần. Tổng 18 tuần đạt đúng 72 tiết.</p>
            </div>
            <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60">
              <span className="font-bold text-amber-950">Lịch sử & Địa lí (Sử 1.5 - Địa 1.5):</span>
              <p className="text-slate-600 mt-0.5">Tuần lẻ: Sử 2t, Địa 1t; Tuần chẵn: Sử 1t, Địa 2t (Tổng 3t/tuần, 54t/kỳ).</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> Điểm trường:
          </span>
          {[
            { key: 'ALL', label: 'Tất cả cơ sở' },
            { key: 'DBK', label: 'THCS Đốc Binh Kiều' },
            { key: 'TK', label: 'THCS Tân Kiều' },
            { key: 'THPT', label: 'Khối THPT' }
          ].map(c => (
            <button
              key={c.key}
              onClick={() => setSelectedCampus(c.key as CampusFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                selectedCampus === c.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Khối:</span>
          <select
            value={selectedGrade}
            onChange={e => setSelectedGrade(e.target.value)}
            className="text-xs font-bold px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
          >
            <option value="ALL">Tất cả các khối</option>
            <option value="6">Khối 6</option>
            <option value="7">Khối 7</option>
            <option value="8">Khối 8</option>
            <option value="9">Khối 9</option>
            <option value="10">Khối 10</option>
            <option value="11">Khối 11</option>
            <option value="12">Khối 12</option>
          </select>

          <input
            type="text"
            placeholder="Tìm lớp (VD: 8A1, 10A1)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 w-44"
          />
        </div>
      </div>

      {/* Main Weekly Timetable Grid Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Printable Official Header */}
        <div className="hidden print:block text-center py-4 border-b border-slate-200">
          <div className="font-bold text-xs uppercase">{config.schoolName}</div>
          <div className="font-extrabold text-base uppercase mt-1">
            BẢNG PHÂN CÔNG GIẢNG DẠY VÀ THỜI KHÓA BIỂU - TUẦN {selectedWeek}
          </div>
          <div className="text-xs italic mt-0.5">
            {currentSemester === 'HK1' ? 'Học kỳ I' : 'Học kỳ II'} - Năm học {config.academicYear} (Chương trình GDPT 2018)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800 text-white font-bold text-[11px]">
                <th className="p-2 border border-slate-700 w-10">STT</th>
                <th className="p-2 border border-slate-700 w-16 text-left">Lớp</th>
                <th className="p-2 border border-slate-700 w-24">Cơ sở</th>
                <th className="p-2 border border-slate-700">Chi tiết phân công & số tiết thực dạy Tuần {selectedWeek}</th>
                <th className="p-2 border border-slate-700 w-20">Tổng tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredClasses.map((cls, idx) => {
                const cols = getColsForClass(cls);
                let classTotalPeriods = 0;

                const colsData = cols.map(col => {
                  const key = `${cls.id}_${col.id}`;
                  const item = currentAssignmentsMap.get(key);
                  const baseA = baseAssignmentMap.get(key);
                  const periods = item ? item.periods : (baseA ? getRecommendedIntegerPeriods(col.id, cls.grade, selectedWeek, baseA.periodsPerWeek) : 0);
                  const teacherId = item?.teacherId || baseA?.teacherId || '';
                  const teacher = teacherMap.get(teacherId);

                  if (periods > 0) {
                    classTotalPeriods += periods;
                  }

                  return {
                    col,
                    item,
                    baseA,
                    periods,
                    teacherId,
                    teacher
                  };
                });

                // Is KHTN Grade 8 or 9? Verify total KHTN sum
                const isKhtn89 = cls.grade === '8' || cls.grade === '9';
                const khtnSum = isKhtn89
                  ? colsData
                      .filter(c => ['sub-li', 'sub-hoa', 'sub-sinh'].includes(c.col.id))
                      .reduce((sum, c) => sum + c.periods, 0)
                  : 0;

                return (
                  <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-2 border border-slate-200 text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="p-2 border border-slate-200 font-black text-slate-900 text-left bg-slate-50/50">
                      <div className="flex items-center gap-1.5">
                        <span>{cls.name}</span>
                        {isKhtn89 && (
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                              khtnSum === 4 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                            title={`Tổng KHTN trong tuần: ${khtnSum}/4 tiết`}
                          >
                            KHTN:{khtnSum}t
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-2 border border-slate-200 text-[11px] text-slate-500 font-medium">
                      {cls.level === 'THPT' ? 'THPT' : (cls.campus === 'THCSTK' || (!cls.campus && parseInt(cls.name.replace(/[^0-9]/g, '').slice(1), 10) > 6) ? 'Tân Kiều' : 'Đốc Binh Kiều')}
                    </td>
                    <td className="p-2 border border-slate-200 text-left">
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5">
                        {colsData.map(({ col, periods, teacher, teacherId, item }) => {
                          const hasTeacher = Boolean(teacher);
                          const isSpecialKhtn = ['sub-li', 'sub-hoa', 'sub-sinh'].includes(col.id);

                          return (
                            <div
                              key={col.id}
                              className={`p-1.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                                periods > 0
                                  ? isSpecialKhtn
                                    ? 'bg-amber-50/70 border-amber-200'
                                    : 'bg-slate-50/90 border-slate-200'
                                  : 'bg-slate-100/40 border-dashed border-slate-200 opacity-60'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1">
                                <span className="truncate" title={col.name}>{col.name}</span>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                                    periods > 0
                                      ? 'bg-indigo-100 text-indigo-800'
                                      : 'bg-slate-200 text-slate-500'
                                  }`}
                                >
                                  {periods}t
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-1">
                                <button
                                  onClick={() => {
                                    if (isAdmin) {
                                      setEditingAssignment({
                                        classId: cls.id,
                                        subjectId: col.id,
                                        teacherId,
                                        periods,
                                        note: item?.note || ''
                                      });
                                    } else {
                                      onPromptAdminLogin?.();
                                    }
                                  }}
                                  className="text-[11px] font-bold text-slate-800 hover:text-indigo-600 truncate flex-1 text-left cursor-pointer"
                                  title={teacher ? `${teacher.name} (${teacher.code}) - Bấm để đổi giáo viên/ghi chú` : 'Chưa phân công'}
                                >
                                  {teacher ? teacher.code : <span className="text-slate-300 italic">—</span>}
                                </button>

                                {/* Quick + / - adjustment controls (Admin only) */}
                                {isAdmin && (
                                  <div className="flex items-center gap-0.5 print:hidden">
                                    <button
                                      onClick={() => handleQuickAdjustPeriods(cls.id, col.id, -1)}
                                      disabled={periods <= 0}
                                      className="p-0.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded border border-slate-200 disabled:opacity-30 cursor-pointer"
                                      title="Giảm 1 tiết"
                                    >
                                      <Minus className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      onClick={() => handleQuickAdjustPeriods(cls.id, col.id, 1)}
                                      className="p-0.5 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded border border-slate-200 cursor-pointer"
                                      title="Tăng 1 tiết"
                                    >
                                      <Plus className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {item?.note && (
                                <div className="text-[9px] italic text-amber-700 truncate mt-0.5 font-medium">
                                  *{item.note}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-2 border border-slate-200 font-extrabold text-slate-900 bg-slate-50/50">
                      <span className="px-2 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-md font-mono">
                        {classTotalPeriods}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Printable Official Footer */}
        <div className="hidden print:grid grid-cols-2 pt-8 pb-4 text-center text-xs">
          <div>
            <div className="uppercase font-bold text-slate-900 mb-14">NGƯỜI LẬP BẢNG</div>
            <div className="font-bold text-slate-900">{config.vicePrincipalName || 'Nguyễn Minh Trí'}</div>
          </div>
          <div>
            <div className="italic text-slate-500 font-normal mb-1">
              Đốc Binh Kiều, ngày ..... tháng ..... năm 2026
            </div>
            <div className="uppercase font-bold text-slate-900 mb-14">HIỆU TRƯỞNG</div>
            <div className="font-extrabold text-slate-900">{config.principalName || 'Lê Thanh Cường'}</div>
          </div>
        </div>
      </div>

      {/* Copy Week Schedule Modal */}
      {copyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Copy className="w-4 h-4 text-indigo-600" />
              Sao Chép Phân Công Sang Tuần {selectedWeek}
            </h3>
            <p className="text-xs text-slate-600">
              Chọn tuần nguồn muốn sao chép toàn bộ số tiết và giáo viên sang <strong>Tuần {selectedWeek}</strong>:
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Sao chép từ tuần:</label>
              <select
                value={copySourceWeek}
                onChange={e => setCopySourceWeek(Number(e.target.value))}
                className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              >
                {availableWeeks
                  .filter(w => w !== selectedWeek)
                  .map(w => (
                    <option key={w} value={w}>
                      Tuần {w}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCopyModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  onCopyWeekSchedule(copySourceWeek, selectedWeek);
                  setCopyModalOpen(false);
                }}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs"
              >
                Xác nhận sao chép
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Single Assignment Cell Modal */}
      {editingAssignment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-indigo-600" />
              Điều Chỉnh Tiết & Giáo Viên - Tuần {selectedWeek}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Giáo viên phụ trách:</label>
                <select
                  value={editingAssignment.teacherId}
                  onChange={e =>
                    setEditingAssignment({ ...editingAssignment, teacherId: e.target.value })
                  }
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium"
                >
                  <option value="">-- Bỏ phân công --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code}) - {t.departmentId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Số tiết thực dạy trong Tuần {selectedWeek} (số nguyên):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={editingAssignment.periods}
                    onChange={e =>
                      setEditingAssignment({
                        ...editingAssignment,
                        periods: Math.max(0, parseInt(e.target.value, 10) || 0)
                      })
                    }
                    className="w-24 p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-extrabold text-center text-sm"
                  />
                  <span className="text-slate-500">tiết/tuần</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Ghi chú (tùy chọn):</label>
                <input
                  type="text"
                  placeholder="VD: Dạy thay cô X, Bù 1 tiết tuần trước..."
                  value={editingAssignment.note || ''}
                  onChange={e =>
                    setEditingAssignment({ ...editingAssignment, note: e.target.value })
                  }
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingAssignment(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveModalEdit}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
