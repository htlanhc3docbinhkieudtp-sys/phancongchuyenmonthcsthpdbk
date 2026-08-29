import React, { useState } from 'react';
import {
  Teacher,
  Assignment,
  ClassGroup,
  Subject,
  Department,
  WorkloadStats,
  LockedCell
} from '../types';
import { getTeacherDutiesList } from '../utils/workloadCalculator';
import {
  Search,
  Filter,
  UserPlus,
  X,
  GripVertical,
  Layers,
  Building,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';

interface ClassMatrixViewProps {
  classes: ClassGroup[];
  subjects: Subject[];
  teachers: Teacher[];
  departments: Department[];
  assignments: Assignment[];
  workloads: WorkloadStats[];
  lockedCells: LockedCell[];
  onAssignTeacher: (classId: string, subjectId: string, teacherId: string) => void;
  onRemoveAssignment: (classId: string, subjectId: string) => void;
  onToggleLockCell: (classId: string, subjectId: string, reason?: string) => void;
  onBatchLockSubject: (subjectId: string, targetGradeOrLevel?: string, lock?: boolean, reason?: string) => void;
  onBatchLockEmptyElectives: (level?: 'THPT' | 'ALL') => void;
  onUnlockAll: (targetGradeOrLevel?: string) => void;
  onQuickAutoAssignForSubject?: (subjectId: string) => void;
}

export const ClassMatrixView: React.FC<ClassMatrixViewProps> = ({
  classes,
  subjects,
  teachers,
  departments,
  assignments,
  workloads,
  lockedCells,
  onAssignTeacher,
  onRemoveAssignment,
  onToggleLockCell,
  onBatchLockSubject,
  onBatchLockEmptyElectives,
  onUnlockAll,
}) => {
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL_THPT'); // 'ALL_THPT' | '10' | '11' | '12' | 'THCS' | '6' | '7' | '8' | '9'
  const [selectedCampusFilter, setSelectedCampusFilter] = useState<string>('ALL');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [teacherSearch, setTeacherSearch] = useState<string>('');
  const [draggedTeacherId, setDraggedTeacherId] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ classId: string; subjectId: string } | null>(null);
  const [quickAssignCell, setQuickAssignCell] = useState<{ classId: string; subjectId: string } | null>(null);
  const [isLockToolsOpen, setIsLockToolsOpen] = useState(false);
  const [customLockReason, setCustomLockReason] = useState<string>('Môn không chọn');

  const teacherMap = new Map<string, Teacher>(teachers.map(t => [t.id, t]));
  const workloadMap = new Map<string, WorkloadStats>(workloads.map(w => [w.teacherId, w]));
  const deptMap = new Map<string, Department>(departments.map(d => [d.id, d]));

  const lockedMap = new Map<string, LockedCell>();
  lockedCells.forEach(lc => {
    lockedMap.set(`${lc.classId}_${lc.subjectId}`, lc);
  });

  // Filter classes based on grade tab & campus
  const filteredClasses = classes.filter(cls => {
    if (selectedGrade === 'ALL_THPT') return cls.level === 'THPT';
    if (selectedGrade === 'THCS') return cls.level === 'THCS';
    return cls.grade === selectedGrade;
  });

  const isThptView = selectedGrade === 'ALL_THPT' || selectedGrade === '10' || selectedGrade === '11' || selectedGrade === '12';
  const isThcsView = selectedGrade === 'THCS' || selectedGrade === '6' || selectedGrade === '7' || selectedGrade === '8' || selectedGrade === '9';

  // Filter subjects based on department filter, grade level, and active tab
  const filteredSubjects = subjects.filter(sub => {
    if (sub.id === 'sub-nv') return false;

    if (selectedDeptFilter !== 'ALL' && sub.departmentId !== selectedDeptFilter) {
      return false;
    }

    if (['10', '11', '12', '6', '7', '8', '9'].includes(selectedGrade)) {
      return (sub.defaultPeriods[selectedGrade] || 0) > 0;
    }

    if (isThptView) {
      return (sub.defaultPeriods['10'] || 0) > 0 || (sub.defaultPeriods['11'] || 0) > 0 || (sub.defaultPeriods['12'] || 0) > 0;
    }

    if (isThcsView) {
      return (sub.defaultPeriods['6'] || 0) > 0 || (sub.defaultPeriods['7'] || 0) > 0 || (sub.defaultPeriods['8'] || 0) > 0 || (sub.defaultPeriods['9'] || 0) > 0;
    }

    return true;
  });

  const getSubjectDisplayPeriod = (sub: Subject) => {
    if (['10', '11', '12', '6', '7', '8', '9'].includes(selectedGrade)) {
      return `${sub.defaultPeriods[selectedGrade] || 0}t/t`;
    }
    if (isThptView) {
      const p = sub.defaultPeriods['10'] || sub.defaultPeriods['11'] || sub.defaultPeriods['12'] || 0;
      return `${p}t/t`;
    }
    if (isThcsView) {
      const p = sub.defaultPeriods['6'] || sub.defaultPeriods['7'] || sub.defaultPeriods['8'] || sub.defaultPeriods['9'] || 0;
      return `${p}t/t`;
    }
    return `${sub.defaultPeriods['10'] || sub.defaultPeriods['6'] || 0}t/t`;
  };

  // Matrix stats for current view
  let totalViewSlots = 0;
  let assignedViewSlots = 0;
  let lockedViewSlots = 0;
  let unassignedActiveSlots = 0;

  filteredClasses.forEach(cls => {
    filteredSubjects.forEach(sub => {
      const p = sub.defaultPeriods[cls.grade] || 0;
      if (p > 0) {
        totalViewSlots++;
        const assignment = assignments.find(a => a.classId === cls.id && a.subjectId === sub.id);
        const isLocked = lockedMap.has(`${cls.id}_${sub.id}`);
        if (assignment && assignment.teacherId) {
          assignedViewSlots++;
        } else if (isLocked) {
          lockedViewSlots++;
        } else {
          unassignedActiveSlots++;
        }
      }
    });
  });

  // Filter teachers for sidebar
  const filteredTeachers = teachers.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
      t.code.toLowerCase().includes(teacherSearch.toLowerCase());
    const matchesDept = selectedDeptFilter === 'ALL' || t.departmentId === selectedDeptFilter;
    const matchesCampus = selectedCampusFilter === 'ALL' || t.campus === selectedCampusFilter;
    return matchesSearch && matchesDept && matchesCampus;
  });

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, teacherId: string) => {
    e.dataTransfer.setData('text/plain', teacherId);
    e.dataTransfer.effectAllowed = 'copyMove';
    setDraggedTeacherId(teacherId);
  };

  const handleDragEnd = () => {
    setDraggedTeacherId(null);
    setHoveredCell(null);
  };

  const handleDragOver = (e: React.DragEvent, classId: string, subjectId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!hoveredCell || hoveredCell.classId !== classId || hoveredCell.subjectId !== subjectId) {
      setHoveredCell({ classId, subjectId });
    }
  };

  const handleDragLeave = () => {
    setHoveredCell(null);
  };

  const handleDrop = (e: React.DragEvent, classId: string, subjectId: string) => {
    e.preventDefault();
    const teacherId = e.dataTransfer.getData('text/plain') || draggedTeacherId;
    if (teacherId) {
      onAssignTeacher(classId, subjectId, teacherId);
    }
    setDraggedTeacherId(null);
    setHoveredCell(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Top Filter & Toolbar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs mb-4 space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          {/* Grade tabs */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1.5">
              Khối lớp:
            </span>
            {[
              { id: 'ALL_THPT', label: 'THPT (10, 11, 12)' },
              { id: '10', label: 'Khối 10' },
              { id: '11', label: 'Khối 11' },
              { id: '12', label: 'Khối 12' },
              { id: 'THCS', label: 'Tất cả THCS (6-9)' },
              { id: '6', label: 'Khối 6' },
              { id: '7', label: 'Khối 7' },
              { id: '8', label: 'Khối 8' },
              { id: '9', label: 'Khối 9' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedGrade(tab.id)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  selectedGrade === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters Right */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Campus Filter */}
            <div className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedCampusFilter}
                onChange={e => setSelectedCampusFilter(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">Tất cả điểm trường / hệ</option>
                <option value="THPTDBK">THPT Đốc Binh Kiều (K10-12)</option>
                <option value="THCSDBK">THCS Đốc Binh Kiều (K6-9)</option>
                <option value="THCSTK">THCS Trần Kiều (K6-9)</option>
              </select>
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedDeptFilter}
                onChange={e => setSelectedDeptFilter(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">Tất cả các tổ ({departments.length} tổ)</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Lock Management Dropdown Toggle */}
            <div className="relative">
              <button
                onClick={() => setIsLockToolsOpen(!isLockToolsOpen)}
                className="px-2.5 py-1 rounded text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>Quản Lý Khóa Ô ({lockedViewSlots})</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isLockToolsOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Popup menu for lock tools */}
              {isLockToolsOpen && (
                <div className="absolute right-0 mt-1 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-30 p-3 animate-in fade-in-50 zoom-in-95">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-amber-600" />
                      <span className="font-bold text-xs text-slate-900">Tiện Ích Khóa Ô Môn Học</span>
                    </div>
                    <button
                      onClick={() => setIsLockToolsOpen(false)}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-600 mb-2.5 leading-relaxed">
                    Dành cho môn học sinh <b>không chọn</b> theo tổ hợp hoặc môn <b>chưa dạy kỳ này</b> (GDĐP, HĐTN-HN). Ô khóa sẽ không bị tính là lỗi chưa gán.
                  </p>

                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Khóa nhanh theo môn (Cả khối):
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => {
                          onBatchLockSubject('sub-gddp', selectedGrade, true, 'Chưa dạy kỳ này / Phân công sau');
                          setIsLockToolsOpen(false);
                        }}
                        className="p-1.5 text-left rounded bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-xs font-semibold text-slate-800 transition-colors"
                      >
                        🔒 Khóa GD Địa phương
                      </button>
                      <button
                        onClick={() => {
                          onBatchLockSubject('sub-hdtn', selectedGrade, true, 'Chưa dạy kỳ này / Phân công sau');
                          setIsLockToolsOpen(false);
                        }}
                        className="p-1.5 text-left rounded bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-xs font-semibold text-slate-800 transition-colors"
                      >
                        🔒 Khóa HĐTN-HN
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          onBatchLockEmptyElectives('THPT');
                          setIsLockToolsOpen(false);
                        }}
                        className="w-full p-2 rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-xs font-bold text-indigo-900 flex items-center justify-between transition-colors"
                      >
                        <span>🔒 Khóa tất cả môn trống khối THPT</span>
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      </button>
                    </div>

                    <div className="pt-1">
                      <button
                        onClick={() => {
                          if (window.confirm(`Mở khóa tất cả các ô trong khối ${selectedGrade}?`)) {
                            onUnlockAll(selectedGrade);
                            setIsLockToolsOpen(false);
                          }
                        }}
                        className="w-full p-1.5 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center justify-center gap-1 transition-colors"
                      >
                        <Unlock className="w-3.5 h-3.5 text-rose-600" />
                        <span>Mở khóa toàn bộ khối hiện tại</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              <span className="font-bold text-slate-700">Đã gán GV:</span>
              <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                {assignedViewSlots} ô
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="font-bold text-slate-700">Tạm khóa / Không chọn:</span>
              <span className="font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                {lockedViewSlots} ô
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${unassignedActiveSlots > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
              <span className="font-bold text-slate-700">Chưa gán cần phân công:</span>
              <span className={`font-bold px-1.5 py-0.5 rounded border ${
                unassignedActiveSlots > 0 
                  ? 'text-rose-800 bg-rose-50 border-rose-200' 
                  : 'text-emerald-800 bg-emerald-50 border-emerald-200'
              }`}>
                {unassignedActiveSlots} ô
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 italic flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Mẹo: Nhấp vào ô để phân công nhanh hoặc bấm icon 🔒 để khóa ô môn không học</span>
          </div>
        </div>
      </div>

      {/* Main Drag-Drop Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT PALETTE: Draggable Teachers */}
        <div className="lg:col-span-4 xl:col-span-3 bg-white rounded-lg border border-slate-200 shadow-2xs p-3 sticky top-20 max-h-[calc(100vh-100px)] flex flex-col">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <span>Danh Sách Giáo Viên</span>
                <span className="text-[11px] font-bold text-indigo-600">
                  ({filteredTeachers.length})
                </span>
              </h3>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                Kéo thả giáo viên vào ô môn học (kể cả ô đã khóa)
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm tên / mã GV..."
              value={teacherSearch}
              onChange={e => setTeacherSearch(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* Teacher Cards Scrollable List */}
          <div className="space-y-1.5 overflow-y-auto pr-1 flex-1">
            {filteredTeachers.map(teacher => {
              const workload = workloadMap.get(teacher.id);
              const dept = deptMap.get(teacher.departmentId);
              const primarySub = subjects.find(s => s.id === teacher.primarySubjectId);
              const isOverloaded = workload && workload.balance > 2;
              const isBalanced = workload && workload.balance >= -1 && workload.balance <= 2;
              const isDragging = draggedTeacherId === teacher.id;

              return (
                <div
                  key={teacher.id}
                  draggable
                  onDragStart={e => handleDragStart(e, teacher.id)}
                  onDragEnd={handleDragEnd}
                  className={`p-2 rounded border text-left cursor-grab active:cursor-grabbing transition-all select-none group relative ${
                    isDragging
                      ? 'opacity-40 border-dashed border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-indigo-300 hover:shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="cursor-grab text-slate-400 group-hover:text-indigo-600 shrink-0">
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="font-bold text-xs text-slate-800 group-hover:text-indigo-900 truncate">
                            {teacher.name}
                          </span>
                          {teacher.campus && (
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded-xs font-semibold shrink-0">
                              {teacher.campus}
                            </span>
                          )}
                          {getTeacherDutiesList(teacher).map((d, dIdx) => (
                            <span
                              key={dIdx}
                              className={`text-[9px] border font-bold px-1 rounded-xs shrink-0 ${d.badgeBg} ${d.badgeColor}`}
                              title={`${d.name} (-${d.reduction}t)`}
                            >
                              {d.shortLabel}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                          <span
                            className="font-semibold px-1 rounded-xs text-[9px]"
                            style={{ backgroundColor: `${dept?.color || '#4f46e5'}15`, color: dept?.color || '#4f46e5' }}
                          >
                            {primarySub?.shortName || dept?.name}
                          </span>
                          {workload?.homeroomClass && (
                            <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 rounded-xs border border-emerald-200 font-bold">
                              CN {workload.homeroomClass}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Workload Pill */}
                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-bold text-slate-700">
                        <span className="text-indigo-700">{workload?.assignedPeriods || 0}</span>
                        <span className="text-slate-400">/{workload?.targetPeriods || 17}t</span>
                      </div>
                      {workload && (
                        <div
                          className={`text-[9px] font-bold px-1 rounded-xs mt-0.5 inline-block ${
                            isBalanced
                              ? 'bg-emerald-100 text-emerald-800'
                              : isOverloaded
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {workload.balance >= 0 ? `+${workload.balance}` : workload.balance}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT MATRIX: Classes x Subjects Grid */}
        <div className="lg:col-span-8 xl:col-span-9 bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h2 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Ma Trận Phân Công Bộ Môn ({filteredClasses.length} Lớp)
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Kéo thả GV vào ô để gán • Nhấp vào ô để tùy chọn phân công hoặc khóa ô
            </span>
          </div>

          <div className="overflow-x-auto max-h-[calc(100vh-160px)]">
            <table className="w-full text-xs text-left border-collapse min-w-[700px]">
              <thead className="sticky top-0 bg-slate-100 z-10 text-[11px]">
                <tr className="border-b border-slate-200">
                  <th className="p-2.5 font-bold text-slate-800 w-28 bg-slate-100 sticky left-0 z-20 border-r border-slate-200 shadow-xs">
                    Lớp & Sĩ số
                  </th>
                  <th className="p-2 font-bold text-slate-700 w-32 border-r border-slate-200">
                    GV Chủ Nhiệm
                  </th>
                  {filteredSubjects.map(sub => (
                    <th
                      key={sub.id}
                      className="p-2 font-bold text-center border-r border-slate-200 min-w-[105px]"
                      style={{ color: sub.color }}
                    >
                      <div className="truncate font-bold">{sub.shortName}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        ({getSubjectDisplayPeriod(sub)})
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11px]">
                {filteredClasses.map(cls => {
                  const gvcn = cls.homeroomTeacherId ? teacherMap.get(cls.homeroomTeacherId) : null;

                  return (
                    <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Class Name & Info */}
                      <td className="p-2.5 font-bold text-slate-900 bg-slate-50/90 sticky left-0 z-10 border-r border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-indigo-900">{cls.name}</span>
                          <span className="text-[10px] font-semibold text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                            {cls.studentCount || 0} HS
                          </span>
                        </div>
                      </td>

                      {/* GVCN info */}
                      <td className="p-2 border-r border-slate-200 text-slate-700">
                        {gvcn ? (
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 truncate text-[11px]">
                              {gvcn.name}
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono">
                              {gvcn.code}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">Chưa gán</span>
                        )}
                      </td>

                      {/* Subject Cells */}
                      {filteredSubjects.map(sub => {
                        const periods = sub.defaultPeriods[cls.grade] !== undefined ? sub.defaultPeriods[cls.grade] : 0;
                        const assignment = assignments.find(
                          a => a.classId === cls.id && a.subjectId === sub.id
                        );
                        const assignedTeacher = assignment ? teacherMap.get(assignment.teacherId) : null;
                        const lockedInfo = lockedMap.get(`${cls.id}_${sub.id}`);
                        const isLocked = !assignedTeacher && Boolean(lockedInfo);
                        const isHovered = hoveredCell?.classId === cls.id && hoveredCell?.subjectId === sub.id;

                        if (periods === 0) {
                          return (
                            <td
                              key={sub.id}
                              className="p-1.5 border-r border-slate-200 text-center bg-slate-100/60 text-slate-300 text-[10px] select-none"
                            >
                              —
                            </td>
                          );
                        }

                        return (
                          <td
                            key={sub.id}
                            onDragOver={e => handleDragOver(e, cls.id, sub.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={e => handleDrop(e, cls.id, sub.id)}
                            onClick={() => setQuickAssignCell({ classId: cls.id, subjectId: sub.id })}
                            className={`p-1.5 border-r border-slate-200 text-center transition-all cursor-pointer relative group ${
                              isHovered
                                ? 'bg-indigo-50 ring-2 ring-indigo-400 ring-inset'
                                : assignedTeacher
                                ? 'bg-white'
                                : isLocked
                                ? 'bg-slate-100/80 hover:bg-slate-200/80'
                                : 'bg-slate-50/40 hover:bg-indigo-50/50'
                            }`}
                          >
                            {assignedTeacher ? (
                              /* 1. ASSIGNED CELL */
                              <div className="p-1 rounded bg-indigo-50/80 border border-indigo-100 relative text-left">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-indigo-950 truncate text-[10px]">
                                    {assignedTeacher.name}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRemoveAssignment(cls.id, sub.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5 cursor-pointer"
                                    title="Hủy phân công"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between text-[9px] text-slate-500 mt-0.5">
                                  <span className="font-mono text-slate-600 font-medium">
                                    {assignedTeacher.code}
                                  </span>
                                  <span className="font-bold text-indigo-700 bg-white px-1 rounded-xs border border-indigo-100">
                                    {periods}t
                                  </span>
                                </div>
                              </div>
                            ) : isLocked ? (
                              /* 2. LOCKED / EXEMPT CELL */
                              <div className="h-9 p-1 rounded border border-dashed border-slate-300 bg-slate-100/90 flex flex-col justify-center items-center text-[9px] text-slate-500 relative group/locked">
                                <div className="flex items-center gap-1 font-semibold text-slate-700">
                                  <Lock className="w-2.5 h-2.5 text-amber-600" />
                                  <span className="truncate max-w-[75px]">
                                    {lockedInfo?.reason === 'Chưa dạy kỳ này / Phân công sau'
                                      ? 'Dạy sau'
                                      : lockedInfo?.reason || 'Đã khóa'}
                                  </span>
                                </div>
                                <span className="text-[8px] text-slate-400">
                                  ({periods}t)
                                </span>
                                
                                {/* Quick unlock button on hover */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleLockCell(cls.id, sub.id);
                                  }}
                                  className="absolute inset-0 bg-slate-800/80 text-white rounded opacity-0 group-hover/locked:opacity-100 flex items-center justify-center gap-1 transition-opacity text-[10px] font-bold cursor-pointer"
                                  title="Nhấp để mở khóa ô này"
                                >
                                  <Unlock className="w-3 h-3 text-amber-300" />
                                  <span>Mở khóa</span>
                                </button>
                              </div>
                            ) : (
                              /* 3. UNASSIGNED ACTIVE CELL */
                              <div className="h-9 border border-dashed border-slate-200 rounded flex items-center justify-center text-slate-300 group-hover:border-indigo-300 group-hover:text-indigo-400 transition-colors relative">
                                <UserPlus className="w-3.5 h-3.5" />
                                
                                {/* Quick Lock button on cell hover */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleLockCell(cls.id, sub.id, 'Môn không chọn');
                                  }}
                                  className="absolute top-0.5 right-0.5 p-0.5 rounded text-slate-300 hover:text-amber-700 hover:bg-amber-100 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  title="Khóa ô này (Môn không chọn / Phân công sau)"
                                >
                                  <Lock className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* QUICK ASSIGN & LOCK MODAL */}
      {quickAssignCell && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-4 border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <span>Phân Công Hoặc Khóa Ô</span>
                  {lockedMap.has(`${quickAssignCell.classId}_${quickAssignCell.subjectId}`) && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                      Đang Khóa
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Lớp: <span className="font-bold text-indigo-600">{classes.find(c => c.id === quickAssignCell.classId)?.name}</span> • 
                  Môn: <span className="font-bold text-slate-800">{subjects.find(s => s.id === quickAssignCell.subjectId)?.name}</span>
                </p>
              </div>
              <button
                onClick={() => setQuickAssignCell(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* LOCK CELL OPTIONS BAR */}
            <div className="mb-3 p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/80 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Trạng thái khóa ô (Chưa dạy / Không chọn):</span>
                </div>
                {lockedMap.has(`${quickAssignCell.classId}_${quickAssignCell.subjectId}`) && (
                  <button
                    onClick={() => {
                      onToggleLockCell(quickAssignCell.classId, quickAssignCell.subjectId);
                      setQuickAssignCell(null);
                    }}
                    className="px-2 py-0.5 bg-white border border-amber-300 text-amber-900 rounded font-bold hover:bg-amber-100 flex items-center gap-1 cursor-pointer shadow-2xs text-[11px]"
                  >
                    <Unlock className="w-3 h-3 text-emerald-600" />
                    <span>Mở khóa ô</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Môn không chọn (GDPT 2018)', reason: 'Môn không chọn' },
                  { label: 'Chưa dạy kỳ này (HĐTN, GDĐP)', reason: 'Chưa dạy kỳ này / Phân công sau' },
                  { label: 'Tạm khóa khác', reason: 'Tạm khóa' },
                ].map(opt => (
                  <button
                    key={opt.reason}
                    onClick={() => {
                      onToggleLockCell(quickAssignCell.classId, quickAssignCell.subjectId, opt.reason);
                      setQuickAssignCell(null);
                    }}
                    className="px-2 py-1 bg-white border border-amber-200 text-amber-950 rounded text-[11px] font-medium hover:bg-amber-100 hover:border-amber-400 transition-colors cursor-pointer"
                  >
                    🔒 {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* TEACHER LIST FOR ASSIGNMENT */}
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Hoặc Chọn Giáo Viên Để Phân Công Ngay:</span>
              <span className="text-[10px] text-slate-400 font-normal">
                (Gán GV sẽ tự động mở khóa ô)
              </span>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 flex-1">
              {teachers
                .filter(t => {
                  const sub = subjects.find(s => s.id === quickAssignCell.subjectId);
                  return t.primarySubjectId === quickAssignCell.subjectId || 
                    t.departmentId === sub?.departmentId ||
                    (t.secondarySubjectIds && t.secondarySubjectIds.includes(quickAssignCell.subjectId));
                })
                .map(t => {
                  const wl = workloadMap.get(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        onAssignTeacher(quickAssignCell.classId, quickAssignCell.subjectId, t.id);
                        setQuickAssignCell(null);
                      }}
                      className="w-full p-2 text-left rounded border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 flex items-center justify-between transition-all cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <span>{t.name}</span>
                          {t.campus && (
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded-xs font-semibold">
                              {t.campus}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {t.code} • {deptMap.get(t.departmentId)?.name}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-indigo-700">
                          {wl?.assignedPeriods || 0}/{wl?.targetPeriods || 17}t
                        </span>
                        <div className="text-[9px] font-bold text-slate-500">
                          Lệch: {wl?.balance && wl.balance >= 0 ? `+${wl.balance}` : wl?.balance || 0}
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
