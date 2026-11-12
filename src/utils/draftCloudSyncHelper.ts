import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SchoolTimetable, TimetableSlot } from '../types';
import { getSlotsForWeek } from './actualTeachingHoursHelper';

export const DRAFT_COLLECTION_NAME = 'draft_assignments';
export const DRAFT_ACTIVE_DOC_ID = 'draft_active_plan';
export const DRAFT_LOCAL_CACHE_KEY = 'docbinhkieu_draft_sandbox_cloud_cache_v12';

export interface DraftCloudPayload {
  version: number;
  updatedAt: number;
  lastUpdatedBy: string;
  deviceName?: string;
  description?: string;
  gddpCustomClassTeacherMap?: Record<string, string>;
  aiCustomClassTeacherMap?: Record<string, string>;
  // Week 10 slots (the base driving weeks 10 through 35 in the draft)
  week10Slots: TimetableSlot[];
  // Any specific overrides for other weeks if customized
  customWeekOverrides?: Record<number, TimetableSlot[]>;
}

/**
 * Compact a TimetableSlot to keep Firestore document size small and fast
 */
export function compactSlot(slot: TimetableSlot): TimetableSlot {
  return {
    id: slot.id,
    classId: slot.classId,
    className: slot.className,
    dayOfWeek: slot.dayOfWeek,
    session: slot.session,
    period: slot.period,
    subjectId: slot.subjectId,
    subjectName: slot.subjectName,
    teacherId: slot.teacherId,
    teacherName: slot.teacherName,
    teacherCode: slot.teacherCode,
    room: slot.room || '',
  };
}

/**
 * Save draft assignment plan to Cloud Firestore
 * Allows school leaders to close computer at school and continue at home seamlessly.
 */
export async function saveDraftToCloud(
  draftWeeklyTimetables: Record<number, SchoolTimetable>,
  gddpMap?: Record<string, string>,
  aiMap?: Record<string, string>,
  description = 'Bản dự thảo phân công chuyên môn đồng bộ đám mây'
): Promise<{ success: boolean; updatedAt: number; error?: string }> {
  try {
    const updatedAt = Date.now();
    const w10Raw = draftWeeklyTimetables[10]?.slots || draftWeeklyTimetables[9]?.slots || [];
    const week10Slots = w10Raw.map(compactSlot);

    // Collect any overrides for weeks 11-35 that differ from week 10
    const customWeekOverrides: Record<number, TimetableSlot[]> = {};
    for (let w = 11; w <= 35; w++) {
      const slots = draftWeeklyTimetables[w]?.slots;
      if (slots && slots.length > 0 && slots !== w10Raw) {
        customWeekOverrides[w] = slots.map(compactSlot);
      }
    }

    const payload: DraftCloudPayload = {
      version: 12,
      updatedAt,
      lastUpdatedBy: 'Lãnh đạo nhà trường',
      deviceName: typeof navigator !== 'undefined' ? (navigator.userAgent.includes('Mobile') ? 'Điện thoại / Tablet' : 'Máy tính') : 'Hệ thống',
      description,
      gddpCustomClassTeacherMap: gddpMap || {},
      aiCustomClassTeacherMap: aiMap || {},
      week10Slots,
      customWeekOverrides,
    };

    const docRef = doc(db, DRAFT_COLLECTION_NAME, DRAFT_ACTIVE_DOC_ID);
    await setDoc(docRef, payload);

    // Also update localStorage cache
    try {
      localStorage.setItem(DRAFT_LOCAL_CACHE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore storage quota */
    }

    return { success: true, updatedAt };
  } catch (error) {
    console.error('Failed to save draft to Firestore cloud:', error);
    return {
      success: false,
      updatedAt: Date.now(),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Load draft assignment plan from Cloud Firestore
 */
export async function loadDraftFromCloud(): Promise<DraftCloudPayload | null> {
  try {
    const docRef = doc(db, DRAFT_COLLECTION_NAME, DRAFT_ACTIVE_DOC_ID);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data() as DraftCloudPayload;
      // Sync local cache
      try {
        localStorage.setItem(DRAFT_LOCAL_CACHE_KEY, JSON.stringify(data));
      } catch {
        /* ignore */
      }
      return data;
    }

    // Fallback to local cache if offline
    const cached = localStorage.getItem(DRAFT_LOCAL_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as DraftCloudPayload;
    }

    return null;
  } catch (error) {
    console.warn('Could not read draft from Cloud Firestore, checking local cache:', error);
    try {
      const cached = localStorage.getItem(DRAFT_LOCAL_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as DraftCloudPayload;
      }
    } catch {
      /* ignore */
    }
    return null;
  }
}

/**
 * Reconstruct the full 35-week draft timetables from a Cloud Payload
 * Weeks 1-9: strict official actual teaching hours
 * Weeks 10-35: reconstructed from cloud week 10 draft slots + overrides
 */
export function reconstructDraftFromCloudPayload(
  payload: DraftCloudPayload,
  academicYear: string,
  officialWeeklyTimetables?: Record<number, SchoolTimetable>,
  fallbackTimetable?: SchoolTimetable
): Record<number, SchoolTimetable> {
  const result: Record<number, SchoolTimetable> = {};

  // Weeks 1 to 9: 100% clean official records
  for (let w = 1; w <= 9; w++) {
    const slots = getSlotsForWeek(w, officialWeeklyTimetables, fallbackTimetable);
    result[w] = {
      id: `draft-tkb-week-${w}`,
      academicYear,
      semester: 'HK1',
      weekNumber: w,
      slots: [...slots],
      updatedAt: payload.updatedAt,
    };
  }

  // Weeks 10 to 35: use cloud draft week 10 slots
  const baseW10Slots = payload.week10Slots || getSlotsForWeek(10, officialWeeklyTimetables, fallbackTimetable);

  for (let w = 10; w <= 35; w++) {
    const weekSlots = payload.customWeekOverrides?.[w] || baseW10Slots;
    result[w] = {
      id: `draft-tkb-week-${w}`,
      academicYear,
      semester: w <= 18 ? 'HK1' : 'HK2',
      weekNumber: w,
      slots: [...weekSlots],
      updatedAt: payload.updatedAt,
    };
  }

  return result;
}
