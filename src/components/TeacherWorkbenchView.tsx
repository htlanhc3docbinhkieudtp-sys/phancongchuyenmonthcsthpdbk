import React, { useState } from 'react';
import {
  Teacher,
  Assignment,
  ClassGroup,
  Subject,
  Department,
  WorkloadStats
} from '../types';
import { getTeacherDutiesList } from '../utils/workloadCalculator';
import {
  Plus,
  X,
  CheckCircle2,
  School
} from 'lucide-react';

interface TeacherWorkbenchViewProps {
  teachers: Teacher[];
  departments: Department[];
  subjects: Subject[];
  classes: ClassGroup[];
  assignments: Assignment[];
  workloads: WorkloadStats[];
  onAssignTeacher: (classId: string, subjectId: string, teacherId: string) => void;
  onRemoveAssignment: (classId: string, subjectId: string) => void;
}

export const TeacherWorkbenchView: React.FC<TeacherWorkbenchViewProps> = ({
  teachers,
  departments,
  subjects,
  classes,
  assignments,
  workloads,
  onAssignTeacher,
  onRemoveAssignment,
}) => {
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [assigningTeacherId, setAssigningTeacherId] = useState<string | null>(null);

  const subMap = new Map<string, Subject>(subjects.map(s => [s.id, s]));
  const workloadMap = new Map<string, WorkloadStats>(workloads.map(w => [w.teacherId, w]));

  const filteredDepartments = departments.filter(d => 
    selectedDeptId === 'ALL' || d.id === selectedDeptId
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Department Filter Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            Lọc theo tổ:
          </span>
          <button
            onClick={() => setSelectedDeptId('ALL')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              selectedDeptId === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Tất cả các tổ ({departments.length})
          </button>
          {departments.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedDeptId(d.id)}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                selectedDeptId === d.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>

      {/* Departments Sections */}
      <div className="space-y-4">
        {filteredDepartments.map(dept => {
          const deptTeachers = teachers.filter(t => t.departmentId === dept.id);
          const deptWorkloads = deptTeachers.map(t => workloadMap.get(t.id)!);
          const totalAssignedInDept = deptWorkloads.reduce((s, w) => s + (w?.assignedPeriods || 0), 0);
          const totalTargetInDept = deptWorkloads.reduce((s, w) => s + (w?.targetPeriods || 0), 0);

          return (
            <div key={dept.id} className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
              {/* Department Header */}
              <div
                className="p-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50"
                style={{ borderLeft: `4px solid ${dept.color}` }}
              >
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <span>{dept.name}</span>
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                      {deptTeachers.length} Giáo viên
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mã tổ: <strong className="text-slate-700">{dept.code}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="bg-white border border-slate-200 px-2.5 py-1 rounded">
                    <span className="text-slate-500 text-[11px]">Tổng tải tiết: </span>
                    <strong className="text-slate-900 font-bold">
                      {totalAssignedInDept} / {totalTargetInDept}t
                    </strong>
                    <span className={`ml-1.5 font-bold text-[11px] ${totalAssignedInDept >= totalTargetInDept ? 'text-emerald-600' : 'text-amber-600'}`}>
                      ({totalAssignedInDept >= totalTargetInDept ? `+${totalAssignedInDept - totalTargetInDept} dư` : `${totalAssignedInDept - totalTargetInDept} thiếu`})
                    </span>
                  </div>
                </div>
              </div>

              {/* Teacher Cards Grid */}
              <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {deptTeachers.map(teacher => {
                  const workload = workloadMap.get(teacher.id)!;
                  const primarySub = subMap.get(teacher.primarySubjectId);
                  const isOver = workload.balance > 2;
                  const isExact = workload.balance >= -1 && workload.balance <= 2;
                  const percent = workload.targetPeriods > 0 
                    ? Math.round((workload.assignedPeriods / workload.targetPeriods) * 100)
                    : 100;

                  return (
                    <div
                      key={teacher.id}
                      className="bg-white border border-slate-200 hover:border-indigo-300 rounded-lg p-3 flex flex-col justify-between transition-all hover:shadow-2xs"
                    >
                      <div>
                        {/* Top Info */}
                        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h4 className="font-bold text-xs text-slate-900">
                                {teacher.name}
                              </h4>
                              {getTeacherDutiesList(teacher).map((d, dIdx) => (
                                <span
                                  key={dIdx}
                                  className={`text-[9px] border font-bold px-1 rounded-xs ${d.badgeBg} ${d.badgeColor}`}
                                  title={`${d.name} (-${d.reduction}t)`}
                                >
                                  {d.shortLabel} (-{d.reduction}t)
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                              <span>Mã: <strong className="text-slate-700">{teacher.code}</strong></span>
                              <span>•</span>
                              <span>Môn: <strong className="text-indigo-700">{primarySub?.name}</strong></span>
                            </div>
                            {workload.homeroomClass && (
                              <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                <School className="w-3 h-3" />
                                <span>Chủ nhiệm: Lớp {workload.homeroomClass} (-3t)</span>
                              </div>
                            )}
                          </div>

                          {/* Quota Badge */}
                          <div className="text-right">
                            <div className="text-xs font-extrabold text-slate-900">
                              {workload.assignedPeriods} / {workload.targetPeriods}t
                            </div>
                            <span
                              className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                                isExact
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : isOver
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-indigo-50 text-indigo-800'
                              }`}
                            >
                              {isExact
                                ? 'Đủ định mức'
                                : isOver
                                ? `Dư +${workload.balance}t`
                                : `Thiếu ${Math.abs(workload.balance)}t`}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-2.5">
                          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                            <span>Tải giờ dạy ({percent}%)</span>
                            <span>Định mức: {teacher.baseStandardPeriods}t</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                percent > 115
                                  ? 'bg-amber-500'
                                  : percent >= 90
                                  ? 'bg-emerald-500'
                                  : 'bg-indigo-600'
                              }`}
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Assigned Classes List */}
                        <div className="mt-2.5">
                          <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                            <span>Lớp phụ trách ({workload.assignedClasses.length} lớp):</span>
                            <button
                              onClick={() => setAssigningTeacherId(teacher.id)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Thêm lớp</span>
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                            {workload.assignedClasses.length === 0 ? (
                              <div className="text-[11px] text-slate-400 italic py-0.5">
                                Chưa phân công lớp dạy nào
                              </div>
                            ) : (
                              workload.assignedClasses.map(c => {
                                const matchedAssignment = assignments.find(a => a.id === c.assignmentId);
                                return (
                                  <span
                                    key={c.assignmentId}
                                    className="inline-flex items-center gap-1 text-[11px] bg-slate-50 border border-slate-200 text-slate-800 px-1.5 py-0.5 rounded shadow-2xs group"
                                  >
                                    <strong className="text-indigo-700 font-bold">{c.className}</strong>
                                    <span className="text-[10px] text-slate-500">
                                      ({c.subjectName} {c.periods}t)
                                    </span>
                                    {matchedAssignment && (
                                      <button
                                        onClick={() => onRemoveAssignment(matchedAssignment.classId, matchedAssignment.subjectId)}
                                        className="text-slate-300 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                                        title="Hủy gán lớp này"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* QUICK ADD CLASS DRAWER MODAL */}
      {assigningTeacherId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Phân Công Thêm Lớp Dạy
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Giáo viên: <strong className="text-indigo-700">{teachers.find(t => t.id === assigningTeacherId)?.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setAssigningTeacherId(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {(() => {
                const currentTch = teachers.find(t => t.id === assigningTeacherId);
                if (!currentTch) return null;

                const primarySubId = currentTch.primarySubjectId;
                const sub = subMap.get(primarySubId);

                // Find all classes that need this subject or can be assigned
                return classes.map(cls => {
                  const assignment = assignments.find(a => a.classId === cls.id && a.subjectId === primarySubId);
                  const periods = sub?.defaultPeriods[cls.grade] || 2;
                  const isAssignedToThis = assignment?.teacherId === currentTch.id;
                  const isAssignedToOther = assignment && assignment.teacherId !== currentTch.id;
                  const otherTeacher = isAssignedToOther ? teachers.find(t => t.id === assignment.teacherId) : null;

                  return (
                    <div
                      key={cls.id}
                      className="flex items-center justify-between p-2.5 rounded border border-slate-200 hover:bg-slate-50 transition-all text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-xs">
                          Lớp {cls.name} <span className="text-[10px] font-normal text-slate-500">({cls.level} - K{cls.grade})</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Môn {sub?.name}: <strong className="text-indigo-700">{periods}t/tuần</strong>
                        </div>
                      </div>

                      <div>
                        {isAssignedToThis ? (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Đang dạy
                          </span>
                        ) : isAssignedToOther ? (
                          <button
                            onClick={() => {
                              onAssignTeacher(cls.id, primarySubId, currentTch.id);
                              setAssigningTeacherId(null);
                            }}
                            className="text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded font-semibold text-[11px] transition-colors cursor-pointer"
                          >
                            Đổi từ {otherTeacher?.code.split(' ')[0]}
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              onAssignTeacher(cls.id, primarySubId, currentTch.id);
                              setAssigningTeacherId(null);
                            }}
                            className="text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-0.5 rounded font-bold text-[11px] shadow-xs transition-colors cursor-pointer"
                          >
                            Gán lớp
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setAssigningTeacherId(null)}
                className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
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
