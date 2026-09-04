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

/**
 * Save complete school plan to Firestore
 * Partitions large sub-collections (weeklySchedules, weeklyTimetables)
 * into subdocuments so that no individual Firestore document exceeds the 1MB limit.
 */
export async function saveSchoolPlanToCloud(data: SchoolPlanData): Promise<boolean> {
  const docPath = `${COLLECTION_NAME}/${DOC_ID}`;
  try {
    const planRef = doc(db, COLLECTION_NAME, DOC_ID);

    // Root document stores core academic plan data (~135KB), safely under 1MB
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

    const batch = writeBatch(db);
    batch.set(planRef, sanitizeForFirestore(rootPayload));

    // Save weekly schedules in subcollection weekly_schedules (each week is ~68KB)
    if (data.weeklySchedules && Array.isArray(data.weeklySchedules)) {
      for (const ws of data.weeklySchedules) {
        const wsRef = doc(db, COLLECTION_NAME, DOC_ID, 'weekly_schedules', `week_${ws.weekNumber}`);
        batch.set(wsRef, sanitizeForFirestore({
          weekNumber: ws.weekNumber,
          semester: ws.semester || 'HK1',
          assignments: ws.assignments || [],
          updatedAt: Date.now()
        }));
      }
    }

    // Save weekly timetables in subcollection weekly_timetables (each week is ~400KB)
    if (data.weeklyTimetables && typeof data.weeklyTimetables === 'object') {
      for (const [wKey, tt] of Object.entries(data.weeklyTimetables)) {
        if (tt) {
          const ttRef = doc(db, COLLECTION_NAME, DOC_ID, 'weekly_timetables', `week_${wKey}`);
          batch.set(ttRef, sanitizeForFirestore({
            weekNumber: Number(wKey),
            timetable: tt,
            updatedAt: Date.now()
          }));
        }
      }
    } else if (data.timetable) {
      const ttRef = doc(db, COLLECTION_NAME, DOC_ID, 'weekly_timetables', 'week_1');
      batch.set(ttRef, sanitizeForFirestore({
        weekNumber: 1,
        timetable: data.timetable,
        updatedAt: Date.now()
      }));
    }

    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
    return false;
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

    return {
      ...rootData,
      weeklySchedules,
      weeklyTimetables,
      timetable
    } as SchoolPlanData;
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
