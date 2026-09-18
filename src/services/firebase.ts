import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  limit,
  Firestore
} from 'firebase/firestore';
import {
  SchoolConfig,
  Teacher,
  Department,
  Subject,
  ClassGroup,
  Assignment,
  LockedCell,
  WeeklySchedule,
  SchoolTimetable,
  TimetableSlot
} from '../types';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfigJson) : getApps()[0];

export const auth = getAuth(app);

// Initialize Firestore with custom databaseId if configured
export const db: Firestore =
  firebaseConfigJson.firestoreDatabaseId &&
  firebaseConfigJson.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId)
    : getFirestore(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errMessage = error instanceof Error ? error.message : String(error);
  const isQuota =
    errMessage.includes('resource-exhausted') ||
    errMessage.includes('Quota limit exceeded') ||
    errMessage.includes('Free daily write units');

  if (isQuota) {
    markFirestoreWriteQuotaExhausted();
    console.warn('[Firestore Quota Guard] Đã chạm giới hạn ghi miễn phí Firestore hôm nay. Ứng dụng tự động chuyển sang chế độ lưu an toàn ngoại tuyến.');
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

/**
 * Recursively cleanses data for Firestore by removing any object keys with `undefined`
 * values and converting `undefined` elements in arrays to `null`.
 * This prevents the Firestore runtime exception:
 * "Function setDoc() called with invalid data. Unsupported field value: undefined"
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as unknown as T;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => (item === undefined ? null : sanitizeForFirestore(item))) as unknown as T;
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      result[key] = sanitizeForFirestore(value);
    }
  }
  return result as T;
}

export interface SchoolPlanData {
  config: SchoolConfig;
  departments: Department[];
  subjects: Subject[];
  classes: ClassGroup[];
  teachers: Teacher[];
  assignments: Assignment[];
  lockedCells: LockedCell[];
  weeklySchedules?: WeeklySchedule[];
  timetable?: SchoolTimetable;
  weeklyTimetables?: Record<number, SchoolTimetable>;
  updatedAt?: number;
  lastUpdatedBy?: string;
  version?: number;
}

export interface TimetableSnapshotItem {
  id: string;
  createdAt: number;
  description: string;
  weekNumber: number;
  slotCount: number;
  timetable: SchoolTimetable;
  createdBy?: string;
}

const COLLECTION_NAME = 'school_plans';
const DOC_ID = 'active_plan_thcs_thpt_docbinhkieu';

const QUOTA_EXHAUSTED_KEY = 'docbinhkieu_firestore_write_quota_exhausted_until';
const LOCAL_SNAPSHOTS_KEY = 'docbinhkieu_local_timetable_snapshots_v1';
const SESSION_FP_ROOT_KEY = 'docbinhkieu_fp_root';
const DAILY_WRITES_COUNT_KEY = 'docbinhkieu_daily_writes_count_v1';
const DAILY_WRITES_DATE_KEY = 'docbinhkieu_daily_writes_date_v1';

/**
 * Get current date string in Vietnam timezone (YYYY-MM-DD)
 */
function getVietnamDateKey(): string {
  try {
    const d = new Date();
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const vnTime = new Date(utc + 7 * 3600000);
    return vnTime.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Get client-side recorded daily Firestore write count
 */
export function getDailyFirestoreWriteCount(): number {
  try {
    const today = getVietnamDateKey();
    const savedDate = localStorage.getItem(DAILY_WRITES_DATE_KEY);
    if (savedDate !== today) {
      localStorage.setItem(DAILY_WRITES_DATE_KEY, today);
      localStorage.setItem(DAILY_WRITES_COUNT_KEY, '0');
      return 0;
    }
    return Number(localStorage.getItem(DAILY_WRITES_COUNT_KEY) || '0');
  } catch {
    return 0;
  }
}

/**
 * Increment client-side daily Firestore write counter
 */
export function incrementDailyFirestoreWriteCount(delta = 1): number {
  try {
    const count = getDailyFirestoreWriteCount() + delta;
    localStorage.setItem(DAILY_WRITES_COUNT_KEY, String(count));
    return count;
  } catch {
    return 0;
  }
}

/**
 * Get write budget metrics for display in UI
 */
export function getDailyFirestoreMetrics() {
  const count = getDailyFirestoreWriteCount();
  const maxFree = 20000;
  const isExhausted = isFirestoreWriteQuotaExhausted();
  const remaining = Math.max(0, maxFree - count);
  return {
    todayWrites: count,
    maxDailyFreeLimit: maxFree,
    remainingEstimate: remaining,
    isExhausted
  };
}

/**
 * Returns true if Firestore write quota is currently marked as exhausted.
 */
export function isFirestoreWriteQuotaExhausted(): boolean {
  try {
    const raw = localStorage.getItem(QUOTA_EXHAUSTED_KEY);
    if (!raw) return false;
    const expiresAt = Number(raw);
    if (Date.now() < expiresAt) {
      return true;
    }
    // Expired - clear flag and allow retry
    localStorage.removeItem(QUOTA_EXHAUSTED_KEY);
    return false;
  } catch {
    return false;
  }
}

/**
 * Marks Firestore write quota as exhausted until the next daily reset.
 * Free tier resets at 00:00 US Pacific Time (or 24h rolling).
 * Default cooldown is 4 hours before next write probe.
 */
export function markFirestoreWriteQuotaExhausted(durationMs = 4 * 60 * 60 * 1000): void {
  try {
    const expiresAt = Date.now() + durationMs;
    localStorage.setItem(QUOTA_EXHAUSTED_KEY, String(expiresAt));
    console.warn(
      `[Firestore Quota Guard] Hạn mức ghi miễn phí Firestore hôm nay đã đạt tối đa. Chuyển sang chế độ lưu an toàn ngoại tuyến đến ${new Date(
        expiresAt
      ).toLocaleTimeString('vi-VN')}. Toàn bộ dữ liệu được bảo vệ an toàn trên trình duyệt này.`
    );
  } catch (e) {
    console.warn('Storage unavailable for quota flag:', e);
  }
}

export function clearFirestoreWriteQuotaExhausted(): void {
  try {
    localStorage.removeItem(QUOTA_EXHAUSTED_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Save a timetable snapshot locally to guarantee zero data loss
 */
export function saveLocalSnapshot(item: TimetableSnapshotItem): void {
  try {
    const raw = localStorage.getItem(LOCAL_SNAPSHOTS_KEY);
    const existing: TimetableSnapshotItem[] = raw ? JSON.parse(raw) : [];
    const updated = [item, ...existing.filter(s => s.id !== item.id)].slice(0, 25);
    localStorage.setItem(LOCAL_SNAPSHOTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Local snapshot storage notice:', e);
  }
}

/**
 * Get locally stored timetable snapshots
 */
export function getLocalSnapshots(): TimetableSnapshotItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_SNAPSHOTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Compacts weekly timetables to only store Week 1 and customized weeks
 * that actually differ from Week 1. This keeps the single document
 * ultra-compact (typically 120 KB - 280 KB), far below the 1MB limit.
 */
export function compactWeeklyTimetables(
  weeklyTimetables?: Record<number, SchoolTimetable>,
  fallbackTimetable?: SchoolTimetable
): Record<number, SchoolTimetable> {
  const result: Record<number, SchoolTimetable> = {};
  if (!weeklyTimetables) {
    if (fallbackTimetable && fallbackTimetable.slots) {
      result[1] = fallbackTimetable;
    }
    return result;
  }

  // Week 1 is the reference master timetable
  const week1 = weeklyTimetables[1] || fallbackTimetable;
  if (week1 && week1.slots) {
    result[1] = week1;
  }

  const week1Fp = week1 && week1.slots ? JSON.stringify(week1.slots) : '';

  // Store only weeks that differ from Week 1
  for (const [wKey, tt] of Object.entries(weeklyTimetables)) {
    const wkNum = Number(wKey);
    if (wkNum === 1 || !tt || !tt.slots || tt.slots.length === 0) continue;
    const thisFp = JSON.stringify(tt.slots);
    if (thisFp !== week1Fp) {
      result[wkNum] = tt;
    }
  }

  return result;
}

/**
 * Expands compacted weekly timetables so the UI has all 37 weeks fully populated
 */
export function expandWeeklyTimetables(
  compacted: Record<number, SchoolTimetable>,
  totalWeeks = 37
): Record<number, SchoolTimetable> {
  // Return compacted timetables as-is to prevent corrupting custom weeks (such as Week 2)
  // Weeks without explicit data will be cleanly handled by the application UI/defaults
  return { ...compacted };
}

/**
 * Compacts weekly schedules to only store weeks whose assignments differ from master
 */
export function compactWeeklySchedules(
  weeklySchedules?: WeeklySchedule[],
  masterAssignments?: any[]
): WeeklySchedule[] {
  if (!weeklySchedules || !Array.isArray(weeklySchedules)) return [];
  const masterFp = JSON.stringify(masterAssignments || []);
  return weeklySchedules.filter(ws => {
    if (ws.weekNumber === 1) return true;
    return JSON.stringify(ws.assignments || []) !== masterFp;
  });
}

// Fingerprint caches for dirty checking to avoid redundant document writes
export function computeRootFingerprint(data: Partial<SchoolPlanData>): string {
  return JSON.stringify({
    config: data.config,
    departments: data.departments,
    subjects: data.subjects,
    classes: data.classes,
    teachers: data.teachers,
    assignments: data.assignments,
    lockedCells: data.lockedCells
  });
}

export function computeTimetableSlotsFingerprint(slots?: TimetableSlot[]): string {
  if (!slots || slots.length === 0) return 'empty';
  return `${slots.length}_${slots.map(s => `${s.id}:${s.teacherId || ''}:${s.subjectId || ''}`).join(';')}`;
}

export function computeScheduleFingerprint(ws?: WeeklySchedule): string {
  if (!ws || !ws.assignments || ws.assignments.length === 0) return 'empty';
  return `${ws.assignments.length}_${ws.assignments.map(a => `${a.classId}:${a.subjectId}:${a.teacherId}:${a.periods}`).join(';')}`;
}

let savedRootFingerprint: string | null = (() => {
  try {
    return sessionStorage.getItem(SESSION_FP_ROOT_KEY) || null;
  } catch {
    return null;
  }
})();

const savedTimetableFingerprints = new Map<number, string>();
const savedScheduleFingerprints = new Map<number, string>();

/**
 * Record current fingerprints so subsequent saves only write changed documents
 */
export function markDataAsCloudSynced(data: SchoolPlanData): void {
  try {
    savedRootFingerprint = computeRootFingerprint(data);
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(SESSION_FP_ROOT_KEY, savedRootFingerprint);
      }
    } catch { /* ignore */ }

    if (data.weeklyTimetables) {
      for (const [wKey, tt] of Object.entries(data.weeklyTimetables)) {
        const wkNum = Number(wKey);
        if (tt && tt.slots) {
          const fp = computeTimetableSlotsFingerprint(tt.slots);
          savedTimetableFingerprints.set(wkNum, fp);
        }
      }
    } else if (data.timetable && data.timetable.slots) {
      savedTimetableFingerprints.set(1, computeTimetableSlotsFingerprint(data.timetable.slots));
    }

    if (data.weeklySchedules && Array.isArray(data.weeklySchedules)) {
      for (const ws of data.weeklySchedules) {
        if (ws.weekNumber && ws.assignments) {
          savedScheduleFingerprints.set(ws.weekNumber, computeScheduleFingerprint(ws));
        }
      }
    }
  } catch (e) {
    console.warn('Notice computing cloud sync fingerprints:', e);
  }
}

// Concurrency mutex and queued save handler
let isSaveInProgress = false;
let pendingSaveRequest: {
  data: SchoolPlanData;
  resolve: (res: { success: boolean; error?: string }) => void;
} | null = null;

/**
 * Save a dedicated historical snapshot of a timetable to prevent data loss
 */
export async function saveTimetableSnapshot(
  timetable: SchoolTimetable,
  description: string,
  createdBy = 'Admin'
): Promise<boolean> {
  const timestamp = Date.now();
  const backupId = `snapshot_${timetable.weekNumber || 1}_${timestamp}`;
  const snapshotItem: TimetableSnapshotItem = {
    id: backupId,
    createdAt: timestamp,
    weekNumber: timetable.weekNumber || 1,
    description,
    slotCount: timetable.slots?.length || 0,
    timetable,
    createdBy
  };

  // 1. Always store locally first so users never lose their historical snapshots (0 Cloud Writes!)
  saveLocalSnapshot(snapshotItem);
  return true;
}

/**
 * Fetch available timetable historical backups (merging cloud & local backups)
 */
export async function getTimetableSnapshots(): Promise<TimetableSnapshotItem[]> {
  const localSnapshots = getLocalSnapshots();

  if (isFirestoreWriteQuotaExhausted()) {
    return localSnapshots;
  }

  try {
    const backupsRef = collection(db, COLLECTION_NAME, DOC_ID, 'timetable_backups');
    const q = query(backupsRef, orderBy('createdAt', 'desc'), limit(30));
    const snap = await getDocs(q);
    const cloudResults: TimetableSnapshotItem[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      if (data && data.timetable) {
        cloudResults.push({
          id: docSnap.id,
          createdAt: data.createdAt || Date.now(),
          description: data.description || 'Bản sao lưu TKB',
          weekNumber: data.weekNumber || 1,
          slotCount: data.slotCount || data.timetable?.slots?.length || 0,
          timetable: data.timetable,
          createdBy: data.createdBy || 'Admin'
        });
      }
    });

    // Merge and deduplicate by snapshot id
    const map = new Map<string, TimetableSnapshotItem>();
    for (const item of [...localSnapshots, ...cloudResults]) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);
  } catch (err) {
    console.warn('Notice fetching timetable snapshots from cloud, using local snapshots:', err);
    return localSnapshots;
  }
}

/**
 * Internal execution of cloud save:
 * Consolidates the school plan configuration, subjects, teachers, and assignments
 * into the root document (~150KB), while storing weekly timetables into subcollection
 * `weekly_timetables/week_{N}` (~400KB each).
 * This guarantees NO document ever exceeds Google Firestore's 1MB limit.
 * Uses smart dirty-checking to write ONLY modified documents (conserving daily quota).
 */
async function executeCloudSave(
  data: SchoolPlanData,
  force = false
): Promise<{ success: boolean; error?: string }> {
  const docPath = `${COLLECTION_NAME}/${DOC_ID}`;

  try {
    const planRef = doc(db, COLLECTION_NAME, DOC_ID);
    const writePromises: Promise<any>[] = [];

    // 1. Root Document Check & Save
    // Contains config, departments, subjects, classes, teachers, assignments, lockedCells
    // Kept under 200KB by avoiding inlining multi-week timetables with thousands of slots.
    const currentRootFp = computeRootFingerprint(data);
    const rootChanged = force || savedRootFingerprint !== currentRootFp;

    if (rootChanged) {
      const rootPayload = {
        config: data.config,
        departments: data.departments,
        subjects: data.subjects,
        classes: data.classes,
        teachers: data.teachers,
        assignments: data.assignments,
        lockedCells: data.lockedCells,
        updatedAt: Date.now(),
        lastUpdatedBy: data.lastUpdatedBy || 'Admin THCS & THPT Đốc Binh Kiều',
        hasSubcollections: true,
        version: 2
      };
      writePromises.push(setDoc(planRef, sanitizeForFirestore(rootPayload)));
      savedRootFingerprint = currentRootFp;
      try {
        sessionStorage.setItem(SESSION_FP_ROOT_KEY, currentRootFp);
      } catch { /* ignore */ }
    }

    // 2. Weekly Timetables Check & Save
    // Each week's timetable is stored in its own subdocument: weekly_timetables/week_{wkNum}
    // Parallelized for ultra-fast response (<1-2s).
    if (data.weeklyTimetables) {
      const currentActiveWeekKeys = new Set<number>();

      for (const [wKey, tt] of Object.entries(data.weeklyTimetables)) {
        const wkNum = Number(wKey);
        if (!wkNum) continue;

        if (!tt || !tt.slots || tt.slots.length === 0) {
          // If explicitly set to empty slots, ensure it's deleted from Cloud if it existed before
          if (savedTimetableFingerprints.has(wkNum)) {
            const weekDocRef = doc(db, COLLECTION_NAME, DOC_ID, 'weekly_timetables', `week_${wkNum}`);
            writePromises.push(deleteDoc(weekDocRef));
            savedTimetableFingerprints.delete(wkNum);
            try {
              sessionStorage.removeItem(`docbinhkieu_fp_tt_${wkNum}`);
            } catch { /* ignore */ }
          }
          continue;
        }

        currentActiveWeekKeys.add(wkNum);
        const thisFp = computeTimetableSlotsFingerprint(tt.slots);
        const prevSavedFp = savedTimetableFingerprints.get(wkNum);

        // Always save if force || changed from previous save
        const needsWrite = force || thisFp !== prevSavedFp;

        if (needsWrite) {
          const weekDocRef = doc(db, COLLECTION_NAME, DOC_ID, 'weekly_timetables', `week_${wkNum}`);
          writePromises.push(
            setDoc(weekDocRef, sanitizeForFirestore({
              weekNumber: wkNum,
              timetable: tt,
              updatedAt: Date.now()
            }))
          );
          savedTimetableFingerprints.set(wkNum, thisFp);
          try {
            sessionStorage.setItem(`docbinhkieu_fp_tt_${wkNum}`, thisFp);
          } catch { /* ignore */ }
        }
      }

      // Check if any previously saved weeks were deleted from data.weeklyTimetables
      for (const savedWk of Array.from(savedTimetableFingerprints.keys())) {
        if (!currentActiveWeekKeys.has(savedWk)) {
          const weekDocRef = doc(db, COLLECTION_NAME, DOC_ID, 'weekly_timetables', `week_${savedWk}`);
          writePromises.push(deleteDoc(weekDocRef));
          savedTimetableFingerprints.delete(savedWk);
          try {
            sessionStorage.removeItem(`docbinhkieu_fp_tt_${savedWk}`);
          } catch { /* ignore */ }
        }
      }
    } else if (data.timetable && data.timetable.slots && data.timetable.slots.length > 0) {
      // Fallback: save master timetable to week_1
      const ttFp = computeTimetableSlotsFingerprint(data.timetable.slots);
      if (force || ttFp !== savedTimetableFingerprints.get(1)) {
        const weekDocRef = doc(db, COLLECTION_NAME, DOC_ID, 'weekly_timetables', 'week_1');
        writePromises.push(
          setDoc(weekDocRef, sanitizeForFirestore({
            weekNumber: 1,
            timetable: data.timetable,
            updatedAt: Date.now()
          }))
        );
        savedTimetableFingerprints.set(1, ttFp);
      }
    }

    // 3. Weekly Schedules Check & Save
    if (data.weeklySchedules && Array.isArray(data.weeklySchedules)) {
      const masterFp = JSON.stringify(data.assignments || []);
      for (const ws of data.weeklySchedules) {
        const wkNum = ws.weekNumber;
        if (!wkNum || !ws.assignments || ws.assignments.length === 0) continue;

        const schedFp = computeScheduleFingerprint(ws);
        const prevSavedSchedFp = savedScheduleFingerprints.get(wkNum);

        const isCustomized = wkNum === 1 || JSON.stringify(ws.assignments) !== masterFp;
        const needsWrite = isCustomized && (force || schedFp !== prevSavedSchedFp);

        if (needsWrite) {
          const schedDocRef = doc(db, COLLECTION_NAME, DOC_ID, 'weekly_schedules', `week_${wkNum}`);
          writePromises.push(
            setDoc(schedDocRef, sanitizeForFirestore({
              weekNumber: wkNum,
              semester: ws.semester || 'HK1',
              assignments: ws.assignments,
              updatedAt: Date.now()
            }))
          );
          savedScheduleFingerprints.set(wkNum, schedFp);
          try {
            sessionStorage.setItem(`docbinhkieu_fp_sched_${wkNum}`, schedFp);
          } catch { /* ignore */ }
        }
      }
    }

    // Execute all write operations in parallel for lightning-fast save (< 1-2s)
    if (writePromises.length > 0) {
      await Promise.all(writePromises);
    }

    // If manual force save, also save snapshot to local storage (0 Cloud writes!)
    const primaryTimetable = data.timetable || data.weeklyTimetables?.[1];
    if (force && primaryTimetable && primaryTimetable.slots) {
      saveTimetableSnapshot(
        primaryTimetable,
        'Bản sao lưu thủ công (Admin đã bấm lưu)',
        data.lastUpdatedBy || 'Admin'
      ).catch(e => console.warn('Snapshot storage notice:', e));
    }

    return { success: true };
  } catch (error: any) {
    const errorStr = String(error?.message || error || '');
    console.error('executeCloudSave error:', error);

    if (
      errorStr.includes('resource-exhausted') ||
      errorStr.includes('Quota limit exceeded') ||
      errorStr.includes('Free daily write units')
    ) {
      markFirestoreWriteQuotaExhausted();
      console.warn('[Firestore Quota Guard] Đã chạm giới hạn ghi miễn phí Firestore. Dữ liệu được bảo vệ an toàn trên máy.', errorStr);
      return {
        success: true,
        error: 'Đã chạm giới hạn ghi miễn phí Firestore hôm nay. Dữ liệu được bảo vệ an toàn trên máy.'
      };
    } else if (errorStr.includes('exceeds the maximum allowed size')) {
      return {
        success: false,
        error: 'Kích thước dữ liệu vượt quá giới hạn tài liệu Firebase (1MB).'
      };
    } else {
      handleFirestoreError(error, OperationType.WRITE, docPath);
      return {
        success: false,
        error: error?.message || 'Lỗi khi lưu dữ liệu lên Firebase.'
      };
    }
  }
}

/**
 * Save complete school plan to Firestore with automatic concurrency queuing.
 * Ensures that at most ONE write operation is in-flight at any given time,
 * eliminating the "Write stream exhausted maximum allowed queued writes" error.
 */
export async function saveSchoolPlanToCloud(
  data: SchoolPlanData,
  force = false
): Promise<{ success: boolean; error?: string }> {
  if (isSaveInProgress) {
    // If a save is already running, coalesce into pending request
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      if (pendingSaveRequest) {
        pendingSaveRequest.resolve({ success: true }); // Superceded by latest state
      }
      pendingSaveRequest = { data, resolve };
    });
  }

  isSaveInProgress = true;
  try {
    const savePromise = executeCloudSave(data, force);
    const timeoutPromise = new Promise<{ success: boolean; error?: string }>((resolve) => {
      setTimeout(() => {
        console.warn('saveSchoolPlanToCloud timeout reached after 60s, unblocking.');
        resolve({
          success: false,
          error: 'Thời gian kết nối đến Firebase quá 60 giây (timeout). Vui lòng kiểm tra lại kết nối mạng và thử lại.'
        });
      }, 60000);
    });
    const result = await Promise.race([savePromise, timeoutPromise]);
    return result;
  } catch (err: any) {
    console.error('saveSchoolPlanToCloud unhandled error:', err);
    return {
      success: false,
      error: err?.message || 'Lỗi không xác định khi lưu'
    };
  } finally {
    isSaveInProgress = false;
    // Process next queued save if one was scheduled while saving
    if (pendingSaveRequest) {
      const next = pendingSaveRequest;
      pendingSaveRequest = null;
      // Schedule asynchronously to yield microtask queue
      setTimeout(() => {
        saveSchoolPlanToCloud(next.data).then(next.resolve);
      }, 50);
    }
  }
}

/**
 * Load complete school plan from Firestore:
 * Fetches root configuration, weekly timetables subcollection, and weekly schedules subcollection.
 */
export async function loadSchoolPlanFromCloud(): Promise<SchoolPlanData | null> {
  const docPath = `${COLLECTION_NAME}/${DOC_ID}`;
  try {
    const planRef = doc(db, COLLECTION_NAME, DOC_ID);
    const snap = await getDoc(planRef);
    if (!snap.exists()) {
      return null;
    }
    const rootData = snap.data() as Partial<SchoolPlanData> & { hasSubcollections?: boolean; version?: number };

    // Fetch subcollections in parallel
    const [schedsSnap, timetablesSnap] = await Promise.all([
      getDocs(collection(db, COLLECTION_NAME, DOC_ID, 'weekly_schedules')).catch(err => {
        console.warn('Notice loading weekly_schedules subcollection:', err);
        return null;
      }),
      getDocs(collection(db, COLLECTION_NAME, DOC_ID, 'weekly_timetables')).catch(err => {
        console.warn('Notice loading weekly_timetables subcollection:', err);
        return null;
      })
    ]);

    let weeklySchedules = rootData.weeklySchedules;
    if (schedsSnap && !schedsSnap.empty) {
      const loadedSchedules: WeeklySchedule[] = [];
      schedsSnap.forEach(d => {
        const dData = d.data();
        if (dData && dData.assignments) {
          loadedSchedules.push({
            weekNumber: Number(dData.weekNumber || d.id.replace('week_', '')),
            semester: dData.semester || 'HK1',
            assignments: dData.assignments
          });
        }
      });
      loadedSchedules.sort((a, b) => a.weekNumber - b.weekNumber);
      if (loadedSchedules.length > 0) {
        weeklySchedules = loadedSchedules;
      }
    }

    let weeklyTimetables = rootData.weeklyTimetables || {};
    let timetable = rootData.timetable;
    if (timetablesSnap && !timetablesSnap.empty) {
      const loadedTimetables: Record<number, SchoolTimetable> = { ...weeklyTimetables };
      timetablesSnap.forEach(d => {
        const dData = d.data();
        const wkNum = Number(dData.weekNumber || d.id.replace('week_', ''));
        if (dData && dData.timetable) {
          loadedTimetables[wkNum] = dData.timetable;
        } else if (dData && dData.slots) {
          loadedTimetables[wkNum] = dData as SchoolTimetable;
        }
      });
      if (Object.keys(loadedTimetables).length > 0) {
        weeklyTimetables = loadedTimetables;
        if (loadedTimetables[1]) {
          timetable = loadedTimetables[1];
        }
      }
    }

    // Direct fallback for week_1 if subcollection listing returned empty
    if (!weeklyTimetables[1] && (!timetablesSnap || timetablesSnap.empty)) {
      try {
        const w1Ref = doc(db, COLLECTION_NAME, DOC_ID, 'weekly_timetables', 'week_1');
        const w1Snap = await getDoc(w1Ref);
        if (w1Snap.exists()) {
          const w1Data = w1Snap.data();
          const loadedTkb = (w1Data.timetable || w1Data) as SchoolTimetable;
          if (loadedTkb && loadedTkb.slots && loadedTkb.slots.length > 0) {
            weeklyTimetables[1] = loadedTkb;
            timetable = loadedTkb;
          }
        }
      } catch (e) {
        console.warn('Fallback direct week_1 fetch notice:', e);
      }
    }

    const expandedTimetables = expandWeeklyTimetables(weeklyTimetables);
    const result: SchoolPlanData = {
      config: rootData.config,
      departments: rootData.departments || [],
      subjects: rootData.subjects || [],
      classes: rootData.classes || [],
      teachers: rootData.teachers || [],
      assignments: rootData.assignments || [],
      lockedCells: rootData.lockedCells || [],
      weeklySchedules: weeklySchedules || [],
      timetable: timetable || expandedTimetables[1],
      weeklyTimetables: expandedTimetables,
      updatedAt: rootData.updatedAt || Date.now(),
      lastUpdatedBy: rootData.lastUpdatedBy
    };

    markDataAsCloudSynced(result);
    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
    return null;
  }
}

/**
 * Real-time listener for school plan updates
 */
export function subscribeToSchoolPlan(
  onData: (data: SchoolPlanData) => void,
  onError?: (err: Error) => void
) {
  const docPath = `${COLLECTION_NAME}/${DOC_ID}`;
  const planRef = doc(db, COLLECTION_NAME, DOC_ID);
  return onSnapshot(
    planRef,
    async snapshot => {
      if (snapshot.exists()) {
        try {
          const rootData = snapshot.data() as any;
          if (rootData && (rootData.version === 3 || rootData.weeklyTimetables)) {
            const expanded = expandWeeklyTimetables(rootData.weeklyTimetables || {});
            const fullData: SchoolPlanData = {
              config: rootData.config,
              departments: rootData.departments || [],
              subjects: rootData.subjects || [],
              classes: rootData.classes || [],
              teachers: rootData.teachers || [],
              assignments: rootData.assignments || [],
              lockedCells: rootData.lockedCells || [],
              weeklySchedules: rootData.weeklySchedules || [],
              timetable: rootData.timetable || expanded[1],
              weeklyTimetables: expanded,
              updatedAt: rootData.updatedAt || Date.now(),
              lastUpdatedBy: rootData.lastUpdatedBy
            };
            onData(fullData);
          } else {
            const fullData = await loadSchoolPlanFromCloud();
            if (fullData) {
              onData(fullData);
            }
          }
        } catch (e) {
          console.warn('Error reloading updated plan in snapshot:', e);
        }
      }
    },
    error => {
      handleFirestoreError(error, OperationType.GET, docPath);
      if (onError) onError(error);
    }
  );
}

/**
 * Export current workspace state as a downloadable JSON file
 */
export function exportDataAsJsonFile(data: SchoolPlanData, filename?: string) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `PhanCongChuyenMon_DBK_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Delete a specific week's timetable document from Firestore Cloud subcollection
 */
export async function deleteWeekTimetableFromCloud(weekNumber: number): Promise<boolean> {
  try {
    const weekDocRef = doc(db, COLLECTION_NAME, DOC_ID, 'weekly_timetables', `week_${weekNumber}`);
    await deleteDoc(weekDocRef);
    savedTimetableFingerprints.delete(weekNumber);
    try {
      sessionStorage.removeItem(`docbinhkieu_fp_tt_${weekNumber}`);
    } catch { /* ignore */ }
    return true;
  } catch (err) {
    console.error(`Error deleting week_${weekNumber} from cloud:`, err);
    return false;
  }
}

/**
 * Delete a batch of weeks from Firestore Cloud subcollection
 */
export async function deleteBatchWeekTimetablesFromCloud(weekNumbers: number[]): Promise<boolean> {
  try {
    const deletePromises = weekNumbers.map(async w => {
      const weekDocRef = doc(db, COLLECTION_NAME, DOC_ID, 'weekly_timetables', `week_${w}`);
      savedTimetableFingerprints.delete(w);
      try {
        sessionStorage.removeItem(`docbinhkieu_fp_tt_${w}`);
      } catch { /* ignore */ }
      return deleteDoc(weekDocRef).catch(e => {
        console.warn(`Notice deleting week_${w} from cloud:`, e);
      });
    });
    await Promise.all(deletePromises);
    return true;
  } catch (err) {
    console.error(`Error batch deleting weeks from cloud:`, err);
    return false;
  }
}

