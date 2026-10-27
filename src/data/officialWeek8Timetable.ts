import { TimetableSlot, SchoolTimetable, ClassGroup, Subject, Teacher } from '../types';
import { OFFICIAL_WEEK_7_SLOTS } from './officialWeek7Timetable';

/**
 * Official Week 8 Timetable Slots (Áp dụng từ 26/10/2026 đến 31/10/2026)
 * Thời khóa biểu Tuần 8 không thay đổi, được sao chép nguyên vẹn 100% từ Tuần 7
 * Tổng số tiết: 1538 (Điểm chính THPT: 397 tiết, Điểm ĐBK THCS: 673 tiết, Điểm TK THCS: 468 tiết)
 */
export const OFFICIAL_WEEK_8_SLOTS: TimetableSlot[] = OFFICIAL_WEEK_7_SLOTS.map(slot => ({
  ...slot,
  id: slot.id.includes('_w') ? slot.id.replace(/_w\d+_/, '_w8_') : `${slot.id}_w8`
}));

export function buildOfficialWeek8Timetable(academicYear: string = '2026 - 2027'): SchoolTimetable {
  return {
    id: 'tkb_hk1_tuan8',
    academicYear,
    semester: 'HK1',
    weekNumber: 8,
    appliedDate: 'Áp dụng Tuần 8 (từ 26/10/2026 đến 31/10/2026)',
    title: 'Thời khóa biểu Tuần 8 (Áp dụng từ 26/10 đến 31/10)',
    slots: OFFICIAL_WEEK_8_SLOTS,
    updatedAt: Date.now(),
    notes: 'Thời khóa biểu Tuần 8 không đổi, sao chép nguyên vẹn từ Tuần 7 (áp dụng từ 26/10/2026 đến 31/10/2026)'
  };
}

export async function loadOfficialWeek8Timetable(
  academicYear: string = '2026 - 2027',
  _classes?: ClassGroup[],
  _subjects?: Subject[],
  _teachers?: Teacher[]
): Promise<SchoolTimetable> {
  return buildOfficialWeek8Timetable(academicYear);
}
