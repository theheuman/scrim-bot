# Defer Reply Migration

## Goal

Replace the old `invisibleReply("command received...")` acknowledgement pattern with `deferReply()`.
Discord's "Bot is thinking..." indicator handles acknowledgement — no explicit message needed.

**Do not** add `deferReply` to the base `Command`, `AdminCommand`, or `MemberCommand` classes.
Each individual command owns its interaction handling.

## Pattern

```
// Before
await interaction.invisibleReply("Fetched all input, working on request");
// ... async work ...
await interaction.editReply("result");

// After
await interaction.deferReply({ ephemeral: true });
// ... async work ...
await interaction.editReply("result");   // inherits ephemeral from deferReply
```

**Key facts:**
- `invisibleReply` always passes `ephemeral: true`. Any `deferReply` replacing it **must** also pass `{ ephemeral: true }` or the response becomes public.
- `editReply` works after `deferReply` — that is what it's designed for.
- After `deferReply`, you cannot call `reply()` or `invisibleReply()` again (they will throw).
- For error returns after `deferReply`: use `editReply("error message")`.
- `editReply` inherits the ephemeral flag set on `deferReply` — you don't pass it again.
- For a public response from a command that defers ephemerally: use `followUp(...)` (which is not bound by the ephemeral flag).

## Commands to migrate

### Group 1 — `invisibleReply` is the first action, rest of command already uses `editReply`

These commands use `invisibleReply` (ephemeral) as the ack, so replace with `deferReply({ ephemeral: true })`. `editReply` after an ephemeral defer is also ephemeral. `followUp` is NOT bound by the ephemeral flag and will be public.

| Command file | Test file | Visibility | Notes |
|---|---|---|---|
| `src/commands/scrims/signup/current-position.ts` | `test/commands/scrims/signup/current-position.test.ts` | ephemeral | ✅ Done — `deferReply({ ephemeral: true })` swapped in, test mock updated |
| `src/commands/overstat/link-overstat.ts` | `test/commands/overstat/add-overstat-link.test.ts` | ephemeral defer, public followUp | Errors use `editReply` (ephemeral); success uses `followUp` (public) |
| `src/commands/overstat/get-overstat.ts` | `test/commands/overstat/get-overstat-link.test.ts` | ephemeral | All paths use `editReply` — fully ephemeral |
| `src/commands/scrims/signup/sign-up.ts` | `test/commands/scrims/signup/signup.test.ts` | ephemeral defer, public followUp | Guard `reply` at top stays as-is (fires before defer); `invisibleReply` → `deferReply({ ephemeral: true })`; errors use `editReply` (ephemeral); success uses `followUp` (public) |

### Group 2 — `invisibleReply` only on early sync guard (isGuildMember), main path uses `reply()` then `editReply`

Guard error stays as `invisibleReply` (fires before any defer, so no conflict). Main path `reply(...)` was public, so replace with `deferReply()` **without** `{ ephemeral: true }` to preserve public visibility.

| Command file | Test file | Visibility |
|---|---|---|
| `src/commands/scrims/signup/change-team-name.ts` | `test/commands/scrims/signup/change-team-name.test.ts` | public |
| `src/commands/scrims/signup/droput-scrims.ts` | `test/commands/scrims/signup/dropout.test.ts` | public |
| `src/commands/scrims/signup/sub-player.ts` | `test/commands/scrims/signup/sub.test.ts` | public |

### Group 3 — Already using `deferReply` on the happy path, but validation errors still use `invisibleReply`

Validation errors fire before `deferReply`, so the `invisibleReply` calls don't conflict.
All three use `deferReply()` **without** `{ ephemeral: true }` (public "thinking..." indicator) and then only call `followUp` — they never call `editReply` to resolve the deferred message. Confirm whether the public defer and missing `editReply` are intentional before touching these.

| Command file | Visibility |
|---|---|
| `src/commands/league/league-signup.ts` | public defer |
| `src/commands/league/roster-change.ts` | public defer |
| `src/commands/league/sub-request.ts` | public defer |

### Out of scope — synchronous MemberCommand (no async work, `reply()` is correct)

These reply synchronously and don't need `deferReply`. No migration needed.

| Command file | Notes |
|---|---|
| `src/commands/utility/ping.ts` | Single `reply("Pong!")` |
| `src/commands/utility/user.ts` | Single `reply(...)`, no async work |

### Out of scope — AdminCommand subclasses

`AdminCommand.childExecute` calls `invisibleReply` before invoking `run()`, so all admin commands start with an ephemeral ack from the base class. Their `editReply`/`followUp` calls inside `run()` are already correctly sequenced. No migration needed.

## Test update checklist

For each migrated command test:
- Replace `invisibleReply: jest.fn()` with `deferReply: jest.fn()` in the mock interaction object.
- Add `deferReplySpy` declaration and `jest.spyOn` alongside `editReplySpy` if needed.
- Clear `deferReplySpy` in `beforeEach`.
- No need to assert `deferReplySpy` was called in every test case (user preference).
