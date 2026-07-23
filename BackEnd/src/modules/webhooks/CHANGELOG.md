# webhooks module changelog

All notable changes to the `webhooks` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Persisted `failed_webhook_events` table for webhook processing failures (payload,
  source, failure reason, attempt history).
- Real `retryFailedWebhook` implementation: exponential backoff, configurable max
  attempts, dead-letter state after exhaustion.
- `FailedWebhookRetryScheduler` cron job that automatically retries due failures
  every minute.
- Admin endpoints: `GET /webhooks/admin/failed`, `GET /webhooks/admin/failed/:eventId`,
  `POST /webhooks/admin/failed/:eventId/retry`.

### Fixed

- Generic webhook handler now validates `:service` against an explicit allowlist (`github`, `api`) before processing, rejecting unknown service names with 400. This prevents user-controlled input from probing arbitrary environment variables via the `${SERVICE}_WEBHOOK_SECRET` pattern.
- `handleGenericWebhook` now resolves and validates the webhook secret before entering the trace context. Requests for a known service whose secret env var is missing or empty are rejected with 400 rather than silently bypassing signature verification.
- `WebhooksService.processWebhook` now fails closed when a secret is configured: a missing signature is rejected with `success: false` rather than being treated as an unsigned event that is allowed through.

### Changed

- Improved error logging formatting in WebhooksService
