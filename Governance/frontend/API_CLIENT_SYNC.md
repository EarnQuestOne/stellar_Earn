# Frontend API-Client Contract-Sync Policy

This policy defines how the StellarEarn frontend keeps its API client, types, and
runtime validation in sync with the backend contract. It applies to the Next.js
application in `FrontEnd/my-app`, generated or handwritten client code, request
and response types, and mock handlers used in tests.

- **Owner:** Frontend maintainers, with the backend API owners as co-owners
- **Review cadence:** every 6 months
- **Status:** Active
- **Related:** [Data fetching](DATA_FETCHING.md), [OpenAPI policy](../backend/OPENAPI_POLICY.md), [Semantic versioning](../VERSIONING.md), [Deprecation policy](../DEPRECATION_POLICY.md)

## Source of truth

- The backend OpenAPI document is the source of truth for endpoints, request
  shapes, response shapes, status codes, and the error envelope.
- The frontend client is generated from that document or is checked against it.
  Handwritten wrappers may add ergonomics but must not redefine the contract.
- The contract is versioned. The frontend targets an explicit API version and
  does not silently consume an unversioned, unstable surface.
- The backend publishes the contract as part of the change that modifies an
  endpoint; the frontend update lands in the same release train.

## Synchronisation rules

- Generated types are committed or produced deterministically during CI. A
  generated-client diff that is not accompanied by the matching OpenAPI change
  is a failure.
- CI runs a drift check that regenerates the client and fails if the committed
  output differs from the specification.
- The client validates responses at runtime at trust boundaries, using the
  project's schema validation library, before data reaches UI state.
- Error handling uses the documented error envelope and stable error codes. The
  frontend does not parse human-readable messages to decide behaviour.
- Pagination, filtering, and sorting parameters follow the backend conventions
  and the shared client helpers.
- Authentication is attached by the shared client, never by individual
  components.

## Handling breaking changes

- A breaking backend change follows [Deprecation policy](../DEPRECATION_POLICY.md)
  and [semantic versioning](../VERSIONING.md): it is announced, versioned,
  and supported alongside the previous shape for the agreed window.
- The frontend does not adopt a breaking shape until the backend supports it in
  the target environment.
- Removed fields are deleted from the client only after the frontend no longer
  reads them in any deployed version.
- Feature flags may gate a client migration, but the old and new shapes must both
  be validated and tested during the transition.
- A contract change that cannot be made backward compatible requires a written
  migration plan in both repositories.

## Pull-request requirements

A pull request that changes API usage includes:

- a link to the backend contract change or the relevant OpenAPI diff;
- updated generated types and runtime schemas;
- updated MSW handlers and fixtures;
- tests for success, validation failure, and documented error responses;
- a note on backward compatibility and rollout.

Reviewers check that no endpoint is called with ad-hoc string paths outside the
client and that no response is cast with `any` to bypass validation.

## Verification

- CI checks client generation, type-checking, linting, and contract tests.
- Integration tests exercise the client against a mocked contract that mirrors
  the OpenAPI document.
- Before a release, a smoke test confirms that the deployed frontend can reach
  the deployed backend version and that authentication and the error envelope
  behave as expected.
- Contract drift found in production is treated as an incident and fixed
  forward, with the old client behaviour preserved where possible.

## Ownership and review

The frontend maintainers own the client implementation; backend API owners own
the contract and its versioning. Changes to this policy are reviewed jointly.
The policy is reviewed every six months and whenever the API specification
tooling or authentication scheme changes.

## Amendments

Changes follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request
limited to the `Governance/` folder.
