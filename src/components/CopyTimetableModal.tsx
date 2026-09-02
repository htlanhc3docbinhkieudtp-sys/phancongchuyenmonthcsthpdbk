import React, { useState } from 'react';
import { Copy, CheckCircle2, AlertCircle, X, Calendar, ArrowRight, Layers } from 'lucide-react';
import { getWeekDateRange } from '../utils/timetableHelper';

interface CopyTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeek: number;
  availableWeeksWithData: number[];
  onConfirmCopy: (sourceWeek: number, targetWeeks: number[], overwrite: boolean) => void;
}

export const CopyTimetableModal: React.FC<CopyTimetableModalProps> = ({
  isOpen,
  onClose,
  currentWeek,
  availableWeeksWithData,
  onConfirmCopy
}) => {
  const [sourceWeek, setSourceWeek] = useState<number>(currentWeek || 1);
  const [copyMode, setCopyMode] = useState<'single' | 'range' | 'all_hk1' | 'all_hk2'>('single');
  const [targetSingleWeek, setTargetSingleWeek] = useState<number>(
    currentWeek < 35 ? currentWeek + 1 : 1
  );
  const [rangeStart, setRangeStart] = useState<number>(currentWeek < 18 ? currentWeek + 1 : 2);
  const [rangeEnd, setRangeEnd] = useState<number>(18);
  const [overwrite, setOverwrite] = useState<boolean>(true);

  if (!isOpen) return null;

  const allWeeks = Array.from({ length: 35 }, (_, i) => i + 1);

  const getTargetWeeksList = (): number[] => {
    if (copyMode === 'single') {
      return [targetSingleWeek];
    }
    if (copyMode === 'range') {
      const start = Math.min(rangeStart, rangeEnd);
      const end = Math.max(rangeStart, rangeEnd);
      const list: number[] = [];
      for (let w = start; w <= end; w++) {
        if (w !== sourceWeek) list.push(w);
      }
      return list;
    }
    if (copyMode === 'all_hk1') {
      return Array.from({ length: 18 }, (_, i) => i + 1).filter(w => w !== sourceWeek);
    }
    if (copyMode === 'all_hk2') {
      return Array.from({ length: 17 }, (_, i) => i + 19).filter(w => w !== sourceWeek);
    }
    return [];
  };

  const targetWeeksList = getTargetWeeksList();

  const handleExecute = () => {
    if (targetWeeksList.length === 0) return;
    onConfirmCopy(sourceWeek, targetWeeksList, overwrite);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Sao Chép Thời Khóa Biểu Giữa Các Tuần</h3>
              <p className="text-xs text-indigo-200 font-medium">
                Chuyển hoặc nhân bản dữ liệu TKB tuần này sang các tuần khác
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Step 1: Choose Source Week */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              1. Chọn Tuần Nguồn (Tuần có TKB muốn sao chép)
            </label>
            <select
              value={sourceWeek}
              onChange={(e) => setSourceWeek(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all cursor-pointer"
            >
              {allWeeks.map((w) => {
                const info = getWeekDateRange(w);
                const hasData = availableWeeksWithData.includes(w);
                return (
                  <option key={w} value={w}>
                    Tuần {w} ({info.startDate.slice(0, 5)} - {info.endDate.slice(0, 5)}) {hasData ? '★ [Đã có TKB]' : ''} {w === 1 ? '• (TKB Gốc chuẩn)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Step 2: Choose Target Mode */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              2. Chọn Phạm Vi Tuần Đích Cần Áp Dụng
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCopyMode('single')}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                  copyMode === 'single'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20 shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-extrabold text-sm mb-0.5">Một Tuần Cụ Thể</div>
                <div className="text-[11px] text-slate-500 font-normal">Sao chép sang đúng 1 tuần</div>
              </button>

              <button
                type="button"
                onClick={() => setCopyMode('range')}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                  copyMode === 'range'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20 shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-extrabold text-sm mb-0.5">Khoảng Tuần Liên Tiếp</div>
                <div className="text-[11px] text-slate-500 font-normal">Ví dụ: từ Tuần 2 đến Tuần 18</div>
              </button>

              <button
                type="button"
                onClick={() => setCopyMode('all_hk1')}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                  copyMode === 'all_hk1'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20 shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-extrabold text-sm mb-0.5">Toàn Bộ Học Kỳ 1</div>
                <div className="text-[11px] text-slate-500 font-normal">Áp dụng cho Tuần 1 đến 18</div>
              </button>

              <button
                type="button"
                onClick={() => setCopyMode('all_hk2')}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                  copyMode === 'all_hk2'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20 shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-extrabold text-sm mb-0.5">Toàn Bộ Học Kỳ 2</div>
                <div className="text-[11px] text-slate-500 font-normal">Áp dụng cho Tuần 19 đến 35</div>
              </button>
            </div>
          </div>

          {/* Conditional Target inputs */}
          {copyMode === 'single' && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <label className="text-xs font-semibold text-slate-700">Chọn tuần đích nhận TKB:</label>
              <select
                value={targetSingleWeek}
                onChange={(e) => setTargetSingleWeek(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800"
              >
                {allWeeks
                  .filter((w) => w !== sourceWeek)
                  .map((w) => {
                    const info = getWeekDateRange(w);
                    return (
                      <option key={w} value={w}>
                        Tuần {w} ({info.startDate.slice(0, 5)} - {info.endDate.slice(0, 5)})
                      </option>
                    );
                  })}
              </select>
            </div>
          )}

          {copyMode === 'range' && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold text-slate-700">Từ tuần:</label>
                <select
                  value={rangeStart}
                  onChange={(e) => setRangeStart(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                >
                  {allWeeks.map((w) => (
                    <option key={w} value={w}>
                      Tuần {w}
                    </option>
                  ))}
                </select>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 mt-4 shrink-0" />
              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold text-slate-700">Đến tuần:</label>
                <select
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                >
                  {allWeeks.map((w) => (
                    <option key={w} value={w}>
                      Tuần {w}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Summary pill */}
          <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">
                Sao chép từ <strong>Tuần {sourceWeek}</strong> sang{' '}
                <strong>{targetWeeksList.length} tuần</strong> ({targetWeeksList.map(w => `Tuần ${w}`).join(', ')}).
              </div>
              <div className="text-[11px] text-indigo-700 mt-0.5">
                Tất cả các tiết học, môn học, giáo viên bộ môn và phòng học sẽ được nhân bản chính xác sang các tuần đã chọn.
              </div>
            </div>
          </div>

          {/* Overwrite toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500"
            />
            <span className="text-xs font-semibold text-slate-700">
              Ghi đè nếu tuần đích đã có thời khóa biểu trước đó
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={targetWeeksList.length === 0}
            className="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Copy className="w-4 h-4" />
            <span>Thực Hiện Sao Chép ({targetWeeksList.length} tuần)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
