import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface ImageModerationFlag {
  url: string;
  reason: string;
}

@Injectable()
export class ImageModerationService {
  private readonly logger = new Logger(ImageModerationService.name);

  constructor(private readonly configService: ConfigService) {}

  private hostBlocklist(): Set<string> {
    const list =
      this.configService.get<string[]>('moderation.blockedImageHosts') || [];
    return new Set(list.map((h) => h.toLowerCase()));
  }

  /**
   * Local heuristics: scheme, host blocklist, suspicious patterns.
   * Optional remote API when MODERATION_IMAGE_API_URL is set.
   */
  async moderateUrls(urls: string[]): Promise<ImageModerationFlag[]> {
    const flags: ImageModerationFlag[] = [];
    const blockedHosts = this.hostBlocklist();

    for (const raw of urls) {
      const url = raw?.trim();
      if (!url) continue;

      try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          flags.push({ url, reason: 'unsupported_scheme' });
          continue;
        }
        const host = parsed.hostname.toLowerCase();
        if (blockedHosts.has(host)) {
          flags.push({ url, reason: 'blocked_host' });
        }
        if (/\.(onion|exe|bat)$/i.test(parsed.pathname)) {
          flags.push({ url, reason: 'suspicious_extension' });
        }
      } catch {
        flags.push({ url, reason: 'invalid_url' });
      }
    }

    const imageApi = this.configService.get<string>('moderation.imageApiUrl');
    const imageKey = this.configService.get<string>('moderation.imageApiKey');
    if (imageApi && urls.length) {
      try {
        await axios.post(
          imageApi,
          { urls },
          {
            headers: imageKey
              ? { Authorization: `Bearer ${imageKey}`, 'Content-Type': 'application/json' }
              : { 'Content-Type': 'application/json' },
            timeout: 10000,
          },
        );
      } catch (e) {
        this.logger.warn(
          `Image moderation API call failed: ${e instanceof Error ? e.message : e}`,
        );
      }
    }

    return flags;
  }

  extractUrlsFromProof(proof: unknown): string[] {
    if (!proof || typeof proof !== 'object') return [];
    const out: string[] = [];
    const walk = (v: unknown) => {
      if (typeof v === 'string' && /^https?:\/\//i.test(v)) {
        out.push(v);
      } else if (Array.isArray(v)) {
        v.forEach(walk);
      } else if (v && typeof v === 'object') {
        Object.values(v).forEach(walk);
      }
    };
    walk(proof);
    return [...new Set(out)];
  }
}
