import React, { useState, useMemo } from 'react';
import {
  Mail,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Eye,
  Users,
  Search,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Sparkles,
  ClipboardPaste,
  Check,
} from 'lucide-react';
import { Teacher } from '../types';
import { FocusedExamSubjectItem, YearExamProposalMap } from '../utils/examProposerHelper';
import {
  MID_TERM_1_PLAN_CONFIG,
  generateTeacherAssignmentEmailContent,
} from '../data/midTermExamPlanData';

interface TeacherEmailNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: FocusedExamSubjectItem[];
  proposals: YearExamProposalMap;
  teachers: Teacher[];
  onUpdateTeacherEmail?: (teacherId: string, email: string) => void;
  onShowToast?: (msg: string) => void;
}

export const TeacherEmailNotificationModal: React.FC<TeacherEmailNotificationModalProps> = ({
  isOpen,
  onClose,
  items,
  proposals,
  teachers,
  onUpdateTeacherEmail,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'LIST' | 'PREVIEW' | 'IMPORT'>('LIST');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pasteRawText, setPasteRawText] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);

  // Aggregate assigned items for GK1
  const assignedList = useMemo(() => {
    return items
      .map(item => {
        const prop = proposals[item.id];
        const teacherId = prop?.gk1TeacherId;
        const teacherName = prop?.gk1TeacherName;
        const teacher = teacherId ? teacherMap.get(teacherId) : undefined;
        const duration = prop?.durationMinutes || item.defaultDuration;
        const format = prop?.examFormat || item.defaultFormat;

        return {
          itemId: item.id,
          level: item.level,
          grade: item.grade,
          gradeLabel: item.gradeLabel,
          subjectName: item.subjectName,
          teacherId,
          teacherName: teacherName || '(Chưa phân công)',
          teacherEmail: teacher?.email || '',
          durationMinutes: duration,
          examFormat: format,
          isAssigned: Boolean(teacherId && teacherName),
        };
      })
      .filter(item => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          item.subjectName.toLowerCase().includes(q) ||
          item.gradeLabel.toLowerCase().includes(q) ||
          item.teacherName.toLowerCase().includes(q) ||
          item.teacherEmail.toLowerCase().includes(q)
        );
      });
  }, [items, proposals, teacherMap, searchTerm]);

  // Default selected item
  const currentItem = useMemo(() => {
    if (selectedItemId) {
      return assignedList.find(i => i.itemId === selectedItemId) || assignedList[0];
    }
    return assignedList[0];
  }, [selectedItemId, assignedList]);

  // Generated email preview for currentItem
  const emailPreview = useMemo(() => {
    if (!currentItem || !currentItem.isAssigned) return null;
    return generateTeacherAssignmentEmailContent({
      teacherName: currentItem.teacherName,
      teacherEmail: currentItem.teacherEmail,
      subjectName: currentItem.subjectName,
      gradeLabel: currentItem.gradeLabel,
      level: currentItem.level,
      durationMinutes: currentItem.durationMinutes,
      examFormat: currentItem.examFormat,
    });
  }, [currentItem]);

  if (!isOpen) return null;

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onShowToast?.('📋 Đã sao chép nội dung email vào bộ nhớ tạm!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleProcessPastedEmails = () => {
    if (!pasteRawText.trim()) return;
    const lines = pasteRawText.split('\n');
    let matchedCount = 0;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      // Patterns: Name - Email, Name \t Email, Name, Email
      const parts = trimmed.split(/[-–—,\t]+/).map(p => p.trim());
      if (parts.length >= 2) {
        const potentialName = parts[0].toLowerCase();
        const potentialEmail = parts[1];

        // Find teacher
        const found = teachers.find(t => 
          t.name.toLowerCase() === potentialName ||
          potentialName.includes(t.name.toLowerCase()) ||
          t.name.toLowerCase().includes(potentialName)
        );

        if (found && potentialEmail.includes('@') && onUpdateTeacherEmail) {
          onUpdateTeacherEmail(found.id, potentialEmail);
          matchedCount++;
        }
      }
    });

    onShowToast?.(`✅ Đã tự động cập nhật email cho ${matchedCount} giáo viên!`);
    setPasteRawText('');
    setActiveTab('LIST');
  };

  const totalAssigned = assignedList.filter(i => i.isAssigned).length;
  const totalWithEmail = assignedList.filter(i => i.isAssigned && i.teacherEmail).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-linear-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 shrink-0 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
            <ShieldCheck className="w-4 h-4 text-rose-400" />
            <span>Kênh Thông Báo Bảo Mật (1-1 Riêng Tư)</span>
          </div>

          <h2 className="text-lg sm:text-xl font-black mt-1 text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-400 shrink-0" />
            <span>Gửi Email Phân Công Ra Đề Kiểm Tra Giữa HK1</span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
            Hệ thống gửi thư điện tử riêng biệt đến từng Thầy/Cô. Mỗi người chỉ nhận đúng phân công của mình, bảo đảm tuyệt đối tính chất <strong>MẬT</strong> theo Kế hoạch số 50/KH-THCS&THPTĐBK.
          </p>

          {/* Sub Navigation */}
          <div className="flex items-center gap-2 mt-4 text-xs">
            <button
              onClick={() => setActiveTab('LIST')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'LIST'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Danh Sách Phân Công ({totalAssigned} môn)</span>
            </button>

            <button
              onClick={() => setActiveTab('PREVIEW')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'PREVIEW'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Xem Trước Thư Của Từng Thầy Cô</span>
            </button>

            <button
              onClick={() => setActiveTab('IMPORT')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'IMPORT'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Nhập / Dán Danh Sách Email</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto grow space-y-4">
          
          {/* TAB 1: LIST */}
          {activeTab === 'LIST' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-700">Tình trạng Email:</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                    Có Email: {totalWithEmail}/{totalAssigned}
                  </span>
                  {totalWithEmail < totalAssigned && (
                    <span className="text-amber-700 font-medium">
                      (Chờ Thầy/Cô gửi danh sách email vào ngày mai để hoàn tất 100%)
                    </span>
                  )}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Tìm môn, khối, tên GV..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">Cấp / Khối</th>
                      <th className="py-2.5 px-3">Môn kiểm tra</th>
                      <th className="py-2.5 px-3">Giáo viên ra đề</th>
                      <th className="py-2.5 px-3">Địa chỉ Email</th>
                      <th className="py-2.5 px-3 text-center">Thời lượng</th>
                      <th className="py-2.5 px-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignedList.map(item => (
                      <tr key={item.itemId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                          {item.level} - {item.gradeLabel}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-indigo-900">
                          {item.subjectName}
                        </td>
                        <td className="py-2.5 px-3">
                          {item.isAssigned ? (
                            <span className="font-bold text-slate-900">{item.teacherName}</span>
                          ) : (
                            <span className="text-slate-400 italic">(Chưa chọn người ra đề)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          {item.teacherEmail ? (
                            <span className="text-emerald-700 font-medium">{item.teacherEmail}</span>
                          ) : (
                            <span className="text-amber-600 italic">Chưa có email</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                          {item.durationMinutes}p
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.isAssigned && (
                            <button
                              onClick={() => {
                                setSelectedItemId(item.itemId);
                                setActiveTab('PREVIEW');
                              }}
                              className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Xem thư</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PREVIEW */}
          {activeTab === 'PREVIEW' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-700">Chọn giáo viên xem thư:</span>
                  <select
                    value={currentItem?.itemId}
                    onChange={e => setSelectedItemId(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
                  >
                    {assignedList.filter(i => i.isAssigned).map(i => (
                      <option key={i.itemId} value={i.itemId}>
                        {i.teacherName} — {i.subjectName} ({i.gradeLabel})
                      </option>
                    ))}
                  </select>
                </div>

                {emailPreview && (
                  <button
                    onClick={() => handleCopyText(emailPreview.plainText, currentItem?.itemId || '')}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    {copiedId === currentItem?.itemId ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Đã chép nội dung thư</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép thư này</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {emailPreview ? (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-100 shadow-inner flex justify-center">
                  <div
                    className="w-full max-w-2xl bg-white rounded-xl shadow-md overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: emailPreview.htmlBody }}
                  />
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Chưa chọn giáo viên hoặc môn này chưa có người ra đề.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: IMPORT EMAIL */}
          {activeTab === 'IMPORT' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs sm:text-sm text-blue-900 leading-relaxed">
                <strong className="font-bold block mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Hướng dẫn nhập nhanh danh sách Email khi Thầy/Cô gửi:
                </strong>
                Thầy/Cô chỉ cần copy danh sách từ file Excel hoặc tin nhắn (dạng <code>Họ và tên - Email</code> hoặc <code>Họ và tên \t Email</code>), sau đó dán vào ô bên dưới và bấm nút <strong>"Nhận diện & Cập nhật Email"</strong>. Hệ thống sẽ tự động ghép nối vào toàn bộ giáo viên của trường!
              </div>

              <div>
                <textarea
                  rows={8}
                  value={pasteRawText}
                  onChange={e => setPasteRawText(e.target.value)}
                  placeholder={`Ví dụ định dạng dán vào:\nNguyễn Văn A - nguyenvana@moet.edu.vn\nTrần Thị B - tranthib@dongthap.edu.vn\nLê Thanh Cường - cuonglt@moet.edu.vn`}
                  className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleProcessPastedEmails}
                  disabled={!pasteRawText.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Nhận diện & Cập nhật Email</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Kế hoạch 50/KH: Hạn nộp đề trước 17h00 ngày 25/10/2026 cho PHT Nguyễn Minh Trí</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
