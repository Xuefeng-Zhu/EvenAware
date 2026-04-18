import type { GlassScreen } from 'even-toolkit/glass-screen-router'
import { line } from 'even-toolkit/types'
import type { DisplayLine } from 'even-toolkit/types'
import type { AppSnapshot, AppActions } from '../shared'
import type { Notification } from '@/types/notification'

/** Severity indicator icons for the detail view */
const SEVERITY_ICONS: Record<string, string> = {
  critical: '▲',
  warning: '◆',
  info: '●',
}

/** Severity labels for the detail view header */
const SEVERITY_LABELS: Record<string, string> = {
  critical: 'CRITICAL',
  warning: 'WARNING',
  info: 'INFO',
}

/** Heavy horizontal line separator (U+2501) */
const SEPARATOR = '━'.repeat(25)

/**
 * Format a Firestore-style timestamp into a human-readable UTC string.
 * Output format: YYYY-MM-DD HH:MM:SS UTC
 */
function formatTimestamp(ts: { seconds: number; nanoseconds: number }): string {
  const date = new Date(ts.seconds * 1000)
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
}

/**
 * Build DisplayLine[] for the notification detail view.
 *
 * Format:
 *   [severity icon] [SEVERITY]
 *   Source: [sourceName]
 *   Time: [formatted timestamp]
 *   ━━━━━━━━━━━━━━━━━━━━━━━━━
 *   [title]
 *
 *   [body]
 */
function buildDetailLines(notification: Notification): DisplayLine[] {
  const icon = SEVERITY_ICONS[notification.severity] || '●'
  const label = SEVERITY_LABELS[notification.severity] || 'INFO'
  const time = formatTimestamp(notification.timestamp)

  const lines: DisplayLine[] = [
    line(`${icon} ${label}`),
    line(`Source: ${notification.sourceName}`),
    line(`Time: ${time}`),
    line(SEPARATOR),
    line(notification.title),
    line(''),
  ]

  // Split body into individual lines so the text container can wrap/scroll properly
  const bodyLines = notification.body.split('\n')
  for (const bodyLine of bodyLines) {
    lines.push(line(bodyLine))
  }

  return lines
}

export const detailScreen: GlassScreen<AppSnapshot, AppActions> = {
  display(snapshot) {
    const notification = snapshot.selectedNotification
    if (!notification) {
      return { lines: [line('No notification selected')] }
    }
    return { lines: buildDetailLines(notification) }
  },

  action(action, nav, _snapshot, ctx) {
    if (action.type === 'GO_BACK') {
      ctx.navigate('/feed')
      return { ...nav, highlightedIndex: 0 }
    }
    return nav
  },
}
