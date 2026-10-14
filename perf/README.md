# Performance & Load Testing Suite (k6)

**Task:** T-8.08 (Phase 8: Launch)  
**Target Environment:** Staging or Local Development Stack only (**NEVER Production**).

---

## 1. Overview

This directory contains load and resilience test suites authored with [k6](https://k6.io/) to evaluate API throughput, latency percentiles under realistic shopping ramps, and abuse control rate limiting before production launch.

### Test Scripts

| Script              | Purpose                                                                                                                       | Traffic Profile                                     | Performance Target                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| **`browse.js`**     | Simulates customer storefront browsing: Home, categories, best sellers, category catalog, single product, and search queries. | Ramp from 10 to 50 concurrent VUs over 2.5 minutes. | **p95 < 800 ms** for all read queries; < 1% error rate.                 |
| **`checkout.js`**   | Simulates checkout transactions: delivery fee lookups, settings, and `place_order` RPC execution.                             | Ramp from 10 to 25 VUs over 2 minutes.              | p95 < 800 ms for RPC calls; zero 500 crashes.                           |
| **`resilience.js`** | Stress tests abuse controls by executing rapid order bursts from the same user session.                                       | High-frequency burst (15 iterations in 10s).        | Gracefully enforces `SYS-003` rate limits without database degradation. |

---

## 2. Strict Staging Guard

> [!CAUTION]
> Load testing is **strictly prohibited against production**.
>
> `perf/config.js` validates all target URLs before launching requests. If `TARGET_URL` matches production domains (`lolys.pages.dev`, `lolys.com`, `*production*`), execution terminates immediately with a fatal guard error:
>
> ```
> Error: STAGING GUARD VIOLATION: Target URL appears to be production.
> ```

---

## 3. Running Load Tests

### 3.1 Local Stack Execution (Docker or Native k6)

With the local Supabase stack running (`npm run db:start`):

```bash
# Run browsing load test against local stack
k6 run perf/browse.js

# Or using the official k6 Docker container
docker run --rm -i \
  --network="host" \
  -v "${PWD}/perf:/perf" \
  grafana/k6:latest run /perf/browse.js
```

### 3.2 Staging Execution

Pass staging environment variables (never production credentials):

```bash
export TARGET_URL="https://<staging-ref>.supabase.co"
export ANON_KEY="<staging-anon-key>"
export USER_TOKEN="<staging-test-customer-jwt>"

k6 run perf/browse.js
k6 run perf/checkout.js
k6 run perf/resilience.js
```

---

## 4. Query Plans and Indexing

Detailed query execution plans with `EXPLAIN (ANALYZE, BUFFERS)` for all hot storefront queries are documented in [`docs/perf-report.md`](../docs/perf-report.md).
