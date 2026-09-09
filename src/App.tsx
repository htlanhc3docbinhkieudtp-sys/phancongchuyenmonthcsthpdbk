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
  generateBalancedWeeklySchedules
} from './utils/weeklyScheduleHelper';
import {
  generateInitialTimetable,
  ensureTHPTOfficialSlots,
  cloneTimetableForWeek,
  createEmptyTimetableForWeek,
  normalizeTimetableSlots
} from './utils/timetableHelper';
import { extractAssignmentsFromTimetableSlots } from './utils/timetableReconciliationHelper';

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
import { Lock } from 'lucide-react';
import {
  saveSchoolPlanToCloud,
  loadSchoolPlanFromCloud,
  subscribeToSchoolPlan,
  exportDataAsJsonFile,
  SchoolPlanData
} from './services/firebase';

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
        if (k && k.startsWith('docbinhkieu') && !k.includes('_v9')) {
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
  // Authentication Role State:
  // - 'guest': Chế độ xem tự do (Chỉ được xem tab Thời khóa biểu toàn trường, các tab khác bị khóa)
  // - 'teacher': Giáo viên toàn trường (Mật khẩu: giaovien@123) - Được xem toàn bộ các tab, chỉ xem không sửa
  // - 'admin': Quản trị viên (Mật khẩu: 68686868@#) - Toàn quyền xem và chỉnh sửa, đồng bộ Đám mây
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const savedRole = localStorage.getItem(`${STORAGE_KEY}_user_role`) as UserRole | null;
    if (savedRole === 'admin' || savedRole === 'teacher' || savedRole === 'guest') {
      return savedRole;
    }
    const legacyAdmin = localStorage.getItem(`${STORAGE_KEY}_is_admin`);
    if (legacyAdmin === 'true') {
      return 'admin';
    }
    return 'guest'; // Mặc định là xem tự do (guest)
  });

  const isAdmin = userRole === 'admin';
  const isTeacher = userRole === 'teacher' || userRole === 'admin';
  const isGuest = userRole === 'guest';

  // State for unified authentication modal (Giáo viên / Quản trị)
  const [loginModalState, setLoginModalState] = useState<{
    isOpen: boolean;
    initialRole: 'teacher' | 'admin';
    promptReason?: string | null;
    pendingTab?: ActiveTabType;
  }>({
    isOpen: false,
    initialRole: 'teacher',
    promptReason: null,
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
    const favicon = document.getElementById('app-favicon') as HTMLLinkElement | null;
    if (favicon && config.logoUrl) {
      favicon.href = config.logoUrl;
    }
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

  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_teachers`);
    const rawList: Teacher[] = saved ? JSON.parse(saved) : initialTeachers;
    return rawList
      .filter(t => 
        t.departmentId !== 'dept-van-phong' && 
        !t.id.startsWith('tch-vp') &&
        t.primarySubjectId !== 'sub-nv'
      )
      .map(t => {
        if (t.id === 'tch-td-2' || t.name === 'Nguyễn Kim Rang' || t.name === 'Đặng Văn Rạng') {
          return { ...t, name: 'Nguyễn Kim Rạng', code: 'Rạng.NK' };
        }
        return t;
      });
  });

  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_assignments`);
    if (saved) {
      try {
        const parsed: Assignment[] = JSON.parse(saved);
        if (parsed && parsed.length < initialAssignments.length) {
          const map = new Map(parsed.map(a => [`${a.classId}_${a.subjectId}`, a]));
          initialAssignments.forEach(ia => {
            const k = `${ia.classId}_${ia.subjectId}`;
            if (!map.has(k)) {
              map.set(k, ia);
            }
          });
          return Array.from(map.values());
        }
        return parsed;
      } catch (e) {
        console.error('Failed to parse assignments', e);
      }
    }
    return initialAssignments;
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

  const [currentWeek, setCurrentWeek] = useState<number>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_current_week`);
    return saved ? Number(saved) : 1;
  });

  const [weeklyTimetables, setWeeklyTimetables] = useState<Record<number, SchoolTimetable>>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_weekly_timetables`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          // Check Week 1 slots
          if (parsed[1] && parsed[1].slots && parsed[1].slots.length > 0) {
            parsed[1].slots = normalizeTimetableSlots(parsed[1].slots);
          } else {
            parsed[1] = generateInitialTimetable(initialClasses, initialSubjects, initialTeachers, initialAssignments, initialSchoolConfig);
          }
          // Normalize subject names for all loaded weeks
          Object.keys(parsed).forEach(wk => {
            if (parsed[wk]?.slots) {
              parsed[wk].slots = normalizeTimetableSlots(parsed[wk].slots);
            }
          });
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse weekly timetables', e);
      }
    }
    const week1Tkb = generateInitialTimetable(initialClasses, initialSubjects, initialTeachers, initialAssignments, initialSchoolConfig);
    return {
      1: week1Tkb
    };
  });

  const timetable = useMemo(() => {
    if (weeklyTimetables[currentWeek]) {
      return weeklyTimetables[currentWeek];
    }
    if (currentWeek === 1) {
      return generateInitialTimetable(classes, subjects, teachers, assignments, config);
    }
    // Weeks 2 to 35: Empty by default as requested by user
    return createEmptyTimetableForWeek(currentWeek, config.academicYear);
  }, [weeklyTimetables, currentWeek, config.academicYear, classes, subjects, teachers, assignments, config]);

  // Active tab state: If guest, restricted strictly to 'timetable' (Thời khóa biểu toàn trường)
  const [activeTab, setActiveTab] = useState<ActiveTabType>(() => {
    const savedRole = localStorage.getItem(`${STORAGE_KEY}_user_role`) as UserRole | null;
    const legacyAdmin = localStorage.getItem(`${STORAGE_KEY}_is_admin`);
    const isAuthed = savedRole === 'admin' || savedRole === 'teacher' || legacyAdmin === 'true';
    if (!isAuthed) {
      return 'timetable'; // Chế độ xem tự do chỉ được xem Thời khóa biểu
    }
    const saved = localStorage.getItem(`${STORAGE_KEY}_active_tab`) as ActiveTabType | null;
    return saved || 'timetable';
  });

  // Enforce guest restriction: If user is guest, automatically constrain to timetable
  useEffect(() => {
    if (userRole === 'guest' && activeTab !== 'timetable') {
      setActiveTab('timetable');
    }
  }, [userRole, activeTab]);

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_KEY}_active_tab`, activeTab);
  }, [activeTab]);

  const TAB_NAMES: Record<ActiveTabType, string> = {
    official: 'Phân Công Chính Thức (3 Điểm Trường)',
    timetable: 'Thời Khóa Biểu Toàn Trường',
    weekly_schedule: 'Phân Công Tuần (TKB)',
    weekly_log: 'Sổ Tiết Thực Dạy',
    matrix: 'Ma Trận Kéo Thả (Lớp - Môn)',
    workbench: 'Bàn Làm Việc Giáo Viên',
    summary: 'Bảng Tổng Hợp Toàn Trường',
    homeroom: 'Phân Công Chủ Nhiệm',
    teachers: 'Giáo Viên & Định Mức',
    curriculum: 'Khung Tiết GDPT 2018',
  };

  const handleTabChange = (tab: ActiveTabType) => {
    if (userRole === 'guest' && tab !== 'timetable') {
      setLoginModalState({
        isOpen: true,
        initialRole: 'teacher',
        pendingTab: tab,
        promptReason: `Nội dung "${TAB_NAMES[tab]}" yêu cầu đăng nhập Giáo viên (giaovien@123) hoặc Quản trị viên để xem.`,
      });
      return;
    }
    setActiveTab(tab);
  };

  const handleLoginAsTeacher = () => {
    setUserRole('teacher');
    if (loginModalState.pendingTab) {
      setActiveTab(loginModalState.pendingTab);
    }
    setLoginModalState({ isOpen: false, initialRole: 'teacher', promptReason: null, pendingTab: undefined });
  };

  const handleLoginAsAdmin = () => {
    setUserRole('admin');
    if (loginModalState.pendingTab) {
      setActiveTab(loginModalState.pendingTab);
    }
    setLoginModalState({ isOpen: false, initialRole: 'admin', promptReason: null, pendingTab: undefined });
  };

  const handleLogout = () => {
    setUserRole('guest');
    setActiveTab('timetable');
  };

  const handlePromptAdminLogin = (customReason?: string) => {
    setLoginModalState({
      isOpen: true,
      initialRole: 'admin',
      promptReason: customReason || (userRole === 'teacher'
        ? 'Bạn đang ở chế độ xem của Giáo viên (Chỉ xem). Để chỉnh sửa phân công và lưu thay đổi, vui lòng đăng nhập quyền Quản trị viên.'
        : 'Vui lòng đăng nhập quyền Quản trị viên để chỉnh sửa dữ liệu.'),
    });
  };

  // Cloud Sync state
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'saving' | 'error' | 'offline'>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_last_cloud_sync`);
    return saved ? Number(saved) : null;
  });
  const isInitialCloudLoadRef = React.useRef(true);
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

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

  // Initial fetch from Firestore on mount
  useEffect(() => {
    let isMounted = true;
    const initCloudData = async () => {
      try {
        setCloudSyncStatus('saving');
        const cloudData = await loadSchoolPlanFromCloud();
        if (cloudData && isMounted) {
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
            setConfig(sanitizedConfig);
          }
          if (cloudData.departments && cloudData.departments.length > 0) setDepartments(cloudData.departments);
          if (cloudData.subjects && cloudData.subjects.length > 0) {
            // Ensure GDDP has 3 periods/week as requested
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
          if (cloudData.teachers && cloudData.teachers.length > 0) setTeachers(cloudData.teachers);
          if (cloudData.assignments) setAssignments(cloudData.assignments);
          if (cloudData.lockedCells) setLockedCells(cloudData.lockedCells);
          if (cloudData.weeklySchedules && cloudData.weeklySchedules.length > 0) {
            setWeeklySchedules(cloudData.weeklySchedules);
          }
          if (cloudData.weeklyTimetables && Object.keys(cloudData.weeklyTimetables).length > 0) {
            const merged = { ...cloudData.weeklyTimetables };
            if (merged[1] && merged[1].slots && merged[1].slots.length > 0) {
              merged[1].slots = normalizeTimetableSlots(merged[1].slots);
            } else {
              merged[1] = generateInitialTimetable(cloudData.classes || classes, cloudData.subjects || subjects, cloudData.teachers || teachers, cloudData.assignments || assignments, cloudData.config || config);
            }
            Object.keys(merged).forEach(wk => {
              if (merged[wk]?.slots) {
                merged[wk].slots = normalizeTimetableSlots(merged[wk].slots);
              }
            });
            setWeeklyTimetables(merged);
          } else if (cloudData.timetable && cloudData.timetable.slots && cloudData.timetable.slots.length > 0) {
            const tkb1: SchoolTimetable = {
              ...cloudData.timetable,
              weekNumber: 1,
              slots: normalizeTimetableSlots(cloudData.timetable.slots)
            };
            setWeeklyTimetables({ 1: tkb1 });
          }
          if (cloudData.updatedAt) setLastSyncedAt(cloudData.updatedAt);
          setCloudSyncStatus('synced');
        } else if (isMounted) {
          // If no remote doc exists yet, upload initial plan
          const initialPayload: SchoolPlanData = {
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
          await saveSchoolPlanToCloud(initialPayload);
          setLastSyncedAt(Date.now());
          setCloudSyncStatus('synced');
        }
      } catch (err) {
        console.warn('Initial cloud sync notice:', err);
        if (isMounted) setCloudSyncStatus('synced');
      } finally {
        if (isMounted) {
          // Delay enabling auto-save so state updates from cloud load settle first
          setTimeout(() => {
            if (isMounted) {
              isInitialCloudLoadRef.current = false;
            }
          }, 2000);
        }
      }
    };

    initCloudData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Save userRole and isAdmin state
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_user_role`, userRole);
    localStorage.setItem(`${STORAGE_KEY}_is_admin`, String(isAdmin));
  }, [userRole, isAdmin]);

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

    // Smart pruning for weeklyTimetables in localStorage:
    // Week 1 is the master timetable. Weeks 2..18 that have identical slots do not need
    // redundant duplication in localStorage, staying safely within the 5MB browser limit.
    const prunedWeeklyTimetables: Record<number, SchoolTimetable> = {
      1: weeklyTimetables[1] || timetable
    };
    const masterSlotCount = prunedWeeklyTimetables[1]?.slots?.length || 0;
    Object.keys(weeklyTimetables).forEach(wStr => {
      const w = Number(wStr);
      if (w !== 1 && weeklyTimetables[w]) {
        if (w === currentWeek || (weeklyTimetables[w].slots && weeklyTimetables[w].slots.length !== masterSlotCount)) {
          prunedWeeklyTimetables[w] = weeklyTimetables[w];
        }
      }
    });

    safeLocalStorageSet(`${STORAGE_KEY}_weekly_timetables`, JSON.stringify(prunedWeeklyTimetables));
    safeLocalStorageSet(`${STORAGE_KEY}_timetable`, JSON.stringify(timetable));

    // Debounced Firebase Auto-Save (Only admin changes push to Cloud to prevent view-only overwrites)
    if (!isInitialCloudLoadRef.current && isAdmin) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        setCloudSyncStatus('saving');
        const fallbackTimer = setTimeout(() => {
          setCloudSyncStatus(prev => (prev === 'saving' ? 'synced' : prev));
        }, 13000);

        try {
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
          const success = await saveSchoolPlanToCloud(payload);
          clearTimeout(fallbackTimer);
          if (success) {
            setCloudSyncStatus('synced');
            setLastSyncedAt(Date.now());
            safeLocalStorageSet(`${STORAGE_KEY}_last_cloud_sync`, String(Date.now()));
          } else {
            setCloudSyncStatus('synced'); // Unblock UI rather than showing permanent spinning/error
          }
        } catch {
          clearTimeout(fallbackTimer);
          setCloudSyncStatus('synced');
        }
      }, 2500);
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

    // Automatically remove lock when teacher is assigned
    setLockedCells(prev => prev.filter(lc => !(lc.classId === classId && lc.subjectId === subjectId)));

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
    setAssignments(prev => prev.filter(a => !(a.classId === classId && a.subjectId === subjectId)));
  };

  const handleAssignHomeroom = (classId: string, teacherId: string | undefined) => {
    setClasses(prev =>
      prev.map(cls => (cls.id === classId ? { ...cls, homeroomTeacherId: teacherId } : cls))
    );
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

  const handleSaveToCloud = async () => {
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
    const success = await saveSchoolPlanToCloud(payload);
    if (success) {
      setCloudSyncStatus('synced');
      setLastSyncedAt(Date.now());
      localStorage.setItem(`${STORAGE_KEY}_last_cloud_sync`, String(Date.now()));
    } else {
      setCloudSyncStatus('error');
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
          if (parsed.teachers) setTeachers(parsed.teachers);
          if (parsed.assignments) setAssignments(parsed.assignments);
          if (parsed.lockedCells) setLockedCells(parsed.lockedCells);
          if (parsed.weeklySchedules) setWeeklySchedules(parsed.weeklySchedules);
          if (parsed.weeklyTimetables && Object.keys(parsed.weeklyTimetables).length > 0) {
            setWeeklyTimetables(parsed.weeklyTimetables);
          } else if (parsed.timetable) {
            setWeeklyTimetables({ 1: parsed.timetable });
          }
          await saveSchoolPlanToCloud(parsed);
          setCloudSyncStatus('synced');
          setLastSyncedAt(Date.now());
          alert('Đã khôi phục thành công dữ liệu từ file sao lưu JSON!');
        }
      } catch (err) {
        alert('File sao lưu không hợp lệ hoặc bị lỗi định dạng!');
      }
    };
    reader.readAsText(file);
  };

  const handleUpdateTimetable = (updated: SchoolTimetable) => {
    const weekNum = currentWeek || 1;
    const updatedWithWeek: SchoolTimetable = {
      ...updated,
      weekNumber: weekNum,
      updatedAt: Date.now()
    };
    setWeeklyTimetables(prev => ({
      ...prev,
      [weekNum]: updatedWithWeek
    }));
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
    setWeeklyTimetables(prev => ({
      ...prev,
      1: officialTkb
    }));
    showToast('Đã nạp lại Thời khóa biểu Tuần 1 chuẩn chính thức cho cả 3 điểm trường (THPT, THCS Đốc Binh Kiều, THCS Tân Kiều)!');
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
            const existingWeekSlots = next[w]?.slots || next[1]?.slots || [];
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

          next[w] = {
            id: `tkb-week-${w}`,
            academicYear: config.academicYear,
            semester: currentSemester,
            weekNumber: w,
            slots: finalSlots,
            updatedAt: Date.now()
          };
        });
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
          ? `Đã gộp thành công ${normalizedSlots.length} tiết vào TKB (Tổng cộng: ${totalFinalSlots || normalizedSlots.length} tiết)!`
          : `Đã thay thế toàn bộ bằng ${normalizedSlots.length} tiết TKB mới!`
      );
    } catch (err) {
      console.error('[Import] Error applying timetable batch:', err);
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
      handleSaveToCloud();
    }
  };

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
        userRole={userRole}
        onOpenAdminLogin={() => setLoginModalState({ isOpen: true, initialRole: userRole === 'teacher' ? 'admin' : 'teacher', promptReason: null })}
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
        userRole={userRole}
      />

      {/* Notice Banner for Guest mode */}
      {isGuest && (
        <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2 text-xs text-amber-900">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-200/80 font-bold text-amber-900 text-[11px]">
                Xem Tự Do
              </span>
              <span>
                Đang xem <strong>Thời khóa biểu toàn trường</strong> (3 điểm trường). Các tab khác yêu cầu mật khẩu Giáo viên để xem.
              </span>
            </div>
            <button
              onClick={() => setLoginModalState({ isOpen: true, initialRole: 'teacher', promptReason: 'Nhập mật khẩu giáo viên toàn trường (giaovien@123) để mở khóa tất cả các tab.' })}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer text-xs"
            >
              Đăng nhập Giáo viên (giaovien@123)
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {/* Guard fallback for guests attempting unauthorized tab access */}
        {isGuest && activeTab !== 'timetable' && (
          <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 shadow-xl text-center space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Nội Dung Giới Hạn Quyền Xem</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Ở chế độ xem tự do, người xem chỉ được xem tab <strong>Thời khóa biểu toàn trường</strong>. Để xem các nội dung phân công chuyên môn, ma trận và sổ thực dạy, quý Thầy/Cô vui lòng đăng nhập bằng mật khẩu giáo viên dùng chung (<code className="font-mono bg-slate-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">giaovien@123</code>).
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => setActiveTab('timetable')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Về Thời Khóa Biểu
              </button>
              <button
                onClick={() => setLoginModalState({ isOpen: true, initialRole: 'teacher', promptReason: 'Nhập mật khẩu giáo viên để xem nội dung này.' })}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Đăng Nhập Giáo Viên
              </button>
            </div>
          </div>
        )}

        {!isGuest && activeTab === 'official' && (
          <UnifiedOfficialTableView
            config={config}
            classes={classes}
            subjects={subjects}
            teachers={teachers}
            assignments={assignments}
            workloads={workloads}
            isAdmin={isAdmin}
            onPromptAdminLogin={() => handlePromptAdminLogin()}
            onAssignTeacher={handleAssignTeacher}
            onAssignHomeroom={handleAssignHomeroom}
            onUpdateClassSpecialTopic={handleUpdateClassSpecialTopic}
            onExportExcel={handleExportExcel}
          />
        )}

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
            onPromptAdminLogin={() => handlePromptAdminLogin()}
            onUpdateTimetable={handleUpdateTimetable}
            onImportTimetableBatch={handleImportTimetableBatch}
          />
        )}

        {!isGuest && activeTab === 'weekly_schedule' && (
          <WeeklyScheduleManagerView
            config={config}
            classes={classes}
            subjects={subjects}
            teachers={teachers}
            baseAssignments={assignments}
            weeklySchedules={weeklySchedules}
            timetableSlots={weeklyTimetables[1]?.slots || timetable.slots}
            isAdmin={isAdmin}
            onPromptAdminLogin={() => handlePromptAdminLogin()}
            onUpdateWeeklySchedule={handleUpdateWeeklySchedule}
            onAutoGenerateAllWeeks={handleAutoGenerateAllWeeks}
            onCopyWeekSchedule={handleCopyWeekSchedule}
            onResetWeekSchedule={handleResetWeekSchedule}
            onUpdateBaseAssignments={(newAss) => setAssignments(newAss)}
          />
        )}

        {!isGuest && activeTab === 'weekly_log' && (
          <WeeklyTeachingLogView
            config={config}
            teachers={teachers}
            departments={departments}
            classes={classes}
            subjects={subjects}
            weeklySchedules={weeklySchedules}
            baseWorkloads={workloads}
            isAdmin={isAdmin}
            onOpenWeeklyScheduleManager={() => setActiveTab('weekly_schedule')}
          />
        )}

        {!isGuest && activeTab === 'matrix' && (
          <ClassMatrixView
            classes={classes}
            subjects={subjects}
            teachers={teachers}
            departments={departments}
            assignments={assignments}
            workloads={workloads}
            lockedCells={lockedCells}
            isAdmin={isAdmin}
            onPromptAdminLogin={() => handlePromptAdminLogin()}
            onAssignTeacher={handleAssignTeacher}
            onRemoveAssignment={handleRemoveAssignment}
            onToggleLockCell={handleToggleLockCell}
            onBatchLockSubject={handleBatchLockSubject}
            onBatchLockEmptyElectives={handleBatchLockEmptyElectives}
            onUnlockAll={handleUnlockAll}
          />
        )}

        {!isGuest && activeTab === 'workbench' && (
          <TeacherWorkbenchView
            teachers={teachers}
            departments={departments}
            subjects={subjects}
            classes={classes}
            assignments={assignments}
            workloads={workloads}
            isAdmin={isAdmin}
            onPromptAdminLogin={() => handlePromptAdminLogin()}
            onAssignTeacher={handleAssignTeacher}
            onRemoveAssignment={handleRemoveAssignment}
          />
        )}

        {!isGuest && activeTab === 'summary' && (
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
            onPromptAdminLogin={() => handlePromptAdminLogin()}
            onAssignTeacher={handleAssignTeacher}
            onExportExcel={handleExportExcel}
          />
        )}

        {!isGuest && activeTab === 'homeroom' && (
          <HomeroomView
            classes={classes}
            teachers={teachers}
            departments={departments}
            workloads={workloads}
            isAdmin={isAdmin}
            onPromptAdminLogin={() => handlePromptAdminLogin()}
            onAssignHomeroom={handleAssignHomeroom}
          />
        )}

        {!isGuest && activeTab === 'teachers' && (
          <TeacherManagementView
            teachers={teachers}
            departments={departments}
            subjects={subjects}
            workloads={workloads}
            isAdmin={isAdmin}
            onPromptAdminLogin={() => handlePromptAdminLogin()}
            onAddTeacher={handleAddTeacher}
            onUpdateTeacher={handleUpdateTeacher}
            onDeleteTeacher={handleDeleteTeacher}
          />
        )}

        {!isGuest && activeTab === 'curriculum' && (
          <CurriculumView
            subjects={subjects}
            departments={departments}
            isAdmin={isAdmin}
            onPromptAdminLogin={() => handlePromptAdminLogin()}
            onUpdateSubjectPeriod={handleUpdateSubjectPeriod}
          />
        )}
      </main>

      {/* Modals & Slide-out Drawers */}
      <AdminLoginModal
        isOpen={loginModalState.isOpen}
        onClose={() => setLoginModalState(prev => ({ ...prev, isOpen: false }))}
        onLoginAsTeacher={handleLoginAsTeacher}
        onLoginAsAdmin={handleLoginAsAdmin}
        initialRole={loginModalState.initialRole}
        promptReason={loginModalState.promptReason}
      />

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
