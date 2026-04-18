import { describe, it, expect, vi } from 'vitest'

// Mock even-toolkit types module
vi.mock('even-toolkit/types', () => ({
  line: (text: string, style: string = 'normal', inverted = false) => ({
    text,
    inverted,
    style,
  }),
}))

import { detailScreen } from '@/glass/screens/detail'
import type { AppSnapshot, AppActions } from '@/glass/shared'
import type { Notification } from '@/types/notification'

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    title: 'Database connection pool exhausted',
    body: 'The primary database connection pool on prod-db-01 has reached its maximum capacity of 500 connections.',
    severity: 'critical',
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
    screen: 'detail',
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

describe('detailScreen.display', () => {
  it('shows fallback text when no notification is selected', () => {
    const snapshot = makeSnapshot({ selectedNotification: null })
    const result = detailScreen.display(snapshot, makeNav())

    expect(result.lines).toHaveLength(1)
    expect(result.lines[0].text).toBe('No notification selected')
  })

  it('renders severity icon and label for critical notifications', () => {
    const notification = makeNotification({ severity: 'critical' })
    const snapshot = makeSnapshot({ selectedNotification: notification })
    const result = detailScreen.display(snapshot, makeNav())

    expect(result.lines[0].text).toBe('▲ CRITICAL')
  })

  it('renders severity icon and label for warning notifications', () => {
    const notification = makeNotification({ severity: 'warning' })
    const snapshot = makeSnapshot({ selectedNotification: notification })
    const result = detailScreen.display(snapshot, makeNav())

    expect(result.lines[0].text).toBe('◆ WARNING')
  })

  it('renders severity icon and label for info notifications', () => {
    const notification = makeNotification({ severity: 'info' })
    const snapshot = makeSnapshot({ selectedNotification: notification })
    const result = detailScreen.display(snapshot, makeNav())

    expect(result.lines[0].text).toBe('● INFO')
  })

  it('renders source name on the second line', () => {
    const notification = makeNotification({ sourceName: 'OpsGenie' })
    const snapshot = makeSnapshot({ selectedNotification: notification })
    const result = detailScreen.display(snapshot, makeNav())

    expect(result.lines[1].text).toBe('Source: OpsGenie')
  })

  it('renders formatted timestamp on the third line', () => {
    // 1700000000 seconds = 2023-11-14 22:13:20 UTC
    const notification = makeNotification({ timestamp: { seconds: 1700000000, nanoseconds: 0 } })
    const snapshot = makeSnapshot({ selectedNotification: notification })
    const result = detailScreen.display(snapshot, makeNav())

    expect(result.lines[2].text).toBe('Time: 2023-11-14 22:13:20 UTC')
  })

  it('renders separator line with ━ characters', () => {
    const notification = makeNotification()
    const snapshot = makeSnapshot({ selectedNotification: notification })
    const result = detailScreen.display(snapshot, makeNav())

    expect(result.lines[3].text).toBe('━'.repeat(25))
  })

  it('renders title after the separator', () => {
    const notification = makeNotification({ title: 'DB connection pool exhausted' })
    const snapshot = makeSnapshot({ selectedNotification: notification })
    const result = detailScreen.display(snapshot, makeNav())

    expect(result.lines[4].text).toBe('DB connection pool exhausted')
  })

  it('renders empty line between title and body', () => {
    const notification = makeNotification()
    const snapshot = makeSnapshot({ selectedNotification: notification })
    const result = detailScreen.display(snapshot, makeNav())

    expect(result.lines[5].text).toBe('')
  })

  it('renders body text after the empty line', () => {
    const notification = makeNotification({ body: 'Connection pool is full.' })
    const snapshot = makeSnapshot({ selectedNotification: notification })
    const result = detailScreen.display(snapshot, makeNav())

    expect(result.lines[6].text).toBe('Connection pool is full.')
  })

  it('splits multi-line body into separate DisplayLines', () => {
    const notification = makeNotification({ body: 'Line one\nLine two\nLine three' })
    const snapshot = makeSnapshot({ selectedNotification: notification })
    const result = detailScreen.display(snapshot, makeNav())

    // Lines: severity, source, time, separator, title, empty, body line 1, body line 2, body line 3
    expect(result.lines[6].text).toBe('Line one')
    expect(result.lines[7].text).toBe('Line two')
    expect(result.lines[8].text).toBe('Line three')
    expect(result.lines).toHaveLength(9)
  })

  it('renders the full detail format in correct order', () => {
    const notification = makeNotification({
      severity: 'warning',
      sourceName: 'Datadog',
      timestamp: { seconds: 1700000000, nanoseconds: 0 },
      title: 'High CPU usage',
      body: 'CPU at 95% on web-server-03.',
    })
    const snapshot = makeSnapshot({ selectedNotification: notification })
    const result = detailScreen.display(snapshot, makeNav())

    const texts = result.lines.map((l: { text: string }) => l.text)
    expect(texts).toEqual([
      '◆ WARNING',
      'Source: Datadog',
      'Time: 2023-11-14 22:13:20 UTC',
      '━'.repeat(25),
      'High CPU usage',
      '',
      'CPU at 95% on web-server-03.',
    ])
  })
})

describe('detailScreen.action', () => {
  it('navigates back to feed on GO_BACK', () => {
    const snapshot = makeSnapshot({ selectedNotification: makeNotification() })
    const nav = makeNav({ highlightedIndex: 0 })
    const ctx = makeCtx()

    const result = detailScreen.action({ type: 'GO_BACK' }, nav, snapshot, ctx)

    expect(ctx.navigate).toHaveBeenCalledWith('/feed')
    expect(result.highlightedIndex).toBe(0)
  })

  it('returns nav unchanged on HIGHLIGHT_MOVE', () => {
    const snapshot = makeSnapshot({ selectedNotification: makeNotification() })
    const nav = makeNav({ highlightedIndex: 0 })
    const ctx = makeCtx()

    const result = detailScreen.action({ type: 'HIGHLIGHT_MOVE', direction: 'down' }, nav, snapshot, ctx)

    expect(result).toEqual(nav)
    expect(ctx.navigate).not.toHaveBeenCalled()
  })

  it('returns nav unchanged on SELECT_HIGHLIGHTED', () => {
    const snapshot = makeSnapshot({ selectedNotification: makeNotification() })
    const nav = makeNav({ highlightedIndex: 0 })
    const ctx = makeCtx()

    const result = detailScreen.action({ type: 'SELECT_HIGHLIGHTED' }, nav, snapshot, ctx)

    expect(result).toEqual(nav)
    expect(ctx.navigate).not.toHaveBeenCalled()
  })
})
