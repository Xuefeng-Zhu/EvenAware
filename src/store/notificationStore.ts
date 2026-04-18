import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import {
  type Notification,
  type SeverityLevel,
  MAX_NOTIFICATIONS,
} from '@/types/notification'
import { type FilterState } from '@/types/filters'

const VALID_SEVERITIES: ReadonlySet<string> = new Set<SeverityLevel>([
  'critical',
  'warning',
  'info',
])

/**
 * Validate a Firestore document against the Notification schema.
 * Returns a typed Notification if valid, or null if the document is malformed.
 */
function validateDoc(id: string, data: DocumentData): Notification | null {
  if (typeof data.title !== 'string') {
    console.warn(`[NotificationStore] Discarding doc ${id}: missing or invalid "title"`)
    return null
  }
  if (typeof data.body !== 'string') {
    console.warn(`[NotificationStore] Discarding doc ${id}: missing or invalid "body"`)
    return null
  }
  if (typeof data.severity !== 'string' || !VALID_SEVERITIES.has(data.severity)) {
    console.warn(`[NotificationStore] Discarding doc ${id}: invalid "severity" value "${data.severity}"`)
    return null
  }
  if (typeof data.sourceName !== 'string') {
    console.warn(`[NotificationStore] Discarding doc ${id}: missing or invalid "sourceName"`)
    return null
  }
  if (typeof data.sourceType !== 'string') {
    console.warn(`[NotificationStore] Discarding doc ${id}: missing or invalid "sourceType"`)
    return null
  }
  if (!data.timestamp) {
    console.warn(`[NotificationStore] Discarding doc ${id}: missing "timestamp"`)
    return null
  }

  return {
    id,
    title: data.title,
    body: data.body,
    severity: data.severity as SeverityLevel,
    sourceName: data.sourceName,
    sourceType: data.sourceType,
    timestamp: {
      seconds: data.timestamp.seconds ?? 0,
      nanoseconds: data.timestamp.nanoseconds ?? 0,
    },
  }
}

/**
 * NotificationStore manages an in-memory array of notifications
 * kept in sync with Firestore via an onSnapshot real-time listener.
 */
export class NotificationStore {
  /** Current notifications, ordered newest-first, max 50 */
  notifications: Notification[] = []

  /** Whether the Firestore listener is connected (not serving from cache) */
  isConnected = false

  /** Internal unsubscribe function from the onSnapshot listener */
  private unsubscribeFn: (() => void) | null = null

  /** Set of change listeners notified on every snapshot update */
  private listeners: Set<() => void> = new Set()

  /**
   * Subscribe to the Firestore `notifications` collection.
   * Sets up an onSnapshot listener ordered by timestamp descending, limited to MAX_NOTIFICATIONS.
   * Returns an unsubscribe function for cleanup.
   */
  subscribe(): () => void {
    // Avoid duplicate subscriptions
    if (this.unsubscribeFn) {
      return this.unsubscribeFn
    }

    const q = query(
      collection(db, 'notifications'),
      orderBy('timestamp', 'desc'),
      limit(MAX_NOTIFICATIONS),
    )

    this.unsubscribeFn = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        // Track connection status via snapshot metadata
        this.isConnected = !snapshot.metadata.fromCache

        // Map and validate each document
        const validated: Notification[] = []
        for (const doc of snapshot.docs) {
          const notification = validateDoc(doc.id, doc.data())
          if (notification) {
            validated.push(notification)
          }
        }

        this.notifications = validated

        // Notify all change listeners
        this.notifyListeners()
      },
      (error) => {
        console.error('[NotificationStore] onSnapshot error:', error)
        this.isConnected = false
        this.notifyListeners()
      },
    )

    return this.unsubscribeFn
  }

  /**
   * Detach the Firestore onSnapshot listener and clean up.
   */
  unsubscribe(): void {
    if (this.unsubscribeFn) {
      this.unsubscribeFn()
      this.unsubscribeFn = null
    }
  }

  /**
   * Get notifications filtered by the given FilterState.
   * Applies severity and source filters client-side.
   */
  getFiltered(filter: FilterState): Notification[] {
    let result = this.notifications

    // Apply severity filter
    if (filter.severity === 'critical') {
      result = result.filter((n) => n.severity === 'critical')
    } else if (filter.severity === 'warning-critical') {
      result = result.filter(
        (n) => n.severity === 'critical' || n.severity === 'warning',
      )
    }
    // 'all' — no severity filtering

    // Apply source filter
    if (filter.source !== null) {
      result = result.filter((n) => n.sourceName === filter.source)
    }

    return result
  }

  /**
   * Register a listener that is called whenever the notification list
   * or connection status changes. Returns an unsubscribe function.
   */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Notify all registered change listeners */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener()
      } catch (err) {
        console.error('[NotificationStore] Listener error:', err)
      }
    }
  }
}

/** Singleton instance for app-wide use */
export const notificationStore = new NotificationStore()
