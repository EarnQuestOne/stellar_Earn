# Quorum and Voter Eligibility

## Purpose

This policy defines who may vote on repository governance decisions and when a
vote has enough participation to be valid.

## Eligible voters

Eligible voters are the active maintainers listed in
`Governance/MAINTAINERS.md` when a vote opens. A maintainer is active when they
have performed a review, merge, or documented governance activity during the
preceding 90 days and are not on a recorded leave of absence.

Before opening a vote, its proposer records the eligible-voter list and names
any inactive or recused maintainers. Inactive maintainers are excluded from the
eligible-voter count and quorum calculation; they are not counted as abstaining
or voting against a proposal. A maintainer returning from inactivity becomes
eligible for votes opened after their return is recorded, but does not change a
vote already in progress.

A maintainer with a material conflict of interest must recuse themself. A
recused maintainer is excluded from the eligible-voter count, quorum, and
approval calculation for that vote.

## Quorum

A governance vote has quorum when at least two-thirds of its eligible voters,
rounded up, participate before the vote closes. A ballot of yes, no, or abstain
counts as participation. An abstention counts toward quorum but not toward the
approval threshold.

The required approval majority depends on the class of change. No decision is
approved without quorum, even if it otherwise receives enough affirmative
ballots. If a vote lacks quorum, the result is recorded as inconclusive and the
proposal may be reopened with the same or a revised voting period.

## Vote record

The decision record includes:

- the proposal and its change class;
- the date the vote opened and closed;
- the eligible-voter list, including inactive and recused maintainers;
- each ballot or an attributed tally where confidentiality is required;
- the quorum calculation and approval result; and
- links to relevant discussion and any recorded dissent.

Eligibility and quorum are fixed when the vote opens. Changes to the maintainer
roster, activity status, or recusal after that point apply to future votes only.
