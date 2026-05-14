# ADR-0009: Commands Deployed to Separate Scrim and League Guilds

**Status:** Accepted  
**Date:** 2026-05-14

## Context

The bot serves two distinct communities with different needs:

- **Scrim players** use commands to sign up for scrims, manage team rosters, drop out, and check positions.
- **League players** use commands to sign up for the league season, request subs, and make roster changes.

These communities exist in separate Discord servers (guilds). All commands could be deployed to all guilds, but this would expose scrim commands to league players and vice versa — cluttering the slash command menu with irrelevant commands.

## Decision

Commands are organized into three groups:

- **`commonCommands`** — relevant to both communities (e.g. ping, overstat lookup).
- **`scrimCommands`** — scrim-specific (signup, dropout, sub-player, change-team-name, etc.).
- **`leagueCommands`** — league-specific (league-signup, roster-change, sub-request, etc.).

`deploy-commands.ts` deploys `commonCommands + scrimCommands` to the scrim guild and `commonCommands + leagueCommands` to the league guild.

**Dev mode** is detected automatically: if `guildId.scrim === guildId.league` in the config, all commands are deployed to the single guild. This avoids maintaining a separate dev configuration — pointing both guild IDs at a dev server is sufficient.

## Consequences

- Each Discord server only shows commands relevant to its community.
- Adding a command requires deciding which group it belongs to. Commands that span both communities go in `commonCommands`.
- A command that accidentally goes into the wrong group will be missing from one guild and present in another — this is immediately visible and easy to fix.
- The single bot process handles interactions from both guilds simultaneously. Commands are routed by name via the `client.commands` map, which holds all commands regardless of which guild they were deployed to.
