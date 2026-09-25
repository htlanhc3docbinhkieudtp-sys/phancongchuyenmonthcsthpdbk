import {
  Teacher,
  Assignment,
  ClassGroup,
  Department,
  Subject,
  WorkloadStats,
  ConflictIssue,
  LockedCell,
  DutyType,
  ConcurrentDuty
} from '../types';
import type { TeacherActualWorkload } from './actualTeachingHoursHelper';

export interface DutyPreset {
  type: DutyType;
  name: string;
  defaultReduction: number;
  shortLabel: string;
  badgeBg: string;
  badgeColor: string;
  description: string;
}

export const STANDARD_DUTIES_PRESETS: DutyPreset[] = [
  {
    type: 'HieuTruong',
    name: 'Hiệu trưởng',
    defaultReduction: 0,
    shortLabel: 'Hiệu trưởng',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeColor: 'text-amber-900',
    description: 'Định mức 2 tiết/tuần theo TT 28/2009 & TT 15/2017'
  },
  {
    type: 'PhoHieuTruong',
    name: 'Phó Hiệu trưởng',
    defaultReduction: 0,
    shortLabel: 'Phó Hiệu trưởng',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeColor: 'text-amber-900',
    description: 'Định mức 4 tiết/tuần theo TT 28/2009 & TT 15/2017'
  },
  {
    type: 'ToTruong',
    name: 'Tổ trưởng chuyên môn',
    defaultReduction: 3,
    shortLabel: 'Tổ trưởng',
    badgeBg: 'bg-indigo-50 border-indigo-200',
    badgeColor: 'text-indigo-800',
    description: 'Giảm 3 tiết/tuần theo TT 28/2009 & TT 15/2020'
  },
  {
    type: 'ToPho',
    name: 'Tổ phó chuyên môn',
    defaultReduction: 1,
    shortLabel: 'Tổ phó',
    badgeBg: 'bg-blue-50 border-blue-200',
    badgeColor: 'text-blue-800',
    description: 'Giảm 1 tiết/tuần theo TT 28/2009 & TT 15/2020'
  },
  {
    type: 'GiaoVu',
    name: 'Giáo vụ',
    defaultReduction: 4,
    shortLabel: 'Giáo vụ',
    badgeBg: 'bg-cyan-50 border-cyan-200',
    badgeColor: 'text-cyan-800',
    description: 'Kiêm nhiệm công tác giáo vụ (giảm 4 tiết/tuần)'
  },
  {
    type: 'BiThuDoan',
    name: 'Bí thư Đoàn trường',
    defaultReduction: 12,
    shortLabel: 'BT Đoàn',
    badgeBg: 'bg-rose-50 border-rose-200',
    badgeColor: 'text-rose-800',
    description: 'Giảm 12 tiết/tuần theo Thông tư 05/2025'
  },
  {
    type: 'PhoBiThuDoan',
    name: 'Phó Bí thư Đoàn trường',
    defaultReduction: 6,
    shortLabel: 'PBT Đoàn',
    badgeBg: 'bg-pink-50 border-pink-200',
    badgeColor: 'text-pink-800',
    description: 'Giảm 6 tiết/tuần theo Thông tư 05/2025'
  },
  {
    type: 'PhoCap',
    name: 'Phổ cập giáo dục',
    defaultReduction: 4,
    shortLabel: 'Phổ cập',
    badgeBg: 'bg-teal-50 border-teal-200',
    badgeColor: 'text-teal-800',
    description: 'Phụ trách công tác phổ cập giáo dục (giảm 4 tiết/tuần theo TT 05/2025)'
  },
  {
    type: 'ThuKyHoiDong',
    name: 'Thư ký Hội đồng',
    defaultReduction: 2,
    shortLabel: 'Thư ký HĐ',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeColor: 'text-amber-800',
    description: 'Thư ký hội đồng sư phạm nhà trường (giảm 2 tiết/tuần)'
  },
  {
    type: 'TongPhuTrachDoi',
    name: 'Tổng phụ trách Đội',
    defaultReduction: 13,
    shortLabel: 'TPT Đội',
    badgeBg: 'bg-orange-50 border-orange-200',
    badgeColor: 'text-orange-800',
    description: 'Tổng phụ trách Đội TNTP Hồ Chí Minh (giảm 13 tiết/tuần theo TT 05/2025)'
  },
  {
    type: 'ConNho',
    name: 'Nuôi con nhỏ (<36 tháng)',
    defaultReduction: 3,
    shortLabel: 'Con nhỏ',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeColor: 'text-emerald-800',
    description: 'Nữ giáo viên nuôi con dưới 36 tháng tuổi (giảm 3 tiết THPT / 4 tiết THCS)'
  },
  {
    type: 'ChuTichCongDoan',
    name: 'Chủ tịch Công đoàn',
    defaultReduction: 3,
    shortLabel: 'Chủ tịch CĐ',
    badgeBg: 'bg-purple-50 border-purple-200',
    badgeColor: 'text-purple-800',
    description: 'Chủ tịch công đoàn cơ sở (giảm 3 tiết/tuần)'
  },
  {
    type: 'BanThanhTra',
    name: 'Ban Thanh tra nhân dân',
    defaultReduction: 1,
    shortLabel: 'Ban TTND',
    badgeBg: 'bg-slate-100 border-slate-300',
    badgeColor: 'text-slate-800',
    description: 'Thành viên Ban thanh tra nhân dân (giảm 1 tiết/tuần)'
  }
];

