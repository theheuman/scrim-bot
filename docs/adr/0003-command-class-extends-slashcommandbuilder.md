# ADR-0003: Commands Extend `SlashCommandBuilder` Directly

**Status:** Accepted  
**Date:** 2026-05-14

## Context

Discord slash commands have two concerns: a **definition** (name, description, options — serialized to JSON for registration with Discord) and a **handler** (the code that runs when the command is invoked). These could be kept separate:

- A JSON/config object defines the command shape.
- A separate handler class or function contains the business logic.
- A registration step wires the two together.

Alternatively, they can be unified in a single class.

## Decision

The abstract `Command` class extends Discord's `SlashCommandBuilder`. Each concrete command class is both the definition and the handler — there is no separate config object. The definition is built in the constructor via inherited builder methods (`setName`, `setDescription`, and the custom input wrappers described in ADR-0006). The handler is the abstract `run()` method.

Deployment calls `command.toJSON()` directly on each command instance, which Discord.js serializes to the required API format.

A template method pattern ties the two concerns together:

```
execute()         ← called by the event handler, logs the interaction
  └─ childExecute()  ← implemented by AdminCommand / MemberCommand (handles auth)
       └─ run()       ← implemented by each concrete command (business logic)
```

Unhandled errors in `execute()` are caught, reported to `AlertService`, and surfaced to the user as an ephemeral message — commands do not need their own top-level try/catch.

## Consequences

- A command class is self-contained: its definition, its input declarations, its formatting helpers, and its handler all live together.
- Adding a new command means extending `MemberCommand` or `AdminCommand`, declaring inputs in the constructor, and implementing `run()`. No registration config to maintain separately.
- `loggableArguments` — built up as inputs are declared — drives automatic audit logging of all user-supplied values without extra code in each command.
- The formatter methods (`formatTeam`, `formatPlayer`, `formatDate`, `formatTime`) live on `Command` and are available to all subclasses, avoiding duplication.
- Inheriting from a Discord.js class means the bot is tied to Discord.js's class hierarchy. If Discord.js makes a breaking change to `SlashCommandBuilder`, all commands are affected. This is an accepted risk given the bot is Discord-specific.
