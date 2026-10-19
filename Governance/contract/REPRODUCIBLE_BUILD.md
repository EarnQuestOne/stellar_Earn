# Contract Reproducible-Build and WASM-Checksum Policy

Anyone must be able to rebuild a deployed contract from its source commit and obtain the same WASM bytes. This policy defines how WASM builds are reproduced and how checksums are recorded and verified.

- **Owner:** Contract maintainers, with the security team and the release manager
- **Review cadence:** every release and at least every 6 months
- **Status:** Active

## Scope

Covers every WASM artifact intended for a network: testnet and mainnet deployments, upgrades, and redeployments. It complements [DEPLOY_APPROVAL.md](DEPLOY_APPROVAL.md), [DEPLOY_PROVENANCE.md](DEPLOY_PROVENANCE.md), [UPGRADE_AUTHORIZATION.md](UPGRADE_AUTHORIZATION.md), and [POST_DEPLOY_VERIFY.md](POST_DEPLOY_VERIFY.md).

## Reproducing a build

A release build must be reproducible from a recorded commit:

- Build from a clean checkout of a tagged or otherwise immutable commit, with no uncommitted changes.
- Use the toolchain pinned in the repository (Rust toolchain file, `Cargo.lock` committed, dependencies resolved with `--locked`).
- Build in the documented clean, containerized environment so that host paths, timestamps, and locally installed tools do not affect the output.
- Build the release profile with the optimizations the repository specifies, and optimize the WASM with the pinned tool version only.
- Record the commit, toolchain version, build environment (image digest), and exact build command alongside the artifact.

A build that cannot be reproduced is not eligible for deployment.

## Checksums

- The SHA-256 hash of the final, optimized WASM file is the canonical checksum.
- The checksum is computed on the exact bytes to be uploaded to the network, and is published with the release and in the deployment record.
- Checksums are never edited after publication; a rebuild that produces a different hash is a new artifact with a new record.

## Verification

Before approval of a mainnet deployment or upgrade, a reviewer who did not produce the build:

1. checks out the recorded commit and rebuilds independently using the steps above;
2. compares the resulting SHA-256 with the recorded checksum;
3. records the result on the pull request, release issue, or deployment issue.

A mismatch blocks deployment until explained and resolved. After deployment, the hash of the WASM installed on-chain is compared with the recorded checksum as part of [POST_DEPLOY_VERIFY.md](POST_DEPLOY_VERIFY.md); a difference is handled as an incident under [EMERGENCY_POWERS.md](../EMERGENCY_POWERS.md).

## Ownership and review

Owned by the contract maintainers, with the security team and the release manager. Reviewed at each release and at least every six months, and whenever the toolchain, build environment, or optimization tooling changes.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
