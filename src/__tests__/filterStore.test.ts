import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the SDK bridge
const mockBridge = {
  getLocalStorage: vi.fn(),
  setLocalStorage: vi.fn(),
}

vi.mock('@evenrealities/even_hub_sdk', () => ({
  EvenAppBridge: {
    getInstance: () => mockBridge,
  },
}))

import { loadFilters, saveFilters } from '@/store/filterStore'
import {
  STORAGE_KEY_SEVERITY_FILTER,
  STORAGE_KEY_SOURCE_FILTER,
} from '@/types/filters'

describe('loadFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns persisted severity and source values', async () => {
    mockBridge.getLocalStorage.mockImplementation((key: string) => {
      if (key === STORAGE_KEY_SEVERITY_FILTER) return Promise.resolve('critical')
      if (key === STORAGE_KEY_SOURCE_FILTER) return Promise.resolve('PagerDuty')
      return Promise.resolve(null)
    })

    const result = await loadFilters()

    expect(result.severity).toBe('critical')
    expect(result.source).toBe('PagerDuty')
  })

  it('returns defaults when storage values are null', async () => {
    mockBridge.getLocalStorage.mockResolvedValue(null)

    const result = await loadFilters()

    expect(result.severity).toBe('all')
    expect(result.source).toBeNull()
  })

  it('returns default severity when stored value is invalid', async () => {
    mockBridge.getLocalStorage.mockImplementation((key: string) => {
      if (key === STORAGE_KEY_SEVERITY_FILTER) return Promise.resolve('invalid-value')
      if (key === STORAGE_KEY_SOURCE_FILTER) return Promise.resolve('OpsGenie')
      return Promise.resolve(null)
    })

    const result = await loadFilters()

    expect(result.severity).toBe('all')
    expect(result.source).toBe('OpsGenie')
  })

  it('converts empty string source to null', async () => {
    mockBridge.getLocalStorage.mockImplementation((key: string) => {
      if (key === STORAGE_KEY_SEVERITY_FILTER) return Promise.resolve('all')
      if (key === STORAGE_KEY_SOURCE_FILTER) return Promise.resolve('')
      return Promise.resolve(null)
    })

    const result = await loadFilters()

    expect(result.source).toBeNull()
  })

  it('returns defaults when bridge throws an error', async () => {
    mockBridge.getLocalStorage.mockRejectedValue(new Error('SDK unavailable'))

    const result = await loadFilters()

    expect(result.severity).toBe('all')
    expect(result.source).toBeNull()
  })
})

describe('saveFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBridge.setLocalStorage.mockResolvedValue(undefined)
  })

  it('persists severity and source values', async () => {
    await saveFilters({ severity: 'critical', source: 'PagerDuty' })

    expect(mockBridge.setLocalStorage).toHaveBeenCalledWith(
      STORAGE_KEY_SEVERITY_FILTER,
      'critical',
    )
    expect(mockBridge.setLocalStorage).toHaveBeenCalledWith(
      STORAGE_KEY_SOURCE_FILTER,
      'PagerDuty',
    )
  })

  it('converts null source to empty string for storage', async () => {
    await saveFilters({ severity: 'all', source: null })

    expect(mockBridge.setLocalStorage).toHaveBeenCalledWith(
      STORAGE_KEY_SOURCE_FILTER,
      '',
    )
  })

  it('persists warning-critical severity correctly', async () => {
    await saveFilters({ severity: 'warning-critical', source: null })

    expect(mockBridge.setLocalStorage).toHaveBeenCalledWith(
      STORAGE_KEY_SEVERITY_FILTER,
      'warning-critical',
    )
  })
})
