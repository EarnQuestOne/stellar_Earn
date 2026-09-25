# Meeting Minutes Archive

This folder is the canonical archive for StellarEarn **governance meeting
minutes**. It defines where minutes live, how each file is named, and the
template every set of minutes follows.

Like the rest of this folder, everything here is documentation: nothing in
`Governance/meetings/` changes application behaviour. It is linked from the
[governance index](../README.md).

## Purpose

- Keep a durable, reviewable record of what each governance meeting decided,
  who attended, and what happens next.
- Make minutes easy to find by date and topic.
- Guarantee consistency through a fixed layout, naming convention, and template.

## Archive layout

```
Governance/meetings/
├── README.md                      # this file: layout, naming, template, index
└── <YYYY>/                        # one folder per calendar year (UTC)
    ├── <YYYY-MM-DD>-<topic-slug>.md
    └── <YYYY-MM-DD>-<topic-slug>.md
```

- `README.md` is the only fixed file. It is **not** a set of minutes.
- There is exactly one folder per calendar year, named with the four-digit year
  of the meeting (UTC).
- There is exactly one Markdown file per meeting, named per the convention
  below.

Example:

```
Governance/meetings/
├── README.md
└── 2026/
    ├── 2026-02-05-quarterly-governance-sync.md
    └── 2026-04-16-annual-budget-review.md
```

## Naming convention

Every minutes file must match:

```
<YYYY>/<YYYY-MM-DD>-<topic-slug>.md
```

| Segment        | Rule                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------- |
| `<YYYY>`       | Folder: four-digit calendar year of the meeting, in UTC.                                        |
| `<YYYY-MM-DD>` | Meeting date in ISO 8601, in UTC (not the date the minutes were written).                       |
| `<topic-slug>` | Lowercase ASCII `kebab-case`, 2-5 words, alphanumeric and hyphens only, describing the meeting. |
| `.md`          | Markdown extension, always lowercase.                                                           |

Examples:

- `Governance/meetings/2026/2026-02-05-quarterly-governance-sync.md`
- `Governance/meetings/2026/2026-04-16-annual-budget-review.md`

Edge cases:

- **Multiple meetings on the same day.** Give each a distinct `<topic-slug>`. If
  two meetings share both date and topic, suffix the second with `-2`, the third
  with `-3`, and so on (for example `...-2026-02-05-budget-review-2.md`).
- **Special sessions.** Append a reserved suffix to the topic slug:
  `-emergency` for an unplanned session, `-special` for an out-of-cycle session,
  or `-annual` for the yearly general meeting (for example
  `2026-08-01-budget-revision-emergency.md`).
- **Reserved names.** `README.md` is reserved for this document and must not be
  used for minutes.

Renaming or moving an archived minutes file is discouraged; prefer a correction
(see [Retention and corrections](#retention-and-corrections)).

## Adding minutes

1. Create the file at `Governance/meetings/<YYYY>/<YYYY-MM-DD>-<topic-slug>.md`
   using the template below.
2. Fill in every metadata field; use `TBD` only while the minutes are `draft`.
3. Add a row to the [Index](#index) below.
4. Open a small PR. A minutes change touches at most two files: the new minutes
   file and this index.

## Minutes template

Copy this block into each new minutes file and replace the placeholders.

```markdown
# <Meeting title>

- **Date:** <YYYY-MM-DD> (UTC)
- **Time:** <HH:MM>-<HH:MM> (UTC)
- **Facilitator:** <name / handle>
- **Secretary:** <name / handle>
- **Attendees:** <names / handles>
- **Absent:** <names / handles, or "none">
- **Status:** draft
- **Related:** <issues, RFCs, or PRs>

## Agenda

1. <agenda item>
2. <agenda item>

## Decisions

- **D-<YYYY-MM-DD>-1:** <decision>
  - **Rationale:** <why>
  - **Outcome:** <consensus / vote result>

## Action items

| #   | Action   | Owner   | Due (UTC)    | Status |
| --- | -------- | ------- | ------------ | ------ |
| 1   | <action> | <owner> | <YYYY-MM-DD> | open   |

## Links

- <issue / PR / document>
```

## Retention and corrections

- Minutes are **append-only once approved**. Do not rewrite a decision that has
  already been recorded.
- To fix a factual error, append a `## Corrections` section to the same file
  with the change, the corrector, and the date. Do not delete the original text.
- Keep the `Status` field accurate: `draft` until the next meeting approves the
  minutes, then `approved`.
- Never record secrets, credentials, personal data, or anything covered by the
  security policy. Move sensitive discussion to the appropriate private channel.

## Index

Newest first. Add one row per archived meeting.

| Date (UTC) | Topic | Facilitator | Status | Minutes |
| ---------- | ----- | ----------- | ------ | ------- |
| _none yet_ |       |             |        |         |
