# webhooks-outbound

Outbound **event-subscription webhooks**: the platform pushes its own domain
events to third-party consumers over signed HTTP callbacks. This is entirely
distinct from the inbound `webhooks` module (which receives webhooks *from*
external providers like GitHub).

## How it works

1. An ADMIN creates a subscription (`POST /webhooks-outbound/subscriptions`)
   selecting an event type (e.g. `quest.created`) and a target URL. A signing
   secret is generated (or supplied) and stored AES-256-GCM encrypted.
2. When the platform emits a matching domain event, `WebhookDispatcherService`
   persists a `WebhookDelivery` row per active subscription and enqueues one
   BullMQ job on the `webhooks_outbound` queue.
3. `WebhookDeliveryProcessor` POSTs the canonical payload with these headers:

   | Header | Value |
   | --- | --- |
   | `Content-Type` | `application/json` |
   | `X-Webhook-Event` | event type, e.g. `quest.created` |
   | `X-Webhook-Delivery-Id` | delivery UUID (dedupe key) |
   | `X-Webhook-Timestamp` | ISO-8601 timestamp |
   | `X-Webhook-Signature` | `sha256=<HMAC-SHA256("timestamp.body")>` |

   Consumers verify the signature and reject deliveries whose timestamp is
   outside their skew window (replay guard).
4. Non-2xx responses and network errors retry with exponential backoff + jitter
   (BullMQ), and are dead-lettered after the max attempts. Paused or deleted
   subscriptions short-circuit pending deliveries.

## Supported event types

`quest.created`, `quest.completed`, `quest.updated`, `quest.deleted`,
`submission.received`, `submission.approved`, `submission.rejected`,
`payout.processed`, `payout.failed`.

## Configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `WEBHOOK_SECRET_ENCRYPTION_KEY` | — (required) | 64-char hex (32-byte) master key for AES-256-GCM secret encryption |
| `WEBHOOK_OUTBOUND_MAX_ATTEMPTS` | `5` | Max delivery attempts before dead-lettering |
| `WEBHOOK_OUTBOUND_INITIAL_BACKOFF_MS` | `1000` | Base exponential backoff delay for retries |
| `WEBHOOK_OUTBOUND_JITTER_MS` | `500` | Max jitter added to each backoff delay |

## Metrics

Emitted via the shared `MetricsService` (Prometheus):

- `outbound_webhook_deliveries_total{eventType,status}` — success/failure/dead-letter outcomes
- `outbound_webhook_delivery_latency_ms` — delivery latency histogram
- `outbound_webhook_retries_total{eventType}` — retry counts
- `outbound_webhook_dead_lettered_total{eventType}` — dead-letter counts
- `outbound_webhook_enqueued_total{eventType}` — enqueued jobs

## API

All endpoints require a JWT with the `ADMIN` role:

- `POST /webhooks-outbound/subscriptions` — create
- `GET /webhooks-outbound/subscriptions` — list
- `GET /webhooks-outbound/subscriptions/:id` — get
- `GET /webhooks-outbound/subscriptions/:id/deliveries` — delivery history
- `POST /webhooks-outbound/subscriptions/:id/test` — send a test delivery
- `PUT /webhooks-outbound/subscriptions/:id` — update / rotate secret / pause
- `DELETE /webhooks-outbound/subscriptions/:id` — delete (cancels pending)
