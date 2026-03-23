## Linked Issue

Closes #<!-- issue number -->

> **Required:** Every PR must be linked to an open issue. PRs without a linked issue will not be reviewed.

---

## Description

<!-- A clear and concise summary of the changes introduced by this PR. -->

**What changed?**

**Why was it changed?**

**How was it implemented?**

---

## Type of Change

<!-- Check all that apply -->

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to break)
- [ ] Security fix
- [ ] Refactor (no functional change)
- [ ] Documentation update
- [ ] Tests only
- [ ] Configuration / DevOps change

---

## Test Evidence

> **Required:** All PRs must include test evidence. PRs missing this section will be blocked from merging.

### Unit Tests

- [ ] New unit tests added for changed logic
- [ ] All existing unit tests pass (`npm run test`)
- [ ] Coverage does not regress (`npm run test:cov`)

**Test output / screenshot:**

```
<!-- Paste relevant test output here -->
```

### E2E / Integration Tests

- [ ] E2E tests added or updated (`npm run test:e2e`)
- [ ] Tested manually against a local environment

**Endpoints tested:**

| Method | Endpoint | Expected | Result |
|--------|----------|----------|--------|
| `GET`  | `/api/…` |  200 OK  |   [x]   |

---

## Swagger / API Documentation

> **Required for any endpoint changes.**

- [ ] No API changes — Swagger update not applicable
- [ ] New endpoints documented with `@ApiOperation`, `@ApiResponse`, and `@ApiBearerAuth` decorators
- [ ] Updated DTOs annotated with `@ApiProperty` / `@ApiPropertyOptional`
- [ ] Swagger UI verified locally at `/api/docs` and responses are accurate
- [ ] Breaking changes to existing contracts are documented in the description above

---

## Error Handling Checklist

> All items below must be verified before requesting review.

### HTTP Exceptions

- [ ] Appropriate NestJS HTTP exceptions used (`NotFoundException`, `BadRequestException`, `ForbiddenException`, `UnauthorizedException`, `ConflictException`, etc.)
- [ ] No raw `Error` thrown where an HTTP exception is expected
- [ ] Global exception filter handles all unhandled errors gracefully
- [ ] Error responses follow the project's standard error shape

### Input Validation (DTOs)

- [ ] All incoming request bodies and query params have a corresponding DTO
- [ ] DTOs use `class-validator` decorators (`@IsString`, `@IsUUID`, `@IsNotEmpty`, `@IsOptional`, etc.)
- [ ] `class-transformer` decorators applied where necessary (`@Transform`, `@Type`, `@Expose`)
- [ ] `ValidationPipe` is applied globally or at the controller level — raw unvalidated input is never used

### Guards & Authorization

- [ ] Endpoints requiring authentication are protected with `@UseGuards(JwtAuthGuard)` or equivalent
- [ ] Admin-only endpoints use the appropriate admin guard / role check
- [ ] Public endpoints are explicitly marked with `@Public()` decorator where applicable
- [ ] Throttler guard behaviour verified — rate limits are not unintentionally bypassed

### Logging

- [ ] Significant operations and state transitions are logged using the project's Winston logger (`LoggerService`)
- [ ] Errors are logged at `error` level with stack traces
- [ ] No sensitive data (passwords, secrets, private keys, tokens) is included in log output
- [ ] Incoming request / response logging is handled by the global `LoggerMiddleware` — no duplicate logs added

### Stellar / Soroban Contract Interactions

- [ ] Contract calls wrapped in try/catch with descriptive error messages
- [ ] Horizon / Soroban RPC failures do not crash the service — fallback or retry logic applied where appropriate
- [ ] Transaction signing uses environment-provided keys only — no hardcoded secrets

---

## Database / Migration

- [ ] No database changes — not applicable
- [ ] TypeORM migration created and tested (`npm run typeorm:generate-migration`)
- [ ] Migration is reversible (down migration implemented)
- [ ] Seed data updated if required (`seed.ts`)

---

## Final Pre-Merge Checklist

- [ ] Branch is up to date with `main` / `master`
- [ ] Linting passes (`npm run lint`)
- [ ] Formatting passes (`npm run format`)
- [ ] No `console.log` / debug statements left in production code
- [ ] No hardcoded secrets, API keys, or environment-specific values in source code
- [ ] `.env.example` updated if new environment variables were introduced
- [ ] `ReadMe Backend.md` or `ReadMe Frontend.md` updated if setup steps changed
- [ ] Self-review completed — I have read through every line of the diff

---

## Screenshots / Recordings (if applicable)

<!-- Attach screenshots or screen recordings for UI changes or Swagger updates -->

---

## Additional Notes for Reviewer

<!-- Anything the reviewer should pay special attention to, known limitations, follow-up issues, etc. -->
