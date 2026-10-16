# Backend Data-Export and Subject-Rights Request Policy

People may ask for a copy of their data or for it to be deleted. This policy describes how those requests are received, verified, and fulfilled.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Request types

Access/export, correction, deletion, and restriction of processing of personal data held in the backend.

## Intake and verification

Requests arrive via the documented contact channel. The requester's identity is verified before anything is shared, for example by wallet signature or authenticated session. Requests are logged and acknowledged within 5 business days.

## Fulfilment

Responses are completed within 30 days. Exports use a common machine-readable format (JSON) and are delivered over a secure channel. Deletions remove or anonymise personal data, except what must be retained for legal, security, or on-chain integrity reasons, which is explained to the requester.

## On-chain data

Data written to a public blockchain cannot be deleted. Requesters are told this before they act.

## Records and review

Each request, decision, and completion is recorded without keeping the exported data. Owned by the backend maintainers and reviewed every six months.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
