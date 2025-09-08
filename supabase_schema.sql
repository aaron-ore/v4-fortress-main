-- Create the organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add organization_id to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Add organization_id to inventory_items table
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to vendors table
ALTER TABLE public.vendors
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to categories table
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to stock_movements table
ALTER TABLE public.stock_movements
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Ensure existing user_id columns are present and correctly typed
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.vendors
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.stock_movements
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create a unique constraint for category names within an organization
ALTER TABLE public.categories
ADD CONSTRAINT unique_category_name_per_organization UNIQUE (name, organization_id);

-- Create a unique constraint for vendor names within an organization
ALTER TABLE public.vendors
ADD CONSTRAINT unique_vendor_name_per_organization UNIQUE (name, organization_id);

-- Create a unique constraint for inventory item SKUs within an organization
ALTER TABLE public.inventory_items
ADD CONSTRAINT unique_sku_per_organization UNIQUE (sku, organization_id);

-- Create a unique constraint for order IDs within an organization
ALTER TABLE public.orders
ADD CONSTRAINT unique_order_id_per_organization UNIQUE (id, organization_id);

-- Add a default value for the 'role' column in 'profiles' if it doesn't exist
ALTER TABLE public.profiles
ALTER COLUMN role SET DEFAULT 'viewer';

-- Add a default value for the 'created_at' column in 'profiles' if it doesn't exist
ALTER TABLE public.profiles
ALTER COLUMN created_at SET DEFAULT now();

-- Add a default value for the 'created_at' column in 'vendors' if it doesn't exist
ALTER TABLE public.vendors
ALTER COLUMN created_at SET DEFAULT now();

-- Add a default value for the 'created_at' column in 'orders' if it doesn't exist
ALTER TABLE public.orders
ALTER COLUMN created_at SET DEFAULT now();

-- Add a default value for the 'created_at' column in 'categories' if it doesn't exist
ALTER TABLE public.categories
ALTER COLUMN created_at SET DEFAULT now();

-- Add a default value for the 'timestamp' column in 'stock_movements' if it doesn't exist
ALTER TABLE public.stock_movements
ALTER COLUMN timestamp SET DEFAULT now();

-- Ensure the 'status' column in 'inventory_items' has a default
ALTER TABLE public.inventory_items
ALTER COLUMN status SET DEFAULT 'In Stock';

-- Ensure the 'last_updated' column in 'inventory_items' has a default
ALTER TABLE public.inventory_items
ALTER COLUMN last_updated SET DEFAULT now();

-- Ensure the 'committed_stock' column in 'inventory_items' has a default
ALTER TABLE public.inventory_items
ALTER COLUMN committed_stock SET DEFAULT 0;

-- Ensure the 'incoming_stock' column in 'inventory_items' has a default
ALTER TABLE public.inventory_items
ALTER COLUMN incoming_stock SET DEFAULT 0;

-- Ensure the 'items' column in 'orders' has a default
ALTER TABLE public.orders
ALTER COLUMN items SET DEFAULT '[]'::jsonb;

-- Ensure the 'notes' column in 'orders' has a default
ALTER TABLE public.orders
ALTER COLUMN notes SET DEFAULT '';

-- Ensure the 'order_type' column in 'orders' has a default
ALTER TABLE public.orders
ALTER COLUMN order_type SET DEFAULT 'Retail';

-- Ensure the 'shipping_method' column in 'orders' has a default
ALTER TABLE public.orders
ALTER COLUMN shipping_method SET DEFAULT 'Standard';

-- Ensure the 'total_amount' column in 'orders' has a default
ALTER TABLE public.orders
ALTER COLUMN total_amount SET DEFAULT 0.00;

-- Ensure the 'item_count' column in 'orders' has a default
ALTER TABLE public.orders
ALTER COLUMN item_count SET DEFAULT 0;

-- Ensure the 'due_date' column in 'orders' has a default
ALTER TABLE public.orders
ALTER COLUMN due_date SET DEFAULT now();

-- Ensure the 'type' column in 'stock_movements' has a default
ALTER TABLE public.stock_movements
ALTER COLUMN type SET DEFAULT 'add';

-- Ensure the 'amount' column in 'stock_movements' has a default
ALTER TABLE public.stock_movements
ALTER COLUMN amount SET DEFAULT 0;

-- Ensure the 'old_quantity' column in 'stock_movements' has a default
ALTER TABLE public.stock_movements
ALTER COLUMN old_quantity SET DEFAULT 0;

-- Ensure the 'new_quantity' column in 'stock_movements' has a default
ALTER TABLE public.stock_movements
ALTER COLUMN new_quantity SET DEFAULT 0;

-- Ensure the 'reason' column in 'stock_movements' has a default
ALTER TABLE public.stock_movements
ALTER COLUMN reason SET DEFAULT '';

-- Ensure the 'description' column in 'inventory_items' has a default
ALTER TABLE public.inventory_items
ALTER COLUMN description SET DEFAULT '';

-- Ensure the 'image_url' column in 'inventory_items' has a default
ALTER TABLE public.inventory_items
ALTER COLUMN image_url SET DEFAULT '';

-- Ensure the 'barcode_url' column in 'inventory_items' has a default
ALTER TABLE public.inventory_items
ALTER COLUMN barcode_url SET DEFAULT '';

-- Ensure the 'phone' column in 'profiles' has a default
ALTER TABLE public.profiles
ALTER COLUMN phone SET DEFAULT '';

-- Ensure the 'address' column in 'profiles' has a default
ALTER TABLE public.profiles
ALTER COLUMN address SET DEFAULT '';

-- Ensure the 'avatar_url' column in 'profiles' has a default
ALTER TABLE public.profiles
ALTER COLUMN avatar_url SET DEFAULT '';

-- Ensure the 'contact_person' column in 'vendors' has a default
ALTER TABLE public.vendors
ALTER COLUMN contact_person SET DEFAULT '';

-- Ensure the 'email' column in 'vendors' has a default
ALTER TABLE public.vendors
ALTER COLUMN email SET DEFAULT '';

-- Ensure the 'phone' column in 'vendors' has a default
ALTER TABLE public.vendors
ALTER COLUMN phone SET DEFAULT '';

-- Ensure the 'address' column in 'vendors' has a default
ALTER TABLE public.vendors
ALTER COLUMN address SET DEFAULT '';

-- Ensure the 'notes' column in 'vendors' has a default
ALTER TABLE public.vendors
ALTER COLUMN notes SET DEFAULT '';