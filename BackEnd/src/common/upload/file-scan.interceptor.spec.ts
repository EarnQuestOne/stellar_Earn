import {
  CallHandler,
  ExecutionContext,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom, of } from 'rxjs';
import { FileScanInterceptor } from './file-scan.interceptor';
import { VirusScanService } from './virus-scan.service';
import { UploadedFileLike } from './uploaded-file.interface';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const makeFile = (over: Partial<UploadedFileLike> = {}): UploadedFileLike => ({
  fieldname: 'file',
  originalname: 'proof.png',
  encoding: '7bit',
  mimetype: 'image/png',
  size: PNG.length,
  buffer: PNG,
  ...over,
});

const config = {
  get: (_key: string, fallback?: unknown) => fallback,
} as unknown as ConfigService;

const contextWith = (file?: UploadedFileLike): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ file }) }),
  }) as unknown as ExecutionContext;

const handlerReturning = (value: unknown): CallHandler => ({
  handle: () => of(value),
});

describe('FileScanInterceptor', () => {
  const run = (
    InterceptorClass: ReturnType<typeof FileScanInterceptor>,
    virusScan: Partial<VirusScanService>,
    context: ExecutionContext,
  ) => {
    const interceptor = new (InterceptorClass as any)(virusScan, config);
    return lastValueFrom(
      interceptor.intercept(context, handlerReturning('handler-result')),
    );
  };

  it('passes a valid, clean file through to the handler', async () => {
    const virusScan = { assertFileClean: jest.fn().mockResolvedValue({ clean: true }) };
    const Interceptor = FileScanInterceptor({ allowedMimeTypes: ['image/png'] });

    await expect(run(Interceptor, virusScan, contextWith(makeFile()))).resolves.toBe(
      'handler-result',
    );
    expect(virusScan.assertFileClean).toHaveBeenCalledTimes(1);
  });

  it('rejects an oversized file before scanning', async () => {
    const virusScan = { assertFileClean: jest.fn() };
    const Interceptor = FileScanInterceptor({
      maxSizeBytes: 4,
      allowedMimeTypes: ['image/png'],
    });

    await expect(
      run(Interceptor, virusScan, contextWith(makeFile({ size: 999 }))),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
    expect(virusScan.assertFileClean).not.toHaveBeenCalled();
  });

  it('propagates an infection rejection from the scan hook', async () => {
    const virusScan = {
      assertFileClean: jest
        .fn()
        .mockRejectedValue(new UnprocessableEntityException('malware')),
    };
    const Interceptor = FileScanInterceptor({ allowedMimeTypes: ['image/png'] });

    await expect(
      run(Interceptor, virusScan, contextWith(makeFile())),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('allows an absent optional file', async () => {
    const virusScan = { assertFileClean: jest.fn() };
    const Interceptor = FileScanInterceptor({ required: false });

    await expect(run(Interceptor, virusScan, contextWith(undefined))).resolves.toBe(
      'handler-result',
    );
  });
});
