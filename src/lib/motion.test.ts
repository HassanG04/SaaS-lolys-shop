import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getMotionSetting,
  setMotionSetting,
  isMotionReduced,
  initMotion,
  MOTION_STORAGE_KEY,
} from './motion'

describe('motion preference management (T-3.11)', () => {
  const originalMatchMedia = window.matchMedia

  function mockMatchMedia(matchesReduced: boolean) {
    const listeners = new Set<(e: { matches: boolean }) => void>()
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? matchesReduced : false,
      media: query,
      onchange: null,
      addListener: vi.fn((fn) => listeners.add(fn)),
      removeListener: vi.fn((fn) => listeners.delete(fn)),
      addEventListener: vi.fn((_type: string, fn: (e: { matches: boolean }) => void) =>
        listeners.add(fn),
      ),
      removeEventListener: vi.fn((_type: string, fn: (e: { matches: boolean }) => void) =>
        listeners.delete(fn),
      ),
      dispatchEvent: vi.fn((e) => {
        listeners.forEach((fn) => fn(e))
        return true
      }),
    }))
    return {
      trigger(newMatches: boolean) {
        listeners.forEach((fn) => fn({ matches: newMatches }))
      },
    }
  }

  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.motion
    delete document.documentElement.dataset.motionSetting
    mockMatchMedia(false)
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    delete document.documentElement.dataset.motion
    delete document.documentElement.dataset.motionSetting
    vi.restoreAllMocks()
  })

  it('defaults to full motion for a fresh visit even when device prefers reduced motion', () => {
    mockMatchMedia(true)
    expect(getMotionSetting()).toBe('full')
    expect(isMotionReduced()).toBe(false)
  })

  it('persists visitor explicit reduced setting and sets data-motion="reduced"', () => {
    mockMatchMedia(false)
    setMotionSetting('reduced')
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBe('reduced')
    expect(document.documentElement.dataset.motionSetting).toBe('reduced')
    expect(document.documentElement.dataset.motion).toBe('reduced')
    expect(isMotionReduced()).toBe(true)
  })

  it('persists visitor explicit full setting and animates even with OS reduced motion true', () => {
    mockMatchMedia(true)
    setMotionSetting('full')
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBe('full')
    expect(document.documentElement.dataset.motionSetting).toBe('full')
    expect(document.documentElement.dataset.motion).toBe('full')
    expect(isMotionReduced()).toBe(false)
  })

  it('follows device OS setting in system mode', () => {
    mockMatchMedia(false)
    setMotionSetting('system')
    expect(document.documentElement.dataset.motionSetting).toBe('system')
    expect(document.documentElement.dataset.motion).toBe('full')
    expect(isMotionReduced()).toBe(false)

    mockMatchMedia(true)
    setMotionSetting('system')
    expect(document.documentElement.dataset.motion).toBe('reduced')
    expect(isMotionReduced()).toBe(true)
  })

  it('dispatches motionchange event when setting changes', () => {
    const handler = vi.fn()
    window.addEventListener('motionchange', handler)

    setMotionSetting('reduced')
    expect(handler).toHaveBeenCalledTimes(1)
    const event = handler.mock.calls[0][0] as CustomEvent
    expect(event.detail).toEqual({ setting: 'reduced', effective: 'reduced' })

    window.removeEventListener('motionchange', handler)
  })

  it('handles unavailable localStorage safely without crashing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded / SecurityError')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    expect(() => setMotionSetting('reduced')).not.toThrow()
    expect(document.documentElement.dataset.motionSetting).toBe('reduced')
    expect(document.documentElement.dataset.motion).toBe('reduced')
  })

  it('initMotion synchronizes DOM attributes and cleans up listeners', () => {
    const mediaMock = mockMatchMedia(false)
    localStorage.setItem(MOTION_STORAGE_KEY, 'system')

    const cleanup = initMotion()
    expect(document.documentElement.dataset.motionSetting).toBe('system')
    expect(document.documentElement.dataset.motion).toBe('full')

    mediaMock.trigger(true)
    // When OS changes in system mode, data-motion updates
    mockMatchMedia(true)
    window.dispatchEvent(new Event('storage'))

    cleanup()
  })
})
