import { useState, useEffect } from 'react'
import {
  ScreenHeader,
  Card,
  ListItem,
  SectionHeader,
} from 'even-toolkit/web'
import { notificationStore } from '@/store/notificationStore'
import type { Notification, SeverityLevel } from '@/types/notification'
import type { SeverityFilter, FilterState } from '@/types/filters'

const SEVERITY_OPTIONS: { value: SeverityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning-critical', label: 'Warning+' },
]

const SEVERITY_BADGE: Record<SeverityLevel, { bg: string; label: string }> = {
  critical: { bg: 'bg-red-100 text-red-700', label: 'Critical' },
  warning: { bg: 'bg-amber-100 text-amber-700', label: 'Warning' },
  info: { bg: 'bg-blue-100 text-blue-700', label: 'Info' },
}

function formatTime(ts: { seconds: number; nanoseconds: number }): string {
  if (!ts || ts.seconds === 0) return ''
  const d = new Date(ts.seconds * 1000)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function Home() {
  const [notifications, setNotifications] = useState<Notification[]>(notificationStore.notifications)
  const [filter, setFilter] = useState<FilterState>({ severity: 'all', source: null })
  const [sources, setSources] = useState<string[]>([])

  useEffect(() => {
    const unsub = notificationStore.subscribe()
    const unsubChange = notificationStore.onChange(() => {
      setNotifications([...notificationStore.notifications])
    })
    return () => {
      unsubChange()
      unsub()
    }
  }, [])

  useEffect(() => {
    const unique = [...new Set(notifications.map((n) => n.sourceName))].sort()
    setSources(unique)
  }, [notifications])

  const filtered = notificationStore.getFiltered(filter)

  return (
    <div className="px-3 pt-4 pb-8 space-y-3">
      <ScreenHeader
        title="Notification Hub"
        subtitle="Real-time notification aggregation for G2 glasses"
      />

      {/* Filter controls */}
      <SectionHeader title={`Notifications · ${filtered.length} of ${notifications.length}`} />
      <div className="flex gap-2">
        <div className="flex-1">
          <label htmlFor="severity-filter" className="block text-xs font-medium text-gray-500 mb-1">Severity</label>
          <select
            id="severity-filter"
            value={filter.severity}
            onChange={(e) => setFilter((f) => ({ ...f, severity: e.target.value as SeverityFilter }))}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
          >
            {SEVERITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="source-filter" className="block text-xs font-medium text-gray-500 mb-1">Source</label>
          <select
            id="source-filter"
            value={filter.source ?? ''}
            onChange={(e) => setFilter((f) => ({ ...f, source: e.target.value || null }))}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
          >
            <option value="">All Sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <Card>
          <ListItem title="No notifications" subtitle="Nothing matches the current filters" />
        </Card>
      ) : (
        <Card>
          {filtered.map((n) => {
            const badge = SEVERITY_BADGE[n.severity]
            return (
              <ListItem
                key={n.id}
                leading={
                  <span className={`inline-flex items-center justify-center w-16 px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.bg}`}>
                    {badge.label}
                  </span>
                }
                title={n.title}
                subtitle={`${n.sourceName} · ${formatTime(n.timestamp)}`}
              />
            )
          })}
        </Card>
      )}
    </div>
  )
}
