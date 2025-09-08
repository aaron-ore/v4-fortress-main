CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY, -- User-defined PO/SO number
  type TEXT NOT NULL, -- 'Sales' or 'Purchase'
  customer_supplier TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  status TEXT NOT NULL DEFAULT 'New Order',
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  due_date DATE NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  order_type TEXT NOT NULL, -- 'Retail' or 'Wholesale'
  shipping_method TEXT NOT NULL, -- 'Standard' or 'Express'
  items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of POItem
  terms TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL
);