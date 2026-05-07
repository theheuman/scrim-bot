SET check_function_bodies = false;

INSERT INTO public.static_key_value (id, name, value) VALUES
  ('af709808-7480-428c-a1e8-b17abfd5a015', 'signups_instruction_text', 'Scrims will begin at ${scrimTime} on the posted date.\n\nPlease read https://discord.com/channels/1043350338574495764/1288134648005922907⁠ ⁠⁠⁠before you participate\n\nUse the bot command /signup and fill out the required values\n\nLobbies will be posted around 2 hours before start time. Draft is at ${draftTime}.\n\nAny drop outs after ${lowPrioTime} will low prio your team.\n\nWe need 42+ sign ups for two lobbies.\n\nMAPS USED FOR THIS SCRIM ARE IN THE NAME OF THE POST'),
  ('698a401a-8e88-4543-b5e3-b56e9653f8a3', 'sub_approval_role_id', '1423669556013961256')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.scrim_admin_roles (id, discord_role_id, role_name) VALUES
  ('422a9c59-8be1-45ce-82ee-01d89d79f3cd', '1324920593258250271', 'Scrim admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.google_sheets (id, name, sheet_id, tab_name, range_start) VALUES
  ('f148d921-b95c-42bc-bb2d-c705f10b7570', 's14 signup sheet', '1_e_TdsjAc077eHSzcAOVs8xBHAJSPVd9JXJiLDfVHeo', 'Sheet1', 'A1'),
  ('21af6e03-671b-4dc1-9101-2531799e7da2', 'sub request',      '1_e_TdsjAc077eHSzcAOVs8xBHAJSPVd9JXJiLDfVHeo', 'Sheet2', 'A1'),
  ('4a18fd46-b155-4ea8-b203-a9a83ba23e6e', 'roster change',    '1_e_TdsjAc077eHSzcAOVs8xBHAJSPVd9JXJiLDfVHeo', 'Sheet3', 'A1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.league_seasons (id, signup_sheet_id, sub_sheet_id, roster_change_sheet_id, signup_prio_end_date, start_date) VALUES
  ('28662209-500c-4211-8f38-cf9d3d5af0de', 'f148d921-b95c-42bc-bb2d-c705f10b7570', '21af6e03-671b-4dc1-9101-2531799e7da2', '4a18fd46-b155-4ea8-b203-a9a83ba23e6e', '2026-05-08T04:00:00+00:00', '2026-05-11T04:00:00+00:00')
ON CONFLICT (id) DO NOTHING;
