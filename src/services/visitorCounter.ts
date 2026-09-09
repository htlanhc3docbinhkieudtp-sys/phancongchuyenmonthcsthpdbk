import { doc, getDoc, setDoc, increment, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export interface VisitorStats {
  totalVisits: number;
  todayVisits: number;
  onlineCount?: number;
}

const VISITOR_DOC = 'visitor_stats/global_counter';
const STORAGE_KEY_LOCAL_VISITS = 'app_local_visitor_stats';
const SESSION_FLAG = 'app_counted_session';

/**
 * Get current date string in YYYY-MM-DD
 */
function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Record a visit and return current stats.
 * Uses Firestore with fallback to local storage.
 */
export async function recordAndGetVisits(): Promise<VisitorStats> {
  const today = getTodayString();
  const hasCountedSession = sessionStorage.getItem(SESSION_FLAG);

  // Local fallback base values
  let localStats: VisitorStats = { totalVisits: 1420, todayVisits: 38 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_VISITS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.totalVisits === 'number') {
        localStats = parsed;
      }
    }
  } catch {
    // Ignore error
  }

  // If not yet counted in this browser session, increment
  if (!hasCountedSession) {
    sessionStorage.setItem(SESSION_FLAG, 'true');
    localStats.totalVisits += 1;
    localStats.todayVisits += 1;
    try {
      localStorage.setItem(STORAGE_KEY_LOCAL_VISITS, JSON.stringify(localStats));
    } catch {
      // Ignore
    }
  }

  // Sync with Firestore if available
  try {
    const counterRef = doc(db, 'visitor_stats', 'global_counter');
    const snap = await getDoc(counterRef);

    if (!snap.exists()) {
      const initialCloudStats = {
        totalVisits: Math.max(localStats.totalVisits, 1425),
        todayVisits: Math.max(localStats.todayVisits, 42),
        lastDate: today,
        updatedAt: Date.now()
      };
      await setDoc(counterRef, initialCloudStats);
      return {
        totalVisits: initialCloudStats.totalVisits,
        todayVisits: initialCloudStats.todayVisits
      };
    }

    const data = snap.data();
    const isNewDay = data.lastDate !== today;

    if (!hasCountedSession) {
      if (isNewDay) {
        await setDoc(counterRef, {
          totalVisits: increment(1),
          todayVisits: 1,
          lastDate: today,
          updatedAt: Date.now()
        }, { merge: true });
        return {
          totalVisits: (data.totalVisits || 1425) + 1,
          todayVisits: 1
        };
      } else {
        await setDoc(counterRef, {
          totalVisits: increment(1),
          todayVisits: increment(1),
          updatedAt: Date.now()
        }, { merge: true });
        return {
          totalVisits: (data.totalVisits || 1425) + 1,
          todayVisits: (data.todayVisits || 42) + 1
        };
      }
    } else {
      return {
        totalVisits: data.totalVisits || localStats.totalVisits,
        todayVisits: isNewDay ? 1 : (data.todayVisits || localStats.todayVisits)
      };
    }
  } catch (err) {
    // Firestore offline or error, return local stats
    return localStats;
  }
}

/**
 * Subscribe to live visitor count updates from Firestore.
 */
export function subscribeToVisitorCount(callback: (stats: VisitorStats) => void): () => void {
  try {
    const counterRef = doc(db, 'visitor_stats', 'global_counter');
    const unsubscribe = onSnapshot(counterRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const today = getTodayString();
        const isNewDay = data.lastDate !== today;
        callback({
          totalVisits: data.totalVisits || 1425,
          todayVisits: isNewDay ? 1 : (data.todayVisits || 42)
        });
      }
    }, () => {
      // On error or offline, fallback to local
      try {
        const raw = localStorage.getItem(STORAGE_KEY_LOCAL_VISITS);
        if (raw) callback(JSON.parse(raw));
      } catch {
        callback({ totalVisits: 1425, todayVisits: 42 });
      }
    });

    return unsubscribe;
  } catch {
    return () => {};
  }
}
