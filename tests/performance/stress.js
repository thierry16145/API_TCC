import { callTarget } from './common.js';

export const options = {
  stages: [
    { duration: '20s', target: 20 },
    { duration: '30s', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '20s', target: 0 }
  ],
  // No estresse, a saturação pode ser justamente o resultado observado; revisar métricas e erros após executar.
};

export default function () {
  callTarget({ case: 'CT-PERF-03-stress' });
}
