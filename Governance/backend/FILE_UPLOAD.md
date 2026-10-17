# Backend File-Upload and Storage Policy

Uploads are a common attack path. This policy sets limits, scanning and where files are stored.

- **Owner:** Backend maintainers
- **Review cadence:** every 6 months
- **Status:** Active

## Limits

Each endpoint documents its maximum file size and allowed file types. The server checks the real file type, not only the extension.

## Scanning

Uploaded files are scanned for malware before they are made available to anyone else.

## Storage

Files go to object storage outside the application server, with generated names and private access by default.

## Amendments

Changes to this document follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request limited to the `Governance/` folder.
