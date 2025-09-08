-- Step 0: Ensure RLS is disabled on the profiles table (redundant after manual delete, but good practice)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 1: Drop the function using CASCADE to automatically remove any remaining dependent objects
-- This should now work without issues as all policies have been manually removed.
DROP FUNCTION IF EXISTS public.get_user_organization_id() CASCADE;

-- Step 2: Create or replace the function to get the current user's organization_id
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- Important for accessing auth.uid() and profiles table securely
AS $$
DECLARE
    user_org_id uuid;
BEGIN
    -- Check if a user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    -- Attempt to retrieve the organization_id from the profiles table
    SELECT organization_id
    INTO user_org_id
    FROM public.profiles
    WHERE id = auth.uid();

    -- If no organization_id is found (e.g., profile not yet created), return NULL
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN user_org_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO authenticated;

-- Step 3: Re-enable Row Level Security on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Re-apply the REVISED RLS policies with explicit NULL handling
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