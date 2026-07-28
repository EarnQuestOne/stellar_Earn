import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MemorySnapshot,
  CpuSnapshot,
  ResourceSnapshot,
  ResourceLimitsConfig,
  ResourceViolation,
} from './process-resource.types';

const MB = 1024 * 1024;

@Injectable()
export class ResourceLimitsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ResourceLimitsService.name);
  private config!: ResourceLimitsConfig;
  private intervalHandle: ReturnType<typeof setInterval> | undefined;
  private lastCpuUsage = process.cpuUsage();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.config = this.loadConfig();
    this.logger.log(
      `Resource limits active — heap warn: ${this.config.maxHeapUsedMb * (this.config.heapWarningPercent / 100)} MB, ` +
        `heap critical: ${this.config.maxHeapUsedMb * (this.config.heapCriticalPercent / 100)} MB, ` +
        `max RSS: ${this.config.maxRssMb} MB`,
    );
    this.startMonitoring();
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) clearInterval(this.intervalHandle);
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  getSnapshot(): ResourceSnapshot {
    const mem = this.getMemorySnapshot();
    const cpu = this.getCpuSnapshot();
    const violations = this.evaluateViolations(mem);

    return {
      timestamp: new Date().toISOString(),
      pid: process.pid,
      uptime: Math.floor(process.uptime()),
      memory: mem,
      cpu,
      limits: this.config,
      violations,
    };
  }

  getMemorySnapshot(): MemorySnapshot {
    const m = process.memoryUsage();
    return {
      rss: m.rss,
      heapUsed: m.heapUsed,
      heapTotal: m.heapTotal,
      external: m.external,
      arrayBuffers: m.arrayBuffers,
      heapUsedPercent:
        this.config ? Math.round((m.heapUsed / (this.config.maxHeapUsedMb * MB)) * 100) : 0,
    };
  }

  getCpuSnapshot(): CpuSnapshot {
    const usage = process.cpuUsage();
    const delta: CpuSnapshot = {
      user: usage.user - this.lastCpuUsage.user,
      system: usage.system - this.lastCpuUsage.system,
    };
    this.lastCpuUsage = usage;
    return delta;
  }

  triggerGc(): { triggered: boolean; message: string } {
    if (typeof global.gc === 'function') {
      const before = process.memoryUsage().heapUsed;
      global.gc();
      const after = process.memoryUsage().heapUsed;
      const freed = Math.round((before - after) / MB);
      this.logger.log(`Manual GC triggered — freed ~${freed} MB`);
      return {
        triggered: true,
        message: `GC completed. Freed approximately ${freed} MB`,
      };
    }
    return {
      triggered: false,
      message: 'GC not exposed. Start Node with --expose-gc to enable manual GC.',
    };
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private loadConfig(): ResourceLimitsConfig {
    return {
      maxHeapUsedMb: this.configService.get<number>('RESOURCE_MAX_HEAP_MB', 512),
      maxRssMb: this.configService.get<number>('RESOURCE_MAX_RSS_MB', 768),
      heapWarningPercent: this.configService.get<number>('RESOURCE_HEAP_WARN_PERCENT', 75),
      heapCriticalPercent: this.configService.get<number>('RESOURCE_HEAP_CRITICAL_PERCENT', 90),
      exitOnHeapCritical: this.configService.get<string>('RESOURCE_EXIT_ON_HEAP_CRITICAL', 'false') === 'true',
      monitorIntervalMs: this.configService.get<number>('RESOURCE_MONITOR_INTERVAL_MS', 30_000),
    };
  }

  private startMonitoring(): void {
    this.intervalHandle = setInterval(() => {
      this.checkAndEmitViolations();
    }, this.config.monitorIntervalMs);
    this.intervalHandle.unref();
  }

  private checkAndEmitViolations(): void {
    const mem = this.getMemorySnapshot();
    const violations = this.evaluateViolations(mem);

    if (violations.length === 0) return;

    for (const v of violations) {
      if (v.type === 'heap_critical') {
        this.logger.error(`[RESOURCE CRITICAL] ${v.message}`, { violation: v });
        if (this.config.exitOnHeapCritical) {
          this.logger.error('exitOnHeapCritical=true — process will exit');
          process.exit(1);
        }
      } else {
        this.logger.warn(`[RESOURCE WARNING] ${v.message}`, { violation: v });
      }
    }
  }

  private evaluateViolations(mem: MemorySnapshot): ResourceViolation[] {
    const violations: ResourceViolation[] = [];
    const warnThreshold = this.config.maxHeapUsedMb * (this.config.heapWarningPercent / 100);
    const criticalThreshold = this.config.maxHeapUsedMb * (this.config.heapCriticalPercent / 100);
    const heapUsedMb = mem.heapUsed / MB;
    const rssMb = mem.rss / MB;

    if (heapUsedMb >= criticalThreshold) {
      violations.push({
        type: 'heap_critical',
        message: `Heap used ${heapUsedMb.toFixed(1)} MB exceeds critical threshold ${criticalThreshold} MB`,
        value: heapUsedMb,
        threshold: criticalThreshold,
      });
    } else if (heapUsedMb >= warnThreshold) {
      violations.push({
        type: 'heap_high',
        message: `Heap used ${heapUsedMb.toFixed(1)} MB exceeds warning threshold ${warnThreshold} MB`,
        value: heapUsedMb,
        threshold: warnThreshold,
      });
    }

    if (rssMb >= this.config.maxRssMb) {
      violations.push({
        type: 'rss_high',
        message: `RSS ${rssMb.toFixed(1)} MB exceeds max RSS ${this.config.maxRssMb} MB`,
        value: rssMb,
        threshold: this.config.maxRssMb,
      });
    }

    return violations;
  }
}
