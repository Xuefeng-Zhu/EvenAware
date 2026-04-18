import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { useGlasses } from 'even-toolkit/useGlasses'
import { useFlashPhase } from 'even-toolkit/useFlashPhase'
import { createScreenMapper, getHomeTiles } from 'even-toolkit/glass-router'
import { appSplash } from './splash'
import { toDisplayData, onGlassAction, type AppSnapshot } from './selectors'
import type { AppActions } from './shared'
import { notificationStore } from '@/store/notificationStore'
import { loadFilters, saveFilters } from '@/store/filterStore'
import { notificationQueue } from '@/store/notificationQueue'
import { type FilterState, DEFAULT_FILTER_STATE } from '@/types/filters'
import type { Notification } from '@/types/notification'

const deriveScreen = createScreenMapper([
  { pattern: '/feed', screen: 'feed' },
  { pattern: '/detail', screen: 'detail' },
  { pattern: '/severity-filter', screen: 'severity-filter' },
  { pattern: '/source-filter', screen: 'source-filter' },
  { pattern: '/', screen: 'feed' },
], 'feed')

const homeTiles = getHomeTiles(appSplash)

export function AppGlasses() {
  const navigate = useNavigate()
  const location = useLocation()
  const flashPhase = useFlashPhase(deriveScreen(location.pathname) === 'feed')

  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER_STATE)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [bleConnected, setBleConnected] = useState(true)
  const [, forceUpdate] = useState(0)

  // Subscribe to NotificationStore on mount
  useEffect(() => {
    notificationStore.subscribe()
    const unsubChange = notificationStore.onChange(() => {
      forceUpdate(c => c + 1)
    })
    return () => {
      notificationStore.unsubscribe()
      unsubChange()
    }
  }, [])

  // Load persisted filters on mount
  useEffect(() => {
    loadFilters().then(setFilter)
  }, [])

  // Build snapshot
  const filteredNotifications = notificationStore.getFiltered(filter)
  const availableSources = [...new Set(notificationStore.notifications.map(n => n.sourceName))]

  const snapshotRef = useMemo(() => ({
    current: null as AppSnapshot | null,
  }), [])

  const snapshot: AppSnapshot = {
    notifications: notificationStore.notifications,
    filter,
    filteredNotifications,
    selectedNotification,
    criticalBannerActive: false,
    bleConnected,
    firestoreConnected: notificationStore.isConnected,
    flashPhase,
    availableSources,
  }
  snapshotRef.current = snapshot

  const getSnapshot = useCallback(() => snapshotRef.current!, [snapshotRef])

  // Wire AppActions
  const ctxRef = useRef<AppActions>({
    navigate,
    setSeverityFilter: () => {},
    setSourceFilter: () => {},
    selectNotification: () => {},
  })
  ctxRef.current = {
    navigate,
    setSeverityFilter: (severity) => {
      setFilter(prev => {
        const newFilter = { ...prev, severity }
        saveFilters(newFilter)
        return newFilter
      })
    },
    setSourceFilter: (source) => {
      setFilter(prev => {
        const newFilter = { ...prev, source }
        saveFilters(newFilter)
        return newFilter
      })
    },
    selectNotification: (notification) => {
      setSelectedNotification(notification)
      notificationStore.markAsRead(notification.id)
    },
  }

  const handleGlassAction = useCallback(
    (action: Parameters<typeof onGlassAction>[0], nav: Parameters<typeof onGlassAction>[1], snap: AppSnapshot) =>
      onGlassAction(action, nav, snap, ctxRef.current),
    [],
  )

  useGlasses({
    getSnapshot,
    toDisplayData,
    onGlassAction: handleGlassAction,
    deriveScreen,
    appName: 'NOTIFICATION HUB',
    splash: appSplash,
    getPageMode: (screen) => screen === 'detail' ? 'text' : 'home',
    homeImageTiles: homeTiles,
  })

  return null
}
