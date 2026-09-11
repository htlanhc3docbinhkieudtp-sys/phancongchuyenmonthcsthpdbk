import React from 'react';
import {
  X,
  AlertTriangle,
  User,
  Calendar,
  Clock,
  ArrowRight,
  ExternalLink,
  School,
  Building2,
  CheckCircle2,
  Filter,
  Eye
} from 'lucide-react';
import { TimetableSlot, Teacher, ClassGroup } from '../types';

export interface TeacherCollisionDetail {
  id: string; // `${teacherId}_${dayOfWeek}_${session}_${period}`
  teacherId: string;
  teacherName: string;
  teacherCode: string;
  dayOfWeek: number;
  session: 'SANG' | 'CHIEU';
  period: number;
  slots: TimetableSlot[];
}

interface TeacherCollisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  collisions: TeacherCollisionDetail[];
  onNavigateToTeacher: (teacherId: string, session?: 'SANG' | 'CHIEU') => void;
  onNavigateToClass: (classId: string, session?: 'SANG' | 'CHIEU') => void;
  onFilterOnlyConflicts: () => void;
  classMap: Map<string, ClassGroup>;
  getSubjectDisplayName: (slot?: TimetableSlot) => string;
}

const DAY_NAMES: Record<number, string> = {
  2: 'Thứ Hai',
  3: 'Thứ Ba',
  4: 'Thứ Tư',
  5: 'Thứ Năm',
  6: 'Thứ Sáu',
  7: 'Thứ Bảy',
  8: 'Chủ Nhật'
};

export const TeacherCollisionModal: React.FC<TeacherCollisionModalProps> = ({
  isOpen,
  onClose,
  collisions,
  onNavigateToTeacher,
  onNavigateToClass,
  onFilterOnlyConflicts,
  classMap,
  getSubjectDisplayName
}) => {
  if (!isOpen) return null;

  // Unique teachers
  const uniqueTeacherMap = new Map<string, { id: string; name: string; code: string; count: number }>();
  collisions.forEach(c => {
    const existing = uniqueTeacherMap.get(c.teacherId);
    if (existing) {
      existing.count++;
    } else {
      uniqueTeacherMap.set(c.teacherId, {
        id: c.teacherId,
        name: c.teacherName,
        code: c.teacherCode,
        count: 1
      });
    }
  });
  const uniqueTeachers = Array.from(uniqueTeacherMap.values());

  const getCampusLabel = (cls?: ClassGroup) => {
    if (!cls) return 'Chưa rõ';
    if (cls.campus === 'THCSTK') return 'Điểm Tân Kiều';
    if (cls.level === 'THPT' || cls.campus === 'THPTDBK') return 'Điểm chính';
    return 'Điểm Đốc Binh Kiều';
  };

  const getCampusBadgeClass = (cls?: ClassGroup) => {
    if (!cls) return 'bg-slate-100 text-slate-700';
    if (cls.campus === 'THCSTK') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (cls.level === 'THPT' || cls.campus === 'THPTDBK') return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    return 'bg-sky-100 text-sky-800 border-sky-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-rose-100 bg-gradient-to-r from-rose-50 via-rose-50 to-orange-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-rose-950">
                  Chi Tiết Trùng Tiết Giáo Viên
                </h3>
                <span className="px-2.5 py-0.5 bg-rose-200/80 text-rose-900 rounded-full text-xs font-bold">
                  {collisions.length} tiết bị trùng
                </span>
                <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded-full text-xs font-bold">
                  {uniqueTeachers.length} giáo viên
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-0.5">
                Danh sách các tiết một giáo viên đang bị phân công giảng dạy cùng lúc ở nhiều lớp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-rose-100/60 rounded-xl transition-all cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Teacher Jump Bar */}
        {uniqueTeachers.length > 0 && (
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 text-xs flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-slate-600 text-[11px] uppercase tracking-wider">
                Giáo viên bị trùng:
              </span>
              {uniqueTeachers.map(t => (
                <button
                  key={t.id}
                  onClick={() => onNavigateToTeacher(t.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 border border-rose-200 hover:border-rose-300 text-rose-950 font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer group"
                >
                  <User className="w-3 h-3 text-rose-600 group-hover:scale-110 transition-transform" />
                  <span>{t.name}</span>
                  <span className="text-slate-500 font-normal">({t.code})</span>
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                    {t.count} tiết
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={onFilterOnlyConflicts}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-all active:scale-95 cursor-pointer ml-auto"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Lọc xem trên bảng Theo GV</span>
            </button>
          </div>
        )}

        {/* Collision Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {collisions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">
                Không phát hiện trùng tiết nào!
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Tất cả giáo viên đều được xếp lịch dạy hợp lệ, không có ai bị xếp trùng giờ ở nhiều lớp.
              </p>
            </div>
          ) : (
            collisions.map((item, index) => {
              const dayLabel = DAY_NAMES[item.dayOfWeek] || `Thứ ${item.dayOfWeek}`;
              const sessionLabel = item.session === 'SANG' ? 'Buổi Sáng' : 'Buổi Chiều';

              return (
                <div
                  key={item.id || index}
                  className="rounded-2xl border-2 border-rose-200/90 bg-white p-4 shadow-2xs hover:shadow-md transition-all space-y-3"
                >
                  {/* Item Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-black text-xs shrink-0">
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-900 text-sm sm:text-base">
                            {item.teacherName}
                          </h4>
                          {item.teacherCode && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[11px] rounded-md border border-slate-200">
                              Mã: {item.teacherCode}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-rose-700 font-bold mt-0.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{dayLabel}</span>
                          <span>•</span>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{sessionLabel} - Tiết {item.period}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigateToTeacher(item.teacherId, item.session)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer self-start sm:self-center"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem TKB Giáo viên này</span>
                    </button>
                  </div>

                  {/* Conflicting Slots Breakdown */}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 block mb-2">
                      Đang được xếp dạy cùng lúc ở {item.slots.length} lớp học:
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {item.slots.map((slot, sIdx) => {
                        const cls = classMap.get(slot.classId);
                        const campusLabel = getCampusLabel(cls);
                        const campusBadgeClass = getCampusBadgeClass(cls);

                        return (
                          <div
                            key={slot.id || sIdx}
                            className="p-3 rounded-xl bg-rose-50/60 border border-rose-200 flex flex-col justify-between gap-2"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="font-black text-slate-950 text-sm">
                                  Lớp {cls?.name || slot.className}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${campusBadgeClass}`}
                                >
                                  {campusLabel}
                                </span>
                              </div>

                              <div className="text-xs font-semibold text-slate-700">
                                Môn học:{' '}
                                <strong className="text-indigo-900">
                                  {getSubjectDisplayName(slot)}
                                </strong>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => onNavigateToClass(slot.classId, slot.session)}
                              className="mt-1 inline-flex items-center justify-center gap-1 w-full py-1 px-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 transition-all cursor-pointer"
                            >
                              <span>Xem Lớp {cls?.name || slot.className}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {collisions.length > 0 ? (
              <span>
                💡 Để khắc phục: Quản trị viên có thể đổi tiết hoặc gán giáo viên khác cho 1 trong các lớp trên.
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
