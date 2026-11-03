import React, { useState, useMemo, useEffect } from 'react';
import {
  SchoolConfig,
  Teacher,
  Department,
  ClassGroup,
  Subject,
  SchoolTimetable,
  TimetableSlot,
} from '../types';
import { WeeklyTeachingLogView, ChangedTeacherInfo } from './WeeklyTeachingLogView';
import { OFFICIAL_WEEK_9_SLOTS } from '../data/officialWeek9Timetable';
import { OFFICIAL_WEEK_8_SLOTS } from '../data/officialWeek8Timetable';
import { OFFICIAL_WEEK_7_SLOTS } from '../data/officialWeek7Timetable';
import {
  calculateAllActualWorkloads,
  TeacherActualWorkload,
} from '../utils/actualTeachingHoursHelper';
import {
  Sparkles,
  RotateCcw,
  Zap,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Check,
  Search,
  SlidersHorizontal,
  Layers,
  TrendingDown,
  TrendingUp,
  History,
  Eye,
  FileSpreadsheet,
  ArrowRight,
  UserCheck,
  Info,
  Calendar,
  Building2,
  ShieldAlert,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Cpu,
  Bot,
  Brain,
  Lightbulb,
  GraduationCap,
} from 'lucide-react';

interface DraftAssignmentViewProps {
  config: SchoolConfig;
  teachers: Teacher[];
  departments: Department[];
  classes: ClassGroup[];
  subjects: Subject[];
  weeklyTimetables?: Record<number, SchoolTimetable>;
  currentWeek?: number;
  timetable?: SchoolTimetable;
  isAdmin?: boolean;
  onShowToast?: (message: string) => void;
}

const DRAFT_SANDBOX_STORAGE_KEY = 'docbinhkieu_draft_sandbox_weekly_timetables_v6';
const DRAFT_SANDBOX_ADJUSTMENT_PREFIX = 'docbinhkieu_draft_sandbox_v6';

// 19 lớp HĐTNHN cần gom gọn về 1 người dạy duy nhất:
// NGUYÊN TẮC:
// 1. Áp dụng thay đổi từ Tuần 10 đến Tuần 35 (26 tuần thực dạy). Tuần 1 đến 9 giữ nguyên số tiết đã thực dạy.
// 2. 100% người nhận lớp là GIÁO VIÊN THIẾU TIẾT (Ưu tiên 1), ưu tiên GVCN nếu thiếu tiết (Ưu tiên 2).
// 3. Tuyệt đối KHÔNG giao cho giáo viên đang thừa tiết (Toàn +39t, Thảo +35t, Tài +15t, Cẩm +51t, Ngân +51t, Phương +13t,...).
// 4. Tuyệt đối NÉ 100% môn Tin học (Bùi Kim Phướng, Mai Phước Lộc).
const CONSOLIDATION_19_CLASSES_MAP: Record<
  string,
  { teacherName: string; teacherCode: string; teacherId?: string; roleReason: string }
> = {
  '8A1': {
    teacherName: 'Nguyễn Thái Hùng',
    teacherCode: 'Hùng.NThái (8A1)',
    roleReason: 'Ưu tiên 1 & 2: GVCN 8A1 • Đang thiếu -70t/năm • Nhận trọn vẹn 2 tiết 8A1',
  },
  '7A1': {
    teacherName: 'Nguyễn Văn Ngoan',
    teacherCode: 'Ngoan.NV (7A1)',
    roleReason: 'Né Tin học (Bùi Kim Phướng) • GVCN 7A1 • Đang thiếu -70t/năm',
  },
  '7A3': {
    teacherName: 'Nguyễn Quốc Nguyễn',
    teacherCode: 'Nguyễn.NQ (7A3)',
    roleReason: 'Rút Trần Thị Cẩm (thừa +51t) • GVCN 7A3 • Đang thiếu -70t/năm',
  },
  '9A4': {
    teacherName: 'Nguyễn Văn Tài',
    teacherCode: 'Tài.NV (9A4)',
    roleReason: 'Rút Lê Thái Phương (thừa +13t) • GVCN 9A4 • Đang thiếu -70t/năm',
  },
  '8A2': {
    teacherName: 'Trần Phi Hải',
    teacherCode: 'Hải.TP (8A2)',
    roleReason: 'Ưu tiên 1: Thiếu nặng -143t/năm • GVCN 8A2 • Nhận trọn vẹn 2 tiết',
  },
  '9A3': {
    teacherName: 'Trần Phi Hải',
    teacherCode: 'Hải.TP (8A2)',
    roleReason: 'Ưu tiên 1: Thiếu nặng -143t/năm • Rút Lê Thái Phương (thừa +13t) • Nhận 9A3',
  },
  '8A4': {
    teacherName: 'Nguyễn Kim Ngân',
    teacherCode: 'Ngân.NK (8A4)',
    roleReason: 'GVCN 8A4 • Đang thiếu -24t/năm • Bù đủ chuẩn định mức (+2t)',
  },
  '9A2': {
    teacherName: 'Trần Thị Hậu',
    teacherCode: 'Hậu.TTH (9A2)',
    roleReason: 'GVCN 9A2 • Đang thiếu -7t/năm • Rút Nguyễn Thị Cẩm Nhung (thừa)',
  },
  '8A3': {
    teacherName: 'Trần Thị Hậu',
    teacherCode: 'Hậu.TTH (9A2)',
    roleReason: 'Đang thiếu -7t/năm • Tránh giao cô Xe (0t) bị thừa tiết',
  },
  '8A6': {
    teacherName: 'Trần Thị Hậu',
    teacherCode: 'Hậu.TTH (9A2)',
    roleReason: 'Đang thiếu -7t/năm • Rút Huỳnh Thanh Dân (thừa +2t)',
  },
  '8A5': {
    teacherName: 'Trần Thị Hậu',
    teacherCode: 'Hậu.TTH (9A2)',
    roleReason: 'Đang thiếu -7t/năm • Rút Võ Hoàng Toàn (thừa +39t) để giảm tải',
  },
  '6A4': {
    teacherName: 'Nguyễn Thị Thắm',
    teacherCode: 'Thắm.NT (6A2)',
    roleReason: 'Ưu tiên 1: Đang thiếu -7t/năm • Tránh giao Thầy Hùng (0t) bị thừa tiết',
  },
  '7A2': {
    teacherName: 'Nguyễn Thành Tín',
    teacherCode: 'Tín.NT (9A10)',
    roleReason: 'Ưu tiên 1: Đang thiếu -105t/năm • Né Tin học (Mai Phước Lộc) • Rút Cẩm (+51t)',
  },
  '6A3': {
    teacherName: 'Trần Kim Phương',
    teacherCode: 'Phương.TK (7A7)',
    roleReason: 'Ưu tiên 1: Đang thiếu -35t/năm • Né Tin học (Bùi Kim Phướng) • Rút Nhung (+2t)',
  },
  '6A6': {
    teacherName: 'Nguyễn Thị Lụa',
    teacherCode: 'Lụa.NT (6A10)',
    roleReason: 'Ưu tiên 1: Đang thiếu -35t/năm • Rút Lê Thị Bình (+70t) & Lê Kim Ngân (+51t)',
  },
  '7A4': {
    teacherName: 'Lê Văn Chính',
    teacherCode: 'Chính.LV (7A9)',
    roleReason: 'Ưu tiên 1: Đang thiếu -35t/năm • Cùng Tổ GDTC • Tránh giao Ẩn (0t) • Rút Cẩm (+51t)',
  },
  '7A5': {
    teacherName: 'Châu Thị Kim Hà',
    teacherCode: 'Hà.CTK',
    roleReason: 'Ưu tiên 1: Đang thiếu -105t/năm • Rút Lê Thái Phương (+13t) & Cẩm (+51t)',
  },
  '9A5': {
    teacherName: 'Trương Văn Nghĩa',
    teacherCode: 'Nghĩa.TV (TP)',
    roleReason: 'Ưu tiên 1: Đang thiếu -70t/năm • Rút Hồ Mai Thảo (+35t) & Phương (+13t)',
  },
  '6A1': {
    teacherName: 'Đinh Thị Giàu',
    teacherCode: 'Giàu.ĐT (9A8)',
    roleReason: 'Ưu tiên 1: Đang thiếu -26t/năm • Rút Hồ Thị Ngọc Tài (+15t) & Nhung (+2t)',
  },
};

// =========================================================================
// MÔN TRÍ TUỆ NHÂN TẠO (AI) - 12 TIẾT / HỌC KỲ 2
// - Thời lượng: 12 tiết / HK2 (bố trí 2 tiết/tuần trong 6 tuần từ Tuần 19 đến Tuần 24)
// - Nguyên tắc phân công:
//   1. Ưu tiên giáo viên Tin học trước theo từng điểm trường (THCS DBK -> Cô Phướng, THCS TK -> Thầy Hậu)
//   2. Riêng tại Điểm chính (THPT): Phân công cho Thầy Nguyễn Minh Trí (PHT) để vừa trực tiếp giảng dạy thực tế, vừa tránh thừa tiết quá nhiều cho GV Tin học (Thầy Hiếu, Cô Liên, Cô Diễm) & bù thiếu tiết cho BGH
// =========================================================================
export const DEFAULT_AI_CLASS_ASSIGNMENTS: Record<
  string,
  {
    teacherId: string;
    teacherName: string;
    teacherCode: string;
    campus: string;
    note: string;
  }
> = {
  // --- Điểm chính (THPT - 14 lớp) ---
  '12CB5': {
    teacherId: 'tch-bgh-2',
    teacherName: 'Nguyễn Minh Trí',
    teacherCode: 'Trí.NM (PHT)',
    campus: 'Điểm chính (THPT)',
    note: 'Thầy Trí (PHT): Trực tiếp giảng dạy • Bù đủ định mức 4t/tuần',
  },
  '12CB4': {
    teacherId: 'tch-bgh-2',
    teacherName: 'Nguyễn Minh Trí',
    teacherCode: 'Trí.NM (PHT)',
    campus: 'Điểm chính (THPT)',
    note: 'Thầy Trí (PHT): Giảm áp lực thừa tiết cho GV Tin học Điểm chính',
  },
  '12CB3': {
    teacherId: 'tch-av-2',
    teacherName: 'Nguyễn Trung Hiếu',
    teacherCode: 'Hiếu.NT (TP)',
    campus: 'Điểm chính (THPT)',
    note: 'Thầy Hiếu (Tổ phó Tin): Bù thiếu tiết môn Tin học (-175t/năm)',
  },
  '12CB2': {
    teacherId: 'tch-av-2',
    teacherName: 'Nguyễn Trung Hiếu',
    teacherCode: 'Hiếu.NT (TP)',
    campus: 'Điểm chính (THPT)',
    note: 'Thầy Hiếu (Tổ phó Tin): Bù thiếu tiết môn Tin học',
  },
  '12CB1': {
    teacherId: 'tch-av-2',
    teacherName: 'Nguyễn Trung Hiếu',
    teacherCode: 'Hiếu.NT (TP)',
    campus: 'Điểm chính (THPT)',
    note: 'Thầy Hiếu (Tổ phó Tin): Bù thiếu tiết môn Tin học',
  },
  '10CB5': {
    teacherId: 'tch-av-2',
    teacherName: 'Nguyễn Trung Hiếu',
    teacherCode: 'Hiếu.NT (TP)',
    campus: 'Điểm chính (THPT)',
    note: 'Thầy Hiếu (Tổ phó Tin): Đang dạy Tin học 10CB5',
  },
  '11CB1': {
    teacherId: 'tch-av-8',
    teacherName: 'Đào Thị Ngọc Liên',
    teacherCode: 'Liên.ĐTN (11CB4)',
    campus: 'Điểm chính (THPT)',
    note: 'Cô Liên (GV Tin 11): Phụ trách AI Khối 11',
  },
  '11CB2': {
    teacherId: 'tch-av-8',
    teacherName: 'Đào Thị Ngọc Liên',
    teacherCode: 'Liên.ĐTN (11CB4)',
    campus: 'Điểm chính (THPT)',
    note: 'Cô Liên (GV Tin 11): Phụ trách AI Khối 11',
  },
  '11CB3': {
    teacherId: 'tch-av-8',
    teacherName: 'Đào Thị Ngọc Liên',
    teacherCode: 'Liên.ĐTN (11CB4)',
    campus: 'Điểm chính (THPT)',
    note: 'Cô Liên (GV Tin 11): Phụ trách AI Khối 11',
  },
  '11CB4': {
    teacherId: 'tch-av-8',
    teacherName: 'Đào Thị Ngọc Liên',
    teacherCode: 'Liên.ĐTN (11CB4)',
    campus: 'Điểm chính (THPT)',
    note: 'Cô Liên (GV Tin 11): Phụ trách AI Khối 11 (GVCN 11CB4)',
  },
  '10CB1': {
    teacherId: 'tch-av-9',
    teacherName: 'Lê Thị Thu Diễm',
    teacherCode: 'Diễm.LTT (10CB4)',
    campus: 'Điểm chính (THPT)',
    note: 'Cô Diễm (GV Tin 10): Phụ trách AI Khối 10',
  },
  '10CB2': {
    teacherId: 'tch-av-9',
    teacherName: 'Lê Thị Thu Diễm',
    teacherCode: 'Diễm.LTT (10CB4)',
    campus: 'Điểm chính (THPT)',
    note: 'Cô Diễm (GV Tin 10): Phụ trách AI Khối 10',
  },
  '10CB3': {
    teacherId: 'tch-av-9',
    teacherName: 'Lê Thị Thu Diễm',
    teacherCode: 'Diễm.LTT (10CB4)',
    campus: 'Điểm chính (THPT)',
    note: 'Cô Diễm (GV Tin 10): Phụ trách AI Khối 10',
  },
  '10CB4': {
    teacherId: 'tch-av-9',
    teacherName: 'Lê Thị Thu Diễm',
    teacherCode: 'Diễm.LTT (10CB4)',
    campus: 'Điểm chính (THPT)',
    note: 'Cô Diễm (GV Tin 10): Phụ trách AI Khối 10 (GVCN 10CB4)',
  },

  // --- Điểm THCS Đốc Binh Kiều (24 lớp) ---
  // Khối 6 (6 lớp) -> Cô Bùi Kim Phướng (GVCN 6A3)
  '6A1': { teacherId: 'tch-av-14', teacherName: 'Bùi Kim Phướng', teacherCode: 'Phướng.BK (6A3)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học Khối 6 THCS DBK (GVCN 6A3) • Trực tiếp phụ trách AI Khối 6' },
  '6A2': { teacherId: 'tch-av-14', teacherName: 'Bùi Kim Phướng', teacherCode: 'Phướng.BK (6A3)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học Khối 6 THCS DBK (GVCN 6A3) • Trực tiếp phụ trách AI Khối 6' },
  '6A3': { teacherId: 'tch-av-14', teacherName: 'Bùi Kim Phướng', teacherCode: 'Phướng.BK (6A3)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học Khối 6 THCS DBK (GVCN 6A3) • Trực tiếp phụ trách AI Khối 6' },
  '6A4': { teacherId: 'tch-av-14', teacherName: 'Bùi Kim Phướng', teacherCode: 'Phướng.BK (6A3)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học Khối 6 THCS DBK (GVCN 6A3) • Trực tiếp phụ trách AI Khối 6' },
  '6A5': { teacherId: 'tch-av-14', teacherName: 'Bùi Kim Phướng', teacherCode: 'Phướng.BK (6A3)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học Khối 6 THCS DBK (GVCN 6A3) • Trực tiếp phụ trách AI Khối 6' },
  '6A6': { teacherId: 'tch-av-14', teacherName: 'Bùi Kim Phướng', teacherCode: 'Phướng.BK (6A3)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học Khối 6 THCS DBK (GVCN 6A3) • Trực tiếp phụ trách AI Khối 6' },
  // Khối 7 (6 lớp) -> Thầy Mai Phước Lộc (GV dạy Tin học Khối 7, GVCN 7A2)
  '7A1': { teacherId: 'tch-av-13', teacherName: 'Mai Phước Lộc', teacherCode: 'Lộc.MP (7A2)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học Khối 7 THCS DBK (GVCN 7A2) • Trực tiếp phụ trách AI Khối 7' },
  '7A2': { teacherId: 'tch-av-13', teacherName: 'Mai Phước Lộc', teacherCode: 'Lộc.MP (7A2)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học Khối 7 THCS DBK (GVCN 7A2) • Trực tiếp phụ trách AI Khối 7' },
  '7A3': { teacherId: 'tch-av-13', teacherName: 'Mai Phước Lộc', teacherCode: 'Lộc.MP (7A2)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học Khối 7 THCS DBK (GVCN 7A2) • Trực tiếp phụ trách AI Khối 7' },
  '7A4': { teacherId: 'tch-av-13', teacherName: 'Mai Phước Lộc', teacherCode: 'Lộc.MP (7A2)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học Khối 7 THCS DBK (GVCN 7A2) • Trực tiếp phụ trách AI Khối 7' },
  '7A5': { teacherId: 'tch-av-13', teacherName: 'Mai Phước Lộc', teacherCode: 'Lộc.MP (7A2)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học Khối 7 THCS DBK (GVCN 7A2) • Trực tiếp phụ trách AI Khối 7' },
  '7A6': { teacherId: 'tch-av-13', teacherName: 'Mai Phước Lộc', teacherCode: 'Lộc.MP (7A2)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học Khối 7 THCS DBK (GVCN 7A2) • Trực tiếp phụ trách AI Khối 7' },
  // Khối 8 (6 lớp) -> Thầy Mai Phước Lộc (Phụ trách AI Khối 8 để cân bằng 12 lớp - 12 lớp với Cô Phướng)
  '8A1': { teacherId: 'tch-av-13', teacherName: 'Mai Phước Lộc', teacherCode: 'Lộc.MP (7A2)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học THCS DBK • Phụ trách AI Khối 8 để cân bằng tải với Cô Phướng' },
  '8A2': { teacherId: 'tch-av-13', teacherName: 'Mai Phước Lộc', teacherCode: 'Lộc.MP (7A2)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học THCS DBK • Phụ trách AI Khối 8 để cân bằng tải với Cô Phướng' },
  '8A3': { teacherId: 'tch-av-13', teacherName: 'Mai Phước Lộc', teacherCode: 'Lộc.MP (7A2)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học THCS DBK • Phụ trách AI Khối 8 để cân bằng tải với Cô Phướng' },
  '8A4': { teacherId: 'tch-av-13', teacherName: 'Mai Phước Lộc', teacherCode: 'Lộc.MP (7A2)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học THCS DBK • Phụ trách AI Khối 8 để cân bằng tải với Cô Phướng' },
  '8A5': { teacherId: 'tch-av-13', teacherName: 'Mai Phước Lộc', teacherCode: 'Lộc.MP (7A2)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học THCS DBK • Phụ trách AI Khối 8 để cân bằng tải với Cô Phướng' },
  '8A6': { teacherId: 'tch-av-13', teacherName: 'Mai Phước Lộc', teacherCode: 'Lộc.MP (7A2)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học THCS DBK • Phụ trách AI Khối 8 để cân bằng tải với Cô Phướng' },
  // Khối 9 (6 lớp) -> Cô Bùi Kim Phướng (GV Tin học THCS DBK)
  '9A1': { teacherId: 'tch-av-14', teacherName: 'Bùi Kim Phướng', teacherCode: 'Phướng.BK (6A3)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học Khối 9 THCS DBK • Phụ trách AI Khối 9' },
  '9A2': { teacherId: 'tch-av-14', teacherName: 'Bùi Kim Phướng', teacherCode: 'Phướng.BK (6A3)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học Khối 9 THCS DBK • Phụ trách AI Khối 9' },
  '9A3': { teacherId: 'tch-av-14', teacherName: 'Bùi Kim Phướng', teacherCode: 'Phướng.BK (6A3)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học Khối 9 THCS DBK • Phụ trách AI Khối 9' },
  '9A4': { teacherId: 'tch-av-14', teacherName: 'Bùi Kim Phướng', teacherCode: 'Phướng.BK (6A3)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học Khối 9 THCS DBK • Phụ trách AI Khối 9' },
  '9A5': { teacherId: 'tch-av-14', teacherName: 'Bùi Kim Phướng', teacherCode: 'Phướng.BK (6A3)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học Khối 9 THCS DBK • Phụ trách AI Khối 9' },
  '9A6': { teacherId: 'tch-av-14', teacherName: 'Bùi Kim Phướng', teacherCode: 'Phướng.BK (6A3)', campus: 'THCS Đốc Binh Kiều', note: 'GV Tin học Khối 9 THCS DBK • Phụ trách AI Khối 9' },

  // --- Điểm THCS Tân Kiều (15 lớp) ---
  '6A7': { teacherId: 'tch-av-16', teacherName: 'Lê Phước Hậu', teacherCode: 'Hậu.LP (8A9)', campus: 'THCS Tân Kiều', note: 'GV Tin học THCS Tân Kiều' },
  '6A8': { teacherId: 'tch-av-16', teacherName: 'Lê Phước Hậu', teacherCode: 'Hậu.LP (8A9)', campus: 'THCS Tân Kiều', note: 'GV Tin học THCS Tân Kiều' },
  '6A9': { teacherId: 'tch-av-16', teacherName: 'Lê Phước Hậu', teacherCode: 'Hậu.LP (8A9)', campus: 'THCS Tân Kiều', note: 'GV Tin học THCS Tân Kiều' },
  '6A10': { teacherId: 'tch-av-16', teacherName: 'Lê Phước Hậu', teacherCode: 'Hậu.LP (8A9)', campus: 'THCS Tân Kiều', note: 'GV Tin học THCS Tân Kiều' },
  '7A7': { teacherId: 'tch-av-16', teacherName: 'Lê Phước Hậu', teacherCode: 'Hậu.LP (8A9)', campus: 'THCS Tân Kiều', note: 'GV Tin học THCS Tân Kiều' },
  '7A8': { teacherId: 'tch-av-16', teacherName: 'Lê Phước Hậu', teacherCode: 'Hậu.LP (8A9)', campus: 'THCS Tân Kiều', note: 'GV Tin học THCS Tân Kiều' },
  '7A9': { teacherId: 'tch-av-16', teacherName: 'Lê Phước Hậu', teacherCode: 'Hậu.LP (8A9)', campus: 'THCS Tân Kiều', note: 'GV Tin học THCS Tân Kiều' },
  '8A7': { teacherId: 'tch-av-16', teacherName: 'Lê Phước Hậu', teacherCode: 'Hậu.LP (8A9)', campus: 'THCS Tân Kiều', note: 'GV Tin học THCS Tân Kiều' },
  '8A8': { teacherId: 'tch-av-16', teacherName: 'Lê Phước Hậu', teacherCode: 'Hậu.LP (8A9)', campus: 'THCS Tân Kiều', note: 'GV Tin học THCS Tân Kiều' },
  '8A9': { teacherId: 'tch-av-16', teacherName: 'Lê Phước Hậu', teacherCode: 'Hậu.LP (8A9)', campus: 'THCS Tân Kiều', note: 'GV Tin học THCS Tân Kiều (GVCN 8A9)' },
  '8A10': { teacherId: 'tch-av-16', teacherName: 'Lê Phước Hậu', teacherCode: 'Hậu.LP (8A9)', campus: 'THCS Tân Kiều', note: 'GV Tin học THCS Tân Kiều' },
  '9A7': { teacherId: 'tch-av-16', teacherName: 'Lê Phước Hậu', teacherCode: 'Hậu.LP (8A9)', campus: 'THCS Tân Kiều', note: 'GV Tin học THCS Tân Kiều' },
  '9A8': { teacherId: 'tch-av-16', teacherName: 'Lê Phước Hậu', teacherCode: 'Hậu.LP (8A9)', campus: 'THCS Tân Kiều', note: 'GV Tin học THCS Tân Kiều' },
  '9A9': { teacherId: 'tch-av-16', teacherName: 'Lê Phước Hậu', teacherCode: 'Hậu.LP (8A9)', campus: 'THCS Tân Kiều', note: 'GV Tin học THCS Tân Kiều' },
  '9A10': { teacherId: 'tch-av-16', teacherName: 'Lê Phước Hậu', teacherCode: 'Hậu.LP (8A9)', campus: 'THCS Tân Kiều', note: 'GV Tin học THCS Tân Kiều' },
};

