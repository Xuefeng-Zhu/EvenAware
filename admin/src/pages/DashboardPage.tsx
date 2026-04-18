import { useEffect, useState } from 'react'
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { notificationService, NotificationSnapshot } from '../services/notificationService'
import { filterNotifications, getDistinctSources } from '../utils/filterNotifications'
import { useToast } from '../contexts/ToastContext'
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

/** Notification templates for common work scenarios. */
interface NotificationTemplate {
  label: string
  category: string
  title: string
  body: string
  severity: SeverityLevel
  sourceName: string
  sourceType: string
}

const notificationTemplates: NotificationTemplate[] = [
  // Critical
  {
    label: 'Service Down',
    category: 'Incidents',
    title: 'Service Outage — API Gateway',
    body: 'API Gateway is not responding. All downstream services affected.',
    severity: 'critical',
    sourceName: 'PagerDuty',
    sourceType: 'pagerduty',
  },
  {
    label: 'Deploy Failed',
    category: 'Incidents',
    title: 'Production Deploy Failed',
    body: 'Deploy to prod-us-east-1 failed at step 3/5. Rollback initiated.',
    severity: 'critical',
    sourceName: 'CI/CD',
    sourceType: 'custom',
  },
  {
    label: 'Security Alert',
    category: 'Incidents',
    title: 'Unauthorized Access Attempt',
    body: 'Multiple failed login attempts detected from unusual IP range.',
    severity: 'critical',
    sourceName: 'Security',
    sourceType: 'custom',
  },
  // Warning
  {
    label: 'High CPU',
    category: 'Infrastructure',
    title: 'High CPU Usage — prod-web-03',
    body: 'CPU at 92% for the last 5 minutes. Consider scaling up.',
    severity: 'warning',
    sourceName: 'CloudWatch',
    sourceType: 'custom',
  },
  {
    label: 'Disk Space Low',
    category: 'Infrastructure',
    title: 'Disk Space Running Low',
    body: '/data volume at 89% capacity on db-primary.',
    severity: 'warning',
    sourceName: 'OpsGenie',
    sourceType: 'opsgenie',
  },
  {
    label: 'Build Failing',
    category: 'Development',
    title: 'CI Build Failing — main branch',
    body: '3 consecutive failures on main. Tests failing in auth module.',
    severity: 'warning',
    sourceName: 'CI/CD',
    sourceType: 'custom',
  },
  {
    label: 'Meeting Soon',
    category: 'Reminders',
    title: 'Meeting in 5 minutes',
    body: 'Sprint Planning — Conference Room B / Zoom link in calendar.',
    severity: 'warning',
    sourceName: 'Calendar',
    sourceType: 'manual',
  },
  {
    label: 'PR Needs Review',
    category: 'Development',
    title: 'PR Review Requested',
    body: 'PR #247 "Add rate limiting" needs your approval — blocking release.',
    severity: 'warning',
    sourceName: 'GitHub',
    sourceType: 'custom',
  },
  // Info
  {
    label: 'Deploy Succeeded',
    category: 'Development',
    title: 'Deploy to Production Complete',
    body: 'v2.4.1 deployed successfully to all regions.',
    severity: 'info',
    sourceName: 'CI/CD',
    sourceType: 'custom',
  },
  {
    label: 'On-Call Change',
    category: 'Team',
    title: "You're Now On-Call",
    body: 'On-call rotation started. You are primary responder until Monday 9 AM.',
    severity: 'info',
    sourceName: 'PagerDuty',
    sourceType: 'pagerduty',
  },
  {
    label: 'Focus Block Ending',
    category: 'Reminders',
    title: 'Focus Block Ends in 10 min',
    body: 'Your deep work session ends at 3:00 PM. Next: team sync.',
    severity: 'info',
    sourceName: 'Calendar',
    sourceType: 'manual',
  },
  {
    label: 'Order Ready',
    category: 'Operations',
    title: 'Order #4521 Ready for Pickup',
    body: 'Staged at Loading Bay 3. Customer ETA: 15 minutes.',
    severity: 'info',
    sourceName: 'Warehouse',
    sourceType: 'custom',
  },
  {
    label: 'Machine Alert',
    category: 'Operations',
    title: 'Machine 7 Needs Attention',
    body: 'Scheduled maintenance due. Output rate dropped 12% in last hour.',
    severity: 'warning',
    sourceName: 'Floor Monitor',
    sourceType: 'custom',
  },
  {
    label: 'New Team Member',
    category: 'Team',
    title: 'Welcome — New Team Member',
    body: 'Alex Chen joined the Platform team today.',
    severity: 'info',
    sourceName: 'HR',
    sourceType: 'manual',
  },
]

/** Severity badge styles for template cards. */
const severityBadgeStyles: Record<SeverityLevel, string> = {
  critical: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  info: 'bg-blue-100 text-blue-700',
}

/** Map severity level to an accessible label. */
const severityLabelMap: Record<SeverityLevel, string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
}

