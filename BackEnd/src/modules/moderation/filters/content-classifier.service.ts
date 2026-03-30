import { Injectable } from '@nestjs/common';

export enum ContentCategory {
  SAFE = 'SAFE',
  SPAM = 'SPAM',
  PROFANITY = 'PROFANITY',
  SUSPICIOUS = 'SUSPICIOUS',
  PROMOTIONAL = 'PROMOTIONAL',
}

export interface ClassificationResult {
  labels: Record<ContentCategory, number>;
  primary: ContentCategory;
  score: number;
}

const SPAM_PATTERNS = [
  /\b(?:viagra|cialis|casino|lottery|winner)\b/i,
  /\b(?:click here|limited time|act now)\b/i,
  /(?:http[s]?:\/\/){2,}/,
];

const PROFANITY_PATTERNS = [
  /\b(?:fuck|shit|bitch|asshole)\b/i,
];

const PROMO_PATTERNS = [
  /\b(?:buy now|discount|promo code|affiliate)\b/i,
];

@Injectable()
export class ContentClassifierService {
  classify(text: string): ClassificationResult {
    const labels: Record<ContentCategory, number> = {
      [ContentCategory.SAFE]: 0.9,
      [ContentCategory.SPAM]: 0,
      [ContentCategory.PROFANITY]: 0,
      [ContentCategory.SUSPICIOUS]: 0,
      [ContentCategory.PROMOTIONAL]: 0,
    };

    if (!text?.trim()) {
      return {
        labels,
        primary: ContentCategory.SAFE,
        score: 0.1,
      };
    }

    let spam = 0;
    for (const re of SPAM_PATTERNS) {
      if (re.test(text)) spam += 0.25;
    }
    labels[ContentCategory.SPAM] = Math.min(1, spam);

    let prof = 0;
    for (const re of PROFANITY_PATTERNS) {
      if (re.test(text)) prof += 0.35;
    }
    labels[ContentCategory.PROFANITY] = Math.min(1, prof);

    let promo = 0;
    for (const re of PROMO_PATTERNS) {
      if (re.test(text)) promo += 0.2;
    }
    labels[ContentCategory.PROMOTIONAL] = Math.min(1, promo);

    const suspicious =
      text.length > 8000 || (text.match(/https?:\/\//g) || []).length > 15
        ? 0.4
        : 0;
    labels[ContentCategory.SUSPICIOUS] = suspicious;

    labels[ContentCategory.SAFE] = Math.max(
      0,
      1 -
        Math.max(
          labels[ContentCategory.SPAM],
          labels[ContentCategory.PROFANITY],
          labels[ContentCategory.PROMOTIONAL],
        ) -
        suspicious * 0.5,
    );

    const entries = Object.entries(labels) as [ContentCategory, number][];
    entries.sort((a, b) => b[1] - a[1]);
    const primary = entries[0][0];
    const score = Math.max(
      labels[ContentCategory.SPAM],
      labels[ContentCategory.PROFANITY],
      labels[ContentCategory.SUSPICIOUS],
      labels[ContentCategory.PROMOTIONAL],
    );

    return { labels, primary, score };
  }
}
