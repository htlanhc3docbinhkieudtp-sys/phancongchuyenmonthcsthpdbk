import React, { useState, useMemo, useEffect } from 'react';
import {
  Teacher,
  Department,
  ClassGroup,
  Subject,
  SchoolConfig,
} from '../types';
import {
  ExamRoundKey,
  ExamProctoringPeriodsMap,
  roundPeriods,
  formatPeriodNumber,
  loadExamProctoringPeriods,
  saveExamProctoringPeriodsToCloud,
  OFFICIAL_GK1_PROCTORING_PERIODS,
  parseProctoringExcelFile,
  exportProctoring4RoundsExcel,
} from '../utils/examProctoringPeriodsHelper';
import { calculateAllActualWorkloads } from '../utils/actualTeachingHoursHelper';
import {
  RotateCcw,
  Search,
  CheckCircle2,
  Upload,
  Download,
} from 'lucide-react';

interface ProctoringCellInputProps {
  value: number;
  onCommit: (nextValue: number) => void;
  className?: string;
  title?: string;
}

const ProctoringCellInput: React.FC<ProctoringCellInputProps> = ({
  value,
  onCommit,
  className = '',
  title,
}) => {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState<string>(value ? formatPeriodNumber(value) : '');

  useEffect(() => {
    if (!focused) {
      setDraft(value ? formatPeriodNumber(value) : '');
    }
  }, [value, focused]);

  const handleCommit = () => {
    setFocused(false);
    const trimmed = draft.trim().replace(',', '.');
    if (trimmed === '') {
      if (value !== 0) onCommit(0);
      setDraft('');
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setDraft(value ? formatPeriodNumber(value) : '');
      return;
    }
    const rounded = roundPeriods(parsed);
    if (rounded !== roundPeriods(value)) {
      onCommit(rounded);
    }
    setDraft(rounded ? formatPeriodNumber(rounded) : '');
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      placeholder="0"
      title={title}
      onFocus={(e) => {
        setFocused(true);
        e.target.select();
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={handleCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          (e.currentTarget as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
          setDraft(value ? formatPeriodNumber(value) : '');
          setFocused(false);
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      className={className}
    />
  );
};

interface ExamInvigilationViewProps {
  teachers: Teacher[];
  departments: Department[];
  classes: ClassGroup[];
  subjects: Subject[];
  config: SchoolConfig;
  onShowToast?: (msg: string) => void;
  proctoringPeriods?: ExamProctoringPeriodsMap;
  onUpdateProctoringPeriods?: (next: ExamProctoringPeriodsMap, toastMsg?: string) => void;
}

export const ExamInvigilationView: React.FC<ExamInvigilationViewProps> = ({
  teachers,
  departments,
  classes,
  subjects,
  config,
  onShowToast,
  proctoringPeriods,
  onUpdateProctoringPeriods,
}) => {
  const [localProctoring, setLocalProctoring] = useState<ExamProctoringPeriodsMap>(() =>
    loadExamProctoringPeriods(config.academicYear)
  );
  const effectiveProctoring = proctoringPeriods ?? localProctoring;

  const [auditFilter, setAuditFilter] = useState<'ALL' | 'ENTERED' | 'THCSDBK' | 'THCSTK' | 'THPTDBK'>('ENTERED');
  const [importRound, setImportRound] = useState<ExamRoundKey>('ck1');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const commitProctoringUpdate = async (next: ExamProctoringPeriodsMap, toastMsg?: string) => {
    if (onUpdateProctoringPeriods) {
      onUpdateProctoringPeriods(next, toastMsg);
    } else {
      setLocalProctoring(next);
      await saveExamProctoringPeriodsToCloud(
        config.academicYear || '2026 - 2027',
        next,
        config.vicePrincipalName || 'Ban Giám hiệu'
      );
      if (toastMsg && onShowToast) {
        onShowToast(toastMsg);
      }
    }
  };

  const handleUpdateTeacherRound = (teacherId: string, round: ExamRoundKey, val: number) => {
    const prevRec = effectiveProctoring[teacherId] || {};
    const nextRec = {
      ...prevRec,
      [round]: val === 0 ? undefined : roundPeriods(val),
      updatedAt: Date.now(),
    };
    const nextMap: ExamProctoringPeriodsMap = {
      ...effectiveProctoring,
      [teacherId]: nextRec,
    };
    commitProctoringUpdate(nextMap);
  };

  const handleResetOfficialGk1 = () => {
    if (!window.confirm('Khôi phục cột Coi KTGK1 về đúng số liệu chính thức 43 giáo viên (tổng 432.65 tiết)? Các cột KTCK1, KTGK2, KTCK2 sẽ được giữ nguyên.')) {
      return;
    }
    const nextMap: ExamProctoringPeriodsMap = { ...effectiveProctoring };
    teachers.forEach((t) => {
      const existing = nextMap[t.id] ? { ...nextMap[t.id] } : {};
      const officialGk1 = OFFICIAL_GK1_PROCTORING_PERIODS[t.id];
      if (officialGk1 !== undefined) {
        existing.gk1 = officialGk1;
      } else {
        delete existing.gk1;
      }
      existing.updatedAt = Date.now();
      nextMap[t.id] = existing;
    });
    commitProctoringUpdate(nextMap, 'Đã khôi phục số liệu Coi KTGK1 chuẩn (43 GV • 432.65 tiết)!');
  };

  const handleImportProctoringFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { matchedCount, unmatchedNames, valuesByTeacherId } = await parseProctoringExcelFile(
        file,
        teachers
      );
      if (matchedCount === 0) {
        onShowToast?.('Không tìm thấy giáo viên khớp trong file Excel. Vui lòng kiểm tra cột Họ và tên & Số tiết.');
        return;
      }
      const nextMap: ExamProctoringPeriodsMap = { ...effectiveProctoring };
      Object.entries(valuesByTeacherId).forEach(([tId, val]) => {
        nextMap[tId] = {
          ...(nextMap[tId] || {}),
          [importRound]: val === 0 ? undefined : val,
          updatedAt: Date.now(),
        };
      });
      const roundLabel = `KT${importRound.toUpperCase()}`;
      const extraMsg = unmatchedNames.length > 0 ? ` (${unmatchedNames.length} tên chưa khớp)` : '';
      await commitProctoringUpdate(
        nextMap,
        `Đã nhập ${matchedCount} giáo viên vào cột Coi ${roundLabel}${extraMsg}!`
      );
    } catch (err) {
      onShowToast?.(err instanceof Error ? err.message : 'Lỗi khi đọc file Excel kê tiết coi kiểm tra!');
    }
  };

  const fullYearBalanceMap = useMemo(() => {
    const workloads = calculateAllActualWorkloads(
      1,
      teachers,
      departments,
      classes,
      subjects,
      config,
      undefined,
      undefined,
      35,
      {},
      1,
      35,
      effectiveProctoring
    );
    return new Map(workloads.map((w) => [w.teacherId, w.semesterBalance]));
  }, [teachers, departments, classes, subjects, config, effectiveProctoring]);

  const deptNameMap = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);

  const proctoringAuditRows = useMemo(() => {
    return teachers
      .map((t) => {
        const rec = effectiveProctoring[t.id] || {};
        const gk1 = roundPeriods(rec.gk1 || 0);
        const ck1 = roundPeriods(rec.ck1 || 0);
        const gk2 = roundPeriods(rec.gk2 || 0);
        const ck2 = roundPeriods(rec.ck2 || 0);
        const total = roundPeriods(gk1 + ck1 + gk2 + ck2);
        return {
          teacher: t,
          deptName: deptNameMap.get(t.departmentId) || 'Chuyên môn',
          gk1,
          ck1,
          gk2,
          ck2,
          total,
          yearBalance: fullYearBalanceMap.get(t.id) ?? 0,
        };
      })
      .filter((row) => {
        if (auditFilter === 'ENTERED' && row.total === 0) return false;
        if (auditFilter === 'THCSDBK' && row.teacher.campus !== 'THCSDBK') return false;
        if (auditFilter === 'THCSTK' && row.teacher.campus !== 'THCSTK') return false;
        if (auditFilter === 'THPTDBK' && row.teacher.campus !== 'THPTDBK') return false;
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          return (
            row.teacher.name.toLowerCase().includes(term) ||
            row.teacher.code.toLowerCase().includes(term) ||
            row.deptName.toLowerCase().includes(term)
          );
        }
        return true;
      });
  }, [teachers, effectiveProctoring, deptNameMap, fullYearBalanceMap, auditFilter, searchTerm]);

  const proctoringTotals = useMemo(() => {
    let gk1Count = 0;
    let enteredAnyCount = 0;
    let sumGk1 = 0;
    let sumCk1 = 0;
    let sumGk2 = 0;
    let sumCk2 = 0;
    teachers.forEach((t) => {
      const rec = effectiveProctoring[t.id];
      if (!rec) return;
      const g1 = rec.gk1 || 0;
      const c1 = rec.ck1 || 0;
      const g2 = rec.gk2 || 0;
      const c2 = rec.ck2 || 0;
      if (g1 > 0) gk1Count++;
      if (g1 + c1 + g2 + c2 > 0) enteredAnyCount++;
      sumGk1 = roundPeriods(sumGk1 + g1);
      sumCk1 = roundPeriods(sumCk1 + c1);
      sumGk2 = roundPeriods(sumGk2 + g2);
      sumCk2 = roundPeriods(sumCk2 + c2);
    });
    return {
      gk1Count,
      enteredAnyCount,
      sumGk1,
      sumCk1,
      sumGk2,
      sumCk2,
      sumAll: roundPeriods(sumGk1 + sumCk1 + sumGk2 + sumCk2),
    };
  }, [teachers, effectiveProctoring]);

  return (
    <div className="space-y-4">
      {/* 3 KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-2xl border border-indigo-200 shadow-2xs">
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Coi KTGK1 (Giữa Kỳ 1)</span>
          <p className="text-2xl font-black text-indigo-900 mt-1">
            {formatPeriodNumber(proctoringTotals.sumGk1)} tiết
          </p>
          <p className="text-[11px] text-indigo-700 mt-0.5 font-semibold">
            {proctoringTotals.gk1Count} giáo viên đã kê tiết GK1
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">KTCK1 • KTGK2 • KTCK2 (Bổ Sung)</span>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm font-black text-slate-800">
            <span>CK1: <b className="text-blue-700">{formatPeriodNumber(proctoringTotals.sumCk1)}t</b></span>
            <span>GK2: <b className="text-emerald-700">{formatPeriodNumber(proctoringTotals.sumGk2)}t</b></span>
            <span>CK2: <b className="text-purple-700">{formatPeriodNumber(proctoringTotals.sumCk2)}t</b></span>
          </div>
          <p className="text-[11px] text-slate-600 mt-1">Nhập hoặc nạp file Excel sau mỗi đợt coi kiểm tra</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-white p-4 rounded-2xl border border-emerald-200 shadow-2xs">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Tổng Tiết Coi KT Cả Năm</span>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            +{formatPeriodNumber(proctoringTotals.sumAll)} tiết
          </p>
          <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">
            Tự động đồng bộ vào Bảng Số Tiết Thực Dạy
          </p>
        </div>
      </div>

      {/* Main 4-Round Exam Proctoring Entry & Audit Table */}
      <div className="bg-white rounded-2xl border border-indigo-200 overflow-hidden shadow-2xs">
        <div className="p-4 bg-gradient-to-r from-indigo-50/80 via-white to-slate-50 border-b border-indigo-100 space-y-3">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div>
              <h4 className="font-black text-sm text-indigo-950 uppercase tracking-tight flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                Bảng Kê Tiết Coi Kiểm Tra 4 Đợt (KTGK1 • KTCK1 • KTGK2 • KTCK2)
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Đã nhập chính thức <b>43 giáo viên</b> từ file <b>KÊ TIẾT COI KIỂM TRA GK1</b> (Tổng <b>432.65 tiết</b>) • Có thể nhập trực tiếp số thập phân (vd: 8.66, 9.33) để tự động tính lại tổng tiết thừa/thiếu sang tab <b>Số tiết thực dạy</b>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1 bg-white border border-slate-300 rounded-xl px-2 py-1">
                <span className="text-[11px] font-bold text-slate-600">Nhập Excel vào:</span>
                <select
                  value={importRound}
                  onChange={(e) => setImportRound(e.target.value as ExamRoundKey)}
                  className="text-xs font-black text-indigo-800 bg-transparent focus:outline-hidden cursor-pointer"
                >
                  <option value="gk1">Coi KTGK1</option>
                  <option value="ck1">Coi KTCK1</option>
                  <option value="gk2">Coi KTGK2</option>
                  <option value="ck2">Coi KTCK2</option>
                </select>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportProctoringFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="ml-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Chọn File Excel
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  exportProctoring4RoundsExcel(
                    config,
                    teachers,
                    departments,
                    effectiveProctoring,
                    fullYearBalanceMap
                  )
                }
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Xuất Excel 4 Đợt
              </button>

              <button
                type="button"
                onClick={handleResetOfficialGk1}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Khôi phục đúng 432.65 tiết GK1 chuẩn từ file thầy gửi"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Nạp Lại GK1 Chuẩn
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'ENTERED', label: `Đã kê tiết coi KT (${proctoringTotals.enteredAnyCount} GV)` },
                { id: 'ALL', label: `Tất cả toàn trường (${teachers.length} GV)` },
                { id: 'THCSDBK', label: 'THCS Đốc Binh Kiều' },
                { id: 'THCSTK', label: 'THCS Tân Kiều' },
                { id: 'THPTDBK', label: 'THPT Đốc Binh Kiều' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAuditFilter(tab.id as typeof auditFilter)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    auditFilter === tab.id
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên, mã GV hoặc tổ CM..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 font-black text-slate-800 text-center">
                <th className="py-2.5 px-2.5 w-12 border-r border-slate-200">STT</th>
                <th className="py-2.5 px-3 text-left border-r border-slate-200 min-w-[180px]">Họ và tên giáo viên</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 w-28">Điểm trường</th>
                <th className="py-2.5 px-3 text-left border-r border-slate-200 min-w-[160px]">Tổ chuyên môn</th>
                <th className="py-2.5 px-2 bg-indigo-700 text-white border-r border-indigo-600 w-24">Coi KTGK1</th>
                <th className="py-2.5 px-2 bg-indigo-600 text-white border-r border-indigo-500 w-24">Coi KTCK1</th>
                <th className="py-2.5 px-2 bg-indigo-600 text-white border-r border-indigo-500 w-24">Coi KTGK2</th>
                <th className="py-2.5 px-2 bg-indigo-600 text-white border-r border-indigo-500 w-24">Coi KTCK2</th>
                <th className="py-2.5 px-3 bg-emerald-50 text-emerald-950 border-r border-slate-200 w-24">Tổng Coi KT</th>
                <th className="py-2.5 px-3 bg-amber-50 text-amber-950 w-32">Thừa/Thiếu Cả Năm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {proctoringAuditRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                    Không có giáo viên phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                proctoringAuditRows.map((row, idx) => {
                  const campusLabel =
                    row.teacher.campus === 'THPTDBK'
                      ? 'THPT ĐBK'
                      : row.teacher.campus === 'THCSTK'
                      ? 'THCS Tân Kiều'
                      : 'THCS ĐBK';
                  return (
                    <tr key={row.teacher.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="py-1.5 px-2.5 text-center text-slate-500 border-r border-slate-100">{idx + 1}</td>
                      <td className="py-1.5 px-3 font-bold text-slate-900 border-r border-slate-100">
                        {row.teacher.name}
                      </td>
                      <td className="py-1.5 px-2.5 text-center border-r border-slate-100">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.teacher.campus === 'THPTDBK'
                            ? 'bg-blue-50 text-blue-700'
                            : row.teacher.campus === 'THCSTK'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-emerald-50 text-emerald-800'
                        }`}>
                          {campusLabel}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-slate-700 border-r border-slate-100">{row.deptName}</td>

                      <td className={`py-1 px-1.5 text-center border-r border-slate-100 ${row.gk1 > 0 ? 'bg-indigo-50/70' : ''}`}>
                        <ProctoringCellInput
                          value={row.gk1}
                          onCommit={(val) => handleUpdateTeacherRound(row.teacher.id, 'gk1', val)}
                          title={`Coi kiểm tra giữa kỳ 1 - ${row.teacher.name}`}
                          className={`w-16 px-1.5 py-1 text-center text-xs rounded-lg border focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                            row.gk1 > 0
                              ? 'font-black text-indigo-900 bg-white border-indigo-300'
                              : 'font-medium text-slate-500 bg-slate-50/70 border-slate-200'
                          }`}
                        />
                      </td>

                      <td className={`py-1 px-1.5 text-center border-r border-slate-100 ${row.ck1 > 0 ? 'bg-blue-50/60' : ''}`}>
                        <ProctoringCellInput
                          value={row.ck1}
                          onCommit={(val) => handleUpdateTeacherRound(row.teacher.id, 'ck1', val)}
                          title={`Coi kiểm tra cuối kỳ 1 - ${row.teacher.name}`}
                          className={`w-16 px-1.5 py-1 text-center text-xs rounded-lg border focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                            row.ck1 > 0
                              ? 'font-black text-blue-900 bg-white border-blue-300'
                              : 'font-medium text-slate-500 bg-slate-50/70 border-slate-200'
                          }`}
                        />
                      </td>

                      <td className={`py-1 px-1.5 text-center border-r border-slate-100 ${row.gk2 > 0 ? 'bg-emerald-50/60' : ''}`}>
                        <ProctoringCellInput
                          value={row.gk2}
                          onCommit={(val) => handleUpdateTeacherRound(row.teacher.id, 'gk2', val)}
                          title={`Coi kiểm tra giữa kỳ 2 - ${row.teacher.name}`}
                          className={`w-16 px-1.5 py-1 text-center text-xs rounded-lg border focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                            row.gk2 > 0
                              ? 'font-black text-emerald-900 bg-white border-emerald-300'
                              : 'font-medium text-slate-500 bg-slate-50/70 border-slate-200'
                          }`}
                        />
                      </td>

                      <td className={`py-1 px-1.5 text-center border-r border-slate-100 ${row.ck2 > 0 ? 'bg-purple-50/60' : ''}`}>
                        <ProctoringCellInput
                          value={row.ck2}
                          onCommit={(val) => handleUpdateTeacherRound(row.teacher.id, 'ck2', val)}
                          title={`Coi kiểm tra cuối kỳ 2 - ${row.teacher.name}`}
                          className={`w-16 px-1.5 py-1 text-center text-xs rounded-lg border focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                            row.ck2 > 0
                              ? 'font-black text-purple-900 bg-white border-purple-300'
                              : 'font-medium text-slate-500 bg-slate-50/70 border-slate-200'
                          }`}
                        />
                      </td>

                      <td className="py-1.5 px-3 text-center font-black text-emerald-800 bg-emerald-50/40 border-r border-slate-100">
                        {row.total > 0 ? `+${formatPeriodNumber(row.total)}` : '0'}
                      </td>

                      <td className={`py-1.5 px-3 text-center font-black ${
                        row.yearBalance < 0 ? 'text-rose-700 bg-rose-50/40' : row.yearBalance > 0 ? 'text-emerald-700 bg-emerald-50/30' : 'text-slate-600'
                      }`}>
                        {row.yearBalance > 0 ? `+${formatPeriodNumber(row.yearBalance)}` : formatPeriodNumber(row.yearBalance)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              {(() => {
                const filteredGk1 = roundPeriods(proctoringAuditRows.reduce((s, r) => s + r.gk1, 0));
                const filteredCk1 = roundPeriods(proctoringAuditRows.reduce((s, r) => s + r.ck1, 0));
                const filteredGk2 = roundPeriods(proctoringAuditRows.reduce((s, r) => s + r.gk2, 0));
                const filteredCk2 = roundPeriods(proctoringAuditRows.reduce((s, r) => s + r.ck2, 0));
                const filteredAll = roundPeriods(filteredGk1 + filteredCk1 + filteredGk2 + filteredCk2);
                return (
                  <tr className="bg-amber-50 border-t-2 border-slate-300 font-black text-slate-900 text-center">
                    <td className="py-2.5 px-2.5 border-r border-slate-200">∑</td>
                    <td colSpan={3} className="py-2.5 px-3 text-left border-r border-slate-200">
                      TỔNG CỘNG ({proctoringAuditRows.length} giáo viên đang hiển thị)
                    </td>
                    <td className="py-2.5 px-2 text-indigo-900 border-r border-slate-200">
                      {formatPeriodNumber(filteredGk1)}
                    </td>
                    <td className="py-2.5 px-2 text-blue-900 border-r border-slate-200">
                      {formatPeriodNumber(filteredCk1)}
                    </td>
                    <td className="py-2.5 px-2 text-emerald-900 border-r border-slate-200">
                      {formatPeriodNumber(filteredGk2)}
                    </td>
                    <td className="py-2.5 px-2 text-purple-900 border-r border-slate-200">
                      {formatPeriodNumber(filteredCk2)}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-800 bg-emerald-100/60 border-r border-slate-200">
                      +{formatPeriodNumber(filteredAll)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px] font-bold">
                      Đã đồng bộ Thực dạy
                    </td>
                  </tr>
                );
              })()}
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
