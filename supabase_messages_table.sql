CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sender_id uuid NOT NULL,
  sender_name text,
  recipient_role text NOT NULL, -- 'admin', 'inventory_manager'
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles (id) ON DELETE CASCADE
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for admins"
ON public.messages
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Allow sender to insert"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
);

CREATE POLICY "Allow recipient to read"
ON public.messages
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = recipient_role
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  OR auth.uid() = sender_id
);

CREATE POLICY "Allow recipient to update read status"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = recipient_role
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = recipient_role
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);