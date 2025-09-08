-- Delete all existing policies on the profiles table to ensure a clean slate
-- This is a safety measure to remove any potentially recursive or conflicting policies.
DROP POLICY IF EXISTS "Admins can update profiles within their organization." ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles within their organization." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile - DEBUG" ON public.profiles; -- In case the debug policy was added

-- Policy 1: Allow authenticated users to view their own profile
-- This is essential for the application to fetch the current user's profile.
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy 2: Allow authenticated users to update their own profile
-- This is essential for the application to update the current user's profile (e.g., during onboarding).
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- IMPORTANT: The initial profile creation should ideally be handled by a database trigger
-- (e.g., 'on_auth_user_created' trigger calling 'handle_new_user' function).
-- This trigger runs with 'security definer' privileges and bypasses RLS for the INSERT.
-- Therefore, we do NOT need a client-side INSERT policy if the trigger is active.
-- If you are NOT using such a trigger, you would need an INSERT policy like:
-- CREATE POLICY "Users can insert own profile"
-- ON public.profiles
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (auth.uid() = id);
-- However, for this project, we assume the trigger handles initial creation.