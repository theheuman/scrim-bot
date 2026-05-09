ALTER TABLE public.league_seasons ADD roster_sheet_id uuid;
ALTER TABLE public.league_seasons ADD CONSTRAINT league_seasons_roster_sheet_id_fkey FOREIGN KEY (roster_sheet_id) REFERENCES public.google_sheets (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
