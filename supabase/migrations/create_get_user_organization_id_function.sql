CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;