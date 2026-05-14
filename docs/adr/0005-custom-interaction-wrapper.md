# ADR-0005: `CustomInteraction` Wraps Discord's Interaction

**Status:** Accepted  
**Date:** 2026-05-14

## Context

Discord's `ChatInputCommandInteraction` provides the raw Discord API surface: reply methods, option getters, member/user/guild accessors. The bot needs additional capabilities on top of it:

- Parsing date strings from text inputs (Discord has no native date input type).
- Type-safe enum choice parsing.
- An `invisibleReply()` shorthand for ephemeral acknowledgments (see ADR-0001).
- Consistent console logging of all reply calls for debugging.
- A guarantee that `interaction.member` is a `GuildMember`, not `APIInteractionGuildMember | GuildMember | null`.

Options:

- **Use the raw interaction directly** and handle these concerns ad-hoc in each command.
- **Extend `ChatInputCommandInteraction`** via inheritance.
- **Wrap it** (composition): create a `CustomInteraction` class that holds the original interaction and delegates to it.

## Decision

Wrap via composition. `CustomInteraction` stores the original as `ogInteraction` and exposes a curated API:

- Extended option resolver (`getDateTime`, `getChoice`) built by augmenting Discord's resolver at construction time.
- All reply methods delegated to `ogInteraction` with logging added.
- `invisibleReply()` as a first-class method.
- `member` typed as `GuildMember` — the constructor throws if the interaction was not triggered from a guild, eliminating null-checks in every command.

## Consequences

- Commands are written against `CustomInteraction`, not Discord's raw type. This isolates commands from Discord.js API changes — only the wrapper needs to update when Discord's interface shifts.
- All reply calls log the interaction ID and arguments automatically, without each command needing to do so.
- Tests mock `CustomInteraction` directly (a plain object with `jest.fn()` properties), which is far simpler than mocking Discord's deep class hierarchy.
- The raw interaction is still accessible via `ogInteraction` if a command ever needs something the wrapper doesn't expose — no capability is permanently locked out.
- Wrapping rather than extending avoids TypeScript complications with extending a complex third-party class and keeps the interface surface small and explicit.
