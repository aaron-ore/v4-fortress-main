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
  (public.get_user_role() = 'admin')
  AND
  (public.get_user_organization_id() = organization_id)
);

-- 3. INSERT Policy: No direct INSERT policy for authenticated users.
-- New profiles are created by the 'handle_new_user' trigger, which runs as SECURITY DEFINER and bypasses RLS.

-- 4. UPDATE Policy: Allow authenticated users to update their own profile, and admins to update any profile.
-- The 'USING' clause is simplified to allow the update attempt.
-- The 'WITH CHECK' clause then validates the actual changes being made.
CREATE POLICY "Enable update for authenticated users and admins in their org"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = id) -- User can update their own profile
  OR
  (public.get_user_role() = 'admin') -- Admins can attempt to update any profile
)
WITH CHECK (
  -- A user can only update their own profile's non-sensitive fields
  (auth.uid() = new.id AND new.role = old.role AND new.organization_id = old.organization_id)
  OR
  -- An admin can update profiles within their organization, and can assign an organization_id to new users
  (
    public.get_user_role() = 'admin'
    AND
    (
      (new.organization_id = public.get_user_organization_id()) -- Admin can only set/keep org_id to their own org_id
      AND
      (
        (old.organization_id = public.get_user_organization_id()) -- If profile is already in their org
        OR
        (old.organization_id IS NULL) -- If it's a new user being assigned to their org
      )
    )
  )
);

-- 5. DELETE Policy: Admins can delete profiles within their organization
-- This policy grants admins the ability to delete user profiles within their organization.
CREATE POLICY "Enable delete for admins in their organization"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  (public.get_user_role() = 'admin')
  AND
  (public.get_user_organization_id() = organization_id)
);