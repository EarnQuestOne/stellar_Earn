# Backend Email and Notification-Sending Policy

Notifications should be useful and never spammy. This policy sets rate limits, templates and opt-out handling.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Rate limits

Each user receives at most 10 non-critical notifications per day. Security and account alerts are exempt.

## Templates

Messages are sent from reviewed templates only, with no secrets or sensitive data in the body.

## Opt-out

Every non-critical message has an unsubscribe option. An opt-out takes effect immediately and is stored.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
