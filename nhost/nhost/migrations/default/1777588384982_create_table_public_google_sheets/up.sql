CREATE TABLE public.google_sheets (id uuid DEFAULT gen_random_uuid() NOT NULL, name text NOT NULL, sheet_id text NOT NULL, tab_name text NOT NULL, range_start text NOT NULL, PRIMARY KEY (id));
