export type UserRole = 'super_admin' | 'school_admin' | 'teacher';

export type TenantStatus = 'active' | 'suspended' | 'trial';
export type SubscriptionTier = 'starter' | 'growth' | 'enterprise';

export interface Tenant {
  id: string; // school_id
  name: string;
  subdomain: string; // e.g. "apex-academy" -> apex-academy.edutenant.io
  logo_url: string;
  primary_color: string;
  subscription_tier: SubscriptionTier;
  status: TenantStatus;
  current_session: string; // e.g. "2025/2026"
  current_term: string; // e.g. "First Term"
  address: string;
  phone: string;
  contact_email: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  school_id: string | null; // null for super_admin
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  status: 'active' | 'invited' | 'deactivated';
  invite_token?: string;
  invite_expires_at?: string;
  created_at: string;
}

export interface ClassEntity {
  id: string;
  school_id: string;
  name: string; // e.g. "Grade 9A", "SS1 Science"
  grade_level: number;
  academic_year: string;
  room_number?: string;
  capacity?: number;
}

export interface SubjectEntity {
  id: string;
  school_id: string;
  name: string; // e.g. "Mathematics"
  code: string; // e.g. "MTH-101"
  category: 'core' | 'elective' | 'vocational';
  description?: string;
}

export interface TeacherAllocation {
  id: string;
  school_id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
  academic_term: string;
}

export interface Student {
  id: string;
  school_id: string;
  admission_number: string;
  full_name: string;
  class_id: string;
  gender: 'Male' | 'Female' | 'Other';
  date_of_birth: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email?: string;
  attendance_percentage: number;
  avatar_url?: string;
  created_at: string;
}

export type AssessmentStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';

export interface AssessmentSheet {
  id: string;
  school_id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  term: string;
  academic_year: string;
  max_ca1: number; // e.g. 20
  max_ca2: number; // e.g. 20
  max_exam: number; // e.g. 60
  status: AssessmentStatus;
  updated_at: string;
  submitted_at?: string;
  approved_at?: string;
  admin_remarks?: string;
}

export interface StudentScore {
  id: string;
  school_id: string;
  sheet_id: string;
  student_id: string;
  ca1: number; // continuous assessment 1
  ca2: number; // continuous assessment 2 / project
  exam: number; // final examination
  total: number; // ca1 + ca2 + exam (max 100)
  grade: string; // e.g. A, B, C, D, F
  points: number; // GPA points (e.g. 4.0, 3.0)
  remarks: string; // "Excellent", "Credit", "Pass", etc.
  updated_at: string;
  is_synced: boolean;
}

export interface GradingRule {
  grade: string;
  min_score: number;
  max_score: number;
  points: number;
  remark: string;
  color_class: string;
}

export interface AuditLog {
  id: string;
  school_id: string;
  actor_name: string;
  actor_role: UserRole;
  action: string;
  details: string;
  timestamp: string;
}
