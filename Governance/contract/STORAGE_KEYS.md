# Contract Storage-Key Namespace Governance

## Purpose

This document is the versioned reference for how contract storage keys are named, owned, and governed in this repository. It exists to prevent storage-key collisions between contracts and modules, to make on-chain state discoverable, and to give contributors a single place to check before adding new keys.

This document applies only to contract storage keys (the identifiers used to persist and retrieve contract state). It does not govern off-chain configuration keys or secrets.

## Scope

- All storage keys written by contracts in this repository.
- Key prefixes, suffixes, and delimiters used to compose keys.
- Ownership and review cadence for this document.

Out of scope: off-chain configuration, secret management, and non-contract data stores.

## Namespace Layout

Every contract storage key MUST reside within a namespace owned by exactly one contract or module. Namespaces are delimited with a colon (`:`) and follow this grammar:

```
<domain>:<subdomain>:<key>
[<domain>:<subdomain>:<index>:<key>]
```

- `<domain>` — lowercase, a to z, digits, and underscores only. Identifies the broad area (for example `treasury`, `voting`, `registry`).
- `<subdomain>` — lowercase, a to z, digits, and underscores only. Identifies the owning contract or module within the domain.
- `<index>` — optional non-negative integer for multi-value keys (for example a per-account record).
- `<key>` — lowercase, a to z, digits, and underscores only. Identifies the specific record within the namespace.

Examples:

```
treasury:core:balance
voting:registry:proposal_count
voting:registry:0:proposal
treasury:core:1:allocation
```

## Naming Rules

1. **Lowercase only.** Storage keys MUST use lowercase letters, digits, and underscores. Hyphens, spaces, and camelCase are forbidden.
2. **Colon delimiter.** Segments MUST be joined with a single colon. Leading or trailing colons are forbidden, as are empty segments.
3. **Stable prefix.** The first two segments (`<domain>:<subdomain>`) MUST be stable across releases. Renaming a prefix requires a migration plan and approval from the owner defined below.
4. **Uniqueness.** A fully qualified key MUST be unique within its namespace. Two contracts MUST NOT claim the same `<domain>:<subdomain>` prefix.
5. **No implicit nesting.** Nested state MUST be represented by explicit segments, not by concatenation of free form strings.
6. **No secrets.** Storage keys MUST NOT encode secrets, private keys, or personally identifiable information.

## Collision Rules

- **Prefix ownership.** Each `<domain>:<subdomain>` prefix is owned by exactly one contract. Ownership is recorded in the table below.
- **First claim.** When two contracts would claim the same prefix, the one that added the prefix to this document first owns it. The later contract MUST rename its prefix.
- **No shadowing.** A contract MUST NOT write keys under a prefix it does not own, even if the full key is unique.
- **Detection.** Collisions are detected by exact match on the `<domin>:<subdomain>:<index>:<key>` form and by prefix containment. Any key that is a prefix of another key in a different namespace MUST be reported and resolved.
- **Resolution.** Collisions are resolved by the owner of this document before the conflicting change is merged.

## Ownership

This document is owned by the Governance maintainers.

- The owner is responsible for approving new `<domain>:<subdomain>` prefixes and for resolving collisions.
- Contributors MUST update this document in the same change that introduces or renames a storage key prefix.
- Ownership transfers MUST be recorded here in the same change that transfers ownership.

## Review and Update Cadence

- **Review trigger.** This document is reviewed whenever a contract adds, renames, or removes a storage key prefix.
- **Periodic review.** The owner reviews this document at least once per release cycle to confirm the prefix table is accurate.
- **Versioning.** Material changes to naming or collision rules MUST increment the version below and be noted in the change description.

## Version

Current version: **1.0.0**

Change log:

- `1.0.0` — Initial definition of the contract storage-key namespace governance.

## Prefix Registry

The table below is the authoritative list of owned prefixes. Add a row when you claim a new prefix.

| Prefix | Owner | Notes |
| ------ | ----- | ----- |
| `treasury:core` | Treasury contract | Balances and allocations. |
| `voting:registry` | Voting registry contract | Proposals and proposal counts. |

## Contributor Checklist

Before opening a change that introduces or modifies a contract storage key:

- [ ] The key follows the naming rules above.
- [ ] The `<domain>:<subdomain>` prefix is claimed in the Prefix Registry table.
- [ ] No existing key is shadowed or collides with the new key.
- [ ] Any rename includes a migration plan approved by the owner.
- [ ] Any material rule change increments the version and is documented in the change description.
