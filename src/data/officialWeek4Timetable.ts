import { SchoolTimetable, ClassGroup, Subject, Teacher } from '../types';
import { parseVietSchoolTimetable } from '../utils/vietSchoolImportHelper';
import morningWorkbookUrl from '../../TKB/TKB 28.09.2026 SÁNG TUẦN 4.xlsx?url';
import afternoonWorkbookUrl from '../../TKB/TKB 28.09.2026 CHIỀU TUẦN 4.xlsx?url';

export async function loadOfficialWeek4Timetable(
  academicYear: string,
  classes: ClassGroup[],
  subjects: Subject[],
  teachers: Teacher[]
): Promise<SchoolTimetable> {
  const workbookUrls = [morningWorkbookUrl, afternoonWorkbookUrl];
  const results = await Promise.all(workbookUrls.map(async url => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Không thể tải tệp thời khóa biểu tuần 4: ${response.status}`);
    }
    return parseVietSchoolTimetable(await response.arrayBuffer(), classes, subjects, teachers);
  }));

  const failures = results.flatMap(result => [
    ...result.errors,
    ...result.unrecognizedClasses.map(name => `Chưa nhận dạng lớp: ${name}`),
    ...result.unrecognizedTeachers.map(name => `Chưa nhận dạng giáo viên: ${name}`)
  ]);
  const slots = results.flatMap(result => result.slots);
  const uniqueKeys = new Set(slots.map(slot => `${slot.classId}_${slot.dayOfWeek}_${slot.session}_${slot.period}`));
  if (failures.length || results.some(result => result.slots.length === 0) || uniqueKeys.size !== slots.length) {
    throw new Error(`Không thể nạp đầy đủ TKB tuần 4: ${failures.join('; ') || 'có tiết bị trùng'}`);
  }

  return {
    id: 'tkb_HK1_tuan4',
    academicYear,
    semester: 'HK1',
    weekNumber: 4,
    appliedDate: 'Áp dụng Tuần 4 (từ 28/09/2026 đến 03/10/2026)',
    title: 'Thời khóa biểu Tuần 4 (Áp dụng từ 28/09 đến 03/10)',
    slots,
    updatedAt: Date.now(),
    notes: 'Thời khóa biểu Tuần 4 được nạp từ file TKB sáng và chiều ngày 28/09/2026'
  };
}
