import { ClassGroup, Subject, Teacher, Assignment, TimetableSlot, SchoolLevel, GradeLevel } from '../types';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export interface SubjectRule {
  key: string;
  name: string;
  matchSubjectIds: string[];
  defaultDuration: number;
  defaultFormat: string;
}

// Cấp THCS: Ngữ văn, Toán, Khoa học tự nhiên, Tiếng Anh, Lịch sử và Địa lí, Giáo dục công dân.
export const THCS_EXAM_SUBJECTS: SubjectRule[] = [
  { key: 'van', name: 'Ngữ văn', matchSubjectIds: ['sub-van'], defaultDuration: 90, defaultFormat: 'Tự luận 100%' },
  { key: 'toan', name: 'Toán', matchSubjectIds: ['sub-toan'], defaultDuration: 90, defaultFormat: 'Trắc nghiệm + Tự luận' },
  { key: 'khtn', name: 'Khoa học tự nhiên', matchSubjectIds: ['sub-khtn-cs', 'sub-li', 'sub-hoa', 'sub-sinh'], defaultDuration: 60, defaultFormat: 'Trắc nghiệm + Tự luận' },
  { key: 'anh', name: 'Tiếng Anh', matchSubjectIds: ['sub-anh'], defaultDuration: 60, defaultFormat: 'Trắc nghiệm + Tự luận' },
  { key: 'lsdl', name: 'Lịch sử và Địa lí', matchSubjectIds: ['sub-lsdl-cs', 'sub-su', 'sub-dia'], defaultDuration: 60, defaultFormat: 'Trắc nghiệm + Tự luận' },
  { key: 'gdcd', name: 'Giáo dục công dân', matchSubjectIds: ['sub-gdcd'], defaultDuration: 45, defaultFormat: 'Trắc nghiệm + Tự luận' },
];

// Cấp THPT: Ngữ văn, Toán, Tiếng Anh, Vật lí, Hóa học, Sinh học, Lịch sử, Địa lí, Giáo dục kinh tế và pháp luật, Tin học, Công nghệ.
export const THPT_EXAM_SUBJECTS: SubjectRule[] = [
  { key: 'van', name: 'Ngữ văn', matchSubjectIds: ['sub-van'], defaultDuration: 90, defaultFormat: 'Tự luận 100%' },
  { key: 'toan', name: 'Toán', matchSubjectIds: ['sub-toan'], defaultDuration: 90, defaultFormat: 'Trắc nghiệm + Tự luận' },
  { key: 'anh', name: 'Tiếng Anh', matchSubjectIds: ['sub-anh'], defaultDuration: 60, defaultFormat: 'Trắc nghiệm 100%' },
  { key: 'li', name: 'Vật lí', matchSubjectIds: ['sub-li'], defaultDuration: 45, defaultFormat: 'Trắc nghiệm 100%' },
  { key: 'hoa', name: 'Hóa học', matchSubjectIds: ['sub-hoa'], defaultDuration: 45, defaultFormat: 'Trắc nghiệm 100%' },
  { key: 'sinh', name: 'Sinh học', matchSubjectIds: ['sub-sinh'], defaultDuration: 45, defaultFormat: 'Trắc nghiệm 100%' },
  { key: 'su', name: 'Lịch sử', matchSubjectIds: ['sub-su'], defaultDuration: 45, defaultFormat: 'Trắc nghiệm 100%' },
  { key: 'dia', name: 'Địa lí', matchSubjectIds: ['sub-dia'], defaultDuration: 45, defaultFormat: 'Trắc nghiệm 100%' },
  { key: 'gdktpl', name: 'Giáo dục kinh tế và pháp luật', matchSubjectIds: ['sub-gdktpl', 'sub-ktpl'], defaultDuration: 45, defaultFormat: 'Trắc nghiệm 100%' },
  { key: 'tin', name: 'Tin học', matchSubjectIds: ['sub-tin'], defaultDuration: 45, defaultFormat: 'Trắc nghiệm + Thực hành' },
  { key: 'cn', name: 'Công nghệ', matchSubjectIds: ['sub-cn'], defaultDuration: 45, defaultFormat: 'Trắc nghiệm 100%' },
];

