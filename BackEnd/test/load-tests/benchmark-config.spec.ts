import { createBenchmarkConfig, buildRoute } from '../../load-tests/benchmark-config';

describe('benchmark config', () => {
  it('builds route templates with dynamic parameters', () => {
    expect(buildRoute('/api/quests/:id', { id: 'quest-1' })).toBe(
      '/api/quests/quest-1',
    );
    expect(buildRoute('/api/quests/:questId/submissions/:id', {
      questId: 'q-1',
      id: 's-1',
    })).toBe('/api/quests/q-1/submissions/s-1');
  });

  it('includes the critical endpoint scenarios and thresholds', () => {
    const config = createBenchmarkConfig('http://localhost:3000', false);

    expect(config.scenarios.map((scenario) => scenario.name)).toEqual([
      'health-live',
      'health-deep',
      'auth-login',
      'quests-list',
      'quests-detail',
      'submissions-list',
    ]);

    expect(config.thresholds['quests_detail_duration']).toEqual(['p(95)<300']);
    expect(config.thresholds['http_req_failed']).toEqual(['rate<0.01']);
  });
});
