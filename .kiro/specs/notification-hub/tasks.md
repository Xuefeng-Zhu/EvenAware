# Implementation Plan: Notification Hub

## Overview

Build a real-time notification aggregation system for Even Realities G2 smart glasses. The implementation proceeds in three phases: (1) shared data models and types, (2) Firebase backend with Cloud Functions and Firestore, (3) frontend with Firestore real-time sync, glasses UI screens, and WebView settings page. Each phase builds incrementally on the previous one, with checkpoints to validate before moving forward.

## Tasks

- [x] 1. Define shared data models and TypeScript types
  - [x] 1.1 Create the Notification type and related interfaces
    - Create `src/types/notification.ts` with the `Notification` interface (id, title, body, severity, sourceName, sourceType, timestamp)
    - Define `SeverityLevel` type as `'critical' | 'warning' | 'info'`
    - Define `ParsedNotification` interface (output of adapter parsing, before backend normalization)
    - Define constants for field limits: `MAX_TITLE_LENGTH = 120`, `MAX_BODY_LENGTH = 400`, `MAX_NOTIFICATIONS = 50`
    - _Requirements: 11.1, 11.2, 3.1, 5.5_
  - [x] 1.2 Create the FilterState type and storage keys
    - Create `src/types/filters.ts` with `SeverityFilter` type (`'all' | 'critical' | 'warning-critical'`), `FilterState` interface (severity + source)
    - Define SDK Storage key constants: `notification-hub:severity-filter`, `notification-hub:source-filter`
    - _Requirements: 8.4, 9.4_
  - [x] 1.3 Create the AppSnapshot and AppActions interfaces for glass state
    - Update `src/glass/shared.ts` to define the new `AppSnapshot` (notifications, filter, filteredNotifications, selectedNotification, criticalBannerActive, bleConnected, firestoreConnected, flashPhase, availableSources) and `AppActions` (navigate, setSeverityFilter, setSourceFilter, selectNotification)
    - _Requirements: 11.1, 8.3, 9.3_

- [x] 2. Implement Firebase backend — Cloud Functions
  - [x] 2.1 Initialize Firebase Functions project structure
    - Create `functions/` directory with `package.json`, `tsconfig.json` for a Node.js/TypeScript Cloud Functions project
    - Install dependencies: `firebase-functions`, `firebase-admin`
    - Set up the entry point `functions/src/index.ts`
    - _Requirements: 1.1_
  - [x] 2.2 Implement the SourceAdapter interface and AdapterRegistry
    - Create `functions/src/adapters/types.ts` with the `SourceAdapter` interface (`sourceType: string`, `parse(rawPayload: unknown): ParsedNotification`)
    - Create `functions/src/adapters/registry.ts` with the `AdapterRegistry` class (Map-based, `register`, `get`, `has` methods)
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 2.3 Implement the PagerDuty source adapter
    - Create `functions/src/adapters/pagerduty.ts` implementing `SourceAdapter`
    - Map PagerDuty V2 webhook events: `incident.trigger` → critical, `incident.acknowledge` → warning, `incident.resolve` → info
    - Extract title, body, sourceName from PagerDuty payload fields
    - Throw on malformed payloads
    - _Requirements: 2.4, 2.5_
  - [x] 2.4 Implement the OpsGenie source adapter
    - Create `functions/src/adapters/opsgenie.ts` implementing `SourceAdapter`
    - Map OpsGenie alert priority: P1/P2 → critical, P3 → warning, P4/P5 → info
    - Extract title, body, sourceName from OpsGenie payload fields
    - Throw on malformed payloads
    - _Requirements: 2.4, 2.5_
  - [x] 2.5 Implement the webhook handler Cloud Function
    - Create `functions/src/webhook.ts` with the HTTP-triggered function at `/webhooks/:sourceType`
    - Implement auth middleware: validate `Authorization: Bearer <token>` header, return 401 on invalid/missing token
    - Route to adapter via `AdapterRegistry.get(sourceType)`, return 404 if no adapter found
    - Call `adapter.parse(req.body)`, catch errors and return 422 with logged error details (sanitized payload excerpt)
    - Normalize: truncate title to 120 chars, body to 400 chars, default severity to `info` if invalid
    - Write normalized notification to Firestore `notifications` collection with server timestamp and auto-generated ID
    - Return HTTP 200 on success
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 4.1, 13.1_
  - [x] 2.6 Write unit tests for adapters and webhook handler
    - Test PagerDuty adapter with valid and malformed payloads
    - Test OpsGenie adapter with valid and malformed payloads
    - Test AdapterRegistry routing (known type, unknown type)
    - Test auth middleware (valid token, missing token, invalid token)
    - Test normalization (title truncation, body truncation, invalid severity default)
    - _Requirements: 1.2, 1.3, 1.4, 2.3, 2.5, 3.1, 3.3, 13.1_

