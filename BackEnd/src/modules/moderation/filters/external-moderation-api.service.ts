import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface ExternalModerationResult {
  score: number;
  categories?: Record<string, number>;
}

@Injectable()
export class ExternalModerationApiService {
  private readonly logger = new Logger(ExternalModerationApiService.name);

  constructor(private readonly configService: ConfigService) {}

  async scoreText(text: string): Promise<ExternalModerationResult | null> {
    const url = this.configService.get<string>('moderation.externalApiUrl');
    if (!url?.trim()) {
      return null;
    }
    const key = this.configService.get<string>('moderation.externalApiKey') || '';

    try {
      const { data } = await axios.post<ExternalModerationResult>(
        url,
        { text, language: 'en' },
        {
          headers: key
            ? { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
            : { 'Content-Type': 'application/json' },
          timeout: 8000,
        },
      );
      return {
        score: typeof data.score === 'number' ? data.score : 0,
        categories: data.categories,
      };
    } catch (e) {
      this.logger.warn(
        `External moderation API failed: ${e instanceof Error ? e.message : e}`,
      );
      return null;
    }
  }
}