export function getRoleReductionPeriods(role: Teacher['role']): number {
  switch (role) {
    case 'ToTruong':
      return 3;
    case 'ToPho':
      return 1;
    case 'GiaoVu':
      return 4;
    case 'BiThuDoan':
      return 12;
    case 'PhoBiThuDoan':
      return 6;
    case 'PhoCap':
      return 4;
    case 'ThuKyHoiDong':
      return 2;
    case 'TongPhuTrachDoi':
      return 13;
    case 'ConNho':
      return 3;
    case 'ChuTichCongDoan':
      return 3;
    case 'BanThanhTra':
      return 1;
    default:
      return 0;
  }
}

/**
 * Tính tổng số tiết giảm trừ từ các chức vụ / kiêm nhiệm của giáo viên
 */
export function getTeacherTotalDutyReduction(teacher: Teacher): number {
  if (teacher.duties && teacher.duties.length > 0) {
    return teacher.duties.reduce((sum, d) => sum + (d.reductionPeriods || 0), 0);
  }
  return getRoleReductionPeriods(teacher.role);
}

/**
 * Trả về danh sách nhãn tóm tắt các kiêm nhiệm của giáo viên
 */
export function getTeacherDutiesList(teacher: Teacher): { name: string; shortLabel: string; reduction: number; badgeBg: string; badgeColor: string }[] {
  if (teacher.duties && teacher.duties.length > 0) {
    return teacher.duties.map(d => {
      const preset = STANDARD_DUTIES_PRESETS.find(p => p.type === d.type);
      return {
        name: d.name,
        shortLabel: preset?.shortLabel || d.name,
        reduction: d.reductionPeriods,
        badgeBg: preset?.badgeBg || 'bg-slate-50 border-slate-200',
        badgeColor: preset?.badgeColor || 'text-slate-800',
      };
    });
  }

  if (teacher.role && teacher.role !== 'GVBM') {
    const preset = STANDARD_DUTIES_PRESETS.find(p => p.type === teacher.role);
    if (preset) {
      return [{
        name: preset.name,
        shortLabel: preset.shortLabel,
        reduction: preset.defaultReduction,
        badgeBg: preset.badgeBg,
        badgeColor: preset.badgeColor,
      }];
    }
  }

  return [];
}

