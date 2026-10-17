# Backend Code Review Checklist

This document serves as the official governance reference for reviewing backend pull requests in **Stellar Earn (`EarnQuestOne/stellar_Earn`)**. Reviewers and contributors must verify that all backend code changes adhere to these standards before merging.

---

## 1. Security & Authentication
- [ ] **Input Validation**: All incoming request payloads, query parameters, and headers are strictly validated and sanitized (using validation libraries like Zod, class-validator, or equivalent).
- [ ] **Authentication & Authorization**: Endpoints correctly enforce authentication guards and role-based / resource-level authorization checks.
- [ ] **Secret Management**: No API keys, private keys, JWT secrets, or sensitive credentials are hardcoded. Environment variables are accessed securely via configuration modules.
- [ ] **Rate Limiting**: Public-facing or resource-intensive endpoints have appropriate rate-limiting guards applied.

## 2. Database & Data Access
- [ ] **Query Safety**: Queries prevent SQL injection or NoSQL injection vulnerabilities (utilizing ORM query builders or parameterized queries).
- [ ] **Indexing & Performance**: New database queries or schemas include proper indexing considerations to prevent full table scans on large datasets.
- [ ] **Transaction Integrity**: Multi-step operations or financial/state-changing updates are wrapped in database transactions with proper rollback handling.

## 3. Error Handling & Logging
- [ ] **Standardized Error Responses**: Errors return consistent, descriptive HTTP status codes (e.g., `400`, `401`, `403`, `404`, `500`) and safe error messages.
- [ ] **Structured Logging**: Logs use structured JSON formats and never output sensitive data such as passwords, tokens, or personal identifiable information (PII).
- [ ] **Exception Catching**: Async/await calls and promises have robust error handling (try/catch blocks or global exception filters) to prevent unhandled rejection crashes.

## 4. Performance & Concurrency
- [ ] **Resource Cleanup**: Database connections, file streams, and socket listeners are properly closed or disposed of to prevent memory leaks.
- [ ] **Asynchronous Operations**: Blocking operations are offloaded or executed asynchronously using non-blocking primitives.

## 5. Testing & Quality Assurance
- [ ] **Unit Tests**: New business logic, service methods, and utility functions include corresponding unit tests.
- [ ] **Integration Tests**: API endpoints and database interactions are validated via integration test suites.
- [ ] **Test Passing**: All tests pass successfully locally and in CI pipelines without flaky behaviors.

---

## Governance, Ownership & Cadence

- **Document Ownership**: Maintained by the Backend Engineering Lead and Core Maintainers.
- **Review & Update Cadence**: This checklist is formally reviewed and updated **quarterly** to align with evolving security practices, architectural changes, and dependency upgrades.