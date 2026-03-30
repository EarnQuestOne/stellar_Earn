export const QUEUES = {
  NOTIFICATIONS: 'notifications',
  ANALYTICS: 'analytics',
  CLEANUP: 'cleanup',
  SCHEDULED: 'scheduled',
  DEAD_LETTER: 'dead_letter',
  EMAIL: 'email',
  PAYOUTS: 'payouts',
  EXPORTS: 'exports',
  REPORTS: 'reports',
  MAINTENANCE: 'maintenance',
  WEBHOOKS: 'webhooks',
  QUESTS: 'quests',
};

export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
};

export const JOB_QUEUE_CONFIG = {
  [QUEUES.PAYOUTS]: {
    concurrency: 10,
    priority: 'HIGH',
    timeout: 60000,
  },
  [QUEUES.EMAIL]: {
    concurrency: 20,
    priority: 'MEDIUM',
    timeout: 30000,
  },
  [QUEUES.EXPORTS]: {
    concurrency: 5,
    priority: 'MEDIUM',
    timeout: 300000, // 5 minutes
  },
  [QUEUES.REPORTS]: {
    concurrency: 3,
    priority: 'LOW',
    timeout: 600000, // 10 minutes
  },
  [QUEUES.CLEANUP]: {
    concurrency: 2,
    priority: 'LOW',
    timeout: 300000,
  },
  [QUEUES.MAINTENANCE]: {
    concurrency: 1,
    priority: 'LOW',
    timeout: 900000, // 15 minutes
  },
  [QUEUES.WEBHOOKS]: {
    concurrency: 15,
    priority: 'MEDIUM',
    timeout: 30000,
  },
  [QUEUES.ANALYTICS]: {
    concurrency: 5,
    priority: 'LOW',
    timeout: 120000,
  },
  [QUEUES.QUESTS]: {
    concurrency: 10,
    priority: 'MEDIUM',
    timeout: 60000,
  },
  [QUEUES.NOTIFICATIONS]: {
    concurrency: 20,
    priority: 'MEDIUM',
    timeout: 30000,
  },
};
