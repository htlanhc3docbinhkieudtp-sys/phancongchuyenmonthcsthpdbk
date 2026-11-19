export interface OfficialClassMeta {
  classId: string;
  className: string;
  level: 'THPT' | 'THCS';
  campus: 'THPTDBK' | 'THCSDBK' | 'THCSTK';
  grade: string;
  session: 'SANG' | 'CHIEU';
}

export interface OfficialSubjectClassAssignment {
  teacherId: string;
  teacherName: string;
  teacherCode: string;
  campus: string;
  note: string;
}

export interface OfficialGddpAiOverridePayload {
  version: number;
  updatedAt: number;
  updatedBy?: string;
  gddpClassTeacherMap: Record<string, string>;
  aiClassTeacherMap: Record<string, string>;
  diaWeek11ClassTeacherMap?: Record<string, string>;
  gddpScope?: 'FROM_WEEK_11_2T' | 'FULL_YEAR' | 'FROM_WEEK_10';
}

export const OFFICIAL_GDDP_AI_STORAGE_KEY = 'docbinhkieu_official_gddp_ai_override_v1';
export const OFFICIAL_GDDP_AI_VERSION = 2;

const MORNING_THCS_CLASSES = new Set([
  '6A1', '6A2', '6A3',
  '8A1', '8A2', '8A3',
  '6A7', '6A8',
  '8A7', '8A8',
  '9A1', '9A2', '9A3', '9A4', '9A5', '9A6', '9A7', '9A8', '9A9', '9A10',
]);

