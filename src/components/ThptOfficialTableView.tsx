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
  CheckCircle2,
  Sparkles,
  School,
  BookOpen
} from 'lucide-react';

interface ThptOfficialTableViewProps {
  config: SchoolConfig;
  classes: ClassGroup[];
  subjects: Subject[];
  teachers: Teacher[];
  assignments: Assignment[];
  workloads: WorkloadStats[];
  isAdmin?: boolean;
  onPromptAdminLogin?: () => void;
  onAssignTeacher: (classId: string, subjectId: string, teacherId: string) => void;
  onUpdateClassSpecialTopic: (classId: string, topicKey: 'cd1' | 'cd2' | 'cd3', title: string, teacherId: string) => void;
  onExportExcel: () => void;
}

export const ThptOfficialTableView: React.FC<ThptOfficialTableViewProps> = ({
  config,
  classes,
  subjects,
  teachers,
  assignments,
  workloads,
  isAdmin = false,
  onPromptAdminLogin,
  onAssignTeacher,
  onUpdateClassSpecialTopic,
  onExportExcel
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<'ALL' | '10' | '11' | '12'>('ALL');
  const [editingCell, setEditingCell] = useState<{
    classId: string;
    type: 'subject' | 'specialTopic';
    subjectId?: string;
    topicKey?: 'cd1' | 'cd2' | 'cd3';
  } | null>(null);

  const teacherMap = new Map<string, Teacher>(teachers.map(t => [t.id, t]));

  // Standard THPT Subject column configuration matching user's document
  const thptSubjectCols: { id: string; name: string; shortName: string; periods: number }[] = [
    { id: 'sub-van', name: 'Ngữ văn', shortName: 'Văn', periods: 3 },
    { id: 'sub-toan', name: 'Toán học', shortName: 'Toán', periods: 3 },
    { id: 'sub-anh', name: 'Tiếng Anh', shortName: 'T.Anh', periods: 3 },
    { id: 'sub-li', name: 'Vật lí', shortName: 'Vật lý', periods: 2 },
    { id: 'sub-hoa', name: 'Hóa học', shortName: 'Hoá học', periods: 2 },
    { id: 'sub-sinh', name: 'Sinh học', shortName: 'Sinh học', periods: 2 },
    { id: 'sub-su', name: 'Lịch sử', shortName: 'Lịch sử', periods: 2 },
    { id: 'sub-dia', name: 'Địa lí', shortName: 'Địa lý', periods: 2 },
    { id: 'sub-gdktpl', name: 'GDKT&PL', shortName: 'GDKTPL', periods: 2 },
    { id: 'sub-tin', name: 'Tin học', shortName: 'Tin học', periods: 2 },
    { id: 'sub-gdtc', name: 'GD Thể chất', shortName: 'TD', periods: 2 },
    { id: 'sub-cn', name: 'Công nghệ', shortName: 'C.Nghệ', periods: 2 },
    { id: 'sub-gdqp', name: 'GDQP&AN', shortName: 'GDQP', periods: 1 },
    { id: 'sub-gddp', name: 'GD Địa phương', shortName: 'GDĐP', periods: 3 }
  ];

  const thptClasses = classes.filter(c => c.level === 'THPT');

  const grade10Classes = thptClasses.filter(c => c.grade === '10');
  const grade11Classes = thptClasses.filter(c => c.grade === '11');
  const grade12Classes = thptClasses.filter(c => c.grade === '12');

  const gradesToRender = [
    { grade: '10', title: 'Khối 10 (10CB1 - 10CB5)', classes: grade10Classes },
    { grade: '11', title: 'Khối 11 (11CB1 - 11CB4)', classes: grade11Classes },
    { grade: '12', title: 'Khối 12 (12CB1 - 12CB5)', classes: grade12Classes }
  ].filter(g => selectedGrade === 'ALL' || selectedGrade === g.grade);

  const handlePrint = () => {
    window.print();
  };

  const displayAcademicYear = (!config.academicYear || config.academicYear.includes('2024'))
    ? '2026 - 2027'
    : config.academicYear;

  const displayVicePrincipal = (config.vicePrincipalName && config.vicePrincipalName.includes('-'))
    ? 'Nguyễn Minh Trí'
    : (config.vicePrincipalName || 'Nguyễn Minh Trí');

  const getTeacherDisplayName = (t?: Teacher) => {
    if (!t) return '';
    // Format name cleanly like the image: "Duyên", "Hương", "Bền", "C.Toàn", "V.Toàn", "V.Anh", "Trí (PHT)"
    if (t.code.includes('.')) {
      const parts = t.code.split(' ');
      return parts[0].replace('(', '').replace(')', '');
    }
    return t.name.split(' ').pop() || t.name;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Top Toolbar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-md">
              <BookOpen className="w-4 h-4" />
            </span>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900">
                Phân Công Chuyên Môn Hệ THPT
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Khối 10, 11, 12 - Đúng mẫu biểu phân công chuyên môn chính thức
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* Grade filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setSelectedGrade('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                selectedGrade === 'ALL'
                  ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả (14 lớp)
            </button>
            <button
              onClick={() => setSelectedGrade('10')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                selectedGrade === '10'
                  ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Khối 10 (5 lớp)
            </button>
            <button
              onClick={() => setSelectedGrade('11')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                selectedGrade === '11'
                  ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Khối 11 (4 lớp)
            </button>
            <button
              onClick={() => setSelectedGrade('12')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                selectedGrade === '12'
                  ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Khối 12 (5 lớp)
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
              className="pl-7 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-indigo-500 w-44 sm:w-52"
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
          {isAdmin && (
            <button
              onClick={onExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Xuất File Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Official Document Layout */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 print:p-0 print:border-none print:shadow-none space-y-6">
        {/* School Header Document */}
        <div className="text-center border-b border-slate-200 pb-4">
          <div className="flex justify-between items-start text-xs uppercase font-bold text-slate-700 mb-2">
            <div className="text-left">
              <div className="text-[11px] text-slate-500">{config.subTitle}</div>
              <div className="text-indigo-950 font-extrabold text-xs">{config.schoolName}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px]">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div className="font-normal normal-case text-[11px] text-slate-500">
                Độc lập - Tự do - Hạnh phúc
              </div>
            </div>
          </div>

          <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight mt-2">
            PHÂN CÔNG CHUYÊN MÔN HỆ THPT
          </h2>
          <p className="text-xs text-slate-600 font-semibold mt-0.5">
            Học kỳ I - Năm học {displayAcademicYear} (Chương trình GDPT 2018)
          </p>
        </div>

        {/* Tables per Grade */}
        {gradesToRender.map(gradeGroup => {
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
                <h3 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
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
                      {thptSubjectCols.map(col => (
                        <th
                          key={col.id}
                          className="p-1.5 border border-slate-300 min-w-[55px] font-bold text-slate-900 whitespace-nowrap"
                        >
                          <div>{col.shortName}</div>
                          <div className="text-[9px] text-slate-400 font-normal">{col.periods}t</div>
                        </th>
                      ))}
                      <th className="p-2 border border-slate-300 min-w-[70px] bg-amber-50 font-black text-amber-950">
                        GVCN
                      </th>
                      <th className="p-1.5 border border-slate-300 min-w-[65px] bg-sky-50 font-bold text-sky-950">
                        CĐ1
                      </th>
                      <th className="p-1.5 border border-slate-300 min-w-[65px] bg-sky-50 font-bold text-sky-950">
                        CĐ2
                      </th>
                      <th className="p-1.5 border border-slate-300 min-w-[65px] bg-sky-50 font-bold text-sky-950">
                        CĐ3
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {visibleClasses.map(cls => {
                      const hrTeacher = cls.homeroomTeacherId
                        ? teacherMap.get(cls.homeroomTeacherId)
                        : null;

                      return (
                        <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Class Name */}
                          <td className="p-2 border border-slate-300 font-black text-indigo-950 text-xs bg-slate-50/50">
                            {cls.name}
                          </td>

                          {/* Subjects */}
                          {thptSubjectCols.map(col => {
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
                                    ? 'cursor-pointer hover:bg-indigo-50/50'
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
                                    className="text-[11px] p-1 border border-indigo-500 rounded bg-white w-full"
                                  >
                                    <option value="">-- Bỏ phân công --</option>
                                    {teachers
                                      .filter(
                                        t =>
                                          t.campus === 'THPTDBK' ||
                                          t.departmentId === 'dept-bgh' ||
                                          t.primarySubjectId === col.id
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
                          <td className="p-1 border border-slate-300 bg-amber-50/40">
                            {hrTeacher ? (
                              <span className="font-black text-amber-950 text-[11px]">
                                {getTeacherDisplayName(hrTeacher)}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-[10px]">—</span>
                            )}
                          </td>

                          {/* CĐ1 */}
                          <td
                            onClick={() => {
                              if (isAdmin) {
                                setEditingCell({
                                  classId: cls.id,
                                  type: 'specialTopic',
                                  topicKey: 'cd1'
                                });
                              } else {
                                onPromptAdminLogin?.();
                              }
                            }}
                            className={`p-1 border border-slate-300 bg-sky-50/40 ${
                              isAdmin ? 'cursor-pointer hover:bg-sky-100/60' : 'cursor-default'
                            }`}
                            title={!isAdmin ? "Chế độ xem - Bấm để đăng nhập Quản trị" : "Bấm để gán chuyên đề"}
                          >
                            {cls.specialTopics?.cd1 ? (
                              <div className="leading-tight">
                                <div className="text-[10px] font-medium text-sky-800">
                                  {cls.specialTopics.cd1.title}
                                </div>
                                <div className="text-[11px] font-black text-sky-950">
                                  {getTeacherDisplayName(
                                    teacherMap.get(cls.specialTopics.cd1.teacherId || '')
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-300 text-[10px]">—</span>
                            )}
                          </td>

                          {/* CĐ2 */}
                          <td
                            onClick={() => {
                              if (isAdmin) {
                                setEditingCell({
                                  classId: cls.id,
                                  type: 'specialTopic',
                                  topicKey: 'cd2'
                                });
                              } else {
                                onPromptAdminLogin?.();
                              }
                            }}
                            className={`p-1 border border-slate-300 bg-sky-50/40 ${
                              isAdmin ? 'cursor-pointer hover:bg-sky-100/60' : 'cursor-default'
                            }`}
                            title={!isAdmin ? "Chế độ xem - Bấm để đăng nhập Quản trị" : "Bấm để gán chuyên đề"}
                          >
                            {cls.specialTopics?.cd2 ? (
                              <div className="leading-tight">
                                <div className="text-[10px] font-medium text-sky-800">
                                  {cls.specialTopics.cd2.title}
                                </div>
                                <div className="text-[11px] font-black text-sky-950">
                                  {getTeacherDisplayName(
                                    teacherMap.get(cls.specialTopics.cd2.teacherId || '')
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-300 text-[10px]">—</span>
                            )}
                          </td>

                          {/* CĐ3 */}
                          <td
                            onClick={() => {
                              if (isAdmin) {
                                setEditingCell({
                                  classId: cls.id,
                                  type: 'specialTopic',
                                  topicKey: 'cd3'
                                });
                              } else {
                                onPromptAdminLogin?.();
                              }
                            }}
                            className={`p-1 border border-slate-300 bg-sky-50/40 ${
                              isAdmin ? 'cursor-pointer hover:bg-sky-100/60' : 'cursor-default'
                            }`}
                            title={!isAdmin ? "Chế độ xem - Bấm để đăng nhập Quản trị" : "Bấm để gán chuyên đề"}
                          >
                            {cls.specialTopics?.cd3 ? (
                              <div className="leading-tight">
                                <div className="text-[10px] font-medium text-sky-800">
                                  {cls.specialTopics.cd3.title}
                                </div>
                                <div className="text-[11px] font-black text-sky-950">
                                  {getTeacherDisplayName(
                                    teacherMap.get(cls.specialTopics.cd3.teacherId || '')
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-300 text-[10px]">—</span>
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

        {/* Footer Notes & Summary */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5 print:bg-transparent print:border-none">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ghi chú chuyên môn & Phân bổ Chuyên đề học tập (CĐ1, CĐ2, CĐ3):</span>
          </div>
          <ul className="list-disc list-inside text-slate-600 text-[11px] space-y-0.5 pl-2">
            <li>Mỗi lớp học khối THPT được phân bổ 3 chuyên đề học tập lựa chọn theo định hướng tổ hợp môn GDPT 2018.</li>
            <li>Các tiết chuyên đề được tính trực tiếp vào định mức giảng dạy chuẩn của giáo viên bộ môn tương ứng.</li>
            <li>Các ô trống là các môn học sinh không chọn hoặc chưa thực hiện giảng dạy.</li>
          </ul>
        </div>

        {/* Signatures */}
        <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-2 text-center text-xs font-semibold text-slate-800">
          <div>
            <div className="uppercase font-bold text-slate-900 mb-12">NGƯỜI LẬP BẢNG</div>
            <div className="font-bold text-slate-900">{config.vicePrincipalName?.split('-')[0].trim() || 'Nguyễn Minh Trí'}</div>
          </div>
          <div>
            <div className="italic text-slate-500 font-normal mb-1">
              Đốc Binh Kiều, ngày ..... tháng ..... năm 2026
            </div>
            <div className="uppercase font-bold text-slate-900 mb-12">HIỆU TRƯỞNG</div>
            <div className="font-extrabold text-slate-900">{config.principalName}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
