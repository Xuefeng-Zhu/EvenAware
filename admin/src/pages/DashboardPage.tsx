import { useEffect, useState } from 'react'
import { notificationService, NotificationSnapshot } from '../services/notificationService'
import { filterNotifications, getDistinctSources } from '../utils/filterNotifications'
import type { Notification } from '../types/notification'
import type { SeverityLevel } from '../types/notification'
import type { DashboardFilterState, SeverityFilter } from '../types/integration'

/**
 * Return a human-readable relative timestamp string for a Firestore timestamp.
 * Handles seconds-based timestamps from Firestore documents.
 */
export function formatRelativeTime(timestamp: { seconds: number; nanoseconds: number }): string {
  const now = Date.now()
  const then = timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1_000_000)
  const diffMs = now - then

  if (diffMs < 0) {
    return 'just now'
  }

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) {
    return seconds <= 1 ? 'just now' : `${seconds} seconds ago`
  }

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  }

  const days = Math.floor(hours / 24)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

/** Map severity level to a Tailwind background color class for the indicator dot. */
const severityColorMap: Record<SeverityLevel, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
}

/** Map severity level to an accessible label. */
const severityLabelMap: Record<SeverityLevel, string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
}

export default function DashboardPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [connected, setConnected] = useState(true)
  const [filter, setFilter] = useState<DashboardFilterState>({ severity: 'all', source: null })

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((snapshot: NotificationSnapshot) => {
      setNotifications(snapshot.notifications)
      setConnected(snapshot.connected)
    })

    return unsubscribe
  }, [])

  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const filteredNotifications = filterNotifications(notifications, filter)
  const sources = getDistinctSources(notifications)
  const isFiltered = filter.severity !== 'all' || filter.source !== null

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`}
            aria-label={connected ? 'Connected' : 'Disconnected'}
          />
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Disconnection warning banner */}
      {!connected && (
        <div
          className="mb-4 rounded-md bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-800"
          role="alert"
        >
          Connection lost — notification feed may be stale
        </div>
      )}

      {/* Filter controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label htmlFor="severity-filter" className="sr-only">Severity filter</label>
        <select
          id="severity-filter"
          value={filter.severity}
          onChange={(e) => setFilter((prev) => ({ ...prev, severity: e.target.value as SeverityFilter }))}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All</option>
          <option value="critical">Critical only</option>
          <option value="warning-critical">Warning &amp; Critical</option>
          <option value="info">Info only</option>
        </select>

        <label htmlFor="source-filter" className="sr-only">Source filter</label>
        <select
          id="source-filter"
          value={filter.source ?? ''}
          onChange={(e) => setFilter((prev) => ({ ...prev, source: e.target.value || null }))}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Sources</option>
          {sources.map((source) => (
            <option key={source} value={source}>{source}</option>
          ))}
        </select>

        {isFiltered && (
          <span className="text-sm text-gray-500">
            Showing {filteredNotifications.length} of {notifications.length}
          </span>
        )}
      </div>

      {/* Notification feed */}
      <div className="overflow-y-auto max-h-[calc(100vh-12rem)]">
        {notifications.length === 0 ? (
          <p className="text-gray-500 text-sm">No notifications yet.</p>
        ) : filteredNotifications.length === 0 ? (
          <p className="text-gray-500 text-sm">No notifications match the current filters.</p>
        ) : (
          <ul className="space-y-2" role="list">
            {filteredNotifications.map((notification) => (
              <NotificationFeedItem
                key={notification.id}
                notification={notification}
                isExpanded={expandedId === notification.id}
                onToggle={handleToggleExpand}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function NotificationFeedItem({
  notification,
  isExpanded,
  onToggle,
}: {
  notification: Notification
  isExpanded: boolean
  onToggle: (id: string) => void
}) {
  const dotColor = severityColorMap[notification.severity] ?? 'bg-gray-400'
  const severityLabel = severityLabelMap[notification.severity] ?? notification.severity

  return (
    <li
      className="rounded-lg border border-gray-200 bg-white shadow-sm cursor-pointer"
      onClick={() => onToggle(notification.id)}
    >
      {/* Summary row */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Severity indicator dot */}
        <span
          className={`mt-1.5 inline-block h-3 w-3 flex-shrink-0 rounded-full ${dotColor}`}
          aria-label={`${severityLabel} severity`}
          role="img"
        />

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500">{notification.sourceName}</p>
          <p className={`text-sm font-medium text-gray-900 ${isExpanded ? '' : 'truncate'}`}>{notification.title}</p>
        </div>

        {/* Relative timestamp */}
        <span className="flex-shrink-0 text-xs text-gray-400 whitespace-nowrap mt-1">
          {formatRelativeTime(notification.timestamp)}
        </span>
      </div>

      {/* Expanded detail panel */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 text-sm">
          <dl className="space-y-1.5">
            <div>
              <dt className="text-xs font-medium text-gray-500">Body</dt>
              <dd className="text-gray-800">{notification.body || '—'}</dd>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1.5">
              <div>
                <dt className="text-xs font-medium text-gray-500">Severity</dt>
                <dd className="text-gray-800">{severityLabel}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Source Name</dt>
                <dd className="text-gray-800">{notification.sourceName}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Source Type</dt>
                <dd className="text-gray-800">{notification.sourceType}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Timestamp (UTC)</dt>
                <dd className="text-gray-800">
                  {new Date(notification.timestamp.seconds * 1000).toUTCString()}
                </dd>
              </div>
            </div>
          </dl>
        </div>
      )}
    </li>
  )
}
