-- Add RLS policy to allow authenticated users to update their associated organization
create policy "Allow authenticated users to update their organization"
on "public"."organizations" for update
using (
  auth.uid() IN (
    SELECT profiles.id
    FROM profiles
    WHERE profiles.organization_id = organizations.id
  )
) with check (
  auth.uid() IN (
    SELECT profiles.id
    FROM profiles
    WHERE profiles.organization_id = organizations.id
  )
);