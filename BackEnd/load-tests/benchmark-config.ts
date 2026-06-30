export interface BenchmarkScenario {
  name: string;
  method: 'GET' | 'POST';
  route: string;
  weight?: number;
  headers?: Record<string, string>;
  body?: unknown;
  tags?: Record<string, string>;
}

export interface BenchmarkConfig {
  baseUrl: string;
  scenarios: BenchmarkScenario[];
  thresholds: Record<string, string[]>;
  authEnabled: boolean;
}

export function buildRoute(route: string, params: Record<string, string>): string {
  return route.replace(/:([A-Za-z0-9_]+)/g, (_match, key) => params[key] ?? '');
}

export function createBenchmarkConfig(
  baseUrl: string,
  authEnabled = true,
): BenchmarkConfig {
  const authHeader = authEnabled
    ? { Authorization: 'Bearer ${JWT_TOKEN}' }
    : undefined;

  return {
    baseUrl,
    authEnabled,
    scenarios: [
      {
        name: 'health-live',
        method: 'GET',
        route: '/api/health/live',
        weight: 20,
        tags: { endpoint: 'health' },
      },
      {
        name: 'health-deep',
        method: 'GET',
        route: '/api/health/deep',
        weight: 10,
        tags: { endpoint: 'health' },
      },
      {
        name: 'auth-login',
        method: 'POST',
        route: '/api/auth/login',
        weight: 10,
        headers: authHeader,
        body: {
          stellarAddress: 'GBBM6BKZKNDBK5YJ6BL5QY55VDBSPJLDAFER4YB5EKY2APDEW2HE3BYS',
        },
        tags: { endpoint: 'auth' },
      },
      {
        name: 'quests-list',
        method: 'GET',
        route: '/api/quests?page=1&limit=20',
        weight: 25,
        headers: authHeader,
        tags: { endpoint: 'quests' },
      },
      {
        name: 'quests-detail',
        method: 'GET',
        route: '/api/quests/:id',
        weight: 20,
        headers: authHeader,
        tags: { endpoint: 'quests' },
      },
      {
        name: 'submissions-list',
        method: 'GET',
        route: '/api/quests/:questId/submissions',
        weight: 15,
        headers: authHeader,
        tags: { endpoint: 'submissions' },
      },
    ],
    thresholds: {
      health_live_duration: ['p(95)<100'],
      health_deep_duration: ['p(95)<300'],
      auth_login_duration: ['p(95)<400'],
      quests_list_duration: ['p(95)<500'],
      quests_detail_duration: ['p(95)<300'],
      submissions_list_duration: ['p(95)<800'],
      http_req_failed: ['rate<0.01'],
    },
  };
}
