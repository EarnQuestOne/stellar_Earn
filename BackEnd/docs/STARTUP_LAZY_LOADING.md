# Startup lazy-loading for heavy optional modules

Tracks issue #2028. Goal: cut cold-start time and memory by not loading heavy,
optional code at boot when it is not configured.

## Investigation: NestJS feature modules

The original `AppModule` eagerly imports ~25 feature modules. Most of them are
NOT safe to convert to `LazyModuleLoader` because Nest wires HTTP routes and
providers at boot:

- Modules that register controllers must be present at boot, otherwise their
  routes are never mounted. This rules out Admin, Analytics, Auth, Email,
  FeatureFlags, Health, Jobs, Moderation, Notifications, Payouts, Postmortems,
  QueryMonitoring, Quests, Submissions, Trace, Users, Webhooks and
  ProcessResource (all have `@Controller`s).
- The three modules with no controller (Quota, Stellar, Websocket) are still not
  leaf candidates: Quota and Stellar export services that are injected into
  eagerly loaded modules (Payouts/Quests and Jobs/Submissions), and Websocket
  registers a gateway that must bind at boot to accept socket connections.

So there is no feature module that can be moved behind `LazyModuleLoader` without
breaking routing, DI, or the WebSocket gateway. Converting one anyway would be a
functional regression, which the issue forbids.

## Change made: defer the heavy optional Sentry SDK

The measurable win is at the boot integration layer. `@sentry/node` (v9) pulls in
`@sentry/core`, `@sentry/opentelemetry` and a large set of `@opentelemetry/*`
packages. It was imported at the top level of two files that `main.ts` loads
during boot:

- `src/config/sentry.config.ts`
- `src/common/filters/sentry-exception.filter.ts`

Because of those top-level imports the whole SDK graph was `require()`d on every
boot even when Sentry was disabled (`SENTRY_DSN` unset), which is the default in
dev, in tests, and in many deployments.

The SDK is now loaded lazily, only when Sentry is actually configured:

- `initSentry()` (called once at boot) returns early when `SENTRY_DSN` is unset
  and only then `require()`s `@sentry/node` and calls `Sentry.init(...)`.
- A new `getSentry()` accessor returns the initialized client, or `null` when
  Sentry is disabled.
- `SentryExceptionFilter` uses `getSentry()` instead of a static import. When
  Sentry is disabled it skips capture entirely (previously it called
  `captureException` as a silent no-op against an SDK that was loaded for
  nothing).

Behavior is unchanged from the outside: with `SENTRY_DSN` set, the SDK loads and
5xx / unexpected errors are captured exactly as before; with it unset, nothing is
reported either way.

## Benchmark

Reproducible script: `scripts/bench-sentry-lazy-load.js`. It measures the
`require('@sentry/node')` cost in isolated child processes, which is exactly the
boot work removed in the common disabled case (the lazy path does zero work).

```
node scripts/bench-sentry-lazy-load.js
```

Results on this machine (7 runs, Node 22):

| Metric                     | BEFORE (eager at boot) | AFTER (disabled, lazy) | Removed from boot |
| -------------------------- | ---------------------- | ---------------------- | ----------------- |
| require time (median)      | ~1.4 - 2.2 s           | ~0.0 ms                | ~1.4 - 2.2 s      |
| require time (min)         | ~0.8 - 1.3 s           | ~0.0 ms                | ~0.8 - 1.3 s      |
| heapUsed delta             | ~27 MB                 | ~0 MB                  | ~27 MB            |
| rss delta                  | ~69 MB                 | ~0 MB                  | ~69 MB            |

Load time varies with disk / OS file cache; the memory figures are stable across
runs. When Sentry is disabled the boot no longer allocates ~27 MB of heap /
~69 MB RSS and no longer pays the SDK require cost. When Sentry is enabled the
same cost is paid once, lazily, at `initSentry()` instead of unconditionally.

## Tests

- `src/config/__tests__/sentry.config.spec.ts` - Sentry is not loaded when
  `SENTRY_DSN` is unset (`getSentry()` is null and `Sentry.init` is never
  called), and is lazily loaded + initialized with the DSN when it is set.
- `src/common/filters/__tests__/sentry-exception.filter.spec.ts` - the filter
  re-throws without touching Sentry when disabled, captures 5xx / unexpected
  errors when enabled, and does not capture expected 4xx errors.

Run: `npx jest src/config/__tests__/sentry.config.spec.ts src/common/filters/__tests__/sentry-exception.filter.spec.ts`