export default function DashboardPage() {
  const { showSuccess, showError } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [connected, setConnected] = useState(true)
  const [filter, setFilter] = useState<DashboardFilterState>({ severity: 'all', source: null })
  const [showSendForm, setShowSendForm] = useState(false)

  // Send notification form state
  const [sendTitle, setSendTitle] = useState('')
  const [sendBody, setSendBody] = useState('')
  const [sendSeverity, setSendSeverity] = useState<SeverityLevel>('info')
  const [sendSourceName, setSendSourceName] = useState('Admin')
  const [sendSourceType, setSendSourceType] = useState('manual')
  const [sending, setSending] = useState(false)
  const [templateSearch, setTemplateSearch] = useState('')
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false)

  const filteredTemplates = templateSearch.trim()
    ? notificationTemplates.filter((t) => {
        const q = templateSearch.toLowerCase()
        return (
          t.label.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.severity.includes(q) ||
          t.sourceName.toLowerCase().includes(q)
        )
      })
    : notificationTemplates

  function applyTemplate(template: NotificationTemplate) {
    setSendTitle(template.title)
    setSendBody(template.body)
    setSendSeverity(template.severity)
    setSendSourceName(template.sourceName)
    setSendSourceType(template.sourceType)
    setTemplateSearch('')
    setTemplateDropdownOpen(false)
    setShowSendForm(true)
  }

  async function handleQuickSend(template: NotificationTemplate) {
    setSending(true)
    try {
      await addDoc(collection(db, 'notifications'), {
        title: template.title,
        body: template.body,
        severity: template.severity,
        sourceName: template.sourceName,
        sourceType: template.sourceType,
        timestamp: serverTimestamp(),
      })
      showSuccess(`Sent: ${template.label}`)
    } catch {
      showError('Failed to send notification.')
    } finally {
      setSending(false)
    }
  }

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

  async function handleMarkAsRead(id: string) {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true })
      setExpandedId(null)
    } catch {
      showError('Failed to mark as read.')
    }
  }

  async function handleSendNotification(e: React.FormEvent) {
    e.preventDefault()
    if (!sendTitle.trim()) return

    setSending(true)
    try {
      await addDoc(collection(db, 'notifications'), {
        title: sendTitle.trim(),
        body: sendBody.trim(),
        severity: sendSeverity,
        sourceName: sendSourceName.trim() || 'Admin',
        sourceType: sendSourceType.trim() || 'manual',
        timestamp: serverTimestamp(),
      })
      showSuccess('Notification sent.')
      setSendTitle('')
      setSendBody('')
      setSendSeverity('info')
      setShowSendForm(false)
    } catch {
      showError('Failed to send notification.')
    } finally {
      setSending(false)
    }
  }

  const unreadNotifications = notifications.filter((n) => !n.read)
  const filteredNotifications = filterNotifications(unreadNotifications, filter)
  const sources = getDistinctSources(unreadNotifications)
  const isFiltered = filter.severity !== 'all' || filter.source !== null

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setShowSendForm(!showSendForm)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Send Notification
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`}
              aria-label={connected ? 'Connected' : 'Disconnected'}
            />
            <span>{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>

      {/* Send notification form */}
      {showSendForm && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm p-6">
          {/* Template search */}
          <div className="mb-6 relative">
            <label htmlFor="template-search" className="block text-sm font-medium text-gray-700 mb-1">
              Load from template
            </label>
            <input
              id="template-search"
              type="text"
              value={templateSearch}
              onChange={(e) => {
                setTemplateSearch(e.target.value)
                setTemplateDropdownOpen(true)
              }}
              onFocus={() => setTemplateDropdownOpen(true)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search templates — e.g. deploy, critical, meeting…"
              autoComplete="off"
            />
            {templateDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setTemplateDropdownOpen(false)} />
                <ul className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                  {filteredTemplates.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-gray-500">No templates match.</li>
                  ) : (
                    filteredTemplates.map((template) => (
                      <li key={template.label}>
                        <button
                          type="button"
                          onClick={() => applyTemplate(template)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors"
                        >
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${severityBadgeStyles[template.severity]}`}>
                            {template.severity}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="font-medium text-gray-900">{template.label}</span>
                            <span className="text-gray-400 mx-1">·</span>
                            <span className="text-gray-500">{template.category}</span>
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </>
            )}
          </div>

          <div className="border-t border-gray-200 pt-5">
            <form onSubmit={handleSendNotification}>
              <h3 className="text-sm font-medium text-gray-700 mb-4">Custom Notification</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="send-title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="send-title"
                  type="text"
                  value={sendTitle}
                  onChange={(e) => setSendTitle(e.target.value)}
                  required
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Notification title"
                />
              </div>
              <div>
                <label htmlFor="send-body" className="block text-sm font-medium text-gray-700 mb-1">
                  Body
                </label>
                <textarea
                  id="send-body"
                  value={sendBody}
                  onChange={(e) => setSendBody(e.target.value)}
                  rows={3}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional body text"
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <div>
                  <label htmlFor="send-severity" className="block text-sm font-medium text-gray-700 mb-1">
                    Severity
                  </label>
                  <select
                    id="send-severity"
                    value={sendSeverity}
                    onChange={(e) => setSendSeverity(e.target.value as SeverityLevel)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="send-source-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Source Name
                  </label>
                  <input
                    id="send-source-name"
                    type="text"
                    value={sendSourceName}
                    onChange={(e) => setSendSourceName(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Admin"
                  />
                </div>
                <div>
                  <label htmlFor="send-source-type" className="block text-sm font-medium text-gray-700 mb-1">
                    Source Type
                  </label>
                  <input
                    id="send-source-type"
                    type="text"
                    value={sendSourceType}
                    onChange={(e) => setSendSourceType(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="manual"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="submit"
                disabled={sending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
              <button
                type="button"
                onClick={() => setShowSendForm(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

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
            Showing {filteredNotifications.length} of {unreadNotifications.length}
          </span>
        )}
      </div>

      {/* Notification feed */}
      <div className="overflow-y-auto max-h-[calc(100vh-12rem)]">
        {unreadNotifications.length === 0 ? (
          <p className="text-gray-500 text-sm">No unread notifications.</p>
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
                onMarkAsRead={handleMarkAsRead}
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
  onMarkAsRead,
}: {
  notification: Notification
  isExpanded: boolean
  onToggle: (id: string) => void
  onMarkAsRead: (id: string) => void
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
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onMarkAsRead(notification.id)
              }}
              className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Mark as read
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
