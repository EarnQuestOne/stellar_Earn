import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from '../../common/services/metrics.service';

export const DEFAULT_MODERATION_BLOCKED_KEYWORDS = [
  'child porn',
  'cp ',
  'terrorist',
  'kill yourself',
  'kys',
] as const;

export interface ModerationConfigSnapshot {
  blockOnHighSeverity: boolean;
  highThreshold: number;
  mediumThreshold: number;
  externalApiUrl: string;
  externalApiKey: string;
  imageApiUrl: string;
  imageApiKey: string;
  blockedKeywords: readonly string[];
  blockedImageHosts: readonly string[];
}

export type ModerationConfigUpdate = Partial<{
  blockOnHighSeverity: boolean;
  highThreshold: number;
  mediumThreshold: number;
  externalApiUrl: string;
  externalApiKey: string;
  imageApiUrl: string;
  imageApiKey: string;
  blockedKeywords: string[];
  blockedImageHosts: string[];
}>;

const DEFAULT_HIGH_THRESHOLD = 0.85;
const DEFAULT_MEDIUM_THRESHOLD = 0.5;

@Injectable()
export class ModerationConfigCacheService {
  private cachedConfig?: Readonly<ModerationConfigSnapshot>;

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly metrics?: MetricsService,
  ) {
    this.metrics?.registerCounter(
      'moderation_config_source_loads_total',
      'Moderation config loads from the configured source',
    );
    this.metrics?.registerCounter(
      'moderation_config_cache_invalidations_total',
      'Moderation config cache invalidations',
    );
    this.metrics?.registerHistogram(
      'moderation_config_cache_load_duration_ms',
      'Time spent loading and normalizing moderation config',
      [0.01, 0.05, 0.1, 0.5, 1, 5, 10, 50, 100],
    );
  }

  getConfig(): Readonly<ModerationConfigSnapshot> {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    this.metrics?.incrementCounter('moderation_config_source_loads_total');
    const startedAt = process.hrtime.bigint();
    const configured =
      this.configService.get<Partial<ModerationConfigSnapshot>>('moderation') ??
      {};

    this.cachedConfig = Object.freeze({
      blockOnHighSeverity: configured.blockOnHighSeverity !== false,
      highThreshold: this.finiteOrDefault(
        configured.highThreshold,
        DEFAULT_HIGH_THRESHOLD,
      ),
      mediumThreshold: this.finiteOrDefault(
        configured.mediumThreshold,
        DEFAULT_MEDIUM_THRESHOLD,
      ),
      externalApiUrl: this.stringOrDefault(configured.externalApiUrl),
      externalApiKey: this.stringOrDefault(configured.externalApiKey),
      imageApiUrl: this.stringOrDefault(configured.imageApiUrl),
      imageApiKey: this.stringOrDefault(configured.imageApiKey),
      blockedKeywords: Object.freeze(
        this.normalizeKeywords(configured.blockedKeywords ?? []),
      ),
      blockedImageHosts: Object.freeze(
        this.normalizeList(configured.blockedImageHosts ?? []),
      ),
    });

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    this.metrics?.observeHistogram(
      'moderation_config_cache_load_duration_ms',
      durationMs,
    );

    return this.cachedConfig;
  }

  invalidate(): void {
    this.cachedConfig = undefined;
    this.metrics?.incrementCounter(
      'moderation_config_cache_invalidations_total',
    );
  }

  updateConfig(
    update: ModerationConfigUpdate,
  ): Readonly<ModerationConfigSnapshot> {
    if (update.blockOnHighSeverity !== undefined) {
      this.configService.set(
        'moderation.blockOnHighSeverity',
        update.blockOnHighSeverity,
      );
    }
    if (update.highThreshold !== undefined) {
      this.configService.set('moderation.highThreshold', update.highThreshold);
    }
    if (update.mediumThreshold !== undefined) {
      this.configService.set(
        'moderation.mediumThreshold',
        update.mediumThreshold,
      );
    }
    if (update.externalApiUrl !== undefined) {
      this.configService.set(
        'moderation.externalApiUrl',
        update.externalApiUrl,
      );
    }
    if (update.externalApiKey !== undefined) {
      this.configService.set(
        'moderation.externalApiKey',
        update.externalApiKey,
      );
    }
    if (update.imageApiUrl !== undefined) {
      this.configService.set('moderation.imageApiUrl', update.imageApiUrl);
    }
    if (update.imageApiKey !== undefined) {
      this.configService.set('moderation.imageApiKey', update.imageApiKey);
    }
    if (update.blockedKeywords !== undefined) {
      this.configService.set('moderation.blockedKeywords', [
        ...update.blockedKeywords,
      ]);
    }
    if (update.blockedImageHosts !== undefined) {
      this.configService.set('moderation.blockedImageHosts', [
        ...update.blockedImageHosts,
      ]);
    }

    this.invalidate();
    return this.getConfig();
  }

  private finiteOrDefault(value: number | undefined, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : fallback;
  }

  private stringOrDefault(value: string | undefined): string {
    return typeof value === 'string' ? value : '';
  }

  private normalizeList(values: readonly string[]): string[] {
    return [
      ...new Set(
        values
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
  }

  private normalizeKeywords(configured: readonly string[]): string[] {
    const normalizedConfigured = this.normalizeList(configured);
    return [
      ...new Set([
        ...DEFAULT_MODERATION_BLOCKED_KEYWORDS,
        ...normalizedConfigured,
      ]),
    ];
  }
}
