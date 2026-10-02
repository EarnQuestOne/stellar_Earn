# Dependency Freshness Check

## Overview

The Dependency Freshness Check feature automatically monitors project dependencies and generates periodic reports as GitHub issues. This helps maintain security and stability by identifying outdated dependencies.

## Architecture

### Components

1. **DependencyFreshnessService** (`src/common/services/dependency-freshness.service.ts`)
   - Checks dependency versions against npm registry
   - Generates comprehensive freshness reports
   - Creates GitHub issues with formatted reports

2. **DependencyProcessor** (`src/modules/jobs/processors/dependency.processor.ts`)
   - BullMQ processor for handling dependency freshness check jobs
   - Processes jobs from the maintenance queue

3. **Job Type**: `DEPENDENCY_FRESHNESS_CHECK`
   - Job type: `dependency:freshness-check`
   - Queue: `maintenance`
   - Payload: `DependencyFreshnessCheckPayload`

## Configuration

### Environment Variables

- `GITHUB_TOKEN`: GitHub personal access token for creating issues (required)
- Token needs `repo` scope to create issues in the repository

### Job Schedule

To schedule periodic dependency freshness checks, create a `JobSchedule` record:

```typescript
{
  jobType: 'dependency:freshness-check',
  cronExpression: '0 0 * * 0', // Weekly on Sunday at midnight
  jobPayload: {
    repositoryOwner: 'your-org',
    repositoryName: 'your-repo',
    branch: 'main'
  },
  isActive: true,
  description: 'Weekly dependency freshness check'
}
```

## Usage

### Manual Trigger

```typescript
import { JobsService } from './modules/jobs/jobs.service';

await jobsService.addJob('dependency:freshness-check', {
  repositoryOwner: 'nnennaokoye',
  repositoryName: 'stellar_Earn',
  branch: 'main',
});
```

### Report Format

The generated GitHub issue includes:

- Summary statistics (total dependencies, outdated count)
- List of outdated dependencies with current and latest versions
- Complete dependency table with status indicators
- Automated labels: `dependencies`, `maintenance`, `automated`

## Risk Factors

The current implementation includes placeholder logic for detecting:

- Unusually high payout amounts (>10,000)
- Multiple payouts to same address in 24 hours (>5)
- Failed payout attempts (>2 retries)
- New addresses with no history
- Non-standard asset types

## Future Enhancements

- [ ] Integrate with actual npm registry API
- [ ] Add support for different package managers (yarn, pnpm)
- [ ] Configure severity thresholds
- [ ] Add email notifications for critical updates
- [ ] Support for monorepo dependency analysis
- [ ] Automated PR creation for updates

## Testing

### Unit Tests

```bash
npm test -- dependency-freshness.service.spec.ts
```

### Integration Tests

```bash
npm test -- jobs.e2e-spec.ts
```

## Security Considerations

- GitHub token should be stored securely in environment variables
- Never commit tokens to repository
- Use least-privilege tokens (only `repo` scope needed)
- Consider using GitHub App for production deployments
