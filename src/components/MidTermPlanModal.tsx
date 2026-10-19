import React, { useState } from 'react';
import {
  FileText,
  Calendar,
  Clock,
  ShieldCheck,
  Users,
  CheckCircle2,
  X,
  AlertTriangle,
  Mail,
  School,
  ChevronRight,
  BookOpen,
  Send,
} from 'lucide-react';
import {
  MID_TERM_1_PLAN_CONFIG,
  OFFICIAL_EXAM_SCHEDULE,
  ExamScheduleSlot,
} from '../data/midTermExamPlanData';

interface MidTermPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MidTermPlanModal: React.FC<MidTermPlanModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'RULES' | 'TIMELINE' | 'SCALE'>('SCHEDULE');
  const [scheduleLevelFilter, setScheduleLevelFilter] = useState<'ALL' | 'THCS' | 'THPT'>('ALL');

  if (!isOpen) return null;

  const cfg = MID_TERM_1_PLAN_CONFIG;

  const filteredSchedule = OFFICIAL_EXAM_SCHEDULE.filter(slot => {
    if (scheduleLevelFilter === 'ALL') return true;
    return slot.level === scheduleLevelFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 shrink-0 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
            <School className="w-4 h-4" />
            <span>{cfg.schoolName}</span>
          </div>

          <h2 className="text-lg sm:text-xl font-black mt-1 text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400 shrink-0" />
            <span>Kế Hoạch Kiểm Tra Giữa Học Kỳ I (Số: {cfg.planNumber})</span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Ban hành ngày <strong>{cfg.planDate}</strong> • Trực tiếp phụ trách Chuyên môn: <strong>{cfg.vicePrincipalChuyenMon.name}</strong> • Email nhận đề: <span className="text-amber-300 underline font-mono">{cfg.vicePrincipalChuyenMon.receiveExamEmail}</span>
          </p>

          {/* Quick Tabs */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setActiveTab('SCHEDULE')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'SCHEDULE'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Lịch Thi Tập Trung (Tuần 9)</span>
            </button>

            <button
              onClick={() => setActiveTab('RULES')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'RULES'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Quy Định Ra Đề & Bảo Mật</span>
            </button>

            <button
              onClick={() => setActiveTab('TIMELINE')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'TIMELINE'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Bảng Tiến Độ Thực Hiện</span>
            </button>

            <button
              onClick={() => setActiveTab('SCALE')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'SCALE'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Quy Mô 3 Điểm Trường</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto grow space-y-4">
          
          {/* TAB 1: SCHEDULE */}
          {activeTab === 'SCHEDULE' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-600">
                  Thời gian: <strong className="text-slate-900">Thứ Hai 02/11/2026 đến Thứ Sáu 06/11/2026</strong> (Tuần 9).
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500 font-medium">Lọc cấp:</span>
                  {(['ALL', 'THCS', 'THPT'] as const).map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => setScheduleLevelFilter(lvl)}
                      className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                        scheduleLevelFilter === lvl
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {lvl === 'ALL' ? 'Tất cả' : lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">Thứ, Ngày</th>
                      <th className="py-2.5 px-3">Thời gian</th>
                      <th className="py-2.5 px-3">Cấp / Khối</th>
                      <th className="py-2.5 px-3">Môn kiểm tra</th>
                      <th className="py-2.5 px-3 text-center">Thời lượng</th>
                      <th className="py-2.5 px-3">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSchedule.map((slot, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                          {slot.dayOfWeek}, {slot.dateStr}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {slot.timeSlot}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            slot.level === 'THPT' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {slot.level} (Khối {slot.grades.join(', ')})
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {slot.subjectName}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-amber-700">
                          {slot.durationMinutes} phút
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {slot.note || (slot.session === 'Sáng' ? 'Buổi Sáng' : 'Buổi Chiều')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
                📌 <strong>Các môn kiểm tra tại lớp (theo TKB Tuần 8):</strong>
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  <li><strong>THCS:</strong> Công nghệ, Tin học, Giáo dục thể chất, Nghệ thuật (Âm nhạc, Mỹ thuật), Hoạt động trải nghiệm hướng nghiệp.</li>
                  <li><strong>THPT:</strong> Giáo dục thể chất, Giáo dục Quốc phòng và An ninh, Hoạt động trải nghiệm hướng nghiệp.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: RULES */}
          {activeTab === 'RULES' && (
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-red-800 font-black uppercase tracking-wider text-xs mb-2">
                  <ShieldCheck className="w-4 h-4 text-red-600" />
                  Quy định bảo mật tuyệt đối đề kiểm tra
                </div>
                <p className="text-red-950 text-xs sm:text-sm leading-relaxed">
                  {cfg.examSubmission.confidentialityRule}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs sm:text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Hồ sơ đề nộp gồm có
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-700 pl-1">
                    {cfg.examSubmission.requiredFiles.map((req, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-xs sm:text-sm">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Thời hạn và nơi nộp đề
                  </h4>
                  <p className="text-xs text-slate-700">
                    ⏰ Hạn chót: <strong className="text-rose-700">{cfg.examSubmission.deadlineText}</strong>
                  </p>
                  <p className="text-xs text-slate-700">
                    👤 Người duyệt đề: <strong>{cfg.examSubmission.recipientName}</strong>
                  </p>
                  <p className="text-xs text-slate-700 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" />
                    Email nộp đề: <span className="font-mono font-bold text-indigo-700">{cfg.vicePrincipalChuyenMon.receiveExamEmail}</span>
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                    🎯 Tỷ lệ ma trận: <em>{cfg.examSubmission.matrixRatio}</em>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TIMELINE */}
          {activeTab === 'TIMELINE' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-600 mb-1 font-medium">
                Bảng tiến độ 8 mốc thời gian từ 16/10/2026 đến 14/11/2026:
              </div>
              <div className="space-y-2.5">
                {cfg.milestones.map((ms, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-indigo-300 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-black bg-indigo-100 text-indigo-800 text-[11px]">
                          {ms.timeRange}
                        </span>
                        <span className="text-slate-500 font-medium">Đơn vị: {ms.leadUnit}</span>
                      </div>
                      <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                        {ms.content}
                      </p>
                    </div>
                    <div className="shrink-0 text-right sm:max-w-xs">
                      <span className="inline-block px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-[11px]">
                        ✓ {ms.output}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SCALE */}
          {activeTab === 'SCALE' && (
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <h4 className="font-bold text-indigo-950 mb-2 flex items-center gap-1.5">
                  <School className="w-4 h-4 text-indigo-600" />
                  Quy mô toàn trường: 53 Lớp với 2.111 Học sinh
                </h4>
                <div className="space-y-3 mt-3">
                  <div className="bg-white rounded-lg p-3 border border-indigo-100">
                    <strong className="text-indigo-900 text-xs uppercase block mb-1">
                      1. Điểm trường chính — Cấp THPT ({cfg.studentScale.thptTotalClasses} lớp, {cfg.studentScale.thptTotalStudents} học sinh):
                    </strong>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {cfg.studentScale.thptDetails}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-indigo-100">
                    <strong className="text-emerald-900 text-xs uppercase block mb-1">
                      2. Điểm trường Đốc Binh Kiều — Cấp THCS (24 lớp, 980 học sinh):
                    </strong>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Tổ chức kiểm tra cho các lớp từ A1 đến A6 của các khối 6, 7, 8, 9. Do Thầy Phó Hiệu trưởng <strong>{cfg.vicePrincipalTHCSDBK.name}</strong> phụ trách.
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-indigo-100">
                    <strong className="text-amber-900 text-xs uppercase block mb-1">
                      3. Điểm trường Tân Kiều — Cấp THCS (15 lớp, 602 học sinh):
                    </strong>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Tổ chức kiểm tra cho các lớp từ A7 trở đi của các khối 6, 7, 8, 9. Do Thầy Phó Hiệu trưởng <strong>{cfg.vicePrincipalTHCSTK.name}</strong> phụ trách.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Kế hoạch số 50/KH-THCS&THPTĐBK (16/10/2026)</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold transition-colors cursor-pointer"
          >
            Đóng bảng kế hoạch
          </button>
        </div>

      </div>
    </div>
  );
};
