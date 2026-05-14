# ADR-0008: `AlertService` for Operational Error Routing

**Status:** Accepted  
**Date:** 2026-05-14

## Context

Two categories of error can occur during command execution:

1. **User errors** — invalid input, missing data, authorization failures. These should be shown to the invoking user as ephemeral messages and are not operationally significant.
2. **Operational errors** — unexpected exceptions, DB failures, API errors, unhandled edge cases. These need to reach a human operator so they can be investigated, but they should not cause crashes or be silently swallowed by a catch block.

Without a dedicated channel for operational errors, the options are:

- Log to console only (invisible unless watching logs in real time).
- Use an external monitoring service (Sentry, Datadog) — adds a dependency and cost.
- Post to a dedicated Discord channel using the bot itself.

## Decision

`AlertService` routes operational errors to a configured Discord channel in the scrim server. It has two methods:

- `warn(message)` — logs to console and posts to the alert channel.
- `error(message)` — logs to console, pings a configured user ID, and posts to the alert channel.

The alert channel ID and ping user ID are stored in the database and retrieved via `StaticValueService`, so they can be changed without a deployment.

`AlertService` is injected into every service that can encounter operational errors. The top-level `execute()` on `Command` also calls `alertService.error()` for any unhandled exception that escapes a command's own try/catch.

## Consequences

- Operational errors surface immediately in Discord without requiring access to server logs or an external monitoring dashboard.
- The ping user for errors is configurable — changing who gets notified does not require a code change.
- If the alert channel or ping user is not configured, `AlertService` silently no-ops rather than throwing a secondary error, avoiding error-in-error-handler scenarios.
- Using Discord as the monitoring channel means alerts are unavailable if the bot itself is down. This is an accepted limitation for a community bot where full monitoring infrastructure would be disproportionate.
