# ADR-0010: Custom GraphQL Query Builder over a GraphQL Library

**Status:** Accepted — migration to a library remains an open option  
**Date:** 2026-05-14

## Context

Nhost exposes data via a GraphQL API. The bot needs to query and mutate that data from TypeScript. Several approaches exist:

- **GraphQL client library** (`graphql-request`, Apollo Client) — handles transport and serialization; queries are still written as raw strings.
- **Code generation** (`@graphql-codegen`, Hasura's typed client) — generates TypeScript types directly from the GraphQL schema, eliminating manual type maintenance.
- **Custom query builder** — build the GraphQL query strings in TypeScript from structured inputs, hand-roll the type system.

The decision was made to build a fully custom solution in order to learn how GraphQL works at the protocol level before abstracting it away behind a library. Understanding the wire format, the query/mutation structure, the `where` clause syntax, and how Hasura's conventions (`_eq`, `_or`, `insert_*`, `update_*`, `delete_*`, `returning`) map to operations was the primary goal.

## What Was Built

### Type-safe WHERE clauses (`src/db/types.ts`)

```typescript
type Comparator = "eq" | "gte" | "lte" | "gt" | "lt";
type Operator   = "and" | "or";

type Expression = { fieldName: string; comparator: Comparator; value: DbValue };
type CompoundExpression = { operator: Operator; expressions: (Expression | CompoundExpression)[] };
type LogicalExpression  = CompoundExpression | Expression;
```

`LogicalExpression` is a recursive union that can represent arbitrarily nested AND/OR conditions. `generateWhereClause` and `getCompoundExpressionString` in `NhostDb` walk this tree and emit the Hasura `where:` syntax. `createValueString` handles quoting strings, serializing dates to ISO format, and recursively formatting JSON values.

### Type-safe return type inference (`src/db/types.ts`)

```typescript
type FieldSelection = string | { [key: string]: FieldSelection[] };

type ExtractReturnType<T extends FieldSelection[]> = {
  [K in T[number] as K extends string ? K : keyof K]:
    K extends string                       ? DbValue
    : K extends Record<string, FieldSelection[]> ? ExtractReturnType<K[keyof K]>
    : never;
};
```

The `get<K extends FieldSelection[]>` method infers the shape of returned objects from the field names passed at the call site — no code generation required. Nested relations (e.g. `{ player: ["discord_id", "display_name"] }`) are supported recursively. `getReturnString` walks the same `FieldSelection[]` to emit the GraphQL field list in the query body.

### Raw query escape hatch

For complex mutations that cannot be expressed through the generic builder — `replaceTeammate` (a multi-update across three player slots with authorization logic in the WHERE clause) and `changeTeamName` — the code falls back to hand-written query strings passed through `customQuery`. These bypass the typed builder entirely and cast the result manually.

## Consequences

- The query-building code is fully understood and under direct control. Debugging a bad query means reading the generated string, which is straightforward.
- `ExtractReturnType` provides accurate return types for `get` queries at the call site without a build step or schema sync. Adding a new field to a query automatically updates the return type.
- There is no schema validation at compile time. Typos in table names, field names, or comparator strings only fail at runtime when Nhost rejects the query.
- The complex mutations that bypass the builder (`replaceTeammate`, `changeTeamName`) have no type safety on their return values — they cast via `as unknown as`. These are the most fragile parts of the DB layer.
- **Known open issue — strings are not correctly escaped.** `createValueString` interpolates values directly into query strings via template literals without sanitizing special characters. A value containing a quote, backslash, or GraphQL metacharacter can corrupt the query or, if user-supplied input ever reaches this path, enable GraphQL injection. This is a known bug tracked in the GitHub issue tracker. All callers currently pass application-controlled values (UUIDs, ISO dates, enum strings), which limits the immediate exposure, but the fix — escaping or parameterizing values before interpolation — is outstanding work.

## Migration Path

Migrating to a library remains an open option now that the underlying mechanics are well understood. The most likely candidate would be a code-generation approach (`@graphql-codegen` pointed at the Nhost schema) which would replace the hand-rolled `ExtractReturnType` with generated types and eliminate the runtime-only validation of field names. The abstract `DB` class (ADR-0007) means such a migration only touches `NhostDb` — no services or commands would change.
