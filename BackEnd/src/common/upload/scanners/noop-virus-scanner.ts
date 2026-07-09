import { Injectable } from '@nestjs/common';
import { VirusScanner, VirusScanResult } from '../virus-scanner.interface';

/**
 * Default scanner used when no external engine is configured.
 *
 * It performs no real inspection and always reports the buffer as clean. It
 * exists so the upload pipeline has a working hook out-of-the-box in local and
 * test environments; production deployments should configure a real engine
 * (e.g. {@link ClamAvVirusScanner}) via `VIRUS_SCAN_PROVIDER=clamav`.
 */
@Injectable()
export class NoopVirusScanner implements VirusScanner {
  readonly name = 'noop';

  async scanBuffer(_buffer: Buffer): Promise<VirusScanResult> {
    return { clean: true, virus: null, scanner: this.name };
  }
}
