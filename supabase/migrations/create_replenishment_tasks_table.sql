-- Create the replenishment_tasks table
CREATE TABLE public.replenishment_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    item_name text NOT NULL,
    from_location text NOT NULL,
    to_location text NOT NULL,
    quantity integer NOT NULL,
    status text NOT NULL DEFAULT 'Pending', -- e.g., 'Pending', 'Assigned', 'Completed', 'Cancelled'
    assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security (RLS) for replenishment_tasks
ALTER TABLE public.replenishment_tasks ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view their organization's tasks
CREATE POLICY "Authenticated users can view their organization's replenishment tasks" ON public.replenishment_tasks
FOR SELECT USING (
  (EXISTS ( SELECT 1
           FROM public.profiles
          WHERE ((profiles.id = auth.uid()) AND (profiles.organization_id = replenishment_tasks.organization_id))))
);

-- Policy for authenticated users to insert tasks for their organization
CREATE POLICY "Authenticated users can insert replenishment tasks for their organization" ON public.replenishment_tasks
FOR INSERT WITH CHECK (
  (EXISTS ( SELECT 1
           FROM public.profiles
          WHERE ((profiles.id = auth.uid()) AND (profiles.organization_id = replenishment_tasks.organization_id))))
);

-- Policy for inventory managers/admins to update tasks within their organization
CREATE POLICY "Inventory managers and admins can update replenishment tasks in their organization" ON public.replenishment_tasks
FOR UPDATE USING (
  (EXISTS ( SELECT 1
           FROM public.profiles
          WHERE ((profiles.id = auth.uid()) AND (profiles.organization_id = replenishment_tasks.organization_id) AND (profiles.role IN ('admin', 'inventory_manager')))))
) WITH CHECK (
  (EXISTS ( SELECT 1
           FROM public.profiles
          WHERE ((profiles.id = auth.uid()) AND (profiles.organization_id = replenishment_tasks.organization_id) AND (profiles.role IN ('admin', 'inventory_manager')))))
);

-- Policy for admins to delete tasks within their organization
CREATE POLICY "Admins can delete replenishment tasks in their organization" ON public.replenishment_tasks
FOR DELETE USING (
  (EXISTS ( SELECT 1
           FROM public.profiles
          WHERE ((profiles.id = auth.uid()) AND (profiles.organization_id = replenishment_tasks.organization_id) AND (profiles.role = 'admin'))))
);