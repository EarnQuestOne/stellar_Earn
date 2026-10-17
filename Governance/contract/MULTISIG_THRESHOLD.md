# Contract Multisig and Threshold Policy

Privileged contract operations must not depend on a single key. This policy sets the signer set and the approval threshold.

- **Owner:** Contract maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Signer set

Privileged operations are controlled by a multisig of at least five signers drawn from different maintainers. The current signer list is kept in the deployment record, not in this file.

## Threshold

Routine privileged operations need 3 of 5 signatures. Emergency pause needs 2 of 5. Changing the signer set needs 4 of 5.

## Signer changes

A signer who leaves or loses a key is replaced within 7 days, and the change is recorded in a pull request.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
