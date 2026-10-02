---
# One of: breaking-types | breaking-runtime | added | changed | deprecated | removed | fixed | security

type: breaking-types

# Link the PR or issue number(s) this changeset belongs to.

pr: 0

# List every exported symbol affected, using `path → Name` format.

symbols:
  - lib/types/quest.ts → QuestStatus
---

  <!--
    Write a one-paragraph human summary of the change here. Be specific:
      who does this affect, and why was it done?
      -->

      A short summary of what changed and why.

      ### Migration

      ```ts
      // before
      quest.status === QuestStatus.PAUSED;

      // after
      quest.status === QuestStatus.ON_HOLD;
      ```
