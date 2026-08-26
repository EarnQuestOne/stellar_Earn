# webhooks-outbound module changelog

All notable changes to the `webhooks-outbound` backend module are documented
here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this module
adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Outbound event-subscription webhook system (issue #2306): third-party
  consumers can subscribe to platform domain events (`quest.created`,
  `quest.completed`, `quest.updated`, `quest.deleted`, `submission.received`,
  `submission.approved`, `submission.rejected`, `payout.processed`,
  `payout.failed`) and receive HMAC-signed HTTP callbacks.
- `WebhookSubscription` / `WebhookDelivery` entities and the
  `1850000000000-add-outbound-webhooks` migration.
- `SubscriptionsController` (ADMIN-role guarded) with CRUD, secret rotation,
  and test-event endpoints; signing secrets are stored AES-256-GCM encrypted
  and never returned by read endpoints.
- `WebhookDispatcherService` listens on the domain event bus, matches active
  subscriptions, persists pending deliveries, and enqueues one BullMQ job per
  delivery on the `webhooks_outbound` queue.
- `WebhookDeliveryProcessor` performs the signed HTTP POST (with a
  timestamp-replay-guard header), retries with exponential backoff + jitter,
  dead-letters after the configured max attempts, and short-circuits pending
  deliveries for paused/deleted subscriptions.
- Delivery observability via the shared metrics service: success/failure
  counts, latency histogram, retry counts, and dead-letter counts.
- Unit tests covering signing, secret encryption, subscription CRUD, dispatch
  matching, and processor retry/dead-letter behavior.
