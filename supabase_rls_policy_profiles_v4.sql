-- Enable RLS on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh and avoid conflicts
DROP POLICY IF EXISTS "Allow individual select" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual insert" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual update" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users and admins in their org" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for authenticated users and admins in their org" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for admins in their organization" ON public.profiles;


-- 1. SELECT Policy: Users can see their own profile, Admins can see all in their organization
CREATE POLICY "Enable read access for authenticated users and admins in their org"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (auth.uid() = id) -- User can see their own profile
  OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' -- If current user is admin
    AND
    (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) = organization_id -- And target profile is in their org
  )
);

-- 2. INSERT Policy: Only the handle_new_user trigger should insert, so no direct insert policy needed for authenticated users.
-- The trigger runs as SECURITY DEFINER and bypasses RLS.

-- 3. UPDATE Policy: Users can update their own profile, Admins can update any in their organization
CREATE POLICY "Enable update for authenticated users and admins in their org"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = id) -- User can update their own profile
  OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' -- If current user is admin
    AND
    (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) = organization_id -- And target profile is in their org
  )
)
WITH CHECK (
  (auth.uid() = id) -- User can update their own profile
  OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' -- If current user is admin
    AND
    (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) = organization_id -- And target profile is in their org
  )
);

-- 4. DELETE Policy: Admins can delete profiles within their organization
CREATE POLICY "Enable delete for admins in their organization"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  AND
  (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) = organization_id
);