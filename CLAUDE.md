# VESA Apex Scrim Bot — Claude Context

A TypeScript Discord bot for the VESA Apex community. Manages scrim signups, priority (prio) tracking, player bans, MMR, and league signups. Integrates with Nhost (Hasura/GraphQL) as the database, Overstat for Apex tournament stats, HuggingFace for ML data uploads, and Google Sheets for league rosters.

Deploys automatically to Heroku from the `main` branch.

---

## Project Structure

```
src/
  commands/       # Discord slash commands, one file per command
    scrims/
      admin/      # Admin-only commands (prio, bans, roles, scrim CRUD)
      signup/     # Member commands (signup, dropout, sub, etc.)
    league/
      admin/      # League admin commands (role-assign)
    overstat/     # Overstat linking and lookup commands
    utility/      # Ping, user info
    command.ts    # Abstract base classes: Command, AdminCommand, MemberCommand
    interaction.ts # CustomInteraction wrapper
    index.ts      # Instantiates and exports commonCommands, scrimCommands, leagueCommands
  services/       # Business logic (one class per domain)
    index.ts      # Singleton service instances — wired together here
  db/
    db.ts         # Abstract DB class with all query methods
    nhost.db.ts   # Concrete NhostDb implementation (Hasura GraphQL)
    types.ts      # DB type system (LogicalExpression, DbTable, etc.)
    table.interfaces.ts # Raw DB row shapes
  models/         # Domain interfaces (Scrim, Player, Prio, etc.)
  events/         # Discord event handlers (ready, interactionCreate)
  utility/        # Shared helpers (time parsing, Discord type guards)
  config.ts       # Reads config.json (dev) or env vars (prod)

test/
  services/       # Jest unit tests for each service
  commands/       # Jest unit tests for commands
  mocks/          # Mock classes (DbMock, service mocks)
  db.test.ts      # DB layer tests

docs/
  adr/            # Architecture Decision Records (ADR-0001 through ADR-0010)
  league-data-repository-refactor.md  # Planned refactor: decouple LeagueService from Sheets
```

---

## Architecture & Key Patterns

### Commands

All commands extend one of two abstract classes — never `Command` directly:

- **`AdminCommand`** — `childExecute()` sends an ephemeral acknowledgment, checks `authService.memberIsAdmin()`, and only calls `run()` if the check passes. Unauthorized callers receive an ephemeral error and `run()` is never invoked. Implement `run(interaction)`. Use `interaction.editReply()` in `run()` (not `reply()`).
- **`MemberCommand`** — no auth check. Implement `run(interaction)`. Must reply within 3 seconds — use `interaction.invisibleReply("Working on it...")` immediately, then `interaction.editReply()` or `interaction.followUp()`.

The execution chain is a template method pattern:
```
execute()         ← called by the event handler; logs the interaction; catches unhandled errors
  └─ childExecute()  ← AdminCommand checks auth; MemberCommand calls run() directly
       └─ run()       ← concrete command business logic
```

Unhandled errors in `execute()` are caught, reported to `AlertService`, and surfaced to the user as an ephemeral message — commands do not need their own top-level try/catch.

All commands receive `alertService` as their **first** constructor argument, before `authService` or any domain services:
```ts
constructor(alertService: AlertService, authService: AuthService, private myService: MyService) {
  super(alertService, authService, "my-command", "Does a thing");
}
```

Command inputs are registered in the constructor using parent helper methods:
- `this.addStringInput(name, description, { isRequired, minLength, maxLength })`
- `this.addUserInput(name, description, isRequired)`
- `this.addIntegerInput(name, description, { isRequired, minValue, maxValue })`
- `this.addNumberInput(name, description, isRequired)`
- `this.addBooleanInput(name, description, isRequired)`
- `this.addRoleInput(name, description, isRequired)`
- `this.addChannelInput(name, description, { isRequired, channelTypes })`
- `this.addChoiceInput(name, description, EnumObject, isRequired)`
- `this.addDateInput(name, description, isRequired)` — stored as string, parsed via `interaction.options.getDateTime()`

Required inputs must be added before optional ones.

All inputs registered through these methods are automatically included in the audit log — no extra code needed.

Store input names in an `inputNames` object on the class to avoid magic strings:
```ts
inputNames = {
  teamName: "teamname",
  player: "player",
};
```

The `Command` base class also provides formatting helpers available to all subclasses:
- `this.formatTeam(team)` — formats a team entry for Discord display
- `this.formatPlayer(player)` — renders `<@discordId>`
- `this.formatDate(date)` — formats a `Date` for Discord display
- `this.formatTime(date)` — formats a `Date` time portion for Discord display

### Adding a New Command

