# Backend PII Handling and Classification Policy

This policy defines how backend services collect, classify, store, access, and
share personally identifiable information (PII). It applies to the NestJS API,
background workers, scheduled jobs, logs, backups, exports, and every
third-party integration that receives data from StellarEarn.

- **Owner:** Backend maintainers, with the security team as co-owner
- **Review cadence:** every 6 months, and after any data-protection incident
- **Status:** Active
- **Related:** [Data retention](DATA_RETENTION.md), [Log redaction](LOG_REDACTION.md), [Anonymization](ANONYMIZATION.md), [Data export](DATA_EXPORT.md)

## Classification tiers

| Tier | Description | Examples | Handling baseline |
|------|-------------|----------|-------------------|
| Restricted | Data whose exposure could enable account takeover, financial loss, or identity theft | Wallet seed phrases and private keys, authentication secrets, full payment-card data, government identity documents | Field-level encryption, access on a named-need basis, no logging, no analytics export |
| Confidential | Data that identifies or can be linked to a person | Email address, phone number, postal address, date of birth, IP address, account-linked wallet address, KYC status, support attachments | Encrypted at rest and in transit, least-privilege access, masked in logs and admin views |
| Internal | Operational data that must not be public but is not directly identifying | Internal user IDs, quest participation history, moderation notes, aggregated analytics | Authenticated access, never exposed in public endpoints |
| Public | Data intentionally published by the product | Quest titles, public profiles, on-chain transaction hashes | Standard integrity controls |

A field's tier is determined by the most sensitive interpretation. A wallet
address is public on-chain, but an address linked to an account, email, or
payout record is **Confidential** in that context.

## Collection and purpose limitation

- Collect only fields required for a documented product, contractual, or legal
  purpose. New PII fields require review by the backend maintainers and the
  security team before merge.
- Never use production PII in development, demos, fixtures, or test suites.
  Use synthetic data generated for that purpose.
- Do not copy production datasets into local or staging environments. Use
  anonymized extracts when realistic data is required.
- Record the purpose and retention class for each new PII field in the service
  or module documentation and in the database migration description.

## Storage and transport

- All PII is encrypted in transit with TLS. Plain HTTP is rejected at the edge.
- Restricted fields use application-level encryption or a dedicated secrets
  store; they are never stored as plaintext columns.
- Database backups and object-storage exports inherit the classification of
  their most sensitive contents.
- Encryption keys are managed under [Secrets rotation](SECRETS_ROTATION.md)
  and are never committed to the repository.

## Access and use

- Access follows least privilege. Production access to Confidential or
  Restricted data requires a named role, an approved reason, and an audit trail.
- Administrative views mask Confidential fields by default and reveal them only
  through an audited action.
- Sensitive reads and mutations emit audit events as required by
  [Audit logging](AUDIT_LOGGING.md).
- Analytics and reporting pipelines receive aggregated or pseudonymized data.
  Direct identifiers are removed before export.

## Logging and error handling

- Never log Restricted data. Log Confidential data only as a redacted value or
  an internal identifier.
- Request bodies, headers, cookies, and query strings must pass through the
  redaction rules in [Log redaction](LOG_REDACTION.md) before they reach a log
  sink or error tracker.
- Error messages returned to clients must not reveal whether a specific email,
  wallet, or account exists.

## Sharing with third parties

- Every integration that receives PII must have a documented purpose, a data
  processing agreement where required, and an owner.
- Send the minimum fields needed, prefer pseudonymous identifiers, and record
  the integration in the backend integration inventory.
- New integrations require security review before production use.

## Retention, export, and deletion

- Retention follows [Data retention](DATA_RETENTION.md).
- Subject-access and erasure requests follow [Data export](DATA_EXPORT.md) and
  [Anonymization](ANONYMIZATION.md).
- Deleting an account removes or anonymizes linked PII across modules, including
  profile records, support attachments, and analytics identifiers.

## Incident response

A suspected exposure of Confidential or Restricted data is a security incident.
Follow [Incident classes](INCIDENT_CLASSES.md), preserve evidence, and do not
attempt to hide or delete logs before the security team has reviewed the event.

## Ownership and review

The backend maintainers own this policy and review it every six months, and
whenever a new PII field, integration, or regulatory requirement is introduced.
The security team may require an earlier review after an incident or audit
finding.

## Amendments

Changes follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request
limited to the `Governance/` folder.
