import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SchoolTimetable, TimetableSlot } from '../types';
import { getSlotsForWeek } from './actualTeachingHoursHelper';

export const DRAFT_COLLECTION_NAME = 'draft_assignments';
export const DRAFT_ACTIVE_DOC_ID = 'draft_active_plan';
export const DRAFT_WEEK_BATCHES_SUBCOLLECTION = 'week_batches';
export const DRAFT_CLOUD_VERSION = 13;
export const DRAFT_LOCAL_CACHE_KEY = 'docbinhkieu_draft_sandbox_cloud_cache_v13';

export interface KeptIndexRange {
  s: number;
  e: number;
}

export interface WeekSlotDelta {
  keptRanges: KeptIndexRange[];
  extraSlots: TimetableSlot[];
}

export interface DraftCloudPayload {
  version: number;
  updatedAt: number;
  lastUpdatedBy: string;
  deviceName?: string;
  description?: string;
  gddpCustomClassTeacherMap?: Record<string, string>;
  aiCustomClassTeacherMap?: Record<string, string>;
  // Base Week 10 compacted slots (~340 KB)
  week10Slots: TimetableSlot[];
  // Delta-encoded weekly timetables for weeks 1..35 (kept in subcollection batches for Firestore, inline for local cache)
  hasWeekBatches?: boolean;
  weekBatchIds?: string[];
  weekDeltas?: Record<string, WeekSlotDelta>;
  // Legacy field for backward compatibility with older snapshots
  customWeekOverrides?: Record<number, TimetableSlot[]>;
}

/**
 * Recursively remove any undefined properties (Firestore rejects undefined values)
 */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        cleaned[k] = stripUndefined(v);
      }
    }
    return cleaned as T;
  }
  return value;
}

/**
 * Compact a TimetableSlot safely without undefined fields to keep Firestore document size small
 */
export function compactSlot(slot: TimetableSlot): TimetableSlot {
  const compacted: TimetableSlot = {
    id: slot.id || `${slot.classId || 'cls'}_${slot.dayOfWeek ?? 2}_${slot.session || 'SANG'}_${slot.period ?? 1}`,
    classId: slot.classId || '',
    className: slot.className || '',
    dayOfWeek: typeof slot.dayOfWeek === 'number' ? slot.dayOfWeek : 2,
    session: slot.session || 'SANG',
    period: typeof slot.period === 'number' ? slot.period : 1,
    subjectId: slot.subjectId || '',
    subjectName: slot.subjectName || '',
    teacherId: slot.teacherId || '',
    teacherName: slot.teacherName || '',
    teacherCode: slot.teacherCode || '',
  };
  if (slot.room && slot.room.trim() !== '') {
    compacted.room = slot.room;
  }
  return compacted;
}

function slotContentSignature(s: TimetableSlot): string {
  return [
    s.classId || '',
    s.className || '',
    s.dayOfWeek ?? 2,
    s.session || 'SANG',
    s.period ?? 1,
    s.subjectId || '',
    s.subjectName || '',
    s.teacherId || '',
    s.teacherName || '',
    s.teacherCode || '',
    s.room || '',
  ].join('|');
}

