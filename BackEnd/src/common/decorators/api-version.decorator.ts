import { applyDecorators, SetMetadata, Version } from '@nestjs/common';

export interface ApiVersionOptions {
  deprecated?: boolean;
  sunset?: string;
  sunsetLink?: string;
  reason?: string;
}

export const API_VERSION_METADATA_KEY = 'apiVersionOptions';

export const ApiVersion = (
  version: string | string[],
  options: ApiVersionOptions = {},
) => {
  return applyDecorators(
    Version(version),
    SetMetadata(API_VERSION_METADATA_KEY, {
      version,
      ...options,
    }),
  );
};
