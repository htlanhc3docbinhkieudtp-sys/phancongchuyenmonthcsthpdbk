import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  X,
  ShieldAlert,
  Lock
} from 'lucide-react';
import { ConflictIssue } from '../types';

interface ConflictAuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: ConflictIssue[];
  onSelectIssue?: (issue: ConflictIssue) => void;
  onLockCell?: (classId: string, subjectId: string, reason?: string) => void;
}

export const ConflictAuditDrawer: React.FC<ConflictAuditDrawerProps> = ({
  isOpen,
  onClose,
  conflicts,
  onSelectIssue,
  onLockCell,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  if (!isOpen) return null;

  const errors = conflicts.filter(c => c.severity === 'error');
  const warnings = conflicts.filter(c => c.severity === 'warning');
  const infos = conflicts.filter(c => c.severity === 'info');

  const filteredConflicts = conflicts.filter(c => {
    if (filterType === 'error') return c.severity === 'error';
    if (filterType === 'warning') return c.severity === 'warning';
    if (filterType === 'info') return c.severity === 'info';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/30 backdrop-blur-xs">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-8">
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-xs">
                  Kiểm Tra Xung Đột & Định Mức
                </h3>
                <p className="text-[10px] text-slate-500">
                  Phát hiện thiếu tiết, vượt định mức, chưa có GVCN
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

          {/* Filter Pills */}
          <div className="p-2 border-b border-slate-100 flex items-center gap-1 text-[11px]">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({conflicts.length})
            </button>
            <button
              onClick={() => setFilterType('error')}
              className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                filterType === 'error'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Lỗi ({errors.length})
            </button>
            <button
              onClick={() => setFilterType('warning')}
              className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                filterType === 'warning'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Lưu ý ({warnings.length})
            </button>
            <button
              onClick={() => setFilterType('info')}
              className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                filterType === 'info'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              Thông tin ({infos.length})
            </button>
          </div>

          {/* Conflict List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredConflicts.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-1.5" />
                <h4 className="font-bold text-slate-800 text-xs">
                  Không có xung đột nào!
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Bảng phân công chuyên môn hoàn toàn hợp lệ và tối ưu.
                </p>
              </div>
            ) : (
              filteredConflicts.map(issue => {
                const isError = issue.severity === 'error';
                const isWarning = issue.severity === 'warning';

                return (
                  <div
                    key={issue.id}
                    className={`p-2.5 rounded-lg border text-xs transition-all ${
                      isError
                        ? 'bg-rose-50/70 border-rose-200'
                        : isWarning
                        ? 'bg-amber-50/70 border-amber-200'
                        : 'bg-indigo-50/70 border-indigo-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                          isError
                            ? 'text-rose-600'
                            : isWarning
                            ? 'text-amber-600'
                            : 'text-indigo-600'
                        }`}
                      />
                      <div className="flex-1">
                        <strong
                          className={`font-bold block text-[11px] ${
                            isError
                              ? 'text-rose-900'
                              : isWarning
                              ? 'text-amber-900'
                              : 'text-indigo-900'
                          }`}
                        >
                          {issue.title}
                        </strong>
                        <p className="text-slate-600 mt-0.5 text-[10px] leading-relaxed">
                          {issue.description}
                        </p>
                        {issue.type === 'UNASSIGNED' && issue.classId && issue.subjectId && onLockCell && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <button
                              onClick={() => onLockCell(issue.classId!, issue.subjectId!, 'Môn không chọn')}
                              className="px-2 py-0.5 rounded bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            >
                              <Lock className="w-2.5 h-2.5 text-amber-600" />
                              <span>Khóa: Môn không chọn</span>
                            </button>
                            <button
                              onClick={() => onLockCell(issue.classId!, issue.subjectId!, 'Chưa dạy kỳ này / Phân công sau')}
                              className="px-2 py-0.5 rounded bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            >
                              <Lock className="w-2.5 h-2.5 text-amber-600" />
                              <span>Khóa: Dạy sau</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-2.5 border-t border-slate-200 bg-slate-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-3 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
