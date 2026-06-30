import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DlqAlertService, DlqAlertPayload } from 'src/events/services/dlq-alert.service';

const makeAlert = (overrides: Partial<DlqAlertPayload> = {}): DlqAlertPayload => ({
  eventName: 'quest.completed',
  error: 'Connection timed out',
  retryCount: 1,
  maxRetries: 3,
  poisonMessageId: 'pm-abc',
  payload: { questId: 'q-1' },
  isFinal: false,
  ...overrides,
});

describe('DlqAlertService', () => {
  let service: DlqAlertService;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DlqAlertService],
    }).compile();

    service = module.get<DlqAlertService>(DlqAlertService);

    // Spy on logger methods via the Logger prototype
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.DLQ_ALERT_SLACK;
    delete process.env.DLQ_ALERT_PAGERDUTY;
    delete process.env.SLACK_WEBHOOK_URL;
    delete process.env.PAGERDUTY_ROUTING_KEY;
  });

  describe('sendAlert()', () => {
    it('should emit a WARN log for non-final alerts', async () => {
      await service.sendAlert(makeAlert({ isFinal: false }));
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DLQ WARNING]'),
        expect.any(Object),
      );
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should emit an ERROR log for final (discard) alerts', async () => {
      await service.sendAlert(makeAlert({ isFinal: true }));
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DLQ CRITICAL]'),
        expect.any(Object),
      );
    });

    it('should include eventName and poisonMessageId in the log message', async () => {
      await service.sendAlert(makeAlert({ eventName: 'payout.failed', poisonMessageId: 'pm-xyz' }));
      const logMsg: string = loggerWarnSpy.mock.calls[0][0];
      expect(logMsg).toContain('payout.failed');
      expect(logMsg).toContain('pm-xyz');
    });

    it('should include retryCount in the structured log context', async () => {
      await service.sendAlert(makeAlert({ retryCount: 2 }));
      const context = loggerWarnSpy.mock.calls[0][1];
      expect(context.retryCount).toBe(2);
    });

    it('should NOT call sendSlack when DLQ_ALERT_SLACK is not true', async () => {
      const slackSpy = jest
        .spyOn(service as any, 'sendSlack')
        .mockResolvedValue(undefined);

      await service.sendAlert(makeAlert());
      expect(slackSpy).not.toHaveBeenCalled();
    });

    it('should call sendSlack when DLQ_ALERT_SLACK=true', async () => {
      process.env.DLQ_ALERT_SLACK = 'true';
      const slackSpy = jest
        .spyOn(service as any, 'sendSlack')
        .mockResolvedValue(undefined);

      await service.sendAlert(makeAlert());
      expect(slackSpy).toHaveBeenCalled();
    });

    it('should call sendPagerDuty when DLQ_ALERT_PAGERDUTY=true', async () => {
      process.env.DLQ_ALERT_PAGERDUTY = 'true';
      const pdSpy = jest
        .spyOn(service as any, 'sendPagerDuty')
        .mockResolvedValue(undefined);

      await service.sendAlert(makeAlert());
      expect(pdSpy).toHaveBeenCalled();
    });

    it('should log a warning (not throw) if Slack errors', async () => {
      process.env.DLQ_ALERT_SLACK = 'true';
      jest
        .spyOn(service as any, 'sendSlack')
        .mockRejectedValue(new Error('network error'));

      // Should not throw
      await expect(service.sendAlert(makeAlert())).resolves.toBeUndefined();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slack alert failed'),
      );
    });

    it('should log a warning (not throw) if PagerDuty errors', async () => {
      process.env.DLQ_ALERT_PAGERDUTY = 'true';
      jest
        .spyOn(service as any, 'sendPagerDuty')
        .mockRejectedValue(new Error('pd error'));

      await expect(service.sendAlert(makeAlert())).resolves.toBeUndefined();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('PagerDuty alert failed'),
      );
    });
  });

  describe('sendSlack() (private)', () => {
    it('should warn and return early when SLACK_WEBHOOK_URL is not set', async () => {
      await (service as any).sendSlack(makeAlert(), 'WARNING');
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('SLACK_WEBHOOK_URL not set'),
      );
    });
  });

  describe('sendPagerDuty() (private)', () => {
    it('should warn and return early when PAGERDUTY_ROUTING_KEY is not set', async () => {
      await (service as any).sendPagerDuty(makeAlert(), 'CRITICAL');
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('PAGERDUTY_ROUTING_KEY not set'),
      );
    });
  });
});
