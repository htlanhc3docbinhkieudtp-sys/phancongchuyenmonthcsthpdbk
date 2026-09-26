import { SchoolTimetable } from '../types';

const DB_NAME = 'DocBinhKieuSchoolDB';
const DB_VERSION = 1;
const TIMETABLES_STORE = 'timetables';
const BACKUPS_STORE = 'backups';

export const WEEK2_EXACT_BACKUP_KEY = 'docbinhkieu_week2_exact_backup';
export const STORAGE_KEY_PREFIX = 'docbinhkieu_plan';
const LOCAL_SNAPSHOTS_KEY = 'docbinhkieu_local_timetable_snapshots_v1';

export interface TimetableSnapshotItem {
  id: string;
  createdAt: number;
  description: string;
  weekNumber: number;
  slotCount: number;
  timetable: SchoolTimetable;
  createdBy?: string;
}

export async function saveTimetableSnapshot(
  timetable: SchoolTimetable,
  description: string,
  createdBy = 'Quản trị viên'
): Promise<boolean> {
  try {
    const raw = localStorage.getItem(LOCAL_SNAPSHOTS_KEY);
    const existing: TimetableSnapshotItem[] = raw ? JSON.parse(raw) : [];
    const createdAt = Date.now();
    const snapshot: TimetableSnapshotItem = {
      id: `snapshot_${timetable.weekNumber || 1}_${createdAt}`,
      createdAt,
      description,
      weekNumber: timetable.weekNumber || 1,
      slotCount: timetable.slots?.length || 0,
      timetable,
      createdBy,
    };
    localStorage.setItem(LOCAL_SNAPSHOTS_KEY, JSON.stringify([snapshot, ...existing].slice(0, 25)));
    return true;
  } catch (error) {
    console.warn('Local timetable snapshot save failed:', error);
    return false;
  }
}

export async function getTimetableSnapshots(): Promise<TimetableSnapshotItem[]> {
  try {
    const raw = localStorage.getItem(LOCAL_SNAPSHOTS_KEY);
    const snapshots: TimetableSnapshotItem[] = raw ? JSON.parse(raw) : [];
    return snapshots.sort((a, b) => b.createdAt - a.createdAt).slice(0, 25);
  } catch (error) {
    console.warn('Local timetable snapshots could not be read:', error);
    return [];
  }
}

/**
 * Open IndexedDB instance safely
 */
function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(TIMETABLES_STORE)) {
          db.createObjectStore(TIMETABLES_STORE, { keyPath: 'weekNumber' });
        }
        if (!db.objectStoreNames.contains(BACKUPS_STORE)) {
          db.createObjectStore(BACKUPS_STORE, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('IndexedDB open error, falling back to LocalStorage');
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Save an individual week's timetable to IndexedDB and LocalStorage
 */
export async function persistWeekTimetable(weekNumber: number, timetable: SchoolTimetable): Promise<void> {
  if (!timetable || !timetable.slots || timetable.slots.length === 0) {
    // If empty or null, remove backups and delete from IndexedDB
    try {
      if (weekNumber === 2) {
        localStorage.removeItem(WEEK2_EXACT_BACKUP_KEY);
      }
      if (weekNumber === 1) {
        localStorage.removeItem('docbinhkieu_emergency_w1_timetable_backup');
      }
    } catch { /* ignore */ }
    await deleteWeekTimetableFromIndexedDB(weekNumber);
    return;
  }

  // 1. Save to dedicated LocalStorage key for critical weeks (Week 1 and Week 2)
  try {
    if (weekNumber === 2) {
      localStorage.setItem(WEEK2_EXACT_BACKUP_KEY, JSON.stringify(timetable));
    }
    if (weekNumber === 1) {
      localStorage.setItem('docbinhkieu_emergency_w1_timetable_backup', JSON.stringify(timetable));
    }
  } catch (e) {
    console.warn(`LocalStorage quota error for week ${weekNumber}:`, e);
  }

  // 2. Persist to IndexedDB (unlimited storage capacity, immune to 5MB quota)
  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(TIMETABLES_STORE, 'readwrite');
      const store = tx.objectStore(TIMETABLES_STORE);
      store.put({
        weekNumber,
        timetable,
        savedAt: Date.now()
      });
    }
  } catch (e) {
    console.warn(`IndexedDB save error for week ${weekNumber}:`, e);
  }
}

