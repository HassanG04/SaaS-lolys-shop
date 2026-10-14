import http from 'k6/http'
import { check, sleep } from 'k6'
import { Counter } from 'k6/metrics'
import { TARGET_URL, getHeaders } from './config.js'

const cRateLimitHits = new Counter('rate_limit_hits_count')
const cSuccessfulHits = new Counter('successful_hits_count')

export const options = {
  scenarios: {
    abuse_burst: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 15,
      maxDuration: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<1.0'], // Expected: later requests hit 400 with SYS-003
    rate_limit_hits_count: ['count>=1'], // At least one rate limit block must trigger
  },
}

export default function () {
  const headers = getHeaders()

  // Rapid burst calls to test abuse control rate limits
  const payload = JSON.stringify({
    p_items: [{ product_id: 1, quantity: 1 }],
    p_delivery_method: 'representative',
    p_payment_method: 'cod',
    p_ship: {
      governorate_id: 1,
      city: 'القاهرة',
      district: 'مدينة نصر',
      address: 'شارع عباس العقاد',
      recipient_name: 'عميل سريع',
      phone: '01012345678',
    },
  })

  const res = http.post(`${TARGET_URL}/rest/v1/rpc/place_order`, payload, {
    headers,
  })

  const body = res.body || ''
  const isRateLimited =
    res.status === 400 && (body.includes('SYS-003') || body.includes('Rate limit exceeded'))

  if (isRateLimited) {
    cRateLimitHits.add(1)
  } else if (res.status === 200 || res.status === 201) {
    cSuccessfulHits.add(1)
  }

  check(res, {
    'no internal server 500 error under burst': (r) => r.status !== 500,
    'handled gracefully by database': (r) => r.status === 200 || r.status === 400,
  })

  // Minimal delay to simulate aggressive burst traffic
  sleep(0.1)
}
