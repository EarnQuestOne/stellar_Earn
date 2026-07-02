import {
  CallHandler,
  ExecutionContext,
  Injectable,
  mixin,
  NestInterceptor,
  Type,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { from, switchMap } from 'rxjs';
import { getFileUploadConfig } from './file-upload.config';
import {
  FileValidationOptions,
  validateUploadedFile,
} from './file-validation.util';
import { UploadedFileLike } from './uploaded-file.interface';
import { VirusScanService } from './virus-scan.service';

export type FileScanInterceptorOptions = Partial<FileValidationOptions> & {
  /** Reject the request when no file is present. Defaults to true. */
  required?: boolean;
};

/**
 * Builds an interceptor that validates and virus-scans the multipart files
 * attached to the request (as populated by Multer's `FileInterceptor` /
 * `FilesInterceptor`, which must run before this one).
 *
 * Usage:
 * ```ts
 * @UseInterceptors(FileInterceptor('file'), FileScanInterceptor({ maxSizeBytes: 1_000_000 }))
 * ```
 *
 * Implemented as a mixin so per-route options can be supplied while still
 * receiving {@link VirusScanService} and {@link ConfigService} via DI.
 */
export function FileScanInterceptor(
  options: FileScanInterceptorOptions = {},
): Type<NestInterceptor> {
  @Injectable()
  class MixinFileScanInterceptor implements NestInterceptor {
    constructor(
      readonly virusScanService: VirusScanService,
      readonly configService: ConfigService,
    ) {}

    private resolveOptions(): FileValidationOptions & { required: boolean } {
      const defaults = getFileUploadConfig(this.configService);
      return {
        maxSizeBytes: options.maxSizeBytes ?? defaults.maxSizeBytes,
        allowedMimeTypes: options.allowedMimeTypes ?? defaults.allowedMimeTypes,
        verifyMagicBytes: options.verifyMagicBytes ?? defaults.verifyMagicBytes,
        required: options.required ?? true,
      };
    }

    private collectFiles(request: {
      file?: UploadedFileLike;
      files?: UploadedFileLike[] | Record<string, UploadedFileLike[]>;
    }): UploadedFileLike[] {
      if (request.file) return [request.file];
      if (Array.isArray(request.files)) return request.files;
      if (request.files && typeof request.files === 'object') {
        return Object.values(request.files).flat();
      }
      return [];
    }

    async process(context: ExecutionContext): Promise<void> {
      const request = context.switchToHttp().getRequest();
      const opts = this.resolveOptions();
      const files = this.collectFiles(request);

      if (files.length === 0) {
        if (opts.required) {
          validateUploadedFile(undefined, opts); // throws BadRequestException
        }
        return;
      }

      for (const file of files) {
        validateUploadedFile(file, opts);
      }
      for (const file of files) {
        await this.virusScanService.assertFileClean(file);
      }
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
      return from(this.process(context)).pipe(switchMap(() => next.handle()));
    }
  }

  return mixin(MixinFileScanInterceptor);
}
