import {
  TimetableSlot,
  SchoolTimetable,
  ClassGroup,
  Subject,
  Teacher,
  Assignment,
  SchoolConfig,
  TimetableRuleConfig,
  TeacherTimetableWish,
  TimetableSession
} from '../types';

export interface ScheduleGenerationResult {
  timetable: SchoolTimetable;
  successRate: number;
  totalRequiredSlots: number;
  placedSlotsCount: number;
  unplacedCount: number;
  conflicts: {
    type: 'HARD' | 'SOFT';
    message: string;
    details?: any;
  }[];
  campusStats: {
    campus: string;
    classCount: number;
    placedSlots: number;
  }[];
  executionTimeMs: number;
}

export const DEFAULT_TIMETABLE_RULES: TimetableRuleConfig = {
  campusScope: 'ALL',
  avoidPePeriod5Morning: true,
  avoidPePeriod1Afternoon: true,
  consecutivePeriodsSubjects: ['sub-van', 'sub-toan', 'sub-tin', 'sub-qp', 'sub-td', 'sub-hoa', 'sub-sinh', 'sub-ly'],
  avoidThptTeacherP1AfternoonForGrade67: true,
  preventCrossCampusSameSession: true,
  teacherWishes: []
};

/**
 * Intelligent Constraint-Based Timetable Scheduling Engine (CSP + Backtracking Heuristics)
 */
