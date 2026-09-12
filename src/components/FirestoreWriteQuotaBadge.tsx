import React, { useEffect, useState } from 'react';
import { Database } from 'lucide-react';
import { getDailyFirestoreMetrics } from '../services/firebase';

export const FirestoreWriteQuotaBadge: React.FC = () => {
  const [metrics, setMetrics] = useState(() => getDailyFirestoreMetrics());

  useEffect(() => {
    const refresh = () => setMetrics(getDailyFirestoreMetrics());
    const timer = window.setInterval(refresh, 10000);
    window.addEventListener('storage', refresh);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const percentage = Math.min(
    100,
    Math.round((metrics.todayWrites / metrics.maxDailyFreeLimit) * 100)
  );
  const tone = metrics.isExhausted || percentage >= 90
    ? 'text-rose-200 border-rose-400/50 bg-rose-500/20'
    : percentage >= 70
    ? 'text-amber-200 border-amber-400/50 bg-amber-500/20'
    : 'text-emerald-200 border-emerald-400/50 bg-emerald-500/20';
  const barTone = metrics.isExhausted || percentage >= 90
    ? 'bg-rose-400'
    : percentage >= 70
    ? 'bg-amber-400'
    : 'bg-emerald-400';

  return (
    <div
      className={`hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-semibold ${tone}`}
      title={`Ước tính hôm nay: ${metrics.todayWrites.toLocaleString('vi-VN')} / ${metrics.maxDailyFreeLimit.toLocaleString('vi-VN')} lượt ghi Firestore (${percentage}%). Bộ đếm trên trình duyệt này, không phải số liệu tổng toàn project.`}
      aria-label={`Ước tính đã dùng ${percentage}% hạn mức ghi Firestore hôm nay`}
    >
      <Database className="w-3.5 h-3.5 shrink-0" />
      <span>{percentage}% ghi</span>
      <span className="w-12 h-1.5 rounded-full bg-white/20 overflow-hidden">
        <span className={`block h-full rounded-full ${barTone}`} style={{ width: `${percentage}%` }} />
      </span>
    </div>
  );
};