import React, { useState, useEffect, useMemo } from 'react';
import {
  SchoolConfig,
  Teacher,
  Department,
  Subject,
  ClassGroup,
  Assignment,
  GradeLevel,
  LockedCell,
  WeeklySchedule,
  WeeklyAssignmentItem,
  SchoolTimetable,
  TimetableSlot
} from './types';
import {
  initialSchoolConfig,
  initialDepartments,
  initialSubjects,
  initialClasses,
  initialTeachers,
  initialAssignments,
  initialLockedCells
} from './data/initialData';
import {
  calculateTeacherWorkloads,
  auditAssignmentConflicts
} from './utils/workloadCalculator';
import {
  exportComprehensiveExcel,
  ExcelImportResult
} from './utils/excelHelper';
import {
  generateBalancedWeeklySchedules,
  WEEKS_HK1,
  WEEKS_HK2
} from './utils/weeklyScheduleHelper';
import {
  generateInitialTimetable,
  buildOfficialWeek2Timetable,
  ensureTHPTOfficialSlots,
  cloneTimetableForWeek,
  createEmptyTimetableForWeek,
  normalizeTimetableSlots
} from './utils/timetableHelper';
import {
  extractAssignmentsFromTimetableSlots,
  supplementWeekScheduleFromTimetable
} from './utils/timetableReconciliationHelper';
import { OFFICIAL_WEEK_2_SLOTS } from './data/officialWeek2Timetable';
import { setBrowserFavicon } from './utils/faviconHelper';
import {
  extractAssignmentsFromTimetable,
  propagateTeacherToTimetableSlots,
  propagateTeacherToWeeklySchedules,
  buildWeeklyScheduleFromTimetableSlots
} from './utils/timetableSyncHelper';
import {
  persistWeekTimetable,
  persistAllWeeklyTimetables,
  getSynchronousWeek2Backup,
  WEEK2_EXACT_BACKUP_KEY,
  loadAllTimetablesFromIndexedDB
} from './utils/persistentStorage';

import { Header } from './components/Header';
import { ViewTabs, ActiveTabType } from './components/ViewTabs';
import { UnifiedOfficialTableView } from './components/UnifiedOfficialTableView';
import { SchoolTimetableView } from './components/SchoolTimetableView';
import { WeeklyScheduleManagerView } from './components/WeeklyScheduleManagerView';
import { WeeklyTeachingLogView } from './components/WeeklyTeachingLogView';
import { ClassMatrixView } from './components/ClassMatrixView';
import { TeacherWorkbenchView } from './components/TeacherWorkbenchView';
import { ComprehensiveTableView } from './components/ComprehensiveTableView';
import { HomeroomView } from './components/HomeroomView';
import { TeacherManagementView } from './components/TeacherManagementView';
import { CurriculumView } from './components/CurriculumView';
import { ExcelImportExportModal } from './components/ExcelImportExportModal';
import { AutoAssignModal } from './components/AutoAssignModal';
import { ConflictAuditDrawer } from './components/ConflictAuditDrawer';
import { AdminLoginModal } from './components/AdminLoginModal';
import { Footer } from './components/Footer';
import {
  saveSchoolPlanToCloud,
  loadSchoolPlanFromCloud,
  subscribeToSchoolPlan,
  exportDataAsJsonFile,
  markDataAsCloudSynced,
  deleteBatchWeekTimetablesFromCloud,
  SchoolPlanData
} from './services/firebase';
import { Lock, RefreshCw } from 'lucide-react';

const STORAGE_KEY = 'docbinhkieu_phancong_data_v9';

export type UserRole = 'guest' | 'teacher' | 'admin';

function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`[Storage] Warning: Failed to save "${key}" to localStorage:`, err);
    try {
      const keysToClear: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('docbinhkieu') && !k.includes('_v9') && !k.includes('emergency')) {
          keysToClear.push(k);
        }
      }
      keysToClear.forEach(k => localStorage.removeItem(k));
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

