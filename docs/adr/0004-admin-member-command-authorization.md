# ADR-0004: Authorization Enforced by Command Subclass, Not by Each Command

**Status:** Accepted  
**Date:** 2026-05-14

## Context

Some commands should only be executable by admins. The authorization check could be placed:

1. **In each command's `run()` method** — every admin command calls `authService.memberIsAdmin()` itself.
2. **In the framework** — a base class handles the check before `run()` is ever called.

Option 1 means authorization is opt-in: a developer writing a new admin command must remember to add the check. Forgetting it silently produces an unprotected command.

## Decision

Two abstract subclasses of `Command` enforce the authorization boundary:

- **`AdminCommand`**: `childExecute()` sends an ephemeral acknowledgment, checks `authService.memberIsAdmin()`, and only calls `run()` if the check passes. Unauthorized callers receive an ephemeral error and `run()` is never invoked.
- **`MemberCommand`**: `childExecute()` calls `run()` directly with no auth check.

A command's authorization level is determined entirely by which class it extends. There is no flag to set, no check to add in `run()`.

## Consequences

- Authorization is opt-out by structure: to write an admin command, you extend `AdminCommand`. It is impossible to forget the check.
- `run()` can assume the caller is authorized. No auth logic appears in business logic methods.
- Adding a third authorization tier (e.g. moderator-only) means adding a third subclass — the pattern scales cleanly.
- `AdminCommand` adds one round-trip to the DB (`memberIsAdmin`) before any command work begins. For admin commands this is acceptable; if latency became a concern, the result could be cached (see `AuthService`'s existing role map cache).
