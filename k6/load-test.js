import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // sube a 10 usuarios en 30s
    { duration: '1m',  target: 10 },  // mantiene 10 usuarios por 1 min
    { duration: '30s', target: 0  },  // baja a 0 usuarios en 30s
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% debe responder en menos de 500ms
    http_req_failed:   ['rate<0.01'], // menos del 1% de errores
  },
};

export default function () {
  const res = http.get('http://localhost:8000/health');

  check(res, {
    'status es 200': (r) => r.status === 200,
    'responde en menos de 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}