import React, { useState, useMemo, useEffect } from 'react';
import {
  Teacher,
  Department,
  ClassGroup,
  Subject,
  SchoolConfig,
  TimetableSlot,
} from '../types';
import {
  ExamPeriodType,
  ExamSessionConfig,
  InvigilatorAssignment,
  MIDTERM_1_SESSIONS,
  isExcludedFromInvigilation,
  getEligibleInvigilatorsRankedByDeficit,
  generateAutoInvigilationAssignments,
  calculateTeacherInvigilationSummaries,
  TeacherInvigilationSummary,
} from '../utils/examInvigilationHelper';
import { exportUserTemplateAllocationExcel } from '../utils/examAdministrativeExportHelper';
import {
  Users,
  ShieldCheck,
  Calendar,
  FileSpreadsheet,
  Printer,
  Sparkles,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  Filter,
  ArrowUpDown,
  UserCheck,
  Building2,
  Save,
  Check,
  Info,
  Edit3,
  X,
} from 'lucide-react';

interface ExamInvigilationViewProps {
  teachers: Teacher[];
  departments: Department[];
  classes: ClassGroup[];
  subjects: Subject[];
  config: SchoolConfig;
  slots?: TimetableSlot[];
  activePeriod?: ExamPeriodType;
  initialSubTab?: 'TEMPLATE_VIEW' | 'DAILY_SCHEDULE' | 'PERIOD_AUDIT';
  onShowToast?: (msg: string) => void;
}

const STORAGE_INVIGILATION_KEY = 'docbinhkieu_exam_invigilation_assignments_v2';

