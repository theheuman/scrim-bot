ALTER TABLE public.league_seasons ADD signup_sheet_id uuid NOT NULL;
ALTER TABLE public.league_seasons ADD CONSTRAINT league_seasons_signup_sheet_id_fkey FOREIGN KEY (signup_sheet_id) REFERENCES public.google_sheets (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public.league_seasons ADD sub_sheet_id uuid NOT NULL;
ALTER TABLE public.league_seasons ADD CONSTRAINT league_seasons_sub_sheet_id_fkey FOREIGN KEY (sub_sheet_id) REFERENCES public.google_sheets (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public.league_seasons ADD roster_change_sheet_id uuid NOT NULL;
ALTER TABLE public.league_seasons ADD CONSTRAINT league_seasons_roster_change_sheet_id_fkey FOREIGN KEY (roster_change_sheet_id) REFERENCES public.google_sheets (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
