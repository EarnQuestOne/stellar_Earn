import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Version,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ResourceLimitsService } from './resource-limits.service';
import { ProfilingService } from './profiling.service';
import { ResourceSnapshot, ProfileSession } from './process-resource.types';
import * as v8 from 'v8';

@ApiTags('Process Resource')
@Controller('process')
export class ProcessResourceController {
  constructor(
    private readonly resourceLimits: ResourceLimitsService,
    private readonly profiling: ProfilingService,
  ) {}

  // ─── Resource Snapshot ──────────────────────────────────────────────────

  @Get('resources')
  @Version('1')
  @ApiOperation({
    summary: 'Current process resource usage',
    description:
      'Returns memory (RSS, heap used/total, external), CPU delta, uptime, configured limits, and any active violations.',
  })
  @ApiResponse({ status: 200, description: 'Resource snapshot' })
  getResources(): ResourceSnapshot {
    return this.resourceLimits.getSnapshot();
  }

  // ─── Manual GC ──────────────────────────────────────────────────────────

  @Post('gc')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger manual garbage collection',
    description:
      'Forces a GC cycle if Node was started with --expose-gc. Safe to call; no-ops otherwise.',
  })
  @ApiResponse({ status: 200, description: 'GC result' })
  triggerGc(): { triggered: boolean; message: string } {
    return this.resourceLimits.triggerGc();
  }

  // ─── V8 Heap Stats ──────────────────────────────────────────────────────

  @Get('heap/stats')
  @Version('1')
  @ApiOperation({
    summary: 'V8 heap statistics',
    description:
      'Returns raw V8 heap stats: total size, used size, physical size, limits, and available space.',
  })
  @ApiResponse({ status: 200, description: 'V8 heap statistics' })
  getHeapStats(): v8.HeapInfo {
    return this.profiling.getHeapStatistics();
  }

  @Get('heap/spaces')
  @Version('1')
  @ApiOperation({
    summary: 'V8 heap space breakdown',
    description:
      'Returns per-space heap stats (new space, old space, code space, etc.).',
  })
  @ApiResponse({ status: 200, description: 'V8 heap space statistics' })
  getHeapSpaces(): v8.HeapSpaceInfo[] {
    return this.profiling.getHeapSpaceStatistics();
  }

  // ─── Heap Snapshot ──────────────────────────────────────────────────────

  @Post('heap/snapshot')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Take a heap snapshot',
    description:
      'Writes a .heapsnapshot file to the configured PROFILING_DIR. ' +
      'Requires PROFILING_ENABLED=true. Load the file in Chrome DevTools → Memory tab.',
  })
  @ApiResponse({ status: 200, description: 'Snapshot written successfully' })
  @ApiResponse({
    status: 400,
    description: 'Profiling disabled (PROFILING_ENABLED=false)',
  })
  takeHeapSnapshot(): { file: string; session: ProfileSession } {
    return this.profiling.takeHeapSnapshot();
  }

  // ─── Profile Sessions ────────────────────────────────────────────────────

  @Get('profiling/sessions')
  @Version('1')
  @ApiOperation({
    summary: 'List profiling sessions',
    description: 'Returns the history of heap snapshot sessions taken this process lifetime.',
  })
  @ApiResponse({ status: 200, description: 'Session list' })
  listSessions(): { enabled: boolean; profileDir: string; sessions: ProfileSession[] } {
    return {
      enabled: this.profiling.isEnabled(),
      profileDir: this.profiling.getProfileDir(),
      sessions: this.profiling.listSessions(),
    };
  }
}
