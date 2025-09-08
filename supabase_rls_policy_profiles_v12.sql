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

-- 4. UPDATE Policy (Self-Update): Allow users to update their own profile, but not sensitive fields.
CREATE POLICY "Allow authenticated users to update own non-sensitive profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  (new.id = auth.uid()) -- Ensure they don't change their own ID
  AND
  (new.role = old.role) -- Prevent changing their own role
  AND
  (new.organization_id = old.organization_id) -- Prevent changing their own organization
);

-- 5. UPDATE Policy (Admin-Update): Allow admins to update profiles in their organization, including role and organization_id.
CREATE POLICY "Allow admins to update profiles in their organization"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  (public.get_user_role() = 'admin')
  AND
  (
    (old.organization_id = public.get_user_organization_id()) -- Admin can update profiles already in their org
    OR
    (old.organization_id IS NULL) -- Admin can update profiles with NULL org_id (new users)
  )
)
WITH CHECK (
  (public.get_user_role() = 'admin')
  AND
  (new.organization_id = public.get_user_organization_id()) -- Admin can only set/keep org_id to their own org_id
);

-- 6. DELETE Policy: Admins can delete profiles within their organization
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