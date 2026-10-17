# Contract Crate-Audit and RustSec Triage Policy

Contract dependencies can have known security advisories. This policy sets how advisories are triaged.

- **Owner:** Contract maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Triage

Run `cargo audit` on every contract change. Each advisory is triaged within 5 working days as fix now, accepted with an exception, or not applicable.

## Exceptions

An accepted advisory needs a written reason, an owner and an expiry date of at most 90 days, recorded in the audit configuration.

## Fixes

Where a patched crate exists, upgrade to it in a pull request of its own.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
