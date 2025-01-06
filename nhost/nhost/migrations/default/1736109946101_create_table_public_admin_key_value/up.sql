CREATE TABLE public.admin_key_value (id uuid DEFAULT gen_random_uuid() NOT NULL, name text NOT NULL, value text NOT NULL, PRIMARY KEY (id));
