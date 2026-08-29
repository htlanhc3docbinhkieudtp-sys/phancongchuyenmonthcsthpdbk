export type GradeLevel = '10' | '11' | '12' | '6' | '7' | '8' | '9';

export type SchoolLevel = 'THPT' | 'THCS';

export interface Department {
  id: string;
  name: string;
  code: string;
  color: string;
}

export interface Subject {
  id: string;
  name: string;
  shortName: string;
  departmentId: string;
  defaultPeriods: Record<GradeLevel, number>; // Số tiết/tuần theo khối
  color: string;
  icon?: string;
  isElective?: boolean; // Môn lựa chọn GDPT 2018
}

export interface SpecialTopics {
  cd1?: { title: string; teacherId?: string };
  cd2?: { title: string; teacherId?: string };
  cd3?: { title: string; teacherId?: string };
}

export interface ClassGroup {
  id: string;
  name: string; // 10A1, 10A2, 11A1, 12A1...
  grade: GradeLevel;
  level: SchoolLevel;
  track?: 'KHTN' | 'KHXH' | 'CoBan'; // Ban KHTN, KHXH hoặc Cơ bản
  studentCount?: number;
  homeroomTeacherId?: string; // Giáo viên chủ nhiệm
  roomNumber?: string;
  specialTopics?: SpecialTopics;
}

export type DutyType = 
  | 'ToTruong'          // Tổ trưởng chuyên môn (-3t)
  | 'ToPho'             // Tổ phó chuyên môn (-1t)
  | 'GiaoVu'            // Giáo vụ (-4t)
  | 'BiThuDoan'         // Bí thư đoàn trường (-12t theo TT 05/2025)
  | 'PhoBiThuDoan'      // Phó bí thư đoàn (-6t theo TT 05/2025)
  | 'PhoCap'            // Phổ cập giáo dục (-4t theo TT 05/2025)
  | 'ThuKyHoiDong'      // Thư ký hội đồng (-2t)
  | 'TongPhuTrachDoi'   // Tổng phụ trách Đội (-13t theo TT 05/2025)
  | 'ConNho'            // Nuôi con nhỏ dưới 36 tháng tuổi (-3t THPT / -4t THCS)
  | 'ChuTichCongDoan'   // Chủ tịch Công đoàn (-3t)
  | 'BanThanhTra'       // Ban thanh tra nhân dân (-1t)
  | 'Khac';             // Kiêm nhiệm khác

export interface ConcurrentDuty {
  id: string;
  type: DutyType;
  name: string; // Tên hiển thị, vd: "Tổ trưởng", "Giáo vụ", "Nuôi con nhỏ", "Bí thư Đoàn"
  reductionPeriods: number; // Số tiết giảm trừ tuần
  notes?: string;
}

export type TeacherRole = 
  | 'GVBM' // Giáo viên bộ môn
  | 'ToTruong' // Tổ trưởng (-3 tiết)
  | 'ToPho' // Tổ phó (-1 tiết)
  | 'BiThuDoan' // Bí thư đoàn trường (-12 tiết)
  | 'PhoBiThuDoan' // Phó bí thư đoàn (-6 tiết)
  | 'ChuTichCongDoan' // Chủ tịch CĐ (-3 tiết)
  | 'BanThanhTra' // Ban thanh tra (-1 tiết)
  | 'GiaoVu' // Giáo vụ (-4 tiết)
  | 'PhoCap' // Phổ cập (-4 tiết)
  | 'ThuKyHoiDong' // Thư ký hội đồng (-2 tiết)
  | 'TongPhuTrachDoi' // Tổng phụ trách Đội (-13 tiết)
  | 'ConNho' // Nuôi con nhỏ (-3 tiết)
  | 'Khac'; // Kiêm nhiệm khác

export type SchoolCampus = 'THPTDBK' | 'THCSDBK' | 'THCSTK';

export interface Teacher {
  id: string;
  name: string;
  code: string; // Mã viết tắt, ví dụ: "Kiều.ĐT"
  gender: 'Nam' | 'Nữ';
  birthDate?: string; // Ngày sinh
  campus?: SchoolCampus; // Phân hiệu/cơ sở trường (THPTDBK, THCSDBK, THCSTK)
  departmentId: string;
  primarySubjectId?: string;
  secondarySubjectIds?: string[];
  role: TeacherRole;
  duties?: ConcurrentDuty[]; // Danh sách các kiêm nhiệm (có thể nhiều kiêm nhiệm cùng lúc)
  customReductionPeriods?: number; // Số tiết giảm trừ thêm tùy chỉnh
  baseStandardPeriods: number; // Định mức chuẩn: THPT = 17, THCS = 19
  phone?: string;
  email?: string;
  avatarColor?: string;
  notes?: string;
}

export interface LockedCell {
  classId: string;
  subjectId: string;
  reason?: string; // 'Môn không chọn' | 'Chưa dạy kỳ này' | 'Tạm khóa'
  updatedAt?: number;
}

export interface Assignment {
  id: string; // unique assignment id
  classId: string;
  subjectId: string;
  teacherId: string;
  periodsPerWeek: number;
  note?: string;
  updatedAt?: number;
}

export interface SchoolConfig {
  schoolName: string;
  subTitle: string;
  academicYear: string;
  semester: 'HK1' | 'HK2';
  principalName: string;
  vicePrincipalName: string;
  standardThptPeriods: number; // 17
  standardThcsPeriods: number; // 19
  homeroomReduction: number; // 3
}

export interface WorkloadStats {
  teacherId: string;
  teacherName: string;
  departmentName: string;
  assignedPeriods: number;
  reductionPeriods: number;
  targetPeriods: number; // standard - reduction
  balance: number; // assigned - target (+ là dạy dư, - là thiếu)
  homeroomClass?: string;
  assignedClasses: {
    assignmentId: string;
    className: string;
    subjectName: string;
    periods: number;
  }[];
}

export interface ConflictIssue {
  id: string;
  type: 'UNASSIGNED' | 'OVERLOAD' | 'UNDERLOAD' | 'WRONG_SUBJECT' | 'HOMEROOM_UNASSIGNED';
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  classId?: string;
  subjectId?: string;
  teacherId?: string;
}
