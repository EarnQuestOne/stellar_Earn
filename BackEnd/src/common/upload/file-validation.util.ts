import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { UploadedFileLike } from './uploaded-file.interface';

export interface FileValidationOptions {
  /** Maximum allowed file size in bytes. */
  maxSizeBytes: number;
  /** Allowlist of accepted MIME types. Empty means "allow any (declared)". */
  allowedMimeTypes: string[];
  /**
   * When true, the file's magic-number signature must match its declared
   * MIME type. Protects against a client renaming/relabelling a payload
   * (e.g. an executable declared as `image/png`).
   */
  verifyMagicBytes: boolean;
}

/**
 * Magic-number ("file signature") prefixes for the content types we accept.
 * Each entry lists one or more byte-sequence prefixes that identify the type.
 *
 * Kept dependency-free on purpose — covers the formats this platform accepts
 * for proof uploads. Extend here when adding new allowed types.
 */
const MAGIC_SIGNATURES: Record<string, number[][]> = {
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // "RIFF" (WEBP container)
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
};

const matchesSignature = (buffer: Buffer, signature: number[]): boolean => {
  if (buffer.length < signature.length) {
    return false;
  }
  return signature.every((byte, index) => buffer[index] === byte);
};

/**
 * Returns true when the buffer's leading bytes match any known signature for
 * the declared MIME type. Types without a registered signature (e.g. text)
 * are treated as "cannot verify" and pass this check.
 */
export const hasMatchingMagicBytes = (
  buffer: Buffer,
  mimetype: string,
): boolean => {
  const signatures = MAGIC_SIGNATURES[mimetype];
  if (!signatures) {
    return true; // No signature on record — nothing to contradict.
  }
  return signatures.some((signature) => matchesSignature(buffer, signature));
};

/**
 * Validates a single uploaded file against the supplied policy.
 *
 * Throws a typed Nest HTTP exception on the first violation:
 *  - {@link BadRequestException} for a missing/empty file
 *  - {@link PayloadTooLargeException} when over the size limit
 *  - {@link UnsupportedMediaTypeException} for a disallowed or spoofed type
 */
export const validateUploadedFile = (
  file: UploadedFileLike | undefined,
  options: FileValidationOptions,
): void => {
  if (!file || !file.buffer || file.size === 0) {
    throw new BadRequestException('Uploaded file is missing or empty');
  }

  if (file.size > options.maxSizeBytes) {
    throw new PayloadTooLargeException(
      `File exceeds the maximum allowed size of ${options.maxSizeBytes} bytes`,
    );
  }

  if (
    options.allowedMimeTypes.length > 0 &&
    !options.allowedMimeTypes.includes(file.mimetype)
  ) {
    throw new UnsupportedMediaTypeException(
      `Unsupported file type "${file.mimetype}". Allowed: ${options.allowedMimeTypes.join(
        ', ',
      )}`,
    );
  }

  if (options.verifyMagicBytes && !hasMatchingMagicBytes(file.buffer, file.mimetype)) {
    throw new UnsupportedMediaTypeException(
      `File content does not match its declared type "${file.mimetype}"`,
    );
  }
};
