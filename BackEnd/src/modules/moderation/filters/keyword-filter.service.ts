import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface KeywordFilterResult {
  hits: string[];
  blocked: boolean;
}

@Injectable()
export class KeywordFilterService {
  private readonly blocklist: Set<string>;

  constructor(private readonly configService: ConfigService) {
    const mod = this.configService.get<{ blockedKeywords?: string[] }>('moderation');
    const fromConfig = mod?.blockedKeywords || [];
    const defaults = ['child porn', 'cp ', 'terrorist', 'kill yourself', 'kys'];
    this.blocklist = new Set(
      [...fromConfig, ...defaults].map((w) => w.toLowerCase()).filter(Boolean),
    );
  }

  scan(text: string): KeywordFilterResult {
    if (!text || !text.trim()) {
      return { hits: [], blocked: false };
    }
    const lower = text.toLowerCase();
    const hits: string[] = [];
    for (const word of this.blocklist) {
      if (word && lower.includes(word)) {
        hits.push(word);
      }
    }
    return {
      hits: [...new Set(hits)],
      blocked: hits.length > 0,
    };
  }
}