export function calculateTeacherWorkloads(
  teachers: Teacher[],
  assignments: Assignment[],
  classes: ClassGroup[],
  departments: Department[],
  subjects: Subject[],
  homeroomReduction: number = 4
): WorkloadStats[] {
  const deptMap = new Map(departments.map(d => [d.id, d.name]));
  const classMap = new Map(classes.map(c => [c.id, c.name]));
  const subMap = new Map(subjects.map(s => [s.id, s.name]));

  // Check homeroom assignments
  const homeroomMap = new Map<string, string>(); // teacherId -> className
  classes.forEach(c => {
    if (c.homeroomTeacherId) {
      homeroomMap.set(c.homeroomTeacherId, c.name);
    }
  });

  return teachers.map(teacher => {
    const isHomeroom = homeroomMap.has(teacher.id);
    const homeroomClass = homeroomMap.get(teacher.id);
    
    let baseStandard = teacher.baseStandardPeriods;
    const isHT =
      teacher.id === 'tch-bgh-1' ||
      teacher.name === 'Lê Thanh Cường' ||
      teacher.code === 'Cường.LT (HT)' ||
      (teacher.role === 'HieuTruong' && teacher.name === 'Lê Thanh Cường');
    const isPHT =
      !isHT &&
      (teacher.id === 'tch-bgh-2' ||
        teacher.id === 'tch-bgh-3' ||
        teacher.id === 'tch-bgh-4' ||
        ['Nguyễn Minh Trí', 'Phan Thanh Thảo', 'Nguyễn Thanh Tòng'].includes(teacher.name) ||
        teacher.code === 'Trí.NM (PHT)' ||
        teacher.code === 'Thảo.PT (PHT)' ||
        teacher.code === 'Tòng.NT (PHT)');

    const isLeader = isHT || isPHT;

    const dutyReduction = isLeader ? 0 : getTeacherTotalDutyReduction(teacher);
    const customReduction = isLeader ? 0 : (teacher.customReductionPeriods || 0);
    const hrReduction = isLeader ? 0 : (isHomeroom ? homeroomReduction : 0);
    const totalReduction = dutyReduction + customReduction + hrReduction;

    const teacherAssignments = assignments.filter(a => a.teacherId === teacher.id);
    const assignedPeriods = teacherAssignments.reduce((sum, a) => sum + (a.periodsPerWeek || 0), 0);

    if (isHT) {
      baseStandard = 2;
    } else if (isPHT) {
      baseStandard = 4;
    } else if (teacher.id === 'tch-ls-12' || teacher.name === 'Nguyễn Thị Lý') {
      baseStandard = 2;
    } else if (!baseStandard) {
      baseStandard = teacher.campus === 'THCSDBK' || teacher.campus === 'THCSTK' ? 19 : 17;
    }

    const targetPeriods = Math.max(0, baseStandard - totalReduction);
    const balance = assignedPeriods - targetPeriods;

    const assignedClasses = teacherAssignments.map(a => ({
      assignmentId: a.id,
      className: classMap.get(a.classId) || 'Lớp ?',
      subjectName: subMap.get(a.subjectId) || 'Môn ?',
      periods: a.periodsPerWeek || 0,
    }));

    return {
      teacherId: teacher.id,
      teacherName: teacher.name,
      departmentName: deptMap.get(teacher.departmentId) || 'Chưa xếp tổ',
      assignedPeriods,
      reductionPeriods: totalReduction,
      targetPeriods,
      balance,
      homeroomClass,
      assignedClasses,
    };
  });
}

/**
 * Chuyển đổi bảng thống kê tiết thực dạy (TeacherActualWorkload) sang WorkloadStats chuẩn
 * để đồng bộ 100% với Sổ thực dạy và Bảng thống kê tiết HK1 & HK2
 */
