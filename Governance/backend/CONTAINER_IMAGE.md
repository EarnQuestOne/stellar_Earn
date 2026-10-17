# Backend Container Image and Base-Image Policy

Container images carry the whole runtime. This policy sets which base images are approved and how often images are rebuilt.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Approved base images

Use the official Node.js LTS slim or Alpine images, pinned by version tag. Other base images need maintainer approval.

## Rebuild and patch

Images are rebuilt at least monthly and immediately when a critical vulnerability is announced for the base image.

## Hardening

Images run as a non-root user, contain no secrets, and include only what the service needs.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
