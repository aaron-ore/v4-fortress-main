-- Function to safely get the current user's role, bypassing RLS
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER -- This is crucial: runs with definer's privileges, bypassing RLS
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role;
END;
$$;

-- Function to safely get the current user's organization ID, bypassing RLS
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- This is crucial: runs with definer's privileges, bypassing RLS
AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT organization_id INTO org_id FROM public.profiles WHERE id = auth.uid();
  RETURN org_id;
END;
$$;