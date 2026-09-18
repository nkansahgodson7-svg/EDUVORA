import {
  Tenant,
  UserProfile,
  ClassEntity,
  SubjectEntity,
  TeacherAllocation,
  Student,
  AssessmentSheet,
  StudentScore,
  GradingRule,
  AuditLog,
} from '../types';

export function getCurrentSession(): string {
  const now = new Date();
  // Academic year starts in September
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}/${year + 1}`;
}

export const DEFAULT_GRADING_RULES: GradingRule[] = [
  { grade: 'A+', min_score: 90, max_score: 100, points: 4.0, remark: 'Distinction', color_class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  { grade: 'A', min_score: 80, max_score: 89, points: 3.8, remark: 'Excellent', color_class: 'bg-teal-500/20 text-teal-400 border-teal-500/40' },
  { grade: 'B', min_score: 70, max_score: 79, points: 3.0, remark: 'Very Good', color_class: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  { grade: 'C', min_score: 60, max_score: 69, points: 2.5, remark: 'Good / Credit', color_class: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  { grade: 'D', min_score: 50, max_score: 59, points: 2.0, remark: 'Pass', color_class: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
  { grade: 'F', min_score: 0, max_score: 49, points: 0.0, remark: 'Fail / Needs Review', color_class: 'bg-rose-500/20 text-rose-400 border-rose-500/40' },
];

export function calculateGrade(total: number): { grade: string; points: number; remark: string } {
  for (const rule of DEFAULT_GRADING_RULES) {
    if (total >= rule.min_score && total <= rule.max_score) {
      return { grade: rule.grade, points: rule.points, remark: rule.remark };
    }
  }
  return { grade: 'F', points: 0.0, remark: 'Fail' };
}

export const INITIAL_TENANTS: Tenant[] = [];

export const INITIAL_USERS: UserProfile[] = [
  // Super Admin
  {
    id: 'user-super-01',
    school_id: null,
    email: 'superadmin@edutenant.io',
    full_name: 'Dr. Kingsley Vance',
    role: 'super_admin',
    phone: '+1 (800) 555-0199',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    created_at: '2025-01-01T00:00:00Z',
  }
];

export const INITIAL_CLASSES: ClassEntity[] = [];
export const INITIAL_SUBJECTS: SubjectEntity[] = [];
export const INITIAL_ALLOCATIONS: TeacherAllocation[] = [];
export const INITIAL_STUDENTS: Student[] = [];
export const INITIAL_ASSESSMENT_SHEETS: AssessmentSheet[] = [];
export const INITIAL_STUDENT_SCORES: StudentScore[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
