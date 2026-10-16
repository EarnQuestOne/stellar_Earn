# Backend Error-Response and Error-Code Standard

Consistent errors make the API predictable to clients. This standard defines one error format and a stable set of error codes.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Error envelope

Every error response is JSON of the form `{ "statusCode": 400, "code": "VALIDATION_FAILED", "message": "Human readable text", "details": [], "requestId": "..." }`. `details` is optional and lists field-level problems.

## Stable codes

`code` is an upper-snake-case string that never changes meaning once released. Clients rely on `code`, not on `message`. Examples: `VALIDATION_FAILED`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `PAYLOAD_TOO_LARGE`, `INTERNAL_ERROR`.

## HTTP status mapping

400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict, 413 payload too large, 429 rate limited, 5xx server errors. Never return 200 with an error body.

## Safety

Messages and details must not reveal stack traces, internals, secrets, or personal data. Unexpected errors return `INTERNAL_ERROR` and are logged with the request id.

## Changes

New codes are added to the catalogue in the pull request that introduces them; removing or repurposing a code is a breaking change. Owned by the backend maintainers; reviewed every six months.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
