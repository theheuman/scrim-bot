DROP TRIGGER IF EXISTS sync_admin_from_discord_provider ON auth.user_providers;
DROP FUNCTION IF EXISTS public.sync_admin_from_discord_provider();
DROP FUNCTION IF EXISTS public.reconcile_admin_users();
DROP TABLE IF EXISTS public.admin_users;
DROP TABLE IF EXISTS public.admin_discord_ids;
