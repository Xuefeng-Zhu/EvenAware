import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock even-toolkit modules that have internal resolution issues in test env
vi.mock('even-toolkit/glass-display-builders', () => ({
  buildScrollableList: vi.fn(({ items, formatter }: { items: unknown[]; formatter: (item: unknown, index: number) => string }) =>
    items.map((item, i) => ({
      text: formatter(item, i),
      inverted: false,
      style: 'normal' as const,
    })),
  ),
}))

vi.mock('even-toolkit/glass-nav', () => ({
  moveHighlight: vi.fn((current: number, direction: string, max: number) => {
    if (direction === 'up') return Math.max(0, current - 1)
    return Math.min(max, current + 1)
  }),
}))

import { feedScreen } from '@/glass/screens/feed'
import type { AppSnapshot, AppActions } from '@/glass/shared'
import type { Notification } from '@/types/notification'

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    title: 'Test notification title',
    body: 'Test body',
    severity: 'info',
    sourceName: 'PagerDuty',
    sourceType: 'pagerduty',
    timestamp: { seconds: 1700000000, nanoseconds: 0 },
    ...overrides,
  }
}

function makeSnapshot(overrides: Partial<AppSnapshot> = {}): AppSnapshot {
  return {
    notifications: [],
    filter: { severity: 'all', source: null },
    filteredNotifications: [],
    selectedNotification: null,
    criticalBannerActive: false,
    bleConnected: true,
    firestoreConnected: true,
    flashPhase: false,
    availableSources: [],
    ...overrides,
  }
}

function makeNav(overrides: Partial<{ highlightedIndex: number; screen: string }> = {}) {
  return {
    highlightedIndex: 0,
    screen: 'feed',
    ...overrides,
  }
}

function makeCtx(): AppActions {
  return {
    navigate: vi.fn(),
    setSeverityFilter: vi.fn(),
    setSourceFilter: vi.fn(),
    selectNotification: vi.fn(),
  }
}

describe('feedScreen.display', () => {
  it('renders an empty list when there are no notifications', () => {
    const snapshot = makeSnapshot({ filteredNotifications: [] })
    const result = feedScreen.display(snapshot, makeNav())
    expect(result.lines).toEqual([])
  })

  it('formats critical notifications with ▲ icon', () => {
    const notifications = [
      makeNotification({ severity: 'critical', sourceName: 'PagerDuty', title: 'DB down' }),
    ]
    const snapshot = makeSnapshot({ filteredNotifications: notifications })
    const result = feedScreen.display(snapshot, makeNav())

    expect(result.lines[0].text).toBe('▲ PagerDuty: DB down')
  })

  it('formats warning notifications with ◆ icon', () => {
    const notifications = [
      makeNotification({ severity: 'warning', sourceName: 'OpsGenie', title: 'High CPU' }),
    ]
    const snapshot = makeSnapshot({ filteredNotifications: notifications })
    const result = feedScreen.display(snapshot, makeNav())

    expect(result.lines[0].text).toBe('◆ OpsGenie: High CPU')
  })

  it('formats info notifications with ● icon', () => {
    const notifications = [
      makeNotification({ severity: 'info', sourceName: 'Datadog', title: 'Deploy complete' }),
    ]
    const snapshot = makeSnapshot({ filteredNotifications: notifications })
    const result = feedScreen.display(snapshot, makeNav())

    expect(result.lines[0].text).toBe('● Datadog: Deploy complete')
  })

  it('truncates long titles to fit within 64 characters', () => {
    const longTitle = 'A'.repeat(120)
    const notification = makeNotification({ severity: 'critical', sourceName: 'PD', title: longTitle })
    const snapshot = makeSnapshot({ filteredNotifications: [notification] })
    const result = feedScreen.display(snapshot, makeNav())

    expect(result.lines[0].text.length).toBeLessThanOrEqual(64)
    expect(result.lines[0].text).toMatch(/\.\.\.$/);
  })

  it('does not truncate short titles', () => {
    const notification = makeNotification({ severity: 'info', sourceName: 'Src', title: 'Short' })
    const snapshot = makeSnapshot({ filteredNotifications: [notification] })
    const result = feedScreen.display(snapshot, makeNav())

    expect(result.lines[0].text).toBe('● Src: Short')
    expect(result.lines[0].text).not.toContain('...')
  })

  it('formats the item as [icon] source: title', () => {
    const notification = makeNotification({
      severity: 'warning',
      sourceName: 'OpsGenie',
      title: 'Memory usage above 90%',
    })
    const snapshot = makeSnapshot({ filteredNotifications: [notification] })
    const result = feedScreen.display(snapshot, makeNav())

    expect(result.lines[0].text).toBe('◆ OpsGenie: Memory usage above 90%')
  })
})

