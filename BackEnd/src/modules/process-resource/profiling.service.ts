import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as v8 from 'v8';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { ProfileSession } from './process-resource.types';

const DEFAULT_PROFILE_DIR = 'profiles';
const DEFAULT_MAX_DURATION_MS = 30_000;

@Injectable()
export class ProfilingService {
  private readonly logger = new Logger(ProfilingService.name);
  private readonly profileDir: string;
  private readonly maxDurationMs: number;
  private readonly enabled: boolean;
  private activeCpuSession: ProfileSession | null = null;
  private cpuStartTime = 0;
  private readonly sessions: ProfileSession[] = [];

  constructor(private readonly configService: ConfigService) {
    this.enabled =
      this.configService.get<string>('PROFILING_ENABLED', 'false') === 'true';
    this.profileDir = this.configService.get<string>(
      'PROFILING_DIR',
      DEFAULT_PROFILE_DIR,
    );
    this.maxDurationMs = this.configService.get<number>(
      'PROFILING_MAX_DURATION_MS',
      DEFAULT_MAX_DURATION_MS,
    );

    if (this.enabled) {
      this.ensureProfileDir();
      this.logger.log(
        `Profiling enabled — output dir: ${this.profileDir}, max duration: ${this.maxDurationMs}ms`,
      );
    }
  }

  // ─── Heap Snapshot ───────────────────────────────────────────────────────

  /**
   * Write a V8 heap snapshot to disk and return the file path.
   * Uses the built-in v8.writeHeapSnapshot() — no native addons needed.
   */
  takeHeapSnapshot(): { file: string; session: ProfileSession } {
    this.assertEnabled();
    this.ensureProfileDir();

    const id = randomUUID();
    const filename = `heap-${Date.now()}-${id.substring(0, 8)}.heapsnapshot`;
    const filePath = path.join(this.profileDir, filename);

    this.logger.log(`Taking heap snapshot → ${filePath}`);
    const written = v8.writeHeapSnapshot(filePath);

    const session: ProfileSession = {
      id,
      startedAt: new Date().toISOString(),
      durationMs: 0,
      type: 'heap',
    };
    this.sessions.push(session);

    this.logger.log(`Heap snapshot written: ${written}`);
    return { file: written, session };
  }

  // ─── V8 Heap Stats ───────────────────────────────────────────────────────

  getHeapStatistics(): v8.HeapInfo {
    return v8.getHeapStatistics();
  }

  getHeapSpaceStatistics(): v8.HeapSpaceInfo[] {
    return v8.getHeapSpaceStatistics();
  }

  // ─── Session History ─────────────────────────────────────────────────────

  listSessions(): ProfileSession[] {
    return [...this.sessions];
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getProfileDir(): string {
    return this.profileDir;
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private assertEnabled(): void {
    if (!this.enabled) {
      throw new BadRequestException(
        'Profiling is disabled. Set PROFILING_ENABLED=true to enable.',
      );
    }
  }

  private ensureProfileDir(): void {
    if (!fs.existsSync(this.profileDir)) {
      fs.mkdirSync(this.profileDir, { recursive: true });
    }
  }
}