export interface TeacherTeachingStat {
  teacherId: string;
  teacherName: string;
  teacherCode: string;
  classCount: number;
  classes: Array<{
    classId: string;
    className: string;
    subName?: string;
    periods?: number;
  }>;
}

export interface TeacherSimpleOption {
  teacherId: string;
  teacherName: string;
  teacherCode: string;
}

export interface FocusedExamSubjectItem {
  id: string; // `${level}_${grade}_${subjectKey}`
  level: SchoolLevel;
  grade: GradeLevel;
  gradeLabel: string;
  subjectKey: string;
  subjectName: string;
  matchSubjectIds: string[];
  totalClassesInGrade: number;
  gradeClasses: ClassGroup[];
  teachers: TeacherTeachingStat[]; // GV đang dạy khối này
  otherSubjectTeachers: TeacherSimpleOption[]; // Các GV khác trong trường cùng dạy môn này
  defaultDuration: number;
  defaultFormat: string;
}

export interface YearExamProposalRecord {
  gk1TeacherId?: string;
  gk1TeacherName?: string;
  ck1TeacherId?: string;
  ck1TeacherName?: string;
  gk2TeacherId?: string;
  gk2TeacherName?: string;
  ck2TeacherId?: string;
  ck2TeacherName?: string;
  durationMinutes: number;
  examFormat: string;
  notes?: string;
  updatedAt?: number;
}

export type YearExamProposalMap = Record<string, YearExamProposalRecord>;

/**
 * Builds all focused exam subject items by level and grade, aggregating teacher assignments
 */
