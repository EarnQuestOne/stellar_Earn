import { SetMetadata } from '@nestjs/common';

export const BODY_SIZE_LIMIT_KEY = 'bodySizeLimit';

export interface BodySizeLimitOptions {
  json?: string;
  urlencoded?: string;
}

/**
 * Decorator to set per-controller request body size limits.
 * Applied at the controller class level.
 *
 * @example
 * @BodySizeLimit({ json: '10mb', urlencoded: '1mb' })
 * @Controller('submissions')
 * export class SubmissionsController { ... }
 */
export const BodySizeLimit = (options: BodySizeLimitOptions) =>
  SetMetadata(BODY_SIZE_LIMIT_KEY, options);