# Backend Money-Handling Precision Policy

Floating-point arithmetic corrupts money. This policy defines how amounts are represented, calculated, stored, and rounded in the backend.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Representation

Amounts are held as integers in the asset's smallest unit (for example stroops for XLM, 7 decimal places) or as arbitrary-precision decimals. JavaScript `number` floats must never hold or calculate monetary values.

## Storage and transport

Database columns use integer or fixed-precision numeric types. APIs send amounts as strings to avoid precision loss, with the asset code alongside.

## Rounding

Rounding happens once, at the final step, using round-half-up to the asset's precision unless a rule says otherwise. Splitting an amount must allocate any remainder deterministically so the parts sum to the whole.

## Validation

Amounts must be positive where required, within defined limits, and have no more decimal places than the asset allows. Conversions between assets record the rate used.

## Ownership and review

Owned by the backend maintainers. Reviewed every six months and when a new asset is supported.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
