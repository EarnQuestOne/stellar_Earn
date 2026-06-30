import { Injectable, Logger } from '@nestjs/common';

export interface DlqAlertPayload {
  /** Original event / job name that failed */
  eventName: string;
  /** Last error message */
  error: string;
  /** Current retry attempt count */
  retryCount: number;
  /** Maximum allowed retries */
  maxRetries: number;
  /** PoisonMessage DB record id */
  poisonMessageId: string;
  /** Original event payload (may be redacted) */
  payload?: unknown;
  /** True when this is the last retry (discard) */
  isFinal: boolean;
}

/**
 * DlqAlertService
 *
 * Centralises alert dispatch for dead-letter queue failures.
 *
 * Currently writes structured log entries that can be scraped by Grafana /
 * CloudWatch / Datadog.  Wire up the optional `sendSlack`, `sendPagerDuty`,
 * or `sendEmail` methods (currently no-ops) once the relevant credentials
 * are available in your environment.
 *
 * All channels can be enabled/disabled via environment variables:
 *   DLQ_ALERT_LOG=true          (default: true)
 *   DLQ_ALERT_SLACK=true        (default: false — set SLACK_WEBHOOK_URL too)
 *   DLQ_ALERT_PAGERDUTY=true    (default: false — set PAGERDUTY_ROUTING_KEY)
 */
@Injectable()
export class DlqAlertService {
  private readonly logger = new Logger(DlqAlertService.name);

  /** Dispatch an alert through every enabled channel. */
  async sendAlert(alert: DlqAlertPayload): Promise<void> {
    const severity = alert.isFinal ? 'CRITICAL' : 'WARNING';

    // Always emit a structured log (parseable by log aggregators)
    this.logAlert(alert, severity);

    // Conditional channels — expand as needed
    if (process.env.DLQ_ALERT_SLACK === 'true') {
      await this.sendSlack(alert, severity).catch((err) =>
        this.logger.error(`Slack alert failed: ${err.message}`),
      );
    }

    if (process.env.DLQ_ALERT_PAGERDUTY === 'true') {
      await this.sendPagerDuty(alert, severity).catch((err) =>
        this.logger.error(`PagerDuty alert failed: ${err.message}`),
      );
    }
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private logAlert(alert: DlqAlertPayload, severity: 'WARNING' | 'CRITICAL'): void {
    const message =
      `[DLQ ${severity}] event="${alert.eventName}" ` +
      `retry=${alert.retryCount}/${alert.maxRetries} ` +
      `poisonMessageId=${alert.poisonMessageId} ` +
      `isFinal=${alert.isFinal} ` +
      `error="${alert.error}"`;

    const structuredContext = {
      dlqAlert: true,
      severity,
      eventName: alert.eventName,
      retryCount: alert.retryCount,
      maxRetries: alert.maxRetries,
      poisonMessageId: alert.poisonMessageId,
      isFinal: alert.isFinal,
      // Redact full payload in logs to avoid PII leakage
      payloadKeys: alert.payload
        ? Object.keys(alert.payload as object)
        : [],
      error: alert.error,
      timestamp: new Date().toISOString(),
    };

    if (alert.isFinal) {
      this.logger.error(message, structuredContext);
    } else {
      this.logger.warn(message, structuredContext);
    }
  }

  /**
   * Send a Slack notification via incoming webhook.
   * Requires env var: SLACK_WEBHOOK_URL
   */
  private async sendSlack(
    alert: DlqAlertPayload,
    severity: 'WARNING' | 'CRITICAL',
  ): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      this.logger.warn('SLACK_WEBHOOK_URL not set; skipping Slack alert');
      return;
    }

    const emoji = alert.isFinal ? '🔴' : '🟡';
    const title = `${emoji} [DLQ ${severity}] ${alert.eventName}`;
    const body = {
      text: title,
      attachments: [
        {
          color: alert.isFinal ? 'danger' : 'warning',
          fields: [
            { title: 'Event', value: alert.eventName, short: true },
            {
              title: 'Retries',
              value: `${alert.retryCount}/${alert.maxRetries}`,
              short: true,
            },
            { title: 'Is Final', value: String(alert.isFinal), short: true },
            {
              title: 'Poison Message ID',
              value: alert.poisonMessageId,
              short: true,
            },
            { title: 'Error', value: alert.error, short: false },
          ],
          footer: `StellarEarn DLQ · ${new Date().toISOString()}`,
        },
      ],
    };

    // Dynamic import to avoid a hard dependency on `axios` in tests
    const { default: axios } = await import('axios');
    await axios.post(webhookUrl, body, { timeout: 5000 });
    this.logger.debug(`Slack alert sent for event "${alert.eventName}"`);
  }

  /**
   * Trigger a PagerDuty incident via the Events API v2.
   * Requires env var: PAGERDUTY_ROUTING_KEY
   */
  private async sendPagerDuty(
    alert: DlqAlertPayload,
    severity: 'WARNING' | 'CRITICAL',
  ): Promise<void> {
    const routingKey = process.env.PAGERDUTY_ROUTING_KEY;
    if (!routingKey) {
      this.logger.warn(
        'PAGERDUTY_ROUTING_KEY not set; skipping PagerDuty alert',
      );
      return;
    }

    const pdSeverity = alert.isFinal ? 'critical' : 'warning';
    const body = {
      routing_key: routingKey,
      event_action: 'trigger',
      payload: {
        summary: `[DLQ ${severity}] ${alert.eventName} — ${alert.error}`,
        severity: pdSeverity,
        source: 'StellarEarn-DLQ',
        custom_details: {
          eventName: alert.eventName,
          retryCount: alert.retryCount,
          maxRetries: alert.maxRetries,
          poisonMessageId: alert.poisonMessageId,
          isFinal: alert.isFinal,
          error: alert.error,
        },
      },
    };

    const { default: axios } = await import('axios');
    await axios.post('https://events.pagerduty.com/v2/enqueue', body, {
      timeout: 5000,
    });
    this.logger.debug(`PagerDuty alert sent for event "${alert.eventName}"`);
  }
}
