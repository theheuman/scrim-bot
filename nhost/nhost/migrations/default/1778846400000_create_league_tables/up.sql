-- Step 1: league_teams
CREATE TABLE public.league_teams (
  id                  uuid        DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  season_id           uuid        NOT NULL REFERENCES public.league_seasons(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  team_name           text        NOT NULL,
  days_unable_to_play text        NOT NULL,
  comp_knowledge      text        NOT NULL,
  additional_comments text,
  signup_number       integer     NOT NULL,
  status              text        NOT NULL DEFAULT 'pending',
  submitted_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX league_teams_season_id_team_name_idx ON public.league_teams(season_id, team_name);
CREATE UNIQUE INDEX league_teams_season_id_signup_number_idx ON public.league_teams(season_id, signup_number);

-- Step 2: league_team_players
CREATE TABLE public.league_team_players (
  id                   uuid    DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  team_id              uuid    NOT NULL REFERENCES public.league_teams(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  player_id            uuid    NOT NULL REFERENCES public.players(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  slot                 integer NOT NULL CHECK (slot IN (1, 2, 3)),
  apex_rank            text    NOT NULL,
  platform             text    NOT NULL,
  prev_season_division text    NOT NULL,
  overstat_link        text,
  elo                  integer
);

CREATE INDEX league_team_players_team_id_idx ON public.league_team_players(team_id);

-- Step 3: league_sub_requests
-- team_id is nullable: sub requests can be filed for teams that signed up outside the bot
CREATE TABLE public.league_sub_requests (
  id                       uuid        DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  season_id                uuid        NOT NULL REFERENCES public.league_seasons(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  team_id                  uuid        REFERENCES public.league_teams(id) ON UPDATE RESTRICT ON DELETE SET NULL,
  team_name                text        NOT NULL,
  division                 text        NOT NULL,
  week_number              text        NOT NULL,
  player_out_id            uuid        NOT NULL REFERENCES public.players(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  player_out_overstat_link text,
  player_in_id             uuid        NOT NULL REFERENCES public.players(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  player_in_overstat_link  text,
  player_in_division       text        NOT NULL,
  requested_by_id          uuid        NOT NULL REFERENCES public.players(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  additional_comments      text,
  status                   text        NOT NULL DEFAULT 'pending',
  submitted_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX league_sub_requests_season_id_idx ON public.league_sub_requests(season_id);

-- Step 4: league_roster_changes
-- team_id is nullable for the same reason as league_sub_requests
CREATE TABLE public.league_roster_changes (
  id                       uuid        DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  season_id                uuid        NOT NULL REFERENCES public.league_seasons(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  team_id                  uuid        REFERENCES public.league_teams(id) ON UPDATE RESTRICT ON DELETE SET NULL,
  team_name                text        NOT NULL,
  division                 text        NOT NULL,
  player_out_id            uuid        NOT NULL REFERENCES public.players(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  player_out_overstat_link text,
  player_in_id             uuid        NOT NULL REFERENCES public.players(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  player_in_overstat_link  text,
  requested_by_id          uuid        NOT NULL REFERENCES public.players(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  additional_comments      text,
  status                   text        NOT NULL DEFAULT 'pending',
  submitted_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX league_roster_changes_season_id_idx ON public.league_roster_changes(season_id);
