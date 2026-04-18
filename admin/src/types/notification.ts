/**
 * Shared notification types for the Notification Hub.
 * Copied from src/types/notification.ts to keep the admin app self-contained.
 */

/** Severity classification for a notification */
export type SeverityLevel = 'critical' | 'warning' | 'info'

/** Field length and collection limits */
export const MAX_TITLE_LENGTH = 120
export const MAX_BODY_LENGTH = 400
export const MAX_NOTIFICATIONS = 50

/**
 * A normalized notification stored in Firestore.
 * Represents a single alert from any source after backend normalization.
 */
export interface Notification {
  /** Firestore auto-generated document ID */
  id: string

  /** Notification title, max 120 characters */
  title: string

  /** Notification body, max 400 characters */
  body: string

  /** Severity level: critical, warning, or info */
  severity: SeverityLevel

  /** Human-readable source name (e.g., "PagerDuty", "OpsGenie") */
  sourceName: string

  /** Source type identifier matching the adapter (e.g., "pagerduty") */
  sourceType: string

  /**
   * UTC timestamp of when the notification was received.
   * Uses a plain object shape compatible with both Firebase client and admin SDK Timestamps.
   */
  timestamp: { seconds: number; nanoseconds: number }

  /** Whether the notification has been marked as read */
  read?: boolean
}

/**
 * Output of a source adapter's parse method, before backend normalization.
 * The backend will truncate fields, validate severity, and add id/timestamp.
 */
export interface ParsedNotification {
  title: string
  body: string
  severity: string
  sourceName: string
  sourceType: string
}
