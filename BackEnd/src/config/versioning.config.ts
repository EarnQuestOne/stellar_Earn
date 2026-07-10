import { Request } from 'express';

export interface ApiVersionConfig {
  defaultVersion: string;
  supportedVersions: string[];
  deprecatedVersions: Record<
    string,
    { sunset?: string; sunsetLink?: string; reason?: string }
  >;
  headerName: string;
  headerFallbackNames: string[];
}

/** Current API release in SemVer notation (maps to major version 1). */
export const API_SEMVER = '1.0.0';

export const API_VERSION_POLICY_PATH = 'docs/backend/API_VERSIONING_POLICY.md';

export const API_VERSION_CONFIG: ApiVersionConfig = {
  defaultVersion: '1',
  supportedVersions: ['1'],
  deprecatedVersions: {},
  headerName: 'x-api-version',
  headerFallbackNames: ['accept-version', 'api-version'],
};

const extractVersionFromUri = (url: string): string | undefined => {
  if (!url) {
    return undefined;
  }

  const normalizedUrl = url.toLowerCase();
  const regex = /(?:^\/?api\/)?v(\d+)(?:\/|$)/;
  const match = normalizedUrl.match(regex);

  return match && match[1] ? match[1] : undefined;
};

const extractVersionFromHeaders = (
  headers: Record<string, unknown>,
): string | undefined => {
  const headerKeys = [
    API_VERSION_CONFIG.headerName,
    ...API_VERSION_CONFIG.headerFallbackNames,
  ];

  for (const key of headerKeys) {
    const value = headers[key] as string | undefined;
    if (!value) continue;

    const version = value.trim().replace(/^v/i, '');
    if (/^\d+$/.test(version)) {
      return version;
    }
  }

  return undefined;
};

export const extractApiVersion = (req: Request): string | undefined => {
  const fromUri = extractVersionFromUri(
    req.url || req.originalUrl || req.path || '',
  );
  if (fromUri) {
    return fromUri;
  }

  return extractVersionFromHeaders(req.headers);
};

export const isVersionSupported = (version: string): boolean =>
  API_VERSION_CONFIG.supportedVersions.includes(version);

export const isVersionDeprecated = (version: string): boolean =>
  Boolean(API_VERSION_CONFIG.deprecatedVersions[version]);

export const getVersionDeprecationInfo = (version: string) =>
  API_VERSION_CONFIG.deprecatedVersions[version];

/** Maps an integer API major version to its SemVer release string. */
export const getApiSemver = (version: string): string => {
  if (version === API_VERSION_CONFIG.defaultVersion) {
    return API_SEMVER;
  }
  return `${version}.0.0`;
};
