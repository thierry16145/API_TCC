import { callTarget } from './common.js';

export const options = {
  stages: [
    { duration: '20s', target: 80 },
    { duration: '20s', target: 80 },
    { duration: '10s', target: 0 },
    { duration: '30s', target: 1 }
  ],
  thresholds: {
    http_req_failed: ['rate<0.10'],
    http_req_duration: ['p(95)<5000']
  }
};

export default function () {
  callTarget({ case: 'CT-PERF-04-recovery' });
}
