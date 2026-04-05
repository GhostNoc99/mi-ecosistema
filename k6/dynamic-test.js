import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

const URL       = __ENV.URL      || 'http://localhost:8000/health';
const METHOD    = __ENV.METHOD   || 'GET';
const HEADERS   = JSON.parse(__ENV.HEADERS || '{"Content-Type": "application/json"}');
const BODY      = __ENV.BODY !== 'null' ? __ENV.BODY : null;
const VUS       = parseInt(__ENV.VUS || '5');
const DURATION  = __ENV.DURATION || '30s';
const TEST_TYPE = __ENV.TEST_TYPE || 'smoke';

// Tracking de datos por segundo para gráficas
const timelineData = [];
let startTime = null;

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
  if (!startTime) startTime = new Date();

  const res = http.request(METHOD, URL, BODY, { headers: HEADERS });

  check(res, {
    'status 2xx': (r) => r.status >= 200 && r.status < 300,
    'responde en menos de 2s': (r) => r.timings.duration < 2000,
  });

  sleep(1);
}

function generarReporte(data) {
  const p95        = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const p50        = data.metrics.http_req_duration?.values?.['p(50)'] || 0;
  const avg        = data.metrics.http_req_duration?.values?.avg || 0;
  const minD       = data.metrics.http_req_duration?.values?.min || 0;
  const maxD       = data.metrics.http_req_duration?.values?.max || 0;
  const errorRate  = data.metrics.http_req_failed?.values?.rate || 0;
  const reqRate    = data.metrics.http_reqs?.values?.rate || 0;
  const totalReqs  = data.metrics.http_reqs?.values?.count || 0;
  const iterations = data.metrics.iterations?.values?.count || 0;
  const iterRate   = data.metrics.iterations?.values?.rate || 0;
  const tiempoReal = iterations > 0 ? (totalReqs / reqRate).toFixed(0) : 0;
  const vusMax     = data.metrics.vus_max?.values?.max || VUS;

  // Estado general
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

  // Conclusión por tipo
  let descripcionTipo, recomendacion;
  if (TEST_TYPE === 'smoke') {
    descripcionTipo = "Prueba de Sanidad (Smoke Test)";
    recomendacion = errorRate === 0
      ? "✅ El servicio está funcionando correctamente. Apto para pruebas de mayor carga."
      : "❌ El servicio presenta errores básicos. Revisar antes de continuar.";
  } else if (TEST_TYPE === 'load') {
    descripcionTipo = `Prueba de Carga (Load Test) — ${vusMax} usuarios simultáneos`;
    recomendacion = p95 < 500 && errorRate === 0
      ? `✅ El servicio maneja correctamente ${vusMax} usuarios. Se puede incrementar la carga.`
      : p95 < 1000
      ? `⚠️ Responde dentro de límites aceptables con ${vusMax} usuarios, pero hay margen de mejora.`
      : `❌ Se degrada con ${vusMax} usuarios. Considerar optimización o escalado.`;
  } else {
    descripcionTipo = `Prueba de Estrés (Stress Test) — hasta ${vusMax} usuarios`;
    recomendacion = errorRate === 0
      ? `✅ El servicio aguantó ${vusMax} usuarios sin errores.`
      : errorRate < 0.05
      ? `⚠️ Errores menores bajo estrés. Punto de quiebre cercano a ${vusMax} usuarios.`
      : `❌ Falla bajo estrés. Requiere optimización urgente.`;
  }

  // Datos para gráficas simuladas con Chart.js
  const latencyLabels = ['min', 'p50', 'avg', 'p95', 'max'];
  const latencyData   = [minD, p50, avg, p95, maxD];

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Performance Report — ${TEST_TYPE.toUpperCase()}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #f0f2f5; padding: 20px; }
    .container { max-width: 1000px; margin: auto; }
    .header { background: ${color}; color: white; padding: 25px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
    .header h1 { font-size: 32px; margin-bottom: 5px; }
    .header p { font-size: 16px; opacity: 0.9; }
    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
    .card { background: white; padding: 20px; border-radius: 10px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .card .value { font-size: 32px; font-weight: bold; margin-bottom: 5px; }
    .card .label { font-size: 13px; color: #666; }
    .card.blue .value { color: #3498db; }
    .card.green .value { color: #27ae60; }
    .card.orange .value { color: #e67e22; }
    .card.purple .value { color: #9b59b6; }
    .section { background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .section h2 { color: #2c3e50; margin-bottom: 20px; font-size: 18px; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px; }
    .conclusion { background: white; border-left: 6px solid ${color}; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .conclusion h2 { color: ${color}; margin-bottom: 10px; }
    .conclusion p { font-size: 16px; line-height: 1.8; color: #444; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #2c3e50; color: white; padding: 12px; text-align: left; }
    td { padding: 12px; border-bottom: 1px solid #ecf0f1; }
    tr:nth-child(even) td { background: #f8f9fa; }
    .badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; }
    .badge.ok { background: #d5f5e3; color: #27ae60; }
    .badge.warn { background: #fdebd0; color: #e67e22; }
    .badge.error { background: #fadbd8; color: #e74c3c; }
    .charts { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .chart-box { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .chart-box h3 { color: #2c3e50; margin-bottom: 15px; font-size: 15px; }
    .footer { background: #2c3e50; color: white; padding: 15px; border-radius: 10px; text-align: center; font-size: 13px; }
    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
    .info-item { background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .info-item .key { font-size: 12px; color: #999; margin-bottom: 4px; }
    .info-item .val { font-size: 15px; font-weight: bold; color: #2c3e50; word-break: break-all; }
  </style>
</head>
<body>
<div class="container">

  <!-- HEADER -->
  <div class="header">
    <h1>${emoji} ${estado} — ${descripcionTipo}</h1>
    <p>Tiempo real de ejecución: ${tiempoReal}s &nbsp;|&nbsp; Usuarios máximos: ${vusMax} &nbsp;|&nbsp; ${new Date().toLocaleString()}</p>
  </div>

  <!-- INFO DEL SERVICIO -->
  <div class="info-grid">
    <div class="info-item"><div class="key">🔗 URL</div><div class="val">${URL}</div></div>
    <div class="info-item"><div class="key">📡 Método</div><div class="val">${METHOD}</div></div>
    <div class="info-item"><div class="key">🧪 Tipo de Prueba</div><div class="val">${TEST_TYPE.toUpperCase()}</div></div>
    <div class="info-item"><div class="key">👥 VUs configurados</div><div class="val">${VUS}</div></div>
    <div class="info-item"><div class="key">⏱️ Duración configurada</div><div class="val">${DURATION}</div></div>
    <div class="info-item"><div class="key">⏱️ Tiempo real ejecución</div><div class="val">${tiempoReal}s</div></div>
  </div>

  <!-- CARDS DE MÉTRICAS -->
  <div class="cards">
    <div class="card blue">
      <div class="value">${iterations}</div>
      <div class="label">🔄 Iteraciones</div>
    </div>
    <div class="card purple">
      <div class="value">${iterRate.toFixed(1)}/s</div>
      <div class="label">⚡ Iteraciones/seg</div>
    </div>
    <div class="card ${errorRate === 0 ? 'green' : 'orange'}">
      <div class="value">${(errorRate * 100).toFixed(2)}%</div>
      <div class="label">❌ Tasa de Error</div>
    </div>
    <div class="card ${p95 < 500 ? 'green' : 'orange'}">
      <div class="value">${p95.toFixed(0)}ms</div>
      <div class="label">📊 P95 Latencia</div>
    </div>
  </div>

  <!-- GRÁFICAS -->
  <div class="charts">
    <div class="chart-box">
      <h3>📊 Distribución de Latencia (ms)</h3>
      <canvas id="latencyChart" height="200"></canvas>
    </div>
    <div class="chart-box">
      <h3>🥧 Distribución de Resultados</h3>
      <canvas id="resultsChart" height="200"></canvas>
    </div>
  </div>

  <!-- CONCLUSIÓN -->
  <div class="conclusion">
    <h2>📋 Conclusión Automática</h2>
    <p>${recomendacion}</p>
  </div>

  <!-- TABLA DE MÉTRICAS -->
  <div class="section">
    <h2>📈 Detalle de Métricas</h2>
    <table>
      <tr><th>Métrica</th><th>Valor</th><th>Estado</th></tr>
      <tr>
        <td>Iteraciones totales</td>
        <td>${iterations}</td>
        <td><span class="badge ok">📊 Volumen</span></td>
      </tr>
      <tr>
        <td>Iteraciones/segundo</td>
        <td>${iterRate.toFixed(2)}</td>
        <td><span class="badge ok">⚡ Throughput</span></td>
      </tr>
      <tr>
        <td>Total Requests</td>
        <td>${totalReqs}</td>
        <td><span class="badge ok">📊 Volumen</span></td>
      </tr>
      <tr>
        <td>Requests/segundo</td>
        <td>${reqRate.toFixed(2)}</td>
        <td><span class="badge ok">⚡ Throughput</span></td>
      </tr>
      <tr>
        <td>Latencia Mínima</td>
        <td>${minD.toFixed(2)}ms</td>
        <td><span class="badge ok">✅ Mejor caso</span></td>
      </tr>
      <tr>
        <td>Latencia Promedio</td>
        <td>${avg.toFixed(2)}ms</td>
        <td><span class="badge ${avg < 500 ? 'ok' : avg < 1000 ? 'warn' : 'error'}">${avg < 500 ? '✅ Óptimo' : avg < 1000 ? '⚠️ Aceptable' : '❌ Lento'}</span></td>
      </tr>
      <tr>
        <td>Latencia P50 (mediana)</td>
        <td>${p50.toFixed(2)}ms</td>
        <td><span class="badge ${p50 < 500 ? 'ok' : 'warn'}">${p50 < 500 ? '✅ Óptimo' : '⚠️ Revisar'}</span></td>
      </tr>
      <tr>
        <td>Latencia P95</td>
        <td>${p95.toFixed(2)}ms</td>
        <td><span class="badge ${p95 < 500 ? 'ok' : p95 < 1000 ? 'warn' : 'error'}">${p95 < 500 ? '✅ Excelente' : p95 < 1000 ? '⚠️ Aceptable' : '❌ Crítico'}</span></td>
      </tr>
      <tr>
        <td>Latencia Máxima</td>
        <td>${maxD.toFixed(2)}ms</td>
        <td><span class="badge ${maxD < 1000 ? 'ok' : maxD < 2000 ? 'warn' : 'error'}">${maxD < 1000 ? '✅ Ok' : maxD < 2000 ? '⚠️ Revisar' : '❌ Crítico'}</span></td>
      </tr>
      <tr>
        <td>Tasa de Error</td>
        <td>${(errorRate * 100).toFixed(2)}%</td>
        <td><span class="badge ${errorRate === 0 ? 'ok' : errorRate < 0.05 ? 'warn' : 'error'}">${errorRate === 0 ? '✅ Sin errores' : errorRate < 0.05 ? '⚠️ Bajo' : '❌ Alto'}</span></td>
      </tr>
      <tr>
        <td>Usuarios Virtuales Máx</td>
        <td>${vusMax}</td>
        <td><span class="badge ok">👥 Carga máxima</span></td>
      </tr>
      <tr>
        <td>Tiempo Real Ejecución</td>
        <td>${tiempoReal}s</td>
        <td><span class="badge ok">⏱️ Duración real</span></td>
      </tr>
    </table>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    🚀 Performance Report generado automáticamente &nbsp;|&nbsp;
    ${METHOD} ${URL} &nbsp;|&nbsp;
    ${TEST_TYPE.toUpperCase()} &nbsp;|&nbsp;
    ${new Date().toLocaleString()}
  </div>

</div>

<script>
  // Gráfica de latencia
  new Chart(document.getElementById('latencyChart'), {
    type: 'bar',
    data: {
      labels: ${JSON.stringify(latencyLabels)},
      datasets: [{
        label: 'Latencia (ms)',
        data: ${JSON.stringify(latencyData.map(v => parseFloat(v.toFixed(2))))},
        backgroundColor: ['#3498db', '#27ae60', '#f39c12', '#e74c3c', '#9b59b6'],
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, title: { display: true, text: 'ms' } } }
    }
  });

  // Gráfica de resultados
  const exitosos = ${totalReqs} - Math.round(${totalReqs} * ${errorRate});
  const fallidos = Math.round(${totalReqs} * ${errorRate});
  new Chart(document.getElementById('resultsChart'), {
    type: 'doughnut',
    data: {
      labels: ['Exitosos', 'Fallidos'],
      datasets: [{
        data: [exitosos, fallidos || 0.001],
        backgroundColor: ['#27ae60', '#e74c3c'],
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (ctx) => ctx.label + ': ' + ctx.raw + ' requests'
          }
        }
      }
    }
  });
</script>
</body>
</html>`;
}

export function handleSummary(data) {
  return {
    "k6/reports/dynamic-report.html": generarReporte(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}