import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  X,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Teacher,
  ClassGroup,
  Subject,
  Department,
  Assignment
} from '../types';
import {
  autoDistributeAssignments,
  AutoAssignOptions
} from '../utils/autoAssigner';

interface AutoAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  classes: ClassGroup[];
  subjects: Subject[];
  departments: Department[];
  currentAssignments: Assignment[];
  onApplyAssignments: (assignments: Assignment[]) => void;
}

export const AutoAssignModal: React.FC<AutoAssignModalProps> = ({
  isOpen,
  onClose,
  teachers,
  classes,
  subjects,
  departments,
  currentAssignments,
  onApplyAssignments,
}) => {
  const [options, setOptions] = useState<AutoAssignOptions>({
    keepExisting: true,
    targetGrade: 'ALL',
    balanceThreshold: 2,
    prioritizeHomeroom: true,
  });

  const [previewResult, setPreviewResult] = useState<{
    assignments: Assignment[];
    logs: string[];
  } | null>(null);

  if (!isOpen) return null;

  const handleRunSolver = () => {
    const result = autoDistributeAssignments(
      teachers,
      classes,
      subjects,
      currentAssignments,
      options
    );
    setPreviewResult(result);
  };

  const handleApply = () => {
    if (previewResult) {
      onApplyAssignments(previewResult.assignments);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Tự Động Phân Công Chuyên Môn
              </h3>
              <p className="text-[11px] text-slate-500">
                Thuật toán tối ưu hóa định mức & cân bằng số tiết cho giáo viên
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Options */}
        <div className="py-3 space-y-3 text-xs">
          <div className="space-y-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
            {/* Option 1: Keep existing or fill all */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.keepExisting}
                onChange={e => setOptions({ ...options, keepExisting: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <strong className="text-slate-900 font-semibold block text-[11px]">
                  Giữ nguyên các phân công đã có (Chỉ gán các ô trống)
                </strong>
                <span className="text-slate-500 text-[10px]">
                  Khuyên dùng: Bảo toàn công việc bạn đã xếp tay và chỉ phân công bù các tiết thiếu.
                </span>
              </div>
            </label>

            {/* Option 2: Homeroom priority */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.prioritizeHomeroom}
                onChange={e => setOptions({ ...options, prioritizeHomeroom: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <strong className="text-slate-900 font-semibold block text-[11px]">
                  Ưu tiên giáo viên chủ nhiệm dạy lớp của mình
                </strong>
                <span className="text-slate-500 text-[10px]">
                  GVCN có chuyên môn phù hợp sẽ ưu tiên dạy chính lớp chủ nhiệm.
                </span>
              </div>
            </label>

            {/* Option 3: Target Grade */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="font-semibold text-slate-700 text-[11px]">Khối lớp áp dụng:</span>
              <select
                value={options.targetGrade}
                onChange={e => setOptions({ ...options, targetGrade: e.target.value })}
                className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Tất cả các khối lớp (Toàn trường)</option>
                <option value="10">Chỉ Khối 10 THPT</option>
                <option value="11">Chỉ Khối 11 THPT</option>
                <option value="12">Chỉ Khối 12 THPT</option>
              </select>
            </div>
          </div>

          {/* Solver Run Trigger */}
          <div className="flex justify-center">
            <button
              onClick={handleRunSolver}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Chạy Tính Toán Phân Công</span>
            </button>
          </div>

          {/* Preview Box */}
          {previewResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Kết Quả Tự Động Phân Công:</span>
              </div>
              <p className="text-slate-700 text-[11px]">
                Tổng số phân công sau khi chạy: <strong className="text-emerald-700 font-bold">{previewResult.assignments.length} tiết dạy</strong>
              </p>
              <div className="max-h-24 overflow-y-auto space-y-1 bg-white p-2 rounded border border-emerald-100 text-[10px] text-slate-600">
                {previewResult.logs.map((log, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="text-emerald-500">•</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
          >
            Hủy bỏ
          </button>
          {previewResult && (
            <button
              onClick={handleApply}
              className="px-3.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-2xs cursor-pointer"
            >
              Áp Dụng Lên Bảng Phân Công
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
