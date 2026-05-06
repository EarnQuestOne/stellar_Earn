#!/usr/bin/env ts-node

/**
 * Script to check for circular dependencies in the NestJS application
 * 
 * This script attempts to import all modules and reports any circular dependency errors
 */

import { Logger } from '@nestjs/common';

const logger = new Logger('CircularDependencyChecker');

async function checkCircularDependencies() {
  logger.log('Starting circular dependency check...');
  
  const modules = [
    'app.module',
    'modules/auth/auth.module',
    'modules/users/users.module',
    'modules/quests/quests.module',
    'modules/submissions/submissions.module',
    'modules/payouts/payouts.module',
    'modules/notifications/notifications.module',
    'modules/jobs/jobs.module',
    'modules/email/email.module',
    'modules/moderation/moderation.module',
    'modules/webhooks/webhooks.module',
    'modules/websocket/websocket.module',
    'modules/analytics/analytics.module',
    'modules/cache/cache.module',
    'modules/health/health.module',
    'events/events.module',
  ];

  let hasErrors = false;

  for (const modulePath of modules) {
    try {
      logger.log(`Checking ${modulePath}...`);
      await import(`../src/${modulePath}`);
      logger.log(`✓ ${modulePath} - OK`);
    } catch (error) {
      hasErrors = true;
      if (error.message && error.message.includes('circular')) {
        logger.error(`✗ ${modulePath} - CIRCULAR DEPENDENCY DETECTED`);
        logger.error(error.message);
      } else {
        logger.error(`✗ ${modulePath} - ERROR: ${error.message}`);
      }
    }
  }

  if (hasErrors) {
    logger.error('\n❌ Circular dependencies or import errors detected!');
    process.exit(1);
  } else {
    logger.log('\n✅ No circular dependencies detected!');
    process.exit(0);
  }
}

checkCircularDependencies().catch((error) => {
  logger.error('Fatal error during check:', error);
  process.exit(1);
});
