import type { Notification } from '@/types/notification'
import type { FilterState, SeverityFilter } from '@/types/filters'

export interface AppSnapshot {
  /** All notifications from Firestore, newest first, max 50 */
  notifications: Notification[]

  /** Currently applied filters */
  filter: FilterState

  /** Filtered notifications (derived from notifications + filter) */
  filteredNotifications: Notification[]

  /** Currently selected notification for detail view */
  selectedNotification: Notification | null

  /** Whether a critical banner is currently showing */
  criticalBannerActive: boolean

  /** BLE connection status */
  bleConnected: boolean

  /** Firestore listener connection status */
  firestoreConnected: boolean

  /** Flash phase for splash screen */
  flashPhase: boolean

  /** Set of unique source names from all notifications */
  availableSources: string[]
}

export interface AppActions {
  navigate: (path: string) => void
  setSeverityFilter: (filter: SeverityFilter) => void
  setSourceFilter: (source: string | null) => void
  selectNotification: (notification: Notification) => void
}
