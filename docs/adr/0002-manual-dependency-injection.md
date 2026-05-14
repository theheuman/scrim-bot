# ADR-0002: Manual Dependency Injection over a DI Framework

**Status:** Accepted  
**Date:** 2026-05-14

## Context

Services depend on each other and on external resources (the database, the Discord client). They need to be wired together at startup and shared as singletons across the application. Several approaches exist:

- **DI framework** (tsyringe, inversify, NestJS): decorators or container configuration auto-resolve and inject dependencies.
- **Factory functions**: each service is instantiated by a factory that receives its dependencies.
- **Manual wiring**: a single module instantiates every service in dependency order and exports the singletons.

## Decision

Manual wiring in `src/services/index.ts`. Services are instantiated in dependency order — leaf services first, aggregators last — and exported as named constants:

```typescript
export const overstatService = new OverstatService(nhostDb);
export const alertService = new AlertService(client, staticValueService);
export const scrimService = new ScrimService(nhostDb, overstatService, huggingFaceService, alertService);
// ...
```

No DI framework, no decorators, no container registration.

## Consequences

- The full dependency graph is visible in one file and readable top-to-bottom. Adding or removing a dependency means editing that file directly — no metadata scanning or decorator magic to reason about.
- Dependency order errors are caught at startup (a service used before it is instantiated throws immediately) rather than silently producing undefined at runtime.
- No framework to learn, configure, or keep up to date.
- Circular dependencies are not detected at build time — they manifest as runtime errors. This is acceptable given the current scale; if the service graph grows complex enough to make cycles a real risk, this decision should be revisited.
- All services are singletons by construction. There is no per-request or scoped lifetime, which matches the bot's stateless command model.
