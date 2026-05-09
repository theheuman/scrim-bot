# League Data Repository Refactor

## Goal

Decouple `LeagueService` from Google Sheets so that switching to Nhost as the data source touches one file: `services/index.ts`. A parallel-run phase will let both sources be validated side-by-side for at least one full season before cutting over.

## Motivation

`LeagueService` currently calls the Sheets API directly for reads (roster lookup) and writes (signups, sub requests, roster changes). When the league data moves to Nhost, every Sheets call needs to be replaced. Without an abstraction boundary the changes spread across `LeagueService`, its tests, and any callers.

---

## Interface

Define `LeagueDataRepository` in `src/repositories/league-data.repository.ts`:

```typescript
export interface SignupData {
  teamName: string;
  teamNoDays: string;
  teamCompKnowledge: string;
  player1: SheetsPlayer;
  player2: SheetsPlayer;
  player3: SheetsPlayer;
  additionalComments: string;
}

export interface SignupResult {
  rowNumber: number | null;
  seasonInfo: {
    signupPrioEndDate: string;
    startDate: string;
  };
}

export interface SubRequestData {
  teamDivision: string;
  teamName: string;
  weekNumber: string;
  playerOut: LeaguePlayer;
  playerIn: LeaguePlayer;
  playerInDivision: string;
  commandUser: GuildMember;
  additionalComments: string;
}

export interface RosterChangeData {
  teamDivision: string;
  teamName: string;
  playerOut: LeaguePlayer;
  playerIn: LeaguePlayer;
  commandUser: GuildMember;
  additionalComments: string;
}

export interface WriteResult {
  rowNumber: number | null;
  url: string;
  tabName: string;
}

export interface LeagueDataRepository {
  getRosterDiscordIds(): Promise<Map<string, string>>;
  writeSignup(data: SignupData): Promise<SignupResult | null>;
  writeSubRequest(data: SubRequestData): Promise<WriteResult>;
  writeRosterChange(data: RosterChangeData): Promise<WriteResult>;
}
```

`LeagueService` takes `LeagueDataRepository` as a constructor parameter and delegates all data operations to it. Its own methods become thin orchestration — validate inputs, call the repository, format the Discord response.

---

## Implementations

### `LeagueSheetRepository` (current behavior, moved)

Location: `src/repositories/league-sheet.repository.ts`

Contains everything currently in `LeagueService` that touches the Sheets API:
- `getAuthClient()`
- All `sheets({ version: "v4" })` calls
- `SheetHelper` usage for building requests and parsing row numbers

`SheetHelper` stays as-is — a low-level static utility used by this class.

### `LeagueDbRepository` (future)

Location: `src/repositories/league-db.repository.ts`

Reads roster data from Nhost tables instead of fetching sheet tabs. Writes signup/sub/roster-change records to Nhost instead of appending sheet rows. Returns `url: ""` and `rowNumber: null` for write results, or a Nhost record ID — to be decided when the DB schema is defined.

---

## Parallel-Run Phase

Before cutting over fully, run both repositories simultaneously for one season to confirm the Nhost data matches what was submitted via Sheets.

### How to wire it

In `services/index.ts`, instantiate both repositories and pass them to a thin `ParallelLeagueRepository` wrapper:

```typescript
// src/repositories/parallel-league.repository.ts
export class ParallelLeagueRepository implements LeagueDataRepository {
  constructor(
    private primary: LeagueDataRepository,   // sheets — source of truth for responses
    private shadow: LeagueDataRepository,    // nhost — writes in parallel, errors logged not thrown
  ) {}

  async writeSignup(data: SignupData): Promise<SignupResult | null> {
    const [result] = await Promise.allSettled([
      this.primary.writeSignup(data),
      this.shadow.writeSignup(data).catch((e) =>
        console.error("Shadow writeSignup failed", e),
      ),
    ]);
    if (result.status === "rejected") throw result.reason;
    return result.value;
  }

  // same pattern for writeSubRequest, writeRosterChange

  async getRosterDiscordIds(): Promise<Map<string, string>> {
    // once nhost has roster data, compare here and log divergence
    return this.primary.getRosterDiscordIds();
  }
}
```

The shadow repository's failures are logged but never surface to the user. Once a season of data confirms correctness, swap `primary` and `shadow`, run for another week, then drop the parallel wrapper entirely.

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/repositories/league-data.repository.ts` | New — interface and data types |
| `src/repositories/league-sheet.repository.ts` | New — current `LeagueService` Sheets logic moved here |
| `src/repositories/league-db.repository.ts` | New — Nhost implementation (future season) |
| `src/repositories/parallel-league.repository.ts` | New — parallel-run wrapper (parallel-run season) |
| `src/services/league.ts` | Remove Sheets logic, accept `LeagueDataRepository` in constructor |
| `src/services/index.ts` | Swap which repository is wired in — the only file that changes at cutover |
| `test/mocks/league-data.repository.mock.ts` | New — replaces current `LeagueServiceMock` for repository-level tests |
| `test/services/league.test.ts` | Test `LeagueService` against a mock repository; move Sheets-specific tests to `league-sheet.repository.test.ts` |

`SignupService`, `RosterService`, commands, and everything else that depends on `LeagueService` — no changes.

---

## Cutover Sequence

1. **Now**: merge this refactor, `LeagueSheetRepository` wired as the sole implementation — behavior identical to today.
2. **Next season**: build `LeagueDbRepository` + `ParallelLeagueRepository`. Wire parallel mode. Monitor logs for divergence.
3. **Season after** (or mid-season once confident): flip `primary`/`shadow`. Sheets becomes the shadow, Nhost drives responses.
4. **Final cleanup**: remove `ParallelLeagueRepository` and `LeagueSheetRepository` once Sheets is confirmed retired.