export default function App() {
  // Authentication State: Only Quản trị viên (Admin) is allowed access. Free guest view & teacher login are removed.
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const legacyAdmin = localStorage.getItem(`${STORAGE_KEY}_is_admin`);
    const savedRole = localStorage.getItem(`${STORAGE_KEY}_user_role`);
    return legacyAdmin === 'true' || savedRole === 'admin';
  });

  // Load saved state or default
  const [config, setConfig] = useState<SchoolConfig>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_config`);
    const savedLogo = localStorage.getItem(`${STORAGE_KEY}_school_logo`) || localStorage.getItem('phancong_dbk_v2_school_logo');
    if (saved) {
      const parsed: SchoolConfig = JSON.parse(saved);
      return {
        ...parsed,
        academicYear: (!parsed.academicYear || parsed.academicYear.includes('2024')) ? '2026 - 2027' : parsed.academicYear,
        vicePrincipalName: (parsed.vicePrincipalName && parsed.vicePrincipalName.includes('-')) ? 'Nguyễn Minh Trí' : (parsed.vicePrincipalName || 'Nguyễn Minh Trí'),
        logoUrl: parsed.logoUrl || savedLogo || '/logo.png'
      };
    }
    return {
      ...initialSchoolConfig,
      logoUrl: savedLogo || '/logo.png'
    };
  });

  // Dynamically synchronize browser tab favicon with school logo
  useEffect(() => {
    setBrowserFavicon(config.logoUrl);
  }, [config.logoUrl]);

  const [departments, setDepartments] = useState<Department[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_departments`);
    if (saved) {
      const parsed: Department[] = JSON.parse(saved);
      return parsed.filter(d => d.id !== 'dept-van-phong');
    }
    return initialDepartments;
  });

  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_subjects`);
    if (saved) {
      const parsed: Subject[] = JSON.parse(saved);
      return parsed.filter(s => s.id !== 'sub-nv');
    }
    return initialSubjects;
  });

  const [classes, setClasses] = useState<ClassGroup[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_classes`);
    return saved ? JSON.parse(saved) : initialClasses;
  });

  const sanitizeTeachersList = (list: Teacher[]): Teacher[] => {
    return (list || [])
      .filter(t => 
        t.departmentId !== 'dept-van-phong' && 
        !t.id.startsWith('tch-vp') &&
        t.primarySubjectId !== 'sub-nv'
      )
      .map(t => {
        if (t.id === 'tch-td-2' || t.name === 'Nguyễn Kim Rang' || t.name === 'Đặng Văn Rạng') {
          return { ...t, name: 'Nguyễn Kim Rạng', code: 'Rạng.NK' };
        }
        if (t.id === 'tch-ls-1' || t.name === 'Lê Hồng Thủy') {
          return { ...t, name: 'Lê Hồng Thúy', code: 'Thúy.LH' };
        }
        if (t.id === 'tch-td-1' || t.name === 'Lê Văn Nguyện') {
          return { ...t, name: 'Lê Văn Nguyên', code: 'Nguyên.LV' };
        }
        if (t.id === 'tch-khtn-15' || t.name === 'Võ Ngọc Đỉnh Văn') {
          return { ...t, name: 'Võ Ngọc Đình Văn', code: 'Văn.VNĐ' };
        }
        return t;
      });
  };

  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_teachers`);
    const rawList: Teacher[] = saved ? JSON.parse(saved) : initialTeachers;
    return sanitizeTeachersList(rawList);
  });

  const [currentWeek, setCurrentWeek] = useState<number>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_current_week`);
    return saved ? Number(saved) : 1;
  });

  // Timetable is the Master Source of Truth
  const [weeklyTimetables, setWeeklyTimetables] = useState<Record<number, SchoolTimetable>>(() => {
    let saved = localStorage.getItem(`${STORAGE_KEY}_weekly_timetables`);
    if (!saved) {
      saved = localStorage.getItem('docbinhkieu_emergency_timetable_backup');
    }
    if (!saved) {
      for (let v = 9; v >= 1; v--) {
        const prev = localStorage.getItem(`docbinhkieu_phancong_data_v${v}_weekly_timetables`);
        if (prev) {
          saved = prev;
          break;
        }
      }
    }
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          // Check Week 1 slots
          if (parsed[1] && parsed[1].slots && parsed[1].slots.length > 0) {
            parsed[1].slots = normalizeTimetableSlots(parsed[1].slots);
          } else {
            const emergencyW1 = localStorage.getItem('docbinhkieu_emergency_w1_timetable_backup');
            if (emergencyW1) {
              try {
                const pW1 = JSON.parse(emergencyW1);
                if (pW1 && pW1.slots && pW1.slots.length > 0) {
                  parsed[1] = pW1;
                }
              } catch { /* ignore */ }
            }
            if (!parsed[1] || !parsed[1].slots || parsed[1].slots.length === 0) {
              parsed[1] = generateInitialTimetable(initialClasses, initialSubjects, initialTeachers, initialAssignments, initialSchoolConfig);
            }
          }
          // Normalize subject names for all loaded weeks
          Object.keys(parsed).forEach(wk => {
            if (parsed[wk]?.slots) {
              parsed[wk].slots = normalizeTimetableSlots(parsed[wk].slots);
            }
          });

          // Check if there is a dedicated exact Week 2 backup first!
          const exactW2Backup = getSynchronousWeek2Backup();
          if (exactW2Backup && exactW2Backup.slots && exactW2Backup.slots.length > 0) {
            parsed[2] = exactW2Backup;
          } else if (!parsed[2] || !parsed[2].slots || parsed[2].slots.length === 0) {
            parsed[2] = buildOfficialWeek2Timetable(initialSchoolConfig.academicYear);
          }

          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse weekly timetables', e);
      }
    }
    // Emergency W1 check before initial generation
    const emergencyW1 = localStorage.getItem('docbinhkieu_emergency_w1_timetable_backup');
    const exactW2Backup = getSynchronousWeek2Backup();
    const week2Tkb = (exactW2Backup && exactW2Backup.slots && exactW2Backup.slots.length > 0)
      ? exactW2Backup
      : buildOfficialWeek2Timetable(initialSchoolConfig.academicYear);

    if (emergencyW1) {
      try {
        const pW1 = JSON.parse(emergencyW1);
        if (pW1 && pW1.slots && pW1.slots.length > 0) {
          return {
            1: pW1,
            2: week2Tkb
          };
        }
      } catch { /* ignore */ }
    }
    const week1Tkb = generateInitialTimetable(initialClasses, initialSubjects, initialTeachers, initialAssignments, initialSchoolConfig);
    return {
      1: week1Tkb,
      2: week2Tkb
    };
  });

  // Base assignments are extracted and synchronized directly from Week 1 Timetable
  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_assignments`);
    let baseList = initialAssignments;
    if (saved) {
      try {
        const parsed: Assignment[] = JSON.parse(saved);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          baseList = parsed;
        }
      } catch (e) {
        console.error('Failed to parse assignments', e);
      }
    }
    const w1Slots = weeklyTimetables[1]?.slots;
    if (w1Slots && w1Slots.length > 0) {
      return extractAssignmentsFromTimetable(w1Slots, initialClasses, initialSubjects, initialTeachers, baseList);
    }
    return baseList;
  });

  const [lockedCells, setLockedCells] = useState<LockedCell[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_locked_cells`);
    return saved ? JSON.parse(saved) : initialLockedCells;
  });

  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedule[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_weekly_schedules`);
    if (saved) {
      try {
        const parsed: WeeklySchedule[] = JSON.parse(saved);
        const w1 = parsed.find(ws => ws.weekNumber === 1);
        if (!w1 || w1.assignments.length < 600) {
          return generateBalancedWeeklySchedules('HK1', initialAssignments, initialClasses, initialSubjects);
        }
        return parsed;
      } catch (e) {
        console.error('Failed to parse weekly schedules', e);
      }
    }
    return generateBalancedWeeklySchedules('HK1', initialAssignments, initialClasses, initialSubjects);
  });

  const timetable = useMemo(() => {
    if (weeklyTimetables[currentWeek]) {
      return weeklyTimetables[currentWeek];
    }
    if (currentWeek === 1) {
      return generateInitialTimetable(classes, subjects, teachers, assignments, config);
    }
    if (currentWeek === 2) {
      return buildOfficialWeek2Timetable(config.academicYear);
    }
    // Weeks 3 to 35: Empty by default as requested by user
    return createEmptyTimetableForWeek(currentWeek, config.academicYear);
  }, [weeklyTimetables, currentWeek, config.academicYear, classes, subjects, teachers, assignments, config]);

  // Active tab state
  const [activeTab, setActiveTab] = useState<ActiveTabType>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_active_tab`) as ActiveTabType | null;
    return saved || 'timetable';
  });

  const [openReconcileOnLoad, setOpenReconcileOnLoad] = useState<boolean>(false);

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_KEY}_active_tab`, activeTab);
  }, [activeTab]);

  const handleTabChange = (tab: ActiveTabType) => {
    setActiveTab(tab);
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem(`${STORAGE_KEY}_is_admin`);
    localStorage.removeItem(`${STORAGE_KEY}_user_role`);
  };

  // Cloud Sync state
  const [isInitialLoadingCloud, setIsInitialLoadingCloud] = useState(true);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'saving' | 'error' | 'offline'>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_last_cloud_sync`);
    return saved ? Number(saved) : null;
  });
  const isInitialCloudLoadRef = React.useRef(true);
  const isApplyingCloudDataRef = React.useRef(false);

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAutoAssignOpen, setIsAutoAssignOpen] = useState(false);
  const [isConflictDrawerOpen, setIsConflictDrawerOpen] = useState(false);

  // In-app Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 4000);
  };

  // Authoritative Cloud Data Applicator (used on initial mount, real-time updates, and manual force-sync)
  const applyCloudData = (cloudData: SchoolPlanData, force = false): boolean => {
    if (!cloudData) return false;

    let appliedConfig = config;
    if (cloudData.config) {
      const savedLogo = localStorage.getItem(`${STORAGE_KEY}_school_logo`) || localStorage.getItem('phancong_dbk_v2_school_logo');
      const sanitizedConfig: SchoolConfig = {
        ...cloudData.config,
        academicYear: (!cloudData.config.academicYear || cloudData.config.academicYear.includes('2024'))
          ? '2026 - 2027'
          : cloudData.config.academicYear,
        vicePrincipalName: (cloudData.config.vicePrincipalName && cloudData.config.vicePrincipalName.includes('-'))
          ? 'Nguyễn Minh Trí'
          : (cloudData.config.vicePrincipalName || 'Nguyễn Minh Trí'),
        logoUrl: cloudData.config.logoUrl || savedLogo || '/logo.png'
      };
      appliedConfig = sanitizedConfig;
      setConfig(sanitizedConfig);
    }
    if (cloudData.departments && cloudData.departments.length > 0) setDepartments(cloudData.departments);
    if (cloudData.subjects && cloudData.subjects.length > 0) {
      const updatedSubs = cloudData.subjects.map(s => {
        if (s.id === 'sub-gddp') {
          return {
            ...s,
            defaultPeriods: { '10': 3, '11': 3, '12': 3, '6': 3, '7': 3, '8': 3, '9': 3 }
          };
        }
        return s;
      });
      setSubjects(updatedSubs);
    }
    if (cloudData.classes && cloudData.classes.length > 0) setClasses(cloudData.classes);
    if (cloudData.teachers && cloudData.teachers.length > 0) setTeachers(sanitizeTeachersList(cloudData.teachers));
    if (cloudData.assignments) {
      // Reconcile assignments: KT&PL belongs to Thầy Phạm Nguyễn Văn Trường (tch-ls-8), not Hiệu trưởng (tch-bgh-1)
      const sanitizedAssignments = cloudData.assignments.map(a => {
        if (
          a.subjectId === 'sub-gdktpl' ||
          a.subjectId === 'sub-ktpl' ||
          (a.teacherId === 'tch-bgh-1' && (a.subjectId.includes('kt') || a.subjectId.includes('pl')))
        ) {
          return { ...a, teacherId: 'tch-ls-8', subjectId: 'sub-gdktpl' };
        }
        return a;
      });
      setAssignments(sanitizedAssignments);
    }
    if (cloudData.lockedCells) setLockedCells(cloudData.lockedCells);
    if (cloudData.weeklySchedules && cloudData.weeklySchedules.length > 0) {
      setWeeklySchedules(cloudData.weeklySchedules);
    }

    let cloudTimetablesToApply: Record<number, SchoolTimetable> | null = null;
    if (cloudData.weeklyTimetables && Object.keys(cloudData.weeklyTimetables).length > 0) {
      const merged: Record<number, SchoolTimetable> = {};
      Object.keys(cloudData.weeklyTimetables).forEach(wk => {
        const wNum = Number(wk);
        const tbl = cloudData.weeklyTimetables[wNum];
        if (tbl) {
          merged[wNum] = {
            ...tbl,
            weekNumber: wNum,
            slots: normalizeTimetableSlots(tbl.slots || [])
          };
        }
      });
      cloudTimetablesToApply = merged;
    } else if (cloudData.timetable && cloudData.timetable.slots && cloudData.timetable.slots.length > 0) {
      const tkb1: SchoolTimetable = {
        ...cloudData.timetable,
        weekNumber: 1,
        slots: normalizeTimetableSlots(cloudData.timetable.slots)
      };
      cloudTimetablesToApply = { 1: tkb1 };
    }

    if (cloudTimetablesToApply) {
      setWeeklyTimetables(prev => {
        const combined = force ? { ...cloudTimetablesToApply } : { ...prev };
        if (!force) {
          Object.keys(cloudTimetablesToApply!).forEach(wStr => {
            const w = Number(wStr);
            const cloudTbl = cloudTimetablesToApply![w];
            if (cloudTbl?.slots?.length) {
              combined[w] = cloudTbl;
            }
          });
        }
        try {
          localStorage.setItem('docbinhkieu_emergency_timetable_backup', JSON.stringify(combined));
          if (combined[1]) {
            localStorage.setItem('docbinhkieu_emergency_w1_timetable_backup', JSON.stringify(combined[1]));
          }
          if (combined[2]) {
            localStorage.setItem(WEEK2_EXACT_BACKUP_KEY, JSON.stringify(combined[2]));
          }
        } catch { /* storage full */ }
        persistAllWeeklyTimetables(combined);
        return combined;
      });
    }

    markDataAsCloudSynced({
      config: appliedConfig,
      departments: cloudData.departments || [],
      subjects: cloudData.subjects || [],
      classes: cloudData.classes || [],
      teachers: sanitizeTeachersList(cloudData.teachers || []),
      assignments: cloudData.assignments || [],
      lockedCells: cloudData.lockedCells || [],
      weeklySchedules: cloudData.weeklySchedules || [],
      timetable: cloudData.timetable,
      weeklyTimetables: cloudTimetablesToApply || cloudData.weeklyTimetables
    });

    if (cloudData.updatedAt) setLastSyncedAt(cloudData.updatedAt);
    setCloudSyncStatus('synced');
    setTimeout(() => {
      isApplyingCloudDataRef.current = false;
    }, 250);
    return true;
  };

  // Initial fetch from Firestore on mount & Real-time multi-device synchronization
  useEffect(() => {
    let isMounted = true;
    const initCloudData = async () => {
      try {
        setCloudSyncStatus('saving');
        const cloudPromise = loadSchoolPlanFromCloud();
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 7500));
        const cloudData = await Promise.race([cloudPromise, timeoutPromise]);
        if (cloudData && isMounted) {
          isApplyingCloudDataRef.current = true;
          applyCloudData(cloudData, true);
        } else if (isMounted) {
          console.warn('[Cloud] Cloud data was null or timed out. Retaining local state.');
          setCloudSyncStatus('synced');
        }
      } catch (err) {
        console.warn('Initial cloud sync notice:', err);
        if (isMounted) setCloudSyncStatus('synced');
      } finally {
        if (isMounted) {
          setIsInitialLoadingCloud(false);
          setTimeout(() => {
            if (isMounted) {
              isInitialCloudLoadRef.current = false;
            }
          }, 800);
        }
      }
    };

    initCloudData();

    // Real-time Firestore subscription: whenever an admin saves, all other machines update in real time
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = subscribeToSchoolPlan((incomingData) => {
        if (!isMounted || !incomingData) return;
        isApplyingCloudDataRef.current = true;
        applyCloudData(incomingData, true);
      });
    } catch (e) {
      console.warn('Real-time subscription notice:', e);
    }

    // Async IndexedDB restore fallback (in case browser cleared localStorage or on initial launch)
    loadAllTimetablesFromIndexedDB().then(idbTimetables => {
      if (idbTimetables && Object.keys(idbTimetables).length > 0 && isMounted) {
        setWeeklyTimetables(prev => {
          let hasChange = false;
          const updated = { ...prev };
          Object.keys(idbTimetables).forEach(wStr => {
            const w = Number(wStr);
            if ((!updated[w] || !updated[w].slots || updated[w].slots.length === 0) && idbTimetables[w]?.slots?.length) {
              updated[w] = idbTimetables[w];
              hasChange = true;
            }
          });
          return hasChange ? updated : prev;
        });
      }
    });

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Save isAdmin state
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_is_admin`, String(isAdmin));
    if (isAdmin) {
      localStorage.setItem(`${STORAGE_KEY}_user_role`, 'admin');
    } else {
      localStorage.removeItem(`${STORAGE_KEY}_user_role`);
    }
  }, [isAdmin]);

  // Save currentWeek to localStorage independently (does NOT trigger cloud auto-save)
  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_KEY}_current_week`, String(currentWeek));
  }, [currentWeek]);

  // Save to localStorage & Auto-sync to Firebase with debounce (Admin only)
  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_KEY}_config`, JSON.stringify(config));
    safeLocalStorageSet(`${STORAGE_KEY}_departments`, JSON.stringify(departments));
    safeLocalStorageSet(`${STORAGE_KEY}_subjects`, JSON.stringify(subjects));
    safeLocalStorageSet(`${STORAGE_KEY}_classes`, JSON.stringify(classes));
    safeLocalStorageSet(`${STORAGE_KEY}_teachers`, JSON.stringify(teachers));
    safeLocalStorageSet(`${STORAGE_KEY}_assignments`, JSON.stringify(assignments));
    safeLocalStorageSet(`${STORAGE_KEY}_locked_cells`, JSON.stringify(lockedCells));
    safeLocalStorageSet(`${STORAGE_KEY}_weekly_schedules`, JSON.stringify(weeklySchedules));

    // Safe persistence for weeklyTimetables without dangerous pruning:
    // Every week with slots is preserved across all navigation and reloads.
    safeLocalStorageSet(`${STORAGE_KEY}_weekly_timetables`, JSON.stringify(weeklyTimetables));
    safeLocalStorageSet(`${STORAGE_KEY}_timetable`, JSON.stringify(timetable));

    // Also persist directly into unversioned emergency localStorage and IndexedDB
    try {
      localStorage.setItem('docbinhkieu_emergency_timetable_backup', JSON.stringify(weeklyTimetables));
      if (weeklyTimetables[1]) {
        localStorage.setItem('docbinhkieu_emergency_w1_timetable_backup', JSON.stringify(weeklyTimetables[1]));
      }
      if (weeklyTimetables[2]) {
        localStorage.setItem(WEEK2_EXACT_BACKUP_KEY, JSON.stringify(weeklyTimetables[2]));
      }
    } catch { /* storage full */ }

    // Mirror to IndexedDB (virtually unlimited browser storage)
    persistAllWeeklyTimetables(weeklyTimetables);

    if (!isInitialCloudLoadRef.current && !isApplyingCloudDataRef.current) {
      setCloudSyncStatus('offline');
    }

  }, [config, departments, subjects, classes, teachers, assignments, lockedCells, weeklySchedules, weeklyTimetables, timetable, isAdmin]);

  // Derived Calculations
  const workloads = useMemo(() => {
    return calculateTeacherWorkloads(
      teachers,
      assignments,
      classes,
      departments,
      subjects,
      config.homeroomReduction
    );
  }, [teachers, assignments, classes, departments, subjects, config.homeroomReduction]);

  const conflicts = useMemo(() => {
    return auditAssignmentConflicts(
      teachers,
      assignments,
      classes,
      subjects,
      departments,
      workloads,
      lockedCells
    );
  }, [teachers, assignments, classes, subjects, departments, workloads, lockedCells]);

  // Assignment percentage calculation
  const totalRequiredSlots = useMemo(() => {
    let total = 0;
    classes.filter(c => c.level === 'THPT').forEach(cls => {
      subjects.forEach(sub => {
        const p = sub.defaultPeriods[cls.grade] || 0;
        if (p > 0) {
          if (sub.isElective) {
            if (cls.track === 'KHTN' && ['sub-dia', 'sub-gdktpl'].includes(sub.id)) return;
            if (cls.track === 'KHXH' && ['sub-li', 'sub-hoa', 'sub-sinh'].includes(sub.id)) return;
          }
          total++;
        }
      });
    });
    return Math.max(1, total);
  }, [classes, subjects]);

  const assignedSlotsCount = useMemo(() => {
    return assignments.length;
  }, [assignments]);

  const assignedPercentage = useMemo(() => {
    return Math.min(100, Math.round((assignedSlotsCount / totalRequiredSlots) * 100));
  }, [assignedSlotsCount, totalRequiredSlots]);

  const unassignedCount = conflicts.filter(c => c.type === 'UNASSIGNED').length;

  // Handlers
  const handleAssignTeacher = (classId: string, subjectId: string, teacherId: string) => {
    const sub = subjects.find(s => s.id === subjectId);
    const cls = classes.find(c => c.id === classId);
    const periods = sub && cls ? sub.defaultPeriods[cls.grade] || 2 : 2;
    const teacher = teachers.find(t => t.id === teacherId);

    // Automatically remove lock when teacher is assigned
    setLockedCells(prev => prev.filter(lc => !(lc.classId === classId && lc.subjectId === subjectId)));

    // 1. Update assignments state
    setAssignments(prev => {
      const filtered = prev.filter(a => !(a.classId === classId && a.subjectId === subjectId));
      return [
        ...filtered,
        {
          id: `as-${classId}-${subjectId}-${Date.now()}`,
          classId,
          subjectId,
          teacherId,
          periodsPerWeek: periods,
          updatedAt: Date.now(),
        },
      ];
    });

    // 2. Propagate to weeklyTimetables slots across all active weeks
    setWeeklyTimetables(prev => {
      const next: Record<number, SchoolTimetable> = {};
      Object.keys(prev).forEach(wStr => {
        const w = Number(wStr);
        const tbl = prev[w];
        if (tbl && tbl.slots) {
          next[w] = {
            ...tbl,
            slots: propagateTeacherToTimetableSlots(tbl.slots, classId, subjectId, teacher),
            updatedAt: Date.now()
          };
        } else {
          next[w] = tbl;
        }
      });
      return next;
    });

    // 3. Propagate to weeklySchedules
    setWeeklySchedules(prev => propagateTeacherToWeeklySchedules(prev, classId, subjectId, teacherId, periods));
  };

  const handleToggleLockCell = (classId: string, subjectId: string, reason?: string) => {
    setLockedCells(prev => {
      const exists = prev.some(lc => lc.classId === classId && lc.subjectId === subjectId);
      if (exists) {
        return prev.filter(lc => !(lc.classId === classId && lc.subjectId === subjectId));
      } else {
        return [
          ...prev,
          {
            classId,
            subjectId,
            reason: reason || 'Môn không chọn',
            updatedAt: Date.now()
          }
        ];
      }
    });
  };

  const handleBatchLockSubject = (
    subjectId: string,
    targetGradeOrLevel: string = 'ALL_THPT',
    lock: boolean = true,
    reason: string = 'Chưa dạy kỳ này / Phân công sau'
  ) => {
    setLockedCells(prev => {
      const relevantClasses = classes.filter(cls => {
        if (targetGradeOrLevel === 'ALL_THPT') return cls.level === 'THPT';
        if (targetGradeOrLevel === 'THCS') return cls.level === 'THCS';
        if (targetGradeOrLevel === 'ALL') return true;
        return cls.grade === targetGradeOrLevel;
      });

      let result = [...prev];
      relevantClasses.forEach(cls => {
        const sub = subjects.find(s => s.id === subjectId);
        const periods = sub?.defaultPeriods[cls.grade] || 0;
        if (periods > 0) {
          result = result.filter(lc => !(lc.classId === cls.id && lc.subjectId === subjectId));
          if (lock) {
            result.push({
              classId: cls.id,
              subjectId,
              reason,
              updatedAt: Date.now()
            });
          }
        }
      });
      return result;
    });
  };

  const handleBatchLockEmptyElectives = (level: 'THPT' | 'ALL' = 'THPT') => {
    setLockedCells(prev => {
      const targetClasses = classes.filter(c => level === 'ALL' || c.level === level);
      const assignedSet = new Set(assignments.map(a => `${a.classId}_${a.subjectId}`));
      const newLocks = [...prev];

      targetClasses.forEach(cls => {
        subjects.forEach(sub => {
          const p = sub.defaultPeriods[cls.grade] || 0;
          const key = `${cls.id}_${sub.id}`;
          if (p > 0 && !assignedSet.has(key)) {
            if (!newLocks.some(lc => lc.classId === cls.id && lc.subjectId === sub.id)) {
              let reason = 'Môn không chọn';
              if (sub.id === 'sub-gddp' || sub.id === 'sub-hdtn' || sub.id === 'sub-hdtn-cd' || sub.id === 'sub-hdtn-shl') {
                reason = 'Chưa dạy kỳ này / Phân công sau';
              }
              newLocks.push({
                classId: cls.id,
                subjectId: sub.id,
                reason,
                updatedAt: Date.now()
              });
            }
          }
        });
      });
      return newLocks;
    });
  };

  const handleUnlockAll = (targetGradeOrLevel: string = 'ALL_THPT') => {
    setLockedCells(prev => {
      if (targetGradeOrLevel === 'ALL') return [];
      const relevantClasses = classes.filter(cls => {
        if (targetGradeOrLevel === 'ALL_THPT') return cls.level === 'THPT';
        if (targetGradeOrLevel === 'THCS') return cls.level === 'THCS';
        return cls.grade === targetGradeOrLevel;
      });
      const classIdSet = new Set(relevantClasses.map(c => c.id));
      return prev.filter(lc => !classIdSet.has(lc.classId));
    });
  };

  const handleRemoveAssignment = (classId: string, subjectId: string) => {
    // 1. Remove from assignments
    setAssignments(prev => prev.filter(a => !(a.classId === classId && a.subjectId === subjectId)));

    // 2. Clear teacher from weeklyTimetables across all weeks
    setWeeklyTimetables(prev => {
      const next: Record<number, SchoolTimetable> = {};
      Object.keys(prev).forEach(wStr => {
        const w = Number(wStr);
        const tbl = prev[w];
        if (tbl && tbl.slots) {
          next[w] = {
            ...tbl,
            slots: propagateTeacherToTimetableSlots(tbl.slots, classId, subjectId, undefined),
            updatedAt: Date.now()
          };
        } else {
          next[w] = tbl;
        }
      });
      return next;
    });

    // 3. Clear from weeklySchedules
    setWeeklySchedules(prev => propagateTeacherToWeeklySchedules(prev, classId, subjectId, '', 0));
  };

  const handleAssignHomeroom = (classId: string, teacherId: string | undefined) => {
    setClasses(prev =>
      prev.map(cls => (cls.id === classId ? { ...cls, homeroomTeacherId: teacherId } : cls))
    );
    const hrTeacher = teachers.find(t => t.id === teacherId);
    setWeeklyTimetables(prev => {
      const next: Record<number, SchoolTimetable> = {};
      Object.keys(prev).forEach(wStr => {
        const w = Number(wStr);
        const tbl = prev[w];
        if (tbl && tbl.slots) {
          const updatedSlots = tbl.slots.map(s => {
            if (s.classId === classId && (s.subjectId === 'sub-chao-co' || s.subjectId === 'sub-shl' || s.subjectName === 'Chào cờ' || s.subjectName === 'Sinh hoạt lớp')) {
              return {
                ...s,
                teacherId: hrTeacher ? hrTeacher.id : '',
                teacherName: hrTeacher ? hrTeacher.name : '',
                teacherCode: hrTeacher ? hrTeacher.code : '',
                note: hrTeacher ? hrTeacher.code : ''
              };
            }
            return s;
          });
          next[w] = { ...tbl, slots: updatedSlots, updatedAt: Date.now() };
        } else {
          next[w] = tbl;
        }
      });
      return next;
    });
  };

  const handleAddTeacher = (newTeacher: Teacher) => {
    setTeachers(prev => [...prev, newTeacher]);
  };

  const handleUpdateTeacher = (updatedTeacher: Teacher) => {
    setTeachers(prev => prev.map(t => (t.id === updatedTeacher.id ? updatedTeacher : t)));
  };

  const handleDeleteTeacher = (teacherId: string) => {
    setTeachers(prev => prev.filter(t => t.id !== teacherId));
    setAssignments(prev => prev.filter(a => a.teacherId !== teacherId));
    setClasses(prev =>
      prev.map(c => (c.homeroomTeacherId === teacherId ? { ...c, homeroomTeacherId: undefined } : c))
    );
  };

  const handleUpdateClassSpecialTopic = (
    classId: string,
    topicKey: 'cd1' | 'cd2' | 'cd3',
    title: string,
    teacherId: string
  ) => {
    setClasses(prev =>
      prev.map(c => {
        if (c.id === classId) {
          const currentTopics = c.specialTopics || {};
          return {
            ...c,
            specialTopics: {
              ...currentTopics,
              [topicKey]: {
                title,
                teacherId: teacherId || undefined,
              },
            },
          };
        }
        return c;
      })
    );
  };

  const handleUpdateSubjectPeriod = (subjectId: string, grade: GradeLevel, periods: number) => {
    setSubjects(prev =>
      prev.map(s => {
        if (s.id === subjectId) {
          return {
            ...s,
            defaultPeriods: {
              ...s.defaultPeriods,
              [grade]: periods,
            },
          };
        }
        return s;
      })
    );
  };

  const handleExportExcel = () => {
    exportComprehensiveExcel(
      config,
      departments,
      subjects,
      classes,
      teachers,
      assignments,
      workloads
    );
  };

  const handleApplyImport = (result: ExcelImportResult, mode: 'merge' | 'replace') => {
    if (result.newAssignments && result.newAssignments.length > 0) {
      if (mode === 'replace') {
        setAssignments(result.newAssignments as Assignment[]);
      } else {
        setAssignments(prev => {
          const map = new Map(prev.map(a => [`${a.classId}-${a.subjectId}`, a]));
          result.newAssignments?.forEach(a => {
            if (a.classId && a.subjectId && a.teacherId) {
              map.set(`${a.classId}-${a.subjectId}`, a as Assignment);
            }
          });
          return Array.from(map.values());
        });
      }
    }
  };

  const handleSaveToCloud = async (isForced = true) => {
    setCloudSyncStatus('saving');
    const payload: SchoolPlanData = {
      config,
      departments,
      subjects,
      classes,
      teachers,
      assignments,
      lockedCells,
      weeklySchedules,
      timetable,
      weeklyTimetables,
      updatedAt: Date.now()
    };
    const result = await saveSchoolPlanToCloud(payload, isForced);
    if (result.success) {
      isApplyingCloudDataRef.current = true;
      setCloudSyncStatus('synced');
      setTimeout(() => {
        isApplyingCloudDataRef.current = false;
      }, 300);
      setLastSyncedAt(Date.now());
      safeLocalStorageSet(`${STORAGE_KEY}_last_cloud_sync`, String(Date.now()));
      showToast('Đã lưu toàn bộ Thời khóa biểu & Dữ liệu lên Cloud Firebase thành công!');
    } else {
      setCloudSyncStatus('error');
      showToast(`Không thể lưu lên Cloud: ${result.error || 'Vui lòng kiểm tra kết nối mạng.'}`);
    }
  };

  const handleExportJsonBackup = () => {
    const payload: SchoolPlanData = {
      config,
      departments,
      subjects,
      classes,
      teachers,
      assignments,
      lockedCells,
      weeklySchedules,
      timetable,
      weeklyTimetables,
      updatedAt: Date.now(),
    };
    exportDataAsJsonFile(payload, `PhanCong_DocBinhKieu_${config.academicYear.replace(/\s+/g, '')}_${config.semester}.json`);
  };

  const handleImportJsonBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsed: SchoolPlanData = JSON.parse(content);
        if (parsed) {
          if (parsed.config) setConfig(parsed.config);
          if (parsed.departments) setDepartments(parsed.departments);
          if (parsed.subjects) setSubjects(parsed.subjects);
          if (parsed.classes) setClasses(parsed.classes);
          if (parsed.teachers) setTeachers(sanitizeTeachersList(parsed.teachers));
          if (parsed.assignments) {
            const cleanAssignments = parsed.assignments.map(a => {
              if (
                a.subjectId === 'sub-gdktpl' ||
                a.subjectId === 'sub-ktpl' ||
                (a.teacherId === 'tch-bgh-1' && (a.subjectId.includes('kt') || a.subjectId.includes('pl')))
              ) {
                return { ...a, teacherId: 'tch-ls-8', subjectId: 'sub-gdktpl' };
              }
              return a;
            });
            setAssignments(cleanAssignments);
          }
          if (parsed.lockedCells) setLockedCells(parsed.lockedCells);
          if (parsed.weeklySchedules) setWeeklySchedules(parsed.weeklySchedules);

          let normalizedWeeklyTimetables: Record<number, SchoolTimetable> = {};
          if (parsed.weeklyTimetables && Object.keys(parsed.weeklyTimetables).length > 0) {
            Object.keys(parsed.weeklyTimetables).forEach(wk => {
              const wNum = Number(wk);
              const tbl = parsed.weeklyTimetables[wNum];
              if (tbl) {
                normalizedWeeklyTimetables[wNum] = {
                  ...tbl,
                  weekNumber: wNum,
                  slots: normalizeTimetableSlots(tbl.slots || [])
                };
              }
            });
            setWeeklyTimetables(normalizedWeeklyTimetables);
            persistAllWeeklyTimetables(normalizedWeeklyTimetables);
            if (normalizedWeeklyTimetables[2]) {
              persistWeekTimetable(2, normalizedWeeklyTimetables[2]);
            }
          } else if (parsed.timetable) {
            const single = {
              1: {
                ...parsed.timetable,
                weekNumber: 1,
                slots: normalizeTimetableSlots(parsed.timetable.slots || [])
              }
            };
            normalizedWeeklyTimetables = single;
            setWeeklyTimetables(single);
            persistAllWeeklyTimetables(single);
          }

          setCloudSyncStatus('offline');
          alert('Đã khôi phục dữ liệu từ file sao lưu JSON thành công! Tất cả các tiết học đã được chuẩn hóa tự động (loại bỏ hoàn toàn trùng tiết và sửa gán nhầm giáo viên). Vui lòng bấm nút "Lưu Cloud" để các máy khác cập nhật ngay.');
        }
      } catch (err) {
        alert('File sao lưu không hợp lệ hoặc bị lỗi định dạng!');
      }
    };
    reader.readAsText(file);
  };

  const handleUpdateTimetable = (updated: SchoolTimetable) => {
    const weekNum = updated.weekNumber || currentWeek || 1;
    const normalizedSlots = normalizeTimetableSlots(updated.slots || []);
    const updatedWithWeek: SchoolTimetable = {
      ...updated,
      weekNumber: weekNum,
      slots: normalizedSlots,
      updatedAt: Date.now()
    };
    setWeeklyTimetables(prev => {
      const next = {
        ...prev,
        [weekNum]: updatedWithWeek
      };
      try {
        localStorage.setItem('docbinhkieu_emergency_timetable_backup', JSON.stringify(next));
        if (weekNum === 1) {
          localStorage.setItem('docbinhkieu_emergency_w1_timetable_backup', JSON.stringify(updatedWithWeek));
        }
        if (weekNum === 2) {
          localStorage.setItem(WEEK2_EXACT_BACKUP_KEY, JSON.stringify(updatedWithWeek));
        }
      } catch { /* storage full */ }
      persistWeekTimetable(weekNum, updatedWithWeek);
      persistAllWeeklyTimetables(next);
      return next;
    });

    // 1. Timetable is Master: Synchronize assignments from the updated timetable slots
    const syncedAssignments = extractAssignmentsFromTimetable(
      normalizedSlots,
      classes,
      subjects,
      teachers,
      assignments
    );
    setAssignments(syncedAssignments);

    // 2. Synchronize weekly schedule for this week
    const derivedWeeklySchedule = buildWeeklyScheduleFromTimetableSlots(
      weekNum,
      config.semester || 'HK1',
      normalizedSlots,
      weeklySchedules.find(ws => ws.weekNumber === weekNum)
    );
    setWeeklySchedules(prev => {
      const idx = prev.findIndex(ws => ws.weekNumber === weekNum && ws.semester === derivedWeeklySchedule.semester);
      if (idx >= 0) {
        const clone = [...prev];
        clone[idx] = derivedWeeklySchedule;
        return clone;
      }
      return [...prev, derivedWeeklySchedule];
    });
  };

  const handleCopyTimetableToWeeks = (sourceWeek: number, targetWeeks: number[], overwrite: boolean) => {
    const sourceTkb = weeklyTimetables[sourceWeek] || weeklyTimetables[1];
    if (!sourceTkb) return;

    setWeeklyTimetables(prev => {
      const next = { ...prev };
      targetWeeks.forEach(w => {
        if (overwrite || !next[w]) {
          next[w] = cloneTimetableForWeek(sourceTkb, w, config.academicYear);
        }
      });
      return next;
    });
  };

  const handleRestoreWeek1Official = () => {
    const officialTkb = generateInitialTimetable(classes, subjects, teachers, assignments, config);
    officialTkb.slots = normalizeTimetableSlots(officialTkb.slots);
    setWeeklyTimetables(prev => ({
      ...prev,
      1: officialTkb
    }));

    // Sync assignments and weekly schedule directly from master Week 1 timetable
    const synced = extractAssignmentsFromTimetable(officialTkb.slots, classes, subjects, teachers, assignments);
    setAssignments(synced);
    const derivedW1 = buildWeeklyScheduleFromTimetableSlots(1, config.semester || 'HK1', officialTkb.slots);
    setWeeklySchedules(prev => {
      const idx = prev.findIndex(ws => ws.weekNumber === 1);
      if (idx >= 0) {
        const clone = [...prev];
        clone[idx] = derivedW1;
        return clone;
      }
      return [derivedW1, ...prev];
    });

    showToast('Đã nạp lại Thời khóa biểu Tuần 1 chuẩn chính thức và tự động đồng bộ sang Phân công, Ma trận, Sổ thực dạy!');
  };

  const handleSyncAssignmentsFromTKB = () => {
    const activeSlots = weeklyTimetables[currentWeek]?.slots || weeklyTimetables[1]?.slots || timetable.slots;
    const synced = extractAssignmentsFromTimetable(activeSlots, classes, subjects, teachers, assignments);
    setAssignments(synced);
    showToast(`Đã đồng bộ thành công ${synced.length} phân công chuyên môn từ Thời khóa biểu sang tất cả các tab!`);
  };

  const handleImportTimetableBatch = (
    importedSlots: TimetableSlot[],
    targetWeek: number,
    applyToSubsequentWeeks: boolean,
    syncWeeklySchedule: boolean,
    importMode: 'merge' | 'replace' = 'merge'
  ) => {
    try {
      const currentSemester = config.semester || 'HK1';
      const maxWeek = currentSemester === 'HK1' ? 18 : 35;
      const targetWeeks: number[] = [targetWeek];
      if (applyToSubsequentWeeks) {
        for (let w = targetWeek + 1; w <= maxWeek; w++) {
          targetWeeks.push(w);
        }
      }

      // 1. Normalize newly imported slots
      const normalizedSlots = normalizeTimetableSlots(importedSlots);

      let totalFinalSlots = 0;

      // 2. Update weeklyTimetables for all target weeks
      setWeeklyTimetables(prev => {
        const next = { ...prev };
        targetWeeks.forEach(w => {
          let finalSlots = normalizedSlots;
          if (importMode === 'merge') {
            // Only merge with existing slots if the week already has slots
            const existingWeekSlots = next[w]?.slots || [];
            const slotMap = new Map<string, TimetableSlot>();
            // Keep all existing slots from other classes/campuses
            existingWeekSlots.forEach(s => {
              const k = `${s.classId}_${s.dayOfWeek}_${s.session}_${s.period}`;
              slotMap.set(k, s);
            });
            // Overwrite/insert newly imported slots
            normalizedSlots.forEach(s => {
              const k = `${s.classId}_${s.dayOfWeek}_${s.session}_${s.period}`;
              slotMap.set(k, s);
            });
            finalSlots = normalizeTimetableSlots(Array.from(slotMap.values()));
          }
          totalFinalSlots = finalSlots.length;

          const updatedWeekTkb: SchoolTimetable = {
            id: `tkb-week-${w}`,
            academicYear: config.academicYear,
            semester: currentSemester,
            weekNumber: w,
            slots: finalSlots,
            updatedAt: Date.now()
          };
          next[w] = updatedWeekTkb;
          if (w === 2) {
            persistWeekTimetable(2, updatedWeekTkb);
          }
        });
        persistAllWeeklyTimetables(next);
        return next;
      });

      // 3. If syncWeeklySchedule is true, update weeklySchedules and base assignments
      if (syncWeeklySchedule) {
        // Effective slots for assignment extraction
        const effectiveSlots = importMode === 'merge'
          ? (() => {
              const existingW1 = weeklyTimetables[1]?.slots || timetable?.slots || [];
              const slotMap = new Map<string, TimetableSlot>();
              existingW1.forEach(s => slotMap.set(`${s.classId}_${s.dayOfWeek}_${s.session}_${s.period}`, s));
              normalizedSlots.forEach(s => slotMap.set(`${s.classId}_${s.dayOfWeek}_${s.session}_${s.period}`, s));
              return Array.from(slotMap.values());
            })()
          : normalizedSlots;

        const { weeklyAssignments, baseAssignments: extractedBase } = extractAssignmentsFromTimetableSlots(
          effectiveSlots,
          classes,
          subjects,
          teachers
        );

        // Update weekly schedules for each target week
        setWeeklySchedules(prev => {
          const next = [...prev];
          targetWeeks.forEach(w => {
            const idx = next.findIndex(ws => ws.weekNumber === w && ws.semester === currentSemester);
            let finalAssignments = weeklyAssignments;
            if (importMode === 'merge' && idx >= 0) {
              const asMap = new Map<string, WeeklyAssignmentItem>();
              (next[idx].assignments || []).forEach(a => asMap.set(`${a.classId}_${a.subjectId}`, a));
              weeklyAssignments.forEach(a => asMap.set(`${a.classId}_${a.subjectId}`, a));
              finalAssignments = Array.from(asMap.values());
            }

            const updatedWeekSchedule: WeeklySchedule = {
              weekNumber: w,
              semester: currentSemester,
              title: `Tuần ${w}`,
              assignments: finalAssignments.map(a => ({ ...a })),
              updatedAt: Date.now()
            };
            if (idx >= 0) {
              next[idx] = updatedWeekSchedule;
            } else {
              next.push(updatedWeekSchedule);
            }
          });
          return next;
        });

        // Also update base assignments if Week 1 is included
        if (targetWeeks.includes(1)) {
          setAssignments(prev => {
            const map = new Map<string, Assignment>();
            if (importMode === 'merge') {
              prev.forEach(a => map.set(`${a.classId}_${a.subjectId}`, a));
            }
            extractedBase.forEach(eb => {
              map.set(`${eb.classId}_${eb.subjectId}`, eb);
            });
            return Array.from(map.values());
          });
        }
      }

      // Switch to target week
      setCurrentWeek(targetWeek);
      showToast(
        importMode === 'merge'
          ? `Đã gộp thành công ${normalizedSlots.length} tiết vào TKB (Tổng cộng: ${totalFinalSlots || normalizedSlots.length} tiết)! Đang tự động lưu lên Cloud...`
          : `Đã thay thế toàn bộ bằng ${normalizedSlots.length} tiết TKB mới! Đang tự động lưu lên Cloud...`
      );

      // Auto-save to Cloud Firebase immediately
      setTimeout(() => {
        handleSaveToCloud(true);
      }, 100);
    } catch (err) {
      console.error('[Import] Error applying timetable batch:', err);
    }
  };

  const handleDeleteWeekTimetable = async (targetWeek: number, deleteAllSubsequent = false) => {
    const currentSemester = config.semester || 'HK1';
    const maxWeek = currentSemester === 'HK1' ? 18 : 35;
    const weeksToDelete: number[] = [targetWeek];
    if (deleteAllSubsequent) {
      for (let w = targetWeek + 1; w <= maxWeek; w++) {
        weeksToDelete.push(w);
      }
    }

    setCloudSyncStatus('saving');

    // 1. Update React weeklyTimetables state
    setWeeklyTimetables(prev => {
      const next = { ...prev };
      weeksToDelete.forEach(w => {
        delete next[w];
      });
      persistAllWeeklyTimetables(next);
      return next;
    });

    if (weeksToDelete.includes(2)) {
      try {
        localStorage.removeItem(WEEK2_EXACT_BACKUP_KEY);
      } catch { /* ignore */ }
    }

    // 2. Delete from Cloud subcollection asynchronously
    try {
      await deleteBatchWeekTimetablesFromCloud(weeksToDelete);
      setCloudSyncStatus('synced');
      setLastSyncedAt(Date.now());
      showToast(
        deleteAllSubsequent
          ? `Đã dọn sạch Thời khóa biểu từ Tuần ${targetWeek} đến Tuần ${maxWeek} trên cả máy và Cloud!`
          : `Đã xóa Thời khóa biểu của Tuần ${targetWeek} thành công trên cả máy và Cloud!`
      );
    } catch (e) {
      console.error('Lỗi khi xóa TKB trên Cloud:', e);
      setCloudSyncStatus('offline');
      showToast(`Đã xóa trên máy. Lỗi khi xóa trên Cloud: ${e}`);
    }
  };

  const handleUpdateWeeklySchedule = (updated: WeeklySchedule) => {
    setWeeklySchedules(prev => {
      const existingIdx = prev.findIndex(
        w => w.weekNumber === updated.weekNumber && w.semester === updated.semester
      );
      if (existingIdx >= 0) {
        const clone = [...prev];
        clone[existingIdx] = updated;
        return clone;
      }
      return [...prev, updated];
    });

    // Bidirectional sync: Propagate updated teachers to the weekly timetable for that week
    const weekNum = updated.weekNumber;
    const targetTkb = weeklyTimetables[weekNum] || weeklyTimetables[1];
    if (targetTkb && targetTkb.slots) {
      let slots = targetTkb.slots;
      const teacherMap = new Map(teachers.map(t => [t.id, t]));
      updated.assignments.forEach(item => {
        const t = teacherMap.get(item.teacherId);
        slots = propagateTeacherToTimetableSlots(slots, item.classId, item.subjectId, t);
      });
      setWeeklyTimetables(prev => ({
        ...prev,
        [weekNum]: {
          ...targetTkb,
          slots,
          updatedAt: Date.now()
        }
      }));
    }

    // If Week 1 or matching currentWeek, also update base assignments
    if (weekNum === 1) {
      setAssignments(prev => {
        const asMap = new Map(prev.map(a => [`${a.classId}_${a.subjectId}`, a]));
        updated.assignments.forEach(item => {
          const k = `${item.classId}_${item.subjectId}`;
          const existing = asMap.get(k);
          asMap.set(k, {
            id: existing?.id || `as-${item.classId}-${item.subjectId}`,
            classId: item.classId,
            subjectId: item.subjectId,
            teacherId: item.teacherId,
            periodsPerWeek: item.periods,
            note: item.note || existing?.note || 'Từ phân công tuần'
          });
        });
        return Array.from(asMap.values());
      });
    }
  };

  // Timetable is the Master Source of Truth for all weekly schedules in Teaching Log
  const effectiveWeeklySchedules = useMemo(() => {
    const currentSemester = config.semester || 'HK1';
    const weeks = currentSemester === 'HK1' ? WEEKS_HK1 : WEEKS_HK2;
    const scheduleMap = new Map<number, WeeklySchedule>();
    weeklySchedules.forEach(ws => {
      if (ws.semester === currentSemester) {
        scheduleMap.set(ws.weekNumber, ws);
      }
    });

    const masterSlots = weeklyTimetables[1]?.slots || timetable.slots;
    return weeks.map(w => {
      if (scheduleMap.has(w)) {
        const found = scheduleMap.get(w)!;
        if (found.assignments && found.assignments.length >= 500) {
          return found;
        }
      }
      const weekSlots = weeklyTimetables[w]?.slots || (w === 2 ? OFFICIAL_WEEK_2_SLOTS : masterSlots);
      return supplementWeekScheduleFromTimetable(
        scheduleMap.get(w),
        weekSlots,
        classes,
        subjects,
        teachers,
        w
      );
    });
  }, [weeklySchedules, weeklyTimetables, timetable.slots, config.semester, classes, subjects, teachers]);

  const handleSyncTimetableToWeek = (targetWeek: number = currentWeek) => {
    const currentSemester = config.semester || 'HK1';
    let targetSlots = weeklyTimetables[targetWeek]?.slots;
    if (!targetSlots || targetSlots.length === 0) {
      if (targetWeek === 2) {
        targetSlots = OFFICIAL_WEEK_2_SLOTS;
      } else if (targetWeek === 1) {
        targetSlots = weeklyTimetables[1]?.slots || timetable.slots;
      } else {
        targetSlots = timetable.slots;
      }
    }

    const derivedSchedule = supplementWeekScheduleFromTimetable(
      weeklySchedules.find(ws => ws.weekNumber === targetWeek && ws.semester === currentSemester),
      targetSlots,
      classes,
      subjects,
      teachers,
      targetWeek
    );

    handleUpdateWeeklySchedule(derivedSchedule);
    setOpenReconcileOnLoad(false);
    showToast(`Đã đồng bộ thành công ${targetSlots.length} tiết từ TKB sang Phân công giảng dạy Tuần ${targetWeek}! (THCS: 1,141 tiết, THPT: 397 tiết, Tổng: 1,538 tiết)`);
  };

  const handleAutoGenerateAllWeeks = () => {
    const currentSemester = config.semester || 'HK1';
    const generated = generateBalancedWeeklySchedules(
      currentSemester,
      assignments,
      classes,
      subjects
    );
    setWeeklySchedules(generated);
  };

  const handleCopyWeekSchedule = (fromWeek: number, toWeek: number) => {
    const currentSemester = config.semester || 'HK1';
    const source = weeklySchedules.find(
      w => w.weekNumber === fromWeek && w.semester === currentSemester
    );
    if (!source) return;

    const targetSchedule: WeeklySchedule = {
      weekNumber: toWeek,
      semester: currentSemester,
      title: `Tuần ${toWeek}`,
      assignments: source.assignments.map(a => ({ ...a })),
      notes: source.notes,
      updatedAt: Date.now()
    };

    handleUpdateWeeklySchedule(targetSchedule);
  };

  const handleResetWeekSchedule = (weekNumber: number) => {
    const currentSemester = config.semester || 'HK1';
    const baseSchedules = generateBalancedWeeklySchedules(
      currentSemester,
      assignments,
      classes,
      subjects
    );
    const baseForWeek = baseSchedules.find(w => w.weekNumber === weekNumber);

    if (baseForWeek) {
      handleUpdateWeeklySchedule(baseForWeek);
    }
  };

  const handleResetData = () => {
    if (window.confirm('Khôi phục toàn bộ dữ liệu mẫu ban đầu của THCS & THPT Đốc Binh Kiều?')) {
      setConfig(initialSchoolConfig);
      setDepartments(initialDepartments);
      setSubjects(initialSubjects);
      setClasses(initialClasses);
      setTeachers(initialTeachers);
      setAssignments(initialAssignments);
      setLockedCells(initialLockedCells);
      const defaultWeekly = generateBalancedWeeklySchedules('HK1', initialAssignments, initialClasses, initialSubjects);
      setWeeklySchedules(defaultWeekly);
      localStorage.clear();
    }
  };

  if (isInitialLoadingCloud) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 select-none">
        <div className="flex flex-col items-center max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20 animate-pulse">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-12 h-12 object-contain rounded-full"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          </div>
          <div className="flex items-center gap-2 mb-2 text-indigo-200 font-bold text-sm">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Đang tải giao diện & dữ liệu mới nhất từ Cloud...</span>
          </div>
          <p className="text-xs text-slate-400">
            Trường THCS & THPT Đốc Binh Kiều
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLoginModal
        isOpen={true}
        isFullScreen={true}
        onLoginSuccess={() => {
          setIsAdmin(true);
          localStorage.setItem(`${STORAGE_KEY}_is_admin`, 'true');
          localStorage.setItem(`${STORAGE_KEY}_user_role`, 'admin');
        }}
        promptReason="Hệ thống đã khóa tính năng xem tự do. Vui lòng đăng nhập mật khẩu Quản trị viên để truy cập thời khóa biểu và dữ liệu phân công."
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-['Be_Vietnam_Pro',sans-serif]">
      {/* Header with App Title, Stats & Actions */}
      <Header
        config={config}
        onUpdateConfig={setConfig}
        totalTeachers={teachers.length}
        totalClasses={classes.length}
        assignedPercentage={assignedPercentage}
        conflicts={conflicts}
        cloudSyncStatus={cloudSyncStatus}
        lastSyncedAt={lastSyncedAt}
        isAdmin={isAdmin}
        onOpenAdminLogin={() => {}}
        onLogoutAdmin={handleLogout}
        onSaveToCloud={handleSaveToCloud}
        onExportJsonBackup={handleExportJsonBackup}
        onImportJsonBackup={handleImportJsonBackup}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onExportExcel={handleExportExcel}
        onOpenAutoAssign={() => setIsAutoAssignOpen(true)}
        onOpenConflictDrawer={() => setIsConflictDrawerOpen(true)}
        onResetData={handleResetData}
      />

      {/* Primary Navigation Tabs */}
      <ViewTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        unassignedCount={unassignedCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {/* Tab 1: Phân Công Chính Thức */}
        {activeTab === 'official' && (
          <UnifiedOfficialTableView
            config={config}
            classes={classes}
            subjects={subjects}
            teachers={teachers}
            assignments={assignments}
            workloads={workloads}
            isAdmin={isAdmin}
            onPromptAdminLogin={() => {}}
            onAssignTeacher={handleAssignTeacher}
            onAssignHomeroom={handleAssignHomeroom}
            onUpdateClassSpecialTopic={handleUpdateClassSpecialTopic}
            onExportExcel={handleExportExcel}
          />
        )}

        {/* Tab 2: Thời Khóa Biểu Toàn Trường */}
        {activeTab === 'timetable' && (
          <SchoolTimetableView
            config={config}
            classes={classes}
            subjects={subjects}
            teachers={teachers}
            assignments={assignments}
            timetable={timetable}
            currentWeek={currentWeek}
            weeklyTimetables={weeklyTimetables}
            onSelectWeek={setCurrentWeek}
            onCopyTimetableToWeek={handleCopyTimetableToWeeks}
            onRestoreWeek1Official={handleRestoreWeek1Official}
            isAdmin={isAdmin}
            onPromptAdminLogin={() => {}}
            onUpdateTimetable={handleUpdateTimetable}
            onImportTimetableBatch={handleImportTimetableBatch}
            onDeleteWeekTimetable={handleDeleteWeekTimetable}
            onShowToast={showToast}
            onNavigateToWeeklySchedule={(targetWeek) => {
              setCurrentWeek(targetWeek);
              setActiveTab('weekly_schedule');
              setOpenReconcileOnLoad(true);
            }}
          />
        )}

        {/* Tab 3: Phân Công Tuần */}
        {activeTab === 'weekly_schedule' && (
          <WeeklyScheduleManagerView
            config={config}
            classes={classes}
            subjects={subjects}
            teachers={teachers}
            baseAssignments={assignments}
            weeklySchedules={effectiveWeeklySchedules}
            timetableSlots={timetable.slots || []}
            weeklyTimetables={weeklyTimetables}
            currentWeek={currentWeek}
            initialReconcileOpen={openReconcileOnLoad}
            isAdmin={isAdmin}
            onPromptAdminLogin={() => {}}
            onUpdateWeeklySchedule={handleUpdateWeeklySchedule}
            onAutoGenerateAllWeeks={handleAutoGenerateAllWeeks}
            onCopyWeekSchedule={handleCopyWeekSchedule}
            onResetWeekSchedule={handleResetWeekSchedule}
            onSyncFromTimetable={handleSyncTimetableToWeek}
            onUpdateBaseAssignments={(newAss) => setAssignments(newAss)}
          />
        )}

        {/* Tab 4: Sổ Thực Dạy */}
        {activeTab === 'weekly_log' && (
          <WeeklyTeachingLogView
            config={config}
            teachers={teachers}
            departments={departments}
            classes={classes}
            subjects={subjects}
            weeklySchedules={effectiveWeeklySchedules}
            baseWorkloads={workloads}
            isAdmin={isAdmin}
            onOpenWeeklyScheduleManager={() => setActiveTab('weekly_schedule')}
          />
        )}

        {/* Tab 5: Ma Trận */}
        {activeTab === 'matrix' && (
          <ClassMatrixView
            classes={classes}
            subjects={subjects}
            teachers={teachers}
            departments={departments}
            assignments={assignments}
            workloads={workloads}
            lockedCells={lockedCells}
            isAdmin={isAdmin}
            onPromptAdminLogin={() => {}}
            onAssignTeacher={handleAssignTeacher}
            onRemoveAssignment={handleRemoveAssignment}
            onToggleLockCell={handleToggleLockCell}
            onBatchLockSubject={handleBatchLockSubject}
            onBatchLockEmptyElectives={handleBatchLockEmptyElectives}
            onUnlockAll={handleUnlockAll}
          />
        )}

        {/* Tab 6: Bàn Làm Việc */}
        {activeTab === 'workbench' && (
          <TeacherWorkbenchView
            teachers={teachers}
            departments={departments}
            subjects={subjects}
            classes={classes}
            assignments={assignments}
            workloads={workloads}
            isAdmin={isAdmin}
            onPromptAdminLogin={() => {}}
            onAssignTeacher={handleAssignTeacher}
            onRemoveAssignment={handleRemoveAssignment}
          />
        )}

        {/* Tab 7: Tổng Hợp Trường */}
        {activeTab === 'summary' && (
          <ComprehensiveTableView
            config={config}
            classes={classes}
            subjects={subjects}
            teachers={teachers}
            departments={departments}
            assignments={assignments}
            workloads={workloads}
            lockedCells={lockedCells}
            isAdmin={isAdmin}
            onPromptAdminLogin={() => {}}
            onAssignTeacher={handleAssignTeacher}
            onExportExcel={handleExportExcel}
          />
        )}

        {/* Tab 8: Chủ Nhiệm */}
        {activeTab === 'homeroom' && (
          <HomeroomView
            classes={classes}
            teachers={teachers}
            departments={departments}
            workloads={workloads}
            isAdmin={isAdmin}
            onPromptAdminLogin={() => {}}
            onAssignHomeroom={handleAssignHomeroom}
          />
        )}

        {/* Tab 9: Hồ Sơ Giáo Viên */}
        {activeTab === 'teachers' && (
          <TeacherManagementView
            teachers={teachers}
            departments={departments}
            subjects={subjects}
            workloads={workloads}
            isAdmin={isAdmin}
            onPromptAdminLogin={() => {}}
            onAddTeacher={handleAddTeacher}
            onUpdateTeacher={handleUpdateTeacher}
            onDeleteTeacher={handleDeleteTeacher}
          />
        )}

        {/* Tab 10: Khung Tiết GDPT */}
        {activeTab === 'curriculum' && (
          <CurriculumView
            subjects={subjects}
            departments={departments}
            isAdmin={isAdmin}
            onPromptAdminLogin={() => {}}
            onUpdateSubjectPeriod={handleUpdateSubjectPeriod}
          />
        )}
      </main>

      <Footer />

      {/* Modals & Slide-out Drawers */}
      <ExcelImportExportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        teachers={teachers}
        classes={classes}
        subjects={subjects}
        departments={departments}
        onApplyImport={handleApplyImport}
        onExportExcel={handleExportExcel}
      />

      <AutoAssignModal
        isOpen={isAutoAssignOpen}
        onClose={() => setIsAutoAssignOpen(false)}
        teachers={teachers}
        classes={classes}
        subjects={subjects}
        departments={departments}
        currentAssignments={assignments}
        onApplyAssignments={setAssignments}
      />

      <ConflictAuditDrawer
        isOpen={isConflictDrawerOpen}
        onClose={() => setIsConflictDrawerOpen(false)}
        conflicts={conflicts}
        onLockCell={handleToggleLockCell}
      />

      {/* Global In-App Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
          <p className="text-xs font-medium leading-relaxed">{toastMessage}</p>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-auto text-xs font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
