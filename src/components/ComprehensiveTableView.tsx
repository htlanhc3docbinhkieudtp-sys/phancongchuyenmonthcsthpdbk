import React, { useState } from 'react';
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
  FileSpreadsheet
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

  const teacherMap = new Map<string, Teacher>(teachers.map(t => [t.id, t]));
  const lockedSet = new Set(lockedCells.map(lc => `${lc.classId}_${lc.subjectId}`));

  const isThptView = selectedGrade === 'THPT' || selectedGrade === '10' || selectedGrade === '11' || selectedGrade === '12';
  const isThcsView = selectedGrade === 'THCS' || selectedGrade === '6' || selectedGrade === '7' || selectedGrade === '8' || selectedGrade === '9';

  const displayedSubjects = subjects.filter(sub => {
    if (sub.id === 'sub-nv') return false;

    if (['10', '11', '12', '6', '7', '8', '9'].includes(selectedGrade)) {
      return (sub.defaultPeriods[selectedGrade] || 0) > 0;
    }

    if (isThptView) {
      return (sub.defaultPeriods['10'] || 0) > 0 || (sub.defaultPeriods['11'] || 0) > 0 || (sub.defaultPeriods['12'] || 0) > 0;
    }

    if (isThcsView) {
      return (sub.defaultPeriods['6'] || 0) > 0 || (sub.defaultPeriods['7'] || 0) > 0 || (sub.defaultPeriods['8'] || 0) > 0 || (sub.defaultPeriods['9'] || 0) > 0;
    }

    return true;
  });

  const getSubjectDisplayPeriod = (sub: Subject) => {
    if (['10', '11', '12', '6', '7', '8', '9'].includes(selectedGrade)) {
      return `${sub.defaultPeriods[selectedGrade] || 0}t`;
    }
    if (isThptView) {
      const p = sub.defaultPeriods['10'] || sub.defaultPeriods['11'] || sub.defaultPeriods['12'] || 0;
      return `${p}t`;
    }
    if (isThcsView) {
      const p = sub.defaultPeriods['6'] || sub.defaultPeriods['7'] || sub.defaultPeriods['8'] || sub.defaultPeriods['9'] || 0;
      return `${p}t`;
    }
    return `${sub.defaultPeriods['10'] || sub.defaultPeriods['6'] || 0}t`;
  };

  const filteredClasses = classes.filter(cls => {
    const matchesGrade = selectedGrade === 'ALL' 
      || cls.grade === selectedGrade 
      || (selectedGrade === 'THPT' && cls.level === 'THPT') 
      || (selectedGrade === 'THCS' && cls.level === 'THCS');
    const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cls.homeroomTeacherId && teacherMap.get(cls.homeroomTeacherId)?.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesGrade && matchesSearch;
  });

  const handlePrint = () => {
    window.print();
  };

  const displayAcademicYear = (!config.academicYear || config.academicYear.includes('2024'))
    ? '2026 - 2027'
    : config.academicYear;

  const displayVicePrincipal = (config.vicePrincipalName && config.vicePrincipalName.includes('-'))
    ? 'Nguyễn Minh Trí'
    : (config.vicePrincipalName || 'Nguyễn Minh Trí');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Header Toolbar */}
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
            onChange={e => setSelectedGrade(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-slate-700 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">Toàn trường ({classes.length} lớp: K6 - K12)</option>
            <option value="THPT">Cấp THPT (Khối 10, 11, 12 - {classes.filter(c => c.level === 'THPT').length} lớp)</option>
            <option value="12">Khối 12 THPT ({classes.filter(c => c.grade === '12').length} lớp)</option>
            <option value="11">Khối 11 THPT ({classes.filter(c => c.grade === '11').length} lớp)</option>
            <option value="10">Khối 10 THPT ({classes.filter(c => c.grade === '10').length} lớp)</option>
            <option value="THCS">Cấp THCS (Khối 6, 7, 8, 9 - {classes.filter(c => c.level === 'THCS').length} lớp)</option>
            <option value="6">Khối 6 THCS ({classes.filter(c => c.grade === '6').length} lớp)</option>
            <option value="7">Khối 7 THCS ({classes.filter(c => c.grade === '7').length} lớp)</option>
            <option value="8">Khối 8 THCS ({classes.filter(c => c.grade === '8').length} lớp)</option>
            <option value="9">Khối 9 THCS ({classes.filter(c => c.grade === '9').length} lớp)</option>
          </select>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>In Báo Cáo</span>
          </button>
          {isAdmin && (
            <button
              onClick={onExportExcel}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Xuất Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* Official Table Document Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4 print:p-0 print:border-none print:shadow-none">
        {/* Formal Vietnamese School Header for Printing */}
        <div className="mb-4 pb-3 border-b border-slate-200 text-center">
          <div className="flex justify-between items-start text-xs uppercase font-bold text-slate-700 mb-3">
            <div className="text-left">
              <div className="text-[11px]">{config.subTitle}</div>
              <div className="text-indigo-950 font-extrabold">{config.schoolName}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px]">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div className="font-normal normal-case text-[11px]">Độc lập - Tự do - Hạnh phúc</div>
            </div>
          </div>

          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 uppercase tracking-tight">
            BẢNG TỔNG HỢP PHÂN CÔNG CHUYÊN MÔN GIẢNG DẠY
          </h2>
          <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
            {config.semester === 'HK1' ? 'HỌC KỲ I' : 'HỌC KỲ II'} - NĂM HỌC {displayAcademicYear} (Chương trình GDPT 2018)
          </p>
        </div>

        {/* Matrix Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <th className="p-1.5 border border-slate-300 text-center w-8 text-[11px]">STT</th>
                <th className="p-1.5 border border-slate-300 text-center w-12 text-[11px]">Khối</th>
                <th className="p-1.5 border border-slate-300 text-center w-14 text-[11px]">Lớp</th>
                <th className="p-1.5 border border-slate-300 text-center w-10 text-[11px]">Sĩ số</th>
                <th className="p-1.5 border border-slate-300 text-left w-36 text-[11px]">GV Chủ Nhiệm</th>
                {displayedSubjects.map(sub => (
                  <th
                    key={sub.id}
                    className="p-1.5 border border-slate-300 text-center font-bold text-slate-900 whitespace-nowrap min-w-[75px] text-[11px]"
                  >
                    <div>{sub.shortName}</div>
                    <div className="text-[9px] text-slate-500 font-normal">
                      {getSubjectDisplayPeriod(sub)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {filteredClasses.map((cls, idx) => {
                const hrTeacher = teachers.find(t => t.id === cls.homeroomTeacherId);

                return (
                  <tr key={cls.id} className="hover:bg-slate-50">
                    <td className="p-1.5 border border-slate-300 text-center font-medium text-slate-500 text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="p-1.5 border border-slate-300 text-center font-bold text-slate-700 text-[11px]">
                      K.{cls.grade}
                    </td>
                    <td className="p-1.5 border border-slate-300 text-center font-extrabold text-indigo-900 text-xs">
                      {cls.name}
                    </td>
                    <td className="p-1.5 border border-slate-300 text-center font-bold text-slate-800 text-[11px]">
                      {cls.studentCount || 0}
                    </td>
                    <td className="p-1.5 border border-slate-300 text-left">
                      {hrTeacher ? (
                        <div>
                          <span className="font-bold text-slate-900 text-[11px]">{hrTeacher.name}</span>
                          <span className="text-[10px] text-slate-500 ml-1 font-mono">({hrTeacher.code})</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">—</span>
                      )}
                    </td>

                    {/* Subject columns */}
                    {displayedSubjects.map(sub => {
                      const periods = sub.defaultPeriods[cls.grade] || 0;
                      const assignment = assignments.find(
                        a => a.classId === cls.id && a.subjectId === sub.id
                      );
                      const assignedTeacher = assignment ? teacherMap.get(assignment.teacherId) : null;
                      const isEditing = editingCell?.classId === cls.id && editingCell?.subjectId === sub.id;

                      if (periods === 0) {
                        return (
                          <td key={sub.id} className="p-1 border border-slate-300 text-center bg-slate-100/60 text-slate-300 text-[10px]">
                            —
                          </td>
                        );
                      }

                      return (
                        <td
                          key={sub.id}
                          onClick={() => {
                            if (isAdmin) {
                              setEditingCell({ classId: cls.id, subjectId: sub.id });
                            } else {
                              onPromptAdminLogin?.();
                            }
                          }}
                          className={`p-1 border border-slate-300 text-center transition-colors ${
                            isAdmin ? 'cursor-pointer hover:bg-indigo-50/40' : 'cursor-default'
                          }`}
                          title={!isAdmin ? "Chế độ xem - Bấm để đăng nhập Quản trị" : "Bấm để gán giáo viên"}
                        >
                          {isEditing && isAdmin ? (
                            <select
                              autoFocus
                              value={assignedTeacher?.id || ''}
                              onChange={e => {
                                if (e.target.value) {
                                  onAssignTeacher(cls.id, sub.id, e.target.value);
                                }
                                setEditingCell(null);
                              }}
                              onBlur={() => setEditingCell(null)}
                              className="text-[11px] p-1 border border-indigo-500 rounded bg-white w-full"
                            >
                              <option value="">-- Bỏ phân công --</option>
                              {teachers
                                .filter(t => t.primarySubjectId === sub.id || t.departmentId === sub.departmentId)
                                .map(t => (
                                  <option key={t.id} value={t.id}>
                                    {t.name} ({t.code})
                                  </option>
                                ))}
                            </select>
                          ) : (
                            <div>
                              {assignedTeacher ? (
                                <span className="font-bold text-indigo-950 text-[11px]">
                                  {assignedTeacher.code || assignedTeacher.name}
                                </span>
                              ) : lockedSet.has(`${cls.id}_${sub.id}`) ? (
                                <span className="text-amber-800/80 font-medium text-[10px]">🔒 Khóa</span>
                              ) : (
                                <span className="text-slate-300 text-[10px]">—</span>
                              )}
                            </div>
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

        {/* Footer Signatures */}
        <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-2 text-center text-xs font-semibold text-slate-800">
          <div>
            <div className="uppercase font-bold text-slate-900 mb-12">NGƯỜI LẬP BẢNG</div>
            <div className="font-bold text-slate-900">{displayVicePrincipal}</div>
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
