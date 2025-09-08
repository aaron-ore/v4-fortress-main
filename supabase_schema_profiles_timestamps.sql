-- Add organization_id column with a default value if it doesn't exist, or set default if it does.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'organization_id') THEN
        ALTER TABLE public.profiles ADD COLUMN organization_id uuid NOT NULL DEFAULT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    ELSE
        -- If column exists, ensure it has a default value and is NOT NULL
        ALTER TABLE public.profiles ALTER COLUMN organization_id SET DEFAULT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
        ALTER TABLE public.profiles ALTER COLUMN organization_id SET NOT NULL;
    END IF;
END
$$;

-- Ensure created_at has a default of now() and is NOT NULL
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at') THEN
        ALTER TABLE public.profiles ADD COLUMN created_at timestamp with time zone NOT NULL DEFAULT now();
    ELSE
        ALTER TABLE public.profiles ALTER COLUMN created_at SET DEFAULT now();
        ALTER TABLE public.profiles ALTER COLUMN created_at SET NOT NULL;
    END IF;
END
$$;

-- Ensure updated_at has a default of now() and is NOT NULL
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE public.profiles ADD COLUMN updated_at timestamp with time zone NOT NULL DEFAULT now();
    ELSE
        ALTER TABLE public.profiles ALTER COLUMN updated_at SET DEFAULT now();
        ALTER TABLE public.profiles ALTER COLUMN updated_at SET NOT NULL;
    END IF;
END
$$;

-- Create a trigger to update 'updated_at' on each row update
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();