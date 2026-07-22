# quota module changelog

All notable changes to the `quota` backend module are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this module adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- Eliminated TOCTOU race condition in `enforceQuestCreationQuota` and `enforcePayoutQuota`. The separate check and increment operations are now wrapped in a database transaction with a `SELECT FOR UPDATE` (pessimistic write) row lock, ensuring concurrent requests cannot both pass the quota check before either increments the counter.
- Replace raw SQL string interpolation with parameterized query binding in `enforcePayoutQuota`.

