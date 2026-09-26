# Dependency Management Policy

This document describes how StellarEarn adds, updates, vets, and removes
external dependencies, and how vulnerable or abandoned packages are handled.

## Scope

This policy covers all runtime and development dependencies declared in package
manifests across the repository (e.g. `package.json`, `Cargo.toml`,
`requirements.txt`, `go.mod`). It applies to direct and transitive
dependencies.

## Adding a dependency

Before adding any new dependency a contributor must confirm:

1. **Necessity** – the functionality cannot be reasonably implemented with
   existing dependencies or standard-library primitives in a maintainable way.
2. **Licence compatibility** – the dependency's licence is compatible with this
   project's licence (see [LICENSING_POLICY.md](LICENSING_POLICY.md)).
3. **Maintenance health** – the package has recent releases, an active
   maintainer or organization, and an open issue tracker. Abandoned or
   unmaintained packages require explicit TSC approval.
4. **Supply-chain hygiene** – the package name is verified against the intended
   registry to avoid typosquatting. Checksums or lock-file entries must be
   committed alongside the dependency declaration.
5. **Minimal scope** – request the narrowest set of permissions and
   capabilities the dependency exposes.

The pull request adding a dependency must include a brief justification in the
PR description covering the points above.

## Updating dependencies

- **Routine updates** (non-breaking patch and minor bumps) may be merged by
  any maintainer after CI passes.
- **Major-version bumps** require a review by at least one additional
  maintainer and a note in the PR description explaining migration impact.
- Dependency updates should be grouped by ecosystem in dedicated PRs, separate
  from feature or fix work, to keep diffs reviewable.
- Automated dependency-update pull requests (e.g. from Dependabot or Renovate)
  are treated as routine updates and may be merged by any maintainer after CI
  passes, unless they include a major-version bump.

## Pinning and lock files

All production dependencies must be pinned to an exact version or a content
hash in the lock file. Ranges are permitted in manifest files only where the
lock file is committed and enforced in CI. Lock files must be kept in sync with
manifest files and committed to the repository.

## Vulnerability handling

When a vulnerability is reported for a dependency:

1. **Severity assessment** – the security team triages the report using the
   project's vulnerability-severity definitions.
2. **Patch or replace** – if a patched version exists, open a dependency-update
   PR within the SLA defined by severity. If no patch exists, evaluate
   mitigations or replacement packages.
3. **SLA targets**:
   - Critical / High – patch merged and released within **72 hours** of
     confirmed impact.
   - Medium – patch merged within **14 days**.
   - Low / Informational – tracked as a regular issue; resolved within the
     next scheduled release.
4. **Disclosure** – security-related dependency updates follow the
   coordinated-disclosure process in the security policy.

## Removing dependencies

A dependency may be removed when it is no longer used, has been replaced, or
poses an unacceptable risk that cannot be mitigated. Removal PRs must verify
that no transitive consumers remain and that CI passes without the package.

## Prohibited dependencies

The following categories of dependency must not be added without explicit TSC
approval:

- Packages with known, unresolved critical vulnerabilities.
- Packages whose licence is incompatible with this project's licence.
- Packages that phone home, collect telemetry, or require network access at
  install time, unless that behaviour is documented, optional, and
  user-controlled.
- Packages that have not had a release in more than 24 months and have no
  designated maintainer.

## Audit and review

The full dependency tree should be audited using the ecosystem's standard audit
tool (e.g. `npm audit`, `cargo audit`) as part of CI. Audit failures that
produce a finding at Medium severity or above block merges to `main`.

A manual dependency review is conducted before each MAJOR release and the
outcome recorded in the release issue.

## Related documents

- [LICENSING_POLICY.md](LICENSING_POLICY.md) – licence compatibility matrix.
- [RELEASE_POLICY.md](RELEASE_POLICY.md) – release approval and versioning.
- [HOTFIX_POLICY.md](HOTFIX_POLICY.md) – emergency patching process.
