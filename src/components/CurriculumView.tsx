import React, { useState } from 'react';
import {
  Subject,
  Department,
  GradeLevel
} from '../types';
import {
  BookOpen,
  Info
} from 'lucide-react';

interface CurriculumViewProps {
  subjects: Subject[];
  departments: Department[];
  isAdmin?: boolean;
  onPromptAdminLogin?: () => void;
  onUpdateSubjectPeriod: (subjectId: string, grade: GradeLevel, periods: number) => void;
}

export const CurriculumView: React.FC<CurriculumViewProps> = ({
  subjects,
  departments,
  isAdmin = false,
  onPromptAdminLogin,
  onUpdateSubjectPeriod,
}) => {
  const [activeGrade, setActiveGrade] = useState<GradeLevel>('10');
  const deptMap = new Map<string, Department>(departments.map(d => [d.id, d]));

  const grades: { id: GradeLevel; label: string; level: string }[] = [
    { id: '10', label: 'Khối 10', level: 'THPT' },
    { id: '11', label: 'Khối 11', level: 'THPT' },
    { id: '12', label: 'Khối 12', level: 'THPT' },
    { id: '6', label: 'Khối 6', level: 'THCS' },
    { id: '7', label: 'Khối 7', level: 'THCS' },
    { id: '8', label: 'Khối 8', level: 'THCS' },
    { id: '9', label: 'Khối 9', level: 'THCS' },
  ];

  // Calculate total periods for active grade
  const totalPeriodsForActiveGrade = subjects.reduce((sum, s) => {
    return sum + (s.defaultPeriods[activeGrade] || 0);
  }, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Grade Selector Banner */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Khung Phân Phối Số Tiết Môn Học (GDPT 2018)</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Cấu hình số tiết chuẩn mỗi tuần của từng môn học áp dụng khi phân công
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {grades.map(g => (
            <button
              key={g.id}
              onClick={() => setActiveGrade(g.id)}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                activeGrade === g.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {g.label} ({g.level})
            </button>
          ))}
        </div>
      </div>

      {/* Info notice */}
      <div className="bg-indigo-50/60 border border-indigo-200 rounded-lg p-2.5 flex items-start gap-2 text-xs text-indigo-950">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-[11px]">
          <strong className="font-bold block mb-0.2">
            Quy định phân phối thời lượng theo GDPT 2018 - {grades.find(g => g.id === activeGrade)?.label}:
          </strong>
          <span>
            Các môn bắt buộc & lựa chọn. Tổng số tiết/tuần hiện tại: <strong className="font-bold text-indigo-900 underline">{totalPeriodsForActiveGrade} tiết</strong>.
          </span>
        </div>
      </div>

      {/* Subjects Periods Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-[11px]">
                <th className="p-2 w-10 text-center">STT</th>
                <th className="p-2">Tên Môn Học</th>
                <th className="p-2">Mã Viết Tắt</th>
                <th className="p-2">Tổ Chuyên Môn</th>
                <th className="p-2">Loại Môn</th>
                <th className="p-2 text-center w-32">
                  Tiết/Tuần ({grades.find(g => g.id === activeGrade)?.label})
                </th>
                <th className="p-2 text-center">Khối 10</th>
                <th className="p-2 text-center">Khối 11</th>
                <th className="p-2 text-center">Khối 12</th>
                <th className="p-2 text-center">THCS (6-9)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[11px]">
              {subjects.filter(s => s.id !== 'sub-nv').map((sub, idx) => {
                const dept = deptMap.get(sub.departmentId);
                const currentPeriod = sub.defaultPeriods[activeGrade] || 0;

                return (
                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2 text-center font-medium text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="p-2 font-bold text-slate-900 flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: sub.color }}
                      />
                      <span>{sub.name}</span>
                    </td>
                    <td className="p-2 font-semibold text-indigo-700">
                      {sub.shortName}
                    </td>
                    <td className="p-2">
                      <span className="text-slate-600 font-medium">
                        {dept?.name}
                      </span>
                    </td>
                    <td className="p-2">
                      {sub.isElective ? (
                        <span className="text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-xs font-semibold text-[10px]">
                          Lựa Chọn
                        </span>
                      ) : (
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-xs font-semibold text-[10px]">
                          Bắt Buộc
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isAdmin ? (
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="10"
                            value={currentPeriod}
                            onChange={e =>
                              onUpdateSubjectPeriod(sub.id, activeGrade, Number(e.target.value))
                            }
                            className="w-14 p-1 text-center font-bold text-slate-900 border border-slate-300 rounded focus:border-indigo-500 focus:outline-hidden"
                          />
                        ) : (
                          <span className="w-14 p-1 text-center font-bold text-slate-900 bg-slate-100 rounded inline-block">
                            {currentPeriod}
                          </span>
                        )}
                        <span className="text-slate-500 font-medium text-[10px]">tiết</span>
                      </div>
                    </td>
                    <td className="p-2 text-center font-semibold text-slate-700">
                      {sub.defaultPeriods['10'] || 0}t
                    </td>
                    <td className="p-2 text-center font-semibold text-slate-700">
                      {sub.defaultPeriods['11'] || 0}t
                    </td>
                    <td className="p-2 text-center font-semibold text-slate-700">
                      {sub.defaultPeriods['12'] || 0}t
                    </td>
                    <td className="p-2 text-center font-semibold text-slate-700">
                      {sub.defaultPeriods['6'] || 0}t
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
