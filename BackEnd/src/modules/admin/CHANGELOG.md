# admin module changelog

All notable changes to the `admin` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- `AdminService.getUserById` now throws `NotFoundException` (HTTP 404)
  instead of `ForbiddenException` (HTTP 403) when the requested user does
  not exist. This aligns the failure mode with the project's exception-class
  convention for "resource not found" cases (§4.2 of `CONTRIBUTING.md`) and
  prevents API consumers from mis-diagnosing a missing resource as an
  authorization failure.
