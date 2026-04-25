import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

export type LabelMap = Record<string, string>;

interface CounterMetric {
  type: 'counter';
  help: string;
  values: Map<string, number>;
}

interface GaugeMetric {
  type: 'gauge';
  help: string;
  values: Map<string, number>;
}

interface HistogramMetric {
  type: 'histogram';
  help: string;
  buckets: number[];
  data: Map<string, { bucketCounts: number[]; sum: number; count: number }>;
}

type Metric = CounterMetric | GaugeMetric | HistogramMetric;

const DEFAULT_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly registry = new Map<string, Metric>();
  private readonly startTime = Date.now();
  private systemInterval: ReturnType<typeof setInterval> | undefined;

  onModuleInit(): void {
    this.registerBuiltins();
    this.startSystemCollection();
  }

  onModuleDestroy(): void {
    if (this.systemInterval) clearInterval(this.systemInterval);
  }

  // ─── Registration ──────────────────────────────────────────────────────────

  registerCounter(name: string, help: string): void {
    if (!this.registry.has(name)) {
      this.registry.set(name, { type: 'counter', help, values: new Map() });
    }
  }

  registerGauge(name: string, help: string): void {
    if (!this.registry.has(name)) {
      this.registry.set(name, { type: 'gauge', help, values: new Map() });
    }
  }

  registerHistogram(name: string, help: string, buckets = DEFAULT_BUCKETS): void {
    if (!this.registry.has(name)) {
      this.registry.set(name, { type: 'histogram', help, buckets, data: new Map() });
    }
  }

  // ─── Mutations ─────────────────────────────────────────────────────────────

  incrementCounter(name: string, labels: LabelMap = {}, by = 1): void {
    const m = this.registry.get(name);
    if (!m || m.type !== 'counter') return;
    const key = this.labelKey(labels);
    m.values.set(key, (m.values.get(key) ?? 0) + by);
  }

  setGauge(name: string, value: number, labels: LabelMap = {}): void {
    const m = this.registry.get(name);
    if (!m || m.type !== 'gauge') return;
    m.values.set(this.labelKey(labels), value);
  }

  observeHistogram(name: string, value: number, labels: LabelMap = {}): void {
    const m = this.registry.get(name);
    if (!m || m.type !== 'histogram') return;
    const key = this.labelKey(labels);
    if (!m.data.has(key)) {
      m.data.set(key, {
        bucketCounts: new Array<number>(m.buckets.length).fill(0),
        sum: 0,
        count: 0,
      });
    }
    const entry = m.data.get(key)!;
    entry.sum += value;
    entry.count += 1;
    for (let i = 0; i < m.buckets.length; i++) {
      if (value <= m.buckets[i]) entry.bucketCounts[i]++;
    }
  }

  // ─── Export ────────────────────────────────────────────────────────────────

  /** Prometheus text exposition format (for scraping by Prometheus/Grafana). */
  getPrometheusOutput(): string {
    const lines: string[] = [];

    for (const [name, metric] of this.registry) {
      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} ${metric.type}`);

      if (metric.type === 'counter' || metric.type === 'gauge') {
        for (const [labelStr, value] of metric.values) {
          lines.push(`${name}${labelStr ? `{${labelStr}}` : ''} ${value}`);
        }
      } else if (metric.type === 'histogram') {
        for (const [labelStr, entry] of metric.data) {
          const base = labelStr ? `,${labelStr}` : '';
          let cumulative = 0;
          for (let i = 0; i < metric.buckets.length; i++) {
            cumulative += entry.bucketCounts[i];
            lines.push(
              `${name}_bucket{le="${metric.buckets[i]}"${base}} ${cumulative}`,
            );
          }
          lines.push(`${name}_bucket{le="+Inf"${base}} ${entry.count}`);
          lines.push(
            `${name}_sum${labelStr ? `{${labelStr}}` : ''} ${entry.sum}`,
          );
          lines.push(
            `${name}_count${labelStr ? `{${labelStr}}` : ''} ${entry.count}`,
          );
        }
      }
    }

    return lines.join('\n') + '\n';
  }

  /** JSON snapshot suitable for a monitoring dashboard. */
  getSnapshot(): Record<string, unknown> {
    const mem = process.memoryUsage();
    const snapshot: Record<string, unknown> = {
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
      process: {
        pid: process.pid,
        memory: {
          rss_bytes: mem.rss,
          heap_used_bytes: mem.heapUsed,
          heap_total_bytes: mem.heapTotal,
          external_bytes: mem.external,
        },
        uptime_seconds: Math.floor(process.uptime()),
      },
      metrics: {} as Record<string, unknown>,
    };

    for (const [name, metric] of this.registry) {
      if (metric.type === 'counter' || metric.type === 'gauge') {
        (snapshot.metrics as Record<string, unknown>)[name] = Object.fromEntries(
          metric.values,
        );
      } else if (metric.type === 'histogram') {
        const histData: Record<string, unknown> = {};
        for (const [labelStr, entry] of metric.data) {
          histData[labelStr || '_total'] = {
            count: entry.count,
            sum: entry.sum,
            avg: entry.count > 0 ? Math.round((entry.sum / entry.count) * 100) / 100 : 0,
          };
        }
        (snapshot.metrics as Record<string, unknown>)[name] = histData;
      }
    }

    return snapshot;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private labelKey(labels: LabelMap): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }

  private registerBuiltins(): void {
    this.registerCounter('http_requests_total', 'Total HTTP requests received');
    this.registerCounter('http_errors_total', 'Total HTTP responses with 4xx/5xx status');
    this.registerHistogram(
      'http_request_duration_ms',
      'HTTP request latency in milliseconds',
    );
    this.registerGauge('process_memory_rss_bytes', 'Process RSS memory in bytes');
    this.registerGauge('nodejs_heap_used_bytes', 'Node.js heap used in bytes');
    this.registerGauge('process_uptime_seconds', 'Application uptime in seconds');
    this.registerCounter('auth_attempts_total', 'Total authentication attempts');
    this.registerCounter('auth_failures_total', 'Total failed authentication attempts');
  }

  private startSystemCollection(): void {
    const collect = () => {
      const mem = process.memoryUsage();
      this.setGauge('process_memory_rss_bytes', mem.rss);
      this.setGauge('nodejs_heap_used_bytes', mem.heapUsed);
      this.setGauge('process_uptime_seconds', Math.floor(process.uptime()));
    };

    collect();
    this.systemInterval = setInterval(collect, 15_000);
    this.systemInterval.unref();
  }
}
