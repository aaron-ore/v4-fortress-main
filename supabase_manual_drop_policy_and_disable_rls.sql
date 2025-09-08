-- 1. Temporarily Disable RLS on the profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Explicitly drop the problematic policy by its exact reported name
-- This directly targets the policy mentioned in your error message.
DROP POLICY IF EXISTS "select_own_profile_and_org_profiles" ON public.profiles;

-- 3. Drop any other generic policies that might exist (cleanup)
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile and profiles in their organization." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile." ON public.profiles;