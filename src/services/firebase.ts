import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  writeBatch,
  onSnapshot,
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
  SchoolTimetable
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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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

const COLLECTION_NAME = 'school_plans';
const DOC_ID = 'active_plan_thcs_thpt_docbinhkieu';

// In-memory dirty-checking cache to avoid redundant document writes
let savedRootFingerprint: string | null = null;
const savedWeeklyScheduleFingerprints = new Map<number, string>();
const savedWeeklyTimetableFingerprints = new Map<number, string>();

/**
 * Record current fingerprints so subsequent saves only write changed documents
 */
export function markDataAsCloudSynced(data: SchoolPlanData): void {
  try {
    savedRootFingerprint = JSON.stringify({
      config: data.config,
      departments: data.departments,
      subjects: data.subjects,
      classes: data.classes,
      teachers: data.teachers,
      assignments: data.assignments,
      lockedCells: data.lockedCells,
    });

    if (data.weeklySchedules && Array.isArray(data.weeklySchedules)) {
      savedWeeklyScheduleFingerprints.clear();
      data.weeklySchedules.forEach(ws => {
        savedWeeklyScheduleFingerprints.set(ws.weekNumber, JSON.stringify(ws.assignments || []));
      });
    }

    if (data.weeklyTimetables && typeof data.weeklyTimetables === 'object') {
      savedWeeklyTimetableFingerprints.clear();
      Object.entries(data.weeklyTimetables).forEach(([wKey, tt]) => {
        if (tt) {
          savedWeeklyTimetableFingerprints.set(Number(wKey), JSON.stringify(tt.slots || []));
        }
      });
    } else if (data.timetable) {
      savedWeeklyTimetableFingerprints.set(1, JSON.stringify(data.timetable.slots || []));
    }
  } catch (e) {
    console.warn('Notice computing cloud sync fingerprints:', e);
  }
}

// Concurrency mutex and queued save handler
let isSaveInProgress = false;
let pendingSaveRequest: {
  data: SchoolPlanData;
  resolve: (success: boolean) => void;
} | null = null;

/**
 * Internal execution of cloud save with delta-checking and batch chunking
 */
