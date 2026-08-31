import * as XLSX from 'xlsx';
import {
  TimetableSlot,
  SchoolTimetable,
  ClassGroup,
  Subject,
  Teacher,
  Assignment,
  SchoolConfig
} from '../types';

export const DAYS_OF_WEEK = [
  { value: 2, label: 'Thứ Hai', shortLabel: 'Thứ 2' },
  { value: 3, label: 'Thứ Ba', shortLabel: 'Thứ 3' },
  { value: 4, label: 'Thứ Tư', shortLabel: 'Thứ 4' },
  { value: 5, label: 'Thứ Năm', shortLabel: 'Thứ 5' },
  { value: 6, label: 'Thứ Sáu', shortLabel: 'Thứ 6' },
  { value: 7, label: 'Thứ Bảy', shortLabel: 'Thứ 7' },
];

export const PERIODS = [1, 2, 3, 4, 5];

/**
 * Generate a smart initial timetable based on current assignments and classes
 */
export function generateInitialTimetable(
  classes: ClassGroup[],
  subjects: Subject[],
  teachers: Teacher[],
  assignments: Assignment[],
  config: SchoolConfig
): SchoolTimetable {
  const teacherMap = new Map(teachers.map(t => [t.id, t]));
  const subjectMap = new Map(subjects.map(s => [s.id, s]));
  const slots: TimetableSlot[] = [];

  // Group assignments by class
  const classAssignmentsMap = new Map<string, Assignment[]>();
  classes.forEach(c => classAssignmentsMap.set(c.id, []));
  assignments.forEach(a => {
    const list = classAssignmentsMap.get(a.classId);
    if (list) list.push(a);
  });

  // Track teacher busy slots: Map<`day_session_period_teacherId`, boolean>
  const teacherBusy = new Set<string>();

  // Determine standard session for each grade
  // THPT (10, 11, 12) & 9: Buổi Sáng, Khối 6, 7, 8: Buổi Chiều hoặc Sáng tùy trường
  classes.forEach((cls) => {
    const isMorning = ['10', '11', '12', '9'].includes(cls.grade);
    const session = isMorning ? 'SANG' : 'SANG'; // Mặc định sáng cho các lớp chính
    const classAssignments = classAssignmentsMap.get(cls.id) || [];

    // Create a pool of subject periods to place
    const periodPool: { subjectId: string; teacherId: string }[] = [];

    classAssignments.forEach(asg => {
      const pCount = Math.min(Math.round(asg.periodsPerWeek || 1), 6);
      for (let i = 0; i < pCount; i++) {
        periodPool.push({
          subjectId: asg.subjectId,
          teacherId: asg.teacherId
        });
      }
    });

    // Place Monday P1: Chào cờ / HĐTN
    const homeroomTeacher = cls.homeroomTeacherId ? teacherMap.get(cls.homeroomTeacherId) : undefined;
    slots.push({
      id: `${cls.id}_2_${session}_1`,
      classId: cls.id,
      className: cls.name,
      dayOfWeek: 2,
      session,
      period: 1,
      subjectId: 'sub-hdtn',
      subjectName: 'Chào cờ / HĐTN',
      teacherId: cls.homeroomTeacherId || '',
      teacherName: homeroomTeacher?.name || 'GVCN',
      teacherCode: homeroomTeacher?.code || 'GVCN',
      room: cls.roomNumber || cls.name,
      isSpecialActivity: true
    });

    // Place Saturday P5: Sinh hoạt lớp (SHL)
    slots.push({
      id: `${cls.id}_7_${session}_5`,
      classId: cls.id,
      className: cls.name,
      dayOfWeek: 7,
      session,
      period: 5,
      subjectId: 'sub-shl',
      subjectName: 'Sinh hoạt lớp',
      teacherId: cls.homeroomTeacherId || '',
      teacherName: homeroomTeacher?.name || 'GVCN',
      teacherCode: homeroomTeacher?.code || 'GVCN',
      room: cls.roomNumber || cls.name,
      isSpecialActivity: true
    });

    // Fill remaining slots
    let poolIndex = 0;
    for (let day = 2; day <= 7; day++) {
      for (let period = 1; period <= 5; period++) {
        // Skip already filled special slots
        if (day === 2 && period === 1) continue;
        if (day === 7 && period === 5) continue;

        if (poolIndex < periodPool.length) {
          // Find an item in pool whose teacher is not busy
          let chosenIndex = -1;
          for (let i = poolIndex; i < periodPool.length; i++) {
            const item = periodPool[i];
            const busyKey = `${day}_${session}_${period}_${item.teacherId}`;
            if (!teacherBusy.has(busyKey)) {
              chosenIndex = i;
              break;
            }
          }

          if (chosenIndex === -1) {
            // Teacher collision unavoidable, take next available
            chosenIndex = poolIndex;
          }

          // Swap to poolIndex
          const item = periodPool[chosenIndex];
          if (chosenIndex !== poolIndex) {
            periodPool[chosenIndex] = periodPool[poolIndex];
            periodPool[poolIndex] = item;
          }

          const teacher = teacherMap.get(item.teacherId);
          const subject = subjectMap.get(item.subjectId);

          if (item.teacherId) {
            teacherBusy.add(`${day}_${session}_${period}_${item.teacherId}`);
          }

          slots.push({
            id: `${cls.id}_${day}_${session}_${period}`,
            classId: cls.id,
            className: cls.name,
            dayOfWeek: day,
            session,
            period,
            subjectId: item.subjectId,
            subjectName: subject?.name || subject?.shortName || 'Môn học',
            teacherId: item.teacherId,
            teacherName: teacher?.name || '',
            teacherCode: teacher?.code || '',
            room: cls.roomNumber || cls.name
          });

          poolIndex++;
        } else {
          // Empty period
          slots.push({
            id: `${cls.id}_${day}_${session}_${period}`,
            classId: cls.id,
            className: cls.name,
            dayOfWeek: day,
            session,
            period,
            room: cls.roomNumber || cls.name
          });
        }
      }
    }
  });

  return {
    id: `tkb_${config.semester || 'HK1'}_${Date.now()}`,
    academicYear: config.academicYear || '2026 - 2027',
    semester: config.semester || 'HK1',
    appliedDate: 'Thực hiện từ ngày 05/09/2026',
    title: `Thời Khóa Biểu Toàn Trường - ${config.semester === 'HK2' ? 'Học kỳ II' : 'Học kỳ I'} Năm học ${config.academicYear || '2026 - 2027'}`,
    slots,
    updatedAt: Date.now(),
    notes: 'TKB chính thức áp dụng cho cả 3 điểm trường (THPT, THCS Đốc Binh Kiều, THCS Tân Kiều)'
  };
}

