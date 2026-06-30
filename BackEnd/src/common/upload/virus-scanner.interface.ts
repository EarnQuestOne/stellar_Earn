/**
 * Result of scanning a single file buffer.
 */
export interface VirusScanResult {
  /** True when the scanner is confident the payload is clean. */
  clean: boolean;
  /** Signature/virus name when infected, otherwise null. */
  virus: string | null;
  /** Identifier of the scanner that produced the result (e.g. "clamav"). */
  scanner: string;
}

/**
 * Pluggable virus-scan hook. Implementations connect to a real engine
 * (ClamAV, an HTTP scanning service, etc.) or act as a no-op placeholder.
 */
export interface VirusScanner {
  readonly name: string;
  scanBuffer(buffer: Buffer): Promise<VirusScanResult>;
}

/** DI token for the active {@link VirusScanner} implementation. */
export const VIRUS_SCANNER = Symbol('VIRUS_SCANNER');