/**
 * Delete an individual week from IndexedDB
 */
export async function deleteWeekTimetableFromIndexedDB(weekNumber: number): Promise<void> {
  try {
    const db = await openDB();
    if (!db) return;
    const tx = db.transaction(TIMETABLES_STORE, 'readwrite');
    const store = tx.objectStore(TIMETABLES_STORE);
    store.delete(weekNumber);
  } catch (e) {
    console.warn(`IndexedDB delete error for week ${weekNumber}:`, e);
  }
}

/**
 * Delete a batch of weeks from IndexedDB
 */
export async function deleteBatchWeekTimetablesFromIndexedDB(weekNumbers: number[]): Promise<void> {
  if (!weekNumbers || weekNumbers.length === 0) return;
  try {
    const db = await openDB();
    if (!db) return;
    const tx = db.transaction(TIMETABLES_STORE, 'readwrite');
    const store = tx.objectStore(TIMETABLES_STORE);
    weekNumbers.forEach(w => {
      store.delete(w);
    });
  } catch (e) {
    console.warn('IndexedDB batch delete error:', e);
  }
}

/**
 * Load Week 2 exact backup from LocalStorage or IndexedDB
 */
export function getSynchronousWeek2Backup(): SchoolTimetable | null {
  try {
    const saved = localStorage.getItem(WEEK2_EXACT_BACKUP_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.slots && parsed.slots.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Persist all weekly timetables to IndexedDB
 */
export async function persistAllWeeklyTimetables(timetables: Record<number, SchoolTimetable>): Promise<void> {
  if (!timetables || typeof timetables !== 'object') return;

  // Always keep Week 2 in dedicated backup if present, remove if empty
  if (timetables[2] && timetables[2].slots && timetables[2].slots.length > 0) {
    try {
      localStorage.setItem(WEEK2_EXACT_BACKUP_KEY, JSON.stringify(timetables[2]));
    } catch { /* ignore */ }
  } else if (timetables[2] && (!timetables[2].slots || timetables[2].slots.length === 0)) {
    try {
      localStorage.removeItem(WEEK2_EXACT_BACKUP_KEY);
    } catch { /* ignore */ }
  }

  // Keep or remove Week 1 emergency backup
  if (timetables[1] && timetables[1].slots && timetables[1].slots.length > 0) {
    try {
      localStorage.setItem('docbinhkieu_emergency_w1_timetable_backup', JSON.stringify(timetables[1]));
    } catch { /* ignore */ }
  } else if (timetables[1] && (!timetables[1].slots || timetables[1].slots.length === 0)) {
    try {
      localStorage.removeItem('docbinhkieu_emergency_w1_timetable_backup');
    } catch { /* ignore */ }
  }

  try {
    const db = await openDB();
    if (!db) return;
    const tx = db.transaction(TIMETABLES_STORE, 'readwrite');
    const store = tx.objectStore(TIMETABLES_STORE);
    for (const [wKey, tt] of Object.entries(timetables)) {
      const weekNumber = Number(wKey);
      if (tt && tt.slots && tt.slots.length > 0) {
        store.put({
          weekNumber,
          timetable: tt,
          savedAt: Date.now()
        });
      } else {
        // If week is empty or cleared, remove from IndexedDB store so it is not resurrected
        store.delete(weekNumber);
      }
    }
  } catch (e) {
    console.warn('IndexedDB persistAllWeeklyTimetables error:', e);
  }
}

/**
 * Load all timetables from IndexedDB
 */
export async function loadAllTimetablesFromIndexedDB(): Promise<Record<number, SchoolTimetable>> {
  const result: Record<number, SchoolTimetable> = {};
  try {
    const db = await openDB();
    if (!db) return result;
    return new Promise((resolve) => {
      const tx = db.transaction(TIMETABLES_STORE, 'readonly');
      const store = tx.objectStore(TIMETABLES_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = req.result as Array<{ weekNumber: number; timetable: SchoolTimetable }>;
        if (Array.isArray(rows)) {
          rows.forEach(r => {
            if (r.weekNumber && r.timetable) {
              result[r.weekNumber] = r.timetable;
            }
          });
        }
        resolve(result);
      };
      req.onerror = () => resolve(result);
    });
  } catch {
    return result;
  }
}
