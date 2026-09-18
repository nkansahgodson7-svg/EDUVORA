import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.co')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Production-ready PostgreSQL & Supabase DDL schema with Row Level Security (RLS)
 * Copy and execute this script directly inside the Supabase SQL Editor.
 */
export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- MULTI-TENANT SCHOOL MANAGEMENT SAAS - SUPABASE / POSTGRES DDL WITH RLS
-- Architected for strict tenant isolation via school_id & role-based security
-- ==============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TENANTS TABLE (Schools)
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    primary_color VARCHAR(20) DEFAULT '#4f46e5',
    subscription_tier VARCHAR(50) DEFAULT 'growth' CHECK (subscription_tier IN ('starter', 'growth', 'enterprise')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
    current_session VARCHAR(50) DEFAULT '2025/2026',
    current_term VARCHAR(50) DEFAULT 'First Term',
    address TEXT,
    phone VARCHAR(50),
    contact_email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_schools_subdomain ON public.schools(subdomain);

-- 3. PROFILES TABLE (Users: Super Admin, School Master Admin, Teachers)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE, -- NULL for super_admin
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'school_admin', 'teacher')),
    phone VARCHAR(50),
    avatar_url TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'invited', 'deactivated')),
    invite_token VARCHAR(255),
    invite_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 4. CLASSES TABLE
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    grade_level INT NOT NULL,
    academic_year VARCHAR(50) NOT NULL,
    room_number VARCHAR(50),
    capacity INT DEFAULT 40,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON public.classes(school_id);

-- 5. SUBJECTS TABLE
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    category VARCHAR(50) DEFAULT 'core' CHECK (category IN ('core', 'elective', 'vocational')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON public.subjects(school_id);

-- 6. TEACHER ALLOCATIONS (Matrix mapping teachers to classes and subjects)
CREATE TABLE IF NOT EXISTS public.teacher_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    academic_term VARCHAR(50) DEFAULT 'First Term',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (school_id, teacher_id, class_id, subject_id, academic_term)
);
CREATE INDEX IF NOT EXISTS idx_allocations_school_teacher ON public.teacher_allocations(school_id, teacher_id);

-- 7. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    admission_number VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
    gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other')),
    date_of_birth DATE,
    guardian_name VARCHAR(255),
    guardian_phone VARCHAR(50),
    guardian_email VARCHAR(255),
    attendance_percentage NUMERIC(5,2) DEFAULT 95.0,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (school_id, admission_number)
);
CREATE INDEX IF NOT EXISTS idx_students_school_class ON public.students(school_id, class_id);

-- 8. ASSESSMENT SHEETS (Grade registers submitted by teachers)
CREATE TABLE IF NOT EXISTS public.assessment_sheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    term VARCHAR(50) NOT NULL,
    academic_year VARCHAR(50) NOT NULL,
    max_ca1 INT DEFAULT 20,
    max_ca2 INT DEFAULT 20,
    max_exam INT DEFAULT 60,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected')),
    admin_remarks TEXT,
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (school_id, class_id, subject_id, term, academic_year)
);
CREATE INDEX IF NOT EXISTS idx_assessment_sheets_lookup ON public.assessment_sheets(school_id, teacher_id, status);

-- 9. STUDENT SCORES (Individual marks per student)
CREATE TABLE IF NOT EXISTS public.student_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    sheet_id UUID NOT NULL REFERENCES public.assessment_sheets(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    ca1 NUMERIC(5,2) DEFAULT 0 CHECK (ca1 >= 0),
    ca2 NUMERIC(5,2) DEFAULT 0 CHECK (ca2 >= 0),
    exam NUMERIC(5,2) DEFAULT 0 CHECK (exam >= 0),
    total NUMERIC(5,2) GENERATED ALWAYS AS (ca1 + ca2 + exam) STORED,
    grade VARCHAR(5),
    points NUMERIC(3,2),
    remarks VARCHAR(255),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (sheet_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_student_scores_sheet ON public.student_scores(sheet_id);

-- 10. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_school_id ON public.audit_logs(school_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper Function: Check user role
CREATE OR REPLACE FUNCTION public.get_current_user_role() 
RETURNS VARCHAR AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper Function: Check user tenant school_id
CREATE OR REPLACE FUNCTION public.get_current_user_school_id() 
RETURNS UUID AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Policy 1: Super Admin can read/write everything
CREATE POLICY "Super Admins have full access to schools" ON public.schools
  FOR ALL USING (public.get_current_user_role() = 'super_admin');

-- Policy 2: School Admins and Teachers can only read their own school
CREATE POLICY "School users read own school" ON public.schools
  FOR SELECT USING (id = public.get_current_user_school_id());

-- Policy 3: Student and class isolation
CREATE POLICY "Tenant isolation for students" ON public.students
  FOR ALL USING (
    public.get_current_user_role() = 'super_admin' 
    OR school_id = public.get_current_user_school_id()
  );

-- Policy 4: Teacher scores scoped access
CREATE POLICY "Teachers can only edit assigned assessment sheets" ON public.assessment_sheets
  FOR ALL USING (
    public.get_current_user_role() IN ('super_admin', 'school_admin')
    OR (
      public.get_current_user_role() = 'teacher' 
      AND teacher_id = auth.uid() 
      AND school_id = public.get_current_user_school_id()
    )
  );

CREATE POLICY "Scores isolation" ON public.student_scores
  FOR ALL USING (
    public.get_current_user_role() = 'super_admin'
    OR school_id = public.get_current_user_school_id()
  );
`;
