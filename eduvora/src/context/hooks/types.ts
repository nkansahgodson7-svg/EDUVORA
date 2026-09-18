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
} from '../../types';

export interface OfflineQueueItem {
  id: string;
  type: 'SAVE_SCORE' | 'SUBMIT_SHEET';
  payload: any;
  timestamp: string;
}

export interface AuthState {
  users: UserProfile[];
  setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  currentUserId: string;
  setCurrentUserId: React.Dispatch<React.SetStateAction<string>>;
  isAuthenticated: boolean;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  currentTenant: Tenant | null;
  allTenants: Tenant[];
}

export interface TenantState {
  allTenants: Tenant[];
  setAllTenants: React.Dispatch<React.SetStateAction<Tenant[]>>;
  currentTenantId: string;
  setCurrentTenantId: React.Dispatch<React.SetStateAction<string>>;
  users: UserProfile[];
  setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  classes: ClassEntity[];
  setClasses: React.Dispatch<React.SetStateAction<ClassEntity[]>>;
  subjects: SubjectEntity[];
  setSubjects: React.Dispatch<React.SetStateAction<SubjectEntity[]>>;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  auditLogs: AuditLog[];
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>;
  currentUser: UserProfile;
  refreshTenants: () => Promise<void>;
}

export interface StudentState {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  currentTenant: Tenant | null;
}

export interface TeacherState {
  users: UserProfile[];
  setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  currentTenant: Tenant | null;
  currentUser: UserProfile;
  setCurrentUserId: React.Dispatch<React.SetStateAction<string>>;
  setCurrentTenantId: React.Dispatch<React.SetStateAction<string>>;
  auditLogs: AuditLog[];
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>;
}

export interface GradebookState {
  assessmentSheets: AssessmentSheet[];
  setAssessmentSheets: React.Dispatch<React.SetStateAction<AssessmentSheet[]>>;
  studentScores: StudentScore[];
  setStudentScores: React.Dispatch<React.SetStateAction<StudentScore[]>>;
  allocations: TeacherAllocation[];
  setAllocations: React.Dispatch<React.SetStateAction<TeacherAllocation[]>>;
  students: Student[];
  currentTenant: Tenant | null;
  currentUser: UserProfile;
  isOffline: boolean;
  setIsOffline: React.Dispatch<React.SetStateAction<boolean>>;
  isSyncing: boolean;
  setIsSyncing: React.Dispatch<React.SetStateAction<boolean>>;
  offlineQueue: OfflineQueueItem[];
  setOfflineQueue: React.Dispatch<React.SetStateAction<OfflineQueueItem[]>>;
  auditLogs: AuditLog[];
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>;
}
