CREATE TABLE public.customers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  notes text,
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customers_pkey PRIMARY KEY (id),
  CONSTRAINT customers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT customers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to view customers" ON public.customers
  FOR SELECT TO authenticated USING (organization_id = get_user_organization_id());

CREATE POLICY "Allow authenticated users to insert their own customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (organization_id = get_user_organization_id() AND user_id = auth.uid());

CREATE POLICY "Allow authenticated users to update their own customers" ON public.customers
  FOR UPDATE TO authenticated USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id() AND user_id = auth.uid());

CREATE POLICY "Allow authenticated users to delete their own customers" ON public.customers
  FOR DELETE TO authenticated USING (organization_id = get_user_organization_id() AND user_id = auth.uid());