create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  email text, -- Added email column
  phone text,
  address text,
  avatar_url text,
  role text default 'viewer'::text not null,
  organization_id uuid references public.organizations on delete set null, -- Allow null for initial signup
  created_at timestamp with time zone default now() not null
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by users who created them."
  on public.profiles for select using (auth.uid() = id);

create policy "Users can insert their own profile."
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile."
  on public.profiles for update using (auth.uid() = id);

-- Allow admins to view all profiles within their organization
create policy "Admins can view all profiles in their organization"
on public.profiles for select
using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
  and
  (select organization_id from public.profiles where id = auth.uid()) = organization_id
);

-- Allow admins to update profiles within their organization
create policy "Admins can update profiles in their organization"
on public.profiles for update
using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
  and
  (select organization_id from public.profiles where id = auth.uid()) = organization_id
);