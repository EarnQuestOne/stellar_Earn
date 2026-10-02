# Frontend Changelog Policy — Breaking Type & Model Changes

**Status:** Active
**Owner:** Frontend maintainers
**Applies to:** Everything under `FrontEnd/my-app/`
**Related:**
[`CHANGELOG.md`](../CHANGELOG.md) ·
[`.changeset/`](../.changeset/README.md) ·
[`scripts/check-changelog.mjs`](../scripts/check-changelog.mjs) ·
[`frontend-changelog.yml`](../../../.github/workflows/frontend-changelog.yml)

---

## 1. Why This Policy Exists

The StellarEarn frontend is the single TypeScript consumer of:

- Backend REST/Swagger contracts (`lib/api/*`, `lib/types/api.types.ts`)
- Smart-contract event/model shapes (`lib/types/quest.ts`, `lib/types/reputation.ts`, …)
- Internal domain models (`lib/types/*.ts`, `lib/schemas/*.ts`, `lib/validation/*.ts`)

A silent change to any of these can:

- Break dependent packages (e.g. the `subgraph/` resolvers, future mobile app).
- Silently change runtime behaviour after a deploy.
- Hide regressions until the next release.

**This policy guarantees that every breaking type/model change is announced,
versioned, and migratable.**

---

## 2. What Counts as a "Breaking Type/Model Change"

