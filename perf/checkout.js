import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Trend, Counter } from 'k6/metrics'
import { TARGET_URL, getHeaders, rampStages } from './config.js'

const tCheckoutFlow = new Trend('duration_checkout_flow')
const tPlaceOrderRpc = new Trend('duration_place_order_rpc')
const cOrdersPlaced = new Counter('orders_placed_count')

export const options = {
  stages: rampStages,
  thresholds: {
    duration_checkout_flow: ['p(95)<1200'],
    duration_place_order_rpc: ['p(95)<800'],
    http_req_failed: ['rate<0.05'], // Allow minor stock rejections during stress
  },
}

export default function () {
  const headers = getHeaders()

  group('Checkout & Order Placement Flow', () => {
    const flowStart = Date.now()

    // 1. Fetch Governorates and Delivery Fees
    const feesRes = http.get(`${TARGET_URL}/rest/v1/delivery_fees?select=*`, {
      headers,
      tags: { type: 'read' },
    })

    check(feesRes, {
      'delivery fees status is 200': (r) => r.status === 200,
    })

    sleep(1)

    // 2. Fetch Active Shop Settings (payment methods, approval requirements)
    const settingsRes = http.get(
      `${TARGET_URL}/rest/v1/shop_settings?select=key,value&is_public=eq.true`,
      { headers, tags: { type: 'read' } },
    )

    check(settingsRes, {
      'shop settings status is 200': (r) => r.status === 200,
    })

    sleep(1)

    // 3. Submit Order via place_order RPC
    // Note: When running without an authenticated user token, place_order will reject with AUTH error
    // which verifies the security boundary under load.
    const orderPayload = JSON.stringify({
      p_items: [{ product_id: 1, quantity: 1 }],
      p_delivery_method: 'representative',
      p_payment_method: 'cod',
      p_ship: {
        governorate_id: 1,
        city: 'القاهرة',
        district: 'مدينة نصر',
        address: 'شارع عباس العقاد',
        recipient_name: 'عميل اختبار',
        phone: '01012345678',
      },
    })

    const orderRes = http.post(`${TARGET_URL}/rest/v1/rpc/place_order`, orderPayload, {
      headers,
      tags: { type: 'write' },
    })

    tPlaceOrderRpc.add(orderRes.timings.duration)

    // Accept 200 (success), 201 (created), or expected validation codes under anonymous test load
    check(orderRes, {
      'order rpc responds within 800ms': (r) => r.timings.duration < 800,
      'order rpc handled without server crash': (r) => r.status < 500,
    })

    if (orderRes.status === 200 || orderRes.status === 201) {
      cOrdersPlaced.add(1)
    }

    tCheckoutFlow.add(Date.now() - flowStart)
  })

  sleep(2)
}
