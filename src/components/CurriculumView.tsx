import React, { useState } from 'react';
import {
  Subject,
  Department,
  GradeLevel
} from '../types';
import {
  BookOpen,
  Info,
  GraduationCap,
  School,
  FileSpreadsheet,
  Printer,
  Settings2,
  Calendar,
  Sparkles,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  THPT_CURRICULUM,
  THPT_SUMMARY,
  THCS_CURRICULUM,
  THCS_SUMMARY
} from '../data/gdpt2018Curriculum';

interface CurriculumViewProps {
  subjects: Subject[];
  departments: Department[];
  isAdmin?: boolean;
  onPromptAdminLogin?: () => void;
  onUpdateSubjectPeriod: (subjectId: string, grade: GradeLevel, periods: number) => void;
}

type MainTab = 'thpt' | 'thcs' | 'config';
type ThcsViewMode = 'all_matrix' | 'grade_6' | 'grade_7' | 'grade_8' | 'grade_9';

export const CurriculumView: React.FC<CurriculumViewProps> = ({
  subjects,
  departments,
  isAdmin = false,
  onPromptAdminLogin,
  onUpdateSubjectPeriod,
}) => {
  // Main level tab: THPT vs THCS vs Cấu hình thực tế
  const [activeTab, setActiveTab] = useState<MainTab>('thpt');

  // For THPT: semester filter
  const [thptSemesterFilter, setThptSemesterFilter] = useState<'all' | 'hk1' | 'hk2'>('all');

  // For THCS: view mode (full 4-grade matrix or single grade focus)
  const [thcsViewMode, setThcsViewMode] = useState<ThcsViewMode>('all_matrix');

  // For Config tab: which grade to configure
  const [configGrade, setConfigGrade] = useState<GradeLevel>('10');

  const deptMap = new Map<string, Department>(departments.map(d => [d.id, d]));

  // Export to Excel function
  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    // 1. Sheet THPT
    const thptData: any[] = [
      ['KẾ HOẠCH GIÁO DỤC CHƯƠNG TRÌNH GDPT 2018 - CẤP THPT (LỚP 10, 11, 12)'],
      ['Kế hoạch năm học: Học kỳ 1 (18 tuần) - Học kỳ 2 (17 tuần) - Cả năm (35 tuần)'],
      [],
      ['STT', 'Môn học / Hoạt động', 'Phân loại', 'Tổng số tiết', 'HK1 (18 tuần)', 'Tiết/tuần HK1', 'HK2 (17 tuần)', 'Tiết/tuần HK2', 'Ghi chú']
    ];

    THPT_CURRICULUM.forEach(item => {
      thptData.push([
        item.stt,
        item.name,
        item.categoryLabel,
        item.totalPeriods,
        item.hk1Periods,
        item.hk1Rate,
        item.hk2Periods,
        item.hk2Rate,
        item.note || ''
      ]);
    });

    thptData.push([]);
    thptData.push([
      'TỔNG CỘNG TIÊU CHUẨN',
      '(Mỗi HS học 6 bắt buộc + 4 lựa chọn + 3 cụm chuyên đề + HĐGD)',
      'Tổng số tiết',
      THPT_SUMMARY.totalYearPeriods,
      THPT_SUMMARY.hk1Periods,
      THPT_SUMMARY.hk1WeeklyAverage,
      THPT_SUMMARY.hk2Periods,
      THPT_SUMMARY.hk2WeeklyAverage,
      `Bình quân cả năm: ${THPT_SUMMARY.yearWeeklyAverage} tiết/tuần`
    ]);

    const wsThpt = XLSX.utils.aoa_to_sheet(thptData);
    XLSX.utils.book_append_sheet(wb, wsThpt, 'Khung_Tiet_THPT');

    // 2. Sheet THCS
    const thcsData: any[] = [
      ['KẾ HOẠCH GIÁO DỤC CHƯƠNG TRÌNH GDPT 2018 - CẤP THCS (LỚP 6, 7, 8, 9)'],
      ['Kế hoạch năm học: Học kỳ 1 (18 tuần) - Học kỳ 2 (17 tuần) - Cả năm (35 tuần)'],
      [],
      [
        'TT',
        'Môn học',
        'Lớp 6 - HK1', 'Lớp 6 - HK2', 'Lớp 6 - CN',
        'Lớp 7 - HK1', 'Lớp 7 - HK2', 'Lớp 7 - CN',
        'Lớp 8 - HK1', 'Lớp 8 - HK2', 'Lớp 8 - CN',
        'Lớp 9 - HK1', 'Lớp 9 - HK2', 'Lớp 9 - CN',
        'Ghi chú'
      ]
    ];

    THCS_CURRICULUM.forEach(item => {
      thcsData.push([
        item.tt,
        item.name,
        item.grades['6'].hk1, item.grades['6'].hk2, item.grades['6'].total,
        item.grades['7'].hk1, item.grades['7'].hk2, item.grades['7'].total,
        item.grades['8'].hk1, item.grades['8'].hk2, item.grades['8'].total,
        item.grades['9'].hk1, item.grades['9'].hk2, item.grades['9'].total,
        item.note || ''
      ]);
    });

    thcsData.push([
      '',
      'TỔNG CỘNG',
      THCS_SUMMARY['6'].hk1Total, THCS_SUMMARY['6'].hk2Total, THCS_SUMMARY['6'].yearTotal,
      THCS_SUMMARY['7'].hk1Total, THCS_SUMMARY['7'].hk2Total, THCS_SUMMARY['7'].yearTotal,
      THCS_SUMMARY['8'].hk1Total, THCS_SUMMARY['8'].hk2Total, THCS_SUMMARY['8'].yearTotal,
      THCS_SUMMARY['9'].hk1Total, THCS_SUMMARY['9'].hk2Total, THCS_SUMMARY['9'].yearTotal,
      ''
    ]);

    thcsData.push([
      '',
      'BÌNH QUÂN SỐ TIẾT/TUẦN',
      THCS_SUMMARY['6'].hk1Avg, THCS_SUMMARY['6'].hk2Avg, THCS_SUMMARY['6'].yearAvg,
      THCS_SUMMARY['7'].hk1Avg, THCS_SUMMARY['7'].hk2Avg, THCS_SUMMARY['7'].yearAvg,
      THCS_SUMMARY['8'].hk1Avg, THCS_SUMMARY['8'].hk2Avg, THCS_SUMMARY['8'].yearAvg,
      THCS_SUMMARY['9'].hk1Avg, THCS_SUMMARY['9'].hk2Avg, THCS_SUMMARY['9'].yearAvg,
      ''
    ]);

    const wsThcs = XLSX.utils.aoa_to_sheet(thcsData);
    XLSX.utils.book_append_sheet(wb, wsThcs, 'Khung_Tiet_THCS');

    XLSX.writeFile(wb, 'Khung_Phan_Phoi_Tiet_GDPT_2018.xlsx');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      {/* Header & Main Navigation Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Khung Phân Phối Số Tiết GDPT 2018
              </h1>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1 font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                  <Calendar className="w-3 h-3" /> Học kỳ 1: 18 tuần
                </span>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  <Calendar className="w-3 h-3" /> Học kỳ 2: 17 tuần
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600 font-medium">Cả năm: 35 tuần</span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons & Level Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Level Tabs */}
          <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1">
            <button
              id="tab-thpt-btn"
              onClick={() => setActiveTab('thpt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'thpt'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Cấp THPT (Khối 10, 11, 12)</span>
            </button>

            <button
              id="tab-thcs-btn"
              onClick={() => setActiveTab('thcs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'thcs'
                  ? 'bg-white text-teal-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <School className="w-3.5 h-3.5" />
              <span>Cấp THCS (Khối 6, 7, 8, 9)</span>
            </button>

            <button
              id="tab-config-btn"
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'config'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Cấu hình số tiết định mức trong hệ thống"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Cấu Hình Hệ Thống</span>
            </button>
          </div>

          {/* Export & Print */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Tải về file Excel khung tiết chuẩn GDPT 2018 cho cả THPT và THCS"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xuất Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition-colors cursor-pointer"
              title="In bản khung phân phối tiết"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">In</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          TAB 1: CẤP THPT (LỚP 10, 11, 12)
          ========================================================= */}
      {activeTab === 'thpt' && (
        <div className="space-y-4">
          {/* THPT Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Cả Năm (35 tuần)</p>
                <p className="text-xl font-extrabold text-indigo-700 mt-0.5">
                  1.009 <span className="text-xs font-semibold text-slate-500">tiết</span>
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Bình quân: <strong className="text-indigo-900 font-bold">28,84</strong> tiết/tuần
                </p>
              </div>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Học Kỳ 1 (18 tuần)</p>
                <p className="text-xl font-extrabold text-blue-700 mt-0.5">
                  504 <span className="text-xs font-semibold text-slate-500">tiết</span>
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Định mức: <strong className="text-blue-900 font-bold">28</strong> tiết/tuần
                </p>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-teal-100 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Học Kỳ 2 (17 tuần)</p>
                <p className="text-xl font-extrabold text-teal-700 mt-0.5">
                  505 <span className="text-xs font-semibold text-slate-500">tiết</span>
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Định mức: <strong className="text-teal-900 font-bold">29,71</strong> tiết/tuần
                </p>
              </div>
              <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Cơ cấu lựa chọn</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  4 môn lựa chọn + 3 cụm CĐ
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  4 x 70t + 3 x 35t = 385 tiết/năm
                </p>
              </div>
              <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
                <Layers className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filter & Explanation Banner */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Xem theo học kỳ:</span>
              <div className="inline-flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setThptSemesterFilter('all')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    thptSemesterFilter === 'all'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Toàn Năm (HK1 & HK2)
                </button>
                <button
                  onClick={() => setThptSemesterFilter('hk1')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    thptSemesterFilter === 'hk1'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Học Kỳ 1 (18 tuần)
                </button>
                <button
                  onClick={() => setThptSemesterFilter('hk2')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    thptSemesterFilter === 'hk2'
                      ? 'bg-white text-teal-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Học Kỳ 2 (17 tuần)
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500 italic">
              * Áp dụng thống nhất cho các khối 10, 11, 12 theo chương trình GDPT 2018
            </div>
          </div>

          {/* THPT Data Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Chi Tiết Khung Tiết Cấp THPT (Lớp 10, 11, 12)
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60">
                Theo văn bản kế hoạch giáo dục nhà trường
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-800 font-bold border-b border-slate-200 text-[11px]">
                    <th className="p-2.5 text-center w-12 border-r border-slate-200">STT</th>
                    <th className="p-2.5 min-w-[200px] border-r border-slate-200">Môn Học / Hoạt Động</th>
                    <th className="p-2.5 text-center w-24 border-r border-slate-200">Viết Tắt</th>
                    <th className="p-2.5 text-center w-28 border-r border-slate-200 bg-indigo-50/50 text-indigo-950">
                      Tổng Tiết/Năm
                    </th>
                    {(thptSemesterFilter === 'all' || thptSemesterFilter === 'hk1') && (
                      <th className="p-2.5 text-center border-r border-slate-200 bg-blue-50/50 text-blue-950">
                        Học Kỳ 1 (18 tuần)
                      </th>
                    )}
                    {(thptSemesterFilter === 'all' || thptSemesterFilter === 'hk2') && (
                      <th className="p-2.5 text-center border-r border-slate-200 bg-teal-50/50 text-teal-950">
                        Học Kỳ 2 (17 tuần)
                      </th>
                    )}
                    <th className="p-2.5 min-w-[240px]">Ghi Chú Phân Bổ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {/* Category 1: Môn bắt buộc */}
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={thptSemesterFilter === 'all' ? 7 : 6} className="p-2.5 bg-indigo-50/60 text-indigo-900">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>I. CÁC MÔN HỌC BẮT BUỘC (6 môn)</span>
                      </div>
                    </td>
                  </tr>
                  {THPT_CURRICULUM.filter(i => i.category === 'bat_buoc').map((item) => (
                    <tr key={item.name} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 text-center font-medium text-slate-400 border-r border-slate-200">
                        {item.stt}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                        {item.name}
                      </td>
                      <td className="p-2.5 text-center font-semibold text-slate-600 border-r border-slate-200">
                        {item.shortCode}
                      </td>
                      <td className="p-2.5 text-center font-bold text-indigo-700 bg-indigo-50/30 border-r border-slate-200">
                        {item.totalPeriods} tiết
                      </td>
                      {(thptSemesterFilter === 'all' || thptSemesterFilter === 'hk1') && (
                        <td className="p-2.5 text-center border-r border-slate-200 bg-blue-50/20">
                          <span className="font-bold text-blue-900">{item.hk1Periods} tiết</span>
                          <span className="text-slate-500 text-[10px] block">({item.hk1Rate} tiết/tuần)</span>
                        </td>
                      )}
                      {(thptSemesterFilter === 'all' || thptSemesterFilter === 'hk2') && (
                        <td className="p-2.5 text-center border-r border-slate-200 bg-teal-50/20">
                          <span className="font-bold text-teal-900">{item.hk2Periods} tiết</span>
                          <span className="text-slate-500 text-[10px] block">({item.hk2Rate} tiết/tuần)</span>
                        </td>
                      )}
                      <td className="p-2.5 text-slate-600">
                        {item.note}
                      </td>
                    </tr>
                  ))}

                  {/* Category 2: Môn lựa chọn */}
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={thptSemesterFilter === 'all' ? 7 : 6} className="p-2.5 bg-amber-50/60 text-amber-900">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-amber-600" />
                          <span>II. MÔN HỌC LỰA CHỌN (Học sinh chọn 4 môn từ danh sách 9 môn học lựa chọn)</span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded">
                          Mỗi HS học: 4 môn x 70 tiết = 280 tiết/năm (8 tiết/tuần)
                        </span>
                      </div>
                    </td>
                  </tr>
                  {THPT_CURRICULUM.filter(i => i.category === 'lua_chon').map((item) => (
                    <tr key={item.name} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 text-center font-medium text-slate-400 border-r border-slate-200">
                        {item.stt}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                        {item.name}
                      </td>
                      <td className="p-2.5 text-center font-semibold text-slate-600 border-r border-slate-200">
                        {item.shortCode}
                      </td>
                      <td className="p-2.5 text-center font-bold text-indigo-700 bg-indigo-50/30 border-r border-slate-200">
                        {item.totalPeriods} tiết
                      </td>
                      {(thptSemesterFilter === 'all' || thptSemesterFilter === 'hk1') && (
                        <td className="p-2.5 text-center border-r border-slate-200 bg-blue-50/20">
                          <span className="font-bold text-blue-900">{item.hk1Periods} tiết</span>
                          <span className="text-slate-500 text-[10px] block">({item.hk1Rate} tiết/tuần)</span>
                        </td>
                      )}
                      {(thptSemesterFilter === 'all' || thptSemesterFilter === 'hk2') && (
                        <td className="p-2.5 text-center border-r border-slate-200 bg-teal-50/20">
                          <span className="font-bold text-teal-900">{item.hk2Periods} tiết</span>
                          <span className="text-slate-500 text-[10px] block">({item.hk2Rate} tiết/tuần)</span>
                        </td>
                      )}
                      <td className="p-2.5 text-slate-600">
                        {item.note}
                      </td>
                    </tr>
                  ))}

                  {/* Category 3: Chuyên đề lựa chọn */}
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={thptSemesterFilter === 'all' ? 7 : 6} className="p-2.5 bg-purple-50/60 text-purple-900">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                          <span>III. CHUYÊN ĐỀ HỌC TẬP LỰA CHỌN (3 cụm chuyên đề học tập của 3 môn học)</span>
                        </div>
                        <span className="text-[10px] font-bold text-purple-800 bg-purple-100/80 px-2 py-0.5 rounded">
                          Mỗi HS học: 3 cụm x 35 tiết = 105 tiết/năm (3 tiết/tuần)
                        </span>
                      </div>
                    </td>
                  </tr>
                  {THPT_CURRICULUM.filter(i => i.category === 'chuyen_de').map((item) => (
                    <tr key={item.name} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 text-center font-medium text-slate-400 border-r border-slate-200">
                        {item.stt}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                        {item.name}
                      </td>
                      <td className="p-2.5 text-center font-semibold text-slate-600 border-r border-slate-200">
                        {item.shortCode}
                      </td>
                      <td className="p-2.5 text-center font-bold text-indigo-700 bg-indigo-50/30 border-r border-slate-200">
                        {item.totalPeriods} tiết
                      </td>
                      {(thptSemesterFilter === 'all' || thptSemesterFilter === 'hk1') && (
                        <td className="p-2.5 text-center border-r border-slate-200 bg-blue-50/20">
                          <span className="font-bold text-blue-900">{item.hk1Periods} tiết</span>
                          <span className="text-slate-500 text-[10px] block">({item.hk1Rate} tiết/tuần)</span>
                        </td>
                      )}
                      {(thptSemesterFilter === 'all' || thptSemesterFilter === 'hk2') && (
                        <td className="p-2.5 text-center border-r border-slate-200 bg-teal-50/20">
                          <span className="font-bold text-teal-900">{item.hk2Periods} tiết</span>
                          <span className="text-slate-500 text-[10px] block">({item.hk2Rate} tiết/tuần)</span>
                        </td>
                      )}
                      <td className="p-2.5 text-slate-600">
                        {item.note}
                      </td>
                    </tr>
                  ))}

                  {/* Category 4: Hoạt động bắt buộc */}
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={thptSemesterFilter === 'all' ? 7 : 6} className="p-2.5 bg-rose-50/60 text-rose-900">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-rose-600" />
                        <span>IV. HOẠT ĐỘNG GIÁO DỤC BẮT BUỘC</span>
                      </div>
                    </td>
                  </tr>
                  {THPT_CURRICULUM.filter(i => i.category === 'hoat_dong_bat_buoc').map((item) => (
                    <tr key={item.name} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 text-center font-medium text-slate-400 border-r border-slate-200">
                        {item.stt}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                        {item.name}
                      </td>
                      <td className="p-2.5 text-center font-semibold text-slate-600 border-r border-slate-200">
                        {item.shortCode}
                      </td>
                      <td className="p-2.5 text-center font-bold text-indigo-700 bg-indigo-50/30 border-r border-slate-200">
                        {item.totalPeriods} tiết
                      </td>
                      {(thptSemesterFilter === 'all' || thptSemesterFilter === 'hk1') && (
                        <td className="p-2.5 text-center border-r border-slate-200 bg-blue-50/20">
                          <span className="font-bold text-blue-900">{item.hk1Periods} tiết</span>
                          <span className="text-slate-500 text-[10px] block">({item.hk1Rate} tiết/tuần)</span>
                        </td>
                      )}
                      {(thptSemesterFilter === 'all' || thptSemesterFilter === 'hk2') && (
                        <td className="p-2.5 text-center border-r border-slate-200 bg-teal-50/20">
                          <span className="font-bold text-teal-900">{item.hk2Periods} tiết</span>
                          <span className="text-slate-500 text-[10px] block">({item.hk2Rate} tiết/tuần)</span>
                        </td>
                      )}
                      <td className="p-2.5 text-slate-600">
                        {item.note}
                      </td>
                    </tr>
                  ))}

                  {/* Summary Rows */}
                  <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-900 text-xs">
                    <td colSpan={3} className="p-3 text-right uppercase tracking-wider text-slate-300 border-r border-slate-700">
                      TỔNG SỐ TIẾT QUY CHUẨN (MỖI HỌC SINH)
                    </td>
                    <td className="p-3 text-center text-amber-300 font-extrabold text-sm border-r border-slate-700">
                      {THPT_SUMMARY.totalYearPeriods}
                    </td>
                    {(thptSemesterFilter === 'all' || thptSemesterFilter === 'hk1') && (
                      <td className="p-3 text-center text-blue-300 font-extrabold text-sm border-r border-slate-700">
                        {THPT_SUMMARY.hk1Periods}
                      </td>
                    )}
                    {(thptSemesterFilter === 'all' || thptSemesterFilter === 'hk2') && (
                      <td className="p-3 text-center text-teal-300 font-extrabold text-sm border-r border-slate-700">
                        {THPT_SUMMARY.hk2Periods}
                      </td>
                    )}
                    <td className="p-3 text-slate-300 text-[11px] font-normal">
                      {THPT_SUMMARY.ruleDescription}
                    </td>
                  </tr>

                  <tr className="bg-indigo-900 text-white font-bold text-xs">
                    <td colSpan={3} className="p-3 text-right uppercase tracking-wider text-indigo-200 border-r border-indigo-800">
                      BÌNH QUÂN SỐ TIẾT / TUẦN
                    </td>
                    <td className="p-3 text-center text-amber-200 font-extrabold text-sm border-r border-indigo-800">
                      {THPT_SUMMARY.yearWeeklyAverage}
                    </td>
                    {(thptSemesterFilter === 'all' || thptSemesterFilter === 'hk1') && (
                      <td className="p-3 text-center text-white font-extrabold text-sm border-r border-indigo-800">
                        {THPT_SUMMARY.hk1WeeklyAverage}
                      </td>
                    )}
                    {(thptSemesterFilter === 'all' || thptSemesterFilter === 'hk2') && (
                      <td className="p-3 text-center text-white font-extrabold text-sm border-r border-indigo-800">
                        {THPT_SUMMARY.hk2WeeklyAverage}
                      </td>
                    )}
                    <td className="p-3 text-indigo-200 text-[11px] font-normal">
                      HK1 học 28 tiết/tuần; HK2 học 29,71 tiết/tuần (thêm GD Trí tuệ nhân tạo và tăng 1 tiết Sử)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: CẤP THCS (LỚP 6, 7, 8, 9)
          ========================================================= */}
      {activeTab === 'thcs' && (
        <div className="space-y-4">
          {/* THCS Cards per Grade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-teal-100 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 text-xs font-bold">Khối 6</span>
                <span className="text-[11px] text-slate-500 font-medium">35 tuần</span>
              </div>
              <p className="text-xl font-extrabold text-slate-900 mt-1.5">
                1.027 <span className="text-xs font-semibold text-slate-500">tiết/năm</span>
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-600 mt-1 border-t border-slate-100 pt-1.5">
                <span>HK1: <strong>520t</strong> (28.9t/w)</span>
                <span>HK2: <strong>507t</strong> (29.8t/w)</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-teal-100 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 text-xs font-bold">Khối 7</span>
                <span className="text-[11px] text-slate-500 font-medium">35 tuần</span>
              </div>
              <p className="text-xl font-extrabold text-slate-900 mt-1.5">
                1.027 <span className="text-xs font-semibold text-slate-500">tiết/năm</span>
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-600 mt-1 border-t border-slate-100 pt-1.5">
                <span>HK1: <strong>520t</strong> (28.9t/w)</span>
                <span>HK2: <strong>507t</strong> (29.8t/w)</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-xs font-bold">Khối 8</span>
                <span className="text-[11px] text-slate-500 font-medium">35 tuần</span>
              </div>
              <p className="text-xl font-extrabold text-slate-900 mt-1.5">
                1.044 <span className="text-xs font-semibold text-slate-500">tiết/năm</span>
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-600 mt-1 border-t border-slate-100 pt-1.5">
                <span>HK1: <strong>528t</strong> (29.3t/w)</span>
                <span>HK2: <strong>516t</strong> (30.4t/w)</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-xs font-bold">Khối 9</span>
                <span className="text-[11px] text-slate-500 font-medium">35 tuần</span>
              </div>
              <p className="text-xl font-extrabold text-slate-900 mt-1.5">
                1.044 <span className="text-xs font-semibold text-slate-500">tiết/năm</span>
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-600 mt-1 border-t border-slate-100 pt-1.5">
                <span>HK1: <strong>520t</strong> (28.9t/w)</span>
                <span>HK2: <strong>524t</strong> (30.8t/w)</span>
              </div>
            </div>
          </div>

          {/* THCS View Mode Switcher */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Chế độ xem:</span>
              <div className="inline-flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setThcsViewMode('all_matrix')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    thcsViewMode === 'all_matrix'
                      ? 'bg-white text-teal-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ma Trận Tổng Hợp (Lớp 6, 7, 8, 9)
                </button>
                <button
                  onClick={() => setThcsViewMode('grade_6')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    thcsViewMode === 'grade_6'
                      ? 'bg-white text-teal-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Lớp 6
                </button>
                <button
                  onClick={() => setThcsViewMode('grade_7')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    thcsViewMode === 'grade_7'
                      ? 'bg-white text-teal-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Lớp 7
                </button>
                <button
                  onClick={() => setThcsViewMode('grade_8')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    thcsViewMode === 'grade_8'
                      ? 'bg-white text-teal-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Lớp 8
                </button>
                <button
                  onClick={() => setThcsViewMode('grade_9')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    thcsViewMode === 'grade_9'
                      ? 'bg-white text-teal-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Lớp 9
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500 italic">
              * Điểm khác biệt: Môn Công nghệ Lớp 8 (HK1: 34t, HK2: 18t); Lớp 9 (HK1: 18t, HK2: 34t)
            </div>
          </div>

          {/* THCS Full Matrix Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-teal-50/50 border-b border-teal-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
                <h3 className="text-xs sm:text-sm font-bold text-teal-950 uppercase tracking-wide">
                  Chi Tiết Khung Tiết Cấp THCS (Lớp 6, 7, 8, 9)
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-teal-800 bg-white px-2 py-0.5 rounded-md border border-teal-200">
                13 Môn học & Hoạt động giáo dục
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  {/* Super Header */}
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-[11px]">
                    <th rowSpan={2} className="p-2.5 text-center w-10 border-r border-slate-200">TT</th>
                    <th rowSpan={2} className="p-2.5 min-w-[170px] border-r border-slate-200">Tên Môn Học</th>

                    {(thcsViewMode === 'all_matrix' || thcsViewMode === 'grade_6') && (
                      <th colSpan={3} className="p-2 text-center border-r border-slate-200 bg-emerald-50 text-emerald-950">
                        LỚP 6
                      </th>
                    )}
                    {(thcsViewMode === 'all_matrix' || thcsViewMode === 'grade_7') && (
                      <th colSpan={3} className="p-2 text-center border-r border-slate-200 bg-teal-50 text-teal-950">
                        LỚP 7
                      </th>
                    )}
                    {(thcsViewMode === 'all_matrix' || thcsViewMode === 'grade_8') && (
                      <th colSpan={3} className="p-2 text-center border-r border-slate-200 bg-blue-50 text-blue-950">
                        LỚP 8
                      </th>
                    )}
                    {(thcsViewMode === 'all_matrix' || thcsViewMode === 'grade_9') && (
                      <th colSpan={3} className="p-2 text-center border-r border-slate-200 bg-indigo-50 text-indigo-950">
                        LỚP 9
                      </th>
                    )}
                    <th rowSpan={2} className="p-2.5 min-w-[180px]">Ghi Chú Phân Bổ</th>
                  </tr>
                  {/* Sub Header for HK1, HK2, CN */}
                  <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[10px]">
                    {(thcsViewMode === 'all_matrix' || thcsViewMode === 'grade_6') && (
                      <>
                        <th className="p-1.5 text-center border-r border-slate-200">HK1 (18w)</th>
                        <th className="p-1.5 text-center border-r border-slate-200">HK2 (17w)</th>
                        <th className="p-1.5 text-center border-r border-slate-200 font-bold bg-emerald-100/50 text-emerald-950">CN</th>
                      </>
                    )}
                    {(thcsViewMode === 'all_matrix' || thcsViewMode === 'grade_7') && (
                      <>
                        <th className="p-1.5 text-center border-r border-slate-200">HK1 (18w)</th>
                        <th className="p-1.5 text-center border-r border-slate-200">HK2 (17w)</th>
                        <th className="p-1.5 text-center border-r border-slate-200 font-bold bg-teal-100/50 text-teal-950">CN</th>
                      </>
                    )}
                    {(thcsViewMode === 'all_matrix' || thcsViewMode === 'grade_8') && (
                      <>
                        <th className="p-1.5 text-center border-r border-slate-200">HK1 (18w)</th>
                        <th className="p-1.5 text-center border-r border-slate-200">HK2 (17w)</th>
                        <th className="p-1.5 text-center border-r border-slate-200 font-bold bg-blue-100/50 text-blue-950">CN</th>
                      </>
                    )}
                    {(thcsViewMode === 'all_matrix' || thcsViewMode === 'grade_9') && (
                      <>
                        <th className="p-1.5 text-center border-r border-slate-200">HK1 (18w)</th>
                        <th className="p-1.5 text-center border-r border-slate-200">HK2 (17w)</th>
                        <th className="p-1.5 text-center border-r border-slate-200 font-bold bg-indigo-100/50 text-indigo-950">CN</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {THCS_CURRICULUM.map((item) => (
                    <tr key={item.name} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 text-center font-medium text-slate-400 border-r border-slate-200">
                        {item.tt}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200 flex items-center gap-1.5">
                        <span>{item.name}</span>
                        {item.name.includes('Công nghệ') && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-normal">Đặc thù</span>
                        )}
                      </td>

                      {/* Grade 6 */}
                      {(thcsViewMode === 'all_matrix' || thcsViewMode === 'grade_6') && (
                        <>
                          <td className="p-2 text-center border-r border-slate-200 font-medium text-slate-800">
                            {item.grades['6'].hk1}
                          </td>
                          <td className="p-2 text-center border-r border-slate-200 font-medium text-slate-800">
                            {item.grades['6'].hk2}
                          </td>
                          <td className="p-2 text-center border-r border-slate-200 font-bold text-emerald-800 bg-emerald-50/40">
                            {item.grades['6'].total}
                          </td>
                        </>
                      )}

                      {/* Grade 7 */}
                      {(thcsViewMode === 'all_matrix' || thcsViewMode === 'grade_7') && (
                        <>
                          <td className="p-2 text-center border-r border-slate-200 font-medium text-slate-800">
                            {item.grades['7'].hk1}
                          </td>
                          <td className="p-2 text-center border-r border-slate-200 font-medium text-slate-800">
                            {item.grades['7'].hk2}
                          </td>
                          <td className="p-2 text-center border-r border-slate-200 font-bold text-teal-800 bg-teal-50/40">
                            {item.grades['7'].total}
                          </td>
                        </>
                      )}

                      {/* Grade 8 */}
                      {(thcsViewMode === 'all_matrix' || thcsViewMode === 'grade_8') && (
                        <>
                          <td className={`p-2 text-center border-r border-slate-200 font-medium ${item.name.includes('Công nghệ') ? 'bg-amber-50 font-bold text-amber-900' : 'text-slate-800'}`}>
                            {item.grades['8'].hk1}
                          </td>
                          <td className="p-2 text-center border-r border-slate-200 font-medium text-slate-800">
                            {item.grades['8'].hk2}
                          </td>
                          <td className="p-2 text-center border-r border-slate-200 font-bold text-blue-800 bg-blue-50/40">
                            {item.grades['8'].total}
                          </td>
                        </>
                      )}

                      {/* Grade 9 */}
                      {(thcsViewMode === 'all_matrix' || thcsViewMode === 'grade_9') && (
                        <>
                          <td className="p-2 text-center border-r border-slate-200 font-medium text-slate-800">
                            {item.grades['9'].hk1}
                          </td>
                          <td className={`p-2 text-center border-r border-slate-200 font-medium ${item.name.includes('Công nghệ') ? 'bg-amber-50 font-bold text-amber-900' : 'text-slate-800'}`}>
                            {item.grades['9'].hk2}
                          </td>
                          <td className="p-2 text-center border-r border-slate-200 font-bold text-indigo-800 bg-indigo-50/40">
                            {item.grades['9'].total}
                          </td>
                        </>
                      )}

                      <td className="p-2 text-slate-600 text-[11px]">
                        {item.note}
                      </td>
                    </tr>
                  ))}

                  {/* Summary row 1: TỔNG CỘNG */}
                  <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-900 text-xs">
                    <td colSpan={2} className="p-3 text-right uppercase tracking-wider text-slate-300 border-r border-slate-700">
                      TỔNG CỘNG
                    </td>
                    {(thcsViewMode === 'all_matrix' || thcsViewMode === 'grade_6') && (
                      <>
                        <td className="p-2 text-center border-r border-slate-700 text-emerald-300">{THCS_SUMMARY['6'].hk1Total}</td>
                        <td className="p-2 text-center border-r border-slate-700 text-emerald-300">{THCS_SUMMARY['6'].hk2Total}</td>
                        <td className="p-2 text-center border-r border-slate-700 text-emerald-200 font-extrabold bg-slate-800">{THCS_SUMMARY['6'].yearTotal}</td>
                      </>
                    )}
                    {(thcsViewMode === 'all_matrix' || thcsViewMode === 'grade_7') && (
                      <>
                        <td className="p-2 text-center border-r border-slate-700 text-teal-300">{THCS_SUMMARY['7'].hk1Total}</td>
                        <td className="p-2 text-center border-r border-slate-700 text-teal-300">{THCS_SUMMARY['7'].hk2Total}</td>
                        <td className="p-2 text-center border-r border-slate-700 text-teal-200 font-extrabold bg-slate-800">{THCS_SUMMARY['7'].yearTotal}</td>
                      </>
                    )}
                    {(thcsViewMode === 'all_matrix' || thcsViewMode === 'grade_8') && (
                      <>
                        <td className="p-2 text-center border-r border-slate-700 text-blue-300">{THCS_SUMMARY['8'].hk1Total}</td>
                        <td className="p-2 text-center border-r border-slate-700 text-blue-300">{THCS_SUMMARY['8'].hk2Total}</td>
                        <td className="p-2 text-center border-r border-slate-700 text-blue-200 font-extrabold bg-slate-800">{THCS_SUMMARY['8'].yearTotal}</td>
                      </>
                    )}
                    {(thcsViewMode === 'all_matrix' || thcsViewMode === 'grade_9') && (
                      <>
                        <td className="p-2 text-center border-r border-slate-700 text-indigo-300">{THCS_SUMMARY['9'].hk1Total}</td>
                        <td className="p-2 text-center border-r border-slate-700 text-indigo-300">{THCS_SUMMARY['9'].hk2Total}</td>
                        <td className="p-2 text-center border-r border-slate-700 text-indigo-200 font-extrabold bg-slate-800">{THCS_SUMMARY['9'].yearTotal}</td>
                      </>
                    )}
                    <td className="p-2 text-slate-300 text-[10px]">
                      Kế hoạch chuẩn 35 tuần năm học
                    </td>
                  </tr>

                  {/* Summary row 2: BÌNH QUÂN SỐ TIẾT/TUẦN */}
                  <tr className="bg-teal-950 text-white font-bold text-xs">
                    <td colSpan={2} className="p-3 text-right uppercase tracking-wider text-teal-300 border-r border-teal-900">
                      BÌNH QUÂN SỐ TIẾT/TUẦN
                    </td>
                    {(thcsViewMode === 'all_matrix' || thcsViewMode === 'grade_6') && (
                      <>
                        <td className="p-2 text-center border-r border-teal-900 text-amber-300">{THCS_SUMMARY['6'].hk1Avg}</td>
                        <td className="p-2 text-center border-r border-teal-900 text-amber-300">{THCS_SUMMARY['6'].hk2Avg}</td>
                        <td className="p-2 text-center border-r border-teal-900 text-amber-200 font-extrabold bg-teal-900">{THCS_SUMMARY['6'].yearAvg}</td>
                      </>
                    )}
                    {(thcsViewMode === 'all_matrix' || thcsViewMode === 'grade_7') && (
                      <>
                        <td className="p-2 text-center border-r border-teal-900 text-amber-300">{THCS_SUMMARY['7'].hk1Avg}</td>
                        <td className="p-2 text-center border-r border-teal-900 text-amber-300">{THCS_SUMMARY['7'].hk2Avg}</td>
                        <td className="p-2 text-center border-r border-teal-900 text-amber-200 font-extrabold bg-teal-900">{THCS_SUMMARY['7'].yearAvg}</td>
                      </>
                    )}
                    {(thcsViewMode === 'all_matrix' || thcsViewMode === 'grade_8') && (
                      <>
                        <td className="p-2 text-center border-r border-teal-900 text-amber-300">{THCS_SUMMARY['8'].hk1Avg}</td>
                        <td className="p-2 text-center border-r border-teal-900 text-amber-300">{THCS_SUMMARY['8'].hk2Avg}</td>
                        <td className="p-2 text-center border-r border-teal-900 text-amber-200 font-extrabold bg-teal-900">{THCS_SUMMARY['8'].yearAvg}</td>
                      </>
                    )}
                    {(thcsViewMode === 'all_matrix' || thcsViewMode === 'grade_9') && (
                      <>
                        <td className="p-2 text-center border-r border-teal-900 text-amber-300">{THCS_SUMMARY['9'].hk1Avg}</td>
                        <td className="p-2 text-center border-r border-teal-900 text-amber-300">{THCS_SUMMARY['9'].hk2Avg}</td>
                        <td className="p-2 text-center border-r border-teal-900 text-amber-200 font-extrabold bg-teal-900">{THCS_SUMMARY['9'].yearAvg}</td>
                      </>
                    )}
                    <td className="p-2 text-teal-200 text-[10px]">
                      HK1 chia 18 tuần, HK2 chia 17 tuần
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: CẤU HÌNH SỐ TIẾT HỆ THỐNG (Database Subjects)
          ========================================================= */}
      {activeTab === 'config' && (
        <div className="space-y-4">
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-950">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block text-sm mb-1 text-amber-900">
                Cấu hình số tiết định mức trong dữ liệu phân công giảng dạy:
              </strong>
              <p className="text-amber-800 leading-relaxed">
                Khu vực này cho phép Ban Giám hiệu / Quản trị viên cập nhật trực tiếp số tiết chuẩn theo tuần của từng môn học trong cơ sở dữ liệu.
                Các thay đổi tại đây sẽ được áp dụng tự động vào thuật toán phân công chuyên môn và tạo thời khóa biểu.
              </p>
            </div>
          </div>

          {/* Grade Selector for Config */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Chọn khối cần xem / cấu hình:</span>
              <div className="flex flex-wrap items-center gap-1">
                {(['10', '11', '12', '6', '7', '8', '9'] as GradeLevel[]).map(g => {
                  const isThpt = ['10', '11', '12'].includes(g);
                  return (
                    <button
                      key={g}
                      onClick={() => setConfigGrade(g)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        configGrade === g
                          ? isThpt
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Khối {g} ({isThpt ? 'THPT' : 'THCS'})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="text-xs font-semibold text-slate-600">
              Tổng số tiết/tuần hiện tại Khối {configGrade}:{' '}
              <strong className="text-indigo-700 font-extrabold text-sm">
                {subjects.reduce((sum, s) => sum + (s.defaultPeriods[configGrade] || 0), 0)} tiết
              </strong>
            </div>
          </div>

          {/* Subjects Config Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-[11px]">
                    <th className="p-2.5 w-10 text-center">STT</th>
                    <th className="p-2.5">Tên Môn Học Trong Hệ Thống</th>
                    <th className="p-2.5">Mã Viết Tắt</th>
                    <th className="p-2.5">Tổ Chuyên Môn</th>
                    <th className="p-2.5">Loại Môn</th>
                    <th className="p-2.5 text-center w-36 bg-amber-50/60 text-amber-950 font-bold">
                      Tiết/Tuần (Khối {configGrade})
                    </th>
                    <th className="p-2.5 text-center">Khối 10</th>
                    <th className="p-2.5 text-center">Khối 11</th>
                    <th className="p-2.5 text-center">Khối 12</th>
                    <th className="p-2.5 text-center">Khối 6</th>
                    <th className="p-2.5 text-center">Khối 7</th>
                    <th className="p-2.5 text-center">Khối 8</th>
                    <th className="p-2.5 text-center">Khối 9</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {subjects.filter(s => s.id !== 'sub-nv').map((sub, idx) => {
                    const dept = deptMap.get(sub.departmentId);
                    const currentPeriod = sub.defaultPeriods[configGrade] || 0;

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 text-center font-medium text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="p-2.5 font-bold text-slate-900 flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: sub.color }}
                          />
                          <span>{sub.name}</span>
                        </td>
                        <td className="p-2.5 font-semibold text-indigo-700">
                          {sub.shortName}
                        </td>
                        <td className="p-2.5 text-slate-600 font-medium">
                          {dept?.name}
                        </td>
                        <td className="p-2.5">
                          {sub.isElective ? (
                            <span className="text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                              Lựa Chọn
                            </span>
                          ) : (
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                              Bắt Buộc
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center bg-amber-50/30">
                          <div className="flex items-center justify-center gap-1">
                            {isAdmin ? (
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="10"
                                value={currentPeriod}
                                onChange={e =>
                                  onUpdateSubjectPeriod(sub.id, configGrade, Number(e.target.value))
                                }
                                className="w-14 p-1 text-center font-bold text-slate-900 border border-amber-300 rounded focus:border-indigo-500 focus:outline-hidden bg-white"
                              />
                            ) : (
                              <span className="w-14 p-1 text-center font-bold text-slate-900 bg-slate-100 rounded inline-block">
                                {currentPeriod}
                              </span>
                            )}
                            <span className="text-slate-500 font-medium text-[10px]">tiết</span>
                          </div>
                        </td>
                        <td className="p-2.5 text-center font-semibold text-slate-700">{sub.defaultPeriods['10'] || 0}</td>
                        <td className="p-2.5 text-center font-semibold text-slate-700">{sub.defaultPeriods['11'] || 0}</td>
                        <td className="p-2.5 text-center font-semibold text-slate-700">{sub.defaultPeriods['12'] || 0}</td>
                        <td className="p-2.5 text-center font-semibold text-slate-700">{sub.defaultPeriods['6'] || 0}</td>
                        <td className="p-2.5 text-center font-semibold text-slate-700">{sub.defaultPeriods['7'] || 0}</td>
                        <td className="p-2.5 text-center font-semibold text-slate-700">{sub.defaultPeriods['8'] || 0}</td>
                        <td className="p-2.5 text-center font-semibold text-slate-700">{sub.defaultPeriods['9'] || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