A change is **breaking** if any external consumer (another file, another
package, another contributor's open branch) could plausibly fail to compile or
behave incorrectly after the change.

### 2.1 Always breaking ⛔

| Change                                                                                             | Example                                                           |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Renaming an exported `type`, `interface`, `enum`, `class`, or `const`-as-enum                      | `QuestStatus.PAUSED` → `QuestStatus.ON_HOLD`                      |
| Removing an exported symbol                                                                        | `export type QuestFilters` deleted                                |
| Removing or renaming a member of an exported type/interface/enum                                   | `Quest.rewardAmount` → `Quest.amount`                             |
| Changing the **TS type** of a member (incl. widening `string` → `string \| null`)                  | `id: string` → `id: string \| null`                               |
| Turning an **optional** member into **required**                                                   | `cursor?: string` → `cursor: string`                              |
| Changing a literal-union member                                                                    | `'beginner' \| 'intermediate'` → `'easy' \| 'medium'`             |
| Changing the **runtime** value of a `const`-as-enum without changing the type name                 | `QuestDifficulty.EASY = 'beginner'` → `'EASY'`                    |
| Changing a Zod schema in a way that rejects previously-valid input                                 | `z.string()` → `z.string().uuid()`                                |
| Changing the **HTTP shape** assumed by a function in `lib/api/*`                                   | `/quests` now returns `{ items, meta }` instead of `{ data }`     |
| Changing the **arguments** of a public hook (`lib/hooks/*`) or store action (`lib/store/slices/*`) | `useQuests(filters)` → `useQuests(filters, options)` (positional) |

### 2.2 Not breaking ✅ (but still log under **Added** / **Changed**)

| Change                                                                                                   | Why it's safe                         |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Adding a new optional member                                                                             | Existing code still type-checks       |
| Adding a new exported type / hook                                                                        | Purely additive                       |
| Adding a new union member to a type that is **only produced**, never consumed exhaustively in a `switch` | No exhaustive checks break            |
| Internal-only refactor (no `export` change)                                                              | No external surface                   |
| Loosening a Zod schema (e.g. removing `.min(1)`)                                                         | Previously-valid input is still valid |

> When in doubt, **treat the change as breaking**. The cost of an extra
> CHANGELOG entry is near zero; the cost of a silent break is high.

---

## 3. Which Files Are Watched

The CI guard (`scripts/check-changelog.mjs`) treats edits to **any** of the
following as a potentially breaking change and requires either a `CHANGELOG.md`
update or a `.changeset/*.md` file in the same PR:

```
FrontEnd/my-app/lib/types/**
FrontEnd/my-app/lib/api/**
FrontEnd/my-app/lib/schemas/**
FrontEnd/my-app/lib/validation/**
FrontEnd/my-app/context/walletTypes.ts
```

To opt-out for a strictly non-breaking change, add the label
`changelog-skip` to the PR **or** include the literal token
`[changelog-skip]` in the PR title or commit message.

---

## 4. The Two Ways to Record a Change

### 4.1 Direct `CHANGELOG.md` edit (recommended for solo PRs)

Add a bullet to the `## [Unreleased]` section of
[`CHANGELOG.md`](../CHANGELOG.md), under the correct heading
(💥 / ✨ / 🛠 / ⛔ / 🗑 / 🐛 / 🔒).

For a breaking type/model change you **must** include:

1. The fully-qualified symbol (file path → exported name).
2. A one-line summary.
3. A `Migration:` code block with **before** / **after**.
4. The issue or PR number.

### 4.2 Changeset file (recommended when multiple PRs target the same release)

Create one markdown file in `.changeset/`, named
`YYYY-MM-DD-<short-slug>.md` (kebab-case), with the frontmatter shown in
[`.changeset/TEMPLATE.md`](../.changeset/TEMPLATE.md):

````markdown
---
pr: 068
type: breaking-types # one of: breaking-types | breaking-runtime | added | changed | deprecated | removed | fixed | security
symbols:
  - lib/types/quest.ts → QuestStatus
---

Renamed `QuestStatus.PAUSED` to `QuestStatus.ON_HOLD` to align with the
contract event name.

### Migration

```ts
// before
quest.status === QuestStatus.PAUSED;
// after
quest.status === QuestStatus.ON_HOLD;
```
````

````

A release script (run manually by a maintainer) collapses all `.changeset/*.md`
files into the next release block in `CHANGELOG.md` and deletes them.

---

## 5. Review Checklist (copy into every PR that touches watched files)

```markdown
### Breaking Type/Model Changes — FE-068

- [ ] I read [`docs/TYPE_CHANGES_POLICY.md`](FrontEnd/my-app/docs/TYPE_CHANGES_POLICY.md).
- [ ] I classified my change as: ☐ breaking-types ☐ breaking-runtime ☐ additive ☐ no-op
- [ ] If breaking: I added a `💥 Breaking — Types/Models` bullet in `CHANGELOG.md` **OR** a `.changeset/*.md` file.
- [ ] My entry includes a before/after `Migration:` block.
- [ ] My entry references this PR / issue number.
- [ ] I ran `npm run changelog:check` locally and it passed.
````

---

## 6. Release Process (maintainer-only)

1. `cd FrontEnd/my-app`
2. `npm run changelog:check` (must pass).
3. Decide the next version per SemVer:
   - **MAJOR** if there is _any_ `💥 Breaking` entry in `## [Unreleased]`.
     - **MINOR** for additive (`✨ Added`) changes only.
       - **PATCH** for `🐛 Fixed`, `🔒 Security`, or `🛠 Changed`-only releases.
       4. Rename `## [Unreleased]` → `## [X.Y.Z] — YYYY-MM-DD` and re-create a fresh
          empty `## [Unreleased]` block at the top. 5. Move every `.changeset/*.md` body into the new release block, then delete
          the consumed `.changeset/*.md` files. 6. Bump `version` in `FrontEnd/my-app/package.json`. 7. Tag the commit `frontend-vX.Y.Z` and push.

          ***

          ## 7. FAQ

          **Q: I only renamed a private (non-exported) type. Do I need to log it?**
          A: No. The policy only covers _exported_ surface area.

          **Q: I added a new optional field to `Quest`. Breaking?**
          A: No — log it under `✨ Added`.

          **Q: The backend already changed its API; I'm just catching up the FE types.**
          A: Still log it under `💥 Breaking — Types/Models` with a migration note. The
          FE changelog is the source of truth for FE consumers regardless of who caused
          the upstream change.

          **Q: My PR fails the changelog check but my change really is non-breaking.**
          A: Add `[changelog-skip]` to the PR title **or** apply the `changelog-skip`
          label. The script will pass and the reviewer will verify your claim.
