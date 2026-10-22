import http from 'k6/http';
import { check, sleep } from 'k6';

export const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
// Por padrão usa /api/health, que verifica API + MariaDB sem precisar de token.
// Para testar endpoint protegido, defina JOURNEYS_PATH=/api/journeys e K6_TOKEN com um JWT válido.
export const JOURNEYS_PATH = __ENV.JOURNEYS_PATH || '/api/health';

export function get(path, extraChecks = {}, tags = {}) {
  const headers = {};
  if (__ENV.K6_TOKEN) headers.Authorization = `Bearer ${__ENV.K6_TOKEN}`;
  const res = http.get(`${BASE_URL}${path}`, { headers, tags });
  check(res, {
    'status HTTP esperado (2xx/3xx)': (r) => r.status >= 200 && r.status < 400,
    ...extraChecks
  });
  return res;
}

export function pause(seconds = 1) {
  sleep(seconds);
}
