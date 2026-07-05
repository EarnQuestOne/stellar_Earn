import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { createBenchmarkConfig, buildRoute } from './benchmark-config';

const benchmarkConfig = createBenchmarkConfig(__ENV.BASE_URL || 'http://localhost:3000', !!__ENV.JWT_TOKEN);

const metrics = {
  healthLiveErrorRate: new Rate('health_live_errors'),
  healthDeepErrorRate: new Rate('health_deep_errors'),
  authLoginErrorRate: new Rate('auth_login_errors'),
  questsListErrorRate: new Rate('quests_list_errors'),
  questsDetailErrorRate: new Rate('quests_detail_errors'),
  submissionsListErrorRate: new Rate('submissions_list_errors'),
  healthLiveDuration: new Trend('health_live_duration', true),
  healthDeepDuration: new Trend('health_deep_duration', true),
  authLoginDuration: new Trend('auth_login_duration', true),
  questsListDuration: new Trend('quests_list_duration', true),
  questsDetailDuration: new Trend('quests_detail_duration', true),
  submissionsListDuration: new Trend('submissions_list_duration', true),
  totalRequests: new Counter('total_requests'),
};

export const options = {
  stages: [
    { duration: '1m', target: 25 },
    { duration: '2m', target: 25 },
    { duration: '30s', target: 50 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: benchmarkConfig.thresholds,
};

const headers = {
  'Content-Type': 'application/json',
  ...(benchmarkConfig.authEnabled && __ENV.JWT_TOKEN
    ? { Authorization: `Bearer ${__ENV.JWT_TOKEN}` }
    : {}),
};

function getScenarioParams(scenarioName: string): Record<string, string> {
  if (scenarioName === 'quests-detail') {
    return { id: __ENV.QUEST_ID || '00000000-0000-0000-0000-000000000000' };
  }

  if (scenarioName === 'submissions-list') {
    return { questId: __ENV.QUEST_ID || '00000000-0000-0000-0000-000000000000' };
  }

  return {};
}

export default function () {
  const scenario = benchmarkConfig.scenarios[Math.floor(Math.random() * benchmarkConfig.scenarios.length)];
  const targetUrl = `${benchmarkConfig.baseUrl}${buildRoute(scenario.route, getScenarioParams(scenario.name))}`;

  group(scenario.name, () => {
    const start = Date.now();
    const response = scenario.method === 'POST'
      ? http.post(targetUrl, JSON.stringify(scenario.body), { headers })
      : http.get(targetUrl, { headers });

    const duration = Date.now() - start;
    metrics.totalRequests.add(1);

    const statusOk = response.status >= 200 && response.status < 400;
    const successChecks = {
      'status 2xx/3xx': statusOk,
      'body parseable': () => {
        try {
          JSON.parse(response.body as string);
          return true;
        } catch {
          return false;
        }
      },
    };

    const passed = check(response, successChecks);

    switch (scenario.name) {
      case 'health-live':
        metrics.healthLiveDuration.add(duration);
        metrics.healthLiveErrorRate.add(!passed);
        break;
      case 'health-deep':
        metrics.healthDeepDuration.add(duration);
        metrics.healthDeepErrorRate.add(!passed);
        break;
      case 'auth-login':
        metrics.authLoginDuration.add(duration);
        metrics.authLoginErrorRate.add(!passed);
        break;
      case 'quests-list':
        metrics.questsListDuration.add(duration);
        metrics.questsListErrorRate.add(!passed);
        break;
      case 'quests-detail':
        metrics.questsDetailDuration.add(duration);
        metrics.questsDetailErrorRate.add(!passed);
        break;
      case 'submissions-list':
        metrics.submissionsListDuration.add(duration);
        metrics.submissionsListErrorRate.add(!passed);
        break;
    }
  });

  sleep(0.3);
}
