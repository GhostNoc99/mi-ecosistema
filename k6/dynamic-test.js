import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

// Variables dinámicas desde Jenkins
const URL      = __ENV.URL      || 'http://localhost:8000/health';
const METHOD   = __ENV.METHOD   || 'GET';
const HEADERS  = JSON.parse(__ENV.HEADERS  || '{"Content-Type": "application/json"}');
const BODY     = __ENV.BODY     !== 'null' ? __ENV.BODY : null;
const VUS      = parseInt(__ENV.VUS      || '5');
const DURATION = __ENV.DURATION || '30s';

export const options = {
  vus: VUS,
  duration: DURATION,
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed:   ['rate<0.05'],
  },
};

export default function () {
  const res = http.request(METHOD, URL, BODY, { headers: HEADERS });

  check(res, {
    'status 2xx': (r) => r.status >= 200 && r.status < 300,
    'responde en menos de 2s': (r) => r.timings.duration < 2000,
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    "k6/reports/dynamic-report.html": htmlReport(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}