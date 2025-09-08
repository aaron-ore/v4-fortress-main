-- 1. Re-enable Row Level Security for the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing RLS policies on profiles to start fresh
DROP POLICY IF EXISTS "Allow authenticated users to view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow all authenticated to view profiles" ON public.profiles; -- Drop if it exists from a previous attempt
DROP POLICY IF EXISTS "Allow authenticated users to update their own profile" ON public.profiles;


-- 3. Create a very permissive SELECT policy: Allow ALL authenticated users to view ANY profile
--    This is for debugging purposes to isolate the issue.
CREATE POLICY "Allow all authenticated to view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 4. Keep the UPDATE policy as it was, as it's less likely to cause a 500 on SELECT
CREATE POLICY "Allow authenticated users to update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);