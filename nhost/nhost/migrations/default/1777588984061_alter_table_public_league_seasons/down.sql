ALTER TABLE public.league_seasons DROP CONSTRAINT IF EXISTS league_seasons_roster_change_sheet_id_fkey;
ALTER TABLE public.league_seasons DROP COLUMN IF EXISTS roster_change_sheet_id;
ALTER TABLE public.league_seasons DROP CONSTRAINT IF EXISTS league_seasons_sub_sheet_id_fkey;
ALTER TABLE public.league_seasons DROP COLUMN IF EXISTS sub_sheet_id;
ALTER TABLE public.league_seasons DROP CONSTRAINT IF EXISTS league_seasons_signup_sheet_id_fkey;
ALTER TABLE public.league_seasons DROP COLUMN IF EXISTS signup_sheet_id;
