import { initSentry, getSentry } from '../sentry.config';
import * as Sentry from '@sentry/node';

jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
  httpIntegration: jest.fn(() => ({ name: 'Http' })),
}));

describe('Sentry config - lazy loading', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('does not load Sentry when SENTRY_DSN is unset', () => {
    delete process.env.SENTRY_DSN;

    initSentry();

    expect(getSentry()).toBeNull();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('lazy-loads and initializes Sentry when SENTRY_DSN is set', () => {
    process.env.SENTRY_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';

    initSentry();

    const sentry = getSentry();
    expect(sentry).not.toBeNull();
    expect(typeof sentry.captureException).toBe('function');
    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.init.mock.calls[0][0].dsn).toBe(process.env.SENTRY_DSN);
  });
});
