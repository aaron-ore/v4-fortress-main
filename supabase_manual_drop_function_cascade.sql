-- Drop the function using CASCADE to automatically remove any remaining dependent objects
DROP FUNCTION IF EXISTS public.get_user_organization_id() CASCADE;