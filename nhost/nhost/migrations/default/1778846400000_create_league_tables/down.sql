-- Drop lobby tables first if still applied (managed by 1779100800000 migration).
-- The Hasura CLI handles ordering automatically; this guards against manual SQL execution.
DROP TABLE IF EXISTS public.league_team_lobbies;
DROP TABLE IF EXISTS public.league_lobbies;
-- Drop in reverse dependency order
DROP TABLE IF EXISTS public.league_roster_changes;
DROP TABLE IF EXISTS public.league_sub_requests;
DROP TABLE IF EXISTS public.league_team_players;
DROP TABLE IF EXISTS public.league_teams;
