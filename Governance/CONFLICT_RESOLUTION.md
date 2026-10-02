# Conflict Resolution and Escalation Policy

## Purpose

This document defines the formal conflict resolution framework and escalation ladder for the StellarEarn project. Technical, procedural, or interpersonal disagreements can arise during project governance, pull-request reviews, architecture decisions, or community interactions. This policy establishes a structured, transparent, and timely path to resolve conflicts constructively while preserving project velocity and healthy community standards.

## Principles

- **Focus on technical merit:** Arguments should be grounded in data, security, maintainability, and alignment with project goals rather than personal preference.
- **Good faith & respect:** All participants must engage in good faith, adhering to the [Code of Conduct](CODE_OF_CONDUCT.md) and [Safety Policy](SAFETY_POLICY.md).
- **Proactive resolution:** Disagreements should be addressed at the lowest possible escalation level before escalating further.
- **Clear timelines:** Every step in the escalation ladder has defined maximum timeframes to prevent discussions from stalling indefinitely.

## Scope

This process applies to:

- Code review disputes and technical architecture disagreements.
- RFC proposal deadlocks.
- Governance, policy, or role interpretation disputes.
- Working group and SIG operational disagreements.

_Note: Code of Conduct violations follow the reporting and enforcement procedures defined in [COC_REPORTING.md](COC_REPORTING.md) and are handled separately by the CoC Committee._

## Escalation Ladder & Timelines

The conflict resolution process follows a 4-tier escalation ladder:

```
+-------------------------------------------------------------+
| Level 1: Peer Resolution & Discussion (3-5 business days)   |
+-------------------------------------------------------------+
                              | (Unresolved)
                              v
+-------------------------------------------------------------+
| Level 2: Maintainer / WG Mediation (5-7 business days)      |
+-------------------------------------------------------------+
                              | (Unresolved)
                              v
+-------------------------------------------------------------+
| Level 3: TSC Formal Escalation & Vote (7-10 business days)  |
+-------------------------------------------------------------+
                              | (Tied / Deadlocked Vote)
                              v
+-------------------------------------------------------------+
| Level 4: Tie-Breaking Authority Ruling (3 business days)    |
+-------------------------------------------------------------+
```

### Level 1: Peer Resolution (Direct Discussion)

- **Description:** The primary participants in the disagreement engage directly on the relevant GitHub issue, pull request, or discussion thread.
- **Process:** Participants present technical arguments, benchmark data, architectural trade-offs, or precedent.
- **Timeline:** Resolution must be sought within **3 to 5 business days** of the disagreement arising.
- **Outcome:** Consensus reached, or explicit agreement to escalate to Level 2 if consensus cannot be reached within 5 business days.

### Level 2: Area Maintainer / Working Group Lead Mediation

- **Description:** If direct discussion stalls, either party may request mediation by the designated area maintainer (from [MAINTAINERS.md](MAINTAINERS.md) or `.github/CODEOWNERS`) or Working Group lead.
- **Process:** The maintainer acts as a neutral facilitator, reviews the arguments, requests additional data or compromise options, and suggests a recommended resolution path.
- **Timeline:** Mediation must conclude within **5 to 7 business days** from the escalation request.
- **Outcome:** Consensus achieved on the proposed compromise, or formal escalation to Level 3 if any core party objects to the maintainer's recommendation.

### Level 3: Technical Steering Committee (TSC) Escalation

- **Description:** Unresolved technical or procedural conflicts are formally submitted to the maintainers acting as the Technical Steering Committee (TSC).
- **Process:**
  1. A formal escalation issue is opened summarizing the background, trade-offs, previous Level 1/2 attempts, and specific questions for the TSC.
  2. The TSC reviews the evidence and conducts a formal discussion.
  3. The TSC votes on the proposed resolution options according to the procedures defined in [VOTING.md](VOTING.md).
- **Timeline:** The TSC review and voting process must complete within **7 to 10 business days** of receiving the formal escalation.
- **Outcome:** The vote passes per the majority rules in [VOTING.md](VOTING.md) and the decision is published as binding.

### Level 4: Tie-Breaking Authority Final Determination

- **Description:** In the event that a TSC vote results in a deadlock or tied outcome, the conflict is escalated to the Tie-Breaking Authority.
- **Process:** The designated Tie-Breaking Authority evaluates the TSC vote, reviews all submitted materials, and issues a final, binding determination per [TIE_BREAKING.md](TIE_BREAKING.md).
- **Timeline:** Final determination must be issued within **3 business days** following the conclusion of the tied TSC vote.
- **Outcome:** Final binding ruling recorded in the project decision log.

## Documentation & Transparency

- All conflict resolutions at Level 2 and above must be recorded in the relevant issue or PR thread.
- TSC decisions resulting from Level 3 or Level 4 escalations are archived in `Governance/decisions/` or linked in the release notes if they affect public contracts or architecture.
