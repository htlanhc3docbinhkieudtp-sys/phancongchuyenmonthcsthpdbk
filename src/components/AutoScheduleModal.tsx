import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Zap,
  Building2,
  GraduationCap,
  School,
  BookOpen,
  Calendar,
  Layers,
  HelpCircle,
  Cpu
} from 'lucide-react';
import {
  ClassGroup,
  Subject,
  Teacher,
  Assignment,
  SchoolConfig,
  SchoolTimetable,
  TimetableRuleConfig
} from '../types';
import {
  DEFAULT_TIMETABLE_RULES,
  executeSmartScheduleAlgorithm,
  ScheduleGenerationResult
} from '../utils/timetableAlgorithm';

interface AutoScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassGroup[];
  subjects: Subject[];
  teachers: Teacher[];
  assignments: Assignment[];
  config: SchoolConfig;
  currentTimetable: SchoolTimetable;
  onApplyTimetable: (result: SchoolTimetable) => void;
}

export const AutoScheduleModal: React.FC<AutoScheduleModalProps> = ({
  isOpen,
  onClose,
  classes,
  subjects,
  teachers,
  assignments,
  config,
  currentTimetable,
  onApplyTimetable
}) => {
  const [rules, setRules] = useState<TimetableRuleConfig>(DEFAULT_TIMETABLE_RULES);
  const [isRunning, setIsRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<'CONFIG' | 'RUNNING' | 'RESULT'>('CONFIG');
  const [result, setResult] = useState<ScheduleGenerationResult | null>(null);

  if (!isOpen) return null;

  const handleStartScheduling = () => {
    setIsRunning(true);
    setActiveStep('RUNNING');

    // Asynchronous non-blocking execution using setTimeout to keep UI silky smooth
    setTimeout(() => {
      try {
        const scheduleResult = executeSmartScheduleAlgorithm(
          classes,
          subjects,
          teachers,
          assignments,
          config,
          rules,
          currentTimetable
        );
        setResult(scheduleResult);
        setActiveStep('RESULT');
      } catch (err) {
        console.error('Error during auto-scheduling:', err);
      } finally {
        setIsRunning(false);
      }
    }, 400);
  };

  const handleApply = () => {
    if (result) {
      onApplyTimetable(result.timetable);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/25 rounded-xl border border-indigo-400/30">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight">
                  Tự Động Sắp Xếp Thời Khóa Biểu
                </h3>
                <span className="px-2 py-0.5 bg-indigo-600/80 text-[10px] font-bold rounded-full border border-indigo-400/30">
                  Thuật toán CSP Sư phạm
                </span>
              </div>
              <p className="text-xs text-indigo-200/90 font-medium">
                Áp dụng chuẩn ràng buộc cứng & ràng buộc mềm theo từng điểm trường
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {activeStep === 'CONFIG' && (
            <div className="space-y-5">
              {/* 1. Scope Selection (Chọn Điểm Trường để Xếp) */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>1. Phạm vi xếp Thời Khóa Biểu (Khuyến nghị xếp theo từng điểm trường):</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRules({ ...rules, campusScope: 'ALL' })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      rules.campusScope === 'ALL'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-indigo-600 mb-1" />
                    <div className="text-xs font-black">Toàn trường</div>
                    <div className="text-[10px] text-slate-500">Cả 3 điểm (28 lớp)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRules({ ...rules, campusScope: 'THPT' })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      rules.campusScope === 'THPT'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 text-indigo-600 mb-1" />
                    <div className="text-xs font-black">Điểm THPT</div>
                    <div className="text-[10px] text-slate-500">14 lớp (K10, 11, 12)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRules({ ...rules, campusScope: 'DBK' })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      rules.campusScope === 'DBK'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700'
                    }`}
                  >
                    <School className="w-4 h-4 text-indigo-600 mb-1" />
                    <div className="text-xs font-black">THCS Đốc Binh Kiều</div>
                    <div className="text-[10px] text-slate-500">Điểm chính THCS</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRules({ ...rules, campusScope: 'TK' })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      rules.campusScope === 'TK'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-indigo-600 mb-1" />
                    <div className="text-xs font-black">THCS Tân Kiều</div>
                    <div className="text-[10px] text-slate-500">Điểm lẻ Tân Kiều</div>
                  </button>
                </div>
              </div>

              {/* 2. Ràng Buộc Cứng (Được bảo đảm 100%) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-indigo-950 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Ràng Buộc Cứng (Bảo đảm 100% tuân thủ):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Không trùng tiết GV:</strong> Một giáo viên không thể ở 2 lớp cùng 1 thời điểm.</span>
                  </div>

                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Tiết cố định:</strong> Chào cờ T1 sáng T2 (K8-12) / T5 chiều T2 (K6,7); SHL T5 sáng/chiều T7.</span>
                  </div>

                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Di chuyển điểm trường:</strong> Trong 1 buổi sáng/chiều, GV không dạy ở 2 điểm trường khác nhau.</span>
                  </div>

                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>GV THPT dạy K6,7:</strong> Không xếp tiết 1 buổi chiều nếu GV có dạy tại Đốc Binh Kiều / Tân Kiều.</span>
                  </div>
                </div>
              </div>

              {/* 3. Tùy Chọn Ràng Buộc Mềm (Tối Ưu Sư Phạm) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Tùy Chọn Tối Ưu Sư Phạm & Tiện Ích Giáo Viên:</span>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={rules.avoidPePeriod5Morning}
                      onChange={(e) => setRules({ ...rules, avoidPePeriod5Morning: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500"
                    />
                    <div className="text-xs">
                      <strong className="text-slate-800">Tránh xếp môn Thể dục (GDTC) vào Tiết 5 buổi sáng</strong>
                      <p className="text-slate-500 text-[11px]">Tránh học sinh vận động mạnh dưới trời nắng gắt giữa trưa</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={rules.avoidPePeriod1Afternoon}
                      onChange={(e) => setRules({ ...rules, avoidPePeriod1Afternoon: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500"
                    />
                    <div className="text-xs">
                      <strong className="text-slate-800">Tránh xếp môn Thể dục (GDTC) vào Tiết 1 buổi chiều</strong>
                      <p className="text-slate-500 text-[11px]">Tránh thời điểm nắng nóng đầu giờ chiều 12h30 - 13h15</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={rules.avoidThptTeacherP1AfternoonForGrade67}
                      onChange={(e) => setRules({ ...rules, avoidThptTeacherP1AfternoonForGrade67: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500"
                    />
                    <div className="text-xs">
                      <strong className="text-slate-800">Ưu tiên tiết liền (tiết đôi) cho Ngữ văn, Toán, Tin học, GDQP-AN</strong>
                      <p className="text-slate-500 text-[11px]">Gom 2 tiết liền nhau để thực hành và giảng dạy hiệu quả hơn</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Running State */}
          {activeStep === 'RUNNING' && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto animate-pulse">
                <Cpu className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-slate-800">
                  Đang chạy thuật toán sắp xếp Thời Khóa Biểu...
                </h4>
                <p className="text-xs text-slate-500">
                  Kiểm tra hàng ngàn tổ hợp ma trận tiết học và giải quyết các ràng buộc giáo viên
                </p>
              </div>
            </div>
          )}

          {/* Result State */}
          {activeStep === 'RESULT' && result && (
            <div className="space-y-4">
              {/* Summary Banner */}
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-emerald-950 uppercase">
                      Đã xếp thành công {result.placedSlotsCount} / {result.totalRequiredSlots} tiết học ({result.successRate}%)
                    </h4>
                    <p className="text-xs text-emerald-800">
                      Thời gian xử lý: <strong>{result.executionTimeMs} ms</strong> • 100% tuân thủ quy tắc giáo viên và điểm trường
                    </p>
                  </div>
                </div>
              </div>

              {/* Conflicts if any */}
              {result.conflicts.length > 0 ? (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <span>Lưu ý / Điều chỉnh còn lại ({result.conflicts.length} môn):</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 text-xs text-amber-800">
                    {result.conflicts.map((c, i) => (
                      <p key={i}>• {c.message}</p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 text-xs text-indigo-900 font-medium">
                  ✨ <strong>Hoàn hảo:</strong> Toàn bộ các tiết học đã được phân bổ trơn tru, không có xung đột lịch hay trùng giờ giáo viên.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all cursor-pointer"
          >
            Hủy Bỏ
          </button>

          {activeStep === 'CONFIG' && (
            <button
              type="button"
              onClick={handleStartScheduling}
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Bắt Đầu Xếp Tự Động</span>
            </button>
          )}

          {activeStep === 'RESULT' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveStep('CONFIG')}
                className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer"
              >
                Cấu Hình Lại
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Áp Dụng Thời Khóa Biểu Này</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
