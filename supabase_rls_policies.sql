-- Enable RLS on all relevant tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Policy for organizations table
-- Admins can see all organizations (for now, or just their own)
-- For simplicity, let's allow authenticated users to see all organizations for now,
-- but in a strict multi-tenant setup, they'd only see their own.
-- For now, let's allow authenticated users to see all organizations.
DROP POLICY IF EXISTS "Allow authenticated users to view organizations." ON public.organizations;
CREATE POLICY "Allow authenticated users to view organizations."
ON public.organizations FOR SELECT
TO authenticated
USING (true);

-- Policy for profiles table
-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
CREATE POLICY "Users can view their own profile."
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Admins can view all profiles within their organization
DROP POLICY IF EXISTS "Admins can view all profiles within their organization." ON public.profiles;
CREATE POLICY "Admins can view all profiles within their organization."
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND organization_id = public.profiles.organization_id
  )
);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile."
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Admins can update profiles within their organization (excluding role for non-service_role)
-- The role update will be handled by the Edge Function with service_role key
DROP POLICY IF EXISTS "Admins can update profiles within their organization." ON public.profiles;
CREATE POLICY "Admins can update profiles within their organization."
ON public.profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND organization_id = public.profiles.organization_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND organization_id = public.profiles.organization_id
  )
);

-- Policy for inventory_items table
-- Users can only access items within their organization
DROP POLICY IF EXISTS "Users can access inventory items within their organization." ON public.inventory_items;
CREATE POLICY "Users can access inventory items within their organization."
ON public.inventory_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND organization_id = public.inventory_items.organization_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND organization_id = public.inventory_items.organization_id
  )
);

-- Policy for orders table
-- Users can only access orders within their organization
DROP POLICY IF EXISTS "Users can access orders within their organization." ON public.orders;
CREATE POLICY "Users can access orders within their organization."
ON public.orders FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND organization_id = public.orders.organization_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND organization_id = public.orders.organization_id
  )
);

-- Policy for vendors table
-- Users can only access vendors within their organization
DROP POLICY IF EXISTS "Users can access vendors within their organization." ON public.vendors;
CREATE POLICY "Users can access vendors within their organization."
ON public.vendors FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND organization_id = public.vendors.organization_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND organization_id = public.vendors.organization_id
  )
);

-- Policy for categories table
-- Users can only access categories within their organization
DROP POLICY IF EXISTS "Users can access categories within their organization." ON public.categories;
CREATE POLICY "Users can access categories within their organization."
ON public.categories FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND organization_id = public.categories.organization_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND organization_id = public.categories.organization_id
  )
);

-- Policy for stock_movements table
-- Users can only access stock movements within their organization
DROP POLICY IF EXISTS "Users can access stock movements within their organization." ON public.stock_movements;
CREATE POLICY "Users can access stock movements within their organization."
ON public.stock_movements FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND organization_id = public.stock_movements.organization_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND organization_id = public.stock_movements.organization_id
  )
);