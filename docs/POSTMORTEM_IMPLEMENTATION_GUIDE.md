# Postmortem Module - Implementation Guide

## Overview

The Postmortem module provides a comprehensive system for managing production incident postmortems. It tracks incidents, stores postmortem data, manages action items, and provides analytics on incident patterns.

## Features

✅ **Postmortem Management**

- Create and update postmortems
- Track incident timeline and duration
- Store root cause analysis
- Manage action items
- Track completion status

✅ **Incident Tracking**

- Classify incidents by severity (Critical, High, Medium, Low)
- Track incident metrics (TTD, TTM, TTR)
- Monitor user impact
- Track SLA compliance

✅ **Analytics & Insights**

- View postmortem statistics
- Identify common root causes
- Track action item completion rates
- Find related incidents

✅ **Publishing & Sharing**

- Draft postmortems with approval workflow
- Publish postmortems to the organization
- Track publication status

## Installation & Setup

### 1. Add the Module to AppModule

In `src/app.module.ts`:

```typescript
import { PostmortemModule } from "./modules/postmortems/postmortem.module";

@Module({
  imports: [
    // ... other imports
    PostmortemModule,
  ],
  // ...
})
export class AppModule {}
```

### 2. Run Database Migration

Create a migration to add the postmortems table:

```bash
npm run migration:generate -- -n AddPostmortems
```

This will create the `postmortems` table with all required columns.

Alternatively, use `npm run schema:sync` to auto-sync the schema (not recommended for production).

### 3. Verify Installation

Check that the API endpoint is available:

```bash
curl http://localhost:3000/postmortems
```

You should get a 200 response with an empty list.

## API Endpoints

### Create Postmortem

```
POST /postmortems
Content-Type: application/json

{
  "incidentId": "2024-01-15-1430",
  "title": "Database Connection Pool Exhaustion",
  "summary": "Connection pool exhausted due to long-running queries",
  "incidentDate": "2024-01-15T14:30:00Z",
  "startTime": "2024-01-15T14:30:00Z",
  "endTime": "2024-01-15T14:50:00Z",
  "severity": "high",
  "servicesAffected": ["api", "worker"],
  "usersAffected": 150,
  "failedTransactions": 500,
  "slaBreached": true,
  "incidentCommander": "john@example.com",
  "author": "alice@example.com"
}
```

**Response (201):**

```json
{
  "id": "uuid-here",
  "incidentId": "2024-01-15-1430",
  "title": "Database Connection Pool Exhaustion",
  "severity": "high",
  "status": "draft",
  "durationMinutes": 20,
  "usersAffected": 150,
  "isPublished": false,
  "createdAt": "2024-01-15T16:00:00Z",
  "updatedAt": "2024-01-15T16:00:00Z"
}
```

### Get Postmortem by ID

```
GET /postmortems/{id}
```

### Get Postmortem by Incident ID

```
GET /postmortems/incident/{incidentId}
```

### List Postmortems with Filtering

```
GET /postmortems?severity=high&status=draft&limit=20&offset=0&sortBy=createdAt&sortOrder=DESC
```

**Query Parameters:**

- `severity`: Filter by severity (critical, high, medium, low)
- `status`: Filter by status (draft, in_review, approved, closed)
- `searchTerm`: Search in title, summary, incident ID
- `limit`: Results per page (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)
- `sortBy`: Sort field (createdAt, incidentDate, severity)
- `sortOrder`: ASC or DESC

### Update Postmortem

```
PUT /postmortems/{id}
Content-Type: application/json

{
  "title": "Updated Title",
  "rootCause": "Missing database index on user_sessions table",
  "whatWentWell": ["Team responded quickly"],
  "whatWentWrong": ["No monitoring for this condition"],
  "lessonsLearned": {
    "start": ["Add index monitoring"],
    "stop": [],
    "more": ["Load testing with production data"]
  },
  "status": "approved",
  "facilitator": "bob@example.com",
  "attendees": ["john@example.com", "alice@example.com", "bob@example.com"]
}
```

### Add Action Item

```
POST /postmortems/{id}/action-items
Content-Type: application/json

{
  "action": "Add database index on user_sessions.user_id",
  "owner": "alice@example.com",
  "dueDate": "2024-01-20T00:00:00Z",
  "priority": "P0"
}
```

### Mark Action Item Complete

