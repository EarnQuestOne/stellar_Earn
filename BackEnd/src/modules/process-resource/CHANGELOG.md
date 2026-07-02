# process-resource module changelog

All notable changes to the `process-resource` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- `ProcessResourceModule` — NestJS module exposing real-time process resource monitoring and profiling endpoints
- `ResourceLimitsService` — configurable heap/RSS thresholds with periodic violation monitoring, manual GC trigger, and structured `ResourceSnapshot` responses
- `ProfilingService` — V8 heap snapshot capture (`v8.writeHeapSnapshot`), heap statistics, heap space breakdown, and session history
- `ProcessResourceController` — REST endpoints under `/process`:
  - `GET /v1/process/resources` — current memory, CPU delta, uptime, configured limits, and active violations
  - `POST /v1/process/gc` — trigger manual garbage collection (requires `--expose-gc`)
  - `GET /v1/process/heap/stats` — raw V8 heap statistics
  - `GET /v1/process/heap/spaces` — per-space V8 heap breakdown
  - `POST /v1/process/heap/snapshot` — write a `.heapsnapshot` file to `PROFILING_DIR`
  - `GET /v1/process/profiling/sessions` — list heap snapshot sessions taken this process lifetime
- Environment variables: `RESOURCE_MAX_HEAP_MB`, `RESOURCE_MAX_RSS_MB`, `RESOURCE_HEAP_WARN_PERCENT`, `RESOURCE_HEAP_CRITICAL_PERCENT`, `RESOURCE_EXIT_ON_HEAP_CRITICAL`, `RESOURCE_MONITOR_INTERVAL_MS`, `PROFILING_ENABLED`, `PROFILING_DIR`, `PROFILING_MAX_DURATION_MS`
