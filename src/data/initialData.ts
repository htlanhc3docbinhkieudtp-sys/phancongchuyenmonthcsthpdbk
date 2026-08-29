import {
  Department,
  Subject,
  ClassGroup,
  Teacher,
  Assignment,
  SchoolConfig,
  LockedCell
} from '../types';
import { officialStaffList } from './schoolStaffData';

export const initialSchoolConfig: SchoolConfig = {
  schoolName: 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU',
  subTitle: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP',
  academicYear: '2024 - 2025',
  semester: 'HK1',
  principalName: 'Lê Thanh Cường',
  vicePrincipalName: 'Nguyễn Minh Trí - Phan Thanh Thảo - Nguyễn Thanh Tòng',
  standardThptPeriods: 17,
  standardThcsPeriods: 19,
  homeroomReduction: 3,
};

export const initialDepartments: Department[] = [
  { id: 'dept-bgh', name: 'Ban Giám Hiệu', code: 'BGH', color: '#0f172a' },
  { id: 'dept-toan', name: 'Tổ Toán', code: 'TOAN', color: '#2563eb' },
  { id: 'dept-ngu-van', name: 'Tổ Ngữ Văn', code: 'VAN', color: '#db2777' },
  { id: 'dept-khxh', name: 'Tổ Lịch sử - Địa lý - GDCD', code: 'LS-DL-GDCD', color: '#7c3aed' },
  { id: 'dept-khtn', name: 'Tổ Vật lý - Hóa học - Sinh học - Công nghệ', code: 'KHTN-CN', color: '#ea580c' },
  { id: 'dept-tieng-anh-tin', name: 'Tổ Tiếng Anh - Tin học', code: 'TA-TIN', color: '#0d9488' },
  { id: 'dept-gdtc-qpan-nt', name: 'Tổ GDTC - QPAN - Nghệ thuật', code: 'GDTC-QPAN-NT', color: '#16a34a' },
];

export const initialSubjects: Subject[] = [
  {
    id: 'sub-toan',
    name: 'Toán học',
    shortName: 'Toán',
    departmentId: 'dept-toan',
    defaultPeriods: { '10': 3, '11': 3, '12': 3, '6': 4, '7': 4, '8': 4, '9': 4 },
    color: '#3b82f6',
  },
  {
    id: 'sub-van',
    name: 'Ngữ văn',
    shortName: 'Văn',
    departmentId: 'dept-ngu-van',
    defaultPeriods: { '10': 3, '11': 3, '12': 3, '6': 4, '7': 4, '8': 4, '9': 4 },
    color: '#ec4899',
  },
  {
    id: 'sub-anh',
    name: 'Tiếng Anh',
    shortName: 'Anh',
    departmentId: 'dept-tieng-anh-tin',
    defaultPeriods: { '10': 3, '11': 3, '12': 3, '6': 3, '7': 3, '8': 3, '9': 3 },
    color: '#14b8a6',
  },
  {
    id: 'sub-li',
    name: 'Vật lí',
    shortName: 'Lí',
    departmentId: 'dept-khtn',
    defaultPeriods: { '10': 2, '11': 2, '12': 2, '6': 0, '7': 0, '8': 0, '9': 0 },
    color: '#f97316',
    isElective: true,
  },
  {
    id: 'sub-hoa',
    name: 'Hóa học',
    shortName: 'Hóa',
    departmentId: 'dept-khtn',
    defaultPeriods: { '10': 2, '11': 2, '12': 2, '6': 0, '7': 0, '8': 0, '9': 0 },
    color: '#fb923c',
    isElective: true,
  },
  {
    id: 'sub-sinh',
    name: 'Sinh học',
    shortName: 'Sinh',
    departmentId: 'dept-khtn',
    defaultPeriods: { '10': 2, '11': 2, '12': 2, '6': 0, '7': 0, '8': 0, '9': 0 },
    color: '#84cc16',
    isElective: true,
  },
  {
    id: 'sub-khtn-cs',
    name: 'KHTN (THCS)',
    shortName: 'KHTN',
    departmentId: 'dept-khtn',
    defaultPeriods: { '10': 0, '11': 0, '12': 0, '6': 4, '7': 4, '8': 4, '9': 4 },
    color: '#ea580c',
  },
  {
    id: 'sub-su',
    name: 'Lịch sử',
    shortName: 'Sử',
    departmentId: 'dept-khxh',
    defaultPeriods: { '10': 2, '11': 2, '12': 2, '6': 0, '7': 0, '8': 0, '9': 0 },
    color: '#8b5cf6',
  },
  {
    id: 'sub-dia',
    name: 'Địa lí',
    shortName: 'Địa',
    departmentId: 'dept-khxh',
    defaultPeriods: { '10': 2, '11': 2, '12': 2, '6': 0, '7': 0, '8': 0, '9': 0 },
    color: '#a855f7',
    isElective: true,
  },
  {
    id: 'sub-lsdl-cs',
    name: 'LS & ĐL (THCS)',
    shortName: 'LS-ĐL',
    departmentId: 'dept-khxh',
    defaultPeriods: { '10': 0, '11': 0, '12': 0, '6': 3, '7': 3, '8': 3, '9': 3 },
    color: '#9333ea',
  },
  {
    id: 'sub-gdcd',
    name: 'Giáo dục công dân',
    shortName: 'GDCD',
    departmentId: 'dept-khxh',
    defaultPeriods: { '10': 0, '11': 0, '12': 0, '6': 1, '7': 1, '8': 1, '9': 1 },
    color: '#4f46e5',
  },
  {
    id: 'sub-gdktpl',
    name: 'GDKT & Pháp luật',
    shortName: 'GDKT&PL',
    departmentId: 'dept-khxh',
    defaultPeriods: { '10': 2, '11': 2, '12': 2, '6': 0, '7': 0, '8': 0, '9': 0 },
    color: '#6366f1',
    isElective: true,
  },
  {
    id: 'sub-tin',
    name: 'Tin học',
    shortName: 'Tin',
    departmentId: 'dept-tieng-anh-tin',
    defaultPeriods: { '10': 2, '11': 2, '12': 2, '6': 1.5, '7': 1.5, '8': 1.5, '9': 1.5 },
    color: '#0284c7',
  },
  {
    id: 'sub-cn',
    name: 'Công nghệ',
    shortName: 'Công nghệ',
    departmentId: 'dept-khtn',
    defaultPeriods: { '10': 2, '11': 2, '12': 2, '6': 1.5, '7': 1.5, '8': 1.5, '9': 1.5 },
    color: '#eab308',
  },
  {
    id: 'sub-gdtc',
    name: 'Giáo dục thể chất',
    shortName: 'GDTC',
    departmentId: 'dept-gdtc-qpan-nt',
    defaultPeriods: { '10': 2, '11': 2, '12': 2, '6': 2, '7': 2, '8': 2, '9': 2 },
    color: '#22c55e',
  },
  {
    id: 'sub-gdqp',
    name: 'GD Quốc phòng & An ninh',
    shortName: 'GDQP',
    departmentId: 'dept-gdtc-qpan-nt',
    defaultPeriods: { '10': 1, '11': 1, '12': 1, '6': 0, '7': 0, '8': 0, '9': 0 },
    color: '#15803d',
  },
  {
    id: 'sub-am-nhac',
    name: 'Âm nhạc',
    shortName: 'Âm nhạc',
    departmentId: 'dept-gdtc-qpan-nt',
    defaultPeriods: { '10': 0, '11': 0, '12': 0, '6': 1, '7': 1, '8': 1, '9': 1 },
    color: '#ec4899',
  },
  {
    id: 'sub-my-thuat',
    name: 'Mỹ thuật',
    shortName: 'Mỹ thuật',
    departmentId: 'dept-gdtc-qpan-nt',
    defaultPeriods: { '10': 0, '11': 0, '12': 0, '6': 1, '7': 1, '8': 1, '9': 1 },
    color: '#f59e0b',
  },
  {
    id: 'sub-hdtn',
    name: 'HĐ Trải nghiệm, Hướng nghiệp',
    shortName: 'HĐTN-HN',
    departmentId: 'dept-ngu-van',
    defaultPeriods: { '10': 3, '11': 3, '12': 3, '6': 3, '7': 3, '8': 3, '9': 3 },
    color: '#f43f5e',
  },
  {
    id: 'sub-gddp',
    name: 'Giáo dục địa phương',
    shortName: 'GD Địa phương',
    departmentId: 'dept-khxh',
    defaultPeriods: { '10': 3, '11': 3, '12': 3, '6': 3, '7': 3, '8': 3, '9': 3 },
    color: '#06b6d4',
  }
];

