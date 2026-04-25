# Integration Tests

This directory contains integration tests that verify the interaction between multiple modules in the Stellar Earn application.

## Overview

Integration tests ensure that different parts of the application work together correctly. Unlike unit tests that test individual services in isolation, integration tests verify:

- Cross-module communication
- Data flow between services
- Event propagation
- Database relationships
- Complete user workflows

## Test Structure

### Test Files

- `auth-users.integration-spec.ts` - Tests authentication and user management integration
- `quests-submissions.integration-spec.ts` - Tests quest creation and submission workflow
- `payouts-stellar.integration-spec.ts` - Tests reward distribution and Stellar integration
- `analytics-cache.integration-spec.ts` - Tests analytics data caching and performance optimization
- `email-notifications.integration-spec.ts` - Tests email delivery and notification preferences
- `jobs-webhooks.integration-spec.ts` - Tests background job processing and webhook notifications
- `moderation-health.integration-spec.ts` - Tests content moderation and system health monitoring
- `full-application.integration-spec.ts` - Tests complete user journeys across all modules

### Test Configuration

- `jest-integration.json` - Jest configuration for integration tests
- `setup-integration-env.ts` - Global setup for integration test environment
- `setup-integration-afterenv.ts` - Post-environment setup with test utilities

## Running Integration Tests

### Prerequisites

1. Ensure PostgreSQL is running
2. Create a test database: `stellar_earn_test_integration`
3. Copy `.env.test` from `.env.example` and configure test database settings

### Commands

```bash
# Run all integration tests
npm run test:integration

# Run specific test file
npm run test:integration -- auth-users.integration-spec.ts

# Run with coverage
npm run test:integration -- --coverage

# Run in watch mode
npm run test:integration -- --watch
```

## Test Database

Integration tests use a separate database (`stellar_earn_test_integration`) to avoid interfering with development data. The database is:

- Dropped and recreated before each test run
- Synchronized with entities automatically
- Isolated from other test environments

## Test Coverage

Integration tests cover:

### Auth-Users Integration
- User registration through authentication flow
- Token generation and validation
- User profile updates with auth context
- Login count tracking

### Quests-Submissions Integration
- Quest creation and user submission workflow
- Submission status changes and quest completion
- Duplicate submission prevention
- Event emission for submission updates

### Payouts-Stellar Integration
- Payout creation and processing workflow
- Stellar address validation
- Reward distribution to multiple users
- Error handling for failed transactions

### Analytics-Cache Integration
- Analytics data caching and cache invalidation
- Performance optimization through caching
- Cache hit/miss ratio tracking
- Bulk cache operations for analytics data

### Email-Notifications Integration
- Notification creation and email delivery
- User email preferences and filtering
- Bulk notification processing
- Email delivery failure handling

### Jobs-Webhooks Integration
- Background job processing with webhook notifications
- Job completion and failure webhook triggers
- Scheduled jobs and retry logic
- Bulk job processing and batched notifications

### Moderation-Health Integration
- Content moderation workflow and health monitoring
- Moderation queue processing under load
- System health checks for moderation services
- Content escalation and performance monitoring

### Full Application Integration
- Complete user journey from registration to payout
- Concurrent user operations
- Cross-module event propagation
- Data consistency across all modules

## Best Practices

### Test Isolation
- Each test cleans up data before/after execution
- Tests use unique identifiers to avoid conflicts
- Database is reset between test runs

### Realistic Scenarios
- Tests simulate real user workflows
- Include error conditions and edge cases
- Verify data integrity across module boundaries

### Performance
- Tests run with extended timeouts (60 seconds)
- Single worker to avoid database conflicts
- Focused on integration logic, not performance benchmarks

## Debugging

### Common Issues

1. **Database Connection Errors**
   - Ensure PostgreSQL is running
   - Verify `.env.test` configuration
   - Check database permissions

2. **Timeout Errors**
   - Integration tests may take longer due to database operations
   - Increase timeout in `jest-integration.json` if needed

3. **Module Import Errors**
   - Ensure all required modules are imported in test setup
   - Check for circular dependencies

### Debugging Commands

```bash
# Run with verbose output
npm run test:integration -- --verbose

# Run single test with debug
npm run test:integration -- --testNamePattern="should handle full user journey"

# Debug database state
npm run test:integration -- --testNamePattern="debug" (add debug tests as needed)
```

## Maintenance

### Adding New Integration Tests

1. Create new `.integration-spec.ts` file
2. Import required modules and services
3. Set up test module with necessary imports
4. Follow existing patterns for data cleanup
5. Add appropriate test cases for cross-module interactions

### Updating Test Configuration

- Modify `jest-integration.json` for Jest settings
- Update setup files for global test utilities
- Adjust database configuration as needed

## Related Documentation

- [Unit Testing Guide](../UNIT_TESTING_GUIDE.md)
- [E2E Testing Guide](../E2E_FLAKINESS_FIX.md)
- [Test Setup Guide](../TEST_SETUP.md)