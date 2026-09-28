import {
  Teacher,
  Assignment,
  ClassGroup,
  Department,
  Subject,
  SchoolConfig,
  WorkloadStats
} from '../types';
import { getTeacherDutiesList } from './workloadCalculator';

export async function exportComprehensiveExcel(
  config: SchoolConfig,
  departments: Department[],
  subjects: Subject[],
  classes: ClassGroup[],
  teachers: Teacher[],
  assignments: Assignment[],
  workloads: WorkloadStats[]
) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const teacherMap = new Map(teachers.map(t => [t.id, t]));
  const deptMap = new Map(departments.map(d => [d.id, d.name]));

  const displayAcademicYear = (!config.academicYear || config.academicYear.includes('2024'))
    ? '2026 - 2027'
    : config.academicYear;

  const displaySemester = config.semester === 'HK1' ? 'HỌC KỲ I' : 'HỌC KỲ II';
  const displayVicePrincipal = (config.vicePrincipalName && config.vicePrincipalName.includes('-'))
    ? 'Nguyễn Minh Trí'
    : (config.vicePrincipalName || 'Nguyễn Minh Trí');

  const getSubjectsForLevel = (level: 'THPT' | 'THCS') => subjects.filter(sub => {
    if (sub.id === 'sub-nv') return false;
    if (sub.id === 'sub-qpan' || sub.id === 'sub-hdtn-shl') return false;
    const grades = level === 'THPT' ? ['10', '11', '12'] : ['6', '7', '8', '9'];
    return grades.some(grade => (sub.defaultPeriods[grade] || 0) > 0);
  });

  const getAssignmentForSubject = (classId: string, subjectId: string) => {
    const subjectIds = subjectId === 'sub-gdqp'
      ? ['sub-gdqp', 'sub-qpan']
      : subjectId === 'sub-shl'
      ? ['sub-shl']
      : subjectId === 'sub-hdtn-qml'
      ? ['sub-hdtn-qml', 'sub-hdtn-shl']
      : [subjectId];
    const assignment = assignments.find(a => a.classId === classId && subjectIds.includes(a.subjectId));
    if (assignment || !['sub-su', 'sub-dia'].includes(subjectId)) return assignment;

    return assignments.find(a => a.classId === classId && a.subjectId === 'sub-lsdl-cs');
  };

  // Helper function to build a formatted matrix worksheet for a level
  const buildLevelSheet = (level: 'THPT' | 'THCS') => {
    const isThpt = level === 'THPT';
    const levelClasses = classes.filter(c => c.level === level);
    const levelSubjects = getSubjectsForLevel(level);

    const rows: any[][] = [];

    // 1. National Administrative Header (Nghị định 30/2020/NĐ-CP)
    rows.push([
      config.subTitle.toUpperCase(),
      '',
      '',
      '',
      '',
      'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'
    ]);
    rows.push([
      config.schoolName.toUpperCase(),
      '',
      '',
      '',
      '',
      'Độc lập - Tự do - Hạnh phúc'
    ]);
    rows.push([]);

    // 2. Document Title
    rows.push([
      `BẢNG TỔNG HỢP PHÂN CÔNG CHUYÊN MÔN GIẢNG DẠY - CẤP ${isThpt ? 'THPT (KHỐI 10 - 12)' : 'THCS (KHỐI 6 - 9)'}`
    ]);
    rows.push([
      `${displaySemester} - NĂM HỌC ${displayAcademicYear} (Chương trình GDPT 2018)`
    ]);
    rows.push([]);

    // 3. Column Headers
    const colHeaders: string[] = [
      'STT',
      'Lớp',
      'Khối',
      'Sĩ số',
      'Giáo viên Chủ nhiệm (GVCN)'
    ];

    levelSubjects.forEach(sub => {
      const p = sub.defaultPeriods[isThpt ? '10' : '6'] || 0;
      colHeaders.push(`${sub.name} (${p}t)`);
    });

    if (isThpt) {
      colHeaders.push('Chuyên đề 1 (CĐ1)');
      colHeaders.push('Chuyên đề 2 (CĐ2)');
      colHeaders.push('Chuyên đề 3 (CĐ3)');
    }

    colHeaders.push('Ghi chú');
    rows.push(colHeaders);

    // 4. Data Rows
    let totalStudents = 0;
    levelClasses.forEach((cls, idx) => {
      totalStudents += cls.studentCount || 0;
      const hrTeacher = cls.homeroomTeacherId ? teacherMap.get(cls.homeroomTeacherId) : undefined;
      const hrName = hrTeacher ? `${hrTeacher.name} (${hrTeacher.code})` : '—';

      const row: any[] = [
        idx + 1,
        cls.name,
        `Khối ${cls.grade}`,
        cls.studentCount || 0,
        hrName
      ];

      levelSubjects.forEach(sub => {
        const periods = sub.defaultPeriods[cls.grade] || 0;
        if (periods === 0) {
          row.push('—');
          return;
        }

        const assignment = getAssignmentForSubject(cls.id, sub.id);
        const assignedTeacher = assignment ? teacherMap.get(assignment.teacherId) : null;
        const displayedTeacher = assignedTeacher || (
          !isThpt && sub.id === 'sub-shl' && cls.homeroomTeacherId
            ? teacherMap.get(cls.homeroomTeacherId)
            : null
        );

        if (displayedTeacher) {
          row.push(displayedTeacher.name);
        } else {
          row.push('—');
        }
      });

      if (isThpt) {
        (['cd1', 'cd2', 'cd3'] as const).forEach(key => {
          const topic = cls.specialTopics?.[key];
          if (topic) {
            const t = teacherMap.get(topic.teacherId);
            row.push(`${topic.title} - ${t ? t.name : ''}`);
          } else {
            row.push('—');
          }
        });
      }

      row.push(''); // Ghi chú
      rows.push(row);
    });

    // 5. Total Row
    const totalRow = new Array(colHeaders.length).fill('');
    totalRow[1] = 'TỔNG CỘNG';
    totalRow[2] = `${levelClasses.length} lớp`;
    totalRow[3] = totalStudents;
    rows.push(totalRow);

    // 6. Signature Blocks
    rows.push([]);
    rows.push([]);
    const dateRow = new Array(colHeaders.length).fill('');
    dateRow[colHeaders.length - 3] = 'Đồng Tháp, ngày ..... tháng ..... năm 2026';
    rows.push(dateRow);

    const signRow1 = new Array(colHeaders.length).fill('');
    signRow1[3] = 'NGƯỜI LẬP BẢNG';
    signRow1[colHeaders.length - 3] = 'HIỆU TRƯỞNG';
    rows.push(signRow1);

    const signRow2 = new Array(colHeaders.length).fill('');
    signRow2[3] = '(Ký và ghi rõ họ tên)';
    signRow2[colHeaders.length - 3] = '(Ký tên, đóng dấu)';
    rows.push(signRow2);

    rows.push([]);
    rows.push([]);
    rows.push([]);

    const signRow3 = new Array(colHeaders.length).fill('');
    signRow3[3] = displayVicePrincipal;
    signRow3[colHeaders.length - 3] = config.principalName || 'Lê Thanh Cường';
    rows.push(signRow3);

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Beautiful Column Widths
    const cols = [
      { wch: 6 },  // STT
      { wch: 10 }, // Lớp
      { wch: 10 }, // Khối
      { wch: 9 },  // Sĩ số
      { wch: 25 }, // GVCN
    ];

    levelSubjects.forEach(() => {
      cols.push({ wch: 18 }); // Each subject
    });

    if (isThpt) {
      cols.push({ wch: 24 }); // CĐ1
      cols.push({ wch: 24 }); // CĐ2
      cols.push({ wch: 24 }); // CĐ3
    }
    cols.push({ wch: 16 }); // Ghi chú
    ws['!cols'] = cols;

    // Page setup for printing
    ws['!pageSetup'] = {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToWidth: 1,
      fitToHeight: 0
    };

    return ws;
  };

  // ==========================================
  // SHEET 1: CẤP THPT (Khối 10 - 12)
  // ==========================================
  const wsThpt = buildLevelSheet('THPT');
  XLSX.utils.book_append_sheet(wb, wsThpt, 'THPT (Khối 10-12)');

  // ==========================================
  // SHEET 2: CẤP THCS (Khối 6 - 9)
  // ==========================================
  const wsThcs = buildLevelSheet('THCS');
  XLSX.utils.book_append_sheet(wb, wsThcs, 'THCS (Khối 6-9)');

  // ==========================================
  // SHEET 3: THỐNG KÊ ĐỊNH MỨC GIÁO VIÊN
  // ==========================================
  const statsData: any[][] = [];
  statsData.push([config.subTitle.toUpperCase(), '', '', '', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM']);
  statsData.push([config.schoolName.toUpperCase(), '', '', '', 'Độc lập - Tự do - Hạnh phúc']);
  statsData.push([]);
  statsData.push([`THỐNG KÊ ĐỊNH MỨC & PHÂN CÔNG GIẢNG DẠY - NĂM HỌC ${displayAcademicYear}`]);
  statsData.push([]);
  statsData.push([
    'STT',
    'Mã GV',
    'Họ và tên giáo viên',
    'Tổ chuyên môn',
    'Điểm trường',
    'Chức vụ / Kiêm nhiệm',
    'Chủ nhiệm lớp',
    'ĐM chuẩn',
    'Tổng giảm',
    'ĐM sau giảm',
    'Số tiết dạy',
    'Chênh lệch (+/-)',
    'Danh sách lớp & môn phụ trách'
  ]);

  workloads.forEach((w, idx) => {
    const teacher = teacherMap.get(w.teacherId);
    const dutiesStr = teacher 
      ? getTeacherDutiesList(teacher).map(d => `${d.name} (${d.reduction > 0 ? `-${d.reduction}t` : 'ĐM 2t'})`).join('; ') || 'GV bộ môn'
      : '';
    const classListStr = w.assignedClasses
      .map(c => `${c.className} (${c.subjectName}: ${c.periods}t)`)
      .join(', ');

    statsData.push([
      idx + 1,
      teacher?.code || '',
      w.teacherName,
      w.departmentName,
      teacher?.campus === 'THPTDBK' ? 'THPT ĐBK' : teacher?.campus === 'THCSDBK' ? 'THCS ĐBK' : 'THCS Tân Kiều',
      dutiesStr,
      w.homeroomClass || '',
      teacher?.baseStandardPeriods || (teacher?.campus === 'THPTDBK' ? 17 : 19),
      w.reductionPeriods,
      w.targetPeriods,
      w.assignedPeriods,
      w.balance >= 0 ? `+${w.balance}` : `${w.balance}`,
      classListStr,
    ]);
  });

  // Signatures on stats sheet
  statsData.push([]);
  statsData.push([]);
  statsData.push(['', '', '', '', 'NGƯỜI LẬP BẢNG', '', '', '', '', '', 'HIỆU TRƯỞNG']);
  statsData.push(['', '', '', '', '(Ký và ghi rõ họ tên)', '', '', '', '', '', '(Ký tên, đóng dấu)']);
  statsData.push([]);
  statsData.push([]);
  statsData.push([]);
  statsData.push(['', '', '', '', displayVicePrincipal, '', '', '', '', '', config.principalName || 'Lê Thanh Cường']);

  const wsStats = XLSX.utils.aoa_to_sheet(statsData);
  wsStats['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 24 },
    { wch: 22 },
    { wch: 14 },
    { wch: 28 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 45 }
  ];
  wsStats['!pageSetup'] = { orientation: 'landscape', paperSize: 9, fitToWidth: 1, fitToHeight: 0 };
  XLSX.utils.book_append_sheet(wb, wsStats, 'Thống Kê Định Mức GV');

  // Trigger download
  const fileName = `Bang_Tong_Hop_Phan_Cong_Chuyen_Mon_${displayAcademicYear.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export async function generateExcelTemplate() {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // Template 1: Danh sách giáo viên
  const gvHeaders = [
    ['MẪU NHẬP DANH SÁCH GIÁO VIÊN & ĐỊNH MỨC'],
    ['Mã GV', 'Họ và tên', 'Giới tính (Nam/Nữ)', 'Tổ chuyên môn', 'Môn giảng dạy', 'Chức vụ (GVBM/ToTruong/ToPho/BiThuDoan)', 'Định mức chuẩn (17)', 'SĐT', 'Email'],
    ['Hùng.NV', 'Nguyễn Văn Hùng', 'Nam', 'Tổ Toán - Tin học', 'Toán học', 'ToTruong', 17, '0912345678', 'hung@moet.edu.vn'],
    ['Thảo.LTT', 'Lê Thị Thu Thảo', 'Nữ', 'Tổ Ngữ văn', 'Ngữ văn', 'ToTruong', 17, '0903555666', 'thao@moet.edu.vn'],
    ['Nhi.PTY', 'Phan Thị Yến Nhi', 'Nữ', 'Tổ Tiếng Anh', 'Tiếng Anh', 'GVBM', 17, '0979888999', 'nhi@moet.edu.vn'],
  ];
  const wsGV = XLSX.utils.aoa_to_sheet(gvHeaders);
  XLSX.utils.book_append_sheet(wb, wsGV, 'DanhSachGiaoVien');

  // Template 2: Phân công lớp - môn
  const pcHeaders = [
    ['MẪU PHÂN CÔNG GIẢNG DẠY (LỚP - MÔN - GIÁO VIÊN)'],
    ['Tên Lớp', 'Môn học', 'Tên Giáo viên giảng dạy', 'Số tiết/tuần', 'Ghi chú'],
    ['10A1', 'Toán học', 'Nguyễn Văn Hùng', 4, ''],
    ['10A1', 'Ngữ văn', 'Lê Thị Thu Thảo', 4, ''],
    ['10A1', 'Tiếng Anh', 'Phan Thị Yến Nhi', 3, ''],
    ['10A2', 'Toán học', 'Nguyễn Văn Hùng', 4, ''],
    ['10A2', 'Ngữ văn', 'Lê Thị Thu Thảo', 4, ''],
  ];
  const wsPC = XLSX.utils.aoa_to_sheet(pcHeaders);
  XLSX.utils.book_append_sheet(wb, wsPC, 'PhanCongGiangDay');

  XLSX.writeFile(wb, 'Mau_Nhap_Phan_Cong_Chuyen_Mon_Doc_Binh_Kieu.xlsx');
}

export interface ExcelImportResult {
  teachersImported: number;
  assignmentsImported: number;
  classesImported: number;
  errors: string[];
  newTeachers?: Partial<Teacher>[];
  newAssignments?: Partial<Assignment>[];
}

export function parsePastedData(
  text: string,
  currentTeachers: Teacher[],
  currentClasses: ClassGroup[],
  currentSubjects: Subject[],
  currentDepartments: Department[]
): ExcelImportResult {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) {
    throw new Error('Dữ liệu dán vào trống. Vui lòng copy các dòng từ bảng Excel.');
  }

  const errors: string[] = [];
  let teachersImported = 0;
  let assignmentsImported = 0;
  let classesImported = 0;

  const importedTeachers: Partial<Teacher>[] = [];
  const importedAssignments: Partial<Assignment>[] = [];

  // Parse lines as tab-separated or comma/semicolon-separated
  const rows = lines.map(line => {
    if (line.includes('\t')) return line.split('\t').map(c => c.trim());
    if (line.includes(';')) return line.split(';').map(c => c.trim());
    if (line.includes(',')) return line.split(',').map(c => c.trim());
    return line.split(/\s{2,}/).map(c => c.trim());
  });

  // Find header if any
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const rowStr = rows[i].map(c => c.toLowerCase()).join(' ');
    if (rowStr.includes('giáo viên') || rowStr.includes('họ và tên') || rowStr.includes('môn') || rowStr.includes('lớp') || rowStr.includes('tổ')) {
      headerIdx = i;
      break;
    }
  }

  const startRow = headerIdx !== -1 ? headerIdx + 1 : 0;
  const headers = headerIdx !== -1 ? rows[headerIdx].map(c => c.toLowerCase()) : [];

  // Case 1: Lớp - Môn - GV (hoặc các cột tương tự)
  const classColIdx = headers.findIndex(h => /lớp|tên lớp|class/i.test(h));
  const subColIdx = headers.findIndex(h => /môn|môn học|subject/i.test(h));
  const teacherColIdx = headers.findIndex(h => /giáo viên|gv|họ và tên|gv dạy|tên gv/i.test(h));

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (row.length < 2) continue;

    // If matches Lớp, Môn, GV
    if (classColIdx !== -1 && subColIdx !== -1 && teacherColIdx !== -1) {
      const className = row[classColIdx];
      const subName = row[subColIdx];
      const teacherName = row[teacherColIdx];

      const matchedClass = currentClasses.find(c => c.name.toLowerCase() === className.toLowerCase());
      const matchedSubject = currentSubjects.find(
        s => s.name.toLowerCase().includes(subName.toLowerCase()) || subName.toLowerCase().includes(s.shortName.toLowerCase())
      );
      const matchedTeacher = currentTeachers.find(
        t => t.name.toLowerCase().includes(teacherName.toLowerCase()) || teacherName.toLowerCase().includes(t.name.toLowerCase())
      );

      if (matchedClass && matchedSubject && matchedTeacher) {
        importedAssignments.push({
          id: `paste-${matchedClass.id}-${matchedSubject.id}`,
          classId: matchedClass.id,
          subjectId: matchedSubject.id,
          teacherId: matchedTeacher.id,
          periodsPerWeek: matchedSubject.defaultPeriods[matchedClass.grade] || 2,
        });
        assignmentsImported++;
      }
    } else {
      // Heuristic row check:
      // Try to find teacher or class or subject in row items
      let foundTeacher: Teacher | undefined;
      let foundClass: ClassGroup | undefined;
      let foundSubject: Subject | undefined;

      row.forEach(cell => {
        const cLower = cell.toLowerCase();
        if (!foundClass) {
          foundClass = currentClasses.find(cls => cls.name.toLowerCase() === cLower);
        }
        if (!foundSubject) {
          foundSubject = currentSubjects.find(s => s.name.toLowerCase() === cLower || s.shortName.toLowerCase() === cLower || cLower.includes(s.name.toLowerCase()));
        }
        if (!foundTeacher) {
          foundTeacher = currentTeachers.find(t => t.name.toLowerCase() === cLower || cLower.includes(t.name.toLowerCase()) || (t.code && cLower === t.code.toLowerCase()));
        }
      });

      // If found both class, subject, and teacher
      if (foundClass && foundSubject && foundTeacher) {
        importedAssignments.push({
          id: `paste-h-${(foundClass as ClassGroup).id}-${(foundSubject as Subject).id}`,
          classId: (foundClass as ClassGroup).id,
          subjectId: (foundSubject as Subject).id,
          teacherId: (foundTeacher as Teacher).id,
          periodsPerWeek: (foundSubject as Subject).defaultPeriods[(foundClass as ClassGroup).grade] || 2,
        });
        assignmentsImported++;
      } else if (foundTeacher && !foundClass && !foundSubject) {
        // Teacher listing
        teachersImported++;
      }
    }
  }

  return {
    teachersImported,
    assignmentsImported,
    classesImported,
    errors,
    newTeachers: importedTeachers,
    newAssignments: importedAssignments,
  };
}

export async function parseExcelFile(
  file: File,
  currentTeachers: Teacher[],
  currentClasses: ClassGroup[],
  currentSubjects: Subject[],
  currentDepartments: Department[]
): Promise<ExcelImportResult> {
  const XLSX = await import('xlsx');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const errors: string[] = [];
        let teachersImported = 0;
        let assignmentsImported = 0;
        let classesImported = 0;

        const importedTeachers: Partial<Teacher>[] = [];
        const importedAssignments: Partial<Assignment>[] = [];

        // Check sheets
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

          if (rows.length === 0) return;

          // Find header row in sheet
          let headerIdx = -1;
          for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const rowStr = rows[i].map(c => String(c).toLowerCase().trim()).join(' ');
            if (rowStr.includes('giáo viên') || rowStr.includes('họ và tên') || rowStr.includes('môn') || rowStr.includes('lớp')) {
              headerIdx = i;
              break;
            }
          }

          if (headerIdx === -1) return;

          const headers = rows[headerIdx].map(c => String(c).trim());

          // Case A: Table of Assignments (Lớp, Môn, Giáo viên)
          const classColIdx = headers.findIndex(h => /lớp|tên lớp|class/i.test(h));
          const subColIdx = headers.findIndex(h => /môn|môn học|subject/i.test(h));
          const teacherColIdx = headers.findIndex(h => /giáo viên|gv|họ và tên|gv dạy|tên gv/i.test(h));
          const periodColIdx = headers.findIndex(h => /tiết|số tiết|periods/i.test(h));

          if (classColIdx !== -1 && subColIdx !== -1 && teacherColIdx !== -1) {
            for (let r = headerIdx + 1; r < rows.length; r++) {
              const row = rows[r];
              const className = String(row[classColIdx] || '').trim();
              const subName = String(row[subColIdx] || '').trim();
              const teacherName = String(row[teacherColIdx] || '').trim();
              const periods = Number(row[periodColIdx]) || 0;

              if (!className || !subName || !teacherName) continue;

              // Find or match class
              const matchedClass = currentClasses.find(c => c.name.toLowerCase() === className.toLowerCase());
              const matchedSubject = currentSubjects.find(
                s => s.name.toLowerCase().includes(subName.toLowerCase()) || subName.toLowerCase().includes(s.shortName.toLowerCase())
              );
              const matchedTeacher = currentTeachers.find(
                t => t.name.toLowerCase().includes(teacherName.toLowerCase()) || teacherName.toLowerCase().includes(t.name.toLowerCase())
              );

              if (matchedClass && matchedSubject && matchedTeacher) {
                importedAssignments.push({
                  id: `imp-${matchedClass.id}-${matchedSubject.id}`,
                  classId: matchedClass.id,
                  subjectId: matchedSubject.id,
                  teacherId: matchedTeacher.id,
                  periodsPerWeek: periods || matchedSubject.defaultPeriods[matchedClass.grade] || 2,
                });
                assignmentsImported++;
              }
            }
          }

          // Case B: Matrix Sheet (STT, Khối, Lớp, GVCN, [Toán], [Văn], [Anh]...)
          if (classColIdx !== -1 && subColIdx === -1 && headers.length > 5) {
            // Find subject columns
            const matchedSubCols: { colIndex: number; subject: Subject }[] = [];
            headers.forEach((h, colI) => {
              const foundSub = currentSubjects.find(
                s => h.toLowerCase().includes(s.shortName.toLowerCase()) || h.toLowerCase().includes(s.name.toLowerCase())
              );
              if (foundSub) {
                matchedSubCols.push({ colIndex: colI, subject: foundSub });
              }
            });

            if (matchedSubCols.length > 0) {
              for (let r = headerIdx + 1; r < rows.length; r++) {
                const row = rows[r];
                const className = String(row[classColIdx] || '').trim();
                if (!className) continue;

                const matchedClass = currentClasses.find(c => c.name.toLowerCase() === className.toLowerCase());
                if (!matchedClass) continue;

                matchedSubCols.forEach(({ colIndex, subject }) => {
                  const teacherCell = String(row[colIndex] || '').trim();
                  if (!teacherCell) return;

                  const matchedTeacher = currentTeachers.find(
                    t => t.name.toLowerCase().includes(teacherCell.toLowerCase()) || teacherCell.toLowerCase().includes(t.name.toLowerCase())
                  );

                  if (matchedTeacher) {
                    importedAssignments.push({
                      id: `imp-mat-${matchedClass.id}-${subject.id}`,
                      classId: matchedClass.id,
                      subjectId: subject.id,
                      teacherId: matchedTeacher.id,
                      periodsPerWeek: subject.defaultPeriods[matchedClass.grade] || 2,
                    });
                    assignmentsImported++;
                  }
                });
              }
            }
          }
        });

        resolve({
          teachersImported,
          assignmentsImported,
          classesImported,
          errors,
          newTeachers: importedTeachers,
          newAssignments: importedAssignments,
        });
      } catch (err: any) {
        reject(new Error(`Không thể đọc file Excel: ${err.message}`));
      }
    };

    reader.onerror = () => reject(new Error('Lỗi khi đọc file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Xuất file Excel Bảng Tổng Hợp Giáo Viên Kiêm Nhiệm & Giảm Trừ Định Mức
 */
export async function exportConcurrentDutiesExcel(
  config: SchoolConfig,
  teachers: Teacher[],
  classes: ClassGroup[],
  departments: Department[],
  workloads?: WorkloadStats[]
) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const deptMap = new Map(departments.map(d => [d.id, d.name]));
  const workloadMap = workloads ? new Map(workloads.map(w => [w.teacherId, w])) : new Map();

  const homeroomMap = new Map<string, ClassGroup>();
  classes.forEach(c => {
    if (c.homeroomTeacherId) {
      homeroomMap.set(c.homeroomTeacherId, c);
    }
  });

  const excelRows: any[][] = [];

  // Formal Administrative Header
  excelRows.push([config.subTitle.toUpperCase(), '', '', '', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM']);
  excelRows.push([config.schoolName.toUpperCase(), '', '', '', 'Độc lập - Tự do - Hạnh phúc']);
  excelRows.push([]);
  excelRows.push([
    `BẢNG TỔNG HỢP GIÁO VIÊN KIÊM NHIỆM & GIẢM ĐỊNH MỨC TIẾT DẠY - NĂM HỌC ${config.academicYear}`
  ]);
  excelRows.push([
    `(Căn cứ Thông tư 28/2009/TT-BGDĐT, TT 15/2020/TT-BGDĐT và Thông tư 05/2025/TT-BGDĐT của Bộ GD&ĐT)`
  ]);
  excelRows.push([]);

  // Column Headers
  excelRows.push([
    'STT',
    'Mã GV',
    'Họ và tên giáo viên',
    'Giới tính',
    'Tổ chuyên môn',
    'Điểm trường / Cấp học',
    'Chủ nhiệm lớp (GVCN)',
    'Tiết giảm CN',
    'Chức vụ & Kiêm nhiệm',
    'Tiết giảm kiêm nhiệm',
    'Giảm trừ khác',
    'Tổng số tiết giảm',
    'Định mức chuẩn gốc',
    'Định mức thực tế sau giảm',
    'Số tiết thực dạy',
    'Chênh lệch (+Dư / -Thiếu)',
    'Căn cứ quy định pháp lý',
    'Ghi chú'
  ]);

  let stt = 1;
  teachers.forEach(t => {
    const isHT =
      t.id === 'tch-bgh-1' ||
      t.name === 'Lê Thanh Cường' ||
      t.code === 'Cường.LT (HT)' ||
      (t.role === 'HieuTruong' && t.name === 'Lê Thanh Cường');
    const isPHT =
      !isHT &&
      (t.id === 'tch-bgh-2' ||
        t.id === 'tch-bgh-3' ||
        t.id === 'tch-bgh-4' ||
        ['Nguyễn Minh Trí', 'Phan Thanh Thảo', 'Nguyễn Thanh Tòng'].includes(t.name) ||
        t.code === 'Trí.NM (PHT)' ||
        t.code === 'Thảo.PT (PHT)' ||
        t.code === 'Tòng.NT (PHT)');
    const isLeader = isHT || isPHT;

    const isTPT =
      t.id === 'tch-ls-12' ||
      t.name === 'Nguyễn Thị Lý' ||
      t.role === 'TongPhuTrachDoi' ||
      t.code?.includes('(TPT') ||
      t.duties?.some(d => d.type === 'TongPhuTrachDoi');

    const hrClass = homeroomMap.get(t.id);
    const hrReduction = isLeader ? 0 : hrClass ? (hrClass.level === 'THCS' ? 4 : (config.homeroomReduction || 3)) : 0;

    let dutyReduction = 0;
    const dutyNames: string[] = [];
    if (t.duties && t.duties.length > 0) {
      t.duties.forEach(d => {
        if (d.reductionPeriods > 0) {
          dutyNames.push(`${d.name} (-${d.reductionPeriods}t)`);
        } else if (d.type === 'TongPhuTrachDoi' || d.name.includes('Tổng phụ trách')) {
          dutyNames.push(`${d.name} (ĐM 2t/tuần)`);
        } else {
          dutyNames.push(d.name);
        }
        dutyReduction += d.reductionPeriods;
      });
    } else if (t.role && t.role !== 'GVBM' && !isLeader) {
      const presetDuties = getTeacherDutiesList(t);
      presetDuties.forEach(pd => {
        if (pd.reduction > 0) {
          dutyNames.push(`${pd.name} (-${pd.reduction}t)`);
        } else if (pd.shortLabel === 'TPT Đội' || pd.name.includes('Tổng phụ trách')) {
          dutyNames.push(`${pd.name} (ĐM 2t/tuần)`);
        } else {
          dutyNames.push(pd.name);
        }
        dutyReduction += pd.reduction;
      });
    }

    const customReduction = isLeader ? 0 : (t.customReductionPeriods || 0);
    const totalReduction = hrReduction + dutyReduction + customReduction;

    const baseStandard = isHT
      ? 2
      : isPHT
      ? 4
      : isTPT
      ? (t.baseStandardPeriods && t.baseStandardPeriods > 0 ? t.baseStandardPeriods : 2)
      : (t.campus === 'THPTDBK' ? 17 : 19);
    const targetPeriods = Math.max(0, baseStandard - totalReduction);

    const workload = workloadMap.get(t.id);
    const assignedPeriods = workload ? workload.assignedPeriods : 0;
    const balance = assignedPeriods - targetPeriods;

    let legalBasis = 'Chuẩn GVBM';
    if (isLeader) {
      legalBasis = 'Định mức BGH (TT 28/2009 & TT 15/2017)';
    } else if (isTPT) {
      legalBasis = 'TPT Đội: ĐM 2t/tuần (TT 28/2009 & TT 05/2025)';
    } else {
      const basisArr: string[] = [];
      if (hrClass) basisArr.push('GVCN: -3t/-4t (TT 28/2009)');
      if (dutyNames.some(d => d.includes('Tổ trưởng') || d.includes('Tổ phó'))) basisArr.push('Tổ CM: -3t/-1t (TT 15/2020)');
      if (dutyNames.some(d => d.includes('Đoàn') || d.includes('Phổ cập'))) basisArr.push('Đoàn/PC: (TT 05/2025)');
      if (dutyNames.some(d => d.includes('Nuôi con'))) basisArr.push('Con nhỏ: (TT 28/2009)');
      if (dutyNames.some(d => d.includes('Công đoàn') || d.includes('Thanh tra') || d.includes('Thư ký'))) basisArr.push('Đoàn thể/HĐ');
      if (basisArr.length > 0) legalBasis = basisArr.join('; ');
    }

    excelRows.push([
      stt++,
      t.code || '',
      t.name,
      t.gender,
      deptMap.get(t.departmentId) || '',
      t.campus === 'THPTDBK' ? 'THPT Đốc Binh Kiều' : t.campus === 'THCSDBK' ? 'THCS Đốc Binh Kiều' : 'THCS Tân Kiều',
      hrClass ? hrClass.name : '',
      hrReduction > 0 ? hrReduction : '',
      dutyNames.join('; '),
      dutyReduction > 0 ? dutyReduction : '',
      customReduction > 0 ? customReduction : '',
      totalReduction,
      baseStandard,
      targetPeriods,
      assignedPeriods,
      balance >= 0 ? `+${balance}` : `${balance}`,
      legalBasis,
      t.notes || ''
    ]);
  });

  excelRows.push([]);
  excelRows.push([]);
  excelRows.push(['', '', '', '', 'NGƯỜI LẬP BẢNG', '', '', '', '', '', '', 'HIỆU TRƯỞNG']);
  excelRows.push(['', '', '', '', '(Ký và ghi rõ họ tên)', '', '', '', '', '', '', '(Ký tên, đóng dấu)']);
  excelRows.push([]);
  excelRows.push([]);
  excelRows.push([]);
  excelRows.push(['', '', '', '', config.vicePrincipalName || 'Nguyễn Minh Trí', '', '', '', '', '', '', config.principalName || 'Lê Thanh Cường']);

  const ws = XLSX.utils.aoa_to_sheet(excelRows);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 15 }, // Mã GV
    { wch: 25 }, // Họ tên
    { wch: 10 }, // Giới tính
    { wch: 24 }, // Tổ CM
    { wch: 22 }, // Điểm trường
    { wch: 14 }, // Lớp CN
    { wch: 12 }, // Tiết giảm CN
    { wch: 30 }, // Chức vụ
    { wch: 12 }, // Tiết giảm kiêm nhiệm
    { wch: 12 }, // Giảm khác
    { wch: 14 }, // Tổng giảm
    { wch: 14 }, // Chuẩn gốc
    { wch: 16 }, // Sau giảm
    { wch: 14 }, // Thực dạy
    { wch: 14 }, // Chênh lệch
    { wch: 35 }, // Căn cứ
    { wch: 30 }  // Ghi chú
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Danh Sách Kiêm Nhiệm');
  XLSX.writeFile(wb, `Danh_Sach_Kiem_Nhiem_Giam_Tru_${config.academicYear.replace(/\s+/g, '_')}.xlsx`);
}

