import React, { useState, useRef } from 'react';
import {
  Teacher,
  Assignment,
  ClassGroup,
  Subject,
  Department,
  SchoolConfig,
  WorkloadStats,
  LockedCell
} from '../types';
import {
  Search,
  Printer,
  FileSpreadsheet,
  ChevronDown,
  Check
} from 'lucide-react';

interface ComprehensiveTableViewProps {
  config: SchoolConfig;
  classes: ClassGroup[];
  subjects: Subject[];
  teachers: Teacher[];
  departments: Department[];
  assignments: Assignment[];
  workloads: WorkloadStats[];
  lockedCells?: LockedCell[];
  isAdmin?: boolean;
  onPromptAdminLogin?: () => void;
  onAssignTeacher: (classId: string, subjectId: string, teacherId: string) => void;
  onExportExcel: () => void;
}

export const ComprehensiveTableView: React.FC<ComprehensiveTableViewProps> = ({
  config,
  classes,
  subjects,
  teachers,
  departments,
  assignments,
  workloads,
  lockedCells = [],
  isAdmin = false,
  onPromptAdminLogin,
  onAssignTeacher,
  onExportExcel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [editingCell, setEditingCell] = useState<{ classId: string; subjectId: string } | null>(null);
  const [printScope, setPrintScope] = useState<'ALL' | 'THPT' | 'THCS'>('ALL');
  const [showPrintMenu, setShowPrintMenu] = useState(false);

  const teacherMap = new Map<string, Teacher>(teachers.map(t => [t.id, t]));
  const lockedSet = new Set(lockedCells.map(lc => `${lc.classId}_${lc.subjectId}`));

  const isThptView = selectedGrade === 'THPT' || selectedGrade === '10' || selectedGrade === '11' || selectedGrade === '12';
  const isThcsView = selectedGrade === 'THCS' || selectedGrade === '6' || selectedGrade === '7' || selectedGrade === '8' || selectedGrade === '9';

  const displayAcademicYear = (!config.academicYear || config.academicYear.includes('2024'))
    ? '2026 - 2027'
    : config.academicYear;

  const displayVicePrincipal = (config.vicePrincipalName && config.vicePrincipalName.includes('-'))
    ? 'Nguyễn Minh Trí'
    : (config.vicePrincipalName || 'Nguyễn Minh Trí');

  const getSubjectsForLevel = (level: 'THPT' | 'THCS') => subjects.filter(sub => {
    if (sub.id === 'sub-nv') return false;
    // Keep one display column for subjects that have legacy/import aliases.
    if (sub.id === 'sub-qpan' || sub.id === 'sub-hdtn-shl') return false;
    const grades = level === 'THPT' ? ['10', '11', '12'] : ['6', '7', '8', '9'];
    return grades.some(grade => (sub.defaultPeriods[grade] || 0) > 0);
  });

  const matchesSearch = (cls: ClassGroup) => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    const homeroomTeacher = cls.homeroomTeacherId
      ? teacherMap.get(cls.homeroomTeacherId)
      : undefined;
    return cls.name.toLowerCase().includes(term)
      || homeroomTeacher?.name.toLowerCase().includes(term) === true
      || assignments
        .filter(assignment => assignment.classId === cls.id)
        .some(assignment => teacherMap.get(assignment.teacherId)?.name.toLowerCase().includes(term));
  };

  const getTeacherName = (teacherId?: string) => {
    const teacher = teacherId ? teacherMap.get(teacherId) : undefined;
    return teacher ? (teacher.code || teacher.name) : '';
  };

  const getAssignmentForSubject = (classId: string, subjectId: string) => {
    const subjectIds = subjectId === 'sub-gdqp'
      ? ['sub-gdqp', 'sub-qpan']
      : subjectId === 'sub-shl'
      ? ['sub-shl']
      : subjectId === 'sub-hdtn-qml'
      ? ['sub-hdtn-qml', 'sub-hdtn-shl']
      : [subjectId];
    const assignment = assignments.find(a => a.classId === classId && subjectIds.includes(a.subjectId));
    if (assignment || !['sub-su', 'sub-dia'].includes(subjectId)) return assignment;

    // Combined THCS LS-ĐL assignment
    return assignments.find(a => a.classId === classId && a.subjectId === 'sub-lsdl-cs');
  };

  const triggerPrint = (scope: 'ALL' | 'THPT' | 'THCS') => {
    setPrintScope(scope);
    setShowPrintMenu(false);
    // Allow DOM to update active print scope class before calling print
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Determine which levels to render
  const levelsToRender: ('THPT' | 'THCS')[] = ['THPT', 'THCS'];

  return (
    <div className="w-full px-2 sm:px-4 lg:px-6 py-4 space-y-4 print:p-0 print:m-0 print:w-full print:max-w-none">
      {/* Header Toolbar (Hidden completely in Print) */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm lớp hoặc GVCN..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-7 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-indigo-500 w-48 sm:w-56"
            />
          </div>

          {/* Grade filter */}
          <select
            value={selectedGrade}
            onChange={e => {
              setSelectedGrade(e.target.value);
              if (e.target.value === 'THPT' || ['10', '11', '12'].includes(e.target.value)) {
                setPrintScope('THPT');
              } else if (e.target.value === 'THCS' || ['6', '7', '8', '9'].includes(e.target.value)) {
                setPrintScope('THCS');
              } else {
                setPrintScope('ALL');
              }
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-slate-700 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">Toàn trường ({classes.length} lớp: K6 - K12)</option>
            <option value="THPT">Điểm chính THPT ({classes.filter(c => c.level === 'THPT').length} lớp: K10 - K12)</option>
            <option value="12">Khối 12 THPT ({classes.filter(c => c.grade === '12').length} lớp)</option>
            <option value="11">Khối 11 THPT ({classes.filter(c => c.grade === '11').length} lớp)</option>
            <option value="10">Khối 10 THPT ({classes.filter(c => c.grade === '10').length} lớp)</option>
            <option value="THCS">Khối THCS ({classes.filter(c => c.level === 'THCS').length} lớp: K6 - K9)</option>
            <option value="6">Khối 6 THCS ({classes.filter(c => c.grade === '6').length} lớp)</option>
            <option value="7">Khối 7 THCS ({classes.filter(c => c.grade === '7').length} lớp)</option>
            <option value="8">Khối 8 THCS ({classes.filter(c => c.grade === '8').length} lớp)</option>
            <option value="9">Khối 9 THCS ({classes.filter(c => c.grade === '9').length} lớp)</option>
          </select>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 relative">
          {/* Print Dropdown Button */}
          <div className="relative inline-block text-left">
            <div className="flex rounded-md shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  const scope = isThptView ? 'THPT' : isThcsView ? 'THCS' : 'ALL';
                  triggerPrint(scope);
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-l-md text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-all cursor-pointer"
                title="In Báo Cáo chuẩn thể thức văn bản hành chính (A4 nằm ngang)"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-600" />
                <span>In Báo Cáo</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPrintMenu(!showPrintMenu)}
                className="px-1.5 py-1 rounded-r-md text-slate-600 bg-slate-50 hover:bg-slate-100 border-y border-r border-slate-300 transition-all cursor-pointer"
                title="Tùy chọn in"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Print Scope Dropdown Menu */}
            {showPrintMenu && (
              <div className="origin-top-right absolute right-0 mt-1 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 py-1 text-xs">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 border-b border-slate-100">
                  CHỌN PHẠM VI IN (A4 NẰM NGANG)
                </div>
                <button
                  onClick={() => triggerPrint('THPT')}
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="font-bold">In Cấp THPT (Khối 10 - 12)</div>
                    <div className="text-[10px] text-slate-500">Trọn vẹn 1 trang A4 nằm ngang</div>
                  </div>
                  {printScope === 'THPT' && <Check className="w-4 h-4 text-indigo-600" />}
                </button>
                <button
                  onClick={() => triggerPrint('THCS')}
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="font-bold">In Cấp THCS (Khối 6 - 9)</div>
                    <div className="text-[10px] text-slate-500">Trọn vẹn 1 trang A4 nằm ngang</div>
                  </div>
                  {printScope === 'THCS' && <Check className="w-4 h-4 text-indigo-600" />}
                </button>
                <button
                  onClick={() => triggerPrint('ALL')}
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 flex items-center justify-between border-t border-slate-100 cursor-pointer"
                >
                  <div>
                    <div className="font-bold">In Toàn Trường (Cả THPT & THCS)</div>
                    <div className="text-[10px] text-slate-500">Mỗi cấp học 1 trang A4 ngang riêng</div>
                  </div>
                  {printScope === 'ALL' && <Check className="w-4 h-4 text-indigo-600" />}
                </button>
              </div>
            )}
          </div>

          {isAdmin && (
            <button
              onClick={onExportExcel}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Xuất Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* Screen View Header Card (Only visible on web screen, NOT printed) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-3.5 print:hidden">
        <div className="flex justify-between items-start text-xs uppercase font-bold text-slate-700 mb-2">
          <div className="text-left">
            <div className="text-[11px] text-slate-500">{config.subTitle}</div>
            <div className="text-indigo-950 font-extrabold">{config.schoolName}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-slate-500">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div className="font-normal normal-case text-[11px] text-slate-600">Độc lập - Tự do - Hạnh phúc</div>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 uppercase tracking-tight">
            BẢNG TỔNG HỢP PHÂN CÔNG CHUYÊN MÔN GIẢNG DẠY
          </h2>
          <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
            {config.semester === 'HK1' ? 'HỌC KỲ I' : 'HỌC KỲ II'} - NĂM HỌC {displayAcademicYear} (Chương trình GDPT 2018)
          </p>
        </div>
      </div>

      {/* Official Table Sections */}
      {levelsToRender.map((level, levelIdx) => {
        const isThpt = level === 'THPT';

        // Check if this level should be hidden when printing a specific scope
        const isHiddenInPrint =
          (printScope === 'THPT' && !isThpt) ||
          (printScope === 'THCS' && isThpt);

        // Filter classes for this level
        const levelClasses = classes.filter(cls =>
          cls.level === level &&
          matchesSearch(cls) &&
          (selectedGrade === 'ALL' || selectedGrade === level || cls.grade === selectedGrade)
        );

        if (levelClasses.length === 0) return null;

        const levelSubjects = getSubjectsForLevel(level);

        return (
          <div
            key={level}
            className={`w-full bg-white rounded-lg border border-slate-200 shadow-2xs p-3 print:p-0 print:border-none print:shadow-none print:m-0 comprehensive-print-container ${
              isHiddenInPrint ? 'print:hidden' : ''
            } ${levelIdx > 0 && printScope === 'ALL' ? 'print-page-break' : ''}`}
          >
            {/* =========================================================================
                FORMAL VIETNAMESE ADMINISTRATIVE HEADER (Strictly according to Nghị định 30/2020/NĐ-CP)
                Visible ONLY during Print, hidden on screen
                ========================================================================= */}
            <div className="hidden print:block mb-2 font-['Times_New_Roman',serif] text-black">
              <table className="w-full border-none mb-1 text-black" style={{ borderCollapse: 'collapse' }}>
                <tbody>
                  <tr className="align-top">
                    <td className="w-1/2 text-center p-0 border-none" style={{ border: 'none' }}>
                      <div className="text-[10pt] uppercase tracking-normal" style={{ fontSize: '10pt', fontWeight: 'normal' }}>
                        SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP
                      </div>
                      <div className="text-[10pt] uppercase font-bold tracking-tight" style={{ fontSize: '10pt', fontWeight: 'bold' }}>
                        TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU
                      </div>
                      <div className="w-28 mx-auto my-0.5 border-b border-black" style={{ width: '120px', margin: '2px auto', borderBottom: '1px solid black' }}></div>
                    </td>
                    <td className="w-1/2 text-center p-0 border-none" style={{ border: 'none' }}>
                      <div className="text-[10pt] uppercase font-bold" style={{ fontSize: '10pt', fontWeight: 'bold' }}>
                        CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                      </div>
                      <div className="text-[10pt] font-bold" style={{ fontSize: '10pt', fontWeight: 'bold' }}>
                        Độc lập - Tự do - Hạnh phúc
                      </div>
                      <div className="w-36 mx-auto my-0.5 border-b border-black" style={{ width: '150px', margin: '2px auto', borderBottom: '1.2px solid black' }}></div>
                      <div className="text-[9pt] italic font-normal mt-0.5" style={{ fontSize: '9pt', fontStyle: 'italic' }}>
                        Đồng Tháp, ngày ..... tháng ..... năm 2026
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="text-center my-1.5">
                <h1 className="text-[12.5pt] font-bold uppercase tracking-wide" style={{ fontSize: '12.5pt', fontWeight: 'bold' }}>
                  BẢNG TỔNG HỢP PHÂN CÔNG CHUYÊN MÔN GIẢNG DẠY
                </h1>
                <div className="text-[10pt] font-bold uppercase mt-0.5" style={{ fontSize: '10pt', fontWeight: 'bold' }}>
                  {isThpt ? 'CẤP TRUNG HỌC PHỔ THÔNG (KHỐI 10 - 12)' : 'CẤP TRUNG HỌC CƠ SỞ (KHỐI 6 - 9)'}
                </div>
                <div className="text-[8.5pt] italic text-slate-700" style={{ fontSize: '8.5pt', fontStyle: 'italic' }}>
                  {config.semester === 'HK1' ? 'Học kỳ I' : 'Học kỳ II'} - Năm học {displayAcademicYear} (Chương trình GDPT 2018)
                </div>
              </div>
            </div>

            {/* Screen Level Title (Hidden on Print) */}
            <div className={`flex items-center justify-between border-l-4 pl-3 mb-2 print:hidden ${isThpt ? 'border-indigo-600' : 'border-emerald-600'}`}>
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">
                  {isThpt ? 'Khối 10 - 12 (Cấp THPT)' : 'Khối 6 - 9 (Cấp THCS)'}
                </h3>
                <p className="text-[11px] text-slate-500">{levelClasses.length} lớp học • Bảng phân công riêng theo cấp học</p>
              </div>
            </div>

            {/* =========================================================================
                DATA TABLE: Full Width, Proportional Columns, No Cut-Off on A4 Landscape
                ========================================================================= */}
            <div className="overflow-x-auto border border-slate-300 rounded-lg comprehensive-print-table-wrapper print:overflow-visible print:border-none print:rounded-none">
              <table
                className="w-full text-xs text-left border-collapse comprehensive-print-table print:w-full print:table-fixed print:min-w-0"
              >
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 print:bg-slate-200">
                    <th className="p-1 border border-slate-300 text-center w-7 print:w-[2.5%] text-[10px] print:text-[7pt]">STT</th>
                    <th className="p-1 border border-slate-300 text-center w-10 print:w-[4.8%] text-[10px] print:text-[7pt]">Lớp</th>
                    <th className="p-1 border border-slate-300 text-center w-9 print:w-[3%] text-[10px] print:text-[7pt]">Sĩ số</th>
                    <th className="p-1 border border-slate-300 text-left w-28 print:w-[8.2%] text-[10px] print:text-[7pt] print:text-center">GV Chủ Nhiệm</th>
                    {levelSubjects.map(sub => (
                      <th
                        key={sub.id}
                        className="p-1 border border-slate-300 text-center font-bold text-slate-900 whitespace-nowrap text-[10px] print:text-[7pt] print:font-bold"
                        style={{ width: isThpt ? '4.2%' : '5.8%' }}
                      >
                        <div>{sub.shortName}</div>
                        <div className="text-[8px] print:text-[6pt] text-slate-500 print:text-black font-normal">
                          {sub.defaultPeriods[isThpt ? '10' : '6'] || 0}t
                        </div>
                      </th>
                    ))}
                    {isThpt && ['CĐ1', 'CĐ2', 'CĐ3'].map(topic => (
                      <th
                        key={topic}
                        className="p-1 border border-slate-300 text-center bg-sky-50 text-sky-950 text-[10px] print:bg-slate-200 print:text-black print:text-[7pt] font-bold"
                        style={{ width: '5.2%' }}
                      >
                        {topic}
                        <div className="text-[8px] print:text-[6pt] font-normal text-sky-700 print:text-black">
                          C.Đề
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {levelClasses.map((cls, idx) => {
                    const hrTeacher = cls.homeroomTeacherId ? teacherMap.get(cls.homeroomTeacherId) : undefined;
                    return (
                      <tr key={cls.id} className="hover:bg-slate-50 print:bg-transparent">
                        <td className="p-1 border border-slate-300 text-center font-medium text-slate-600 print:text-black text-[10px] print:text-[7pt]">
                          {idx + 1}
                        </td>
                        <td className="p-1 border border-slate-300 text-center font-extrabold text-indigo-900 print:text-black text-xs print:text-[7.5pt]">
                          {cls.name}
                        </td>
                        <td className="p-1 border border-slate-300 text-center font-bold text-slate-800 print:text-black text-[10px] print:text-[7pt]">
                          {cls.studentCount || 0}
                        </td>
                        <td className="p-1 border border-slate-300 text-left print:text-center">
                          {hrTeacher ? (
                            <span className="font-bold text-slate-900 print:text-black text-[10px] print:text-[7pt]">
                              <span className="print:hidden">{hrTeacher.name}</span>
                              <span className="hidden print:inline">{hrTeacher.code || hrTeacher.name}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[9px] print:text-[6.5pt]">—</span>
                          )}
                        </td>

                        {levelSubjects.map(sub => {
                          const periods = sub.defaultPeriods[cls.grade] || 0;
                          const assignment = getAssignmentForSubject(cls.id, sub.id);
                          const assignedTeacher = assignment ? teacherMap.get(assignment.teacherId) : null;
                          const displayedTeacher = assignedTeacher || (
                            !isThpt && sub.id === 'sub-shl' && cls.homeroomTeacherId
                              ? teacherMap.get(cls.homeroomTeacherId)
                              : null
                          );
                          const isEditing = editingCell?.classId === cls.id && editingCell?.subjectId === sub.id;

                          if (periods === 0) {
                            return (
                              <td
                                key={sub.id}
                                className="p-0.5 border border-slate-300 text-center bg-slate-100/60 print:bg-transparent text-slate-300 print:text-slate-400 text-[9px] print:text-[6.5pt]"
                              >
                                —
                              </td>
                            );
                          }

                          return (
                            <td
                              key={sub.id}
                              onClick={() => isAdmin ? setEditingCell({ classId: cls.id, subjectId: sub.id }) : onPromptAdminLogin?.()}
                              className={`p-0.5 border border-slate-300 text-center transition-colors ${
                                isAdmin ? 'cursor-pointer hover:bg-indigo-50/40' : 'cursor-default'
                              }`}
                              title={!isAdmin ? 'Chế độ xem' : 'Bấm để gán giáo viên'}
                            >
                              {/* Admin inline edit on screen only */}
                              {isEditing && isAdmin ? (
                                <select
                                  autoFocus
                                  value={assignedTeacher?.id || ''}
                                  onChange={e => {
                                    if (e.target.value) onAssignTeacher(cls.id, sub.id, e.target.value);
                                    setEditingCell(null);
                                  }}
                                  onBlur={() => setEditingCell(null)}
                                  className="text-[10px] p-0.5 border border-indigo-500 rounded bg-white w-full print:hidden"
                                >
                                  <option value="">-- Bỏ gán --</option>
                                  {teachers
                                    .filter(t => t.primarySubjectId === sub.id || t.departmentId === sub.departmentId)
                                    .map(t => (
                                      <option key={t.id} value={t.id}>
                                        {t.name} ({t.code})
                                      </option>
                                    ))}
                                </select>
                              ) : null}

                              {/* Teacher Display */}
                              {displayedTeacher ? (
                                <span className="font-bold text-indigo-950 print:text-black text-[10px] print:text-[7pt] block truncate leading-tight">
                                  {displayedTeacher.code || displayedTeacher.name}
                                </span>
                              ) : lockedSet.has(`${cls.id}_${sub.id}`) ? (
                                <span className="text-amber-800/80 print:text-slate-500 font-medium text-[9px] print:text-[6.5pt]">
                                  Khóa
                                </span>
                              ) : (
                                <span className="text-slate-300 print:text-slate-400 text-[9px] print:text-[6.5pt]">
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}

                        {/* Special Topics for THPT */}
                        {isThpt && (['cd1', 'cd2', 'cd3'] as const).map(topicKey => {
                          const topic = cls.specialTopics?.[topicKey];
                          return (
                            <td
                              key={topicKey}
                              className="p-0.5 border border-slate-300 text-center bg-sky-50/50 print:bg-transparent"
                            >
                              {topic ? (
                                <div className="leading-tight">
                                  <div className="text-[9px] print:text-[6pt] font-medium text-sky-800 print:text-slate-700 truncate">
                                    {topic.title}
                                  </div>
                                  <div className="text-[10px] print:text-[6.8pt] font-black text-sky-950 print:text-black truncate">
                                    {getTeacherName(topic.teacherId)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-300 print:text-slate-400 text-[9px] print:text-[6.5pt]">
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* =========================================================================
                FORMAL SIGNATURES FOR PRINT (Strictly according to Nghị định 30/2020/NĐ-CP)
                ========================================================================= */}
            <div className="hidden print:block mt-3 pt-1 border-t border-black text-black font-['Times_New_Roman',serif]">
              <div className="grid grid-cols-2 text-center text-[9.5pt]">
                <div>
                  <div className="font-bold uppercase mb-12">NGƯỜI LẬP BẢNG</div>
                  <div className="font-bold">{displayVicePrincipal}</div>
                </div>
                <div>
                  <div className="italic text-[8.5pt] mb-0.5">
                    Đồng Tháp, ngày ..... tháng ..... năm 2026
                  </div>
                  <div className="font-bold uppercase mb-12">HIỆU TRƯỞNG</div>
                  <div className="font-bold">{config.principalName}</div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Screen Footer Signatures Card (Only visible on screen) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4 print:hidden">
        <div className="grid grid-cols-2 text-center text-xs font-semibold text-slate-800">
          <div>
            <div className="uppercase font-bold text-slate-900 mb-8">NGƯỜI LẬP BẢNG</div>
            <div className="font-bold text-slate-900">{displayVicePrincipal}</div>
          </div>
          <div>
            <div className="italic text-slate-500 font-normal mb-1">
              Đốc Binh Kiều, ngày ..... tháng ..... năm 2026
            </div>
            <div className="uppercase font-bold text-slate-900 mb-8">HIỆU TRƯỞNG</div>
            <div className="font-extrabold text-slate-900">{config.principalName}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
