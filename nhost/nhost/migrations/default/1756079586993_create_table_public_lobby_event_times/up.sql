CREATE TABLE public.lobby_event_times (id uuid DEFAULT gen_random_uuid() NOT NULL, name text UNIQUE NOT NULL, minutes_before int4 NOT NULL, PRIMARY KEY (id));
