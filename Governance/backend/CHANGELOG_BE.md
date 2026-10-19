# Backend Changelog and Release-Notes Policy

This policy defines how backend changes are recorded for consumers. It gives API clients, frontend developers, integrators, and operators a single, predictable place to learn what changed in each backend release and whether they must act.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Scope

This policy applies to every backend release, including:
- API services and their public endpoints
- Background workers and scheduled jobs
- Webhook payloads and event schemas
- Database migrations and configuration changes that affect operators

Repository-wide release rules live in [RELEASE_POLICY.md](../RELEASE_POLICY.md) and [VERSIONING.md](../VERSIONING.md); this document covers only how backend changes are described.

## Changelog format

The backend keeps one changelog, ordered newest first, following the [Keep a Changelog](https://keepachangelog.com/) layout:

- An `Unreleased` section at the top collects entries for merged but unreleased changes.
- Each release has a heading with its [semantic version](../VERSIONING.md) and ISO 8601 date (`## 1.4.0 - 2026-01-31`).
- Entries are grouped under these headings, omitting empty ones:
  - **Added** — new endpoints, fields, events, or configuration.
  - **Changed** — behaviour changes to existing functionality.
  - **Deprecated** — features scheduled for removal, per [DEPRECATION_POLICY.md](../DEPRECATION_POLICY.md).
  - **Removed** — features removed in this release.
  - **Fixed** — bug fixes.
  - **Security** — vulnerability fixes (published per the disclosure policy; never before a fix is available).

## What must be recorded

Every consumer-visible change needs an entry, including:
- Added, changed, or removed endpoints, request/response fields, and status codes.
- Changes to error codes (see [ERROR_CODES.md](ERROR_CODES.md)).
- Changes to webhook payloads or signing (see [WEBHOOK_POLICY.md](WEBHOOK_POLICY.md)).
- Changes to pagination, rate limits, or payload limits.
- New or changed required environment variables, and migrations operators must run.
- Deprecations and their removal dates.

Purely internal refactors, test-only changes, and documentation fixes do not need entries.

## How entries are written

- Write for the consumer, in the past tense, in one or two sentences: what changed and the effect on them.
- Reference the pull request or issue (`(#1234)`).
- Never include secrets, internal hostnames, or exploit details.
- Mark breaking changes with a leading **BREAKING:** and include migration steps or a link to them. Breaking changes follow [DEPRECATION_POLICY.md](../DEPRECATION_POLICY.md) and require a MAJOR version bump.
- Security entries describe impact and the fixed version, not the vulnerability mechanics.

## Release notes

Release notes are the human-readable summary published with each release (for example on the GitHub release page):
- Open with a short summary of notable changes.
- Copy the changelog sections for that version.
- List a **Breaking changes** and **Upgrade steps** section whenever either applies, including migrations and required configuration.
- Link the full changelog entry and the release tag.

## Process

1. The author of a pull request with a consumer-visible change adds an entry under `Unreleased`.
2. Reviewers check the entry as part of [REVIEW_CHECKLIST_BE.md](REVIEW_CHECKLIST_BE.md); a missing or inaccurate entry blocks merge.
3. When cutting a release, the release manager renames `Unreleased` to the new version and date, starts a fresh `Unreleased` section, and publishes the release notes.
4. Published entries are not rewritten. Corrections are made by a new entry in a later release, except for typos and broken links.

## Cross-references

- [RELEASE_POLICY.md](../RELEASE_POLICY.md): release types, approvals, and rollback.
- [VERSIONING.md](../VERSIONING.md): MAJOR/MINOR/PATCH rules.
- [DEPRECATION_POLICY.md](../DEPRECATION_POLICY.md): notice periods and removal process.
- [OPENAPI_POLICY.md](OPENAPI_POLICY.md): API documentation that accompanies endpoint changes.

## Ownership and review

Owned by the backend maintainers, who are accountable for the accuracy of the changelog and for enforcing this policy in review. This document is reviewed every six months or when:
- The release process or versioning scheme changes.
- Consumers report missing or unclear change information.
- A release ships an undocumented breaking change.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
