# ADR-001: Environment Variable Validation Strategy (Build-time vs Runtime)

- **Status:** Accepted
- **Date:** 2026-06-01
- **Ticket:** FE-063

## Context

The StellarEarn frontend is a Next.js application that consumes environment variables in two distinct contexts:

1. **`NEXT_PUBLIC_*` variables** — inlined by the Next.js compiler at build time into the client bundle. Dynamic access via `process.env[name]` returns `undefined` in the browser; only static references (e.g. `process.env.NEXT_PUBLIC_API_BASE_URL`) are replaced.
2. **Server-only variables** (e.g. `E2E_BASE_URL`) — available at runtime on the Node.js server but never sent to the browser.

Without a clear strategy, missing variables surface as silent `undefined` values deep in the call stack, making failures hard to diagnose in CI and production.

## Decision

**Validate environment variables at server startup (runtime), not at build time.**

Specifically:

- `validateEnv()` in `lib/config/env.ts` checks all required and optional variables and returns a structured result (errors + warnings).
- `validateStartup()` in `lib/config/startup.ts` calls `validateEnvOrThrow()` **only on the server** (`typeof window === 'undefined'`), so it runs during Next.js server initialisation (via `instrumentation.ts`) but is a no-op in the browser.
- In **production**, a missing required variable throws and prevents the server from starting.
- In **development**, the error is logged but the dev server continues, to avoid blocking local iteration when `.env.local` is incomplete.
- `NEXT_PUBLIC_*` variables are accessed through a static `switch` in `readEnvValue()` so the Next.js compiler can inline them correctly.

## Considered Alternatives

### Option A: Build-time validation (e.g. `next.config.ts` or a custom webpack plugin)

Pros:

- Catches missing variables before any code ships.
- Fails the CI build immediately.

Cons:

- `NEXT_PUBLIC_*` values are often environment-specific (testnet vs mainnet) and are not known at the time the Docker image or static bundle is built in a multi-environment pipeline.
- Breaks the common pattern of building once and deploying to multiple environments by injecting vars at container start.
- Does not cover server-only variables that are injected at runtime by the orchestrator (Kubernetes, ECS, etc.).

### Option B: Runtime validation in every consumer (ad-hoc `getRequiredEnv` calls)

Pros:

- No central dependency.

Cons:

- Errors surface lazily, only when the specific code path is hit.
- No single place to audit which variables are required.
- Duplicate validation logic scattered across the codebase.

### Option C (chosen): Centralised server-startup runtime validation

Pros:

- Fails fast on server start — the process exits before serving any traffic if a required variable is absent in production.
- Compatible with build-once / deploy-many pipelines.
- Single source of truth (`REQUIRED_ENV_VARS` / `OPTIONAL_ENV_VARS` maps in `env.ts`) for documentation and validation.
- Works correctly with Next.js static inlining of `NEXT_PUBLIC_*` vars.
- Provides structured errors with descriptions and examples, making misconfiguration easy to diagnose.

Cons:

- Does not catch missing variables at build time; a broken deployment is only detected when the container starts.
- Mitigation: CI runs `npm test` which exercises `validateEnv()` with controlled env values, and the `.env.example` file documents all required variables.

## Consequences

- `lib/config/env.ts` is the **single source of truth** for all environment variable definitions, defaults, and validation logic.
- `lib/config/startup.ts` must be called from `instrumentation.ts` (Next.js instrumentation hook) to ensure validation runs before the first request is served.
- New environment variables **must** be added to `REQUIRED_ENV_VARS` or `OPTIONAL_ENV_VARS` in `env.ts`, and to `.env.example`.
- The `readEnvValue()` switch statement must be updated for each new `NEXT_PUBLIC_*` variable so the Next.js compiler can inline it.
- Tests in `lib/config/__tests__/env.test.ts` cover the validation logic and must be kept up to date.

## References

- `FrontEnd/my-app/lib/config/env.ts` — validation implementation
- `FrontEnd/my-app/lib/config/startup.ts` — server startup hook
- `FrontEnd/my-app/instrumentation.ts` — Next.js instrumentation entry point
- `FrontEnd/my-app/.env.example` — canonical list of required/optional variables
- [Next.js Environment Variables docs](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
