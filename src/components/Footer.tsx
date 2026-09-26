import React from 'react';
import { School, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
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
              Trường THCS và THPT Đốc Binh Kiều
            </div>
            <div className="text-[11px] text-slate-400">
              Hệ thống Quản lý Phân công Chuyên môn & Thời khóa biểu (3 điểm trường)
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};