1. Create a new file in the appropriate `src/commands/` subdirectory
2. Extend `AdminCommand` or `MemberCommand`
3. Inject needed services via constructor (`alertService` always first)
4. Register inputs in the constructor
5. Implement `run(interaction: CustomInteraction)`
6. Import and add an instance to `commonCommands`, `scrimCommands`, or `leagueCommands` in `src/commands/index.ts`
7. Run `npm run deploy-commands` to register with Discord (only needed when command signature changes)

Example admin command skeleton:
```ts
export class MyCommand extends AdminCommand {
  inputNames = { target: "target" };

  constructor(alertService: AlertService, authService: AuthService, private myService: MyService) {
    super(alertService, authService, "my-command", "Does a thing");
    this.addUserInput(this.inputNames.target, "The target user", true);
  }

  async run(interaction: CustomInteraction) {
    const user = interaction.options.getUser(this.inputNames.target, true);
    await this.myService.doThing(user.id);
    await interaction.editReply(`Done for <@${user.id}>`);
  }
}
```

### Multi-Guild Command Deployment

Commands are organized into three groups in `src/commands/index.ts`:

- **`commonCommands`** — relevant to both communities (ping, user info, overstat, role management).
- **`scrimCommands`** — scrim-specific (signup, dropout, sub-player, change-team-name, prio, bans, scrim CRUD).
- **`leagueCommands`** — league-specific (league-signup, roster-change, sub-request, role-assign).

`deploy-commands.ts` deploys `commonCommands + scrimCommands` to the scrim guild and `commonCommands + leagueCommands` to the league guild.

**Dev mode**: if `guildId.scrim === guildId.league` in config, all commands are deployed to the single dev guild.

When adding a command, choose the correct group. Commands that span both communities go in `commonCommands`.

### Interaction Acknowledgment

Default to `invisibleReply()` for async commands (see ADR-0001). The `deferReply()` pattern is reserved for the existing league commands (`league-signup`, `roster-change`, `sub-request`) where pre-validation early exits use `invisibleReply()` before `deferReply()` is called.

### Services

Services contain all business logic. They are constructed as singletons in `src/services/index.ts` and injected into commands via constructor. When adding a new service, wire it up in `services/index.ts` and inject it into any commands that need it.

Services receive a `DB` instance (not `NhostDb` directly) so they remain testable with `DbMock`.

### Database Layer

All DB access goes through the abstract `DB` class. Never reference `NhostDb` directly outside of `db/nhost.db.ts` and `services/index.ts`.

Use the query builder methods for standard operations:
```ts
// Get
await this.db.get(DbTable.players, { fieldName: "discord_id", comparator: "eq", value: discordId }, ["id", "display_name"])

// Post (returns array of new IDs)
await this.db.post(DbTable.prio, [{ player_id: id, amount: 1, reason: "late" }])

// Update
await this.db.update(DbTable.scrims, { fieldName: "id", comparator: "eq", value: scrimId }, { active: false }, ["id"])

// Delete
await this.db.delete(DbTable.scrimSignups, { fieldName: "scrim_id", comparator: "eq", value: scrimId }, ["id"])
```

For complex queries not supported by the builder, use `this.db.customQuery(graphqlString)` with raw Hasura GraphQL.

DB column names are **snake_case**. TypeScript model field names are **camelCase**. Map between them explicitly.

Compound expressions:
```ts
// AND
{ operator: "and", expressions: [expr1, expr2] }

// OR
{ operator: "or", expressions: [expr1, expr2] }
```

**Known issue — GraphQL injection**: `createValueString` in `NhostDb` interpolates values directly into query strings without escaping. All current callers pass application-controlled values (UUIDs, ISO dates, enum strings), but the fix — escaping or parameterizing values — is outstanding. Do not pass raw user input through the query builder.

**Known limitation — DB class size**: The single `DB` class mixes generic CRUD, domain-specific helpers, serverless function wrappers, and file operations. A future refactor should break it into domain-scoped interfaces (`ScrimDb`, `PlayerDb`, `LeagueDb`). See ADR-0007 for the full write-up.

### CustomInteraction

`CustomInteraction` wraps Discord's `ChatInputCommandInteraction`. Always use this, not the raw Discord interaction. Key methods:

- `interaction.reply()` — visible reply
- `interaction.invisibleReply(msg)` — ephemeral reply (only visible to the user who ran the command)
- `interaction.editReply()` — edit a previous reply
- `interaction.followUp()` — send an additional message after the initial reply
- `interaction.options.getDateTime(name)` — parses date string to `Date`
- `interaction.options.getChoice(name, EnumType)` — parses choice back to enum value

`member` is typed as `GuildMember` (not nullable) — the constructor throws if the interaction was not triggered from a guild, eliminating null-checks in commands.

### AlertService

`AlertService` routes operational errors to a configured Discord channel. Two methods:

