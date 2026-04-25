import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AppLoggerService } from '../logger/logger.service';
import { MetricsService } from './metrics.service';

export interface AlertRule {
  /** Unique rule identifier */
  name: string;
  /** Human-readable description shown in alert log entries */
  description: string;
  /** Return true when the alert should fire */
  evaluate: () => boolean;
  severity: 'critical' | 'warning' | 'info';
  /** Minimum milliseconds between repeated firings (default: 60 000) */
  cooldownMs?: number;
}

interface AlertState {
  lastFiredAt: number | undefined;
  firingCount: number;
  active: boolean;
}

@Injectable()
export class AlertService implements OnModuleInit, OnModuleDestroy {
  private readonly rules: AlertRule[] = [];
  private readonly state = new Map<string, AlertState>();
  private checkInterval: ReturnType<typeof setInterval> | undefined;

  /** Rolling counters reset every evaluation window (60 s) */
  private windowRequests = 0;
  private windowErrors = 0;

  /** Exponential moving average for p95 latency estimation */
  private emaLatencyMs = 0;

  constructor(
    private readonly logger: AppLoggerService,
    private readonly metrics: MetricsService,
  ) {}

  onModuleInit(): void {
    this.registerDefaultRules();
    this.startPeriodicEvaluation();
    this.logger.log('AlertService initialised', 'AlertService');
  }

  onModuleDestroy(): void {
    if (this.checkInterval) clearInterval(this.checkInterval);
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /** Register a custom alert rule. */
  registerRule(rule: AlertRule): void {
    this.rules.push(rule);
    this.state.set(rule.name, {
      lastFiredAt: undefined,
      firingCount: 0,
      active: false,
    });
    this.logger.log(`Alert rule registered: ${rule.name}`, 'AlertService', {
      severity: rule.severity,
    });
  }

  /**
   * Record a completed HTTP request so the service can evaluate error-rate and
   * latency alert rules.  Call this from the logging interceptor.
   */
  recordRequest(durationMs: number, isError: boolean): void {
    this.windowRequests++;
    if (isError) this.windowErrors++;

    // EMA with α = 0.1 gives a rough p95 approximation for well-behaved distributions
    this.emaLatencyMs = this.emaLatencyMs * 0.9 + durationMs * 0.1;

    // Feed into MetricsService
    this.metrics.incrementCounter('http_requests_total');
    if (isError) this.metrics.incrementCounter('http_errors_total');
    this.metrics.observeHistogram('http_request_duration_ms', durationMs);
  }

  /** Evaluate all rules immediately (also called on a 60-second cadence). */
  evaluateAll(): void {
    for (const rule of this.rules) {
      try {
        const firing = rule.evaluate();
        if (firing) {
          this.fire(rule);
        } else {
          this.resolve(rule);
        }
      } catch (err) {
        this.logger.warn(
          `Alert rule evaluation threw: ${rule.name}`,
          'AlertService',
          { error: err instanceof Error ? err.message : String(err) },
        );
      }
    }
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private fire(rule: AlertRule): void {
    const s = this.state.get(rule.name)!;
    const now = Date.now();
    const cooldown = rule.cooldownMs ?? 60_000;

    if (s.lastFiredAt !== undefined && now - s.lastFiredAt < cooldown) return;

    s.lastFiredAt = now;
    s.firingCount++;
    s.active = true;

    const meta = {
      alertName: rule.name,
      severity: rule.severity,
      description: rule.description,
      firingCount: s.firingCount,
    };

    switch (rule.severity) {
      case 'critical':
        this.logger.error(`ALERT FIRING [critical]: ${rule.name}`, undefined, 'AlertService', meta);
        break;
      case 'warning':
        this.logger.warn(`ALERT FIRING [warning]: ${rule.name}`, 'AlertService', meta);
        break;
      default:
        this.logger.log(`ALERT FIRING [info]: ${rule.name}`, 'AlertService', meta);
    }
  }

  private resolve(rule: AlertRule): void {
    const s = this.state.get(rule.name)!;
    if (!s.active) return;
    s.active = false;
    s.firingCount = 0;
    this.logger.log(`ALERT RESOLVED: ${rule.name}`, 'AlertService', {
      alertName: rule.name,
      severity: rule.severity,
    });
  }

  private registerDefaultRules(): void {
    // ── Error rate > 10 % ──────────────────────────────────────────────────
    this.registerRule({
      name: 'high_error_rate',
      description: 'HTTP error rate exceeds 10 % over the last 60-second window',
      severity: 'critical',
      cooldownMs: 120_000,
      evaluate: () => {
        if (this.windowRequests < 10) return false;
        return this.windowErrors / this.windowRequests > 0.1;
      },
    });

    // ── p95 latency > 2 s ─────────────────────────────────────────────────
    this.registerRule({
      name: 'high_p95_latency',
      description: 'Estimated p95 request latency exceeds 2 000 ms',
      severity: 'warning',
      cooldownMs: 60_000,
      evaluate: () => this.windowRequests > 5 && this.emaLatencyMs > 2_000,
    });

    // ── Heap usage > 900 MB ───────────────────────────────────────────────
    this.registerRule({
      name: 'high_heap_usage',
      description: 'Node.js heap used exceeds 900 MB',
      severity: 'warning',
      cooldownMs: 300_000,
      evaluate: () => process.memoryUsage().heapUsed > 900 * 1024 * 1024,
    });
  }

  private startPeriodicEvaluation(): void {
    this.checkInterval = setInterval(() => {
      this.evaluateAll();
      // Reset rolling window counters
      this.windowRequests = 0;
      this.windowErrors = 0;
    }, 60_000);

    this.checkInterval.unref();
  }
}