export function buildFocusedExamItems(
  classes: ClassGroup[],
  subjects: Subject[],
  teachers: Teacher[],
  assignments: Assignment[],
  timetableSlots: TimetableSlot[] = []
): FocusedExamSubjectItem[] {
  const teacherMap = new Map<string, Teacher>(teachers.map(t => [t.id, t]));
  const classMap = new Map<string, ClassGroup>(classes.map(c => [c.id, c]));
  const subMap = new Map<string, Subject>(subjects.map(s => [s.id, s]));

  // Global map of teachers who teach each subject key
  const subjectAllTeachersMap = new Map<string, Set<string>>();

  // Populate from slots
  timetableSlots.forEach(s => {
    if (!s.teacherId) return;
    const allRules = [...THCS_EXAM_SUBJECTS, ...THPT_EXAM_SUBJECTS];
    for (const rule of allRules) {
      if (rule.matchSubjectIds.includes(s.subjectId)) {
        const set = subjectAllTeachersMap.get(rule.key) || new Set<string>();
        set.add(s.teacherId);
        subjectAllTeachersMap.set(rule.key, set);
      }
    }
  });

  // Populate from assignments
  assignments.forEach(a => {
    if (!a.teacherId) return;
    const allRules = [...THCS_EXAM_SUBJECTS, ...THPT_EXAM_SUBJECTS];
    for (const rule of allRules) {
      if (rule.matchSubjectIds.includes(a.subjectId)) {
        const set = subjectAllTeachersMap.get(rule.key) || new Set<string>();
        set.add(a.teacherId);
        subjectAllTeachersMap.set(rule.key, set);
      }
    }
  });

  const result: FocusedExamSubjectItem[] = [];

  // 1. Process THCS (Grades 6, 7, 8, 9)
  const thcsGrades: GradeLevel[] = ['6', '7', '8', '9'];
  for (const grade of thcsGrades) {
    const gradeClasses = classes.filter(c => c.level === 'THCS' && c.grade === grade);
    if (gradeClasses.length === 0) continue;
    const gradeClassIds = new Set(gradeClasses.map(c => c.id));

    for (const subRule of THCS_EXAM_SUBJECTS) {
      const stats = extractTeachersForSubjectAndGrade(
        gradeClassIds,
        subRule.matchSubjectIds,
        assignments,
        timetableSlots,
        teacherMap,
        classMap,
        subMap,
        subRule.name
      );

      const gradeTeacherIds = new Set(stats.map(t => t.teacherId));
      const allSubjectTeacherIds = subjectAllTeachersMap.get(subRule.key) || new Set<string>();
      
      const otherTeachers: TeacherSimpleOption[] = [];
      allSubjectTeacherIds.forEach(tId => {
        if (!gradeTeacherIds.has(tId)) {
          const tch = teacherMap.get(tId);
          if (tch) {
            otherTeachers.push({
              teacherId: tId,
              teacherName: tch.name,
              teacherCode: tch.code || '',
            });
          }
        }
      });
      otherTeachers.sort((a, b) => a.teacherName.localeCompare(b.teacherName));

      result.push({
        id: `THCS_${grade}_${subRule.key}`,
        level: 'THCS',
        grade,
        gradeLabel: `Khối ${grade}`,
        subjectKey: subRule.key,
        subjectName: subRule.name,
        matchSubjectIds: subRule.matchSubjectIds,
        totalClassesInGrade: gradeClasses.length,
        gradeClasses,
        teachers: stats,
        otherSubjectTeachers: otherTeachers,
        defaultDuration: subRule.defaultDuration,
        defaultFormat: subRule.defaultFormat,
      });
    }
  }

  // 2. Process THPT (Grades 10, 11, 12)
  const thptGrades: GradeLevel[] = ['10', '11', '12'];
  for (const grade of thptGrades) {
    const gradeClasses = classes.filter(c => c.level === 'THPT' && c.grade === grade);
    if (gradeClasses.length === 0) continue;
    const gradeClassIds = new Set(gradeClasses.map(c => c.id));

    for (const subRule of THPT_EXAM_SUBJECTS) {
      // Môn Công nghệ khối 10 và khối 11 không có học sinh lựa chọn học nên loại bỏ khỏi danh sách ra đề kiểm tra
      if (subRule.key === 'cn' && (grade === '10' || grade === '11')) {
        continue;
      }

      const stats = extractTeachersForSubjectAndGrade(
        gradeClassIds,
        subRule.matchSubjectIds,
        assignments,
        timetableSlots,
        teacherMap,
        classMap,
        subMap,
        subRule.name
      );

      const gradeTeacherIds = new Set(stats.map(t => t.teacherId));
      const allSubjectTeacherIds = subjectAllTeachersMap.get(subRule.key) || new Set<string>();

      const otherTeachers: TeacherSimpleOption[] = [];
      allSubjectTeacherIds.forEach(tId => {
        if (!gradeTeacherIds.has(tId)) {
          const tch = teacherMap.get(tId);
          if (tch) {
            otherTeachers.push({
              teacherId: tId,
              teacherName: tch.name,
              teacherCode: tch.code || '',
            });
          }
        }
      });
      otherTeachers.sort((a, b) => a.teacherName.localeCompare(b.teacherName));

      result.push({
        id: `THPT_${grade}_${subRule.key}`,
        level: 'THPT',
        grade,
        gradeLabel: `Khối ${grade}`,
        subjectKey: subRule.key,
        subjectName: subRule.name,
        matchSubjectIds: subRule.matchSubjectIds,
        totalClassesInGrade: gradeClasses.length,
        gradeClasses,
        teachers: stats,
        otherSubjectTeachers: otherTeachers,
        defaultDuration: (grade === '12' && !['van', 'toan', 'anh'].includes(subRule.key)) ? 50 : subRule.defaultDuration,
        defaultFormat: subRule.defaultFormat,
      });
    }
  }

  return result;
}

/**
 * Helper to aggregate teacher assignments per grade & subject
 */
