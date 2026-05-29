# Scrim Transaction Log

## Goal

Keep a permanent, queryable record of every meaningful action that happens during a scrim's lifetime. Right now, when a scrim closes, all signup rows are deleted — losing any history of who signed up, who dropped out, who subbed in, and any team name changes that occurred.

The fix is an append-only `scrim_transaction_log` table that records each of these events as they happen. The existing `scrim_signups` table and close flow stay the same.

---

## DB Table

Create the following table in Nhost (Hasura). The table name must match exactly.

```
scrim_transaction_log
  id                uuid          PK, default gen_random_uuid()
  scrim_id          uuid          FK → scrims.id, not null
  event_type        text          not null  — one of: signup | dropout | sub | name_change
  timestamp         timestamptz   not null, default now()
  acting_player_id  uuid          FK → players.id, not null  — the player who ran the command
  team_name         text          not null  — the team's name at the time of the event
  player_one_id     uuid          FK → players.id, nullable
  player_two_id     uuid          FK → players.id, nullable
  player_three_id   uuid          FK → players.id, nullable
  old_player_id     uuid          FK → players.id, nullable  — sub only: the player leaving
  new_player_id     uuid          FK → players.id, nullable  — sub only: the player joining
  old_team_name     text          nullable                    — name_change only: the previous name
```

**Which columns are populated per event type:**

| event_type  | team_name | player_one/two/three | old_player / new_player | old_team_name |
|-------------|-----------|----------------------|-------------------------|---------------|
| signup      | ✓         | ✓                    | —                       | —             |
| dropout     | ✓         | —                    | —                       | —             |
| sub         | ✓         | —                    | ✓                       | —             |
| name_change | new name  | —                    | —                       | ✓             |

After creating the table in Nhost, add the new table name to the `DbTable` enum in `src/db/types.ts`.

---

## What Needs to Change in Code

There are four actions that need to write a transaction log entry. Find the place in the service layer where each one happens (not in the commands) and insert a log write alongside the existing DB operation. The log write should be best-effort — if it fails, warn via `AlertService` but do not fail the user-facing operation.

1. **Team signup** — after `addScrimSignup` succeeds
2. **Team dropout** — after `removeScrimSignup` succeeds
3. **Sub (replace teammate)** — after `replaceTeammate` / `replaceTeammateNoAuth` succeeds
4. **Team name change** — after `changeTeamName` / `changeTeamNameNoAuth` succeeds

To write a log entry, add a method to the `DB` class (following the existing patterns for `addScrimSignup`, `removeScrimSignup`, etc.) and call it from the relevant service methods.

---

## What Does Not Need to Change

- The `closeScrim` flow — signups are still deleted on close, as today.
- The `scrim_signups` table schema.
- Any commands — all changes belong in the service and DB layers.
- Tests for the commands.

Update `DbMock` in `test/mocks/db.mock.ts` with the new DB method and add service-level tests covering the happy path for each of the four event types.
