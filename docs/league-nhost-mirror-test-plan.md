# League Nhost Mirror — Local Test Plan

Tests that the `MirrorLeagueRepository` correctly writes to both Google Sheets (primary) and Nhost (shadow) for all three league operations, handles shadow failures gracefully, and derives signup numbers accurately from active team counts.

---

## Prerequisites

Before running any commands, confirm:

1. Local Nhost is running (`nhost up`)
2. An active league season exists in the DB with `signup_prio_end_date` in the future and `start_date` in the future
3. Sheets credentials are configured and the signup, sub, and roster change sheets are accessible

---

## Phase 1 — League Signup

### Test 1.1 — Happy path, all overstat links provided

Run `/league-signup` with:
- `team-name`: `Test Team Alpha`
- `comp-experience`: `~2 days/wk, 1 yr, EEC`
- `player1` through `player3`: three real Discord users (the user submitting must be one of them)
- Ranks, platforms, and previous VESA divisions set for all three
- All three overstat links: valid `https://overstat.gg/player/<id>/overview` URLs
- `days-unable-to-play`: `Mondays`

**Expected Discord response**: signup confirmation showing `Signup #1`

**Verify in Nhost**:
- `league_teams`: 1 row, `team_name = 'Test Team Alpha'`, `status = 'pending'`
- `league_team_players`: 3 rows linked to that team with correct slots, ranks, and platforms
- `players`: 3 rows with `overstat_id` populated from the provided links

**Verify in Sheets**: row appears in the signup tab

---

### Test 1.2 — Signup with "None" overstat for one player

Run `/league-signup` with a different team name and the same structure, but set one player's overstat link to `None`.

**Expected Discord response**: signup confirmation showing `Signup #2`

**Verify in Nhost**:
- The player with `None` overstat has `overstat_id = null` in `players`
- That player's row in `league_team_players` has `overstat_link = null`

---

### Test 1.3 — Signup number reflects active teams, not all-time count

Manually mark the first team as dropped in Nhost:
```sql
UPDATE league_teams SET status = 'dropped' WHERE team_name = 'Test Team Alpha';
```

Run `/league-signup` with a third team (different players, different team name).

**Expected Discord response**: `Signup #2` — only one active team exists, so the new team is second

---

### Test 1.4 — Rejections (nothing written to Sheets or DB)

Run the following and confirm neither Sheets nor DB gains a row in each case:

- Submitting user is not one of the three players → invisible error: "User signing team up must be a player on the team"
- Invalid overstat link (e.g. `https://overstat.gg/notavalidpath`) → invisible error about invalid overstat link

---

## Phase 2 — Sub Request

### Test 2.1 — Placement week (no DB write expected)

Run `/sub-request` with `week-number: PlacementDay1`. Any otherwise valid inputs.

**Expected**: Discord confirmation message is sent

**Verify in Nhost**: `league_sub_requests` has no new row — the command returns early for placement days before calling the service

---

### Test 2.2 — Regular week, team name resolves to known team

Run `/sub-request` with:
- `team-name`: name of an active team from Phase 1
- `team-division`: any valid division
- `week-number`: `Week1`
- `player-out`: one of that team's Discord users
- `player-in`: a different Discord user
- `player-in-overstat-link`: valid link or `None`
- `player-in-division`: same or lower division than the team

**Expected Discord response**: confirmation with sheet row info

**Verify in Nhost**:
- 1 row in `league_sub_requests` with correct `season_id`, `team_id` resolved (name matched an existing team), `player_out_id`, `player_in_id`, `requested_by_id`

**Verify in Sheets**: row in sub sheet

---

### Test 2.3 — Regular week, team name does not resolve

Run `/sub-request` with `team-name: Unknown Team XYZ` (no matching team in the DB). All other inputs valid.

**Expected Discord response**: confirmation still succeeds

**Verify in Nhost**: row in `league_sub_requests` with `team_id = null` and `team_name = 'Unknown Team XYZ'`

---

### Test 2.4 — Rejection: player in higher division than team

Run `/sub-request` where `player-in-division` is `Division1` and `team-division` is `Division4`.

**Expected**: invisible error "player subbing in is in Division1 which is a higher division than the team's division"

No rows written to Sheets or DB.

---

## Phase 3 — Roster Change

### Test 3.1 — Happy path, player-out overstat omitted

Run `/roster-change` with:
- `team-name`: name of an active team from Phase 1
- `team-division`: any valid division (not None)
- `player-out`: one of the team's current Discord users
- `player-in`: a new Discord user
- `player-in-overstat-link`: valid link or `None`
- Leave `player-out-overstat-link` blank

**Expected Discord response**: confirmation

**Verify in Nhost**: 1 row in `league_roster_changes` with correct fields and `team_id` resolved

**Verify in Sheets**: row in the roster change sheet

---

### Test 3.2 — Both players have no overstat

Run `/roster-change` with `player-in-overstat-link: None` and `player-out-overstat-link` left blank.

**Expected**: still succeeds

**Verify in Nhost**: both `player_out_overstat_link` and `player_in_overstat_link` are `null`

---

## Phase 4 — Shadow Failure Resilience

### Test 4.1 — DB unreachable, Sheets still writes

Stop local Nhost (`nhost down` or stop the relevant Docker containers). Run `/league-signup` with a new team.

**Expected**:
- Discord response succeeds (primary Sheets write completes normally)
- An alert fires to the configured alert channel: `MirrorLeagueRepository: shadow writeSignup failed: ...`
- Sheets gains the new row; DB does not

Restart Nhost before continuing.

---

## Phase 5 — Roster Map Read (getRosterDiscordIds)

This DB read is used by the prio service to identify players currently on a league team. Run `/signup` (scrim signup) for a player whose Discord ID appears in one of the league teams created above, and verify that the prio or league-member logic treats them correctly.

---

## Expected DB State After All Tests

| Table | Expected rows |
|---|---|
| `league_teams` | 2 active + 1 dropped |
| `league_team_players` | 6–9 rows (3 per active team) |
| `league_sub_requests` | 2 rows (Tests 2.2 and 2.3) |
| `league_roster_changes` | 2 rows (Tests 3.1 and 3.2) |
| `players` | all Discord users from all commands upserted correctly |
