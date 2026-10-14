import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Trend } from 'k6/metrics'
import { TARGET_URL, getHeaders, rampStages, thresholds } from './config.js'

// Custom trends for hot read queries
const tCategories = new Trend('duration_categories')
const tBestSellers = new Trend('duration_bestsellers')
const tCategoryProducts = new Trend('duration_category_products')
const tProductDetail = new Trend('duration_product_detail')
const tSearch = new Trend('duration_search')

export const options = {
  stages: rampStages,
  thresholds: {
    ...thresholds,
    duration_categories: ['p(95)<800'],
    duration_bestsellers: ['p(95)<800'],
    duration_category_products: ['p(95)<800'],
    duration_product_detail: ['p(95)<800'],
    duration_search: ['p(95)<800'],
  },
}

export default function () {
  const headers = getHeaders()
  const readParams = {
    headers,
    tags: { type: 'read' },
  }

  // 1. Visit Home / Fetch Public Settings & Active Categories
  group('1. Storefront Home & Categories', () => {
    const res = http.get(
      `${TARGET_URL}/rest/v1/categories?select=id,name,name_ar,slug,image_url,sort_order&is_active=eq.true&order=sort_order.asc`,
      readParams,
    )

    tCategories.add(res.timings.duration)
    check(res, {
      'categories status is 200': (r) => r.status === 200,
      'categories returned valid array': (r) => Array.isArray(r.json()),
      'categories latency < 800ms': (r) => r.timings.duration < 800,
    })
  })

  sleep(1)

  // 2. Fetch Best Sellers
  group('2. Best Sellers Carousel', () => {
    const res = http.get(
      `${TARGET_URL}/rest/v1/products?select=id,name,name_ar,price,discount_percent,final_price,stock_quantity,sold_count,image_url&is_active=eq.true&order=sold_count.desc&limit=8`,
      readParams,
    )

    tBestSellers.add(res.timings.duration)
    check(res, {
      'best sellers status is 200': (r) => r.status === 200,
      'best sellers returned items': (r) => Array.isArray(r.json()),
      'best sellers latency < 800ms': (r) => r.timings.duration < 800,
    })
  })

  sleep(1.5)

  // 3. Browse Category Products Page
  group('3. Browse Category Products', () => {
    const res = http.get(
      `${TARGET_URL}/rest/v1/products?select=id,name,name_ar,price,discount_percent,final_price,stock_quantity,image_url,categories!inner(slug)&categories.slug=eq.accessories&is_active=eq.true&order=created_at.desc&limit=12`,
      readParams,
    )

    tCategoryProducts.add(res.timings.duration)
    check(res, {
      'category products status is 200': (r) => r.status === 200,
      'category products returned array': (r) => Array.isArray(r.json()),
      'category products latency < 800ms': (r) => r.timings.duration < 800,
    })
  })

  sleep(2)

  // 4. View Single Product Details
  group('4. Single Product Detail View', () => {
    const res = http.get(
      `${TARGET_URL}/rest/v1/products?select=id,name,name_ar,description,description_ar,price,discount_percent,final_price,stock_quantity,in_stock,image_url,extra_images&id=eq.1&is_active=eq.true`,
      readParams,
    )

    tProductDetail.add(res.timings.duration)
    check(res, {
      'product detail status is 200': (r) => r.status === 200,
      'product detail returned record': (r) => Array.isArray(r.json()) && r.json().length > 0,
      'product detail latency < 800ms': (r) => r.timings.duration < 800,
    })
  })

  sleep(1)

  // 5. Search Catalog
  group('5. Search Catalog', () => {
    const res = http.get(
      `${TARGET_URL}/rest/v1/products?select=id,name,name_ar,price,final_price,stock_quantity,image_url&is_active=eq.true&or=(name_ar.ilike.*خاتم*,name.ilike.*ring*)&limit=10`,
      readParams,
    )

    tSearch.add(res.timings.duration)
    check(res, {
      'search status is 200': (r) => r.status === 200,
      'search returned valid array': (r) => Array.isArray(r.json()),
      'search latency < 800ms': (r) => r.timings.duration < 800,
    })
  })

  sleep(2)
}
