import { type Notification } from '@/types/notification'

/**
 * In-memory queue for notifications received while the BLE connection
 * between the iPhone and G2 glasses is lost.
 *
 * When BLE disconnects, incoming Firestore notifications are enqueued here.
 * When BLE reconnects, the queue is flushed so the feed can be rebuilt
 * with the latest state.
 *
 * @see Requirement 13.3
 */
export class NotificationQueue {
  private queue: Notification[] = []

  /** Queue a notification for later display when BLE reconnects. */
  enqueue(notification: Notification): void {
    this.queue.push(notification)
  }

  /**
   * Flush all queued notifications and return them.
   * Clears the internal queue. Returns notifications in the order
   * they were enqueued (oldest first).
   */
  flush(): Notification[] {
    const flushed = [...this.queue]
    this.queue = []
    return flushed
  }

  /** Number of notifications currently queued. */
  get pending(): number {
    return this.queue.length
  }
}

/** Singleton instance for app-wide use */
export const notificationQueue = new NotificationQueue()
