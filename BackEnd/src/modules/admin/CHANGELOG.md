# admin module changelog

All notable changes to the `admin` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Added complete OpenAPI / Swagger documentation to `AdminController` endpoints (`/admin/users`, `/admin/users/:id`, `/admin/stats`) including `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiParam`, and `@ApiResponse` status codes (200, 400, 401, 403, 404). Documented query parameters on `GetUsersQueryDto` with `@ApiPropertyOptional`. Closes #2367.

### Changed

- Split the monolithic `admin.module.ts` into separate `admin.controller.ts`, `admin.service.ts`, and `admin.module.ts` files, matching the file-per-concern layout used by the other modules. No behavior change. Closes #1907.

### Fixed

- `AdminService.getUserById` now throws `NotFoundException` (HTTP 404)
  instead of `ForbiddenException` (HTTP 403) when the requested user does
  not exist. This aligns the failure mode with the project's exception-class
  convention for "resource not found" cases (§4.2 of `CONTRIBUTING.md`) and
  prevents API consumers from mis-diagnosing a missing resource as an
  authorization failure.
