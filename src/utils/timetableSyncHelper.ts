import {
  TimetableSlot,
  Assignment,
  WeeklySchedule,
  WeeklyAssignmentItem,
  ClassGroup,
  Subject,
  Teacher,
  SchoolTimetable
} from '../types';
import { normalizeTimetableSlots } from './timetableHelper';

/**
 * Extract an authoritative map of assignments from timetable slots.
 * Each classId & subjectId gets the teacher assigned in the timetable
 * and the actual periodsPerWeek count from the timetable.
 */
export function extractAssignmentsFromTimetable(
  slots: TimetableSlot[],
  classes: ClassGroup[],
  subjects: Subject[],
  teachers: Teacher[],
  existingAssignments: Assignment[] = []
): Assignment[] {
  const normalized = normalizeTimetableSlots(slots);
  const teacherMap = new Map<string, Teacher>(teachers.map(t => [t.id, t]));
  const classMap = new Map<string, ClassGroup>(classes.map(c => [c.id, c]));
  const subjectMap = new Map<string, Subject>(subjects.map(s => [s.id, s]));

  // Valid teaching slots (excluding Chào cờ and Sinh hoạt lớp which are homeroom activities)
  const validSlots = normalized.filter(s => 
    s.classId && 
    s.subjectId && 
    s.teacherId && 
    s.subjectId !== 'sub-chao-co' && 
    s.subjectId !== 'sub-shl' &&
    s.subjectName !== 'Chào cờ' &&
    s.subjectName !== 'Sinh hoạt lớp'
  );

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
    const classLevel = classMap.get(slot.classId)?.level;
    const normalizedSubjectName = (slot.subjectName || '').toLowerCase();
    const synchronizedSubjectId = classLevel === 'THCS' && normalizedSubjectName.includes('quy mô lớp')
      ? 'sub-hdtn-qml'
      : slot.subjectId;
    const key = `${slot.classId}_${synchronizedSubjectId}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        classId: slot.classId,
        subjectId: synchronizedSubjectId,
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

  // Build assignments map: Start with existing assignments for non-TKB subjects (like GDĐP or elective modules)
  const assignmentMap = new Map<string, Assignment>();
  existingAssignments.forEach(a => {
    assignmentMap.set(`${a.classId}_${a.subjectId}`, { ...a });
  });

  // Overlay Timetable data: Timetable is the master reference
  for (const [key, item] of groupMap.entries()) {
    // Pick the teacher with the most slots in this class & subject
    const topTeacher = [...item.teachers.entries()].sort((a, b) => b[1] - a[1])[0];
    const teacherId = topTeacher ? topTeacher[0] : '';
    
    // Period calculation: HĐTNHN THPT = 2 periods/week, THCS CĐ & QML = 1 period/week
    let periods = item.periods;
    if (item.subjectId === 'sub-hdtn-cd' || item.subjectId === 'sub-hdtn-shl' || item.subjectId === 'sub-hdtn-qml') {
      periods = 1;
    } else if (item.subjectId === 'sub-hdtn') {
      periods = 2;
    }

    const existing = assignmentMap.get(key);
    assignmentMap.set(key, {
      id: existing?.id || `as-${item.classId}-${item.subjectId}`,
      classId: item.classId,
      subjectId: item.subjectId,
      teacherId: teacherId || existing?.teacherId || '',
      periodsPerWeek: periods,
      note: existing?.note || 'Đồng bộ từ TKB'
    });
  }

  return Array.from(assignmentMap.values());
}

/**
 * Propagate a teacher assignment change (from Matrix, Official Table, Workbench)
 * directly into Timetable slots across all active weeks.
 */
export function propagateTeacherToTimetableSlots(
  slots: TimetableSlot[],
  classId: string,
  subjectId: string,
  newTeacher: Teacher | undefined
): TimetableSlot[] {
  let hasChanged = false;
  const updatedSlots = slots.map(slot => {
    if (slot.classId === classId && slot.subjectId === subjectId) {
      hasChanged = true;
      return {
        ...slot,
        teacherId: newTeacher ? newTeacher.id : '',
        teacherName: newTeacher ? newTeacher.name : '',
        teacherCode: newTeacher ? newTeacher.code : '',
        note: newTeacher ? newTeacher.code : ''
      };
    }
    return slot;
  });

  return hasChanged ? updatedSlots : slots;
}

/**
 * Propagate a teacher assignment change into WeeklySchedules.
 */
export function propagateTeacherToWeeklySchedules(
  weeklySchedules: WeeklySchedule[],
  classId: string,
  subjectId: string,
  newTeacherId: string,
  periodsPerWeek?: number
): WeeklySchedule[] {
  return weeklySchedules.map(ws => {
    let changed = false;
    const nextAssignments = (ws.assignments || []).map(a => {
      if (a.classId === classId && a.subjectId === subjectId) {
        changed = true;
        return {
          ...a,
          teacherId: newTeacherId,
          periods: periodsPerWeek !== undefined ? periodsPerWeek : a.periods
        };
      }
      return a;
    });

    if (!changed && newTeacherId) {
      nextAssignments.push({
        classId,
        subjectId,
        teacherId: newTeacherId,
        periods: periodsPerWeek || 2
      });
      changed = true;
    }

    return changed
      ? { ...ws, assignments: nextAssignments, updatedAt: Date.now() }
      : ws;
  });
}

/**
 * Propagate a slot change from Timetable directly into Assignments.
 */
export function syncSlotChangeToAssignments(
  slot: TimetableSlot,
  currentAssignments: Assignment[]
): Assignment[] {
  if (!slot.classId || !slot.subjectId) return currentAssignments;
  if (slot.subjectId === 'sub-chao-co' || slot.subjectId === 'sub-shl') return currentAssignments;

  const key = `${slot.classId}_${slot.subjectId}`;
  const existingIdx = currentAssignments.findIndex(a => `${a.classId}_${a.subjectId}` === key);

  if (existingIdx >= 0) {
    const clone = [...currentAssignments];
    clone[existingIdx] = {
      ...clone[existingIdx],
      teacherId: slot.teacherId || '',
      updatedAt: Date.now()
    };
    return clone;
  } else if (slot.teacherId) {
    return [
      ...currentAssignments,
      {
        id: `as-${slot.classId}-${slot.subjectId}-${Date.now()}`,
        classId: slot.classId,
        subjectId: slot.subjectId,
        teacherId: slot.teacherId,
        periodsPerWeek: 2,
        updatedAt: Date.now()
      }
    ];
  }

  return currentAssignments;
}

/**
 * Construct an authoritative WeeklySchedule from Timetable slots for any week.
 * Preserves all teaching slots and split teachers so that the total periods match the official timetable (e.g. 1538 slots).
 */
export function buildWeeklyScheduleFromTimetableSlots(
  weekNumber: number,
  semester: 'HK1' | 'HK2',
  slots: TimetableSlot[],
  existingSchedule?: WeeklySchedule
): WeeklySchedule {
  const validSlots = (slots || []).filter(s => s.classId && s.subjectId);

  // Group by (classId, subjectId, teacherId)
  const groupMap = new Map<string, { classId: string; subjectId: string; teacherId: string; periods: number }>();

  validSlots.forEach(s => {
    let subId = s.subjectId;
    if (subId === 'sub-qpan') subId = 'sub-gdqp';
    if (subId === 'sub-ktpl') subId = 'sub-gdktpl';
    const tId = s.teacherId || '';
    const k = `${s.classId}_${subId}_${tId}`;
    if (!groupMap.has(k)) {
      groupMap.set(k, {
        classId: s.classId,
        subjectId: subId,
        teacherId: tId,
        periods: 0
      });
    }
    groupMap.get(k)!.periods++;
  });

  const existingNoteMap = new Map<string, string>();
  if (existingSchedule && existingSchedule.assignments) {
    existingSchedule.assignments.forEach(a => {
      let subId = a.subjectId;
      if (subId === 'sub-qpan') subId = 'sub-gdqp';
      if (subId === 'sub-ktpl') subId = 'sub-gdktpl';
      if (a.note) existingNoteMap.set(`${a.classId}_${subId}_${a.teacherId || ''}`, a.note);
    });
  }

  const items: WeeklyAssignmentItem[] = Array.from(groupMap.values()).map(g => {
    return {
      classId: g.classId,
      subjectId: g.subjectId,
      teacherId: g.teacherId,
      periods: g.periods,
      note: existingNoteMap.get(`${g.classId}_${g.subjectId}_${g.teacherId}`) || `TKB Tuần ${weekNumber}`
    };
  });

  return {
    weekNumber,
    semester,
    title: `Tuần ${weekNumber} (Theo TKB)`,
    assignments: items,
    updatedAt: Date.now()
  };
}

/**
 * Chuẩn hóa và làm sạch danh sách phân công:
 * 1. Loại bỏ các môn chào cờ / sinh hoạt nghi lễ không tính vào định mức dạy của giáo viên
 * 2. Khử trùng mã môn đồng nghĩa (ví dụ sub-qpan -> sub-gdqp, sub-ktpl -> sub-gdktpl)
 * 3. Khử trùng các cặp (classId, subjectId) bị trùng lặp
 * 4. Gán đúng giáo viên phụ trách KT&PL và TD
 */
export function sanitizeAssignmentsList(
  rawAssignments: Assignment[],
  classList: ClassGroup[],
  subjectList: Subject[],
  teacherList?: Teacher[]
): Assignment[] {
  const validSubIds = new Set(subjectList.map(s => s.id));
  const validClassIds = new Set(classList.map(c => c.id));
  const seen = new Map<string, Assignment>();

  rawAssignments.forEach(a => {
    if (!a || !a.classId || !a.subjectId) return;

    let subjectId = a.subjectId;
    let teacherId = a.teacherId;

    // Bỏ môn chào cờ
    if (subjectId === 'sub-chao-co' || subjectId === 'chao-co') return;

    // Chuẩn hóa tên mã môn đồng nghĩa
    if (subjectId === 'sub-qpan' || subjectId === 'qpan') subjectId = 'sub-gdqp';
    if (subjectId === 'sub-ktpl' || subjectId === 'ktpl') subjectId = 'sub-gdktpl';
    if (subjectId === 'sub-td' || subjectId === 'the-duc') subjectId = 'sub-gdtc';

    // Điều chỉnh đặc thù chuyên môn nhà trường: KT&PL thuộc Thầy Trường (tch-ls-8)
    if (subjectId === 'sub-gdktpl' && teacherId === 'tch-bgh-1') {
      teacherId = 'tch-ls-8';
    }
    // 8A3 thể dục thuộc Thầy tch-td-1
    if ((a.classId === 'cls-8a3' || a.classId === '8A3') && subjectId === 'sub-gdtc') {
      teacherId = 'tch-td-1';
    }

    if (!validSubIds.has(subjectId)) return;
    if (!validClassIds.has(a.classId)) return;

    const key = `${a.classId}_${subjectId}`;
    if (!seen.has(key)) {
      seen.set(key, {
        ...a,
        subjectId,
        teacherId,
      });
    }
  });

  return Array.from(seen.values());
}

