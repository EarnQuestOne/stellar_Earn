import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { connect, Socket } from 'net';
import { VirusScanner, VirusScanResult } from '../virus-scanner.interface';

export interface ClamAvScannerOptions {
  host: string;
  port: number;
  /** Socket timeout in milliseconds. */
  timeoutMs: number;
  /** Max bytes streamed per INSTREAM chunk. */
  chunkSize: number;
}

/**
 * Talks to a ClamAV daemon (`clamd`) over TCP using the INSTREAM command.
 *
 * INSTREAM framing: send `zINSTREAM\0`, then for each chunk a 4-byte
 * big-endian length prefix followed by the chunk bytes, terminated by a
 * zero-length chunk. clamd replies with `stream: OK` or
 * `stream: <Signature> FOUND`.
 *
 * Implemented with the Node `net` module so no third-party client dependency
 * is required.
 */
@Injectable()
export class ClamAvVirusScanner implements VirusScanner {
  readonly name = 'clamav';

  constructor(private readonly options: ClamAvScannerOptions) {}

  scanBuffer(buffer: Buffer): Promise<VirusScanResult> {
    return new Promise<VirusScanResult>((resolve, reject) => {
      const socket: Socket = connect(this.options.port, this.options.host);
      const chunks: Buffer[] = [];
      let settled = false;

      const finish = (fn: () => void): void => {
        if (settled) return;
        settled = true;
        socket.destroy();
        fn();
      };

      socket.setTimeout(this.options.timeoutMs);

      socket.on('connect', () => {
        socket.write('zINSTREAM\0');
        for (let offset = 0; offset < buffer.length; offset += this.options.chunkSize) {
          const slice = buffer.subarray(offset, offset + this.options.chunkSize);
          const size = Buffer.alloc(4);
          size.writeUInt32BE(slice.length, 0);
          socket.write(size);
          socket.write(slice);
        }
        // Zero-length chunk signals end of stream.
        socket.write(Buffer.from([0, 0, 0, 0]));
      });

      socket.on('data', (data) => chunks.push(data));

      socket.on('end', () => {
        const reply = Buffer.concat(chunks).toString('utf8').trim();
        finish(() => {
          if (/\bOK$/.test(reply)) {
            resolve({ clean: true, virus: null, scanner: this.name });
            return;
          }
          const found = reply.match(/:\s*(.+)\s+FOUND$/);
          if (found) {
            resolve({ clean: false, virus: found[1], scanner: this.name });
            return;
          }
          reject(
            new ServiceUnavailableException(
              `Unexpected response from virus scanner: "${reply}"`,
            ),
          );
        });
      });

      socket.on('timeout', () =>
        finish(() =>
          reject(new ServiceUnavailableException('Virus scan timed out')),
        ),
      );

      socket.on('error', (err) =>
        finish(() =>
          reject(
            new ServiceUnavailableException(
              `Virus scanner connection failed: ${err.message}`,
            ),
          ),
        ),
      );
    });
  }
}
