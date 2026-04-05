import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

const URL       = __ENV.URL      || 'http://localhost:8000/health';
const METHOD    = __ENV.METHOD   || 'GET';
const HEADERS   = JSON.parse(__ENV.HEADERS || '{"Content-Type": "application/json"}');
const BODY      = __ENV.BODY !== 'null' ? __ENV.BODY : null;
const VUS       = parseInt(__ENV.VUS || '5');
const DURATION  = __ENV.DURATION || '30s';
const TEST_TYPE = __ENV.TEST_TYPE || 'smoke';

// 🎯 Configuración dinámica según tipo de prueba
function getOptions() {
  if (TEST_TYPE === 'smoke') {
    // Sanidad básica — 1 usuario, duración corta
    return {
      vus: 1,
      duration: DURATION,
      thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed:   ['rate<0.01'],
      },
    };
  } else if (TEST_TYPE === 'load') {
    // Carga normal — sube gradualmente hasta VUS usuarios
    return {
      stages: [
        { duration: '30s', target: VUS },       // sube
        { duration: DURATION, target: VUS },    // mantiene
        { duration: '30s', target: 0 },         // baja
      ],
      thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed:   ['rate<0.01'],
      },
    };
  } else {
    // Stress — lleva al límite
    return {
      stages: [
        { duration: '30s', target: Math.floor(VUS * 0.25) },  // 25% de usuarios
        { duration: '30s', target: Math.floor(VUS * 0.50) },  // 50%
        { duration: '30s', target: Math.floor(VUS * 0.75) },  // 75%
        { duration: DURATION, target: VUS },                   // 100%
        { duration: '30s', target: 0 },                        // baja
      ],
      thresholds: {
        http_req_duration: ['p(95)<2000'],
        http_req_failed:   ['rate<0.05'],
      },
    };
  }
}

export const options = getOptions();

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