function compressRanges(indices: number[]): KeptIndexRange[] {
  if (indices.length === 0) return [];
  const sorted = [...indices].sort((a, b) => a - b);
  const ranges: KeptIndexRange[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push({ s: start, e: end });
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push({ s: start, e: end });
  return ranges;
}

/**
 * Encode all weeks 1..35 cleanly as base Week 10 + per-week delta ranges/extraSlots.
 * Keeps total encoded size ~1.1MB instead of ~13MB (avoids both Firestore 1MB limit and localStorage 5MB quota).
 */
export function buildCompactWeekDeltas(
  draftWeeklyTimetables: Record<number, SchoolTimetable>
): { week10Slots: TimetableSlot[]; weekDeltas: Record<string, WeekSlotDelta> } {
  const w10Raw = draftWeeklyTimetables[10]?.slots || draftWeeklyTimetables[9]?.slots || [];
  const week10Slots = w10Raw.map(compactSlot);

  // Build multimap of content signature -> array of indices in week10Slots
  const baseIndexBuckets = new Map<string, number[]>();
  week10Slots.forEach((slot, idx) => {
    const sig = slotContentSignature(slot);
    let arr = baseIndexBuckets.get(sig);
    if (!arr) {
      arr = [];
      baseIndexBuckets.set(sig, arr);
    }
    arr.push(idx);
  });

  const weekDeltas: Record<string, WeekSlotDelta> = {};

  for (let w = 1; w <= 35; w++) {
    if (w === 10) continue;
    const rawSlots = draftWeeklyTimetables[w]?.slots;
    if (!rawSlots || rawSlots.length === 0) continue;

    // Track consumed position within each bucket for week w
    const bucketCursor = new Map<string, number>();
    const keptIndices: number[] = [];
    const extraSlots: TimetableSlot[] = [];

    for (let i = 0; i < rawSlots.length; i++) {
      const cSlot = compactSlot(rawSlots[i]);
      const sig = slotContentSignature(cSlot);
      const bucket = baseIndexBuckets.get(sig);
      const cursor = bucketCursor.get(sig) || 0;

      if (bucket && cursor < bucket.length) {
        keptIndices.push(bucket[cursor]);
        bucketCursor.set(sig, cursor + 1);
      } else {
        extraSlots.push(cSlot);
      }
    }

    weekDeltas[String(w)] = {
      keptRanges: compressRanges(keptIndices),
      extraSlots,
    };
  }

  return { week10Slots, weekDeltas };
}

/**
 * Save compact snapshot to localStorage safely
 */
export function saveDraftLocalCache(
  draftWeeklyTimetables: Record<number, SchoolTimetable>,
  gddpMap?: Record<string, string>,
  aiMap?: Record<string, string>,
  updatedAt = Date.now(),
  description = 'Bản dự thảo phân công chuyên môn'
): void {
  try {
    const { week10Slots, weekDeltas } = buildCompactWeekDeltas(draftWeeklyTimetables);
    const localPayload: DraftCloudPayload = stripUndefined({
      version: DRAFT_CLOUD_VERSION,
      updatedAt,
      lastUpdatedBy: 'Lãnh đạo nhà trường',
      description,
      gddpCustomClassTeacherMap: gddpMap || {},
      aiCustomClassTeacherMap: aiMap || {},
      week10Slots,
      weekDeltas,
    });
    localStorage.setItem(DRAFT_LOCAL_CACHE_KEY, JSON.stringify(localPayload));
  } catch (e) {
    console.warn('Failed to save compact draft cache to localStorage:', e);
  }
}

/**
 * Load compact snapshot from localStorage if available
 */
export function loadDraftLocalCache(): DraftCloudPayload | null {
  try {
    const raw = localStorage.getItem(DRAFT_LOCAL_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftCloudPayload;
    if (parsed && parsed.version >= DRAFT_CLOUD_VERSION && Array.isArray(parsed.week10Slots)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save draft assignment plan to Cloud Firestore using subcollection batching (< 450KB per doc)
 * and clean undefined removal so Cloud Save never fails due to 1MB doc limits or undefined fields.
 */
export async function saveDraftToCloud(
  draftWeeklyTimetables: Record<number, SchoolTimetable>,
  gddpMap?: Record<string, string>,
  aiMap?: Record<string, string>,
  description = 'Bản dự thảo phân công chuyên môn đồng bộ đám mây'
): Promise<{ success: boolean; updatedAt: number; error?: string }> {
  try {
    const updatedAt = Date.now();
    const { week10Slots, weekDeltas } = buildCompactWeekDeltas(draftWeeklyTimetables);

    // Partition weekDeltas into batches strictly < 400KB JSON bytes each (Firestore limit is 1,048,576 bytes)
    const MAX_BATCH_BYTES = 400000;
    const batches: Array<{ batchId: string; weekDeltas: Record<string, WeekSlotDelta> }> = [];
    let currentBatchWeeks: Record<string, WeekSlotDelta> = {};
    let currentBatchBytes = 256;

    const sortedWeekKeys = Object.keys(weekDeltas).sort((a, b) => Number(a) - Number(b));
    for (const wk of sortedWeekKeys) {
      const entry = weekDeltas[wk];
      const entryBytes = JSON.stringify(entry).length + 20;

      if (Object.keys(currentBatchWeeks).length > 0 && currentBatchBytes + entryBytes > MAX_BATCH_BYTES) {
        batches.push({
          batchId: `batch_${batches.length}`,
          weekDeltas: currentBatchWeeks,
        });
        currentBatchWeeks = {};
        currentBatchBytes = 256;
      }

      currentBatchWeeks[wk] = entry;
      currentBatchBytes += entryBytes;
    }

    if (Object.keys(currentBatchWeeks).length > 0) {
      batches.push({
        batchId: `batch_${batches.length}`,
        weekDeltas: currentBatchWeeks,
      });
    }

    // 1. Write subcollection batch documents first (in chunks of 4 concurrent writes)
    for (let i = 0; i < batches.length; i += 4) {
      const chunk = batches.slice(i, i + 4);
      await Promise.all(
        chunk.map((b) => {
          const batchRef = doc(
            db,
            DRAFT_COLLECTION_NAME,
            DRAFT_ACTIVE_DOC_ID,
            DRAFT_WEEK_BATCHES_SUBCOLLECTION,
            b.batchId
          );
          const batchDoc = stripUndefined({
            batchId: b.batchId,
            updatedAt,
            weekDeltas: b.weekDeltas,
          });
          return setDoc(batchRef, batchDoc);
        })
      );
    }

    // 2. Write main active plan pointer document (~350 KB, strictly under 1MB)
    const mainPayload: DraftCloudPayload = stripUndefined({
      version: DRAFT_CLOUD_VERSION,
      updatedAt,
      lastUpdatedBy: 'Lãnh đạo nhà trường',
      deviceName:
        typeof navigator !== 'undefined'
          ? navigator.userAgent.includes('Mobile')
            ? 'Điện thoại / Tablet'
            : 'Máy tính'
          : 'Hệ thống',
      description,
      gddpCustomClassTeacherMap: gddpMap || {},
      aiCustomClassTeacherMap: aiMap || {},
      week10Slots,
      hasWeekBatches: true,
      weekBatchIds: batches.map((b) => b.batchId),
    });

    const docRef = doc(db, DRAFT_COLLECTION_NAME, DRAFT_ACTIVE_DOC_ID);
    await setDoc(docRef, mainPayload);

    // 3. Also update localStorage compact cache
    try {
      const localFull: DraftCloudPayload = {
        ...mainPayload,
        hasWeekBatches: false,
        weekDeltas,
      };
      localStorage.setItem(DRAFT_LOCAL_CACHE_KEY, JSON.stringify(localFull));
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
 * Load draft assignment plan from Cloud Firestore (merging subcollection batches if present)
 */
export async function loadDraftFromCloud(): Promise<DraftCloudPayload | null> {
  try {
    const docRef = doc(db, DRAFT_COLLECTION_NAME, DRAFT_ACTIVE_DOC_ID);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data() as DraftCloudPayload;

      if (data.hasWeekBatches && Array.isArray(data.weekBatchIds) && data.weekBatchIds.length > 0) {
        const mergedDeltas: Record<string, WeekSlotDelta> = {};
        const batchSnaps = await Promise.all(
          data.weekBatchIds.map((batchId) =>
            getDoc(
              doc(
                db,
                DRAFT_COLLECTION_NAME,
                DRAFT_ACTIVE_DOC_ID,
                DRAFT_WEEK_BATCHES_SUBCOLLECTION,
                batchId
              )
            )
          )
        );
        batchSnaps.forEach((bSnap) => {
          if (bSnap.exists()) {
            const bData = bSnap.data() as { weekDeltas?: Record<string, WeekSlotDelta> };
            if (bData?.weekDeltas) {
              Object.assign(mergedDeltas, bData.weekDeltas);
            }
          }
        });
        data.weekDeltas = mergedDeltas;
      }

      // Sync compact local cache if schema matches current version
      if ((data.version || 0) >= DRAFT_CLOUD_VERSION) {
        try {
          localStorage.setItem(DRAFT_LOCAL_CACHE_KEY, JSON.stringify(data));
        } catch {
          /* ignore */
        }
      }
      return data;
    }

    return loadDraftLocalCache();
  } catch (error) {
    console.warn('Could not read draft from Cloud Firestore, checking local cache:', error);
    return loadDraftLocalCache();
  }
}

/**
 * Reconstruct the full 35-week draft timetables from a Cloud Payload or local cache payload
 */
export function reconstructDraftFromCloudPayload(
  payload: DraftCloudPayload,
  academicYear: string,
  officialWeeklyTimetables?: Record<number, SchoolTimetable>,
  fallbackTimetable?: SchoolTimetable
): Record<number, SchoolTimetable> {
  const result: Record<number, SchoolTimetable> = {};
  const baseW10Slots = payload.week10Slots || getSlotsForWeek(10, officialWeeklyTimetables, fallbackTimetable);

  const decodeWeekDelta = (delta: WeekSlotDelta, weekNum: number): TimetableSlot[] => {
    const decoded: TimetableSlot[] = [];
    if (Array.isArray(delta.keptRanges)) {
      for (const range of delta.keptRanges) {
        for (let idx = range.s; idx <= range.e; idx++) {
          const baseSlot = baseW10Slots[idx];
          if (baseSlot) {
            decoded.push({ ...baseSlot });
          }
        }
      }
    }
    if (Array.isArray(delta.extraSlots)) {
      for (const s of delta.extraSlots) {
        decoded.push({ ...s });
      }
    }
    // Safety guard: ensure unique slot ids in case baseW10Slots lacked week suffix
    const seen = new Set<string>();
    return decoded.map((s, idx) => {
      if (s.id && !seen.has(s.id)) {
        seen.add(s.id);
        return s;
      }
      const fallbackId = `slot-w${weekNum}-${idx}-${s.classId || 'cls'}-${s.subjectId || 'sub'}`;
      seen.add(fallbackId);
      return { ...s, id: fallbackId };
    });
  };

  for (let w = 1; w <= 35; w++) {
    const delta = payload.weekDeltas?.[String(w)];
    let weekSlots: TimetableSlot[];

    if (w === 10) {
      weekSlots = baseW10Slots.map((s) => ({ ...s }));
    } else if (delta) {
      weekSlots = decodeWeekDelta(delta, w);
    } else if (w >= 11 && payload.customWeekOverrides?.[w]) {
      weekSlots = payload.customWeekOverrides[w];
    } else if (w < 10) {
      weekSlots = [...getSlotsForWeek(w, officialWeeklyTimetables, fallbackTimetable)];
    } else {
      weekSlots = baseW10Slots.map((s) => ({ ...s }));
    }

    result[w] = {
      id: `draft-tkb-week-${w}`,
      academicYear,
      semester: w <= 18 ? 'HK1' : 'HK2',
      weekNumber: w,
      slots: weekSlots,
      updatedAt: payload.updatedAt,
    };
  }

  return result;
}
