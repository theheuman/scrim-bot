# ADR-0007: Abstract `DB` Class as the Database Interface

**Status:** Accepted  
**Date:** 2026-05-14

## Context

The bot stores scrims, signups, players, prio entries, and league data in Nhost (a hosted Postgres/GraphQL backend). All data access could be written directly against the Nhost SDK. However:

- Unit tests would require a live Nhost instance or complex SDK mocking.
- A future migration to a different backend would require touching every service.

Options considered:

- **Use Nhost SDK directly** — simplest, but couples everything to Nhost.
- **ORM** (Prisma, TypeORM) — schema-driven, good type safety, but brings schema management overhead and its own migration tooling that may conflict with Nhost's.
- **Abstract class** — define the data operations the application needs, implement once for Nhost, implement separately for tests.

## Decision

`src/db/db.ts` defines an abstract `DB` class with the full set of operations the application uses:

- Generic CRUD: `get<K>`, `update<K>`, `post`, `delete<K>`, `deleteById`
- Specialized mutations delegated to Nhost serverless functions: `replaceTeammate`, `replaceTeammateNoAuth`, `changeTeamName`
- Utility: `customQuery`, `downloadFileById`, `downloadFileByName`
- Concrete helpers with shared logic: `createNewScrim`, `insertPlayers`, `addScrimSignup`, etc.

The `get` method uses a `FieldSelection[] → ExtractReturnType<K>` type pattern: the shape of the returned objects is inferred from the array of field names passed in at the call site, giving type-safe query results without an ORM or code generation.

`src/db/nhost.db.ts` is the sole production implementation. `test/mocks/db.mock.ts` extends `DB` for tests, replacing abstract methods with configurable mock responses.

## Consequences

- Swapping the database backend means writing a new `DB` subclass and changing one import in `src/db/nhost.db.ts` — no service or command code changes.
- Tests use `DbMock` directly and control responses via public properties (`mockDb.postResponse = [...]`), with no SDK mocking required.
- The `FieldSelection`/`ExtractReturnType` type system provides accurate return types for `get` queries without a code generation step, but it is a non-trivial custom type that requires understanding to extend.
- Specialized mutations (`replaceTeammate`, `changeTeamName`) are abstract rather than built on generic `update` because they are implemented as Nhost serverless functions with authorization logic inside the DB layer — they cannot be expressed as simple field-update queries.

## Known Limitation

The single `DB` class is becoming unwieldy. It currently covers generic CRUD, domain-specific helpers (`createNewScrim`, `insertPlayers`, `addScrimSignup`), Nhost serverless function wrappers, and file operations — unrelated concerns mixed into one growing surface. `DbMock` grows alongside it, and every new domain operation adds another method to both.

A future refactor should consider breaking `DB` into composable, domain-scoped interfaces (e.g. `ScrimDb`, `PlayerDb`, `LeagueDb`) that can be individually implemented and mocked. Services would then depend only on the slice they actually use, making the dependency graph clearer and mocks smaller. The generic CRUD methods could become a shared utility that the domain-specific implementations delegate to internally, rather than being exposed directly to services.
