import {
  Teacher,
  Assignment,
  ClassGroup,
  Subject,
  Department,
  WorkloadStats
} from '../types';
import { getTeacherTotalDutyReduction } from './workloadCalculator';

export interface AutoAssignOptions {
  keepExisting: boolean; // Giữ nguyên các phân công đã có
  targetGrade?: string; // Khối áp dụng (tất cả hoặc chỉ 10, 11, 12...)
  balanceThreshold: number; // Mức cân bằng tối ưu (mặc định 1-2 tiết)
  prioritizeHomeroom: boolean; // Ưu tiên gán lớp cho GVCN dạy môn của mình tại lớp đó
}

export function autoDistributeAssignments(
  teachers: Teacher[],
  classes: ClassGroup[],
  subjects: Subject[],
  currentAssignments: Assignment[],
  options: AutoAssignOptions
): { assignments: Assignment[]; logs: string[] } {
  const logs: string[] = [];
  const resultAssignments: Assignment[] = options.keepExisting
    ? [...currentAssignments]
    : [];

  const targetClasses = options.targetGrade && options.targetGrade !== 'ALL'
    ? classes.filter(c => c.grade === options.targetGrade)
    : classes;

  // Calculate remaining target periods for each teacher
  const teacherCapacities = new Map<string, { current: number; max: number; teacher: Teacher }>();

  teachers.forEach(t => {
    const dutyRed = getTeacherTotalDutyReduction(t);
    const customRed = t.customReductionPeriods || 0;
    const isHr = classes.some(c => c.homeroomTeacherId === t.id);
    const hrRed = isHr ? 3 : 0;
    const target = Math.max(0, t.baseStandardPeriods - (dutyRed + customRed + hrRed));

    // Calculate current assigned in resultAssignments
    const assigned = resultAssignments
      .filter(a => a.teacherId === t.id)
      .reduce((sum, a) => sum + (a.periodsPerWeek || 0), 0);

    teacherCapacities.set(t.id, {
      current: assigned,
      max: target,
      teacher: t,
    });
  });

  // Group subjects by requirement
  targetClasses.forEach(cls => {
    subjects.forEach(sub => {
      const periods = sub.defaultPeriods[cls.grade] || 0;
      if (periods <= 0) return;

      // Filter elective by track if applicable
      if (sub.isElective) {
        if (cls.track === 'KHTN' && ['sub-dia', 'sub-gdktpl'].includes(sub.id)) return;
        if (cls.track === 'KHXH' && ['sub-li', 'sub-hoa', 'sub-sinh'].includes(sub.id)) return;
      }

      // Check if already assigned
      const existing = resultAssignments.find(a => a.classId === cls.id && a.subjectId === sub.id);
      if (existing && options.keepExisting) {
        return; // Keep existing
      }

      // Find candidates who can teach this subject
      const candidates = teachers.filter(t => {
        const canTeach = t.primarySubjectId === sub.id || (t.secondarySubjectIds && t.secondarySubjectIds.includes(sub.id));
        if (!canTeach && sub.id === 'sub-hdtn') return true; // HĐTN anyone can teach
        return canTeach;
      });

      if (candidates.length === 0) {
        logs.push(`Không tìm thấy giáo viên chuyên môn cho môn ${sub.name} lớp ${cls.name}`);
        return;
      }

      // If prioritizeHomeroom and homeroom teacher teaches this subject
      let chosenTeacher: Teacher | null = null;
      if (options.prioritizeHomeroom && cls.homeroomTeacherId) {
        const hrTeacher = candidates.find(t => t.id === cls.homeroomTeacherId);
        if (hrTeacher) {
          const cap = teacherCapacities.get(hrTeacher.id);
          if (cap && cap.current + periods <= cap.max + 3) {
            chosenTeacher = hrTeacher;
          }
        }
      }

      // Otherwise pick candidate with highest remaining capacity (least assigned relative to target)
      if (!chosenTeacher) {
        const sortedCandidates = [...candidates].sort((a, b) => {
          const capA = teacherCapacities.get(a.id)!;
          const capB = teacherCapacities.get(b.id)!;
          const remainingA = capA.max - capA.current;
          const remainingB = capB.max - capB.current;
          return remainingB - remainingA; // Most remaining first
        });

        chosenTeacher = sortedCandidates[0];
      }

      if (chosenTeacher) {
        // Remove old if replacing
        const existIdx = resultAssignments.findIndex(a => a.classId === cls.id && a.subjectId === sub.id);
        if (existIdx >= 0) {
          resultAssignments.splice(existIdx, 1);
        }

        resultAssignments.push({
          id: `auto-${cls.id}-${sub.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          classId: cls.id,
          subjectId: sub.id,
          teacherId: chosenTeacher.id,
          periodsPerWeek: periods,
        });

        // Update capacity
        const cap = teacherCapacities.get(chosenTeacher.id)!;
        cap.current += periods;
      }
    });
  });

  logs.push(`Đã hoàn thành phân công tự động cho ${targetClasses.length} lớp học.`);
  return { assignments: resultAssignments, logs };
}
