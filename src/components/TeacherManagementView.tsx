import React, { useState } from 'react';
import {
  Teacher,
  Department,
  Subject,
  TeacherRole,
  SchoolCampus,
  WorkloadStats,
  ConcurrentDuty,
  DutyType
} from '../types';
import {
  STANDARD_DUTIES_PRESETS,
  getTeacherDutiesList,
  getTeacherTotalDutyReduction
} from '../utils/workloadCalculator';
import {
  UserPlus,
  Edit2,
  Trash2,
  Search,
  X,
  Building,
  Briefcase,
  Baby,
  ShieldAlert,
  Award,
  Check,
  Plus,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';

interface TeacherManagementViewProps {
  teachers: Teacher[];
  departments: Department[];
  subjects: Subject[];
  workloads: WorkloadStats[];
  isAdmin?: boolean;
  onPromptAdminLogin?: () => void;
  onAddTeacher: (teacher: Teacher) => void;
  onUpdateTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
}

export const TeacherManagementView: React.FC<TeacherManagementViewProps> = ({
  teachers,
  departments,
  subjects,
  workloads,
  isAdmin = false,
  onPromptAdminLogin,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [selectedCampusFilter, setSelectedCampusFilter] = useState('ALL');
  const [selectedDutyFilter, setSelectedDutyFilter] = useState('ALL');
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [quickDutyTeacher, setQuickDutyTeacher] = useState<Teacher | null>(null);

  // Form state for full teacher editing
  const [formData, setFormData] = useState<Partial<Teacher>>({
    name: '',
    code: '',
    gender: 'Nam',
    birthDate: '',
    campus: 'THPTDBK',
    departmentId: departments[0]?.id || '',
    primarySubjectId: subjects[0]?.id || '',
    role: 'GVBM',
    duties: [],
    customReductionPeriods: 0,
    baseStandardPeriods: 17,
    phone: '',
    email: '',
    notes: '',
  });

  // Form state for quick duty modal
  const [quickDuties, setQuickDuties] = useState<ConcurrentDuty[]>([]);
  const [quickCustomReduction, setQuickCustomReduction] = useState<number>(0);

  const workloadMap = new Map<string, WorkloadStats>(workloads.map(w => [w.teacherId, w]));
  const deptMap = new Map<string, Department>(departments.map(d => [d.id, d]));
  const subMap = new Map<string, Subject>(subjects.map(s => [s.id, s]));

  const filteredTeachers = teachers.filter(t => {
    const matchesDept = selectedDeptFilter === 'ALL' || t.departmentId === selectedDeptFilter;
    const matchesCampus = selectedCampusFilter === 'ALL' || t.campus === selectedCampusFilter;
    
    // Duty filtering
    let matchesDuty = true;
    if (selectedDutyFilter !== 'ALL') {
      const activeDuties = t.duties || [];
      const hasAnyDuty = activeDuties.length > 0 || (t.role && t.role !== 'GVBM');
      
      if (selectedDutyFilter === 'HAS_DUTY') {
        matchesDuty = hasAnyDuty;
      } else if (selectedDutyFilter === 'NO_DUTY') {
        matchesDuty = !hasAnyDuty;
      } else {
        matchesDuty = activeDuties.some(d => d.type === selectedDutyFilter) || (t.role === selectedDutyFilter);
      }
    }

    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.duties && t.duties.some(d => d.name.toLowerCase().includes(searchTerm.toLowerCase())));

    return matchesDept && matchesCampus && matchesDuty && matchesSearch;
  });

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      code: '',
      gender: 'Nam',
      birthDate: '',
      campus: 'THPTDBK',
      departmentId: departments[0]?.id || '',
      primarySubjectId: subjects[0]?.id || '',
      role: 'GVBM',
      duties: [],
      customReductionPeriods: 0,
      baseStandardPeriods: 17,
      phone: '',
      email: '',
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setEditingTeacher(t);
    // Initialize duties from existing duties or convert legacy single role
    let currentDuties = t.duties ? [...t.duties] : [];
    if (currentDuties.length === 0 && t.role && t.role !== 'GVBM') {
      const preset = STANDARD_DUTIES_PRESETS.find(p => p.type === t.role);
      if (preset) {
        currentDuties.push({
          id: `duty-${Date.now()}`,
          type: preset.type,
          name: preset.name,
          reductionPeriods: preset.defaultReduction,
        });
      }
    }

    setFormData({
      ...t,
      duties: currentDuties,
      customReductionPeriods: t.customReductionPeriods || 0,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenQuickDuty = (t: Teacher) => {
    setQuickDutyTeacher(t);
    let currentDuties = t.duties ? [...t.duties] : [];
    if (currentDuties.length === 0 && t.role && t.role !== 'GVBM') {
      const preset = STANDARD_DUTIES_PRESETS.find(p => p.type === t.role);
      if (preset) {
        currentDuties.push({
          id: `duty-${Date.now()}`,
          type: preset.type,
          name: preset.name,
          reductionPeriods: preset.defaultReduction,
        });
      }
    }
    setQuickDuties(currentDuties);
    setQuickCustomReduction(t.customReductionPeriods || 0);
  };

  const handleSaveQuickDuty = () => {
    if (!quickDutyTeacher) return;
    const updated: Teacher = {
      ...quickDutyTeacher,
      duties: quickDuties,
      customReductionPeriods: quickCustomReduction,
      // Update primary role for compatibility
      role: quickDuties.length > 0 ? (quickDuties[0].type as TeacherRole) : 'GVBM'
    };
    onUpdateTeacher(updated);
    setQuickDutyTeacher(null);
  };

  const handleToggleDutyInForm = (preset: typeof STANDARD_DUTIES_PRESETS[0]) => {
    const currentDuties = formData.duties || [];
    const exists = currentDuties.some(d => d.type === preset.type);
    if (exists) {
      setFormData({
        ...formData,
        duties: currentDuties.filter(d => d.type !== preset.type)
      });
    } else {
      setFormData({
        ...formData,
        duties: [
          ...currentDuties,
          {
            id: `duty-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            type: preset.type,
            name: preset.name,
            reductionPeriods: preset.defaultReduction,
          }
        ]
      });
    }
  };

  const handleUpdateDutyReductionInForm = (type: DutyType, reduction: number) => {
    const currentDuties = formData.duties || [];
    setFormData({
      ...formData,
      duties: currentDuties.map(d => d.type === type ? { ...d, reductionPeriods: Math.max(0, reduction) } : d)
    });
  };

  const handleToggleDutyInQuick = (preset: typeof STANDARD_DUTIES_PRESETS[0]) => {
    const exists = quickDuties.some(d => d.type === preset.type);
    if (exists) {
      setQuickDuties(quickDuties.filter(d => d.type !== preset.type));
    } else {
      setQuickDuties([
        ...quickDuties,
        {
          id: `duty-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: preset.type,
          name: preset.name,
          reductionPeriods: preset.defaultReduction,
        }
      ]);
    }
  };

  const handleUpdateDutyReductionInQuick = (type: DutyType, reduction: number) => {
    setQuickDuties(quickDuties.map(d => d.type === type ? { ...d, reductionPeriods: Math.max(0, reduction) } : d));
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.departmentId || !formData.primarySubjectId) return;

    const currentDuties = formData.duties || [];
    const primaryRole = currentDuties.length > 0 ? (currentDuties[0].type as TeacherRole) : 'GVBM';

    if (editingTeacher) {
      onUpdateTeacher({
        ...editingTeacher,
        ...(formData as Teacher),
        duties: currentDuties,
        role: primaryRole,
      });
    } else {
      const newTeacher: Teacher = {
        id: `tch-${Date.now()}`,
        name: formData.name || 'Giáo viên mới',
        code: formData.code || `${formData.name?.split(' ').pop()}.${formData.name?.charAt(0)}`,
        gender: formData.gender || 'Nam',
        birthDate: formData.birthDate,
        campus: formData.campus || 'THPTDBK',
        departmentId: formData.departmentId || departments[0].id,
        primarySubjectId: formData.primarySubjectId || subjects[0].id,
        role: primaryRole,
        duties: currentDuties,
        customReductionPeriods: formData.customReductionPeriods || 0,
        baseStandardPeriods: formData.baseStandardPeriods || (formData.campus === 'THPTDBK' ? 17 : 19),
        phone: formData.phone,
        email: formData.email,
        notes: formData.notes,
      };
      onAddTeacher(newTeacher);
    }

    setIsAddModalOpen(false);
    setEditingTeacher(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Top filter & action toolbar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên giáo viên, mã, kiêm nhiệm..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-7 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-indigo-500 w-48 sm:w-56"
            />
          </div>

          {/* Campus Filter */}
          <div className="flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCampusFilter}
              onChange={e => setSelectedCampusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Tất cả điểm trường</option>
              <option value="THPTDBK">Điểm chính (K10-12)</option>
              <option value="THCSDBK">Điểm Đốc Binh Kiều (K6-9)</option>
              <option value="THCSTK">Điểm Tân Kiều (K6-9)</option>
            </select>
          </div>

          {/* Department Filter */}
          <select
            value={selectedDeptFilter}
            onChange={e => setSelectedDeptFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">Tất cả tổ chuyên môn</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Concurrent Duties Filter */}
          <div className="flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
            <select
              value={selectedDutyFilter}
              onChange={e => setSelectedDutyFilter(e.target.value)}
              className="text-xs bg-indigo-50/70 border border-indigo-200 rounded px-2 py-1 text-indigo-900 font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Lọc kiêm nhiệm (Tất cả)</option>
              <option value="HAS_DUTY">⚡ Có kiêm nhiệm / Giảm tiết</option>
              <option value="NO_DUTY">🌱 Giáo viên thuần túy (Không kiêm nhiệm)</option>
              <option value="ToTruong">🌟 Tổ trưởng chuyên môn (-3t)</option>
              <option value="ToPho">🔹 Tổ phó chuyên môn (-1t)</option>
              <option value="GiaoVu">📋 Giáo vụ (-4t)</option>
              <option value="BiThuDoan">🔴 Bí thư Đoàn trường (-12t)</option>
              <option value="PhoBiThuDoan">🔘 Phó Bí thư Đoàn (-6t)</option>
              <option value="PhoCap">📚 Phổ cập giáo dục (-4t)</option>
              <option value="ThuKyHoiDong">📝 Thư ký Hội đồng (-2t)</option>
              <option value="TongPhuTrachDoi">🎺 Tổng phụ trách Đội (-13t)</option>
              <option value="ConNho">🍼 Nuôi con nhỏ &lt;36 tháng (-3t)</option>
              <option value="ChuTichCongDoan">🏛️ Chủ tịch Công đoàn (-3t)</option>
              <option value="BanThanhTra">🔍 Ban thanh tra (-1t)</option>
            </select>
          </div>
        </div>

        {/* Add Teacher Button */}
        {isAdmin ? (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Thêm Nhân Sự / GV</span>
          </button>
        ) : (
          <div className="text-[11px] font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded border border-slate-200">
            Chế độ Chỉ Xem
          </div>
        )}
      </div>

      {/* Teachers Directory Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-[11px]">
                <th className="p-2 text-center w-10">STT</th>
                <th className="p-2">Họ và Tên Nhân Sự / GV</th>
                <th className="p-2">Ngày Sinh</th>
                <th className="p-2 text-center">Hệ / Trường</th>
                <th className="p-2">Tổ Chuyên Môn</th>
                <th className="p-2">Môn Chính</th>
                <th className="p-2 min-w-[200px]">Chức Vụ & Kiêm Nhiệm (Thông tư 05/2025 BGDĐT)</th>
                <th className="p-2 text-center">Chuẩn</th>
                <th className="p-2 text-center">Tổng Giảm</th>
                <th className="p-2 text-center">Giao Dạy</th>
                <th className="p-2 text-center">Thực Dạy</th>
                <th className="p-2 text-center">Lệch</th>
                <th className="p-2 text-center w-24">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[11px]">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-6 text-center text-slate-500 italic">
                    Không tìm thấy giáo viên nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher, idx) => {
                  const workload = workloadMap.get(teacher.id);
                  const dept = deptMap.get(teacher.departmentId);
                  const sub = subMap.get(teacher.primarySubjectId);
                  const isOver = workload && workload.balance > 2;
                  const isExact = workload && workload.balance >= -1 && workload.balance <= 2;
                  const dutiesList = getTeacherDutiesList(teacher);

                  return (
                    <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 text-center text-slate-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="p-2 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{teacher.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({teacher.gender})
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {teacher.code}
                        </div>
                        {teacher.notes && (
                          <div className="text-[9px] text-slate-400 font-normal">
                            {teacher.notes}
                          </div>
                        )}
                      </td>
                      <td className="p-2 text-slate-600 font-mono text-[10px]">
                        {teacher.birthDate || '—'}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                          teacher.campus === 'THPTDBK' 
                            ? 'bg-blue-100 text-blue-800' 
                            : teacher.campus === 'THCSDBK' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {teacher.campus === 'THCSTK' ? 'Điểm Tân Kiều' : teacher.campus === 'THCSDBK' ? 'Điểm Đốc Binh Kiều' : 'Điểm chính'}
                        </span>
                      </td>
                      <td className="p-2">
                        <span
                          className="px-1.5 py-0.2 rounded font-semibold text-[10px]"
                          style={{
                            backgroundColor: `${dept?.color || '#4f46e5'}15`,
                            color: dept?.color || '#4f46e5',
                          }}
                        >
                          {dept?.name}
                        </span>
                      </td>
                      <td className="p-2 font-semibold text-slate-800">
                        {sub?.name || 'Môn ?'}
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap items-center gap-1">
                          {dutiesList.length > 0 ? (
                            dutiesList.map((d, dIdx) => (
                              <span
                                key={dIdx}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${d.badgeBg} ${d.badgeColor}`}
                                title={`${d.name} (-${d.reduction} tiết)`}
                              >
                                <span>{d.shortLabel}</span>
                                <span className="font-mono font-bold text-[9px] opacity-85">
                                  -{d.reduction}t
                                </span>
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[10px] italic">
                              GV Bộ môn (0t)
                            </span>
                          )}

                          {workload?.homeroomClass && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border bg-emerald-50 border-emerald-200 text-emerald-800 text-[10px] font-bold">
                              <span>CN {workload.homeroomClass}</span>
                              <span className="font-mono text-[9px]">-3t</span>
                            </span>
                          )}

                          {teacher.customReductionPeriods ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border bg-amber-50 border-amber-200 text-amber-800 text-[10px] font-semibold">
                              <span>Giảm khác</span>
                              <span className="font-mono text-[9px]">-{teacher.customReductionPeriods}t</span>
                            </span>
                          ) : null}

                          {isAdmin && (
                            <button
                              onClick={() => handleOpenQuickDuty(teacher)}
                              className="p-0.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="Chỉnh sửa nhanh các kiêm nhiệm & giảm tiết"
                            >
                              <Sparkles className="w-3 h-3 text-indigo-500" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-center font-semibold text-slate-700">
                        {teacher.baseStandardPeriods}t
                      </td>
                      <td className="p-2 text-center text-rose-600 font-bold">
                        {workload?.reductionPeriods ? `-${workload.reductionPeriods}t` : '0t'}
                      </td>
                      <td className="p-2 text-center font-bold text-slate-900 bg-slate-50/50">
                        {workload?.targetPeriods ?? 17}t
                      </td>
                      <td className="p-2 text-center font-extrabold text-indigo-700">
                        {workload?.assignedPeriods || 0}t
                      </td>
                      <td className="p-2 text-center">
                        {workload && (
                          <span
                            className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                              isExact
                                ? 'bg-emerald-100 text-emerald-800'
                                : isOver
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {workload.balance >= 0 ? `+${workload.balance}` : workload.balance}
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {isAdmin ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenQuickDuty(teacher)}
                              className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer transition-colors"
                              title="Sửa kiêm nhiệm"
                            >
                              <Briefcase className="w-2.5 h-2.5" />
                              <span>Kiêm nhiệm</span>
                            </button>
                            <button
                              onClick={() => handleOpenEdit(teacher)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                              title="Sửa toàn bộ hồ sơ"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Bạn có chắc muốn xóa nhân sự "${teacher.name}"?`)) {
                                  onDeleteTeacher(teacher.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Chỉ xem</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK DUTY EDIT MODAL */}
      {quickDutyTeacher && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden">
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-xs">
                    Cập Nhật Kiêm Nhiệm & Giảm Tiết: {quickDutyTeacher.name}
                  </h3>
                  <p className="text-[10px] text-slate-300">
                    Mã: {quickDutyTeacher.code} • Chuẩn: {quickDutyTeacher.baseStandardPeriods} tiết/tuần
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuickDutyTeacher(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-[11px] text-blue-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Quy định giảm tiết kiêm nhiệm (Thông tư 05/2025/TT-BGDĐT):</p>
                  <p className="text-blue-800 text-[10px] mt-0.5 leading-relaxed">
                    Giáo viên có thể kiêm nhiệm nhiều nhiệm vụ. Bấm chọn nhiệm vụ và điều chỉnh số tiết giảm nếu nhà trường có quy chế riêng.
                  </p>
                </div>
              </div>

              {/* Grid of standard duties */}
              <div>
                <label className="block font-bold text-slate-800 mb-2 text-xs">
                  Chọn các nhiệm vụ kiêm nhiệm:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STANDARD_DUTIES_PRESETS.map(preset => {
                    const activeDuty = quickDuties.find(d => d.type === preset.type);
                    const isChecked = !!activeDuty;

                    return (
                      <div
                        key={preset.type}
                        className={`p-2.5 rounded-lg border transition-all flex flex-col justify-between ${
                          isChecked
                            ? 'bg-indigo-50/80 border-indigo-300 ring-1 ring-indigo-400 shadow-2xs'
                            : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-start gap-2 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleDutyInQuick(preset)}
                              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div>
                              <span className="font-bold text-slate-900 text-xs block">
                                {preset.name}
                              </span>
                              <span className="text-[10px] text-slate-500 block leading-tight">
                                {preset.description}
                              </span>
                            </div>
                          </label>
                        </div>

                        {isChecked && (
                          <div className="mt-2 pt-2 border-t border-indigo-100 flex items-center justify-between text-[11px]">
                            <span className="text-indigo-900 font-medium">Số tiết giảm/tuần:</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={activeDuty.reductionPeriods}
                                onChange={e => handleUpdateDutyReductionInQuick(preset.type, Number(e.target.value))}
                                className="w-14 px-1.5 py-0.5 text-center font-bold text-indigo-900 bg-white border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500 text-xs"
                              />
                              <span className="text-slate-500 font-medium text-[10px]">tiết</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom reduction */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 text-xs block">
                    Giảm trừ khác (nếu có)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Nhập số tiết giảm theo các quyết định đặc thù khác
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={quickCustomReduction}
                    onChange={e => setQuickCustomReduction(Number(e.target.value))}
                    className="w-16 px-2 py-1 text-center font-bold text-slate-900 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 text-xs"
                  />
                  <span className="text-slate-600 font-medium text-[10px]">tiết</span>
                </div>
              </div>

              {/* Realtime summary card */}
              {(() => {
                const totalDutyRed = quickDuties.reduce((s, d) => s + (d.reductionPeriods || 0), 0);
                const totalRed = totalDutyRed + (quickCustomReduction || 0);
                const targetToTeach = Math.max(0, quickDutyTeacher.baseStandardPeriods - totalRed);

                return (
                  <div className="bg-indigo-950 text-white rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-indigo-300 uppercase tracking-wider font-semibold">
                        Tổng Hợp Định Mức Sau Giảm
                      </div>
                      <div className="text-xs font-medium text-slate-200 mt-0.5">
                        Chuẩn: <strong>{quickDutyTeacher.baseStandardPeriods}t</strong> • Đã giảm: <strong className="text-rose-300">-{totalRed}t</strong>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-indigo-200">Định mức phải dạy</div>
                      <div className="text-base font-extrabold text-emerald-400">
                        {targetToTeach} <span className="text-xs font-normal">tiết/tuần</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuickDutyTeacher(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveQuickDuty}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-xs cursor-pointer transition-all"
              >
                Lưu Kiêm Nhiệm & Giảm Tiết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / FULL EDIT TEACHER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden">
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-xs sm:text-sm">
                  {editingTeacher ? 'Chỉnh Sửa Hồ Sơ Nhân Sự & Kiêm Nhiệm' : 'Thêm Nhân Sự / Giáo Viên Mới'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingTeacher(null);
                }}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="p-4 space-y-3.5 text-xs max-h-[80vh] overflow-y-auto">
              {/* Basic info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">
                    Họ và Tên Nhân Sự / GV *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Nguyễn Thị Lan Hương"
                    className="w-full p-1.5 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">
                    Mã Viết Tắt (Ký hiệu)
                  </label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    placeholder="VD: Hương.NL"
                    className="w-full p-1.5 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">
                    Hệ / Phân Hiệu Trường *
                  </label>
                  <select
                    value={formData.campus || 'THPTDBK'}
                    onChange={e => {
                      const campus = e.target.value as SchoolCampus;
                      setFormData({ 
                        ...formData, 
                        campus,
                        baseStandardPeriods: campus === 'THPTDBK' ? 17 : 19 
                      });
                    }}
                    className="w-full p-1.5 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-hidden cursor-pointer font-bold text-indigo-900"
                  >
                    <option value="THPTDBK">Điểm chính (Khối 10-12 • Chuẩn 17t)</option>
                    <option value="THCSDBK">Điểm Đốc Binh Kiều (Khối 6-9 • Chuẩn 19t)</option>
                    <option value="THCSTK">Điểm Tân Kiều (Khối 6-9 • Chuẩn 19t)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">
                    Ngày Sinh
                  </label>
                  <input
                    type="text"
                    value={formData.birthDate || ''}
                    onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                    placeholder="DD/MM/YYYY"
                    className="w-full p-1.5 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">
                    Giới Tính
                  </label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full p-1.5 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">
                    Tổ Chuyên Môn *
                  </label>
                  <select
                    required
                    value={formData.departmentId}
                    onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full p-1.5 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">
                    Môn Giảng Dạy Chính *
                  </label>
                  <select
                    required
                    value={formData.primarySubjectId}
                    onChange={e => setFormData({ ...formData, primarySubjectId: e.target.value })}
                    className="w-full p-1.5 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.shortName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* DEDICATED CONCURRENT DUTIES SECTION */}
              <div className="border border-indigo-100 rounded-lg p-3 bg-indigo-50/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-indigo-700" />
                    <span className="font-bold text-indigo-950 text-xs">
                      Phân Công Kiêm Nhiệm & Giảm Trừ Tiết (Thông tư 05/2025 BGDĐT)
                    </span>
                  </div>
                  <span className="text-[10px] text-indigo-700 font-medium">
                    Có thể chọn đồng thời nhiều kiêm nhiệm
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STANDARD_DUTIES_PRESETS.map(preset => {
                    const activeDuty = (formData.duties || []).find(d => d.type === preset.type);
                    const isChecked = !!activeDuty;

                    return (
                      <div
                        key={preset.type}
                        className={`p-2 rounded-lg border transition-all flex flex-col justify-between ${
                          isChecked
                            ? 'bg-white border-indigo-300 ring-1 ring-indigo-400 shadow-2xs'
                            : 'bg-white/70 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <label className="flex items-start gap-1.5 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleDutyInForm(preset)}
                              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div>
                              <span className="font-bold text-slate-900 text-xs block">
                                {preset.name}
                              </span>
                              <span className="text-[9.5px] text-slate-500 block leading-tight">
                                {preset.description}
                              </span>
                            </div>
                          </label>
                        </div>

                        {isChecked && (
                          <div className="mt-1.5 pt-1.5 border-t border-indigo-100 flex items-center justify-between text-[10px]">
                            <span className="text-indigo-900 font-medium">Giảm trừ:</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={activeDuty.reductionPeriods}
                                onChange={e => handleUpdateDutyReductionInForm(preset.type, Number(e.target.value))}
                                className="w-12 px-1 py-0.5 text-center font-bold text-indigo-900 bg-white border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500 text-xs"
                              />
                              <span className="text-slate-500 font-medium">tiết</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Additional custom reduction */}
                <div className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 text-[11px] block">
                      Giảm trừ khác (tiết)
                    </span>
                    <span className="text-[9.5px] text-slate-500">
                      Các trường hợp miễn giảm đặc thù khác của nhà trường
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={formData.customReductionPeriods || 0}
                      onChange={e => setFormData({ ...formData, customReductionPeriods: Number(e.target.value) })}
                      className="w-14 px-1.5 py-0.5 text-center font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 text-xs"
                    />
                    <span className="text-slate-600 font-medium text-[10px]">tiết</span>
                  </div>
                </div>

                {/* Live calculation banner */}
                {(() => {
                  const base = formData.baseStandardPeriods || (formData.campus === 'THPTDBK' ? 17 : 19);
                  const dutyRed = (formData.duties || []).reduce((s, d) => s + (d.reductionPeriods || 0), 0);
                  const customRed = formData.customReductionPeriods || 0;
                  const totalRed = dutyRed + customRed;
                  const target = Math.max(0, base - totalRed);

                  return (
                    <div className="bg-slate-900 text-white rounded-lg p-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-300 font-semibold uppercase">
                          Định mức giảng dạy thực tế
                        </div>
                        <div className="text-xs text-slate-200 mt-0.5">
                          Chuẩn: <strong>{base}t</strong> • Giảm kiêm nhiệm: <strong className="text-rose-300">-{totalRed}t</strong>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-extrabold text-emerald-400">
                          {target} <span className="text-xs font-normal">tiết/tuần</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">
                  Ghi chú hồ sơ / Nhiệm vụ bổ sung
                </label>
                <input
                  type="text"
                  value={formData.notes || ''}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="VD: Nuôi con nhỏ sinh 05/2024, kiêm Thư ký Hội đồng..."
                  className="w-full p-1.5 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingTeacher(null);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-xs cursor-pointer transition-all"
                >
                  {editingTeacher ? 'Cập Nhật Hồ Sơ' : 'Thêm Nhân Sự Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
