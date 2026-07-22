/**
 * k6 load test profile — Quest listing and submissions flow
 *
 * Run:
 *   k6 run BackEnd/load-tests/quest-submissions.k6.ts \
 *     -e BASE_URL=http://localhost:3000 \
 *     -e JWT_TOKEN=<your-token>
 *
 * Stages:
 *   ramp-up   0 → 50 VUs over 1 min
 *   sustained 50 VUs for 3 min
 *   spike     50 → 100 VUs over 30 s
 *   sustained 100 VUs for 1 min
 *   ramp-down 100 → 0 VUs over 1 min
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ─── Custom metrics ───────────────────────────────────────────────────────────
const questListErrorRate   = new Rate('quest_list_errors');
const questDetailErrorRate = new Rate('quest_detail_errors');
const submissionErrorRate  = new Rate('submission_errors');
const questListDuration    = new Trend('quest_list_duration', true);
const submissionDuration   = new Trend('submission_duration', true);
const totalRequests        = new Counter('total_requests');

// ─── Options ─────────────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '1m',  target: 50  },  // ramp-up
    { duration: '3m',  target: 50  },  // sustained load
    { duration: '30s', target: 100 },  // spike
    { duration: '1m',  target: 100 },  // sustained spike
    { duration: '1m',  target: 0   },  // ramp-down
  ],
  thresholds: {
    // 95th-percentile response times
    quest_list_duration:  ['p(95)<500'],
    submission_duration:  ['p(95)<500'],
    // Error rates must stay below 1%
    quest_list_errors:    ['rate<0.01'],
    quest_detail_errors:  ['rate<0.01'],
    submission_errors:    ['rate<0.01'],
    // Overall HTTP failure rate
    http_req_failed:      ['rate<0.01'],
  },
};

const BASE_URL  = __ENV.BASE_URL  || 'http://localhost:3000';
const JWT_TOKEN = __ENV.JWT_TOKEN || '';

const headers = {
  'Content-Type': 'application/json',
  ...(JWT_TOKEN ? { Authorization: `Bearer ${JWT_TOKEN}` } : {}),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function randomPage(): number {
  return Math.floor(Math.random() * 5) + 1;
}

// ─── Default function (VU entry point) ───────────────────────────────────────
export default function () {
  let questId: string | null = null;

  group('Quest listing', () => {
    const page  = randomPage();
    const start = Date.now();
    const res   = http.get(
      `${BASE_URL}/api/quests?page=${page}&limit=20`,
      { headers },
    );
    questListDuration.add(Date.now() - start);
    totalRequests.add(1);

    const ok = check(res, {
      'quest list status 200': (r) => r.status === 200,
      'quest list has data':   (r) => {
        try {
          const body = JSON.parse(r.body as string);
          return Array.isArray(body?.data) || Array.isArray(body?.quests);
        } catch { return false; }
      },
    });
    questListErrorRate.add(!ok);

    // Pick a quest ID for the detail + submission steps
    try {
      const body = JSON.parse(res.body as string);
      const quests = body?.data ?? body?.quests ?? [];
      if (quests.length > 0) {
        questId = quests[Math.floor(Math.random() * quests.length)].id;
      }
    } catch { /* ignore */ }
  });

  sleep(0.5);

  if (questId) {
    group('Quest detail', () => {
      const res = http.get(`${BASE_URL}/api/quests/${questId}`, { headers });
      totalRequests.add(1);

      const ok = check(res, {
        'quest detail status 200': (r) => r.status === 200,
        'quest detail has id':     (r) => {
          try { return !!(JSON.parse(r.body as string)?.id); } catch { return false; }
        },
      });
      questDetailErrorRate.add(!ok);
    });

    sleep(0.3);

    group('Submit proof', () => {
      const payload = JSON.stringify({
        questId,
        proofUrl:    `https://example.com/proof/${Date.now()}`,
        description: 'Load test submission',
      });

      const start = Date.now();
      const res   = http.post(
        `${BASE_URL}/api/submissions`,
        payload,
        { headers },
      );
      submissionDuration.add(Date.now() - start);
      totalRequests.add(1);

      const ok = check(res, {
        'submission accepted': (r) => r.status === 201 || r.status === 200 || r.status === 429,
      });
      // 429 (rate-limited) is expected under load — not an error
      submissionErrorRate.add(!ok);
    });
  }

  sleep(1);
}