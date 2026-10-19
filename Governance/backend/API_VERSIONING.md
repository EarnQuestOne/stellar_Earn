# Backend API Versioning and Deprecation Policy

This policy defines the versioning scheme for the StellarEarn HTTP API, what
counts as a breaking change, and the timeline for deprecating endpoints. It
applies to public and partner-facing endpoints, the OpenAPI document, and the
frontend API client.

- **Owner:** Backend API owners, with frontend maintainers as co-owners
- **Review cadence:** every 6 months
- **Status:** Active
- **Related:** [Semantic versioning](../VERSIONING.md), [Deprecation policy](../DEPRECATION_POLICY.md), [OpenAPI policy](OPENAPI_POLICY.md), [Stability tiers](STABILITY_TIERS.md)

## Versioning scheme

- The major API version is part of the path: `/api/v1/...`, `/api/v2/...`.
- Within a major version, changes are additive and backward compatible.
- A new major version is required when a change removes or renames a field,
  changes a type or meaning, changes status codes or the error envelope, changes
  authentication or authorization requirements, or makes a previously optional
  input required.
- Additive changes that remain compatible include new optional request fields,
  new response fields that clients can ignore, new endpoints, and new enum values
  only where clients are documented to tolerate unknown values.
- The API version is independent of the application release version and of
  contract versions. Each is recorded in the OpenAPI document and release notes.

## Compatibility rules

- Existing clients must continue to work without changes for the support window
  of their major version.
- Fields are not repurposed with a different meaning. Add a new field and
  deprecate the old one.
- Enum evolution must be additive and documented. Clients must ignore unknown
  values; the backend must not reject a request solely because it sends a value
  introduced later within the same version where the contract allows it.
- Pagination, filtering, sorting, and error shapes remain stable within a major
  version.
- Security fixes may change behaviour immediately when necessary, with the
  change documented and communicated as soon as it is safe to do so.

## Deprecation timeline

| Consumer | Minimum notice | Support after sunset |
|----------|----------------|----------------------|
| Public API | 6 months | 3 months of documented migration support |
| Partner integration | 6 months, or the contracted term if longer | Per agreement |
| Internal service | 90 days | 30 days |
| Emergency security removal | As soon as safe | Best effort, with an incident record |

The deprecation clock starts when the notice is published, not when the
replacement is designed. A deprecation notice includes:

- the affected endpoint, field, or behaviour;
- the replacement and a migration example;
- the sunset date and the support window;
- the owner and a contact route for migration help;
- the telemetry signal used to confirm that traffic has moved.

## Deprecation mechanics

- Deprecated endpoints and fields are marked in the OpenAPI document and in the
  API reference.
- Responses include `Deprecation` and `Sunset` headers where the protocol allows,
  plus a link to the migration guide.
- The backend logs usage of deprecated surfaces by consumer, without personal
  data, so that the team can contact remaining consumers and confirm completion.
- When usage reaches zero, or the sunset date passes after documented outreach,
  the surface is removed in the next major version or a scheduled release.
- A deprecation may be extended only with API-owner approval and a revised date
  in the same notice.

## Client and documentation obligations

- The frontend follows the API-client contract-sync policy and does not call a
  deprecated surface after its replacement is available.
- The OpenAPI document is updated in the same change as the API behaviour.
- Release notes call out deprecations and new major versions.
- Support and partner-facing teams receive the migration guide before the notice
  is published.

## Verification

- Contract tests cover the current and previous supported versions during a
  migration window.
- A sunset is not completed until telemetry shows no remaining traffic and the
  support window has elapsed.
- Removing a version requires a release note, an updated OpenAPI document, and a
  rollback plan for at least one release cycle.

## Ownership and review

The backend API owners own the versioning decision; frontend maintainers confirm
client migration readiness; the security team may require an accelerated removal.
The policy is reviewed every six months and whenever the API gateway or
documentation tooling changes.

## Amendments

Changes follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request
limited to the `Governance/` folder.