- [x] 3. Checkpoint — Backend validation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement frontend Firestore integration
  - [x] 4.1 Set up Firebase client SDK in the frontend
    - Install `firebase` package in the root project
    - Create `src/firebase/config.ts` with Firebase app initialization and Firestore instance export
    - _Requirements: 4.2_
  - [x] 4.2 Implement the NotificationStore with Firestore real-time listener
    - Create `src/store/notificationStore.ts`
    - Implement `subscribe()` that sets up an `onSnapshot` listener on the `notifications` collection, ordered by `timestamp` descending, limited to 50
    - Maintain an in-memory array of notifications, updated on each snapshot
    - Implement `getFiltered(filter: FilterState): Notification[]` that applies severity and source filters client-side
    - Validate incoming Firestore documents against the Notification schema; discard and log warning for non-conforming documents
    - Track Firestore listener connection status (connected/disconnected) via snapshot metadata
    - Implement `unsubscribe()` to detach the listener for cleanup
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 5.5, 11.2, 11.4, 12.2_
  - [x] 4.3 Implement filter state persistence with SDK Storage
    - Create `src/store/filterStore.ts`
    - Implement `loadFilters()` using `bridge.getLocalStorage` to read persisted severity and source filter values
    - Implement `saveFilters(filter: FilterState)` using `bridge.setLocalStorage` to persist filter changes
    - Use the defined SDK Storage key constants
    - _Requirements: 8.4, 9.4_
  - [x] 4.4 Implement the NotificationQueue for BLE disconnect resilience
    - Create `src/store/notificationQueue.ts`
    - Implement `enqueue(notification)`, `flush()`, and `pending` count
    - Queue incoming notifications when BLE is disconnected (detected via `bridge.onDeviceStatusChanged`)
    - Flush queued notifications and rebuild feed when BLE reconnects
    - _Requirements: 13.3_
  - [x] 4.5 Write unit tests for NotificationStore and FilterStore
    - Test notification filtering by severity (all, critical, warning+critical)
    - Test notification filtering by source
    - Test combined severity + source filtering
    - Test notification schema validation (valid docs, invalid docs discarded)
    - Test filter persistence save/load round-trip
    - Test notification queue enqueue/flush behavior
    - _Requirements: 4.5, 8.3, 9.3, 11.4, 13.3_

- [x] 5. Checkpoint — Frontend data layer validation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement glasses UI screens
  - [x] 6.1 Implement the feed screen
    - Create `src/glass/screens/feed.ts` implementing `GlassScreen<AppSnapshot, AppActions>`
    - `display()`: render a list container with filtered notifications, each item formatted as `[severity icon] source: truncated title` (max 64 chars), using `buildScrollableList`
    - Severity indicators: `▲` critical, `◆` warning, `●` info
    - `action()`: handle CLICK_EVENT to select notification and navigate to detail, handle SCROLL_TOP_EVENT to navigate to severity-filter, handle DOUBLE_CLICK_EVENT to call `shutDownPageContainer(1)` for exit dialogue
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 10.3_
  - [x] 6.2 Implement the detail screen
    - Create `src/glass/screens/detail.ts` implementing `GlassScreen<AppSnapshot, AppActions>`
    - `display()`: render a text container with full notification details (severity icon + label, source name, formatted timestamp, separator line, title, body) using `isEventCapture: 1` for internal scrolling
    - `action()`: handle DOUBLE_CLICK_EVENT to navigate back to feed
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 10.4_
  - [x] 6.3 Implement the critical notification banner on detail screen
    - In the detail screen, handle incoming critical notifications while viewing detail
    - Use `textContainerUpgrade` to prepend banner line: `▲ NEW CRITICAL: [title snippet]`
    - Set a 3-second timer, then restore original detail text via `textContainerUpgrade`
    - For warning/info notifications while on detail, do not interrupt
    - _Requirements: 7.2, 7.3_
  - [x] 6.4 Implement the severity filter screen
    - Create `src/glass/screens/severityFilter.ts` implementing `GlassScreen<AppSnapshot, AppActions>`
    - `display()`: render a list container with items: "All", "Critical Only", "Warning & Critical", "Filter by Source"
    - `action()`: handle CLICK_EVENT on filter options to apply severity filter and navigate back to feed, handle CLICK_EVENT on "Filter by Source" to navigate to source-filter, handle DOUBLE_CLICK_EVENT to navigate back to feed
    - _Requirements: 8.1, 8.2, 8.3, 9.1, 10.4_
  - [x] 6.5 Implement the source filter screen
    - Create `src/glass/screens/sourceFilter.ts` implementing `GlassScreen<AppSnapshot, AppActions>`
    - `display()`: render a list container with "All Sources" plus all unique source names from available notifications
    - `action()`: handle CLICK_EVENT to apply source filter (combined with active severity filter) and navigate back to feed, handle DOUBLE_CLICK_EVENT to navigate back to severity-filter
    - _Requirements: 9.1, 9.2, 9.3, 10.4_
  - [x] 6.6 Implement real-time feed updates
    - When a new notification arrives via Firestore listener while on the feed screen, rebuild the list container to include the new notification at the top
    - Ensure the feed respects the current filter state when rebuilding
    - _Requirements: 7.1_

