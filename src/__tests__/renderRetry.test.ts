import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withRenderRetry } from '@/glass/renderRetry'

describe('withRenderRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns true when the operation succeeds on the first attempt', async () => {
    const op = vi.fn().mockResolvedValue(undefined)
    const result = await withRenderRetry(op, 'test-op')

    expect(result).toBe(true)
    expect(op).toHaveBeenCalledTimes(1)
    expect(console.warn).not.toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })

  it('retries once after 500ms when the first attempt fails, and succeeds', async () => {
    const op = vi.fn()
      .mockRejectedValueOnce(new Error('first fail'))
      .mockResolvedValueOnce(undefined)

    const promise = withRenderRetry(op, 'rebuild')

    // First call fails synchronously, then setTimeout is scheduled
    // Advance past the 500ms delay
    await vi.advanceTimersByTimeAsync(500)

    const result = await promise

    expect(result).toBe(true)
    expect(op).toHaveBeenCalledTimes(2)
    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[RenderRetry] rebuild failed, retrying in 500ms:'),
      expect.any(Error),
    )
    expect(console.error).not.toHaveBeenCalled()
  })

  it('returns false when both attempts fail', async () => {
    const op = vi.fn()
      .mockRejectedValueOnce(new Error('first fail'))
      .mockRejectedValueOnce(new Error('second fail'))

    const promise = withRenderRetry(op, 'textUpgrade')

    await vi.advanceTimersByTimeAsync(500)

    const result = await promise

    expect(result).toBe(false)
    expect(op).toHaveBeenCalledTimes(2)
    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[RenderRetry] textUpgrade failed after retry, skipping:'),
      expect.any(Error),
    )
  })

  it('does not retry when the first attempt succeeds', async () => {
    const op = vi.fn().mockResolvedValue('ok')
    await withRenderRetry(op, 'no-retry')

    expect(op).toHaveBeenCalledTimes(1)
  })

  it('waits exactly 500ms before retrying', async () => {
    const op = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(undefined)

    const promise = withRenderRetry(op, 'delay-check')

    // After 499ms the retry should not have happened yet
    await vi.advanceTimersByTimeAsync(499)
    expect(op).toHaveBeenCalledTimes(1)

    // At 500ms the retry fires
    await vi.advanceTimersByTimeAsync(1)
    await promise

    expect(op).toHaveBeenCalledTimes(2)
  })

  it('includes the label in log messages', async () => {
    const op = vi.fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom again'))

    const promise = withRenderRetry(op, 'rebuildPageContainer')
    await vi.advanceTimersByTimeAsync(500)
    await promise

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('rebuildPageContainer'),
      expect.anything(),
    )
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('rebuildPageContainer'),
      expect.anything(),
    )
  })
})
