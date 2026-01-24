import { SetMetadata } from '@nestjs/common';

export const BYPASS_RATE_LIMIT_KEY = 'bypassRateLimit';

export const BypassRateLimit = () => SetMetadata(BYPASS_RATE_LIMIT_KEY, true);
