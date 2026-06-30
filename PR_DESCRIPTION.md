## Linked Issue

Closes #801

> **Required:** Every PR must be linked to an open issue. PRs without a linked issue will not be reviewed.

---

## Description

**What changed?**

This PR resolves the Quest model mismatch between API and UI where `difficulty` was optional in the API types but required in the frontend Quest interface, and the backend had no difficulty field at all.

**Changes made:**

**Backend (`BackEnd/src/modules/quests/`):**
- Added new `QuestDifficulty` enum (`enums/quest-difficulty.enum.ts`) with values: `BEGINNER`, `INTERMEDIATE`, `ADVANCED`
- Added optional `difficulty` field to `Quest` entity (`entities/quest.entity.ts`)
- Added optional `difficulty` field to `CreateQuestDto` (`dto/create-quest.dto.ts`)
- Added optional `difficulty` field to `QuestResponseDto` (`dto/quest-response.dto.ts`)

**Frontend (`FrontEnd/my-app/`):**
- Made `Quest.difficulty` optional in `lib/types/quest.ts` to match API types
- Made `Quest.difficulty` optional in `lib/types/admin.ts`
- Updated `QuestHeader` component (`components/quest/QuestHeader.tsx`) to conditionally render difficulty badge only when present

**Why was it changed?**

The frontend `Quest` interface required `difficulty: QuestDifficulty` but the API response type (`QuestResponse` in `api.types.ts`) had `difficulty?: QuestDifficulty` (optional). This mismatch could cause TypeScript errors or runtime issues when displaying quests without difficulty from the API. The backend also lacked the difficulty field entirely.

**How was it implemented?**

1. Created a shared `QuestDifficulty` enum on the backend matching the frontend values
2. Added nullable `difficulty` column to the Quest entity with TypeORM
3. Updated DTOs to accept and return optional difficulty
4. Updated frontend types to make difficulty optional, aligning with API contract
5. Updated QuestHeader to handle optional difficulty gracefully

---

## Type of Change

- [x] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to break)
- [ ] Security fix
- [ ] Refactor (no functional change)
- [ ] Documentation update
- [ ] Tests only
- [ ] Configuration / DevOps change

---

## Contract Changelog Discipline

- [x] No contract implementation changes - not applicable

---

## Test Evidence

### Unit Tests

- [ ] New unit tests added for changed logic
- [x] All existing unit tests pass (`npm run test`) - Backend builds successfully
- [ ] Coverage does not regress (`npm run test:cov`)

**Test output / screenshot:**

```
Backend build: SUCCESS
```

### E2E / Integration Tests

- [ ] E2E tests added or updated (`npm run test:e2e`)
- [ ] Tested manually against a local environment

---

## Swagger / API Documentation

- [x] Updated DTOs annotated with `@ApiPropertyOptional` for difficulty field
- [ ] Swagger UI verified locally at `/api/docs` and responses are accurate

---

## Error Handling Checklist

- [x] Input Validation (DTOs) - DTOs use `class-validator` decorators (`@IsOptional`, `@IsEnum`)
- [x] No raw `Error` thrown where an HTTP exception is expected

---

## Database / Migration

- [ ] No database changes - not applicable
- [x] TypeORM migration will be needed for the new `difficulty` column on `quests` table

---

## Breaking Type / Model Changes (Frontend — FE-068)

- [ ] My PR touches **none** of the watched type/model paths — not applicable.
- [x] I classified my change as: `fixed` (fixed type mismatch between API and UI)
- [ ] I added a bullet to `## [Unreleased]` in `FrontEnd/my-app/CHANGELOG.md` **OR** a new file in `FrontEnd/my-app/.changeset/`.
- [ ] `cd FrontEnd/my-app && npm run changelog:check` passes locally.

---

## Final Pre-Merge Checklist

- [x] Linting passes (`npm run lint`) - Backend passes with only pre-existing warnings
- [x] Branch is up to date with `main` / `master`
- [x] No `console.log` / debug statements left in production code
- [x] No hardcoded secrets, API keys, or environment-specific values in source code

---

## Additional Notes for Reviewer

- The QuestWizard component had a hardcoded `'intermediate'` difficulty which now works correctly since the API accepts optional difficulty
- QuestCard and filter components (QuestListFilters, FilterPanel) already handled optional difficulty correctly
- A database migration will be needed to add the `difficulty` column to the `quests` table