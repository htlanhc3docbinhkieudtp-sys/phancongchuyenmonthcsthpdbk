import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Teacher, Department } from '../types';
import { TeacherActualWorkload } from '../utils/actualTeachingHoursHelper';
import {
  Search,
  Check,
  ChevronDown,
  Building2,
  School,
  GraduationCap,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';

export type CampusFilterType = 'ALL' | 'THPT' | 'THCS_DBK' | 'THCS_TK';

interface TeacherPickerDropdownProps {
  teachers: Teacher[];
  departments: Department[];
  selectedTeacherId: string;
  onSelectTeacher: (teacherId: string) => void;
  workloadMap: Map<string, TeacherActualWorkload>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  excludeIds?: string[];
  defaultCampusFilter?: CampusFilterType;
  allowBgh?: boolean;
  className?: string;
}

export const TeacherPickerDropdown: React.FC<TeacherPickerDropdownProps> = ({
  teachers,
  departments,
  selectedTeacherId,
  onSelectTeacher,
  workloadMap,
  label,
  placeholder = '-- Chọn giáo viên --',
  disabled = false,
  excludeIds = [],
  defaultCampusFilter = 'ALL',
  allowBgh = true,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [campusFilter, setCampusFilter] = useState<CampusFilterType>(defaultCampusFilter);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const departmentMap = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);

  // Selected teacher object
  const selectedTeacher = useMemo(
    () => teachers.find((t) => t.id === selectedTeacherId),
    [teachers, selectedTeacherId]
  );
  const selectedWl = selectedTeacher ? workloadMap.get(selectedTeacher.id) : undefined;
  const selectedBalance = selectedWl ? selectedWl.semesterBalance : 0;

  // Campus categorization helper
  const getTeacherCampusInfo = (t: Teacher): {
    campusKey: 'THPT' | 'THCS_DBK' | 'THCS_TK';
    campusName: string;
    shortBadge: string;
    bgColor: string;
    badgeBg: string;
    textColor: string;
    borderColor: string;
    pillBg: string;
  } => {
    const rawCampus = (t.campus || '').toUpperCase();
    if (rawCampus.includes('TÂN KIỀU') || rawCampus.includes('TK')) {
      return {
        campusKey: 'THCS_TK',
        campusName: 'THCS Tân Kiều',
        shortBadge: 'Tân Kiều',
        bgColor: 'bg-emerald-50 hover:bg-emerald-100/70',
        badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        textColor: 'text-emerald-950',
        borderColor: 'border-emerald-300',
        pillBg: 'bg-emerald-600 text-white',
      };
    }
    if (rawCampus.includes('THPT') || rawCampus.includes('CHÍNH') || t.id.startsWith('tch-bgh-1') || t.id.startsWith('tch-bgh-2') || rawCampus.includes('ĐIỂM CHÍNH')) {
      return {
        campusKey: 'THPT',
        campusName: 'Điểm chính (THPT)',
        shortBadge: 'THPT',
        bgColor: 'bg-blue-50 hover:bg-blue-100/70',
        badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
        textColor: 'text-blue-950',
        borderColor: 'border-blue-300',
        pillBg: 'bg-blue-600 text-white',
      };
    }
    return {
      campusKey: 'THCS_DBK',
      campusName: 'THCS Đốc Binh Kiều',
      shortBadge: 'Đốc Binh Kiều',
      bgColor: 'bg-purple-50 hover:bg-purple-100/70',
      badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
      textColor: 'text-purple-950',
      borderColor: 'border-purple-300',
      pillBg: 'bg-purple-600 text-white',
    };
  };

  // Filtered & Sorted teachers: Sorted Deficit First (-210 -> -175 -> -140 -> 0 -> +142)
  const processedTeachers = useMemo(() => {
    return teachers
      .filter((t) => {
        if (!allowBgh && (t.id.startsWith('tch-bgh') || t.role === 'HieuTruong')) {
          return false;
        }
        if (excludeIds.includes(t.id)) {
          return false;
        }

        const info = getTeacherCampusInfo(t);
        if (campusFilter !== 'ALL' && info.campusKey !== campusFilter) {
          return false;
        }

        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const deptName = (departmentMap.get(t.departmentId) || '').toLowerCase();
          const matchName = t.name.toLowerCase().includes(q);
          const matchCode = (t.code || '').toLowerCase().includes(q);
          const matchDept = deptName.includes(q);
          const matchCampus = info.campusName.toLowerCase().includes(q);
          return matchName || matchCode || matchDept || matchCampus;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort strictly by deficit: highest negative balance to highest positive balance
        const aBal = workloadMap.get(a.id)?.semesterBalance ?? 0;
        const bBal = workloadMap.get(b.id)?.semesterBalance ?? 0;
        if (aBal !== bBal) {
          return aBal - bBal; // negative first!
        }
        return a.name.localeCompare(b.name, 'vi');
      });
  }, [teachers, allowBgh, excludeIds, campusFilter, searchTerm, departmentMap, workloadMap]);

  // Counts by campus for quick tabs
  const campusCounts = useMemo(() => {
    let thpt = 0;
    let dbk = 0;
    let tk = 0;
    teachers.forEach((t) => {
      if (excludeIds.includes(t.id)) return;
      const info = getTeacherCampusInfo(t);
      if (info.campusKey === 'THPT') thpt++;
      else if (info.campusKey === 'THCS_TK') tk++;
      else dbk++;
    });
    return { all: thpt + dbk + tk, thpt, dbk, tk };
  }, [teachers, excludeIds]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[11px] font-normal text-slate-500 lowercase">
            (Ưu tiên giáo viên thiếu tiết)
          </span>
        </label>
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-all flex items-center justify-between gap-2 shadow-xs cursor-pointer ${
          disabled
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
            : isOpen
            ? 'bg-white border-purple-600 ring-2 ring-purple-200'
            : selectedTeacher
            ? 'bg-white border-slate-300 hover:border-purple-400 text-slate-900'
            : 'bg-slate-50 border-slate-300 text-slate-500 hover:bg-white hover:border-slate-400'
        }`}
      >
        {selectedTeacher ? (
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Campus badge with dedicated colors */}
            {(() => {
              const info = getTeacherCampusInfo(selectedTeacher);
              return (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${info.badgeBg}`}
                >
                  {info.shortBadge}
                </span>
              );
            })()}

            {/* Teacher Name */}
            <span className="font-bold text-slate-900 text-sm truncate">
              {selectedTeacher.name}
            </span>
            <span className="text-xs text-slate-500 shrink-0 font-medium">
              ({selectedTeacher.code})
            </span>

            {/* Department */}
            <span className="text-xs text-slate-600 truncate hidden sm:inline">
              • {departmentMap.get(selectedTeacher.departmentId)}
            </span>

            {/* Balance Pill */}
            <span
              className={`ml-auto text-xs font-extrabold px-2.5 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                selectedBalance < 0
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : selectedBalance === 0
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {selectedBalance < 0 ? (
                <>
                  <TrendingDown className="w-3 h-3 text-rose-600" />
                  <span>{selectedBalance}t</span>
                </>
              ) : selectedBalance === 0 ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>0t</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-3 h-3 text-amber-600" />
                  <span>+{selectedBalance}t</span>
                </>
              )}
            </span>
          </div>
        ) : (
          <span className="text-slate-400 font-normal">{placeholder}</span>
        )}

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${
            isOpen ? 'rotate-180 text-purple-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-[460px] flex flex-col">
          {/* Header Controls: Campus Filter Tabs */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200 space-y-2">
            <div className="grid grid-cols-4 gap-1 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setCampusFilter('ALL')}
                className={`py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                  campusFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                Tất cả ({campusCounts.all})
              </button>
              <button
                type="button"
                onClick={() => setCampusFilter('THPT')}
                className={`py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                  campusFilter === 'THPT'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <span>THPT</span>
                <span className="text-[10px] opacity-80">({campusCounts.thpt})</span>
              </button>
              <button
                type="button"
                onClick={() => setCampusFilter('THCS_DBK')}
                className={`py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                  campusFilter === 'THCS_DBK'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                <span>ĐBK</span>
                <span className="text-[10px] opacity-80">({campusCounts.dbk})</span>
              </button>
              <button
                type="button"
                onClick={() => setCampusFilter('THCS_TK')}
                className={`py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                  campusFilter === 'THCS_TK'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <span>Tân Kiều</span>
                <span className="text-[10px] opacity-80">({campusCounts.tk})</span>
              </button>
            </div>

            {/* Fast Live Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm nhanh giáo viên, mã GV, môn..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-medium">
              <span className="text-purple-700 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Sắp xếp: Âm nhiều nhất đứng đầu
              </span>
              <span>{processedTeachers.length} giáo viên</span>
            </div>
          </div>

          {/* Teacher List */}
          <div className="overflow-y-auto divide-y divide-slate-100 p-1 flex-1">
            {processedTeachers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Không tìm thấy giáo viên phù hợp với từ khóa "{searchTerm}".
              </div>
            ) : (
              processedTeachers.map((t) => {
                const info = getTeacherCampusInfo(t);
                const isSelected = t.id === selectedTeacherId;
                const wl = workloadMap.get(t.id);
                const bal = wl ? wl.semesterBalance : 0;
                const deptName = departmentMap.get(t.departmentId) || '';

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onSelectTeacher(t.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-purple-100/90 text-purple-950 font-bold ring-1 ring-purple-400 shadow-xs'
                        : `${info.bgColor} mb-0.5`
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Campus Badge */}
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border shrink-0 ${info.badgeBg}`}
                      >
                        {info.shortBadge}
                      </span>

                      {/* Name & Code */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-sm truncate">
                            {t.name}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 shrink-0">
                            ({t.code})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 truncate flex items-center gap-1 mt-0.5">
                          <span className="font-medium text-slate-700">{deptName}</span>
                          {t.role === 'PhoHieuTruong' && (
                            <span className="text-[10px] bg-rose-100 text-rose-800 px-1 rounded font-bold">
                              Phó Hiệu trưởng
                            </span>
                          )}
                          {t.role === 'ToTruong' && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1 rounded font-bold">
                              Tổ trưởng
                            </span>
                          )}
                          {t.role === 'ToPho' && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1 rounded font-bold">
                              Tổ phó
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Balance Pill */}
                      <div className="shrink-0 text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black shadow-2xs ${
                            bal < 0
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : bal === 0
                              ? 'bg-slate-100 text-slate-700 border border-slate-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {bal < 0 ? (
                            <>
                              <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                              <span>{bal} tiết</span>
                            </>
                          ) : bal === 0 ? (
                            <>
                              <Check className="w-3 h-3 text-slate-500" />
                              <span>0 tiết</span>
                            </>
                          ) : (
                            <>
                              <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                              <span>+{bal} tiết</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Selection Check */}
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-purple-700 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-3" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="p-2 bg-slate-100 border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
            <span className="text-slate-500">
              💡 Bấm vào tên để chọn giáo viên thay thế
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
            >
              Đóng lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