- [x] 7. Checkpoint — Glasses UI screens validation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Wire up the glass screen router and app lifecycle
  - [x] 8.1 Register all glass screens in the screen router
    - Update `src/glass/selectors.ts` to register feed, detail, severity-filter, and source-filter screens with `createGlassScreenRouter`, setting `feed` as the default screen
    - Remove the old `home` screen registration
    - _Requirements: 5.1, 6.1, 8.1, 9.1_
  - [x] 8.2 Update AppGlasses component with notification state and lifecycle
    - Update `src/glass/AppGlasses.tsx` to:
    - Initialize the NotificationStore and subscribe to Firestore `onSnapshot` on mount
    - Load persisted filter state from SDK Storage on mount
    - Build the full `AppSnapshot` from notification store, filter state, BLE status, and Firestore connection status
    - Wire `AppActions` (navigate, setSeverityFilter, setSourceFilter, selectNotification) to update state and persist filters
    - Update `deriveScreen` mappings for the new screen routes
    - Call `bridge.connect()` on page load
    - Call `createStartUpPageContainer` once at startup for the initial feed layout
    - Handle FOREGROUND_ENTER_EVENT to refresh notifications from Firestore
    - Handle ABNORMAL_EXIT_EVENT to detach the Firestore listener
    - Integrate the NotificationQueue: detect BLE disconnect via `bridge.onDeviceStatusChanged`, queue notifications when disconnected, flush and rebuild on reconnect
    - _Requirements: 4.2, 4.4, 7.1, 8.4, 9.4, 10.1, 10.2, 10.5, 10.6, 13.3, 13.4_
  - [x] 8.3 Implement rendering error retry logic
    - Add try/catch around `rebuildPageContainer` and `textContainerUpgrade` calls
    - On error, retry once after a 500ms delay before skipping the update
    - If a notification fails to render, skip it and continue displaying remaining notifications
    - _Requirements: 13.2, 13.4_

- [x] 9. Implement the WebView settings page
  - [x] 9.1 Create the settings page component
    - Create `src/pages/Settings.tsx` using even-toolkit web components (AppShell, NavHeader, ScreenHeader, Card, ListItem, Button, SectionHeader)
    - Display Firestore connection status with a status indicator (connected/disconnected)
    - Display list of configured webhook sources with their Cloud Functions webhook URLs
    - Implement copy-to-clipboard button for each source's webhook URL
    - Update connection status display within 2 seconds when Firestore listener status changes
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - [x] 9.2 Wire the settings page into the app router
    - Update `src/App.tsx` to add a `/settings` route pointing to the Settings page
    - Add navigation from the home page to settings
    - Keep `<AppGlasses />` mounted so glasses UI continues to function while viewing settings
    - _Requirements: 12.1_

- [x] 10. Checkpoint — Full integration validation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Update splash screen and finalize app identity
  - [x] 11.1 Update the splash screen for Notification Hub branding
    - Update `src/glass/splash.ts` to display "NOTIFICATION HUB" or similar branding text
    - Update `src/glass/AppGlasses.tsx` `appName` to `'NOTIFICATION HUB'`
    - _Requirements: 10.2_
  - [x] 11.2 Clean up unused starter code
    - Remove the old home screen items and starter content from `src/glass/screens/home.ts` (or delete the file if fully replaced)
    - Update `src/App.tsx` home page to show a meaningful landing page or redirect to settings
    - _Requirements: 10.1, 10.2_

- [x] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at each major phase boundary
- The design has no Correctness Properties section, so property-based tests are not included
- Unit tests validate specific examples, edge cases, and error conditions
- The backend (Cloud Functions) and frontend are separate deployable units but share the Notification type definition
- All glasses UI screens follow the existing `GlassScreen<AppSnapshot, AppActions>` pattern from even-toolkit
- Filter persistence uses SDK Storage (`bridge.setLocalStorage`/`bridge.getLocalStorage`), not browser `localStorage`
