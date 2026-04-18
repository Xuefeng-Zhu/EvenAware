import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase/firestore before importing the store
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
}))

vi.mock('@/firebase/config', () => ({
  db: {},
}))

import { NotificationStore } from '@/store/notificationStore'
import type { Notification } from '@/types/notification'
import type { FilterState } from '@/types/filters'

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'test-1',
    title: 'Test Alert',
    body: 'Something happened',
    severity: 'critical',
    sourceName: 'PagerDuty',
    sourceType: 'pagerduty',
    timestamp: { seconds: 1700000000, nanoseconds: 0 },
    ...overrides,
  }
}

describe('NotificationStore.getFiltered', () => {
  let store: NotificationStore

  beforeEach(() => {
    store = new NotificationStore()
  })

  // --- Severity filtering ---

  it('severity "all" returns all notifications', () => {
    store.notifications = [
      makeNotification({ id: '1', severity: 'critical' }),
      makeNotification({ id: '2', severity: 'warning' }),
      makeNotification({ id: '3', severity: 'info' }),
    ]

    const filter: FilterState = { severity: 'all', source: null }
    const result = store.getFiltered(filter)

    expect(result).toHaveLength(3)
  })

  it('severity "critical" returns only critical notifications', () => {
    store.notifications = [
      makeNotification({ id: '1', severity: 'critical' }),
      makeNotification({ id: '2', severity: 'warning' }),
      makeNotification({ id: '3', severity: 'info' }),
    ]

    const filter: FilterState = { severity: 'critical', source: null }
    const result = store.getFiltered(filter)

    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('critical')
  })

  it('severity "warning-critical" returns critical and warning notifications', () => {
    store.notifications = [
      makeNotification({ id: '1', severity: 'critical' }),
      makeNotification({ id: '2', severity: 'warning' }),
      makeNotification({ id: '3', severity: 'info' }),
    ]

    const filter: FilterState = { severity: 'warning-critical', source: null }
    const result = store.getFiltered(filter)

    expect(result).toHaveLength(2)
    expect(result.map((n) => n.severity).sort()).toEqual(['critical', 'warning'])
  })

  // --- Source filtering ---

  it('source filter returns only matching sourceName', () => {
    store.notifications = [
      makeNotification({ id: '1', sourceName: 'PagerDuty' }),
      makeNotification({ id: '2', sourceName: 'OpsGenie' }),
      makeNotification({ id: '3', sourceName: 'PagerDuty' }),
    ]

    const filter: FilterState = { severity: 'all', source: 'PagerDuty' }
    const result = store.getFiltered(filter)

    expect(result).toHaveLength(2)
    expect(result.every((n) => n.sourceName === 'PagerDuty')).toBe(true)
  })

  it('source null returns all sources', () => {
    store.notifications = [
      makeNotification({ id: '1', sourceName: 'PagerDuty' }),
      makeNotification({ id: '2', sourceName: 'OpsGenie' }),
    ]

    const filter: FilterState = { severity: 'all', source: null }
    const result = store.getFiltered(filter)

    expect(result).toHaveLength(2)
  })

  // --- Combined severity + source filtering ---

  it('combined severity + source filter narrows results correctly', () => {
    store.notifications = [
      makeNotification({ id: '1', severity: 'critical', sourceName: 'PagerDuty' }),
      makeNotification({ id: '2', severity: 'warning', sourceName: 'PagerDuty' }),
      makeNotification({ id: '3', severity: 'critical', sourceName: 'OpsGenie' }),
      makeNotification({ id: '4', severity: 'info', sourceName: 'PagerDuty' }),
    ]

    const filter: FilterState = { severity: 'critical', source: 'PagerDuty' }
    const result = store.getFiltered(filter)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
    expect(result[0].severity).toBe('critical')
    expect(result[0].sourceName).toBe('PagerDuty')
  })

  it('combined warning-critical + source filter works', () => {
    store.notifications = [
      makeNotification({ id: '1', severity: 'critical', sourceName: 'PagerDuty' }),
      makeNotification({ id: '2', severity: 'warning', sourceName: 'OpsGenie' }),
      makeNotification({ id: '3', severity: 'info', sourceName: 'PagerDuty' }),
      makeNotification({ id: '4', severity: 'warning', sourceName: 'PagerDuty' }),
    ]

    const filter: FilterState = { severity: 'warning-critical', source: 'PagerDuty' }
    const result = store.getFiltered(filter)

    expect(result).toHaveLength(2)
    expect(result.map((n) => n.id).sort()).toEqual(['1', '4'])
  })

  // --- Empty notifications ---

  it('empty notifications array returns empty for any filter', () => {
    store.notifications = []

    const filter: FilterState = { severity: 'all', source: null }
    expect(store.getFiltered(filter)).toEqual([])

    const criticalFilter: FilterState = { severity: 'critical', source: 'PagerDuty' }
    expect(store.getFiltered(criticalFilter)).toEqual([])
  })

  // --- Source filter with no matches ---

  it('source filter with no matching source returns empty', () => {
    store.notifications = [
      makeNotification({ id: '1', sourceName: 'PagerDuty' }),
      makeNotification({ id: '2', sourceName: 'OpsGenie' }),
    ]

    const filter: FilterState = { severity: 'all', source: 'NonExistent' }
    const result = store.getFiltered(filter)

    expect(result).toHaveLength(0)
  })
})
