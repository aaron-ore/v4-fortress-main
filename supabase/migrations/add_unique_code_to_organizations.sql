-- Add unique_code column to organizations table
ALTER TABLE public.organizations
ADD COLUMN unique_code TEXT UNIQUE;

-- Optional: Generate codes for existing organizations if any (run manually if needed)
-- UPDATE public.organizations
-- SET unique_code = substr(md5(random()::text), 0, 10)
-- WHERE unique_code IS NULL;

-- Add a NOT NULL constraint after populating existing data, if applicable
-- ALTER TABLE public.organizations ALTER COLUMN unique_code SET NOT NULL;