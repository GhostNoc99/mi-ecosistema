import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m',  target: 10 },
    { duration: '30s', target: 0  },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed:   ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/health`);
  check(res, {
    'status es 200': (r) => r.status === 200,
    'responde en menos de 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}

// Genera el reporte al finalizar
export function handleSummary(data) {
  return {
    "k6/reports/report.html": htmlReport(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}