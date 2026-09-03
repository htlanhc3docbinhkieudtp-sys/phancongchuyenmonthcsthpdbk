import {
  TimetableSlot,
  Assignment,
  WeeklySchedule,
  WeeklyAssignmentItem,
  ClassGroup,
  Subject,
  Teacher
} from '../types';
import * as XLSX from 'xlsx';

export interface ReconciliationRow {
  key: string;
  classId: string;
  className: string;
  campus: string;
  grade: string;
  subjectId: string;
  subjectName: string;
  timetablePeriods: number;
  timetableTeacherId: string;
  timetableTeacherName: string;
  timetableTeacherCode: string;
  assignmentPeriods: number;
  assignmentTeacherId: string;
  assignmentTeacherName: string;
  assignmentTeacherCode: string;
  status: 'MATCHED' | 'SUPPLEMENTED' | 'MISMATCH' | 'NOT_IN_TKB';
  note?: string;
}

export interface TimetableReconciliationReport {
  totalTimetableSlots: number;
  totalClasses: number;
  totalAssignmentsInWeek: number;
  matchedCount: number;
  supplementedCount: number;
  mismatchCount: number;
  rows: ReconciliationRow[];
}

/**
 * Extract comprehensive assignments and weekly assignment items directly from timetable slots.
 * Every valid slot (with classId, subjectId, teacherId) is aggregated into a weekly teaching item.
 */
