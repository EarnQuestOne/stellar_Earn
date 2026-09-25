# Disputes Changelog

## Unreleased

- Added authenticated APIs for opening, appealing, resolving, and querying disputes.
- Added the database mirror and transaction references for the on-chain lifecycle.
- Added complete OpenAPI/Swagger documentation to `DisputesController`: `@ApiTags('Disputes')`, `@ApiBearerAuth()` on all routes, `@ApiOperation` summaries on every handler, `@ApiParam` descriptors for `:id` path parameters, and `@ApiResponse` annotations for HTTP 200, 201, 400, 401, 403, and 404 status codes (closes #2366).