export function executeSmartScheduleAlgorithm(
  classes: ClassGroup[],
  subjects: Subject[],
  teachers: Teacher[],
  assignments: Assignment[],
  config: SchoolConfig,
  rules: TimetableRuleConfig = DEFAULT_TIMETABLE_RULES,
  existingTimetable?: SchoolTimetable
): ScheduleGenerationResult {
  const startTime = performance.now();
  const conflicts: { type: 'HARD' | 'SOFT'; message: string; details?: any }[] = [];

  // Filter classes based on selected scope
  const targetClasses = classes.filter(cls => {
    if (rules.campusScope === 'THPT') return cls.level === 'THPT' || cls.campus === 'THPTDBK';
    if (rules.campusScope === 'DBK') return cls.level === 'THCS' && cls.campus !== 'THCSTK';
    if (rules.campusScope === 'TK') return cls.level === 'THCS' && cls.campus === 'THCSTK';
    return true;
  });

  const targetClassIds = new Set(targetClasses.map(c => c.id));
  const teacherMap = new Map(teachers.map(t => [t.id, t]));
  const subjectMap = new Map(subjects.map(s => [s.id, s]));
  const classMap = new Map(classes.map(c => [c.id, c]));

  // Teacher Wish Map
  const teacherWishMap = new Map<string, TeacherTimetableWish>();
  (rules.teacherWishes || []).forEach(w => teacherWishMap.set(w.teacherId, w));

  // If partial scheduling, preserve slots of classes not in targetScope
  const preservedSlots: TimetableSlot[] = (existingTimetable?.slots || []).filter(
    s => !targetClassIds.has(s.classId)
  );

  // Tracking structures for hard constraints
  // 1. teacherBusyMap: `${day}_${session}_${period}_${teacherId}` -> classId
  const teacherBusyMap = new Map<string, string>();
  // 2. teacherCampusSessionMap: `${day}_${session}_${teacherId}` -> campusCode
  const teacherCampusSessionMap = new Map<string, string>();
  // 3. teacherDaysCount: teacherId -> Set<number> (days taught)
  const teacherDaysCount = new Map<string, Set<number>>();

  // Populate tracking from preserved slots
  preservedSlots.forEach(s => {
    if (s.teacherId && s.subjectName) {
      const busyKey = `${s.dayOfWeek}_${s.session}_${s.period}_${s.teacherId}`;
      teacherBusyMap.set(busyKey, s.classId);

      const cls = classMap.get(s.classId);
      const campus = cls?.campus || (cls?.level === 'THPT' ? 'THPTDBK' : 'THCSDBK');
      teacherCampusSessionMap.set(`${s.dayOfWeek}_${s.session}_${s.teacherId}`, campus);

      const days = teacherDaysCount.get(s.teacherId) || new Set<number>();
      days.add(s.dayOfWeek);
      teacherDaysCount.set(s.teacherId, days);
    }
  });

  const generatedSlots: TimetableSlot[] = [];
  let totalRequiredSlots = 0;
  let placedSlotsCount = 0;

  // Process each target class
  for (const cls of targetClasses) {
    const isGrade67 = ['6', '7'].includes(cls.grade);
    const isThptOr89 = ['8', '9', '10', '11', '12'].includes(cls.grade);

    // Standard session: Khối 6, 7 học chiều (hoặc sáng tùy phân bổ), Khối 8-12 học sáng
    // Căn cứ theo quy định của trường:
    // Khối 8,9,10,11,12: Chào cờ tiết 1 sáng T2, SHL tiết 5 sáng T7
    // Khối 6,7: Chào cờ tiết 5 chiều T2, SHL tiết 5 chiều T7
    const mainSession: TimetableSession = isGrade67 ? 'CHIEU' : 'SANG';

    // 1. Place Fixed Slots (Chào cờ, Sinh hoạt lớp)
    const homeroomTeacher = cls.homeroomTeacherId ? teacherMap.get(cls.homeroomTeacherId) : undefined;

    if (isThptOr89) {
      // Chào cờ: Tiết 1 sáng T2
      const flagSlot: TimetableSlot = {
        id: `${cls.id}_2_SANG_1`,
        classId: cls.id,
        className: cls.name,
        dayOfWeek: 2,
        session: 'SANG',
        period: 1,
        subjectId: 'sub-hdtn',
        subjectName: 'Chào cờ / HĐTN',
        teacherId: cls.homeroomTeacherId || '',
        teacherName: homeroomTeacher?.name || 'GVCN',
        teacherCode: homeroomTeacher?.code || 'GVCN',
        room: '',
        isSpecialActivity: true
      };
      generatedSlots.push(flagSlot);
      if (cls.homeroomTeacherId) {
        teacherBusyMap.set(`2_SANG_1_${cls.homeroomTeacherId}`, cls.id);
      }

      // Sinh hoạt lớp: Tiết 5 sáng T7
      const shlSlot: TimetableSlot = {
        id: `${cls.id}_7_SANG_5`,
        classId: cls.id,
        className: cls.name,
        dayOfWeek: 7,
        session: 'SANG',
        period: 5,
        subjectId: 'sub-shl',
        subjectName: 'Sinh hoạt lớp',
        teacherId: cls.homeroomTeacherId || '',
        teacherName: homeroomTeacher?.name || 'GVCN',
        teacherCode: homeroomTeacher?.code || 'GVCN',
        room: '',
        isSpecialActivity: true
      };
      generatedSlots.push(shlSlot);
      if (cls.homeroomTeacherId) {
        teacherBusyMap.set(`7_SANG_5_${cls.homeroomTeacherId}`, cls.id);
      }
    } else {
      // Khối 6, 7: Chào cờ tiết 5 chiều T2, SHL tiết 5 chiều T7
      const flagSlot: TimetableSlot = {
        id: `${cls.id}_2_CHIEU_5`,
        classId: cls.id,
        className: cls.name,
        dayOfWeek: 2,
        session: 'CHIEU',
        period: 5,
        subjectId: 'sub-hdtn',
        subjectName: 'Chào cờ / HĐTN',
        teacherId: cls.homeroomTeacherId || '',
        teacherName: homeroomTeacher?.name || 'GVCN',
        teacherCode: homeroomTeacher?.code || 'GVCN',
        room: '',
        isSpecialActivity: true
      };
      generatedSlots.push(flagSlot);
      if (cls.homeroomTeacherId) {
        teacherBusyMap.set(`2_CHIEU_5_${cls.homeroomTeacherId}`, cls.id);
      }

      const shlSlot: TimetableSlot = {
        id: `${cls.id}_7_CHIEU_5`,
        classId: cls.id,
        className: cls.name,
        dayOfWeek: 7,
        session: 'CHIEU',
        period: 5,
        subjectId: 'sub-shl',
        subjectName: 'Sinh hoạt lớp',
        teacherId: cls.homeroomTeacherId || '',
        teacherName: homeroomTeacher?.name || 'GVCN',
        teacherCode: homeroomTeacher?.code || 'GVCN',
        room: '',
        isSpecialActivity: true
      };
      generatedSlots.push(shlSlot);
      if (cls.homeroomTeacherId) {
        teacherBusyMap.set(`7_CHIEU_5_${cls.homeroomTeacherId}`, cls.id);
      }
    }

    // 2. Prepare Subject Blocks to Schedule
    const classAssignments = assignments.filter(a => a.classId === cls.id && a.periodsPerWeek > 0);
    
    // Group into Lesson Blocks: Single period (1) or Double period (2)
    interface LessonBlock {
      subjectId: string;
      teacherId: string;
      duration: number; // 1 or 2
      isDoublePreferred: boolean;
    }

    const lessonBlocks: LessonBlock[] = [];

    classAssignments.forEach(asg => {
      const sub = subjectMap.get(asg.subjectId);
      const isConsecutivePref = rules.consecutivePeriodsSubjects.some(
        pref => asg.subjectId.includes(pref) || (sub && sub.name.toLowerCase().includes('văn')) || (sub && sub.name.toLowerCase().includes('toán'))
      );

      let remaining = Math.round(asg.periodsPerWeek);
      totalRequiredSlots += remaining;

      // Group into 2s and 1s
      while (remaining > 0) {
        if (remaining >= 2 && isConsecutivePref) {
          lessonBlocks.push({
            subjectId: asg.subjectId,
            teacherId: asg.teacherId,
            duration: 2,
            isDoublePreferred: true
          });
          remaining -= 2;
        } else {
          lessonBlocks.push({
            subjectId: asg.subjectId,
            teacherId: asg.teacherId,
            duration: 1,
            isDoublePreferred: false
          });
          remaining -= 1;
        }
      }
    });

    // Sort blocks: Place larger/harder blocks first (MRV - Minimum Remaining Values heuristic)
    lessonBlocks.sort((a, b) => b.duration - a.duration);

    // Grid tracking for this class: `${day}_${period}` -> TimetableSlot
    const classGrid = new Map<string, TimetableSlot>();
    // Pre-populate with fixed slots
    if (isThptOr89) {
      classGrid.set('2_1', generatedSlots[generatedSlots.length - 2]);
      classGrid.set('7_5', generatedSlots[generatedSlots.length - 1]);
    } else {
      classGrid.set('2_5', generatedSlots[generatedSlots.length - 2]);
      classGrid.set('7_5', generatedSlots[generatedSlots.length - 1]);
    }

    // Subject frequency per day: `${day}_${subjectId}` -> count
    const classSubjectDayCount = new Map<string, number>();

    // 3. Place blocks into classGrid
    for (const block of lessonBlocks) {
      let placed = false;
      const teacher = teacherMap.get(block.teacherId);
      const subject = subjectMap.get(block.subjectId);
      const isPe = subject?.name.toLowerCase().includes('thể dục') || subject?.shortName?.toLowerCase().includes('td');
      const teacherWish = teacherWishMap.get(block.teacherId);

      // Score each candidate (day, period) to find best fit
      interface CandidateSlot {
        day: number;
        startPeriod: number;
        score: number;
      }
      const candidates: CandidateSlot[] = [];

      for (let day = 2; day <= 7; day++) {
        for (let p = 1; p <= (6 - block.duration); p++) {
          // Check if slots are free
          let isFree = true;
          for (let offset = 0; offset < block.duration; offset++) {
            if (classGrid.has(`${day}_${p + offset}`)) {
              isFree = false;
              break;
            }
          }
          if (!isFree) continue;

          // Check HARD constraint 1: Teacher Busy
          let teacherCollision = false;
          if (block.teacherId) {
            for (let offset = 0; offset < block.duration; offset++) {
              const busyKey = `${day}_${mainSession}_${p + offset}_${block.teacherId}`;
              if (teacherBusyMap.has(busyKey)) {
                teacherCollision = true;
                break;
              }
            }
          }
          if (teacherCollision) continue;

          // Check HARD constraint 2: Cross Campus Same Session
          if (rules.preventCrossCampusSameSession && block.teacherId) {
            const classCampus = cls.campus || (cls.level === 'THPT' ? 'THPTDBK' : 'THCSDBK');
            const campusInSession = teacherCampusSessionMap.get(`${day}_${mainSession}_${block.teacherId}`);
            if (campusInSession && campusInSession !== classCampus) {
              continue; // Bị kẹt ở điểm trường khác trong cùng 1 buổi
            }
          }

          // Check HARD constraint 3: THPT teacher teaching Grade 6,7 avoiding P1 afternoon
          if (rules.avoidThptTeacherP1AfternoonForGrade67 && isGrade67 && mainSession === 'CHIEU' && p === 1) {
            if (teacher?.campus === 'THPTDBK' || teacher?.role?.includes('THPT')) {
              continue; // Tránh xếp tiết 1 chiều cho GV THPT
            }
          }

          // CALCULATE SOFT PENALTY / SCORE
          let score = 100;

          // Soft 1: Avoid PE Period 5 Morning or Period 1 Afternoon
          if (isPe) {
            if (rules.avoidPePeriod5Morning && mainSession === 'SANG' && (p === 5 || p + block.duration - 1 === 5)) {
              score -= 60;
            }
            if (rules.avoidPePeriod1Afternoon && mainSession === 'CHIEU' && p === 1) {
              score -= 60;
            }
          }

          // Soft 2: Spread subjects evenly (avoid 3+ periods of same subject in one day)
          const currentDaySubCount = classSubjectDayCount.get(`${day}_${block.subjectId}`) || 0;
          if (currentDaySubCount > 0) {
            score -= currentDaySubCount * 30;
          }

          // Soft 3: Avoid gaps (tiết lủng) for teacher
          if (block.teacherId) {
            const hasAdjacentSlot = teacherBusyMap.has(`${day}_${mainSession}_${p - 1}_${block.teacherId}`) ||
                                   teacherBusyMap.has(`${day}_${mainSession}_${p + block.duration}_${block.teacherId}`);
            if (hasAdjacentSlot) score += 20; // Liền tiết được cộng điểm
          }

          // Soft 4: Teacher Wishes
          if (teacherWish) {
            if (teacherWish.avoidSaturdayMorning && day === 7 && mainSession === 'SANG') {
              score -= 80;
            }
            if (teacherWish.avoidMorningDays?.includes(day) && mainSession === 'SANG') {
              score -= 80;
            }
            if (teacherWish.avoidAfternoonDays?.includes(day) && mainSession === 'CHIEU') {
              score -= 80;
            }
          }

          candidates.push({ day, startPeriod: p, score });
        }
      }

      // Sort candidates by highest score
      candidates.sort((a, b) => b.score - a.score);

      if (candidates.length > 0) {
        const best = candidates[0];
        for (let offset = 0; offset < block.duration; offset++) {
          const currentP = best.startPeriod + offset;
          const slot: TimetableSlot = {
            id: `${cls.id}_${best.day}_${mainSession}_${currentP}`,
            classId: cls.id,
            className: cls.name,
            dayOfWeek: best.day,
            session: mainSession,
            period: currentP,
            subjectId: block.subjectId,
            subjectName: subject?.name || subject?.shortName || 'Môn học',
            teacherId: block.teacherId,
            teacherName: teacher?.name || '',
            teacherCode: teacher?.code || '',
            room: ''
          };

          classGrid.set(`${best.day}_${currentP}`, slot);
          generatedSlots.push(slot);

          if (block.teacherId) {
            const busyKey = `${best.day}_${mainSession}_${currentP}_${block.teacherId}`;
            teacherBusyMap.set(busyKey, cls.id);

            const classCampus = cls.campus || (cls.level === 'THPT' ? 'THPTDBK' : 'THCSDBK');
            teacherCampusSessionMap.set(`${best.day}_${mainSession}_${block.teacherId}`, classCampus);
          }
        }

        const currentCount = classSubjectDayCount.get(`${best.day}_${block.subjectId}`) || 0;
        classSubjectDayCount.set(`${best.day}_${block.subjectId}`, currentCount + block.duration);
        placedSlotsCount += block.duration;
        placed = true;
      }

      if (!placed) {
        conflicts.push({
          type: 'HARD',
          message: `Lớp ${cls.name}: Không tìm được tiết trống phù hợp cho môn ${subject?.name || 'Môn học'} (GV: ${teacher?.name || 'Chưa gán'}).`,
          details: { classId: cls.id, subjectId: block.subjectId, teacherId: block.teacherId }
        });
      }
    }

    // Fill remaining empty slots of standard 30 slots/week for full grid rendering
    for (let day = 2; day <= 7; day++) {
      for (let p = 1; p <= 5; p++) {
        if (!classGrid.has(`${day}_${p}`)) {
          generatedSlots.push({
            id: `${cls.id}_${day}_${mainSession}_${p}`,
            classId: cls.id,
            className: cls.name,
            dayOfWeek: day,
            session: mainSession,
            period: p,
            room: ''
          });
        }
      }
    }
  }

  // Combine preserved slots and newly generated slots
  const allFinalSlots = [...preservedSlots, ...generatedSlots];
  const executionTimeMs = Math.round(performance.now() - startTime);
  const successRate = totalRequiredSlots > 0 ? Math.round((placedSlotsCount / totalRequiredSlots) * 100) : 100;

  const resultTimetable: SchoolTimetable = {
    id: `tkb_${rules.campusScope}_${config.semester || 'HK1'}_${Date.now()}`,
    academicYear: config.academicYear || '2026 - 2027',
    semester: config.semester || 'HK1',
    appliedDate: `Áp dụng từ ${new Date().toLocaleDateString('vi-VN')}`,
    title: `Thời Khóa Biểu - ${config.semester === 'HK2' ? 'Học kỳ II' : 'Học kỳ I'} Năm học ${config.academicYear || '2026 - 2027'}`,
    slots: allFinalSlots,
    updatedAt: Date.now(),
    notes: `Tự động xếp ngày ${new Date().toLocaleString('vi-VN')} (${rules.campusScope === 'ALL' ? 'Toàn trường 3 điểm' : rules.campusScope})`,
    ruleConfig: rules
  };

  return {
    timetable: resultTimetable,
    successRate,
    totalRequiredSlots,
    placedSlotsCount,
    unplacedCount: Math.max(0, totalRequiredSlots - placedSlotsCount),
    conflicts,
    campusStats: [
      { campus: 'THPT', classCount: classes.filter(c => c.level === 'THPT').length, placedSlots: placedSlotsCount },
      { campus: 'THCS ĐBK', classCount: classes.filter(c => c.level === 'THCS' && c.campus !== 'THCSTK').length, placedSlots: placedSlotsCount },
      { campus: 'THCS Tân Kiều', classCount: classes.filter(c => c.campus === 'THCSTK').length, placedSlots: placedSlotsCount }
    ],
    executionTimeMs
  };
}
