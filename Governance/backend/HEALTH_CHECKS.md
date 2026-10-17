# Backend Health-Check and Readiness Policy

Orchestrators and operators need to know if a service is alive and ready. This policy defines the endpoints and what they check.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Liveness

A liveness endpoint answers 200 as long as the process is running. It does not call any other system.

## Readiness

A readiness endpoint answers 200 only when the database and cache connections work and required migrations are applied. Otherwise it answers 503.

## Rules

Health endpoints need no login, return no sensitive data and respond within 1 second.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
