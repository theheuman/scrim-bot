SET check_function_bodies = false;
CREATE TABLE public.dummy_scrim_signups_with_players (
    scrim_id uuid,
    date_time timestamp without time zone,
    team_name text,
    player_one_id uuid,
    player_one_discord_id text,
    player_one_display_name text,
    player_one_overstat_id text,
    player_one_elo numeric,
    player_two_id uuid,
    player_two_discord_id text,
    player_two_display_name text,
    player_two_overstat_id text,
    player_two_elo numeric,
    player_three_id uuid,
    player_three_discord_id text,
    player_three_display_name text,
    player_three_overstat_id text,
    player_three_elo numeric,
    signup_player_id uuid,
    signup_player_discord_id text,
    signup_player_display_name text
);
CREATE FUNCTION public.get_scrim_signups_with_players(scrim_id_search uuid) RETURNS SETOF public.dummy_scrim_signups_with_players
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY 
    SELECT 
      ss.scrim_id,
      ss.date_time,
      ss.team_name,
      p1.id AS player_one_id,
      p1.discord_id AS player_one_discord_id,
      p1.display_name AS player_one_display_name,
      p1.overstat_id AS player_one_overstat_id,
      p1.elo AS player_one_elo,
      p2.id AS player_two_id,
      p2.discord_id AS player_two_discord_id,
      p2.display_name AS player_two_display_name,
      p2.overstat_id AS player_two_overstat_id,
      p2.elo AS player_two_elo,
      p3.id AS player_three_id,
      p3.discord_id AS player_three_discord_id,
      p3.display_name AS player_three_display_name,
      p3.overstat_id AS player_three_overstat_id,
      p3.elo AS player_three_elo,
      p0.id AS signup_player_id,
      p0.discord_id AS signup_player_discord_id,
      p0.display_name AS signup_player_display_name
  FROM scrim_signups ss
  LEFT JOIN players p0 ON ss.signup_player_id = p0.id
  LEFT JOIN players p1 ON ss.player_one_id = p1.id
  LEFT JOIN players p2 ON ss.player_two_id = p2.id
  LEFT JOIN players p3 ON ss.player_three_id = p3.id
  WHERE ss.scrim_id = scrim_id_search;
END;
$$;
CREATE FUNCTION public.insert_player_if_not_exists(discord_id text, display_name text, overstat_link text) RETURNS uuid
    LANGUAGE plpgsql
    AS $_$
DECLARE
    player_id uuid;
BEGIN
    SELECT id INTO player_id
    FROM players
    WHERE discord_id = $1;
    IF NOT FOUND THEN
        INSERT INTO players (discord_id, display_name, overstat_link)
        VALUES ($1, $2, $3)
        RETURNING id INTO player_id;
    END IF;
    RETURN player_id;
END;
$_$;
CREATE FUNCTION public.upsert_players_with_overstat_link(players_input jsonb) RETURNS TABLE(id uuid, discord_id text, display_name text, overstat_link text)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  INSERT INTO players (discord_id, display_name, overstat_link)
  SELECT
    player->>'discord_id',
    player->>'display_name',
    CASE 
      WHEN player->>'overstat_link' IS NULL THEN p.overstat_link
      ELSE player->>'overstat_link'
    END
  FROM jsonb_array_elements(players_input) AS player
  ON CONFLICT (discord_id) 
  DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    overstat_link = COALESCE(EXCLUDED.overstat_link, players.overstat_link)
  RETURNING id, discord_id, display_name, overstat_link;
END;
$$;
CREATE TABLE public.players (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    display_name text NOT NULL,
    discord_id text NOT NULL,
    overstat_id text,
    elo numeric
);
CREATE TABLE public.prio (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    amount numeric NOT NULL,
    reason text NOT NULL
);
CREATE TABLE public.scrim_admin_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    discord_role_id text NOT NULL,
    role_name text NOT NULL
);
CREATE TABLE public.scrim_player_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    name text NOT NULL,
    kills smallint NOT NULL,
    revives_given smallint NOT NULL,
    assists smallint NOT NULL,
    survival_time integer NOT NULL,
    respawns_given smallint NOT NULL,
    damage_dealt integer NOT NULL,
    knockdowns smallint NOT NULL,
    grenades_thrown smallint NOT NULL,
    ultimates_used smallint NOT NULL,
    tacticals_used smallint NOT NULL,
    damage_taken integer NOT NULL,
    score smallint NOT NULL,
    characters text NOT NULL,
    scrim_id uuid NOT NULL,
    games_played smallint DEFAULT '6'::smallint NOT NULL
);
CREATE TABLE public.scrim_signups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scrim_id uuid NOT NULL,
    date_time timestamp without time zone DEFAULT now() NOT NULL,
    team_name text NOT NULL,
    player_one_id uuid NOT NULL,
    player_two_id uuid NOT NULL,
    player_three_id uuid NOT NULL,
    combined_elo numeric,
    signup_player_id uuid NOT NULL
);
CREATE TABLE public.scrims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date_time_field timestamp with time zone NOT NULL,
    skill smallint,
    overstat_link character varying(500),
    discord_channel text NOT NULL,
    active boolean DEFAULT true NOT NULL
);
ALTER TABLE ONLY public.scrim_signups
    ADD CONSTRAINT "ScrimSignups_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.prio
    ADD CONSTRAINT low_prio_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_discord_id_key UNIQUE (discord_id);
ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_overstat_link_key UNIQUE (overstat_id);
ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.scrim_admin_roles
    ADD CONSTRAINT scrim_admin_roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.scrim_player_stats
    ADD CONSTRAINT scrim_player_stats_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.scrims
    ADD CONSTRAINT scrims_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.scrim_signups
    ADD CONSTRAINT "ScrimSignups_player_one_id_fkey" FOREIGN KEY (player_one_id) REFERENCES public.players(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.scrim_signups
    ADD CONSTRAINT "ScrimSignups_player_three_id_fkey" FOREIGN KEY (player_three_id) REFERENCES public.players(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.scrim_signups
    ADD CONSTRAINT "ScrimSignups_player_two_id_fkey" FOREIGN KEY (player_two_id) REFERENCES public.players(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.scrim_signups
    ADD CONSTRAINT "ScrimSignups_scrim_id_fkey" FOREIGN KEY (scrim_id) REFERENCES public.scrims(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.prio
    ADD CONSTRAINT low_prio_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.scrim_player_stats
    ADD CONSTRAINT scrim_player_stats_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.scrim_player_stats
    ADD CONSTRAINT scrim_player_stats_scrim_id_fkey FOREIGN KEY (scrim_id) REFERENCES public.scrims(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.scrim_signups
    ADD CONSTRAINT scrim_signups_signup_player_id_fkey FOREIGN KEY (signup_player_id) REFERENCES public.players(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
