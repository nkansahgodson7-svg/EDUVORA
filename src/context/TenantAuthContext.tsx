import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
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
  calculateGrade,
} from '../lib/mockData';

interface OfflineQueueItem {
  id: string;
  type: 'SAVE_SCORE' | 'SUBMIT_SHEET';
  payload: any;
  timestamp: string;
}

interface TenantAuthContextType {
  // Tenancy & Auth
  allTenants: Tenant[];
  allUsers: UserProfile[];
  currentTenant: Tenant;
  currentUser: UserProfile;
  availableTeachers: UserProfile[];
  isAuthenticated: boolean;
  loginWithEmailPassword: (email: string, password?: string) => { success: boolean; user?: UserProfile; message?: string };
  logout: () => void;
  
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
  ) => { school: Tenant; admin: UserProfile };
  updateTenant: (tenantId: string, data: Partial<Tenant>) => void;
  deleteTenant: (tenantId: string) => void;
  updateTenantSettings: (settings: Partial<Tenant>) => void;
  refreshTenants: () => Promise<void>;
  registerSchool: (school: { id: string; name: string; code: string; adminEmail?: string }) => void;
  
  // Teachers Management
  addTeacher: (name: string, email: string, phone?: string) => UserProfile;
  generateInviteKey: (teacherId: string) => { token: string; expiresAt: string };
  redeemInvite: (token: string, password?: string) => { success: boolean; user?: UserProfile; message: string };
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
  // State initialization with localStorage fallback
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

  // Offline Engine State
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>(() => loadStorage(STORAGE_KEYS.OFFLINE_QUEUE, []));

  // Sync to localStorage
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(allTenants)); }, [allTenants]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CURRENT_TENANT_ID, JSON.stringify(currentTenantId)); }, [currentTenantId]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, JSON.stringify(currentUserId)); }, [currentUserId]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, JSON.stringify(isAuthenticated)); }, [isAuthenticated]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes)); }, [classes]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects)); }, [subjects]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.ALLOCATIONS, JSON.stringify(allocations)); }, [allocations]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students)); }, [students]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.SHEETS, JSON.stringify(assessmentSheets)); }, [assessmentSheets]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.SCORES, JSON.stringify(studentScores)); }, [studentScores]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(auditLogs)); }, [auditLogs]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(offlineQueue)); }, [offlineQueue]);

  // Supabase Tenant Synchronization
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
            current_session: s.current_session || '2025/2026',
            current_term: s.current_term || 'First Term',
            address: s.address || '',
            phone: s.phone || '',
            contact_email: s.contact_email || '',
            headmaster_name: s.headmaster_name || '',
            created_at: s.created_at || new Date().toISOString(),
          }));

          // Merge: Supabase tenants take precedence, keep any mock/local tenants
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

  // Fetch Supabase schools on mount
  useEffect(() => {
    refreshTenants();
  }, [refreshTenants]);

  const registerSchool = useCallback((school: { id: string; name: string; code: string; adminEmail?: string }) => {
    const newTenant: Tenant = {
      id: school.id,
      name: school.name,
      subdomain: school.code || school.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      logo_url: '',
      primary_color: '#1a56db',
      subscription_tier: 'growth',
      status: 'active',
      current_session: '2025/2026',
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

    // Refresh database in background
    refreshTenants();
  }, [refreshTenants]);

  // Derived Active Entities
  const currentTenant = useMemo(() => {
    return allTenants.find((t) => t.id === currentTenantId) || allTenants[0] || null;
  }, [allTenants, currentTenantId]);

  const currentUser = useMemo(() => {
    const user = users.find((u) => u.id === currentUserId);
    if (user) return user;
    if (currentTenant) {
      // Fallback to first school admin of current tenant
      const admin = users.find((u) => u.school_id === currentTenant.id && u.role === 'school_admin');
      if (admin) return admin;
    }
    return users[0];
  }, [users, currentUserId, currentTenant]);

  // Tenant Scoped Data Filters
  const tenantClasses = useMemo(() => currentTenant ? classes.filter((c) => c.school_id === currentTenant.id) : [], [classes, currentTenant]);
  const tenantSubjects = useMemo(() => currentTenant ? subjects.filter((s) => s.school_id === currentTenant.id) : [], [subjects, currentTenant]);
  const tenantAllocations = useMemo(() => currentTenant ? allocations.filter((a) => a.school_id === currentTenant.id) : [], [allocations, currentTenant]);
  const tenantStudents = useMemo(() => currentTenant ? students.filter((s) => s.school_id === currentTenant.id) : [], [students, currentTenant]);
  const tenantAssessmentSheets = useMemo(() => currentTenant ? assessmentSheets.filter((sh) => sh.school_id === currentTenant.id) : [], [assessmentSheets, currentTenant]);
  const tenantScores = useMemo(() => currentTenant ? studentScores.filter((sc) => sc.school_id === currentTenant.id) : [], [studentScores, currentTenant]);
  const tenantAuditLogs = useMemo(() => currentTenant ? auditLogs.filter((l) => l.school_id === currentTenant.id) : [], [auditLogs, currentTenant]);

  const availableTeachers = useMemo(() => {
    return currentTenant ? users.filter((u) => u.school_id === currentTenant.id && u.role === 'teacher') : [];
  }, [users, currentTenant]);

  // Teacher Scoped Filters
  const teacherAllocations = useMemo(() => {
    if (currentUser.role !== 'teacher') return tenantAllocations;
    return tenantAllocations.filter((a) => a.teacher_id === currentUser.id);
  }, [currentUser, tenantAllocations]);

  const teacherSheets = useMemo(() => {
    if (currentUser.role !== 'teacher') return tenantAssessmentSheets;
    return tenantAssessmentSheets.filter((sh) => sh.teacher_id === currentUser.id);
  }, [currentUser, tenantAssessmentSheets]);

  // Tenant Switcher
  const switchTenant = (schoolId: string) => {
    const targetSchool = allTenants.find((t) => t.id === schoolId);
    if (!targetSchool) return;
    setCurrentTenantId(schoolId);

    // If current user is not a super_admin, switch to target school's master admin
    if (currentUser.role !== 'super_admin') {
      const admin = users.find((u) => u.school_id === schoolId && u.role === 'school_admin');
      if (admin) {
        setCurrentUserId(admin.id);
      }
    }
  };

  // Quick Role / Impersonation Login
  const loginAsRole = (role: UserRole, specificUserId?: string, targetSchoolId?: string) => {
    const schoolToUse = targetSchoolId || currentTenant?.id || '';
    setIsAuthenticated(true);
    if (specificUserId) {
      const targetUser = users.find((u) => u.id === specificUserId);
      if (targetUser) {
        setCurrentUserId(targetUser.id);
        if (targetUser.school_id) setCurrentTenantId(targetUser.school_id);
        return;
      }
    }

    if (role === 'super_admin') {
      const superUser = users.find((u) => u.role === 'super_admin');
      if (superUser) setCurrentUserId(superUser.id);
    } else if (role === 'school_admin') {
      let schoolAdmin = users.find((u) => u.school_id === schoolToUse && u.role === 'school_admin');
      if (!schoolAdmin) {
        const tenant = allTenants.find((t) => t.id === schoolToUse);
        const newAdmin: UserProfile = {
          id: `admin-${schoolToUse}`,
          school_id: schoolToUse,
          email: tenant?.contact_email || `admin@${tenant?.subdomain || 'school'}.edu`,
          full_name: tenant?.headmaster_name || `${tenant?.name || 'School'} Administrator`,
          role: 'school_admin',
          status: 'active',
          created_at: new Date().toISOString(),
        };
        setUsers((prev) => [newAdmin, ...prev]);
        schoolAdmin = newAdmin;
      }
      setCurrentUserId(schoolAdmin.id);
      setCurrentTenantId(schoolToUse);
    } else if (role === 'teacher') {
      const teacher = users.find((u) => u.school_id === schoolToUse && u.role === 'teacher');
      if (teacher) {
        setCurrentUserId(teacher.id);
        setCurrentTenantId(schoolToUse);
      }
    }
  };

  // Direct Email and Password Authentication
  const loginWithEmailPassword = (email: string, password?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, message: 'Please provide a valid email address and password.' };
    }

    const superAdminEnvEmail = import.meta.env.VITE_SUPER_ADMIN_EMAIL?.toLowerCase();
    const superAdminEnvPassword = import.meta.env.VITE_SUPER_ADMIN_PASSWORD;

    // Exact email match against registered users
    const matchedUser = users.find((u) => u.email.toLowerCase() === cleanEmail);
    
    // Check if it's the super admin using environment variable credentials
    if (superAdminEnvEmail && cleanEmail === superAdminEnvEmail) {
      if (password !== superAdminEnvPassword) {
        return { success: false, message: 'Invalid credentials. Please enter a valid email and password.' };
      }
      
      let saUser: UserProfile | undefined = matchedUser;
      if (!saUser) {
        saUser = {
          id: 'user-super-env',
          school_id: null,
          email: superAdminEnvEmail,
          full_name: 'Platform Super Admin',
          role: 'super_admin',
          status: 'active',
          created_at: new Date().toISOString(),
        } as UserProfile;
        
        const finalUser = saUser;
        setUsers((prev) => [finalUser, ...prev]);
      }
      
      setCurrentUserId(saUser.id);
      setIsAuthenticated(true);
      return { success: true, user: saUser };
    }

    if (matchedUser) {
      // In a real application, you would verify a hashed password here.
      // For this implementation, we simulate password validation (e.g., checking it's not empty/too short).
      if (password.length < 6) {
        return { success: false, message: 'Invalid credentials. Please enter a valid email and password.' };
      }

      setCurrentUserId(matchedUser.id);
      if (matchedUser.school_id) {
        setCurrentTenantId(matchedUser.school_id);
      }
      setIsAuthenticated(true);
      return { success: true, user: matchedUser };
    }

    return { success: false, message: 'Invalid credentials. Please enter a valid email and password.' };
  };

  // Sign out / Exit session
  const logout = () => {
    setIsAuthenticated(false);
  };

  // Super Admin: Provision New School Tenant
  const provisionNewTenant = (
    tenantData: { name: string; subdomain: string; address: string; headmaster_name: string },
    adminData: { name: string; email: string; phone: string },
    seedPreset: 'standard' | 'secondary' | 'minimal'
  ) => {
    const newSchoolId = `school-${tenantData.subdomain.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;
    
    const newTenant: Tenant = {
      id: newSchoolId,
      name: tenantData.name,
      subdomain: tenantData.subdomain.toLowerCase(),
      logo_url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=160&auto=format&fit=crop&q=80',
      primary_color: '#4f46e5', // Default color since it's removed from UI
      subscription_tier: 'starter', // Default tier since it's removed from UI
      status: 'active',
      current_session: '2025/2026',
      current_term: 'First Term',
      address: tenantData.address,
      phone: adminData.phone,
      contact_email: adminData.email,
      headmaster_name: tenantData.headmaster_name,
      created_at: new Date().toISOString(),
    };

    const newAdmin: UserProfile = {
      id: `admin-${newSchoolId}`,
      school_id: newSchoolId,
      email: adminData.email,
      full_name: adminData.name,
      role: 'school_admin',
      status: 'active',
      phone: adminData.phone,
      created_at: new Date().toISOString(),
    };

    // Preliminary seed classes & subjects
    const newClasses: ClassEntity[] = [];
    const newSubjects: SubjectEntity[] = [];

    if (seedPreset === 'standard' || seedPreset === 'secondary') {
      newClasses.push(
        { id: `cls-${newSchoolId}-1`, school_id: newSchoolId, name: 'Grade 9A', grade_level: 9, academic_year: '2025/2026', room_number: 'Room 101', capacity: 35 },
        { id: `cls-${newSchoolId}-2`, school_id: newSchoolId, name: 'Grade 9B', grade_level: 9, academic_year: '2025/2026', room_number: 'Room 102', capacity: 35 },
        { id: `cls-${newSchoolId}-3`, school_id: newSchoolId, name: 'Grade 10A', grade_level: 10, academic_year: '2025/2026', room_number: 'Room 201', capacity: 30 }
      );
      newSubjects.push(
        { id: `sub-${newSchoolId}-mth`, school_id: newSchoolId, name: 'Mathematics', code: 'MTH-101', category: 'core' },
        { id: `sub-${newSchoolId}-eng`, school_id: newSchoolId, name: 'English Language', code: 'ENG-101', category: 'core' },
        { id: `sub-${newSchoolId}-sci`, school_id: newSchoolId, name: 'Integrated Science', code: 'SCI-101', category: 'core' },
        { id: `sub-${newSchoolId}-csc`, school_id: newSchoolId, name: 'Computer Studies', code: 'CSC-101', category: 'vocational' }
      );
    } else {
      newClasses.push({ id: `cls-${newSchoolId}-1`, school_id: newSchoolId, name: 'Year 1A', grade_level: 1, academic_year: '2025/2026', capacity: 25 });
      newSubjects.push({ id: `sub-${newSchoolId}-mth`, school_id: newSchoolId, name: 'Basic Mathematics', code: 'MTH-001', category: 'core' });
    }

    // Add seed students
    const sampleStudents: Student[] = [
      {
        id: `stu-${newSchoolId}-01`,
        school_id: newSchoolId,
        admission_number: `${tenantData.subdomain.toUpperCase().slice(0, 3)}-001`,
        full_name: 'Jordan Reed',
        class_id: newClasses[0].id,
        gender: 'Male',
        date_of_birth: '2011-03-12',
        guardian_name: 'Samuel Reed',
        guardian_phone: '+1 (555) 777-8899',
        attendance_percentage: 96.0,
        created_at: new Date().toISOString(),
      },
      {
        id: `stu-${newSchoolId}-02`,
        school_id: newSchoolId,
        admission_number: `${tenantData.subdomain.toUpperCase().slice(0, 3)}-002`,
        full_name: 'Sophia Patel',
        class_id: newClasses[0].id,
        gender: 'Female',
        date_of_birth: '2011-06-25',
        guardian_name: 'Meera Patel',
        guardian_phone: '+1 (555) 777-8890',
        attendance_percentage: 98.0,
        created_at: new Date().toISOString(),
      },
    ];

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      school_id: newSchoolId,
      actor_name: currentUser.full_name,
      actor_role: currentUser.role,
      action: 'TENANT_PROVISIONED',
      details: `Provisioned school "${tenantData.name}" (${tenantData.subdomain}). Master Admin credentials assigned to ${adminData.email}.`,
      timestamp: new Date().toISOString(),
    };

    setAllTenants((prev) => [newTenant, ...prev]);
    setUsers((prev) => [newAdmin, ...prev]);
    setClasses((prev) => [...prev, ...newClasses]);
    setSubjects((prev) => [...prev, ...newSubjects]);
    setStudents((prev) => [...prev, ...sampleStudents]);
    setAuditLogs((prev) => [newLog, ...prev]);

    return { school: newTenant, admin: newAdmin };
  };

  const updateTenant = (tenantId: string, data: Partial<Tenant>) => {
    setAllTenants((prev) =>
      prev.map((t) => (t.id === tenantId ? { ...t, ...data } : t))
    );
    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    if (isUUID(tenantId)) {
      const dbUpdates: any = {};
      if (data.name) dbUpdates.name = data.name;
      if (data.subdomain) dbUpdates.code = data.subdomain;
      if (data.status) dbUpdates.status = data.status;
      if (Object.keys(dbUpdates).length > 0) {
        supabase.from('schools').update(dbUpdates).eq('id', tenantId).then(({ error }) => {
          if (error) console.warn('Could not update school in database:', error.message);
        });
      }
    }
  };

  const deleteTenant = (tenantId: string) => {
    setAllTenants((prev) => prev.filter((t) => t.id !== tenantId));
    // Clean up other dependent entities
    setUsers((prev) => prev.filter((u) => u.school_id !== tenantId));
    setClasses((prev) => prev.filter((c) => c.school_id !== tenantId));
    setStudents((prev) => prev.filter((s) => s.school_id !== tenantId));

    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    if (isUUID(tenantId)) {
      supabase.from('schools').delete().eq('id', tenantId).then(({ error }) => {
        if (error) console.warn('Could not delete school from database:', error.message);
      });
    }
  };

  const updateTenantSettings = (settings: Partial<Tenant>) => {
    setAllTenants((prev) =>
      prev.map((t) => (t.id === currentTenant.id ? { ...t, ...settings } : t))
    );
    const log: AuditLog = {
      id: `log-${Date.now()}`,
      school_id: currentTenant.id,
      actor_name: currentUser.full_name,
      actor_role: currentUser.role,
      action: 'SETTINGS_UPDATED',
      details: `Updated school settings: ${Object.keys(settings).join(', ')}`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);
  };

  // Teacher Management
  const addTeacher = (name: string, email: string, phone?: string): UserProfile => {
    const token = `INV-${currentTenant.subdomain.toUpperCase().slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const expires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const newTeacher: UserProfile = {
      id: `teacher-${Date.now()}`,
      school_id: currentTenant.id,
      email,
      full_name: name,
      role: 'teacher',
      phone: phone || '',
      status: 'invited',
      invite_token: token,
      invite_expires_at: expires,
      created_at: new Date().toISOString(),
    };

    setUsers((prev) => [newTeacher, ...prev]);

    const log: AuditLog = {
      id: `log-${Date.now()}`,
      school_id: currentTenant.id,
      actor_name: currentUser.full_name,
      actor_role: currentUser.role,
      action: 'TEACHER_INVITED',
      details: `Created teacher profile for ${name} (${email}) with access key ${token}`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);

    return newTeacher;
  };

  const generateInviteKey = (teacherId: string) => {
    const token = `INV-${currentTenant.subdomain.toUpperCase().slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    setUsers((prev) =>
      prev.map((u) =>
        u.id === teacherId
          ? { ...u, invite_token: token, invite_expires_at: expiresAt, status: 'invited' }
          : u
      )
    );
    return { token, expiresAt };
  };

  const redeemInvite = (token: string, _password?: string) => {
    const trimmed = token.trim().toUpperCase();
    const teacher = users.find(
      (u) => u.invite_token?.toUpperCase() === trimmed && u.status === 'invited'
    );
    if (!teacher) {
      return { success: false, message: 'Invalid or expired invitation token. Please check with your School Administrator.' };
    }

    const updatedUser: UserProfile = {
      ...teacher,
      status: 'active',
      invite_token: undefined,
    };

    setUsers((prev) => prev.map((u) => (u.id === teacher.id ? updatedUser : u)));
    setCurrentUserId(teacher.id);
    if (teacher.school_id) setCurrentTenantId(teacher.school_id);

    const log: AuditLog = {
      id: `log-${Date.now()}`,
      school_id: teacher.school_id || currentTenant.id,
      actor_name: teacher.full_name,
      actor_role: 'teacher',
      action: 'INVITE_REDEEMED',
      details: `Teacher ${teacher.full_name} completed onboarding and activated their account.`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);

    return { success: true, user: updatedUser, message: 'Invitation verified successfully! Welcome to your Teacher Grade Entry portal.' };
  };

  const toggleTeacherStatus = (teacherId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== teacherId) return u;
        const newStatus = u.status === 'active' ? 'deactivated' : 'active';
        return { ...u, status: newStatus };
      })
    );
  };

  // Student CRUD
  const addStudent = (studentData: Omit<Student, 'id' | 'school_id' | 'created_at'>) => {
    const newStudent: Student = {
      ...studentData,
      id: `stu-${Date.now()}`,
      school_id: currentTenant.id,
      created_at: new Date().toISOString(),
    };
    setStudents((prev) => [newStudent, ...prev]);
  };

  const updateStudent = (studentId: string, data: Partial<Student>) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, ...data } : s))
    );
  };

  const deleteStudent = (studentId: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
  };

  // Allocations Matrix
  const allocateTeacher = (teacherId: string, classId: string, subjectId: string, term: string) => {
    const exists = allocations.some(
      (a) =>
        a.school_id === currentTenant.id &&
        a.teacher_id === teacherId &&
        a.class_id === classId &&
        a.subject_id === subjectId &&
        a.academic_term === term
    );
    if (exists) return;

    const newAlloc: TeacherAllocation = {
      id: `alloc-${Date.now()}`,
      school_id: currentTenant.id,
      teacher_id: teacherId,
      class_id: classId,
      subject_id: subjectId,
      academic_term: term,
    };
    setAllocations((prev) => [newAlloc, ...prev]);

    // Ensure corresponding assessment sheet exists
    getOrCreateSheet(classId, subjectId, teacherId);
  };

  const deallocateTeacher = (allocationId: string) => {
    setAllocations((prev) => prev.filter((a) => a.id !== allocationId));
  };

  // Grade Entry & Sheets
  const getOrCreateSheet = (classId: string, subjectId: string, teacherId: string): AssessmentSheet => {
    const existing = assessmentSheets.find(
      (s) =>
        s.school_id === currentTenant.id &&
        s.class_id === classId &&
        s.subject_id === subjectId &&
        s.term === currentTenant.current_term
    );
    if (existing) return existing;

    const newSheet: AssessmentSheet = {
      id: `sheet-${classId}-${subjectId}-${Date.now().toString().slice(-4)}`,
      school_id: currentTenant.id,
      class_id: classId,
      subject_id: subjectId,
      teacher_id: teacherId,
      term: currentTenant.current_term,
      academic_year: currentTenant.current_session,
      max_ca1: 20,
      max_ca2: 20,
      max_exam: 60,
      status: 'draft',
      updated_at: new Date().toISOString(),
    };

    setAssessmentSheets((prev) => [newSheet, ...prev]);
    return newSheet;
  };

  const saveScore = (
    sheetId: string,
    studentId: string,
    ca1: number,
    ca2: number,
    exam: number,
    remarks?: string
  ) => {
    const sheet = assessmentSheets.find((s) => s.id === sheetId);
    const maxCA1 = sheet?.max_ca1 || 20;
    const maxCA2 = sheet?.max_ca2 || 20;
    const maxExam = sheet?.max_exam || 60;

    // Validate boundaries
    const safeCA1 = Math.min(Math.max(0, Number(ca1) || 0), maxCA1);
    const safeCA2 = Math.min(Math.max(0, Number(ca2) || 0), maxCA2);
    const safeExam = Math.min(Math.max(0, Number(exam) || 0), maxExam);
    const total = safeCA1 + safeCA2 + safeExam;

    const { grade, points, remark: autoRemark } = calculateGrade(total);
    const finalRemark = remarks !== undefined && remarks.trim() !== '' ? remarks : autoRemark;

    const scorePayload: Partial<StudentScore> = {
      ca1: safeCA1,
      ca2: safeCA2,
      exam: safeExam,
      total,
      grade,
      points,
      remarks: finalRemark,
      updated_at: new Date().toISOString(),
      is_synced: !isOffline,
    };

    if (isOffline) {
      // Buffer in offline queue
      setOfflineQueue((prev) => [
        ...prev.filter((item) => !(item.type === 'SAVE_SCORE' && item.payload.sheetId === sheetId && item.payload.studentId === studentId)),
        {
          id: `queue-${Date.now()}`,
          type: 'SAVE_SCORE',
          payload: { sheetId, studentId, ...scorePayload },
          timestamp: new Date().toISOString(),
        },
      ]);
    }

    setStudentScores((prev) => {
      const idx = prev.findIndex((s) => s.sheet_id === sheetId && s.student_id === studentId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          ...scorePayload,
        } as StudentScore;
        return updated;
      } else {
        const newScore: StudentScore = {
          id: `score-${Date.now()}-${studentId.slice(-4)}`,
          school_id: currentTenant.id,
          sheet_id: sheetId,
          student_id: studentId,
          ca1: safeCA1,
          ca2: safeCA2,
          exam: safeExam,
          total,
          grade,
          points,
          remarks: finalRemark,
          updated_at: new Date().toISOString(),
          is_synced: !isOffline,
        };
        return [newScore, ...prev];
      }
    });

    // Touch sheet updated_at
    setAssessmentSheets((prev) =>
      prev.map((s) => (s.id === sheetId ? { ...s, updated_at: new Date().toISOString() } : s))
    );
  };

  const submitSheetForReview = (sheetId: string) => {
    if (isOffline) {
      setOfflineQueue((prev) => [
        ...prev,
        {
          id: `queue-submit-${Date.now()}`,
          type: 'SUBMIT_SHEET',
          payload: { sheetId },
          timestamp: new Date().toISOString(),
        },
      ]);
    }

    setAssessmentSheets((prev) =>
      prev.map((s) =>
        s.id === sheetId
          ? {
              ...s,
              status: 'pending_approval',
              submitted_at: new Date().toISOString(),
              admin_remarks: 'Submitted by teacher for administrative review and lock-in.',
            }
          : s
      )
    );

    const log: AuditLog = {
      id: `log-${Date.now()}`,
      school_id: currentTenant.id,
      actor_name: currentUser.full_name,
      actor_role: currentUser.role,
      action: 'GRADE_SHEET_SUBMITTED',
      details: `Teacher ${currentUser.full_name} submitted assessment sheet ${sheetId} for Master Admin review.`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);
  };

  const reviewAssessmentSheet = (sheetId: string, action: 'approved' | 'rejected', adminRemarks?: string) => {
    setAssessmentSheets((prev) =>
      prev.map((s) =>
        s.id === sheetId
          ? {
              ...s,
              status: action,
              approved_at: action === 'approved' ? new Date().toISOString() : undefined,
              admin_remarks: adminRemarks || (action === 'approved' ? 'Approved and locked by School Administrator.' : 'Revision requested.'),
            }
          : s
      )
    );

    const log: AuditLog = {
      id: `log-${Date.now()}`,
      school_id: currentTenant.id,
      actor_name: currentUser.full_name,
      actor_role: currentUser.role,
      action: action === 'approved' ? 'GRADE_SHEET_APPROVED' : 'GRADE_SHEET_REJECTED',
      details: `${action.toUpperCase()}: Grade register ${sheetId} reviewed. ${adminRemarks || ''}`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [log, ...prev]);
  };

  // Offline Simulator Toggle
  const toggleOffline = () => {
    if (isOffline) {
      // Going Online: auto-sync
      setIsOffline(false);
      syncOfflineQueue();
    } else {
      setIsOffline(true);
    }
  };

  const syncOfflineQueue = () => {
    if (offlineQueue.length === 0) return;
    setIsSyncing(true);

    setTimeout(() => {
      // Mark all scores as synced
      setStudentScores((prev) => prev.map((s) => ({ ...s, is_synced: true })));
      setOfflineQueue([]);
      setIsSyncing(false);

      const log: AuditLog = {
        id: `log-${Date.now()}`,
        school_id: currentTenant.id,
        actor_name: currentUser.full_name,
        actor_role: currentUser.role,
        action: 'OFFLINE_SYNC_COMPLETED',
        details: `Successfully flushed and reconciled offline changes to central database.`,
        timestamp: new Date().toISOString(),
      };
      setAuditLogs((prev) => [log, ...prev]);
    }, 800);
  };

  const resetAllData = () => {
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
  };

  const nukeDatabase = async (): Promise<{ success: boolean; message: string }> => {
    // 1. Delete all tables in Supabase in order
    const tables = [
      'student_scores',
      'assessment_sheets',
      'teacher_allocations',
      'students',
      'teachers',
      'classes',
      'subjects',
      'audit_logs',
      'schools',
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

    // 2. Clear all local storage keys
    localStorage.clear();

    // 3. Reset in-memory states completely
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
  };

  const value = {
    allTenants,
    allUsers: users,
    currentTenant,
    currentUser,
    availableTeachers,
    isAuthenticated,
    loginWithEmailPassword,
    logout,
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
    toggleOffline,
    syncOfflineQueue,
    switchTenant,
    loginAsRole,
    provisionNewTenant,
    updateTenant,
    deleteTenant,
    updateTenantSettings,
    refreshTenants,
    registerSchool,
    addTeacher,
    generateInviteKey,
    redeemInvite,
    toggleTeacherStatus,
    addStudent,
    updateStudent,
    deleteStudent,
    allocateTeacher,
    deallocateTeacher,
    saveScore,
    submitSheetForReview,
    reviewAssessmentSheet,
    getOrCreateSheet,
    resetAllData,
    nukeDatabase,
  };

  return <TenantAuthContext.Provider value={value}>{children}</TenantAuthContext.Provider>;
};

export const useTenantAuth = () => {
  const context = useContext(TenantAuthContext);
  if (!context) throw new Error('useTenantAuth must be used within TenantAuthProvider');
  return context;
};
