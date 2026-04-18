import { useState, useEffect } from 'react'
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Notification, SeverityLevel } from '../types/notification'
import type { SeverityFilter, DashboardFilterState } from '../types/integration'
import { filterNotifications, getDistinctSources } from '../utils/filterNotifications'

const MAX_NOTIFICATIONS = 50

const SEVERITY_OPTIONS: { value: SeverityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning-critical', label: 'Warning & Critical' },
  { value: 'info', label: 'Info' },
]

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  critical: 'bg-red-100 text-red-800',
  warning: 'bg-yellow-100 text-yellow-800',
  info: 'bg-blue-100 text-blue-800',
}

function formatTimestamp(ts: { seconds: number; nanoseconds: number }): string {
  if (!ts || ts.seconds === 0) return '—'
  return new Date(ts.seconds * 1000).toLocaleString()
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<DashboardFilterState>({
    severity: 'all',
    source: null,
  })

  useEffect(() => {
    const q = query(
      collection(db, 'notifications'),
      orderBy('timestamp', 'desc'),
      limit(MAX_NOTIFICATIONS),
    )

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const docs: Notification[] = []
        for (const doc of snapshot.docs) {
          const data = doc.data()
          if (data.title && data.body && data.severity && data.sourceName && data.sourceType) {
            docs.push({
              id: doc.id,
              title: data.title,
              body: data.body,
              severity: data.severity as SeverityLevel,
              sourceName: data.sourceName,
              sourceType: data.sourceType,
              timestamp: {
                seconds: data.timestamp?.seconds ?? 0,
                nanoseconds: data.timestamp?.nanoseconds ?? 0,
              },
            })
          }
        }
        setNotifications(docs)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('[NotificationsPage] Listener error:', err)
        setError('Failed to load notifications')
        setLoading(false)
      },
    )

    return unsub
  }, [])

  const filtered = filterNotifications(notifications, filter)
  const sources = getDistinctSources(notifications)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div>
            <label htmlFor="severity-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Severity
            </label>
            <select
              id="severity-filter"
              value={filter.severity}
              onChange={(e) => setFilter((f) => ({ ...f, severity: e.target.value as SeverityFilter }))}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {SEVERITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="source-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Source
            </label>
            <select
              id="source-filter"
              value={filter.source ?? ''}
              onChange={(e) => setFilter((f) => ({ ...f, source: e.target.value || null }))}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Sources</option>
              {sources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <span className="text-sm text-gray-500">
              {filtered.length} of {notifications.length} notifications
            </span>
          </div>
        </div>

        {/* Content */}
        {loading && (
          <p className="text-gray-500 text-center py-12">Loading notifications…</p>
        )}

        {error && (
          <p className="text-red-600 text-center py-12">{error}</p>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className="text-gray-500 text-center py-12">No notifications match the current filters.</p>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((n) => (
              <div key={n.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${SEVERITY_COLORS[n.severity]}`}>
                        {n.severity}
                      </span>
                      <span className="text-xs text-gray-500">{n.sourceName}</span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 truncate">{n.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{n.body}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                    {formatTimestamp(n.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