- `alertService.warn(message)` — logs to console and posts to the alert channel.
- `alertService.error(message)` — logs to console, pings a configured user, and posts to the alert channel.

Inject into every service that can encounter unexpected errors. The top-level `execute()` on `Command` also calls `alertService.error()` for any unhandled exception. If the alert channel is not configured, it silently no-ops.

---

## Testing

Tests live in `test/` and mirror the `src/` structure. Run with `npm run test` or `npm run test:watch`.

Each service test:
- Creates a `DbMock` instance
- Instantiates the service with the mock
- Uses `jest.spyOn(dbMock, 'methodName').mockReturnValue(...)` to control DB responses
- Tests are grouped in `describe()` blocks per method

When adding a new service method that touches the DB, add it to `DbMock` in `test/mocks/db.mock.ts` and write tests covering the happy path and key error cases.

Use `jest.mock("../../src/config", ...)` at the top of test files that reference `appConfig` to avoid needing real credentials.

---

## Config & Secrets

- `config.json` at root is used for local dev (never committed with real secrets)
- Production runs on Heroku with env variables auto-populated by `scripts/create-config.sh` during `heroku-prebuild`
- Two environments: `dev` and `prod`, selected by `NODE_ENV`
- Key config values: Discord token, guild IDs (separate for scrims and league), Nhost credentials, HuggingFace token

---

## Deployment

- **Local dev**: `npm run build && npm run start` (or `npm run start:watch` for hot reload)
- **Local DB**: `npm run nhost` to start Nhost locally via Docker
- **Deploy commands**: `npm run deploy-commands` (dev) or `npm run deploy-commands:prod`
- **Production**: Push/merge to `main` → Heroku auto-deploys via the `Procfile`
- Build output goes to `dist/` (TypeScript → JavaScript)

Test new or modified commands on a private Discord server before merging to `main`.

---

## Domain Concepts

- **Scrim**: A practice match session. Tied to a Discord channel. Can be `active` or closed. Has a `prioType` (regular, off, league).
- **Signup**: A team signing up for a scrim. Always 3 players + a signup player (who may also be one of the 3). Team name max 25 chars.
- **Prio (Priority)**: A penalty applied to a player for a date range with an amount and reason. Affects signup order.
- **Ban**: Prevents a player from signing up for scrims during a date range.
- **Overstat**: Third-party Apex stats platform. Players link their Overstat profile to get stats tracked.
- **MMR/ELO**: Player skill rating stored on the `players` table.
- **League**: Separate signup flow for a structured league season. Uses Google Sheets for roster tracking (planned migration to Nhost — see `docs/league-data-repository-refactor.md`).

---

## Gotchas & Things to Know

- Discord requires a response within 3 seconds. Always `invisibleReply` or `deferReply` immediately for any async command.
- `AdminCommand` already sends an initial invisible reply during auth check, so `run()` should use `editReply()` not `reply()`.
- The scrim guild and league guild are **separate Discord servers** with separate guild IDs.
- `lobbySize` is 20 in prod, 1–3 in dev (set in config).
- When adding a new DB table, add it to the `DbTable` enum in `src/db/types.ts`.
- `insertPlayers` de-duplicates by `discordId` before inserting — safe to call with overlapping player lists.
- HuggingFace uploads are best-effort: errors are caught and logged but don't fail the operation.
- The `@ts-expect-error` in `logInteraction` (dynamic Discord getter call by method name string) is intentional — leave it.
- All command constructors take `alertService` as the first argument. Check `src/commands/index.ts` for instantiation examples when adding a new command.

---

## Architecture Decision Records

The `docs/adr/` directory contains detailed write-ups of the key design decisions in this codebase:

| ADR | Decision |
|-----|----------|
| ADR-0001 | Use `invisibleReply()` for interaction acknowledgment (not `deferReply()`) |
| ADR-0002 | Manual dependency injection in `services/index.ts` over a DI framework |
| ADR-0003 | Commands extend `SlashCommandBuilder`; `execute()→childExecute()→run()` template method |
| ADR-0004 | Authorization enforced by command subclass (`AdminCommand` / `MemberCommand`), not per-command |
| ADR-0005 | `CustomInteraction` wraps Discord's interaction via composition, not inheritance |
| ADR-0006 | Custom input builder (`addXInput`) and getter (`getDateTime`, `getChoice`) API on `Command` / `CustomInteraction` |
| ADR-0007 | Abstract `DB` class as the database interface; known issue: class is growing unwieldy |
| ADR-0008 | `AlertService` routes operational errors to a Discord channel |
| ADR-0009 | Commands deployed to separate scrim and league guilds via three command arrays |
| ADR-0010 | Custom GraphQL query builder; known issue: strings not escaped (injection risk) |
