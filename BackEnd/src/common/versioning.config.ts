import { VersioningType } from '@nestjs/common';

// API versioning configuration for the NestJS application.
// Apply in main.ts:
//
//   import { versioningConfig } from './common/versioning.config';
//   app.enableVersioning(versioningConfig);
//
// Routes then use @Version('1') or the URI prefix /v1/...

export const versioningConfig = {
  type: VersioningType.URI,
  defaultVersion: '1',
};
