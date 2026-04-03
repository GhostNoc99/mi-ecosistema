import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export const options = {
  vus: 1,
  duration: '10s',
};

export default function () {
  const res = http.get(`${BASE_URL}/health`);

  check(res, {
    'status es 200': (r) => r.status === 200,
    'responde en menos de 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}