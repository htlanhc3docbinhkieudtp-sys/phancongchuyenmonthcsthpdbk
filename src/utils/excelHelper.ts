import * as XLSX from 'xlsx';
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

export function exportComprehensiveExcel(
  config: SchoolConfig,
  departments: Department[],
  subjects: Subject[],
  classes: ClassGroup[],
  teachers: Teacher[],
  assignments: Assignment[],
  workloads: WorkloadStats[]
) {
  const wb = XLSX.utils.book_new();

  const teacherMap = new Map(teachers.map(t => [t.id, t]));
  const deptMap = new Map(departments.map(d => [d.id, d]));
  const subMap = new Map(subjects.map(s => [s.id, s]));

  // ==========================================
  // SHEET 1: MA TRẬN PHÂN CÔNG CHUYÊN MÔN
  // ==========================================
  const matrixData: any[][] = [];

  // Header rows
  matrixData.push([config.subTitle.toUpperCase(), '', '', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM']);
  matrixData.push([config.schoolName.toUpperCase(), '', '', 'Độc lập - Tự do - Hạnh phúc']);
  matrixData.push([]);
  matrixData.push([`BẢNG PHÂN CÔNG CHUYÊN MÔN GIẢNG DẠY - ${config.semester.toUpperCase()} NĂM HỌC ${config.academicYear}`]);
  matrixData.push([]);

  // Column Headers: STT, Khối, Lớp, Sĩ số, GVCN, [Môn 1], [Môn 2]...
  const subjectHeaders = subjects.map(s => `${s.shortName} (${s.defaultPeriods['10'] || 2}t)`);
  const headerRow = ['STT', 'Khối', 'Lớp', 'Sĩ số', 'GVCN', ...subjectHeaders];
  matrixData.push(headerRow);

  classes.forEach((cls, idx) => {
    const homeroomTeacher = teachers.find(t => t.id === cls.homeroomTeacherId);
    const row: any[] = [
      idx + 1,
      `Khối ${cls.grade}`,
      cls.name,
      cls.studentCount || '',
      homeroomTeacher ? homeroomTeacher.name : 'Chưa xếp',
    ];

    subjects.forEach(sub => {
      const assignment = assignments.find(a => a.classId === cls.id && a.subjectId === sub.id);
      if (assignment) {
        const teacher = teacherMap.get(assignment.teacherId);
        row.push(teacher ? teacher.name : '');
      } else {
        row.push('');
      }
    });

    matrixData.push(row);
  });

  const wsMatrix = XLSX.utils.aoa_to_sheet(matrixData);
  XLSX.utils.book_append_sheet(wb, wsMatrix, 'Phân Công Lớp - Môn');

  // ==========================================
  // SHEET 2: THỐNG KÊ ĐỊNH MỨC GIÁO VIÊN
  // ==========================================
  const statsData: any[][] = [];
  statsData.push([`THỐNG KÊ ĐỊNH MỨC TIẾT DẠY GIÁO VIÊN - NĂM HỌC ${config.academicYear}`]);
  statsData.push([]);
  statsData.push([
    'STT',
    'Mã GV',
    'Họ và tên giáo viên',
    'Tổ chuyên môn',
    'Môn chính',
    'Chức vụ / Kiêm nhiệm',
    'GVCN Lớp',
    'Định mức chuẩn (tiết)',
    'Giảm trừ (tiết)',
    'Định mức giao (tiết)',
    'Số tiết thực dạy',
    'Chênh lệch (+Dư / -Thiếu)',
    'Danh sách lớp dạy (Số tiết)',
  ]);

  workloads.forEach((w, idx) => {
    const teacher = teacherMap.get(w.teacherId);
    const sub = teacher ? subMap.get(teacher.primarySubjectId) : undefined;
    const dutiesStr = teacher 
      ? getTeacherDutiesList(teacher).map(d => `${d.name} (-${d.reduction}t)`).join('; ') || 'GV bộ môn'
      : '';
    const classListStr = w.assignedClasses
      .map(c => `${c.className} (${c.subjectName}: ${c.periods}t)`)
      .join(', ');

    statsData.push([
      idx + 1,
      teacher?.code || '',
      w.teacherName,
      w.departmentName,
      sub?.name || '',
      dutiesStr,
      w.homeroomClass || '',
      teacher?.baseStandardPeriods || 17,
      w.reductionPeriods,
      w.targetPeriods,
      w.assignedPeriods,
      w.balance >= 0 ? `+${w.balance}` : `${w.balance}`,
      classListStr,
    ]);
  });

  const wsStats = XLSX.utils.aoa_to_sheet(statsData);
  XLSX.utils.book_append_sheet(wb, wsStats, 'Thống Kê Định Mức');

  // ==========================================
  // SHEET 3: DANH SÁCH GIÁO VIÊN CHỦ NHIỆM
  // ==========================================
  const hrData: any[][] = [];
  hrData.push([`DANH SÁCH PHÂN CÔNG GIÁO VIÊN CHỦ NHIỆM - ${config.academicYear}`]);
  hrData.push([]);
  hrData.push(['STT', 'Lớp', 'Khối', 'Ban / Phân ban', 'Sĩ số', 'Họ tên GVCN', 'Tổ chuyên môn', 'Số điện thoại']);

  classes.forEach((cls, idx) => {
    const hr = teachers.find(t => t.id === cls.homeroomTeacherId);
    const dept = hr ? deptMap.get(hr.departmentId) : undefined;
    hrData.push([
      idx + 1,
      cls.name,
      `Khối ${cls.grade}`,
      cls.track || 'Cơ bản',
      cls.studentCount || '',
      hr ? hr.name : 'Chưa phân công',
      dept?.name || '',
      hr?.phone || '',
    ]);
  });

  const wsHr = XLSX.utils.aoa_to_sheet(hrData);
  XLSX.utils.book_append_sheet(wb, wsHr, 'Danh Sách GVCN');

  // Generate binary and trigger download
  const fileName = `Phan_Cong_Chuyen_Mon_${config.schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${config.academicYear.replace(/\s+/g, '')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function generateExcelTemplate() {
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
