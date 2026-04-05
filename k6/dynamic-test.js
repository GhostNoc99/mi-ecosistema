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

function getOptions() {
  if (TEST_TYPE === 'smoke') {
    return {
      vus: 1,
      duration: DURATION,
      thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed:   ['rate<0.01'],
      },
    };
  } else if (TEST_TYPE === 'load') {
    return {
      stages: [
        { duration: '30s', target: VUS },
        { duration: DURATION, target: VUS },
        { duration: '30s', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed:   ['rate<0.01'],
      },
    };
  } else {
    return {
      stages: [
        { duration: '30s', target: Math.floor(VUS * 0.25) },
        { duration: '30s', target: Math.floor(VUS * 0.50) },
        { duration: '30s', target: Math.floor(VUS * 0.75) },
        { duration: DURATION, target: VUS },
        { duration: '30s', target: 0 },
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

// 🎯 Genera conclusión automática basada en métricas
function generarConclusion(data) {
  const p95         = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const errorRate   = data.metrics.http_req_failed?.values?.rate || 0;
  const reqRate     = data.metrics.http_reqs?.values?.rate || 0;
  const totalReqs   = data.metrics.http_reqs?.values?.count || 0;
  const failedReqs  = data.metrics.http_req_failed?.values?.passes || 0;

  // Determinar estado general
  let estado, emoji, color;
  if (errorRate === 0 && p95 < 500) {
    estado = "EXCELENTE"; emoji = "🟢"; color = "#27ae60";
  } else if (errorRate < 0.01 && p95 < 1000) {
    estado = "ACEPTABLE"; emoji = "🟡"; color = "#f39c12";
  } else if (errorRate < 0.05 && p95 < 2000) {
    estado = "DEGRADADO"; emoji = "🟠"; color = "#e67e22";
  } else {
    estado = "CRÍTICO"; emoji = "🔴"; color = "#e74c3c";
  }

  // Conclusión por tipo de prueba
  let descripcionTipo, recomendacion;
  if (TEST_TYPE === 'smoke') {
    descripcionTipo = "Prueba de Sanidad (Smoke Test)";
    recomendacion = errorRate === 0
      ? "✅ El servicio está funcionando correctamente. Apto para pruebas de mayor carga."
      : "❌ El servicio presenta errores básicos. Revisar antes de continuar con pruebas de carga.";
  } else if (TEST_TYPE === 'load') {
    descripcionTipo = `Prueba de Carga (Load Test) — ${VUS} usuarios simultáneos`;
    recomendacion = p95 < 500 && errorRate === 0
      ? `✅ El servicio maneja correctamente ${VUS} usuarios simultáneos. Se puede incrementar la carga.`
      : p95 < 1000
      ? `⚠️ El servicio responde dentro de límites aceptables con ${VUS} usuarios, pero hay margen de mejora.`
      : `❌ El servicio se degrada con ${VUS} usuarios. Considerar optimización o escalado.`;
  } else {
    descripcionTipo = `Prueba de Estrés (Stress Test) — hasta ${VUS} usuarios`;
    recomendacion = errorRate === 0
      ? `✅ El servicio aguantó ${VUS} usuarios sin errores. Capacidad máxima superior a ${VUS} usuarios.`
      : errorRate < 0.05
      ? `⚠️ El servicio presenta errores menores bajo estrés. Punto de quiebre cercano a ${VUS} usuarios.`
      : `❌ El servicio falla bajo estrés con ${VUS} usuarios. Requiere optimización urgente.`;
  }

  return `
  <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 20px auto; padding: 20px;">

    <div style="background: ${color}; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
      <h1 style="margin:0">${emoji} Estado General: ${estado}</h1>
      <p style="margin:5px 0; font-size: 18px;">${descripcionTipo}</p>
    </div>

    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px;">
      <div style="background: #3498db; color: white; padding: 15px; border-radius: 8px; text-align: center;">
        <div style="font-size: 28px; font-weight: bold;">${totalReqs}</div>
        <div>Total Requests</div>
      </div>
      <div style="background: ${errorRate === 0 ? '#27ae60' : '#e74c3c'}; color: white; padding: 15px; border-radius: 8px; text-align: center;">
        <div style="font-size: 28px; font-weight: bold;">${(errorRate * 100).toFixed(2)}%</div>
        <div>Tasa de Error</div>
      </div>
      <div style="background: ${p95 < 500 ? '#27ae60' : p95 < 1000 ? '#f39c12' : '#e74c3c'}; color: white; padding: 15px; border-radius: 8px; text-align: center;">
        <div style="font-size: 28px; font-weight: bold;">${p95.toFixed(0)}ms</div>
        <div>P95 Latencia</div>
      </div>
      <div style="background: #9b59b6; color: white; padding: 15px; border-radius: 8px; text-align: center;">
        <div style="font-size: 28px; font-weight: bold;">${reqRate.toFixed(1)}/s</div>
        <div>Req/Segundo</div>
      </div>
    </div>

    <div style="background: #f8f9fa; border-left: 5px solid ${color}; padding: 20px; border-radius: 4px; margin-bottom: 20px;">
      <h2 style="color: ${color}; margin-top: 0;">📋 Conclusión</h2>
      <p style="font-size: 16px; line-height: 1.6;">${recomendacion}</p>
    </div>

    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h2 style="color: #2c3e50; margin-top: 0;">📊 Detalle de Métricas</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #2c3e50; color: white;">
          <th style="padding: 10px; text-align: left;">Métrica</th>
          <th style="padding: 10px; text-align: left;">Valor</th>
          <th style="padding: 10px; text-align: left;">Estado</th>
        </tr>
        <tr style="background: white;">
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">P95 Latencia</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${p95.toFixed(2)}ms</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${p95 < 500 ? '✅ Excelente' : p95 < 1000 ? '⚠️ Aceptable' : '❌ Crítico'}</td>
        </tr>
        <tr style="background: #f8f9fa;">
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">Tasa de Error</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${(errorRate * 100).toFixed(2)}%</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${errorRate === 0 ? '✅ Sin errores' : errorRate < 0.01 ? '⚠️ Bajo' : '❌ Alto'}</td>
        </tr>
        <tr style="background: white;">
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">Requests/segundo</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${reqRate.toFixed(2)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">📊 Throughput</td>
        </tr>
        <tr style="background: #f8f9fa;">
          <td style="padding: 10px;">Total Requests</td>
          <td style="padding: 10px;">${totalReqs}</td>
          <td style="padding: 10px;">📈 Volumen total</td>
        </tr>
      </table>
    </div>

    <div style="background: #2c3e50; color: white; padding: 15px; border-radius: 8px; text-align: center;">
      <p style="margin: 0;">🔗 <b>Servicio probado:</b> ${METHOD} ${URL} | 
      👥 <b>Usuarios:</b> ${VUS} | 
      ⏱️ <b>Duración:</b> ${DURATION} |
      🧪 <b>Tipo:</b> ${TEST_TYPE.toUpperCase()}</p>
    </div>

  </div>
  `;
}

export function handleSummary(data) {
  const reporteCompleto = generarConclusion(data) + htmlReport(data);

  return {
    "k6/reports/dynamic-report.html": reporteCompleto,
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}