import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, HEADERS } from './common.js';

const SIMPLE_PATH = __ENV.HEALTH_PATH || '/api/health';
const JOURNEY_PATH = __ENV.JOURNEYS_PATH || '/api/health';

export const options = {
  scenarios: {
    simple_requests: {
      executor: 'constant-vus',
      vus: 5,
      duration: '60s',
      exec: 'simple'
    },
    journey_requests: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '20s', target: 20 },
        { duration: '20s', target: 30 },
        { duration: '20s', target: 0 }
      ],
      exec: 'journeys'
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.10'],
    'http_req_duration{kind:simple}': ['p(95)<3000']
  }
};

export function simple() {
  const response = http.get(`${BASE_URL}${SIMPLE_PATH}`, { headers: HEADERS, tags: { kind: 'simple' } });
  check(response, { 'rota simples permanece disponível': r => r.status >= 200 && r.status < 400 });
}

export function journeys() {
  const response = http.get(`${BASE_URL}${JOURNEY_PATH}`, { headers: HEADERS, tags: { kind: 'journeys' } });
  check(response, { 'rota de jornadas responde': r => r.status >= 200 && r.status < 400 });
}
