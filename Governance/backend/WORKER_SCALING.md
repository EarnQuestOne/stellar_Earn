# Backend Background-Worker Scaling Policy

This document defines how the backend's background workers scale,
how backpressure is handled, and who owns this policy and how it is reviewed.

It applies to all backend services that consume work from a queue or scheduler
(for example job runners, outbox dispatchers, webhook delivery workers, and
scheduled reconciliation tasks). It does not cover request-serving API replicas,
which are governed by the service's own deployment and autoscaling configuration.

## Scope

- All background-worker processes operated by the project.
- Queue consumers, scheduled jobs, and outbound delivery workers.
- Scaling signals, limits, and backpressure behaviour for those workers.

Out of scope: request-serving API replicas, database instance sizing, and
third-party managed queue service sizing.

## Scaling Policy

Background workers scale on **queue depth and age of the oldest unacknowledged
message**, not on CPU or memory alone. This keeps worker capacity tied to actual
backlog rather than to host-level resource usage.

### Signals

- Primary: queue depth (number of ready messages).
- Primary: age of the oldest ready message.
- Secondary: worker error rate and retry rate.
- Secondary: processing latency per job type.

### Scaling rules

- Workers scale out when queue depth or oldest-message age exceeds the
  service's configured threshold for a confirmed sustained period.
- Workers scale in gradually when queue depth and message age return to baseleve
  for a confirmed sustained period.
- Every worker pool declares a minimum and maximum replica count. The minimum
  must be at least one so that work is always progressing.
- Scaling decisions must be idempotent and must not depend on the number of
  workers already running to avoid oscillation.
- Scale-in must drain in-flight jobs before a worker exits, up to the configured
  grace period.

### Limits

- Each worker pool declares a maximum replica count that is reviewed as part of
  this document's update cadence.
- Maximum replica counts must respect the downstream dependency's concurrency
  limits (database connections, external API rate limits, and queue provider
  consumer limits).
- Workers must not auto-scale beyond the declared maximum without an approved
  change to this document.

## Backpressure

Backpressure is applied at the queue boundary and inside the worker, never by
silently dropping work.

### Queue-level backpressure

- Producers must have a bounded outbound queue. When the bound is reached,
  producers block or fail fast according to the service's documented behaviour,
  and must not buffer unbounded work in memory.
- Workers prefetch a bounded number of messages. Prefetch must be declared and
  reviewed alongside the replica limits.
- When the queue is saturated, the system must slow producers rather than
  drop messages.

### Worker-level backpressure

- Workers must apply a concurrency limit per replica for jobs that call external
  dependencies.
- Retries use bounded exponential backoff with jitter and a declared maximum
  attempt count. Exhausted jobs go to a dead-letter queue.
- Dead-letter queues must be monitored and automatically alerted on.
- Workers must not retry non-retryable errors; those go directly to the
  dead-letter queue.

## Ownership

- Owner: the backend maintainers (as listed in `Governance/MAINTAINERS.md`).
- Reviewers: the Technical Steering Committee (TSC) for changes to scaling
  limits or backpressure semantics.
- Escalation: disputes follow `Governance/CONFLICT_RESOLUTION.md`.

## Review and Update Cadence

- This document is reviewed at least once per quarter by the backend
  maintainers.
- Any change to scaling thresholds, replica limits, or backpressure
  behaviour must be made through a pull request that updates this document and
  the corresponding service configuration together.
- Emergency changes follow `Governance/HOTFIX_POLICY.md` and must be
  retroactively reconciled with this document within five working days.

## Related Documents

- [Backend Idempotency and Retry Convention](IDEMPOTENCY.md)
- [Backend Webhook Delivery and Signing Policy](WEBHOOK_POLICY.md)
- [Backend Audit Logging for Sensitive Actions](AUDIT_LOGGING.md)
- [Backend Logging and Log-Retention Policy](LOG_RETENTION.md)
- [Hotfix policy](../HOTFIX_POLICY.md)
- [Conflict resolution and escalation path](../CONFLICT_RESOLUTION.md)