/**
 * Export Timetable to Excel with full sheets and formatting
 */
export function exportTimetableToExcel(
  timetable: SchoolTimetable,
  classes: ClassGroup[],
  teachers: Teacher[],
  config: SchoolConfig
) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet 1: Tổng hợp TKB toàn trường (Dạng ma trận Lớp x Các Thứ)
  const masterData: (string | number)[][] = [
    [`THỜI KHÓA BIỂU TOÀN TRƯỜNG - TRƯỜNG THCS & THPT ĐỐC BINH KIỀU`],
    [`Năm học: ${config.academicYear || '2026 - 2027'} • Học kỳ: ${config.semester || 'HK1'} • ${timetable.appliedDate || ''}`],
    [],
    [
      'STT',
      'Điểm trường',
      'Khối',
      'Lớp',
      'GVCN',
      'Phòng',
      'Buổi',
      // Thứ 2 (T1-T5)
      'T2 - Tiết 1', 'T2 - Tiết 2', 'T2 - Tiết 3', 'T2 - Tiết 4', 'T2 - Tiết 5',
      // Thứ 3 (T1-T5)
      'T3 - Tiết 1', 'T3 - Tiết 2', 'T3 - Tiết 3', 'T3 - Tiết 4', 'T3 - Tiết 5',
      // Thứ 4 (T1-T5)
      'T4 - Tiết 1', 'T4 - Tiết 2', 'T4 - Tiết 3', 'T4 - Tiết 4', 'T4 - Tiết 5',
      // Thứ 5 (T1-T5)
      'T5 - Tiết 1', 'T5 - Tiết 2', 'T5 - Tiết 3', 'T5 - Tiết 4', 'T5 - Tiết 5',
      // Thứ 6 (T1-T5)
      'T6 - Tiết 1', 'T6 - Tiết 2', 'T6 - Tiết 3', 'T6 - Tiết 4', 'T6 - Tiết 5',
      // Thứ 7 (T1-T5)
      'T7 - Tiết 1', 'T7 - Tiết 2', 'T7 - Tiết 3', 'T7 - Tiết 4', 'T7 - Tiết 5',
    ]
  ];

  const teacherMap = new Map(teachers.map(t => [t.id, t]));
  const slotMap = new Map<string, TimetableSlot>();
  timetable.slots.forEach(slot => {
    slotMap.set(`${slot.classId}_${slot.dayOfWeek}_${slot.session}_${slot.period}`, slot);
  });

  classes.forEach((cls, idx) => {
    const campusName = cls.campus === 'THPTDBK' || cls.level === 'THPT'
      ? 'THPT'
      : cls.campus === 'THCSTK'
      ? 'THCS Tân Kiều'
      : 'THCS Đốc Binh Kiều';
    const homeroomName = cls.homeroomTeacherId ? (teacherMap.get(cls.homeroomTeacherId)?.name || '') : '';
    const session = 'SANG';

    const row: (string | number)[] = [
      idx + 1,
      campusName,
      `Khối ${cls.grade}`,
      cls.name,
      homeroomName,
      cls.roomNumber || cls.name,
      session === 'SANG' ? 'Sáng' : 'Chiều'
    ];

    for (let day = 2; day <= 7; day++) {
      for (let p = 1; p <= 5; p++) {
        const slot = slotMap.get(`${cls.id}_${day}_${session}_${p}`);
        if (slot && slot.subjectName) {
          const tText = slot.teacherCode || slot.teacherName ? ` (${slot.teacherCode || slot.teacherName})` : '';
          row.push(`${slot.subjectName}${tText}`);
        } else {
          row.push('');
        }
      }
    }

    masterData.push(row);
  });

  const wsMaster = XLSX.utils.aoa_to_sheet(masterData);
  XLSX.utils.book_append_sheet(wb, wsMaster, 'TKB Toan Truong');

  // 2. Sheet 2: Danh sách chi tiết từng tiết (Dạng danh sách để dễ import/phân tích)
  const detailData: (string | number)[][] = [
    ['Lớp', 'Thứ', 'Buổi', 'Tiết', 'Môn Học', 'Giáo Viên Giảng Dạy', 'Mã GV', 'Phòng Học', 'Ghi Chú']
  ];

  timetable.slots.forEach(s => {
    if (s.subjectName) {
      detailData.push([
        s.className || s.classId,
        s.dayOfWeek,
        s.session === 'SANG' ? 'Sáng' : 'Chiều',
        s.period,
        s.subjectName || '',
        s.teacherName || '',
        s.teacherCode || '',
        s.room || '',
        s.note || ''
      ]);
    }
  });

  const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Chi Tiet Tung Tiet');

  // Write file
  const fileName = `TKB_${config.academicYear.replace(/[^a-zA-Z0-9]/g, '_')}_${config.semester}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Parse Excel / CSV / JSON to Timetable slots
 */
export function parseImportedTimetable(
  fileData: ArrayBuffer | string,
  classes: ClassGroup[],
  subjects: Subject[],
  teachers: Teacher[]
): { slots: TimetableSlot[]; errors: string[]; successCount: number } {
  const errors: string[] = [];
  const slots: TimetableSlot[] = [];

  const classByName = new Map<string, ClassGroup>();
  classes.forEach(c => {
    classByName.set(c.name.trim().toLowerCase(), c);
    classByName.set(c.id.toLowerCase(), c);
  });

  const teacherByName = new Map<string, Teacher>();
  teachers.forEach(t => {
    teacherByName.set(t.name.trim().toLowerCase(), t);
    teacherByName.set(t.code.trim().toLowerCase(), t);
    teacherByName.set(t.id.toLowerCase(), t);
  });

  const subjectByName = new Map<string, Subject>();
  subjects.forEach(s => {
    subjectByName.set(s.name.trim().toLowerCase(), s);
    subjectByName.set(s.shortName.trim().toLowerCase(), s);
    subjectByName.set(s.id.toLowerCase(), s);
  });

  try {
    let rawRows: any[] = [];

    if (typeof fileData === 'string' && fileData.trim().startsWith('[')) {
      // JSON Array
      rawRows = JSON.parse(fileData);
    } else {
      // Excel or CSV Buffer
      const workbook = XLSX.read(fileData, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    }

    if (!rawRows || rawRows.length === 0) {
      return { slots: [], errors: ['Tập tin không có dữ liệu'], successCount: 0 };
    }

    // Check if it's Table/List format or Master Grid format
    const headerRow = (rawRows[0] || []).map((h: any) => String(h || '').trim().toLowerCase());
    const isDetailList = headerRow.some((h: string) => h.includes('lớp') || h.includes('class')) &&
                         headerRow.some((h: string) => h.includes('thứ') || h.includes('day'));

    if (isDetailList) {
      // Format: Lớp | Thứ | Buổi | Tiết | Môn | Giáo viên | Mã GV | Phòng
      const colLop = headerRow.findIndex((h: string) => h.includes('lớp') || h.includes('class'));
      const colThu = headerRow.findIndex((h: string) => h.includes('thứ') || h.includes('day'));
      const colBuoi = headerRow.findIndex((h: string) => h.includes('buổi') || h.includes('session'));
      const colTiet = headerRow.findIndex((h: string) => h.includes('tiết') || h.includes('period'));
      const colMon = headerRow.findIndex((h: string) => h.includes('môn') || h.includes('subject'));
      const colGv = headerRow.findIndex((h: string) => h.includes('giáo viên') || h.includes('gv') || h.includes('teacher'));
      const colMaGv = headerRow.findIndex((h: string) => h.includes('mã gv') || h.includes('code'));
      const colPhong = headerRow.findIndex((h: string) => h.includes('phòng') || h.includes('room'));

      for (let i = 1; i < rawRows.length; i++) {
        const r = rawRows[i];
        if (!r || r.length === 0) continue;

        const classNameRaw = String(r[colLop] || '').trim();
        if (!classNameRaw) continue;

        const targetClass = classByName.get(classNameRaw.toLowerCase());
        if (!targetClass) {
          errors.push(`Dòng ${i + 1}: Không tìm thấy lớp "${classNameRaw}" trong danh sách 28 lớp của trường.`);
          continue;
        }

        let dayVal = parseInt(String(r[colThu] || '2').replace(/[^0-9]/g, ''), 10);
        if (isNaN(dayVal) || dayVal < 2 || dayVal > 7) dayVal = 2;

        const sessionRaw = colBuoi >= 0 ? String(r[colBuoi] || '').toLowerCase() : '';
        const session: 'SANG' | 'CHIEU' = sessionRaw.includes('chiều') || sessionRaw.includes('chieu') || sessionRaw.includes('afternoon')
          ? 'CHIEU'
          : 'SANG';

        let periodVal = parseInt(String(r[colTiet] || '1').replace(/[^0-9]/g, ''), 10);
        if (isNaN(periodVal) || periodVal < 1 || periodVal > 5) periodVal = 1;

        const subjectNameRaw = colMon >= 0 ? String(r[colMon] || '').trim() : '';
        const teacherNameRaw = colGv >= 0 ? String(r[colGv] || '').trim() : '';
        const teacherCodeRaw = colMaGv >= 0 ? String(r[colMaGv] || '').trim() : '';
        const roomRaw = colPhong >= 0 ? String(r[colPhong] || '').trim() : targetClass.roomNumber;

        const matchedSubject = subjectByName.get(subjectNameRaw.toLowerCase());
        const matchedTeacher = teacherByName.get(teacherCodeRaw.toLowerCase()) || teacherByName.get(teacherNameRaw.toLowerCase());

        slots.push({
          id: `${targetClass.id}_${dayVal}_${session}_${periodVal}`,
          classId: targetClass.id,
          className: targetClass.name,
          dayOfWeek: dayVal,
          session,
          period: periodVal,
          subjectId: matchedSubject?.id || '',
          subjectName: matchedSubject?.name || subjectNameRaw,
          teacherId: matchedTeacher?.id || '',
          teacherName: matchedTeacher?.name || teacherNameRaw,
          teacherCode: matchedTeacher?.code || teacherCodeRaw,
          room: roomRaw || targetClass.name
        });
      }
    } else {
      // Try parsing Matrix format or generic format
      errors.push('Định dạng chưa nhận diện được hoàn toàn, vui lòng dùng Mẫu Excel chuẩn của hệ thống để nhập chính xác nhất.');
    }
  } catch (err: any) {
    errors.push(`Lỗi khi đọc tệp: ${err?.message || 'Không thể giải mã dữ liệu'}`);
  }

  return {
    slots,
    errors,
    successCount: slots.length
  };
}

/**
 * Generate sample CSV template for download
 */
export function getTimetableSampleCSV(): string {
  return `Lớp,Thứ,Buổi,Tiết,Môn Học,Giáo Viên Giảng Dạy,Mã GV,Phòng Học,Ghi Chú
