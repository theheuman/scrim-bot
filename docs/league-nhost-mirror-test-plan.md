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

### Test 1.1 — Happy path, all overstat links None ✅

```
/league-signup team-name: Test Team Alpha comp-experience: 2 days a week player1: @TheHeuman player2: @Newton-test player3: @Nefericus player1-rank: Gold player2-rank: Plat player3-rank: HighDiamond player1-platform: pc player2-platform: playstation player3-platform: xbox player1-overstat-link: None player2-overstat-link: None player3-overstat-link: None player1-previous-vesa-division: Division1 player2-previous-vesa-division: Division2 player3-previous-vesa-division: Division3 days-unable-to-play: Mondays additional-comments: Test signup 1
```

**Expected Discord response**: signup confirmation showing `Signup #1`

**Verify in Nhost**:
- `league_teams`: 1 row, `team_name = 'Test Team Alpha'`, `status = 'pending'`
- `league_team_players`: 3 rows linked to that team with correct slots, ranks, and platforms
- `players`: 3 rows with `overstat_id = null` (all links were None)

**Verify in Sheets**: row appears in the signup tab

---

### Test 1.2 — Signup with a valid overstat link

```
/league-signup team-name: Test Team Beta comp-experience: 3 days a week player1: @TheHeuman player2: @Newton-test player3: @Nefericus player1-rank: Silver player2-rank: Bronze player3-rank: Gold player1-platform: pc player2-platform: pc player3-platform: pc player1-overstat-link: https://overstat.gg/player/111111/overview player2-overstat-link: None player3-overstat-link: None player1-previous-vesa-division: None player2-previous-vesa-division: None player3-previous-vesa-division: None additional-comments: Test signup 2
```

**Expected Discord response**: signup confirmation showing `Signup #2`

**Verify in Nhost**:
- @TheHeuman's row in `players` has `overstat_id = '111111'`
- @TheHeuman's row in `league_team_players` has `overstat_link = 'https://overstat.gg/player/111111/overview'`
- @Newton-test and @Nefericus have `overstat_id = null` and `overstat_link = null`

---

### Test 1.3 — Signup number reflects active teams, not all-time count

Mark Test Team Alpha as dropped:
```sql
UPDATE league_teams SET status = 'dropped' WHERE team_name = 'Test Team Alpha';
```

Then sign up a third team:
```
/league-signup team-name: Test Team Gamma comp-experience: 1 day a week player1: @TheHeuman player2: @Newton-test player3: @Nefericus player1-rank: Diamond player2-rank: Diamond player3-rank: Diamond player1-platform: xbox player2-platform: xbox player3-platform: xbox player1-overstat-link: None player2-overstat-link: None player3-overstat-link: None player1-previous-vesa-division: Division4 player2-previous-vesa-division: Division4 player3-previous-vesa-division: Division4 additional-comments: Test signup 3
```

**Expected Discord response**: `Signup #2` — Test Team Alpha is dropped, so only Test Team Beta is active ahead of this signup

---

### Test 1.4 — Rejections (nothing written to Sheets or DB)

Submitting user is not on the team:
```
/league-signup team-name: Test Team Delta comp-experience: 1 day a week player1: @Newton-test player2: @Newton-test player3: @Nefericus player1-rank: Gold player2-rank: Gold player3-rank: Gold player1-platform: pc player2-platform: pc player3-platform: pc player1-overstat-link: None player2-overstat-link: None player3-overstat-link: None player1-previous-vesa-division: None player2-previous-vesa-division: None player3-previous-vesa-division: None
```
*(Run this as @TheHeuman, who is not listed as a player)*

**Expected**: invisible error "User signing team up must be a player on the team". No rows written.

Invalid overstat link:
```
/league-signup team-name: Test Team Delta comp-experience: 1 day a week player1: @TheHeuman player2: @Newton-test player3: @Nefericus player1-rank: Gold player2-rank: Gold player3-rank: Gold player1-platform: pc player2-platform: pc player3-platform: pc player1-overstat-link: https://overstat.gg/notavalidpath player2-overstat-link: None player3-overstat-link: None player1-previous-vesa-division: None player2-previous-vesa-division: None player3-previous-vesa-division: None
```

**Expected**: invisible error about invalid overstat link. No rows written.

---

## Phase 2 — Sub Request

### Test 2.1 — Placement week (no DB write expected)

```
/sub-request team-name: Test Team Beta team-division: Division4 week-number: PlacementDay1 player-out: @Newton-test player-in: @Nefericus player-in-overstat-link: None player-in-division: Division4
```

