import React, { useState } from 'react';
import {
  Teacher,
  Assignment,
  ClassGroup,
  Subject,
  SchoolConfig,
  WorkloadStats
} from '../types';
import {
  Search,
  Printer,
  FileSpreadsheet,
  GraduationCap,
  Building2,
  Filter
} from 'lucide-react';

interface ThcsOfficialTableViewProps {
  config: SchoolConfig;
  classes: ClassGroup[];
  subjects: Subject[];
  teachers: Teacher[];
  assignments: Assignment[];
  workloads: WorkloadStats[];
  isAdmin?: boolean;
  onPromptAdminLogin?: () => void;
  onAssignTeacher: (classId: string, subjectId: string, teacherId: string) => void;
  onAssignHomeroom?: (classId: string, teacherId: string | undefined) => void;
  onExportExcel: () => void;
}

type CampusFilter = 'ALL' | 'DBK' | 'TK';

export const ThcsOfficialTableView: React.FC<ThcsOfficialTableViewProps> = ({
  config,
  classes,
  subjects,
  teachers,
  assignments,
  workloads,
  isAdmin = false,
  onPromptAdminLogin,
  onAssignTeacher,
  onAssignHomeroom,
  onExportExcel
}) => {
  const [selectedCampus, setSelectedCampus] = useState<CampusFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<'ALL' | '6' | '7' | '8' | '9'>('ALL');
  const [editingCell, setEditingCell] = useState<{
    classId: string;
    type: 'subject' | 'homeroom';
    subjectId?: string;
  } | null>(null);

  const teacherMap = new Map<string, Teacher>(teachers.map(t => [t.id, t]));

  // Subject configurations for THCS Grades 6, 7 (KHTN 4t, Tin học 1t, Công nghệ 1t)
  const thcs67SubjectCols: { id: string; name: string; shortName: string; periods: number | string }[] = [
    { id: 'sub-van', name: 'Ngữ văn', shortName: 'Văn', periods: 4 },
    { id: 'sub-toan', name: 'Toán học', shortName: 'Toán', periods: 4 },
    { id: 'sub-anh', name: 'Tiếng Anh', shortName: 'T.Anh', periods: 3 },
    { id: 'sub-khtn-cs', name: 'KHTN', shortName: 'KHTN', periods: 4 },
    { id: 'sub-su', name: 'Lịch sử', shortName: 'Sử', periods: 1.5 },
    { id: 'sub-dia', name: 'Địa lí', shortName: 'Địa', periods: 1.5 },
    { id: 'sub-gdcd', name: 'GDCD', shortName: 'GDCD', periods: 1 },
    { id: 'sub-tin', name: 'Tin học', shortName: 'Tin', periods: 1 },
    { id: 'sub-gdtc', name: 'GD Thể chất', shortName: 'TD', periods: 2 },
    { id: 'sub-am-nhac', name: 'Âm nhạc', shortName: 'Âm nhạc', periods: 1 },
    { id: 'sub-my-thuat', name: 'Mỹ thuật', shortName: 'Mỹ thuật', periods: 1 },
    { id: 'sub-cn', name: 'Công nghệ', shortName: 'C.Nghệ', periods: 1 },
    { id: 'sub-hdtn', name: 'HĐTN-HN', shortName: 'HĐTN', periods: 3 },
    { id: 'sub-gddp', name: 'GD Địa phương', shortName: 'GDĐP', periods: 1 },
  ];

  // Subject configurations for THCS Grade 8 (KHTN: Lý 1.3t, Hóa 1.3t, Sinh 1.4t; Tin 1t, CN 1t)
  const thcs8SubjectCols: { id: string; name: string; shortName: string; periods: number | string }[] = [
    { id: 'sub-van', name: 'Ngữ văn', shortName: 'Văn', periods: 4 },
    { id: 'sub-toan', name: 'Toán học', shortName: 'Toán', periods: 4 },
    { id: 'sub-anh', name: 'Tiếng Anh', shortName: 'T.Anh', periods: 3 },
    { id: 'sub-li', name: 'Vật lí (KHTN)', shortName: 'Lí', periods: 1.3 },
    { id: 'sub-hoa', name: 'Hóa học (KHTN)', shortName: 'Hóa', periods: 1.3 },
    { id: 'sub-sinh', name: 'Sinh học (KHTN)', shortName: 'Sinh', periods: 1.4 },
    { id: 'sub-su', name: 'Lịch sử', shortName: 'Sử', periods: 1.5 },
    { id: 'sub-dia', name: 'Địa lí', shortName: 'Địa', periods: 1.5 },
    { id: 'sub-gdcd', name: 'GDCD', shortName: 'GDCD', periods: 1 },
    { id: 'sub-tin', name: 'Tin học', shortName: 'Tin', periods: 1 },
    { id: 'sub-gdtc', name: 'GD Thể chất', shortName: 'TD', periods: 2 },
    { id: 'sub-am-nhac', name: 'Âm nhạc', shortName: 'Âm nhạc', periods: 1 },
    { id: 'sub-my-thuat', name: 'Mỹ thuật', shortName: 'Mỹ thuật', periods: 1 },
    { id: 'sub-cn', name: 'Công nghệ', shortName: 'C.Nghệ', periods: 1 },
    { id: 'sub-hdtn', name: 'HĐTN-HN', shortName: 'HĐTN', periods: 3 },
    { id: 'sub-gddp', name: 'GD Địa phương', shortName: 'GDĐP', periods: 1 },
  ];

  // Subject configurations for THCS Grade 9 (KHTN: Lý 1.3t, Hóa 1.7t, Sinh 1t; Tin 1t, CN 1t)
  const thcs9SubjectCols: { id: string; name: string; shortName: string; periods: number | string }[] = [
    { id: 'sub-van', name: 'Ngữ văn', shortName: 'Văn', periods: 4 },
    { id: 'sub-toan', name: 'Toán học', shortName: 'Toán', periods: 4 },
    { id: 'sub-anh', name: 'Tiếng Anh', shortName: 'T.Anh', periods: 3 },
    { id: 'sub-li', name: 'Vật lí (KHTN)', shortName: 'Lí', periods: 1.3 },
    { id: 'sub-hoa', name: 'Hóa học (KHTN)', shortName: 'Hóa', periods: 1.7 },
    { id: 'sub-sinh', name: 'Sinh học (KHTN)', shortName: 'Sinh', periods: 1 },
    { id: 'sub-su', name: 'Lịch sử', shortName: 'Sử', periods: 1.5 },
    { id: 'sub-dia', name: 'Địa lí', shortName: 'Địa', periods: 1.5 },
    { id: 'sub-gdcd', name: 'GDCD', shortName: 'GDCD', periods: 1 },
    { id: 'sub-tin', name: 'Tin học', shortName: 'Tin', periods: 1 },
    { id: 'sub-gdtc', name: 'GD Thể chất', shortName: 'TD', periods: 2 },
    { id: 'sub-am-nhac', name: 'Âm nhạc', shortName: 'Âm nhạc', periods: 1 },
    { id: 'sub-my-thuat', name: 'Mỹ thuật', shortName: 'Mỹ thuật', periods: 1 },
    { id: 'sub-cn', name: 'Công nghệ', shortName: 'C.Nghệ', periods: 1 },
    { id: 'sub-hdtn', name: 'HĐTN-HN', shortName: 'HĐTN', periods: 3 },
    { id: 'sub-gddp', name: 'GD Địa phương', shortName: 'GDĐP', periods: 1 },
  ];

  const getColsForGrade = (grade: string) => {
    if (grade === '6' || grade === '7') return thcs67SubjectCols;
    if (grade === '8') return thcs8SubjectCols;
    return thcs9SubjectCols;
  };

  const thcsClasses = classes.filter(c => c.level === 'THCS');

  // Helper to determine if a class belongs to Đốc Binh Kiều or Tân Kiều
  const isDbkClass = (cls: ClassGroup) => {
    if (cls.campus === 'THCSDBK') return true;
    if (cls.campus === 'THCSTK') return false;
    const num = parseInt(cls.name.replace(/[^0-9]/g, '').slice(1), 10);
    return !isNaN(num) && num <= 6;
  };

  const dbkClasses = thcsClasses.filter(isDbkClass);
  const tkClasses = thcsClasses.filter(cls => !isDbkClass(cls));

  const campusesToRender: {
    key: 'DBK' | 'TK';
    campusName: string;
    tableTitle: string;
    classes: ClassGroup[];
  }[] = [];

  if (selectedCampus === 'ALL' || selectedCampus === 'DBK') {
    campusesToRender.push({
      key: 'DBK',
      campusName: 'Điểm trường THCS Đốc Binh Kiều',
      tableTitle: 'PHÂN CÔNG CHUYÊN MÔN HỆ THCS (ĐIỂM TRƯỜNG ĐỐC BINH KIỀU)',
      classes: dbkClasses
    });
  }

  if (selectedCampus === 'ALL' || selectedCampus === 'TK') {
    campusesToRender.push({
      key: 'TK',
      campusName: 'Điểm trường Tân Kiều',
      tableTitle: 'PHÂN CÔNG CHUYÊN MÔN HỆ THCS (ĐIỂM TRƯỜNG TÂN KIỀU)',
      classes: tkClasses
    });
  }

  const handlePrint = () => {
    window.print();
  };

  const getTeacherDisplayName = (t?: Teacher) => {
    if (!t) return '';
    if (t.code.includes('.')) {
      const parts = t.code.split(' ');
      return parts[0].replace('(', '').replace(')', '');
    }
    return t.name.split(' ').pop() || t.name;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-5">
      {/* Top Toolbar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-md">
              <GraduationCap className="w-4 h-4" />
            </span>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900">
                Phân Công Chuyên Môn Hệ THCS (Chính Thức)
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Năm học {config.academicYear || '2026 - 2027'} • Chương trình GDPT 2018
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* Campus Switcher */}
          <div className="flex items-center bg-emerald-50/70 p-0.5 rounded-lg border border-emerald-200 text-xs">
            <button
              onClick={() => setSelectedCampus('ALL')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                selectedCampus === 'ALL'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-emerald-900 hover:bg-emerald-100/70'
              }`}
            >
              Cả 2 Điểm Trường ({thcsClasses.length} lớp)
            </button>
            <button
              onClick={() => setSelectedCampus('DBK')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                selectedCampus === 'DBK'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-emerald-900 hover:bg-emerald-100/70'
              }`}
            >
              Đốc Binh Kiều ({dbkClasses.length} lớp)
            </button>
            <button
              onClick={() => setSelectedCampus('TK')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                selectedCampus === 'TK'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-emerald-900 hover:bg-emerald-100/70'
              }`}
            >
              Tân Kiều ({tkClasses.length} lớp)
            </button>
          </div>

          {/* Grade filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setSelectedGrade('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                selectedGrade === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả khối
            </button>
            <button
              onClick={() => setSelectedGrade('6')}
              className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                selectedGrade === '6'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              K6
            </button>
            <button
              onClick={() => setSelectedGrade('7')}
              className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                selectedGrade === '7'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              K7
            </button>
            <button
              onClick={() => setSelectedGrade('8')}
              className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                selectedGrade === '8'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              K8
            </button>
            <button
              onClick={() => setSelectedGrade('9')}
              className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                selectedGrade === '9'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              K9
            </button>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm lớp hoặc tên giáo viên..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-7 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-emerald-500 w-44 sm:w-48"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>In Bảng Phân Công</span>
          </button>
          <button
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất File Excel</span>
          </button>
        </div>
      </div>

      {/* Main Official Documents per Campus */}
      {campusesToRender.map(campusData => {
        const gradesList = ['6', '7', '8', '9']
          .filter(g => selectedGrade === 'ALL' || selectedGrade === g)
          .map(g => {
            const clsList = campusData.classes.filter(c => c.grade === g);
            const cols = getColsForGrade(g);
            return {
              grade: g,
              title: `Khối ${g} (${clsList.map(c => c.name).join(', ')}) - ${campusData.campusName}`,
              classes: clsList,
              cols
            };
          })
          .filter(g => g.classes.length > 0);

        return (
          <div
            key={campusData.key}
            className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 print:p-0 print:border-none print:shadow-none space-y-6 page-break-after"
          >
            {/* Official School Header */}
            <div className="text-center border-b border-slate-200 pb-4">
              <div className="flex justify-between items-start text-xs uppercase font-bold text-slate-700 mb-2">
                <div className="text-left">
                  <div className="text-[11px] text-slate-500">{config.subTitle}</div>
                  <div className="text-indigo-950 font-extrabold text-xs">{config.schoolName}</div>
                  <div className="text-emerald-800 font-bold text-[11px] mt-0.5">{campusData.campusName}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px]">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="font-normal normal-case text-[11px] text-slate-500">
                    Độc lập - Tự do - Hạnh phúc
                  </div>
                </div>
              </div>

              <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight mt-2">
                {campusData.tableTitle}
              </h2>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">
                Học kỳ I - Năm học {config.academicYear || '2026 - 2027'} (Chương trình GDPT 2018)
              </p>
            </div>

            {/* Tables for each grade in this campus */}
            {gradesList.map(gradeGroup => {
              const visibleClasses = gradeGroup.classes.filter(cls => {
                if (!searchTerm) return true;
                const term = searchTerm.toLowerCase();
                const hrTeacher = teacherMap.get(cls.homeroomTeacherId || '');
                if (cls.name.toLowerCase().includes(term)) return true;
                if (hrTeacher?.name.toLowerCase().includes(term) || hrTeacher?.code.toLowerCase().includes(term)) return true;
                return assignments
                  .filter(a => a.classId === cls.id)
                  .some(a => {
                    const t = teacherMap.get(a.teacherId);
                    return t && (t.name.toLowerCase().includes(term) || t.code.toLowerCase().includes(term));
                  });
              });

              if (visibleClasses.length === 0) return null;

              return (
                <div key={gradeGroup.grade} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                      {gradeGroup.title}
                    </h3>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {visibleClasses.length} lớp học
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-slate-300 rounded-lg">
                    <table className="w-full text-xs text-center border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300 text-[11px]">
                          <th className="p-2 border border-slate-300 w-16 bg-slate-200/80 font-black">
                            Lớp
                          </th>
                          {gradeGroup.cols.map(col => (
                            <th
                              key={col.id}
                              className="p-1.5 border border-slate-300 min-w-[55px] font-bold text-slate-900 whitespace-nowrap"
                            >
                              <div>{col.shortName}</div>
                              <div className="text-[9px] text-emerald-800 font-semibold">{col.periods}t</div>
                            </th>
                          ))}
                          <th className="p-2 border border-slate-300 min-w-[75px] bg-amber-50 font-black text-amber-950">
                            GVCN
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {visibleClasses.map(cls => {
                          const hrTeacher = cls.homeroomTeacherId
                            ? teacherMap.get(cls.homeroomTeacherId)
                            : null;

                          const isEditingHr =
                            editingCell?.classId === cls.id &&
                            editingCell?.type === 'homeroom';

                          return (
                            <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* Class Name */}
                              <td className="p-2 border border-slate-300 font-black text-emerald-950 text-xs bg-slate-50/50">
                                {cls.name}
                              </td>

                              {/* Subjects */}
                              {gradeGroup.cols.map(col => {
                                const assignment = assignments.find(
                                  a => a.classId === cls.id && a.subjectId === col.id
                                );
                                const assignedTeacher = assignment
                                  ? teacherMap.get(assignment.teacherId)
                                  : null;

                                const isEditing =
                                  editingCell?.classId === cls.id &&
                                  editingCell?.type === 'subject' &&
                                  editingCell?.subjectId === col.id;

                                return (
                                  <td
                                    key={col.id}
                                    onClick={() => {
                                      if (isAdmin) {
                                        setEditingCell({
                                          classId: cls.id,
                                          type: 'subject',
                                          subjectId: col.id
                                        });
                                      } else {
                                        onPromptAdminLogin?.();
                                      }
                                    }}
                                    className={`p-1 border border-slate-300 relative transition-colors ${
                                      isAdmin
                                        ? 'cursor-pointer hover:bg-emerald-50/50'
                                        : 'cursor-default'
                                    }`}
                                    title={!isAdmin ? "Chế độ xem - Bấm để đăng nhập Quản trị" : "Bấm để chọn giáo viên"}
                                  >
                                    {isEditing && isAdmin ? (
                                      <select
                                        autoFocus
                                        value={assignedTeacher?.id || ''}
                                        onChange={e => {
                                          if (e.target.value) {
                                            onAssignTeacher(cls.id, col.id, e.target.value);
                                          }
                                          setEditingCell(null);
                                        }}
                                        onBlur={() => setEditingCell(null)}
                                        className="text-[11px] p-1 border border-emerald-500 rounded bg-white w-full"
                                      >
                                        <option value="">-- Bỏ phân công --</option>
                                        {teachers
                                          .filter(
                                            t =>
                                              (campusData.key === 'DBK' ? t.campus === 'THCSDBK' || !t.campus : t.campus === 'THCSTK' || !t.campus) ||
                                              t.departmentId === 'dept-bgh' ||
                                              t.primarySubjectId === col.id ||
                                              t.secondarySubjectIds?.includes(col.id)
                                          )
                                          .map(t => (
                                            <option key={t.id} value={t.id}>
                                              {t.name} ({t.code})
                                            </option>
                                          ))}
                                      </select>
                                    ) : (
                                      <div>
                                        {assignedTeacher ? (
                                          <span className="font-extrabold text-slate-900 text-[11px]">
                                            {getTeacherDisplayName(assignedTeacher)}
                                          </span>
                                        ) : (
                                          <span className="text-slate-300 text-[10px]">—</span>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}

                              {/* GVCN */}
                              <td
                                onClick={() => {
                                  if (isAdmin) {
                                    setEditingCell({
                                      classId: cls.id,
                                      type: 'homeroom'
                                    });
                                  } else {
                                    onPromptAdminLogin?.();
                                  }
                                }}
                                className={`p-1 border border-slate-300 bg-amber-50/40 transition-colors ${
                                  isAdmin ? 'cursor-pointer hover:bg-amber-100/60' : 'cursor-default'
                                }`}
                                title={!isAdmin ? "Chế độ xem - Bấm để đăng nhập Quản trị" : "Bấm để gán GVCN"}
                              >
                                {isEditingHr && isAdmin ? (
                                  <select
                                    autoFocus
                                    value={hrTeacher?.id || ''}
                                    onChange={e => {
                                      onAssignHomeroom?.(cls.id, e.target.value || undefined);
                                      setEditingCell(null);
                                    }}
                                    onBlur={() => setEditingCell(null)}
                                    className="text-[11px] p-1 border border-amber-500 rounded bg-white w-full"
                                  >
                                    <option value="">-- Chưa xếp GVCN --</option>
                                    {teachers
                                      .filter(t => (campusData.key === 'DBK' ? t.campus === 'THCSDBK' : t.campus === 'THCSTK') || t.baseStandardPeriods === 19)
                                      .map(t => (
                                        <option key={t.id} value={t.id}>
                                          {t.name} ({t.code})
                                        </option>
                                      ))}
                                  </select>
                                ) : (
                                  <div>
                                    {hrTeacher ? (
                                      <span className="font-black text-amber-950 text-[11px]">
                                        {getTeacherDisplayName(hrTeacher)}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 text-[10px]">—</span>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Footer Signatures */}
            <div className="grid grid-cols-2 pt-6 text-center text-xs print:pt-4">
              <div className="space-y-16">
                <div className="font-bold text-slate-700 uppercase">NGƯỜI LẬP BẢNG</div>
                <div className="font-bold text-slate-900">{config.vicePrincipalName.split('-')[0].trim()}</div>
              </div>
              <div className="space-y-16">
                <div>
                  <div className="italic text-slate-500 text-[11px]">Tháp Mười, ngày ... tháng ... năm 2026</div>
                  <div className="font-bold text-slate-700 uppercase mt-1">HIỆU TRƯỞNG</div>
                </div>
                <div className="font-bold text-slate-900">{config.principalName}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
