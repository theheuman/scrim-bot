# League Staff DB Roadmap

What the current schema supports, what it doesn't, and what needs to be built for staff to manage the league entirely through the database (and a future website) without relying on Google Sheets.

---

## What Already Works

- **Team roster lookup** — `league_team_players → league_teams → players` gives name, slot, rank, platform, overstat link for every signed-up team.
- **Signup history** — `league_teams` with `status`, `submitted_at`, and `days_unable_to_play` / `comp_knowledge` / `additional_comments`. Signup number is derived at query time by ranking teams within the season by `submitted_at`, excluding dropped teams.
- **Sub request and roster change records** — tables exist with `status` fields and full player details.
- **Lobby tracking** — `league_lobbies` + `league_team_lobbies` lets staff record which teams played in which lobby each week (placement and regular season).

---

## Gaps and What to Build

### 1. Unique Team Names Within a Season

**Problem:** `league_teams` has no uniqueness constraint on `(season_id, team_name)`. While Sheets is the primary repository this is intentional — Sheets allows duplicate team names and enforcing uniqueness in the shadow DB would cause the mirror to fail on legitimate Sheets signups. Once Sheets is retired, duplicate team names become a real problem: `getLeagueTeamIdByName` resolves a sub request or roster change to a team by name alone, and if two teams share a name the result is non-deterministic.

**Fix:** Add a unique index once Sheets is no longer primary:

```sql
CREATE UNIQUE INDEX league_teams_season_id_team_name_idx ON public.league_teams(season_id, team_name);
```

The existing non-unique index `league_teams_season_id_team_name_idx` should be dropped first:

```sql
DROP INDEX public.league_teams_season_id_team_name_idx;
CREATE UNIQUE INDEX league_teams_season_id_team_name_idx ON public.league_teams(season_id, team_name);
```

---

### 3. Current Division on a Team

**Problem:** `league_teams` has no `division` column. The only way to know a team's current division is to find their most recent `league_lobbies` row, which is inference rather than a first-class fact. Staff can't answer "what division is Team X in?" without a join through lobby history.

**Fix:** Add a nullable `division text` column to `league_teams`. Staff update it when teams are placed after placements, and again if a team is promoted, relegated, or playing in two divisions simultaneously.

```sql
ALTER TABLE public.league_teams ADD COLUMN division text;
```

No Nhost migration file needed beyond the SQL — just add the column and track it in the Hasura metadata as a standard field.

---

### 4. Approval Audit Trail on Sub Requests and Roster Changes

**Problem:** `league_sub_requests` and `league_roster_changes` have a `status` field but no record of who approved or rejected the request, or when.

**Fix:** Add `reviewed_by_id uuid REFERENCES public.players(id)` and `reviewed_at timestamptz` to both tables. When staff approve or reject, write their player ID and the current timestamp.

```sql
ALTER TABLE public.league_sub_requests
  ADD COLUMN reviewed_by_id uuid REFERENCES public.players(id) ON UPDATE RESTRICT ON DELETE SET NULL,
  ADD COLUMN reviewed_at    timestamptz;

ALTER TABLE public.league_roster_changes
  ADD COLUMN reviewed_by_id uuid REFERENCES public.players(id) ON UPDATE RESTRICT ON DELETE SET NULL,
  ADD COLUMN reviewed_at    timestamptz;
```

---

### 5. Scoring Layer

**Problem:** There is no way to record match results. `league_lobbies` has an `overstat_id` but nothing is stored locally. Without stored results, there are no per-week point totals, no standings table, and no basis for manual adjustments.

**The data model:**

```sql
-- One row per individual game within a lobby (lobbies typically run 6–8 games).
CREATE TABLE public.league_games (
  id             uuid        DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  lobby_id       uuid        NOT NULL REFERENCES public.league_lobbies(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  game_number    integer     NOT NULL,
  overstat_game_id text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lobby_id, game_number)
);

-- One row per team per game: the raw result used to compute points.
CREATE TABLE public.league_game_results (
  id          uuid    DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  game_id     uuid    NOT NULL REFERENCES public.league_games(id)  ON UPDATE RESTRICT ON DELETE RESTRICT,
  team_id     uuid    NOT NULL REFERENCES public.league_teams(id)  ON UPDATE RESTRICT ON DELETE RESTRICT,
  placement   integer NOT NULL,
  kills       integer NOT NULL,
  points      integer NOT NULL,  -- calculated at insert time: placement_points + kill_points
  UNIQUE (game_id, team_id)
);

CREATE INDEX league_game_results_team_id_idx ON public.league_game_results(team_id);
```

