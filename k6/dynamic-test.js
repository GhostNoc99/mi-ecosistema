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
//nombre de flujo

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

//export const options = getOptions();
export const options = {
  ...getOptions(),
  summaryTrendStats: ['min', 'avg', 'med', 'max', 'p(50)', 'p(90)', 'p(95)', 'p(99)'],
};

function getEscenario() {
  if (TEST_TYPE === 'smoke') {
    return {
      titulo: "Prueba de Sanidad (Smoke Test)",
      descripcion: "1 usuario durante " + DURATION,
      diagrama: `
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <div style="background:#3498db;color:white;padding:10px 20px;border-radius:6px;text-align:center;">
            <div style="font-size:22px;font-weight:bold;">1</div>
            <div style="font-size:11px;">usuario</div>
          </div>
          <div style="font-size:24px;color:#666;">→</div>
          <div style="background:#27ae60;color:white;padding:10px 20px;border-radius:6px;text-align:center;">
            <div style="font-size:22px;font-weight:bold;">${DURATION}</div>
            <div style="font-size:11px;">duración total</div>
          </div>
        </div>
        <p style="margin-top:10px;color:#666;font-size:13px;">
          ℹ️ En smoke test el número de usuarios siempre es 1.
        </p>`
    };
  } else if (TEST_TYPE === 'load') {
    return {
      titulo: "Prueba de Carga (Load Test)",
      descripcion: `Sube a ${VUS} usuarios, mantienes ${DURATION}, luego baja`,
      diagrama: `
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <div style="background:#3498db;color:white;padding:10px 20px;border-radius:6px;text-align:center;">
            <div style="font-size:22px;font-weight:bold;">0→${VUS}</div>
            <div style="font-size:11px;">sube en 30s</div>
          </div>
          <div style="font-size:24px;color:#666;">→</div>
          <div style="background:#27ae60;color:white;padding:10px 20px;border-radius:6px;text-align:center;">
            <div style="font-size:22px;font-weight:bold;">${VUS}</div>
            <div style="font-size:11px;">mantiene ${DURATION}</div>
          </div>
          <div style="font-size:24px;color:#666;">→</div>
          <div style="background:#e74c3c;color:white;padding:10px 20px;border-radius:6px;text-align:center;">
            <div style="font-size:22px;font-weight:bold;">${VUS}→0</div>
            <div style="font-size:11px;">baja en 30s</div>
          </div>
        </div>
        <p style="margin-top:10px;color:#666;font-size:13px;">
          ℹ️ El máximo de usuarios simultáneos es ${VUS}.
        </p>`
    };
  } else {
    const v1 = Math.floor(VUS * 0.25);
    const v2 = Math.floor(VUS * 0.50);
    const v3 = Math.floor(VUS * 0.75);
    return {
      titulo: "Prueba de Estrés (Stress Test)",
      descripcion: `Escala gradualmente: ${v1}→${v2}→${v3}→${VUS} usuarios`,
      diagrama: `
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <div style="background:#3498db;color:white;padding:10px 15px;border-radius:6px;text-align:center;">
            <div style="font-size:20px;font-weight:bold;">${v1}</div>
            <div style="font-size:11px;">25% - 30s</div>
          </div>
          <div style="font-size:20px;color:#666;">→</div>
          <div style="background:#f39c12;color:white;padding:10px 15px;border-radius:6px;text-align:center;">
            <div style="font-size:20px;font-weight:bold;">${v2}</div>
            <div style="font-size:11px;">50% - 30s</div>
          </div>
          <div style="font-size:20px;color:#666;">→</div>
          <div style="background:#e67e22;color:white;padding:10px 15px;border-radius:6px;text-align:center;">
            <div style="font-size:20px;font-weight:bold;">${v3}</div>
            <div style="font-size:11px;">75% - 30s</div>
          </div>
          <div style="font-size:20px;color:#666;">→</div>
          <div style="background:#e74c3c;color:white;padding:10px 15px;border-radius:6px;text-align:center;">
            <div style="font-size:20px;font-weight:bold;">${VUS}</div>
            <div style="font-size:11px;">100% - ${DURATION}</div>
          </div>
          <div style="font-size:20px;color:#666;">→</div>
          <div style="background:#7f8c8d;color:white;padding:10px 15px;border-radius:6px;text-align:center;">
            <div style="font-size:20px;font-weight:bold;">0</div>
            <div style="font-size:11px;">baja - 30s</div>
          </div>
        </div>
        <p style="margin-top:10px;color:#666;font-size:13px;">
          ℹ️ El pico máximo es ${VUS} usuarios. La duración es el tiempo en el pico.
        </p>`
    };
  }
}

