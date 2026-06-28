import { jest } from '@jest/globals';

jest.setTimeout(30000);

jest.retryTimes(1, { logErrorsBeforeRetry: true });
