import { UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VirusScanService } from './virus-scan.service';
import { VirusScanner } from './virus-scanner.interface';

const makeConfig = (failClosed: boolean): ConfigService =>
  ({
    get: (key: string, fallback?: unknown) =>
      key === 'VIRUS_SCAN_FAIL_CLOSED' ? failClosed : fallback,
  }) as unknown as ConfigService;

describe('VirusScanService', () => {
  it('passes a clean buffer through', async () => {
    const scanner: VirusScanner = {
      name: 'fake',
      scanBuffer: jest.fn().mockResolvedValue({
        clean: true,
        virus: null,
        scanner: 'fake',
      }),
    };
    const service = new VirusScanService(scanner, makeConfig(false));

    await expect(service.assertBufferClean(Buffer.from('ok'))).resolves.toEqual({
      clean: true,
      virus: null,
      scanner: 'fake',
    });
  });

  it('rejects an infected buffer', async () => {
    const scanner: VirusScanner = {
      name: 'fake',
      scanBuffer: jest.fn().mockResolvedValue({
        clean: false,
        virus: 'Eicar-Test-Signature',
        scanner: 'fake',
      }),
    };
    const service = new VirusScanService(scanner, makeConfig(false));

    await expect(service.assertBufferClean(Buffer.from('bad'))).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('fails open when the scanner errors and fail-closed is off', async () => {
    const scanner: VirusScanner = {
      name: 'fake',
      scanBuffer: jest.fn().mockRejectedValue(new Error('clamd down')),
    };
    const service = new VirusScanService(scanner, makeConfig(false));

    const result = await service.assertBufferClean(Buffer.from('x'));
    expect(result.clean).toBe(true);
    expect(result.scanner).toContain('degraded');
  });

  it('fails closed when the scanner errors and fail-closed is on', async () => {
    const scanner: VirusScanner = {
      name: 'fake',
      scanBuffer: jest.fn().mockRejectedValue(new Error('clamd down')),
    };
    const service = new VirusScanService(scanner, makeConfig(true));

    await expect(service.assertBufferClean(Buffer.from('x'))).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });
});
