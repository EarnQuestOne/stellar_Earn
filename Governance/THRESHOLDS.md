# Governance Approval Thresholds

## Purpose

This policy assigns an approval threshold to each class of governance change.
Every vote must first meet quorum; the required majority then determines whether
the proposal passes.

## Change classes

| Change class        | Examples                                                                                                                              | Required approval                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Routine             | Reversible operational decisions and non-substantive governance updates                                                               | Simple majority of non-abstaining ballots |
| Material governance | Governance-policy changes, working-group charters, and maintainer elections or removal                                                | Two-thirds of non-abstaining ballots      |
| Sensitive           | License adoption, change, exception, or re-licensing; any treasury allocation, disbursement, commitment, authority, or control change | Three-fourths of all eligible voters      |

The sensitive threshold is a supermajority of the full eligible electorate, not
only of ballots cast. A license or treasury change is not approved when quorum
is met but fewer than three-fourths of eligible voters vote yes.

## Calculating approval

For routine and material-governance votes, abstentions count toward quorum but
are excluded from the approval calculation. A simple majority requires more yes
than no ballots. A two-thirds majority requires yes ballots from at least
two-thirds of the non-abstaining ballots, rounded up.

For a sensitive vote, yes ballots must equal at least three-fourths of all
eligible voters, rounded up. Inactive and recused maintainers are excluded from
the eligible-voter count before calculating quorum or the threshold.

## Applying the threshold

The proposal states its change class and the resulting quorum and approval
calculation before the vote opens. The decision record includes the class,
eligible-voter count, ballots, quorum result, and threshold result.

If a proposal contains more than one class of change, the strictest applicable
threshold governs the complete decision. A policy may add review steps or a
higher threshold, but may not authorize a lower threshold than this policy for
its change class. This policy controls where another governance document
specifies a lower approval requirement for a license or treasury action.
