# Backend Timezone and Datetime Handling Policy

Mixed timezones cause subtle bugs in deadlines and rewards. This policy standardises how time is stored, transmitted, and displayed.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Storage

All timestamps are stored in UTC using timezone-aware types (for example `timestamptz`). Server and database clocks run in UTC.

## API format

The API sends and accepts ISO 8601 / RFC 3339 strings in UTC with a `Z` suffix (for example `2025-01-31T12:00:00Z`). Date-only values use `YYYY-MM-DD` and are documented as such.

## Display

Conversion to a user's timezone happens in the client. Deadlines shown to users state the timezone.

## Calculations

Durations and expirations are computed on UTC instants. Code never relies on server-local time or on daylight-saving behaviour. Tests inject a clock rather than reading the system time.

## Ownership and review

Owned by the backend maintainers. Reviewed every six months.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
