INSERT INTO public.profiles (id, full_name, role)
VALUES ('75bb3f71-8a08-439d-89e3-61dea956347e', 'dragneelusa', 'admin')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;