# Backend Data Anonymization for Non-Production Policy

Staging and test environments must not hold real user data. This policy sets how production data is anonymized before it is used there.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## What is anonymized

Names, emails, phone numbers, wallet addresses linked to people, and free-text fields are replaced with fake values before data leaves production.

## How

Anonymization runs in a scripted job with fixed rules, keeps record relationships intact, and cannot be reversed.

## Access

Raw production exports are never copied to a developer machine. Only the anonymized output is shared with non-production environments.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
