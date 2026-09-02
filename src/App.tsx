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
  SchoolTimetable
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
  createEmptyTimetableForWeek
} from './utils/timetableHelper';

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
import {
  saveSchoolPlanToCloud,
  loadSchoolPlanFromCloud,
  subscribeToSchoolPlan,
  exportDataAsJsonFile,
  SchoolPlanData
} from './services/firebase';

const STORAGE_KEY = 'docbinhkieu_phancong_data_v9';

export default function App() {
  // Admin role state (Public view-only by default, admin login with password)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_is_admin`);
    return saved === 'true';
  });
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Load saved state or default
  const [config, setConfig] = useState<SchoolConfig>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_config`);
    if (saved) {
      const parsed: SchoolConfig = JSON.parse(saved);
      return {
        ...parsed,
        academicYear: (!parsed.academicYear || parsed.academicYear.includes('2024')) ? '2026 - 2027' : parsed.academicYear,
        vicePrincipalName: (parsed.vicePrincipalName && parsed.vicePrincipalName.includes('-')) ? 'Nguyễn Minh Trí' : (parsed.vicePrincipalName || 'Nguyễn Minh Trí')
      };
    }
    return initialSchoolConfig;
  });

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
    if (saved) {
      const parsed: Teacher[] = JSON.parse(saved);
      return parsed.filter(t => 
        t.departmentId !== 'dept-van-phong' && 
        !t.id.startsWith('tch-vp') &&
        t.primarySubjectId !== 'sub-nv'
      );
    }
    return initialTeachers;
  });

  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_assignments`);
    return saved ? JSON.parse(saved) : initialAssignments;
  });

  const [lockedCells, setLockedCells] = useState<LockedCell[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_locked_cells`);
    return saved ? JSON.parse(saved) : initialLockedCells;
  });

  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedule[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_weekly_schedules`);
    if (saved) {
      try {
        return JSON.parse(saved);
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
          // Always ensure Week 1 has official THPT slots
          if (parsed[1] && parsed[1].slots) {
            parsed[1].slots = ensureTHPTOfficialSlots(parsed[1].slots);
          } else {
            parsed[1] = generateInitialTimetable(initialClasses, initialSubjects, initialTeachers, initialAssignments, initialSchoolConfig);
          }
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

  const [activeTab, setActiveTab] = useState<ActiveTabType>('official');

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

  // Initial fetch from Firestore on mount
  useEffect(() => {
    let isMounted = true;
    const initCloudData = async () => {
      try {
        setCloudSyncStatus('saving');
        const cloudData = await loadSchoolPlanFromCloud();
        if (cloudData && isMounted) {
          if (cloudData.config) {
            const sanitizedConfig: SchoolConfig = {
              ...cloudData.config,
              academicYear: (!cloudData.config.academicYear || cloudData.config.academicYear.includes('2024'))
                ? '2026 - 2027'
                : cloudData.config.academicYear,
              vicePrincipalName: (cloudData.config.vicePrincipalName && cloudData.config.vicePrincipalName.includes('-'))
                ? 'Nguyễn Minh Trí'
                : (cloudData.config.vicePrincipalName || 'Nguyễn Minh Trí'),
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
            if (merged[1] && merged[1].slots) {
              merged[1].slots = ensureTHPTOfficialSlots(merged[1].slots);
            } else {
              merged[1] = generateInitialTimetable(cloudData.classes || classes, cloudData.subjects || subjects, cloudData.teachers || teachers, cloudData.assignments || assignments, cloudData.config || config);
            }
            setWeeklyTimetables(merged);
          } else if (cloudData.timetable && cloudData.timetable.slots && cloudData.timetable.slots.length > 0) {
            const ensuredSlots = ensureTHPTOfficialSlots(cloudData.timetable.slots);
            const tkb1: SchoolTimetable = {
              ...cloudData.timetable,
              weekNumber: 1,
              slots: ensuredSlots
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
          isInitialCloudLoadRef.current = false;
        }
      }
    };

    initCloudData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Save isAdmin state
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_is_admin`, String(isAdmin));
  }, [isAdmin]);

  // Save to localStorage & Auto-sync to Firebase with debounce (Admin only)
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_config`, JSON.stringify(config));
    localStorage.setItem(`${STORAGE_KEY}_departments`, JSON.stringify(departments));
    localStorage.setItem(`${STORAGE_KEY}_subjects`, JSON.stringify(subjects));
    localStorage.setItem(`${STORAGE_KEY}_classes`, JSON.stringify(classes));
    localStorage.setItem(`${STORAGE_KEY}_teachers`, JSON.stringify(teachers));
    localStorage.setItem(`${STORAGE_KEY}_assignments`, JSON.stringify(assignments));
    localStorage.setItem(`${STORAGE_KEY}_locked_cells`, JSON.stringify(lockedCells));
    localStorage.setItem(`${STORAGE_KEY}_weekly_schedules`, JSON.stringify(weeklySchedules));
    localStorage.setItem(`${STORAGE_KEY}_current_week`, String(currentWeek));
    localStorage.setItem(`${STORAGE_KEY}_weekly_timetables`, JSON.stringify(weeklyTimetables));
    localStorage.setItem(`${STORAGE_KEY}_timetable`, JSON.stringify(timetable));

    // Debounced Firebase Auto-Save (Only admin changes push to Cloud to prevent view-only overwrites)
    if (!isInitialCloudLoadRef.current && isAdmin) {
      setCloudSyncStatus('saving');
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
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
      }, 1000);
    }
  }, [config, departments, subjects, classes, teachers, assignments, lockedCells, weeklySchedules, currentWeek, weeklyTimetables, timetable, isAdmin]);

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
              if (sub.id === 'sub-gddp' || sub.id === 'sub-hdtn') {
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
        onToggleAdmin={() => {
          if (isAdmin) {
            setIsAdmin(false);
          } else {
            setIsAdminModalOpen(true);
          }
        }}
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
        onTabChange={setActiveTab}
        unassignedCount={unassignedCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'official' && (
          <UnifiedOfficialTableView
            config={config}
            classes={classes}
            subjects={subjects}
            teachers={teachers}
            assignments={assignments}
            workloads={workloads}
            isAdmin={isAdmin}
            onPromptAdminLogin={() => setIsAdminModalOpen(true)}
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
            onPromptAdminLogin={() => setIsAdminModalOpen(true)}
            onUpdateTimetable={handleUpdateTimetable}
          />
        )}

        {activeTab === 'weekly_schedule' && (
          <WeeklyScheduleManagerView
            config={config}
            classes={classes}
            subjects={subjects}
            teachers={teachers}
            baseAssignments={assignments}
            weeklySchedules={weeklySchedules}
            isAdmin={isAdmin}
            onPromptAdminLogin={() => setIsAdminModalOpen(true)}
            onUpdateWeeklySchedule={handleUpdateWeeklySchedule}
            onAutoGenerateAllWeeks={handleAutoGenerateAllWeeks}
            onCopyWeekSchedule={handleCopyWeekSchedule}
            onResetWeekSchedule={handleResetWeekSchedule}
          />
        )}

        {activeTab === 'weekly_log' && (
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
            onPromptAdminLogin={() => setIsAdminModalOpen(true)}
            onAssignTeacher={handleAssignTeacher}
            onRemoveAssignment={handleRemoveAssignment}
            onToggleLockCell={handleToggleLockCell}
            onBatchLockSubject={handleBatchLockSubject}
            onBatchLockEmptyElectives={handleBatchLockEmptyElectives}
            onUnlockAll={handleUnlockAll}
          />
        )}

        {activeTab === 'workbench' && (
          <TeacherWorkbenchView
            teachers={teachers}
            departments={departments}
            subjects={subjects}
            classes={classes}
            assignments={assignments}
            workloads={workloads}
            isAdmin={isAdmin}
            onPromptAdminLogin={() => setIsAdminModalOpen(true)}
            onAssignTeacher={handleAssignTeacher}
            onRemoveAssignment={handleRemoveAssignment}
          />
        )}

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
            onPromptAdminLogin={() => setIsAdminModalOpen(true)}
            onAssignTeacher={handleAssignTeacher}
            onExportExcel={handleExportExcel}
          />
        )}

        {activeTab === 'homeroom' && (
          <HomeroomView
            classes={classes}
            teachers={teachers}
            departments={departments}
            workloads={workloads}
            isAdmin={isAdmin}
            onPromptAdminLogin={() => setIsAdminModalOpen(true)}
            onAssignHomeroom={handleAssignHomeroom}
          />
        )}

        {activeTab === 'teachers' && (
          <TeacherManagementView
            teachers={teachers}
            departments={departments}
            subjects={subjects}
            workloads={workloads}
            isAdmin={isAdmin}
            onPromptAdminLogin={() => setIsAdminModalOpen(true)}
            onAddTeacher={handleAddTeacher}
            onUpdateTeacher={handleUpdateTeacher}
            onDeleteTeacher={handleDeleteTeacher}
          />
        )}

        {activeTab === 'curriculum' && (
          <CurriculumView
            subjects={subjects}
            departments={departments}
            isAdmin={isAdmin}
            onPromptAdminLogin={() => setIsAdminModalOpen(true)}
            onUpdateSubjectPeriod={handleUpdateSubjectPeriod}
          />
        )}
      </main>

      {/* Modals & Slide-out Drawers */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onLoginSuccess={() => setIsAdmin(true)}
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
    </div>
  );
}
