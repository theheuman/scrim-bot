# League Tables — Production Migration Guide

Run each step one at a time in the Nhost production SQL editor. Each step is self-contained — if one fails, nothing after it has run yet.

After all SQL steps succeed, complete the Hasura tracking steps at the bottom.

---

## Step 1 — `league_teams`

```sql
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
```

---

## Step 2 — `league_team_players`

Requires Step 1 and the existing `players` table.

```sql
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
```

---

## Step 3 — `league_sub_requests`

`team_id` is nullable — a sub request can be filed for a team that signed up outside the bot.

```sql
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
```

---

## Step 4 — `league_roster_changes`

```sql
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
```

---

## Step 5 — `league_lobbies`

One row per game session. `week_number = 0` means placement rounds; 1+ are regular season weeks. `lobby_name` is set by staff (e.g. `lobby1`, `lobby1A`, `lobby1AvB`).

```sql
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
```

---

## Step 6 — `league_team_lobbies`

Join table tracking which teams played in which lobby. `ON DELETE CASCADE` means removing a lobby row automatically cleans up the join rows.

```sql
CREATE TABLE public.league_team_lobbies (
  id       uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  lobby_id uuid NOT NULL REFERENCES public.league_lobbies(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  team_id  uuid NOT NULL REFERENCES public.league_teams(id)   ON UPDATE RESTRICT ON DELETE CASCADE,
  UNIQUE (lobby_id, team_id)
);

CREATE INDEX league_team_lobbies_team_id_idx ON public.league_team_lobbies(team_id);
```

---

## Hasura Tracking (after all SQL steps succeed)

In the Hasura console → **Data** tab:

1. Click **Track** on each of the six new tables: `league_teams`, `league_team_players`, `league_sub_requests`, `league_roster_changes`, `league_lobbies`, `league_team_lobbies`.

2. For each table, click **Track all relationships** — Hasura will auto-detect the foreign keys and suggest array/object relationships.

   The two relationships **required for the app to work** are:
   - `league_teams → league_team_players` (array relationship)
   - `league_team_players → player` (object relationship)

   These are used by the `getLeagueRosterMap` GraphQL query. Track all the others too for future website use.