function extractTeachersForSubjectAndGrade(
  gradeClassIds: Set<string>,
  matchSubjectIds: string[],
  assignments: Assignment[],
  timetableSlots: TimetableSlot[],
  teacherMap: Map<string, Teacher>,
  classMap: Map<string, ClassGroup>,
  subMap: Map<string, Subject>,
  defaultSubName: string
): TeacherTeachingStat[] {
  const teacherStatMap = new Map<
    string,
    {
      teacherId: string;
      teacherName: string;
      teacherCode: string;
      classMap: Map<string, { classId: string; className: string; subName: string; periods: number }>;
    }
  >();

  // Primary source: Timetable slots
  if (timetableSlots && timetableSlots.length > 0) {
    timetableSlots.forEach(slot => {
      if (gradeClassIds.has(slot.classId) && matchSubjectIds.includes(slot.subjectId)) {
        if (!slot.teacherId) return;

        const tch = teacherMap.get(slot.teacherId);
        const tId = slot.teacherId;
        const entry = teacherStatMap.get(tId) || {
          teacherId: tId,
          teacherName: tch?.name || slot.teacherName || 'Chưa rõ',
          teacherCode: tch?.code || slot.teacherCode || '',
          classMap: new Map(),
        };

        const existingClass = entry.classMap.get(slot.classId) || {
          classId: slot.classId,
          className: slot.className || classMap.get(slot.classId)?.name || slot.classId,
          subName: slot.subjectName || defaultSubName,
          periods: 0,
        };
        existingClass.periods++;
        entry.classMap.set(slot.classId, existingClass);
        teacherStatMap.set(tId, entry);
      }
    });
  }

  // Secondary source: Assignments
  assignments.forEach(a => {
    if (gradeClassIds.has(a.classId) && matchSubjectIds.includes(a.subjectId)) {
      if (!a.teacherId) return;

      const tch = teacherMap.get(a.teacherId);
      const cls = classMap.get(a.classId);
      const sub = subMap.get(a.subjectId);
      const tId = a.teacherId;

      const entry = teacherStatMap.get(tId) || {
        teacherId: tId,
        teacherName: tch?.name || 'Chưa rõ',
        teacherCode: tch?.code || '',
        classMap: new Map(),
      };

      if (!entry.classMap.has(a.classId)) {
        entry.classMap.set(a.classId, {
          classId: a.classId,
          className: cls?.name || a.classId,
          subName: sub?.name || defaultSubName,
          periods: a.periodsPerWeek || 0,
        });
      }
      teacherStatMap.set(tId, entry);
    }
  });

  const list: TeacherTeachingStat[] = [];
  teacherStatMap.forEach(item => {
    const classList = Array.from(item.classMap.values()).sort((a, b) => a.className.localeCompare(b.className));
    list.push({
      teacherId: item.teacherId,
      teacherName: item.teacherName,
      teacherCode: item.teacherCode,
      classCount: classList.length,
      classes: classList,
    });
  });

  // Sort teachers by number of classes taught descending
  return list.sort((a, b) => {
    if (b.classCount !== a.classCount) return b.classCount - a.classCount;
    return a.teacherName.localeCompare(b.teacherName);
  });
}

/**
 * Storage key for full year exam proposals
 */
export function getYearExamProposalsStorageKey(academicYear: string): string {
  const cleanYear = academicYear.replace(/\s+/g, '_');
  return `docbinhkieu_year_exam_proposals_${cleanYear}`;
}

export function getExamProposalsDocId(academicYear: string): string {
  return academicYear.trim().replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Real-time listener for exam proposals from Firestore cloud database
 */
export function subscribeYearExamProposals(
  academicYear: string,
  onUpdate: (proposals: YearExamProposalMap, updatedAt?: number, updatedBy?: string) => void,
  onError?: (err: unknown) => void
): () => void {
  const docId = getExamProposalsDocId(academicYear);
  const path = `exam_proposals/${docId}`;
  const docRef = doc(db, 'exam_proposals', docId);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const proposals = (data.proposals || {}) as YearExamProposalMap;
        onUpdate(proposals, data.updatedAt, data.lastUpdatedBy);
      } else {
        // Document doesn't exist yet on cloud
        onUpdate({}, undefined, undefined);
      }
    },
    (error) => {
      console.warn('[Firestore] Realtime subscription error:', error);
      onError?.(error);
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e) {
        // Log handled error without crashing app
      }
    }
  );
}

