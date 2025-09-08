-- RLS Policy for SELECT on profiles table
DROP POLICY IF EXISTS "Users can view their own profile and admins can view all profiles within their organization." ON public.profiles;

CREATE POLICY "Users can view their own profile and admins can view all profiles within their organization."
ON public.profiles FOR SELECT
USING (
  (auth.uid() = id) OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' AND
    (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) = organization_id
  )
);