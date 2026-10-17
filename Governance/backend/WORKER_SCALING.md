# Backend Background-Worker Scaling Policy

This document defines how backend background workers scale and how they handle
backpressure. It is binding for all backend services that process work outside of a
request/response cycle (queue consumers, scheduled jobs, and event handlers).

## Scope

This policy applies to every backend service that runs background workers,
regardless of language or deployment target. Foreground request handling is out of
scope and is governed by the application service's own runbooks.

## How workers scale

Workers scale horizontally by adding consumer instances. The following rules apply:

1. **Queue-driven scaling.** The number of worker instances is derived from the
   queue depth and age, not from the number of incoming HTTP requests. Each queue
   declares a target depth per worker and a maximum instance count.

2. **Scale-up is fast, scale-down is slow.** Scale-up reacts within one scaling
    interval (default 60 seconds). Scale-down requires a sustained period of low
    utilisation (default 10 minutes) to avoid flapshing.

3. **Hard ceilings.** Every queue defines a maximum instance count. The ceiling is
    set in configuration and reviewed as part of capacity planning. Workers must not
    scale beyond the ceiling without an approved change.

4. **Per-tenant fairness.** Where a queue serves multiple tenants, workers must
   apply fair scheduling so a single tenant cannot monopolise the consumer pool.

5. **Scheduled jobs.** Scheduled jobs run on a single leader per job definition.
   Leader election is implemented with a lease key and must be released on
   shutdown. A job must never run concurrently on more than one instance.

6. **Concurrency per instance.** Each worker instance processes a bounded number of
   jobs concurrently. The default is 10 and it must be configurable per queue.

## Backpressure

Backpressure protects the system when work arrives faster than it can be processed.

Workers must implement the following mechanisms:

1. **Queue depth limits.** Every queue has a maximum depth. When the limit is
   reached, producers must receive a retryable error and the event must be
   rejected rather than silently dropped.

2. **Consumer prefetch.** Consumers must set a prefetch limit so a single
   instance cannot buffer an unbounded number of messages in memory.

3. **Backoff and retry.** Failed or rejected work is retried with exponential
   backoff and jitter. The retry policy is defined per queue and must have a
   maximum attempt count.

4. **Dead-letter queues.** Work that exhausts its retries must be routed to a
   dead-letter queue. DL queues are monitored and any non-empty DL queue is an
   actionable alert.

5. **Shed load at the edge.** When a queue is saturated, the system must shed
   load at the edge (return 429 or 503 to callers) rather than accumulating a
   backlog in worker memory.

6. **Graceful degradation.** Workers must degrade gracefully: slow down or pause
   consumption rather than crashing, and must report health metrics to the
   observability stack.

## Observability

Every worker pool must expose at least the following metrics:

- Queue depth and oldest message age.
- Instance count and concurrency per instance.
- Job success, failure, and retry counts.
- Dead-letter queue depth.

Alerts must fire when queue depth or oldest message age exceeds the configured
threshold for the queue.

## Ownership

- Policy owner: the backend maintainer responsible for background processing.
- Reviewers: at least one backend maintainer and one member of the TSC.
- Approval for changes to this document follows the required-approvals policy
  in `Governance/APPROVALL.md`.

## Review and update cadence

- This document is reviewed at least once every six months.
- An out-of-cadence review is triggered by any of the following:
  - a significant change to the queue infrastructure,
  - an incident caused by worker saturation or backpressure failure,
  - a change in the scaling ceilings or concurrency defaults.
- Each review must record the review date and the reviewer in the pull request
  that updates this document.

## Change log

- {{DATE}}: Initial version of the background-worker scaling policy.