/**
 * Fetch exam proposals directly from Firestore
 */
export async function fetchYearExamProposalsFromCloud(academicYear: string): Promise<YearExamProposalMap | null> {
  const docId = getExamProposalsDocId(academicYear);
  const path = `exam_proposals/${docId}`;
  try {
    const docRef = doc(db, 'exam_proposals', docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return (data.proposals || {}) as YearExamProposalMap;
    }
    return null;
  } catch (error) {
    console.warn('[Firestore] Failed to fetch exam proposals from cloud:', error);
    try {
      handleFirestoreError(error, OperationType.GET, path);
    } catch (e) {
      // Ignored
    }
    return null;
  }
}

/**
 * Save exam proposals to Firestore cloud database (synchronized across all computers)
 */
export async function saveYearExamProposalsToCloud(
  academicYear: string,
  map: YearExamProposalMap,
  lastUpdatedBy = 'Ban Giám hiệu'
): Promise<boolean> {
  const docId = getExamProposalsDocId(academicYear);
  const path = `exam_proposals/${docId}`;
  try {
    const docRef = doc(db, 'exam_proposals', docId);
    await setDoc(
      docRef,
      {
        academicYear,
        proposals: map,
        updatedAt: Date.now(),
        lastUpdatedBy,
      },
      { merge: true }
    );
    // Also save to localStorage as instant offline cache
    saveYearExamProposals(academicYear, map);
    return true;
  } catch (error) {
    console.error('[Firestore] Failed to save exam proposals to cloud:', error);
    try {
      handleFirestoreError(error, OperationType.WRITE, path);
    } catch (e) {
      // Ignored
    }
    return false;
  }
}

/**
 * Load exam proposals for all 4 periods from localStorage (instant cache)
 */
export function loadYearExamProposals(academicYear: string): YearExamProposalMap {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }
  try {
    const key = getYearExamProposalsStorageKey(academicYear);
    const data = localStorage.getItem(key);
    if (data) {
      return JSON.parse(data);
    }

    // Migration fallback: check old GK1 key
    const oldKey = `docbinhkieu_exam_proposals_${academicYear.replace(/\s+/g, '_')}_GK1`;
    const oldData = localStorage.getItem(oldKey);
    if (oldData) {
      const parsedOld = JSON.parse(oldData);
      const migrated: YearExamProposalMap = {};
      Object.keys(parsedOld).forEach(k => {
        migrated[k] = {
          gk1TeacherId: parsedOld[k].primaryTeacherId,
          gk1TeacherName: parsedOld[k].primaryTeacherName,
          durationMinutes: parsedOld[k].durationMinutes || 45,
          examFormat: parsedOld[k].examFormat || 'Trắc nghiệm + Tự luận',
          notes: parsedOld[k].notes || '',
          updatedAt: Date.now(),
        };
      });
      return migrated;
    }
  } catch (e) {
    console.error('Failed to load year exam proposals', e);
  }
  return {};
}

/**
 * Save exam proposals for all 4 periods to localStorage (offline cache)
 */
export function saveYearExamProposals(academicYear: string, map: YearExamProposalMap): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    const key = getYearExamProposalsStorageKey(academicYear);
    localStorage.setItem(key, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save year exam proposals', e);
  }
}



/**
 * Auto propose exam makers for Giữa HK1 (based on highest teaching load in the grade)
 */
export function generateAutoExamProposalsForGK1(items: FocusedExamSubjectItem[]): YearExamProposalMap {
  const proposals: YearExamProposalMap = {};

  items.forEach(item => {
    if (item.teachers.length > 0) {
      const primary = item.teachers[0];

      proposals[item.id] = {
        gk1TeacherId: primary.teacherId,
        gk1TeacherName: primary.teacherName,
        durationMinutes: item.defaultDuration,
        examFormat: item.defaultFormat,
        notes: `Gợi ý theo số lớp phụ trách (${primary.classCount}/${item.totalClassesInGrade} lớp)`,
        updatedAt: Date.now(),
      };
    }
  });

  return proposals;
}

