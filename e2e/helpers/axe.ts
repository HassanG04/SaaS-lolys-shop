import type { Page } from '@playwright/test'
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const AXE_SOURCE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf-8')

export interface AxeViolationNode {
  html: string
  target: string[]
  failureSummary: string
}

export interface AxeViolation {
  id: string
  impact?: 'minor' | 'moderate' | 'serious' | 'critical' | null
  description: string
  help: string
  helpUrl: string
  nodes: AxeViolationNode[]
}

export interface AxeResults {
  violations: AxeViolation[]
  passes: unknown[]
  incomplete: unknown[]
}

export async function runAxe(
  page: Page,
  options?: {
    include?: string[]
    exclude?: string[]
  },
): Promise<AxeResults> {
  const isAxeLoaded = await page.evaluate(
    () => typeof (window as unknown as { axe?: unknown }).axe !== 'undefined',
  )
  if (!isAxeLoaded) {
    await page.evaluate(AXE_SOURCE)
  }

  const results = await page.evaluate(async (opts) => {
    const axe = (
      window as unknown as {
        axe?: { run: (context: unknown, options: unknown) => Promise<AxeResults> }
      }
    ).axe
    if (!axe) throw new Error('axe is not defined on window')
    return await axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
      },
      ...opts,
    })
  }, options)

  return results
}

export function filterSeriousAndCritical(violations: AxeViolation[]): AxeViolation[] {
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
}
