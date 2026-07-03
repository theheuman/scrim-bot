-- Admin role sync support for VESAWeb authentication (Epic 4 / Discord OAuth).

-- admin_discord_ids: source-of-truth allowlist of Discord user IDs that hold an
-- admin role. The scrim-bot keeps this in sync with Discord guild admin roles.
CREATE TABLE public.admin_discord_ids (
    discord_id text NOT NULL,
    role_name text,
    added_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (discord_id)
);

-- admin_users: per-Nhost-user admin flag. Populated automatically when a user
-- links a Discord provider whose Discord ID is on the allowlist. This is the
-- table the `x-hasura-is-admin` custom JWT claim reads from.
CREATE TABLE public.admin_users (
    user_id uuid NOT NULL,
    discord_id text NOT NULL,
    is_admin boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id),
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- When a Discord OAuth provider is linked to a user, grant admin if their
-- Discord ID is on the allowlist. This fires at the moment we first learn the
-- mapping between a Nhost user and their Discord ID (i.e. first login).
CREATE OR REPLACE FUNCTION public.sync_admin_from_discord_provider()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.provider_id = 'discord'
     AND EXISTS (SELECT 1 FROM public.admin_discord_ids a WHERE a.discord_id = NEW.provider_user_id) THEN
    INSERT INTO public.admin_users (user_id, discord_id, is_admin)
    VALUES (NEW.user_id, NEW.provider_user_id, true)
    ON CONFLICT (user_id) DO UPDATE SET is_admin = true, discord_id = EXCLUDED.discord_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_admin_from_discord_provider
AFTER INSERT ON auth.user_providers
FOR EACH ROW
EXECUTE FUNCTION public.sync_admin_from_discord_provider();

-- Reconcile every already-linked Discord user against the current allowlist.
-- The bot should call this (SELECT public.reconcile_admin_users();) after it
-- updates admin_discord_ids so changes also affect users who already logged in.
CREATE OR REPLACE FUNCTION public.reconcile_admin_users()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Grant / refresh admins currently on the allowlist
  INSERT INTO public.admin_users (user_id, discord_id, is_admin)
  SELECT up.user_id, up.provider_user_id, true
  FROM auth.user_providers up
  JOIN public.admin_discord_ids a ON a.discord_id = up.provider_user_id
  WHERE up.provider_id = 'discord'
  ON CONFLICT (user_id) DO UPDATE SET is_admin = true, discord_id = EXCLUDED.discord_id;

  -- Revoke admin from users no longer on the allowlist
  UPDATE public.admin_users au
  SET is_admin = false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.admin_discord_ids a WHERE a.discord_id = au.discord_id
  );
END;
$$;
