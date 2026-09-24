# Code Freeze and Hotfix Policy

A code freeze limits normal change while a release, migration, incident, or
other high-risk event is being stabilized. A freeze is a change-control state,
not a ban on restoring service or addressing security risk.

## Starting and recording a freeze

The release manager or incident commander records the start time, reason,
affected branches or environments, scope of prohibited changes, approver, and
expected review time. The freeze is announced in the project communication
channel and linked from the release or incident record.

During a freeze, normal feature work waits. Documentation, monitoring, and
changes that reduce active risk may proceed when they do not alter the frozen
artifact or are explicitly approved.

## Hotfix eligibility and approval

A hotfix is allowed only when delaying the change would leave users exposed to
an active production defect, security issue, data-integrity risk, or material
release-blocking failure. The requester records the impact, affected scope,
rollback plan, and validation evidence.

The incident commander or release manager approves the hotfix. Security fixes
also require the security owner when available. For an emergency where prior
approval is impossible, the person applying the fix records the reason and
obtains retrospective approval as soon as practical.

## Implementation and rollback

Hotfixes must be the smallest viable change, reviewed by at least one person
who did not author it when circumstances permit, and validated against the
reported failure. Isolate the change on the release branch or the documented
emergency path. Keep a rollback commit or procedure ready before deployment.

## Post-hotfix review and ending the freeze

After deployment, record the result, monitoring window, unresolved risk, and
rollback decision. Within two working days, complete a short review covering
root cause, why the normal process was insufficient, and any follow-up issue.

The release manager or incident commander ends the freeze by recording the end
time, final status, and any deferred work. Unapproved changes made during the
freeze are reviewed as soon as the freeze ends.