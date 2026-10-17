# Backend Background-Worker Scaling Policy

This document defines how backend background workers scale, how backpressure is handled, and who owns this policy and how it is reviewed.

## Scope

Applies to all backend background workers in this repository, including but not limited to job processors, queue consumers, scheduled tasks, and outbound-webhook delivery workers.

## Scaling Model

Workers scale horizontally. Each worker instance is stateless and pulls work from a shared queue.

- **Scaling signal:** queue depth (and oldest-message age) is the primary signal for scaling out. CPU utilization is a secondary signal for scaling in.
- **Minimum replicas:** every worker pool must run at least two replicas in production to survive single-instance failures.
- **Maximum replicas:** must be explicitly configured per pool and documented in the service configuration; unbounded scaling is not allowed.
- **Scale-out step:** add replicas in increments of one up to the configured maximum, with a cooldown period to prevent flapshing.
- **Scale-in step:** remove replicas one at a time only after sustained low utilization, and never below the minimum replica count.
- **Idempotency:** workers must tolerate at-least-once delivery. Handlers must be idempotent or deduplicate on a stable job key.

## Backpressure

Backpressure protects workers and downstream dependencies when demand exceeds capacity.

- **Bounded concurrency:** each worker limits the number of jobs it processes concurrently. The limit is configurable and must be set below the capacity of downstream dependencies.
- **Prefetch limits:** workers must not buffer more messages than they can process; prefetch is capped and aligned with concurrency.
- **Queue depth as a signal:** sustained growth in queue depth or message age triggers scaling out and an alert; it is not silently absorbed.
- **Retry with backoff:** failed jobs are retried with exponential backoff and jitter, up to a configured attempt ceiling.
- **Dead-letter queue:** jobs that exhaust retries are routed to a dead-letter queue for inspection and replay; they are not dropped silently.
- **Fair sharing:** where multiple tenants or job classes share a queue, work shall be distributed so that a single tenant cannot starve others.
- **Shedding:** when the system is saturated, low-priority work may be deferred in favour of high-priority work, but no work is silently discarded.

## Ownership

This document is owned by the backend maintainers listed in [../MAINTAINERS.md](../MAINTAINERS.md) with a backend area of responsibility. The owner is responsible for keeping this policy accurate and for approving changes to it.

## Review and Update Cadence

- This document is reviewed at least once every six months.
- It is also updated whenever the worker scaling or backpressure behaviour changes.
- Changes are proposed through a pull request that is limited to the `Governance/` folder and requires approval from a backend maintainer.
- Substantive changes follow the process in [../AMENDMENTS.md](../AMENDMENTS.md).
