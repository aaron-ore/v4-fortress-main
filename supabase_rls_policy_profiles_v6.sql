-- Ensure RLS is enabled on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for 'profiles' table

-- 1. SELECT Policy: Allow authenticated users to read their own profile
-- This policy ensures a user can always fetch their own profile, which is essential for the app's ProfileContext.
CREATE POLICY "Allow authenticated users to read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 2. SELECT Policy: Allow admins to read profiles within their organization
-- This policy enables admins to view other users' profiles within the same organization.
CREATE POLICY "Admins can read profiles in their organization"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  AND
  (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) = organization_id
);

-- 3. INSERT Policy: No direct INSERT policy for authenticated users.
-- New profiles are created by the 'handle_new_user' trigger, which runs as SECURITY DEFINER and bypasses RLS.

-- 4. UPDATE Policy: Users can update their own profile, Admins can update any in their organization
-- This policy allows users to modify their own profile and admins to modify any profile within their organization.
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

-- 5. DELETE Policy: Admins can delete profiles within their organization
-- This policy grants admins the ability to delete user profiles within their organization.
CREATE POLICY "Enable delete for admins in their organization"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  AND
  (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) = organization_id
);