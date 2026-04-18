/**
 * Pure functions for filtering and extracting metadata from notifications.
 */

import { Notification } from '../types/notification'
import { DashboardFilterState } from '../types/integration'

/** Filter notifications by severity and source criteria. */
export function filterNotifications(
  notifications: Notification[],
  filter: DashboardFilterState
): Notification[] {
  return notifications.filter(n => {
    const matchesSeverity =
      filter.severity === 'all' ||
      (filter.severity === 'critical' && n.severity === 'critical') ||
      (filter.severity === 'warning-critical' && (n.severity === 'critical' || n.severity === 'warning')) ||
      (filter.severity === 'info' && n.severity === 'info')

    const matchesSource = filter.source === null || n.sourceName === filter.source

    return matchesSeverity && matchesSource
  })
}

/** Extract sorted distinct source names from a list of notifications. */
export function getDistinctSources(notifications: Notification[]): string[] {
  return [...new Set(notifications.map(n => n.sourceName))].sort()
}
