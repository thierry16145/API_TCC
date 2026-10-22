import { callTarget } from './common.js';

export const options = {
  vus: 1,
  iterations: 10,
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.01']
  }
};

export default function () {
  callTarget({ case: 'CT-PERF-01-baseline' });
}
