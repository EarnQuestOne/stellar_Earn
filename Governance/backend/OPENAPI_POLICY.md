# Backend API Documentation and OpenAPI Policy

Undocumented endpoints are hard to use and hard to review. This policy requires an OpenAPI description for every endpoint and describes how it is validated.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Requirement

Every new or changed endpoint ships with OpenAPI documentation in the same pull request: path, method, parameters, request and response schemas, error responses, authentication requirements, and examples.

## Source of truth

The OpenAPI document is generated from code annotations or maintained alongside the code, never edited separately by hand after generation.

## Validation

CI lints the OpenAPI document and checks that it matches the implemented routes. Pull requests with missing or invalid documentation are not merged.

## Errors and stability

Documented error responses follow ERROR_CODES.md. Breaking changes follow the versioning and deprecation policies.

## Ownership and review

Owned by the backend maintainers. Reviewed every six months.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
