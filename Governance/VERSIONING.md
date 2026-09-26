# Semantic Versioning Policy

This document defines how StellarEarn increments version numbers, uses
pre-release and build metadata, and communicates version meaning to consumers.

## Adopted standard

StellarEarn follows [Semantic Versioning 2.0.0](https://semver.org/) (SemVer).
A version number takes the form `MAJOR.MINOR.PATCH`, optionally followed by a
pre-release identifier and build metadata:

```
MAJOR.MINOR.PATCH[-pre-release][+build]
```

## Version components

### MAJOR

Increment MAJOR when a release introduces one or more **incompatible changes**
that require consumer action:

- Removal or renaming of a public API, contract entrypoint, or event.
- Change to the meaning or encoding of an existing parameter or return value.
- Breaking change to a configuration schema, environment variable, or wire
  protocol.
- Removal of a previously deprecated item whose removal notice has elapsed.

MAJOR 0 (`0.y.z`) is reserved for initial development. Public API stability is
not guaranteed until `1.0.0`. During `0.y.z`, a MINOR bump may include
breaking changes; this must be noted prominently in the changelog.

### MINOR

Increment MINOR when a release adds **backward-compatible new functionality**:

- New public API endpoints, contract functions, or events.
- New optional configuration keys or parameters with defined defaults.
- Deprecation of an existing item (the item still works; see
  [DEPRECATION_POLICY.md](DEPRECATION_POLICY.md)).
- Significant internal refactors that do not change observable behaviour but
  are noteworthy for integrators.

Reset PATCH to 0 when MINOR is incremented.

### PATCH

Increment PATCH when a release delivers **backward-compatible fixes** only:

- Bug fixes that restore documented behaviour.
- Security patches that do not change public API contracts.
- Documentation corrections shipped with a code tag.
- Performance improvements with no observable behaviour change.

Reset PATCH to 0 when MAJOR or MINOR is incremented.

## Pre-release identifiers

Pre-release versions are denoted by appending a hyphen and a dot-separated
sequence of identifiers after the PATCH component. StellarEarn uses the
following identifiers in order:

| Identifier | Meaning |
|------------|---------|
| `alpha.N` | Early, unstable build. May have incomplete features or known bugs. Not for production use. |
| `beta.N` | Feature-complete but may have bugs. Suitable for testing by early adopters. |
| `rc.N` | Release candidate. Code-frozen; only blocking-bug fixes land. Intended to become the final release if no issues are found. |

`N` starts at `1` and increments for each successive pre-release at the same
stage (e.g. `1.2.0-rc.1`, `1.2.0-rc.2`).

Pre-release versions have lower precedence than the associated release:
`1.2.0-rc.1 < 1.2.0`.

## Build metadata

Build metadata is appended after a `+` sign (e.g. `1.2.0+20260901.sha.a1b2c3`).
Build metadata is informational only and must not be used to determine version
precedence. StellarEarn uses build metadata only in CI artefacts; published
release tags never include a `+` component.

## Version precedence and comparison

When comparing two versions, precedence is determined left-to-right:
MAJOR → MINOR → PATCH → pre-release. Pre-release versions have lower
precedence than the release they are associated with. Two versions that differ
only in build metadata are considered equal in precedence.

## Tagging and publishing

- Release tags follow the format `vMAJOR.MINOR.PATCH` (e.g. `v1.2.0`).
- Pre-release tags follow the format `vMAJOR.MINOR.PATCH-pre-release`
  (e.g. `v1.2.0-rc.1`).
- Tags are signed and pushed only after the approval steps defined in
  [RELEASE_POLICY.md](RELEASE_POLICY.md) are complete.
- The version string in all package manifests must match the tag exactly before
  the tag is pushed.

## Changelog entries

Every version increment requires a changelog entry. The entry must state the
new version, the type of change (MAJOR/MINOR/PATCH), and a plain-language
summary. Breaking changes must include a migration guide reference. See
[RELEASE_POLICY.md](RELEASE_POLICY.md) for changelog requirements.

## Questions about classification

When a change is difficult to classify, apply the highest applicable tier. If
there is genuine uncertainty about whether a change is breaking, treat it as a
MAJOR increment. The release manager has final authority on classification,
with escalation to the TSC if needed.

## Related documents

- [RELEASE_POLICY.md](RELEASE_POLICY.md) – release process, approval, and tagging.
- [DEPRECATION_POLICY.md](DEPRECATION_POLICY.md) – deprecation timelines and migration notices.
- [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md) – branch naming and release flow.
