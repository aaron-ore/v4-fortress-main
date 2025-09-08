-- Enable RLS on the organizations table if not already enabled
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows authenticated users to insert a new organization
-- only if their profile's organization_id is NULL (meaning they don't belong to an organization yet).
CREATE POLICY "Allow authenticated users to create their first organization"
ON public.organizations FOR INSERT TO authenticated WITH CHECK (
  (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) IS NULL
);