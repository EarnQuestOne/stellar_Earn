import {
  Inject,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  VIRUS_SCANNER,
  VirusScanner,
  VirusScanResult,
} from './virus-scanner.interface';
import { UploadedFileLike } from './uploaded-file.interface';

/**
 * Orchestrates the virus-scan hook for uploaded files.
 *
 * Delegates the actual inspection to the configured {@link VirusScanner} and
 * applies platform policy on top:
 *  - an infected file always throws {@link UnprocessableEntityException}
 *  - a scanner failure throws only when `VIRUS_SCAN_FAIL_CLOSED` is enabled
 *    (recommended in production); otherwise it logs and lets the upload through.
 */
@Injectable()
export class VirusScanService {
  private readonly logger = new Logger(VirusScanService.name);
  private readonly failClosed: boolean;

  constructor(
    @Inject(VIRUS_SCANNER) private readonly scanner: VirusScanner,
    private readonly config: ConfigService,
  ) {
    this.failClosed = this.config.get<boolean>('VIRUS_SCAN_FAIL_CLOSED', false);
  }

  /** Scans a raw buffer, throwing if it is infected. */
  async assertBufferClean(buffer: Buffer): Promise<VirusScanResult> {
    let result: VirusScanResult;
    try {
      result = await this.scanner.scanBuffer(buffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (this.failClosed) {
        this.logger.error(`Virus scan failed (fail-closed): ${message}`);
        throw new UnprocessableEntityException(
          'File could not be scanned for viruses; upload rejected',
        );
      }
      this.logger.warn(`Virus scan failed (fail-open): ${message}`);
      return { clean: true, virus: null, scanner: `${this.scanner.name}:degraded` };
    }

    if (!result.clean) {
      this.logger.warn(
        `Rejected infected upload: ${result.virus} (scanner=${result.scanner})`,
      );
      throw new UnprocessableEntityException(
        `File rejected: malware detected (${result.virus})`,
      );
    }

    return result;
  }

  /** Convenience wrapper for an uploaded multipart file. */
  async assertFileClean(file: UploadedFileLike): Promise<VirusScanResult> {
    return this.assertBufferClean(file.buffer);
  }
}