```
PUT /postmortems/{id}/action-items/{actionItemId}/complete
```

### Get Statistics

```
GET /postmortems/stats
```

**Response:**

```json
{
  "totalPostmortems": 42,
  "byStatus": {
    "draft": 5,
    "in_review": 2,
    "approved": 25,
    "closed": 10
  },
  "bySeverity": {
    "critical": 3,
    "high": 12,
    "medium": 20,
    "low": 7
  },
  "averageTTD": 8,
  "averageTTM": 18,
  "averageTTR": 45,
  "actionItemCompletionRate": 85,
  "mostCommonRootCauses": [
    {
      "cause": "Missing database index",
      "count": 5
    },
    {
      "cause": "Insufficient load testing",
      "count": 4
    }
  ],
  "recentIncidents": [...]
}
```

### Find Related Incidents

```
GET /postmortems/{id}/related
```

Returns up to 5 incidents with similar root causes.

### Publish Postmortem

```
POST /postmortems/{id}/publish
```

Only approved postmortems can be published.

## Workflow Integration

### Typical Postmortem Workflow

```
1. Incident Occurs
   └─> Incident Commander assigned
       └─> Document incident timeline in Slack

2. Create Postmortem (POST /postmortems)
   └─> Status: draft
   └─> Store incident data

3. Postmortem Meeting
   └─> Update with analysis results (PUT /postmortems/{id})
   └─> Add action items (POST /postmortems/{id}/action-items)
   └─> Change status to in_review

4. Review & Approval
   └─> Management review
   └─> Change status to approved

5. Publish (POST /postmortems/{id}/publish)
   └─> Share with organization
   └─> isPublished = true

6. Follow-up
   └─> Track action items
   └─> Mark complete (PUT /postmortems/{id}/action-items/{actionId}/complete)
   └─> Change status to closed when all items done
```

## Database Schema

### postmortems Table

**Key Columns:**

- `id` - UUID primary key
- `incidentId` - Unique identifier (YYYY-MM-DD-HHMM format)
- `title` - Human-readable incident title
- `severity` - critical | high | medium | low
- `status` - draft | in_review | approved | closed
- `rootCause` - Text description of root cause
- `actionItems` - JSON array of action items
- `ttd` - Time to Detection (minutes)
- `ttm` - Time to Mitigation (minutes)
- `ttr` - Time to Resolution (minutes)
- `isPublished` - Boolean, visible to organization
- `createdAt` - Timestamp when postmortem was created
- `updatedAt` - Timestamp of last update

**Indexes:**

- `status, createdAt` - For filtering and sorting
- `severity, createdAt` - For severity filtering
- `incidentDate` - For timeline queries

## Integration Points

### With Incident Management System

```typescript
// When an incident is resolved
const incident = getIncidentFromPagerDuty(incidentId);

const createPostmortemDto = new CreatePostmortemDto({
  incidentId: incident.incidentId,
  title: incident.title,
  severity: incident.severity,
  startTime: incident.startTime,
  endTime: incident.endTime,
  usersAffected: incident.impactedUsers,
  incidentCommander: incident.commander,
});

const postmortem = await postmortemService.create(createPostmortemDto);
```

### With Monitoring/Alerting System

```typescript
// Add TTD from monitoring data
const updateDto = new UpdatePostmortemDto({
  ttd: calculateTTD(alertFiredTime, incidentTime),
  ttm: calculateTTM(mitigationTime, incidentTime),
  ttr: calculateTTR(resolutionTime, incidentTime),
});

await postmortemService.update(postmortemId, updateDto);
```

### With Ticketing System (Jira)

```typescript
// Create Jira tickets for action items
const actionItems = postmortem.actionItems;

actionItems.forEach(async (item) => {
  const jiraTicket = await createJiraTicket({
    summary: item.action,
    assignee: item.owner,
    dueDate: item.dueDate,
    priority: item.priority,
    labels: ["postmortem-action"],
  });

  // Link ticket in postmortem
  item.jiraTicketId = jiraTicket.key;
});

await postmortemService.update(postmortemId, updateDto);
```

### With Slack

```typescript
// Notify when postmortem published
await notifySlack({
  channel: "#incidents",
  text: `Postmortem published for incident ${postmortem.incidentId}`,
  blocks: [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `*Postmortem: ${postmortem.title}*\n` +
          `Severity: ${postmortem.severity}\n` +
          `Root Cause: ${postmortem.rootCause}\n` +
          `<link|View Postmortem>`,
      },
    },
  ],
});
```

