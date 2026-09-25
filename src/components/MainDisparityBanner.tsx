import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Maximize2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { TeacherActualWorkload } from '../utils/actualTeachingHoursHelper';
import { DisparityRankingView } from './DisparityRankingView';

interface MainDisparityBannerProps {
  workloadsHK1: TeacherActualWorkload[];
  workloadsYear: TeacherActualWorkload[];
  currentSemester: 'HK1' | 'HK2';
  onOpenConflictDrawer: () => void;
  onNavigateToWeeklyLog?: () => void;
}

export const MainDisparityBanner: React.FC<MainDisparityBannerProps> = ({
  workloadsHK1,
  workloadsYear,
  currentSemester,
  onOpenConflictDrawer,
  onNavigateToWeeklyLog,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [quickScope, setQuickScope] = useState<'HK1' | 'YEAR'>('HK1');

  const activeWorkloads = quickScope === 'HK1' ? workloadsHK1 : workloadsYear;

  // Quick top excess and deficit
  const topExcess = useMemo(() => {
    return [...activeWorkloads]
      .filter((w) => w.semesterBalance > 0)
      .sort((a, b) => b.semesterBalance - a.semesterBalance)
      .slice(0, 2);
  }, [activeWorkloads]);

  const topDeficit = useMemo(() => {
    return [...activeWorkloads]
      .filter((w) => w.semesterBalance < 0)
      .sort((a, b) => a.semesterBalance - b.semesterBalance)
      .slice(0, 2);
  }, [activeWorkloads]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pt-3">
      <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 border border-amber-300/80 rounded-2xl shadow-xs overflow-hidden transition-all">
        {/* Banner Summary Header Bar */}
        <div className="p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs ring-2 ring-amber-300/60">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-amber-950 text-xs uppercase tracking-wide">
                  Lưu ý:
                </span>
                <span className="font-bold text-slate-800 text-xs sm:text-sm">
                  Top Giáo Viên Thừa Tiết & Thiếu Tiết Nhiều Nhất ({quickScope === 'HK1' ? 'Học Kỳ 1' : 'Cả Năm'})
                </span>
                <div className="inline-flex rounded-md p-0.5 bg-white border border-amber-200 text-[11px] shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setQuickScope('HK1')}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                      quickScope === 'HK1'
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    HK1
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickScope('YEAR')}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                      quickScope === 'YEAR'
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Cả Năm
                  </button>
                </div>
              </div>

              {/* Quick inline badges preview */}
              <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                {topExcess.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                    <span>
                      Thừa nhất: <strong>{topExcess[0].teacherName} (+{topExcess[0].semesterBalance}t)</strong>
                      {topExcess[1] && (
                        <span className="hidden md:inline text-emerald-700/80">, {topExcess[1].teacherName} (+{topExcess[1].semesterBalance}t)</span>
                      )}
                    </span>
                  </span>
                )}
                {topDeficit.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    <TrendingDown className="w-3 h-3 text-rose-600" />
                    <span>
                      Thiếu nhất: <strong>{topDeficit[0].teacherName} ({topDeficit[0].semesterBalance}t)</strong>
                      {topDeficit[1] && (
                        <span className="hidden md:inline text-rose-700/80">, {topDeficit[1].teacherName} ({topDeficit[1].semesterBalance}t)</span>
                      )}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-amber-50/80 border border-amber-300 text-amber-900 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <span>{isExpanded ? 'Thu gọn' : 'Xem chi tiết'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={onOpenConflictDrawer}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              title="Mở bảng kiểm tra định mức đầy đủ"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mở Ngăn Kéo</span>
            </button>
          </div>
        </div>

        {/* Collapsible Content Area */}
        {isExpanded && (
          <div className="p-3 sm:p-4 bg-white/95 border-t border-amber-200 animate-in slide-in-from-top duration-200">
            <DisparityRankingView
              workloadsHK1={workloadsHK1}
              workloadsYear={workloadsYear}
              defaultScope={quickScope}
              onNavigateToWeeklyLog={onNavigateToWeeklyLog}
            />
          </div>
        )}
      </div>
    </div>
  );
};