export const initialClasses: ClassGroup[] = [
  // Khối 10 THPT (5 lớp)
  {
    id: 'cls-10cb1',
    name: '10CB1',
    grade: '10',
    level: 'THPT',
    track: 'CoBan',
    studentCount: 37,
    homeroomTeacherId: 'tch-khtn-5',
    roomNumber: 'P.10-1',
    specialTopics: {
      cd1: { title: 'Toán', teacherId: 'tch-t-7' },
      cd2: { title: 'Hóa học', teacherId: 'tch-khtn-9' },
      cd3: { title: 'Sinh học', teacherId: 'tch-khtn-5' }
    }
  },
  {
    id: 'cls-10cb2',
    name: '10CB2',
    grade: '10',
    level: 'THPT',
    track: 'CoBan',
    studentCount: 29,
    homeroomTeacherId: 'tch-khtn-9',
    roomNumber: 'P.10-2',
    specialTopics: {
      cd1: { title: 'Toán', teacherId: 'tch-t-5' },
      cd2: { title: 'Hóa học', teacherId: 'tch-khtn-9' },
      cd3: { title: 'Tin học', teacherId: 'tch-av-9' }
    }
  },
  {
    id: 'cls-10cb3',
    name: '10CB3',
    grade: '10',
    level: 'THPT',
    track: 'CoBan',
    studentCount: 44,
    homeroomTeacherId: 'tch-v-5',
    roomNumber: 'P.10-3',
    specialTopics: {
      cd1: { title: 'Toán', teacherId: 'tch-t-5' },
      cd2: { title: 'Vật lý', teacherId: 'tch-khtn-6' },
      cd3: { title: 'Tin học', teacherId: 'tch-av-9' }
    }
  },
  {
    id: 'cls-10cb4',
    name: '10CB4',
    grade: '10',
    level: 'THPT',
    track: 'CoBan',
    studentCount: 47,
    homeroomTeacherId: 'tch-av-9',
    roomNumber: 'P.10-4',
    specialTopics: {
      cd1: { title: 'Toán', teacherId: 'tch-t-7' },
      cd2: { title: 'Vật lý', teacherId: 'tch-khtn-6' },
      cd3: { title: 'Tin học', teacherId: 'tch-av-9' }
    }
  },
  {
    id: 'cls-10cb5',
    name: '10CB5',
    grade: '10',
    level: 'THPT',
    track: 'CoBan',
    studentCount: 45,
    homeroomTeacherId: 'tch-v-4',
    roomNumber: 'P.10-5',
    specialTopics: {
      cd1: { title: 'Toán', teacherId: 'tch-t-4' },
      cd2: { title: 'Vật lý', teacherId: 'tch-bgh-2' },
      cd3: { title: 'Tin học', teacherId: 'tch-av-2' }
    }
  },

  // Khối 11 THPT (4 lớp)
  {
    id: 'cls-11cb1',
    name: '11CB1',
    grade: '11',
    level: 'THPT',
    track: 'CoBan',
    studentCount: 45,
    homeroomTeacherId: 'tch-khtn-1',
    roomNumber: 'P.11-1',
    specialTopics: {
      cd1: { title: 'Toán', teacherId: 'tch-t-6' },
      cd2: { title: 'Hóa học', teacherId: 'tch-khtn-7' },
      cd3: { title: 'Sinh học', teacherId: 'tch-khtn-1' }
    }
  },
  {
    id: 'cls-11cb2',
    name: '11CB2',
    grade: '11',
    level: 'THPT',
    track: 'CoBan',
    studentCount: 35,
    homeroomTeacherId: 'tch-khtn-8',
    roomNumber: 'P.11-2',
    specialTopics: {
      cd1: { title: 'Toán', teacherId: 'tch-t-5' },
      cd2: { title: 'Hóa học', teacherId: 'tch-khtn-8' },
      cd3: { title: 'Tin học', teacherId: 'tch-av-8' }
    }
  },
  {
    id: 'cls-11cb3',
    name: '11CB3',
    grade: '11',
    level: 'THPT',
    track: 'CoBan',
    studentCount: 34,
    homeroomTeacherId: 'tch-ls-5',
    roomNumber: 'P.11-3',
    specialTopics: {
      cd1: { title: 'Toán', teacherId: 'tch-t-4' },
      cd2: { title: 'Vật lý', teacherId: 'tch-khtn-6' },
      cd3: { title: 'Tin học', teacherId: 'tch-av-8' }
    }
  },
  {
    id: 'cls-11cb4',
    name: '11CB4',
    grade: '11',
    level: 'THPT',
    track: 'CoBan',
    studentCount: 33,
    homeroomTeacherId: 'tch-av-8',
    roomNumber: 'P.11-4',
    specialTopics: {
      cd1: { title: 'Toán', teacherId: 'tch-t-4' },
      cd2: { title: 'Vật lý', teacherId: 'tch-khtn-3' },
      cd3: { title: 'Tin học', teacherId: 'tch-av-8' }
    }
  },

  // Khối 12 THPT (5 lớp)
  {
    id: 'cls-12cb1',
    name: '12CB1',
    grade: '12',
    level: 'THPT',
    track: 'CoBan',
    studentCount: 28,
    homeroomTeacherId: 'tch-khtn-7',
    roomNumber: 'P.12-1',
    specialTopics: {
      cd1: { title: 'Toán', teacherId: 'tch-t-1' },
      cd2: { title: 'Văn', teacherId: 'tch-v-5' },
      cd3: { title: 'Lịch sử', teacherId: 'tch-ls-2' }
    }
  },
  {
    id: 'cls-12cb2',
    name: '12CB2',
    grade: '12',
    level: 'THPT',
    track: 'CoBan',
    studentCount: 23,
    homeroomTeacherId: 'tch-v-6',
    roomNumber: 'P.12-2',
    specialTopics: {
      cd1: { title: 'Toán', teacherId: 'tch-t-6' },
      cd2: { title: 'Văn', teacherId: 'tch-v-6' },
      cd3: { title: 'Lịch sử', teacherId: 'tch-ls-4' }
    }
  },
  {
    id: 'cls-12cb3',
    name: '12CB3',
    grade: '12',
    level: 'THPT',
    track: 'CoBan',
    studentCount: 47,
    homeroomTeacherId: 'tch-t-7',
    roomNumber: 'P.12-3',
    specialTopics: {
      cd1: { title: 'Toán', teacherId: 'tch-t-7' },
      cd2: { title: 'Văn', teacherId: 'tch-v-1' },
      cd3: { title: 'Lịch sử', teacherId: 'tch-ls-5' }
    }
  },
  {
    id: 'cls-12cb4',
    name: '12CB4',
    grade: '12',
    level: 'THPT',
    track: 'CoBan',
    studentCount: 47,
    homeroomTeacherId: 'tch-ls-4',
    roomNumber: 'P.12-4',
    specialTopics: {
      cd1: { title: 'Toán', teacherId: 'tch-t-1' },
      cd2: { title: 'Văn', teacherId: 'tch-v-5' },
      cd3: { title: 'Lịch sử', teacherId: 'tch-ls-4' }
    }
  },
  {
    id: 'cls-12cb5',
    name: '12CB5',
    grade: '12',
    level: 'THPT',
    track: 'CoBan',
    studentCount: 41,
    homeroomTeacherId: 'tch-ls-2',
    roomNumber: 'P.12-5',
    specialTopics: {
      cd1: { title: 'Toán', teacherId: 'tch-t-6' },
      cd2: { title: 'Văn', teacherId: 'tch-v-1' },
      cd3: { title: 'Lịch sử', teacherId: 'tch-ls-2' }
    }
  },

  // Khối 6 THCS (10 lớp: 6A1 -> 6A10)
  { id: 'cls-6a1', name: '6A1', grade: '6', level: 'THCS', studentCount: 42, homeroomTeacherId: 'tch-khtn-18', roomNumber: 'P.6-1' },
  { id: 'cls-6a2', name: '6A2', grade: '6', level: 'THCS', studentCount: 41, homeroomTeacherId: 'tch-khtn-13', roomNumber: 'P.6-2' },
  { id: 'cls-6a3', name: '6A3', grade: '6', level: 'THCS', studentCount: 43, homeroomTeacherId: 'tch-av-14', roomNumber: 'P.6-3' },
  { id: 'cls-6a4', name: '6A4', grade: '6', level: 'THCS', studentCount: 41, homeroomTeacherId: 'tch-td-8', roomNumber: 'P.6-4' },
  { id: 'cls-6a5', name: '6A5', grade: '6', level: 'THCS', studentCount: 41, homeroomTeacherId: 'tch-khtn-24', roomNumber: 'P.6-5' },
  { id: 'cls-6a6', name: '6A6', grade: '6', level: 'THCS', studentCount: 42, homeroomTeacherId: 'tch-t-8', roomNumber: 'P.6-6' },
  { id: 'cls-6a7', name: '6A7', grade: '6', level: 'THCS', studentCount: 41, homeroomTeacherId: 'tch-ls-15', roomNumber: 'P.6-7' },
  { id: 'cls-6a8', name: '6A8', grade: '6', level: 'THCS', studentCount: 43, homeroomTeacherId: 'tch-td-3', roomNumber: 'P.6-8' },
  { id: 'cls-6a9', name: '6A9', grade: '6', level: 'THCS', studentCount: 42, homeroomTeacherId: 'tch-khtn-25', roomNumber: 'P.6-9' },
  { id: 'cls-6a10', name: '6A10', grade: '6', level: 'THCS', studentCount: 41, homeroomTeacherId: 'tch-khtn-21', roomNumber: 'P.6-10' },

  // Khối 7 THCS (9 lớp: 7A1 -> 7A9)
  { id: 'cls-7a1', name: '7A1', grade: '7', level: 'THCS', studentCount: 40, homeroomTeacherId: 'tch-t-10', roomNumber: 'P.7-1' },
  { id: 'cls-7a2', name: '7A2', grade: '7', level: 'THCS', studentCount: 40, homeroomTeacherId: 'tch-av-13', roomNumber: 'P.7-2' },
  { id: 'cls-7a3', name: '7A3', grade: '7', level: 'THCS', studentCount: 41, homeroomTeacherId: 'tch-t-11', roomNumber: 'P.7-3' },
  { id: 'cls-7a4', name: '7A4', grade: '7', level: 'THCS', studentCount: 40, homeroomTeacherId: 'tch-td-6', roomNumber: 'P.7-4' },
  { id: 'cls-7a5', name: '7A5', grade: '7', level: 'THCS', studentCount: 39, homeroomTeacherId: 'tch-khtn-4', roomNumber: 'P.7-5' },
  { id: 'cls-7a6', name: '7A6', grade: '7', level: 'THCS', studentCount: 40, homeroomTeacherId: 'tch-khtn-23', roomNumber: 'P.7-6' },
  { id: 'cls-7a7', name: '7A7', grade: '7', level: 'THCS', studentCount: 47, homeroomTeacherId: 'tch-khtn-19', roomNumber: 'P.7-7' },
  { id: 'cls-7a8', name: '7A8', grade: '7', level: 'THCS', studentCount: 45, homeroomTeacherId: 'tch-ls-3', roomNumber: 'P.7-8' },
  { id: 'cls-7a9', name: '7A9', grade: '7', level: 'THCS', studentCount: 45, homeroomTeacherId: 'tch-td-11', roomNumber: 'P.7-9' },

  // Khối 8 THCS (10 lớp: 8A1 -> 8A10)
  { id: 'cls-8a1', name: '8A1', grade: '8', level: 'THCS', studentCount: 43, homeroomTeacherId: 'tch-t-9', roomNumber: 'P.8-1' },
  { id: 'cls-8a2', name: '8A2', grade: '8', level: 'THCS', studentCount: 42, homeroomTeacherId: 'tch-khtn-22', roomNumber: 'P.8-2' },
  { id: 'cls-8a3', name: '8A3', grade: '8', level: 'THCS', studentCount: 43, homeroomTeacherId: 'tch-av-12', roomNumber: 'P.8-3' },
  { id: 'cls-8a4', name: '8A4', grade: '8', level: 'THCS', studentCount: 43, homeroomTeacherId: 'tch-khtn-17', roomNumber: 'P.8-4' },
  { id: 'cls-8a5', name: '8A5', grade: '8', level: 'THCS', studentCount: 43, homeroomTeacherId: 'tch-khtn-12', roomNumber: 'P.8-5' },
  { id: 'cls-8a6', name: '8A6', grade: '8', level: 'THCS', studentCount: 42, homeroomTeacherId: 'tch-td-7', roomNumber: 'P.8-6' },
  { id: 'cls-8a7', name: '8A7', grade: '8', level: 'THCS', studentCount: 39, homeroomTeacherId: 'tch-khtn-2', roomNumber: 'P.8-7' },
  { id: 'cls-8a8', name: '8A8', grade: '8', level: 'THCS', studentCount: 38, homeroomTeacherId: 'tch-khtn-14', roomNumber: 'P.8-8' },
  { id: 'cls-8a9', name: '8A9', grade: '8', level: 'THCS', studentCount: 38, homeroomTeacherId: 'tch-av-16', roomNumber: 'P.8-9' },
  { id: 'cls-8a10', name: '8A10', grade: '8', level: 'THCS', studentCount: 38, homeroomTeacherId: 'tch-t-15', roomNumber: 'P.8-10' },

  // Khối 9 THCS (10 lớp: 9A1 -> 9A10)
  { id: 'cls-9a1', name: '9A1', grade: '9', level: 'THCS', studentCount: 42, homeroomTeacherId: 'tch-khtn-16', roomNumber: 'P.9-1' },
  { id: 'cls-9a2', name: '9A2', grade: '9', level: 'THCS', studentCount: 39, homeroomTeacherId: 'tch-khtn-10', roomNumber: 'P.9-2' },
  { id: 'cls-9a3', name: '9A3', grade: '9', level: 'THCS', studentCount: 44, homeroomTeacherId: 'tch-t-3', roomNumber: 'P.9-3' },
  { id: 'cls-9a4', name: '9A4', grade: '9', level: 'THCS', studentCount: 43, homeroomTeacherId: 'tch-t-12', roomNumber: 'P.9-4' },
  { id: 'cls-9a5', name: '9A5', grade: '9', level: 'THCS', studentCount: 42, homeroomTeacherId: 'tch-av-11', roomNumber: 'P.9-5' },
  { id: 'cls-9a6', name: '9A6', grade: '9', level: 'THCS', studentCount: 43, homeroomTeacherId: 'tch-khtn-11', roomNumber: 'P.9-6' },
  { id: 'cls-9a7', name: '9A7', grade: '9', level: 'THCS', studentCount: 40, homeroomTeacherId: 'tch-t-2', roomNumber: 'P.9-7' },
  { id: 'cls-9a8', name: '9A8', grade: '9', level: 'THCS', studentCount: 38, homeroomTeacherId: 'tch-khtn-20', roomNumber: 'P.9-8' },
  { id: 'cls-9a9', name: '9A9', grade: '9', level: 'THCS', studentCount: 39, homeroomTeacherId: 'tch-ls-16', roomNumber: 'P.9-9' },
  { id: 'cls-9a10', name: '9A10', grade: '9', level: 'THCS', studentCount: 40, homeroomTeacherId: 'tch-t-13', roomNumber: 'P.9-10' },
];