Weekly totals and season standings are derived by aggregating `points` over `league_game_results` joined through `league_games → league_lobbies`. No denormalized totals column is needed — Hasura aggregate queries handle this efficiently.

**Note on overstat:** The `overstat_id` on `league_lobbies` and `overstat_game_id` on `league_games` leave room to cross-reference with the Overstat API for validation, but results should be stored locally so the website doesn't depend on a third-party API being up.

---

### 6. Manual Point Adjustments

**Problem:** Staff need to apply point deductions (or additions) for infractions — e.g. a team fielded an ineligible player, a team forfeited without notice, a team violated a conduct rule. These should be auditable and must not corrupt the raw match data in `league_game_results`.

**Fix:** A separate adjustments table that is summed alongside game results when computing standings.

```sql
CREATE TABLE public.league_point_adjustments (
  id          uuid        DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  season_id   uuid        NOT NULL REFERENCES public.league_seasons(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  team_id     uuid        NOT NULL REFERENCES public.league_teams(id)   ON UPDATE RESTRICT ON DELETE RESTRICT,
  week_number integer,            -- null = applies to the whole season total
  amount      integer     NOT NULL,  -- negative for deductions, positive for bonuses
  reason      text        NOT NULL,
  applied_by_id uuid      NOT NULL REFERENCES public.players(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  applied_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX league_point_adjustments_team_id_idx ON public.league_point_adjustments(season_id, team_id);
```

A team's true point total for a week = `SUM(game_results.points)` + `SUM(adjustments.amount WHERE week_number = N)`. Season total = sum of all weeks plus adjustments where `week_number IS NULL`.

---

### 7. Forfeit and No-Show Tracking

**Problem:** There is no way to record that a team didn't play a given week (bye, no-show, forfeit). This matters because a team that forfeits still needs a lobby row for that week so the absence is recorded, but they should receive 0 points rather than be omitted from standings.

**Fix:** Add a `status` column to `league_team_lobbies`:

```sql
ALTER TABLE public.league_team_lobbies
  ADD COLUMN status text NOT NULL DEFAULT 'played'
  CONSTRAINT team_lobby_status_check CHECK (status IN ('played', 'forfeit', 'bye', 'no_show'));
```

When computing standings, a row with `status != 'played'` contributes 0 game points for that week (adjustments can still apply independently).

---

### 8. Lobby Scheduling (Time of Day)

**Problem:** `league_lobbies.lobby_date` stores the date but not the time. Staff cannot communicate a scheduled start time through the database.

**Fix:**

```sql
ALTER TABLE public.league_lobbies ADD COLUMN lobby_time timetz;
```

`NULL` means the time is not yet set. Staff fill it in when scheduling is confirmed.

---

## Summary — Migration Order

These can be done independently but the scoring layer (items 3 and 4) should be built together since point adjustments are only meaningful once raw game points exist.

| Priority | Item | Complexity |
|----------|------|------------|
| 1 | Unique team names within a season | Trivial — blocked on Sheets retirement |
| 2 | Division column on `league_teams` | Trivial — one ALTER |
| 3 | Approval audit trail on sub/roster tables | Low — two ALTERs |
| 4 | `league_games` + `league_game_results` | Medium — new tables, bot commands to enter results |
| 5 | `league_point_adjustments` | Low once scoring exists — new table, one staff command |
| 6 | Forfeit/no-show status on `league_team_lobbies` | Low — one ALTER |
| 7 | Lobby time column | Trivial — one ALTER |

Items 1–2 and 5–6 are schema-only changes with no new bot commands required — they only need the column added and a website UI (or manual SQL) to populate them. Items 3–4 require new Discord commands so staff can enter results without database access.
