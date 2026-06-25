import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 2,
  duration: '10s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500']
  }
};

export default function () {
  const res = http.get('http://localhost:3002/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'body has UP': (r) => r.body.includes('UP')
  });
}
