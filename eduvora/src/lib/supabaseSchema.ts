/**
 * Supabase Schema & Multi-Tenant Security Model (PostgreSQL + RLS)
 * 
 * Includes:
 * 1. schools table
 * 2. profiles table
 * 3. students table
 * 4. teachers table
 * 5. Row-Level Security (RLS) policies and RPC bypass functions for super_admin
 */

export const SUPABASE_INGESTION_SQL = `-- ==============================================================================
-- PHASE 1: DATABASE SCHEMA & MULTI-TENANT SECURITY MODEL (SUPABASE POSTGRES)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. SCHOOLS TABLE (Tenants)
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    logo_url TEXT,
    address TEXT,
    contact_email TEXT,
    headmaster_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schools_code ON public.schools(code);
CREATE INDEX IF NOT EXISTS idx_schools_status ON public.schools(status);

-- 3. PROFILES TABLE (Users linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE, -- NULL for super_admin
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'school_admin', 'teacher', 'student')),
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 4. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_code TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
    grade_level TEXT,
    parent_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (school_id, student_code)
);

CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_code ON public.students(school_id, student_code);

-- 5. TEACHERS TABLE
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    staff_code TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (school_id, staff_code)
);

CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON public.teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_staff_code ON public.teachers(school_id, staff_code);

-- ==============================================================================
-- ROW-LEVEL SECURITY (RLS) SETUP
-- ==============================================================================

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Helper function: retrieve currently authenticated user role
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: retrieve currently authenticated user school_id
CREATE OR REPLACE FUNCTION public.get_auth_school_id()
RETURNS UUID AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if currently authenticated user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------------------------
-- RLS POLICIES FOR SCHOOLS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Super admin full access on schools" ON public.schools;
CREATE POLICY "Super admin full access on schools" ON public.schools
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "School members read own school" ON public.schools;
CREATE POLICY "School members read own school" ON public.schools
  FOR SELECT
  USING (id = public.get_auth_school_id());

-- ------------------------------------------------------------------------------
-- RLS POLICIES FOR PROFILES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Super admin full access on profiles" ON public.profiles;
CREATE POLICY "Super admin full access on profiles" ON public.profiles
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "School members access same tenant profiles" ON public.profiles;
CREATE POLICY "School members access same tenant profiles" ON public.profiles
  FOR ALL
  USING (school_id = public.get_auth_school_id())
  WITH CHECK (school_id = public.get_auth_school_id());

-- ------------------------------------------------------------------------------
-- RLS POLICIES FOR STUDENTS (Tenant Isolation + Super Admin bypass)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Super admin full access on students" ON public.students;
CREATE POLICY "Super admin full access on students" ON public.students
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Tenant isolation for students" ON public.students;
CREATE POLICY "Tenant isolation for students" ON public.students
  FOR ALL
  USING (school_id = public.get_auth_school_id())
  WITH CHECK (school_id = public.get_auth_school_id());

-- ------------------------------------------------------------------------------
-- RLS POLICIES FOR TEACHERS (Tenant Isolation + Super Admin bypass)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Super admin full access on teachers" ON public.teachers;
CREATE POLICY "Super admin full access on teachers" ON public.teachers
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Tenant isolation for teachers" ON public.teachers;
CREATE POLICY "Tenant isolation for teachers" ON public.teachers
  FOR ALL
  USING (school_id = public.get_auth_school_id())
  WITH CHECK (school_id = public.get_auth_school_id());

-- ==============================================================================
-- RPC BYPASS FUNCTION FOR BULK INGESTION BY SUPER ADMIN
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.bulk_ingest_students(
  p_school_id UUID,
  p_students JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_inserted INT := 0;
  v_item JSONB;
BEGIN
  -- Verify super admin privileges or school admin of that school
  IF NOT (public.is_super_admin() OR public.get_auth_school_id() = p_school_id) THEN
    RAISE EXCEPTION 'Unauthorized: insufficient privileges to ingest students into school %', p_school_id;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_students)
  LOOP
    INSERT INTO public.students (
      school_id,
      student_code,
      first_name,
      last_name,
      gender,
      grade_level,
      parent_phone
    ) VALUES (
      p_school_id,
      v_item->>'student_code',
      v_item->>'first_name',
      v_item->>'last_name',
      v_item->>'gender',
      v_item->>'grade_level',
      v_item->>'parent_phone'
    )
    ON CONFLICT (school_id, student_code) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      gender = EXCLUDED.gender,
      grade_level = EXCLUDED.grade_level,
      parent_phone = EXCLUDED.parent_phone;
    
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'count', v_inserted);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.bulk_ingest_teachers(
  p_school_id UUID,
  p_teachers JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_inserted INT := 0;
  v_item JSONB;
BEGIN
  -- Verify super admin privileges or school admin of that school
  IF NOT (public.is_super_admin() OR public.get_auth_school_id() = p_school_id) THEN
    RAISE EXCEPTION 'Unauthorized: insufficient privileges to ingest teachers into school %', p_school_id;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_teachers)
  LOOP
    INSERT INTO public.teachers (
      school_id,
      staff_code,
      first_name,
      last_name,
      email,
      phone
    ) VALUES (
      p_school_id,
      v_item->>'staff_code',
      v_item->>'first_name',
      v_item->>'last_name',
      LOWER(v_item->>'email'),
      v_item->>'phone'
    )
    ON CONFLICT (school_id, staff_code) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone;

    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'count', v_inserted);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;
