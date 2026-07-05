import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getFileUploadConfig } from './file-upload.config';
import { VirusScanService } from './virus-scan.service';
import { VIRUS_SCANNER, VirusScanner } from './virus-scanner.interface';
import { NoopVirusScanner } from './scanners/noop-virus-scanner';
import { ClamAvVirusScanner } from './scanners/clamav-virus-scanner';

/**
 * Provides the reusable file-upload validation and virus-scan hook.
 *
 * The active {@link VirusScanner} is selected from configuration:
 *  - `VIRUS_SCAN_PROVIDER=clamav` wires {@link ClamAvVirusScanner}
 *  - anything else falls back to {@link NoopVirusScanner}
 *
 * Global so any feature module can apply `FileScanInterceptor` without
 * re-importing this module.
 */
@Global()
@Module({
  providers: [
    VirusScanService,
    {
      provide: VIRUS_SCANNER,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): VirusScanner => {
        const config = getFileUploadConfig(configService);
        if (config.scanProvider === 'clamav') {
          return new ClamAvVirusScanner(config.clamav);
        }
        return new NoopVirusScanner();
      },
    },
  ],
  exports: [VirusScanService, VIRUS_SCANNER],
})
export class FileUploadModule {}