export const initialTeachers: Teacher[] = officialStaffList;

export const initialAssignments: Assignment[] = [
  // ==========================================
  // KHỐI 10 (10CB1 - 10CB5)
  // ==========================================
  // 10CB1
  { id: 'as-10-1-van', classId: 'cls-10cb1', subjectId: 'sub-van', teacherId: 'tch-v-6', periodsPerWeek: 3 }, // Duyên
  { id: 'as-10-1-toan', classId: 'cls-10cb1', subjectId: 'sub-toan', teacherId: 'tch-t-7', periodsPerWeek: 3 }, // Hương
  { id: 'as-10-1-anh', classId: 'cls-10cb1', subjectId: 'sub-anh', teacherId: 'tch-av-6', periodsPerWeek: 3 }, // Bền
  { id: 'as-10-1-li', classId: 'cls-10cb1', subjectId: 'sub-li', teacherId: 'tch-khtn-6', periodsPerWeek: 2 }, // Hiền
  { id: 'as-10-1-hoa', classId: 'cls-10cb1', subjectId: 'sub-hoa', teacherId: 'tch-khtn-9', periodsPerWeek: 2 }, // Kiều
  { id: 'as-10-1-sinh', classId: 'cls-10cb1', subjectId: 'sub-sinh', teacherId: 'tch-khtn-5', periodsPerWeek: 2 }, // Tùng
  { id: 'as-10-1-su', classId: 'cls-10cb1', subjectId: 'sub-su', teacherId: 'tch-ls-4', periodsPerWeek: 2 }, // Trang
  { id: 'as-10-1-tin', classId: 'cls-10cb1', subjectId: 'sub-tin', teacherId: 'tch-av-9', periodsPerWeek: 2 }, // Diễm
  { id: 'as-10-1-td', classId: 'cls-10cb1', subjectId: 'sub-gdtc', teacherId: 'tch-td-2', periodsPerWeek: 2 }, // Rạng
  { id: 'as-10-1-qp', classId: 'cls-10cb1', subjectId: 'sub-gdqp', teacherId: 'tch-td-2', periodsPerWeek: 1 }, // Rạng

  // 10CB2
  { id: 'as-10-2-van', classId: 'cls-10cb2', subjectId: 'sub-van', teacherId: 'tch-v-4', periodsPerWeek: 3 }, // Nhịnh
  { id: 'as-10-2-toan', classId: 'cls-10cb2', subjectId: 'sub-toan', teacherId: 'tch-t-5', periodsPerWeek: 3 }, // C.Toàn
  { id: 'as-10-2-anh', classId: 'cls-10cb2', subjectId: 'sub-anh', teacherId: 'tch-av-6', periodsPerWeek: 3 }, // Bền
  { id: 'as-10-2-li', classId: 'cls-10cb2', subjectId: 'sub-li', teacherId: 'tch-khtn-6', periodsPerWeek: 2 }, // Hiền
  { id: 'as-10-2-hoa', classId: 'cls-10cb2', subjectId: 'sub-hoa', teacherId: 'tch-khtn-9', periodsPerWeek: 2 }, // Kiều
  { id: 'as-10-2-su', classId: 'cls-10cb2', subjectId: 'sub-su', teacherId: 'tch-ls-2', periodsPerWeek: 2 }, // Sơn
  { id: 'as-10-2-dia', classId: 'cls-10cb2', subjectId: 'sub-dia', teacherId: 'tch-ls-6', periodsPerWeek: 2 }, // Hòa
  { id: 'as-10-2-tin', classId: 'cls-10cb2', subjectId: 'sub-tin', teacherId: 'tch-av-9', periodsPerWeek: 2 }, // Diễm
  { id: 'as-10-2-td', classId: 'cls-10cb2', subjectId: 'sub-gdtc', teacherId: 'tch-td-2', periodsPerWeek: 2 }, // Rạng
  { id: 'as-10-2-qp', classId: 'cls-10cb2', subjectId: 'sub-gdqp', teacherId: 'tch-td-2', periodsPerWeek: 1 }, // Rạng

  // 10CB3
  { id: 'as-10-3-van', classId: 'cls-10cb3', subjectId: 'sub-van', teacherId: 'tch-v-5', periodsPerWeek: 3 }, // Ny
  { id: 'as-10-3-toan', classId: 'cls-10cb3', subjectId: 'sub-toan', teacherId: 'tch-t-5', periodsPerWeek: 3 }, // C.Toàn
  { id: 'as-10-3-anh', classId: 'cls-10cb3', subjectId: 'sub-anh', teacherId: 'tch-av-5', periodsPerWeek: 3 }, // Quốc
  { id: 'as-10-3-li', classId: 'cls-10cb3', subjectId: 'sub-li', teacherId: 'tch-khtn-6', periodsPerWeek: 2 }, // Hiền
  { id: 'as-10-3-su', classId: 'cls-10cb3', subjectId: 'sub-su', teacherId: 'tch-ls-2', periodsPerWeek: 2 }, // Sơn
  { id: 'as-10-3-dia', classId: 'cls-10cb3', subjectId: 'sub-dia', teacherId: 'tch-ls-6', periodsPerWeek: 2 }, // Hòa
  { id: 'as-10-3-pl', classId: 'cls-10cb3', subjectId: 'sub-gdktpl', teacherId: 'tch-ls-8', periodsPerWeek: 2 }, // Trường
  { id: 'as-10-3-tin', classId: 'cls-10cb3', subjectId: 'sub-tin', teacherId: 'tch-av-9', periodsPerWeek: 2 }, // Diễm
  { id: 'as-10-3-td', classId: 'cls-10cb3', subjectId: 'sub-gdtc', teacherId: 'tch-td-2', periodsPerWeek: 2 }, // Rạng
  { id: 'as-10-3-qp', classId: 'cls-10cb3', subjectId: 'sub-gdqp', teacherId: 'tch-td-2', periodsPerWeek: 1 }, // Rạng

  // 10CB4
  { id: 'as-10-4-van', classId: 'cls-10cb4', subjectId: 'sub-van', teacherId: 'tch-v-6', periodsPerWeek: 3 }, // Duyên
  { id: 'as-10-4-toan', classId: 'cls-10cb4', subjectId: 'sub-toan', teacherId: 'tch-t-7', periodsPerWeek: 3 }, // Hương
  { id: 'as-10-4-anh', classId: 'cls-10cb4', subjectId: 'sub-anh', teacherId: 'tch-av-7', periodsPerWeek: 3 }, // V.Anh
  { id: 'as-10-4-li', classId: 'cls-10cb4', subjectId: 'sub-li', teacherId: 'tch-khtn-6', periodsPerWeek: 2 }, // Hiền
  { id: 'as-10-4-su', classId: 'cls-10cb4', subjectId: 'sub-su', teacherId: 'tch-ls-4', periodsPerWeek: 2 }, // Trang
  { id: 'as-10-4-dia', classId: 'cls-10cb4', subjectId: 'sub-dia', teacherId: 'tch-ls-6', periodsPerWeek: 2 }, // Hòa
  { id: 'as-10-4-pl', classId: 'cls-10cb4', subjectId: 'sub-gdktpl', teacherId: 'tch-ls-8', periodsPerWeek: 2 }, // Trường
  { id: 'as-10-4-tin', classId: 'cls-10cb4', subjectId: 'sub-tin', teacherId: 'tch-av-9', periodsPerWeek: 2 }, // Diễm
  { id: 'as-10-4-td', classId: 'cls-10cb4', subjectId: 'sub-gdtc', teacherId: 'tch-td-4', periodsPerWeek: 2 }, // Ngân
  { id: 'as-10-4-qp', classId: 'cls-10cb4', subjectId: 'sub-gdqp', teacherId: 'tch-td-2', periodsPerWeek: 1 }, // Rạng

  // 10CB5
  { id: 'as-10-5-van', classId: 'cls-10cb5', subjectId: 'sub-van', teacherId: 'tch-v-4', periodsPerWeek: 3 }, // Nhịnh
  { id: 'as-10-5-toan', classId: 'cls-10cb5', subjectId: 'sub-toan', teacherId: 'tch-t-4', periodsPerWeek: 3 }, // Giang
  { id: 'as-10-5-anh', classId: 'cls-10cb5', subjectId: 'sub-anh', teacherId: 'tch-av-6', periodsPerWeek: 3 }, // Bền
  { id: 'as-10-5-li', classId: 'cls-10cb5', subjectId: 'sub-li', teacherId: 'tch-bgh-2', periodsPerWeek: 2 }, // Trí (PHT)
  { id: 'as-10-5-su', classId: 'cls-10cb5', subjectId: 'sub-su', teacherId: 'tch-ls-4', periodsPerWeek: 2 }, // Trang
  { id: 'as-10-5-dia', classId: 'cls-10cb5', subjectId: 'sub-dia', teacherId: 'tch-ls-6', periodsPerWeek: 2 }, // Hòa
  { id: 'as-10-5-pl', classId: 'cls-10cb5', subjectId: 'sub-gdktpl', teacherId: 'tch-ls-8', periodsPerWeek: 2 }, // Trường
  { id: 'as-10-5-tin', classId: 'cls-10cb5', subjectId: 'sub-tin', teacherId: 'tch-av-2', periodsPerWeek: 2 }, // Hiếu
  { id: 'as-10-5-td', classId: 'cls-10cb5', subjectId: 'sub-gdtc', teacherId: 'tch-td-4', periodsPerWeek: 2 }, // Ngân
  { id: 'as-10-5-qp', classId: 'cls-10cb5', subjectId: 'sub-gdqp', teacherId: 'tch-td-2', periodsPerWeek: 1 }, // Rạng

  // ==========================================
  // KHỐI 11 (11CB1 - 11CB4)
  // ==========================================
  // 11CB1
  { id: 'as-11-1-van', classId: 'cls-11cb1', subjectId: 'sub-van', teacherId: 'tch-v-1', periodsPerWeek: 3 }, // Lắm
  { id: 'as-11-1-toan', classId: 'cls-11cb1', subjectId: 'sub-toan', teacherId: 'tch-t-6', periodsPerWeek: 3 }, // V.Toàn
  { id: 'as-11-1-anh', classId: 'cls-11cb1', subjectId: 'sub-anh', teacherId: 'tch-av-7', periodsPerWeek: 3 }, // V.Anh
  { id: 'as-11-1-li', classId: 'cls-11cb1', subjectId: 'sub-li', teacherId: 'tch-khtn-3', periodsPerWeek: 2 }, // Thùy
  { id: 'as-11-1-hoa', classId: 'cls-11cb1', subjectId: 'sub-hoa', teacherId: 'tch-khtn-7', periodsPerWeek: 2 }, // Thơ
  { id: 'as-11-1-sinh', classId: 'cls-11cb1', subjectId: 'sub-sinh', teacherId: 'tch-khtn-1', periodsPerWeek: 2 }, // Huỳnh
  { id: 'as-11-1-su', classId: 'cls-11cb1', subjectId: 'sub-su', teacherId: 'tch-ls-5', periodsPerWeek: 2 }, // Rỡ
  { id: 'as-11-1-tin', classId: 'cls-11cb1', subjectId: 'sub-tin', teacherId: 'tch-av-8', periodsPerWeek: 2 }, // Liên
  { id: 'as-11-1-td', classId: 'cls-11cb1', subjectId: 'sub-gdtc', teacherId: 'tch-td-4', periodsPerWeek: 2 }, // Ngân
  { id: 'as-11-1-qp', classId: 'cls-11cb1', subjectId: 'sub-gdqp', teacherId: 'tch-td-2', periodsPerWeek: 1 }, // Rạng

  // 11CB2
  { id: 'as-11-2-van', classId: 'cls-11cb2', subjectId: 'sub-van', teacherId: 'tch-v-4', periodsPerWeek: 3 }, // Nhịnh
  { id: 'as-11-2-toan', classId: 'cls-11cb2', subjectId: 'sub-toan', teacherId: 'tch-t-5', periodsPerWeek: 3 }, // C.Toàn
  { id: 'as-11-2-anh', classId: 'cls-11cb2', subjectId: 'sub-anh', teacherId: 'tch-av-5', periodsPerWeek: 3 }, // Quốc
  { id: 'as-11-2-li', classId: 'cls-11cb2', subjectId: 'sub-li', teacherId: 'tch-khtn-6', periodsPerWeek: 2 }, // Hiền
  { id: 'as-11-2-hoa', classId: 'cls-11cb2', subjectId: 'sub-hoa', teacherId: 'tch-khtn-8', periodsPerWeek: 2 }, // Phi
  { id: 'as-11-2-su', classId: 'cls-11cb2', subjectId: 'sub-su', teacherId: 'tch-ls-5', periodsPerWeek: 2 }, // Rỡ
  { id: 'as-11-2-dia', classId: 'cls-11cb2', subjectId: 'sub-dia', teacherId: 'tch-ls-7', periodsPerWeek: 2 }, // Tuấn
  { id: 'as-11-2-tin', classId: 'cls-11cb2', subjectId: 'sub-tin', teacherId: 'tch-av-8', periodsPerWeek: 2 }, // Liên
  { id: 'as-11-2-td', classId: 'cls-11cb2', subjectId: 'sub-gdtc', teacherId: 'tch-td-4', periodsPerWeek: 2 }, // Ngân
  { id: 'as-11-2-qp', classId: 'cls-11cb2', subjectId: 'sub-gdqp', teacherId: 'tch-td-2', periodsPerWeek: 1 }, // Rạng

  // 11CB3
  { id: 'as-11-3-van', classId: 'cls-11cb3', subjectId: 'sub-van', teacherId: 'tch-v-4', periodsPerWeek: 3 }, // Nhịnh
  { id: 'as-11-3-toan', classId: 'cls-11cb3', subjectId: 'sub-toan', teacherId: 'tch-t-4', periodsPerWeek: 3 }, // Giang
  { id: 'as-11-3-anh', classId: 'cls-11cb3', subjectId: 'sub-anh', teacherId: 'tch-av-7', periodsPerWeek: 3 }, // V.Anh
  { id: 'as-11-3-li', classId: 'cls-11cb3', subjectId: 'sub-li', teacherId: 'tch-khtn-6', periodsPerWeek: 2 }, // Hiền
  { id: 'as-11-3-su', classId: 'cls-11cb3', subjectId: 'sub-su', teacherId: 'tch-ls-5', periodsPerWeek: 2 }, // Rỡ
  { id: 'as-11-3-dia', classId: 'cls-11cb3', subjectId: 'sub-dia', teacherId: 'tch-ls-7', periodsPerWeek: 2 }, // Tuấn
  { id: 'as-11-3-pl', classId: 'cls-11cb3', subjectId: 'sub-gdktpl', teacherId: 'tch-ls-8', periodsPerWeek: 2 }, // Trường
  { id: 'as-11-3-tin', classId: 'cls-11cb3', subjectId: 'sub-tin', teacherId: 'tch-av-8', periodsPerWeek: 2 }, // Liên
  { id: 'as-11-3-td', classId: 'cls-11cb3', subjectId: 'sub-gdtc', teacherId: 'tch-td-4', periodsPerWeek: 2 }, // Ngân
  { id: 'as-11-3-qp', classId: 'cls-11cb3', subjectId: 'sub-gdqp', teacherId: 'tch-td-2', periodsPerWeek: 1 }, // Rạng

  // 11CB4
  { id: 'as-11-4-van', classId: 'cls-11cb4', subjectId: 'sub-van', teacherId: 'tch-v-1', periodsPerWeek: 3 }, // Lắm
  { id: 'as-11-4-toan', classId: 'cls-11cb4', subjectId: 'sub-toan', teacherId: 'tch-t-4', periodsPerWeek: 3 }, // Giang
  { id: 'as-11-4-anh', classId: 'cls-11cb4', subjectId: 'sub-anh', teacherId: 'tch-av-5', periodsPerWeek: 3 }, // Quốc
  { id: 'as-11-4-li', classId: 'cls-11cb4', subjectId: 'sub-li', teacherId: 'tch-khtn-3', periodsPerWeek: 2 }, // Thùy
  { id: 'as-11-4-su', classId: 'cls-11cb4', subjectId: 'sub-su', teacherId: 'tch-ls-5', periodsPerWeek: 2 }, // Rỡ
  { id: 'as-11-4-dia', classId: 'cls-11cb4', subjectId: 'sub-dia', teacherId: 'tch-ls-7', periodsPerWeek: 2 }, // Tuấn
  { id: 'as-11-4-pl', classId: 'cls-11cb4', subjectId: 'sub-gdktpl', teacherId: 'tch-ls-8', periodsPerWeek: 2 }, // Trường
  { id: 'as-11-4-tin', classId: 'cls-11cb4', subjectId: 'sub-tin', teacherId: 'tch-av-8', periodsPerWeek: 2 }, // Liên
  { id: 'as-11-4-td', classId: 'cls-11cb4', subjectId: 'sub-gdtc', teacherId: 'tch-td-4', periodsPerWeek: 2 }, // Ngân
  { id: 'as-11-4-qp', classId: 'cls-11cb4', subjectId: 'sub-gdqp', teacherId: 'tch-td-2', periodsPerWeek: 1 }, // Rạng

  // ==========================================
  // KHỐI 12 (12CB1 - 12CB5)
  // ==========================================
  // 12CB1
  { id: 'as-12-1-van', classId: 'cls-12cb1', subjectId: 'sub-van', teacherId: 'tch-v-5', periodsPerWeek: 3 }, // Ny
  { id: 'as-12-1-toan', classId: 'cls-12cb1', subjectId: 'sub-toan', teacherId: 'tch-t-1', periodsPerWeek: 3 }, // Tới
  { id: 'as-12-1-anh', classId: 'cls-12cb1', subjectId: 'sub-anh', teacherId: 'tch-av-4', periodsPerWeek: 3 }, // Thi
  { id: 'as-12-1-li', classId: 'cls-12cb1', subjectId: 'sub-li', teacherId: 'tch-khtn-3', periodsPerWeek: 2 }, // Thùy
  { id: 'as-12-1-hoa', classId: 'cls-12cb1', subjectId: 'sub-hoa', teacherId: 'tch-khtn-7', periodsPerWeek: 2 }, // Thơ
  { id: 'as-12-1-sinh', classId: 'cls-12cb1', subjectId: 'sub-sinh', teacherId: 'tch-khtn-1', periodsPerWeek: 2 }, // Huỳnh
  { id: 'as-12-1-su', classId: 'cls-12cb1', subjectId: 'sub-su', teacherId: 'tch-ls-2', periodsPerWeek: 2 }, // Sơn
  { id: 'as-12-1-tin', classId: 'cls-12cb1', subjectId: 'sub-tin', teacherId: 'tch-av-2', periodsPerWeek: 2 }, // Hiếu
  { id: 'as-12-1-td', classId: 'cls-12cb1', subjectId: 'sub-gdtc', teacherId: 'tch-td-4', periodsPerWeek: 2 }, // Ngân
  { id: 'as-12-1-qp', classId: 'cls-12cb1', subjectId: 'sub-gdqp', teacherId: 'tch-td-2', periodsPerWeek: 1 }, // Rạng

  // 12CB2
  { id: 'as-12-2-van', classId: 'cls-12cb2', subjectId: 'sub-van', teacherId: 'tch-v-6', periodsPerWeek: 3 }, // Duyên
  { id: 'as-12-2-toan', classId: 'cls-12cb2', subjectId: 'sub-toan', teacherId: 'tch-t-6', periodsPerWeek: 3 }, // V.Toàn
  { id: 'as-12-2-anh', classId: 'cls-12cb2', subjectId: 'sub-anh', teacherId: 'tch-av-4', periodsPerWeek: 3 }, // Thi
  { id: 'as-12-2-hoa', classId: 'cls-12cb2', subjectId: 'sub-hoa', teacherId: 'tch-khtn-7', periodsPerWeek: 2 }, // Thơ
  { id: 'as-12-2-sinh', classId: 'cls-12cb2', subjectId: 'sub-sinh', teacherId: 'tch-khtn-1', periodsPerWeek: 2 }, // Huỳnh
  { id: 'as-12-2-su', classId: 'cls-12cb2', subjectId: 'sub-su', teacherId: 'tch-ls-4', periodsPerWeek: 2 }, // Trang
  { id: 'as-12-2-dia', classId: 'cls-12cb2', subjectId: 'sub-dia', teacherId: 'tch-ls-6', periodsPerWeek: 2 }, // Hòa
  { id: 'as-12-2-tin', classId: 'cls-12cb2', subjectId: 'sub-tin', teacherId: 'tch-av-2', periodsPerWeek: 2 }, // Hiếu
  { id: 'as-12-2-td', classId: 'cls-12cb2', subjectId: 'sub-gdtc', teacherId: 'tch-td-4', periodsPerWeek: 2 }, // Ngân
  { id: 'as-12-2-qp', classId: 'cls-12cb2', subjectId: 'sub-gdqp', teacherId: 'tch-td-2', periodsPerWeek: 1 }, // Rạng

  // 12CB3
  { id: 'as-12-3-van', classId: 'cls-12cb3', subjectId: 'sub-van', teacherId: 'tch-v-1', periodsPerWeek: 3 }, // Lắm
  { id: 'as-12-3-toan', classId: 'cls-12cb3', subjectId: 'sub-toan', teacherId: 'tch-t-7', periodsPerWeek: 3 }, // Hương
  { id: 'as-12-3-anh', classId: 'cls-12cb3', subjectId: 'sub-anh', teacherId: 'tch-av-4', periodsPerWeek: 3 }, // Thi
  { id: 'as-12-3-li', classId: 'cls-12cb3', subjectId: 'sub-li', teacherId: 'tch-khtn-3', periodsPerWeek: 2 }, // Thùy
  { id: 'as-12-3-su', classId: 'cls-12cb3', subjectId: 'sub-su', teacherId: 'tch-ls-5', periodsPerWeek: 2 }, // Rỡ
  { id: 'as-12-3-dia', classId: 'cls-12cb3', subjectId: 'sub-dia', teacherId: 'tch-ls-7', periodsPerWeek: 2 }, // Tuấn
  { id: 'as-12-3-pl', classId: 'cls-12cb3', subjectId: 'sub-gdktpl', teacherId: 'tch-ls-8', periodsPerWeek: 2 }, // Trường
  { id: 'as-12-3-tin', classId: 'cls-12cb3', subjectId: 'sub-tin', teacherId: 'tch-av-2', periodsPerWeek: 2 }, // Hiếu
  { id: 'as-12-3-td', classId: 'cls-12cb3', subjectId: 'sub-gdtc', teacherId: 'tch-td-4', periodsPerWeek: 2 }, // Ngân
  { id: 'as-12-3-qp', classId: 'cls-12cb3', subjectId: 'sub-gdqp', teacherId: 'tch-td-2', periodsPerWeek: 1 }, // Rạng

  // 12CB4
  { id: 'as-12-4-van', classId: 'cls-12cb4', subjectId: 'sub-van', teacherId: 'tch-v-5', periodsPerWeek: 3 }, // Ny
  { id: 'as-12-4-toan', classId: 'cls-12cb4', subjectId: 'sub-toan', teacherId: 'tch-t-1', periodsPerWeek: 3 }, // Tới
  { id: 'as-12-4-anh', classId: 'cls-12cb4', subjectId: 'sub-anh', teacherId: 'tch-av-4', periodsPerWeek: 3 }, // Thi
  { id: 'as-12-4-li', classId: 'cls-12cb4', subjectId: 'sub-li', teacherId: 'tch-khtn-3', periodsPerWeek: 2 }, // Thùy
  { id: 'as-12-4-su', classId: 'cls-12cb4', subjectId: 'sub-su', teacherId: 'tch-ls-4', periodsPerWeek: 2 }, // Trang
  { id: 'as-12-4-dia', classId: 'cls-12cb4', subjectId: 'sub-dia', teacherId: 'tch-ls-6', periodsPerWeek: 2 }, // Hòa
  { id: 'as-12-4-pl', classId: 'cls-12cb4', subjectId: 'sub-gdktpl', teacherId: 'tch-ls-8', periodsPerWeek: 2 }, // Trường
  { id: 'as-12-4-tin', classId: 'cls-12cb4', subjectId: 'sub-tin', teacherId: 'tch-av-2', periodsPerWeek: 2 }, // Hiếu
  { id: 'as-12-4-td', classId: 'cls-12cb4', subjectId: 'sub-gdtc', teacherId: 'tch-td-4', periodsPerWeek: 2 }, // Ngân
  { id: 'as-12-4-qp', classId: 'cls-12cb4', subjectId: 'sub-gdqp', teacherId: 'tch-td-2', periodsPerWeek: 1 }, // Rạng

  // 12CB5
  { id: 'as-12-5-van', classId: 'cls-12cb5', subjectId: 'sub-van', teacherId: 'tch-v-1', periodsPerWeek: 3 }, // Lắm
  { id: 'as-12-5-toan', classId: 'cls-12cb5', subjectId: 'sub-toan', teacherId: 'tch-t-6', periodsPerWeek: 3 }, // V.Toàn
  { id: 'as-12-5-anh', classId: 'cls-12cb5', subjectId: 'sub-anh', teacherId: 'tch-av-6', periodsPerWeek: 3 }, // Bền
  { id: 'as-12-5-sinh', classId: 'cls-12cb5', subjectId: 'sub-sinh', teacherId: 'tch-khtn-1', periodsPerWeek: 2 }, // Huỳnh
  { id: 'as-12-5-su', classId: 'cls-12cb5', subjectId: 'sub-su', teacherId: 'tch-ls-2', periodsPerWeek: 2 }, // Sơn
  { id: 'as-12-5-dia', classId: 'cls-12cb5', subjectId: 'sub-dia', teacherId: 'tch-ls-7', periodsPerWeek: 2 }, // Tuấn
  { id: 'as-12-5-pl', classId: 'cls-12cb5', subjectId: 'sub-gdktpl', teacherId: 'tch-ls-8', periodsPerWeek: 2 }, // Trường
  { id: 'as-12-5-cn', classId: 'cls-12cb5', subjectId: 'sub-cn', teacherId: 'tch-khtn-5', periodsPerWeek: 2 }, // Tùng
  { id: 'as-12-5-td', classId: 'cls-12cb5', subjectId: 'sub-gdtc', teacherId: 'tch-td-4', periodsPerWeek: 2 }, // Ngân
  { id: 'as-12-5-qp', classId: 'cls-12cb5', subjectId: 'sub-gdqp', teacherId: 'tch-td-2', periodsPerWeek: 1 }, // Rạng

  // Phân công mẫu THCS
  { id: 'as-thcs-1', classId: 'cls-6a1', subjectId: 'sub-sinh', teacherId: 'tch-khtn-18', periodsPerWeek: 4 },
  { id: 'as-thcs-2', classId: 'cls-6a2', subjectId: 'sub-li', teacherId: 'tch-khtn-13', periodsPerWeek: 4 },
  { id: 'as-thcs-3', classId: 'cls-6a3', subjectId: 'sub-tin', teacherId: 'tch-av-14', periodsPerWeek: 2 },
  { id: 'as-thcs-4', classId: 'cls-7a1', subjectId: 'sub-toan', teacherId: 'tch-t-10', periodsPerWeek: 4 },
  { id: 'as-thcs-5', classId: 'cls-8a1', subjectId: 'sub-toan', teacherId: 'tch-t-9', periodsPerWeek: 4 },
  { id: 'as-thcs-6', classId: 'cls-9a3', subjectId: 'sub-toan', teacherId: 'tch-t-3', periodsPerWeek: 4 },
  { id: 'as-thcs-7', classId: 'cls-9a4', subjectId: 'sub-toan', teacherId: 'tch-t-12', periodsPerWeek: 4 },
];

export const initialLockedCells: LockedCell[] = (() => {
  const locked: LockedCell[] = [];
  const thptClasses = initialClasses.filter(c => c.level === 'THPT');
  const assignedMap = new Set(initialAssignments.map(a => `${a.classId}_${a.subjectId}`));

  thptClasses.forEach(cls => {
    initialSubjects.forEach(sub => {
      const p = sub.defaultPeriods[cls.grade] || 0;
      if (p > 0 && !assignedMap.has(`${cls.id}_${sub.id}`)) {
        let reason = 'Môn không chọn';
        if (sub.id === 'sub-gddp' || sub.id === 'sub-hdtn') {
          reason = 'Chưa dạy kỳ này / Phân công sau';
        }
        locked.push({
          classId: cls.id,
          subjectId: sub.id,
          reason,
          updatedAt: Date.now()
        });
      }
    });
  });

  return locked;
})();

