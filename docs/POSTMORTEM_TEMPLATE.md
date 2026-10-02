# Production Incident Postmortem Template

**Incident ID:** [YYYY-MM-DD-HHMM]  
**Date of Incident:** [Date and Time UTC]  
**Date of Postmortem:** [Date]  
**Postmortem Author(s):** [Names]  
**Attendees:** [Names of those who attended]

## Executive Summary

### Incident Overview

**Duration:** [HH:MM UTC] - [HH:MM UTC] (XX minutes of impact)  
**Severity:** [Critical/High/Medium/Low]  
**Status:** [Resolved/Mitigated/Under Investigation]  
**Services Affected:** [List of services]  
**Impact:**

- **Users Affected:** [Number and percentage]
- **Transactions/Requests Failed:** [Number]
- **Data Loss:** [Yes/No - if yes, describe]
- **SLA Breach:** [Yes/No - describe]

### Root Cause (Summary)

[One sentence summary of what caused the incident]

### What Went Well

- [Thing that worked well #1]
- [Thing that worked well #2]
- [Thing that worked well #3]

### What Went Wrong

- [Issue #1]
- [Issue #2]
- [Issue #3]

### Key Metrics

- **Time to Detection (TTD):** [Minutes]
- **Time to Mitigation (TTM):** [Minutes]
- **Time to Resolution (TTR):** [Minutes]

---

## Incident Timeline

| Time (UTC) | Event                         | Status                              |
| ---------- | ----------------------------- | ----------------------------------- |
| HH:MM      | [Description of event]        | [Investigating/Mitigating/Resolved] |
| HH:MM      | [Description of event]        | [Investigating/Mitigating/Resolved] |
| HH:MM      | [Description of event]        | [Investigating/Mitigating/Resolved] |
| HH:MM      | [Root cause identified]       | [Investigating/Mitigating/Resolved] |
| HH:MM      | [Mitigation implemented]      | [Investigating/Mitigating/Resolved] |
| HH:MM      | [Service restored]            | [Investigating/Mitigating/Resolved] |
| HH:MM      | [All clear/monitoring normal] | [Resolved]                          |

---

## Incident Details

### Detection and Alert

#### How was the incident detected?

- [ ] Automated monitoring/alert
- [ ] Customer report
- [ ] Team member
- [ ] Other: [describe]

**Detection Method Details:**  
[Describe how the issue was first identified, which alerts fired, what metrics showed abnormality]

**Monitoring Gaps (if any):**  
[Was there a gap in monitoring that delayed detection? How long would this have gone undetected?]

### Initial Impact Assessment

**What was the initial problem diagnosis?**  
[Initial symptoms and suspected causes]

**Who was notified and in what order?**  
[On-call engineer → Team lead → Management → Customer communications team]

**Customer Communications:**

- [ ] Issue notified to customers
- [ ] Status updates provided
- [ ] Root cause communicated
- Timeline: [When and how customers were notified]

### Root Cause Analysis

#### What was the root cause?

**Primary Root Cause:**  
[Clear description of the fundamental cause]

**Contributing Factors:**

1. [Contributing factor #1]
2. [Contributing factor #2]
3. [Contributing factor #3]

#### Why did this happen?

**Technical Explanation:**  
[Detailed technical explanation of what occurred and why]

**Code/Configuration Changes:**  
[If applicable, what recent changes contributed to this?]

```
[Code snippet or configuration that caused the issue, if relevant]
```

**Environmental Factors:**  
[Load conditions, traffic patterns, database state, etc.]

**Process Failures:**  
[Were there process gaps? Code review gaps? Testing gaps?]

#### Why wasn't this caught earlier?

- [ ] No test coverage
- [ ] Test was not comprehensive enough
- [ ] Change was not code reviewed
- [ ] Monitoring gap
- [ ] Assumption that this couldn't happen
- [ ] Other: [describe]

---

## Incident Response

### Immediate Mitigation

**What actions were taken to mitigate the incident?**

1. [Action #1] - Completed at HH:MM UTC
2. [Action #2] - Completed at HH:MM UTC
3. [Action #3] - Completed at HH:MM UTC

**Effectiveness of Mitigation:**  
[Did it work immediately? Partially? Did we need to try other approaches?]

**Workarounds Applied (if any):**  
[Any manual workarounds or temporary fixes?]

### Recovery Steps

**What was required to fully resolve the issue?**

1. [Step #1]
2. [Step #2]
3. [Step #3]

**Validation:**  
[How did we verify the fix worked?]

**Data Recovery (if applicable):**  
[Was any data recovery needed? What was recovered and how?]

### Communication During Incident

**Internal Communication:**

- Incident declared in: [Slack channel, Incident tool, etc.]
- Status updates frequency: [Every X minutes]
- Handoffs: [How was information passed between teams?]

**External Communication:**

- Customer notification sent at: [Time]
- Status page updated: [Yes/No]
- Follow-up communications: [When and what was shared?]

---

## Impact Assessment

### Quantified Impact

**Availability Impact:**

- Services affected: [List]
- Error rate increase: [X% → Y%]
- Uptime: [99.XX% - SLA is 99.XX%]
- SLA status: [Breached/Not breached]

**Performance Impact:**

- Latency increase: [Xms → Yms]
- Throughput decrease: [X req/s → Y req/s]
- Database query times: [Increased/Decreased by X%]

**User Impact:**

- Failed transactions: [Number]
- Users unable to complete actions: [Number]
- Features unavailable: [List]

**Financial Impact:**

- Estimated revenue loss: [$X]
- Customer refunds issued: [$X]
- Costs to remediate: [$X]

**Data Impact:**

- Records affected: [Number]
- Data loss: [Yes/No - if yes, describe]
- Data integrity issues: [Describe]

---

## Lessons Learned

### What Should We Do More Of?

- [Item #1 - What worked well that we should expand]
- [Item #2]
- [Item #3]

### What Should We Do Less Of?

- [Item #1 - What didn't work well]
- [Item #2]
- [Item #3]

### What Should We Stop Doing?

- [Item #1 - What is no longer serving us]
- [Item #2]

### What Should We Start Doing?

- [Item #1 - New practice or process]
- [Item #2]
- [Item #3]

---

## Action Items (Prevention & Process Improvements)

### Immediate Actions (Days)

| ID  | Action              | Owner  | Due Date | Priority    |
| --- | ------------------- | ------ | -------- | ----------- |
| A1  | [Brief description] | [Name] | [Date]   | P0/P1/P2/P3 |
| A2  | [Brief description] | [Name] | [Date]   | P0/P1/P2/P3 |

### Short-term Actions (1-2 weeks)

| ID  | Action              | Owner  | Due Date | Priority    |
| --- | ------------------- | ------ | -------- | ----------- |
| A3  | [Brief description] | [Name] | [Date]   | P0/P1/P2/P3 |
| A4  | [Brief description] | [Name] | [Date]   | P0/P1/P2/P3 |

### Long-term Actions (1-3 months)

| ID  | Action              | Owner  | Due Date | Priority    |
| --- | ------------------- | ------ | -------- | ----------- |
| A5  | [Brief description] | [Name] | [Date]   | P0/P1/P2/P3 |
| A6  | [Brief description] | [Name] | [Date]   | P0/P1/P2/P3 |

### Engineering Improvements

- [ ] Improve monitoring/alerting
  - [ ] Add new metrics
  - [ ] Improve alert thresholds
  - [ ] Add alert for specific conditions

- [ ] Improve testing
  - [ ] Add unit tests
  - [ ] Add integration tests
  - [ ] Add load tests
  - [ ] Add chaos engineering tests

- [ ] Improve code quality
  - [ ] Code review process
  - [ ] Static analysis
  - [ ] Type checking

- [ ] Improve documentation
  - [ ] Runbook updates
  - [ ] Architecture documentation
  - [ ] Operational procedures

- [ ] Improve process
  - [ ] Deployment process
  - [ ] Change management
  - [ ] On-call procedures
  - [ ] Incident response procedures

### Process/Process Improvements

- [Improvement #1]
- [Improvement #2]
- [Improvement #3]

---

## References & Resources

### Related Documentation

- [Runbook for this service](link)
- [Architecture documentation](link)
- [Previous similar incidents](link)

### Tools & Systems Involved

- Monitoring system: [Name/version]
- Logging system: [Name/version]
- Alerting system: [Name/version]
- Incident management: [Tool]

### External References

- [GitHub issue/PR if applicable](link)
- [Slack thread/archive](link)
- [Metrics dashboard](link)

---

## Sign-off

| Role               | Name   | Date   | Signature |
| ------------------ | ------ | ------ | --------- |
| Incident Commander | [Name] | [Date] |           |
| Service Owner      | [Name] | [Date] |           |
| Engineering Lead   | [Name] | [Date] |           |
| Management         | [Name] | [Date] |           |

---

## Follow-up

**Postmortem Status:** [Draft/Review/Approved/Closed]

**Follow-up Date for Incomplete Action Items:** [Date]

**Lessons Learned Database:** [Link to internal KB where this is recorded]

---

## Appendix

### A. Detailed Technical Analysis

[Include detailed logs, error traces, database queries, etc.]

### B. Monitoring/Alert History

[Include screenshots of monitoring dashboards during incident]

### C. Configuration Changes

[Any relevant configuration changes made]

### D. Performance Data

[Metrics and performance data during the incident]

### E. Customer Impact Details

[Detailed list of affected customers, if applicable]

### F. Communication Log

[Full record of communications sent during incident]
