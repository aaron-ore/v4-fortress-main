-- Drop the function if it already exists to allow recreation
DROP FUNCTION IF EXISTS public.get_user_organization_id();

-- Create or replace the function to get the current user's organization_id
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- Important for accessing auth.uid() and profiles table securely
AS $$
DECLARE
    user_org_id uuid;
BEGIN
    -- Check if a user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    -- Attempt to retrieve the organization_id from the profiles table
    SELECT organization_id
    INTO user_org_id
    FROM public.profiles
    WHERE id = auth.uid();

    -- If no organization_id is found (e.g., profile not yet created), return NULL
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN user_org_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO authenticated;