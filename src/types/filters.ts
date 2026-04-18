/**
 * Filter types and SDK Storage keys for the Notification Hub.
 * Used by the frontend to filter notifications by severity and source,
 * with persistence via SDK Storage (bridge.setLocalStorage / bridge.getLocalStorage).
 */

/** Severity filter options for the notification feed */
export type SeverityFilter = 'all' | 'critical' | 'warning-critical'

/**
 * Current filter state applied to the notification feed.
 * Persisted to SDK Storage so filters survive app restarts.
 */
export interface FilterState {
  /** Active severity filter */
  severity: SeverityFilter

  /** Active source filter — null means all sources */
  source: string | null
}

/** Default filter state: show all severities, all sources */
export const DEFAULT_FILTER_STATE: FilterState = {
  severity: 'all',
  source: null,
}

// ---------------------------------------------------------------------------
// SDK Storage Keys
// ---------------------------------------------------------------------------

/** SDK Storage key for the persisted severity filter value */
export const STORAGE_KEY_SEVERITY_FILTER = 'notification-hub:severity-filter'

/** SDK Storage key for the persisted source filter value */
export const STORAGE_KEY_SOURCE_FILTER = 'notification-hub:source-filter'

/** Default value stored for severity filter in SDK Storage */
export const STORAGE_DEFAULT_SEVERITY: SeverityFilter = 'all'

/** Default value stored for source filter in SDK Storage (empty string = all sources) */
export const STORAGE_DEFAULT_SOURCE = ''
