import React from 'react';
import { Eye, Users, Calendar, BarChart3, School, Heart } from 'lucide-react';
import { VisitorStats } from '../services/visitorCounterService';

interface FooterProps {
  stats: VisitorStats | null;
  onOpenStatsModal: () => void;
}

export const Footer: React.FC<FooterProps> = ({ stats, onOpenStatsModal }) => {
  const totalVisits = stats?.totalVisits || 0;
  const uniqueVisitors = stats?.uniqueVisitors || 0;
  const todayVisits = stats?.todayVisits || 0;

  return (
    <footer className="w-full bg-slate-900 border-t border-slate-800 text-slate-300 text-xs py-4 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* School branding */}
        <div className="flex items-center gap-2.5 text-center md:text-left">
          <div className="w-7 h-7 rounded-lg bg-indigo-900/80 border border-indigo-700/50 flex items-center justify-center text-indigo-300 shrink-0">
            <School className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="font-bold text-slate-100 text-xs sm:text-sm">
              Trường THCS & THPT Đốc Binh Kiều
            </div>
            <div className="text-[11px] text-slate-400">
              Hệ thống Quản lý Phân công Chuyên môn & Thời khóa biểu (3 điểm trường)
            </div>
          </div>
        </div>

        {/* Visitor Counter Widget */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-xs">
          {/* Online badge */}
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium pr-1 border-r border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Đang trực tuyến</span>
          </div>

          {/* Today visits */}
          <div className="flex items-center gap-1 text-[11px] text-slate-300">
            <Calendar className="w-3 h-3 text-amber-400" />
            <span>Hôm nay:</span>
            <strong className="text-white font-mono font-bold">
              {todayVisits.toLocaleString('vi-VN')}
            </strong>
          </div>

          {/* Unique visitors */}
          <div className="flex items-center gap-1 text-[11px] text-slate-300 border-l border-slate-700 pl-2">
            <Users className="w-3 h-3 text-emerald-400" />
            <span>Khách:</span>
            <strong className="text-white font-mono font-bold">
              {uniqueVisitors.toLocaleString('vi-VN')}
            </strong>
          </div>

          {/* Total visits */}
          <div className="flex items-center gap-1 text-[11px] text-slate-300 border-l border-slate-700 pl-2">
            <Eye className="w-3 h-3 text-indigo-400" />
            <span>Tổng lượt:</span>
            <strong className="text-amber-300 font-mono font-bold">
              {totalVisits.toLocaleString('vi-VN')}
            </strong>
          </div>

          {/* View Details Button */}
          <button
            onClick={onOpenStatsModal}
            className="ml-1 px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-2xs"
            title="Xem chi tiết biểu đồ và lịch sử lượt truy cập"
          >
            <BarChart3 className="w-3 h-3" />
            <span className="hidden sm:inline">Chi tiết</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
