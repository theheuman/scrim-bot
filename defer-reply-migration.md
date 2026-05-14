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
await interaction.deferReply();
// ... async work ...
await interaction.editReply("result");   // works fine after deferReply
```

**Key facts:**
- `editReply` works after `deferReply` — that is what it's designed for.
- After `deferReply`, you cannot call `reply()` or `invisibleReply()` again (they will throw).
- For error returns after `deferReply`: use `editReply("error message")`.
- For ephemeral responses: `deferReply({ ephemeral: true })`, then `editReply` is also ephemeral.
- For a public response from a command that defers ephemerally: use `followUp(...)`.

## Commands to migrate

### Group 1 — `invisibleReply` is the first action, rest of command already uses `editReply`

Clean 1-line swap: `invisibleReply(...)` → `deferReply()`.

| Command file | Test file | Notes |
|---|---|---|
| `src/commands/scrims/signup/current-position.ts` | `test/commands/scrims/signup/current-position.test.ts` | ✅ Done — `deferReply` swapped in, test mock updated |
| `src/commands/overstat/link-overstat.ts` | `test/commands/overstat/add-overstat-link.test.ts` | Happy path deletes reply then followsUp; errors use `editReply` |
| `src/commands/overstat/get-overstat.ts` | `test/commands/overstat/get-overstat-link.test.ts` | All paths use `editReply` |
| `src/commands/scrims/signup/sign-up.ts` | `test/commands/scrims/signup/signup.test.ts` | Success uses `followUp` (public); error uses `editReply` |

### Group 2 — `invisibleReply` only on early sync guard (isGuildMember), main path uses `reply()` then `editReply`

Two changes: guard error → keep as `invisibleReply` (happens before any reply so it's fine), main path `reply(...)` → `deferReply()`.

| Command file | Test file |
|---|---|
| `src/commands/scrims/signup/change-team-name.ts` | `test/commands/scrims/signup/change-team-name.test.ts` |
| `src/commands/scrims/signup/droput-scrims.ts` | `test/commands/scrims/signup/dropout.test.ts` |
| `src/commands/scrims/signup/sub-player.ts` | `test/commands/scrims/signup/sub.test.ts` |

### Group 3 — Already using `deferReply` on the happy path, but validation errors still use `invisibleReply`

These are fine as-is: the `invisibleReply` calls happen before `deferReply` so they don't conflict.
Only migrate if we want full consistency.

| Command file |
|---|
| `src/commands/league/league-signup.ts` |
| `src/commands/league/roster-change.ts` |
| `src/commands/league/sub-request.ts` |

## Test update checklist

For each migrated command test:
- Replace `invisibleReply: jest.fn()` with `deferReply: jest.fn()` in the mock interaction object.
- Add `deferReplySpy` declaration and `jest.spyOn` alongside `editReplySpy` if needed.
- Clear `deferReplySpy` in `beforeEach`.
- No need to assert `deferReplySpy` was called in every test case (user preference).
