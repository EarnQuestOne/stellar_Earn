import { registerAs } from '@nestjs/config';

export default registerAs('moderation', () => ({
  /** When false, high-severity content is flagged but not rejected at API layer. Default: block unless set to "false". */
  blockOnHighSeverity: process.env.MODERATION_BLOCK_HIGH !== 'false',
  highThreshold: parseFloat(process.env.MODERATION_HIGH_THRESHOLD || '0.85'),
  mediumThreshold: parseFloat(process.env.MODERATION_MEDIUM_THRESHOLD || '0.5'),
  externalApiUrl: process.env.MODERATION_EXTERNAL_API_URL || '',
  externalApiKey: process.env.MODERATION_EXTERNAL_API_KEY || '',
  imageApiUrl: process.env.MODERATION_IMAGE_API_URL || '',
  imageApiKey: process.env.MODERATION_IMAGE_API_KEY || '',
  blockedKeywords: (process.env.MODERATION_BLOCKED_KEYWORDS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  blockedImageHosts: (process.env.MODERATION_BLOCKED_IMAGE_HOSTS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
}));
