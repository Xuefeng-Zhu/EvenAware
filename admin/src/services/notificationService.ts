/**
 * NotificationService — Firestore real-time listener for the notifications collection.
 */

import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { Notification } from '../types/notification'

export interface NotificationSnapshot {
  notifications: Notification[]
  connected: boolean
}

interface NotificationService {
  /** Subscribe to the latest 100 notifications, returns unsubscribe function */
  subscribe(callback: (snapshot: NotificationSnapshot) => void): () => void
}

const notificationsQuery = query(
  collection(db, 'notifications'),
  orderBy('timestamp', 'desc'),
  limit(100)
)

function subscribe(
  callback: (snapshot: NotificationSnapshot) => void
): () => void {
  return onSnapshot(notificationsQuery, (snapshot) => {
    const notifications: Notification[] = []
    snapshot.forEach((docSnap) => {
      const data = docSnap.data()
      notifications.push({
        id: docSnap.id,
        title: data.title ?? '',
        body: data.body ?? '',
        severity: data.severity ?? 'info',
        sourceName: data.sourceName ?? '',
        sourceType: data.sourceType ?? '',
        timestamp: data.timestamp ?? { seconds: 0, nanoseconds: 0 },
      })
    })

    const connected = !snapshot.metadata.fromCache

    callback({ notifications, connected })
  })
}

export const notificationService: NotificationService = { subscribe }
