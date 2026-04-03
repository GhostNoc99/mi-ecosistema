import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20  },  // sube a 20 usuarios
    { duration: '30s', target: 50  },  // sube a 50 usuarios
    { duration: '30s', target: 100 },  // sube a 100 usuarios
    { duration: '30s', target: 200 },  // sube a 200 usuarios
    { duration: '30s', target: 0   },  // baja a 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 2 segundos máximo
    http_req_failed:   ['rate<0.05'],  // menos del 5% errores
  },
};

export default function () {
  const res = http.get('http://localhost:8000/health');

  check(res, {
    'status es 200': (r) => r.status === 200,
    'responde en menos de 2s': (r) => r.timings.duration < 2000,
  });

  sleep(1);
}