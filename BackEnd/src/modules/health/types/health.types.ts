export type ServiceStatus = 'ok' | 'degraded' | 'down';

export interface ServiceHealth {
  status: ServiceStatus;
  latency: number; // in milliseconds
  error?: string;
}

export interface LiveHealthResponse {
  status: 'ok';
  timestamp: string;
  uptime: number;
}

export interface ReadyHealthResponse {
  status: ServiceStatus;
  timestamp: string;
  services: {
    database: ServiceHealth;
    cache: ServiceHealth;
  };
}

export interface DeepHealthResponse {
  status: ServiceStatus;
  timestamp: string;
  services: {
    database: ServiceHealth;
    cache: ServiceHealth;
    external: ServiceHealth;
  };
}

export interface HealthCheckResult {
  status: ServiceStatus;
  latency: number;
  error?: string;
}
