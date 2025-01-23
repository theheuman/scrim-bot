ALTER TABLE public.prio ALTER COLUMN start_date DROP DEFAULT;
ALTER TABLE public.prio ALTER COLUMN start_date TYPE timestamptz USING start_date::timestamptz;
ALTER TABLE public.prio ALTER COLUMN end_date DROP DEFAULT;
ALTER TABLE public.prio ALTER COLUMN end_date TYPE timestamptz USING end_date::timestamptz;
