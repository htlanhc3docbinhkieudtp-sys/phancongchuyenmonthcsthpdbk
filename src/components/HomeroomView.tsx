import React, { useState } from 'react';
import {
  Teacher,
  ClassGroup,
  Department,
  WorkloadStats
} from '../types';
import {
  UserCheck,
  Phone,
  Plus
} from 'lucide-react';

interface HomeroomViewProps {
  classes: ClassGroup[];
  teachers: Teacher[];
  departments: Department[];
  workloads: WorkloadStats[];
  onAssignHomeroom: (classId: string, teacherId: string | undefined) => void;
}

export const HomeroomView: React.FC<HomeroomViewProps> = ({
  classes,
  teachers,
  departments,
  onAssignHomeroom,
}) => {
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  const teacherMap = new Map<string, Teacher>(teachers.map(t => [t.id, t]));
  const deptMap = new Map<string, Department>(departments.map(d => [d.id, d]));

  const assignedHomeroomTeacherIds = new Set(
    classes.map(c => c.homeroomTeacherId).filter(Boolean) as string[]
  );

  const filteredClasses = classes.filter(cls => {
    if (selectedGrade === 'ALL') return true;
    if (selectedGrade === 'THPT') return cls.level === 'THPT';
    if (selectedGrade === 'THCS') return cls.level === 'THCS';
    return cls.grade === selectedGrade;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Header filter */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <span>Phân Công Giáo Viên Chủ Nhiệm (GVCN)</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Mỗi lớp 1 GVCN (Được hưởng chế độ định mức <strong className="text-slate-700">-3 tiết/tuần</strong>)
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {['ALL', 'THPT', '10', '11', '12', 'THCS'].map(g => (
            <button
              key={g}
              onClick={() => setSelectedGrade(g)}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                selectedGrade === g
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {g === 'ALL'
                ? 'Toàn trường'
                : g === 'THPT'
                ? 'Cấp THPT'
                : g === 'THCS'
                ? 'Cấp THCS'
                : `Khối ${g}`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Classes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredClasses.map(cls => {
          const hrTeacher = cls.homeroomTeacherId ? teacherMap.get(cls.homeroomTeacherId) : null;
          const dept = hrTeacher ? deptMap.get(hrTeacher.departmentId) : null;
          const isEditing = editingClassId === cls.id;

          return (
            <div
              key={cls.id}
              className={`bg-white rounded-lg border transition-all p-3 flex flex-col justify-between ${
                hrTeacher
                  ? 'border-slate-200 hover:border-indigo-300 shadow-2xs'
                  : 'border-amber-300 bg-amber-50/20'
              }`}
            >
              <div>
                {/* Card Top */}
                <div className="flex items-start justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-700 flex items-center justify-center font-extrabold text-sm border border-indigo-100">
                      {cls.name}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">
                        Khối {cls.grade} ({cls.level})
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {cls.studentCount || 40} HS • {cls.roomNumber || 'Phòng học'}
                      </div>
                    </div>
                  </div>

                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {cls.track || 'Chuẩn'}
                  </span>
                </div>

                {/* Teacher Info */}
                <div className="mt-2.5">
                  <div className="text-[10px] font-bold text-slate-500 mb-1">
                    Giáo viên chủ nhiệm:
                  </div>

                  {isEditing ? (
                    <div className="space-y-1.5">
                      <select
                        autoFocus
                        value={cls.homeroomTeacherId || ''}
                        onChange={e => {
                          onAssignHomeroom(cls.id, e.target.value || undefined);
                          setEditingClassId(null);
                        }}
                        className="w-full text-xs font-semibold bg-white border border-indigo-500 rounded p-1 focus:outline-hidden"
                      >
                        <option value="">-- Chưa phân công --</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.code}) {assignedHomeroomTeacherIds.has(t.id) && t.id !== cls.homeroomTeacherId ? ' [Đã CN lớp khác]' : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setEditingClassId(null)}
                        className="text-[11px] text-slate-500 hover:text-slate-700 underline cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : hrTeacher ? (
                    <div className="bg-slate-50 p-2 rounded border border-slate-200 flex items-start justify-between">
                      <div>
                        <div className="font-bold text-xs text-slate-900">
                          {hrTeacher.name}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <span>{dept?.name || 'Tổ bộ môn'}</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold">Giảm -3t</span>
                        </div>
                        {hrTeacher.phone && (
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            <span>{hrTeacher.phone}</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setEditingClassId(cls.id)}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold p-1 hover:bg-indigo-50 rounded cursor-pointer"
                        title="Đổi giáo viên chủ nhiệm"
                      >
                        Đổi
                      </button>
                    </div>
                  ) : (
                    <div className="bg-amber-50 p-2.5 rounded border border-amber-200 text-center">
                      <div className="text-[11px] font-semibold text-amber-800 mb-1">
                        Chưa có GV Chủ Nhiệm
                      </div>
                      <button
                        onClick={() => setEditingClassId(cls.id)}
                        className="text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 px-2.5 py-0.5 rounded shadow-2xs cursor-pointer inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Chỉ định GVCN</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