async function executeCloudSave(data: SchoolPlanData): Promise<boolean> {
  const docPath = `${COLLECTION_NAME}/${DOC_ID}`;
  try {
    const planRef = doc(db, COLLECTION_NAME, DOC_ID);

    // 1. Root document (stores core academic plan data)
    const currentRootObj = {
      config: data.config,
      departments: data.departments,
      subjects: data.subjects,
      classes: data.classes,
      teachers: data.teachers,
      assignments: data.assignments,
      lockedCells: data.lockedCells,
    };
    const currentRootFp = JSON.stringify(currentRootObj);
    const rootNeedsSave = savedRootFingerprint !== currentRootFp;

    interface PendingWriteItem {
      ref: any;
      payload: any;
      onSuccess?: () => void;
    }

    const writesToCommit: PendingWriteItem[] = [];

    if (rootNeedsSave) {
      const rootPayload = {
        ...currentRootObj,
        updatedAt: Date.now(),
        lastUpdatedBy: data.lastUpdatedBy || 'Admin THCS & THPT Đốc Binh Kiều',
        hasSubcollections: true,
        version: 2
      };
      writesToCommit.push({
        ref: planRef,
        payload: sanitizeForFirestore(rootPayload),
        onSuccess: () => {
          savedRootFingerprint = currentRootFp;
        }
      });
    }

    // 2. Weekly schedules (subcollection: weekly_schedules)
    // Only write weeks whose assignments have actually changed
    if (data.weeklySchedules && Array.isArray(data.weeklySchedules)) {
      for (const ws of data.weeklySchedules) {
        const fp = JSON.stringify(ws.assignments || []);
        if (savedWeeklyScheduleFingerprints.get(ws.weekNumber) !== fp) {
          const wsRef = doc(db, COLLECTION_NAME, DOC_ID, 'weekly_schedules', `week_${ws.weekNumber}`);
          writesToCommit.push({
            ref: wsRef,
            payload: sanitizeForFirestore({
              weekNumber: ws.weekNumber,
              semester: ws.semester || 'HK1',
              assignments: ws.assignments || [],
              updatedAt: Date.now()
            }),
            onSuccess: () => {
              savedWeeklyScheduleFingerprints.set(ws.weekNumber, fp);
            }
          });
        }
      }
    }

    // 3. Weekly timetables (subcollection: weekly_timetables)
    // Only write weeks whose timetable slots have actually changed
    if (data.weeklyTimetables && typeof data.weeklyTimetables === 'object') {
      const week1SlotsCount = data.weeklyTimetables[1]?.slots?.length || 0;
      for (const [wKey, tt] of Object.entries(data.weeklyTimetables)) {
        if (tt) {
          const wkNum = Number(wKey);
          // Master week 1, active week, or customized weeks
          if (wkNum === 1 || wkNum === (data.config as any)?.activeWeek || (tt.slots && tt.slots.length !== week1SlotsCount)) {
            const fp = JSON.stringify(tt.slots || []);
            if (savedWeeklyTimetableFingerprints.get(wkNum) !== fp) {
              const ttRef = doc(db, COLLECTION_NAME, DOC_ID, 'weekly_timetables', `week_${wKey}`);
              writesToCommit.push({
                ref: ttRef,
                payload: sanitizeForFirestore({
                  weekNumber: wkNum,
                  timetable: tt,
                  updatedAt: Date.now()
                }),
                onSuccess: () => {
                  savedWeeklyTimetableFingerprints.set(wkNum, fp);
                }
              });
            }
          }
        }
      }
    } else if (data.timetable) {
      const fp = JSON.stringify(data.timetable.slots || []);
      if (savedWeeklyTimetableFingerprints.get(1) !== fp) {
        const ttRef = doc(db, COLLECTION_NAME, DOC_ID, 'weekly_timetables', 'week_1');
        writesToCommit.push({
          ref: ttRef,
          payload: sanitizeForFirestore({
            weekNumber: 1,
            timetable: data.timetable,
            updatedAt: Date.now()
          }),
          onSuccess: () => {
            savedWeeklyTimetableFingerprints.set(1, fp);
          }
        });
      }
    }

    // If nothing changed across root and all subcollections, skip Firestore write entirely!
    if (writesToCommit.length === 0) {
      return true;
    }

    // Chunk writes into small batches (max 8 documents per batch)
    // to prevent Firestore Web SDK write stream queue exhaustion
    const CHUNK_SIZE = 8;
    for (let i = 0; i < writesToCommit.length; i += CHUNK_SIZE) {
      const chunk = writesToCommit.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const item of chunk) {
        batch.set(item.ref, item.payload);
      }
      await batch.commit();

      // Update success fingerprints
      for (const item of chunk) {
        if (item.onSuccess) item.onSuccess();
      }

      // Small pause between chunks if multiple batches exist to let the write stream drain
      if (i + CHUNK_SIZE < writesToCommit.length) {
        await new Promise(res => setTimeout(res, 120));
      }
    }

    return true;
  } catch (error: any) {
    const errorStr = String(error?.message || error || '');
    if (errorStr.includes('resource-exhausted') || errorStr.includes('queued writes')) {
      console.warn('Firestore write stream throttled. Applying backoff cooldown...', errorStr);
      await new Promise(res => setTimeout(res, 2000));
    } else {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
    return false;
  }
}

/**
 * Save complete school plan to Firestore with automatic concurrency queuing.
 * Ensures that at most ONE write operation is in-flight at any given time,
 * eliminating the "Write stream exhausted maximum allowed queued writes" error.
 */
export async function saveSchoolPlanToCloud(data: SchoolPlanData): Promise<boolean> {
  if (isSaveInProgress) {
    // If a save is already running, coalesce into pending request
    return new Promise<boolean>((resolve) => {
      if (pendingSaveRequest) {
        pendingSaveRequest.resolve(true); // Superceded by latest state
      }
      pendingSaveRequest = { data, resolve };
    });
  }

  isSaveInProgress = true;
  try {
    const result = await executeCloudSave(data);
    return result;
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
 * Load complete school plan from Firestore once
 * Reads root document and its subcollections (weekly_schedules, weekly_timetables),
 * with backward compatibility for legacy monolithic documents.
 */
export async function loadSchoolPlanFromCloud(): Promise<SchoolPlanData | null> {
  const docPath = `${COLLECTION_NAME}/${DOC_ID}`;
  try {
    const planRef = doc(db, COLLECTION_NAME, DOC_ID);
    const snap = await getDoc(planRef);
    if (!snap.exists()) {
      return null;
    }
    const rootData = snap.data() as Partial<SchoolPlanData> & { hasSubcollections?: boolean };

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

    const result = {
      ...rootData,
      weeklySchedules,
      weeklyTimetables,
      timetable
    } as SchoolPlanData;

    // Seed in-memory fingerprints with the newly loaded cloud state
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
          const fullData = await loadSchoolPlanFromCloud();
          if (fullData) {
            onData(fullData);
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
