# ADR-0001: Use `invisibleReply` for Interaction Acknowledgment

**Status:** Accepted  
**Date:** 2026-05-14

## Context

Discord slash commands must be acknowledged within 3 seconds or the interaction fails with "The application did not respond." For commands that do async work (DB queries, Sheets API calls), the bot must send something immediately before that work begins.

Two Discord.js patterns are available:

### `deferReply()`

Sends Discord's built-in "thinking..." loading indicator. The deferred slot stays open until the bot calls `editReply()` (fills it) or `deleteReply()` (dismisses it). When a command is deferred and then resolved via `editReply()`, Discord displays the command invocation context above the reply — the invoking user's name, the command name, and the arguments used.

### `invisibleReply()`

A custom wrapper around Discord's ephemeral immediate reply. Sends an ephemeral "working on it" message instantly that only the invoking user sees. Subsequent messages use `editReply()` (replaces/updates the ephemeral) or `followUp()` (adds a new message).

---

## The `deferReply` Catch-22

`deferReply()` creates an irreconcilable tradeoff between success visibility and error UX. Whichever variant you choose, one path behaves incorrectly.

### Public defer (`deferReply()`)

Discord shows a public "thinking..." spinner immediately. Everyone in the channel sees it.

| Path | Approach | Result |
|---|---|---|
| Success | `editReply(message)` | ✅ Public reply with Discord command context (shows who ran it, what command) |
| Error | `editReply(error)` | ❌ Public error — everyone sees it, channel gets noisy |
| Error | `deleteReply()` + `followUp({ ephemeral: true })` | ❌ Ephemeral error, but Discord command context is gone — deleting the deferred reply removes the invocation display |

### Ephemeral defer (`deferReply({ ephemeral: true })`)

The "thinking..." spinner is only visible to the invoking user.

| Path | Approach | Result |
|---|---|---|
| Success | `editReply(message)` | ❌ Ephemeral success — only the invoking user sees the result |
| Success | `followUp(message)` | ❌ Public success message, but Discord command context is not shown — the invocation display is tied to the deferred reply, which was ephemeral |
| Error | `editReply(error)` | ✅ Ephemeral error with Discord command context |

There is no configuration of `deferReply()` where both the success path produces a public reply with Discord command context **and** the error path produces an ephemeral reply with Discord command context.

---

## Decision

Use `invisibleReply()` as the acknowledgment pattern for scrim signup commands.

The `invisibleReply()` pattern avoids the catch-22 entirely:

- **Error messages are naturally ephemeral.** `editReply()` on an ephemeral original produces an ephemeral edit. No extra steps, no dangling public spinner.
- **Channel is not spammed.** Error messages are only visible to the person who ran the command, keeping the signup channel clean.
- **Users can retry easily.** The ephemeral reply stays visible to the user while they fix the issue and re-run the command.
- **Command context can be added manually where it matters.** If it is important to display who ran a command (e.g. a successful signup), `<@userId>` can be included in the success message directly. This is more flexible than Discord's automatic display anyway.

The `deferReply()` pattern remains in the league commands (`league-signup`, `roster-change`, `sub-request`) where it was already established. Those commands have a different structure: pre-validation early exits fire before `deferReply()` using `invisibleReply()`, and `deferReply()` is only called once validation passes, making the success-path tradeoff acceptable there.

## Consequences

- New commands that do async work should default to `invisibleReply()` for the acknowledgment.
- Reserve `deferReply()` for commands where a public acknowledgment is explicitly desired and the error-path tradeoff is acceptable.
- The `invisibleReply()` wrapper is not a Discord primitive — its behavior (ephemeral immediate reply type 4) should remain documented at the definition in `CustomInteraction`.
