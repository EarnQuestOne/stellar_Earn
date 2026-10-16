# Backend Pagination and Filtering Convention

Lists should behave the same way across the API. This convention defines pagination and filtering parameters and responses.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Pagination

List endpoints use `page` (1-based) and `limit` (default 20, maximum 100). High-volume or frequently changing lists may use cursor pagination with `cursor` and `limit`; each endpoint documents which it uses.

## Response shape

Lists return `{ "data": [], "meta": { "total": 0, "page": 1, "limit": 20, "hasNext": false } }`; cursor lists return `nextCursor` instead of page counts.

## Sorting

`sort` takes a field name, with a leading `-` for descending (for example `sort=-createdAt`). Only documented fields are sortable and the order must be deterministic, with a unique tiebreaker such as `id`.

## Filtering

Filters are plain query parameters named after the field (`status=active`). Ranges use `<field>From` and `<field>To`; multi-value filters use comma-separated values. Unknown parameters return a validation error.

## Validation and review

Out-of-range values are rejected using ERROR_CODES.md. Owned by the backend maintainers; reviewed every six months.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