export const ExamInvigilationView: React.FC<ExamInvigilationViewProps> = ({
  teachers,
  departments,
  classes,
  subjects,
  config,
  slots,
  activePeriod = 'GK1',
  initialSubTab = 'TEMPLATE_VIEW',
  onShowToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'TEMPLATE_VIEW' | 'DAILY_SCHEDULE' | 'PERIOD_AUDIT'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  const [periodRatio, setPeriodRatio] = useState<number>(2.5); // 2.5 tiết quy đổi / 1 buổi coi
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string>('ALL');

  // Load saved assignments or generate auto assignments
  const [assignmentsMap, setAssignmentsMap] = useState<Record<string, InvigilatorAssignment[]>>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_INVIGILATION_KEY}_${activePeriod}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          // Kiểm tra tính hợp lệ: 100% giáo viên phải thuộc Điểm chính (THPTDBK)
          const teacherMap = new Map(teachers.map(t => [t.id, t]));
          let hasInvalidTeacher = false;
          for (const sId of Object.keys(parsed)) {
            const list: InvigilatorAssignment[] = parsed[sId] || [];
            for (const item of list) {
              const t = teacherMap.get(item.teacherId);
              if (t && (t.campus !== 'THPTDBK' || isExcludedFromInvigilation(t))) {
                hasInvalidTeacher = true;
                break;
              }
            }
            if (hasInvalidTeacher) break;
          }
          if (!hasInvalidTeacher) {
            return parsed;
          }
        }
      }
    } catch { /* ignore */ }
    return generateAutoInvigilationAssignments(teachers, departments, classes, config, slots);
  });

  // Modal to change teacher for an assignment slot
  const [editingSlot, setEditingSlot] = useState<{
    sessionId: string;
    index: number;
    currentTeacherId: string;
    role: 'ROOM' | 'HALLWAY';
    roomOrHallwayNumber: string;
  } | null>(null);
  const [teacherPickerSearch, setTeacherPickerSearch] = useState('');

  // Eligible teachers ranked by deficit
  const rankedTeachers = useMemo(() => {
    return getEligibleInvigilatorsRankedByDeficit(teachers, departments, classes, config, slots);
  }, [teachers, departments, classes, config, slots]);

  // Summaries & period conversions
  const summaries = useMemo(() => {
    return calculateTeacherInvigilationSummaries(teachers, departments, classes, config, assignmentsMap, periodRatio);
  }, [teachers, departments, classes, config, assignmentsMap, periodRatio]);

  // Save to local storage
  const handleSave = () => {
    try {
      localStorage.setItem(`${STORAGE_INVIGILATION_KEY}_${activePeriod}`, JSON.stringify(assignmentsMap));
      if (onShowToast) onShowToast('Đã lưu bảng phân công giáo viên coi kiểm tra thành công!');
    } catch (e) {
      if (onShowToast) onShowToast('Lỗi khi lưu bảng phân công!');
    }
  };

  // Re-generate auto assignments
  const handleAutoAssign = () => {
    if (window.confirm('Hệ thống sẽ tính toán lại toàn bộ danh sách 140 suất coi kiểm tra (17 GV/buổi sáng, 11 GV/buổi chiều) ưu tiên theo giáo viên âm nhiều tiết nhất trường và loại trừ 100% giáo viên Tin học. Bạn có chắc chắn muốn chạy lại?')) {
      const generated = generateAutoInvigilationAssignments(teachers, departments, classes, config, slots);
      setAssignmentsMap(generated);
      try {
        localStorage.setItem(`${STORAGE_INVIGILATION_KEY}_${activePeriod}`, JSON.stringify(generated));
      } catch { /* ignore */ }
      if (onShowToast) onShowToast('Đã tự động chọn xong danh sách giáo viên coi kiểm tra theo đúng quy tắc!');
    }
  };

  // 1. Data rows for Khối 11 & 12 (Buổi Sáng) matching image_75b88b45.png
  // 17 giám thị mỗi buổi (hoặc theo số phòng thi tổ hợp)
  const morningTableRows = useMemo(() => {
    // Map subjects to the 5 morning sessions:
    // T2 sáng: Ngữ văn (17 GT) + Vật lí (13 GT) -> Danh sách 17 GV của buổi T2 sáng
    // T3 sáng: Toán (17 GT) + Sinh học (8 GT) -> Danh sách 17 GV của buổi T3 sáng
    // T4 sáng: Tiếng Anh (17 GT) + Địa lí (14 GT) -> Danh sách 17 GV của buổi T4 sáng
    // T5 sáng: Hóa học (7 GT), GDKT&PL (10 GT), Tin học (14 GT), Công nghệ (3 GT) -> Danh sách 17 GV của buổi T5 sáng
    // T6 sáng: Lịch sử (17 GT) -> Danh sách 17 GV của buổi T6 sáng
    const t2Sang = assignmentsMap['gk1-t2-sang'] || [];
    const t3Sang = assignmentsMap['gk1-t3-sang'] || [];
    const t4Sang = assignmentsMap['gk1-t4-sang'] || [];
    const t5Sang = assignmentsMap['gk1-t5-sang'] || [];
    const t6Sang = assignmentsMap['gk1-t6-sang'] || [];

    const formatList = (list: InvigilatorAssignment[], limit?: number) => {
      const target = limit ? list.slice(0, limit) : list;
      return target.map(a => `${a.teacherName} (${a.initialBalance < 0 ? `${a.initialBalance}t` : '0t'})`).join('; ');
    };

    return [
      {
        grade12: '12',
        subject12: 'NGỮ VĂN',
        rooms12: 8,
        grade11: '11',
        subject11: 'NGỮ VĂN',
        rooms11: 6,
        invigilators: 17,
        teachersList: formatList(t2Sang),
        dayName: 'Thứ Hai (02/11) - Sáng',
      },
      {
        grade12: '12',
        subject12: 'VẬT LÍ',
        rooms12: 5,
        grade11: '11',
        subject11: 'VẬT LÍ',
        rooms11: 6,
        invigilators: 13,
        teachersList: formatList(t2Sang, 13),
        dayName: 'Thứ Hai (02/11) - Sáng',
      },
      {
        grade12: '12',
        subject12: 'TOÁN',
        rooms12: 8,
        grade11: '11',
        subject11: 'TOÁN',
        rooms11: 6,
        invigilators: 17,
        teachersList: formatList(t3Sang),
        dayName: 'Thứ Ba (03/11) - Sáng',
      },
      {
        grade12: '12',
        subject12: 'SINH HỌC',
        rooms12: 4,
        grade11: '11',
        subject11: 'SINH HỌC',
        rooms11: 2,
        invigilators: 8,
        teachersList: formatList(t3Sang, 8),
        dayName: 'Thứ Ba (03/11) - Sáng',
      },
      {
        grade12: '12',
        subject12: 'TIẾNG ANH',
        rooms12: 8,
        grade11: '11',
        subject11: 'TIẾNG ANH',
        rooms11: 6,
        invigilators: 17,
        teachersList: formatList(t4Sang),
        dayName: 'Thứ Tư (04/11) - Sáng',
      },
      {
        grade12: '12',
        subject12: 'ĐỊA LÍ',
        rooms12: 7,
        grade11: '11',
        subject11: 'ĐỊA LÍ',
        rooms11: 4,
        invigilators: 14,
        teachersList: formatList(t4Sang, 14),
        dayName: 'Thứ Tư (04/11) - Sáng',
      },
      {
        grade12: '12',
        subject12: 'HÓA HỌC',
        rooms12: 2,
        grade11: '11',
        subject11: 'HÓA HỌC',
        rooms11: 3,
        invigilators: 7,
        teachersList: formatList(t5Sang, 7),
        dayName: 'Thứ Năm (05/11) - Sáng',
      },
      {
        grade12: '12',
        subject12: 'GDKT&PL',
        rooms12: 6,
        grade11: '11',
        subject11: 'GDKT&PL',
        rooms11: 3,
        invigilators: 10,
        teachersList: formatList(t5Sang.slice(7, 17)),
        dayName: 'Thứ Năm (05/11) - Sáng',
      },
      {
        grade12: '12',
        subject12: 'TIN HỌC',
        rooms12: 6,
        grade11: '11',
        subject11: 'TIN HỌC',
        rooms11: 6,
        invigilators: 14,
        teachersList: formatList(t5Sang, 14),
        dayName: 'Thứ Năm (05/11) - Sáng',
      },
      {
        grade12: '12',
        subject12: 'CÔNG NGHỆ',
        rooms12: 2,
        grade11: '11',
        subject11: 'CÔNG NGHỆ',
        rooms11: '',
        invigilators: 3,
        teachersList: formatList(t5Sang.slice(14, 17)),
        dayName: 'Thứ Năm (05/11) - Sáng',
      },
      {
        grade12: '12',
        subject12: 'LỊCH SỬ',
        rooms12: 8,
        grade11: '11',
        subject11: 'LỊCH SỬ',
        rooms11: 6,
        invigilators: 17,
        teachersList: formatList(t6Sang),
        dayName: 'Thứ Sáu (06/11) - Sáng',
      },
    ];
  }, [assignmentsMap]);

  // 2. Data rows for Khối 10 (Buổi Chiều) matching image_931a729d.png
  // 11 giám thị mỗi buổi (hoặc theo số phòng thi)
  const afternoonTableRows = useMemo(() => {
    const t2Chieu = assignmentsMap['gk1-t2-chieu'] || [];
    const t3Chieu = assignmentsMap['gk1-t3-chieu'] || [];
    const t4Chieu = assignmentsMap['gk1-t4-chieu'] || [];
    const t5Chieu = assignmentsMap['gk1-t5-chieu'] || [];
    const t6Chieu = assignmentsMap['gk1-t6-chieu'] || [];

    const formatList = (list: InvigilatorAssignment[], limit?: number) => {
      const target = limit ? list.slice(0, limit) : list;
      return target.map(a => `${a.teacherName} (${a.initialBalance < 0 ? `${a.initialBalance}t` : '0t'})`).join('; ');
    };

    return [
      {
        grade10: '10',
        subject10: 'NGỮ VĂN',
        rooms10: 9,
        invigilators: 11,
        teachersList: formatList(t2Chieu),
        dayName: 'Thứ Hai (02/11) - Chiều',
      },
      {
        grade10: '10',
        subject10: 'VẬT LÍ',
        rooms10: 9,
        invigilators: 11,
        teachersList: formatList(t2Chieu),
        dayName: 'Thứ Hai (02/11) - Chiều',
      },
      {
        grade10: '10',
        subject10: 'TOÁN',
        rooms10: 9,
        invigilators: 11,
        teachersList: formatList(t3Chieu),
        dayName: 'Thứ Ba (03/11) - Chiều',
      },
      {
        grade10: '10',
        subject10: 'SINH HỌC',
        rooms10: 2,
        invigilators: 3,
        teachersList: formatList(t3Chieu, 3),
        dayName: 'Thứ Ba (03/11) - Chiều',
      },
      {
        grade10: '10',
        subject10: 'TIẾNG ANH',
        rooms10: 9,
        invigilators: 11,
        teachersList: formatList(t4Chieu),
        dayName: 'Thứ Tư (04/11) - Chiều',
      },
      {
        grade10: '10',
        subject10: 'ĐỊA LÍ',
        rooms10: 7,
        invigilators: 9,
        teachersList: formatList(t4Chieu, 9),
        dayName: 'Thứ Tư (04/11) - Chiều',
      },
      {
        grade10: '10',
        subject10: 'HÓA HỌC',
        rooms10: 3,
        invigilators: 4,
        teachersList: formatList(t5Chieu, 4),
        dayName: 'Thứ Năm (05/11) - Chiều',
      },
      {
        grade10: '10',
        subject10: 'GDKT&PL',
        rooms10: 6,
        invigilators: 8,
        teachersList: formatList(t5Chieu.slice(3, 11)),
        dayName: 'Thứ Năm (05/11) - Chiều',
      },
      {
        grade10: '10',
        subject10: 'TIN HỌC',
        rooms10: 9,
        invigilators: 11,
        teachersList: formatList(t5Chieu),
        dayName: 'Thứ Năm (05/11) - Chiều',
      },
      {
        grade10: '10',
        subject10: 'CÔNG NGHỆ',
        rooms10: '',
        invigilators: 0,
        teachersList: 'Kiểm tra tại lớp theo TKB',
        dayName: 'Kiểm tra tại lớp',
      },
      {
        grade10: '10',
        subject10: 'LỊCH SỬ',
        rooms10: 9,
        invigilators: 11,
        teachersList: formatList(t6Chieu),
        dayName: 'Thứ Sáu (06/11) - Chiều',
      },
    ];
  }, [assignmentsMap]);

  // Export Excel
  const handleExportExcel = async () => {
    try {
      const sessionPlans = MIDTERM_1_SESSIONS.map(sConf => ({
        sessionName: sConf.sessionName,
        dayName: sConf.dayName,
        dateStr: sConf.dateStr,
        targetGrade: sConf.targetGrade,
        subjects: sConf.examSubjects,
        invigilators: (assignmentsMap[sConf.id] || []).map(a => ({
          role: a.role === 'ROOM' ? 'Phòng thi' : 'Hành lang',
          numberStr: a.roomOrHallwayNumber,
          name: a.teacherName,
          code: a.teacherCode,
          department: a.departmentName,
          balance: a.initialBalance,
        })),
      }));

      await exportUserTemplateAllocationExcel(
        config.academicYear || '2026 - 2027',
        morningTableRows,
        afternoonTableRows,
        sessionPlans
      );
      if (onShowToast) onShowToast('Đã xuất file Excel phân bổ giáo viên coi kiểm tra thành công!');
    } catch (e) {
      if (onShowToast) onShowToast('Lỗi khi xuất file Excel!');
    }
  };

  // Replace a teacher in a session slot
  const handleSelectTeacher = (replacementTeacher: Teacher) => {
    if (!editingSlot) return;
    const { sessionId, index } = editingSlot;
    const currentList = [...(assignmentsMap[sessionId] || [])];
    if (index >= 0 && index < currentList.length) {
      const wl = rankedTeachers.find(r => r.teacher.id === replacementTeacher.id);
      currentList[index] = {
        ...currentList[index],
        teacherId: replacementTeacher.id,
        teacherName: replacementTeacher.name,
        teacherCode: replacementTeacher.code,
        departmentName: wl?.workload?.departmentName || 'Chuyên môn',
        initialBalance: wl?.balance || 0,
      };
      setAssignmentsMap(prev => ({
        ...prev,
        [sessionId]: currentList,
      }));
    }
    setEditingSlot(null);
    setTeacherPickerSearch('');
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-700 font-extrabold text-xs rounded-lg border border-amber-300">
                ⭐ KẾ HOẠCH 50/KH • TUẦN 9 (02/11 - 06/11/2026)
              </span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-md border border-blue-200">
                🏫 100% Nhân sự Điểm chính THPT (Không lấy từ 2 điểm THCS)
              </span>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-md border border-emerald-200">
                17 GV/Buổi Sáng • 11 GV/Buổi Chiều
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900 mt-1 uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Phân Công Giáo Viên Coi Kiểm Tra Giữa Học Kỳ 1 (Cấp THPT)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Toàn bộ nhân sự coi kiểm tra được lấy từ <b>Điểm chính (THPTĐBK)</b> • Tuyệt đối <b>không lấy nhân sự từ 2 điểm THCS</b> • Ưu tiên giáo viên <b>âm nhiều tiết nhất</b> coi nhiều buổi để bù định mức • <b>Loại trừ 100% giáo viên môn Tin học</b> (HK2 tăng tiết dạy môn Trí tuệ nhân tạo).
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              onClick={handleAutoAssign}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Tự động tính toán phân công theo độ âm tiết của giáo viên"
            >
              <Sparkles className="w-4 h-4" />
              Tự Động Chọn Theo Độ Âm Tiết
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Xuất file Excel gồm 2 bảng vàng mẫu của Thầy gửi và Lịch chi tiết 10 buổi"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Xuất Excel (Mẫu Thầy Gửi)
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="In bản phân công coi kiểm tra A4"
            >
              <Printer className="w-4 h-4" />
              In Bảng Phân Bổ
            </button>

            <button
              onClick={handleSave}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              Lưu Dữ Liệu
            </button>
          </div>
        </div>

        {/* Sub-tabs inside Invigilation module */}
        <div className="flex border-b border-slate-200 gap-2 pt-1">
          <button
            onClick={() => setActiveSubTab('TEMPLATE_VIEW')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'TEMPLATE_VIEW'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            1. Bảng Phân Bổ Mẫu (17 GV Sáng & 11 GV Chiều)
          </button>

          <button
            onClick={() => setActiveSubTab('DAILY_SCHEDULE')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'DAILY_SCHEDULE'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            2. Lịch Chi Tiết 10 Buổi (Thứ 2 - Thứ 6)
          </button>

          <button
            onClick={() => setActiveSubTab('PERIOD_AUDIT')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'PERIOD_AUDIT'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowUpDown className="w-4 h-4" />
            3. Kê Tiết Coi Kiểm Tra & Bù Định Mức
          </button>
        </div>
      </div>

      {/* 2. SUB-TAB 1: TEMPLATE VIEW (MATCHING USER IMAGES) */}
      {activeSubTab === 'TEMPLATE_VIEW' && (
        <div className="space-y-6">
          {/* A. BẢNG KHỐI 11 & 12 (BUỔI SÁNG) */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="bg-yellow-300 px-4 py-3 border-b border-yellow-400 text-center">
              <h3 className="text-base sm:text-lg font-black text-red-600 uppercase tracking-tight">
                PHÂN BỔ GIÁO VIÊN COI KIỂM TRA GIỮA KỲ 1 - KHỐI 11 & 12 (BUỔI SÁNG)
              </h3>
              <p className="text-xs text-slate-800 font-semibold mt-0.5">
                Mỗi buổi sáng thi 2 môn chung, bố trí <b>17 giáo viên</b> coi kiểm tra (14 phòng thi + 3 giám thị hành lang)
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-black text-slate-900 text-center divide-x divide-slate-300">
                    <th className="py-2.5 px-3 bg-emerald-100 text-emerald-950 w-16">KHỐI</th>
                    <th className="py-2.5 px-3 w-32">MÔN</th>
                    <th className="py-2.5 px-2 w-20">Số phòng</th>
                    <th className="py-2.5 px-3 bg-emerald-100 text-emerald-950 w-16">KHỐI</th>
                    <th className="py-2.5 px-3 w-32">MÔN</th>
                    <th className="py-2.5 px-2 w-20">Số phòng</th>
                    <th className="py-2.5 px-3 bg-yellow-200 text-slate-900 font-black w-24">Số giám thị</th>
                    <th className="py-2.5 px-4 text-red-700 text-left font-black">Họ và tên giáo viên coi kiểm tra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {morningTableRows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/40 transition-colors divide-x divide-slate-200">
                      <td className="py-2 px-3 text-center font-black bg-purple-50 text-purple-900">{r.grade12}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{r.subject12}</td>
                      <td className="py-2 px-2 text-center text-slate-700">{r.rooms12}</td>
                      <td className="py-2 px-3 text-center font-black bg-emerald-50 text-emerald-900">{r.grade11}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{r.subject11}</td>
                      <td className="py-2 px-2 text-center text-slate-700">{r.rooms11}</td>
                      <td className="py-2 px-3 text-center font-black text-amber-900 bg-yellow-100/60">{r.invigilators}</td>
                      <td className="py-2 px-4 text-slate-800 leading-relaxed font-medium">
                        {r.teachersList || <span className="text-slate-400 italic">Chưa xếp</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* B. BẢNG KHỐI 10 (BUỔI CHIỀU) */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="bg-yellow-300 px-4 py-3 border-b border-yellow-400 text-center">
              <h3 className="text-base sm:text-lg font-black text-red-600 uppercase tracking-tight">
                PHÂN BỔ GIÁO VIÊN COI KIỂM TRA GIỮA KỲ 1 - KHỐI 10 (BUỔI CHIỀU)
              </h3>
              <p className="text-xs text-slate-800 font-semibold mt-0.5">
                Mỗi buổi chiều kiểm tra Khối 10, bố trí <b>11 giáo viên</b> coi kiểm tra (9 phòng thi + 2 giám thị hành lang)
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-black text-slate-900 text-center divide-x divide-slate-300">
                    <th className="py-2.5 px-3 bg-emerald-100 text-emerald-950 w-20">KHỐI</th>
                    <th className="py-2.5 px-3 w-40 text-left">MÔN</th>
                    <th className="py-2.5 px-3 w-28">Số phòng</th>
                    <th className="py-2.5 px-3 bg-yellow-200 text-slate-900 font-black w-28">Số giám thị</th>
                    <th className="py-2.5 px-4 text-red-700 text-left font-black">Họ và tên giáo viên coi kiểm tra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {afternoonTableRows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/40 transition-colors divide-x divide-slate-200">
                      <td className="py-2 px-3 text-center font-black bg-emerald-50 text-emerald-900">{r.grade10}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{r.subject10}</td>
                      <td className="py-2 px-3 text-center text-slate-700">{r.rooms10}</td>
                      <td className="py-2 px-3 text-center font-black text-amber-900 bg-yellow-100/60">{r.invigilators}</td>
                      <td className="py-2 px-4 text-slate-800 leading-relaxed font-medium">
                        {r.teachersList || <span className="text-slate-400 italic">Chưa xếp</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. SUB-TAB 2: DAILY SCHEDULE (LỊCH 10 BUỔI CHI TIẾT) */}
      {activeSubTab === 'DAILY_SCHEDULE' && (
        <div className="space-y-4">
          {/* Session filter */}
          <div className="bg-white rounded-xl p-3 border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-700">Lọc buổi:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedSessionFilter('ALL')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedSessionFilter === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Tất cả 10 buổi (5 Sáng + 5 Chiều)
                </button>
                <button
                  onClick={() => setSelectedSessionFilter('SANG')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedSessionFilter === 'SANG'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  5 Buổi Sáng (K11, 12 - 17 GV)
                </button>
                <button
                  onClick={() => setSelectedSessionFilter('CHIEU')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedSessionFilter === 'CHIEU'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  5 Buổi Chiều (K10 - 11 GV)
                </button>
              </div>
            </div>

            <div className="text-xs font-bold text-slate-600">
              Tổng số lượt giám thị huy động: <span className="text-indigo-600 font-black">140 lượt</span> (85 sáng + 55 chiều)
            </div>
          </div>

          {/* Grid of sessions */}
          <div className="grid grid-cols-1 gap-4">
            {MIDTERM_1_SESSIONS.filter(s => {
              if (selectedSessionFilter === 'SANG') return s.session === 'SANG';
              if (selectedSessionFilter === 'CHIEU') return s.session === 'CHIEU';
              return true;
            }).map((sConf) => {
              const invigilators = assignmentsMap[sConf.id] || [];
              const isMorning = sConf.session === 'SANG';

              return (
                <div key={sConf.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isMorning ? 'bg-amber-50/80 border-amber-200' : 'bg-blue-50/80 border-blue-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl text-white font-black text-xs ${
                        isMorning ? 'bg-amber-600' : 'bg-blue-600'
                      }`}>
                        {sConf.dayName}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900">
                            {sConf.sessionName} • Ngày {sConf.dateStr} — {sConf.targetGrade}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isMorning ? 'bg-amber-200 text-amber-900' : 'bg-blue-200 text-blue-900'
                          }`}>
                            {invigilators.length} / {sConf.requiredInvigilators} Giám thị
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 font-medium">
                          Môn kiểm tra: <b>{sConf.examSubjects.join(' • ')}</b> ({sConf.roomCount} phòng thi + {sConf.hallwayCount} giám thị hành lang)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                      {invigilators.map((inv, idx) => {
                        const isHallway = inv.role === 'HALLWAY';
                        return (
                          <div
                            key={idx}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all hover:shadow-xs ${
                              isHallway
                                ? 'bg-purple-50/70 border-purple-200 text-purple-950'
                                : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
                                isHallway ? 'bg-purple-200 text-purple-900' : 'bg-slate-200 text-slate-800'
                              }`}>
                                {inv.roomOrHallwayNumber}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate text-slate-900">{inv.teacherName}</p>
                                <p className="text-[10px] text-slate-500 truncate">
                                  {inv.teacherCode} • {inv.departmentName}
                                  {inv.initialBalance < 0 && (
                                    <span className="text-rose-600 font-bold ml-1">({inv.initialBalance}t)</span>
                                  )}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => setEditingSlot({
                                sessionId: sConf.id,
                                index: idx,
                                currentTeacherId: inv.teacherId,
                                role: inv.role,
                                roomOrHallwayNumber: inv.roomOrHallwayNumber,
                              })}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Đổi giáo viên khác"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. SUB-TAB 3: PERIOD AUDIT & CONVERSION (KÊ TIẾT COI THI & BÙ ĐỊNH MỨC) */}
      {activeSubTab === 'PERIOD_AUDIT' && (
        <div className="space-y-4">
          {/* Overview KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Lượt Coi Thi</span>
              <p className="text-2xl font-black text-indigo-600 mt-1">140 lượt</p>
              <p className="text-[11px] text-slate-600 mt-0.5">85 lượt sáng (K11, 12) + 55 lượt chiều (K10)</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hệ Số Quy Đổi</span>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="5"
                  value={periodRatio}
                  onChange={e => setPeriodRatio(Number(e.target.value) || 2.5)}
                  className="w-16 px-2 py-1 text-base font-black text-slate-900 border border-slate-300 rounded-lg text-center"
                />
                <span className="text-xs font-bold text-slate-600">tiết / buổi coi</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">Quy đổi bù vào số tiết âm định mức</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">GV Được Bù Âm Tiết</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {summaries.filter(s => s.initialBalance < 0 && s.netBalanceAfter >= 0).length} / {summaries.filter(s => s.initialBalance < 0).length} GV
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">Đã bù đủ định mức sau coi thi</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">GV Tin Học Loại Trừ</span>
              <p className="text-2xl font-black text-slate-700 mt-1">100% (6/6 GV)</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Dành định mức cho môn AI ở HK2</p>
            </div>
          </div>

          {/* Table of summaries */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-tight">
                  Bảng Kê Tiết Coi Kiểm Tra Giữa Kỳ 1 & Cân Đối Định Mức
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Theo dõi số buổi coi thi thực tế, số tiết quy đổi và cân đối thừa/thiếu sau khi bù tiết.
                </p>
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm giáo viên..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-black text-slate-800 text-center">
                    <th className="py-2.5 px-3 w-12">STT</th>
                    <th className="py-2.5 px-3 text-left">Họ và tên giáo viên</th>
                    <th className="py-2.5 px-3">Mã GV</th>
                    <th className="py-2.5 px-3 text-left">Tổ chuyên môn</th>
                    <th className="py-2.5 px-3">Định mức</th>
                    <th className="py-2.5 px-3">Tiết dạy</th>
                    <th className="py-2.5 px-3 text-rose-700">Âm ban đầu</th>
                    <th className="py-2.5 px-3 bg-amber-50 text-amber-950">Số buổi coi</th>
                    <th className="py-2.5 px-3 bg-indigo-50 text-indigo-950">Tiết quy đổi</th>
                    <th className="py-2.5 px-3">Cân đối sau bù</th>
                    <th className="py-2.5 px-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summaries
                    .filter(s => {
                      if (!searchTerm.trim()) return true;
                      const term = searchTerm.toLowerCase();
                      return s.teacherName.toLowerCase().includes(term) || s.teacherCode.toLowerCase().includes(term);
                    })
                    .map((s, idx) => {
                      const isDeficit = s.initialBalance < 0;
                      const isBalanced = s.netBalanceAfter >= 0;

                      return (
                        <tr key={s.teacherId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3 text-center text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{s.teacherName}</td>
                          <td className="py-2 px-3 text-center text-slate-600">{s.teacherCode}</td>
                          <td className="py-2 px-3 text-slate-700">{s.departmentName}</td>
                          <td className="py-2 px-3 text-center font-semibold text-slate-600">{s.standardPeriods}</td>
                          <td className="py-2 px-3 text-center font-semibold text-slate-600">{s.teachingPeriods}</td>
                          <td className={`py-2 px-3 text-center font-black ${isDeficit ? 'text-rose-600 bg-rose-50/40' : 'text-slate-600'}`}>
                            {s.initialBalance > 0 ? `+${s.initialBalance}` : s.initialBalance}
                          </td>
                          <td className="py-2 px-3 text-center font-black bg-amber-50/50 text-amber-900">
                            {s.assignedSessionsCount} buổi
                          </td>
                          <td className="py-2 px-3 text-center font-black bg-indigo-50/50 text-indigo-900">
                            +{s.convertedPeriods} tiết
                          </td>
                          <td className={`py-2 px-3 text-center font-black ${
                            s.netBalanceAfter < 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}>
                            {s.netBalanceAfter > 0 ? `+${s.netBalanceAfter}` : s.netBalanceAfter}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {isDeficit && isBalanced ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Đã bù đủ
                              </span>
                            ) : isDeficit && !isBalanced ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                Còn thiếu {Math.abs(s.netBalanceAfter)}t
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                Bình thường
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL CHANGE TEACHER */}
      {editingSlot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Đổi Giáo Viên Coi Kiểm Tra</h3>
                <p className="text-xs text-slate-500">
                  Vị trí: <b>{editingSlot.roomOrHallwayNumber}</b> ({editingSlot.role === 'ROOM' ? 'Phòng thi' : 'Giám thị hành lang'})
                </p>
              </div>
              <button
                onClick={() => setEditingSlot(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên hoặc mã giáo viên..."
                value={teacherPickerSearch}
                onChange={e => setTeacherPickerSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {rankedTeachers
                .filter(r => {
                  if (!teacherPickerSearch.trim()) return true;
                  const term = teacherPickerSearch.toLowerCase();
                  return r.teacher.name.toLowerCase().includes(term) || r.teacher.code.toLowerCase().includes(term);
                })
                .map(r => {
                  const isCurrent = r.teacher.id === editingSlot.currentTeacherId;
                  return (
                    <button
                      key={r.teacher.id}
                      onClick={() => handleSelectTeacher(r.teacher)}
                      className={`w-full p-3 text-left flex items-center justify-between hover:bg-indigo-50 transition-colors cursor-pointer ${
                        isCurrent ? 'bg-indigo-50/80 font-bold' : ''
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">{r.teacher.name} ({r.teacher.code})</p>
                        <p className="text-[11px] text-slate-500">{r.workload.departmentName} • {r.workload.campus === 'THPTDBK' ? 'THPT' : 'THCS'}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          r.balance < 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {r.balance < 0 ? `${r.balance} tiết` : `+${r.balance} tiết`}
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setEditingSlot(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
