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

### Changed
- Improved error logging formatting in WebhooksService
