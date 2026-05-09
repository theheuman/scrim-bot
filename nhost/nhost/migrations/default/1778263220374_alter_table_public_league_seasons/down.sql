ALTER TABLE public.league_seasons DROP CONSTRAINT IF EXISTS league_seasons_roster_sheet_id_fkey;
ALTER TABLE public.league_seasons DROP COLUMN IF EXISTS roster_sheet_id;
