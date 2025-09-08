-- Drop existing trigger and function to ensure a clean slate if they exist but are misconfigured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;

-- 1. Create the 'organizations' table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- RLS for organizations:
-- Organizations are viewable by any user who belongs to that organization
CREATE POLICY "Organizations are viewable by members" ON public.organizations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.organization_id = organizations.id AND profiles.id = auth.uid())
);

-- 2. Alter the 'profiles' table to add organization_id and role
-- Ensure the profiles table exists before altering.
-- If it doesn't exist, you would need to create it first.
-- Assuming it exists from previous setup, we'll add columns.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id),
ADD COLUMN IF NOT EXISTS role text DEFAULT 'viewer' NOT NULL;

-- Add unique constraints for full_name and user_id within an organization
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS unique_full_name_per_organization; -- Drop if exists to recreate
ALTER TABLE public.profiles
ADD CONSTRAINT unique_full_name_per_organization UNIQUE (full_name, organization_id);

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS unique_user_id_per_organization; -- Drop if exists to recreate
ALTER TABLE public.profiles
ADD CONSTRAINT unique_user_id_per_organization UNIQUE (id, organization_id);

-- 3. Create the 'handle_new_user' function
-- This function will create an organization if one doesn't exist for the user's email domain,
-- and then create a profile for the new user, assigning them to that organization.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_organization_id uuid;
    organization_name text;
BEGIN
    organization_name := split_part(NEW.email, '@', 2); -- Use domain as organization name

    -- Check if an organization already exists for this domain
    SELECT id INTO user_organization_id
    FROM public.organizations
    WHERE name = organization_name
    LIMIT 1;

    IF user_organization_id IS NULL THEN
        -- If no organization exists for this domain, create a new one
        INSERT INTO public.organizations (name)
        VALUES (organization_name)
        RETURNING id INTO user_organization_id;
    END IF;

    INSERT INTO public.profiles (id, full_name, role, organization_id)
    VALUES (
        NEW.id,
        NEW.email, -- Use email as initial full_name, user can change later
        'viewer', -- Default role for new users
        user_organization_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the 'on_auth_user_created' trigger
-- This trigger executes the handle_new_user function after a new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Set up Row Level Security (RLS) policies for 'profiles'
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT: Users can view profiles within their organization
CREATE POLICY "Users can view profiles within their organization" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles AS p WHERE p.id = auth.uid() AND p.organization_id = profiles.organization_id)
);

-- Policy for UPDATE: Users can update their own profile, and admins can update profiles within their organization
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (
  auth.uid() = id
) WITH CHECK (
  auth.uid() = id
);

CREATE POLICY "Admins can update profiles within their organization" ON public.profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles AS p WHERE p.id = auth.uid() AND p.role = 'admin' AND p.organization_id = profiles.organization_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles AS p WHERE p.id = auth.uid() AND p.role = 'admin' AND p.organization_id = profiles.organization_id)
);

-- Policy for DELETE: Only admins can delete profiles within their organization
CREATE POLICY "Admins can delete profiles within their organization" ON public.profiles FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles AS p WHERE p.id = auth.uid() AND p.role = 'admin' AND p.organization_id = profiles.organization_id)
);