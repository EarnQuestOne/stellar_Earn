# Guiding Principles and Values

These are the values that guide governance decisions at StellarEarn. They are
deliberately few and opinionated: when a rule is silent or two options are
otherwise equal, these principles break the tie. Each is paired with the
rationale for why it earns a place here.

## 1. Verifiability over trust

Rewards must map to work that was actually reviewed and approved, and the
reasoning must be recorded. **Rationale:** the project's whole purpose is to make
earning trustworthy; any step that asks users to simply trust an operator
undermines that purpose.

## 2. Transparency by default

Decisions, trade-offs, and their reasons are recorded in the open
([decisions/README.md](decisions/README.md)); the only exception is security
work, which is confidential only until disclosure
([roles/SECURITY_TEAM.md](roles/SECURITY_TEAM.md)). **Rationale:** governance
that cannot be inspected cannot be held accountable, and hidden decisions
erode contributor trust faster than disagreements do.

## 3. Open participation

Authority is earned through demonstrated work, not granted by gatekeeping. Any
contributor may propose a change, and the path from contributor to reviewer to
maintainer is documented ([roles/CONTRIBUTOR.md](roles/CONTRIBUTOR.md)).
**Rationale:** the project benefits from the widest pool of people willing to
do the work, and clear ladders keep that pool from being decided by familiarity.

## 4. Subsidiarity: decide as locally as possible

An area owns its internal decisions; only cross-area, policy, and irreversible
matters escalate to the maintainers ([SUBPROJECTS.md](SUBPROJECTS.md)).
**Rationale:** people closest to a problem decide it best, and centralizing
every choice makes the project slow without making it safer.

## 5. Consensus first, votes as a fallback

Try to reach agreement; vote only when consensus fails, and record the dissent
([VOTING.md](VOTING.md), [DISSENT.md](DISSENT.md)). **Rationale:** voting
settles decisions but does not build agreement, so it is a tool of last resort,
not the default.

## 6. Least authority, bounded and revocable

Every role holds the minimum authority it needs, authority is documented
([ROLES.md](ROLES.md)), and it can be removed or expire (for example the
rotating chair in [LEADERSHIP.md](LEADERSHIP.md)). **Rationale:** unconcentrated,
reviewable authority is more resilient and easier to correct than concentrated
authority, and revocation keeps the project from depending on any one person.

## 7. Accountability and reversibility

Decisions are attributed; emergency action is bounded and must be ratified
afterwards ([EMERGENCY_POWERS.md](EMERGENCY_POWERS.md)); superseded rules are
archived rather than quietly rewritten ([ARCHIVE_POLICY.md](ARCHIVE_POLICY.md)).
**Rationale:** a decision that can be traced and undone is safer to delegate,
and delegating more is what lets the project scale.

## 8. Respect, safety, and inclusion

Every interaction follows the Code of Conduct and inclusive-language
guidelines, and conduct and safety concerns have their own protected channels
([CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), [SAFETY_POLICY.md](SAFETY_POLICY.md)).
**Rationale:** people contribute only where they expect to be treated fairly;
process quality is worthless if participation is unsafe.

## 9. Stewardship, not ownership

Role holders are stewards of an area or the project: they are responsible for
its health and expected to hand it on in better shape
([MISSION.md](MISSION.md), [roles/MAINTAINER.md](roles/MAINTAINER.md)).
**Rationale:** framing authority as a trust rather than a possession aligns
incentives with the project's long-term health instead of short-term control.

## 10. Sustainability and simplicity

Prefer solutions the existing maintainers can run, review, and afford; avoid
dependencies and structures that add cost without adding capability
([DEPENDENCY_POLICY.md](DEPENDENCY_POLICY.md)). **Rationale:** volunteer-run
projects fail from overreach and burnout more often than from lack of ambition,
so simplicity is itself a form of resilience.

## Using these principles

- They are cited in decision records where they materially shaped a decision.
- A proposal that clearly conflicts with a principle should say so and explain
  why the exception is warranted; the maintainers weigh it per
  [THRESHOLDS.md](THRESHOLDS.md).
- The list is short on purpose. New principles are added sparingly, by
  amendment ([AMENDMENTS.md](AMENDMENTS.md)), only when they resolve a class of
  decisions the existing principles cannot.
