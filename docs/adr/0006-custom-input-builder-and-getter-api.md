# ADR-0006: Custom Input Builder and Getter API

**Status:** Accepted  
**Date:** 2026-05-14

## Context

Discord's `SlashCommandBuilder` has verbose option registration methods (`addStringOption`, `addUserOption`, etc.) that each require a callback accepting an option object. Every call must set a name, description, and required flag. Discord also has no native date input type, and its choice inputs work with raw strings that must be manually matched to application enums.

On the reading side, Discord's `CommandInteractionOptionResolver` returns raw strings, numbers, or users — type-safe enum parsing and date string parsing must be handled by each command individually if not centralized.

## Decision

Two sets of wrappers were added:

### Input builders (on `Command`)

`addStringInput`, `addUserInput`, `addIntegerInput`, `addNumberInput`, `addBooleanInput`, `addRoleInput`, `addChannelInput`, `addDateInput`, `addChoiceInput` — each wraps the corresponding Discord builder method, normalizes the name/description/required pattern, and registers the input in `loggableArguments` for automatic audit logging.

Notable cases:
- `addStringInput` and `addIntegerInput` accept optional `config` objects for `minLength`/`maxLength`/`minValue`/`maxValue`, avoiding scattered `.setMinLength()` calls.
- `addDateInput` is backed by a string input with length constraints (3–17 chars) because Discord has no native date picker.
- `addChoiceInput` accepts a TypeScript enum-style `Record<string, string | number>` and handles the numeric reverse-mapping that TypeScript adds to numeric enums (filtering out keys where `Number(key)` is not `NaN`).

### Getters (on `CustomInteraction`)

`getDateTime(key, required?)` parses the string from a date input using the application's date format (`mm/dd/yy hh:mm pm`), throwing a descriptive error on bad input.

`getChoice<K>(key, choices, required?)` takes an enum-like record, retrieves the raw string from Discord, converts to numeric if applicable, validates it exists in the enum's values, and returns a typed `K[keyof K]`. Both overloads (optional and required) are typed to return `K[keyof K] | null` and `K[keyof K]` respectively.

## Consequences

- Each command constructor reads as a flat list of `addXInput()` calls rather than nested Discord builder callbacks. The intent (name, description, required) is immediately readable.
- All inputs registered through these methods are automatically included in the audit log — commands cannot accidentally add an input and forget to log it.
- `getChoice` and `getDateTime` centralize parsing logic that would otherwise be duplicated or inconsistently handled across commands.
- Adding a new input type requires adding a wrapper method to `Command` and a getter to `CustomInteraction`. This is a small, localized change.
- The `@ts-expect-error` in `logInteraction` (which dynamically calls the Discord getter method by name from `loggableArguments`) is a known type system limitation — the getter method names are strings at runtime, and TypeScript cannot verify them statically. This is the accepted cost of the automatic audit log.
