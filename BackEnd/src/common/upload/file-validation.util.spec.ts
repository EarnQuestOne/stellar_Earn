import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import {
  hasMatchingMagicBytes,
  validateUploadedFile,
  FileValidationOptions,
} from './file-validation.util';
import { UploadedFileLike } from './uploaded-file.interface';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const makeFile = (over: Partial<UploadedFileLike> = {}): UploadedFileLike => ({
  fieldname: 'file',
  originalname: 'proof.png',
  encoding: '7bit',
  mimetype: 'image/png',
  size: PNG_MAGIC.length,
  buffer: PNG_MAGIC,
  ...over,
});

const options: FileValidationOptions = {
  maxSizeBytes: 1024,
  allowedMimeTypes: ['image/png', 'application/pdf'],
  verifyMagicBytes: true,
};

describe('validateUploadedFile', () => {
  it('accepts a valid file whose magic bytes match', () => {
    expect(() => validateUploadedFile(makeFile(), options)).not.toThrow();
  });

  it('rejects a missing file', () => {
    expect(() => validateUploadedFile(undefined, options)).toThrow(
      BadRequestException,
    );
  });

  it('rejects an empty file', () => {
    expect(() =>
      validateUploadedFile(makeFile({ size: 0, buffer: Buffer.alloc(0) }), options),
    ).toThrow(BadRequestException);
  });

  it('rejects a file over the size limit', () => {
    expect(() =>
      validateUploadedFile(makeFile({ size: 2048 }), options),
    ).toThrow(PayloadTooLargeException);
  });

  it('rejects a disallowed MIME type', () => {
    expect(() =>
      validateUploadedFile(
        makeFile({ mimetype: 'application/x-msdownload' }),
        options,
      ),
    ).toThrow(UnsupportedMediaTypeException);
  });

  it('rejects a spoofed type (declared png, non-png bytes)', () => {
    expect(() =>
      validateUploadedFile(
        makeFile({ buffer: Buffer.from('MZ executable header') }),
        options,
      ),
    ).toThrow(UnsupportedMediaTypeException);
  });

  it('skips magic-byte verification when disabled', () => {
    expect(() =>
      validateUploadedFile(makeFile({ buffer: Buffer.from('whatever') }), {
        ...options,
        verifyMagicBytes: false,
      }),
    ).not.toThrow();
  });
});

describe('hasMatchingMagicBytes', () => {
  it('returns true for matching png bytes', () => {
    expect(hasMatchingMagicBytes(PNG_MAGIC, 'image/png')).toBe(true);
  });

  it('returns false for mismatched bytes', () => {
    expect(hasMatchingMagicBytes(Buffer.from('hello'), 'image/png')).toBe(false);
  });

  it('returns true for types without a known signature', () => {
    expect(hasMatchingMagicBytes(Buffer.from('plain'), 'text/plain')).toBe(true);
  });
});
