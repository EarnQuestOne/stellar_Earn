import { Injectable } from '@nestjs/common';
import { DEFAULT_MODERATION_BLOCKED_KEYWORDS } from '../moderation-config-cache.service';

export interface KeywordFilterResult {
  hits: string[];
  blocked: boolean;
}

@Injectable()
export class KeywordFilterService {
  scan(
    text: string,
    blocklist: readonly string[] = DEFAULT_MODERATION_BLOCKED_KEYWORDS,
  ): KeywordFilterResult {
    if (!text || !text.trim()) {
      return { hits: [], blocked: false };
    }
    const lower = text.toLowerCase();
    const hits: string[] = [];
    for (const word of blocklist) {
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
