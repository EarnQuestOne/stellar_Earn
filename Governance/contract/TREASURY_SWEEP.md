# Contract Fee and Treasury-Sweep Policy

Contracts may accumulate protocol fees. This policy defines how those fees are swept, who authorises sweeps, and how they are recorded.

- **Owner:** Contract maintainers, with the security team
- **Review cadence:** quarterly
- **Status:** Active

## Fee accounting

Collected fees are tracked separately from user escrow balances. A sweep may only move fee balances; it must never touch user funds or pending payouts.

## Sweep cadence and authority

Sweeps run on a fixed schedule (at least quarterly) or when the balance crosses a threshold set by the maintainers. A sweep needs approval from two authorised signers using the key procedures in KEY_CEREMONY.md.

## Destination

Funds go only to the treasury address recorded in the deployment record. Changing the destination is a parameter change under PARAMETER_CHANGE.md.

## Record keeping

Each sweep records date, asset, amount, transaction hash, signers, and the contract balance before and after. Records are published in the treasury report described in EXPENSES.md.

## Ownership and review

Owned by the contract maintainers with the treasury steward. Reviewed quarterly.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
