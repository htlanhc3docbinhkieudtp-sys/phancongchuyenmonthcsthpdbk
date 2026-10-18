import { ClassGroup, Subject, Teacher, Assignment, TimetableSlot, SchoolLevel, GradeLevel } from '../types';

export type ExamPeriod = 'GK1' | 'CK1' | 'GK2' | 'CK2';

export const EXAM_PERIODS: Array<{ id: ExamPeriod; name: string; shortName: string; description: string }> = [
  { id: 'GK1', name: 'Kiểm tra Giữa Học kỳ 1', shortName: 'Giữa HK1', description: 'Đợt kiểm tra tập trung Giữa HK1 (Tuần 8 - 10)' },
  { id: 'CK1', name: 'Kiểm tra Cuối Học kỳ 1', shortName: 'Cuối HK1', description: 'Đợt kiểm tra tập trung Cuối HK1 (Tuần 16 - 18)' },
  { id: 'GK2', name: 'Kiểm tra Giữa Học kỳ 2', shortName: 'Giữa HK2', description: 'Đợt kiểm tra tập trung Giữa HK2 (Tuần 26 - 28)' },
  { id: 'CK2', name: 'Kiểm tra Cuối Học kỳ 2', shortName: 'Cuối HK2', description: 'Đợt kiểm tra tập trung Cuối HK2 (Tuần 33 - 35)' },
];

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
  teachers: TeacherTeachingStat[];
  defaultDuration: number;
  defaultFormat: string;
}

export interface ExamProposalRecord {
  primaryTeacherId: string;
  primaryTeacherName: string;
  reserveTeacherId?: string;
  reserveTeacherName?: string;
  durationMinutes: number;
  examFormat: string;
  deadline?: string;
  notes?: string;
  updatedAt?: number;
}

export type ExamProposalMap = Record<string, ExamProposalRecord>;

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

      // Only include if either teachers are assigned or classes exist
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
        defaultDuration: subRule.defaultDuration,
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

  // Primary source: Timetable slots (contains actual teaching teacher)
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

  // Secondary source: Assignments (supplements any missing classes or period quotas)
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

  // Sort teachers by number of classes taught descending (most experienced/teaching load first)
  return list.sort((a, b) => {
    if (b.classCount !== a.classCount) return b.classCount - a.classCount;
    return a.teacherName.localeCompare(b.teacherName);
  });
}

/**
 * Storage key for exam proposals
 */
export function getExamProposalsStorageKey(academicYear: string, period: ExamPeriod): string {
  const cleanYear = academicYear.replace(/\s+/g, '_');
  return `docbinhkieu_exam_proposals_${cleanYear}_${period}`;
}

/**
 * Load exam proposals from localStorage
 */
export function loadExamProposals(academicYear: string, period: ExamPeriod): ExamProposalMap {
  try {
    const key = getExamProposalsStorageKey(academicYear, period);
    const data = localStorage.getItem(key);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load exam proposals', e);
  }
  return {};
}

/**
 * Save exam proposals to localStorage
 */
export function saveExamProposals(academicYear: string, period: ExamPeriod, map: ExamProposalMap): void {
  try {
    const key = getExamProposalsStorageKey(academicYear, period);
    localStorage.setItem(key, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save exam proposals', e);
  }
}

/**
 * Auto propose exam makers based on highest class teaching load in the grade
 */
export function generateAutoExamProposals(items: FocusedExamSubjectItem[]): ExamProposalMap {
  const proposals: ExamProposalMap = {};

  items.forEach(item => {
    if (item.teachers.length > 0) {
      const primary = item.teachers[0];
      const reserve = item.teachers.length > 1 ? item.teachers[1] : undefined;

      proposals[item.id] = {
        primaryTeacherId: primary.teacherId,
        primaryTeacherName: primary.teacherName,
        reserveTeacherId: reserve?.teacherId,
        reserveTeacherName: reserve?.teacherName,
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
 * Export exam proposal statistics to Excel
 */
export async function exportExamProposalsToExcel(
  items: FocusedExamSubjectItem[],
  proposals: ExamProposalMap,
  academicYear: string = '2026 - 2027',
  period: ExamPeriod = 'GK1'
): Promise<void> {
  const XLSX = await import('xlsx');
  const periodInfo = EXAM_PERIODS.find(p => p.id === period) || EXAM_PERIODS[0];

  const rows: any[][] = [];

  // Header Title
  rows.push(['SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP', '', '', '', '', '', '', '', '', '']);
  rows.push(['TRƯỜNG THPT ĐỐC BINH KIỀU', '', '', '', '', '', '', '', '', '']);
  rows.push([]);
  rows.push([`BẢNG ĐỀ XUẤT PHÂN CÔNG NGƯỜI RA ĐỀ KIỂM TRA TẬP TRUNG`]);
  rows.push([`KỲ KIỂM TRA: ${periodInfo.name.toUpperCase()} - NĂM HỌC ${academicYear}`]);
  rows.push([`Ngày xuất bảng: ${new Date().toLocaleDateString('vi-VN')} | Tài liệu mật - Ban Giám Hiệu`]);
  rows.push([]);

  // Table Columns
  rows.push([
    'STT',
    'Cấp học',
    'Khối',
    'Môn kiểm tra',
    'Tổng số lớp',
    'Thống kê GV giảng dạy & Số lớp phụ trách',
    'Người ra đề CHÍNH',
    'Người ra đề DỰ BỊ / PHẢN BIỆN',
    'Thời lượng (phút)',
    'Hình thức kiểm tra',
    'Ghi chú phân công',
    'Trạng thái',
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

    const status = prop?.primaryTeacherName ? 'ĐÃ PHÂN CÔNG' : 'CHƯA CHỌN';

    rows.push([
      index + 1,
      item.level,
      item.gradeLabel,
      item.subjectName,
      item.totalClassesInGrade,
      teacherSummary,
      prop?.primaryTeacherName || '---',
      prop?.reserveTeacherName || '---',
      prop?.durationMinutes || item.defaultDuration,
      prop?.examFormat || item.defaultFormat,
      prop?.notes || '',
      status,
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
    { wch: 14 }, // Tổng số lớp
    { wch: 55 }, // Thống kê GV
    { wch: 26 }, // Đề chính
    { wch: 26 }, // Đề dự bị
    { wch: 16 }, // Thời lượng
    { wch: 24 }, // Hình thức
    { wch: 30 }, // Ghi chú
    { wch: 16 }, // Trạng thái
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `De_Xuat_${period}`);

  const fileName = `De_Xuat_Ra_De_Kiem_Tra_${period}_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
