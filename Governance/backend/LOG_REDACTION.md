# Backend Log-Redaction and Sensitive-Field Policy

This policy defines how backend services must redact sensitive fields before logging. It ensures that logs are useful for debugging while protecting user privacy and security by preventing sensitive data from appearing in log outputs.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Scope

This policy applies to all backend services that emit logs, including:
- API services
- Background workers
- Internal microservices
- Scheduled jobs

All log statements must follow this redaction policy before data is written to any log destination (console, file, centralized logging system).

## Sensitive fields that must be redacted

The following fields must always be redacted in logs. Use placeholder values like `[REDACTED]`, `[MASKED]`, or a truncated hash as appropriate.

### Authentication and authorization
- Passwords and password reset tokens
- API keys and secret keys
- OAuth tokens and refresh tokens
- JWT signatures and secret parts
- Session IDs and session tokens
- Two-factor authentication (2FA) codes and backup codes
- Personal access tokens
- Cookie values (especially authentication cookies)

### Personal data (PII)
- Full names (use user ID or initials)
- Email addresses (use `u***@domain.com` or user ID)
- Phone numbers (use `+***-***-####` or user ID)
- Physical addresses (use address ID or mask)
- Government IDs (SSN, passport, tax ID)
- Date of birth (use age range or omit)
- Biometric data

### Financial data
- Payment card numbers (PAN)
- Card verification values (CVV/CVC)
- Card expiration dates
- Bank account numbers
- Routing numbers
- IBANs
- Transaction amounts in sensitive contexts (use ranges or omit)

### Cryptographic secrets
- Wallet private keys
- Seed phrases and recovery words
- Mnemonic phrases
- Hardware wallet device IDs
- Signing keys
- Encryption keys

### Internal identifiers that could be abused
- Internal request IDs in non-debug contexts
- Database connection strings
- Cache keys that reveal user data
- Service account credentials

## Redaction methods

### Full redaction
Replace the entire value with a placeholder:
```
password: [REDACTED]
api_key: [REDACTED]
```

### Partial masking
Show a prefix or suffix to aid debugging while hiding the sensitive part:
```
email: j***@example.com
phone: +1-***-***-1234
card: ****-****-****-4242
```

### Hash-based truncation
Use a consistent hash to allow correlation without revealing the original:
```
user_email_hash: a1b2c3d4e5f6...
session_id_hash: f6e5d4c3b2a1...
```

### Length-based truncation
For long values where the length itself is not sensitive:
```
payload: (truncated to 200 chars) {...}
```

## Implementation requirements

### Middleware and interceptors
- Configure logging middleware to automatically redact known sensitive fields from request/response bodies.
- Implement field-level redaction in structured logging libraries.
- Use allowlist-based logging for structured objects (only log explicitly allowed fields).

### Manual log statements
- Never log raw request bodies or user input directly.
- Apply redaction functions to all user-provided data before logging.
- When logging errors that include user data, apply redaction to the error context.

### Configuration
- Maintain a allowlist of fields that may be logged (default-deny approach).
- Configure redaction rules in environment-specific configs (stricter in production).
- Validate that redaction rules are loaded at service startup.

### Testing
- Include unit tests that verify sensitive fields are redacted.
- Add integration tests that check log outputs for sensitive data leaks.
- Run automated scans on log samples to detect potential data exposure.

## Exceptions and overrides

### Debug mode
In non-production debug environments, redaction may be relaxed for troubleshooting, but:
- Must be explicitly enabled via environment variable.
- Must never be enabled in production.
- Logs must clearly indicate they contain unredacted data.

### Audit logging
Audit logs follow the stricter requirements in [AUDIT_LOGGING.md](AUDIT_LOGGING.md). When audit logs reference sensitive actions, they must use user IDs and action types rather than raw sensitive data.

### Security incident response
During active security incident investigation, authorized personnel may access raw logs with:
- Explicit approval from the security team.
- Time-bound access grants.
- Audit trail of who accessed what logs and when.

## Cross-references

- [LOG_RETENTION.md](LOG_RETENTION.md): How long logs are retained and at what levels.
- [AUDIT_LOGGING.md](AUDIT_LOGGING.md): Audit logging requirements for sensitive actions.
- [DATA_EXPORT.md](DATA_EXPORT.md): How data-access requests are fulfilled.

## Ownership and review

Owned by the backend maintainers. Reviewed every six months or when:
- New sensitive fields are introduced in the data model.
- Regulatory requirements for data protection change.
- Security audits reveal gaps in redaction coverage.
- New logging frameworks or libraries are adopted.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
