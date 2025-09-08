-- RLS Policy for INSERT on profiles table
DROP POLICY IF EXISTS "Allow authenticated users to create a profile for themselves." ON public.profiles;

CREATE POLICY "Allow authenticated users to create a profile for themselves."
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);