export function extractAssignmentsFromTimetableSlots(
  slots: TimetableSlot[],
  classes: ClassGroup[],
  subjects: Subject[],
  teachers: Teacher[]
): {
  weeklyAssignments: WeeklyAssignmentItem[];
  baseAssignments: Assignment[];
  totalValidSlots: number;
} {
  const teacherMap = new Map(teachers.map(t => [t.id, t]));
  const classMap = new Map(classes.map(c => [c.id, c]));
  const subjectMap = new Map(subjects.map(s => [s.id, s]));

  // Valid teaching slots
  const validSlots = slots.filter(s => s.classId && s.subjectId && s.teacherId);

  // Group by (classId, subjectId)
  const groupMap = new Map<
    string,
    {
      classId: string;
      subjectId: string;
      periods: number;
      teachers: Map<string, number>;
    }
  >();

  validSlots.forEach(slot => {
    const key = `${slot.classId}_${slot.subjectId}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        classId: slot.classId,
        subjectId: slot.subjectId,
        periods: 0,
        teachers: new Map<string, number>()
      });
    }
    const item = groupMap.get(key)!;
    item.periods++;
    if (slot.teacherId) {
      item.teachers.set(slot.teacherId, (item.teachers.get(slot.teacherId) || 0) + 1);
    }
  });

  const weeklyAssignments: WeeklyAssignmentItem[] = [];
  const baseAssignments: Assignment[] = [];

  let idx = 1;
  for (const [key, item] of groupMap.entries()) {
    // Pick the teacher with the most slots in this class & subject
    const topTeacher = [...item.teachers.entries()].sort((a, b) => b[1] - a[1])[0];
    const teacherId = topTeacher ? topTeacher[0] : '';
    const teacher = teacherMap.get(teacherId);

    weeklyAssignments.push({
      classId: item.classId,
      subjectId: item.subjectId,
      teacherId: teacherId,
      periods: item.periods,
      note: teacher ? `${teacher.code} (TKB Tuần 1)` : ''
    });

    baseAssignments.push({
      id: `as-tkb-${item.classId}-${item.subjectId}`,
      classId: item.classId,
      subjectId: item.subjectId,
      teacherId: teacherId,
      periodsPerWeek: item.periods,
      note: 'Bổ sung từ TKB Tuần 1'
    });
    idx++;
  }

  return {
    weeklyAssignments,
    baseAssignments,
    totalValidSlots: validSlots.length
  };
}

/**
 * Reconcile timetable slots against current weekly assignments / base assignments
 */
export function reconcileTimetableWithWeeklySchedule(
  slots: TimetableSlot[],
  currentWeeklySchedule: WeeklySchedule | undefined,
  baseAssignments: Assignment[],
  classes: ClassGroup[],
  subjects: Subject[],
  teachers: Teacher[]
): TimetableReconciliationReport {
  const teacherMap = new Map(teachers.map(t => [t.id, t]));
  const classMap = new Map(classes.map(c => [c.id, c]));
  const subjectMap = new Map(subjects.map(s => [s.id, s]));

  // 1. Group timetable slots by classId_subjectId
  const validSlots = slots.filter(s => s.classId && s.subjectId && s.teacherId);
  const tkbMap = new Map<
    string,
    {
      classId: string;
      subjectId: string;
      periods: number;
      teacherId: string;
      teacherName: string;
      teacherCode: string;
    }
  >();

  validSlots.forEach(s => {
    const key = `${s.classId}_${s.subjectId}`;
    if (!tkbMap.has(key)) {
      tkbMap.set(key, {
        classId: s.classId,
        subjectId: s.subjectId,
        periods: 0,
        teacherId: s.teacherId || '',
        teacherName: s.teacherName || '',
        teacherCode: s.teacherCode || ''
      });
    }
    const item = tkbMap.get(key)!;
    item.periods++;
    if (s.teacherId && !item.teacherId) {
      item.teacherId = s.teacherId;
      item.teacherName = s.teacherName || '';
      item.teacherCode = s.teacherCode || '';
    }
  });

  // 2. Map current weekly assignments
  const currentAssMap = new Map<string, WeeklyAssignmentItem>();
  if (currentWeeklySchedule && currentWeeklySchedule.assignments) {
    currentWeeklySchedule.assignments.forEach(a => {
      currentAssMap.set(`${a.classId}_${a.subjectId}`, a);
    });
  }

  // 3. Map base assignments
  const baseAssMap = new Map<string, Assignment>();
  baseAssignments.forEach(a => {
    baseAssMap.set(`${a.classId}_${a.subjectId}`, a);
  });

  // 4. Build reconciliation rows
  const allKeys = new Set<string>([...tkbMap.keys(), ...currentAssMap.keys()]);
  const rows: ReconciliationRow[] = [];

  let matchedCount = 0;
  let supplementedCount = 0;
  let mismatchCount = 0;

  for (const key of allKeys) {
    const tkb = tkbMap.get(key);
    const curr = currentAssMap.get(key);
    const base = baseAssMap.get(key);

    const [classId, subjectId] = key.split('_');
    const cls = classMap.get(classId);
    const sub = subjectMap.get(subjectId);

    const tkbTeacher = tkb ? teacherMap.get(tkb.teacherId) : undefined;
    const currTeacherId = curr?.teacherId || base?.teacherId || '';
    const currTeacher = teacherMap.get(currTeacherId);
    const currPeriods = curr ? curr.periods : (base?.periodsPerWeek || 0);

    const tkbPeriods = tkb ? tkb.periods : 0;

    let status: ReconciliationRow['status'] = 'MATCHED';
    let note = '';

    if (!tkb) {
      status = 'NOT_IN_TKB';
      note = 'Có trong phân công nhưng không xếp tiết TKB Tuần 1';
      mismatchCount++;
    } else if (!currTeacherId || currPeriods === 0) {
      status = 'SUPPLEMENTED';
      note = 'Đã bổ sung từ Thời khóa biểu Tuần 1';
      supplementedCount++;
    } else if (
      currTeacherId === tkb.teacherId &&
      currPeriods === tkbPeriods
    ) {
      status = 'MATCHED';
      note = 'Khớp hoàn toàn giữa TKB và Phân công';
      matchedCount++;
    } else {
      status = 'MISMATCH';
      if (currTeacherId !== tkb.teacherId && currPeriods !== tkbPeriods) {
        note = `Lệch cả GV (${currTeacher?.code || 'Trống'} vs ${tkbTeacher?.code || tkb.teacherCode}) và tiết (${currPeriods}t vs ${tkbPeriods}t)`;
      } else if (currTeacherId !== tkb.teacherId) {
        note = `Khác GV: PC (${currTeacher?.code || 'Trống'}) vs TKB (${tkbTeacher?.code || tkb.teacherCode})`;
      } else {
        note = `Lệch số tiết: PC (${currPeriods}t) vs TKB (${tkbPeriods}t)`;
      }
      mismatchCount++;
    }

    rows.push({
      key,
      classId,
      className: cls?.name || classId,
      campus: cls?.campus || (cls?.level === 'THPT' ? 'THPT' : ''),
      grade: cls?.grade || '',
      subjectId,
      subjectName: sub?.name || (subjectId === 'sub-shl' ? 'Sinh hoạt lớp' : subjectId),
      timetablePeriods: tkbPeriods,
      timetableTeacherId: tkb?.teacherId || '',
      timetableTeacherName: tkbTeacher?.name || tkb?.teacherName || '',
      timetableTeacherCode: tkbTeacher?.code || tkb?.teacherCode || '',
      assignmentPeriods: currPeriods,
      assignmentTeacherId: currTeacherId,
      assignmentTeacherName: currTeacher?.name || '',
      assignmentTeacherCode: currTeacher?.code || '',
      status,
      note
    });
  }

  // Sort rows logically: Grade -> ClassName -> SubjectName
  rows.sort((a, b) => {
    const gradeA = parseInt(a.grade, 10) || 0;
    const gradeB = parseInt(b.grade, 10) || 0;
    if (gradeA !== gradeB) return gradeA - gradeB;
    if (a.className !== b.className) return a.className.localeCompare(b.className);
    return a.subjectName.localeCompare(b.subjectName);
  });

  return {
    totalTimetableSlots: validSlots.length,
    totalClasses: new Set(validSlots.map(s => s.classId)).size,
    totalAssignmentsInWeek: currentWeeklySchedule?.assignments?.length || 0,
    matchedCount,
    supplementedCount,
    mismatchCount,
    rows
  };
}

/**
 * Merge timetable assignments into a WeeklySchedule for Week 1.
 * Ensures that all classes and all subjects present on the timetable are filled.
 */
export function supplementWeek1ScheduleFromTimetable(
  existingSchedule: WeeklySchedule | undefined,
  timetableSlots: TimetableSlot[],
  classes: ClassGroup[],
  subjects: Subject[],
  teachers: Teacher[]
): WeeklySchedule {
  const { weeklyAssignments } = extractAssignmentsFromTimetableSlots(
    timetableSlots,
    classes,
    subjects,
    teachers
  );

  const mergedMap = new Map<string, WeeklyAssignmentItem>();

  // If there is an existing schedule, keep any specific notes
  if (existingSchedule && existingSchedule.assignments) {
    existingSchedule.assignments.forEach(a => {
      mergedMap.set(`${a.classId}_${a.subjectId}`, a);
    });
  }

  // Overlay timetable assignments (authoritative for Week 1)
  weeklyAssignments.forEach(tkbItem => {
    const key = `${tkbItem.classId}_${tkbItem.subjectId}`;
    const existing = mergedMap.get(key);
    mergedMap.set(key, {
      classId: tkbItem.classId,
      subjectId: tkbItem.subjectId,
      teacherId: tkbItem.teacherId || existing?.teacherId || '',
      periods: tkbItem.periods,
      note: existing?.note || tkbItem.note || ''
    });
  });

  return {
    weekNumber: 1,
    semester: 'HK1',
    title: 'Tuần 1 (Theo Thời khóa biểu chính thức)',
    assignments: Array.from(mergedMap.values()),
    updatedAt: Date.now()
  };
}

/**
 * Export the reconciliation table to Excel (.xlsx)
 */
export function exportReconciliationToExcel(report: TimetableReconciliationReport) {
  const data = report.rows.map((r, index) => ({
    'STT': index + 1,
    'Khối': r.grade,
    'Lớp': r.className,
    'Cơ sở': r.campus || 'Đốc Binh Kiều',
    'Môn học': r.subjectName,
    'Số tiết TKB Tuần 1': r.timetablePeriods,
    'GV theo TKB': r.timetableTeacherName ? `${r.timetableTeacherName} (${r.timetableTeacherCode})` : '—',
    'Số tiết Phân công': r.assignmentPeriods,
    'GV theo Phân công': r.assignmentTeacherName ? `${r.assignmentTeacherName} (${r.assignmentTeacherCode})` : '—',
    'Trạng thái':
      r.status === 'MATCHED'
        ? 'Khớp hoàn toàn'
        : r.status === 'SUPPLEMENTED'
        ? 'Bổ sung từ TKB'
        : r.status === 'MISMATCH'
        ? 'Lệch phân công'
        : 'Không có trên TKB',
    'Ghi chú đối chiếu': r.note || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DoiChieu_TKB_PhanCong_Tuan1');
  XLSX.writeFile(
    workbook,
    `Bang_Doi_Chieu_TKB_Phan_Cong_Tuan_1_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}
