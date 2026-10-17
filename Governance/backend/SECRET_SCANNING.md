# Backend Secret-Scanning and Leak-Response Policy

A leaked secret is an incident. This policy sets how secrets are detected and what happens when one leaks.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Scanning

The Secret Scan workflow runs gitleaks on every pull request and on pushes to main. A failing scan blocks the merge.

## If a secret leaks

Revoke and rotate the secret first, then remove it from the code, then report it to the maintainers. Do not rely on deleting the commit.

## Follow-up

Record what leaked, how it was found and what changed to prevent a repeat, within 5 working days.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
