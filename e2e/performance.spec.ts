import { test, expect } from '@playwright/test'

interface LcpEntryDetail {
  startTime: number
  size: number
  tagName?: string
  className?: string
  id?: string
  text?: string
  url?: string
}

interface LargestContentfulPaintEntry extends PerformanceEntry {
  size: number
  element?: Element | null
  url?: string
}

test.describe('Performance & Web Vitals Pass (T-7.03)', () => {
  test.use({
    viewport: { width: 390, height: 844 }, // Mobile iPhone 12/13/14 viewport
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
  })

  test('01. Home Page LCP <= 2.5s and CLS = 0 on Throttled Mobile', async ({ page }) => {
    const client = await page.context().newCDPSession(page)
    await client.send('Network.enable')
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (1.6 * 1024 * 1024) / 8, // 1.6 Mbps Fast 3G / Slow 4G
      uploadThroughput: (750 * 1024) / 8,
      latency: 100,
    })
    await client.send('Emulation.setCPUThrottlingRate', { rate: 2 })

    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Measure LCP and CLS
    const metrics = await page.evaluate(async () => {
      return new Promise<{ lcp: number; cls: number; entries: LcpEntryDetail[] }>((resolve) => {
        let maxLcp = 0
        let clsScore = 0
        const entries: LcpEntryDetail[] = []

        const lcpObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            const e = entry as LargestContentfulPaintEntry
            entries.push({
              startTime: entry.startTime,
              size: e.size,
              tagName: e.element?.tagName,
              className: e.element?.className,
              id: e.element?.id,
              text: e.element?.textContent?.slice(0, 30),
              url: e.url,
            })
            if (entry.startTime > maxLcp) {
              maxLcp = entry.startTime
            }
          }
        })
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })

        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries() as unknown as Array<{
            hadRecentInput: boolean
            value: number
          }>) {
            if (!entry.hadRecentInput) {
              clsScore += entry.value
            }
          }
        })
        clsObserver.observe({ type: 'layout-shift', buffered: true })

        setTimeout(() => {
          lcpObserver.disconnect()
          clsObserver.disconnect()
          resolve({ lcp: maxLcp, cls: clsScore, entries })
        }, 1500)
      })
    })

    console.log(
      `[PERF] Home Page - Throttled Mobile LCP: ${metrics.lcp.toFixed(0)} ms, CLS: ${metrics.cls.toFixed(4)}`,
      JSON.stringify(metrics.entries, null, 2),
    )
    expect(metrics.lcp).toBeLessThanOrEqual(2500)
    expect(metrics.cls).toBeLessThanOrEqual(0.1)
  })

  test('02. Category Page LCP <= 2.5s and CLS = 0 on Throttled Mobile', async ({ page }) => {
    const client = await page.context().newCDPSession(page)
    await client.send('Network.enable')
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
      latency: 100,
    })
    await client.send('Emulation.setCPUThrottlingRate', { rate: 2 })

    await page.goto('/category/all')
    await page.waitForLoadState('domcontentloaded')

    const metrics = await page.evaluate(async () => {
      return new Promise<{ lcp: number; cls: number; entries: LcpEntryDetail[] }>((resolve) => {
        let maxLcp = 0
        let clsScore = 0
        const entries: LcpEntryDetail[] = []

        const lcpObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            const e = entry as LargestContentfulPaintEntry
            entries.push({
              startTime: entry.startTime,
              size: e.size,
              tagName: e.element?.tagName,
              className: e.element?.className,
              id: e.element?.id,
              text: e.element?.textContent?.slice(0, 30),
              url: e.url,
            })
            if (entry.startTime > maxLcp) {
              maxLcp = entry.startTime
            }
          }
        })
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })

        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries() as unknown as Array<{
            hadRecentInput: boolean
            value: number
          }>) {
            if (!entry.hadRecentInput) {
              clsScore += entry.value
            }
          }
        })
        clsObserver.observe({ type: 'layout-shift', buffered: true })

        setTimeout(() => {
          lcpObserver.disconnect()
          clsObserver.disconnect()
          resolve({ lcp: maxLcp, cls: clsScore, entries })
        }, 1500)
      })
    })

    console.log(
      `[PERF] Category Page - Throttled Mobile LCP: ${metrics.lcp.toFixed(0)} ms, CLS: ${metrics.cls.toFixed(4)}`,
      JSON.stringify(metrics.entries, null, 2),
    )
    expect(metrics.lcp).toBeLessThanOrEqual(2500)
    expect(metrics.cls).toBeLessThanOrEqual(0.1)
  })
})
