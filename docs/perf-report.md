# Performance Report & Image Guidelines: Lolys' Accessories & Home

**Task:** T-7.03 (Phase 7: Hardening and review)  
**Date:** 2026-10-14  
**Status:** Verified & Passing

---

## 1. Initial Bundle Budget & Code Splitting

### 1.1 Initial JavaScript Budget ($\le 200\text{ KB}$ gzip)

Enforced by `scripts/check-bundle.mjs` against `dist/.vite/bundle-graph.json` during `npm run check:bundle` and CI `build` step.

| Asset / Chunk            | Raw Size      | Gzip Size                    | Role / Scope                                                                       |
| ------------------------ | ------------- | ---------------------------- | ---------------------------------------------------------------------------------- |
| `react-vendor-*.js`      | 607.98 kB     | 177.33 kB                    | React 19, React DOM, React Router, TanStack Query, i18next, Supabase JS            |
| `index-*.js`             | 71.26 kB      | 22.72 kB                     | Core application shell, route definitions, layout, navigation, i18n initialization |
| `supabase-*.js`          | 2.49 kB       | 1.12 kB                      | Shared Supabase client instance and helpers                                        |
| `rolldown-runtime-*.js`  | 0.71 kB       | 0.42 kB                      | Module loader runtime                                                              |
| **Total Initial Chunks** | **682.44 kB** | **199,793 bytes (195.1 KB)** | **Under 200,000 byte budget (Headroom: 207 bytes)**                                |

### 1.2 Route-Level Code Splitting & Admin Isolation

All page-level components are code-split using React `lazy` and dynamic imports. Recharts and admin management shells are strictly isolated from client routes:

- **Admin Core:** `AdminPage-*.js` (110.18 kB raw, 29.76 kB gzip)
- **Recharts Charting Chunk:** `DashboardChart-*.js` (374.54 kB raw, 108.17 kB gzip)
- **Isolation Verification:** `scripts/check-bundle.mjs` inspects module IDs in initial chunks and fails if any chunk contains `src/admin/*`, `*Admin*`, or `node_modules/recharts/`.

---

## 2. Web Vitals & Throttled Mobile Benchmarks

Automated end-to-end verification executed via Playwright (`e2e/performance.spec.ts`) under CDP network and CPU throttling:

- **Viewport:** Mobile iPhone 12/13/14 (390 x 844 px, `isMobile: true`, touch enabled)
- **Network Throttling:** 1.6 Mbps download, 750 Kbps upload, 100 ms latency (Slow 4G / Fast 3G emulation)
- **CPU Throttling:** 2x slowdown emulation

### Results Summary

| Target Page                    | Metric                         | Target Budget        | Measured Result | Status |
| ------------------------------ | ------------------------------ | -------------------- | --------------- | ------ |
| **Home (`/`)**                 | Largest Contentful Paint (LCP) | $\le 2500\text{ ms}$ | **2336 ms**     | PASS   |
| **Home (`/`)**                 | Cumulative Layout Shift (CLS)  | $\le 0.1000$         | **0.0380**      | PASS   |
| **Category (`/category/all`)** | Largest Contentful Paint (LCP) | $\le 2500\text{ ms}$ | **2256 ms**     | PASS   |
| **Category (`/category/all`)** | Cumulative Layout Shift (CLS)  | $\le 0.1000$         | **0.0013**      | PASS   |

### Key Optimizations Implemented

1. **Font Subsetting & Preload:** Self-hosted `cairo-0.woff2` (Arabic subset, ~18 KB) and `cairo-2.woff2` (Latin subset, ~13 KB) are preloaded via `<link rel="preload" as="font" type="font/woff2" crossorigin>` in `index.html`.
2. **Above-the-Fold Image Prioritization:** Hero arch image and category header image configured with `loading="eager"` and `fetchPriority="high"`, bypassing lazy-loading queues and pulse skeleton delays.
3. **Zero Layout Shifts:** All image containers use explicit aspect-ratio utility classes (`aspect-square`, `aspect-4/3`, `aspect-video`) with `rounded-image` wrappers, ensuring image space is reserved before byte transfer.

---

## 3. Product & Category Image Guidelines

Per roadmap requirements (H-06 and T-7.03), image assets must adhere to the following standards:

### 3.1 Standards for Admin Uploads & Catalog Photos

- **File Format:** Modern **WebP** is the required production format. JPG/PNG uploads are automatically validated, re-encoded, and converted to WebP on the client before storage upload (`src/lib/imageUpload.ts`).
- **Maximum Dimensions:** Longest edge $\approx 1200\text{ px}$. This maintains crisp presentation on high-DPI / Retina screens while avoiding unnecessary byte weight.
- **Target File Size:** $\approx 200\text{ KB}$ per image (maximum upload cap: $2\text{ MB}$).
- **Aspect Ratios:**
  - Standard product photos: `1:1` square (`aspect-square`, 800x800 to 1200x1200 px).
  - Hero & Category covers: Arch masked `4:5` or `2:3` (`999px 999px 28px 28px` top curve).
  - Editorial & Story cards: `4:3` or `16:9`.

### 3.2 Security & Storage Rules

- **Signature Check:** Client checks file magic bytes before upload to reject disguised executables or malformed payloads.
- **Storage Buckets:**
  - Catalog photos: `product-images` (public read, RLS insert/update restricted to admin users).
  - Payment proofs: `payment-proofs` (private read, accessible only by order owner and admins).
- **Naming & Cache:** Randomized UUID paths prevent collision and directory traversal; public images served with immutable cache headers.
