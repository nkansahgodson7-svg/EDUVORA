import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  Tenant,
  UserProfile,
  ClassEntity,
  SubjectEntity,
  TeacherAllocation,
  Student,
  AssessmentSheet,
  StudentScore,
  AuditLog,
  UserRole,
  SubscriptionTier,
} from '../types';
import {
  INITIAL_TENANTS,
  INITIAL_USERS,
  INITIAL_CLASSES,
  INITIAL_SUBJECTS,
  INITIAL_ALLOCATIONS,
  INITIAL_STUDENTS,
  INITIAL_ASSESSMENT_SHEETS,
  INITIAL_STUDENT_SCORES,
  INITIAL_AUDIT_LOGS,
  getCurrentSession,
} from '../lib/mockData';
import { OfflineQueueItem } from './hooks/types';
import { useAuth } from './hooks/useAuth';
import { useTenantManagement } from './hooks/useTenantManagement';
import { useStudentManagement } from './hooks/useStudentManagement';
import { useTeacherManagement } from './hooks/useTeacherManagement';
import { useGradebook } from './hooks/useGradebook';

interface TenantAuthContextType {
  // Tenancy & Auth
  allTenants: Tenant[];
  allUsers: UserProfile[];
  currentTenant: Tenant;
  currentUser: UserProfile;
  availableTeachers: UserProfile[];
  isAuthenticated: boolean;
  loginWithEmailPassword: (email: string, password?: string) => Promise<{ success: boolean; user?: UserProfile; message?: string }>;
  logout: () => Promise<void>;
  
  // Scoped Data
  tenantClasses: ClassEntity[];
  tenantSubjects: SubjectEntity[];
  tenantAllocations: TeacherAllocation[];
  tenantStudents: Student[];
  tenantAssessmentSheets: AssessmentSheet[];
  tenantScores: StudentScore[];
  tenantAuditLogs: AuditLog[];

  // Teacher Scoped Data
  teacherAllocations: TeacherAllocation[];
  teacherSheets: AssessmentSheet[];

  // Offline Engine
  isOffline: boolean;
  isSyncing: boolean;
  offlineQueue: OfflineQueueItem[];
  toggleOffline: () => void;
  syncOfflineQueue: () => void;

  // Actions
  switchTenant: (schoolId: string) => void;
  loginAsRole: (role: UserRole, specificUserId?: string, targetSchoolId?: string) => void;
  provisionNewTenant: (
    tenantData: { name: string; subdomain: string; address: string; headmaster_name: string },
    adminData: { name: string; email: string; phone: string },
    seedPreset: 'standard' | 'secondary' | 'minimal'
  ) => Promise<{ school: Tenant; admin: UserProfile }>;
  updateTenant: (tenantId: string, data: Partial<Tenant>) => void;
  deleteTenant: (tenantId: string) => void;
  updateTenantSettings: (settings: Partial<Tenant>) => void;
  refreshTenants: () => Promise<void>;
  registerSchool: (school: { id: string; name: string; code: string; adminEmail?: string }) => void;
  
  // Teachers Management
  addTeacher: (name: string, email: string, phone?: string) => Promise<UserProfile>;
  generateInviteKey: (teacherId: string) => { token: string; expiresAt: string };
  redeemInvite: (token: string, password?: string) => Promise<{ success: boolean; user?: UserProfile; message: string }>;
  toggleTeacherStatus: (teacherId: string) => void;

  // Student Management
  addStudent: (student: Omit<Student, 'id' | 'school_id' | 'created_at'>) => void;
  updateStudent: (studentId: string, data: Partial<Student>) => void;
  deleteStudent: (studentId: string) => void;

  // Allocations Matrix
  allocateTeacher: (teacherId: string, classId: string, subjectId: string, term: string) => void;
  deallocateTeacher: (allocationId: string) => void;

  // Grade Entry & Approval Workflow
  saveScore: (sheetId: string, studentId: string, ca1: number, ca2: number, exam: number, remarks?: string) => void;
  submitSheetForReview: (sheetId: string) => void;
  reviewAssessmentSheet: (sheetId: string, action: 'approved' | 'rejected', adminRemarks?: string) => void;
  getOrCreateSheet: (classId: string, subjectId: string, teacherId: string) => AssessmentSheet;
  resetAllData: () => void;
  nukeDatabase: () => Promise<{ success: boolean; message: string }>;
}

