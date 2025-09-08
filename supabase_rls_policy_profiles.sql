-- Re-enable Row Level Security on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT: Users can view their own profile. If they have an organization_id, they can also view profiles within that organization.
CREATE POLICY "Users can view their own profile and profiles in their organization."
ON public.profiles FOR SELECT
USING (
  (auth.uid() = id) -- Always allow users to see their own profile
  OR
  (
    organization_id IS NOT NULL AND -- Ensure the profile has an organization_id
    public.get_user_organization_id() IS NOT NULL AND -- Ensure the current user has an organization_id
    organization_id = public.get_user_organization_id() -- Check if they match
  )
);

-- Policy for INSERT: Users can insert their own profile, and it must belong to their organization.
CREATE POLICY "Users can insert their own profile."
ON public.profiles FOR INSERT
WITH CHECK (
  (auth.uid() = id) AND -- Must be their own profile
  (public.get_user_organization_id() IS NOT NULL AND organization_id = public.get_user_organization_id()) -- Must belong to their organization
);

-- Policy for UPDATE: Users can update their own profile, and it must belong to their organization.
CREATE POLICY "Users can update their own profile."
ON public.profiles FOR UPDATE
USING (
  (auth.uid() = id) AND -- Must be their own profile
  (public.get_user_organization_id() IS NOT NULL AND organization_id = public.get_user_organization_id()) -- Must belong to their organization
);

-- Policy for DELETE: Users can delete their own profile, and it must belong to their organization.
CREATE POLICY "Users can delete their own profile."
ON public.profiles FOR DELETE
USING (
  (auth.uid() = id) AND -- Must be their own profile
  (public.get_user_organization_id() IS NOT NULL AND organization_id = public.get_user_organization_id()) -- Must belong to their organization
);