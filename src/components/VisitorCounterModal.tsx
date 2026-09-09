import React from 'react';
import {
  X,
  TrendingUp,
  Users,
  Eye,
  Calendar,
  Clock,
  BarChart3,
  ShieldCheck,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { VisitorStats, getVietnamTodayDate } from '../services/visitorCounterService';

interface VisitorCounterModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: VisitorStats | null;
  isLoading?: boolean;
}

export const VisitorCounterModal: React.FC<VisitorCounterModalProps> = ({
  isOpen,
  onClose,
  stats,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const todayStr = getVietnamTodayDate();
  const totalVisits = stats?.totalVisits || 0;
  const uniqueVisitors = stats?.uniqueVisitors || 0;
  const todayVisits = stats?.todayVisits || 0;
  const yesterdayVisits = stats?.yesterdayVisits || 0;
  const thisMonthVisits = stats?.thisMonthVisits || 0;

  // Format last visit time
  const lastVisitFormatted = stats?.lastVisitedAt
    ? new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        dateStyle: 'medium',
        timeStyle: 'medium'
      }).format(new Date(stats.lastVisitedAt))
    : 'Đang cập nhật...';

  // Prepare recent 7 days history
  const historyEntries = Object.entries(stats?.dailyHistory || {})
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA)) // newest first
    .slice(0, 7);

  const maxDailyVisits = Math.max(1, ...historyEntries.map(([, count]) => count));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-700/60 border border-indigo-500/40 flex items-center justify-center text-indigo-200">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                Thống Kê Lượt Truy Cập Website
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-medium border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Realtime
                </span>
              </h2>
              <p className="text-[11px] text-indigo-200">
                Hệ thống thời khóa biểu & phân công THCS - THPT Đốc Binh Kiều
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-800">
          {/* Main Counter Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Total Visits */}
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 flex flex-col">
              <div className="flex items-center justify-between text-indigo-700 text-xs font-semibold mb-1">
                <span>Tổng lượt truy cập</span>
                <Eye className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-indigo-950 font-mono tracking-tight">
                {totalVisits.toLocaleString('vi-VN')}
              </div>
              <div className="text-[10px] text-indigo-600 font-medium mt-auto pt-1">
                Lượt xem trang tích lũy
              </div>
            </div>

            {/* Unique Visitors */}
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 flex flex-col">
              <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold mb-1">
                <span>Khách truy cập</span>
                <Users className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono tracking-tight">
                {uniqueVisitors.toLocaleString('vi-VN')}
              </div>
              <div className="text-[10px] text-emerald-700 font-medium mt-auto pt-1">
                Thiết bị / người dùng riêng biệt
              </div>
            </div>

            {/* Today Visits */}
            <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3 flex flex-col col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-amber-800 text-xs font-semibold mb-1">
                <span>Hôm nay</span>
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-950 font-mono tracking-tight">
                {todayVisits.toLocaleString('vi-VN')}
              </div>
              <div className="text-[10px] text-amber-700 font-medium mt-auto pt-1">
                {todayStr}
              </div>
            </div>
          </div>

          {/* Secondary Stats Strip */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Hôm qua:</span>
              </div>
              <span className="font-bold font-mono text-slate-900 text-sm">
                {yesterdayVisits.toLocaleString('vi-VN')}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Tháng này:</span>
              </div>
              <span className="font-bold font-mono text-indigo-900 text-sm">
                {thisMonthVisits.toLocaleString('vi-VN')}
              </span>
            </div>
          </div>

          {/* Last Visit Info */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Lần truy cập mới nhất:</span>
            <strong className="font-mono text-slate-800 ml-auto">{lastVisitFormatted}</strong>
          </div>

          {/* 7 Days Daily Breakdown */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                Lượt truy cập 7 ngày gần nhất
              </h3>
              <span className="text-[10px] text-slate-500">Đơn vị: lượt xem</span>
            </div>

            {historyEntries.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                Chưa có dữ liệu thống kê theo ngày.
              </div>
            ) : (
              <div className="space-y-2">
                {historyEntries.map(([date, count]) => {
                  const percent = Math.round((count / maxDailyVisits) * 100);
                  const isToday = date === todayStr;

                  // Format date to DD/MM
                  const [y, m, d] = date.split('-');
                  const displayDate = `${d}/${m}/${y}`;

                  return (
                    <div key={date} className="flex items-center gap-2 text-xs">
                      <span className={`w-20 font-mono text-[11px] shrink-0 ${isToday ? 'font-bold text-indigo-700' : 'text-slate-600'}`}>
                        {displayDate} {isToday && '(Nay)'}
                      </span>
                      <div className="flex-1 bg-slate-200/80 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isToday ? 'bg-indigo-600' : 'bg-slate-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-mono font-bold text-slate-900 shrink-0 text-[11px]">
                        {count.toLocaleString('vi-VN')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cloud Synchronization Note */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-emerald-50/50 border border-emerald-100/60 rounded-xl p-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Bộ đếm được lưu trữ an toàn và đồng bộ thời gian thực trên <strong>Firebase Cloud Database</strong> của trường. Dữ liệu đếm tự động lọc trùng phiên duyệt web để đảm bảo số liệu chính xác.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
            <span>Tự động cập nhật tức thì</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shadow-xs active:scale-95 cursor-pointer text-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
