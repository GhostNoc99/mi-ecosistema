import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export const options = {
  stages: [
    { duration: '30s', target: 20  },
    { duration: '30s', target: 50  },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 200 },
    { duration: '30s', target: 0   },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed:   ['rate<0.05'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/health`);

  check(res, {
    'status es 200': (r) => r.status === 200,
    'responde en menos de 2s': (r) => r.timings.duration < 2000,
  });

  sleep(1);
}