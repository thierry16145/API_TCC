import { callTarget } from './common.js';

export const options = {
  stages: [
    { duration: '20s', target: 5 },
    { duration: '40s', target: 20 },
    { duration: '30s', target: 20 },
    { duration: '20s', target: 0 }
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<5000']
  }
};

export default function () {
  callTarget({ case: 'CT-PERF-02-load' });
}
