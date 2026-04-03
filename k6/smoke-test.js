import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuración de la prueba
export const options = {
  vus: 1,        // 1 usuario virtual
  duration: '10s', // durante 10 segundos
};

export default function () {
  // Llama al endpoint de salud
  const res = http.get('http://localhost:8000/health');

  // Verifica que la respuesta sea correcta
  check(res, {
    'status es 200': (r) => r.status === 200,
    'responde en menos de 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1); // espera 1 segundo entre peticiones
}