import React, { useState, useMemo } from 'react';
import {
  SchoolConfig,
  Teacher,
  Department,
  ClassGroup,
  Subject,
  WeeklySchedule,
  TeacherWeeklyWorkload,
  WorkloadStats
} from '../types';
import {
  WEEKS_HK1,
  WEEKS_HK2,
  calculateTeacherWeeklyWorkloads,
  exportWeeklyWorkloadExcel
} from '../utils/weeklyScheduleHelper';
import {
  Search,
  Printer,
  FileSpreadsheet,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Eye,
  UserCheck,
  Building2,
  BookOpen,
  ChevronRight,
  X,
  Layers
} from 'lucide-react';

interface WeeklyTeachingLogViewProps {
  config: SchoolConfig;
  teachers: Teacher[];
  departments: Department[];
  classes: ClassGroup[];
  subjects: Subject[];
  weeklySchedules: WeeklySchedule[];
  baseWorkloads: WorkloadStats[];
  isAdmin?: boolean;
  onOpenWeeklyScheduleManager?: () => void;
}

type StatusFilter = 'ALL' | 'SURPLUS' | 'EXACT' | 'DEFICIT';
type CampusFilter = 'ALL' | 'THPT' | 'DBK' | 'TK';

export const WeeklyTeachingLogView: React.FC<WeeklyTeachingLogViewProps> = ({
  config,
  teachers,
  departments,
  classes,
  subjects,
  weeklySchedules,
  baseWorkloads,
  isAdmin = false,
  onOpenWeeklyScheduleManager
}) => {
  const currentSemester = config.semester || 'HK1';
  const weeks = currentSemester === 'HK1' ? WEEKS_HK1 : WEEKS_HK2;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedCampus, setSelectedCampus] = useState<CampusFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedTeacherForDetail, setSelectedTeacherForDetail] = useState<TeacherWeeklyWorkload | null>(null);

  // Compute all teachers' weekly workloads across all weeks
  const allWeeklyWorkloads = useMemo(() => {
    return calculateTeacherWeeklyWorkloads(
      teachers,
      departments,
      classes,
      subjects,
      weeklySchedules,
      currentSemester,
      baseWorkloads
    );
  }, [teachers, departments, classes, subjects, weeklySchedules, currentSemester, baseWorkloads]);

  // Overall statistics
  const summaryStats = useMemo(() => {
    let totalActualAll = 0;
    let totalRequiredAll = 0;
    let totalCurrentRequiredAll = 0;
    let surplusCount = 0;
    let exactCount = 0;
    let deficitCount = 0;

    allWeeklyWorkloads.forEach(w => {
      totalActualAll += w.totalActualPeriods;
      totalRequiredAll += w.totalRequiredPeriods;
      totalCurrentRequiredAll += w.currentRequiredPeriods;

      if (w.currentBalance > 0) surplusCount++;
      else if (w.currentBalance === 0) exactCount++;
      else deficitCount++;
    });

    const activeWeeks = allWeeklyWorkloads[0]?.activeWeeksCount || 0;

    return {
      totalActualAll,
      totalRequiredAll,
      totalCurrentRequiredAll,
      totalCurrentBalance: totalActualAll - totalCurrentRequiredAll,
      surplusCount,
      exactCount,
      deficitCount,
      activeWeeks,
      avgPeriodsPerWeek: (totalActualAll / Math.max(1, allWeeklyWorkloads.length * Math.max(1, activeWeeks))).toFixed(1)
    };
  }, [allWeeklyWorkloads]);

  // Filter workloads
  const filteredWorkloads = useMemo(() => {
    return allWeeklyWorkloads.filter(w => {
      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchName = w.teacherName.toLowerCase().includes(term);
        const matchCode = w.teacherCode.toLowerCase().includes(term);
        if (!matchName && !matchCode) return false;
      }

      // Department
      if (selectedDept !== 'ALL' && w.departmentId !== selectedDept) return false;

      // Campus
      if (selectedCampus === 'THPT' && (!w.campus || !w.campus.includes('THPT'))) return false;
      if (selectedCampus === 'DBK' && w.campus !== 'THCSDBK') return false;
      if (selectedCampus === 'TK' && w.campus !== 'THCSTK') return false;

      // Status (based on cumulative balance of active weeks)
      if (statusFilter === 'SURPLUS' && w.currentBalance <= 0) return false;
      if (statusFilter === 'EXACT' && w.currentBalance !== 0) return false;
      if (statusFilter === 'DEFICIT' && w.currentBalance >= 0) return false;

      return true;
    });
  }, [allWeeklyWorkloads, searchTerm, selectedDept, selectedCampus, statusFilter]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportWeeklyWorkloadExcel(config, allWeeklyWorkloads, currentSemester);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5 print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                <TrendingUp className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                  Sổ Theo Dõi Số Tiết Thực Dạy Hàng Tuần Của Từng Giáo Viên
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Bám sát thời khóa biểu & phân công giảng dạy thực tế • Đã ghi nhận {summaryStats.activeWeeks} / {weeks.length} tuần • {currentSemester === 'HK1' ? 'Học kỳ I' : 'Học kỳ II'} Năm học {config.academicYear}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {isAdmin && onOpenWeeklyScheduleManager && (
              <button
                onClick={onOpenWeeklyScheduleManager}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Layers className="w-3.5 h-3.5" />
                Phân Công Tuần (TKB)
              </button>
            )}

            {isAdmin && (
              <button
                onClick={handleExportExcel}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Xuất Excel Sổ Theo Dõi
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              In Sổ Theo Dõi
            </button>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-200 print:hidden">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 block">Tổng thực dạy ({summaryStats.activeWeeks}/{weeks.length} tuần)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-slate-900 font-mono">
                {summaryStats.totalActualAll}
              </span>
              <span className="text-xs text-slate-500">/ {summaryStats.totalCurrentRequiredAll} tiết</span>
            </div>
          </div>

          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
            <span className="text-[11px] font-bold text-emerald-800 block">GV Đủ / Thừa định mức lũy kế</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-black text-emerald-700 font-mono">
                {summaryStats.surplusCount + summaryStats.exactCount}
              </span>
              <span className="text-xs text-emerald-600">({summaryStats.surplusCount} thừa, {summaryStats.exactCount} đủ)</span>
            </div>
          </div>

          <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-100">
            <span className="text-[11px] font-bold text-rose-800 block">GV Chưa đủ định mức lũy kế</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-rose-700 font-mono">
                {summaryStats.deficitCount}
              </span>
              <span className="text-xs text-rose-600">giáo viên</span>
            </div>
          </div>

          <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
            <span className="text-[11px] font-bold text-indigo-800 block">Trung bình thực dạy / GV</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-indigo-700 font-mono">
                {summaryStats.avgPeriodsPerWeek}
              </span>
              <span className="text-xs text-indigo-600">tiết / tuần</span>
            </div>
          </div>
        </div>

        {/* Operational Notice */}
        <div className="mt-3 p-2.5 bg-blue-50/60 border border-blue-200/60 rounded-lg text-xs text-blue-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold">Quy tắc tính toán:</span>
            <span>
              Số tiết được lấy trực tiếp từ <strong>Phân công Tuần & Thời khóa biểu</strong> (KHTN, Sử-Địa, HĐTNHN THPT 2 tiết, HĐTNHN THCS Chuyên đề & SHL 1 tiết/môn). Các tuần chưa diễn ra (<strong>—</strong>) không điền sẵn dữ liệu.
            </span>
          </div>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-bold shrink-0 text-[11px]">
            Đã có dữ liệu: {summaryStats.activeWeeks} tuần
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên GV, mã GV..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 w-52"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="text-xs font-bold px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
          >
            <option value="ALL">Tất cả tổ chuyên môn</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Campus Filter */}
          <select
            value={selectedCampus}
            onChange={e => setSelectedCampus(e.target.value as CampusFilter)}
            className="text-xs font-bold px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
          >
            <option value="ALL">Tất cả cơ sở</option>
            <option value="THPT">Khối THPT</option>
            <option value="DBK">THCS Đốc Binh Kiều</option>
            <option value="TK">THCS Tân Kiều</option>
          </select>
        </div>

        {/* Status Filter Badges */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Lọc:
          </span>
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'SURPLUS', label: 'Thừa giờ (+)' },
            { key: 'EXACT', label: 'Đủ chuẩn (0)' },
            { key: 'DEFICIT', label: 'Thiếu giờ (-)' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key as StatusFilter)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                statusFilter === f.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grand Matrix Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Printable Official Header */}
        <div className="hidden print:block text-center py-4 border-b border-slate-200">
          <div className="font-bold text-xs uppercase">{config.schoolName}</div>
          <div className="font-extrabold text-base uppercase mt-1">
            SỔ THEO DÕI SỐ TIẾT THỰC DẠY HÀNG TUẦN CỦA GIÁO VIÊN
          </div>
          <div className="text-xs italic mt-0.5">
            {currentSemester === 'HK1' ? 'Học kỳ I' : 'Học kỳ II'} - Năm học {config.academicYear} (Chương trình GDPT 2018)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800 text-white font-bold text-[11px]">
                <th className="p-2 border border-slate-700 w-10 sticky left-0 bg-slate-800 z-10">STT</th>
                <th className="p-2 border border-slate-700 w-40 text-left sticky left-10 bg-slate-800 z-10">
                  Họ và tên giáo viên
                </th>
                <th className="p-2 border border-slate-700 w-16">Mã GV</th>
                <th className="p-2 border border-slate-700 w-28 text-left">Tổ bộ môn</th>
                <th className="p-2 border border-slate-700 w-14" title="Định mức chuẩn tuần">ĐM</th>
                <th className="p-2 border border-slate-700 w-14" title="Số tiết giảm trừ do kiêm nhiệm/con nhỏ">Giảm</th>
                <th className="p-2 border border-slate-700 w-16 font-extrabold bg-slate-900" title="Định mức thực hiện / tuần">
                  ĐM Tuần
                </th>

                {/* 18 Weeks Columns */}
                {weeks.map(wNum => (
                  <th key={wNum} className="p-1.5 border border-slate-700 w-9 text-slate-300 font-mono text-[10px]">
                    T{wNum}
                  </th>
                ))}

                <th className="p-2 border border-slate-700 w-20 bg-emerald-950/80 font-extrabold" title="Tổng số tiết thực dạy các tuần đã diễn ra">
                  Tổng Thực
                </th>
                <th className="p-2 border border-slate-700 w-18 bg-slate-900 font-bold" title="Định mức lũy kế theo các tuần đã lập phân công">
                  ĐM Lũy Kế
                </th>
                <th className="p-2 border border-slate-700 w-20 bg-slate-950 font-black" title="Chênh lệch thực dạy so với định mức lũy kế">
                  +/- Lũy Kế
                </th>
                <th className="p-2 border border-slate-700 w-18 bg-slate-800 text-slate-400 font-medium" title="Định mức chuẩn toàn học kỳ">
                  ĐM Cả Kỳ
                </th>
                <th className="p-2 border border-slate-700 w-14 print:hidden">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredWorkloads.length === 0 ? (
                <tr>
                  <td colSpan={11 + weeks.length} className="p-8 text-center text-slate-400">
                    Không tìm thấy giáo viên phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredWorkloads.map((w, idx) => {
                  const isSurplus = w.currentBalance > 0;
                  const isDeficit = w.currentBalance < 0;

                  return (
                    <tr
                      key={w.teacherId}
                      className={`hover:bg-indigo-50/40 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      {/* STT */}
                      <td className="p-2 border border-slate-200 text-slate-400 font-mono text-[11px] sticky left-0 bg-inherit z-10">
                        {idx + 1}
                      </td>

                      {/* Name */}
                      <td className="p-2 border border-slate-200 font-bold text-slate-900 text-left sticky left-10 bg-inherit z-10">
                        <div className="flex items-center justify-between">
                          <span className="truncate" title={w.teacherName}>{w.teacherName}</span>
                          {w.reductionPeriods > 0 && (
                            <span className="text-[9px] px-1 py-0.2 bg-amber-100 text-amber-800 rounded font-mono ml-1 shrink-0">
                              -{w.reductionPeriods}t
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Code */}
                      <td className="p-2 border border-slate-200 font-mono font-bold text-slate-700 text-[11px]">
                        {w.teacherCode}
                      </td>

                      {/* Dept */}
                      <td className="p-2 border border-slate-200 text-left text-slate-600 text-[11px] truncate">
                        {w.departmentName}
                      </td>

                      {/* Base Standard */}
                      <td className="p-2 border border-slate-200 text-slate-500 font-mono">
                        {w.baseStandardPeriods}
                      </td>

                      {/* Reduction */}
                      <td className="p-2 border border-slate-200 text-amber-700 font-mono font-bold">
                        {w.reductionPeriods > 0 ? `-${w.reductionPeriods}` : '0'}
                      </td>

                      {/* Target weekly */}
                      <td className="p-2 border border-slate-200 font-black text-slate-900 bg-slate-100 font-mono">
                        {w.targetWeeklyPeriods}
                      </td>

                      {/* Week 1..18 Actual Periods */}
                      {weeks.map(wNum => {
                        const p = w.weeklyPeriods[wNum];
                        if (p === undefined) {
                          return (
                            <td
                              key={wNum}
                              className="p-1 border border-slate-200 font-mono text-[11px] text-slate-300 bg-slate-50/20"
                              title={`Tuần ${wNum}: Chưa lập phân công (Chờ phân công TKB)`}
                            >
                              —
                            </td>
                          );
                        }

                        const isDifferentFromTarget = p !== w.targetWeeklyPeriods;

                        return (
                          <td
                            key={wNum}
                            onClick={() => setSelectedTeacherForDetail(w)}
                            className={`p-1 border border-slate-200 font-mono text-[11px] font-bold cursor-pointer hover:bg-indigo-100 transition-colors ${
                              p === 0
                                ? 'text-slate-400 bg-slate-50/50'
                                : isDifferentFromTarget
                                ? p > w.targetWeeklyPeriods
                                  ? 'text-emerald-700 bg-emerald-50/60'
                                  : 'text-amber-700 bg-amber-50/60'
                                : 'text-slate-800'
                            }`}
                            title={`Tuần ${wNum}: ${p} tiết thực dạy - Bấm để xem chi tiết các lớp`}
                          >
                            {p}
                          </td>
                        );
                      })}

                      {/* Total Actual */}
                      <td className="p-2 border border-slate-200 font-black text-slate-900 bg-emerald-50/40 font-mono text-[12px]">
                        {w.totalActualPeriods}
                      </td>

                      {/* Cumulative Required */}
                      <td className="p-2 border border-slate-200 text-slate-700 font-mono font-bold text-[11px]">
                        {w.currentRequiredPeriods}
                      </td>

                      {/* Cumulative Balance (+/-) */}
                      <td className="p-2 border border-slate-200 font-black font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] inline-block ${
                            isSurplus
                              ? 'bg-emerald-100 text-emerald-800'
                              : isDeficit
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isSurplus ? `+${w.currentBalance}` : w.currentBalance}
                        </span>
                      </td>

                      {/* Full Semester Target */}
                      <td className="p-2 border border-slate-200 text-slate-400 font-mono text-[10px]">
                        {w.totalRequiredPeriods}
                      </td>

                      {/* Detail Button */}
                      <td className="p-2 border border-slate-200 print:hidden">
                        <button
                          onClick={() => setSelectedTeacherForDetail(w)}
                          className="p-1 hover:bg-slate-200 text-slate-600 rounded cursor-pointer"
                          title="Xem sổ chi tiết từng tuần của giáo viên này"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Printable Official Signatures */}
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

      {/* Teacher Weekly Details Modal */}
      {selectedTeacherForDetail && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {selectedTeacherForDetail.teacherName} ({selectedTeacherForDetail.teacherCode})
                </h3>
                <p className="text-xs text-slate-500">
                  Tổ: {selectedTeacherForDetail.departmentName} • Định mức tuần: <strong>{selectedTeacherForDetail.targetWeeklyPeriods}t</strong> • Thực dạy: <strong>{selectedTeacherForDetail.totalActualPeriods}t</strong> / Lũy kế <strong>{selectedTeacherForDetail.currentRequiredPeriods}t</strong> ({selectedTeacherForDetail.currentBalance >= 0 ? `+${selectedTeacherForDetail.currentBalance}` : selectedTeacherForDetail.currentBalance}t)
                </p>
              </div>
              <button
                onClick={() => setSelectedTeacherForDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Week by week list */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {weeks.map(wNum => {
                  const details = selectedTeacherForDetail.weeklyDetails[wNum] || [];
                  const weekSum = selectedTeacherForDetail.weeklyPeriods[wNum];
                  const isScheduled = weekSum !== undefined;
                  const isDiff = isScheduled && weekSum !== selectedTeacherForDetail.targetWeeklyPeriods;

                  return (
                    <div
                      key={wNum}
                      className={`p-2.5 rounded-lg border text-xs space-y-1.5 ${
                        isScheduled ? 'border-slate-200 bg-slate-50/70' : 'border-dashed border-slate-200 bg-slate-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-800">Tuần {wNum}</span>
                        {!isScheduled ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 font-normal">
                            Chưa lập phân công
                          </span>
                        ) : (
                          <span
                            className={`px-1.5 py-0.2 rounded font-mono font-extrabold ${
                              weekSum === 0
                                ? 'bg-slate-200 text-slate-500'
                                : isDiff
                                ? weekSum > selectedTeacherForDetail.targetWeeklyPeriods
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {weekSum} tiết
                          </span>
                        )}
                      </div>

                      {isScheduled ? (
                        details.length > 0 ? (
                          <div className="space-y-1 pt-1 border-t border-slate-200/60">
                            {details.map((d, i) => (
                              <div key={i} className="flex items-center justify-between text-[11px] text-slate-600">
                                <span>
                                  {d.className} - <strong className="text-slate-800">{d.subjectName}</strong>
                                </span>
                                <span className="font-mono font-bold text-slate-900">{d.periods}t</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic">Không có tiết dạy</div>
                        )
                      ) : (
                        <div className="text-[11px] text-slate-400 italic">Chờ thời khóa biểu & phân công tuần</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedTeacherForDetail(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
