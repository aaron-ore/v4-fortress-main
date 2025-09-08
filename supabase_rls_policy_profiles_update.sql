-- RLS Policy for UPDATE on profiles table
DROP POLICY IF EXISTS "Users can update their own profile and admins can update profiles within their organization." ON public.profiles;

CREATE POLICY "Users can update their own profile and admins can update profiles within their organization."
ON public.profiles FOR UPDATE
USING (
  (auth.uid() = id) OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' AND
    (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) = organization_id
  )
)
WITH CHECK (
  (auth.uid() = id) OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' AND
    (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) = organization_id
  )
);