export const OFFICIAL_53_CLASS_META: OfficialClassMeta[] = [
  // THPT (14 lớp - Điểm chính)
  { classId: 'cls-10cb1', className: '10CB1', level: 'THPT', campus: 'THPTDBK', grade: '10', session: 'SANG' },
  { classId: 'cls-10cb2', className: '10CB2', level: 'THPT', campus: 'THPTDBK', grade: '10', session: 'SANG' },
  { classId: 'cls-10cb3', className: '10CB3', level: 'THPT', campus: 'THPTDBK', grade: '10', session: 'SANG' },
  { classId: 'cls-10cb4', className: '10CB4', level: 'THPT', campus: 'THPTDBK', grade: '10', session: 'SANG' },
  { classId: 'cls-10cb5', className: '10CB5', level: 'THPT', campus: 'THPTDBK', grade: '10', session: 'SANG' },
  { classId: 'cls-11cb1', className: '11CB1', level: 'THPT', campus: 'THPTDBK', grade: '11', session: 'SANG' },
  { classId: 'cls-11cb2', className: '11CB2', level: 'THPT', campus: 'THPTDBK', grade: '11', session: 'SANG' },
  { classId: 'cls-11cb3', className: '11CB3', level: 'THPT', campus: 'THPTDBK', grade: '11', session: 'SANG' },
  { classId: 'cls-11cb4', className: '11CB4', level: 'THPT', campus: 'THPTDBK', grade: '11', session: 'SANG' },
  { classId: 'cls-12cb1', className: '12CB1', level: 'THPT', campus: 'THPTDBK', grade: '12', session: 'SANG' },
  { classId: 'cls-12cb2', className: '12CB2', level: 'THPT', campus: 'THPTDBK', grade: '12', session: 'SANG' },
  { classId: 'cls-12cb3', className: '12CB3', level: 'THPT', campus: 'THPTDBK', grade: '12', session: 'SANG' },
  { classId: 'cls-12cb4', className: '12CB4', level: 'THPT', campus: 'THPTDBK', grade: '12', session: 'SANG' },
  { classId: 'cls-12cb5', className: '12CB5', level: 'THPT', campus: 'THPTDBK', grade: '12', session: 'SANG' },

  // THCS Đốc Binh Kiều (24 lớp)
  { classId: 'cls-6a1', className: '6A1', level: 'THCS', campus: 'THCSDBK', grade: '6', session: MORNING_THCS_CLASSES.has('6A1') ? 'SANG' : 'CHIEU' },
  { classId: 'cls-6a2', className: '6A2', level: 'THCS', campus: 'THCSDBK', grade: '6', session: MORNING_THCS_CLASSES.has('6A2') ? 'SANG' : 'CHIEU' },
  { classId: 'cls-6a3', className: '6A3', level: 'THCS', campus: 'THCSDBK', grade: '6', session: MORNING_THCS_CLASSES.has('6A3') ? 'SANG' : 'CHIEU' },
  { classId: 'cls-6a4', className: '6A4', level: 'THCS', campus: 'THCSDBK', grade: '6', session: 'CHIEU' },
  { classId: 'cls-6a5', className: '6A5', level: 'THCS', campus: 'THCSDBK', grade: '6', session: 'CHIEU' },
  { classId: 'cls-6a6', className: '6A6', level: 'THCS', campus: 'THCSDBK', grade: '6', session: 'CHIEU' },
  { classId: 'cls-7a1', className: '7A1', level: 'THCS', campus: 'THCSDBK', grade: '7', session: 'CHIEU' },
  { classId: 'cls-7a2', className: '7A2', level: 'THCS', campus: 'THCSDBK', grade: '7', session: 'CHIEU' },
  { classId: 'cls-7a3', className: '7A3', level: 'THCS', campus: 'THCSDBK', grade: '7', session: 'CHIEU' },
  { classId: 'cls-7a4', className: '7A4', level: 'THCS', campus: 'THCSDBK', grade: '7', session: 'CHIEU' },
  { classId: 'cls-7a5', className: '7A5', level: 'THCS', campus: 'THCSDBK', grade: '7', session: 'CHIEU' },
  { classId: 'cls-7a6', className: '7A6', level: 'THCS', campus: 'THCSDBK', grade: '7', session: 'CHIEU' },
  { classId: 'cls-8a1', className: '8A1', level: 'THCS', campus: 'THCSDBK', grade: '8', session: 'SANG' },
  { classId: 'cls-8a2', className: '8A2', level: 'THCS', campus: 'THCSDBK', grade: '8', session: 'SANG' },
  { classId: 'cls-8a3', className: '8A3', level: 'THCS', campus: 'THCSDBK', grade: '8', session: 'SANG' },
  { classId: 'cls-8a4', className: '8A4', level: 'THCS', campus: 'THCSDBK', grade: '8', session: 'CHIEU' },
  { classId: 'cls-8a5', className: '8A5', level: 'THCS', campus: 'THCSDBK', grade: '8', session: 'CHIEU' },
  { classId: 'cls-8a6', className: '8A6', level: 'THCS', campus: 'THCSDBK', grade: '8', session: 'CHIEU' },
  { classId: 'cls-9a1', className: '9A1', level: 'THCS', campus: 'THCSDBK', grade: '9', session: 'SANG' },
  { classId: 'cls-9a2', className: '9A2', level: 'THCS', campus: 'THCSDBK', grade: '9', session: 'SANG' },
  { classId: 'cls-9a3', className: '9A3', level: 'THCS', campus: 'THCSDBK', grade: '9', session: 'SANG' },
  { classId: 'cls-9a4', className: '9A4', level: 'THCS', campus: 'THCSDBK', grade: '9', session: 'SANG' },
  { classId: 'cls-9a5', className: '9A5', level: 'THCS', campus: 'THCSDBK', grade: '9', session: 'SANG' },
  { classId: 'cls-9a6', className: '9A6', level: 'THCS', campus: 'THCSDBK', grade: '9', session: 'SANG' },

  // THCS Tân Kiều (15 lớp)
  { classId: 'cls-6a7', className: '6A7', level: 'THCS', campus: 'THCSTK', grade: '6', session: 'SANG' },
  { classId: 'cls-6a8', className: '6A8', level: 'THCS', campus: 'THCSTK', grade: '6', session: 'SANG' },
  { classId: 'cls-6a9', className: '6A9', level: 'THCS', campus: 'THCSTK', grade: '6', session: 'CHIEU' },
  { classId: 'cls-6a10', className: '6A10', level: 'THCS', campus: 'THCSTK', grade: '6', session: 'CHIEU' },
  { classId: 'cls-7a7', className: '7A7', level: 'THCS', campus: 'THCSTK', grade: '7', session: 'CHIEU' },
  { classId: 'cls-7a8', className: '7A8', level: 'THCS', campus: 'THCSTK', grade: '7', session: 'CHIEU' },
  { classId: 'cls-7a9', className: '7A9', level: 'THCS', campus: 'THCSTK', grade: '7', session: 'CHIEU' },
  { classId: 'cls-8a7', className: '8A7', level: 'THCS', campus: 'THCSTK', grade: '8', session: 'SANG' },
  { classId: 'cls-8a8', className: '8A8', level: 'THCS', campus: 'THCSTK', grade: '8', session: 'SANG' },
  { classId: 'cls-8a9', className: '8A9', level: 'THCS', campus: 'THCSTK', grade: '8', session: 'CHIEU' },
  { classId: 'cls-8a10', className: '8A10', level: 'THCS', campus: 'THCSTK', grade: '8', session: 'CHIEU' },
  { classId: 'cls-9a7', className: '9A7', level: 'THCS', campus: 'THCSTK', grade: '9', session: 'SANG' },
  { classId: 'cls-9a8', className: '9A8', level: 'THCS', campus: 'THCSTK', grade: '9', session: 'SANG' },
  { classId: 'cls-9a9', className: '9A9', level: 'THCS', campus: 'THCSTK', grade: '9', session: 'SANG' },
  { classId: 'cls-9a10', className: '9A10', level: 'THCS', campus: 'THCSTK', grade: '9', session: 'SANG' },
];

