export interface MemorySnapshot {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  heapUsedPercent: number;
}

export interface CpuSnapshot {
  user: number;   // microseconds
  system: number; // microseconds
}

export interface ResourceSnapshot {
  timestamp: string;
  pid: number;
  uptime: number;
  memory: MemorySnapshot;
  cpu: CpuSnapshot;
  limits: ResourceLimitsConfig;
  violations: ResourceViolation[];
}

export interface ResourceViolation {
  type: 'heap_high' | 'rss_high' | 'heap_critical';
  message: string;
  value: number;
  threshold: number;
}

export interface ResourceLimitsConfig {
  maxHeapUsedMb: number;
  maxRssMb: number;
  heapWarningPercent: number;    // % of maxHeapUsedMb that triggers a warn
  heapCriticalPercent: number;   // % that triggers a critical + optional exit
  exitOnHeapCritical: boolean;
  monitorIntervalMs: number;
}

export interface ProfileSession {
  id: string;
  startedAt: string;
  durationMs: number;
  type: 'cpu' | 'heap';
}
