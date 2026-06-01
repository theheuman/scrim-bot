# ADR-0011: Mirror League Repository — Sheets as Primary, Nhost as Shadow

**Status:** Accepted — temporary; intended to be replaced once Nhost data is validated  
**Date:** 2026-05-24

## Context

League operations (team signup, sub requests, roster changes) have historically been written to Google Sheets. Sheets serves as the source of truth for staff during the active season: the signup sheet shows the wait-list order, division sub-sheets show the sub log, and the roster sheet is read by the bot to validate whether a player is on an eligible team.

The decision was made to migrate this data to Nhost (Hasura/GraphQL) so that:

- A staff-facing website can query league data directly from the database rather than scraping sheets
- Data is structured and queryable (divisions, lobby history, player history across seasons)
- The Google Sheets dependency — brittle API calls, manual tab-per-division maintenance, no relational integrity — is eventually eliminated

However, cutting directly from Sheets to Nhost in a single season carries risk: if the Nhost write path has a silent bug (wrong season ID, missing player deduplication, schema mismatch), the data discrepancy may not be caught until staff try to use the website and find it incomplete or wrong.

## Decision

Introduce `MirrorLeagueRepository` as a transitional wrapper that implements `LeagueDataRepository` and holds two concrete implementations:

- **Primary** (`LeagueSheetRepository`) — Google Sheets. Drives the actual command response returned to Discord. If the primary fails, the command fails exactly as it did before this change.
- **Shadow** (`LeagueDbRepository`) — Nhost. Runs concurrently via `Promise.allSettled`. If the shadow fails, the error is passed to `AlertService.error` and swallowed; the Discord response is unaffected.

```
MirrorLeagueRepository
  ├── primary: LeagueSheetRepository  ← command succeeds/fails based on this
  └── shadow:  LeagueDbRepository     ← runs in parallel; failure is logged only
```

Reads (`getRosterDiscordIds`) are served from the primary only. The Nhost tables do not yet have enough data or validation history to drive any reads.

## Consequences

- **Zero regression risk on Discord commands.** Sheets remains the decision-maker for every user-visible outcome. The shadow is entirely invisible to users.
- **Silent Nhost validation.** Every write that goes through the bot also touches Nhost. Staff can inspect the Nhost tables and cross-reference against Sheets to confirm the data matches before trusting Nhost as a standalone source.
- **Operational visibility.** Nhost failures surface in the alert channel via `AlertService.error`, which pings the configured staff user. This means bugs in the Nhost write path are caught without user-facing impact.
- **Cutover is a one-line change.** All league wiring is in `services/index.ts`. When Nhost is validated, swap `primary` and `shadow` in the `MirrorLeagueRepository` constructor to make Nhost the authority. Run another season in reverse-mirror (Sheets as shadow), then remove the wrapper and `LeagueSheetRepository` entirely.
- **Both repos run on every command.** There is a small latency cost from firing the shadow write concurrently. In practice, `Promise.allSettled` means total latency is `max(sheets, nhost)` rather than `sheets + nhost`, so the overhead is only visible if Nhost is slower than Sheets on a given call.

## Cutover Sequence

1. **Current season (mirror mode):** Sheets primary, Nhost shadow. Monitor alert channel for shadow errors.
2. **Next season (reverse mirror):** Swap primary/shadow. Nhost drives responses; Sheets is the fallback shadow. Continue monitoring.
3. **Season after (or mid-season once confident):** Remove `MirrorLeagueRepository` and `LeagueSheetRepository`. `LeagueService` is wired directly to `LeagueDbRepository`. The only file that changes is `services/index.ts`.
