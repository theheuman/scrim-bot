-- Step 1: league_lobbies
-- One row per actual game session.
-- week_number = 0 means placement rounds; 1+ are regular season weeks.
-- week_type distinguishes 'placement' from 'regular' for query clarity.
-- lobby_name is set by staff (e.g. 'lobby1', 'lobby1A', 'lobby1AvB') and encodes
-- any split-lobby grouping information in a human-readable way.
-- overstat_id links to the Overstat tournament record for that session.
CREATE TABLE public.league_lobbies (
  id          uuid        DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  season_id   uuid        NOT NULL REFERENCES public.league_seasons(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  week_number integer     NOT NULL,
  week_type   text        NOT NULL DEFAULT 'regular',
  division    text        NOT NULL,
  lobby_name  text        NOT NULL,
  lobby_date  date,
  overstat_id text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT week_type_check CHECK (week_type IN ('placement', 'regular'))
);

CREATE INDEX league_lobbies_season_id_week_idx ON public.league_lobbies(season_id, week_number);
CREATE INDEX league_lobbies_season_id_division_idx ON public.league_lobbies(season_id, division);

-- Step 2: league_team_lobbies (join table)
-- Tracks which teams played in which lobby.
-- A team can appear in multiple lobbies (e.g. plays in two divisions simultaneously).
-- UNIQUE constraint prevents the same team being added to the same lobby twice.
CREATE TABLE public.league_team_lobbies (
  id       uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  lobby_id uuid NOT NULL REFERENCES public.league_lobbies(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  team_id  uuid NOT NULL REFERENCES public.league_teams(id)   ON UPDATE RESTRICT ON DELETE CASCADE,
  UNIQUE (lobby_id, team_id)
);

CREATE INDEX league_team_lobbies_team_id_idx ON public.league_team_lobbies(team_id);
