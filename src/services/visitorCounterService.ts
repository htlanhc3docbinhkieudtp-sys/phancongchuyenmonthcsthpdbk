import { doc, getDoc, runTransaction, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export interface VisitorStats {
  totalVisits: number;
  uniqueVisitors: number;
  todayDate: string;
  todayVisits: number;
  yesterdayVisits: number;
  thisMonthVisits: number;
  thisMonthKey: string;
  lastVisitedAt: number;
  dailyHistory: Record<string, number>;
}

const COLLECTION_NAME = 'site_analytics';
const DOC_ID = 'visitor_counter';

/**
 * Get today's date formatted as YYYY-MM-DD in Vietnam timezone (GMT+7)
 */
export function getVietnamTodayDate(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  } catch {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
}

/**
 * Get current month key as YYYY-MM in Vietnam timezone
 */
export function getVietnamMonthKey(): string {
  const today = getVietnamTodayDate();
  return today.slice(0, 7); // e.g. "2026-09"
}

// Memory cache to avoid redundant fast writes
let cachedStats: VisitorStats | null = null;
let isRecording = false;

/**
 * Record visitor access safely in Firestore using transactions.
 * Prevents multiple counts on page reloads within the same session.
 */
export async function recordVisitorAccess(): Promise<VisitorStats | null> {
  if (isRecording) return cachedStats;
  isRecording = true;

  try {
    // 1. Session check to avoid counting on simple refreshes
    const sessionKey = 'dbk_session_counted_' + getVietnamTodayDate();
    const alreadyCountedInSession = sessionStorage.getItem(sessionKey);

    // 2. Unique client check
    const clientKey = 'dbk_visitor_uuid';
    let clientId = localStorage.getItem(clientKey);
    let isNewUniqueClient = false;

    if (!clientId) {
      clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      try {
        localStorage.setItem(clientKey, clientId);
        isNewUniqueClient = true;
      } catch (e) {
        console.warn('Storage unavailable:', e);
      }
    }

    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    const todayStr = getVietnamTodayDate();
    const monthKey = getVietnamMonthKey();

    // If already counted in this session, just fetch latest data
    if (alreadyCountedInSession) {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        cachedStats = snap.data() as VisitorStats;
        return cachedStats;
      }
    }

    // Execute atomic transaction to update visitor counts
    const updatedStats = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      let current: VisitorStats;

      if (!docSnap.exists()) {
        // Initial seed document
        current = {
          totalVisits: 1,
          uniqueVisitors: 1,
          todayDate: todayStr,
          todayVisits: 1,
          yesterdayVisits: 0,
          thisMonthVisits: 1,
          thisMonthKey: monthKey,
          lastVisitedAt: Date.now(),
          dailyHistory: {
            [todayStr]: 1
          }
        };
      } else {
        const data = docSnap.data() as Partial<VisitorStats>;
        const prevTotal = Number(data.totalVisits || 0);
        const prevUnique = Number(data.uniqueVisitors || 0);
        const prevTodayDate = data.todayDate || '';
        const prevTodayVisits = Number(data.todayVisits || 0);
        const prevYesterdayVisits = Number(data.yesterdayVisits || 0);
        const prevMonthKey = data.thisMonthKey || '';
        const prevMonthVisits = Number(data.thisMonthVisits || 0);
        const prevDailyHistory: Record<string, number> = { ...(data.dailyHistory || {}) };

        let newTodayVisits = prevTodayVisits;
        let newYesterdayVisits = prevYesterdayVisits;

        // Check if date rolled over
        if (prevTodayDate !== todayStr) {
          // If previous date was yesterday (1 day diff), store as yesterdayVisits
          newYesterdayVisits = prevTodayVisits;
          newTodayVisits = 1;
        } else {
          newTodayVisits = prevTodayVisits + 1;
        }

        // Check month rollover
        let newMonthVisits = prevMonthVisits;
        if (prevMonthKey !== monthKey) {
          newMonthVisits = 1;
        } else {
          newMonthVisits = prevMonthVisits + 1;
        }

        // Update daily history
        prevDailyHistory[todayStr] = (prevDailyHistory[todayStr] || 0) + 1;

        // Keep last 30 days only to keep document size minimal
        const sortedDates = Object.keys(prevDailyHistory).sort();
        if (sortedDates.length > 30) {
          const toRemove = sortedDates.slice(0, sortedDates.length - 30);
          for (const key of toRemove) {
            delete prevDailyHistory[key];
          }
        }

        current = {
          totalVisits: prevTotal + 1,
          uniqueVisitors: isNewUniqueClient ? prevUnique + 1 : (prevUnique || 1),
          todayDate: todayStr,
          todayVisits: newTodayVisits,
          yesterdayVisits: newYesterdayVisits,
          thisMonthVisits: newMonthVisits,
          thisMonthKey: monthKey,
          lastVisitedAt: Date.now(),
          dailyHistory: prevDailyHistory
        };
      }

      transaction.set(docRef, current);
      return current;
    });

    try {
      sessionStorage.setItem(sessionKey, '1');
    } catch {
      // Ignore
    }

    cachedStats = updatedStats;
    return updatedStats;
  } catch (err) {
    console.warn('Notice recording visitor counter to Firestore:', err);
    return null;
  } finally {
    isRecording = false;
  }
}

/**
 * Subscribe to real-time updates for visitor statistics
 */
export function subscribeToVisitorStats(
  onUpdate: (stats: VisitorStats) => void
): () => void {
  const docRef = doc(db, COLLECTION_NAME, DOC_ID);

  const unsubscribe = onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as VisitorStats;
        cachedStats = data;
        onUpdate(data);
      }
    },
    (err) => {
      console.warn('Error listening to visitor stats:', err);
    }
  );

  return unsubscribe;
}
