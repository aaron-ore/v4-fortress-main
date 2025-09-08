-- Enable RLS on organizations table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (optional, for clean slate)
DROP POLICY IF EXISTS "Allow authenticated users to read their own organization" ON public.organizations;

-- Create a policy that allows authenticated users to read their own organization
CREATE POLICY "Allow authenticated users to read their own organization"
ON public.organizations FOR SELECT
TO authenticated
USING (
  id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);