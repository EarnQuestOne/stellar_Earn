# Backend API Stability Tiers and Support Window

Clients need to know how far they can rely on an endpoint. This policy defines three stability tiers and what each promises.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Tiers

**Stable** endpoints do not change in breaking ways within a major version. **Beta** endpoints may change with notice. **Experimental** endpoints may change or be removed at any time.

## Support window

A stable endpoint that is replaced stays available for at least 6 months after the replacement is released.

## Marking tiers

The tier of each endpoint is stated in the OpenAPI document.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
