-- Insert missing profiles for existing auth.users
INSERT INTO public.profiles (id, full_name, role, organization_id, created_at)
SELECT
  au.id,
  au.raw_user_meta_data ->> 'full_name' AS full_name,
  'viewer' AS role, -- Default role for existing users
  NULL AS organization_id, -- No organization assigned yet
  au.created_at
FROM
  auth.users AS au
LEFT JOIN
  public.profiles AS p
ON
  au.id = p.id
WHERE
  p.id IS NULL;

-- You might also want to update full_name for existing profiles if it's available in auth.users metadata
UPDATE public.profiles AS p
SET full_name = au.raw_user_meta_data ->> 'full_name'
FROM auth.users AS au
WHERE p.id = au.id AND au.raw_user_meta_data ->> 'full_name' IS NOT NULL AND (p.full_name IS DISTINCT FROM (au.raw_user_meta_data ->> 'full_name'));