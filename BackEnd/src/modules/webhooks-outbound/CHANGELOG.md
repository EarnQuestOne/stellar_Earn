# webhooks-outbound module changelog

All notable changes to the `webhooks-outbound` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Initial outbound event-subscription webhook system (#2306), distinct from the
  inbound `webhooks` module:
  - `WebhookSubscription` and `WebhookDelivery` entities plus a migration.
  - `SubscriptionsController` / `SubscriptionsService`: admin-guarded CRUD for
    subscriptions (event-type selection, target URL, per-subscription signing
    secret stored AES-256-GCM encrypted, active/paused state, secret rotation,
    and a signed test-event endpoint).
  - `WebhookDispatcherService`: subscribes to domain events (`quest.created`,
    `submission.approved`, `payout.completed`), matches active subscriptions,
    persists one delivery per match, and dispatches them.
  - `WebhookDeliveryProcessor`: HTTP POST over a keep-alive agent with a hard
    timeout, HMAC-SHA256 signature over `"{timestamp}.{body}"` (with a
    replay-guarding timestamp header), exponential backoff + jitter retries up
    to a configurable max, and dead-lettering on exhaustion. Paused/deleted
    subscriptions short-circuit pending deliveries.
  - Delivery success / failure / retry / dead-letter counters and a latency
    histogram emitted through the shared `MetricsService`.
