# Backend Onboarding Guide for New Contributors

This guide helps new backend contributors get from a fresh clone to a first pull request.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Local setup

Fork and clone the repository, then in `BackEnd/` copy `.env.example` to `.env` and run `npm ci`.

## Running tests

Run `npm run lint` and `npm run test` before pushing. Fix any failure before opening a pull request.

## Your first PR

Pick an issue labelled for beginners, work on a branch named `<type>/<short-description>`, and open a pull request that links the issue with `Closes #<number>`.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
