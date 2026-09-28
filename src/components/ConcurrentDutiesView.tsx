import React, { useState, useMemo } from 'react';
import {
  Teacher,
  ClassGroup,
  Department,
  SchoolConfig,
  WorkloadStats,
  Assignment
} from '../types';
import {
  Award,
  Search,
  Printer,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  Baby,
  GraduationCap,
  Briefcase,
  CheckCircle2,
  Info
} from 'lucide-react';
import { getTeacherDutiesList } from '../utils/workloadCalculator';
import { exportConcurrentDutiesExcel } from '../utils/excelHelper';

interface ConcurrentDutiesViewProps {
  teachers: Teacher[];
  classes: ClassGroup[];
  departments: Department[];
  config: SchoolConfig;
  workloads: WorkloadStats[];
  assignments?: Assignment[];
}

type DutyFilterCategory =
  | 'ALL_CONCURRENT'
  | 'HOMEROOM'
  | 'LEAD_ROLES'
  | 'ORGANIZATION'
  | 'CON_NHO'
  | 'ALL_TEACHERS';

export const ConcurrentDutiesView: React.FC<ConcurrentDutiesViewProps> = ({
  teachers,
  classes,
  departments,
  config,
  workloads,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DutyFilterCategory>('ALL_CONCURRENT');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedCampus, setSelectedCampus] = useState<string>('ALL');
  const [printFontSize, setPrintFontSize] = useState<'6.8pt' | '7.2pt' | '7.8pt'>('7.2pt');

  const deptMap = useMemo(() => new Map(departments.map(d => [d.id, d.name])), [departments]);
  const workloadMap = useMemo(() => new Map(workloads.map(w => [w.teacherId, w])), [workloads]);

  const homeroomMap = useMemo(() => {
    const map = new Map<string, ClassGroup>();
    classes.forEach(c => {
      if (c.homeroomTeacherId) {
        map.set(c.homeroomTeacherId, c);
      }
    });
    return map;
  }, [classes]);

  // Compute duty details for each teacher
  const enrichedTeachers = useMemo(() => {
    return teachers.map(teacher => {
      const isHT =
        teacher.id === 'tch-bgh-1' ||
        teacher.name === 'Lê Thanh Cường' ||
        teacher.code === 'Cường.LT (HT)' ||
        (teacher.role === 'HieuTruong' && teacher.name === 'Lê Thanh Cường');
      const isPHT =
        !isHT &&
        (teacher.id === 'tch-bgh-2' ||
          teacher.id === 'tch-bgh-3' ||
          teacher.id === 'tch-bgh-4' ||
          ['Nguyễn Minh Trí', 'Phan Thanh Thảo', 'Nguyễn Thanh Tòng'].includes(teacher.name) ||
          teacher.code === 'Trí.NM (PHT)' ||
          teacher.code === 'Thảo.PT (PHT)' ||
          teacher.code === 'Tòng.NT (PHT)');
      const isLeader = isHT || isPHT;

      const isTPT =
        teacher.id === 'tch-ls-12' ||
        teacher.name === 'Nguyễn Thị Lý' ||
        teacher.role === 'TongPhuTrachDoi' ||
        teacher.code?.includes('(TPT') ||
        teacher.duties?.some(d => d.type === 'TongPhuTrachDoi');

      const hrClass = homeroomMap.get(teacher.id);
      // Homeroom reduction: THPT = 3 or config, THCS = 4
      const hrReduction = isLeader
        ? 0
        : hrClass
        ? (hrClass.level === 'THCS' ? 4 : (config.homeroomReduction || 3))
        : 0;

      // Duties list & reduction
      const dutiesList = isLeader ? [] : getTeacherDutiesList(teacher);
      const dutyReduction = isLeader
        ? 0
        : dutiesList.reduce((sum, d) => sum + (d.reduction || 0), 0);

      const customReduction = isLeader ? 0 : (teacher.customReductionPeriods || 0);
      const totalReduction = hrReduction + dutyReduction + customReduction;

      // Base standard periods:
      // - Hiệu trưởng: 2t
      // - Phó Hiệu trưởng: 4t
      // - Tổng phụ trách Đội (Trường THCS Đốc Binh Kiều trên 28 lớp): Định mức 2 tiết/tuần (theo TT 28/2009 & TT 05/2025)
      // - GV THPT: 17t, GV THCS: 19t
      const baseStandard = isHT
        ? 2
        : isPHT
        ? 4
        : isTPT
        ? (teacher.baseStandardPeriods && teacher.baseStandardPeriods > 0 ? teacher.baseStandardPeriods : 2)
        : (teacher.campus === 'THPTDBK' ? 17 : 19);

      const targetPeriods = Math.max(0, baseStandard - totalReduction);

      const workload = workloadMap.get(teacher.id);
      const assignedPeriods = workload ? workload.assignedPeriods : 0;
      const balance = assignedPeriods - targetPeriods;

      const isHomeroom = Boolean(hrClass);
      const isToTruongOrPho = dutiesList.some(
        d => d.name.includes('Tổ trưởng') || d.name.includes('Tổ phó')
      );
      const isOrganization =
        isTPT ||
        dutiesList.some(
          d =>
            d.name.includes('Đoàn') ||
            d.name.includes('Đội') ||
            d.name.includes('Giáo vụ') ||
            d.name.includes('Phổ cập') ||
            d.name.includes('Công đoàn') ||
            d.name.includes('Thanh tra') ||
            d.name.includes('Thư ký')
        );
      const isConNho = dutiesList.some(d => d.name.includes('con nhỏ'));

      const hasConcurrentDuty =
        totalReduction > 0 ||
        isHomeroom ||
        dutiesList.length > 0 ||
        customReduction > 0 ||
        isTPT;

      return {
        ...teacher,
        isHT,
        isPHT,
        isLeader,
        isTPT,
        hrClass,
        hrReduction,
        dutiesList,
        dutyReduction,
        customReduction,
        totalReduction,
        baseStandard,
        targetPeriods,
        assignedPeriods,
        balance,
        isHomeroom,
        isToTruongOrPho,
        isOrganization,
        isConNho,
        hasConcurrentDuty
      };
    });
  }, [teachers, homeroomMap, workloadMap, config]);

  // Statistics
  const stats = useMemo(() => {
    const totalWithDuty = enrichedTeachers.filter(t => t.hasConcurrentDuty).length;
    const totalHomeroom = enrichedTeachers.filter(t => t.isHomeroom).length;
    const totalLeadRoles = enrichedTeachers.filter(t => t.isToTruongOrPho).length;
    const totalOrg = enrichedTeachers.filter(t => t.isOrganization).length;
    const totalConNho = enrichedTeachers.filter(t => t.isConNho).length;
    const totalReductionPeriods = enrichedTeachers.reduce((sum, t) => sum + t.totalReduction, 0);

    return {
      totalWithDuty,
      totalHomeroom,
      totalLeadRoles,
      totalOrg,
      totalConNho,
      totalReductionPeriods,
      totalTeachers: teachers.length
    };
  }, [enrichedTeachers, teachers.length]);

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    return enrichedTeachers.filter(t => {
      // Category filter
      if (selectedCategory === 'ALL_CONCURRENT' && !t.hasConcurrentDuty) return false;
      if (selectedCategory === 'HOMEROOM' && !t.isHomeroom) return false;
      if (selectedCategory === 'LEAD_ROLES' && !t.isToTruongOrPho) return false;
      if (selectedCategory === 'ORGANIZATION' && !t.isOrganization) return false;
      if (selectedCategory === 'CON_NHO' && !t.isConNho) return false;

      // Department filter
      if (selectedDept !== 'ALL' && t.departmentId !== selectedDept) return false;

      // Campus filter
      if (selectedCampus !== 'ALL') {
        if (selectedCampus === 'THPT' && t.campus !== 'THPTDBK') return false;
        if (selectedCampus === 'THCSDBK' && t.campus !== 'THCSDBK') return false;
        if (selectedCampus === 'THCSTK' && t.campus !== 'THCSTK') return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = t.name.toLowerCase().includes(term);
        const matchCode = (t.code || '').toLowerCase().includes(term);
        const matchClass = t.hrClass ? t.hrClass.name.toLowerCase().includes(term) : false;
        const matchDuty = t.dutiesList.some(d => d.name.toLowerCase().includes(term));
        const matchDept = (deptMap.get(t.departmentId) || '').toLowerCase().includes(term);
        return matchName || matchCode || matchClass || matchDuty || matchDept;
      }

      return true;
    });
  }, [enrichedTeachers, selectedCategory, selectedDept, selectedCampus, searchTerm, deptMap]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportConcurrentDutiesExcel(config, teachers, classes, departments, workloads);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5 print:max-w-none print:p-0 print:m-0">
      {/* Formal Administrative Header for Printing (Nghị định 30/2020/NĐ-CP) */}
      <div className="hidden print:block mb-4 text-black font-['Times_New_Roman',serif]">
        <table className="w-full border-none mb-3">
          <tbody>
            <tr className="align-top">
              <td className="w-1/2 text-center p-0 border-none">
                <div className="text-[11pt] uppercase tracking-normal">
                  SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP
                </div>
                <div className="text-[11pt] uppercase font-bold tracking-tight">
                  TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU
                </div>
                <div className="w-32 mx-auto my-1 border-b-2 border-black"></div>
              </td>
              <td className="w-1/2 text-center p-0 border-none">
                <div className="text-[11pt] uppercase font-bold">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </div>
                <div className="text-[11pt] font-bold">
                  Độc lập - Tự do - Hạnh phúc
                </div>
                <div className="w-40 mx-auto my-1 border-b-2 border-black"></div>
                <div className="text-[10pt] italic font-normal mt-1">
                  Đồng Tháp, ngày ..... tháng ..... năm 2026
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="text-center my-3">
          <h1 className="text-[14pt] font-bold uppercase tracking-wide">
            BẢNG TỔNG HỢP GIÁO VIÊN KIÊM NHIỆM & GIẢM ĐỊNH MỨC TIẾT DẠY
          </h1>
          <div className="text-[10pt] italic mt-0.5">
            Năm học {config.academicYear} • Căn cứ theo Thông tư 28/2009, TT 15/2020 và TT 05/2025 của Bộ GD&ĐT
          </div>
        </div>
      </div>

      {/* Screen Header Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
              <Award className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Danh Sách Giáo Viên Kiêm Nhiệm & Giảm Trừ Định Mức
              </h2>
              <p className="text-xs text-slate-500">
                Hiển thị toàn bộ giáo viên được hưởng chế độ giảm định mức tiết dạy (Bao gồm Giáo viên chủ nhiệm & Chức vụ kiêm nhiệm)
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Print Font Size Selector */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-600">
            <span className="font-semibold text-slate-500">Cỡ in:</span>
            <select
              value={printFontSize}
              onChange={e => setPrintFontSize(e.target.value as any)}
              className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer"
              title="Chọn cỡ chữ khi in ra PDF/máy in để tránh bị mất chữ"
            >
              <option value="6.8pt">6.8pt (Siêu gọn - không mất chữ)</option>
              <option value="7.2pt">7.2pt (Chuẩn A4 ngang)</option>
              <option value="7.8pt">7.8pt (Vừa vặn)</option>
            </select>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Chế độ xem (Chỉ đọc)</span>
          </span>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs transition-all cursor-pointer"
            title="In Báo Cáo theo thể thức văn bản hành chính (A4 nằm ngang)"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>In Báo Cáo</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-all cursor-pointer"
            title="Tải bảng danh sách kiêm nhiệm dạng Excel chuẩn thể thức văn bản"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Statistics Highlights Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
        <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
            <span>GV Kiêm Nhiệm</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-1 text-xl font-extrabold text-indigo-700">
            {stats.totalWithDuty} <span className="text-xs font-normal text-slate-500">/{stats.totalTeachers} GV</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Có giảm trừ định mức</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
            <span>GV Chủ Nhiệm</span>
            <GraduationCap className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1 text-xl font-extrabold text-emerald-700">
            {stats.totalHomeroom} <span className="text-xs font-normal text-slate-500">lớp</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Giảm -3t hoặc -4t/tuần</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
            <span>Tổ trưởng & Phó</span>
            <Briefcase className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-1 text-xl font-extrabold text-blue-700">
            {stats.totalLeadRoles} <span className="text-xs font-normal text-slate-500">GV</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">TT (-3t), TP (-1t)</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
            <span>Đoàn Thể & Khác</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-1 text-xl font-extrabold text-purple-700">
            {stats.totalOrg} <span className="text-xs font-normal text-slate-500">GV</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Đoàn, Đội, Giáo vụ, PC</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
            <span>Con Nhỏ (&lt;36T)</span>
            <Baby className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-1 text-xl font-extrabold text-rose-700">
            {stats.totalConNho} <span className="text-xs font-normal text-slate-500">cô</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Nữ GV nuôi con nhỏ</div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/60 p-3 rounded-lg border border-indigo-200 shadow-2xs">
          <div className="text-[11px] font-bold text-indigo-900 flex items-center justify-between">
            <span>Tổng Giảm Trừ</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-1 text-xl font-black text-indigo-950">
            {stats.totalReductionPeriods} <span className="text-xs font-bold text-indigo-700">tiết/tuần</span>
          </div>
          <div className="text-[10px] text-indigo-600/80 mt-0.5">Toàn trường / tuần</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-3 print:hidden">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <span>Lọc theo:</span>
          </span>

          {[
            { id: 'ALL_CONCURRENT', label: `Tất cả có kiêm nhiệm (${stats.totalWithDuty})` },
            { id: 'HOMEROOM', label: `Chủ nhiệm lớp GVCN (${stats.totalHomeroom})` },
            { id: 'LEAD_ROLES', label: `Tổ trưởng & Tổ phó (${stats.totalLeadRoles})` },
            { id: 'ORGANIZATION', label: `Đoàn thể & Công tác khác (${stats.totalOrg})` },
            { id: 'CON_NHO', label: `Nuôi con nhỏ (${stats.totalConNho})` },
            { id: 'ALL_TEACHERS', label: `Toàn bộ giáo viên (${stats.totalTeachers})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id as DutyFilterCategory)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dropdowns & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tên GV, mã, lớp CN, chức vụ..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 w-64 sm:w-72"
              />
            </div>

            {/* Department */}
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Tất cả tổ chuyên môn</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Campus */}
            <select
              value={selectedCampus}
              onChange={e => setSelectedCampus(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Tất cả điểm trường / Cấp</option>
              <option value="THPT">Cấp THPT (Điểm Đốc Binh Kiều)</option>
              <option value="THCSDBK">Cấp THCS (Điểm Đốc Binh Kiều)</option>
              <option value="THCSTK">Cấp THCS (Điểm Tân Kiều)</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-semibold">
            Hiển thị <span className="font-extrabold text-slate-900">{filteredTeachers.length}</span> giáo viên
          </div>
        </div>
      </div>

      {/* Main Table Document */}
      <div
        style={{ ['--print-font-size' as any]: printFontSize }}
        className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden print:border-none print:shadow-none print:rounded-none concurrent-print-container"
      >
        <div className="overflow-x-auto print:overflow-visible concurrent-print-table-wrapper">
          <table className="w-full text-xs text-left border-collapse print:table-fixed concurrent-print-table">
            <thead>
              <tr className="bg-slate-100/90 text-slate-800 font-bold border-b border-slate-300 print:bg-slate-200">
                <th className="p-2 border border-slate-300 text-center w-10 text-[11px] print:w-[3%] print:text-[var(--print-font-size)]">STT</th>
                <th className="p-2 border border-slate-300 text-center w-24 text-[11px] print:w-[6%] print:text-[var(--print-font-size)]">Mã GV</th>
                <th className="p-2 border border-slate-300 text-left min-w-[170px] text-[11px] print:w-[13%] print:text-[var(--print-font-size)]">Họ và Tên</th>
                <th className="p-2 border border-slate-300 text-center w-14 text-[11px] print:w-[4%] print:text-[var(--print-font-size)]">Phái</th>
                <th className="p-2 border border-slate-300 text-left min-w-[140px] text-[11px] print:w-[11%] print:text-[var(--print-font-size)]">Tổ Chuyên Môn</th>
                <th className="p-2 border border-slate-300 text-center w-28 text-[11px] print:w-[8%] print:text-[var(--print-font-size)]">Điểm Trường</th>
                <th className="p-2 border border-slate-300 text-center min-w-[130px] text-[11px] print:w-[9%] print:text-[var(--print-font-size)] bg-emerald-50/70 text-emerald-950">
                  Chủ Nhiệm Lớp (GVCN)
                </th>
                <th className="p-2 border border-slate-300 text-left min-w-[200px] text-[11px] print:w-[18%] print:text-[var(--print-font-size)] bg-indigo-50/60 text-indigo-950">
                  Chức Vụ & Kiêm Nhiệm Khác
                </th>
                <th className="p-2 border border-slate-300 text-center w-16 text-[11px] print:w-[5%] print:text-[var(--print-font-size)]">
                  ĐM Chuẩn
                </th>
                <th className="p-2 border border-slate-300 text-center w-20 text-[11px] print:w-[5.5%] print:text-[var(--print-font-size)] bg-purple-50 text-purple-950 font-extrabold">
                  Tổng Giảm
                </th>
                <th className="p-2 border border-slate-300 text-center w-20 text-[11px] print:w-[5.5%] print:text-[var(--print-font-size)] bg-amber-50 text-amber-950 font-extrabold">
                  ĐM Sau Giảm
                </th>
                <th className="p-2 border border-slate-300 text-center w-18 text-[11px] print:w-[5%] print:text-[var(--print-font-size)]">
                  Thực Dạy
                </th>
                <th className="p-2 border border-slate-300 text-center w-18 text-[11px] print:w-[5%] print:text-[var(--print-font-size)]">
                  Chênh Lệch
                </th>
                <th className="p-2 border border-slate-300 text-left min-w-[170px] text-[11px] print:hidden">
                  Căn Cứ Pháp Lý
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-slate-500 italic">
                    Không tìm thấy giáo viên nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((t, idx) => {
                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        t.totalReduction > 0 ? 'bg-white' : 'bg-slate-50/30'
                      }`}
                    >
                      {/* STT */}
                      <td className="p-2 border border-slate-300 text-center font-medium text-slate-500 text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Code */}
                      <td className="p-2 border border-slate-300 text-center font-bold text-slate-800 text-[11px]">
                        <span className="font-mono text-indigo-950">{t.code}</span>
                      </td>

                      {/* Name */}
                      <td className="p-2 border border-slate-300 text-left font-bold text-slate-900 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span>{t.name}</span>
                          {t.isLeader && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                              {t.isHT ? 'Hiệu trưởng' : 'Phó HT'}
                            </span>
                          )}
                          {t.isTPT && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-orange-100 text-orange-800 border border-orange-300">
                              TPT Đội (ĐM 2t)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Gender */}
                      <td className="p-2 border border-slate-300 text-center text-slate-600 text-[11px]">
                        {t.gender}
                      </td>

                      {/* Department */}
                      <td className="p-2 border border-slate-300 text-left text-slate-700 text-[11px]">
                        {deptMap.get(t.departmentId) || '—'}
                      </td>

                      {/* Campus */}
                      <td className="p-2 border border-slate-300 text-center text-[11px]">
                        <span
                          className={`font-semibold ${
                            t.campus === 'THPTDBK'
                              ? 'text-indigo-700'
                              : t.campus === 'THCSDBK'
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {t.campus === 'THPTDBK'
                            ? 'THPT ĐBK'
                            : t.campus === 'THCSDBK'
                            ? 'THCS ĐBK'
                            : 'THCS Tân Kiều'}
                        </span>
                      </td>

                      {/* Homeroom Assignment */}
                      <td className="p-2 border border-slate-300 text-center bg-emerald-50/20">
                        {t.hrClass ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="font-extrabold text-xs text-emerald-900 px-2 py-0.5 rounded bg-emerald-100/80 border border-emerald-300">
                              Lớp {t.hrClass.name}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 mt-0.5">
                              Giảm -{t.hrReduction} tiết/tuần
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Duties List */}
                      <td className="p-2 border border-slate-300 text-left bg-indigo-50/10">
                        {t.dutiesList.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {t.dutiesList.map((duty, dIdx) => (
                              <span
                                key={dIdx}
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${duty.badgeBg} ${duty.badgeColor}`}
                                title={duty.name}
                              >
                                <span>{duty.name}</span>
                                {duty.reduction > 0 ? (
                                  <span className="font-extrabold underline">
                                    (-{duty.reduction}t)
                                  </span>
                                ) : (
                                  <span className="font-semibold text-[9px] px-1 rounded bg-orange-100 text-orange-900 border border-orange-200">
                                    ĐM 2t/tuần
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        ) : t.isLeader ? (
                          <span className="text-[10px] italic text-amber-700 font-medium">
                            Định mức BGH đặc thù
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Standard Base */}
                      <td className="p-2 border border-slate-300 text-center font-bold text-slate-700 text-xs">
                        {t.baseStandard}t
                      </td>

                      {/* Total Reduction */}
                      <td className="p-2 border border-slate-300 text-center bg-purple-50/70">
                        {t.totalReduction > 0 ? (
                          <span className="font-black text-xs text-purple-900 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-300">
                            -{t.totalReduction}t
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">0t</span>
                        )}
                      </td>

                      {/* Target Periods */}
                      <td className="p-2 border border-slate-300 text-center font-black text-xs text-slate-950 bg-amber-50/60">
                        {t.targetPeriods}t
                      </td>

                      {/* Actual Assigned */}
                      <td className="p-2 border border-slate-300 text-center font-bold text-xs text-slate-800">
                        {t.assignedPeriods}t
                      </td>

                      {/* Balance */}
                      <td className="p-2 border border-slate-300 text-center font-extrabold text-xs">
                        {t.balance > 0 ? (
                          <span className="text-emerald-700">+{t.balance}t</span>
                        ) : t.balance < 0 ? (
                          <span className="text-rose-600">{t.balance}t</span>
                        ) : (
                          <span className="text-slate-500">0t</span>
                        )}
                      </td>

                      {/* Legal Basis */}
                      <td className="p-2 border border-slate-300 text-left text-[10px] text-slate-500 print:hidden">
                        {t.isLeader ? (
                          <span>TT 28/2009 & TT 15/2017</span>
                        ) : t.isTPT ? (
                          <div>• TPT Đội: ĐM 2t/tuần (TT 28/2009 & TT 05/2025)</div>
                        ) : t.totalReduction > 0 ? (
                          <div className="space-y-0.5">
                            {t.isHomeroom && <div>• GVCN: TT 28/2009</div>}
                            {t.isToTruongOrPho && <div>• Tổ CM: TT 15/2020</div>}
                            {t.isOrganization && <div>• Đoàn/Đội/PC: TT 05/2025</div>}
                            {t.isConNho && <div>• Con nhỏ: TT 28/2009</div>}
                          </div>
                        ) : (
                          <span>Định mức chuẩn GVBM</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Regulatory notes footer in webapp */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-slate-500 text-[11px] flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>
              Căn cứ pháp lý: <strong>Thông tư 28/2009/TT-BGDĐT</strong>, <strong>Thông tư 15/2020/TT-BGDĐT</strong> và <strong>Thông tư 05/2025/TT-BGDĐT</strong> quy định chế độ làm việc đối với giáo viên phổ thông.
            </span>
          </div>
          <div className="shrink-0 font-bold text-slate-700">
            Tổng {filteredTeachers.length} hồ sơ
          </div>
        </div>
      </div>

      {/* Formal Administrative Signatures for Printing (Nghị định 30/2020/NĐ-CP) */}
      <div className="hidden print:block mt-8 pt-4 border-t border-black text-black font-['Times_New_Roman',serif]">
        <div className="grid grid-cols-2 text-center text-[11pt]">
          <div>
            <div className="font-bold uppercase mb-16">NGƯỜI LẬP BẢNG</div>
            <div className="font-bold">{config.vicePrincipalName || 'Nguyễn Minh Trí'}</div>
          </div>
          <div>
            <div className="italic text-[10pt] mb-1">
              Đồng Tháp, ngày ..... tháng ..... năm 2026
            </div>
            <div className="font-bold uppercase mb-16">HIỆU TRƯỞNG</div>
            <div className="font-bold">{config.principalName || 'Lê Thanh Cường'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
