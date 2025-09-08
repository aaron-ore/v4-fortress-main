-- Ensure RLS is enabled on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for 'profiles' table

-- 1. SELECT Policy: Allow authenticated users to read their own profile
CREATE POLICY "Allow authenticated users to read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 2. SELECT Policy: Allow admins to read profiles in their organization
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
  (new.id = old.id) -- Ensure they don't change their own ID
  AND
  (new.role = old.role) -- Prevent changing their own role
  AND
  (new.organization_id = old.organization_id) -- Prevent changing their own organization
);

-- 5. UPDATE Policy (Admin-Update Existing Org Profiles): Allow admins to update profiles already in their organization.
CREATE POLICY "Admins can update existing profiles in their organization"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  (public.get_user_role() = 'admin')
  AND
  (old.organization_id = public.get_user_organization_id()) -- Profile must already be in admin's org
)
WITH CHECK (
  (new.organization_id = old.organization_id) -- Admin cannot move profile out of their org with this policy
  AND
  (new.organization_id = public.get_user_organization_id()) -- Ensure new org_id is still admin's org
);

-- 6. UPDATE Policy (Admin-Assign Org to New Profiles): Allow admins to assign an organization_id to profiles with NULL org_id.
CREATE POLICY "Admins can assign organization to new profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  (public.get_user_role() = 'admin')
  AND
  (old.organization_id IS NULL) -- Profile must currently have NULL organization_id
)
WITH CHECK (
  (new.organization_id = public.get_user_organization_id()) -- Admin can only assign their own organization_id
);

-- 7. DELETE Policy: Admins can delete profiles within their organization
CREATE POLICY "Enable delete for admins in their organization"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  (public.get_user_role() = 'admin')
  AND
  (public.get_user_organization_id() = organization_id)
);