## Best Practices

### Incident ID Format

Always use `YYYY-MM-DD-HHMM` format for incident IDs:

```
2024-01-15-1430  // Jan 15, 2024 at 2:30 PM UTC
```

### Root Cause Analysis

Use structured root cause analysis:

```typescript
const updateDto = new UpdatePostmortemDto({
  rootCause: "Missing database index on user_sessions table",
  contributingFactors: [
    "High load from marketing campaign",
    "Insufficient load testing before deployment",
    "Query optimizer chose inefficient plan",
  ],
  technicalExplanation: "Detailed explanation...",
});
```

### Action Items

Be specific and actionable:

```typescript
// Good ❌
{
  action: "Add monitoring",  // Too vague!
  owner: "alice@example.com",
  dueDate: "2024-01-20",
  priority: "P1"
}

// Better ✅
{
  action: "Add CloudWatch alarm for DB connection pool utilization > 80%",
  owner: "alice@example.com",
  dueDate: "2024-01-20",
  priority: "P1"
}
```

### Lessons Learned

Document what went well AND what could improve:

```typescript
const lessonsLearned = {
  start: [
    "Add load testing with production-like data patterns",
    "Implement database query performance monitoring",
  ],
  stop: ["Deploying without running load tests"],
  more: [
    "Post-deployment monitoring for the first 24 hours",
    "Communication about capacity changes",
  ],
};
```

## Monitoring & Alerting

### Key Metrics to Track

1. **Postmortem Coverage**: Percentage of incidents with postmortems
2. **Action Item Completion**: Percentage of action items completed
3. **Time to Postmortem**: Days between incident and postmortem completion
4. **Recurrence Rate**: Percentage of incidents that recur

### Alerting Rules

```
Alert if:
- Postmortem not created within 24 hours of Critical incident
- Action item completion rate < 80%
- Same root cause appears 3+ times in 30 days
```

## Testing

Run unit tests:

```bash
npm run test -- postmortem.service.spec.ts
npm run test -- postmortem.controller.spec.ts
```

Run integration tests:

```bash
npm run test:integration
```

## Troubleshooting

### Postmortem creation fails with "Invalid incident ID format"

**Solution:** Use YYYY-MM-DD-HHMM format for incident ID

```javascript
// Good
incidentId: "2024-01-15-1430";

// Bad
incidentId: "2024-01-15 14:30";
incidentId: "2024/01/15-1430";
```

### Cannot update status to "closed"

**Solution:** Complete all action items first. Each action item must be marked complete before closing the postmortem.

```typescript
// Mark action items as complete
await postmortemService.completeActionItem(postmortemId, "A1");
await postmortemService.completeActionItem(postmortemId, "A2");

// Now can close
await postmortemService.update(postmortemId, {
  status: PostmortemStatus.CLOSED,
});
```

### Cannot publish postmortem

**Solution:** Postmortem must be in APPROVED status first

```typescript
// First approve
await postmortemService.update(postmortemId, {
  status: PostmortemStatus.APPROVED,
});

// Then publish
await postmortemService.publish(postmortemId);
```

## Future Enhancements

- [ ] Email notifications when action items due
- [ ] Slack integration for postmortem updates
- [ ] Automatic linking to Jira tickets
- [ ] AI-powered root cause suggestions
- [ ] Trend analysis and anomaly detection
- [ ] Postmortem templates by incident type
- [ ] Role-based access control (RBAC)
- [ ] Postmortem effectiveness surveys
- [ ] Incident prediction model
- [ ] Automated recommendations based on similar incidents

## References

- [Postmortem Template](../docs/POSTMORTEM_TEMPLATE.md)
- [Postmortem Process](../docs/POSTMORTEM_PROCESS.md)
- [Incident Response Runbook](../docs/INCIDENT_RESPONSE_RUNBOOK.md)

## Support

For issues or questions:

1. Check this implementation guide
2. Review the [Postmortem Template](../docs/POSTMORTEM_TEMPLATE.md)
3. Consult the [Process Guide](../docs/POSTMORTEM_PROCESS.md)
4. Ask the engineering team in #incidents Slack channel
