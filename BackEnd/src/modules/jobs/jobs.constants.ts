export const QUEUES = {
  NOTIFICATIONS: 'notifications',
  ANALYTICS: 'analytics',
  CLEANUP: 'cleanup',
  SCHEDULED: 'scheduled',
  DEAD_LETTER: 'dead_letter',
  EMAIL: 'email',
};

export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
};