export default function () {
  const res = http.request(METHOD, URL, BODY, { headers: HEADERS });
  check(res, {
    'status 2xx': (r) => r.status >= 200 && r.status < 300,
    'responde en menos de 2s': (r) => r.timings.duration < 2000,
  });
  sleep(1);
}

function generarReporte(data) {
  // ── Métricas base ──
  const dur       = data.metrics.http_req_duration?.values || {};
  const p50       = dur['p(50)']  || 0;
  const p90       = dur['p(90)']  || 0;
  const p95       = dur['p(95)']  || 0;
  const p99       = dur['p(99)']  || 0;
  const avg       = dur.avg       || 0;
  const minD      = dur.min       || 0;
  const maxD      = dur.max       || 0;

  const connect   = data.metrics.http_req_connecting?.values || {};
  const connAvg   = connect.avg || 0;
  const connMax   = connect.max || 0;
  const connMin   = connect.min || 0;
  const connP95   = connect['p(95)'] || 0;

  const blocked   = data.metrics.http_req_blocked?.values || {};
  const blockedAvg = blocked.avg || 0;

  const sending   = data.metrics.http_req_sending?.values || {};
  const receiving = data.metrics.http_req_receiving?.values || {};
  const waiting   = data.metrics.http_req_waiting?.values || {};

  const errorRate  = data.metrics.http_req_failed?.values?.rate  || 0;
  const reqRate    = data.metrics.http_reqs?.values?.rate         || 0;
  const totalReqs  = data.metrics.http_reqs?.values?.count        || 0;
  const iterations = data.metrics.iterations?.values?.count       || 0;
  const iterRate   = data.metrics.iterations?.values?.rate        || 0;
  const vusMax     = data.metrics.vus_max?.values?.max            || VUS;
  const dataRecv   = data.metrics.data_received?.values?.count    || 0;
  const dataSent   = data.metrics.data_sent?.values?.count        || 0;
  const tiempoReal = reqRate > 0 ? (totalReqs / reqRate).toFixed(0) : 0;

  const exitosos   = totalReqs - Math.round(totalReqs * errorRate);
  const fallidos   = Math.round(totalReqs * errorRate);
  const throughput = reqRate.toFixed(2);
  const recvKB     = (dataRecv / 1024).toFixed(2);
  const sentKB     = (dataSent / 1024).toFixed(2);
  const avgBytes   = totalReqs > 0 ? (dataRecv / totalReqs).toFixed(0) : 0;

  // ── Estado general ──
  let estado, emoji, color;
  if (errorRate === 0 && p95 < 500) {
    estado = "EXCELENTE"; emoji = "🟢"; color = "#27ae60";
  } else if (errorRate < 0.01 && p95 < 1000) {
    estado = "ACEPTABLE"; emoji = "🟡"; color = "#f39c12";
  } else if (errorRate < 0.05 && p95 < 2000) {
    estado = "DEGRADADO"; emoji = "🟠"; color = "#e67e22";
  } else {
    estado = "CRÍTICO";   emoji = "🔴"; color = "#e74c3c";
  }

  // ── Conclusión ──
  let recomendacion;
  if (TEST_TYPE === 'smoke') {
    recomendacion = errorRate === 0
      ? "✅ El servicio está funcionando correctamente con carga mínima. Apto para pruebas de mayor carga."
      : "❌ El servicio presenta errores con un solo usuario. Revisar antes de continuar.";
  } else if (TEST_TYPE === 'load') {
    recomendacion = p95 < 500 && errorRate === 0
      ? `✅ El servicio maneja correctamente ${vusMax} usuarios simultáneos. Se puede incrementar la carga.`
      : p95 < 1000
      ? `⚠️ Responde dentro de límites aceptables con ${vusMax} usuarios, pero hay margen de mejora.`
      : `❌ Se degrada con ${vusMax} usuarios. Considerar optimización o escalado horizontal.`;
  } else {
    recomendacion = errorRate === 0
      ? `✅ El servicio aguantó el pico de ${vusMax} usuarios sin errores.`
      : errorRate < 0.05
      ? `⚠️ Errores menores bajo estrés. Punto de quiebre cercano a ${vusMax} usuarios.`
      : `❌ Falla bajo estrés con ${vusMax} usuarios. Requiere optimización urgente.`;
  }

  const escenario = getEscenario();

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Performance Report — ${TEST_TYPE.toUpperCase()}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #f0f2f5; padding: 20px; color: #2c3e50; }
    .container { max-width: 1100px; margin: auto; }

    .header { background: ${color}; color: white; padding: 25px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
    .header h1 { font-size: 26px; margin-bottom: 5px; }
    .header p  { font-size: 13px; opacity: 0.9; }

    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
    .info-item { background: white; padding: 14px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .info-item .key { font-size: 10px; color: #999; text-transform: uppercase; margin-bottom: 4px; }
    .info-item .val { font-size: 14px; font-weight: bold; word-break: break-all; }

    .section { background: white; padding: 22px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .section h2 { font-size: 16px; margin-bottom: 15px; border-bottom: 2px solid #ecf0f1; padding-bottom: 8px; }

    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .card { background: white; padding: 18px; border-radius: 10px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .card .value { font-size: 28px; font-weight: bold; margin-bottom: 4px; }
    .card .label { font-size: 11px; color: #666; }

    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #2c3e50; color: white; padding: 10px 12px; text-align: left; }
    td { padding: 10px 12px; border-bottom: 1px solid #ecf0f1; }
    tr:nth-child(even) td { background: #f8f9fa; }

    .badge { padding: 3px 9px; border-radius: 10px; font-size: 11px; font-weight: bold; }
    .badge.ok    { background: #d5f5e3; color: #27ae60; }
    .badge.warn  { background: #fdebd0; color: #e67e22; }
    .badge.error { background: #fadbd8; color: #e74c3c; }
    .badge.info  { background: #d6eaf8; color: #2980b9; }

    .charts2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .charts3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .chart-box { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .chart-box h3 { font-size: 13px; margin-bottom: 12px; color: #2c3e50; }

    .conclusion { background: white; border-left: 6px solid ${color}; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .conclusion h2 { color: ${color}; margin-bottom: 8px; font-size: 16px; }
    .conclusion p  { font-size: 15px; line-height: 1.8; color: #444; }

    .escenario { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .escenario h2 { font-size: 16px; margin-bottom: 15px; border-bottom: 2px solid #ecf0f1; padding-bottom: 8px; }

    .footer { background: #2c3e50; color: white; padding: 14px; border-radius: 10px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
<div class="container">

  <!-- HEADER -->
  <div class="header">
    <h1>${emoji} ${estado} — ${escenario.titulo}</h1>
    <p>${escenario.descripcion} &nbsp;|&nbsp; Tiempo real: ${tiempoReal}s &nbsp;|&nbsp; ${new Date().toLocaleString()}</p>
  </div>

  <!-- INFO DEL SERVICIO -->
  <div class="info-grid">
    <div class="info-item"><div class="key">🔗 URL</div><div class="val">${URL}</div></div>
    <div class="info-item"><div class="key">📡 Método</div><div class="val">${METHOD}</div></div>
    <div class="info-item"><div class="key">🧪 Tipo</div><div class="val">${TEST_TYPE.toUpperCase()}</div></div>
    <div class="info-item"><div class="key">👥 VUs máximos reales</div><div class="val">${vusMax}</div></div>
    <div class="info-item"><div class="key">⏱️ Duración configurada</div><div class="val">${DURATION}</div></div>
    <div class="info-item"><div class="key">⏱️ Tiempo real ejecución</div><div class="val">${tiempoReal}s</div></div>
  </div>

  <!-- ESCENARIO VISUAL -->
  <div class="escenario">
    <h2>🎯 Escenario de Prueba</h2>
    ${escenario.diagrama}
  </div>

  <!-- CARDS PRINCIPALES -->
  <div class="cards">
    <div class="card">
      <div class="value" style="color:#3498db">${iterations}</div>
      <div class="label">🔄 Iteraciones totales</div>
    </div>
    <div class="card">
      <div class="value" style="color:#9b59b6">${iterRate.toFixed(2)}/s</div>
      <div class="label">⚡ Iteraciones/seg</div>
    </div>
    <div class="card">
      <div class="value" style="color:${errorRate === 0 ? '#27ae60' : '#e74c3c'}">${(errorRate*100).toFixed(2)}%</div>
      <div class="label">❌ Tasa de Error</div>
    </div>
    <div class="card">
      <div class="value" style="color:${p95 < 500 ? '#27ae60' : '#e67e22'}">${p95.toFixed(0)}ms</div>
      <div class="label">📊 P95 Latencia</div>
    </div>
  </div>

  <!-- 1. SUMMARY (como JMeter) -->
  <div class="section">
    <h2>📋 1. Summary</h2>
    <table>
      <tr>
        <th>Label</th>
        <th># Samples</th>
        <th>Average</th>
        <th>Min</th>
        <th>Max</th>
        <th>Error %</th>
        <th>Throughput</th>
        <th>Recv KB/s</th>
        <th>Sent KB/s</th>
        <th>Avg Bytes</th>
      </tr>
      <tr>
        <td><b>${METHOD} ${URL.split('/').pop() || '/'}</b></td>
        <td>${totalReqs}</td>
        <td>${avg.toFixed(0)}ms</td>
        <td>${minD.toFixed(0)}ms</td>
        <td>${maxD.toFixed(0)}ms</td>
        <td><span class="badge ${errorRate === 0 ? 'ok' : errorRate < 0.05 ? 'warn' : 'error'}">${(errorRate*100).toFixed(2)}%</span></td>
        <td>${throughput}/s</td>
        <td>${recvKB}</td>
        <td>${sentKB}</td>
        <td>${avgBytes}B</td>
      </tr>
      <tr style="background:#f0f2f5; font-weight:bold;">
        <td>TOTAL</td>
        <td>${totalReqs}</td>
        <td>${avg.toFixed(0)}ms</td>
        <td>${minD.toFixed(0)}ms</td>
        <td>${maxD.toFixed(0)}ms</td>
        <td><span class="badge ${errorRate === 0 ? 'ok' : errorRate < 0.05 ? 'warn' : 'error'}">${(errorRate*100).toFixed(2)}%</span></td>
        <td>${throughput}/s</td>
        <td>${recvKB}</td>
        <td>${sentKB}</td>
        <td>${avgBytes}B</td>
      </tr>
    </table>
  </div>

  <!-- 2. AGGREGATE (como JMeter) -->
  <div class="section">
    <h2>📊 2. Aggregate Report</h2>
    <table>
      <tr>
        <th>Label</th>
        <th># Samples</th>
        <th>Average</th>
        <th>Median (p50)</th>
        <th>90% Line</th>
        <th>95% Line</th>
        <th>99% Line</th>
        <th>Min</th>
        <th>Maximum</th>
        <th>Error %</th>
        <th>Throughput</th>
      </tr>
      <tr>
        <td><b>${METHOD} ${URL.split('/').pop() || '/'}</b></td>
        <td>${totalReqs}</td>
        <td>${avg.toFixed(0)}ms</td>
        <td>${p50.toFixed(0)}ms</td>
        <td>${p90.toFixed(0)}ms</td>
        <td>${p95.toFixed(0)}ms</td>
        <td>${p99.toFixed(0)}ms</td>
        <td>${minD.toFixed(0)}ms</td>
        <td>${maxD.toFixed(0)}ms</td>
        <td><span class="badge ${errorRate === 0 ? 'ok' : errorRate < 0.05 ? 'warn' : 'error'}">${(errorRate*100).toFixed(2)}%</span></td>
        <td>${throughput}/s</td>
      </tr>
      <tr style="background:#f0f2f5; font-weight:bold;">
        <td>TOTAL</td>
        <td>${totalReqs}</td>
        <td>${avg.toFixed(0)}ms</td>
        <td>${p50.toFixed(0)}ms</td>
        <td>${p90.toFixed(0)}ms</td>
        <td>${p95.toFixed(0)}ms</td>
        <td>${p99.toFixed(0)}ms</td>
        <td>${minD.toFixed(0)}ms</td>
        <td>${maxD.toFixed(0)}ms</td>
        <td><span class="badge ${errorRate === 0 ? 'ok' : errorRate < 0.05 ? 'warn' : 'error'}">${(errorRate*100).toFixed(2)}%</span></td>
        <td>${throughput}/s</td>
      </tr>
    </table>
  </div>

  <!-- 3. GRÁFICAS -->
  <div class="charts2">
    <!-- Códigos de respuesta -->
    <div class="chart-box">
      <h3>📊 3. Códigos de Respuesta</h3>
      <canvas id="responseCodesChart" height="220"></canvas>
    </div>
    <!-- Distribución de latencia -->
    <div class="chart-box">
      <h3>⏱️ 4. Distribución de Latencia (ms)</h3>
      <canvas id="latencyChart" height="220"></canvas>
    </div>
  </div>

  <div class="charts2">
    <!-- Connect time -->
    <div class="chart-box">
      <h3>🔌 5. Connect Time (ms)</h3>
      <canvas id="connectChart" height="220"></canvas>
    </div>
    <!-- Transacciones -->
    <div class="chart-box">
      <h3>⚡ 6. Transacciones e Iteraciones</h3>
      <canvas id="transChart" height="220"></canvas>
    </div>
  </div>

  <!-- CONNECT TIME DETAIL -->
  <div class="section">
    <h2>🔌 5. Connect Time — Detalle</h2>
    <table>
      <tr><th>Métrica</th><th>Valor</th><th>Estado</th></tr>
      <tr><td>Connect Time Mínimo</td><td>${connMin.toFixed(2)}ms</td><td><span class="badge ok">✅ Mejor caso</span></td></tr>
      <tr><td>Connect Time Promedio</td><td>${connAvg.toFixed(2)}ms</td><td><span class="badge ${connAvg < 100 ? 'ok' : connAvg < 500 ? 'warn' : 'error'}">${connAvg < 100 ? '✅ Óptimo' : connAvg < 500 ? '⚠️ Revisar' : '❌ Lento'}</span></td></tr>
      <tr><td>Connect Time P95</td><td>${connP95.toFixed(2)}ms</td><td><span class="badge ${connP95 < 200 ? 'ok' : connP95 < 1000 ? 'warn' : 'error'}">${connP95 < 200 ? '✅ Ok' : connP95 < 1000 ? '⚠️ Revisar' : '❌ Crítico'}</span></td></tr>
      <tr><td>Connect Time Máximo</td><td>${connMax.toFixed(2)}ms</td><td><span class="badge ${connMax < 500 ? 'ok' : connMax < 2000 ? 'warn' : 'error'}">${connMax < 500 ? '✅ Ok' : connMax < 2000 ? '⚠️ Pico alto' : '❌ Crítico'}</span></td></tr>
      <tr><td>Tiempo Bloqueado (avg)</td><td>${blockedAvg.toFixed(2)}ms</td><td><span class="badge info">📊 Overhead red</span></td></tr>
      <tr><td>Tiempo Enviando (avg)</td><td>${sending.avg?.toFixed(2) || 0}ms</td><td><span class="badge info">📤 Upload</span></td></tr>
      <tr><td>Tiempo Recibiendo (avg)</td><td>${receiving.avg?.toFixed(2) || 0}ms</td><td><span class="badge info">📥 Download</span></td></tr>
      <tr><td>Tiempo Esperando (avg)</td><td>${waiting.avg?.toFixed(2) || 0}ms</td><td><span class="badge info">⏳ TTFB</span></td></tr>
    </table>
  </div>

  <!-- CONCLUSIÓN -->
  <div class="conclusion">
    <h2>📋 Conclusión Automática</h2>
    <p>${recomendacion}</p>
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
  // 3. Códigos de respuesta
  new Chart(document.getElementById('responseCodesChart'), {
    type: 'bar',
    data: {
      labels: ['2xx (Exitosos)', '4xx/5xx (Errores)'],
      datasets: [{
        label: 'Requests',
        data: [${exitosos}, ${fallidos || 0}],
        backgroundColor: ['#27ae60', '#e74c3c'],
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ctx.raw + ' requests' } }
      },
      scales: { y: { beginAtZero: true, title: { display: true, text: 'Requests' } } }
    }
  });

  // 4. Distribución de latencia
  new Chart(document.getElementById('latencyChart'), {
    type: 'bar',
    data: {
      labels: ['Min', 'P50', 'Avg', 'P90', 'P95', 'P99', 'Max'],
      datasets: [{
        label: 'Latencia (ms)',
        data: [
          ${minD.toFixed(2)},
          ${p50.toFixed(2)},
          ${avg.toFixed(2)},
          ${p90.toFixed(2)},
          ${p95.toFixed(2)},
          ${p99.toFixed(2)},
          ${maxD.toFixed(2)}
        ],
        backgroundColor: ['#3498db','#27ae60','#f39c12','#e67e22','#e74c3c','#9b59b6','#c0392b'],
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, title: { display: true, text: 'ms' } } }
    }
  });

  // 5. Connect time
  new Chart(document.getElementById('connectChart'), {
    type: 'bar',
    data: {
      labels: ['Min', 'Avg', 'P95', 'Max'],
      datasets: [{
        label: 'Connect Time (ms)',
        data: [
          ${connMin.toFixed(2)},
          ${connAvg.toFixed(2)},
          ${connP95.toFixed(2)},
          ${connMax.toFixed(2)}
        ],
        backgroundColor: ['#3498db','#f39c12','#e67e22','#e74c3c'],
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, title: { display: true, text: 'ms' } } }
    }
  });

  // 6. Transacciones e iteraciones
  new Chart(document.getElementById('transChart'), {
    type: 'doughnut',
    data: {
      labels: ['Iteraciones exitosas', 'Requests fallidos'],
      datasets: [{
        data: [${iterations}, ${fallidos || 0.001}],
        backgroundColor: ['#27ae60', '#e74c3c'],
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: { label: (ctx) => ctx.label + ': ' + ctx.raw }
        }
      }
    }
  });
</script>
</body>
</html>`;
}

export function handleSummary(data) {
  const reportName = __ENV.REPORT_NAME || 'dynamic-report.html';
  return {
    [`k6/reports/${reportName}`]: generarReporte(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}