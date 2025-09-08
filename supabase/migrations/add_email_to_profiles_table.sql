-- Add email column to profiles table
alter table public.profiles
add column email text;

-- You might want to run a one-time update for existing profiles
-- to populate this column from auth.users if you have existing data.
-- For example:
-- UPDATE public.profiles
-- SET email = auth.users.email
-- FROM auth.users
-- WHERE public.profiles.id = auth.users.id;