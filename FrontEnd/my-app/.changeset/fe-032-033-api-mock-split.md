---
type: changed
pr: 1779
symbols:
  - lib/api/quests.integration.test.ts → quests integration tests
---

Adds MSW mock server lifecycle to the quests API integration tests to remove
the live environment dependency (#821). Renames quests.test.ts to
quests.integration.test.ts and introduces `test:unit` / `test:integration`
scripts in package.json for split test execution (#822).
