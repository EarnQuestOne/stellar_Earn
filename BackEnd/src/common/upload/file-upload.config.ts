import { ConfigService } from '@nestjs/config';
import { ClamAvScannerOptions } from './scanners/clamav-virus-scanner';

export interface FileUploadConfig {
  /** Default maximum upload size in bytes. */
  maxSizeBytes: number;
  /** Default MIME allowlist. */
  allowedMimeTypes: string[];
  /** Whether to verify magic bytes by default. */
  verifyMagicBytes: boolean;
  /** Active virus-scan provider: "noop" | "clamav". */
  scanProvider: 'noop' | 'clamav';
  /** Reject uploads when the scanner is unavailable. */
  failClosed: boolean;
  clamav: ClamAvScannerOptions;
}

const toBytes = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const match = value.trim().match(/^(\d+)(b|kb|mb)?$/i);
  if (!match) return fallback;
  const amount = Number(match[1]);
  const unit = (match[2] || 'b').toLowerCase();
  if (unit === 'mb') return amount * 1024 * 1024;
  if (unit === 'kb') return amount * 1024;
  return amount;
};

const toList = (value: string | undefined, fallback: string[]): string[] => {
  if (!value) return fallback;
  const items = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return items.length > 0 ? items : fallback;
};

export const DEFAULT_ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
];

export const getFileUploadConfig = (
  configService: ConfigService,
): FileUploadConfig => {
  const provider = (
    configService.get<string>('VIRUS_SCAN_PROVIDER', 'noop') || 'noop'
  ).toLowerCase();

  return {
    maxSizeBytes: toBytes(
      configService.get<string>('UPLOAD_MAX_SIZE'),
      5 * 1024 * 1024,
    ),
    allowedMimeTypes: toList(
      configService.get<string>('UPLOAD_ALLOWED_MIME_TYPES'),
      DEFAULT_ALLOWED_MIME_TYPES,
    ),
    verifyMagicBytes: configService.get<boolean>(
      'UPLOAD_VERIFY_MAGIC_BYTES',
      true,
    ),
    scanProvider: provider === 'clamav' ? 'clamav' : 'noop',
    failClosed: configService.get<boolean>('VIRUS_SCAN_FAIL_CLOSED', false),
    clamav: {
      host: configService.get<string>('CLAMAV_HOST', '127.0.0.1'),
      port: configService.get<number>('CLAMAV_PORT', 3310),
      timeoutMs: configService.get<number>('CLAMAV_TIMEOUT_MS', 10_000),
      chunkSize: configService.get<number>('CLAMAV_CHUNK_SIZE', 64 * 1024),
    },
  };
};