const TenantAuthContext = createContext<TenantAuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  TENANTS: 'edutenant_tenants_v2',
  CURRENT_TENANT_ID: 'edutenant_cur_tenant_id_v2',
  CURRENT_USER_ID: 'edutenant_cur_user_id_v2',
  IS_AUTHENTICATED: 'edutenant_is_authenticated_v2',
  USERS: 'edutenant_users_v2',
  CLASSES: 'edutenant_classes_v2',
  SUBJECTS: 'edutenant_subjects_v2',
  ALLOCATIONS: 'edutenant_allocations_v2',
  STUDENTS: 'edutenant_students_v2',
  SHEETS: 'edutenant_sheets_v2',
  SCORES: 'edutenant_scores_v2',
  AUDIT: 'edutenant_audit_v2',
  OFFLINE_QUEUE: 'edutenant_offline_queue_v2',
};

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

export const TenantAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // ── All state lives here ──────────────────────────────────────────
  const [allTenants, setAllTenants] = useState<Tenant[]>(() => loadStorage(STORAGE_KEYS.TENANTS, INITIAL_TENANTS));
  const [currentTenantId, setCurrentTenantId] = useState<string>(() => loadStorage(STORAGE_KEYS.CURRENT_TENANT_ID, INITIAL_TENANTS[0]?.id || ''));
  const [currentUserId, setCurrentUserId] = useState<string>(() => loadStorage(STORAGE_KEYS.CURRENT_USER_ID, INITIAL_USERS[0]?.id || ''));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => loadStorage(STORAGE_KEYS.IS_AUTHENTICATED, false));

  const [users, setUsers] = useState<UserProfile[]>(() => loadStorage(STORAGE_KEYS.USERS, INITIAL_USERS));
  const [classes, setClasses] = useState<ClassEntity[]>(() => loadStorage(STORAGE_KEYS.CLASSES, INITIAL_CLASSES));
  const [subjects, setSubjects] = useState<SubjectEntity[]>(() => loadStorage(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS));
  const [allocations, setAllocations] = useState<TeacherAllocation[]>(() => loadStorage(STORAGE_KEYS.ALLOCATIONS, INITIAL_ALLOCATIONS));
  const [students, setStudents] = useState<Student[]>(() => loadStorage(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS));
  const [assessmentSheets, setAssessmentSheets] = useState<AssessmentSheet[]>(() => loadStorage(STORAGE_KEYS.SHEETS, INITIAL_ASSESSMENT_SHEETS));
  const [studentScores, setStudentScores] = useState<StudentScore[]>(() => loadStorage(STORAGE_KEYS.SCORES, INITIAL_STUDENT_SCORES));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => loadStorage(STORAGE_KEYS.AUDIT, INITIAL_AUDIT_LOGS));

  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>(() => loadStorage(STORAGE_KEYS.OFFLINE_QUEUE, []));

  // ── Derived entities ──────────────────────────────────────────────
  const currentTenant = useMemo(() => allTenants.find((t) => t.id === currentTenantId) || allTenants[0] || null, [allTenants, currentTenantId]);

  const tenantClasses = useMemo(() => currentTenant ? classes.filter((c) => c.school_id === currentTenant.id) : [], [classes, currentTenant]);
  const tenantSubjects = useMemo(() => currentTenant ? subjects.filter((s) => s.school_id === currentTenant.id) : [], [subjects, currentTenant]);
  const tenantAllocations = useMemo(() => currentTenant ? allocations.filter((a) => a.school_id === currentTenant.id) : [], [allocations, currentTenant]);
  const tenantStudents = useMemo(() => currentTenant ? students.filter((s) => s.school_id === currentTenant.id) : [], [students, currentTenant]);
  const tenantAssessmentSheets = useMemo(() => currentTenant ? assessmentSheets.filter((sh) => sh.school_id === currentTenant.id) : [], [assessmentSheets, currentTenant]);
  const tenantScores = useMemo(() => currentTenant ? studentScores.filter((sc) => sc.school_id === currentTenant.id) : [], [studentScores, currentTenant]);
  const tenantAuditLogs = useMemo(() => currentTenant ? auditLogs.filter((l) => l.school_id === currentTenant.id) : [], [auditLogs, currentTenant]);
  const availableTeachers = useMemo(() => currentTenant ? users.filter((u) => u.school_id === currentTenant.id && u.role === 'teacher') : [], [users, currentTenant]);

  const teacherAllocations = useMemo(() => {
    const cu = users.find((u) => u.id === currentUserId);
    if (cu?.role !== 'teacher') return tenantAllocations;
    return tenantAllocations.filter((a) => a.teacher_id === cu.id);
  }, [users, currentUserId, tenantAllocations]);

  const teacherSheets = useMemo(() => {
    const cu = users.find((u) => u.id === currentUserId);
    if (cu?.role !== 'teacher') return tenantAssessmentSheets;
    return tenantAssessmentSheets.filter((sh) => sh.teacher_id === cu.id);
  }, [users, currentUserId, tenantAssessmentSheets]);

  // ── Supabase: fetch schools on mount ──────────────────────────────
  const refreshTenants = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code !== 'PGRST125') {
          console.warn('Could not fetch schools from database:', error.message);
        }
        return;
      }

      if (data && data.length > 0) {
        setAllTenants((prevTenants) => {
          const supabaseTenants: Tenant[] = data.map((s: any) => ({
            id: s.id,
            name: s.name || 'Unnamed School',
            subdomain: s.code || s.subdomain || (s.name ? s.name.toLowerCase().replace(/[^a-z0-9]/g, '') : 'school'),
            logo_url: s.logo_url || '',
            primary_color: s.primary_color || '#1a56db',
            subscription_tier: (s.subscription_tier as SubscriptionTier) || 'growth',
            status: (s.status === 'onboarding' || !s.status) ? 'active' : s.status,
            current_session: s.current_session || getCurrentSession(),
            current_term: s.current_term || 'First Term',
            address: s.address || '',
            phone: s.phone || '',
            contact_email: s.contact_email || '',
            headmaster_name: s.headmaster_name || '',
            created_at: s.created_at || new Date().toISOString(),
          }));

          const merged = [...supabaseTenants];
          for (const prev of prevTenants) {
            if (!merged.some((t) => t.id === prev.id)) {
              merged.push(prev);
            }
          }
          return merged;
        });
      }
    } catch (err) {
      console.warn('Error syncing schools from database:', err);
    }
  }, []);

  useEffect(() => { refreshTenants(); }, [refreshTenants]);

  // ── Debounced localStorage persistence ─────────────────────────────
  const localStorageTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (localStorageTimerRef.current) clearTimeout(localStorageTimerRef.current);
    localStorageTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(allTenants));
        localStorage.setItem(STORAGE_KEYS.CURRENT_TENANT_ID, JSON.stringify(currentTenantId));
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, JSON.stringify(currentUserId));
        localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, JSON.stringify(isAuthenticated));
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
        localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
        localStorage.setItem(STORAGE_KEYS.ALLOCATIONS, JSON.stringify(allocations));
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
        localStorage.setItem(STORAGE_KEYS.SHEETS, JSON.stringify(assessmentSheets));
        localStorage.setItem(STORAGE_KEYS.SCORES, JSON.stringify(studentScores));
        localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(auditLogs));
        localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(offlineQueue));
      } catch { /* localStorage may be full or unavailable */ }
    }, 300);
    return () => { if (localStorageTimerRef.current) clearTimeout(localStorageTimerRef.current); };
  }, [
    allTenants, currentTenantId, currentUserId, isAuthenticated,
    users, classes, subjects, allocations, students,
    assessmentSheets, studentScores, auditLogs, offlineQueue,
  ]);

  // ── Compose hooks (pure logic, no state ownership) ────────────────
  const authHook = useAuth({
    users, setUsers, currentUserId, setCurrentUserId,
    isAuthenticated, setIsAuthenticated, currentTenant, allTenants,
  });

  const tenantMgmt = useTenantManagement({
    allTenants, setAllTenants, currentTenantId, setCurrentTenantId,
    users, setUsers, classes, setClasses, subjects, setSubjects,
    students, setStudents, auditLogs, setAuditLogs,
    currentUser: authHook.currentUser, refreshTenants,
  });

  const studentMgmt = useStudentManagement({
    students, setStudents, currentTenant,
  });

  const teacherMgmt = useTeacherManagement({
    users, setUsers, currentTenant, currentUser: authHook.currentUser,
    setCurrentUserId, setCurrentTenantId, auditLogs, setAuditLogs,
  });

  const gradebook = useGradebook({
    assessmentSheets, setAssessmentSheets,
    studentScores, setStudentScores,
    allocations, setAllocations,
    students, currentTenant, currentUser: authHook.currentUser,
    isOffline, setIsOffline, isSyncing, setIsSyncing,
    offlineQueue, setOfflineQueue, auditLogs, setAuditLogs,
  });

  // ── Tenant switcher (needs both tenant + user setters) ────────────
  const switchTenant = useCallback((schoolId: string) => {
    if (!allTenants.some((t) => t.id === schoolId)) return;
    setCurrentTenantId(schoolId);

    const cu = users.find((u) => u.id === currentUserId);
    if (cu?.role !== 'super_admin') {
      const admin = users.find((u) => u.school_id === schoolId && u.role === 'school_admin');
      if (admin) setCurrentUserId(admin.id);
    }
  }, [allTenants, users, currentUserId]);

  // ── Register school (creates Tenant + admin) ──────────────────────
  const registerSchool = useCallback((school: { id: string; name: string; code: string; adminEmail?: string }) => {
    const newTenant: Tenant = {
      id: school.id,
      name: school.name,
      subdomain: school.code || school.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      logo_url: '',
      primary_color: '#1a56db',
      subscription_tier: 'growth',
      status: 'active',
      current_session: getCurrentSession(),
      current_term: 'First Term',
      address: '',
      phone: '',
      contact_email: school.adminEmail || '',
      headmaster_name: 'School Administrator',
      created_at: new Date().toISOString(),
    };

    const newAdmin: UserProfile = {
      id: `admin-${school.id}`,
      school_id: school.id,
      email: school.adminEmail || `admin@${school.code}.edu`,
      full_name: 'School Administrator',
      role: 'school_admin',
      status: 'active',
      created_at: new Date().toISOString(),
    };

    setAllTenants((prev) => {
      const filtered = prev.filter((t) => t.id !== school.id);
      return [newTenant, ...filtered];
    });

    if (school.adminEmail) {
      setUsers((prev) => {
        const filtered = prev.filter((u) => !(u.school_id === school.id && u.role === 'school_admin'));
        return [newAdmin, ...filtered];
      });
    }

    refreshTenants();
  }, [refreshTenants]);

  // ── Nuke database (needs all setters) ─────────────────────────────
  const nukeDatabase = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    if (authHook.currentUser?.role !== 'super_admin') {
      return { success: false, message: 'Unauthorized: only super admins can nuke the database.' };
    }

    const tables = [
      'student_scores', 'assessment_sheets', 'teacher_allocations',
      'students', 'teachers', 'classes', 'subjects', 'audit_logs', 'schools',
    ];

    let errorsCount = 0;
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error && error.code !== 'PGRST125') {
          console.warn(`Could not purge table ${table}:`, error.message);
          errorsCount++;
        }
      } catch (err) {
        console.warn(`Exception purging table ${table}:`, err);
      }
    }

    localStorage.clear();
    setAllTenants([]);
    setCurrentTenantId('');
    setUsers(INITIAL_USERS);
    setCurrentUserId(INITIAL_USERS[0]?.id || '');
    setClasses([]);
    setSubjects([]);
    setAllocations([]);
    setStudents([]);
    setAssessmentSheets([]);
    setStudentScores([]);
    setAuditLogs([]);
    setOfflineQueue([]);
    setIsOffline(false);

    return {
      success: true,
      message: errorsCount === 0
        ? 'Database and local storage nuked completely. Ready for a fresh start.'
        : 'Local storage and reachable database tables cleared successfully.',
    };
  }, [authHook.currentUser]);

  // ── Reset all data ────────────────────────────────────────────────
  const resetAllData = useCallback(() => {
    localStorage.clear();
    setAllTenants(INITIAL_TENANTS);
    setCurrentTenantId(INITIAL_TENANTS[0]?.id || '');
    setUsers(INITIAL_USERS);
    setCurrentUserId(INITIAL_USERS[0]?.id || '');
    setClasses(INITIAL_CLASSES);
    setSubjects(INITIAL_SUBJECTS);
    setAllocations(INITIAL_ALLOCATIONS);
    setStudents(INITIAL_STUDENTS);
    setAssessmentSheets(INITIAL_ASSESSMENT_SHEETS);
    setStudentScores(INITIAL_STUDENT_SCORES);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setOfflineQueue([]);
    setIsOffline(false);
    refreshTenants();
  }, [refreshTenants]);

  // ── Compose context value ─────────────────────────────────────────
  const value = useMemo(() => ({
    allTenants,
    allUsers: users,
    currentTenant: currentTenant!,
    currentUser: authHook.currentUser,
    availableTeachers,
    isAuthenticated,
    loginWithEmailPassword: authHook.loginWithEmailPassword,
    logout: authHook.logout,
    tenantClasses,
    tenantSubjects,
    tenantAllocations,
    tenantStudents,
    tenantAssessmentSheets,
    tenantScores,
    tenantAuditLogs,
    teacherAllocations,
    teacherSheets,
    isOffline,
    isSyncing,
    offlineQueue,
    toggleOffline: gradebook.toggleOffline,
    syncOfflineQueue: gradebook.syncOfflineQueue,
    switchTenant,
    loginAsRole: authHook.loginAsRole,
    provisionNewTenant: tenantMgmt.provisionNewTenant,
    updateTenant: tenantMgmt.updateTenant,
    deleteTenant: tenantMgmt.deleteTenant,
    updateTenantSettings: tenantMgmt.updateTenantSettings,
    refreshTenants,
    registerSchool,
    addTeacher: teacherMgmt.addTeacher,
    generateInviteKey: teacherMgmt.generateInviteKey,
    redeemInvite: teacherMgmt.redeemInvite,
    toggleTeacherStatus: teacherMgmt.toggleTeacherStatus,
    addStudent: studentMgmt.addStudent,
    updateStudent: studentMgmt.updateStudent,
    deleteStudent: studentMgmt.deleteStudent,
    allocateTeacher: gradebook.allocateTeacher,
    deallocateTeacher: gradebook.deallocateTeacher,
    saveScore: gradebook.saveScore,
    submitSheetForReview: gradebook.submitSheetForReview,
    reviewAssessmentSheet: gradebook.reviewAssessmentSheet,
    getOrCreateSheet: gradebook.getOrCreateSheet,
    resetAllData,
    nukeDatabase,
  }), [
    allTenants, users, currentTenant, authHook.currentUser, availableTeachers,
    isAuthenticated, authHook.loginWithEmailPassword, authHook.logout,
    tenantClasses, tenantSubjects, tenantAllocations, tenantStudents,
    tenantAssessmentSheets, tenantScores, tenantAuditLogs,
    teacherAllocations, teacherSheets,
    isOffline, isSyncing, offlineQueue,
    gradebook.toggleOffline, gradebook.syncOfflineQueue,
    switchTenant, authHook.loginAsRole,
    tenantMgmt.provisionNewTenant, tenantMgmt.updateTenant, tenantMgmt.deleteTenant,
    tenantMgmt.updateTenantSettings, refreshTenants, registerSchool,
    teacherMgmt.addTeacher, teacherMgmt.generateInviteKey, teacherMgmt.redeemInvite,
    teacherMgmt.toggleTeacherStatus,
    studentMgmt.addStudent, studentMgmt.updateStudent, studentMgmt.deleteStudent,
    gradebook.allocateTeacher, gradebook.deallocateTeacher,
    gradebook.saveScore, gradebook.submitSheetForReview, gradebook.reviewAssessmentSheet,
    gradebook.getOrCreateSheet, resetAllData, nukeDatabase,
  ]);

  return <TenantAuthContext.Provider value={value}>{children}</TenantAuthContext.Provider>;
};

export const useTenantAuth = () => {
  const context = useContext(TenantAuthContext);
  if (!context) throw new Error('useTenantAuth must be used within TenantAuthProvider');
  return context;
};