**Expected**: Discord confirmation message is sent

**Verify in Nhost**: `league_sub_requests` has no new row — the command returns early for placement days before calling the service

---

### Test 2.2 — Regular week, team name resolves to known team

```
/sub-request team-name: Test Team Beta team-division: Division4 week-number: Week1 player-out: @Newton-test player-in: @Nefericus player-in-overstat-link: None player-in-division: Division4 additional-comments: Test sub 1
```

**Expected Discord response**: confirmation with sheet row info

**Verify in Nhost**:
- 1 row in `league_sub_requests`
- `team_id` is populated (resolved from `team_name = 'Test Team Beta'`)
- `player_out_id`, `player_in_id`, and `requested_by_id` all set correctly
- `week_number = 'Week1'`

**Verify in Sheets**: row in the sub sheet

---

### Test 2.3 — Regular week, team name does not resolve

```
/sub-request team-name: Unknown Team XYZ team-division: Division4 week-number: Week1 player-out: @Newton-test player-in: @Nefericus player-in-overstat-link: None player-in-division: Division4 additional-comments: Test sub unresolved team
```

**Expected Discord response**: confirmation still succeeds

**Verify in Nhost**: row in `league_sub_requests` with `team_id = null` and `team_name = 'Unknown Team XYZ'`

---

### Test 2.4 — Rejection: player in higher division than team

```
/sub-request team-name: Test Team Beta team-division: Division4 week-number: Week1 player-out: @Newton-test player-in: @Nefericus player-in-overstat-link: None player-in-division: Division1
```

**Expected**: invisible error "player subbing in is in Division1 which is a higher division than the team's division". No rows written.

---

## Phase 3 — Roster Change

### Test 3.1 — Happy path, player-out overstat omitted

```
/roster-change team-name: Test Team Beta team-division: Division4 player-out: @Newton-test player-in: @Nefericus player-in-overstat-link: None additional-comments: Test roster change 1
```

*(Leave `player-out-overstat-link` blank)*

**Expected Discord response**: confirmation

**Verify in Nhost**:
- 1 row in `league_roster_changes`
- `team_id` resolved from `team_name = 'Test Team Beta'`
- `player_out_overstat_link = null`, `player_in_overstat_link = null`

**Verify in Sheets**: row in the roster change sheet

---

### Test 3.2 — Player-out overstat explicitly set to None

```
/roster-change team-name: Test Team Beta team-division: Division4 player-out: @Newton-test player-in: @Nefericus player-in-overstat-link: None player-out-overstat-link: None additional-comments: Test roster change 2
```

**Expected**: succeeds

**Verify in Nhost**: both `player_out_overstat_link` and `player_in_overstat_link` are `null`

---

## Phase 4 — Shadow Failure Resilience

### Test 4.1 — DB unreachable, Sheets still writes

Stop local Nhost:
```
nhost down
```

Then run:
```
/league-signup team-name: Test Team Epsilon comp-experience: 1 day a week player1: @TheHeuman player2: @Newton-test player3: @Nefericus player1-rank: Gold player2-rank: Gold player3-rank: Gold player1-platform: pc player2-platform: pc player3-platform: pc player1-overstat-link: None player2-overstat-link: None player3-overstat-link: None player1-previous-vesa-division: None player2-previous-vesa-division: None player3-previous-vesa-division: None additional-comments: Shadow failure test
```

**Expected**:
- Discord response succeeds (primary Sheets write completes normally)
- An alert fires to the configured alert channel: `MirrorLeagueRepository: shadow writeSignup failed: ...`
- Sheets gains a new row for Test Team Epsilon; DB does not

Restart Nhost before continuing:
```
nhost up
```

---

## Phase 5 — Roster Map Read (getRosterDiscordIds)

Run a scrim `/signup` command for a player whose Discord ID appears in one of the league teams above (@TheHeuman, @Newton-test, or @Nefericus) and verify that prio or league-member logic is applied correctly. This confirms `getRosterDiscordIds` is reading the shadow DB successfully.

---

## Expected DB State After All Tests

| Table | Expected rows |
|---|---|
| `league_teams` | 2 active (Beta, Gamma) + 1 dropped (Alpha) |
| `league_team_players` | 6 rows (3 per active team) |
| `league_sub_requests` | 2 rows (Tests 2.2 and 2.3) |
| `league_roster_changes` | 2 rows (Tests 3.1 and 3.2) |
| `players` | @TheHeuman, @Newton-test, @Nefericus all upserted; @TheHeuman has `overstat_id = '111111'` from Test 1.2 |
