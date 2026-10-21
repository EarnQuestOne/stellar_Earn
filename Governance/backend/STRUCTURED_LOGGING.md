# Backend Structured-Logging Standards

This document defines the required structured-logging schema, correlation fields, and JSON format for all StellarEarn backend services. It ensures logs are machine-parseable, correlatable across services, and safe to query at scale.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active
- **Related:** [LOG_RETENTION.md](LOG_RETENTION.md), [LOG_REDACTION.md](LOG_REDACTION.md), [AUDIT_LOGGING.md](AUDIT_LOGGING.md), [REQUEST_TRACING.md](REQUEST_TRACING.md)

## Required log schema

Every log entry emitted by a backend service must be a single JSON object containing the following fields at the top level:

| Field            | Type                | Required | Description                                                                                |
| ---------------- | ------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `timestamp`      | ISO-8601 UTC string | Yes      | Event time, always UTC with `Z` suffix, e.g. `2026-01-15T09:30:00.123Z`                    |
| `level`          | string              | Yes      | One of `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`                                     |
| `service`        | string              | Yes      | Service name that emitted the log, e.g. `api`, `worker`, `scheduler`                       |
| `message`        | string              | Yes      | Human-readable log message                                                                 |
| `request_id`     | string              | No       | Correlation ID for the inbound request this log belongs to                                 |
| `trace_id`       | string              | No       | Distributed tracing ID spanning service boundaries                                         |
| `span_id`        | string              | No       | Span ID within a distributed trace                                                         |
| `user_id`        | string              | No       | Identifier of the acting user (never PII)                                                  |
| `actor_id`       | string              | No       | Identifier of the authenticated actor making the call                                      |
| `correlation_id` | string              | No       | Business correlation ID (quest id, payout id, reward id, etc.)                             |
| `context`        | object              | No       | Additional structured key/value context, redacted per [LOG_REDACTION.md](LOG_REDACTION.md) |
| `error`          | object              | No       | Error details when `level` is `ERROR` or `CRITICAL` (type, message, stack)                 |

Example log entry:

```json
{
  "timestamp": "2026-01-15T09:30:00.123Z",
  "level": "INFO",
  "service": "api",
  "message": "Quest submission recorded",
  "request_id": "req_7f3a9c1e",
  "trace_id": "trace_4b2d8e7f",
  "span_id": "span_9c1a2b3d",
  "user_id": "u_12345",
  "correlation_id": "quest_8821",
  "context": { "submission_id": "sub_9012", "status": "approved" }
}
```

## Correlation fields

Correlation fields let operators trace a single user action across services, workers, and retries:

- `request_id`: generated at the API gateway or ingress for each inbound HTTP request, propagated to all downstream calls, and present on every log line produced while handling that request.
- `trace_id` / `span_id`: follow the distributed tracing context (W3C traceparent where applicable) so logs can be joined to traces.
- `correlation_id`: a business-domain identifier (quest, payout, reward, submission) used to group related log lines that may span multiple requests or services.

Services must not invent alternate correlation field names. If a caller supplies a correlation header, it must be honored and forwarded rather than replaced.

## Log format and transport

- Logs are emitted as one JSON object per line (JSON lines / NDJSON).
- No free-form unstructured log lines outside of `message`.
- Timestamps are always UTC; local time is not logged.
- Logs are written to `stdout`/`stderr` and collected by the platform logging agent; services must not write log files directly.
- Sensitive fields are redacted before serialization per [LOG_REDACTION.md](LOG_REDACTION.md).
- Log identifiers (`user_id`, `actor_id`, `request_id`) are logged instead of personal data or raw credentials.

## Implementation requirements

- Configure a single structured logger per service; ad-hoc `console.log`/`print` calls are prohibited in production code paths.
- Middleware must inject `request_id`, `trace_id`, and `span_id` into the logging context for every request.
- Error logs at `ERROR` or `CRITICAL` must include the `error` object with enough context to diagnose without re-emitting sensitive data.
- Services must validate that the logger is initialized at startup and fail fast if structured logging is unavailable.
- Context passed to `context` must follow the allowlist-based logging approach from [LOG_REDACTION.md](LOG_REDACTION.md): only explicitly allowed fields may be logged.

## Testing

- Unit tests assert that log entries conform to the required schema (required fields present, valid level, UTC timestamp).
- Integration tests verify that `request_id`, `trace_id`, and `span_id` are propagated across service boundaries.
- Regression tests confirm that no unstructured or plain-text log lines are emitted in production code paths.
- Redaction tests verify sensitive fields never appear in log output.

## Ownership and review

Owned by the backend maintainers. Reviewed every six months, and sooner when:

- A new backend service or logging framework is adopted.
- The tracing or correlation model changes.
- A security audit or incident reveals gaps in schema coverage or correlation.
- New required fields are needed for observability or compliance.

## Amendments

Changes follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