// =========================================================================
// MÔN GIÁO DỤC ĐỊA PHƯƠNG (GDĐP) CHÍNH THỨC - 35 TIẾT / NĂM / LỚP
// - Áp dụng từ Tuần 11: 2 tiết/tuần (Tuần 11 -> 27 = 34t) + 1 tiết (Tuần 28) = đủ 35 tiết/lớp
// - Từ Tuần 29 -> 35: Ngưng (0 tiết)
// - Đã đồng bộ chính xác với Dự thảo phân công mới & TKB Tuần 11 (53/53 lớp, 9A9 = Thầy Phạm Biên Thùy)
// =========================================================================
export const OFFICIAL_GDDP_CLASS_ASSIGNMENTS: Record<string, OfficialSubjectClassAssignment> = {
  // --- Điểm chính (THPT - 14 lớp) ---
  '10CB1': { teacherId: 'tch-khtn-5', teacherName: 'Cao Văn Tùng', teacherCode: 'Tùng.CV (10CB1)', campus: 'Điểm chính (THPT)', note: 'Thầy Cao Văn Tùng: 5 lớp (175t)' },
  '10CB2': { teacherId: 'tch-khtn-5', teacherName: 'Cao Văn Tùng', teacherCode: 'Tùng.CV (10CB1)', campus: 'Điểm chính (THPT)', note: 'Thầy Cao Văn Tùng: 5 lớp (175t)' },
  '10CB3': { teacherId: 'tch-khtn-5', teacherName: 'Cao Văn Tùng', teacherCode: 'Tùng.CV (10CB1)', campus: 'Điểm chính (THPT)', note: 'Thầy Cao Văn Tùng: 5 lớp (175t)' },
  '10CB4': { teacherId: 'tch-khtn-5', teacherName: 'Cao Văn Tùng', teacherCode: 'Tùng.CV (10CB1)', campus: 'Điểm chính (THPT)', note: 'Thầy Cao Văn Tùng: 5 lớp (175t)' },
  '10CB5': { teacherId: 'tch-khtn-5', teacherName: 'Cao Văn Tùng', teacherCode: 'Tùng.CV (10CB1)', campus: 'Điểm chính (THPT)', note: 'Thầy Cao Văn Tùng: 5 lớp (175t)' },
  '11CB1': { teacherId: 'tch-av-7', teacherName: 'Nguyễn Thị Vân Anh', teacherCode: 'Anh.NTV (Con nhỏ)', campus: 'Điểm chính (THPT)', note: 'Cô Vân Anh: 11CB1 GDĐP (35t) + 6 lớp AI (72t)' },
  '11CB2': { teacherId: 'tch-khtn-8', teacherName: 'Phạm Long Phi', teacherCode: 'Phi.PL (11CB2)', campus: 'Điểm chính (THPT)', note: 'Thầy Phạm Long Phi: 1 lớp (35t)' },
  '11CB3': { teacherId: 'tch-av-5', teacherName: 'Ngô Bảo Quốc', teacherCode: 'Quốc.NB', campus: 'Điểm chính (THPT)', note: 'Thầy Ngô Bảo Quốc: 4 lớp (140t)' },
  '11CB4': { teacherId: 'tch-av-5', teacherName: 'Ngô Bảo Quốc', teacherCode: 'Quốc.NB', campus: 'Điểm chính (THPT)', note: 'Thầy Ngô Bảo Quốc: 4 lớp (140t)' },
  '12CB1': { teacherId: 'tch-v-5', teacherName: 'Lê Thị Mỹ Ny', teacherCode: 'Ny.LTM (10CB3)', campus: 'Điểm chính (THPT)', note: 'Cô Lê Thị Mỹ Ny: 1 lớp (35t)' },
  '12CB2': { teacherId: 'tch-av-6', teacherName: 'Trương Sơn Bền', teacherCode: 'Bền.TS', campus: 'Điểm chính (THPT)', note: 'Thầy Trương Sơn Bền: 3 lớp GDĐP (105t) + 3 AI (36t)' },
  '12CB3': { teacherId: 'tch-av-6', teacherName: 'Trương Sơn Bền', teacherCode: 'Bền.TS', campus: 'Điểm chính (THPT)', note: 'Thầy Trương Sơn Bền: 3 lớp GDĐP (105t) + 3 AI (36t)' },
  '12CB4': { teacherId: 'tch-khtn-3', teacherName: 'Phạm Biên Thùy', teacherCode: 'Thùy.PB (TP)', campus: 'Điểm chính (THPT)', note: 'Thầy Phạm Biên Thùy: 2 lớp 12CB4, 9A9 (70t)' },
  '12CB5': { teacherId: 'tch-av-6', teacherName: 'Trương Sơn Bền', teacherCode: 'Bền.TS', campus: 'Điểm chính (THPT)', note: 'Thầy Trương Sơn Bền: 3 lớp GDĐP (105t) + 3 AI (36t)' },

  // --- Điểm THCS Đốc Binh Kiều (24 lớp) ---
  '6A1': { teacherId: 'tch-ls-1', teacherName: 'Lê Hồng Thúy', teacherCode: 'Thúy.LH (TT)', campus: 'THCS Đốc Binh Kiều', note: 'Cô Lê Hồng Thúy: 6 lớp 6A1-6A6 (210t)' },
  '6A2': { teacherId: 'tch-ls-1', teacherName: 'Lê Hồng Thúy', teacherCode: 'Thúy.LH (TT)', campus: 'THCS Đốc Binh Kiều', note: 'Cô Lê Hồng Thúy: 6 lớp 6A1-6A6 (210t)' },
  '6A3': { teacherId: 'tch-ls-1', teacherName: 'Lê Hồng Thúy', teacherCode: 'Thúy.LH (TT)', campus: 'THCS Đốc Binh Kiều', note: 'Cô Lê Hồng Thúy: 6 lớp 6A1-6A6 (210t)' },
  '6A4': { teacherId: 'tch-ls-1', teacherName: 'Lê Hồng Thúy', teacherCode: 'Thúy.LH (TT)', campus: 'THCS Đốc Binh Kiều', note: 'Cô Lê Hồng Thúy: 6 lớp 6A1-6A6 (210t)' },
  '6A5': { teacherId: 'tch-ls-1', teacherName: 'Lê Hồng Thúy', teacherCode: 'Thúy.LH (TT)', campus: 'THCS Đốc Binh Kiều', note: 'Cô Lê Hồng Thúy: 6 lớp 6A1-6A6 (210t)' },
  '6A6': { teacherId: 'tch-ls-1', teacherName: 'Lê Hồng Thúy', teacherCode: 'Thúy.LH (TT)', campus: 'THCS Đốc Binh Kiều', note: 'Cô Lê Hồng Thúy: 6 lớp 6A1-6A6 (210t)' },
  '7A1': { teacherId: 'tch-av-4', teacherName: 'Võ Thị Hiền Thi', teacherCode: 'Thi.VTH', campus: 'THCS Đốc Binh Kiều', note: 'Cô Võ Thị Hiền Thi: 1 lớp (35t)' },
  '7A2': { teacherId: 'tch-t-1', teacherName: 'Nguyễn Văn Tới', teacherCode: 'Tới.NV (TT)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Tới: 7A2 GDĐP (35t) + 2 lớp AI (24t)' },
  '7A3': { teacherId: 'tch-bgh-3', teacherName: 'Phan Thanh Thảo', teacherCode: 'Thảo.PT (PHT)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Phan Thanh Thảo (PHT): 4 lớp 7A3-7A6 (140t)' },
  '7A4': { teacherId: 'tch-bgh-3', teacherName: 'Phan Thanh Thảo', teacherCode: 'Thảo.PT (PHT)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Phan Thanh Thảo (PHT): 4 lớp 7A3-7A6 (140t)' },
  '7A5': { teacherId: 'tch-bgh-3', teacherName: 'Phan Thanh Thảo', teacherCode: 'Thảo.PT (PHT)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Phan Thanh Thảo (PHT): 4 lớp 7A3-7A6 (140t)' },
  '7A6': { teacherId: 'tch-bgh-3', teacherName: 'Phan Thanh Thảo', teacherCode: 'Thảo.PT (PHT)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Phan Thanh Thảo (PHT): 4 lớp 7A3-7A6 (140t)' },
  '8A1': { teacherId: 'tch-t-9', teacherName: 'Nguyễn Thái Hùng', teacherCode: 'Hùng.NThái (8A1)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Nguyễn Thái Hùng (GVCN 8A1): 1 lớp (35t)' },
  '8A2': { teacherId: 'tch-av-5', teacherName: 'Ngô Bảo Quốc', teacherCode: 'Quốc.NB', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Ngô Bảo Quốc: 4 lớp (140t)' },
  '8A3': { teacherId: 'tch-td-1', teacherName: 'Lê Văn Nguyên', teacherCode: 'Nguyên.LV (TT)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Lê Văn Nguyên: 1 lớp (35t)' },
  '8A4': { teacherId: 'tch-t-10', teacherName: 'Nguyễn Văn Ngoan', teacherCode: 'Ngoan.NV (7A1)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Nguyễn Văn Ngoan: 1 lớp (35t)' },
  '8A5': { teacherId: 'tch-av-5', teacherName: 'Ngô Bảo Quốc', teacherCode: 'Quốc.NB', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Ngô Bảo Quốc: 4 lớp (140t)' },
  '8A6': { teacherId: 'tch-t-11', teacherName: 'Nguyễn Quốc Nguyễn', teacherCode: 'Nguyễn.NQ (7A3)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Nguyễn Quốc Nguyễn: 1 lớp (35t)' },
  '9A1': { teacherId: 'tch-v-2', teacherName: 'Trương Văn Nghĩa', teacherCode: 'Nghĩa.TV (TP)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Trương Văn Nghĩa: 1 lớp (35t)' },
  '9A2': { teacherId: 'tch-khtn-22', teacherName: 'Trần Phi Hải', teacherCode: 'Hải.TP (8A2)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Trần Phi Hải: 3 lớp 9A2, 9A3, 9A5 (105t)' },
  '9A3': { teacherId: 'tch-khtn-22', teacherName: 'Trần Phi Hải', teacherCode: 'Hải.TP (8A2)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Trần Phi Hải: 3 lớp 9A2, 9A3, 9A5 (105t)' },
  '9A4': { teacherId: 'tch-t-12', teacherName: 'Nguyễn Văn Tài', teacherCode: 'Tài.NV (9A4)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Nguyễn Văn Tài (GVCN 9A4): 1 lớp (35t)' },
  '9A5': { teacherId: 'tch-khtn-22', teacherName: 'Trần Phi Hải', teacherCode: 'Hải.TP (8A2)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Trần Phi Hải: 3 lớp 9A2, 9A3, 9A5 (105t)' },
  '9A6': { teacherId: 'tch-ls-5', teacherName: 'Trần Văn Rỡ', teacherCode: 'Rỡ.TV (11CB3)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Trần Văn Rỡ: 1 GDĐP (35t) + 3 AI (36t)' },

  // --- Điểm THCS Tân Kiều (15 lớp) ---
  '6A7': { teacherId: 'tch-ls-15', teacherName: 'Nguyễn Thị Kim Sang', teacherCode: 'Sang.NTK (6A7)', campus: 'THCS Tân Kiều', note: 'Cô Nguyễn Thị Kim Sang: 2 lớp 6A7, 6A8 (70t)' },
  '6A8': { teacherId: 'tch-ls-15', teacherName: 'Nguyễn Thị Kim Sang', teacherCode: 'Sang.NTK (6A7)', campus: 'THCS Tân Kiều', note: 'Cô Nguyễn Thị Kim Sang: 2 lớp 6A7, 6A8 (70t)' },
  '6A9': { teacherId: 'tch-ls-14', teacherName: 'Châu Thị Kim Hà', teacherCode: 'Hà.CTK', campus: 'THCS Tân Kiều', note: 'Cô Châu Thị Kim Hà: 1 lớp (35t)' },
  '6A10': { teacherId: 'tch-khtn-21', teacherName: 'Nguyễn Thị Lụa', teacherCode: 'Lụa.NT (6A10)', campus: 'THCS Tân Kiều', note: 'Cô Nguyễn Thị Lụa (GVCN 6A10): 1 lớp (35t)' },
  '7A7': { teacherId: 'tch-khtn-19', teacherName: 'Trần Kim Phương', teacherCode: 'Phương.TK (7A7)', campus: 'THCS Tân Kiều', note: 'Cô Trần Kim Phương (GVCN 7A7): 1 lớp (35t)' },
  '7A8': { teacherId: 'tch-bgh-4', teacherName: 'Nguyễn Thanh Tòng', teacherCode: 'Tòng.NT (PHT)', campus: 'THCS Tân Kiều', note: 'Thầy Nguyễn Thanh Tòng (PHT): 2 lớp 7A8, 8A10 (70t)' },
  '7A9': { teacherId: 'tch-td-11', teacherName: 'Lê Văn Chính', teacherCode: 'Chính.LV (7A9)', campus: 'THCS Tân Kiều', note: 'Thầy Lê Văn Chính (GVCN 7A9): 1 lớp (35t)' },
  '8A7': { teacherId: 'tch-khtn-15', teacherName: 'Võ Ngọc Đình Văn', teacherCode: 'Văn.VNĐ', campus: 'THCS Tân Kiều', note: 'Thầy Võ Ngọc Đình Văn: 2 lớp 8A7, 8A8 (70t)' },
  '8A8': { teacherId: 'tch-khtn-15', teacherName: 'Võ Ngọc Đình Văn', teacherCode: 'Văn.VNĐ', campus: 'THCS Tân Kiều', note: 'Thầy Võ Ngọc Đình Văn: 2 lớp 8A7, 8A8 (70t)' },
  '8A9': { teacherId: 'tch-av-1', teacherName: 'Lê Thị Ngọc Tuyền', teacherCode: 'Tuyền.LTN (TT)', campus: 'THCS Tân Kiều', note: 'Cô Lê Thị Ngọc Tuyền (TT): 1 lớp (35t)' },
  '8A10': { teacherId: 'tch-bgh-4', teacherName: 'Nguyễn Thanh Tòng', teacherCode: 'Tòng.NT (PHT)', campus: 'THCS Tân Kiều', note: 'Thầy Nguyễn Thanh Tòng (PHT): 2 lớp 7A8, 8A10 (70t)' },
  '9A7': { teacherId: 'tch-t-2', teacherName: 'Trần Quốc Huy', teacherCode: 'Huy.TQ (TP-9A7)', campus: 'THCS Tân Kiều', note: 'Thầy Trần Quốc Huy: 1 lớp 9A7 (35t)' },
  '9A8': { teacherId: 'tch-t-13', teacherName: 'Nguyễn Thành Tín', teacherCode: 'Tín.NT (9A10)', campus: 'THCS Tân Kiều', note: 'Thầy Tín: 2 GDĐP (70t) + 2 AI (24t)' },
  '9A9': { teacherId: 'tch-khtn-3', teacherName: 'Phạm Biên Thùy', teacherCode: 'Thùy.PB (TP)', campus: 'THCS Tân Kiều', note: 'Thầy Phạm Biên Thùy: 9A9 (theo TKB Tuần 11 & Dự thảo Cloud)' },
  '9A10': { teacherId: 'tch-t-13', teacherName: 'Nguyễn Thành Tín', teacherCode: 'Tín.NT (9A10)', campus: 'THCS Tân Kiều', note: 'Thầy Tín: 2 GDĐP (70t) + 2 AI (24t)' },
};

// =========================================================================
// MÔN TRÍ TUỆ NHÂN TẠO (AI) CHÍNH THỨC - 12 TIẾT / NĂM / LỚP
// - Dạy 1 tiết/tuần từ Tuần 13 đến Tuần 24 (12 tuần x 1t = 12 tiết/lớp)
// - Đủ 53/53 lớp theo đúng Dự thảo phân công mới của Ban Giám Hiệu
// =========================================================================
export const OFFICIAL_AI_CLASS_ASSIGNMENTS: Record<string, OfficialSubjectClassAssignment> = {
  // --- Điểm chính (THPT - 14 lớp) ---
  '10CB1': { teacherId: 'tch-av-9', teacherName: 'Lê Thị Thu Diễm', teacherCode: 'Diễm.LTT (10CB4)', campus: 'Điểm chính (THPT)', note: 'Cô Diễm (Tin 10): 5 lớp (60t) • T13-T24' },
  '10CB2': { teacherId: 'tch-av-9', teacherName: 'Lê Thị Thu Diễm', teacherCode: 'Diễm.LTT (10CB4)', campus: 'Điểm chính (THPT)', note: 'Cô Diễm (Tin 10): 5 lớp (60t) • T13-T24' },
  '10CB3': { teacherId: 'tch-av-9', teacherName: 'Lê Thị Thu Diễm', teacherCode: 'Diễm.LTT (10CB4)', campus: 'Điểm chính (THPT)', note: 'Cô Diễm (Tin 10): 5 lớp (60t) • T13-T24' },
  '10CB4': { teacherId: 'tch-av-9', teacherName: 'Lê Thị Thu Diễm', teacherCode: 'Diễm.LTT (10CB4)', campus: 'Điểm chính (THPT)', note: 'Cô Diễm (Tin 10): 5 lớp (60t) • T13-T24' },
  '10CB5': { teacherId: 'tch-av-9', teacherName: 'Lê Thị Thu Diễm', teacherCode: 'Diễm.LTT (10CB4)', campus: 'Điểm chính (THPT)', note: 'Cô Diễm (Tin 10): 5 lớp (60t) • T13-T24' },
  '11CB1': { teacherId: 'tch-av-8', teacherName: 'Đào Thị Ngọc Liên', teacherCode: 'Liên.ĐTN (11CB4)', campus: 'Điểm chính (THPT)', note: 'Cô Liên (Tin 11): 5 lớp (60t) • T13-T24' },
  '11CB2': { teacherId: 'tch-av-8', teacherName: 'Đào Thị Ngọc Liên', teacherCode: 'Liên.ĐTN (11CB4)', campus: 'Điểm chính (THPT)', note: 'Cô Liên (Tin 11): 5 lớp (60t) • T13-T24' },
  '11CB3': { teacherId: 'tch-av-8', teacherName: 'Đào Thị Ngọc Liên', teacherCode: 'Liên.ĐTN (11CB4)', campus: 'Điểm chính (THPT)', note: 'Cô Liên (Tin 11): 5 lớp (60t) • T13-T24' },
  '11CB4': { teacherId: 'tch-av-8', teacherName: 'Đào Thị Ngọc Liên', teacherCode: 'Liên.ĐTN (11CB4)', campus: 'Điểm chính (THPT)', note: 'Cô Liên (Tin 11): 5 lớp (60t) • T13-T24' },
  '12CB1': { teacherId: 'tch-av-2', teacherName: 'Nguyễn Trung Hiếu', teacherCode: 'Hiếu.NT (TP-Tin)', campus: 'Điểm chính (THPT)', note: 'Thầy Hiếu (Tổ phó Tin): 3 lớp (36t) • T13-T24' },
  '12CB2': { teacherId: 'tch-av-2', teacherName: 'Nguyễn Trung Hiếu', teacherCode: 'Hiếu.NT (TP-Tin)', campus: 'Điểm chính (THPT)', note: 'Thầy Hiếu (Tổ phó Tin): 3 lớp (36t) • T13-T24' },
  '12CB3': { teacherId: 'tch-av-2', teacherName: 'Nguyễn Trung Hiếu', teacherCode: 'Hiếu.NT (TP-Tin)', campus: 'Điểm chính (THPT)', note: 'Thầy Hiếu (Tổ phó Tin): 3 lớp (36t) • T13-T24' },
  '12CB4': { teacherId: 'tch-av-8', teacherName: 'Đào Thị Ngọc Liên', teacherCode: 'Liên.ĐTN (11CB4)', campus: 'Điểm chính (THPT)', note: 'Cô Liên (Tin học): Nhận thêm 12CB4 (tổng 60t)' },
  '12CB5': { teacherId: 'tch-ls-2', teacherName: 'Trịnh Văn Sơn', teacherCode: 'Sơn.TV (TP-12CB5)', campus: 'Điểm chính (THPT)', note: 'Thầy Trịnh Văn Sơn (GVCN 12CB5): 1 lớp (12t)' },

  // --- Điểm THCS Đốc Binh Kiều (24 lớp) ---
  '6A1': { teacherId: 'tch-av-14', teacherName: 'Bùi Kim Phướng', teacherCode: 'Phướng.BK (6A3)', campus: 'THCS Đốc Binh Kiều', note: 'Cô Phướng: 3 lớp 6A1-6A3 (36t) • T13-T24' },
  '6A2': { teacherId: 'tch-av-14', teacherName: 'Bùi Kim Phướng', teacherCode: 'Phướng.BK (6A3)', campus: 'THCS Đốc Binh Kiều', note: 'Cô Phướng: 3 lớp 6A1-6A3 (36t) • T13-T24' },
  '6A3': { teacherId: 'tch-av-14', teacherName: 'Bùi Kim Phướng', teacherCode: 'Phướng.BK (6A3)', campus: 'THCS Đốc Binh Kiều', note: 'Cô Phướng (GVCN 6A3): 3 lớp (36t) • T13-T24' },
  '6A4': { teacherId: 'tch-ls-5', teacherName: 'Trần Văn Rỡ', teacherCode: 'Rỡ.TV (11CB3)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Trần Văn Rỡ: 3 lớp AI (36t) + 1 GDĐP (35t)' },
  '6A5': { teacherId: 'tch-ls-5', teacherName: 'Trần Văn Rỡ', teacherCode: 'Rỡ.TV (11CB3)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Trần Văn Rỡ: 3 lớp AI (36t) + 1 GDĐP (35t)' },
  '6A6': { teacherId: 'tch-ls-5', teacherName: 'Trần Văn Rỡ', teacherCode: 'Rỡ.TV (11CB3)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Trần Văn Rỡ: 3 lớp AI (36t) + 1 GDĐP (35t)' },
  '7A1': { teacherId: 'tch-av-13', teacherName: 'Mai Phước Lộc', teacherCode: 'Lộc.MP (7A2)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Mai Phước Lộc: 6 lớp K7 (72t) • T13-T24' },
  '7A2': { teacherId: 'tch-av-13', teacherName: 'Mai Phước Lộc', teacherCode: 'Lộc.MP (7A2)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Mai Phước Lộc (GVCN 7A2): 6 lớp (72t)' },
  '7A3': { teacherId: 'tch-av-13', teacherName: 'Mai Phước Lộc', teacherCode: 'Lộc.MP (7A2)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Mai Phước Lộc: 6 lớp K7 (72t) • T13-T24' },
  '7A4': { teacherId: 'tch-av-13', teacherName: 'Mai Phước Lộc', teacherCode: 'Lộc.MP (7A2)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Mai Phước Lộc: 6 lớp K7 (72t) • T13-T24' },
  '7A5': { teacherId: 'tch-av-13', teacherName: 'Mai Phước Lộc', teacherCode: 'Lộc.MP (7A2)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Mai Phước Lộc: 6 lớp K7 (72t) • T13-T24' },
  '7A6': { teacherId: 'tch-av-13', teacherName: 'Mai Phước Lộc', teacherCode: 'Lộc.MP (7A2)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Mai Phước Lộc: 6 lớp K7 (72t) • T13-T24' },
  '8A1': { teacherId: 'tch-av-7', teacherName: 'Nguyễn Thị Vân Anh', teacherCode: 'Anh.NTV (Con nhỏ)', campus: 'THCS Đốc Binh Kiều', note: 'Cô Vân Anh: 6 lớp AI (72t) + 11CB1 GDĐP (35t)' },
  '8A2': { teacherId: 'tch-av-7', teacherName: 'Nguyễn Thị Vân Anh', teacherCode: 'Anh.NTV (Con nhỏ)', campus: 'THCS Đốc Binh Kiều', note: 'Cô Vân Anh: 6 lớp AI (72t) • T13-T24' },
  '8A3': { teacherId: 'tch-av-7', teacherName: 'Nguyễn Thị Vân Anh', teacherCode: 'Anh.NTV (Con nhỏ)', campus: 'THCS Đốc Binh Kiều', note: 'Cô Vân Anh: 6 lớp AI (72t) • T13-T24' },
  '8A4': { teacherId: 'tch-av-7', teacherName: 'Nguyễn Thị Vân Anh', teacherCode: 'Anh.NTV (Con nhỏ)', campus: 'THCS Đốc Binh Kiều', note: 'Cô Vân Anh: 6 lớp AI (72t) • T13-T24' },
  '8A5': { teacherId: 'tch-av-7', teacherName: 'Nguyễn Thị Vân Anh', teacherCode: 'Anh.NTV (Con nhỏ)', campus: 'THCS Đốc Binh Kiều', note: 'Cô Vân Anh: 6 lớp AI (72t) • T13-T24' },
  '8A6': { teacherId: 'tch-av-7', teacherName: 'Nguyễn Thị Vân Anh', teacherCode: 'Anh.NTV (Con nhỏ)', campus: 'THCS Đốc Binh Kiều', note: 'Cô Vân Anh: 6 lớp AI (72t) • T13-T24' },
  '9A1': { teacherId: 'tch-bgh-1', teacherName: 'Lê Thanh Cường', teacherCode: 'Cường.LT (HT)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Cường (HT): 5 lớp (60t) • T13-T24' },
  '9A2': { teacherId: 'tch-bgh-1', teacherName: 'Lê Thanh Cường', teacherCode: 'Cường.LT (HT)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Cường (HT): 5 lớp (60t) • T13-T24' },
  '9A3': { teacherId: 'tch-bgh-1', teacherName: 'Lê Thanh Cường', teacherCode: 'Cường.LT (HT)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Cường (HT): 5 lớp (60t) • T13-T24' },
  '9A4': { teacherId: 'tch-bgh-2', teacherName: 'Nguyễn Minh Trí', teacherCode: 'Trí.NM (PHT)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Trí (PHT): 5 lớp (60t) • T13-T24' },
  '9A5': { teacherId: 'tch-bgh-2', teacherName: 'Nguyễn Minh Trí', teacherCode: 'Trí.NM (PHT)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Trí (PHT): 5 lớp (60t) • T13-T24' },
  '9A6': { teacherId: 'tch-bgh-2', teacherName: 'Nguyễn Minh Trí', teacherCode: 'Trí.NM (PHT)', campus: 'THCS Đốc Binh Kiều', note: 'Thầy Trí (PHT): 5 lớp (60t) • T13-T24' },

  // --- Điểm THCS Tân Kiều (15 lớp) ---
  '6A7': { teacherId: 'tch-ls-4', teacherName: 'Nguyễn Thị Bé Trang', teacherCode: 'Trang.NTB (12CB4)', campus: 'THCS Tân Kiều', note: 'Cô Nguyễn Thị Bé Trang: 4 lớp K6 TK (48t) • T13-T24' },
  '6A8': { teacherId: 'tch-ls-4', teacherName: 'Nguyễn Thị Bé Trang', teacherCode: 'Trang.NTB (12CB4)', campus: 'THCS Tân Kiều', note: 'Cô Nguyễn Thị Bé Trang: 4 lớp K6 TK (48t) • T13-T24' },
  '6A9': { teacherId: 'tch-ls-4', teacherName: 'Nguyễn Thị Bé Trang', teacherCode: 'Trang.NTB (12CB4)', campus: 'THCS Tân Kiều', note: 'Cô Nguyễn Thị Bé Trang: 4 lớp K6 TK (48t) • T13-T24' },
  '6A10': { teacherId: 'tch-ls-4', teacherName: 'Nguyễn Thị Bé Trang', teacherCode: 'Trang.NTB (12CB4)', campus: 'THCS Tân Kiều', note: 'Cô Nguyễn Thị Bé Trang: 4 lớp K6 TK (48t) • T13-T24' },
  '7A7': { teacherId: 'tch-av-6', teacherName: 'Trương Sơn Bền', teacherCode: 'Bền.TS', campus: 'THCS Tân Kiều', note: 'Thầy Trương Sơn Bền: 3 lớp AI (36t) + 3 GDĐP (105t)' },
  '7A8': { teacherId: 'tch-av-6', teacherName: 'Trương Sơn Bền', teacherCode: 'Bền.TS', campus: 'THCS Tân Kiều', note: 'Thầy Trương Sơn Bền: 3 lớp AI (36t) • T13-T24' },
  '7A9': { teacherId: 'tch-av-6', teacherName: 'Trương Sơn Bền', teacherCode: 'Bền.TS', campus: 'THCS Tân Kiều', note: 'Thầy Trương Sơn Bền: 3 lớp AI (36t) • T13-T24' },
  '8A7': { teacherId: 'tch-t-13', teacherName: 'Nguyễn Thành Tín', teacherCode: 'Tín.NT (9A10)', campus: 'THCS Tân Kiều', note: 'Thầy Tín: 2 lớp AI (24t) + 2 GDĐP (70t)' },
  '8A8': { teacherId: 'tch-t-13', teacherName: 'Nguyễn Thành Tín', teacherCode: 'Tín.NT (9A10)', campus: 'THCS Tân Kiều', note: 'Thầy Tín: 2 lớp AI (24t) + 2 GDĐP (70t)' },
  '8A9': { teacherId: 'tch-t-1', teacherName: 'Nguyễn Văn Tới', teacherCode: 'Tới.NV (TT)', campus: 'THCS Tân Kiều', note: 'Thầy Tới: 2 lớp AI (24t) + 1 GDĐP (35t)' },
  '8A10': { teacherId: 'tch-t-1', teacherName: 'Nguyễn Văn Tới', teacherCode: 'Tới.NV (TT)', campus: 'THCS Tân Kiều', note: 'Thầy Tới: 2 lớp AI (24t) + 1 GDĐP (35t)' },
  '9A7': { teacherId: 'tch-bgh-2', teacherName: 'Nguyễn Minh Trí', teacherCode: 'Trí.NM (PHT)', campus: 'THCS Tân Kiều', note: 'Thầy Trí (PHT): 5 lớp (60t) • T13-T24' },
  '9A8': { teacherId: 'tch-bgh-2', teacherName: 'Nguyễn Minh Trí', teacherCode: 'Trí.NM (PHT)', campus: 'THCS Tân Kiều', note: 'Thầy Trí (PHT): 5 lớp (60t) • T13-T24' },
  '9A9': { teacherId: 'tch-bgh-1', teacherName: 'Lê Thanh Cường', teacherCode: 'Cường.LT (HT)', campus: 'THCS Tân Kiều', note: 'Thầy Cường (HT): 5 lớp (60t) • T13-T24' },
  '9A10': { teacherId: 'tch-bgh-1', teacherName: 'Lê Thanh Cường', teacherCode: 'Cường.LT (HT)', campus: 'THCS Tân Kiều', note: 'Thầy Cường (HT): 5 lớp (60t) • T13-T24' },
};

// =========================================================================
// CHUYỂN ĐỔI PHÂN CÔNG MÔN ĐỊA LÍ TỪ TUẦN 13 (THẦY TUẤN / CÔ ĐỈNH / CÔ LÝ)
// - Tuần 1..12 giữ nguyên phân công gốc (TKB thực tế chưa đổi)
// - Từ Tuần 13..35:
//   + Thầy Ngô Anh Tuấn (tch-ls-7): nhận thêm 3 lớp 7A2, 7A3, 7A4 từ Cô Đỉnh
//   + Cô Nguyễn Thị Kim Đỉnh (tch-ls-11): giảm 7A2-7A4, nhận 9A2, 9A3, 9A4 từ Cô Lý
//   + Cô Nguyễn Thị Lý (tch-ls-12): giảm 9A2, 9A3, 9A4 (giữ lại 9A1)
// =========================================================================
export const OFFICIAL_LSDL_DIA_WEEK11_DEFAULT_OVERRIDES: Record<string, string> = {
  '7A2': 'tch-ls-7',
  '7A3': 'tch-ls-7',
  '7A4': 'tch-ls-7',
  '9A2': 'tch-ls-11',
  '9A3': 'tch-ls-11',
  '9A4': 'tch-ls-11',
};

export function getDefaultOfficialGddpMap(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [clsName, info] of Object.entries(OFFICIAL_GDDP_CLASS_ASSIGNMENTS)) {
    out[clsName] = info.teacherId;
  }
  return out;
}

export function getDefaultOfficialAiMap(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [clsName, info] of Object.entries(OFFICIAL_AI_CLASS_ASSIGNMENTS)) {
    out[clsName] = info.teacherId;
  }
  return out;
}

export function getDefaultOfficialDiaWeek11Map(): Record<string, string> {
  return { ...OFFICIAL_LSDL_DIA_WEEK11_DEFAULT_OVERRIDES };
}

export function saveOfficialGddpAiLocalOverride(payload: OfficialGddpAiOverridePayload): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(OFFICIAL_GDDP_AI_STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('Could not save official GDĐP & AI override to localStorage:', e);
  }
}

export function loadOfficialGddpAiLocalOverride(): OfficialGddpAiOverridePayload | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(OFFICIAL_GDDP_AI_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfficialGddpAiOverridePayload;
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.gddpClassTeacherMap &&
      parsed.aiClassTeacherMap
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
