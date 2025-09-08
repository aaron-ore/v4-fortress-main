-- This trigger automatically creates a profile entry for new users
-- and attempts to link them to an organization if a company_code is provided during signup.
create or replace function public.handle_new_user()
returns trigger as $$
declare
    organization_id_from_code uuid;
    company_code_from_meta text;
begin
    -- Extract company_code from raw_user_meta_data
    company_code_from_meta := new.raw_user_meta_data->>'company_code';

    organization_id_from_code := NULL;

    -- If a company_code is provided, try to find the organization
    if company_code_from_meta is not null and company_code_from_meta != '' then
        select id into organization_id_from_code
        from public.organizations
        where unique_code = company_code_from_meta;
    end if;

    -- Insert into public.profiles
    insert into public.profiles (id, full_name, avatar_url, email, role, organization_id)
    values (
        new.id,
        new.raw_user_meta_data->>'full_name', -- Can be null
        new.raw_user_meta_data->>'avatar_url', -- Can be null
        new.email,
        'viewer', -- Default role for new users
        organization_id_from_code -- Assign organization_id if found, otherwise NULL
    );
    return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if it exists to recreate it
drop trigger if exists on_auth_user_created on auth.users;

-- Create the trigger
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();