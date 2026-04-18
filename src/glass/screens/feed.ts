import type { GlassScreen } from 'even-toolkit/glass-screen-router'
import { buildScrollableList } from 'even-toolkit/glass-display-builders'
import { moveHighlight } from 'even-toolkit/glass-nav'
import type { AppSnapshot, AppActions } from '../shared'
import type { Notification } from '@/types/notification'

/** Severity indicator icons for the feed list */
const SEVERITY_ICONS: Record<string, string> = {
  critical: '▲',
  warning: '◆',
  info: '●',
}

/** Maximum character length for a single feed list item */
const MAX_ITEM_LENGTH = 64

/**
 * Format a notification into a single-line feed item:
 *   [severity icon] sourceName: truncated title...
 * Truncated to MAX_ITEM_LENGTH characters total.
 */
function formatNotificationItem(notification: Notification): string {
  const icon = SEVERITY_ICONS[notification.severity] || '●'
  const prefix = `${icon} ${notification.sourceName}: `
  const maxTitleLength = MAX_ITEM_LENGTH - prefix.length
  if (maxTitleLength <= 0) {
    return prefix.slice(0, MAX_ITEM_LENGTH)
  }
  const title =
    notification.title.length > maxTitleLength
      ? notification.title.slice(0, maxTitleLength - 3) + '...'
      : notification.title
  return `${prefix}${title}`
}

export const feedScreen: GlassScreen<AppSnapshot, AppActions> = {
  display(snapshot, nav) {
    return {
      lines: buildScrollableList({
        items: snapshot.filteredNotifications,
        highlightedIndex: nav.highlightedIndex,
        maxVisible: 5,
        formatter: (item) => formatNotificationItem(item),
      }),
    }
  },

  action(action, nav, snapshot, ctx) {
    if (action.type === 'HIGHLIGHT_MOVE') {
      // When at the top of the list and scrolling up, open the severity filter
      if (nav.highlightedIndex === 0 && action.direction === 'up') {
        ctx.navigate('/severity-filter')
        return nav
      }
      return {
        ...nav,
        highlightedIndex: moveHighlight(
          nav.highlightedIndex,
          action.direction,
          snapshot.filteredNotifications.length - 1,
        ),
      }
    }

    if (action.type === 'SELECT_HIGHLIGHTED') {
      const notification = snapshot.filteredNotifications[nav.highlightedIndex]
      if (notification) {
        ctx.selectNotification(notification)
        ctx.navigate('/detail')
      }
      return nav
    }

    // GO_BACK on the root feed screen — even-toolkit's useGlasses handles
    // shutDownPageContainer(1) for the exit dialogue automatically
    return nav
  },
}