export function convertActualWorkloadsToStats(
  actualWorkloads: TeacherActualWorkload[],
  mode: 'WEEKLY' | 'SEMESTER' = 'SEMESTER',
  totalWeeksInSemester: number = 18
): WorkloadStats[] {
  return actualWorkloads.map(aw => {
    const isSemester = mode === 'SEMESTER';
    const assignedPeriods = isSemester
      ? Math.round((aw.semesterTotalTeaching / (totalWeeksInSemester || 18)) * 10) / 10
      : aw.teachingPeriods;
    const reductionPeriods = aw.reductionPeriods;
    const targetPeriods = Math.max(0, aw.standardPeriods - reductionPeriods);
    const balance = isSemester
      ? Math.round((aw.semesterBalance / (totalWeeksInSemester || 18)) * 10) / 10
      : aw.weeklyBalance;

    const assignedClasses = aw.rows.map(r => ({
      assignmentId: `act-${aw.teacherId}-${r.subject}`,
      className: r.classes,
      subjectName: r.subject,
      periods: r.periods,
    }));

    return {
      teacherId: aw.teacherId,
      teacherName: aw.teacherName,
      departmentName: aw.departmentName,
      assignedPeriods,
      reductionPeriods,
      targetPeriods,
      balance,
      assignedClasses,
    };
  });
}

