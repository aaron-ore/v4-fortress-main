-- 1. Ensure Row Level Security is enabled for the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create a SELECT policy: Allow authenticated users to view their own profile
CREATE POLICY "Allow authenticated users to view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 3. Create an INSERT policy: Allow authenticated users to insert their own profile
--    This is crucial for the 'handle_new_user' trigger to work when a new user signs up.
CREATE POLICY "Allow authenticated users to insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 4. Create an UPDATE policy: Allow authenticated users to update their own profile
CREATE POLICY "Allow authenticated users to update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);