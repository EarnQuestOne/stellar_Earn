# Contract Deployment Record and Provenance Policy

Every deployed contract must be traceable to the exact source, build, and people that produced it. This policy defines the record kept for each deployment.

- **Owner:** Contract maintainers, with the security team
- **Review cadence:** every release and at least every 6 months
- **Status:** Active

## Required record

Each deployment (testnet and mainnet) is recorded with: network, contract address, WASM hash, source commit SHA, build toolchain and version, deployer and signer identities (public keys only), transaction hash, deployment date, and the approving issue or PR.

## Provenance

The WASM hash recorded must match a reproducible build of the recorded commit. A reviewer who did not perform the deployment confirms the match and signs off in the record. Mismatches block the deployment.

## Where records live

Records are appended to `docs/` or the release notes for the version and never rewritten; corrections are new entries that reference the original. Upgrades record the previous hash as well as the new one.

## Ownership and review

Owned by the contract maintainers. Reviewed at each release and at least every six months; changes follow the amendment process in AMENDMENTS.md.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