10A1,2,Sáng,1,Chào cờ / HĐTN,Đoàn Kiều.T,Kiều.ĐT,P.101,Sinh hoạt toàn trường
10A1,2,Sáng,2,Toán,Đoàn Kiều.T,Kiều.ĐT,P.101,
10A1,2,Sáng,3,Toán,Đoàn Kiều.T,Kiều.ĐT,P.101,
10A1,2,Sáng,4,Ngữ văn,Lê Văn Anh,Anh.LV,P.101,
10A1,2,Sáng,5,Tiếng Anh,Phạm Thị Hoa,Hoa.PT,P.101,
10A2,2,Sáng,1,Chào cờ / HĐTN,Trần Văn Bình,Bình.TV,P.102,
10A2,2,Sáng,2,Ngữ văn,Lê Văn Anh,Anh.LV,P.102,
10A2,2,Sáng,3,Toán,Nguyễn Văn Cường,Cường.NV,P.102,
6A1,2,Sáng,1,Chào cờ / HĐTN,Hoàng Văn Giang,Giang.HV,P.201,ĐBK
6A1,2,Sáng,2,Toán,Hoàng Văn Giang,Giang.HV,P.201,
6/1,2,Sáng,1,Chào cờ / HĐTN,Phạm Văn Nam,Nam.PV,P.TK1,Tân Kiều`;
}
