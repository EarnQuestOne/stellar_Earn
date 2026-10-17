# Release and Versioning Policy

This document describes how StellarEarn versions and ships releases, who is
authorized to approve them, and how the process is recorded.

## Versioning scheme

StellarEarn follows [Semantic Versioning 2.0.0](https://semver.org/):

- **MAJOR** – incompatible API or contract changes that require consumer
  action (migration guide required).
- **MINOR** – backward-compatible new functionality.
- **PATCH** – backward-compatible bug fixes, security patches, and
  documentation corrections.

Pre-release identifiers (`-alpha.N`, `-beta.N`, `-rc.N`) are appended in
order. A release candidate becomes the final release only after the acceptance
criteria below are satisfied.

## Release types

| Type | Cadence | Branch source | Notes |
|------|---------|---------------|-------|
| Regular | Every four weeks | `main` | Feature and patch work. |
| Patch / hotfix | As needed | Release branch or `main` | See [HOTFIX_POLICY.md](HOTFIX_POLICY.md). |
| Release candidate | One week before regular release | Release branch | Freeze period; only blocking fixes land. |
| Security release | As needed | Affected release branch | Coordinated with security team. |

## Approval requirements

A release requires explicit sign-off from **all** of the following before the
tag is pushed and artefacts are published:

1. **Release manager** (on-call rotation, listed in [MAINTAINERS.md](MAINTAINERS.md)) –
   verifies CI is green, the changelog is complete, and the version bump is
   correct.
2. **At least one additional maintainer** – independent review of the release
   artefact and changelog.
3. **Security owner** – required for any release that includes a security fix;
   confirms the fix is complete and the disclosure timeline is observed.

No release tag may be pushed without these approvals recorded in the release
issue or pull request.

## Release process

1. Open a release issue using the release checklist template (if one exists) or
   note the version, scope, and target date.
2. Create a release branch `release/vX.Y.Z` from `main` (or the appropriate
   long-term-support branch).
3. Bump the version in all relevant files and update `CHANGELOG.md`.
4. Open a release pull request targeting `main`; the PR description links the
   release issue.
5. Obtain the approvals listed above.
6. Merge the PR, push the signed tag `vX.Y.Z`, and publish artefacts to the
   configured registries.
7. Post a release announcement in the project communication channel and close
   the release issue.
8. For a regular release, delete the release branch after the tag is pushed.

## Changelog

Every release must include a changelog entry in `CHANGELOG.md` covering:

- New features (MINOR changes).
- Bug and security fixes (PATCH changes).
- Breaking changes with a migration guide reference (MAJOR changes).
- Deprecations scheduled for removal in the next MAJOR release.

Changelog entries are written for users, not for reviewers; avoid internal
ticket references without a plain-language summary.

## Long-term support

An LTS designation may be applied to a MAJOR release by maintainer vote. LTS
branches receive security and critical-bug fixes for a period agreed at the
time of designation and recorded in the release issue.

## Rollback

If a release is found to be defective after publication, the release manager
may retract it by:

1. Marking the tag and published artefacts as deprecated or yanked (where the
   registry supports this).
2. Opening a patch release immediately.
3. Communicating the retraction and the safe version in the project channel.

Retracted releases are documented in `CHANGELOG.md` with an explanation.

## Related documents

- [HOTFIX_POLICY.md](HOTFIX_POLICY.md) – emergency changes during a code freeze.
- [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md) – branch naming and lifecycle.
- [MAINTAINERS.md](MAINTAINERS.md) – release manager rotation and contacts.