/**
 * Export year exam proposal statistics to Excel with all 4 periods
 */
export async function exportYearExamProposalsToExcel(
  items: FocusedExamSubjectItem[],
  proposals: YearExamProposalMap,
  academicYear: string = '2026 - 2027'
): Promise<void> {
  const XLSX = await import('xlsx');

  const rows: any[][] = [];

  // Header Title
  rows.push(['SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP', '', '', '', '', '', '', '', '', '', '']);
  rows.push(['TRƯỜNG THPT ĐỐC BINH KIỀU', '', '', '', '', '', '', '', '', '', '']);
  rows.push([]);
  rows.push([`BẢNG ĐỀ XUẤT PHÂN CÔNG NGƯỜI RA ĐỀ KIỂM TRA TẬP TRUNG NĂM HỌC ${academicYear}`]);
  rows.push([`Các đợt: Giữa Học kỳ 1, Học kỳ 1, Giữa Học kỳ 2, Học kỳ 2`]);
  rows.push([`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')} | Tài liệu mật nội bộ Ban Giám Hiệu`]);
  rows.push([]);

  // Table Columns
  rows.push([
    'STT',
    'Cấp học',
    'Khối',
    'Môn kiểm tra',
    'Tổng số lớp',
    'Thống kê GV giảng dạy & Số lớp phụ trách',
    'Ra đề GIỮA HK1',
    'Ra đề HỌC KỲ 1',
    'Ra đề GIỮA HK2',
    'Ra đề HỌC KỲ 2',
    'Thời lượng (phút)',
    'Hình thức kiểm tra',
    'Ghi chú phân công',
  ]);

  items.forEach((item, index) => {
    const prop = proposals[item.id];
    
    // Format teachers list
    const teacherSummary = item.teachers.length > 0
      ? item.teachers.map(t => {
          const classNames = t.classes.map(c => c.className).join(', ');
          return `${t.teacherName} (${t.classCount} lớp: ${classNames})`;
        }).join(';\n')
      : '(Chưa phân công GV dạy)';

    rows.push([
      index + 1,
      item.level,
      item.gradeLabel,
      item.subjectName,
      item.totalClassesInGrade,
      teacherSummary,
      prop?.gk1TeacherName || '---',
      prop?.ck1TeacherName || '---',
      prop?.gk2TeacherName || '---',
      prop?.ck2TeacherName || '---',
      prop?.durationMinutes || item.defaultDuration,
      prop?.examFormat || item.defaultFormat,
      prop?.notes || '',
    ]);
  });

  // Footer Signatures
  rows.push([]);
  rows.push([]);
  rows.push([
    '',
    '',
    '',
    'NGƯỜI LẬP BẢNG',
    '',
    '',
    'PHÓ HIỆU TRƯỞNG DUYỆT',
    '',
    '',
    'HIỆU TRƯỞNG PHÊ DUYỆT'
  ]);
  rows.push([
    '',
    '',
    '',
    '(Ký và ghi rõ họ tên)',
    '',
    '',
    '(Ký và ghi rõ họ tên)',
    '',
    '',
    '(Ký và ghi rõ họ tên)'
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 10 }, // Cấp
    { wch: 10 }, // Khối
    { wch: 24 }, // Môn
    { wch: 13 }, // Tổng số lớp
    { wch: 45 }, // Thống kê GV
    { wch: 24 }, // Giữa HK1
    { wch: 24 }, // Học kỳ 1
    { wch: 24 }, // Giữa HK2
    { wch: 24 }, // Học kỳ 2
    { wch: 15 }, // Thời lượng
    { wch: 24 }, // Hình thức
    { wch: 28 }, // Ghi chú
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Phan_Cong_Ra_De`);

  const fileName = `De_Xuat_Ra_De_Kiem_Tra_4_Dot_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
