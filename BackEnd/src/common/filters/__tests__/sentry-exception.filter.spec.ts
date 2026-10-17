import {
  ArgumentsHost,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request } from 'express';
import { SentryExceptionFilter } from '../sentry-exception.filter';
import { getSentry } from '../../../config/sentry.config';

jest.mock('../../../config/sentry.config', () => ({
  getSentry: jest.fn(),
}));

const mockedGetSentry = getSentry as jest.Mock;

describe('SentryExceptionFilter - lazy Sentry', () => {
  let filter: SentryExceptionFilter;
  let mockArgumentsHost: ArgumentsHost;
  let sentryStub: { addBreadcrumb: jest.Mock; captureException: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    filter = new SentryExceptionFilter();

    const mockRequest: Partial<Request> = {
      method: 'GET',
      originalUrl: '/api/test',
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as any;

    sentryStub = {
      addBreadcrumb: jest.fn(),
      captureException: jest.fn(),
    };
  });

  it('re-throws and does not touch Sentry when it is disabled', () => {
    mockedGetSentry.mockReturnValue(null);
    const error = new Error('boom');

    expect(() => filter.catch(error, mockArgumentsHost)).toThrow(error);
  });

  it('captures unexpected (5xx) errors when Sentry is enabled', () => {
    mockedGetSentry.mockReturnValue(sentryStub);
    const error = new InternalServerErrorException('db down');

    expect(() => filter.catch(error, mockArgumentsHost)).toThrow(error);
    expect(sentryStub.addBreadcrumb).toHaveBeenCalledTimes(1);
    expect(sentryStub.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        extra: expect.objectContaining({ statusCode: 500 }),
      }),
    );
  });

  it('does not capture expected 4xx errors even when Sentry is enabled', () => {
    mockedGetSentry.mockReturnValue(sentryStub);
    const error = new BadRequestException('bad input');

    expect(() => filter.catch(error, mockArgumentsHost)).toThrow(error);
    expect(sentryStub.captureException).not.toHaveBeenCalled();
  });
});