export interface SlotDifferenceItem {
  slotId: string;
  className: string;
  dayOfWeek: number;
  period: number;
  session: string;
  subjectName: string;
  oldTeacherName: string;
  oldTeacherCode: string;
  newTeacherName: string;
  newTeacherCode: string;
  reason?: string;
}

export interface TeacherWorkloadDelta {
  teacherId: string;
  teacherName: string;
  teacherCode: string;
  departmentName: string;
  campus: string;
  effectiveStandard: number;
  reductionPeriods?: number;
  duties?: string;
  oldWeeklyTeaching: number;
  newWeeklyTeaching: number;
  oldWeeklyTotal?: number;
  newWeeklyTotal?: number;
  oldWeeklyBalance: number;
  newWeeklyBalance: number;
  weeklyDelta: number;
  oldYearTeaching: number;
  newYearTeaching: number;
  oldYearBalance: number;
  newYearBalance: number;
  yearDelta: number;
  classesGained: string[];
  classesLost: string[];
}

export const DraftAssignmentView: React.FC<DraftAssignmentViewProps> = ({
  config,
  teachers,
  departments,
  classes,
  subjects,
  weeklyTimetables,
  currentWeek = 8,
  timetable,
  isAdmin = true,
  onShowToast,
}) => {
  // 1. Baseline Slots from Official Timetable (Week 9 / Week 8 / Official Timetable)
  const baselineSlots = useMemo<TimetableSlot[]>(() => {
    return (
      weeklyTimetables?.[9]?.slots ||
      OFFICIAL_WEEK_9_SLOTS ||
      weeklyTimetables?.[8]?.slots ||
      OFFICIAL_WEEK_8_SLOTS ||
      weeklyTimetables?.[7]?.slots ||
      OFFICIAL_WEEK_7_SLOTS ||
      timetable?.slots ||
      []
    );
  }, [weeklyTimetables, timetable]);

  // 2. Independent Sandbox Weekly Timetables State
  const [draftWeeklyTimetables, setDraftWeeklyTimetables] = useState<
    Record<number, SchoolTimetable>
  >(() => {
    try {
      const saved = localStorage.getItem(DRAFT_SANDBOX_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }

    const baseSlots = baselineSlots;
    const initialDraft: Record<number, SchoolTimetable> = {};
    const tByName = new Map<string, Teacher>();
    teachers.forEach((t) => tByName.set(t.name, t));
    const tById = new Map<string, Teacher>();
    teachers.forEach((t) => tById.set(t.id, t));

    for (let w = 1; w <= 35; w++) {
      const existing = weeklyTimetables?.[w];
      const sourceSlots =
        existing?.slots && existing.slots.length > 0 ? [...existing.slots] : [...baseSlots];

      // Tuần 1 đến 9: Đã thực dạy xong, bảo toàn nguyên trạng 100%
      if (w < 10) {
        initialDraft[w] = {
          id: `draft-tkb-week-${w}`,
          academicYear: config.academicYear,
          semester: 'HK1',
          weekNumber: w,
          slots: sourceSlots,
          updatedAt: Date.now(),
        };
        continue;
      }

      // Tuần 10 đến 35: Áp dụng phân công mới gom 19 lớp HĐTNHN về 1 người thiếu tiết
      let updatedSlots = sourceSlots.map((slot) => {
        const isHdtn =
          (slot.subjectId && slot.subjectId.toLowerCase().includes('hdtn')) ||
          (slot.subjectName &&
            (slot.subjectName.toLowerCase().includes('hđtn') ||
              slot.subjectName.toLowerCase().includes('trải nghiệm') ||
              slot.subjectName.toLowerCase().includes('chuyên đề') ||
              slot.subjectName.toLowerCase().includes('quy mô lớp')));

        if (!isHdtn) return slot;

        const targetConsolidation = CONSOLIDATION_19_CLASSES_MAP[slot.className];
        if (!targetConsolidation) return slot;

        const targetTeacher = tByName.get(targetConsolidation.teacherName);
        if (!targetTeacher) return slot;

        if (slot.teacherName !== targetTeacher.name) {
          return {
            ...slot,
            teacherId: targetTeacher.id,
            teacherName: targetTeacher.name,
            teacherCode: targetTeacher.code,
          };
        }
        return slot;
      });

      // Tuần 19 đến 24 (6 tuần HK2): Áp dụng phân công môn Trí tuệ nhân tạo (AI) 2 tiết/tuần
      if (w >= 19 && w <= 24) {
        const aiSlotsToAdd: TimetableSlot[] = [];
        classes.forEach((cls, cIdx) => {
          const aiConfig = DEFAULT_AI_CLASS_ASSIGNMENTS[cls.name];
          if (!aiConfig) return;
          const assignedTeacher = tById.get(aiConfig.teacherId);
          if (!assignedTeacher) return;

          const session: 'SANG' | 'CHIEU' =
            cls.level === 'THPT'
              ? 'SANG'
              : ['6A1', '6A2', '6A3', '8A1', '8A2', '8A3', '6A7', '6A8', '8A7', '8A8'].includes(cls.name)
              ? 'SANG'
              : 'CHIEU';

          aiSlotsToAdd.push({
            id: `slot-ai-${cls.name}-w${w}-1`,
            classId: cls.id,
            className: cls.name,
            teacherId: assignedTeacher.id,
            teacherName: assignedTeacher.name,
            teacherCode: assignedTeacher.code,
            subjectId: 'sub-ai',
            subjectName: 'Trí tuệ nhân tạo (AI)',
            dayOfWeek: (cIdx % 4) + 2,
            session,
            period: 4,
          });

          aiSlotsToAdd.push({
            id: `slot-ai-${cls.name}-w${w}-2`,
            classId: cls.id,
            className: cls.name,
            teacherId: assignedTeacher.id,
            teacherName: assignedTeacher.name,
            teacherCode: assignedTeacher.code,
            subjectId: 'sub-ai',
            subjectName: 'Trí tuệ nhân tạo (AI)',
            dayOfWeek: ((cIdx + 2) % 4) + 2,
            session,
            period: 5,
          });
        });

        updatedSlots = [...updatedSlots, ...aiSlotsToAdd];
      }

      initialDraft[w] = {
        id: `draft-tkb-week-${w}`,
        academicYear: config.academicYear,
        semester: w <= 18 ? 'HK1' : 'HK2',
        weekNumber: w,
        slots: updatedSlots,
        updatedAt: Date.now(),
      };
    }
    return initialDraft;
  });

  // Master draft timetable for fallback
  const draftMasterTimetable = useMemo<SchoolTimetable>(() => {
    const slots =
      draftWeeklyTimetables[currentWeek]?.slots ||
      draftWeeklyTimetables[8]?.slots ||
      timetable?.slots ||
      [];
    return {
      id: 'draft-master-timetable',
      academicYear: config.academicYear,
      semester: config.semester,
      slots,
      updatedAt: Date.now(),
    };
  }, [draftWeeklyTimetables, currentWeek, timetable, config]);

  // Persist sandbox to localStorage
  const persistDraft = (data: Record<number, SchoolTimetable>) => {
    setDraftWeeklyTimetables(data);
    try {
      localStorage.setItem(DRAFT_SANDBOX_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save draft sandbox to localStorage', e);
    }
  };

  // State for Quick Reassignment Modal
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('cls-6a1');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedNewTeacherId, setSelectedNewTeacherId] = useState<string>('');
  const [applyScope, setApplyScope] = useState<'CURRENT_ONWARD' | 'ALL_SEMESTER'>('CURRENT_ONWARD');

  // UI State for Change Tracking Panel
  const [isDiffDrawerOpen, setIsDiffDrawerOpen] = useState(true);
  const [diffFilterTab, setDiffFilterTab] = useState<'ALL' | 'GAINED' | 'LOST' | 'SLOTS'>('ALL');
  const [diffSearchTerm, setDiffSearchTerm] = useState('');
  const [actionBannerMessage, setActionBannerMessage] = useState<{
    type: 'success' | 'info';
    title: string;
    detail: string;
  } | null>(null);
  const [showAnnualBreakdownTable, setShowAnnualBreakdownTable] = useState(false);

  // AI Assignment Drawer & Custom class-teacher mapping
  const [isAiAssignmentDrawerOpen, setIsAiAssignmentDrawerOpen] = useState(true);
  const [isStrategyDrawerOpen, setIsStrategyDrawerOpen] = useState(true);
  const [aiCampusFilterTab, setAiCampusFilterTab] = useState<'ALL' | 'THPT' | 'THCS_DBK' | 'THCS_TK'>('ALL');
  const [aiCustomClassTeacherMap, setAiCustomClassTeacherMap] = useState<Record<string, string>>(() => {
    const initialMap: Record<string, string> = {};
    Object.keys(DEFAULT_AI_CLASS_ASSIGNMENTS).forEach((c) => {
      initialMap[c] = DEFAULT_AI_CLASS_ASSIGNMENTS[c].teacherId;
    });
    return initialMap;
  });

  // Check if AI slots are currently active in the draft (weeks 19-24)
  const isAiCurrentlyInDraft = useMemo(() => {
    const w19 = draftWeeklyTimetables[19]?.slots || [];
    return w19.some((s) => s.subjectId === 'sub-ai' || s.subjectName?.toLowerCase().includes('trí tuệ'));
  }, [draftWeeklyTimetables]);

  // Teacher map for easy lookup
  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers]);
  const teacherByName = useMemo(() => new Map(teachers.map((t) => [t.name, t])), [teachers]);
  const departmentMap = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);

  // Fill teacherId in CONSOLIDATION_19_CLASSES_MAP
  useEffect(() => {
    Object.keys(CONSOLIDATION_19_CLASSES_MAP).forEach((cName) => {
      const entry = CONSOLIDATION_19_CLASSES_MAP[cName];
      const match = teacherByName.get(entry.teacherName);
      if (match) {
        entry.teacherId = match.id;
      }
    });
  }, [teacherByName]);

  // Check if HĐTN is already consolidated in the draft
  const isHdtnConsolidatedInDraft = useMemo(() => {
    const sampleWeekSlots =
      draftWeeklyTimetables[10]?.slots ||
      draftWeeklyTimetables[currentWeek]?.slots ||
      [];
    const slots8A1Hdtn = sampleWeekSlots.filter(
      (s) =>
        (s.className === '8A1' || s.classId === 'cls-8a1') &&
        (s.subjectId.includes('hdtn') || s.subjectName.includes('HĐTNHN'))
    );
    const uniqueTeachers = new Set(slots8A1Hdtn.map((s) => s.teacherName));
    return uniqueTeachers.size === 1 && uniqueTeachers.has('Nguyễn Thái Hùng');
  }, [draftWeeklyTimetables, currentWeek]);

  // =========================================================================
  // OFFICIAL CALCULATION ENGINE: RUN WORKLOAD ENGINE FOR BASELINE & DRAFT
  // Đánh giá tại Tuần 10 (thời điểm phân công mới bắt đầu có hiệu lực đến Tuần 35)
  // Các tuần từ 1 đến 9 đã thực dạy được giữ nguyên 100%.
  // =========================================================================
  const baseActualWorkloads = useMemo(() => {
    return calculateAllActualWorkloads(
      10,
      teachers,
      departments,
      classes,
      subjects,
      config,
      weeklyTimetables,
      timetable,
      35,
      {},
      1,
      35
    );
  }, [teachers, departments, classes, subjects, config, weeklyTimetables, timetable]);

  const draftActualWorkloads = useMemo(() => {
    return calculateAllActualWorkloads(
      10,
      teachers,
      departments,
      classes,
      subjects,
      config,
      draftWeeklyTimetables,
      draftMasterTimetable,
      35,
      {},
      1,
      35
    );
  }, [teachers, departments, classes, subjects, config, draftWeeklyTimetables, draftMasterTimetable]);

  // =========================================================================
  // CORE ENGINE: CALCULATE PRECISE DIFFERENCES (SLOT DIFFS & TEACHER DELTAS)
  // =========================================================================
  const { slotDifferences, teacherDeltas, totalSlotChangesCount, annualImpact } = useMemo(() => {
    const currentDraftSlots =
      draftWeeklyTimetables[10]?.slots ||
      draftWeeklyTimetables[currentWeek]?.slots ||
      [];

    // Map baseline slots by unique key: classId + day + session + period
    const baselineMap = new Map<string, TimetableSlot>();
    baselineSlots.forEach((slot) => {
      const key = `${slot.classId || slot.className}_${slot.dayOfWeek}_${slot.session}_${slot.period}`;
      baselineMap.set(key, slot);
    });

    const diffs: SlotDifferenceItem[] = [];
    const gainedMap = new Map<string, string[]>(); // teacherName -> ['6A1 (HĐTN)', ...]
    const lostMap = new Map<string, string[]>();

    currentDraftSlots.forEach((draftSlot) => {
      const key = `${draftSlot.classId || draftSlot.className}_${draftSlot.dayOfWeek}_${draftSlot.session}_${draftSlot.period}`;
      const base = baselineMap.get(key);

      if (base && base.teacherName !== draftSlot.teacherName) {
        const cReason = CONSOLIDATION_19_CLASSES_MAP[draftSlot.className]?.roleReason;
        diffs.push({
          slotId: draftSlot.id,
          className: draftSlot.className,
          dayOfWeek: draftSlot.dayOfWeek,
          period: draftSlot.period,
          session: draftSlot.session,
          subjectName: draftSlot.subjectName,
          oldTeacherName: base.teacherName,
          oldTeacherCode: base.teacherCode,
          newTeacherName: draftSlot.teacherName,
          newTeacherCode: draftSlot.teacherCode,
          reason: cReason,
        });

        // Track labels
        const label = `${draftSlot.className} (${draftSlot.subjectName} T${draftSlot.period} Thứ ${draftSlot.dayOfWeek})`;
        if (!gainedMap.has(draftSlot.teacherName)) gainedMap.set(draftSlot.teacherName, []);
        gainedMap.get(draftSlot.teacherName)!.push(label);

        if (!lostMap.has(base.teacherName)) lostMap.set(base.teacherName, []);
        lostMap.get(base.teacherName)!.push(label);
      }
    });

    // Also include newly added AI slots in HK2 (Tuần 19 đến Tuần 24)
    const week19Slots = draftWeeklyTimetables[19]?.slots || [];
    const seenAiClass = new Set<string>();
    week19Slots.forEach((draftSlot) => {
      const isAi =
        draftSlot.subjectId === 'sub-ai' ||
        draftSlot.subjectName?.toLowerCase().includes('trí tuệ');
      if (isAi && !seenAiClass.has(draftSlot.className)) {
        seenAiClass.add(draftSlot.className);
        diffs.push({
          slotId: draftSlot.id,
          className: draftSlot.className,
          dayOfWeek: draftSlot.dayOfWeek,
          period: draftSlot.period,
          session: draftSlot.session,
          subjectName: 'Trí tuệ nhân tạo (AI)',
          oldTeacherName: '— (Môn mới HK2)',
          oldTeacherCode: '—',
          newTeacherName: draftSlot.teacherName,
          newTeacherCode: draftSlot.teacherCode,
          reason: 'Môn Trí tuệ nhân tạo (AI) - 12 tiết / HK2 (Tuần 19-24: 2t/tuần)',
        });

        const label = `${draftSlot.className} (Môn AI - 12t/HK2)`;
        if (!gainedMap.has(draftSlot.teacherName)) gainedMap.set(draftSlot.teacherName, []);
        if (!gainedMap.get(draftSlot.teacherName)!.includes(label)) {
          gainedMap.get(draftSlot.teacherName)!.push(label);
        }
      }
    });

    // Map official workloads by teacherId
    const baseWorkloadMap = new Map<string, TeacherActualWorkload>(
      baseActualWorkloads.map((w) => [w.teacherId, w])
    );
    const draftWorkloadMap = new Map<string, TeacherActualWorkload>(
      draftActualWorkloads.map((w) => [w.teacherId, w])
    );

    // Build teacher delta list from official calculations
    const deltas: TeacherWorkloadDelta[] = [];
    teachers.forEach((t) => {
      const bW = baseWorkloadMap.get(t.id);
      const dW = draftWorkloadMap.get(t.id);
      if (!bW || !dW) return;

      const weeklyDelta = dW.weeklyBalance - bW.weeklyBalance;
      const yearDelta = dW.semesterBalance - bW.semesterBalance;
      const teachingDelta = dW.teachingPeriods - bW.teachingPeriods;

      if (weeklyDelta !== 0 || yearDelta !== 0 || teachingDelta !== 0 || gainedMap.has(t.name) || lostMap.has(t.name)) {
        deltas.push({
          teacherId: t.id,
          teacherName: t.name,
          teacherCode: t.code,
          departmentName: departmentMap.get(t.departmentId) || bW.departmentName || 'Chưa xếp tổ',
          campus:
            t.campus === 'THPTDBK'
              ? 'Điểm chính (THPT)'
              : t.campus === 'THCSTK'
              ? 'THCS Tân Kiều'
              : 'THCS Đốc Binh Kiều',
          effectiveStandard: bW.standardPeriods,
          reductionPeriods: bW.reductionPeriods,
          duties: bW.duties,
          oldWeeklyTeaching: bW.teachingPeriods,
          newWeeklyTeaching: dW.teachingPeriods,
          oldWeeklyTotal: bW.totalPeriods,
          newWeeklyTotal: dW.totalPeriods,
          oldWeeklyBalance: bW.weeklyBalance,
          newWeeklyBalance: dW.weeklyBalance,
          weeklyDelta: weeklyDelta,
          oldYearTeaching: bW.semesterTotalTeaching,
          newYearTeaching: dW.semesterTotalTeaching,
          oldYearBalance: bW.semesterBalance,
          newYearBalance: dW.semesterBalance,
          yearDelta: yearDelta,
          classesGained: gainedMap.get(t.name) || [],
          classesLost: lostMap.get(t.name) || [],
        });
      }
    });

    // Sort deltas: teachers gained most at top, then teachers lost most
    deltas.sort((a, b) => b.yearDelta - a.yearDelta || b.weeklyDelta - a.weeklyDelta);

    // 1. Gained Group (Giáo viên thiếu tiết được bù)
    const gainedList = deltas.filter((d) => d.yearDelta > 0 || d.weeklyDelta > 0);
    const gainedCount = gainedList.length;
    const gainedTotalWeekly = gainedList.reduce((acc, d) => acc + Math.max(0, d.weeklyDelta), 0);
    const gainedTotalYear = gainedList.reduce((acc, d) => acc + Math.max(0, d.yearDelta), 0);
    const gainedOldDeficitYear = gainedList.reduce((acc, d) => acc + Math.min(0, d.oldYearBalance), 0);
    const gainedNewDeficitYear = gainedList.reduce((acc, d) => acc + Math.min(0, d.newYearBalance), 0);

    // 2. Lost Group (Giáo viên giảm tiết do né Tin học hoặc giảm tải thừa tiết)
    const lostList = deltas.filter((d) => d.yearDelta < 0 || d.weeklyDelta < 0);
    const lostCount = lostList.length;
    const lostTotalWeekly = Math.abs(lostList.reduce((acc, d) => acc + Math.min(0, d.weeklyDelta), 0));
    const lostTotalYear = Math.abs(lostList.reduce((acc, d) => acc + Math.min(0, d.yearDelta), 0));
    const tinHocLostYear = lostList
      .filter((d) => d.teacherName === 'Bùi Kim Phướng' || d.teacherName === 'Mai Phước Lộc')
      .reduce((acc, d) => acc + Math.abs(d.yearDelta), 0);
    const hauLostYear = lostList
      .filter((d) => d.teacherName === 'Trần Thị Hậu')
      .reduce((acc, d) => acc + Math.abs(d.yearDelta), 0);

    // 3. Campus Breakdown
    const campusBreakdown = [
      {
        campusKey: 'THPT',
        name: 'Điểm chính (Cấp THPT)',
        teacherCount: teachers.filter(
          (t) => t.campus === 'THPTDBK' && t.role !== 'HieuTruong'
        ).length,
        changedTeachersCount: deltas.filter((d) => d.campus.includes('THPT')).length,
        deltaYear: deltas
          .filter((d) => d.campus.includes('THPT'))
          .reduce((acc, d) => acc + d.yearDelta, 0),
        statusBadge:
          deltas.filter((d) => d.campus.includes('THPT')).length > 0
            ? 'Tập huấn & Dạy AI (HK2)'
            : 'Ổn định 100%',
        badgeColor:
          deltas.filter((d) => d.campus.includes('THPT')).length > 0
            ? 'bg-purple-100 text-purple-800 border-purple-200'
            : 'bg-emerald-100 text-emerald-800 border-emerald-200',
        note:
          deltas.filter((d) => d.campus.includes('THPT')).length > 0
            ? 'Thầy Trí (PHT) + Thầy Hiếu, Cô Liên, Cô Diễm đảm nhiệm 14 lớp môn AI'
            : 'Bảo toàn tuyệt đối, không có bất kỳ xáo trộn nào ở cấp THPT',
      },
      {
        campusKey: 'THCS_DBK',
        name: 'Điểm THCS Đốc Binh Kiều',
        teacherCount: teachers.filter(
          (t) => t.campus === 'THCSDBK' && t.role !== 'HieuTruong' && t.role !== 'PhoHieuTruong'
        ).length,
        changedTeachersCount: deltas.filter((d) => d.campus.includes('Đốc Binh Kiều')).length,
        deltaYear: deltas
          .filter((d) => d.campus.includes('Đốc Binh Kiều'))
          .reduce((acc, d) => acc + d.yearDelta, 0),
        statusBadge: 'Tái cân bằng nội bộ',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        note: 'Điều chuyển 19 tiết/tuần (665t/năm): bù thiếu cho 13 GVCN & né môn Tin học',
      },
      {
        campusKey: 'THCS_TK',
        name: 'Điểm THCS Tân Kiều',
        teacherCount: teachers.filter(
          (t) => t.campus === 'THCSTK' && t.role !== 'HieuTruong' && t.role !== 'PhoHieuTruong'
        ).length,
        changedTeachersCount: deltas.filter((d) => d.campus.includes('Tân Kiều')).length,
        deltaYear: deltas
          .filter((d) => d.campus.includes('Tân Kiều'))
          .reduce((acc, d) => acc + d.yearDelta, 0),
        statusBadge: 'Ổn định 100%',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        note: 'Giữ nguyên phân công hiện hành, không bị ảnh hưởng',
      },
    ];

    // 4. Department Breakdown
    const deptMap = new Map<
      string,
      {
        deptId: string;
        deptName: string;
        teacherCount: number;
        changedCount: number;
        gainedCount: number;
        lostCount: number;
        deltaYear: number;
        teachersSummary: string[];
      }
    >();

    departments.forEach((d) => {
      deptMap.set(d.id, {
        deptId: d.id,
        deptName: d.name,
        teacherCount: teachers.filter(
          (t) => t.departmentId === d.id && t.role !== 'HieuTruong' && t.role !== 'PhoHieuTruong'
        ).length,
        changedCount: 0,
        gainedCount: 0,
        lostCount: 0,
        deltaYear: 0,
        teachersSummary: [],
      });
    });

    deltas.forEach((d) => {
      const t = teacherMap.get(d.teacherId);
      if (t && deptMap.has(t.departmentId)) {
        const item = deptMap.get(t.departmentId)!;
        item.changedCount++;
        if (d.weeklyDelta > 0) item.gainedCount++;
        if (d.weeklyDelta < 0) item.lostCount++;
        item.deltaYear += d.yearDelta;
        item.teachersSummary.push(
          `${d.teacherName} (${d.weeklyDelta > 0 ? `+${d.yearDelta}` : d.yearDelta}t/năm)`
        );
      }
    });

    const departmentBreakdown = Array.from(deptMap.values()).filter((d) => d.changedCount > 0);

    return {
      slotDifferences: diffs,
      teacherDeltas: deltas,
      totalSlotChangesCount: diffs.length,
      annualImpact: {
        gainedCount,
        gainedTotalWeekly,
        gainedTotalYear,
        gainedOldDeficitYear,
        gainedNewDeficitYear,
        lostCount,
        lostTotalWeekly,
        lostTotalYear,
        tinHocLostYear,
        hauLostYear,
        campusBreakdown,
        departmentBreakdown,
      },
    };
  }, [baselineSlots, draftWeeklyTimetables, currentWeek, teachers, departmentMap, teacherMap, departments, baseActualWorkloads, draftActualWorkloads]);

  // Filtered deltas based on filter tabs & search term
  const filteredTeacherDeltas = useMemo(() => {
    return teacherDeltas.filter((item) => {
      if (diffFilterTab === 'GAINED' && item.weeklyDelta <= 0) return false;
      if (diffFilterTab === 'LOST' && item.weeklyDelta >= 0) return false;

      if (diffSearchTerm.trim()) {
        const term = diffSearchTerm.toLowerCase();
        const matchName = item.teacherName.toLowerCase().includes(term);
        const matchCode = item.teacherCode.toLowerCase().includes(term);
        const matchDept = item.departmentName.toLowerCase().includes(term);
        return matchName || matchCode || matchDept;
      }
      return true;
    });
  }, [teacherDeltas, diffFilterTab, diffSearchTerm]);

  // Summary counts
  const gainedTeachersCount = useMemo(() => teacherDeltas.filter((t) => t.weeklyDelta > 0).length, [teacherDeltas]);
  const lostTeachersCount = useMemo(() => teacherDeltas.filter((t) => t.weeklyDelta < 0).length, [teacherDeltas]);

  // Map of changed teachers to pass into WeeklyTeachingLogView for visual highlighting & 3-way filtering
  const changedTeachersMap = useMemo(() => {
    if (totalSlotChangesCount === 0) return undefined;
    const map = new Map<string, ChangedTeacherInfo>();
    teacherDeltas.forEach((d) => {
      map.set(d.teacherId, {
        deltaYear: d.yearDelta,
        deltaWeekly: d.weeklyDelta,
        oldYearBalance: d.oldYearBalance,
        newYearBalance: d.newYearBalance,
        type: d.yearDelta > 0 ? 'GAINED' : d.yearDelta < 0 ? 'LOST' : 'MODIFIED',
        reason:
          d.classesGained.length > 0
            ? `Nhận lớp ${d.classesGained.join(', ')}`
            : d.classesLost.length > 0
            ? `Rút khỏi ${d.classesLost.join(', ')}`
            : undefined,
      });
    });
    return map;
  }, [teacherDeltas, totalSlotChangesCount]);

  // 1. ACTION: Pilot Consolidate 19 classes HĐTNHN
  const handleApplyHdtnConsolidation = () => {
    // Note: Do not use window.confirm in iframe sandbox as it is silently blocked by browsers
    const baseSlots = baselineSlots;
    const nextDraft: Record<number, SchoolTimetable> = {};
    let totalUpdatedSlotsCount = 0;

    for (let w = 1; w <= 35; w++) {
      const existing = draftWeeklyTimetables[w];
      const sourceSlots =
        existing?.slots && existing.slots.length > 0 ? existing.slots : baseSlots;

      // Tuần 1 đến 9: Đã thực dạy xong, giữ nguyên 100% không thay đổi!
      if (w < 10) {
        nextDraft[w] = {
          id: `draft-tkb-week-${w}`,
          academicYear: config.academicYear,
          semester: 'HK1',
          weekNumber: w,
          slots: [...sourceSlots],
          updatedAt: Date.now(),
        };
        continue;
      }

      // Tuần 10 đến 35: Áp dụng phân công mới gom 19 lớp về 1 người dạy
      const updatedSlots = sourceSlots.map((slot) => {
        const isHdtn =
          (slot.subjectId && slot.subjectId.toLowerCase().includes('hdtn')) ||
          (slot.subjectName &&
            (slot.subjectName.toLowerCase().includes('hđtn') ||
              slot.subjectName.toLowerCase().includes('trải nghiệm') ||
              slot.subjectName.toLowerCase().includes('chuyên đề') ||
              slot.subjectName.toLowerCase().includes('quy mô lớp')));

        if (!isHdtn) return slot;

        const targetConsolidation = CONSOLIDATION_19_CLASSES_MAP[slot.className];
        if (!targetConsolidation) return slot;

        const targetTeacher =
          teacherByName.get(targetConsolidation.teacherName) ||
          (targetConsolidation.teacherId
            ? teacherMap.get(targetConsolidation.teacherId)
            : null);

        if (!targetTeacher) return slot;

        if (slot.teacherName !== targetTeacher.name) {
          if (w === 10) totalUpdatedSlotsCount++;
          return {
            ...slot,
            teacherId: targetTeacher.id,
            teacherName: targetTeacher.name,
            teacherCode: targetTeacher.code,
          };
        }
        return slot;
      });

      nextDraft[w] = {
        id: `draft-tkb-week-${w}`,
        academicYear: config.academicYear,
        semester: w <= 18 ? 'HK1' : 'HK2',
        weekNumber: w,
        slots: updatedSlots,
        updatedAt: Date.now(),
      };
    }

    persistDraft(nextDraft);
    setIsDiffDrawerOpen(true);
    setActionBannerMessage({
      type: 'success',
      title: 'Đã hoàn tất thí điểm gom 19 lớp HĐTNHN về 1 giáo viên duy nhất (Từ Tuần 10)!',
      detail: `Áp dụng thay đổi từ Tuần 10 đến Tuần 35 (26 tuần thực dạy). Tuần 1 đến 9 đã dạy được bảo toàn nguyên trạng. Đã gom trọn vẹn 19 lớp cho người thiếu tiết cả năm & GVCN, né 100% môn Tin học và không giao thêm cho người thừa tiết.`,
    });

    if (onShowToast) {
      onShowToast(
        `✓ Đã thí điểm gom 19 lớp HĐTNHN áp dụng từ Tuần 10 đến Tuần 35! Bảng đối soát chi tiết đã được cập nhật ngay bên dưới.`
      );
    }
  };

  // 2. ACTION: Reset draft from official Week 8 baseline
  const handleResetToOfficialWeek8 = () => {
    const baseSlots = baselineSlots;
    const freshDraft: Record<number, SchoolTimetable> = {};
    for (let w = 1; w <= 35; w++) {
      freshDraft[w] = {
        id: `draft-tkb-week-${w}`,
        academicYear: config.academicYear,
        semester: w <= 18 ? 'HK1' : 'HK2',
        weekNumber: w,
        slots: [...baseSlots],
        updatedAt: Date.now(),
      };
    }

    persistDraft(freshDraft);
    try {
      localStorage.removeItem(DRAFT_SANDBOX_STORAGE_KEY);
    } catch {
      /* ignore */
    }

    setActionBannerMessage({
      type: 'info',
      title: 'Đã đặt lại bản Dự thảo về nguyên bản Thời Khóa Biểu Tuần 8 chính thức!',
      detail: 'Mọi thay đổi thử nghiệm đã được làm mới hoàn toàn. Bản dự thảo đang ở trạng thái TKB Tuần 8.',
    });

    if (onShowToast) {
      onShowToast('Đã đặt lại bản Dự thảo phân công về nguyên bản Thời khóa biểu Tuần 8 chính thức!');
    }
  };

  // AI Assignment Summary Stats
  const aiStats = useMemo(() => {
    let triClassCount = 0;
    let hieuClassCount = 0;
    let lienClassCount = 0;
    let diemClassCount = 0;
    let locClassCount = 0; // Thầy Mai Phước Lộc
    let phuongClassCount = 0;
    let hauClassCount = 0;

    classes.forEach((cls) => {
      const tId = aiCustomClassTeacherMap[cls.name] || DEFAULT_AI_CLASS_ASSIGNMENTS[cls.name]?.teacherId;
      if (tId === 'tch-bgh-2') triClassCount++;
      else if (tId === 'tch-av-2') hieuClassCount++;
      else if (tId === 'tch-av-8') lienClassCount++;
      else if (tId === 'tch-av-9') diemClassCount++;
      else if (tId === 'tch-av-13') locClassCount++;
      else if (tId === 'tch-av-14') phuongClassCount++;
      else if (tId === 'tch-av-16') hauClassCount++;
    });

    return {
      triClassCount,
      triPeriods: triClassCount * 12,
      hieuClassCount,
      hieuPeriods: hieuClassCount * 12,
      lienClassCount,
      lienPeriods: lienClassCount * 12,
      diemClassCount,
      diemPeriods: diemClassCount * 12,
      locClassCount,
      locPeriods: locClassCount * 12,
      phuongClassCount,
      phuongPeriods: phuongClassCount * 12,
      hauClassCount,
      hauPeriods: hauClassCount * 12,
      totalClasses: classes.length,
      totalPeriods: classes.length * 12,
    };
  }, [classes, aiCustomClassTeacherMap]);

  // 2.5. ACTION: Apply / Update Pilot AI Subject Assignments (HK2: Tuần 19 - 24)
  const handleApplyAiAssignment = (customAssignments?: Record<string, string>) => {
    const activeMap = customAssignments || aiCustomClassTeacherMap;
    const nextDraft: Record<number, SchoolTimetable> = {};
    const baseSlots = baselineSlots;

    for (let w = 1; w <= 35; w++) {
      const existing = draftWeeklyTimetables[w];
      const sourceSlots =
        existing?.slots && existing.slots.length > 0 ? existing.slots : baseSlots;

      // Filter out existing AI slots first
      const cleanedSlots = sourceSlots.filter(
        (s) => s.subjectId !== 'sub-ai' && !s.subjectName?.toLowerCase().includes('trí tuệ')
      );

      // Weeks 19 to 24 (6 weeks of HK2): Inject 2 periods/week for each class
      if (w >= 19 && w <= 24) {
        const aiSlotsToAdd: TimetableSlot[] = [];
        classes.forEach((cls, cIdx) => {
          const assignedTeacherId =
            activeMap[cls.name] ||
            DEFAULT_AI_CLASS_ASSIGNMENTS[cls.name]?.teacherId;
          if (!assignedTeacherId) return;

          const teacherObj = teacherMap.get(assignedTeacherId);
          if (!teacherObj) return;

          const isThpt = cls.level === 'THPT';
          const session: 'SANG' | 'CHIEU' = isThpt
            ? 'SANG'
            : ['6A1', '6A2', '6A3', '8A1', '8A2', '8A3', '6A7', '6A8', '8A7', '8A8'].includes(cls.name)
            ? 'SANG'
            : 'CHIEU';

          aiSlotsToAdd.push({
            id: `slot-ai-${cls.name}-w${w}-1`,
            classId: cls.id,
            className: cls.name,
            teacherId: teacherObj.id,
            teacherName: teacherObj.name,
            teacherCode: teacherObj.code,
            subjectId: 'sub-ai',
            subjectName: 'Trí tuệ nhân tạo (AI)',
            dayOfWeek: (cIdx % 4) + 2,
            session,
            period: 4,
          });

          aiSlotsToAdd.push({
            id: `slot-ai-${cls.name}-w${w}-2`,
            classId: cls.id,
            className: cls.name,
            teacherId: teacherObj.id,
            teacherName: teacherObj.name,
            teacherCode: teacherObj.code,
            subjectId: 'sub-ai',
            subjectName: 'Trí tuệ nhân tạo (AI)',
            dayOfWeek: ((cIdx + 2) % 4) + 2,
            session,
            period: 5,
          });
        });

        nextDraft[w] = {
          id: `draft-tkb-week-${w}`,
          academicYear: config.academicYear,
          semester: 'HK2',
          weekNumber: w,
          slots: [...cleanedSlots, ...aiSlotsToAdd],
          updatedAt: Date.now(),
        };
      } else {
        nextDraft[w] = {
          id: `draft-tkb-week-${w}`,
          academicYear: config.academicYear,
          semester: w <= 18 ? 'HK1' : 'HK2',
          weekNumber: w,
          slots: cleanedSlots,
          updatedAt: Date.now(),
        };
      }
    }

    persistDraft(nextDraft);
    setIsDiffDrawerOpen(true);
    setActionBannerMessage({
      type: 'success',
      title: 'Đã hoàn tất phân công thí điểm môn Trí tuệ nhân tạo (AI) trong Học kỳ 2 (Tuần 19 - 24)!',
      detail: `Áp dụng 12 tiết/lớp (2 tiết/tuần trong 6 tuần). Thầy Nguyễn Minh Trí (PHT) được phân công trực tiếp để giảm tải cho giáo viên Tin học và bù đủ định mức 4 tiết/tuần. Mọi số liệu đã được cập nhật vào Bảng tính số tiết thực dạy bên dưới.`,
    });

    if (onShowToast) {
      onShowToast(
        `✓ Đã thí điểm phân công môn AI 12 tiết/HK2! Thầy Nguyễn Minh Trí đã được gán lớp và cập nhật số tiết.`
      );
    }
  };

  const handleRemoveAiAssignment = () => {
    const nextDraft: Record<number, SchoolTimetable> = {};
    for (let w = 1; w <= 35; w++) {
      const existing = draftWeeklyTimetables[w];
      const sourceSlots = existing?.slots || baselineSlots;
      const cleanedSlots = sourceSlots.filter(
        (s) => s.subjectId !== 'sub-ai' && !s.subjectName?.toLowerCase().includes('trí tuệ')
      );
      nextDraft[w] = {
        id: `draft-tkb-week-${w}`,
        academicYear: config.academicYear,
        semester: w <= 18 ? 'HK1' : 'HK2',
        weekNumber: w,
        slots: cleanedSlots,
        updatedAt: Date.now(),
      };
    }
    persistDraft(nextDraft);
    setActionBannerMessage({
      type: 'info',
      title: 'Đã gỡ bỏ phân công môn AI khỏi bản Dự thảo',
      detail: 'Bản dự thảo đã được trả về trạng thái trước khi phân công môn AI.',
    });
    if (onShowToast) {
      onShowToast(`Đã gỡ bỏ môn AI khỏi bản Dự thảo.`);
    }
  };

  const handleChangeAiClassTeacher = (className: string, teacherId: string) => {
    const updatedMap = { ...aiCustomClassTeacherMap, [className]: teacherId };
    setAiCustomClassTeacherMap(updatedMap);
    handleApplyAiAssignment(updatedMap);
  };

  const handlePresetTriClasses = (triClasses: string[]) => {
    const nextMap = { ...aiCustomClassTeacherMap };
    triClasses.forEach((c) => {
      nextMap[c] = 'tch-bgh-2'; // Thầy Nguyễn Minh Trí
    });
    Object.keys(DEFAULT_AI_CLASS_ASSIGNMENTS).forEach((c) => {
      if (DEFAULT_AI_CLASS_ASSIGNMENTS[c].campus.includes('THPT') && !triClasses.includes(c)) {
        if (nextMap[c] === 'tch-bgh-2') {
          nextMap[c] = DEFAULT_AI_CLASS_ASSIGNMENTS[c].teacherId;
        }
      }
    });
    setAiCustomClassTeacherMap(nextMap);
    handleApplyAiAssignment(nextMap);
  };

  const handlePresetLocClasses = (locClasses: string[]) => {
    const nextMap = { ...aiCustomClassTeacherMap };
    locClasses.forEach((c) => {
      nextMap[c] = 'tch-av-13'; // Thầy Mai Phước Lộc
    });
    // With other DBK classes not in locClasses, if they were previously Lộc, restore to default/Phướng
    const dbkClasses = ['6A1', '6A2', '6A3', '6A4', '6A5', '6A6', '7A1', '7A2', '7A3', '7A4', '7A5', '7A6', '8A1', '8A2', '8A3', '8A4', '8A5', '8A6', '9A1', '9A2', '9A3', '9A4', '9A5', '9A6'];
    dbkClasses.forEach((c) => {
      if (!locClasses.includes(c) && nextMap[c] === 'tch-av-13') {
        nextMap[c] = DEFAULT_AI_CLASS_ASSIGNMENTS[c]?.teacherId === 'tch-av-13' ? 'tch-av-14' : (DEFAULT_AI_CLASS_ASSIGNMENTS[c]?.teacherId || 'tch-av-14');
      }
    });
    setAiCustomClassTeacherMap(nextMap);
    handleApplyAiAssignment(nextMap);
  };

  const handlePresetHieuCrossCampus = (classesForHieu: string[]) => {
    const nextMap = { ...aiCustomClassTeacherMap };
    classesForHieu.forEach((c) => {
      nextMap[c] = 'tch-av-2'; // Thầy Nguyễn Trung Hiếu
    });
    setAiCustomClassTeacherMap(nextMap);
    handleApplyAiAssignment(nextMap);
  };

  const handleApplyComprehensiveStrategicPlan = () => {
    // Phương án tối ưu hóa chiến lược toàn diện cho cả 53 lớp môn AI:
    // 1. Thầy Mai Phước Lộc nhận 12 lớp (K7: 7A1-7A6 + K8: 8A1-8A6) -> 144 tiết HK2
    // 2. Cô Bùi Kim Phướng nhận 12 lớp (K6: 6A1-6A6 + K9: 9A1-9A6) -> 144 tiết HK2 (Cân bằng 50/50 DBK)
    // 3. Thầy Nguyễn Trung Hiếu (THPT) chi viện 8 lớp Tân Kiều (K8: 8A7-8A10 + K9: 9A7-9A10) -> 96 tiết HK2
    // 4. Thầy Lê Phước Hậu nhận 7 lớp Tân Kiều (K6: 6A7-6A10 + K7: 7A7-7A9) -> 84 tiết HK2
    // 5. Thầy Nguyễn Minh Trí (PHT) nhận 2 lớp THPT (12CB4, 12CB5) -> 24 tiết HK2
    // 6. Cô Đào Thị Ngọc Liên nhận Khối 11 THPT (11CB1-11CB4) -> 48 tiết HK2
    // 7. Cô Lê Thị Thu Diễm nhận Khối 10 THPT (10CB1-10CB4) -> 48 tiết HK2
    // 8. Thầy Nguyễn Trung Hiếu nhận thêm 10CB5 (lớp thầy đang dạy Tin học) -> 12 tiết HK2
    const strategicMap: Record<string, string> = {
      // THPT (14 lớp)
      '12CB5': 'tch-bgh-2', // Thầy Nguyễn Minh Trí (PHT)
      '12CB4': 'tch-bgh-2', // Thầy Nguyễn Minh Trí (PHT)
      '12CB1': 'tch-av-2',  // Thầy Nguyễn Trung Hiếu
      '12CB2': 'tch-av-2',  // Thầy Nguyễn Trung Hiếu
      '12CB3': 'tch-av-2',  // Thầy Nguyễn Trung Hiếu
      '10CB5': 'tch-av-2',  // Thầy Nguyễn Trung Hiếu
      '11CB1': 'tch-av-8',  // Cô Đào Thị Ngọc Liên
      '11CB2': 'tch-av-8',  // Cô Đào Thị Ngọc Liên
      '11CB3': 'tch-av-8',  // Cô Đào Thị Ngọc Liên
      '11CB4': 'tch-av-8',  // Cô Đào Thị Ngọc Liên
      '10CB1': 'tch-av-9',  // Cô Lê Thị Thu Diễm
      '10CB2': 'tch-av-9',  // Cô Lê Thị Thu Diễm
      '10CB3': 'tch-av-9',  // Cô Lê Thị Thu Diễm
      '10CB4': 'tch-av-9',  // Cô Lê Thị Thu Diễm

      // THCS Đốc Binh Kiều (24 lớp: Cân bằng tuyệt đối 12 - 12)
      '7A1': 'tch-av-13',   // Thầy Mai Phước Lộc
      '7A2': 'tch-av-13',
      '7A3': 'tch-av-13',
      '7A4': 'tch-av-13',
      '7A5': 'tch-av-13',
      '7A6': 'tch-av-13',
      '8A1': 'tch-av-13',
      '8A2': 'tch-av-13',
      '8A3': 'tch-av-13',
      '8A4': 'tch-av-13',
      '8A5': 'tch-av-13',
      '8A6': 'tch-av-13',
      '6A1': 'tch-av-14',   // Cô Bùi Kim Phướng
      '6A2': 'tch-av-14',
      '6A3': 'tch-av-14',
      '6A4': 'tch-av-14',
      '6A5': 'tch-av-14',
      '6A6': 'tch-av-14',
      '9A1': 'tch-av-14',
      '9A2': 'tch-av-14',
      '9A3': 'tch-av-14',
      '9A4': 'tch-av-14',
      '9A5': 'tch-av-14',
      '9A6': 'tch-av-14',

      // THCS Tân Kiều (15 lớp: Thầy Hiếu chi viện 8 lớp, Thầy Hậu 7 lớp)
      '8A7': 'tch-av-2',    // Thầy Nguyễn Trung Hiếu (Chi viện)
      '8A8': 'tch-av-2',
      '8A9': 'tch-av-2',
      '8A10': 'tch-av-2',
      '9A7': 'tch-av-2',
      '9A8': 'tch-av-2',
      '9A9': 'tch-av-2',
      '9A10': 'tch-av-2',
      '6A7': 'tch-av-16',   // Thầy Lê Phước Hậu
      '6A8': 'tch-av-16',
      '6A9': 'tch-av-16',
      '6A10': 'tch-av-16',
      '7A7': 'tch-av-16',
      '7A8': 'tch-av-16',
      '7A9': 'tch-av-16',
    };

    setAiCustomClassTeacherMap(strategicMap);
    handleApplyAiAssignment(strategicMap);
    setActionBannerMessage({
      type: 'success',
      title: 'Đã áp dụng toàn diện Bộ Giải Pháp Chiến Lược Môn Tin Học & Môn Trí Tuệ AI!',
      detail: 'Đã phân bổ Thầy Mai Phước Lộc 12 lớp (K7+8 DBK), Cô Bùi Kim Phướng 12 lớp (K6+9 DBK), Thầy Hiếu chi viện 8 lớp Tân Kiều (K8+9 TK), Thầy Hậu 7 lớp Tân Kiều (K6+7 TK), Thầy Trí (PHT) 2 lớp THPT (12CB4, 12CB5). Toàn bộ 53 lớp đã được cân bằng tối ưu!',
    });
  };

  // 3. ACTION: Single Class/Subject Reassignment
  const currentClassSlots = useMemo(() => {
    const sampleSlots =
      draftWeeklyTimetables[10]?.slots ||
      draftWeeklyTimetables[currentWeek]?.slots ||
      draftWeeklyTimetables[8]?.slots ||
      [];
    return sampleSlots.filter((s) => s.classId === selectedClassId);
  }, [draftWeeklyTimetables, currentWeek, selectedClassId]);

  const classSubjects = useMemo(() => {
    const map = new Map<string, { subjectId: string; subjectName: string; teacherName: string; count: number }>();
    currentClassSlots.forEach((s) => {
      if (
        s.subjectId === 'sub-chao-co' ||
        s.subjectId === 'sub-shl' ||
        s.subjectName === 'Chào cờ' ||
        s.subjectName === 'Sinh hoạt lớp'
      ) {
        return;
      }
      if (!map.has(s.subjectId)) {
        map.set(s.subjectId, {
          subjectId: s.subjectId,
          subjectName: s.subjectName,
          teacherName: s.teacherName,
          count: 0,
        });
      }
      map.get(s.subjectId)!.count++;
    });
    return Array.from(map.values());
  }, [currentClassSlots]);

  useEffect(() => {
    if (classSubjects.length > 0 && (!selectedSubjectId || !classSubjects.some((cs) => cs.subjectId === selectedSubjectId))) {
      setSelectedSubjectId(classSubjects[0].subjectId);
    }
  }, [classSubjects, selectedSubjectId]);

  const currentAssignedTeacher = useMemo(() => {
    const match = classSubjects.find((cs) => cs.subjectId === selectedSubjectId);
    return match ? match.teacherName : '';
  }, [classSubjects, selectedSubjectId]);

  const handleApplySingleReassignment = () => {
    if (!selectedClassId || !selectedSubjectId || !selectedNewTeacherId) {
      if (onShowToast) onShowToast('Vui lòng chọn đầy đủ Lớp, Môn học và Giáo viên mới.');
      return;
    }

    const newTeacher = teacherMap.get(selectedNewTeacherId);
    if (!newTeacher) return;

    const startW = applyScope === 'CURRENT_ONWARD' ? currentWeek : 1;
    const endW = 35;

    const nextDraft = { ...draftWeeklyTimetables };
    let updatedCount = 0;

    for (let w = startW; w <= endW; w++) {
      const tbl = nextDraft[w];
      if (!tbl || !tbl.slots) continue;

      const newSlots = tbl.slots.map((s) => {
        if (s.classId === selectedClassId && s.subjectId === selectedSubjectId) {
          updatedCount++;
          return {
            ...s,
            teacherId: newTeacher.id,
            teacherName: newTeacher.name,
            teacherCode: newTeacher.code,
          };
        }
        return s;
      });

      nextDraft[w] = {
        ...tbl,
        slots: newSlots,
        updatedAt: Date.now(),
      };
    }

    persistDraft(nextDraft);
    setIsReassignModalOpen(false);

    const selClassName = classes.find((c) => c.id === selectedClassId)?.name || selectedClassId;
    const selSubName =
      subjects.find((s) => s.id === selectedSubjectId)?.name ||
      classSubjects.find((cs) => cs.subjectId === selectedSubjectId)?.subjectName ||
      '';

    if (onShowToast) {
      onShowToast(
        `Đã phân công lại môn ${selSubName} (Lớp ${selClassName}) cho ${newTeacher.name} trong bản Dự thảo!`
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Pilot Sandbox Control Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-4 text-white shadow-md border border-purple-800/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 font-black text-[11px] rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
                Dự Thảo Mới • Sandbox Thí Điểm
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Độc lập 100% với Thời khóa biểu chính thức
              </span>
              {totalSlotChangesCount > 0 ? (
                <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-xs rounded-full flex items-center gap-1 animate-pulse">
                  ⚡ Đã có {totalSlotChangesCount} tiết thay đổi so với TKB gốc
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-slate-500/20 text-slate-300 border border-slate-500/40 font-medium text-xs rounded-full">
                  Chưa có thay đổi (Nguyên bản Tuần 8)
                </span>
              )}
            </div>

            <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              Bảng Phân Công Chuyên Môn Dự Thảo & Thử Nghiệm Số Tiết
            </h2>
            <p className="text-xs text-purple-200/90 max-w-3xl leading-relaxed">
              Không gian <b>thử nghiệm an toàn (Sandbox)</b> giúp Thầy chạy thử các phương án phân công mới, 
              đối chiếu số tiết thừa/thiếu trước và sau khi thay đổi của từng giáo viên. Mọi điều chỉnh tại đây 
              <b> tuyệt đối không làm ảnh hưởng</b> đến dữ liệu thời khóa biểu đang vận hành.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {/* 1. Quick pilot HĐTNHN 19 classes */}
            <button
              onClick={handleApplyHdtnConsolidation}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                isHdtnConsolidatedInDraft
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black'
              }`}
              title="Thí điểm gom gọn 19 lớp HĐTNHN về 1 người (ưu tiên thiếu tiết & GVCN, né Tin học)"
            >
              <Zap className="w-4 h-4 fill-current" />
              {isHdtnConsolidatedInDraft ? 'Áp Lại Gom 19 Lớp HĐTN' : 'Thí Điểm Gom 19 Lớp HĐTN'}
            </button>

            {/* 2. Quick Pilot AI Button */}
            <button
              onClick={() => setIsAiAssignmentDrawerOpen(!isAiAssignmentDrawerOpen)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                isAiCurrentlyInDraft
                  ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black shadow-purple-500/30'
                  : 'bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white border border-purple-400/40 font-bold'
              }`}
              title="Thí điểm phân công môn Trí tuệ nhân tạo (AI) 12 tiết/HK2 (Tuần 19-24)"
            >
              <Cpu className="w-4 h-4 text-purple-200" />
              <span>{isAiCurrentlyInDraft ? 'Môn AI (12t/HK2): Đang Bật' : 'Thí Điểm Môn AI (HK2)'}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  isAiCurrentlyInDraft ? 'bg-white/20 text-white' : 'bg-purple-500/30 text-purple-200'
                }`}
              >
                {isAiCurrentlyInDraft ? 'Bật' : 'Tắt'}
              </span>
            </button>

            {/* Hiến Kế Môn Tin Học & AI */}
            <button
              onClick={() => setIsStrategyDrawerOpen(!isStrategyDrawerOpen)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                isStrategyDrawerOpen
                  ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 font-black shadow-amber-400/20'
                  : 'bg-white/10 hover:bg-white/20 text-amber-200 hover:text-white border border-amber-400/40 font-bold'
              }`}
              title="Xem chuyên đề hiến kế & bộ giải pháp chiến lược tối ưu định mức môn Tin học (không thừa giờ)"
            >
              <Lightbulb className="w-4 h-4 text-amber-600 fill-amber-300" />
              <span>Hiến Kế Tin Học & AI</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-black/20">
                {isStrategyDrawerOpen ? 'Đang mở' : 'Xem'}
              </span>
            </button>

            {/* 3. Custom reassign class/subject */}
            <button
              onClick={() => setIsReassignModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Thử nghiệm đổi giáo viên cho từng lớp, từng môn trong bản Dự thảo"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Đổi GV Lớp & Môn Thử Nghiệm
            </button>

            {/* 4. Reset to Week 8 */}
            <button
              onClick={handleResetToOfficialWeek8}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border border-white/20"
              title="Đặt lại bản Dự thảo về đúng TKB Tuần 8 chính thức"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Tải Lại TKB Tuần 8
            </button>
          </div>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionBannerMessage && (
        <div
          className={`p-4 rounded-2xl border shadow-sm flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
            actionBannerMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-blue-50 border-blue-300 text-blue-950'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl mt-0.5 ${
                actionBannerMessage.type === 'success'
                  ? 'bg-emerald-200 text-emerald-800'
                  : 'bg-blue-200 text-blue-800'
              }`}
            >
              {actionBannerMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Info className="w-5 h-5" />
              )}
            </div>
            <div>
              <h4 className="font-black text-sm">{actionBannerMessage.title}</h4>
              <p className="text-xs mt-0.5 text-slate-700 leading-relaxed">
                {actionBannerMessage.detail}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActionBannerMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1.5. AI PILOT ASSIGNMENT DRAWER & CONTROL PANEL (PHÂN CÔNG MÔN TRÍ TUỆ NHÂN TẠO AI) */}
      {isAiAssignmentDrawerOpen && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-purple-700/50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-purple-500 to-pink-500 text-white rounded-xl shadow-md">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    Thí Điểm Phân Công Môn Trí Tuệ Nhân Tạo (AI) - 12 Tiết / Học Kỳ 2
                  </h3>
                  {isAiCurrentlyInDraft ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-1 shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Đang áp dụng trong TKB (Tuần 19 đến Tuần 24)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium text-xs">
                      Chưa nạp vào TKB
                    </span>
                  )}
                </div>
                <p className="text-xs text-purple-200/90 mt-1 max-w-3xl leading-relaxed">
                  • <b>Thời lượng:</b> 12 tiết/lớp trong Học kỳ 2 (mỗi tuần 2 tiết trong 6 tuần: <b>Tuần 19 đến Tuần 24</b>).<br />
                  • <b>Nguyên tắc địa bàn:</b> Giáo viên Tin học ở điểm trường nào thì phân lớp cho điểm trường đó.<br />
                  • <b>Cơ chế Điểm chính (THPT):</b> Phân công cho <b>Thầy Nguyễn Minh Trí (PHT)</b> trực tiếp giảng dạy để tránh thừa tiết quá nhiều cho GV Tin học & bù đủ định mức 4 tiết/tuần.
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
              {isAiCurrentlyInDraft ? (
                <button
                  onClick={handleRemoveAiAssignment}
                  className="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Gỡ bỏ các tiết môn AI khỏi bản Dự thảo"
                >
                  <X className="w-3.5 h-3.5" />
                  Gỡ Bỏ Môn AI
                </button>
              ) : (
                <button
                  onClick={() => handleApplyAiAssignment()}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  Áp Dụng Thí Điểm Môn AI
                </button>
              )}
              <button
                onClick={() => setIsAiAssignmentDrawerOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Thu gọn bảng môn AI"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 6 Cards Overview of AI Workload Impact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
            {/* Card 1: Thầy Nguyễn Minh Trí (PHT) */}
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-purple-400/40 space-y-1">
              <div className="flex items-center justify-between text-xs text-purple-200">
                <span className="font-bold flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-purple-300" />
                  Thầy Trí (PHT)
                </span>
                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 font-black rounded-full text-[10px]">
                  {aiStats.triClassCount} lớp
                </span>
              </div>
              <div className="text-lg font-black text-emerald-400">
                +{aiStats.triPeriods}t/HK2
              </div>
              <p className="text-[10px] text-purple-100 leading-tight">
                Dạy {aiStats.triClassCount * 2}t AI/w ở T19-24. Bù định mức cả năm từ -70t lên {-70 + aiStats.triPeriods}t!
              </p>
            </div>

            {/* Card 2: Thầy Mai Phước Lộc (THCS DBK) */}
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-amber-400/40 space-y-1">
              <div className="flex items-center justify-between text-xs text-purple-200">
                <span className="font-bold flex items-center gap-1 text-amber-200">
                  <GraduationCap className="w-3.5 h-3.5 text-amber-300" />
                  Thầy Mai Phước Lộc
                </span>
                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 font-black rounded-full text-[10px]">
                  {aiStats.locClassCount} lớp
                </span>
              </div>
              <div className="text-lg font-black text-amber-300">
                +{aiStats.locPeriods}t/HK2
              </div>
              <p className="text-[10px] text-amber-100 leading-tight">
                GV Tin Khối 7 THCS DBK (GVCN 7A2). Nhận AI Khối 7 + 8, chia đôi tải 50/50 với Cô Phướng!
              </p>
            </div>

            {/* Card 3: Cô Bùi Kim Phướng (THCS DBK) */}
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-pink-400/40 space-y-1">
              <div className="flex items-center justify-between text-xs text-purple-200">
                <span className="font-bold text-pink-200">Cô Bùi Kim Phướng</span>
                <span className="px-1.5 py-0.5 bg-pink-500/20 text-pink-300 font-bold rounded-full text-[10px]">
                  {aiStats.phuongClassCount} lớp
                </span>
              </div>
              <div className="text-lg font-black text-pink-300">
                +{aiStats.phuongPeriods}t/HK2
              </div>
              <p className="text-[10px] text-pink-100 leading-tight">
                GV Tin THCS DBK (GVCN 6A3). Được Thầy Lộc chia sẻ 12 lớp, giảm tải vượt trần thành công!
              </p>
            </div>

            {/* Card 4: Thầy Lê Phước Hậu (THCS TK) */}
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-cyan-400/40 space-y-1">
              <div className="flex items-center justify-between text-xs text-purple-200">
                <span className="font-bold text-cyan-200">Thầy Lê Phước Hậu</span>
                <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 font-bold rounded-full text-[10px]">
                  {aiStats.hauClassCount} lớp
                </span>
              </div>
              <div className="text-lg font-black text-cyan-300">
                +{aiStats.hauPeriods}t/HK2
              </div>
              <p className="text-[10px] text-cyan-100 leading-tight">
                GV Tin duy nhất THCS Tân Kiều. Được Thầy Hiếu THPT chi viện các lớp khối 8-9.
              </p>
            </div>

            {/* Card 5: Thầy Nguyễn Trung Hiếu (Tổ phó) */}
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-blue-400/40 space-y-1">
              <div className="flex items-center justify-between text-xs text-purple-200">
                <span className="font-bold text-blue-200">Thầy Trung Hiếu</span>
                <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 font-bold rounded-full text-[10px]">
                  {aiStats.hieuClassCount} lớp
                </span>
              </div>
              <div className="text-lg font-black text-blue-300">
                +{aiStats.hieuPeriods}t/HK2
              </div>
              <p className="text-[10px] text-blue-100 leading-tight">
                Tổ phó Tin học (Điểm chính). Bù thiếu -175t/năm & sẵn sàng dạy chéo cấp chi viện Tân Kiều!
              </p>
            </div>

            {/* Card 6: Cô Liên & Cô Diễm */}
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-xs text-purple-200">
                <span className="font-bold">Cô Liên & Cô Diễm</span>
                <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 font-bold rounded-full text-[10px]">
                  {aiStats.lienClassCount + aiStats.diemClassCount} lớp
                </span>
              </div>
              <div className="text-lg font-black text-purple-300">
                +{aiStats.lienPeriods + aiStats.diemPeriods}t
              </div>
              <p className="text-[10px] text-slate-300 leading-tight">
                Phụ trách AI Khối 11 (Cô Liên: {aiStats.lienClassCount}l) & Khối 10 (Cô Diễm: {aiStats.diemClassCount}l).
              </p>
            </div>
          </div>

          {/* Interactive Presets for Quick Configuration */}
          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 space-y-2.5">
            <div className="text-xs font-bold text-purple-200 flex items-center justify-between gap-2 border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-amber-300" />
                <span className="uppercase tracking-wider">Kịch Bản Phân Công AI Nhanh Cho Từng Giáo Viên & Điểm Trường:</span>
              </div>
              <button
                type="button"
                onClick={handleApplyComprehensiveStrategicPlan}
                className="px-3 py-1 bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 hover:from-amber-500 hover:to-teal-500 text-slate-950 font-black text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Áp dụng ngay giải pháp cân bằng toàn diện: Thầy Lộc 12 lớp, Cô Phướng 12 lớp, Thầy Hiếu chi viện Tân Kiều 8 lớp, Thầy Trí 2 lớp THPT"
              >
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                ⭐ Áp Dụng Toàn Diện 4 Hiến Kế (Tối Ưu 100%)
              </button>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
              {/* Presets Thầy Nguyễn Minh Trí */}
              <div className="bg-black/20 rounded-lg p-2.5 border border-white/5 space-y-1.5">
                <div className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Thầy Nguyễn Minh Trí (PHT):</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => handlePresetTriClasses(['12CB4', '12CB5'])}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      aiStats.triClassCount === 2
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    2 lớp (12CB4, 12CB5) [24t]
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetTriClasses(['12CB5'])}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                      aiStats.triClassCount === 1
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    1 lớp (12CB5) [12t]
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetTriClasses(['11CB4', '12CB4', '12CB5'])}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                      aiStats.triClassCount === 3
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    3 lớp [36t]
                  </button>
                </div>
              </div>

              {/* Presets Thầy Mai Phước Lộc */}
              <div className="bg-black/20 rounded-lg p-2.5 border border-white/5 space-y-1.5">
                <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Thầy Mai Phước Lộc (THCS DBK):</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      handlePresetLocClasses([
                        '7A1', '7A2', '7A3', '7A4', '7A5', '7A6',
                        '8A1', '8A2', '8A3', '8A4', '8A5', '8A6',
                      ])
                    }
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      aiStats.locClassCount === 12
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    title="Cân bằng 50/50 THCS Đốc Binh Kiều: Thầy Lộc 12 lớp (K7+8), Cô Phướng 12 lớp (K6+9)"
                  >
                    ⭐ Cân bằng 12 lớp (K7+K8) [144t]
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handlePresetLocClasses(['7A1', '7A2', '7A3', '7A4', '7A5', '7A6'])
                    }
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                      aiStats.locClassCount === 6
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    title="Thầy Lộc phụ trách đúng 6 lớp Khối 7 mà thầy đang dạy Tin học"
                  >
                    Khối 7 (6 lớp) [72t]
                  </button>
                </div>
              </div>

              {/* Presets Thầy Nguyễn Trung Hiếu chi viện Tân Kiều */}
              <div className="bg-black/20 rounded-lg p-2.5 border border-white/5 space-y-1.5">
                <div className="text-[11px] font-bold text-blue-300 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Thầy Nguyễn Trung Hiếu (Chi viện Tân Kiều):</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      handlePresetHieuCrossCampus([
                        '12CB1', '12CB2', '12CB3', '10CB5',
                        '8A7', '8A8', '8A9', '8A10', '9A7', '9A8', '9A9', '9A10',
                      ])
                    }
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      aiStats.hieuClassCount >= 10
                        ? 'bg-blue-400 text-slate-950 shadow-xs'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    title="Thầy Hiếu từ THPT xuống dạy chéo chi viện 8 lớp Khối 8-9 Tân Kiều"
                  >
                    ⭐ Chi viện 8 lớp Tân Kiều (K8+K9)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handlePresetHieuCrossCampus(['12CB1', '12CB2', '12CB3', '10CB5'])
                    }
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                      aiStats.hieuClassCount === 4
                        ? 'bg-blue-400 text-slate-950 font-bold'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    title="Chỉ dạy 4 lớp tại Điểm chính THPT"
                  >
                    Chỉ dạy THPT (4 lớp)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Class Assignment Table */}
          <div className="bg-white rounded-xl text-slate-900 overflow-hidden border border-purple-200/40 shadow-sm space-y-2 p-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-800">
                  Danh Sách Phân Công Môn AI Chi Tiết Từng Lớp:
                </span>
                <span className="text-[11px] text-slate-500">
                  (Thầy có thể bấm vào dropdown bất kỳ lớp nào để đổi giáo viên)
                </span>
              </div>
              {/* Campus Filter Tabs */}
              <div className="inline-flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium gap-1">
                <button
                  type="button"
                  onClick={() => setAiCampusFilterTab('ALL')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    aiCampusFilterTab === 'ALL'
                      ? 'bg-purple-800 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả (53 lớp)
                </button>
                <button
                  type="button"
                  onClick={() => setAiCampusFilterTab('THPT')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    aiCampusFilterTab === 'THPT'
                      ? 'bg-purple-800 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Điểm chính THPT (14 lớp)
                </button>
                <button
                  type="button"
                  onClick={() => setAiCampusFilterTab('THCS_DBK')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    aiCampusFilterTab === 'THCS_DBK'
                      ? 'bg-purple-800 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  THCS Đốc Binh Kiều (24 lớp)
                </button>
                <button
                  type="button"
                  onClick={() => setAiCampusFilterTab('THCS_TK')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    aiCampusFilterTab === 'THCS_TK'
                      ? 'bg-purple-800 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  THCS Tân Kiều (15 lớp)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-300">
                  <tr className="text-slate-700 font-bold uppercase text-[11px]">
                    <th className="py-2 px-3 w-12 text-center">STT</th>
                    <th className="py-2 px-3 w-20 text-center font-black">Lớp</th>
                    <th className="py-2 px-3 w-16 text-center">Khối</th>
                    <th className="py-2 px-3 min-w-[140px]">Điểm Trường</th>
                    <th className="py-2 px-3 w-24 text-center">Thời lượng</th>
                    <th className="py-2 px-3 min-w-[220px]">Giáo Viên Phụ Trách Môn AI</th>
                    <th className="py-2 px-3 min-w-[200px]">Căn Cứ / Đánh Giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classes
                    .filter((cls) => {
                      if (aiCampusFilterTab === 'THPT') return cls.level === 'THPT';
                      if (aiCampusFilterTab === 'THCS_DBK') return cls.level === 'THCS' && cls.campus === 'THCSDBK';
                      if (aiCampusFilterTab === 'THCS_TK') return cls.level === 'THCS' && cls.campus === 'THCSDBK' ? false : cls.level === 'THCS';
                      return true;
                    })
                    .map((cls, idx) => {
                      const assignedTeacherId =
                        aiCustomClassTeacherMap[cls.name] ||
                        DEFAULT_AI_CLASS_ASSIGNMENTS[cls.name]?.teacherId;
                      const isAssignedToTri = assignedTeacherId === 'tch-bgh-2';
                      const defaultInfo = DEFAULT_AI_CLASS_ASSIGNMENTS[cls.name];

                      return (
                        <tr
                          key={cls.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            isAssignedToTri ? 'bg-purple-50/80 font-semibold' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-center text-slate-500 font-medium">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded font-black text-xs ${
                                isAssignedToTri
                                  ? 'bg-purple-200 text-purple-950 border border-purple-400'
                                  : 'bg-slate-100 text-slate-900 border border-slate-200'
                              }`}
                            >
                              {cls.name}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center text-slate-600">
                            Khối {cls.grade}
                          </td>
                          <td className="py-2 px-3 text-slate-700">
                            {cls.level === 'THPT'
                              ? 'Điểm chính (THPT)'
                              : cls.campus === 'THCSDBK'
                              ? 'THCS Đốc Binh Kiều'
                              : 'THCS Tân Kiều'}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-slate-700">
                            2t/w (12t HK2)
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={assignedTeacherId || ''}
                              onChange={(e) => handleChangeAiClassTeacher(cls.name, e.target.value)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer w-full max-w-xs ${
                                isAssignedToTri
                                  ? 'bg-purple-700 text-white border-purple-800'
                                  : 'bg-white text-slate-900 border-slate-300 hover:border-slate-400'
                              }`}
                            >
                              <optgroup label="Ban Giám Hiệu (Điểm chính)">
                                <option value="tch-bgh-2">
                                  Thầy Nguyễn Minh Trí (PHT) • Giảm tải GV Tin & Bù định mức
                                </option>
                              </optgroup>
                              <optgroup label="Tổ Tin học (Điểm chính THPT)">
                                <option value="tch-av-2">
                                  Thầy Nguyễn Trung Hiếu (Tổ phó) • Thiếu -175t/năm
                                </option>
                                <option value="tch-av-8">
                                  Cô Đào Thị Ngọc Liên (GVCN 11CB4)
                                </option>
                                <option value="tch-av-9">
                                  Cô Lê Thị Thu Diễm (GVCN 10CB4)
                                </option>
                              </optgroup>
                              <optgroup label="Điểm THCS Đốc Binh Kiều & Tân Kiều">
                                <option value="tch-av-13">
                                  Thầy Mai Phước Lộc (GV Tin học THCS DBK - GVCN 7A2)
                                </option>
                                <option value="tch-av-14">
                                  Cô Bùi Kim Phướng (GV Tin THCS DBK - GVCN 6A3)
                                </option>
                                <option value="tch-av-16">
                                  Thầy Lê Phước Hậu (GV Tin THCS TK - GVCN 8A9)
                                </option>
                              </optgroup>
                            </select>
                          </td>
                          <td className="py-2 px-3 text-slate-600 text-[11px]">
                            {isAssignedToTri ? (
                              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-bold border border-purple-200">
                                ⭐ Thầy Nguyễn Minh Trí trực tiếp phụ trách
                              </span>
                            ) : (
                              defaultInfo?.note || 'Phân công theo điểm trường'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 1.6. STRATEGIC RECOMMENDATIONS & SIMULATION DASHBOARD (CHUYÊN ĐỀ HIẾN KẾ & BỘ GIẢI PHÁP TỐI ƯU MÔN TIN HỌC) */}
      {isStrategyDrawerOpen && (
        <div className="bg-gradient-to-br from-amber-950/90 via-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-amber-500/40 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-yellow-500 text-slate-950 rounded-xl shadow-md">
                <Lightbulb className="w-6 h-6 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    Chuyên Đề Hiến Kế & Bộ Giải Pháp Chiến Lược: Tối Ưu Hóa Định Mức Môn Tin Học & AI
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-xs flex items-center gap-1 shadow-2xs">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    Chống Bội Chi Thừa Giờ & Vượt Trần 200 Giờ
                  </span>
                </div>
                <p className="text-xs text-amber-100/90 mt-1 max-w-4xl leading-relaxed">
                  Căn cứ <b>Thông tư 28/2009/TT-BGDĐT</b>, <b>Thông tư 15/2020/TT-BGDĐT</b> và <b>Thông tư 20/2023/TT-BGDĐT</b> về định mức tiết dạy, chế độ giảm trừ kiêm nhiệm và cơ chế phân công giảng dạy liên cấp trong trường phổ thông nhiều cấp học.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleApplyComprehensiveStrategicPlan}
                className="px-4 py-2 bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 hover:from-amber-500 hover:to-teal-500 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Bấm để áp dụng trọn vẹn toàn bộ 4 giải pháp chiến lược vào bản dự thảo ngay tức thì"
              >
                <Sparkles className="w-4 h-4 fill-current" />
                Áp Dụng Toàn Diện 4 Hiến Kế
              </button>
              <button
                type="button"
                onClick={() => setIsStrategyDrawerOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Thu gọn chuyên đề hiến kế"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 1. Root Cause Breakdown (Báo động thực trạng) */}
          <div className="bg-white/5 rounded-xl p-3.5 border border-amber-500/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-amber-300 uppercase tracking-wide">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>Báo Động Thực Trạng: Vì Sao Môn Tin Học Bị Thừa Giờ Khổng Lồ (+280t Đến +420t/Năm)?</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-200">
              <div className="bg-black/30 p-2.5 rounded-lg border border-white/5 space-y-1">
                <div className="font-bold text-rose-300 flex items-center gap-1">
                  <span>1. Nghịch Lý Bị Kẹp Định Mức Do Làm GVCN</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Cả 3 giáo viên Tin học THCS (<b>Cô Phướng</b> - 6A3, <b>Thầy Hậu</b> - 8A9, <b>Thầy Lộc</b> - 7A2) đều bị phân làm GVCN, kéo định mức xuống <b>15 tiết/tuần</b>. Trong khi số lớp Tin học tại chỗ quá đông (24 lớp DBK, 15 lớp TK), khiến toàn bộ 4 tiết/tuần định mức bị biến thành <b>tiết thừa giờ phải trả tiền (+140t/năm/người)</b>!
                </p>
              </div>

              <div className="bg-black/30 p-2.5 rounded-lg border border-white/5 space-y-1">
                <div className="font-bold text-amber-300 flex items-center gap-1">
                  <span>2. Mất Cân Đối Giữa THPT & THCS</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Điểm chính THPT có 3 GV Tin học (Hiếu, Liên, Diễm) cho 14 lớp (tải nhẹ 10-14t/tuần). <b>Thầy Hiếu</b> thậm chí đang <b>thiếu sâu -175 tiết/năm</b>. Ngược lại, <b>Thầy Hậu</b> một mình gánh trọn 15 lớp Tân Kiều (+280t) và <b>Cô Phướng</b> gánh 18 lớp DBK (+420t, vượt trần 200h luật định)!
                </p>
              </div>

              <div className="bg-black/30 p-2.5 rounded-lg border border-white/5 space-y-1">
                <div className="font-bold text-purple-300 flex items-center gap-1">
                  <span>3. Nguy Cơ "Vỡ Quỹ Thời Gian" Khi Thêm Môn AI</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Môn Trí Tuệ AI (12 tiết/HK2 x 53 lớp = <b>636 tiết toàn trường</b>). Nếu dồn tiếp cho GV Tin học cơ sở mà không tái cấu trúc, Điểm THCS Đốc Binh Kiều và Tân Kiều sẽ rơi vào tình trạng kiệt sức và vượt ngân sách chi trả phụ cấp thừa giờ!
                </p>
              </div>
            </div>
          </div>

          {/* 2. Four Strategic Pillars (4 Trụ cột hiến kế) */}
          <div className="space-y-2.5">
            <div className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400 fill-current" />
              <span>4 Hiến Kế Chiến Lược Căn Cơ Đã Được Cụ Thể Hóa & Tính Toán:</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Hiến Kế 1 */}
              <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-amber-400/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-amber-300 flex items-center gap-1.5 text-xs">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-[11px]">1</span>
                    "Giải Phóng Định Mức": Rút Kiêm Nhiệm Chủ Nhiệm Cho GV Tin Học
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                    Giảm ngay 140t/người
                  </span>
                </div>
                <div className="text-slate-200 text-[11px] space-y-1 leading-relaxed">
                  <p>
                    • <b>Hành động:</b> Rút vai trò GVCN lớp 6A3 của Cô Bùi Kim Phướng và lớp 8A9 của Thầy Lê Phước Hậu. Chuyển giao chủ nhiệm cho các thầy cô bộ môn đang <b>thiếu tiết nặng (-70t đến -143t/năm)</b> như Thầy Trần Phi Hải (-143t), Thầy Nguyễn Thành Tín (-105t), Cô Châu Thị Kim Hà (-105t), Thầy Trương Văn Nghĩa (-70t).
                  </p>
                  <p className="text-amber-200">
                    • <b>Hiệu quả kép:</b> Trả lại định mức chuẩn 19 tiết/tuần. Giảm ngay lập tức <b>140 tiết thừa giờ/người/năm</b> (tiết kiệm ngân sách tối thiểu 280-420 tiết). Đồng thời giáo viên nhận lớp chủ nhiệm cũng lập tức xóa sạch tình trạng thiếu giờ!
                  </p>
                </div>
              </div>

              {/* Hiến Kế 2 */}
              <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-blue-400/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-blue-300 flex items-center gap-1.5 text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-400 text-slate-950 flex items-center justify-center font-black text-[11px]">2</span>
                    "Dạy Chéo Cấp": Thầy Cô THPT Chi Viện Điểm THCS Tân Kiều
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold text-[10px]">
                    Căn cứ TT 20/2023
                  </span>
                </div>
                <div className="text-slate-200 text-[11px] space-y-1 leading-relaxed">
                  <p>
                    • <b>Hành động:</b> Cử <b>Thầy Nguyễn Trung Hiếu</b> (Tổ phó Tin học THPT, đang thiếu -175t/năm) từ Điểm chính xuống hỗ trợ Điểm THCS Tân Kiều: nhận dạy chéo 8 lớp (Khối 8: 8A7-8A10 và Khối 9: 9A7-9A10).
                  </p>
                  <p className="text-blue-200">
                    • <b>Sắp xếp TKB:</b> Bố trí toàn bộ các tiết của Thầy Hiếu tại Tân Kiều tập trung trọn vẹn trong <b>1 ngày (ví dụ Thứ Năm)</b> hoặc 2 buổi sáng. Thầy Hiếu bù đủ định mức 16-17t/tuần, Thầy Hậu giảm tải từ 23t xuống 10.5t/tuần, chấm dứt kiệt sức!
                  </p>
                </div>
              </div>

              {/* Hiến Kế 3 */}
              <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-purple-400/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-purple-300 flex items-center gap-1.5 text-xs">
                    <span className="w-5 h-5 rounded-full bg-purple-400 text-slate-950 flex items-center justify-center font-black text-[11px]">3</span>
                    "Cân Bằng Nội Bộ 50/50" Tại Điểm Đốc Binh Kiều (Thầy Lộc & Cô Phướng)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[10px]">
                    12 lớp - 12 lớp
                  </span>
                </div>
                <div className="text-slate-200 text-[11px] space-y-1 leading-relaxed">
                  <p>
                    • <b>Hành động:</b> Chia đều 24 lớp DBK:
                    <br />- <b>Thầy Mai Phước Lộc:</b> Phụ trách Khối 7 (6 lớp) + nhận thêm Khối 8 (6 lớp) = 12 lớp Tin học & AI.
                    <br />- <b>Cô Bùi Kim Phướng:</b> Phụ trách Khối 6 (6 lớp) + Khối 9 (6 lớp) = 12 lớp Tin học & AI.
                  </p>
                  <p className="text-purple-200">
                    • <b>Hiệu quả:</b> Cả 2 thầy cô dạy đúng 18 tiết/tuần (chuẩn định mức 19t), không ai bị dồn việc, công bằng tuyệt đối.
                  </p>
                </div>
              </div>

              {/* Hiến Kế 4 */}
              <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-emerald-400/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-emerald-300 flex items-center gap-1.5 text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center font-black text-[11px]">4</span>
                    Ban Giám Hiệu Trực Tiếp Tham Gia Giảng Dạy Môn AI (Thầy Trí - PHT)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                    Chuẩn 4t/tuần
                  </span>
                </div>
                <div className="text-slate-200 text-[11px] space-y-1 leading-relaxed">
                  <p>
                    • <b>Hành động:</b> <b>Thầy Nguyễn Minh Trí (PHT)</b> trực tiếp nhận từ 2 đến 3 lớp AI Khối 12 (12CB4, 12CB5) tại Điểm chính.
                  </p>
                  <p className="text-emerald-200">
                    • <b>Hiệu quả:</b> Hoàn thành xuất sắc nhiệm vụ giảng dạy thực tế 4t/tuần của PHT theo quy định, vừa giải phóng 24-36 tiết cho GV Tin học THPT để thầy cô có quỹ thời gian chi viện cho 2 điểm THCS.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Interactive Simulation Matrix (Bảng so sánh trước vs sau) */}
          <div className="bg-white rounded-xl text-slate-900 overflow-hidden border border-amber-200 shadow-sm p-3.5 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-600" />
                <span className="font-black text-xs text-slate-900">
                  Bảng Mô Phỏng Đối Soát: Tình Trạng Giáo Viên Tin Học & AI (TRƯỚC vs SAU KHI ÁP DỤNG HIẾN KẾ)
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                (Số liệu được tính toán chuẩn hóa trên chu kỳ 35 tuần cả năm & 6 tuần môn AI HK2)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-300">
                    <th className="py-2 px-3">Giáo Viên</th>
                    <th className="py-2 px-3">Điểm Trường</th>
                    <th className="py-2 px-3 text-center">Định Mức</th>
                    <th className="py-2 px-3 text-center">Hiện Trạng (Tuần 9)</th>
                    <th className="py-2 px-3 text-center text-rose-700 bg-rose-50">Trước Hiến Kế (Nguy cơ)</th>
                    <th className="py-2 px-3 text-center text-emerald-800 bg-emerald-50">Sau Khi Áp Dụng Hiến Kế</th>
                    <th className="py-2 px-3">Đánh Giá & Lợi Ích Mang Lại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {/* Thầy Mai Phước Lộc */}
                  <tr className="hover:bg-amber-50/50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <span>Thầy Mai Phước Lộc</span>
                        <div className="text-[10px] text-slate-500 font-normal">GVCN 7A2 • Dạy Tin học 7</div>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-700">THCS Đốc Binh Kiều</td>
                    <td className="py-2 px-3 text-center font-mono">15t (CN) / 19t</td>
                    <td className="py-2 px-3 text-center font-mono">9t/w (6 lớp)</td>
                    <td className="py-2 px-3 text-center text-rose-700 bg-rose-50/60 font-semibold text-[11px]">
                      0 lớp AI • Bị bỏ sót
                    </td>
                    <td className="py-2 px-3 text-center text-emerald-800 bg-emerald-50/80 font-black text-[11px]">
                      Nhận K7 + K8 (12 lớp AI = 144t)
                    </td>
                    <td className="py-2 px-3 text-[11px] text-slate-700">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold mr-1">Tối ưu</span>
                      Dạy 18t/w (K7+K8), cân bằng 50/50 với Cô Phướng, không bị quá tải.
                    </td>
                  </tr>

                  {/* Cô Bùi Kim Phướng */}
                  <tr className="hover:bg-amber-50/50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-pink-500 shrink-0" />
                      <div>
                        <span>Cô Bùi Kim Phướng</span>
                        <div className="text-[10px] text-slate-500 font-normal">GVCN 6A3 • Dạy Tin học 6,8,9</div>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-700">THCS Đốc Binh Kiều</td>
                    <td className="py-2 px-3 text-center font-mono">15t (CN) -&gt; 19t</td>
                    <td className="py-2 px-3 text-center font-mono text-rose-600 font-bold">27t/w (18 lớp)</td>
                    <td className="py-2 px-3 text-center text-rose-700 bg-rose-50/60 font-black text-[11px]">
                      Thừa +420t (Vượt trần 200h)
                    </td>
                    <td className="py-2 px-3 text-center text-emerald-800 bg-emerald-50/80 font-black text-[11px]">
                      Rút CN + Còn 12 lớp (18t/w)
                    </td>
                    <td className="py-2 px-3 text-[11px] text-slate-700">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold mr-1">Thoát quá tải</span>
                      Giảm 140t thừa do rút CN, Thầy Lộc chia sẻ K8, trở về mức an toàn chuẩn.
                    </td>
                  </tr>

                  {/* Thầy Lê Phước Hậu */}
                  <tr className="hover:bg-amber-50/50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
                      <div>
                        <span>Thầy Lê Phước Hậu</span>
                        <div className="text-[10px] text-slate-500 font-normal">GVCN 8A9 • Dạy toàn bộ TK</div>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-700">THCS Tân Kiều</td>
                    <td className="py-2 px-3 text-center font-mono">15t (CN) -&gt; 19t</td>
                    <td className="py-2 px-3 text-center font-mono text-rose-600 font-bold">23t/w (15 lớp)</td>
                    <td className="py-2 px-3 text-center text-rose-700 bg-rose-50/60 font-black text-[11px]">
                      Thừa +280t (Gánh 1 mình)
                    </td>
                    <td className="py-2 px-3 text-center text-emerald-800 bg-emerald-50/80 font-black text-[11px]">
                      Rút CN + Còn 7 lớp K6-7 (10.5t)
                    </td>
                    <td className="py-2 px-3 text-[11px] text-slate-700">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold mr-1">Cứu nguy</span>
                      Thầy Hiếu THPT gánh hộ 8 lớp K8-K9, Thầy Hậu hồi phục sức khỏe giảng dạy.
                    </td>
                  </tr>

                  {/* Thầy Nguyễn Trung Hiếu */}
                  <tr className="hover:bg-amber-50/50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      <div>
                        <span>Thầy Nguyễn Trung Hiếu</span>
                        <div className="text-[10px] text-slate-500 font-normal">Tổ phó Tin học THPT</div>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-700">THPT -&gt; Chi viện TK</td>
                    <td className="py-2 px-3 text-center font-mono">16t/tuần</td>
                    <td className="py-2 px-3 text-center font-mono text-amber-600">~10t/w</td>
                    <td className="py-2 px-3 text-center text-rose-700 bg-rose-50/60 font-semibold text-[11px]">
                      Thiếu -175t/năm (Sâu nhất)
                    </td>
                    <td className="py-2 px-3 text-center text-emerald-800 bg-emerald-50/80 font-black text-[11px]">
                      Chi viện 8 lớp TK (Dồn 1 ngày)
                    </td>
                    <td className="py-2 px-3 text-[11px] text-slate-700">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 font-bold mr-1">Chi viện</span>
                      Bù đủ 100% định mức, xóa hoàn toàn thiếu tiết, khẳng định vai trò Tổ phó.
                    </td>
                  </tr>

                  {/* Thầy Nguyễn Minh Trí */}
                  <tr className="hover:bg-amber-50/50 transition-colors bg-purple-50/40">
                    <td className="py-2.5 px-3 font-bold text-purple-950 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-purple-700 shrink-0" />
                      <div>
                        <span>Thầy Nguyễn Minh Trí</span>
                        <div className="text-[10px] text-purple-600 font-semibold">Phó Hiệu Trưởng (PHT)</div>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-700">Điểm chính THPT</td>
                    <td className="py-2 px-3 text-center font-mono">4t/tuần</td>
                    <td className="py-2 px-3 text-center font-mono">2t/w (HĐTN)</td>
                    <td className="py-2 px-3 text-center text-amber-700 bg-amber-50/60 font-medium text-[11px]">
                      Thiếu -70t/năm
                    </td>
                    <td className="py-2 px-3 text-center text-emerald-800 bg-emerald-50/80 font-black text-[11px]">
                      Dạy 2 lớp AI (12CB4, 12CB5)
                    </td>
                    <td className="py-2 px-3 text-[11px] text-purple-950 font-semibold">
                      <span className="px-1.5 py-0.5 rounded bg-purple-200 text-purple-900 font-bold mr-1">Gương mẫu</span>
                      Đạt đủ chuẩn 4t/w, giảm tải GV Tin THPT để thầy cô có thời gian chi viện THCS.
                    </td>
                  </tr>

                  {/* Cô Liên & Diễm */}
                  <tr className="hover:bg-amber-50/50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                      <div>
                        <span>Cô Liên & Cô Diễm</span>
                        <div className="text-[10px] text-slate-500 font-normal">GV Tin học 11 & 10 (THPT)</div>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-700">Điểm chính THPT</td>
                    <td className="py-2 px-3 text-center font-mono">13t (CN)</td>
                    <td className="py-2 px-3 text-center font-mono">12t/w</td>
                    <td className="py-2 px-3 text-center text-slate-600 font-medium text-[11px]">
                      Cân đối (+35t/năm)
                    </td>
                    <td className="py-2 px-3 text-center text-emerald-800 bg-emerald-50/80 font-black text-[11px]">
                      Dạy AI Khối 11 & Khối 10
                    </td>
                    <td className="py-2 px-3 text-[11px] text-slate-700">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-900 font-bold mr-1">Ổn định</span>
                      Giữ nguyên ổn định chuyên môn, sẵn sàng hỗ trợ chuyên đề cho cấp THCS.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Quick action bar inside table */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
              <span className="text-[11px] font-bold text-slate-700">
                Lựa chọn phương án áp dụng nhanh:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleApplyComprehensiveStrategicPlan}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Áp Dụng Toàn Diện (Khuyên Dùng)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handlePresetLocClasses([
                      '7A1', '7A2', '7A3', '7A4', '7A5', '7A6',
                      '8A1', '8A2', '8A3', '8A4', '8A5', '8A6',
                    ])
                  }
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg border border-slate-300 transition-all cursor-pointer"
                >
                  Chỉ Cân Bằng Đốc Binh Kiều (Thầy Lộc 12l - Cô Phướng 12l)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handlePresetHieuCrossCampus([
                      '12CB1', '12CB2', '12CB3', '10CB5',
                      '8A7', '8A8', '8A9', '8A10', '9A7', '9A8', '9A9', '9A10',
                    ])
                  }
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg border border-slate-300 transition-all cursor-pointer"
                >
                  Chỉ Thầy Hiếu Chi Viện Tân Kiều (8 lớp K8-K9)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Panel Header */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-800 rounded-xl">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  Bảng Đối Soát & Thể Hiện Sự Thay Đổi
                </h3>
                <span className="px-2 py-0.5 text-xs font-extrabold rounded-md bg-purple-100 text-purple-900 border border-purple-200">
                  {totalSlotChangesCount} tiết đã điều chỉnh
                </span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-emerald-100 text-emerald-800">
                  +{gainedTeachersCount} GV tăng tiết
                </span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-rose-100 text-rose-800">
                  -{lostTeachersCount} GV giảm tiết
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                So sánh trực tiếp giữa <b>Thời Khóa Biểu gốc (Tuần 8)</b> với <b>Bản Dự thảo mới</b> • Thể hiện rõ ai tăng tiết, ai giảm tiết và chi tiết từng lớp điều chỉnh
              </p>
            </div>
          </div>

          {/* Toggle View */}
          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={() => setIsDiffDrawerOpen(!isDiffDrawerOpen)}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-slate-500" />
              {isDiffDrawerOpen ? 'Thu Gọn Bảng Thay Đổi' : 'Mở Rộng Bảng Thay Đổi'}
            </button>
          </div>
        </div>

        {/* Panel Content (Collapsible) */}
        {isDiffDrawerOpen && (
          <div className="p-4 space-y-4">
            {totalSlotChangesCount === 0 ? (
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 text-center space-y-2">
                <div className="inline-flex p-2 bg-amber-100 text-amber-700 rounded-full">
                  <Info className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-amber-900">
                  Bản Dự Thảo Đang Giống 100% Với Thời Khóa Biểu Gốc (Tuần 8)
                </h4>
                <p className="text-xs text-amber-700 max-w-lg mx-auto">
                  Chưa có tiết nào được điều chỉnh. Thầy hãy bấm nút{' '}
                  <b>"Thí Điểm Gom 19 Lớp HĐTN"</b> ở trên hoặc bấm{' '}
                  <b>"Đổi GV Lớp & Môn Thử Nghiệm"</b> để xem bảng phân tích thay đổi số tiết hiển thị tại đây!
                </p>
                <div className="pt-1">
                  <button
                    onClick={handleApplyHdtnConsolidation}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    Thí Điểm Gom 19 Lớp HĐTN Ngay
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 1. KHỐI TỔNG HỢP THỪA THIẾU CẢ NĂM SAU THAY ĐỔI */}
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white rounded-2xl p-4 shadow-sm border border-purple-800/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-amber-400 text-slate-950 rounded-lg">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm tracking-tight text-white flex items-center gap-2">
                          Tổng Thừa Thiếu Cả Năm Học Sau Khi Thay Đổi (Từ Tuần 10 Đến Tuần 35)
                        </h4>
                        <p className="text-[11px] text-purple-200">
                          Áp dụng trong 26 tuần thực dạy (Tuần 10 ➔ Tuần 35). Các tuần từ 1 đến 9 đã dạy được giữ nguyên 100%.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAnnualBreakdownTable(!showAnnualBreakdownTable)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    >
                      {showAnnualBreakdownTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {showAnnualBreakdownTable ? 'Thu Gọn Bảng Điểm Trường & Tổ' : 'Xem Bảng Điểm Trường & Tổ'}
                    </button>
                  </div>

                  {/* 4 Overview Impact Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Card 1: Bù thiếu cho GV thiếu tiết */}
                    <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10 space-y-1">
                      <div className="flex items-center justify-between text-xs text-purple-200">
                        <span className="font-semibold">Bù Tiết Cho GV Thiếu Tiết</span>
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold rounded-full text-[10px]">
                          +{annualImpact.gainedCount} GV
                        </span>
                      </div>
                      <div className="text-xl font-black text-emerald-400">
                        +{annualImpact.gainedTotalYear} tiết/năm
                      </div>
                      <p className="text-[11px] text-slate-300 leading-tight">
                        Bù trực tiếp cho các thầy cô thiếu tiết (Thầy Tín +52t, Hải +52t, Nghĩa +52t, Hùng +26t, Ngoan +26t, Tài +26t, Nguyễn +26t,...).
                      </p>
                    </div>

                    {/* Card 2: Né môn Tin học */}
                    <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10 space-y-1">
                      <div className="flex items-center justify-between text-xs text-purple-200">
                        <span className="font-semibold">Né 100% Môn Tin Học</span>
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-bold rounded-full text-[10px]">
                          Đạt chuẩn
                        </span>
                      </div>
                      <div className="text-xl font-black text-amber-300">
                        -{annualImpact.tinHocLostYear} tiết/năm
                      </div>
                      <p className="text-[11px] text-slate-300 leading-tight">
                        Thầy Phướng (-52t) & Thầy Lộc (-26t) được rút 100% khỏi HĐTN trong 26 tuần, tập trung đúng chuyên môn Tin học.
                      </p>
                    </div>

                    {/* Card 3: Gom gọn 1 người / lớp */}
                    <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10 space-y-1">
                      <div className="flex items-center justify-between text-xs text-purple-200">
                        <span className="font-semibold">Gọn 1 Người / Lớp</span>
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 font-bold rounded-full text-[10px]">
                          19/19 lớp
                        </span>
                      </div>
                      <div className="text-xl font-black text-purple-300">
                        100% Đạt Chuẩn
                      </div>
                      <p className="text-[11px] text-slate-300 leading-tight">
                        Chỉ giao cho người thiếu tiết, rút các GV thừa tiết (Toàn, Thảo, Cẩm, Ngân, Bình,...) để giảm tải, tránh thừa càng thừa.
                      </p>
                    </div>

                    {/* Card 4: Tổng tiết học sinh toàn trường */}
                    <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10 space-y-1">
                      <div className="flex items-center justify-between text-xs text-purple-200">
                        <span className="font-semibold">Tiết Dạy Toàn Trường</span>
                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 font-bold rounded-full text-[10px]">
                          53 lớp
                        </span>
                      </div>
                      <div className="text-xl font-black text-cyan-300">
                        53.830 tiết/năm
                      </div>
                      <p className="text-[11px] text-slate-300 leading-tight">
                        1.538 tiết/tuần × 35 tuần được bảo toàn 100%, không mất bất kỳ tiết học nào của học sinh.
                      </p>
                    </div>
                  </div>

                  {/* Collapsible Annual Breakdown by Campus & Department */}
                  {showAnnualBreakdownTable && (
                    <div className="pt-2 space-y-3 animate-in fade-in duration-200">
                      {/* Campus breakdown table */}
                      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        <div className="px-3 py-2 bg-white/10 font-bold text-xs text-purple-200 flex items-center justify-between">
                          <span>1. Tác Động Thừa/Thiếu Cả Năm Theo 3 Điểm Trường</span>
                          <span className="text-[11px] font-normal text-slate-300">3 Điểm trường • 101 Giáo viên</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-white/5 text-purple-200 border-b border-white/10 text-[11px]">
                                <th className="py-2 px-3">Điểm Trường</th>
                                <th className="py-2 px-3 text-center">Số GV</th>
                                <th className="py-2 px-3 text-center">Số GV Thay Đổi</th>
                                <th className="py-2 px-3 text-center">Biến Động Cả Năm</th>
                                <th className="py-2 px-3 text-center">Tình Trạng</th>
                                <th className="py-2 px-3 min-w-[200px]">Đánh Giá Rủi Ro / Tác Động</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {annualImpact.campusBreakdown.map((cb) => (
                                <tr key={cb.campusKey} className="hover:bg-white/5 transition-colors">
                                  <td className="py-2 px-3 font-bold text-white flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-purple-300" />
                                    {cb.name}
                                  </td>
                                  <td className="py-2 px-3 text-center font-medium">{cb.teacherCount} GV</td>
                                  <td className="py-2 px-3 text-center">
                                    {cb.changedTeachersCount > 0 ? (
                                      <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-bold rounded-full text-[10px]">
                                        {cb.changedTeachersCount} GV
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-mono">0</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-center font-bold">
                                    {cb.deltaYear === 0 ? (
                                      <span className="text-emerald-400 font-mono">0t/năm</span>
                                    ) : (
                                      <span className={cb.deltaYear > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                        {cb.deltaYear > 0 ? `+${cb.deltaYear}t` : `${cb.deltaYear}t`}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cb.badgeColor}`}>
                                      {cb.statusBadge}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-slate-300 text-[11px]">{cb.note}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Department breakdown table */}
                      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        <div className="px-3 py-2 bg-white/10 font-bold text-xs text-purple-200 flex items-center justify-between">
                          <span>2. Tác Động Thừa/Thiếu Cả Năm Theo Các Tổ Chuyên Môn Bị Ảnh Hưởng</span>
                          <span className="text-[11px] font-normal text-slate-300">{annualImpact.departmentBreakdown.length} Tổ có giáo viên biến động</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-white/5 text-purple-200 border-b border-white/10 text-[11px]">
                                <th className="py-2 px-3">Tổ Chuyên Môn</th>
                                <th className="py-2 px-3 text-center">Số GV Tổ</th>
                                <th className="py-2 px-3 text-center">GV Tăng Tiết</th>
                                <th className="py-2 px-3 text-center">GV Giảm Tiết</th>
                                <th className="py-2 px-3 text-center">Chênh Lệch Năm</th>
                                <th className="py-2 px-3 min-w-[220px]">Chi Tiết Biến Động Giáo Viên</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {annualImpact.departmentBreakdown.map((db) => (
                                <tr key={db.deptId} className="hover:bg-white/5 transition-colors">
                                  <td className="py-2 px-3 font-bold text-white">{db.deptName}</td>
                                  <td className="py-2 px-3 text-center font-medium">{db.teacherCount} GV</td>
                                  <td className="py-2 px-3 text-center">
                                    {db.gainedCount > 0 ? (
                                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold rounded-full text-[10px]">
                                        +{db.gainedCount} GV
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-mono">-</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    {db.lostCount > 0 ? (
                                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 font-bold rounded-full text-[10px]">
                                        -{db.lostCount} GV
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-mono">-</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-center font-black">
                                    <span className={db.deltaYear > 0 ? 'text-emerald-400' : db.deltaYear < 0 ? 'text-rose-400' : 'text-slate-300'}>
                                      {db.deltaYear > 0 ? `+${db.deltaYear}t/năm` : db.deltaYear < 0 ? `${db.deltaYear}t/năm` : '0t'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-slate-300 text-[11px]">
                                    <div className="flex flex-wrap gap-1">
                                      {db.teachersSummary.map((ts, sIdx) => (
                                        <span key={sIdx} className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">
                                          {ts}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Filter Tabs and Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold gap-1">
                    <button
                      onClick={() => setDiffFilterTab('ALL')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        diffFilterTab === 'ALL'
                          ? 'bg-purple-700 text-white shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tất cả GV thay đổi ({teacherDeltas.length})
                    </button>
                    <button
                      onClick={() => setDiffFilterTab('GAINED')}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                        diffFilterTab === 'GAINED'
                          ? 'bg-emerald-600 text-white shadow-xs font-bold'
                          : 'text-emerald-700 hover:text-emerald-900'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      GV được tăng tiết (+{gainedTeachersCount})
                    </button>
                    <button
                      onClick={() => setDiffFilterTab('LOST')}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                        diffFilterTab === 'LOST'
                          ? 'bg-rose-600 text-white shadow-xs font-bold'
                          : 'text-rose-700 hover:text-rose-900'
                      }`}
                    >
                      <TrendingDown className="w-3.5 h-3.5" />
                      GV được giảm tiết (-{lostTeachersCount})
                    </button>
                    <button
                      onClick={() => setDiffFilterTab('SLOTS')}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                        diffFilterTab === 'SLOTS'
                          ? 'bg-indigo-600 text-white shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Chi tiết 19 lớp đổi tiết ({slotDifferences.length})
                    </button>
                  </div>

                  {/* Search box */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tìm tên giáo viên, mã, tổ..."
                      value={diffSearchTerm}
                      onChange={(e) => setDiffSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Sub-View 1: Teachers Workload Delta Table */}
                {diffFilterTab !== 'SLOTS' && (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                          <th className="py-2.5 px-3 w-12 text-center">STT</th>
                          <th className="py-2.5 px-3 min-w-[180px]">Họ và Tên Giáo Viên</th>
                          <th className="py-2.5 px-3 min-w-[130px]">Tổ Chuyên Môn</th>
                          <th className="py-2.5 px-2 w-20 text-center">Định Mức</th>
                          <th className="py-2.5 px-2.5 w-24 text-center bg-slate-200/60">
                            Tiết Tuần (Cũ ➔ Mới)
                          </th>
                          <th className="py-2.5 px-2 w-20 text-center">Lệch Tuần</th>
                          <th className="py-2.5 px-3 w-28 text-center bg-rose-50/70 text-rose-900 font-bold border-l border-slate-200">
                            Thiếu/Thừa Năm Gốc
                          </th>
                          <th className="py-2.5 px-3 w-32 text-center bg-purple-100/80 text-purple-950 font-black">
                            Thiếu/Thừa Năm Mới
                          </th>
                          <th className="py-2.5 px-3 w-28 text-center bg-emerald-50 text-emerald-900 font-bold border-r border-slate-200">
                            Cải Thiện Cả Năm
                          </th>
                          <th className="py-2.5 px-3 min-w-[220px]">Chi Tiết Tiết / Lớp Được Điều Chỉnh</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredTeacherDeltas.map((item, idx) => {
                          const isGained = item.weeklyDelta > 0;
                          return (
                            <tr
                              key={item.teacherId}
                              className={`hover:bg-purple-50/30 transition-colors ${
                                isGained ? 'bg-emerald-50/15' : 'bg-rose-50/15'
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  {item.teacherName}
                                  {isGained ? (
                                    <span className="p-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px]" title="Được tăng thêm tiết">
                                      <TrendingUp className="w-3 h-3" />
                                    </span>
                                  ) : (
                                    <span className="p-0.5 bg-rose-100 text-rose-700 rounded text-[10px]" title="Được giảm bớt tiết">
                                      <TrendingDown className="w-3 h-3" />
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {item.teacherCode} • {item.campus}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {item.departmentName}
                              </td>
                              <td className="py-2.5 px-2 text-center font-bold text-slate-700">
                                {item.effectiveStandard}t
                              </td>
                              <td className="py-2.5 px-2.5 text-center font-semibold text-slate-700 bg-slate-50">
                                <span className="text-slate-500">{item.oldWeeklyTeaching}t</span>
                                <span className="mx-1 text-slate-400">➔</span>
                                <span className="font-black text-purple-900 text-sm">{item.newWeeklyTeaching}t</span>
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <span
                                  className={`px-1.5 py-0.5 rounded-md font-black text-xs inline-flex items-center ${
                                    isGained
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                                  }`}
                                >
                                  {isGained ? `+${item.weeklyDelta}t` : `${item.weeklyDelta}t`}
                                </span>
                              </td>
                              {/* Cân Đối Năm Gốc */}
                              <td className="py-2.5 px-3 text-center bg-slate-50/70 border-l border-slate-200">
                                <div
                                  className={`font-bold text-xs ${
                                    item.oldYearBalance < 0
                                      ? 'text-rose-700'
                                      : item.oldYearBalance > 0
                                      ? 'text-blue-700'
                                      : 'text-emerald-700'
                                  }`}
                                >
                                  {item.oldYearBalance > 0 ? `+${item.oldYearBalance}t` : `${item.oldYearBalance}t`}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {item.oldYearBalance < 0
                                    ? `Thiếu ${Math.abs(item.oldYearBalance)}t/năm`
                                    : item.oldYearBalance > 0
                                    ? `Thừa ${item.oldYearBalance}t/năm`
                                    : 'Tròn chuẩn'}
                                </div>
                              </td>
                              {/* Cân Đối Năm Mới */}
                              <td className="py-2.5 px-3 text-center bg-purple-50/60 border-x border-purple-100">
                                <div
                                  className={`font-black text-sm ${
                                    item.newYearBalance < 0
                                      ? 'text-rose-800'
                                      : item.newYearBalance > 0
                                      ? 'text-blue-800'
                                      : 'text-emerald-800'
                                  }`}
                                >
                                  {item.newYearBalance > 0 ? `+${item.newYearBalance}t` : `${item.newYearBalance}t`}
                                </div>
                                <div className="text-[10px] text-purple-900 font-bold">
                                  {item.newYearBalance < 0
                                    ? `Thiếu ${Math.abs(item.newYearBalance)}t/năm`
                                    : item.newYearBalance > 0
                                    ? `Thừa ${item.newYearBalance}t/năm`
                                    : 'Tròn chuẩn'}
                                </div>
                              </td>
                              {/* Cải Thiện Cả Năm */}
                              <td className="py-2.5 px-3 text-center bg-slate-50/40 border-r border-slate-200">
                                <span
                                  className={`px-2 py-1 rounded-lg font-black text-xs inline-flex items-center gap-1 shadow-2xs ${
                                    isGained
                                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                      : 'bg-rose-100 text-rose-900 border border-rose-300'
                                  }`}
                                >
                                  {isGained ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                  {isGained ? `Bù +${item.yearDelta}t` : `${item.yearDelta}t`}
                                </span>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {isGained ? 'Giảm áp lực thiếu' : 'Giảm tải tiết'}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-700">
                                {isGained && item.classesGained.length > 0 && (
                                  <div className="space-y-0.5">
                                    <div className="text-[11px] font-bold text-emerald-800">
                                      + Nhận thêm {item.classesGained.length} tiết:
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {item.classesGained.map((cl, cIdx) => (
                                        <span
                                          key={cIdx}
                                          className="px-1.5 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded text-[10px] font-medium"
                                        >
                                          {cl}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {!isGained && item.classesLost.length > 0 && (
                                  <div className="space-y-0.5">
                                    <div className="text-[11px] font-bold text-rose-800">
                                      - Chuyển giao {item.classesLost.length} tiết:
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {item.classesLost.map((cl, cIdx) => (
                                        <span
                                          key={cIdx}
                                          className="px-1.5 py-0.5 bg-rose-50 text-rose-900 border border-rose-200 rounded text-[10px] font-medium"
                                        >
                                          {cl}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Sub-View 2: Specific Slot by Slot Diffs Table (19 Lớp HĐTN) */}
                {diffFilterTab === 'SLOTS' && (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                          <th className="py-2.5 px-3 w-12 text-center">STT</th>
                          <th className="py-2.5 px-3 w-20 text-center font-black text-slate-900">
                            Lớp
                          </th>
                          <th className="py-2.5 px-3 min-w-[150px]">Môn / Nội Dung</th>
                          <th className="py-2.5 px-3 w-32 text-center">Thời Gian TKB</th>
                          <th className="py-2.5 px-3 min-w-[160px] bg-rose-50 text-rose-900 font-bold">
                            Giáo Viên Ban Đầu (TKB Gốc)
                          </th>
                          <th className="py-2.5 px-2 w-10 text-center">
                            <ArrowRight className="w-4 h-4 text-slate-400 mx-auto" />
                          </th>
                          <th className="py-2.5 px-3 min-w-[180px] bg-emerald-50 text-emerald-900 font-black">
                            Giáo Viên Dự Thảo Mới (Nhận Gom)
                          </th>
                          <th className="py-2.5 px-3 min-w-[200px]">Căn Cứ / Lý Do Ưu Tiên</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {slotDifferences.map((item, idx) => (
                          <tr key={item.slotId} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-1 bg-purple-100 text-purple-900 font-black rounded-lg border border-purple-200 text-xs">
                                {item.className}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              {item.subjectName}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-600 font-mono">
                              Thứ {item.dayOfWeek} • Tiết {item.period} ({item.session})
                            </td>
                            <td className="py-2.5 px-3 bg-rose-50/50">
                              <div className="font-bold text-rose-900 line-through decoration-rose-500">
                                {item.oldTeacherName}
                              </div>
                              <div className="text-[10px] text-rose-600 font-mono">
                                {item.oldTeacherCode}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <ArrowRight className="w-4 h-4 text-emerald-600 mx-auto" />
                            </td>
                            <td className="py-2.5 px-3 bg-emerald-50/60">
                              <div className="font-black text-emerald-900 text-sm flex items-center gap-1">
                                {item.newTeacherName}
                                <Check className="w-3.5 h-3.5 text-emerald-600 inline" />
                              </div>
                              <div className="text-[11px] text-emerald-700 font-mono">
                                {item.newTeacherCode}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">
                              {item.reason ? (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded text-[11px] font-medium">
                                  {item.reason}
                                </span>
                              ) : (
                                <span className="text-slate-500 italic">Được phân công lại</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 3. FULL VISUAL CALCULATION ENGINE (SỐ TIẾT THỰC DẠY THEO BẢN DỰ THẢO) */}
      <WeeklyTeachingLogView
        config={config}
        teachers={teachers}
        departments={departments}
        classes={classes}
        subjects={subjects}
        weeklyTimetables={draftWeeklyTimetables}
        currentWeek={10}
        timetable={draftMasterTimetable}
        isAdmin={isAdmin}
        storageKeyPrefix={DRAFT_SANDBOX_ADJUSTMENT_PREFIX}
        customTitle="Dự Thảo Phân Công Mới (Số Tiết Thực Dạy)"
        customDescription="Bảng tính thừa thiếu tiết cả năm (35 tuần) và từng tuần theo phân công mới áp dụng từ Tuần 10 đến Tuần 35 (26 tuần). Tuần 1 đến 9 giữ nguyên số tiết đã thực dạy."
        defaultLevelScope="ALL"
        changedTeachersMap={changedTeachersMap}
      />

      {/* 4. MODAL: ĐỔI GIÁO VIÊN LỚP & MÔN THỬ NGHIỆM */}
      {isReassignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-800 to-indigo-900 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/10 rounded-xl">
                  <ArrowRightLeft className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Thử Nghiệm Đổi Giáo Viên Trong Dự Thảo</h3>
                  <p className="text-xs text-purple-200">
                    Chỉ áp dụng trong bản Dự thảo • Không ảnh hưởng TKB chính thức
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReassignModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-purple-200 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Select Class */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. Chọn Lớp Học (53 lớp toàn trường):
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <optgroup label="Cấp THPT (Khối 10 - 12)">
                    {classes
                      .filter((c) => c.level === 'THPT')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (THPT Đốc Binh Kiều)
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="THCS Đốc Binh Kiều (6A1 - 9A6)">
                    {classes
                      .filter(
                        (c) =>
                          c.level === 'THCS' &&
                          !['6A7', '6A8', '6A9', '6A10', '7A7', '7A8', '7A9', '8A7', '8A8', '8A9', '8A10', '9A7', '9A8', '9A9', '9A10'].includes(c.name)
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (THCS ĐBK)
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="THCS Tân Kiều (6A7 - 9A10)">
                    {classes
                      .filter((c) =>
                        ['6A7', '6A8', '6A9', '6A10', '7A7', '7A8', '7A9', '8A7', '8A8', '8A9', '8A10', '9A7', '9A8', '9A9', '9A10'].includes(c.name)
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (THCS Tân Kiều)
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {/* Select Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  2. Chọn Môn Học Trong Lớp:
                </label>
                {classSubjects.length === 0 ? (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                    Lớp này hiện không có tiết trong thời khóa biểu tuần hiện tại.
                  </p>
                ) : (
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {classSubjects.map((cs) => (
                      <option key={cs.subjectId} value={cs.subjectId}>
                        {cs.subjectName} ({cs.count} tiết/tuần) • Hiện tại: {cs.teacherName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Current Teacher Info */}
              {currentAssignedTeacher && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-amber-800 font-medium">Giáo viên hiện đang dạy:</span>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">
                      {currentAssignedTeacher}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-200/80 text-amber-900 font-bold rounded-lg text-xs">
                    Đang được gán
                  </span>
                </div>
              )}

              {/* Select New Teacher */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  3. Chọn Giáo Viên Mới Để Thay Thế:
                </label>
                <select
                  value={selectedNewTeacherId}
                  onChange={(e) => setSelectedNewTeacherId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Chọn giáo viên mới --</option>
                  {teachers
                    .filter((t) => !t.id.startsWith('tch-bgh') && t.role !== 'HieuTruong' && t.role !== 'PhoHieuTruong')
                    .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
                    .map((t) => {
                      const deptName = departments.find((d) => d.id === t.departmentId)?.name || '';
                      return (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.code}) - {deptName} [{t.campus || 'ĐBK'}]
                        </option>
                      );
                    })}
                </select>
              </div>

              {/* Scope */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  4. Phạm Vi Áp Dụng Trong Dự Thảo:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setApplyScope('CURRENT_ONWARD')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      applyScope === 'CURRENT_ONWARD'
                        ? 'bg-purple-50 border-purple-400 text-purple-900 font-bold shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div>Từ Tuần {currentWeek} trở đi</div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      Giữ nguyên các tuần cũ
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplyScope('ALL_SEMESTER')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      applyScope === 'ALL_SEMESTER'
                        ? 'bg-purple-50 border-purple-400 text-purple-900 font-bold shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div>Toàn bộ học kỳ / Năm</div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      Cả Tuần 1 đến Tuần 35
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReassignModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleApplySingleReassignment}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Áp Dụng Vào Dự Thảo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
