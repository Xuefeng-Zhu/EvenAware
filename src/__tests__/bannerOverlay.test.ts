import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the SDK module before importing the module under test
vi.mock('@evenrealities/even_hub_sdk', () => {
  class TextContainerUpgrade {
    containerID: number
    containerName: string
    contentOffset: number
    contentLength: number
    content: string
    constructor(opts: {
      containerID: number
      containerName: string
      contentOffset?: number
      contentLength?: number
      content: string
    }) {
      this.containerID = opts.containerID
      this.containerName = opts.containerName
      this.contentOffset = opts.contentOffset ?? 0
      this.contentLength = opts.contentLength ?? 0
      this.content = opts.content
    }
  }
  return { TextContainerUpgrade }
})

import {
  showCriticalBanner,
  cancelBanner,
  isBannerActive,
} from '@/glass/bannerOverlay'

function makeBridge() {
  return {
    textContainerUpgrade: vi.fn().mockResolvedValue(true),
  }
}

describe('bannerOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    cancelBanner() // ensure clean state
  })

  afterEach(() => {
    cancelBanner()
    vi.useRealTimers()
  })

  it('calls textContainerUpgrade with banner content prepended', () => {
    const bridge = makeBridge()
    showCriticalBanner(bridge as any, 'DB down', 'Original detail text')

    expect(bridge.textContainerUpgrade).toHaveBeenCalledTimes(1)
    const arg = bridge.textContainerUpgrade.mock.calls[0][0]
    expect(arg.content).toBe('▲ NEW CRITICAL: DB down\nOriginal detail text')
    expect(arg.containerID).toBe(1)
    expect(arg.containerName).toBe('main-text')
  })

  it('truncates long titles to 40 chars with ellipsis', () => {
    const bridge = makeBridge()
    const longTitle = 'A'.repeat(50)
    showCriticalBanner(bridge as any, longTitle, 'Detail')

    const arg = bridge.textContainerUpgrade.mock.calls[0][0]
    const expectedSnippet = 'A'.repeat(37) + '...'
    expect(arg.content).toBe(`▲ NEW CRITICAL: ${expectedSnippet}\nDetail`)
  })

  it('does not truncate titles at exactly 40 chars', () => {
    const bridge = makeBridge()
    const exactTitle = 'B'.repeat(40)
    showCriticalBanner(bridge as any, exactTitle, 'Detail')

    const arg = bridge.textContainerUpgrade.mock.calls[0][0]
    expect(arg.content).toBe(`▲ NEW CRITICAL: ${exactTitle}\nDetail`)
  })

  it('restores original content after 3 seconds', () => {
    const bridge = makeBridge()
    showCriticalBanner(bridge as any, 'Alert', 'Original content')

    expect(bridge.textContainerUpgrade).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(3000)

    expect(bridge.textContainerUpgrade).toHaveBeenCalledTimes(2)
    const restoreArg = bridge.textContainerUpgrade.mock.calls[1][0]
    expect(restoreArg.content).toBe('Original content')
    expect(restoreArg.containerID).toBe(1)
    expect(restoreArg.containerName).toBe('main-text')
  })

  it('does not restore before 3 seconds', () => {
    const bridge = makeBridge()
    showCriticalBanner(bridge as any, 'Alert', 'Original')

    vi.advanceTimersByTime(2999)
    expect(bridge.textContainerUpgrade).toHaveBeenCalledTimes(1)
  })

  it('reports banner as active while timer is running', () => {
    const bridge = makeBridge()
    expect(isBannerActive()).toBe(false)

    showCriticalBanner(bridge as any, 'Alert', 'Detail')
    expect(isBannerActive()).toBe(true)

    vi.advanceTimersByTime(3000)
    expect(isBannerActive()).toBe(false)
  })

  it('cancels the banner timer without restoring', () => {
    const bridge = makeBridge()
    showCriticalBanner(bridge as any, 'Alert', 'Detail')

    expect(isBannerActive()).toBe(true)
    cancelBanner()
    expect(isBannerActive()).toBe(false)

    // Advancing time should not trigger restore
    vi.advanceTimersByTime(5000)
    expect(bridge.textContainerUpgrade).toHaveBeenCalledTimes(1) // only the initial banner call
  })

  it('replaces an existing banner when a new critical arrives', () => {
    const bridge = makeBridge()
    showCriticalBanner(bridge as any, 'First alert', 'Detail A')
    showCriticalBanner(bridge as any, 'Second alert', 'Detail B')

    // Two banner calls (one per showCriticalBanner)
    expect(bridge.textContainerUpgrade).toHaveBeenCalledTimes(2)

    // After 3 seconds, only the second banner's original content is restored
    vi.advanceTimersByTime(3000)
    expect(bridge.textContainerUpgrade).toHaveBeenCalledTimes(3)
    const restoreArg = bridge.textContainerUpgrade.mock.calls[2][0]
    expect(restoreArg.content).toBe('Detail B')
  })

  it('handles empty title gracefully', () => {
    const bridge = makeBridge()
    showCriticalBanner(bridge as any, '', 'Detail')

    const arg = bridge.textContainerUpgrade.mock.calls[0][0]
    expect(arg.content).toBe('▲ NEW CRITICAL: \nDetail')
  })

  it('handles empty original content', () => {
    const bridge = makeBridge()
    showCriticalBanner(bridge as any, 'Alert', '')

    const arg = bridge.textContainerUpgrade.mock.calls[0][0]
    expect(arg.content).toBe('▲ NEW CRITICAL: Alert\n')

    vi.advanceTimersByTime(3000)
    const restoreArg = bridge.textContainerUpgrade.mock.calls[1][0]
    expect(restoreArg.content).toBe('')
  })
})
