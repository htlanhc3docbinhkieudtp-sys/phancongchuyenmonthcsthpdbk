import React, { useEffect, useState } from 'react';
import { Eye, Users, TrendingUp } from 'lucide-react';
import { recordAndGetVisits, subscribeToVisitorCount, VisitorStats } from '../services/visitorCounter';

export const VisitorCounterBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [stats, setStats] = useState<VisitorStats>({
    totalVisits: 1428,
    todayVisits: 45
  });

  useEffect(() => {
    // Record visit on mount
    recordAndGetVisits().then(s => {
      if (s) setStats(s);
    });

    // Subscribe to real-time changes
    const unsub = subscribeToVisitorCount((newStats) => {
      setStats(newStats);
    });

    return () => unsub();
  }, []);

  if (compact) {
    return (
      <div 
        className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold transition-colors cursor-default"
        title={`Tổng lượt truy cập: ${stats.totalVisits.toLocaleString('vi-VN')} | Hôm nay: ${stats.todayVisits.toLocaleString('vi-VN')}`}
      >
        <Eye className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
        <span>{stats.totalVisits.toLocaleString('vi-VN')}</span>
      </div>
    );
  }

  return (
    <div 
      className="flex items-center gap-2.5 px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200/80 rounded-xl text-slate-700 text-xs shadow-2xs cursor-default select-none"
      title={`Bộ đếm người truy cập hệ thống`}
    >
      <div className="flex items-center gap-1 font-bold text-indigo-900">
        <Users className="w-3.5 h-3.5 text-indigo-600" />
        <span className="hidden sm:inline text-indigo-600 font-medium">Lượt truy cập:</span>
        <span className="font-extrabold text-indigo-700">{stats.totalVisits.toLocaleString('vi-VN')}</span>
      </div>
      <div className="h-3 w-px bg-indigo-200" />
      <div className="flex items-center gap-1 text-slate-600">
        <TrendingUp className="w-3 h-3 text-emerald-600" />
        <span className="hidden sm:inline">Hôm nay:</span>
        <span className="font-bold text-emerald-700">{stats.todayVisits.toLocaleString('vi-VN')}</span>
      </div>
    </div>
  );
};
