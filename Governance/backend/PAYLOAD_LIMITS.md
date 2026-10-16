# Backend Payload-Size and Request-Limit Policy

Unbounded requests exhaust memory and bandwidth. This policy sets maximum sizes and rates and defines the response to violations.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Size limits

JSON bodies default to 1 MB, file uploads to an endpoint-specific documented maximum, and query strings and headers to framework-safe sizes. Limits are set at the gateway and in the application.

## Request limits

Each endpoint has a rate limit per client; sensitive endpoints (authentication, submission, payout) have stricter limits. Limits are documented in OpenAPI.

## Response

Oversized requests return 413 and rate-limited requests return 429 with `Retry-After`, using the standard error format in ERROR_CODES.md. Repeated violations may be blocked temporarily and are logged.

## Changing limits

Raising a limit needs a stated reason and a maintainer review. Ownership: backend maintainers; review every six months.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
