import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
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

// Initialize Firestore with custom databaseId if configured
export const db: Firestore =
  firebaseConfigJson.firestoreDatabaseId &&
  firebaseConfigJson.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId)
    : getFirestore(app);

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
  updatedAt?: number;
  lastUpdatedBy?: string;
  version?: number;
}

const COLLECTION_NAME = 'school_plans';
const DOC_ID = 'active_plan_thcs_thpt_docbinhkieu';

/**
 * Save complete school plan to Firestore
 */
export async function saveSchoolPlanToCloud(data: SchoolPlanData): Promise<boolean> {
  try {
    const planRef = doc(db, COLLECTION_NAME, DOC_ID);
    await setDoc(
      planRef,
      {
        ...data,
        updatedAt: Date.now(),
        lastUpdatedBy: 'Admin THCS & THPT Đốc Binh Kiều',
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error('Firebase save error:', error);
    return false;
  }
}

/**
 * Load complete school plan from Firestore once
 */
export async function loadSchoolPlanFromCloud(): Promise<SchoolPlanData | null> {
  try {
    const planRef = doc(db, COLLECTION_NAME, DOC_ID);
    const snap = await getDoc(planRef);
    if (snap.exists()) {
      return snap.data() as SchoolPlanData;
    }
    return null;
  } catch (error) {
    console.error('Firebase load error:', error);
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
  const planRef = doc(db, COLLECTION_NAME, DOC_ID);
  return onSnapshot(
    planRef,
    snapshot => {
      if (snapshot.exists()) {
        onData(snapshot.data() as SchoolPlanData);
      }
    },
    error => {
      console.warn('Firestore subscription warning:', error);
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