describe('feedScreen.action', () => {
  it('moves highlight down on HIGHLIGHT_MOVE down', () => {
    const notifications = [makeNotification(), makeNotification({ id: 'n2' })]
    const snapshot = makeSnapshot({ filteredNotifications: notifications })
    const nav = makeNav({ highlightedIndex: 0 })
    const ctx = makeCtx()

    const result = feedScreen.action({ type: 'HIGHLIGHT_MOVE', direction: 'down' }, nav, snapshot, ctx)

    expect(result.highlightedIndex).toBe(1)
  })

  it('navigates to severity-filter when scrolling up at index 0', () => {
    const notifications = [makeNotification()]
    const snapshot = makeSnapshot({ filteredNotifications: notifications })
    const nav = makeNav({ highlightedIndex: 0 })
    const ctx = makeCtx()

    const result = feedScreen.action({ type: 'HIGHLIGHT_MOVE', direction: 'up' }, nav, snapshot, ctx)

    expect(ctx.navigate).toHaveBeenCalledWith('/severity-filter')
    expect(result.highlightedIndex).toBe(0)
  })

  it('moves highlight up normally when not at index 0', () => {
    const notifications = [makeNotification(), makeNotification({ id: 'n2' })]
    const snapshot = makeSnapshot({ filteredNotifications: notifications })
    const nav = makeNav({ highlightedIndex: 1 })
    const ctx = makeCtx()

    const result = feedScreen.action({ type: 'HIGHLIGHT_MOVE', direction: 'up' }, nav, snapshot, ctx)

    expect(result.highlightedIndex).toBe(0)
    expect(ctx.navigate).not.toHaveBeenCalled()
  })

  it('selects notification and navigates to detail on SELECT_HIGHLIGHTED', () => {
    const notification = makeNotification({ id: 'n1', title: 'Alert' })
    const snapshot = makeSnapshot({ filteredNotifications: [notification] })
    const nav = makeNav({ highlightedIndex: 0 })
    const ctx = makeCtx()

    feedScreen.action({ type: 'SELECT_HIGHLIGHTED' }, nav, snapshot, ctx)

    expect(ctx.selectNotification).toHaveBeenCalledWith(notification)
    expect(ctx.navigate).toHaveBeenCalledWith('/detail')
  })

  it('does not crash on SELECT_HIGHLIGHTED with empty list', () => {
    const snapshot = makeSnapshot({ filteredNotifications: [] })
    const nav = makeNav({ highlightedIndex: 0 })
    const ctx = makeCtx()

    const result = feedScreen.action({ type: 'SELECT_HIGHLIGHTED' }, nav, snapshot, ctx)

    expect(ctx.selectNotification).not.toHaveBeenCalled()
    expect(ctx.navigate).not.toHaveBeenCalled()
    expect(result).toEqual(nav)
  })

  it('returns nav unchanged on GO_BACK (root screen exit)', () => {
    const snapshot = makeSnapshot({ filteredNotifications: [makeNotification()] })
    const nav = makeNav({ highlightedIndex: 0 })
    const ctx = makeCtx()

    const result = feedScreen.action({ type: 'GO_BACK' }, nav, snapshot, ctx)

    expect(result).toEqual(nav)
  })
})
