/**
 * Data model and types for the integrations collection.
 * Used by the Admin App for CRUD operations and the dashboard filter state.
 */

/** A configured integration stored in the Firestore `integrations` collection */
export interface Integration {
  /** Firestore document ID */
  id: string
  /** Human-readable name for the integration */
  displayName: string
  /** Source type identifier: "pagerduty" | "opsgenie" | "custom" */
  sourceType: string
  /** Optional description */
  description: string
  /** Bearer token for webhook authentication, ≥32 hex characters */
  authToken: string
  /** Whether the integration is active */
  enabled: boolean
  /** Full webhook URL for this integration */
  webhookUrl: string
  /** When the integration was created */
  createdAt: { seconds: number; nanoseconds: number }
}

/** Input for creating a new integration */
export interface CreateIntegrationInput {
  displayName: string
  sourceType: 'pagerduty' | 'opsgenie' | 'custom'
  description?: string
}

/** Input for updating mutable fields of an existing integration */
export interface UpdateIntegrationInput {
  displayName?: string
  description?: string
  enabled?: boolean
}

/** Severity filter options for the dashboard */
export type SeverityFilter = 'all' | 'critical' | 'warning-critical' | 'info'

/** Dashboard filter state for notifications */
export interface DashboardFilterState {
  severity: SeverityFilter
  source: string | null
}
