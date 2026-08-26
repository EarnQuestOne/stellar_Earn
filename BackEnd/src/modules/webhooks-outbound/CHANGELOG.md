# webhooks-outbound module changelog

All notable changes to the `webhooks-outbound` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Outbound event-subscription webhook delivery system (#2306): third parties register subscriptions (event-type selection, target URL, per-subscription signing secret stored aes-256-gcm-encrypted, active/paused state, secret rotation) and the platform delivers signed HTTP callbacks — `POST /webhooks/outbound/subscriptions` (admin-guarded CRUD + `POST :id/rotate-secret` + `POST :id/test`).
- `WebhookDispatcherService` listens on the global domain event bus (allowlisted public catalog), creates one `WebhookDelivery` row per matching active subscription and enqueues a single-attempt BullMQ job on the `webhooks` queue (deterministic `jobId` per delivery+attempt suppresses duplicates).
- `WebhookDeliveryProcessor` performs the HTTP POST (keep-alive pooled agent, 10 s timeout) with an HMAC-SHA256 signature header `X-StellarEarn-Signature: t=<unix>,v1=<hex>` over `<t>.<rawBody>` (replay-safe timestamp, raw-body hashing); outcomes land in the delivery row.
- Retry orchestration in Postgres: exponential backoff + jitter (5 s base, ×2, hour cap, 5 attempts default) with a dead-lettered terminal state; a paused/deleted subscription short-circuits pending deliveries to `skipped`; `delivering` rows stuck longer than 10 min are crash-recovered to `pending` by the every-minute scheduler.
- Delivery observability via the shared `MetricsService`: delivered / retry-scheduled / dead-lettered / skipped counters and a delivery duration histogram.
- Migration `1850000000000-add-outbound-webhook-tables` creating `webhook_subscriptions` and `webhook_deliveries` (composite `(status, "nextRetryAt")` index keeps the scheduler's claim query cheap).
- New required config: `OUTBOUND_WEBHOOK_ENCRYPTION_KEY` (32 bytes base64) for at-rest signing-secret encryption.
