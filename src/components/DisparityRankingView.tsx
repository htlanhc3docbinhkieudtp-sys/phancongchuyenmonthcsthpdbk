import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Award,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react';
import { TeacherActualWorkload } from '../utils/actualTeachingHoursHelper';

interface DisparityRankingViewProps {
  workloadsHK1: TeacherActualWorkload[];
  workloadsYear: TeacherActualWorkload[];
  defaultScope?: 'HK1' | 'YEAR';
  compact?: boolean;
  onSelectTeacher?: (teacherId: string) => void;
  onNavigateToWeeklyLog?: () => void;
}

export const DisparityRankingView: React.FC<DisparityRankingViewProps> = ({
  workloadsHK1,
  workloadsYear,
  defaultScope = 'HK1',
  compact = false,
  onSelectTeacher,
  onNavigateToWeeklyLog,
}) => {
  const [scope, setScope] = useState<'HK1' | 'YEAR'>(defaultScope);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayLimit, setDisplayLimit] = useState<number>(compact ? 5 : 10);
  const [activeCategory, setActiveCategory] = useState<'all' | 'excess' | 'deficit'>('all');

  const activeWorkloads = scope === 'HK1' ? workloadsHK1 : workloadsYear;
  const totalWeeks = scope === 'HK1' ? 18 : 35;
  const scopeLabel = scope === 'HK1' ? 'Học kỳ 1 (18 tuần: T1-T18)' : 'Cả năm học (35 tuần: T1-T35)';

  // 1. Thừa tiết nhiều nhất (semesterBalance > 0, sắp xếp từ lớn tới nhỏ: thừa nhiều nhất xếp trên cùng)
  const excessTeachers = useMemo(() => {
    return activeWorkloads
      .filter((w) => w.semesterBalance > 0)
      .filter((w) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          w.teacherName.toLowerCase().includes(q) ||
          w.departmentName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.semesterBalance - a.semesterBalance);
  }, [activeWorkloads, searchTerm]);

  // 2. Thiếu tiết nhiều nhất (semesterBalance < 0, sắp xếp từ lớn tới nhỏ theo số tiết thiếu: thiếu nhiều nhất xếp trên cùng)
  const deficitTeachers = useMemo(() => {
    return activeWorkloads
      .filter((w) => w.semesterBalance < 0)
      .filter((w) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          w.teacherName.toLowerCase().includes(q) ||
          w.departmentName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.semesterBalance - b.semesterBalance); // -217 before -108, so Math.abs is largest to smallest
  }, [activeWorkloads, searchTerm]);

  // 3. Đủ định mức (cân bằng)
  const balancedCount = useMemo(() => {
    return activeWorkloads.filter((w) => w.semesterBalance === 0).length;
  }, [activeWorkloads]);

  const displayedExcess = displayLimit === 0 ? excessTeachers : excessTeachers.slice(0, displayLimit);
  const displayedDeficit = displayLimit === 0 ? deficitTeachers : deficitTeachers.slice(0, displayLimit);

  const getRankBadge = (index: number) => {
    if (index === 0) {
      return (
        <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-xs ring-2 ring-amber-300">
          1
        </span>
      );
    }
    if (index === 1) {
      return (
        <span className="w-6 h-6 rounded-full bg-slate-400 text-white font-black text-xs flex items-center justify-center shadow-xs ring-2 ring-slate-200">
          2
        </span>
      );
    }
    if (index === 2) {
      return (
        <span className="w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center shadow-xs ring-2 ring-amber-600/30">
          3
        </span>
      );
    }
    return (
      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center border border-slate-200">
        {index + 1}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-3 text-slate-800">
      {/* Top Scope Selector & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-gradient-to-r from-slate-50 to-indigo-50/40 rounded-xl border border-slate-200/80">
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setScope('HK1')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              scope === 'HK1'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Học Kỳ 1 (18 Tuần)</span>
          </button>
          <button
            type="button"
            onClick={() => setScope('YEAR')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              scope === 'YEAR'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cả Năm Học (35 Tuần)</span>
          </button>
        </div>

        {/* View Limit Controls */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 text-[11px] hidden sm:inline">Hiển thị:</span>
          {[5, 10, 0].map((limit) => (
            <button
              key={limit}
              type="button"
              onClick={() => setDisplayLimit(limit)}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                displayLimit === limit
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {limit === 0 ? 'Tất cả' : `Top ${limit}`}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Counters */}
      <div className="grid grid-cols-3 gap-2">
        <div
          onClick={() => setActiveCategory(activeCategory === 'excess' ? 'all' : 'excess')}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            activeCategory === 'excess'
              ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-emerald-50/70 border-emerald-200/80 hover:bg-emerald-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              Thừa Tiết
            </span>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black">
              {excessTeachers.length}
            </span>
          </div>
          <p className="text-lg font-black text-emerald-900 mt-1">
            {excessTeachers.length > 0 ? `+${excessTeachers[0].semesterBalance}t cao nhất` : '0 người'}
          </p>
          <p className="text-[10px] text-emerald-700/80 truncate">
            {excessTeachers.length > 0 ? `Top 1: ${excessTeachers[0].teacherName}` : 'Đạt chuẩn'}
          </p>
        </div>

        <div
          onClick={() => setActiveCategory(activeCategory === 'deficit' ? 'all' : 'deficit')}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            activeCategory === 'deficit'
              ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/20'
              : 'bg-rose-50/70 border-rose-200/80 hover:bg-rose-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-800 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
              Thiếu Tiết
            </span>
            <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
              {deficitTeachers.length}
            </span>
          </div>
          <p className="text-lg font-black text-rose-900 mt-1">
            {deficitTeachers.length > 0 ? `${deficitTeachers[0].semesterBalance}t hụt nhất` : '0 người'}
          </p>
          <p className="text-[10px] text-rose-700/80 truncate">
            {deficitTeachers.length > 0 ? `Top 1: ${deficitTeachers[0].teacherName}` : 'Đạt chuẩn'}
          </p>
        </div>

        <div className="p-2.5 rounded-xl border bg-slate-50 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              Đủ Định Mức
            </span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-600 text-white text-[10px] font-black">
              {balancedCount}
            </span>
          </div>
          <p className="text-lg font-black text-slate-900 mt-1">
            {balancedCount} giáo viên
          </p>
          <p className="text-[10px] text-slate-500 truncate">
            Cân bằng hoàn hảo
          </p>
        </div>
      </div>

      {/* Search Input Filter */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm giáo viên hoặc tổ chuyên môn..."
          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
          >
            ×
          </button>
        )}
      </div>

      {/* Main Two-Column Ranking Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 1. CỘT THỪA TIẾT NHIỀU NHẤT */}
        {(activeCategory === 'all' || activeCategory === 'excess') && (
          <div className="flex flex-col bg-white rounded-xl border border-emerald-200 shadow-2xs overflow-hidden">
            {/* Column Header */}
            <div className="px-3 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-100" />
                <h4 className="font-bold text-xs uppercase tracking-wider">
                  Thừa Tiết Nhiều Nhất
                </h4>
              </div>
              <span className="text-[11px] font-semibold bg-emerald-700/80 px-2 py-0.5 rounded-full">
                {excessTeachers.length} GV
              </span>
            </div>

            <div className="px-3 py-1.5 bg-emerald-50/70 border-b border-emerald-100 text-[11px] text-emerald-900 font-medium flex items-center justify-between">
              <span>Sắp xếp từ lớn tới nhỏ ({scopeLabel})</span>
              <span className="text-[10px] text-emerald-700">Thừa nhiều nhất trên cùng</span>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {displayedExcess.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Không có giáo viên thừa tiết trong danh sách lọc.
                </div>
              ) : (
                displayedExcess.map((t, idx) => {
                  const avgWeekly = Math.round((t.semesterBalance / totalWeeks) * 10) / 10;
                  return (
                    <div
                      key={t.teacherId}
                      onClick={() => onSelectTeacher && onSelectTeacher(t.teacherId)}
                      className={`p-2.5 hover:bg-emerald-50/40 transition-colors flex items-center gap-2.5 ${
                        onSelectTeacher ? 'cursor-pointer' : ''
                      }`}
                    >
                      <div className="shrink-0">{getRankBadge(idx)}</div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs">
                            {t.teacherName}
                          </span>
                          {t.duties && (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                              {t.duties}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {t.departmentName}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-600 mt-0.5">
                          <span>
                            Dạy: <strong>{t.semesterTotalTeaching}t</strong>
                          </span>
                          {t.reductionPeriods > 0 && (
                            <span>
                              Giảm: <strong>{t.reductionPeriods * totalWeeks}t</strong>
                            </span>
                          )}
                          <span>
                            Định mức: <strong>{t.semesterRequiredPeriods}t</strong>
                          </span>
                        </div>
                      </div>

                      {/* Right Balance Badge */}
                      <div className="text-right shrink-0">
                        <div className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-xs shadow-2xs">
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                          <span>+{t.semesterBalance}t</span>
                        </div>
                        <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                          TB +{avgWeekly}t/tuần
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {excessTeachers.length > displayedExcess.length && (
              <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => setDisplayLimit(0)}
                  className="text-xs text-emerald-700 font-bold hover:text-emerald-900 hover:underline cursor-pointer"
                >
                  Xem toàn bộ {excessTeachers.length} giáo viên thừa tiết →
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. CỘT THIẾU TIẾT NHIỀU NHẤT */}
        {(activeCategory === 'all' || activeCategory === 'deficit') && (
          <div className="flex flex-col bg-white rounded-xl border border-rose-200 shadow-2xs overflow-hidden">
            {/* Column Header */}
            <div className="px-3 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-rose-100" />
                <h4 className="font-bold text-xs uppercase tracking-wider">
                  Thiếu Tiết Nhiều Nhất
                </h4>
              </div>
              <span className="text-[11px] font-semibold bg-rose-700/80 px-2 py-0.5 rounded-full">
                {deficitTeachers.length} GV
              </span>
            </div>

            <div className="px-3 py-1.5 bg-rose-50/70 border-b border-rose-100 text-[11px] text-rose-900 font-medium flex items-center justify-between">
              <span>Sắp xếp từ lớn tới nhỏ ({scopeLabel})</span>
              <span className="text-[10px] text-rose-700">Thiếu nhiều nhất trên cùng</span>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {displayedDeficit.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Không có giáo viên thiếu tiết trong danh sách lọc.
                </div>
              ) : (
                displayedDeficit.map((t, idx) => {
                  const avgWeekly = Math.round((Math.abs(t.semesterBalance) / totalWeeks) * 10) / 10;
                  return (
                    <div
                      key={t.teacherId}
                      onClick={() => onSelectTeacher && onSelectTeacher(t.teacherId)}
                      className={`p-2.5 hover:bg-rose-50/40 transition-colors flex items-center gap-2.5 ${
                        onSelectTeacher ? 'cursor-pointer' : ''
                      }`}
                    >
                      <div className="shrink-0">{getRankBadge(idx)}</div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs">
                            {t.teacherName}
                          </span>
                          {t.duties && (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                              {t.duties}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {t.departmentName}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-600 mt-0.5">
                          <span>
                            Dạy: <strong>{t.semesterTotalTeaching}t</strong>
                          </span>
                          {t.reductionPeriods > 0 && (
                            <span>
                              Giảm: <strong>{t.reductionPeriods * totalWeeks}t</strong>
                            </span>
                          )}
                          <span>
                            Định mức: <strong>{t.semesterRequiredPeriods}t</strong>
                          </span>
                        </div>
                      </div>

                      {/* Right Balance Badge */}
                      <div className="text-right shrink-0">
                        <div className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 font-black text-xs shadow-2xs">
                          <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                          <span>{t.semesterBalance}t</span>
                        </div>
                        <p className="text-[10px] text-rose-700 font-semibold mt-0.5">
                          TB thiếu {avgWeekly}t/tuần
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {deficitTeachers.length > displayedDeficit.length && (
              <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => setDisplayLimit(0)}
                  className="text-xs text-rose-700 font-bold hover:text-rose-900 hover:underline cursor-pointer"
                >
                  Xem toàn bộ {deficitTeachers.length} giáo viên thiếu tiết →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer helper note */}
      <div className="p-2 bg-blue-50/60 rounded-lg border border-blue-200/60 flex items-start gap-1.5 text-[11px] text-blue-900">
        <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
        <div className="flex-1 leading-relaxed">
          <span>
            Số tiết thực dạy được tổng hợp tự động từ Thời Khóa Biểu hàng tuần đã đối soát phân môn GDPT 2018 (KHTN, Lịch sử - Địa lý, Công nghệ) và các nhiệm vụ kiêm nhiệm giảm trừ theo quy định hiện hành.
          </span>
          {onNavigateToWeeklyLog && (
            <button
              type="button"
              onClick={onNavigateToWeeklyLog}
              className="ml-1 font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
            >
              Xem chi tiết Số Tiết Thực Dạy →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
