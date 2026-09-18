-- Supabase Multi-Tenant School Management Schema

-- 1. Schools Table (Tenant Root)
CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Profiles/Users Table (Linked to auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('super_admin', 'school_admin', 'teacher', 'student')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Students Table
CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_code text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say')),
  grade_level text NOT NULL,
  parent_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, student_code)
);

-- 4. Teachers Table
CREATE TABLE teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_code text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, staff_code)
);

-- ==============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- Utility function to get the current user's role and school_id
CREATE OR REPLACE FUNCTION get_auth_role() RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_auth_school_id() RETURNS uuid AS $$
  SELECT school_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;


-- 1. SCHOOLS POLICIES
-- Super Admins can do everything
CREATE POLICY "Super Admins have full access to schools" ON schools
  FOR ALL TO authenticated
  USING (get_auth_role() = 'super_admin');

-- School Admins can view their own school
CREATE POLICY "School Admins can view their own school" ON schools
  FOR SELECT TO authenticated
  USING (get_auth_role() = 'school_admin' AND id = get_auth_school_id());


-- 2. PROFILES POLICIES
-- Super Admins can do everything
CREATE POLICY "Super Admins have full access to profiles" ON profiles
  FOR ALL TO authenticated
  USING (get_auth_role() = 'super_admin');

-- Users can view profiles in their own school
CREATE POLICY "Users can view profiles in their own school" ON profiles
  FOR SELECT TO authenticated
  USING (school_id = get_auth_school_id());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());


-- 3. STUDENTS POLICIES
CREATE POLICY "Super Admins have full access to students" ON students
  FOR ALL TO authenticated
  USING (get_auth_role() = 'super_admin');

-- School users (admin, teacher) can access students in their school
CREATE POLICY "School users access own school students" ON students
  FOR ALL TO authenticated
  USING (school_id = get_auth_school_id() AND get_auth_role() IN ('school_admin', 'teacher'));


-- 4. TEACHERS POLICIES
CREATE POLICY "Super Admins have full access to teachers" ON teachers
  FOR ALL TO authenticated
  USING (get_auth_role() = 'super_admin');

-- School users can access teachers in their school
CREATE POLICY "School users access own school teachers" ON teachers
  FOR ALL TO authenticated
  USING (school_id = get_auth_school_id() AND get_auth_role() IN ('school_admin', 'teacher'));
