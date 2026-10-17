# Backend Logging and Log-Retention Policy

This policy defines logging standards for backend services, including log levels, retention windows, and what must never be logged. It ensures logs are useful for debugging and compliance while protecting sensitive data.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Log levels

- **DEBUG:** Detailed diagnostic information for development. Disabled in production.
- **INFO:** General informational messages about normal operation.
- **WARNING:** Potentially harmful situations or minor issues that do not stop execution.
- **ERROR:** Error events that might still allow the application to continue running.
- **CRITICAL:** Severe error events that will likely lead to application failure.

## What must be logged

All production logs must include:
- Timestamp (UTC)
- Log level
- Service name
- Request ID (for request-scoped logs)
- Contextual message

Additionally:
- INFO: Startup/shutdown events, configuration changes, and significant state transitions.
- WARNING: Retry attempts, degraded service, or unusual but handled conditions.
- ERROR: Failed operations with sufficient context to diagnose the root cause.
- CRITICAL: Service-wide failures or conditions that require immediate intervention.

## What must never be logged

- Passwords, API keys, tokens, private keys, secrets, and certificates.
- Full personal data (names, emails, phone numbers, addresses).
- Payment card data (PAN, CVV, expiration).
- Wallet private keys or seed phrases.
- Session identifiers or authentication tokens.
- Any data that could be used to impersonate a user or access their account.

Log identifiers (user IDs, request IDs) instead of personal data. Use hash values or redaction for sensitive fields that must be referenced.

## Retention windows

- **DEBUG logs:** Not retained in production (development only).
- **INFO logs:** Retained for 30 days.
- **WARNING logs:** Retained for 90 days.
- **ERROR logs:** Retained for 180 days.
- **CRITICAL logs:** Retained for 365 days.

Logs older than their retention window are automatically deleted. Audit logs follow the retention policy in [AUDIT_LOGGING.md](AUDIT_LOGGING.md).

## Log storage and access

- Logs are stored in a centralized logging system with access controls.
- Production logs are read-only for backend maintainers and security team.
- Log queries and exports are logged for audit purposes.
- Logs are encrypted at rest and in transit.

## Ownership and review

Owned by the backend maintainers. Reviewed every six months or when:
- New log levels or retention requirements are introduced.
- Regulatory requirements change.
- Security incidents reveal gaps in logging coverage.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
