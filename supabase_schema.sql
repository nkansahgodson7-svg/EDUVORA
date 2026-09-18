-- =========================================================================
-- FIX FOR "new row violates row-level security policy"
-- =========================================================================

-- Enable RLS (Row Level Security) on the tables to satisfy Supabase security requirements
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Create permissive policies that allow the frontend (using the anon key) 
-- to read, insert, update, and delete rows. 

-- 1. Schools Policies
DROP POLICY IF EXISTS "Allow all operations on schools" ON public.schools;
CREATE POLICY "Allow all operations on schools" ON public.schools FOR ALL USING (true) WITH CHECK (true);

-- 2. Students Policies
DROP POLICY IF EXISTS "Allow all operations on students" ON public.students;
CREATE POLICY "Allow all operations on students" ON public.students FOR ALL USING (true) WITH CHECK (true);

-- 3. Teachers Policies
DROP POLICY IF EXISTS "Allow all operations on teachers" ON public.teachers;
CREATE POLICY "Allow all operations on teachers" ON public.teachers FOR ALL USING (true) WITH CHECK (true);

-- Reload schema cache just in case
NOTIFY pgrst, 'reload schema';