export function auditAssignmentConflicts(
  teachers: Teacher[],
  assignments: Assignment[],
  classes: ClassGroup[],
  subjects: Subject[],
  departments: Department[],
  workloads: WorkloadStats[],
  lockedCells: LockedCell[] = [],
  actualWorkloads?: TeacherActualWorkload[],
  semesterName: 'HK1' | 'HK2' = 'HK1',
  currentWeek: number = 1
): ConflictIssue[] {
  const issues: ConflictIssue[] = [];
  const subMap = new Map(subjects.map(s => [s.id, s]));
  const teacherMap = new Map(teachers.map(t => [t.id, t]));
  const lockedSet = new Set(lockedCells.map(lc => `${lc.classId}_${lc.subjectId}`));

  // 1. Check unassigned subjects in THPT classes
  classes.filter(c => c.level === 'THPT').forEach(cls => {
    subjects.forEach(sub => {
      const defaultPeriod = sub.defaultPeriods[cls.grade] || 0;
      if (defaultPeriod > 0) {
        // If cell is locked by user (môn không chọn / phân công sau), skip check
        if (lockedSet.has(`${cls.id}_${sub.id}`)) {
          return;
        }

        // If elective, check if it applies to track
        if (sub.isElective) {
          if (cls.track === 'KHTN' && ['sub-dia', 'sub-gdktpl'].includes(sub.id)) return;
          if (cls.track === 'KHXH' && ['sub-li', 'sub-hoa', 'sub-sinh'].includes(sub.id)) return;
        }

        const assignment = assignments.find(a => a.classId === cls.id && a.subjectId === sub.id);
        if (!assignment || !assignment.teacherId) {
          issues.push({
            id: `unassigned-${cls.id}-${sub.id}`,
            type: 'UNASSIGNED',
            severity: 'error',
            title: `Chưa phân công: ${sub.shortName} - ${cls.name}`,
            description: `Lớp ${cls.name} (Khối ${cls.grade}) chưa có giáo viên dạy môn ${sub.name} (${defaultPeriod} tiết/tuần).`,
            classId: cls.id,
            subjectId: sub.id,
          });
        }
      }
    });
  });

  // 2. Check Overloaded & Underloaded teachers
  // Nếu có dữ liệu Bảng Thống Kê Tiết Thực Dạy (Thời Khóa Biểu & Phân phối chương trình HK1 & HK2)
  // Ưu tiên đối soát trực tiếp theo số liệu thực tế này để đảm bảo độ chính xác 100%
  if (actualWorkloads && actualWorkloads.length > 0) {
    const totalWeeksInSemester = semesterName === 'HK2' ? 17 : 18;

    // Phân nhóm và sắp xếp từ lớn tới nhỏ theo yêu cầu
    const sortedOverloads = actualWorkloads
      .filter(aw => {
        const avgSemesterBalance = Math.round((aw.semesterBalance / totalWeeksInSemester) * 10) / 10;
        return avgSemesterBalance > 3;
      })
      .sort((a, b) => b.semesterBalance - a.semesterBalance); // Thừa nhiều nhất xếp trên cùng

    const sortedUnderloads = actualWorkloads
      .filter(aw => {
        const avgSemesterBalance = Math.round((aw.semesterBalance / totalWeeksInSemester) * 10) / 10;
        return avgSemesterBalance < -3 && aw.standardPeriods > 4;
      })
      .sort((a, b) => a.semesterBalance - b.semesterBalance); // Thiếu nhiều nhất (-217 trước -108) xếp trên cùng

    sortedOverloads.forEach(aw => {
      const avgSemesterBalance = Math.round((aw.semesterBalance / totalWeeksInSemester) * 10) / 10;
      issues.push({
        id: `overload-${aw.teacherId}`,
        type: 'OVERLOAD',
        severity: 'warning',
        title: `Vượt định mức ${semesterName}: ${aw.teacherName} (+${aw.semesterBalance}t)`,
        description: `Cả ${semesterName} tính ${aw.semesterTotalPeriods} tiết / yêu cầu ${aw.semesterRequiredPeriods} tiết (Vượt +${aw.semesterBalance} tiết cả kỳ, TB vượt +${avgSemesterBalance} tiết/tuần). Thực dạy Tuần ${currentWeek}: ${aw.teachingPeriods} tiết + giảm ${aw.reductionPeriods} tiết = ${aw.totalPeriods} tiết / định mức ${aw.standardPeriods} tiết.`,
        teacherId: aw.teacherId,
      });
    });

    sortedUnderloads.forEach(aw => {
      const avgSemesterBalance = Math.round((aw.semesterBalance / totalWeeksInSemester) * 10) / 10;
      issues.push({
        id: `underload-${aw.teacherId}`,
        type: 'UNDERLOAD',
        severity: 'warning',
        title: `Thiếu định mức ${semesterName}: ${aw.teacherName} (${aw.semesterBalance}t)`,
        description: `Cả ${semesterName} tính ${aw.semesterTotalPeriods} tiết / yêu cầu ${aw.semesterRequiredPeriods} tiết (Thiếu ${Math.abs(aw.semesterBalance)} tiết cả kỳ, TB thiếu ${Math.abs(avgSemesterBalance)} tiết/tuần).`,
        teacherId: aw.teacherId,
      });
    });

    // Thông tin bổ sung (dạy dồn tuần hoặc chưa phân công)
    actualWorkloads.forEach(aw => {
      const avgSemesterBalance = Math.round((aw.semesterBalance / totalWeeksInSemester) * 10) / 10;
      if (aw.weeklyBalance > 4 && avgSemesterBalance <= 3) {
        // Giáo viên dạy dồn tuần theo phân phối chương trình đặc thù của THCS (ví dụ Lịch sử, KHTN, Công nghệ)
        issues.push({
          id: `weekly-peak-${aw.teacherId}`,
          type: 'OVERLOAD',
          severity: 'info',
          title: `Dạy dồn Tuần ${currentWeek}: ${aw.teacherName}`,
          description: `Tuần ${currentWeek} đang dạy ${aw.teachingPeriods} tiết + giảm ${aw.reductionPeriods} tiết = ${aw.totalPeriods} tiết / định mức ${aw.standardPeriods} tiết (Dôi +${aw.weeklyBalance} tiết tuần này theo tiến độ phân môn). Trung bình cả ${semesterName} chênh lệch: ${aw.semesterBalance >= 0 ? '+' : ''}${avgSemesterBalance} tiết/tuần.`,
          teacherId: aw.teacherId,
        });
      } else if (aw.semesterTotalTeaching === 0 && aw.standardPeriods > 4 && !sortedUnderloads.some(u => u.teacherId === aw.teacherId)) {
        issues.push({
          id: `zero-${aw.teacherId}`,
          type: 'UNDERLOAD',
          severity: 'info',
          title: `Chưa có tiết dạy trong ${semesterName}: ${aw.teacherName}`,
          description: `Giáo viên chưa được phân công tiết dạy trong TKB ${semesterName} (Định mức yêu cầu: ${aw.standardPeriods} tiết/tuần).`,
          teacherId: aw.teacherId,
        });
      }
    });
  } else {
    // Fallback: Sử dụng bảng phân công cơ bản nếu chưa có dữ liệu thời khóa biểu thực dạy
    workloads.forEach(w => {
      if (w.balance > 3) {
        issues.push({
          id: `overload-${w.teacherId}`,
          type: 'OVERLOAD',
          severity: 'warning',
          title: `Vượt định mức: ${w.teacherName}`,
          description: `Giáo viên đang dạy ${w.assignedPeriods} tiết (Vượt +${w.balance} tiết so với định mức yêu cầu ${w.targetPeriods} tiết sau giảm trừ).`,
          teacherId: w.teacherId,
        });
      } else if (w.assignedPeriods === 0) {
        issues.push({
          id: `zero-${w.teacherId}`,
          type: 'UNDERLOAD',
          severity: 'info',
          title: `Chưa phân công tiết: ${w.teacherName}`,
          description: `Giáo viên chưa được phân công lớp nào (Định mức yêu cầu: ${w.targetPeriods} tiết).`,
          teacherId: w.teacherId,
        });
      } else if (w.balance < -4) {
        issues.push({
          id: `underload-${w.teacherId}`,
          type: 'UNDERLOAD',
          severity: 'info',
          title: `Thiếu định mức: ${w.teacherName}`,
          description: `Giáo viên đang dạy ${w.assignedPeriods} tiết (Thiếu ${Math.abs(w.balance)} tiết so với định mức yêu cầu ${w.targetPeriods} tiết).`,
          teacherId: w.teacherId,
        });
      }
    });
  }

  // 3. Check Homeroom unassigned
  classes.forEach(c => {
    if (!c.homeroomTeacherId) {
      issues.push({
        id: `no-hr-${c.id}`,
        type: 'HOMEROOM_UNASSIGNED',
        severity: 'warning',
        title: `Chưa có GVCN: Lớp ${c.name}`,
        description: `Lớp ${c.name} hiện chưa được chỉ định Giáo viên chủ nhiệm.`,
        classId: c.id,
      });
    }
  });

  // 4. Check Subject specialization mismatch
  assignments.forEach(as => {
    const teacher = teacherMap.get(as.teacherId);
    const sub = subMap.get(as.subjectId);
    if (teacher && sub) {
      const allowedSubs = [teacher.primarySubjectId, ...(teacher.secondarySubjectIds || [])];
      // Special allowance: HĐTN-HN can be taught by homeroom teachers or multiple subjects
      if (!allowedSubs.includes(sub.id) && sub.id !== 'sub-hdtn' && sub.id !== 'sub-hdtn-cd' && sub.id !== 'sub-hdtn-shl' && sub.id !== 'sub-gddp') {
        issues.push({
          id: `mismatch-${as.id}`,
          type: 'WRONG_SUBJECT',
          severity: 'info',
          title: `Dạy chéo môn: ${teacher.name}`,
          description: `Giáo viên chuyên môn ${subMap.get(teacher.primarySubjectId)?.name || 'khác'} đang được phân công dạy môn ${sub.name}.`,
          teacherId: teacher.id,
          subjectId: sub.id,
        });
      }
    }
  });

  return issues;
}
