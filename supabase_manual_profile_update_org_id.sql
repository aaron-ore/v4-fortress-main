-- Update existing profiles to have a default organization_id if it's NULL
-- This placeholder UUID will be used for all users until a proper organization management is implemented.
-- Make sure this UUID is unique and consistent across your default settings.
UPDATE public.profiles
SET organization_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
WHERE organization_id IS NULL;