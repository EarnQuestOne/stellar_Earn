# Governance Glossary

Shared definitions for terms used across the governance documents. Entries are
alphabetized. Where a term is defined in more detail elsewhere, the entry links
to that document; if a definition here and a policy disagree, the policy wins.

**Abstention** — A ballot cast to record participation without taking a side. An
abstention counts toward quorum but is excluded from the approval calculation
for routine and material-governance votes. See [VOTING.md](VOTING.md) and
[THRESHOLDS.md](THRESHOLDS.md).

**ADR (Architecture Decision Record)** — A short, dated record of a significant
technical decision and its consequences. See [decisions/README.md](decisions/README.md).

**Amendment** — A change to a governance document, made through the process in
[AMENDMENTS.md](AMENDMENTS.md).

**Area** — A governed part of the repository (contracts, backend, frontend,
subgraph, tooling, governance) with an owning role. See
[SUBPROJECTS.md](SUBPROJECTS.md).

**Charter** — The founding document stating the project's purpose, scope, and
authority structure, and the rule for amending itself. See [CHARTER.md](CHARTER.md).

**CODEOWNERS** — The file that designates who is automatically requested to
review changes to a given path. See [CODEOWNERS_POLICY.md](CODEOWNERS_POLICY.md).

**Consensus** — Agreement by the relevant decision-makers without a formal vote.
Consensus is attempted before a vote; a single well-founded objection is not
ignored. See [VOTING.md](VOTING.md).

**Decision record** — The logged outcome of a significant decision, including
the class of change, who decided, and the result. See
[decisions/README.md](decisions/README.md).

**Eligible voter** — An active maintainer entitled to vote when a given vote
opens; inactive or recused maintainers are excluded. See [QUORUM.md](QUORUM.md).

**Embargo** — A period during which the details of a security issue are withheld
from the public, managed by the security response team. See
[roles/SECURITY_TEAM.md](roles/SECURITY_TEAM.md).

**Lazy consensus** — A decision is treated as approved if no maintainer raises a
blocking objection within a stated review window, typically used for routine,
reversible changes. Objections restart the ordinary decision process.

**Maintainer** — A steward of the repository with merge authority and a seat on
the Technical Steering Committee. See [roles/MAINTAINER.md](roles/MAINTAINER.md).

**Majority (simple)** — Approval by more yes than no ballots, abstentions
excluded. See [THRESHOLDS.md](THRESHOLDS.md).

**Material governance change** — A governance-policy change, working-group
charter, or maintainer election/removal, requiring a two-thirds approval. See
[THRESHOLDS.md](THRESHOLDS.md).

**Quorum** — The minimum participation for a vote to be valid: two-thirds of
eligible voters, rounded up. See [QUORUM.md](QUORUM.md).

**Ratification** — Formal confirmation after the fact of an action taken under
emergency powers. See [EMERGENCY_POWERS.md](EMERGENCY_POWERS.md).

**Recusal** — A maintainer's withdrawal from a decision where they have a
material conflict of interest; a recused maintainer is excluded from the count.
See [QUORUM.md](QUORUM.md).

**Reviewer** — A contributor trusted to review changes in an area and give a
review that counts toward the approval requirement. See
[roles/REVIEWER.md](roles/REVIEWER.md).

**RFC (Request for Comments)** — A structured proposal used for larger or
cross-cutting changes before implementation. See [RFC_PROCESS.md](RFC_PROCESS.md).

**Rough consensus** — Consensus judged by the chair (or facilitator) where no
sustained, unresolved objection remains, even if not every participant is
enthusiastic. See [VOTING.md](VOTING.md).

**Sensitive change** — A license or treasury change, requiring three-fourths of
*all* eligible voters. See [THRESHOLDS.md](THRESHOLDS.md).

**SIG (Special Interest Group)** — An ongoing group that sustains an area of
interest (for example accessibility). See [WORKING_GROUPS.md](WORKING_GROUPS.md).

**Steward** — A role holder entrusted with an area's or the project's health
(for example a maintainer); stewardship implies responsibility for the thing,
not ownership of it. See [PRINCIPLES.md](PRINCIPLES.md).

**Supermajority** — An approval threshold above a simple majority — here,
two-thirds (material) or three-fourths (sensitive). See
[THRESHOLDS.md](THRESHOLDS.md).

**Tie-breaking** — The defined method for resolving a deadlocked vote. See
[TIE_BREAKING.md](TIE_BREAKING.md).

**Triager** — A contributor trusted to classify, prioritize, and route issues and
pull requests. See [roles/TRIAGER.md](roles/TRIAGER.md).

**TSC (Technical Steering Committee)** — The project's technical authority,
which is the maintainers acting collectively. See [TSC.md](TSC.md).

**Working group** — A time-bound group formed to deliver a specific outcome. See
[WORKING_GROUPS.md](WORKING_GROUPS.md).
